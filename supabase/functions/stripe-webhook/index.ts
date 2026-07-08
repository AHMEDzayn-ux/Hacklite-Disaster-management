// Stripe Webhook
// ===============
// The only writer of donations.stripe_payment_status. Verifies Stripe's
// signature scheme (Stripe-Signature: t=<timestamp>,v1=<hex hmac>) using the
// same constant-time-compare discipline as sms-report's verifySignature, then
// updates the matching donation by stripe_payment_id. Idempotent by
// construction: redelivering the same event just re-applies the same UPDATE.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'stripe-signature, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60

async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(signatureHeader.split(',').map(kv => {
    const [k, v] = kv.split('=')
    return [k, v]
  }))
  const timestamp = parts['t']
  const v1 = parts['v1']
  if (!timestamp || !v1) return false

  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return false

  const expected = await hmacSha256Hex(secret, `${timestamp}.${payload}`)
  return constantTimeEquals(expected, v1)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const rawBody = await req.text()
  const signatureHeader = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signatureHeader || !webhookSecret) return json(400, { error: 'Missing signature or webhook secret not configured' })

  const isValid = await verifyStripeSignature(rawBody, signatureHeader, webhookSecret)
  if (!isValid) {
    console.error('Invalid Stripe webhook signature')
    return json(400, { error: 'Invalid signature' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const event = JSON.parse(rawBody)

    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
      const intent = event.data?.object
      const newStatus = event.type === 'payment_intent.succeeded' ? 'succeeded' : 'failed'

      const { error } = await supabase
        .from('donations')
        .update({ stripe_payment_status: newStatus })
        .eq('stripe_payment_id', intent.id)

      if (error) {
        console.error('Failed to update donation status:', error)
        return json(500, { error: 'Failed to update donation status' })
      }
    } else {
      console.log(`Ignoring unhandled Stripe event type: ${event.type}`)
    }

    return json(200, { received: true })
  } catch (error) {
    console.error('stripe-webhook processing error:', error)
    return json(400, { error: 'Failed to process webhook payload' })
  }
})
