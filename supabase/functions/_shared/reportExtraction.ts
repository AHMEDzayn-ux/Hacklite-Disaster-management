// Shared "free text -> structured disaster/missing-person/animal-rescue
// report" extraction module. Originally lived only in sms-report/index.ts;
// factored out so call-transcription-agent can feed it a call transcript and
// get the exact same schema/prompt/insert behavior SMS reports already get,
// instead of maintaining a second, drifting copy. Any channel that can turn
// its input into plain text (SMS body, call transcript, ...) can reuse this
// unchanged - it has no opinion on where the text came from.

export interface Location {
    lat: number | null
    lng: number | null
    address: string
}

export interface DisasterReportData {
    disaster_type: string
    severity: string
    people_affected?: string | null
    casualties?: string | null
    needs?: Record<string, boolean> | null
    location_address: string
    occurred_date?: string | null
    area_size?: string | null
    reporter_name: string
}

export interface MissingPersonReportData {
    name: string
    age: number | null
    gender: string
    description?: string | null
    location_address: string
    last_seen_date: string
    reporter_name: string
}

export interface AnimalRescueReportData {
    animal_type: string
    breed?: string | null
    condition: string
    is_dangerous?: boolean
    location_address: string
    reporter_name: string
}

export interface ParsedReport {
    category: 'disaster' | 'missing_person' | 'animal_rescue'
    confidence: number
    data: DisasterReportData | MissingPersonReportData | AnimalRescueReportData
}

/**
 * Builds the extraction prompt. sourceLabel/defaultReporterName let each
 * channel describe itself accurately (e.g. "SMS message" vs "phone call
 * transcript") while sharing the same schema and rules.
 */
export function buildExtractionPrompt(
    text: string,
    opts: { sourceLabel: string; defaultReporterName: string }
): string {
    const currentDate = new Date().toISOString()
    const sourceLabelUpper = opts.sourceLabel.toUpperCase()

    return `You are an AI assistant for a disaster management system. Analyze the following ${opts.sourceLabel} and extract structured information.

${sourceLabelUpper}:
"${text}"

CURRENT DATE/TIME: ${currentDate}

TASK:
1. Determine the report category: "disaster", "missing_person", or "animal_rescue"
2. Extract ONLY the fields specified below (these match our database schema)
3. Return a valid JSON object

CATEGORY DEFINITIONS:
- disaster: Reports about floods, fires, earthquakes, landslides, cyclones, building collapse, etc.
- missing_person: Reports about people who are lost, missing, or cannot be found
- animal_rescue: Reports about animals that need rescue (stranded, injured, trapped)

REQUIRED JSON STRUCTURE (only these exact fields):

For DISASTER reports:
{
  "category": "disaster",
  "confidence": 0.0-1.0,
  "data": {
    "disaster_type": "flood|landslide|fire|earthquake|cyclone|drought|tsunami|building-collapse|other",
    "severity": "low|moderate|high|critical",
    "people_affected": "0|1-10|11-50|51-100|100+" or null,
    "casualties": "none|minor|serious|fatalities" or null,
    "needs": {"rescue": bool, "medical": bool, "shelter": bool, "food": bool, "water": bool, "evacuation": bool} or null,
    "location_address": "extracted location text",
    "occurred_date": "ISO datetime or null",
    "area_size": "description of area size" or null,
    "reporter_name": "name if mentioned, else '${opts.defaultReporterName}'"
  }
}

For MISSING_PERSON reports:
{
  "category": "missing_person",
  "confidence": 0.0-1.0,
  "data": {
    "name": "person's name or 'Unknown Person'",
    "age": number, or null if not stated - do not guess an age,
    "gender": "male|female|other",
    "description": "physical description, clothing, etc." or null,
    "location_address": "last seen location",
    "last_seen_date": "ISO datetime (use current time if not specified)",
    "reporter_name": "name if mentioned, else '${opts.defaultReporterName}'"
  }
}

For ANIMAL_RESCUE reports:
{
  "category": "animal_rescue",
  "confidence": 0.0-1.0,
  "data": {
    "animal_type": "dog|cat|cattle|goat|bird|wildlife|other",
    "breed": "breed or size description" or null,
    "condition": "healthy|injured|trapped|sick|critical",
    "is_dangerous": boolean,
    "location_address": "location description",
    "reporter_name": "name if mentioned, else '${opts.defaultReporterName}'"
  }
}

RULES:
1. Return ONLY valid JSON, no additional text
2. Use ONLY the fields shown above - no extra fields
3. If category is unclear, choose the most likely based on keywords
4. Set confidence based on how clear the ${opts.sourceLabel} is (0.5-1.0)
5. Extract location as descriptive text in location_address field
6. Do NOT invent facts that weren't stated - if information is missing, use null (or the literal default noted above for name/reporter_name). Never guess a specific number, name, or age that wasn't mentioned.
7. For severity, infer from urgency words/tone (emergency, urgent, critical, panicked = high/critical) - that's reading tone, not inventing facts.
8. Do not decide who should respond, assign a responder, or set a priority level - that's out of scope for this extraction step and handled elsewhere in the system.

RESPOND WITH JSON ONLY:`
}

/** Which channel a report came from, and the source-specific fields each channel already knows without asking Gemini to extract them (e.g. a phone number that came from call/SMS metadata, not from the text itself). */
export interface ReportSource {
    channel: 'sms' | 'call'
    contactNumber: string | null
    rawText: string
    callRecordingId?: string
}

function sourceTag(source: ReportSource): string {
    return source.channel === 'sms' ? 'SMS Report' : 'Call Report'
}

function defaultReporterNameFor(source: ReportSource): string {
    return source.channel === 'sms' ? 'SMS Reporter' : 'Call Reporter'
}

function sourceColumns(source: ReportSource): Record<string, unknown> {
    return source.channel === 'sms'
        ? { reported_via_sms: true, sms_sender_phone: source.contactNumber }
        : { reported_via_call: true, call_recording_id: source.callRecordingId ?? null }
}

// contact_number is NOT NULL on the live disasters/missing_persons/animal_rescues
// tables. sms-report never hits this because it always has a real phone
// number (or 'unknown') from the gateway payload - but a call's caller_phone
// is genuinely optional (staff may not always capture it), so this channel
// needs its own fallback rather than passing a possible null straight through.
function contactNumberFor(source: ReportSource): string {
    return source.contactNumber || 'Unknown'
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any

export async function insertDisasterReport(
    supabase: SupabaseClient,
    data: DisasterReportData,
    source: ReportSource,
    geo: { lat: number; lng: number } | null
): Promise<{ id: string } | null> {
    const insertData = {
        disaster_type: data.disaster_type || 'other',
        severity: data.severity || 'moderate',
        description: `[${sourceTag(source)}] ${source.rawText}`,
        people_affected: data.people_affected || null,
        casualties: data.casualties || null,
        needs: data.needs || null,
        location: { lat: geo?.lat ?? null, lng: geo?.lng ?? null, address: data.location_address || 'Unknown location' } as Location,
        occurred_date: data.occurred_date || null,
        area_size: data.area_size || null,
        reporter_name: data.reporter_name || defaultReporterNameFor(source),
        contact_number: contactNumberFor(source),
        status: 'Active',
        ...sourceColumns(source),
    }

    const { data: inserted, error } = await supabase.from('disasters').insert(insertData).select('id').single()
    if (error) {
        console.error('Insert disaster error:', error)
        return null
    }
    return inserted
}

export async function insertMissingPersonReport(
    supabase: SupabaseClient,
    data: MissingPersonReportData,
    source: ReportSource,
    geo: { lat: number; lng: number } | null
): Promise<{ id: string } | null> {
    const insertData = {
        name: data.name || 'Unknown Person',
        // Gemini is told not to guess an age - null here falls back to 30 only
        // as a last-resort DB safety net (in case the column is NOT NULL), not
        // because the AI invented it.
        age: data.age || 30,
        gender: data.gender || 'other',
        description: data.description || null,
        last_seen_location: { lat: geo?.lat ?? null, lng: geo?.lng ?? null, address: data.location_address || 'Unknown location' } as Location,
        last_seen_date: data.last_seen_date || new Date().toISOString(),
        reporter_name: data.reporter_name || defaultReporterNameFor(source),
        contact_number: contactNumberFor(source),
        additional_info: `[${sourceTag(source)}] ${source.rawText}`,
        status: 'Active',
        ...sourceColumns(source),
    }

    const { data: inserted, error } = await supabase.from('missing_persons').insert(insertData).select('id').single()
    if (error) {
        console.error('Insert missing person error:', error)
        return null
    }
    return inserted
}

export async function insertAnimalRescueReport(
    supabase: SupabaseClient,
    data: AnimalRescueReportData,
    source: ReportSource,
    geo: { lat: number; lng: number } | null
): Promise<{ id: string } | null> {
    const insertData = {
        animal_type: data.animal_type || 'other',
        breed: data.breed || null,
        description: `[${sourceTag(source)}] ${source.rawText}`,
        condition: data.condition || 'trapped',
        is_dangerous: data.is_dangerous || false,
        location: { lat: geo?.lat ?? null, lng: geo?.lng ?? null, address: data.location_address || 'Unknown location' } as Location,
        reporter_name: data.reporter_name || defaultReporterNameFor(source),
        contact_number: contactNumberFor(source),
        status: 'Pending',
        ...sourceColumns(source),
    }

    const { data: inserted, error } = await supabase.from('animal_rescues').insert(insertData).select('id').single()
    if (error) {
        console.error('Insert animal rescue error:', error)
        return null
    }
    return inserted
}

/**
 * Runs the full "parsed report -> geocode -> insert into the right table"
 * tail end of the pipeline, shared by every channel once it has a
 * ParsedReport. Returns the inserted row id + table name, or null if the
 * category was unrecognized or the insert failed.
 */
export async function insertParsedReport(
    supabase: SupabaseClient,
    parsed: ParsedReport,
    source: ReportSource,
    geo: { lat: number; lng: number } | null
): Promise<{ id: string; table: string } | null> {
    switch (parsed.category) {
        case 'disaster': {
            const result = await insertDisasterReport(supabase, parsed.data as DisasterReportData, source, geo)
            return result ? { id: result.id, table: 'disasters' } : null
        }
        case 'missing_person': {
            const result = await insertMissingPersonReport(supabase, parsed.data as MissingPersonReportData, source, geo)
            return result ? { id: result.id, table: 'missing_persons' } : null
        }
        case 'animal_rescue': {
            const result = await insertAnimalRescueReport(supabase, parsed.data as AnimalRescueReportData, source, geo)
            return result ? { id: result.id, table: 'animal_rescues' } : null
        }
        default:
            return null
    }
}
