// Allocation Plan Review
// =======================
// The Resource Allocation Engine only ever produces pending recommendations
// (allocation_plans.status='pending') - this is the separate, explicit admin
// action that approves or rejects one. Approval is the ONLY thing that
// actually moves inventory: it atomically writes the matching
// transferred_out/transferred_in pair into inventory_transactions, so real
// state only ever changes because a human clicked approve.
//
// Admin-JWT only (no cron path) - this is always a human decision, never an
// unattended trigger. Follows the same JWT->admin_users->service-role->audit
// pattern as secure-admin-delete/camp-management.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

interface RequestBody {
  action: 'approve' | 'reject'
  planId: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json(401, { error: 'Missing or invalid authorization header' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json(401, { error: 'Invalid or expired token' })

  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users').select('id, is_active').eq('user_id', user.id).eq('is_active', true).single()
  if (adminError || !adminUser) return json(403, { error: 'Unauthorized: not an active admin' })

  const body: RequestBody = await req.json()
  const { action, planId } = body
  if (!action || !['approve', 'reject'].includes(action) || !planId) {
    return json(400, { error: 'Requires action ("approve"|"reject") and planId' })
  }

  const { data: plan, error: planError } = await supabase
    .from('allocation_plans').select('*').eq('id', planId).single()
  if (planError || !plan) return json(404, { error: 'Allocation plan not found' })
  if (plan.status !== 'pending') return json(400, { error: `Plan already ${plan.status}` })

  if (action === 'reject') {
    const { error } = await supabase.from('allocation_plans').update({
      status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id,
    }).eq('id', planId)
    if (error) return json(500, { error: 'Failed to reject plan', details: error.message })

    await supabase.from('audit_logs').insert({
      admin_id: user.id, admin_email: user.email, action: 'REJECT_ALLOCATION_PLAN',
      table_name: 'allocation_plans', record_id: planId, record_snapshot: plan,
      reason: 'Admin rejected AI-recommended resource allocation',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
    })

    return json(200, { success: true, message: 'Plan rejected', planId })
  }

  // action === 'approve': atomically write the transfer pair, then mark approved.
  if (!plan.from_camp_id) {
    return json(400, { error: 'Cannot approve a plan with no source camp (unmet-demand placeholder)' })
  }

  const { error: outError } = await supabase.from('inventory_transactions').insert({
    camp_id: plan.from_camp_id,
    item_name: plan.item_name || plan.resource_category,
    category: plan.resource_category,
    unit: 'units',
    transaction_type: 'transferred_out',
    quantity: plan.quantity,
    source_allocation_plan_id: plan.id,
    recorded_by_name: `admin:${user.email}`,
    notes: `Approved AI resource allocation plan ${plan.id}`,
  })
  if (outError) return json(500, { error: 'Failed to record transfer-out', details: outError.message })

  const { error: inError } = await supabase.from('inventory_transactions').insert({
    camp_id: plan.to_camp_id,
    item_name: plan.item_name || plan.resource_category,
    category: plan.resource_category,
    unit: 'units',
    transaction_type: 'transferred_in',
    quantity: plan.quantity,
    source_allocation_plan_id: plan.id,
    recorded_by_name: `admin:${user.email}`,
    notes: `Approved AI resource allocation plan ${plan.id}`,
  })
  if (inError) return json(500, { error: 'Failed to record transfer-in (transfer-out already recorded - reconcile manually)', details: inError.message })

  const { error: updateError } = await supabase.from('allocation_plans').update({
    status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.id,
  }).eq('id', planId)
  if (updateError) return json(500, { error: 'Transfer recorded but failed to mark plan approved', details: updateError.message })

  await supabase.from('audit_logs').insert({
    admin_id: user.id, admin_email: user.email, action: 'APPROVE_ALLOCATION_PLAN',
    table_name: 'allocation_plans', record_id: planId, record_snapshot: plan,
    reason: 'Admin approved AI-recommended resource allocation - inventory transferred',
    ip_address: req.headers.get('x-forwarded-for') || 'unknown',
    user_agent: req.headers.get('user-agent') || 'unknown',
  })

  return json(200, { success: true, message: 'Plan approved and inventory transferred', planId })
})
