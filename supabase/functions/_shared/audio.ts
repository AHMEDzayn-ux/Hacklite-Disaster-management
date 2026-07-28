// Shared audio helpers for call-transcription-agent and receive-call-recording
// - kept dependency-free (no Deno/env access) so it's usable from either.

export const AUDIO_MIME_BY_EXT: Record<string, string> = {
    mp3: 'audio/mp3', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac',
    ogg: 'audio/ogg', flac: 'audio/flac', webm: 'audio/webm', amr: 'audio/amr',
}

export function guessMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    return AUDIO_MIME_BY_EXT[ext] || 'audio/mpeg'
}

export function isAllowedAudioExt(path: string): boolean {
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    return ext in AUDIO_MIME_BY_EXT
}

// Gemini inline-audio requests must stay well under the API's request size
// ceiling once base64-encoded (~33% larger than the raw file). 20MB raw is a
// safe ceiling for now; larger recordings need the Gemini Files API instead
// of inline data, which isn't implemented here.
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024
