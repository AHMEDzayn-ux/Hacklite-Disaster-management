// Volunteer Assignment Optimization
// ===================================
// A genuine bipartite assignment-problem solve (Hungarian algorithm) matching
// available volunteers to the highest-priority open incidents, minimizing
// total distance subject to a hard skill-match constraint. Output is
// PROPOSED only - matches the original proposal's accept/decline dispatch
// idea: a volunteer must accept, and a coordinator can see the match before
// it's active. Nothing here auto-dispatches anyone.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { authenticateAgentCaller } from '../_shared/agentAuth.ts'
import { solveAssignmentProblem, FORBIDDEN_PAIRING_COST } from '../_shared/hungarianAlgorithm.ts'
import { haversineKm } from '../_shared/geo.ts'
import { inferRequiredSkills, hasMatchingSkill } from '../_shared/taskSkills.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

const MAX_TASKS_PER_RUN = 20
const NO_LOCATION_DISTANCE_KM = 500 // finite fallback so a missing coordinate disfavors but doesn't forbid a pairing

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const auth = await authenticateAgentCaller(req, supabase)
  if (!auth.ok) return json(401, { error: auth.reason })

  const runStart = Date.now()
  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({ agent_name: 'volunteer_assignment', trigger_source: auth.source, triggered_by: auth.userId, status: 'running' })
    .select('id')
    .single()
  if (runError || !run) return json(500, { error: 'Failed to create agent_runs row', details: runError?.message })

  try {
    const { data: volunteers } = await supabase
      .from('volunteers')
      .select('id, skills, location')
      .eq('availability_status', 'available')

    // Use the most recent incident_priority_queue run so tasks are ranked by
    // the Incident Prioritization Agent's triage score, not arbitrary order.
    const { data: latestRun } = await supabase
      .from('agent_runs')
      .select('id')
      .eq('agent_name', 'incident_prioritization')
      .in('status', ['success', 'partial_failure'])
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    let taskDisasterIds: string[] = []
    if (latestRun) {
      const { data: queue } = await supabase
        .from('incident_priority_queue')
        .select('disaster_id')
        .eq('run_id', latestRun.id)
        .order('rank', { ascending: true })
        .limit(MAX_TASKS_PER_RUN)
      taskDisasterIds = (queue ?? []).map((q: any) => q.disaster_id)
    } else {
      // No prioritization run yet - fall back to the most recent active reports.
      const { data: recent } = await supabase
        .from('disasters').select('id').eq('status', 'Active')
        .order('created_at', { ascending: false }).limit(MAX_TASKS_PER_RUN)
      taskDisasterIds = (recent ?? []).map((d: any) => d.id)
    }

    if (!volunteers || volunteers.length === 0 || taskDisasterIds.length === 0) {
      await supabase.from('agent_runs').update({
        status: 'success', finished_at: new Date().toISOString(), duration_ms: Date.now() - runStart,
        items_processed: 0, output_summary: { reason: 'no available volunteers or no open tasks' },
      }).eq('id', run.id)
      return json(200, { success: true, run_id: run.id, assignments_created: 0 })
    }

    const { data: tasks } = await supabase
      .from('disasters')
      .select('id, location, needs')
      .in('id', taskDisasterIds)

    const taskList = tasks ?? []
    const costMatrix: number[][] = volunteers.map((v: any) => {
      const vLoc = v.location
      return taskList.map((t: any) => {
        const requiredSkills = inferRequiredSkills(t.needs)
        if (!hasMatchingSkill(v.skills, requiredSkills)) return FORBIDDEN_PAIRING_COST

        const tLoc = t.location
        if (vLoc?.lat && vLoc?.lng && tLoc?.lat && tLoc?.lng) {
          return haversineKm({ lat: vLoc.lat, lng: vLoc.lng }, { lat: tLoc.lat, lng: tLoc.lng })
        }
        return NO_LOCATION_DISTANCE_KM
      })
    })

    const result = solveAssignmentProblem(costMatrix)

    let assignmentsCreated = 0
    for (let i = 0; i < volunteers.length; i++) {
      const j = result.assignment[i]
      if (j < 0) continue
      const cost = costMatrix[i][j]
      if (cost >= FORBIDDEN_PAIRING_COST) continue

      const { error } = await supabase.from('volunteer_assignments').insert({
        run_id: run.id,
        volunteer_id: volunteers[i].id,
        task_type: 'disaster',
        task_ref_id: taskList[j].id,
        assignment_cost: cost,
        distance_km: cost < NO_LOCATION_DISTANCE_KM ? cost : null,
        skill_match: true,
        status: 'proposed',
      })
      if (!error) assignmentsCreated++
    }

    await supabase.from('agent_runs').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - runStart,
      items_processed: assignmentsCreated,
      output_summary: { total_cost: result.totalCost, volunteers_considered: volunteers.length, tasks_considered: taskList.length },
    }).eq('id', run.id)

    return json(200, { success: true, run_id: run.id, assignments_created: assignmentsCreated })
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
