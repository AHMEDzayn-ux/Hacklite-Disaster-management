-- Migration: 'verified' inventory transactions - a stock count that found no
-- discrepancy.
--
-- A camp's stock table is meant to be recounted twice a day, and the camp admin
-- screen flags any item not counted within the last 12 hours. That freshness
-- comes from camp_inventory_levels.last_movement_at, which only advances when a
-- ledger row is written - so a count that confirms the recorded figure is
-- already correct had nothing to write, and a well-stocked item would sit
-- permanently marked overdue no matter how often it was actually counted.
--
-- A zero-quantity 'verified' row records exactly that: the count happened, the
-- number did not change. The live stock view contributes 0 for any type outside
-- its received/distributed lists, so on-hand figures are untouched, while
-- MAX(recorded_at) picks the verification up and it appears in the movement
-- history alongside real movements - which is the point, since "counted and
-- correct" is itself part of the audit trail.

ALTER TABLE inventory_transactions
DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;

ALTER TABLE inventory_transactions
ADD CONSTRAINT inventory_transactions_transaction_type_check
CHECK (transaction_type IN (
    'received', 'distributed', 'adjusted', 'transferred_in', 'transferred_out', 'verified'
));

-- Quantity stays non-zero for anything that claims stock moved; only a
-- verification may carry 0, because nothing did. A 'verified' row is also not
-- allowed to carry a quantity, which would silently be ignored by the view.
ALTER TABLE inventory_transactions
DROP CONSTRAINT IF EXISTS inventory_transactions_quantity_check;

ALTER TABLE inventory_transactions
ADD CONSTRAINT inventory_transactions_quantity_check
CHECK (
    (transaction_type = 'verified' AND quantity = 0)
    OR (transaction_type <> 'verified' AND quantity <> 0)
);

COMMENT ON COLUMN inventory_transactions.transaction_type IS 'received/transferred_in add stock, distributed/transferred_out remove it, adjusted carries a signed stock-count correction (may be negative), verified is a zero-quantity record that a count happened and matched.';
