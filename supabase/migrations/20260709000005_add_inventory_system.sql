-- Migration: Smart Relief Inventory Management.
-- Code-gated (no volunteer accounts needed), append-only ledger with current
-- stock always computed live from the ledger via a view (never a cached
-- counter that can drift). Also links in-kind (non-monetary) donations into
-- the same ledger.

ALTER TABLE camps
ADD COLUMN IF NOT EXISTS inventory_access_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS inventory_thresholds JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN camps.inventory_access_code IS 'Short admin-generated code letting a volunteer manage this camp''s inventory with no signup. Regenerable from AdminEditCamp.';
COMMENT ON COLUMN camps.inventory_thresholds IS 'Per-item reorder threshold map, e.g. {"Rice": 50, "Bottled Water": 200}. Used for low-stock alerts and reorder-point calculations.';

ALTER TABLE donations
ADD COLUMN IF NOT EXISTS donation_type TEXT NOT NULL DEFAULT 'monetary' CHECK (donation_type IN ('monetary', 'in_kind'));

COMMENT ON COLUMN donations.donation_type IS 'monetary = Stripe payment. in_kind = physical goods dropped off at a camp, recorded in the same public ledger and optionally linked to an inventory_transactions row via source_donation_id.';

-- =====================================================
-- INVENTORY TRANSACTIONS (append-only ledger)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('food', 'water', 'medical', 'shelter', 'clothing', 'hygiene', 'other')),
    unit TEXT NOT NULL DEFAULT 'units',
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('received', 'distributed', 'adjusted', 'transferred_in', 'transferred_out')),
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity <> 0),
    source_donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,
    source_allocation_plan_id UUID, -- FK added in 20260709000006 once allocation_plans exists
    recorded_by_name TEXT,
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_txn_camp_item ON inventory_transactions(camp_id, item_name);
CREATE INDEX IF NOT EXISTS idx_inventory_txn_recorded_at ON inventory_transactions(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_txn_donation ON inventory_transactions(source_donation_id) WHERE source_donation_id IS NOT NULL;

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- No INSERT/UPDATE/DELETE policy for any client role - all writes go through
-- the camp-inventory edge function using the service-role key (code-gated for
-- volunteers, JWT-gated for admins). Corrections are new 'adjusted' rows,
-- never edits to history - same immutable convention as audit_logs.
CREATE POLICY "admin_read_inventory_transactions" ON inventory_transactions FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_active = true
    )
);

COMMENT ON TABLE inventory_transactions IS 'Append-only stock ledger. Current stock is never stored directly - it is always computed live from this ledger via camp_inventory_levels, so it can never drift out of sync.';

-- =====================================================
-- CURRENT STOCK VIEW (computed live, not a cached column)
-- =====================================================
CREATE OR REPLACE VIEW camp_inventory_levels AS
SELECT
    camp_id,
    item_name,
    category,
    unit,
    SUM(
        CASE
            WHEN transaction_type IN ('received', 'transferred_in', 'adjusted') THEN quantity
            WHEN transaction_type IN ('distributed', 'transferred_out') THEN -quantity
            ELSE 0
        END
    ) AS quantity_on_hand,
    MAX(recorded_at) AS last_movement_at
FROM inventory_transactions
GROUP BY camp_id, item_name, category, unit;

COMMENT ON VIEW camp_inventory_levels IS 'Live-computed current stock per camp/item from inventory_transactions. Correct by construction - never a maintained counter that can drift.';

-- Public read access to the aggregate view only (transparency, same spirit as
-- the public donations ledger) - the raw transaction history stays admin-only.
-- Views run with the owning role's privileges by default in Postgres (no
-- `security_invoker`), so this view intentionally bypasses the admin-only RLS
-- on inventory_transactions for aggregate reads; access is controlled instead
-- by this explicit GRANT, not by row-level policy.
GRANT SELECT ON camp_inventory_levels TO anon, authenticated;
