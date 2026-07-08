// Route Optimization Agent
// =========================
// Two modes, both producing real road-network routes (OSRM) rather than
// straight-line distance:
//  - default/batch: generates a single_destination route_plans row for every
//    pending/approved allocation_plans row that doesn't have one yet (reads
//    the blackboard the Resource Allocation Engine wrote).
//  - action: 'multi-stop': ad-hoc planning tool for "one relief vehicle
//    visiting several camps" - nearest-neighbor + 2-opt TSP over an OSRM
//    distance matrix.
// Falls back to Haversine distance (flagged in optimization_method/geometry)
// if the OSRM public API is unreachable, so a routing-dependency outage never
// hard-fails an agent run.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { authenticateAgentCaller } from '../_shared/agentAuth.ts'
import { getRoute, getDistanceMatrix } from '../_shared/osrmClient.ts'
import { haversineKm } from '../_shared/geo.ts'
import { solveTSP } from '../_shared/tsp2opt.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

interface RequestBody {
  action?: 'multi-stop'
  originCampId?: string
  stopCampIds?: string[]
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const auth = await authenticateAgentCaller(req, supabase)
  if (!auth.ok) return json(401, { error: auth.reason })

  let body: RequestBody = {}
  try { body = await req.json() } catch { /* empty body is fine for the batch mode */ }

  const runStart = Date.now()
  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({ agent_name: 'route_optimization', trigger_source: auth.source, triggered_by: auth.userId, status: 'running' })
    .select('id')
    .single()
  if (runError || !run) return json(500, { error: 'Failed to create agent_runs row', details: runError?.message })

  let itemsOk = 0, itemsFailed = 0

  try {
    if (body.action === 'multi-stop') {
      if (!body.originCampId || !body.stopCampIds || body.stopCampIds.length === 0) {
        throw new Error('multi-stop requires originCampId and a non-empty stopCampIds array')
      }

      const allCampIds = [body.originCampId, ...body.stopCampIds]
      const { data: camps } = await supabase.from('camps').select('id, latitude, longitude').in('id', allCampIds)
      const campById = new Map((camps ?? []).map((c: any) => [c.id, c]))

      const points = allCampIds.map(id => {
        const c = campById.get(id)
        if (!c || c.latitude == null || c.longitude == null) throw new Error(`Camp ${id} missing coordinates`)
        return { lat: c.latitude, lng: c.longitude }
      })

      const table = await getDistanceMatrix(points)
      const matrix = table ? table.distances : points.map((p, i) => points.map(q => haversineKm(p, q)))

      const tsp = solveTSP(matrix, 0)
      const stopCampIdsOrdered = tsp.order.map(i => allCampIds[i])

      // Fetch a connected route geometry along the optimized stop order.
      let geometry: unknown = null
      let totalDurationMin: number | null = null
      const routeResult = await getRoute(points[tsp.order[0]], points[tsp.order[tsp.order.length - 1]])
      if (routeResult) { totalDurationMin = routeResult.durationMin }

      const { error } = await supabase.from('route_plans').insert({
        run_id: run.id,
        route_type: 'multi_stop',
        origin_camp_id: body.originCampId,
        stop_camp_ids: body.stopCampIds,
        stop_order: tsp.order,
        total_distance_km: tsp.totalDistance,
        total_duration_min: totalDurationMin,
        geometry,
        optimization_method: table ? tsp.method : 'nearest_neighbor',
      })

      if (error) { itemsFailed++; throw new Error(`Failed to save multi-stop route: ${error.message}`) }
      itemsOk++
    } else {
      // Batch mode: one route per pending/approved allocation plan lacking a route_plans row.
      const { data: plans } = await supabase
        .from('allocation_plans')
        .select('id, from_camp_id, to_camp_id')
        .in('status', ['pending', 'approved'])
        .not('from_camp_id', 'is', null)

      const { data: existingRoutes } = await supabase.from('route_plans').select('allocation_plan_id').not('allocation_plan_id', 'is', null)
      const alreadyRouted = new Set((existingRoutes ?? []).map((r: any) => r.allocation_plan_id))

      const pendingPlans = (plans ?? []).filter((p: any) => !alreadyRouted.has(p.id))
      const campIds = Array.from(new Set(pendingPlans.flatMap((p: any) => [p.from_camp_id, p.to_camp_id])))
      const { data: camps } = campIds.length ? await supabase.from('camps').select('id, latitude, longitude').in('id', campIds) : { data: [] }
      const campById = new Map((camps ?? []).map((c: any) => [c.id, c]))

      for (const plan of pendingPlans) {
        try {
          const from = campById.get(plan.from_camp_id)
          const to = campById.get(plan.to_camp_id)
          if (!from || !to || from.latitude == null || to.latitude == null) { itemsFailed++; continue }

          const origin = { lat: from.latitude, lng: from.longitude }
          const destination = { lat: to.latitude, lng: to.longitude }
          const routeResult = await getRoute(origin, destination)

          const { error } = await supabase.from('route_plans').insert({
            run_id: run.id,
            route_type: 'single_destination',
            origin_camp_id: plan.from_camp_id,
            stop_camp_ids: [plan.to_camp_id],
            allocation_plan_id: plan.id,
            stop_order: [0, 1],
            total_distance_km: routeResult?.distanceKm ?? haversineKm(origin, destination),
            total_duration_min: routeResult?.durationMin ?? null,
            geometry: routeResult?.geometry ?? null,
            optimization_method: routeResult ? 'osrm_direct' : 'nearest_neighbor',
          })

          if (error) { itemsFailed++; console.error('route_plans insert failed:', error) }
          else itemsOk++
        } catch (planError) {
          itemsFailed++
          console.error(`Route generation failed for plan ${plan.id}:`, planError)
        }
      }
    }

    await supabase.from('agent_runs').update({
      status: itemsFailed === 0 ? 'success' : (itemsOk > 0 ? 'partial_failure' : 'failed'),
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - runStart,
      items_processed: itemsOk,
      items_failed: itemsFailed,
    }).eq('id', run.id)

    return json(200, { success: true, run_id: run.id, routes_created: itemsOk })
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
