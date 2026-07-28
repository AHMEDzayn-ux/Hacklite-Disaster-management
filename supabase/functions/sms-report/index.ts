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
import { buildExtractionPrompt, insertParsedReport, ParsedReport, ReportSource } from '../_shared/reportExtraction.ts'

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

// Verify HMAC SHA256 signature
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

    // Verify X-Signature header if webhook secret is configured
    const signature = req.headers.get('x-signature')
    if (webhookSecret && signature) {
      const isValid = await verifySignature(rawBody, signature, webhookSecret)
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
