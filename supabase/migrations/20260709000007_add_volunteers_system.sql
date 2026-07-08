-- Migration: Volunteers + Volunteer Assignment Optimization.
-- src/pages/Volunteers.jsx was a "Coming soon" stub with no data model - this
-- is the minimal real version needed to make Hungarian-algorithm assignment
-- optimization meaningful. Registration is public (no admin approval gate,
-- matching the low-friction philosophy of the rest of the reporting system);
-- assignment is proposed by the algorithm and requires accept/decline by the
-- volunteer plus visibility to a coordinator - never auto-dispatched.

CREATE TABLE IF NOT EXISTS volunteers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    skills TEXT[] NOT NULL DEFAULT '{}',
    district TEXT,
    location JSONB, -- {lat, lng, address}
    availability_status TEXT NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'offline')),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteers_availability ON volunteers(availability_status);
CREATE INDEX IF NOT EXISTS idx_volunteers_district ON volunteers(district);
CREATE INDEX IF NOT EXISTS idx_volunteers_skills ON volunteers USING GIN(skills);

ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

-- Public self-registration (no account required, matches the low-friction
-- reporting philosophy). Public can also update ONLY their own availability
-- status via the volunteer-facing UI, gated by knowing their own id (returned
-- at registration) - not a general open-write policy on every column.
CREATE POLICY "public_register_volunteer" ON volunteers FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "public_read_volunteers" ON volunteers FOR SELECT TO anon, authenticated
USING (true);

-- Admins (and the volunteer-assignment-agent via service role) can update any
-- volunteer; a volunteer updating only their own availability is handled by a
-- dedicated edge function action rather than a direct RLS-scoped client
-- UPDATE, since "prove you own this row" has no auth token to check against
-- for an account-less volunteer.
CREATE POLICY "admin_update_volunteers" ON volunteers FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_active = true
    )
);

COMMENT ON TABLE volunteers IS 'Public self-registration, no account required. availability_status/last_active updates from the volunteer-facing UI go through an edge function (service role), not a direct client UPDATE, since there is no session to scope an RLS policy to.';

-- =====================================================
-- VOLUNTEER ASSIGNMENTS (proposed by the Hungarian-algorithm agent)
-- =====================================================
CREATE TABLE IF NOT EXISTS volunteer_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL CHECK (task_type IN ('disaster', 'missing_person', 'animal_rescue')),
    task_ref_id UUID NOT NULL,
    assignment_cost NUMERIC(10,2),
    distance_km NUMERIC(8,2),
    skill_match BOOLEAN DEFAULT true,
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'declined', 'completed', 'expired')),
    proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_volunteer ON volunteer_assignments(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_status ON volunteer_assignments(status);
CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_task ON volunteer_assignments(task_type, task_ref_id);

ALTER TABLE volunteer_assignments ENABLE ROW LEVEL SECURITY;

-- No per-volunteer row scoping is possible here (volunteers have no auth
-- session to check ownership against) - the volunteer-facing UI filters
-- client-side by the volunteer_id returned at registration/lookup time.
CREATE POLICY "public_read_assignments" ON volunteer_assignments FOR SELECT TO anon, authenticated
USING (true);

-- Writes (proposing an assignment, or a volunteer accepting/declining) go
-- through the volunteer-assignment-agent / a dedicated edge function using
-- the service-role key, same reasoning as the availability_status update above.

COMMENT ON TABLE volunteer_assignments IS 'Proposed volunteer-to-task matches from the Hungarian-algorithm assignment agent. Status starts "proposed" and requires the volunteer to accept/decline - never auto-dispatched.';
