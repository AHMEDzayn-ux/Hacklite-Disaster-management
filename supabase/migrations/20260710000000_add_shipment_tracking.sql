-- Migration: shipment tracking lifecycle for allocation_plans.
-- Approval only ever meant "inventory ledger updated" - it said nothing about
-- whether the physical goods have actually left the source camp or reached
-- the receiving camp/authority. This adds the two real-world milestones a
-- relief logistics coordinator actually needs to track: dispatched (vehicle
-- has left the source camp) and delivered (received and signed for at the
-- destination). Approval remains the only step that touches the inventory
-- ledger - dispatch/deliver are pure status + accountability tracking.

ALTER TABLE allocation_plans DROP CONSTRAINT IF EXISTS allocation_plans_status_check;
ALTER TABLE allocation_plans ADD CONSTRAINT allocation_plans_status_check
    CHECK (status IN ('pending', 'approved', 'dispatched', 'delivered', 'rejected'));

ALTER TABLE allocation_plans
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dispatched_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS received_by_name TEXT,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

COMMENT ON COLUMN allocation_plans.status IS 'pending (AI recommendation) -> approved (inventory ledger updated) -> dispatched (physically left source camp) -> delivered (received/signed for at destination). rejected is terminal from pending.';
COMMENT ON COLUMN allocation_plans.received_by_name IS 'Name/role of the person or authority at the destination who confirmed receipt, e.g. "Camp Coordinator - Balangoda" or "DS Office Ratnapura".';
