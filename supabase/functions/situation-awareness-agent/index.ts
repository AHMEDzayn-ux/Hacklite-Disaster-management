// Situation Awareness Agent
// =========================
// Computes, per district: a reactive Damage Index (severity/casualties/people
// affected composite), a predictive Risk Score (new-report velocity + camp
// capacity headroom), and a Gemini-generated SITREP narrative with a
// deterministic-template fallback. Writes situation_reports, one row per
// district per run, all tied to an agent_runs observability row.
//
// Auth: admin JWT (manual trigger) or x-agent-cron-secret (scheduled trigger)
// - see _shared/agentAuth.ts. Follows the same JWT->admin_users->service-role
// pattern already used by secure-admin-delete/camp-management.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { authenticateAgentCaller } from '../_shared/agentAuth.ts'
import { matchDistrict, UNCLASSIFIED_DISTRICT } from '../_shared/districts.ts'
import { computeDamageIndex, computeRiskScore, type Severity, type PeopleAffectedBucket, type CasualtiesBucket } from '../_shared/scoring.ts'
import { callGeminiForJSON, GEMINI_MODEL_NAME } from '../_shared/geminiClient.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function backfillDistrict(supabase: any, table: string) {
  const { data: rows } = await supabase.from(table).select('id, location').is('district', null).limit(500)
  for (const row of rows ?? []) {
    const address = row?.location?.address
    const district = matchDistrict(address)
    await supabase.from(table).update({ district }).eq('id', row.id)
  }
}

function buildSitrepPrompt(district: string, stats: Record<string, unknown>): string {
  return `You are generating a SITREP (situation report) for a disaster management operations dashboard.

DISTRICT: ${district}
STATS: ${JSON.stringify(stats)}

Write a 1-2 sentence factual SITREP narrative for a coordinator, in the style real emergency operations centers use (plain, specific, actionable). Do not invent numbers not present in STATS.

RESPOND WITH JSON ONLY: {"narrative": "..."}`
}

function fallbackNarrative(district: string, stats: any): string {
  const parts = [`${district}: ${stats.disaster_active_count} active disaster report(s)`]
  if (stats.disaster_critical_count > 0) parts.push(`${stats.disaster_critical_count} critical`)
  if (stats.camp_occupancy_pct != null) parts.push(`camp occupancy ${stats.camp_occupancy_pct.toFixed(0)}%`)
  parts.push(`risk trend ${stats.risk_trend}`)
  return parts.join(', ') + '.'
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
    .insert({ agent_name: 'situation_awareness', trigger_source: auth.source, triggered_by: auth.userId, status: 'running' })
    .select('id')
    .single()

  if (runError || !run) return json(500, { error: 'Failed to create agent_runs row', details: runError?.message })

  let districtsOk = 0, districtsFailed = 0, geminiCalls = 0, geminiFailures = 0

  try {
    await backfillDistrict(supabase, 'disasters')
    await backfillDistrict(supabase, 'missing_persons')
    await backfillDistrict(supabase, 'animal_rescues')

    // Velocity data: ALL disasters regardless of status, for new-report rate.
    const { data: allDisasters } = await supabase
      .from('disasters')
      .select('id, district, severity, people_affected, casualties, status, created_at')

    const { data: activeMissing } = await supabase
      .from('missing_persons').select('id, district, status').eq('status', 'Active')
    const { data: activeAnimals } = await supabase
      .from('animal_rescues').select('id, district, status').eq('status', 'Active')
    const { data: camps } = await supabase
      .from('camps').select('id, district, capacity, current_occupancy, status')

    const now = Date.now()
    const hoursAgo = (hours: number) => new Date(now - hours * 3600 * 1000).toISOString()

    const districtSet = new Set<string>()
    for (const d of allDisasters ?? []) districtSet.add(d.district || UNCLASSIFIED_DISTRICT)
    for (const m of activeMissing ?? []) districtSet.add(m.district || UNCLASSIFIED_DISTRICT)
    for (const a of activeAnimals ?? []) districtSet.add(a.district || UNCLASSIFIED_DISTRICT)
    for (const c of camps ?? []) districtSet.add(c.district || UNCLASSIFIED_DISTRICT)

    for (const district of districtSet) {
      try {
        const districtAllDisasters = (allDisasters ?? []).filter((d: any) => (d.district || UNCLASSIFIED_DISTRICT) === district)
        const districtActiveDisasters = districtAllDisasters.filter((d: any) => d.status === 'Active')

        const damageResults = districtActiveDisasters.map((d: any) =>
          computeDamageIndex({
            severity: d.severity as Severity,
            peopleAffected: d.people_affected as PeopleAffectedBucket,
            casualties: d.casualties as CasualtiesBucket,
          })
        )

        // Persist damage_index on each active disaster row.
        for (let i = 0; i < districtActiveDisasters.length; i++) {
          await supabase.from('disasters')
            .update({ damage_index: damageResults[i].damageIndex })
            .eq('id', districtActiveDisasters[i].id)
        }

        const damageIndices = damageResults.map(r => r.damageIndex)
        const damageIndexAvg = damageIndices.length ? damageIndices.reduce((a, b) => a + b, 0) / damageIndices.length : null
        const damageIndexMax = damageIndices.length ? Math.max(...damageIndices) : null

        const disasterCriticalCount = districtActiveDisasters.filter((d: any) => d.severity === 'critical').length
        const disasterHighCount = districtActiveDisasters.filter((d: any) => d.severity === 'high').length

        const districtCamps = (camps ?? []).filter((c: any) => (c.district || UNCLASSIFIED_DISTRICT) === district)
        const campTotalCapacity = districtCamps.reduce((sum: number, c: any) => sum + (c.capacity || 0), 0)
        const campTotalOccupancy = districtCamps.reduce((sum: number, c: any) => sum + (c.current_occupancy || 0), 0)
        const campOccupancyPct = campTotalCapacity > 0 ? (100 * campTotalOccupancy / campTotalCapacity) : null

        const reportsLast1h = districtAllDisasters.filter((d: any) => d.created_at >= hoursAgo(1)).length
        const reportsLast6h = districtAllDisasters.filter((d: any) => d.created_at >= hoursAgo(6)).length
        const reportsLast24h = districtAllDisasters.filter((d: any) => d.created_at >= hoursAgo(24)).length

        const risk = computeRiskScore({ reportsLast1h, reportsLast6h, reportsLast24h, campOccupancyPct })

        const stats = {
          district,
          disaster_active_count: districtActiveDisasters.length,
          disaster_critical_count: disasterCriticalCount,
          disaster_high_count: disasterHighCount,
          missing_persons_active_count: (activeMissing ?? []).filter((m: any) => (m.district || UNCLASSIFIED_DISTRICT) === district).length,
          animal_rescue_active_count: (activeAnimals ?? []).filter((a: any) => (a.district || UNCLASSIFIED_DISTRICT) === district).length,
          camp_count: districtCamps.length,
          camp_total_capacity: campTotalCapacity,
          camp_total_occupancy: campTotalOccupancy,
          camp_occupancy_pct: campOccupancyPct,
          damage_index_avg: damageIndexAvg,
          damage_index_max: damageIndexMax,
          reports_last_1h: reportsLast1h,
          reports_last_6h: reportsLast6h,
          reports_last_24h: reportsLast24h,
          risk_score: risk.riskScore,
          risk_trend: risk.riskTrend,
        }

        let narrative = fallbackNarrative(district, stats)
        let narrativeModel = 'fallback-template'
        if (geminiApiKey) {
          geminiCalls++
          const result = await callGeminiForJSON<{ narrative: string }>(buildSitrepPrompt(district, stats), geminiApiKey)
          if (result.ok && result.data?.narrative) {
            narrative = result.data.narrative
            narrativeModel = GEMINI_MODEL_NAME
          } else {
            geminiFailures++
          }
        }

        const { error: insertError } = await supabase.from('situation_reports').upsert({
          run_id: run.id,
          district,
          disaster_active_count: stats.disaster_active_count,
          disaster_critical_count: stats.disaster_critical_count,
          disaster_high_count: stats.disaster_high_count,
          missing_persons_active_count: stats.missing_persons_active_count,
          animal_rescue_active_count: stats.animal_rescue_active_count,
          camp_count: stats.camp_count,
          camp_total_capacity: stats.camp_total_capacity,
          camp_total_occupancy: stats.camp_total_occupancy,
          camp_occupancy_pct: stats.camp_occupancy_pct,
          damage_index_avg: stats.damage_index_avg,
          damage_index_max: stats.damage_index_max,
          reports_last_1h: stats.reports_last_1h,
          reports_last_6h: stats.reports_last_6h,
          reports_last_24h: stats.reports_last_24h,
          risk_score: stats.risk_score,
          risk_trend: stats.risk_trend,
          narrative_summary: narrative,
          narrative_model: narrativeModel,
          raw_stats: stats,
        }, { onConflict: 'run_id,district' })

        if (insertError) { districtsFailed++; console.error('situation_reports upsert failed:', insertError) }
        else districtsOk++
      } catch (districtError) {
        districtsFailed++
        console.error(`District ${district} processing failed:`, districtError)
      }
    }

    await supabase.from('agent_runs').update({
      status: districtsFailed === 0 ? 'success' : (districtsOk > 0 ? 'partial_failure' : 'failed'),
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - runStart,
      items_processed: districtsOk,
      items_failed: districtsFailed,
      gemini_calls: geminiCalls,
      gemini_failures: geminiFailures,
      output_summary: { districts: Array.from(districtSet) },
    }).eq('id', run.id)

    return json(200, { success: true, run_id: run.id, districts_processed: districtsOk, districts_failed: districtsFailed })
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
