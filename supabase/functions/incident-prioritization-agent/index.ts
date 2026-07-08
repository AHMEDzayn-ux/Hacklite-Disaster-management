// Incident Prioritization + Duplicate Report Detection Agent
// ============================================================
// 1. Prioritization: EMD-style triage score per active disaster report,
//    re-ranked every run, surfaced as incident_priority_queue.
// 2. Duplicate detection: flags likely-duplicate reports (same disaster_type,
//    within 2km and 6h of each other, similar description) for admin
//    confirm/reject - NEVER auto-merged.
//
// Auth: same admin-JWT / x-agent-cron-secret dual path as every other agent.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { authenticateAgentCaller } from '../_shared/agentAuth.ts'
import { computePriorityScore, type Severity, type PeopleAffectedBucket, type CasualtiesBucket } from '../_shared/scoring.ts'
import { haversineKm } from '../_shared/geo.ts'
import { jaccardSimilarity } from '../_shared/textSimilarity.ts'
import { callGeminiForJSON } from '../_shared/geminiClient.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

const DUPLICATE_RADIUS_KM = 2
const DUPLICATE_WINDOW_HOURS = 6
const JACCARD_HIGH_CONFIDENCE = 0.5
const JACCARD_LOW_CUTOFF = 0.15

function buildDuplicateCheckPrompt(a: any, b: any): string {
  return `Two disaster reports were filed close together in time and location. Determine if they likely describe the SAME real-world incident or two DIFFERENT incidents.

REPORT A: "${a.description ?? ''}" (type: ${a.disaster_type})
REPORT B: "${b.description ?? ''}" (type: ${b.disaster_type})

RESPOND WITH JSON ONLY: {"same_incident": true|false, "confidence": 0.0-1.0}`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const auth = await authenticateAgentCaller(req, supabase)
  if (!auth.ok) return json(401, { error: auth.reason })

  const runStart = Date.now()
  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({ agent_name: 'incident_prioritization', trigger_source: auth.source, triggered_by: auth.userId, status: 'running' })
    .select('id')
    .single()

  if (runError || !run) return json(500, { error: 'Failed to create agent_runs row', details: runError?.message })

  let itemsOk = 0, itemsFailed = 0, geminiCalls = 0, geminiFailures = 0
  let duplicatesFlagged = 0

  try {
    const { data: activeDisasters } = await supabase
      .from('disasters')
      .select('id, district, severity, casualties, people_affected, created_at, description, disaster_type, location, duplicate_status, possible_duplicate_of')
      .eq('status', 'Active')

    const { data: camps } = await supabase
      .from('camps')
      .select('id, latitude, longitude, capacity, current_occupancy')
      .eq('status', 'Active')

    const disasters = activeDisasters ?? []

    // ---------- Duplicate detection ----------
    for (let i = 0; i < disasters.length; i++) {
      for (let j = i + 1; j < disasters.length; j++) {
        const a = disasters[i], b = disasters[j]
        // Skip pairs where either side already has an admin decision recorded.
        if (a.duplicate_status === 'confirmed_distinct' || b.duplicate_status === 'confirmed_distinct') continue
        if (a.duplicate_status === 'confirmed_duplicate' || b.duplicate_status === 'confirmed_duplicate') continue
        if (a.disaster_type !== b.disaster_type) continue

        const hoursApart = Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) / 3600000
        if (hoursApart > DUPLICATE_WINDOW_HOURS) continue

        const locA = a.location, locB = b.location
        if (!locA?.lat || !locA?.lng || !locB?.lat || !locB?.lng) continue
        const distanceKm = haversineKm({ lat: locA.lat, lng: locA.lng }, { lat: locB.lat, lng: locB.lng })
        if (distanceKm > DUPLICATE_RADIUS_KM) continue

        const similarity = jaccardSimilarity(a.description, b.description)
        let isDuplicate = false

        if (similarity >= JACCARD_HIGH_CONFIDENCE) {
          isDuplicate = true
        } else if (similarity >= JACCARD_LOW_CUTOFF && geminiApiKey) {
          geminiCalls++
          const result = await callGeminiForJSON<{ same_incident: boolean; confidence: number }>(
            buildDuplicateCheckPrompt(a, b), geminiApiKey, { maxOutputTokens: 60 }
          )
          if (result.ok && result.data) {
            if (result.data.same_incident && result.data.confidence >= 0.7) isDuplicate = true
          } else {
            geminiFailures++
          }
        }

        if (isDuplicate) {
          // Flag the more-recently-created report as the possible duplicate
          // of the earlier one; never auto-merge, never overwrite an
          // existing admin decision.
          const [earlier, later] = new Date(a.created_at) <= new Date(b.created_at) ? [a, b] : [b, a]
          if (!later.duplicate_status) {
            const { error } = await supabase.from('disasters').update({
              possible_duplicate_of: earlier.id,
              duplicate_status: 'flagged',
            }).eq('id', later.id)
            if (!error) { duplicatesFlagged++; later.duplicate_status = 'flagged' }
          }
        }
      }
    }

    // ---------- Priority scoring ----------
    const now = Date.now()
    const scored: Array<{ id: string; priorityScore: number; components: Record<string, number> }> = []

    for (const d of disasters) {
      try {
        const hoursSinceReport = (now - new Date(d.created_at).getTime()) / 3600000
        let nearestCampAvailabilityPct: number | null = null
        const loc = d.location
        if (loc?.lat && loc?.lng && camps && camps.length > 0) {
          let bestDist = Infinity
          let bestCamp: any = null
          for (const c of camps) {
            if (c.latitude == null || c.longitude == null) continue
            const dist = haversineKm({ lat: loc.lat, lng: loc.lng }, { lat: c.latitude, lng: c.longitude })
            if (dist < bestDist) { bestDist = dist; bestCamp = c }
          }
          if (bestCamp && bestCamp.capacity > 0) {
            nearestCampAvailabilityPct = 100 * Math.max(0, 1 - (bestCamp.current_occupancy || 0) / bestCamp.capacity)
          }
        }

        const { priorityScore, components } = computePriorityScore({
          severity: d.severity as Severity,
          casualties: d.casualties as CasualtiesBucket,
          peopleAffected: d.people_affected as PeopleAffectedBucket,
          hoursSinceReport,
          nearestCampAvailabilityPct,
        })

        scored.push({ id: d.id, priorityScore, components })
      } catch (e) {
        itemsFailed++
        console.error(`Priority scoring failed for disaster ${d.id}:`, e)
      }
    }

    scored.sort((a, b) => b.priorityScore - a.priorityScore)

    for (let i = 0; i < scored.length; i++) {
      const s = scored[i]
      const { error } = await supabase.from('incident_priority_queue').upsert({
        run_id: run.id,
        disaster_id: s.id,
        severity_component: s.components.severityComponent,
        casualties_component: s.components.casualtiesComponent,
        people_affected_component: s.components.peopleAffectedComponent,
        aging_component: s.components.agingComponent,
        capacity_pressure_component: s.components.capacityPressureComponent,
        priority_score: s.priorityScore,
        rank: i + 1,
        contributing_factors: s.components,
      }, { onConflict: 'run_id,disaster_id' })

      if (error) { itemsFailed++; console.error('incident_priority_queue upsert failed:', error) }
      else itemsOk++
    }

    await supabase.from('agent_runs').update({
      status: itemsFailed === 0 ? 'success' : (itemsOk > 0 ? 'partial_failure' : 'failed'),
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - runStart,
      items_processed: itemsOk,
      items_failed: itemsFailed,
      gemini_calls: geminiCalls,
      gemini_failures: geminiFailures,
      output_summary: { queue_length: scored.length, duplicates_flagged: duplicatesFlagged },
    }).eq('id', run.id)

    return json(200, { success: true, run_id: run.id, queue_length: scored.length, duplicates_flagged: duplicatesFlagged })
  } catch (error) {
    await supabase.from('agent_runs').update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - runStart,
      error_message: String((error as Error)?.message ?? error),
    }).eq('id', run.id)

    return json(500, { success: false, run_id: run.id, error: String((error as Error)?.message ?? error) })
  }
})
