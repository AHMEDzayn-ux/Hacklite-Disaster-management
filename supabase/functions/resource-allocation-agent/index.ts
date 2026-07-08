// AI Resource Allocation Engine
// ==============================
// A real transportation-problem solve (Operations Research), not a scoring
// heuristic: for each resource category, camps with surplus stock are supply
// nodes, camps with a shortfall are demand nodes, and Vogel's Approximation
// Method finds a minimum-distance-weighted shipment plan. Plans are
// recommendations only (status='pending') - approving one is a separate,
// explicit admin action that is what actually moves inventory.
//
// Demand signal preference: real ledger data (camp_inventory_levels vs.
// camps.inventory_thresholds) when available; falls back to the legacy
// camps.needs tag list (scaled to 10% of camp capacity, a documented
// approximation) only for camps that haven't started using the inventory
// system yet.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { authenticateAgentCaller } from '../_shared/agentAuth.ts'
import { solveTransportationProblem } from '../_shared/transportationSolver.ts'
import { haversineKm } from '../_shared/geo.ts'
import { RESOURCE_CATEGORIES, legacyNeedsToCategories, type ResourceCategory } from '../_shared/resourceCategories.ts'
import { callGeminiForJSON } from '../_shared/geminiClient.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

const FALLBACK_DEMAND_CAPACITY_RATIO = 0.10 // legacy-tag camps: assume ~10% of capacity is the flagged shortfall
const MIN_SHIPMENT_QUANTITY = 1 // ignore tiny/rounding-noise allocations

interface CampNode {
  id: string
  district: string | null
  latitude: number | null
  longitude: number | null
  capacity: number
  current_occupancy: number
  needs: string[] | null
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

  let plansCreated = 0, categoriesFailed = 0, geminiCalls = 0, geminiFailures = 0

  try {
    const { data: camps } = await supabase
      .from('camps')
      .select('id, district, latitude, longitude, capacity, current_occupancy, needs, inventory_thresholds')
      .eq('status', 'Active')

    const { data: levels } = await supabase
      .from('camp_inventory_levels')
      .select('camp_id, item_name, category, quantity_on_hand')

    const campList: CampNode[] = (camps ?? []).filter((c: any) => c.latitude != null && c.longitude != null)

    // itemCategory[campId|itemName] = category, from real ledger rows -
    // used to translate a per-item threshold into a per-category threshold.
    const itemCategory = new Map<string, ResourceCategory>()
    for (const row of levels ?? []) {
      itemCategory.set(`${row.camp_id}|${row.item_name}`, row.category)
    }

    // stock[category][campId] = total quantity on hand
    const stock: Record<ResourceCategory, Map<string, number>> = Object.fromEntries(
      RESOURCE_CATEGORIES.map(c => [c, new Map<string, number>()])
    ) as any
    for (const row of levels ?? []) {
      const map = stock[row.category as ResourceCategory]
      if (map) map.set(row.camp_id, (map.get(row.camp_id) ?? 0) + Number(row.quantity_on_hand))
    }

    // hasLedgerData[campId] = true if the camp has any inventory_transactions at all
    const hasLedgerData = new Set<string>((levels ?? []).map((r: any) => r.camp_id))

    for (const category of RESOURCE_CATEGORIES) {
      try {
        const supply: number[] = []
        const demand: number[] = []
        const nodeCamps: CampNode[] = []

        for (const camp of campList) {
          const campStock = stock[category].get(camp.id) ?? 0

          let campDemand = 0
          if (hasLedgerData.has(camp.id)) {
            const thresholds = (camp as any).inventory_thresholds ?? {}
            let thresholdSum = 0
            for (const [itemName, threshold] of Object.entries(thresholds)) {
              if (itemCategory.get(`${camp.id}|${itemName}`) === category) thresholdSum += Number(threshold)
            }
            campDemand = Math.max(0, thresholdSum - campStock)
          } else {
            const flaggedCategories = legacyNeedsToCategories(camp.needs)
            if (flaggedCategories.has(category)) {
              campDemand = Math.round(camp.capacity * FALLBACK_DEMAND_CAPACITY_RATIO)
            }
          }

          // Only include camps that are relevant (have stock to give or a need to fill).
          if (campStock > MIN_SHIPMENT_QUANTITY || campDemand > MIN_SHIPMENT_QUANTITY) {
            supply.push(campStock)
            demand.push(campDemand)
            nodeCamps.push(camp)
          }
        }

        if (nodeCamps.length < 2 || supply.every(s => s <= MIN_SHIPMENT_QUANTITY) || demand.every(d => d <= MIN_SHIPMENT_QUANTITY)) {
          continue // nothing to allocate for this category this run
        }

        const n = nodeCamps.length
        const costMatrix = Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) => {
            if (i === j) return 1e6 // never ship a camp's surplus back to itself
            return haversineKm(
              { lat: nodeCamps[i].latitude!, lng: nodeCamps[i].longitude! },
              { lat: nodeCamps[j].latitude!, lng: nodeCamps[j].longitude! }
            )
          })
        )

        const result = solveTransportationProblem(supply, demand, costMatrix)

        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const qty = result.allocation[i][j]
            if (qty > MIN_SHIPMENT_QUANTITY && i !== j) {
              let recommendationText: string | null = null
              if (geminiApiKey) {
                geminiCalls++
                const prompt = `A relief coordinator needs one short actionable sentence: move ${qty.toFixed(0)} units of ${category} supplies from Camp ${nodeCamps[i].id.slice(0, 8)} to Camp ${nodeCamps[j].id.slice(0, 8)} (${costMatrix[i][j].toFixed(1)}km apart). RESPOND WITH JSON ONLY: {"recommendation": "..."}`
                const geminiResult = await callGeminiForJSON<{ recommendation: string }>(prompt, geminiApiKey, { maxOutputTokens: 80 })
                if (geminiResult.ok && geminiResult.data?.recommendation) recommendationText = geminiResult.data.recommendation
                else geminiFailures++
              }

              const { error } = await supabase.from('allocation_plans').insert({
                run_id: run.id,
                from_camp_id: nodeCamps[i].id,
                to_camp_id: nodeCamps[j].id,
                resource_category: category,
                quantity: qty,
                distance_km: costMatrix[i][j],
                status: 'pending',
                lp_objective_value: result.totalCost,
                solver_metadata: {
                  method: 'vogel_approximation',
                  was_unbalanced: result.wasUnbalanced,
                  unmet_demand: result.unmetDemand,
                  recommendation_text: recommendationText,
                },
              })

              if (!error) plansCreated++
            }
          }
        }
      } catch (categoryError) {
        categoriesFailed++
        console.error(`Category ${category} allocation failed:`, categoryError)
      }
    }

    await supabase.from('agent_runs').update({
      status: categoriesFailed === 0 ? 'success' : (plansCreated > 0 ? 'partial_failure' : 'failed'),
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - runStart,
      items_processed: plansCreated,
      items_failed: categoriesFailed,
      gemini_calls: geminiCalls,
      gemini_failures: geminiFailures,
      output_summary: { plans_created: plansCreated },
    }).eq('id', run.id)

    return json(200, { success: true, run_id: run.id, plans_created: plansCreated })
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
