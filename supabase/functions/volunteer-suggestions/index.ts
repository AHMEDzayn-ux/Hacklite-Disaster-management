// Volunteer Suggestions (stateless)
// ==================================
// Volunteering here needs no account and no registration: a person describes
// what they can contribute (skills, group size, where they are) and gets back
// AI-ranked, safety-checked open cases they could help with, along with the
// reporter's contact details so they can reach out directly.
//
// Nothing is stored. No volunteer row, no assignment, no commitment - the
// request carries the whole profile and the response is purely informational.
//
// SAFETY: the hard filter (isSafeToAssign) runs in plain code BEFORE anything
// reaches Gemini, and Gemini may only re-rank/select from that pre-filtered
// set (validated on the way back). There is no code path that can surface a
// hazardous case to someone who didn't declare a hazard-capable skill.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { haversineKm } from '../_shared/geo.ts'
import { callGeminiForJSON } from '../_shared/geminiClient.ts'
import {
  inferDisasterRequiredSkills, isDisasterHazardous,
  inferMissingPersonRequiredSkills, isMissingPersonHazardous,
  inferAnimalRescueRequiredSkills, isAnimalRescueHazardous,
  isSafeToAssign, VOLUNTEER_SKILL_TAGS,
} from '../_shared/taskSkills.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

const SUGGESTIONS_LIMIT = 5
const CANDIDATE_POOL_PER_TYPE = 50
const SHORTLIST_FOR_AI = 15 // keep the Gemini prompt small/fast - pre-rank with the heuristic, then let AI pick+explain the best of the shortlist

interface RequestBody {
  skills?: string[]
  customSkill?: string | null
  groupSize?: number
  district?: string | null
  location?: { lat?: number; lng?: number } | null
}

type Candidate = {
  task_type: 'disaster' | 'missing_person' | 'animal_rescue'
  task_ref_id: string
  title: string
  description: string
  district: string | null
  address: string | null
  distance_km: number | null
  urgency: string
  matched_skill: string | null
  contact_name: string | null
  contact_phone: string | null
  heuristicScore: number
}

// The auto-classifier writes 'Unclassified' when it can't place a report -
// that's a placeholder, not a location, so treat it as no district rather
// than showing it to a volunteer as if it meant something.
const realDistrict = (d: string | null | undefined): string | null =>
  (!d || d === 'Unclassified') ? null : d

function buildSuggestionPrompt(
  profile: { skills: string[]; groupSize: number; district: string | null; customSkill: string | null },
  shortlist: Candidate[]
): string {
  const cases = shortlist.map(c => ({
    task_type: c.task_type, task_ref_id: c.task_ref_id, title: c.title,
    description: c.description.slice(0, 200), district: c.district,
    distance_km: c.distance_km, urgency: c.urgency, matched_skill: c.matched_skill,
  }))
  return `You are helping someone who wants to volunteer in a disaster response find the cases where they'd be most useful. Every case below ALREADY passed a hard safety filter and is confirmed safe for what this person can do. Do not second-guess safety; only rank for best fit and impact.

WHAT THIS PERSON CAN CONTRIBUTE: ${JSON.stringify(profile)}

OPEN CASES (pick only from this list, using their exact task_type and task_ref_id):
${JSON.stringify(cases)}

Rank up to 5 cases where this person would genuinely help most, considering: how well what they can do fits what the case needs, how urgent it is, how close it is, and whether the number of people they can bring suits the scale of the work (a larger group can take on bigger jobs like clearing debris across multiple households; one person suits a single-site task). Write one short, concrete reason per pick (under 25 words) saying WHY it fits THIS person specifically - not generic text.

RESPOND WITH JSON ONLY: {"picks": [{"task_type": "...", "task_ref_id": "...", "reason": "..."}]}`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const body: RequestBody = await req.json()

  if (!Array.isArray(body.skills) || body.skills.length === 0) {
    return json(400, { error: 'Tell us at least one thing you can help with.' })
  }
  // skills drives the hazard gate, so only known tags are accepted - an
  // arbitrary string must never be able to reach the safety logic.
  const unknown = body.skills.filter(s => !VOLUNTEER_SKILL_TAGS.includes(s as typeof VOLUNTEER_SKILL_TAGS[number]))
  if (unknown.length > 0) return json(400, { error: `Unknown skill(s): ${unknown.join(', ')}` })

  const groupSize = Math.max(1, Math.floor(Number(body.groupSize) || 1))
  const vSkills = body.skills
  const vLoc = body.location ?? null

  const [{ data: disasters }, { data: missing }, { data: animals }] = await Promise.all([
    supabase.from('disasters')
      .select('id, disaster_type, severity, description, needs, location, district, created_at, contact_number, reporter_name')
      .eq('status', 'Active').order('created_at', { ascending: false }).limit(CANDIDATE_POOL_PER_TYPE),
    supabase.from('missing_persons')
      .select('id, name, age, description, additional_info, last_seen_location, district, created_at, contact_number, reporter_name')
      .eq('status', 'Active').order('created_at', { ascending: false }).limit(CANDIDATE_POOL_PER_TYPE),
    supabase.from('animal_rescues')
      .select('id, animal_type, condition, is_dangerous, description, location, district, created_at, contact_number, reporter_name')
      .eq('status', 'Active').order('created_at', { ascending: false }).limit(CANDIDATE_POOL_PER_TYPE),
  ])

  // Coordinates arrive as JSONB and from client input, so coerce rather than
  // trusting the type - a numeric string would otherwise pass the truthiness
  // check and feed NaN-prone arithmetic into the distance math.
  const coord = (v: unknown): number | null => {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  const distanceKm = (loc: any): number | null => {
    const aLat = coord(vLoc?.lat), aLng = coord(vLoc?.lng)
    const bLat = coord(loc?.lat), bLng = coord(loc?.lng)
    if (aLat == null || aLng == null || bLat == null || bLng == null) return null
    return haversineKm({ lat: aLat, lng: aLng }, { lat: bLat, lng: bLng })
  }
  const matchedSkill = (required: string[]): string | null => {
    const owned = new Set(vSkills.map(s => s.toLowerCase()))
    return required.find(s => owned.has(s.toLowerCase())) ?? null
  }
  // Someone in the same district but without coordinates still deserves to
  // rank above an unrelated far-away case, so give a district match most of
  // the weight a very close coordinate match would earn.
  const localityScore = (caseDistrict: string | null, dist: number | null): number => {
    if (dist != null) return Math.max(0, 100 - dist)
    if (body.district && caseDistrict && body.district === caseDistrict) return 70
    return 20
  }

  // ---- Candidate pool: the hard safety boundary. Only cases passing
  // isSafeToAssign ever enter this array, so neither the heuristic ranking
  // nor Gemini can surface a hazardous mismatch.
  const candidates: Candidate[] = []

  for (const d of disasters ?? []) {
    const requiredSkills = inferDisasterRequiredSkills(d.needs)
    if (!isSafeToAssign(vSkills, requiredSkills, isDisasterHazardous(d))) continue
    const dist = distanceKm(d.location)
    const sevWeight = d.severity === 'critical' ? 40 : d.severity === 'high' ? 25 : d.severity === 'moderate' ? 10 : 0
    const skill = matchedSkill(requiredSkills)
    candidates.push({
      task_type: 'disaster', task_ref_id: d.id,
      title: `${String(d.disaster_type || 'Disaster').replace('-', ' ')} report`,
      description: d.description ? String(d.description) : 'No description provided',
      district: realDistrict(d.district), address: d.location?.address || null,
      distance_km: dist, urgency: d.severity || 'unknown',
      matched_skill: skill, contact_name: d.reporter_name || null, contact_phone: d.contact_number || null,
      heuristicScore: localityScore(realDistrict(d.district), dist) + sevWeight + (skill ? 15 : 0),
    })
  }

  for (const p of missing ?? []) {
    const requiredSkills = inferMissingPersonRequiredSkills(p)
    const hazardous = isMissingPersonHazardous(p)
    if (!isSafeToAssign(vSkills, requiredSkills, hazardous)) continue
    const dist = distanceKm(p.last_seen_location)
    const hoursMissing = (Date.now() - new Date(p.created_at).getTime()) / 3600000
    const skill = matchedSkill(requiredSkills)
    candidates.push({
      task_type: 'missing_person', task_ref_id: p.id,
      title: `Search for ${p.name || 'missing person'}${p.age != null ? `, ${p.age}` : ''}`,
      description: p.description ? String(p.description) : 'No description provided',
      district: realDistrict(p.district), address: p.last_seen_location?.address || null,
      distance_km: dist, urgency: hazardous ? 'high' : 'normal',
      matched_skill: skill, contact_name: p.reporter_name || null, contact_phone: p.contact_number || null,
      heuristicScore: localityScore(realDistrict(p.district), dist) + Math.min(40, hoursMissing / 2) + (skill ? 15 : 0),
    })
  }

  for (const a of animals ?? []) {
    const requiredSkills = inferAnimalRescueRequiredSkills()
    if (!isSafeToAssign(vSkills, requiredSkills, isAnimalRescueHazardous(a))) continue
    const dist = distanceKm(a.location)
    const skill = matchedSkill(requiredSkills)
    candidates.push({
      task_type: 'animal_rescue', task_ref_id: a.id,
      title: `${String(a.animal_type || 'Animal')} rescue`,
      description: a.description ? String(a.description) : 'No description provided',
      district: realDistrict(a.district), address: a.location?.address || null,
      distance_km: dist, urgency: a.condition === 'critical' ? 'high' : 'normal',
      matched_skill: skill, contact_name: a.reporter_name || null, contact_phone: a.contact_number || null,
      heuristicScore: localityScore(realDistrict(a.district), dist) + (a.condition === 'critical' ? 25 : 10) + (skill ? 15 : 0),
    })
  }

  candidates.sort((a, b) => b.heuristicScore - a.heuristicScore)
  const shortlist = candidates.slice(0, SHORTLIST_FOR_AI)

  // ---- AI ranking + reasoning over the already-safe shortlist. Gemini may
  // only return task_type/task_ref_id pairs present in the shortlist
  // (validated below) - it ranks and explains, it never adds candidates.
  let picked: Array<Candidate & { reason: string }> | null = null
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  if (geminiApiKey && shortlist.length > 0) {
    const profile = {
      skills: vSkills, groupSize, district: body.district || null,
      customSkill: body.customSkill?.trim() || null,
    }
    const result = await callGeminiForJSON<{ picks: { task_type: string; task_ref_id: string; reason: string }[] }>(
      buildSuggestionPrompt(profile, shortlist), geminiApiKey, { maxOutputTokens: 600 }
    )
    if (result.ok && result.data?.picks?.length) {
      const byKey = new Map(shortlist.map(c => [`${c.task_type}:${c.task_ref_id}`, c]))
      const validated: Array<Candidate & { reason: string }> = []
      for (const p of result.data.picks) {
        const c = byKey.get(`${p.task_type}:${p.task_ref_id}`)
        if (!c) continue
        validated.push({ ...c, reason: String(p.reason || '').slice(0, 200) })
        if (validated.length >= SUGGESTIONS_LIMIT) break
      }
      if (validated.length > 0) picked = validated
    }
  }

  if (!picked) {
    // Deterministic fallback (no Gemini key, or the call failed) - still a
    // safety-gated, locality/urgency/skill-ranked list, just without an
    // AI-written explanation.
    picked = shortlist.slice(0, SUGGESTIONS_LIMIT).map(c => ({
      ...c,
      reason: c.matched_skill
        ? `Matches your ${c.matched_skill.replace('_', ' ')} skill${c.distance_km != null ? `, ~${c.distance_km.toFixed(1)}km away` : ''}.`
        : 'Open case within what you said you can help with.',
    }))
  }

  const suggestions = picked.map(c => ({
    task_type: c.task_type, task_ref_id: c.task_ref_id, title: c.title, subtitle: c.description.slice(0, 200),
    district: c.district, address: c.address, distance_km: c.distance_km, urgency: c.urgency,
    matched_skill: c.matched_skill, reason: c.reason,
    contact_name: c.contact_name, contact_phone: c.contact_phone,
  }))

  return json(200, { success: true, suggestions })
})
