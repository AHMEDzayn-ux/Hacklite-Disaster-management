// Volunteer Self-Service
// =======================
// Lets a volunteer (no login account) update their own availability and
// accept/decline a proposed assignment. Identity is proven by supplying both
// the volunteer id (returned at registration, kept in the browser) and the
// phone number on file - the same access-code-level trust model used for
// camp inventory, appropriate since these are low-stakes, reversible actions
// (not financial or destructive).

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
  action: 'update-availability' | 'respond-assignment'
  volunteerId: string
  phone: string
  availabilityStatus?: 'available' | 'busy' | 'offline'
  assignmentId?: string
  response?: 'accepted' | 'declined'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const body: RequestBody = await req.json()
  if (!body.volunteerId || !body.phone) return json(400, { error: 'volunteerId and phone are required' })

  const { data: volunteer, error: volunteerError } = await supabase
    .from('volunteers').select('id, phone').eq('id', body.volunteerId).single()
  if (volunteerError || !volunteer || volunteer.phone !== body.phone) {
    return json(401, { error: 'Volunteer id / phone combination not recognized' })
  }

  if (body.action === 'update-availability') {
    if (!body.availabilityStatus || !['available', 'busy', 'offline'].includes(body.availabilityStatus)) {
      return json(400, { error: 'availabilityStatus must be available, busy, or offline' })
    }
    const { error } = await supabase.from('volunteers').update({
      availability_status: body.availabilityStatus, last_active: new Date().toISOString(),
    }).eq('id', body.volunteerId)
    if (error) return json(500, { error: 'Failed to update availability', details: error.message })
    return json(200, { success: true })
  }

  if (body.action === 'respond-assignment') {
    if (!body.assignmentId || !body.response || !['accepted', 'declined'].includes(body.response)) {
      return json(400, { error: 'assignmentId and response (accepted|declined) are required' })
    }
    const { data: assignment, error: fetchError } = await supabase
      .from('volunteer_assignments').select('id, volunteer_id, status').eq('id', body.assignmentId).single()
    if (fetchError || !assignment || assignment.volunteer_id !== body.volunteerId) {
      return json(404, { error: 'Assignment not found for this volunteer' })
    }
    if (assignment.status !== 'proposed') return json(400, { error: `Assignment already ${assignment.status}` })

    const { error } = await supabase.from('volunteer_assignments').update({
      status: body.response, responded_at: new Date().toISOString(),
    }).eq('id', body.assignmentId)
    if (error) return json(500, { error: 'Failed to record response', details: error.message })

    return json(200, { success: true })
  }

  return json(400, { error: 'Unknown action' })
})
