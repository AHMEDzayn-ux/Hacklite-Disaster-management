// Camp Inventory Management
// ==========================
// Code-gated (no volunteer accounts) ledger writes/reads for the Smart Relief
// Inventory system. A volunteer proves they're at a given camp with a short
// admin-issued access code instead of a login - no signup friction mid-
// disaster. Admins can act on any camp via JWT, no code needed. All writes go
// through this function using the service-role key; inventory_transactions
// has no client-writable RLS policy at all.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous 0/O/1/I
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

const URGENCY_LEVELS = ['low', 'normal', 'high', 'critical']

interface CountEntry {
  itemId: string
  unit?: string
  quantity: number
}

interface RequestBody {
  action: 'record' | 'get-levels' | 'regenerate-code' | 'create-request' | 'list-requests'
    | 'cancel-request' | 'list-items' | 'list-transactions' | 'save-count'
  campId: string
  accessCode?: string
  itemId?: string
  itemName?: string
  unit?: string
  transactionType?: 'received' | 'distributed' | 'adjusted'
  quantity?: number
  recordedByName?: string
  notes?: string
  urgency?: string
  requestId?: string
  counts?: CountEntry[]
  limit?: number
}

interface CatalogItem {
  id: string
  name: string
  category: string
  default_unit: string
}

/**
 * Every stock movement and request resolves through the catalog, so a camp can
 * never invent its own spelling or category for an item. This is what lets the
 * allocation agent match on item_id instead of hoping two camps typed the same
 * thing - a request for "Water" now finds stock a camp filed years ago,
 * regardless of what that camp called it at the time.
 *
 * itemName is accepted as a fallback for older clients, but only as a lookup
 * key against the catalog - never as a new free-text name.
 */
async function resolveCatalogItem(supabase: any, body: RequestBody): Promise<CatalogItem | { error: string }> {
  if (body.itemId) {
    const { data } = await supabase
      .from('resource_items').select('id, name, category, default_unit').eq('id', body.itemId).maybeSingle()
    if (!data) return { error: 'Unknown item - pick one from the catalog' }
    return data
  }

  if (body.itemName) {
    const { data } = await supabase
      .from('resource_items').select('id, name, category, default_unit')
      .ilike('name', body.itemName.trim()).maybeSingle()
    if (!data) return { error: `"${body.itemName}" is not in the item catalog - pick an existing item` }
    return data
  }

  return { error: 'itemId is required' }
}

// 'admin'      - full admin/super_admin, any camp
// 'camp_admin' - scoped to campAdminCampId only
// 'code'       - volunteer holding a camp's access code, scoped to body.campId
type Granted = { ok: true; kind: 'admin' | 'camp_admin' | 'code'; campAdminCampId: string | null; userId: string | null }
type Access = Granted | { ok: false; reason: string }

async function resolveAccess(supabase: any, req: Request, body: RequestBody): Promise<Access> {
  const authHeader = req.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (!authError && user) {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id, role, camp_id, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      if (adminUser) {
        if (adminUser.role === 'camp_admin') {
          return { ok: true, kind: 'camp_admin', campAdminCampId: adminUser.camp_id, userId: user.id }
        }
        return { ok: true, kind: 'admin', campAdminCampId: null, userId: user.id }
      }
    }
  }

  if (body.campId && body.accessCode) {
    const { data: camp } = await supabase.from('camps').select('id, inventory_access_code').eq('id', body.campId).single()
    if (camp && camp.inventory_access_code && camp.inventory_access_code === body.accessCode) {
      return { ok: true, kind: 'code', campAdminCampId: null, userId: null }
    }
  }

  return { ok: false, reason: 'Invalid access code or admin credentials' }
}

// Current on-hand for one item at one camp, computed from the live view. Used
// to stop a 'distributed' movement from driving stock negative.
async function currentStock(supabase: any, campId: string, itemName: string, category: string, unit: string): Promise<number> {
  const { data } = await supabase
    .from('camp_inventory_levels')
    .select('quantity_on_hand')
    .eq('camp_id', campId)
    .eq('item_name', itemName)
    .eq('category', category)
    .eq('unit', unit)
    .maybeSingle()
  return Number(data?.quantity_on_hand ?? 0)
}

// A camp's whole stock sheet as a lookup, so a multi-item count resolves every
// item against one read instead of one query per row.
async function stockSheet(supabase: any, campId: string): Promise<Map<string, number>> {
  const { data } = await supabase
    .from('camp_inventory_levels')
    .select('item_name, category, unit, quantity_on_hand')
    .eq('camp_id', campId)
  const sheet = new Map<string, number>()
  for (const row of data ?? []) {
    sheet.set(`${row.item_name}|${row.category}|${row.unit}`, Number(row.quantity_on_hand ?? 0))
  }
  return sheet
}

function actorName(access: Granted, supplied?: string): string {
  if (supplied) return supplied
  if (access.kind === 'admin') return 'admin'
  if (access.kind === 'camp_admin') return 'camp_admin'
  return 'volunteer'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

  if (!body.action) return json(400, { error: 'Missing action' })

  const access = await resolveAccess(supabase, req, body)
  if (!access.ok) return json(401, { error: access.reason })

  // A camp_admin with no camp_id is a broken account - fail closed rather than
  // silently letting it act on whatever campId the request happens to carry.
  if (access.kind === 'camp_admin' && !access.campAdminCampId) {
    return json(403, { error: 'This camp_admin account is not linked to a camp' })
  }

  if (body.action === 'regenerate-code') {
    if (access.kind !== 'admin') return json(403, { error: 'Only admins can regenerate a camp access code' })
    if (!body.campId) return json(400, { error: 'campId is required' })

    const newCode = generateAccessCode()
    const { error } = await supabase.from('camps').update({ inventory_access_code: newCode }).eq('id', body.campId)
    if (error) return json(500, { error: 'Failed to regenerate code', details: error.message })

    return json(200, { success: true, accessCode: newCode })
  }

  if (body.action === 'get-levels') {
    // Full admin with no camp specified sees every camp; everyone else is
    // pinned to a single camp (their own, for a camp_admin).
    if (access.kind === 'admin' && !body.campId) {
      const { data, error } = await supabase.from('camp_inventory_levels').select('*')
      if (error) return json(500, { error: 'Failed to fetch levels', details: error.message })
      return json(200, { success: true, levels: data })
    }

    const campId = access.kind === 'camp_admin' ? access.campAdminCampId : body.campId
    if (!campId) return json(400, { error: 'campId is required' })
    const { data, error } = await supabase.from('camp_inventory_levels').select('*').eq('camp_id', campId)
    if (error) return json(500, { error: 'Failed to fetch levels', details: error.message })

    const { data: camp } = await supabase.from('camps').select('inventory_thresholds').eq('id', campId).single()
    return json(200, { success: true, levels: data, thresholds: camp?.inventory_thresholds ?? {} })
  }

  // The raw ledger behind the current-stock figures: every receipt,
  // distribution, correction and count, with the note recorded at the time.
  // Because the ledger is append-only this is also the item's version history -
  // how the stock reached the number now on screen, and who said so.
  if (body.action === 'list-transactions') {
    if (access.kind === 'code') return json(403, { error: 'An access code cannot read the movement history' })

    const limit = Math.min(Math.max(Number(body.limit) || 150, 1), 500)
    let query = supabase
      .from('inventory_transactions')
      .select('id, item_id, item_name, category, unit, transaction_type, quantity, recorded_by_name, notes, recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(limit)

    // A full admin with no camp specified sees every camp; a camp_admin is
    // pinned to its own camp whatever the body asks for.
    if (!(access.kind === 'admin' && !body.campId)) {
      const campId = access.kind === 'camp_admin' ? access.campAdminCampId : body.campId
      if (!campId) return json(400, { error: 'campId is required' })
      query = query.eq('camp_id', campId)
    }

    const { data, error } = await query
    if (error) return json(500, { error: 'Failed to fetch movement history', details: error.message })

    return json(200, { success: true, transactions: data })
  }

  // Saving the edited stock table. The ledger is append-only, so this is never
  // an UPDATE of past rows: each item becomes one new row - an 'adjusted' row
  // carrying the signed difference between the counted figure and what the
  // ledger says, or a zero-quantity 'verified' row when the count agreed. Both
  // advance the item's last-counted time, which is what the twice-daily
  // freshness check on the camp admin screen reads.
  if (body.action === 'save-count') {
    if (access.kind === 'code') return json(403, { error: 'An access code cannot save a stock count - a camp admin login is required' })

    const campId = access.kind === 'camp_admin' ? access.campAdminCampId : body.campId
    if (!campId) return json(400, { error: 'campId is required' })
    if (!Array.isArray(body.counts) || body.counts.length === 0) {
      return json(400, { error: 'counts must be a non-empty array' })
    }
    if (body.counts.length > 250) return json(400, { error: 'Too many items in a single count' })

    const sheet = await stockSheet(supabase, campId)
    const recordedBy = actorName(access, body.recordedByName)
    const rows: Record<string, unknown>[] = []
    const seen = new Set<string>()

    for (const entry of body.counts) {
      if (!entry?.itemId) return json(400, { error: 'Every counted row needs an itemId' })
      if (typeof entry.quantity !== 'number' || !Number.isFinite(entry.quantity) || entry.quantity < 0) {
        return json(400, { error: 'A counted quantity must be a number of zero or more' })
      }

      const item = await resolveCatalogItem(supabase, { ...body, itemId: entry.itemId, itemName: undefined })
      if ('error' in item) return json(400, { error: item.error })

      const unit = entry.unit || item.default_unit
      const key = `${item.name}|${item.category}|${unit}`
      // The same item twice in one count is a client bug, and the second row
      // would be measured against a stale on-hand figure - reject it rather
      // than write a wrong correction.
      if (seen.has(key)) return json(400, { error: `${item.name} appears twice in the same count` })
      seen.add(key)

      // An item the camp has never held isn't being corrected, it's arriving -
      // record it as 'received' so the history reads as the opening stock it
      // is. A new row entered at zero has nothing to receive, so it becomes a
      // plain verification: the camp now tracks the item and holds none.
      const known = sheet.has(key)
      const onHand = sheet.get(key) ?? 0
      const delta = Math.round((entry.quantity - onHand) * 100) / 100

      rows.push({
        camp_id: campId,
        item_id: item.id,
        item_name: item.name,
        category: item.category,
        unit,
        transaction_type: delta === 0 ? 'verified' : (known ? 'adjusted' : 'received'),
        quantity: delta,
        recorded_by_name: recordedBy,
        notes: body.notes || null,
      })
    }

    const { error } = await supabase.from('inventory_transactions').insert(rows)
    if (error) return json(500, { error: 'Failed to save the stock count', details: error.message })

    return json(200, {
      success: true,
      counted: rows.length,
      corrected: rows.filter(r => r.quantity !== 0).length,
    })
  }

  if (body.action === 'list-items') {
    const { data, error } = await supabase
      .from('resource_items').select('id, name, category, default_unit')
      .eq('is_active', true).order('category').order('name')
    if (error) return json(500, { error: 'Failed to fetch item catalog', details: error.message })
    return json(200, { success: true, items: data })
  }

  // A camp asking for supplies. These requests are the only demand signal the
  // Resource Allocation Engine considers, so they are written here under the
  // same camp scoping as inventory: a camp_admin can only ever request for its
  // own camp, whatever campId the body carries.
  if (body.action === 'create-request') {
    if (access.kind === 'code') return json(403, { error: 'An access code cannot raise supply requests - a camp admin login is required' })

    const { quantity, urgency, notes, recordedByName } = body
    const campId = access.kind === 'camp_admin' ? access.campAdminCampId : body.campId

    if (!campId || quantity == null) return json(400, { error: 'campId and quantity are required' })
    if (typeof quantity !== 'number' || quantity <= 0) {
      return json(400, { error: 'quantity must be a positive number' })
    }
    if (urgency && !URGENCY_LEVELS.includes(urgency)) {
      return json(400, { error: `urgency must be one of: ${URGENCY_LEVELS.join(', ')}` })
    }

    const item = await resolveCatalogItem(supabase, body)
    if ('error' in item) return json(400, { error: item.error })

    const { data, error } = await supabase.from('camp_resource_requests').insert({
      camp_id: campId,
      item_id: item.id,
      item_name: item.name,
      resource_category: item.category,
      unit: body.unit || item.default_unit,
      quantity_requested: quantity,
      urgency: urgency || 'normal',
      notes: notes || null,
      requested_by_name: recordedByName || (access.kind === 'camp_admin' ? 'camp_admin' : 'admin'),
      requested_by_user_id: access.userId,
    }).select('*').single()

    if (error) return json(500, { error: 'Failed to create request', details: error.message })

    return json(200, { success: true, request: data })
  }

  if (body.action === 'list-requests') {
    let query = supabase
      .from('camp_resource_requests')
      .select('*, camps:camp_id (name, district)')
      .order('created_at', { ascending: false })

    // A full admin with no camp specified sees every camp's requests;
    // everyone else is pinned to a single camp.
    if (!(access.kind === 'admin' && !body.campId)) {
      const campId = access.kind === 'camp_admin' ? access.campAdminCampId : body.campId
      if (!campId) return json(400, { error: 'campId is required' })
      query = query.eq('camp_id', campId)
    }

    const { data, error } = await query
    if (error) return json(500, { error: 'Failed to fetch requests', details: error.message })

    // A request on its own only says what was asked for. Whether a coordinator
    // acted on it lives in the allocation plans raised against it, so attach
    // those - without them the camp that raised the request has no way to tell
    // "nobody has looked at this yet" from "approved and on its way".
    const requests = data ?? []
    if (requests.length > 0) {
      const { data: plans } = await supabase
        .from('allocation_plans')
        .select('id, request_id, status, quantity, unit, item_name, generated_at, reviewed_at, dispatched_at, delivered_at, delivery_notes, received_by_name, from_camp:from_camp_id (name)')
        .in('request_id', requests.map((r: any) => r.id))
        .order('generated_at', { ascending: false })

      const byRequest = new Map<string, any[]>()
      for (const plan of plans ?? []) {
        const list = byRequest.get(plan.request_id) ?? []
        list.push(plan)
        byRequest.set(plan.request_id, list)
      }
      for (const request of requests) {
        request.plans = byRequest.get(request.id) ?? []
      }
    }

    return json(200, { success: true, requests })
  }

  if (body.action === 'cancel-request') {
    if (access.kind === 'code') return json(403, { error: 'An access code cannot cancel supply requests' })
    if (!body.requestId) return json(400, { error: 'requestId is required' })

    const { data: existing } = await supabase
      .from('camp_resource_requests')
      .select('id, camp_id, status')
      .eq('id', body.requestId)
      .single()

    if (!existing) return json(404, { error: 'Request not found' })
    if (access.kind === 'camp_admin' && existing.camp_id !== access.campAdminCampId) {
      return json(403, { error: 'That request belongs to another camp' })
    }
    if (existing.status !== 'open') return json(400, { error: `Cannot cancel a request that is already ${existing.status}` })

    const { error } = await supabase
      .from('camp_resource_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', body.requestId)

    if (error) return json(500, { error: 'Failed to cancel request', details: error.message })

    return json(200, { success: true })
  }

  if (body.action === 'record') {
    const { transactionType, quantity, recordedByName, notes } = body

    // A camp_admin can only ever write to its own camp, whatever campId the
    // request asks for; everyone else uses the campId they supplied.
    const campId = access.kind === 'camp_admin' ? access.campAdminCampId : body.campId

    if (!campId || !transactionType || quantity == null) {
      return json(400, { error: 'campId, itemId, transactionType, and quantity are required' })
    }
    if (!['received', 'distributed', 'adjusted'].includes(transactionType)) {
      return json(400, { error: 'transactionType must be received, distributed, or adjusted' })
    }
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity === 0) {
      return json(400, { error: 'quantity must be a non-zero number' })
    }
    // Only a correction may reduce stock with a negative figure; a receipt or a
    // distribution states its own direction and must be positive.
    if (quantity < 0 && transactionType !== 'adjusted') {
      return json(400, { error: 'quantity must be a positive number' })
    }

    const item = await resolveCatalogItem(supabase, body)
    if ('error' in item) return json(400, { error: item.error })
    const unit = body.unit || item.default_unit

    // Can't take out more than is on hand - otherwise the live view sums to
    // negative stock, which no physical store can be in.
    if (transactionType === 'distributed' || quantity < 0) {
      const onHand = await currentStock(supabase, campId, item.name, item.category, unit)
      const removing = Math.abs(quantity)
      if (removing > onHand) {
        return json(400, { error: `Cannot remove ${removing} - only ${onHand} on hand` })
      }
    }

    const recordedBy = actorName(access, recordedByName)

    const { data, error } = await supabase.from('inventory_transactions').insert({
      camp_id: campId,
      item_id: item.id,
      item_name: item.name,
      category: item.category,
      unit,
      transaction_type: transactionType,
      quantity,
      recorded_by_name: recordedBy,
      notes: notes || null,
    }).select('id').single()

    if (error) return json(500, { error: 'Failed to record transaction', details: error.message })

    return json(200, { success: true, transactionId: data.id })
  }

  return json(400, { error: 'Unknown action' })
})
