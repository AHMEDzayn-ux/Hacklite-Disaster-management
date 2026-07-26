// =====================================================
// CAMP MANAGEMENT - Unified Supabase Edge Function
// =====================================================
// Handles all camp-related admin operations:
// 1. Direct camp registration by admin
// 2. Approve camp request (creates camp from request)
// 3. Reject camp request
// 
// SECURITY:
// - Verifies JWT token
// - Checks admin_users table for authorization
// - Creates audit logs for all operations
// =====================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CampData {
  name: string
  type: string
  district: string
  ds_division?: string
  village_area?: string
  nearby_landmark?: string
  address: string
  latitude?: number
  longitude?: number
  capacity: number
  current_occupancy?: number
  contact_person: string
  contact_number: string
  contact_email?: string
  facilities?: any // jsonb
  needs?: any // jsonb
  special_needs?: string
  additional_notes?: string
  managed_by?: string
  status?: string
  source?: 'admin_direct' | 'public_request'
  source_request_id?: string
}

interface RequestBody {
  action: 'register' | 'approve' | 'reject'
  campData?: CampData
  requestId?: string
  rejectionReason?: string
  // When present, a camp_admin login is provisioned for the newly created camp
  // and its one-time generated password is returned in the response.
  campAdminEmail?: string
}

// Unambiguous characters only (no 0/O/1/l/I) - this password is read off a
// screen and typed by hand, so legibility matters more than raw entropy.
function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#%'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length]
  return out
}

// Provisions the camp_admin for a freshly created camp: creates the auth user
// with a generated password (email pre-confirmed so they can log in at once)
// and the scoped admin_users row. Returns the credentials to show once, or an
// { error } the caller can surface without failing the whole registration -
// the camp already exists at this point, so a camp_admin hiccup must not 500
// the camp creation.
async function provisionCampAdmin(
  supabaseAdmin: any,
  campId: string,
  email: string,
  createdBy: string,
): Promise<{ email: string; password: string } | { error: string }> {
  const password = generatePassword()

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'camp_admin', camp_id: campId },
  })
  if (createErr || !created?.user) {
    return { error: createErr?.message || 'Failed to create camp_admin auth user' }
  }

  const { error: rowErr } = await supabaseAdmin.from('admin_users').insert({
    user_id: created.user.id,
    email,
    role: 'camp_admin',
    camp_id: campId,
    is_active: true,
    created_by: createdBy,
  })
  if (rowErr) {
    // Roll back the orphaned auth user so a retry with the same email is clean.
    await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {})
    return { error: rowErr.message || 'Failed to create camp_admin record' }
  }

  return { email, password }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user JWT
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin status
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, role, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (adminError || !adminUser) {
      console.error('Admin verification failed:', adminError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You are not an authorized admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: RequestBody = await req.json()
    const { action, campData, requestId, rejectionReason } = body

    // Validate action
    if (!action || !['register', 'approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "register", "approve", or "reject"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =====================================================
    // ACTION: DIRECT REGISTRATION (No request involved)
    // =====================================================
    if (action === 'register') {
      if (!campData) {
        return new Response(
          JSON.stringify({ error: 'Camp data required for registration' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate required fields
      const requiredFields = ['name', 'type', 'district', 'address', 'capacity', 'contact_person', 'contact_number']
      const missingFields = requiredFields.filter(field => !campData[field as keyof CampData])
      
      if (missingFields.length > 0) {
        return new Response(
          JSON.stringify({ error: `Missing required fields: ${missingFields.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate coordinates
      if (!campData.latitude || !campData.longitude) {
        return new Response(
          JSON.stringify({ error: 'Location coordinates (latitude/longitude) are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate capacity
      if (typeof campData.capacity !== 'number' || campData.capacity <= 0) {
        return new Response(
          JSON.stringify({ error: 'Capacity must be a positive number' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Build location JSONB
      const location = {
        lat: campData.latitude,
        lng: campData.longitude,
        address: campData.address,
        district: campData.district
      }

      // Prepare camp record
      const campRecord = {
        name: campData.name,
        type: campData.type,
        district: campData.district,
        ds_division: campData.ds_division || null,
        village_area: campData.village_area || null,
        nearby_landmark: campData.nearby_landmark || null,
        address: campData.address,
        latitude: campData.latitude,
        longitude: campData.longitude,
        location: location,
        capacity: campData.capacity,
        current_occupancy: campData.current_occupancy || 0,
        contact_person: campData.contact_person,
        contact_number: campData.contact_number,
        contact_email: campData.contact_email || null,
        facilities: campData.facilities || null,
        needs: campData.needs || [],
        special_needs: campData.special_needs || null,
        additional_notes: campData.additional_notes || null,
        managed_by: campData.managed_by || campData.contact_person,
        status: campData.status || 'Active',
        source: 'admin_direct',
        source_request_id: null
      }

      console.log('Registering camp (direct):', JSON.stringify(campRecord, null, 2))

      // Insert camp
      const { data: newCamp, error: campError } = await supabaseAdmin
        .from('camps')
        .insert([campRecord])
        .select()
        .single()

      if (campError) {
        console.error('Camp creation error:', campError)
        return new Response(
          JSON.stringify({ 
            error: `Failed to create camp: ${campError.message}`,
            details: campError.details || campError.hint || null,
            code: campError.code
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create audit log
      await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        admin_email: user.email,
        action: 'REGISTER_CAMP_DIRECT',
        table_name: 'camps',
        record_id: newCamp.id,
        record_snapshot: newCamp,
        reason: 'Direct camp registration by admin',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })

      console.log(`[AUDIT] Admin ${user.email} registered camp directly: ${newCamp.name}`)

      // Provision the camp_admin login for this camp, if an email was supplied.
      let campAdmin: { email: string; password: string } | null = null
      let campAdminError: string | null = null
      if (campAdminEmail) {
        const result = await provisionCampAdmin(supabaseAdmin, newCamp.id, campAdminEmail, user.id)
        if ('error' in result) campAdminError = result.error
        else campAdmin = result
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Camp registered successfully',
          camp: newCamp,
          campAdmin,       // { email, password } to show once, or null
          campAdminError   // non-null if the camp was created but its admin wasn't
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =====================================================
    // ACTION: APPROVE REQUEST (Creates camp from request)
    // =====================================================
    if (action === 'approve') {
      if (!requestId) {
        return new Response(
          JSON.stringify({ error: 'Request ID is required for approval' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!campData) {
        return new Response(
          JSON.stringify({ error: 'Camp data is required for approval' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch the camp request
      const { data: campRequest, error: fetchError } = await supabaseAdmin
        .from('camp_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (fetchError || !campRequest) {
        return new Response(
          JSON.stringify({ error: 'Camp request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (campRequest.status !== 'pending') {
        return new Response(
          JSON.stringify({ error: `Request has already been ${campRequest.status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate required fields
      const requiredFields = ['name', 'type', 'district', 'address', 'capacity', 'contact_person', 'contact_number']
      const missingFields = requiredFields.filter(field => !campData[field as keyof CampData])
      
      if (missingFields.length > 0) {
        return new Response(
          JSON.stringify({ error: `Missing required fields: ${missingFields.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate coordinates
      if (!campData.latitude || !campData.longitude) {
        return new Response(
          JSON.stringify({ error: 'Location coordinates (latitude/longitude) are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Build location JSONB
      const location = {
        lat: campData.latitude,
        lng: campData.longitude,
        address: campData.address,
        district: campData.district
      }

      // Prepare camp record from approved request
      const campRecord = {
        name: campData.name,
        type: campData.type,
        district: campData.district,
        ds_division: campData.ds_division || campRequest.ds_division || null,
        village_area: campData.village_area || campRequest.village_area || null,
        nearby_landmark: campData.nearby_landmark || campRequest.nearby_landmark || null,
        address: campData.address,
        latitude: campData.latitude,
        longitude: campData.longitude,
        location: location,
        capacity: campData.capacity,
        current_occupancy: campData.current_occupancy || 0,
        contact_person: campData.contact_person,
        contact_number: campData.contact_number,
        contact_email: campData.contact_email || campRequest.requester_email || null,
        facilities: campData.facilities || null,
        needs: campData.needs || [],
        special_needs: campData.special_needs || campRequest.special_needs || null,
        additional_notes: campData.additional_notes || campRequest.additional_notes || null,
        managed_by: campData.managed_by || campData.contact_person,
        status: campData.status || 'Active',
        source: 'public_request',
        source_request_id: requestId
      }

      console.log('Creating camp from approved request:', JSON.stringify(campRecord, null, 2))

      // Insert camp
      const { data: newCamp, error: campError } = await supabaseAdmin
        .from('camps')
        .insert([campRecord])
        .select()
        .single()

      if (campError) {
        console.error('Camp creation error:', campError)
        return new Response(
          JSON.stringify({ 
            error: `Failed to create camp: ${campError.message}`,
            details: campError.details || campError.hint || null,
            code: campError.code
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update camp request status
      const { error: updateError } = await supabaseAdmin
        .from('camp_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', requestId)

      if (updateError) {
        console.error('Request update error:', updateError)
        // Don't fail the whole operation - camp was created
      }

      // Create audit log
      await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        admin_email: user.email,
        action: 'APPROVE_CAMP_REQUEST',
        table_name: 'camp_requests',
        record_id: requestId,
        record_snapshot: { request: campRequest, camp: newCamp },
        reason: `Approved request and created camp: ${newCamp.name}`,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })

      console.log(`[AUDIT] Admin ${user.email} approved request ${requestId} and created camp: ${newCamp.name}`)

      // Provision the camp_admin login for this camp, if an email was supplied.
      let campAdmin: { email: string; password: string } | null = null
      let campAdminError: string | null = null
      if (campAdminEmail) {
        const result = await provisionCampAdmin(supabaseAdmin, newCamp.id, campAdminEmail, user.id)
        if ('error' in result) campAdminError = result.error
        else campAdmin = result
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Camp request approved and camp created successfully',
          camp: newCamp,
          requestId: requestId,
          campAdmin,
          campAdminError
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =====================================================
    // ACTION: REJECT REQUEST
    // =====================================================
    if (action === 'reject') {
      if (!requestId) {
        return new Response(
          JSON.stringify({ error: 'Request ID is required for rejection' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!rejectionReason || !rejectionReason.trim()) {
        return new Response(
          JSON.stringify({ error: 'Rejection reason is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch the camp request
      const { data: campRequest, error: fetchError } = await supabaseAdmin
        .from('camp_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (fetchError || !campRequest) {
        return new Response(
          JSON.stringify({ error: 'Camp request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (campRequest.status !== 'pending') {
        return new Response(
          JSON.stringify({ error: `Request has already been ${campRequest.status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update camp request status to rejected
      const { error: rejectError } = await supabaseAdmin
        .from('camp_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: rejectionReason.trim()
        })
        .eq('id', requestId)

      if (rejectError) {
        console.error('Rejection error:', rejectError)
        return new Response(
          JSON.stringify({ error: `Failed to reject request: ${rejectError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create audit log
      await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        admin_email: user.email,
        action: 'REJECT_CAMP_REQUEST',
        table_name: 'camp_requests',
        record_id: requestId,
        record_snapshot: campRequest,
        reason: rejectionReason.trim(),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })

      console.log(`[AUDIT] Admin ${user.email} rejected request ${requestId}: ${rejectionReason}`)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Camp request rejected successfully',
          requestId: requestId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Should never reach here
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
