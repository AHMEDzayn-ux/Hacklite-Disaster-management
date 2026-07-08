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

interface RequestBody {
  action: 'record' | 'get-levels' | 'regenerate-code'
  campId: string
  accessCode?: string
  itemName?: string
  category?: string
  unit?: string
  transactionType?: 'received' | 'distributed' | 'adjusted'
  quantity?: number
  recordedByName?: string
  notes?: string
}

async function resolveAccess(supabase: any, req: Request, body: RequestBody): Promise<{ ok: true; isAdmin: boolean } | { ok: false; reason: string }> {
  const authHeader = req.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (!authError && user) {
      const { data: adminUser } = await supabase.from('admin_users').select('id, is_active').eq('user_id', user.id).eq('is_active', true).single()
      if (adminUser) return { ok: true, isAdmin: true }
    }
  }

  if (body.campId && body.accessCode) {
    const { data: camp } = await supabase.from('camps').select('id, inventory_access_code').eq('id', body.campId).single()
    if (camp && camp.inventory_access_code && camp.inventory_access_code === body.accessCode) {
      return { ok: true, isAdmin: false }
    }
  }

  return { ok: false, reason: 'Invalid access code or admin credentials' }
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

  if (body.action === 'regenerate-code') {
    if (!access.isAdmin) return json(403, { error: 'Only admins can regenerate a camp access code' })
    if (!body.campId) return json(400, { error: 'campId is required' })

    const newCode = generateAccessCode()
    const { error } = await supabase.from('camps').update({ inventory_access_code: newCode }).eq('id', body.campId)
    if (error) return json(500, { error: 'Failed to regenerate code', details: error.message })

    return json(200, { success: true, accessCode: newCode })
  }

  if (body.action === 'get-levels') {
    if (access.isAdmin && !body.campId) {
      const { data, error } = await supabase.from('camp_inventory_levels').select('*')
      if (error) return json(500, { error: 'Failed to fetch levels', details: error.message })
      return json(200, { success: true, levels: data })
    }

    if (!body.campId) return json(400, { error: 'campId is required' })
    const { data, error } = await supabase.from('camp_inventory_levels').select('*').eq('camp_id', body.campId)
    if (error) return json(500, { error: 'Failed to fetch levels', details: error.message })

    const { data: camp } = await supabase.from('camps').select('inventory_thresholds').eq('id', body.campId).single()
    return json(200, { success: true, levels: data, thresholds: camp?.inventory_thresholds ?? {} })
  }

  if (body.action === 'record') {
    const { campId, itemName, category, unit, transactionType, quantity, recordedByName, notes } = body
    if (!campId || !itemName || !category || !transactionType || quantity == null) {
      return json(400, { error: 'campId, itemName, category, transactionType, and quantity are required' })
    }
    if (!['received', 'distributed', 'adjusted'].includes(transactionType)) {
      return json(400, { error: 'transactionType must be received, distributed, or adjusted' })
    }
    if (typeof quantity !== 'number' || quantity <= 0) {
      return json(400, { error: 'quantity must be a positive number' })
    }

    const { data, error } = await supabase.from('inventory_transactions').insert({
      camp_id: campId,
      item_name: itemName,
      category,
      unit: unit || 'units',
      transaction_type: transactionType,
      quantity,
      recorded_by_name: recordedByName || (access.isAdmin ? 'admin' : 'volunteer'),
      notes: notes || null,
    }).select('id').single()

    if (error) return json(500, { error: 'Failed to record transaction', details: error.message })

    return json(200, { success: true, transactionId: data.id })
  }

  return json(400, { error: 'Unknown action' })
})
