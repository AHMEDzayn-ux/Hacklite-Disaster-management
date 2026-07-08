-- Migration: allocation_plans - output of the Resource Allocation Engine.
-- This is a real transportation-problem LP solve (see resource-allocation-agent),
-- not a heuristic score. Plans are recommendations only: approving one is what
-- actually moves inventory (writes the transferred_out/transferred_in pair into
-- inventory_transactions) - the human decision is the only thing that changes
-- real state.

CREATE TABLE IF NOT EXISTS allocation_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    from_camp_id UUID REFERENCES camps(id) ON DELETE SET NULL,
    to_camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
    resource_category TEXT NOT NULL CHECK (resource_category IN ('food', 'water', 'medical', 'shelter', 'clothing', 'hygiene', 'other')),
    item_name TEXT,
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    distance_km NUMERIC(8,2),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    lp_objective_value NUMERIC(12,4),
    solver_metadata JSONB DEFAULT '{}'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_allocation_plans_run ON allocation_plans(run_id);
CREATE INDEX IF NOT EXISTS idx_allocation_plans_status ON allocation_plans(status);
CREATE INDEX IF NOT EXISTS idx_allocation_plans_to_camp ON allocation_plans(to_camp_id);

ALTER TABLE allocation_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_allocation_plans" ON allocation_plans FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_active = true
    )
);

-- No client INSERT/UPDATE/DELETE - the resource-allocation-agent edge function
-- inserts plans with the service-role key; approval/rejection is a separate
-- admin-only edge function action (not a direct table write) because approval
-- has a side effect (writing inventory_transactions) that must stay atomic
-- and audited.

COMMENT ON TABLE allocation_plans IS 'Recommended resource shipments from the LP-based Resource Allocation Engine (transportation problem: minimize distance-weighted transport subject to supply/demand constraints). Pending until an admin approves - approval is what actually moves inventory.';

-- inventory_transactions.source_allocation_plan_id was created without a FK in
-- 20260709000005 (allocation_plans didn't exist yet at that point). Add the
-- constraint now that the table exists; Postgres has no native
-- "ADD CONSTRAINT IF NOT EXISTS", so guard it explicitly.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inventory_transactions_source_allocation_plan_id_fkey'
    ) THEN
        ALTER TABLE inventory_transactions
        ADD CONSTRAINT inventory_transactions_source_allocation_plan_id_fkey
        FOREIGN KEY (source_allocation_plan_id) REFERENCES allocation_plans(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventory_txn_allocation_plan ON inventory_transactions(source_allocation_plan_id) WHERE source_allocation_plan_id IS NOT NULL;
