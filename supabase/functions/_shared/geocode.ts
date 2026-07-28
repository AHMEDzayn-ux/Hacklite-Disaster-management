// Shared free-text -> lat/lng geocoding via OpenStreetMap Nominatim (free, no
// API key). Used by every "extract structured data from free text" pipeline
// (sms-report, call-transcription-agent) so there's one place that owns the
// User-Agent and error handling.

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
            { headers: { 'User-Agent': 'DisasterManagementReportExtraction/1.0' } }
        )
        if (!response.ok) {
            console.error('Geocoding API error:', response.status)
            return null
        }
        const results = await response.json()
        if (results && results.length > 0) {
            return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
        }
        return null
    } catch (error) {
        console.error('Geocoding error:', error)
        return null
    }
}
