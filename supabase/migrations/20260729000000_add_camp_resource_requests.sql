-- Migration: camp_resource_requests - the demand signal for the Resource
-- Allocation Engine.
--
-- Previously the agent inferred what each camp needed (inventory_thresholds
-- minus on-hand, or 10% of capacity off the legacy camps.needs tags). Nobody
-- at the camp ever asked for anything. Now a camp_admin raises an explicit
-- request and those requests are the ONLY demand the agent considers, so every
-- suggested shipment traces back to a real person asking for a real item.
--
-- Requests are matched per specific item (not per category) because approval
-- writes a real inventory_transactions transfer - a category-level plan would
-- ship a phantom item named "food" out of a camp that actually holds Rice.

CREATE TABLE IF NOT EXISTS camp_resource_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    resource_category TEXT NOT NULL
        CHECK (resource_category IN ('food', 'water', 'medical', 'shelter', 'clothing', 'hygiene', 'other')),
    unit TEXT NOT NULL DEFAULT 'units',
    quantity_requested NUMERIC(10,2) NOT NULL CHECK (quantity_requested > 0),
    quantity_fulfilled NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (quantity_fulfilled >= 0),
    urgency TEXT NOT NULL DEFAULT 'normal'
        CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'fulfilled', 'cancelled')),
    notes TEXT,
    requested_by_name TEXT,
    requested_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_camp_resource_requests_camp ON camp_resource_requests(camp_id, status);
CREATE INDEX IF NOT EXISTS idx_camp_resource_requests_open ON camp_resource_requests(status, resource_category);

COMMENT ON TABLE camp_resource_requests IS 'Explicit supply requests raised by a camp_admin. The sole demand input to the Resource Allocation Engine - the agent no longer infers need from inventory_thresholds or camps.needs.';
COMMENT ON COLUMN camp_resource_requests.quantity_fulfilled IS 'Credited only when a linked allocation_plan reaches status=delivered. Approval moves the ledger; delivery is what actually satisfies the request.';
COMMENT ON COLUMN camp_resource_requests.urgency IS 'Tilts the allocation solver toward this request when spare stock is scarce (a cost divisor, not a hard constraint). Distance still dominates.';
COMMENT ON COLUMN camp_resource_requests.status IS 'open -> fulfilled (quantity_fulfilled reached quantity_requested) or cancelled. Partial progress is derived from linked allocation_plans, not stored as a status.';

-- Trace every suggested shipment back to the request that justified it.
ALTER TABLE allocation_plans
ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES camp_resource_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_allocation_plans_request ON allocation_plans(request_id) WHERE request_id IS NOT NULL;

COMMENT ON COLUMN allocation_plans.request_id IS 'The camp_resource_request this plan helps satisfy. NULL only for plans generated before the request-driven model.';

-- camp_inventory_levels groups stock by (camp, item, category, unit), so an
-- approved transfer must carry the source camp's actual unit. Approval
-- previously hardcoded 'units', which silently failed to reconcile any item
-- tracked in kg or litres.
ALTER TABLE allocation_plans
ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'units';

COMMENT ON COLUMN allocation_plans.unit IS 'Unit of the stock being moved, taken from the source camp ledger so the transfer pair reconciles against camp_inventory_levels.';

-- RLS. No client write policy at all: every write goes through the
-- camp-inventory edge function on the service-role key, matching how
-- inventory_transactions is locked down.
ALTER TABLE camp_resource_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_camp_resource_requests" ON camp_resource_requests
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_active = true
        AND au.role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "camp_admin_read_own_camp_resource_requests" ON camp_resource_requests
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_active = true
        AND au.role = 'camp_admin'
        AND au.camp_id = camp_resource_requests.camp_id
    )
);
