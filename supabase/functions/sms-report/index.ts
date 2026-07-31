// SMS Report Processing Edge Function
// Receives SMS from Android Gateway, uses Gemini AI to parse, and inserts into Supabase
// Webhook URL: https://<your-project-ref>.supabase.co/functions/v1/sms-report
// Updated: 2026-07-25 - extraction/geocoding/insert logic moved to
// _shared/reportExtraction.ts + _shared/geocode.ts so call-transcription-agent
// can reuse the exact same "free text -> structured report" pipeline for call
// transcripts instead of duplicating it.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as hexEncode } from 'https://deno.land/std@0.208.0/encoding/hex.ts'
import { callGeminiForJSON } from '../_shared/geminiClient.ts'
import { geocodeAddress } from '../_shared/geocode.ts'
import { buildExtractionPrompt, insertParsedReport, looksLikeMachineSms, ParsedReport, ReportSource } from '../_shared/reportExtraction.ts'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Android SMS Gateway Webhook Payload Format
interface SMSGatewayPayload {
  smsId: string
  sender: string              // Phone number e.g. "+123456789"
  message: string             // SMS text content
  receivedAt: string          // ISO timestamp e.g. "2025-10-05T13:00:35.208Z"
  deviceId: string            // Gateway device ID
  webhookSubscriptionId: string
  webhookEvent: 'MESSAGE_RECEIVED' | 'STATUS_UPDATE'
}

// Verify HMAC SHA256 signature.
//
// TextBee's documented receiver computes the digest over `JSON.stringify(payload)`
// - the parsed body re-serialized - while the canonical thing to authenticate is
// the raw bytes that arrived. Those match only while TextBee transmits compact
// JSON. verifyRequestSignature() below tries the raw body first and falls back to
// a compact re-serialization, so a change in the sender's whitespace cannot start
// rejecting legitimate reports.
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const messageData = encoder.encode(payload)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    const computedSignature = new TextDecoder().decode(hexEncode(new Uint8Array(signatureBuffer)))

    // Constant-time comparison to prevent timing attacks
    if (signature.length !== computedSignature.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ computedSignature.charCodeAt(i)
    }

    return result === 0
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * Authenticate one webhook request.
 *
 * Accepts the signature over either the raw body or its compact re-serialization
 * (see the note on verifySignature above). Returns false when the header is
 * missing: with a secret configured, an unsigned request must fail rather than
 * skip the check, or the signature is decorative - anyone could bypass it by
 * simply omitting the header.
 */
async function verifyRequestSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  if (await verifySignature(rawBody, signature, secret)) return true

  try {
    const canonical = JSON.stringify(JSON.parse(rawBody))
    if (canonical !== rawBody && await verifySignature(canonical, signature, secret)) {
      console.log('Signature matched the re-serialized body rather than the raw bytes')
      return true
    }
  } catch {
    // Body was not JSON; the raw-body attempt above was the only option.
  }

  return false
}

// Log SMS processing for debugging/audit
async function logSMSProcessing(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  senderPhone: string,
  rawMessage: string,
  category: string | null,
  success: boolean,
  recordId: string | null,
  errorMessage: string | null,
  smsId?: string,
  deviceId?: string
): Promise<void> {
  try {
    await supabase
      .from('sms_processing_logs')
      .insert({
        sender_phone: senderPhone,
        raw_message: rawMessage,
        detected_category: category,
        processing_success: success,
        created_record_id: recordId,
        error_message: errorMessage,
        sms_id: smsId || null,
        device_id: deviceId || null,
        processed_at: new Date().toISOString()
      })
  } catch (error) {
    // Log table might not exist, ignore error
    console.log('SMS log insert skipped (table may not exist):', error)
  }
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Read raw body for signature verification
  const rawBody = await req.text()

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const webhookSecret = Deno.env.get('SMS_WEBHOOK_SECRET')

    // Verify the X-Signature header whenever a webhook secret is configured.
    //
    // Note the shape: the guard is on the SECRET, not on the header. It used to be
    // `if (webhookSecret && signature)`, which skipped verification entirely for a
    // request that simply left the header off - so the signature protected nothing
    // and anyone with the URL could inject reports. This endpoint runs with
    // verify_jwt = false (TextBee cannot mint a Supabase JWT), so this check is the
    // only gate in front of it.
    //
    // Leaving SMS_WEBHOOK_SECRET unset keeps the endpoint open, which is a
    // deliberate choice for a deployment that has not configured signing yet.
    const signature = req.headers.get('x-signature')
    if (webhookSecret) {
      if (!signature) {
        console.error('Rejected unsigned webhook: SMS_WEBHOOK_SECRET is set but no x-signature header was sent')
        return new Response(
          JSON.stringify({ error: 'Missing signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const isValid = await verifyRequestSignature(rawBody, signature, webhookSecret)
      if (!isValid) {
        console.error('Invalid webhook signature')
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('Webhook signature verified successfully')
    }

    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse incoming SMS payload from Android Gateway
    const payload: SMSGatewayPayload = JSON.parse(rawBody)

    // Only process MESSAGE_RECEIVED events
    if (payload.webhookEvent !== 'MESSAGE_RECEIVED') {
      console.log(`Ignoring webhook event: ${payload.webhookEvent}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored', event: payload.webhookEvent }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract fields from the gateway payload
    const smsId = payload.smsId
    const senderPhone = payload.sender || 'unknown'
    const smsMessage = payload.message || ''
    const receivedAt = payload.receivedAt
    const deviceId = payload.deviceId

    if (!smsMessage || smsMessage.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Empty message',
          reply: 'Your message was empty. Please send a description of the emergency.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing SMS [${smsId}] from ${senderPhone} received at ${receivedAt}: ${smsMessage.substring(0, 100)}...`)

    // A gateway phone receives far more bank alerts, reload receipts and promos
    // than emergencies, and every one of them used to be filed as a public
    // "disaster" - including a BOC transaction SMS that put an account number and
    // balance into a table with a public_read policy. Drop machine traffic here,
    // before the Gemini call, so it costs nothing and never reaches the model.
    //
    // Deliberately no reply: replying to a shortcode is pointless at best, and
    // an SMS loop with an auto-responder at worst.
    const machineCheck = looksLikeMachineSms(senderPhone, smsMessage)
    if (machineCheck.machine) {
      console.log(`Ignoring machine-generated SMS [${smsId}] from ${senderPhone} (${machineCheck.reason})`)
      return new Response(
        JSON.stringify({ success: true, ignored: true, reason: machineCheck.reason }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build prompt and call Gemini AI - same extraction module call-transcription-agent uses for call transcripts.
    const prompt = buildExtractionPrompt(smsMessage, { sourceLabel: 'SMS message', defaultReporterName: 'SMS Reporter' })
    const geminiResult = await callGeminiForJSON<ParsedReport>(prompt, geminiApiKey, { maxOutputTokens: 2048, temperature: 0.1 })
    const parsedReport = geminiResult.ok ? geminiResult.data : null

    if (!parsedReport) {
      await logSMSProcessing(supabase, senderPhone, smsMessage, null, false, null, 'AI parsing failed', smsId, deviceId)

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not parse message',
          reply: 'We could not understand your message. Please try again with more details about the emergency, location, and your name.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Second gate: the model's own verdict, for machine traffic and off-topic
    // texts the pattern filter above does not recognise. Not an error - the
    // pipeline worked, there was simply nothing to file.
    if (parsedReport.category === 'not_a_report') {
      console.log(`SMS [${smsId}] classified as not_a_report; nothing inserted`)
      await logSMSProcessing(supabase, senderPhone, smsMessage, 'not_a_report', true, null, null, smsId, deviceId)

      return new Response(
        JSON.stringify({ success: true, ignored: true, reason: 'not an emergency report' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Geocode the address if present
    const locationAddress = parsedReport.data.location_address
    const geo = locationAddress ? await geocodeAddress(locationAddress) : null
    if (locationAddress && !geo) {
      console.log(`Could not geocode: "${locationAddress}"`)
    }

    // Insert into the appropriate table
    const source: ReportSource = { channel: 'sms', contactNumber: senderPhone, rawText: smsMessage }
    const insertResult = await insertParsedReport(supabase, parsedReport, source, geo)

    if (!insertResult) {
      await logSMSProcessing(supabase, senderPhone, smsMessage, parsedReport.category, false, null, 'Database insert failed or unknown category', smsId, deviceId)

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to save report',
          reply: 'There was an error saving your report. Please try again later.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful processing
    await logSMSProcessing(supabase, senderPhone, smsMessage, parsedReport.category, true, insertResult.id, null, smsId, deviceId)

    // Format category for display
    const categoryDisplay = parsedReport.category.replace('_', ' ')

    // Build confirmation message for SMS reply
    const confirmationMessage = `Your ${categoryDisplay} report has been received. Reference ID: ${insertResult.id.substring(0, 8).toUpperCase()}. Our team will respond soon.`

    console.log(`Successfully created ${parsedReport.category} report: ${insertResult.id}`)

    // Return success response with reply message for the gateway
    return new Response(
      JSON.stringify({
        success: true,
        smsId: smsId,
        category: parsedReport.category,
        confidence: parsedReport.confidence,
        record_id: insertResult.id,
        table: insertResult.table,
        reply: confirmationMessage,
        // Include extracted data for debugging
        extracted_data: parsedReport.data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('SMS processing error:', error)

    // Always return 200 to acknowledge receipt (prevents retries for parse errors)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
        reply: 'An error occurred processing your message. Please try again.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
