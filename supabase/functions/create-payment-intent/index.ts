// Create Payment Intent
// ======================
// Fixes the previously non-functional donation flow: DonationForm.jsx used to
// call a nonexistent /api/create-payment-intent and then insert its own
// donations row client-side - meaning nothing ever verified a payment
// actually happened. This function creates the Stripe PaymentIntent
// server-side (raw fetch to Stripe's REST API, no SDK, same style as the
// Gemini integration in sms-report) and is now the ONLY thing that inserts a
// new donations row - always as 'pending'. stripe-webhook is the only thing
// that ever flips its status.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

interface RequestBody {
  amount: number
  currency: string
  donor_name?: string
  donor_email: string
  donor_phone?: string
  is_anonymous?: boolean
  donation_type?: 'monetary' | 'in_kind'
  donation_purpose?: string
  purpose_category?: string
  message?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALLOWED_CURRENCIES = ['lkr', 'usd', 'eur', 'gbp']

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

  const { amount, currency, donor_email } = body
  if (!amount || typeof amount !== 'number' || amount <= 0) return json(400, { error: 'amount must be a positive number' })
  if (!donor_email || !EMAIL_RE.test(donor_email)) return json(400, { error: 'A valid donor_email is required' })
  if (!currency || !ALLOWED_CURRENCIES.includes(currency.toLowerCase())) {
    return json(400, { error: `currency must be one of ${ALLOWED_CURRENCIES.join(', ')}` })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeSecretKey) return json(500, { error: 'Payment service not configured' })

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(Math.round(amount * 100)), // Stripe wants the smallest currency unit
        currency: currency.toLowerCase(),
        receipt_email: donor_email,
        'metadata[donation_purpose]': body.donation_purpose ?? 'General Relief',
        'automatic_payment_methods[enabled]': 'true',
      }),
    })

    if (!stripeResponse.ok) {
      const errorBody = await stripeResponse.text()
      console.error('Stripe payment_intents error:', stripeResponse.status, errorBody)
      return json(502, { error: 'Failed to create payment intent with Stripe' })
    }

    const intent = await stripeResponse.json()

    const { data: donation, error: insertError } = await supabase.from('donations').insert({
      donor_name: body.is_anonymous ? 'Anonymous' : (body.donor_name || 'Anonymous'),
      donor_email,
      donor_phone: body.donor_phone || null,
      is_anonymous: !!body.is_anonymous,
      donation_type: body.donation_type ?? 'monetary',
      amount,
      currency: currency.toUpperCase(),
      stripe_payment_id: intent.id,
      stripe_payment_status: 'pending',
      donation_purpose: body.donation_purpose ?? 'General Relief',
      purpose_category: body.purpose_category ?? 'general',
      message: body.message || null,
    }).select('id').single()

    if (insertError) {
      console.error('Failed to insert donation row:', insertError)
      return json(500, { error: 'Payment intent created but failed to record donation', details: insertError.message })
    }

    return json(200, { clientSecret: intent.client_secret, donationId: donation.id })
  } catch (error) {
    console.error('create-payment-intent error:', error)
    return json(500, { error: 'Internal server error' })
  }
})
