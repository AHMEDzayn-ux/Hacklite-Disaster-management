// Volunteer Self-Service
// =======================
// Lets a volunteer (no login account) update their own availability and
// accept/decline a proposed assignment, and browse AI-ranked suggestions for
// open cases that match their skills. Identity is proven by supplying both
// the volunteer id (returned at registration, kept in the browser) and the
// phone number on file - the same access-code-level trust model used for
// camp inventory, appropriate since these are low-stakes, reversible actions
// (not financial or destructive).
//
// Suggestions are informational only - there is no in-app "claim" action.
// The volunteer decides for themselves whether to help, using the contact
// info shown on each suggestion; nothing here writes a commitment on their
// behalf. The hard safety filter (isSafeToAssign) always runs in plain code
// BEFORE anything is ever handed to Gemini, and Gemini is only ever allowed
// to re-rank/select from that pre-filtered, already-safe candidate set - it
// can never introduce a case that wasn't already confirmed safe.

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
  action: 'update-availability' | 'respond-assignment' | 'get-suggestions' | 'update-profile'
  volunteerId: string
  phone: string
  availabilityStatus?: 'available' | 'busy' | 'offline'
  assignmentId?: string
  response?: 'accepted' | 'declined'
  skills?: string[]
  customSkill?: string | null
  groupSize?: number
  district?: string | null
  location?: { lat: number; lng: number; address?: string } | null
}

type Candidate = {
  task_type: 'disaster' | 'missing_person' | 'animal_rescue'
  task_ref_id: string
  title: string
  description: string
  district: string | null
  distance_km: number | null
  urgency: string
  matched_skill: string | null
  contact_name: string | null
  contact_phone: string | null
  heuristicScore: number
}

function buildSuggestionPrompt(volunteer: { skills: string[] | null; group_size: number | null; district: string | null }, shortlist: Candidate[]): string {
  const profile = { skills: volunteer.skills || [], group_size: volunteer.group_size || 1, district: volunteer.district || null }
  const cases = shortlist.map(c => ({
    task_type: c.task_type, task_ref_id: c.task_ref_id, title: c.title,
    description: c.description.slice(0, 200), district: c.district,
    distance_km: c.distance_km, urgency: c.urgency, matched_skill: c.matched_skill,
  }))
  return `You are helping match a disaster-relief volunteer to open cases that ALREADY passed a hard safety filter - every case below is confirmed safe for this volunteer's registered skills. Do not second-guess safety; only rank for best fit and impact.

VOLUNTEER: ${JSON.stringify(profile)}

OPEN CASES (pick only from this list, using their exact task_type and task_ref_id):
${JSON.stringify(cases)}

Rank up to 5 cases best suited to this volunteer, considering: how well their skills fit, how urgent the case is, how close it is, and whether their group size suits the scale of the work (a larger group can take on bigger jobs like debris clearing across multiple households; a solo volunteer suits a single-site task). Write one short, concrete reason per pick (under 25 words) explaining WHY it fits THIS volunteer specifically - not generic text.

RESPOND WITH JSON ONLY: {"picks": [{"task_type": "...", "task_ref_id": "...", "reason": "..."}]}`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const body: RequestBody = await req.json()
  if (!body.volunteerId || !body.phone) return json(400, { error: 'volunteerId and phone are required' })

  const { data: volunteer, error: volunteerError } = await supabase
    .from('volunteers').select('id, phone, skills, location, district, group_size').eq('id', body.volunteerId).single()
  if (volunteerError || !volunteer || volunteer.phone !== body.phone) {
    return json(401, { error: 'Volunteer id / phone combination not recognized' })
  }

  if (body.action === 'update-availability') {
    if (!body.availabilityStatus || !['available', 'busy', 'offline'].includes(body.availabilityStatus)) {
      return json(400, { error: 'availabilityStatus must be available, busy, or offline' })
    }
    const { error } = await supabase.from('volunteers').update({
      availability_status: body.availabilityStatus, last_active: new Date().toISOString(),
    }).eq('id', body.volunteerId)
    if (error) return json(500, { error: 'Failed to update availability', details: error.message })
    return json(200, { success: true })
  }

  if (body.action === 'update-profile') {
    if (!Array.isArray(body.skills) || body.skills.length === 0) {
      return json(400, { error: 'skills must be a non-empty array' })
    }
    // skills drives the hazard gate, so only known tags may be written -
    // an arbitrary string here would be dead weight at best and could
    // muddy the safety logic if the tag list ever changes.
    const unknown = body.skills.filter(s => !VOLUNTEER_SKILL_TAGS.includes(s as typeof VOLUNTEER_SKILL_TAGS[number]))
    if (unknown.length > 0) return json(400, { error: `Unknown skill(s): ${unknown.join(', ')}` })
    const groupSize = Number(body.groupSize)
    if (!Number.isFinite(groupSize) || groupSize < 1) {
      return json(400, { error: 'groupSize must be a number >= 1' })
    }
    const { error } = await supabase.from('volunteers').update({
      skills: body.skills,
      custom_skill: body.customSkill?.trim() || null,
      group_size: Math.floor(groupSize),
      district: body.district || null,
      location: body.location || null,
      last_active: new Date().toISOString(),
    }).eq('id', body.volunteerId)
    if (error) return json(500, { error: 'Failed to update profile', details: error.message })
    return json(200, { success: true })
  }

  if (body.action === 'respond-assignment') {
    if (!body.assignmentId || !body.response || !['accepted', 'declined'].includes(body.response)) {
      return json(400, { error: 'assignmentId and response (accepted|declined) are required' })
    }
    const { data: assignment, error: fetchError } = await supabase
      .from('volunteer_assignments').select('id, volunteer_id, status').eq('id', body.assignmentId).single()
    if (fetchError || !assignment || assignment.volunteer_id !== body.volunteerId) {
      return json(404, { error: 'Assignment not found for this volunteer' })
    }
    if (assignment.status !== 'proposed') return json(400, { error: `Assignment already ${assignment.status}` })

    const { error } = await supabase.from('volunteer_assignments').update({
      status: body.response, responded_at: new Date().toISOString(),
    }).eq('id', body.assignmentId)
    if (error) return json(500, { error: 'Failed to record response', details: error.message })

    return json(200, { success: true })
  }

  if (body.action === 'get-suggestions') {
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

    const vLoc = volunteer.location as { lat?: number; lng?: number } | null
    const vSkills: string[] = volunteer.skills || []

    const distanceKm = (loc: any): number | null =>
      (vLoc?.lat && vLoc?.lng && loc?.lat && loc?.lng) ? haversineKm({ lat: vLoc.lat, lng: vLoc.lng }, { lat: loc.lat, lng: loc.lng }) : null
    const matchedSkill = (required: string[]): string | null => {
      const owned = new Set(vSkills.map(s => s.toLowerCase()))
      return required.find(s => owned.has(s.toLowerCase())) ?? null
    }

    // ---- Build the candidate pool. This is the hard safety boundary: only
    // cases that pass isSafeToAssign ever enter `candidates`, so nothing
    // downstream (heuristic ranking or Gemini) can ever surface a hazardous
    // mismatch - there is no code path that hands Gemini an unsafe case.
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
        district: d.district, distance_km: dist, urgency: d.severity || 'unknown',
        matched_skill: skill, contact_name: d.reporter_name || null, contact_phone: d.contact_number || null,
        heuristicScore: (dist != null ? Math.max(0, 100 - dist) : 20) + sevWeight + (skill ? 15 : 0),
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
        district: p.district, distance_km: dist, urgency: hazardous ? 'high' : 'normal',
        matched_skill: skill, contact_name: p.reporter_name || null, contact_phone: p.contact_number || null,
        heuristicScore: (dist != null ? Math.max(0, 100 - dist) : 20) + Math.min(40, hoursMissing / 2) + (skill ? 15 : 0),
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
        district: a.district, distance_km: dist, urgency: a.condition === 'critical' ? 'high' : 'normal',
        matched_skill: skill, contact_name: a.reporter_name || null, contact_phone: a.contact_number || null,
        heuristicScore: (dist != null ? Math.max(0, 100 - dist) : 20) + (a.condition === 'critical' ? 25 : 10) + (skill ? 15 : 0),
      })
    }

    candidates.sort((a, b) => b.heuristicScore - a.heuristicScore)
    const shortlist = candidates.slice(0, SHORTLIST_FOR_AI)

    // ---- AI ranking + reasoning over the already-safe shortlist. Gemini
    // may only select task_type/task_ref_id pairs that exist in `shortlist`
    // (validated below) - it ranks and explains, it never adds candidates.
    let picked: Array<Candidate & { reason: string }> | null = null
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (geminiApiKey && shortlist.length > 0) {
      const result = await callGeminiForJSON<{ picks: { task_type: string; task_ref_id: string; reason: string }[] }>(
        buildSuggestionPrompt(volunteer, shortlist), geminiApiKey, { maxOutputTokens: 600 }
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
      // safety-gated, distance/urgency/skill-ranked list, just without an
      // AI-written explanation.
      picked = shortlist.slice(0, SUGGESTIONS_LIMIT).map(c => ({
        ...c,
        reason: c.matched_skill
          ? `Matches your ${c.matched_skill.replace('_', ' ')} skill${c.distance_km != null ? `, ~${c.distance_km.toFixed(1)}km away` : ''}.`
          : 'Open case near you within your safety profile.',
      }))
    }

    const suggestions = picked.map(c => ({
      task_type: c.task_type, task_ref_id: c.task_ref_id, title: c.title, subtitle: c.description.slice(0, 200),
      district: c.district, distance_km: c.distance_km, urgency: c.urgency, matched_skill: c.matched_skill,
      reason: c.reason, contact_name: c.contact_name, contact_phone: c.contact_phone,
    }))

    return json(200, { success: true, suggestions })
  }

  return json(400, { error: 'Unknown action' })
})
