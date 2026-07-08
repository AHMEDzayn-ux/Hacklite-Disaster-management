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
