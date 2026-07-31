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
// POST multipart/form-data (manual/Tasker uploads):
//   audio         - the recording file (required)
//   timestamp     - ISO datetime the call happened, per the device (optional)
//   phone_number  - caller's number, if the device/recorder knows it (optional)
//   location      - device's approximate location at record time (optional, informational only)
//   device_id     - identifies which gateway phone this came from (optional)
//
// POST raw audio body (MacroDroid's "File" content body - raw bytes, plain
// Content-Type like audio/mpeg, no multipart field name), metadata as query
// params instead since there are no form fields to read them from:
//   ?phone_number=&location=&device_id=&timestamp=&filename=
//
// Auth: none. Deployed with --no-verify-jwt and no app-level check either -
// MacroDroid's HTTP Request action can't easily set a per-request secret
// without extra plugins, so this is a fully public, unauthenticated
// endpoint. Anyone with the URL can push audio here; the only mitigations
// are the file-type/size checks below.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isAllowedAudioExt, MAX_AUDIO_BYTES, guessMimeType } from '../_shared/audio.ts'

// Maps a raw Content-Type header (as MacroDroid sends it) to one of the
// extensions in _shared/audio.ts - "audio/mpeg" is the common mp3
// content-type but doesn't match the "mp3" extension key by string
// equality, so it needs its own lookup.
const EXT_BY_MIME: Record<string, string> = {
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/x-mpeg': 'mp3',
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav',
  'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a',
  'audio/aac': 'aac', 'audio/ogg': 'ogg', 'audio/flac': 'flac',
  'audio/x-flac': 'flac', 'audio/webm': 'webm', 'audio/amr': 'amr',
  'audio/3gpp': 'amr',
}
function extFromMimeType(contentType: string): string {
  const bare = contentType.split(';')[0].trim().toLowerCase()
  return EXT_BY_MIME[bare] || 'mp3'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_METADATA_LENGTH = 200

function sanitizeMetadata(value: FormDataEntryValue | string | null): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, MAX_METADATA_LENGTH)
}

function parseRecordedAt(value: FormDataEntryValue | string | null): string {
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

    const contentType = req.headers.get('content-type') || ''
    const url = new URL(req.url)

    let audioName: string
    let audioType: string
    let audioSize: number
    let audioBody: File | ArrayBuffer
    let callerPhone: string | null
    let deviceLocation: string | null
    let deviceId: string | null
    let recordedAt: string

    if (contentType.includes('multipart/form-data')) {
      // Manual/Tasker uploads: a true multipart form with an "audio" field.
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

      audioName = audio.name
      audioType = audio.type
      audioSize = audio.size
      audioBody = audio
      callerPhone = sanitizeMetadata(formData.get('phone_number'))
      deviceLocation = sanitizeMetadata(formData.get('location'))
      deviceId = sanitizeMetadata(formData.get('device_id'))
      recordedAt = parseRecordedAt(formData.get('timestamp'))
    } else {
      // MacroDroid's "File" content body: raw bytes, plain Content-Type.
      // No form fields available, so metadata comes from query params.
      const buffer = await req.arrayBuffer()
      if (buffer.byteLength === 0) {
        return jsonResponse({ success: false, error: 'Empty request body' }, 400)
      }

      audioName = sanitizeMetadata(url.searchParams.get('filename')) || `recording.${extFromMimeType(contentType)}`
      audioType = contentType || guessMimeType(audioName)
      audioSize = buffer.byteLength
      audioBody = buffer
      callerPhone = sanitizeMetadata(url.searchParams.get('phone_number'))
      deviceLocation = sanitizeMetadata(url.searchParams.get('location'))
      deviceId = sanitizeMetadata(url.searchParams.get('device_id'))
      recordedAt = parseRecordedAt(url.searchParams.get('timestamp'))
    }

    if (!isAllowedAudioExt(audioName)) {
      return jsonResponse({ success: false, error: `Unsupported audio file type: ${audioName}` }, 400)
    }

    if (audioSize > MAX_AUDIO_BYTES) {
      return jsonResponse({
        success: false,
        error: `Recording too large (${Math.round(audioSize / 1024 / 1024)}MB). Max ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)}MB per file.`,
      }, 413)
    }

    // gateway/<year>/<month>/<uuid>.<ext> keeps device-pushed recordings
    // browsable by date, separate from the flat recordings/ folder manual
    // uploads use.
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const ext = audioName.split('.').pop()?.toLowerCase() || 'bin'
    const filePath = `gateway/${year}/${month}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('call-recordings')
      .upload(filePath, audioBody, { contentType: audioType || undefined })

    if (uploadError) {
      console.error('Storage upload failed:', uploadError)
      return jsonResponse({ success: false, error: 'Failed to store recording' }, 500)
    }

    const { data: row, error: insertError } = await supabase
      .from('call_recordings')
      .insert({
        storage_path: filePath,
        original_filename: audioName,
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
