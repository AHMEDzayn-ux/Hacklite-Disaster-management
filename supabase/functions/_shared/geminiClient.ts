// Shared Gemini helper for every agent that generates a natural-language
// narrative (Situation Awareness SITREPs, Resource Allocation
// recommendations, duplicate-report similarity checks). Mirrors the raw-fetch,
// no-SDK style already used in sms-report/index.ts, and applies the same
// "strip markdown code fences, then JSON.parse" cleanup.
//
// Every caller MUST have a deterministic fallback for when this returns null
// (quota exhausted, network failure, malformed response) - no agent run
// should ever fail solely because Gemini was unavailable.

const GEMINI_MODEL = 'gemini-flash-lite-latest';

// Supabase edge functions get force-killed at ~150s wall time with no chance
// to run their own catch block or update the DB - seen in practice with
// call-transcription-agent leaving a row stuck in 'processing' forever after
// a Gemini audio call hung. Aborting well before that lets every caller's
// own try/catch handle the failure (mark the row 'failed' with a real error)
// instead of the platform silently killing the whole invocation.
const GEMINI_TIMEOUT_MS = 100_000;

export interface GeminiCallResult<T> {
    ok: boolean;
    data: T | null;
}

/**
 * Calls Gemini with a prompt that must respond with JSON only, and parses
 * that JSON. Returns { ok: false, data: null } on any failure - callers fall
 * back to a deterministic template rather than propagating the error.
 */
export async function callGeminiForJSON<T>(
    prompt: string,
    apiKey: string,
    options: { maxOutputTokens?: number; temperature?: number } = {}
): Promise<GeminiCallResult<T>> {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: options.temperature ?? 0.2,
                    topK: 1,
                    topP: 0.95,
                    maxOutputTokens: options.maxOutputTokens ?? 300,
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                ]
            })
        });

        if (!response.ok) {
            console.error('Gemini API error:', response.status, await response.text());
            return { ok: false, data: null };
        }

        const result = await response.json();
        const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textContent) {
            console.error('No text content in Gemini response');
            return { ok: false, data: null };
        }

        let cleaned = textContent.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
        cleaned = cleaned.trim();

        const parsed = JSON.parse(cleaned) as T;
        return { ok: true, data: parsed };
    } catch (error) {
        console.error('Gemini call failed:', error);
        return { ok: false, data: null };
    }
}

export const GEMINI_MODEL_NAME = GEMINI_MODEL;

// Audio-understanding model for call-transcription-agent. Originally set to
// 'gemini-2.0-flash' on the theory that multilingual (Sinhala/Tamil/English,
// code-switched) audio needs a fuller model than the flash-lite one above -
// but that model has a hard 0-request free-tier quota for this project's key
// (confirmed via a live 429: "limit: 0 ... free_tier_requests ... model:
// gemini-2.0-flash"), not just a rate limit. Falling back to the same model
// already proven to have quota on this key (used by every text-based agent
// via callGeminiForJSON below). Revisit if transcription quality suffers -
// that's a real risk noted when this was designed, just not the blocker here.
const GEMINI_AUDIO_MODEL = GEMINI_MODEL;

/**
 * Same contract as callGeminiForJSON, but sends inline audio alongside the
 * text prompt so Gemini can transcribe + reason over a call recording in one
 * call. audioBase64 must be plain base64 (no data: URL prefix).
 */
export async function callGeminiForAudioJSON<T>(
    audioBase64: string,
    mimeType: string,
    prompt: string,
    apiKey: string,
    options: { model?: string; maxOutputTokens?: number; temperature?: number } = {}
): Promise<GeminiCallResult<T>> {
    try {
        const model = options.model ?? GEMINI_AUDIO_MODEL;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { inlineData: { mimeType, data: audioBase64 } },
                        { text: prompt },
                    ]
                }],
                generationConfig: {
                    temperature: options.temperature ?? 0.1,
                    topK: 1,
                    topP: 0.95,
                    maxOutputTokens: options.maxOutputTokens ?? 4096,
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                ]
            })
        });

        if (!response.ok) {
            console.error('Gemini audio API error:', response.status, await response.text());
            return { ok: false, data: null };
        }

        const result = await response.json();
        const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textContent) {
            console.error('No text content in Gemini audio response');
            return { ok: false, data: null };
        }

        let cleaned = textContent.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
        cleaned = cleaned.trim();

        const parsed = JSON.parse(cleaned) as T;
        return { ok: true, data: parsed };
    } catch (error) {
        console.error('Gemini audio call failed:', error);
        return { ok: false, data: null };
    }
}

export const GEMINI_AUDIO_MODEL_NAME = GEMINI_AUDIO_MODEL;
