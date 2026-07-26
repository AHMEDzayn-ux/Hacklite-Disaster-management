-- Migration: camp_admin role.
-- A camp_admin is a logged-in user scoped to exactly one camp who can record
-- inventory (add stock / distribute) for that camp only - no access to any
-- other admin surface. One is provisioned automatically when a camp is
-- registered (see the camp-management edge function).
--
-- Enforcement lives in the edge functions (service-role key); this migration
-- only widens the role vocabulary and adds the camp scope column.

-- 1. Allow 'camp_admin' in the role CHECK. The original constraint was inline
--    and so auto-named admin_users_role_check by Postgres.
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users
ADD CONSTRAINT admin_users_role_check
CHECK (role IN ('admin', 'super_admin', 'camp_admin'));

-- 2. Scope column. NULL for admin/super_admin (all camps); set for a camp_admin
--    to the one camp they manage. Deleting the camp removes its camp_admin rows.
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS camp_id UUID REFERENCES camps(id) ON DELETE CASCADE;

COMMENT ON COLUMN admin_users.camp_id IS 'For role=camp_admin, the single camp this user may manage inventory for. NULL for admin/super_admin (unscoped).';

CREATE INDEX IF NOT EXISTS idx_admin_users_camp_id ON admin_users(camp_id) WHERE camp_id IS NOT NULL;

-- 3. Let any authenticated user read their OWN admin_users row. The only
--    existing policy restricts the table to super_admins, but the app now needs
--    to detect a camp_admin's role client-side at login. This is non-recursive
--    (compares user_id = auth.uid() directly, no subquery on admin_users), so a
--    user can read exactly one row - their own - and nothing else.
CREATE POLICY "read_own_admin_user_row" ON admin_users
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 4. A camp_admin needs to read its own camp's raw ledger history (the current
--    stock view is already public). Widen the inventory_transactions read
--    policy so a camp_admin sees only its own camp's rows; full admins keep
--    unrestricted read via the existing policy.
CREATE POLICY "camp_admin_read_own_inventory_transactions" ON inventory_transactions
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_active = true
        AND au.role = 'camp_admin'
        AND au.camp_id = inventory_transactions.camp_id
    )
);
