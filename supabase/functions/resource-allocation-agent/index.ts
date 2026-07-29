// AI Resource Allocation Engine
// ==============================
// A real transportation-problem solve (Operations Research), not a scoring
// heuristic. Demand comes exclusively from camp_resource_requests - explicit
// requests raised by a camp admin - so every suggestion traces back to someone
// actually asking for something. Camps holding spare stock of the requested
// item are supply nodes, and Vogel's Approximation Method finds a
// minimum-distance shipment plan.
//
// Three rules make the output actionable rather than merely optimal:
//
//  1. Per-item matching. One solve per requested item, never per category - so
//     approving a plan writes a ledger transfer for an item the source camp
//     genuinely holds.
//  2. A protective reserve. Only stock above what a camp needs for its own
//     occupants is offered as supply; filling one camp must never starve
//     another.
//  3. A hard distance cap. No transfer over MAX_TRANSFER_KM is ever suggested,
//     at any urgency - a 300km haul is not a plan a coordinator would act on.
//
// Request satisfaction is a SOFT constraint: partial fulfilment is a valid
// outcome and the shortfall is reported, never hidden.
//
// Plans are recommendations only (status='pending') - approving one is a
// separate, explicit admin action and is what actually moves inventory.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { authenticateAgentCaller } from '../_shared/agentAuth.ts'
import { solveTransportationProblem } from '../_shared/transportationSolver.ts'
import { haversineKm } from '../_shared/geo.ts'
import { PER_OCCUPANT_MINIMUM, type ResourceCategory } from '../_shared/resourceCategories.ts'
import { callGeminiForJSON } from '../_shared/geminiClient.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

// No transfer beyond this is ever suggested. Sri Lanka is ~450km end to end,
// so 100km still allows help between neighbouring districts while excluding
// hauls no coordinator would actually run.
const MAX_TRANSFER_KM = 100

// A large FINITE sentinel, not Infinity: the solver does arithmetic on costs
// and Infinity would poison it with NaN (same reasoning as
// FORBIDDEN_PAIRING_COST in hungarianAlgorithm.ts).
const FORBIDDEN_ROUTE_COST = 1e9

// Urgency divides the route cost, so a critical request's routes look cheaper
// and VAM's penalty rule prefers to serve it when spare stock is scarce.
// Distance still dominates the ranking; urgency only tilts it.
const URGENCY_WEIGHT: Record<string, number> = { low: 1.0, normal: 1.25, high: 1.6, critical: 2.0 }

const MIN_SHIPMENT_QUANTITY = 1 // ignore tiny/rounding-noise allocations

/** Requests and stock are matched on this key, so "Rice" and " rice " are the same item. */
function itemKey(itemName: string, category: string): string {
  return `${itemName.trim().toLowerCase()}|${category}`
}

/**
 * A camp's threshold map is keyed by that camp's own spelling of the item,
 * which need not match the requesting camp's. Matching loosely here matters:
 * a missed lookup would read as "no reserve configured" and expose stock the
 * camp had explicitly reserved for itself.
 */
function configuredThreshold(thresholds: Record<string, number> | null, itemName: string): number {
  if (!thresholds) return 0
  const target = itemName.trim().toLowerCase()
  for (const [name, value] of Object.entries(thresholds)) {
    if (name.trim().toLowerCase() === target) return Number(value) || 0
  }
  return 0
}

interface Camp {
  id: string
  name: string
  district: string | null
  latitude: number | null
  longitude: number | null
  capacity: number
  current_occupancy: number
  inventory_thresholds: Record<string, number> | null
}

interface ResourceRequest {
  id: string
  camp_id: string
  item_name: string
  resource_category: ResourceCategory
  unit: string
  quantity_requested: number
  quantity_fulfilled: number
  urgency: string
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
    .insert({ agent_name: 'resource_allocation', trigger_source: auth.source, triggered_by: auth.userId, status: 'running' })
    .select('id')
    .single()

  if (runError || !run) return json(500, { error: 'Failed to create agent_runs row', details: runError?.message })

  let plansCreated = 0, itemsFailed = 0, geminiCalls = 0, geminiFailures = 0
  let requestsConsidered = 0, totalUnmet = 0

  try {
    const { data: camps } = await supabase
      .from('camps')
      .select('id, name, district, latitude, longitude, capacity, current_occupancy, inventory_thresholds')
      .eq('status', 'Active')

    const { data: openRequests } = await supabase
      .from('camp_resource_requests')
      .select('id, camp_id, item_name, resource_category, unit, quantity_requested, quantity_fulfilled, urgency')
      .eq('status', 'open')

    const { data: levels } = await supabase
      .from('camp_inventory_levels')
      .select('camp_id, item_name, category, unit, quantity_on_hand')

    // Plans already in flight. These matter twice over, and differently:
    //  - For DEMAND: anything not yet delivered (pending/approved/dispatched)
    //    is already earmarked for the request, so don't re-suggest it. This is
    //    what makes the 2-hourly re-run idempotent.
    //  - For SUPPLY: only 'pending' counts as committed. Approval already
    //    wrote a transferred_out row, so approved-and-later stock has already
    //    left camp_inventory_levels - subtracting it again would double-count.
    const { data: inFlightPlans } = await supabase
      .from('allocation_plans')
      .select('request_id, from_camp_id, item_name, resource_category, quantity, status')
      .in('status', ['pending', 'approved', 'dispatched'])

    const campById = new Map<string, Camp>()
    for (const camp of (camps ?? []) as Camp[]) {
      if (camp.latitude != null && camp.longitude != null) campById.set(camp.id, camp)
    }

    const plannedForRequest = new Map<string, number>()
    const committedFromCamp = new Map<string, number>()
    for (const plan of inFlightPlans ?? []) {
      if (plan.request_id) {
        plannedForRequest.set(plan.request_id, (plannedForRequest.get(plan.request_id) ?? 0) + Number(plan.quantity))
      }
      if (plan.status === 'pending' && plan.from_camp_id && plan.item_name) {
        const key = `${plan.from_camp_id}|${itemKey(plan.item_name, plan.resource_category)}`
        committedFromCamp.set(key, (committedFromCamp.get(key) ?? 0) + Number(plan.quantity))
      }
    }

    // onHand[campId|itemKey] = current stock of that exact item at that camp.
    // unitAtCamp tracks the unit that stock is held in, so the eventual ledger
    // transfer reconciles against camp_inventory_levels (which groups by unit).
    const onHand = new Map<string, number>()
    const unitAtCamp = new Map<string, string>()
    for (const row of levels ?? []) {
      const key = `${row.camp_id}|${itemKey(row.item_name, row.category)}`
      const running = onHand.get(key) ?? 0
      if (!unitAtCamp.has(key) || Number(row.quantity_on_hand) > running) {
        unitAtCamp.set(key, row.unit ?? 'units')
      }
      onHand.set(key, running + Number(row.quantity_on_hand))
    }

    // Group open requests by the exact item being asked for - one solve each.
    const requestsByItem = new Map<string, ResourceRequest[]>()
    for (const request of (openRequests ?? []) as ResourceRequest[]) {
      if (!campById.has(request.camp_id)) continue // no coordinates: can't route to it
      const key = itemKey(request.item_name, request.resource_category)
      const group = requestsByItem.get(key) ?? []
      group.push(request)
      requestsByItem.set(key, group)
    }

    for (const [key, group] of requestsByItem) {
      try {
        const category = group[0].resource_category
        const displayItemName = group[0].item_name.trim()

        // --- Demand: what each request still needs, after what's in flight ---
        const demandRequests: ResourceRequest[] = []
        const demand: number[] = []
        for (const request of group) {
          const outstanding = Number(request.quantity_requested)
            - Number(request.quantity_fulfilled)
            - (plannedForRequest.get(request.id) ?? 0)
          if (outstanding > MIN_SHIPMENT_QUANTITY) {
            demandRequests.push(request)
            demand.push(outstanding)
          }
        }
        if (demandRequests.length === 0) continue
        requestsConsidered += demandRequests.length

        // A camp asking for this item is never a source for it.
        const requestingCampIds = new Set(group.map(r => r.camp_id))

        // --- Supply: spare stock above each camp's protective reserve ---
        const supplyCamps: Camp[] = []
        const supply: number[] = []
        const supplyDetail: { reserve: number; onHand: number }[] = []

        for (const camp of campById.values()) {
          if (requestingCampIds.has(camp.id)) continue

          const stock = onHand.get(`${camp.id}|${key}`) ?? 0
          if (stock <= MIN_SHIPMENT_QUANTITY) continue

          // Reserve: whichever is larger of what the camp configured for itself
          // and what its current occupants need. Never ship below this.
          const configured = configuredThreshold(camp.inventory_thresholds, displayItemName)
          const perOccupant = (camp.current_occupancy ?? 0) * (PER_OCCUPANT_MINIMUM[category] ?? 0)
          const reserve = Math.max(configured, perOccupant)

          const committed = committedFromCamp.get(`${camp.id}|${key}`) ?? 0
          const spare = Math.max(0, stock - reserve - committed)
          if (spare <= MIN_SHIPMENT_QUANTITY) continue

          // Only keep sources that can actually reach at least one requester.
          const reachable = demandRequests.some(request => {
            const dest = campById.get(request.camp_id)!
            return haversineKm(
              { lat: camp.latitude!, lng: camp.longitude! },
              { lat: dest.latitude!, lng: dest.longitude! }
            ) <= MAX_TRANSFER_KM
          })
          if (!reachable) continue

          supplyCamps.push(camp)
          supply.push(spare)
          supplyDetail.push({ reserve, onHand: stock })
        }

        if (supplyCamps.length === 0) {
          totalUnmet += demand.reduce((a, b) => a + b, 0)
          continue
        }

        // --- Cost matrix: true distance, tilted by urgency, capped hard ---
        const distanceKm = supplyCamps.map(source =>
          demandRequests.map(request => {
            const dest = campById.get(request.camp_id)!
            return haversineKm(
              { lat: source.latitude!, lng: source.longitude! },
              { lat: dest.latitude!, lng: dest.longitude! }
            )
          })
        )

        const costMatrix = distanceKm.map((row, i) =>
          row.map((km, j) => {
            if (supplyCamps[i].id === demandRequests[j].camp_id) return FORBIDDEN_ROUTE_COST
            if (km > MAX_TRANSFER_KM) return FORBIDDEN_ROUTE_COST
            return km / (URGENCY_WEIGHT[demandRequests[j].urgency] ?? 1)
          })
        )

        const result = solveTransportationProblem(supply, demand, costMatrix)

        // Post-solve guard. VAM is a heuristic and can be pushed onto a
        // forbidden cell when a request is unreachable but total spare stock
        // exceeds total demand. Dropping those here is what actually
        // guarantees no over-cap suggestion ever reaches the dashboard,
        // rather than trusting the heuristic to avoid it.
        const shipped = demandRequests.map(() => 0)
        const accepted: { i: number; j: number; qty: number }[] = []
        for (let i = 0; i < supplyCamps.length; i++) {
          for (let j = 0; j < demandRequests.length; j++) {
            const qty = result.allocation[i][j]
            if (qty <= MIN_SHIPMENT_QUANTITY) continue
            if (costMatrix[i][j] >= FORBIDDEN_ROUTE_COST) continue
            accepted.push({ i, j, qty })
            shipped[j] += qty
          }
        }

        const unmetByRequest = demandRequests.map((_, j) => Math.max(0, demand[j] - shipped[j]))
        totalUnmet += unmetByRequest.reduce((a, b) => a + b, 0)

        for (const { i, j, qty } of accepted) {
          const source = supplyCamps[i]
          const request = demandRequests[j]
          const dest = campById.get(request.camp_id)!

          let recommendationText: string | null = null
          if (geminiApiKey) {
            geminiCalls++
            const prompt = `A relief logistics coordinator needs one short actionable sentence. Move ${qty.toFixed(0)} ${request.unit} of "${displayItemName}" from ${source.name} to ${dest.name} (${distanceKm[i][j].toFixed(1)}km apart). The destination raised a ${request.urgency}-urgency request for ${Number(request.quantity_requested).toFixed(0)} ${request.unit}. RESPOND WITH JSON ONLY: {"recommendation": "..."}`
            const geminiResult = await callGeminiForJSON<{ recommendation: string }>(prompt, geminiApiKey, { maxOutputTokens: 80 })
            if (geminiResult.ok && geminiResult.data?.recommendation) recommendationText = geminiResult.data.recommendation
            else geminiFailures++
          }

          const { error } = await supabase.from('allocation_plans').insert({
            run_id: run.id,
            request_id: request.id,
            from_camp_id: source.id,
            to_camp_id: request.camp_id,
            resource_category: category,
            item_name: displayItemName,
            unit: unitAtCamp.get(`${source.id}|${key}`) ?? request.unit ?? 'units',
            quantity: qty,
            distance_km: distanceKm[i][j],
            status: 'pending',
            lp_objective_value: result.totalCost,
            solver_metadata: {
              method: 'vogel_approximation',
              urgency_weighted: true,
              urgency: request.urgency,
              max_transfer_km: MAX_TRANSFER_KM,
              source_on_hand: supplyDetail[i].onHand,
              source_reserve: supplyDetail[i].reserve,
              source_spare: supply[i],
              request_outstanding: demand[j],
              unmet_quantity: unmetByRequest[j],
              recommendation_text: recommendationText,
            },
          })

          if (!error) plansCreated++
        }
      } catch (itemError) {
        itemsFailed++
        console.error(`Allocation failed for item ${key}:`, itemError)
      }
    }

    await supabase.from('agent_runs').update({
      status: itemsFailed === 0 ? 'success' : (plansCreated > 0 ? 'partial_failure' : 'failed'),
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - runStart,
      items_processed: plansCreated,
      items_failed: itemsFailed,
      gemini_calls: geminiCalls,
      gemini_failures: geminiFailures,
      output_summary: {
        plans_created: plansCreated,
        requests_considered: requestsConsidered,
        unmet_quantity: totalUnmet,
      },
    }).eq('id', run.id)

    return json(200, {
      success: true,
      run_id: run.id,
      plans_created: plansCreated,
      requests_considered: requestsConsidered,
      unmet_quantity: totalUnmet,
    })
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
