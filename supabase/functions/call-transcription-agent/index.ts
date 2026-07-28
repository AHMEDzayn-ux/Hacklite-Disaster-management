// Call Recording Transcription Agent
// Two-step pipeline: (1) audio -> verbatim transcript, via Gemini audio
// understanding (Sinhala/Tamil/English, code-switching allowed); (2) the
// transcript text is fed into the SAME "free text -> structured report"
// extraction module sms-report/index.ts uses for SMS text
// (_shared/reportExtraction.ts) - no separate call-specific extraction schema
// to maintain, the transcript is just treated like any other incoming
// message. Inserts directly into disasters/missing_persons/animal_rescues.
//
// Two invocation modes (see authenticateAgentCaller for the two auth paths):
//   1. Fast path: POST { call_recording_id } right after upload (admin JWT,
//      or the gateway-device cron-secret path used by receive-call-recording).
//   2. Sweep path: POST with no body - processes every call_recordings row
//      that's still 'pending', or stuck 'processing' for >10 minutes (crash
//      recovery). Used by the GitHub Actions cron as a safety net.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateAgentCaller } from '../_shared/agentAuth.ts'
import { callGeminiForAudioJSON, callGeminiForJSON } from '../_shared/geminiClient.ts'
import { guessMimeType } from '../_shared/audio.ts'
import { geocodeAddress } from '../_shared/geocode.ts'
import { buildExtractionPrompt, insertParsedReport, ParsedReport, ReportSource } from '../_shared/reportExtraction.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const STUCK_PROCESSING_MINUTES = 10

interface Transcription {
  transcript: string
  detected_language: string
}

function buildTranscribePrompt(): string {
  return `You are transcribing an emergency call recording for a disaster management system in Sri Lanka. The caller may speak Sinhala, Tamil, English, or switch between them mid-call.

Transcribe the audio verbatim, preserving whichever language(s) were actually spoken - do not translate or summarize, just transcribe exactly what was said.

Return ONLY a JSON object, no markdown fences, no extra commentary:

{
  "transcript": "verbatim transcript in the original language(s)",
  "detected_language": "e.g. Sinhala|Tamil|English|Sinhala+English mix"
}

RESPOND WITH JSON ONLY:`
}

// deno-lint-ignore no-explicit-any
async function processOneRecording(supabase: any, geminiApiKey: string, recording: any): Promise<void> {
  const { id, storage_path, original_filename, caller_phone } = recording

  await supabase.from('call_recordings').update({ status: 'processing' }).eq('id', id)

  try {
    const { data: audioBlob, error: downloadError } = await supabase.storage
      .from('call-recordings')
      .download(storage_path)

    if (downloadError || !audioBlob) {
      throw new Error(`Storage download failed: ${downloadError?.message || 'no data'}`)
    }

    const audioBuffer = new Uint8Array(await audioBlob.arrayBuffer())
    let binary = ''
    for (let i = 0; i < audioBuffer.length; i++) binary += String.fromCharCode(audioBuffer[i])
    const audioBase64 = btoa(binary)
    const mimeType = guessMimeType(original_filename || storage_path)

    // Step 1: audio -> transcript only (no classification/extraction yet).
    const transcription = await callGeminiForAudioJSON<Transcription>(audioBase64, mimeType, buildTranscribePrompt(), geminiApiKey)

    if (!transcription.ok || !transcription.data?.transcript?.trim()) {
      throw new Error('Gemini transcription failed or returned an empty transcript')
    }

    const { transcript, detected_language } = transcription.data

    // Step 2: transcript -> structured report, via the exact same module
    // sms-report uses for SMS text. The caller's phone number comes from
    // call metadata (call_recordings.caller_phone), not from asking Gemini
    // to extract it from speech - same as how sms-report already gets the
    // sender's number from the gateway payload rather than from the message.
    const extractionPrompt = buildExtractionPrompt(transcript, {
      sourceLabel: 'phone call transcript',
      defaultReporterName: 'Call Reporter',
    })
    const extraction = await callGeminiForJSON<ParsedReport>(extractionPrompt, geminiApiKey, { maxOutputTokens: 2048, temperature: 0.1 })

    if (!extraction.ok || !extraction.data) {
      throw new Error('Gemini extraction failed')
    }

    const parsed = extraction.data

    const locationAddress = parsed.data.location_address
    const geo = locationAddress ? await geocodeAddress(locationAddress) : null

    const source: ReportSource = { channel: 'call', contactNumber: caller_phone ?? null, rawText: transcript, callRecordingId: id }
    const insertResult = await insertParsedReport(supabase, parsed, source, geo)

    if (!insertResult) {
      throw new Error(`Failed to insert ${parsed.category} report`)
    }

    await supabase.from('call_recordings').update({
      status: 'completed',
      transcript,
      detected_language,
      detected_category: parsed.category,
      confidence: parsed.confidence,
      created_record_id: insertResult.id,
      created_record_table: insertResult.table,
      processed_at: new Date().toISOString(),
    }).eq('id', id)

  } catch (error) {
    console.error(`Call recording ${id} processing failed:`, error)
    await supabase.from('call_recordings').update({
      status: 'failed',
      error_message: error instanceof Error ? error.message : String(error),
      processed_at: new Date().toISOString(),
    }).eq('id', id)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authResult = await authenticateAgentCaller(req, supabase)
    if (!authResult.ok) {
      return new Response(JSON.stringify({ error: authResult.reason }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const rawBody = await req.text()
    const body = rawBody ? JSON.parse(rawBody) : {}

    if (body.call_recording_id) {
      // Fast path: process exactly the one recording just uploaded/pushed.
      const { data: recording, error } = await supabase
        .from('call_recordings')
        .select('*')
        .eq('id', body.call_recording_id)
        .single()

      if (error || !recording) {
        return new Response(JSON.stringify({ error: 'call_recording not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      await processOneRecording(supabase, geminiApiKey, recording)

      return new Response(JSON.stringify({ success: true, processed: 1 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Sweep path: pending rows, plus rows stuck in 'processing' past the
    // crash-recovery window.
    const stuckCutoff = new Date(Date.now() - STUCK_PROCESSING_MINUTES * 60 * 1000).toISOString()
    const { data: pending, error: pendingError } = await supabase
      .from('call_recordings')
      .select('*')
      .or(`status.eq.pending,and(status.eq.processing,created_at.lt.${stuckCutoff})`)
      .order('created_at', { ascending: true })
      .limit(20)

    if (pendingError) {
      throw pendingError
    }

    for (const recording of pending || []) {
      await processOneRecording(supabase, geminiApiKey, recording)
    }

    return new Response(JSON.stringify({ success: true, processed: (pending || []).length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('call-transcription-agent error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
