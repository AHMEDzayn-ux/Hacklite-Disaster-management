// Receive Call Recording (Tasker/MacroDroid gateway ingestion)
// ---------------------------------------------------------------------------
// A dedicated Android phone is the emergency-call intake line. Its native
// dialer auto-records every call to a local folder; a Tasker (or MacroDroid)
// profile watches that folder and POSTs each finished recording here the
// moment it appears - no custom Android app, mirroring how sms-report is fed
// by an off-the-shelf Android SMS Gateway app rather than bespoke code.
//
// This function only handles INGESTION: validate + store the audio + create
// its call_recordings row, then hand off to the existing
// call-transcription-agent (transcribe -> extract -> insert into
// disasters/missing_persons/animal_rescues), completely unchanged.
//
// POST multipart/form-data:
//   audio         - the recording file (required)
//   timestamp     - ISO datetime the call happened, per the device (optional)
//   phone_number  - caller's number, if the device/recorder knows it (optional)
//   location      - device's approximate location at record time (optional, informational only)
//   device_id     - identifies which gateway phone this came from (optional)
//
// Auth: same x-agent-cron-secret header every other agent function's
// unattended path already uses (see _shared/agentAuth.ts) - Tasker can set a
// static header value trivially, whereas computing an HMAC signature (like
// the SMS gateway does) is impractical from Tasker without a crypto plugin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateAgentCaller } from '../_shared/agentAuth.ts'
import { isAllowedAudioExt, MAX_AUDIO_BYTES } from '../_shared/audio.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_METADATA_LENGTH = 200

function sanitizeMetadata(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, MAX_METADATA_LENGTH)
}

function parseRecordedAt(value: FormDataEntryValue | null): string {
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!isNaN(parsed.getTime())) return parsed.toISOString()
  }
  return new Date().toISOString()
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const agentCronSecret = Deno.env.get('AGENT_CRON_SECRET')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Same dual auth path (admin JWT or x-agent-cron-secret) every other
    // agent function uses - the gateway phone authenticates via the cron
    // secret, since it has no Supabase session.
    const authResult = await authenticateAgentCaller(req, supabase)
    if (!authResult.ok) {
      return jsonResponse({ success: false, error: authResult.reason }, 401)
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return jsonResponse({ success: false, error: 'Expected multipart/form-data' }, 400)
    }

    const audio = formData.get('audio')
    if (!(audio instanceof File) || audio.size === 0) {
      return jsonResponse({ success: false, error: 'Missing required "audio" file field' }, 400)
    }

    if (!isAllowedAudioExt(audio.name)) {
      return jsonResponse({ success: false, error: `Unsupported audio file type: ${audio.name}` }, 400)
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return jsonResponse({
        success: false,
        error: `Recording too large (${Math.round(audio.size / 1024 / 1024)}MB). Max ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)}MB per file.`,
      }, 413)
    }

    const callerPhone = sanitizeMetadata(formData.get('phone_number'))
    const deviceLocation = sanitizeMetadata(formData.get('location'))
    const deviceId = sanitizeMetadata(formData.get('device_id'))
    const recordedAt = parseRecordedAt(formData.get('timestamp'))

    // gateway/<year>/<month>/<uuid>.<ext> keeps device-pushed recordings
    // browsable by date, separate from the flat recordings/ folder manual
    // uploads use.
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const ext = audio.name.split('.').pop()?.toLowerCase() || 'bin'
    const filePath = `gateway/${year}/${month}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('call-recordings')
      .upload(filePath, audio, { contentType: audio.type || undefined })

    if (uploadError) {
      console.error('Storage upload failed:', uploadError)
      return jsonResponse({ success: false, error: 'Failed to store recording' }, 500)
    }

    const { data: row, error: insertError } = await supabase
      .from('call_recordings')
      .insert({
        storage_path: filePath,
        original_filename: audio.name,
        uploaded_by: null,
        caller_phone: callerPhone,
        status: 'pending',
        ingestion_source: 'gateway_device',
        device_id: deviceId,
        device_location: deviceLocation,
        recorded_at: recordedAt,
      })
      .select('id')
      .single()

    if (insertError || !row) {
      console.error('call_recordings insert failed:', insertError)
      return jsonResponse({ success: false, error: 'Failed to record upload' }, 500)
    }

    // Hand off to the existing transcription/extraction pipeline, unchanged.
    // Fire-and-forget: Tasker doesn't need to wait out a multi-minute Gemini
    // call, and call-transcription-agent's own cron sweep will pick this row
    // up later if this invoke never lands.
    const invokeAgent = fetch(`${supabaseUrl}/functions/v1/call-transcription-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(agentCronSecret ? { 'x-agent-cron-secret': agentCronSecret } : {}),
      },
      body: JSON.stringify({ call_recording_id: row.id }),
    }).catch((err) => console.error('Failed to invoke call-transcription-agent:', err))

    // deno-lint-ignore no-explicit-any
    const edgeRuntime = (globalThis as any).EdgeRuntime
    if (edgeRuntime?.waitUntil) {
      edgeRuntime.waitUntil(invokeAgent)
    }

    // report_id here is the call_recordings tracking id, not the final
    // disaster/missing_person/animal_rescue id - that isn't known yet since
    // transcription+extraction just started asynchronously above.
    return jsonResponse({
      success: true,
      message: 'Recording received, transcription started',
      report_id: row.id,
    }, 200)

  } catch (error) {
    console.error('receive-call-recording error:', error)
    return jsonResponse({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    }, 500)
  }
})
