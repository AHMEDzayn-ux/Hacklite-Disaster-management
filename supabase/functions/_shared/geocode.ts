// Shared free-text -> lat/lng geocoding via OpenStreetMap Nominatim (free, no
// API key). Used by every "extract structured data from free text" pipeline
// (sms-report, call-transcription-agent) so there's one place that owns the
// User-Agent, the query shaping and the error handling.
//
// Why the query shaping exists: Gemini extracts addresses as prose, and
// Nominatim wants comma-separated components. Measured against the live service:
//
//   "Peradeniya Road in Kandy"  -> no result
//   "Peradeniya Road, Kandy"    -> 7.2838657, 80.6236588
//
// One preposition was the difference between a report on the map and a report
// with a null location. That mattered more than it looks: a null location also
// means a null district, and the situation-awareness, incident-prioritisation
// and resource-allocation agents all key off district - so a report nobody can
// geocode is a report those agents cannot see at all.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'DisasterManagementReportExtraction/1.0'

/** Nominatim asks for at most 1 request/second; only paid on retries. */
const RETRY_DELAY_MS = 1100

const FILLER = /\b(?:in|at|near|close to|next to|opposite|behind|beside|by|around|along|off)\b/gi

/**
 * Progressively broader query candidates for one free-text address.
 *
 * Ordered most specific first. Falling back to a broader component is
 * deliberate: a town-level fix still puts the report on the map and in the right
 * district, which is far more useful than nothing.
 */
export function geocodeCandidates(address: string): string[] {
    const candidates: string[] = []
    const push = (value: string) => {
        const cleaned = value.replace(/\s+/g, ' ').replace(/^[,\s]+|[,\s]+$/g, '').trim()
        if (cleaned && !candidates.includes(cleaned)) candidates.push(cleaned)
    }

    const original = address.replace(/\s+/g, ' ').trim()
    push(original)

    // Turn prose into components: "X in Y" -> "X, Y".
    const decomposed = original
        .replace(FILLER, ',')
        .replace(/\s*,\s*/g, ', ')
        .replace(/(?:,\s*)+/g, ', ')
    push(decomposed)

    // Then drop the most specific component, one at a time.
    const parts = decomposed.split(',').map(part => part.trim()).filter(Boolean)
    for (let i = 1; i < parts.length; i++) push(parts.slice(i).join(', '))

    return candidates
}

async function queryNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
    // countrycodes=lk keeps "Kandy" from resolving to a namesake abroad - every
    // report in this system is Sri Lankan.
    const url = `${NOMINATIM_URL}?format=json&countrycodes=lk&limit=1&q=${encodeURIComponent(query)}`
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })

    if (!response.ok) {
        console.error(`Geocoding API error ${response.status} for "${query}"`)
        return null
    }

    const results = await response.json()
    if (!Array.isArray(results) || results.length === 0) return null

    const lat = parseFloat(results[0].lat)
    const lng = parseFloat(results[0].lon)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    if (!address || !address.trim()) return null

    const candidates = geocodeCandidates(address)

    for (let i = 0; i < candidates.length; i++) {
        if (i > 0) await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
        try {
            const hit = await queryNominatim(candidates[i])
            if (hit) {
                if (i > 0) console.log(`Geocoded "${address}" via fallback "${candidates[i]}"`)
                return hit
            }
        } catch (error) {
            console.error(`Geocoding error for "${candidates[i]}":`, error)
        }
    }

    console.log(`Could not geocode "${address}" (tried ${candidates.length} variants)`)
    return null
}
