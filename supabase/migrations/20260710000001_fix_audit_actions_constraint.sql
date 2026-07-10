-- Migration: fix audit_logs.action CHECK constraint - it was never updated
-- when the allocation-plan-review edge function started writing
-- APPROVE_ALLOCATION_PLAN/REJECT_ALLOCATION_PLAN rows, and that insert's
-- error was never checked, so every one of those audit log writes has been
-- silently failing (confirmed: zero rows existed for table_name =
-- 'allocation_plans' despite live approvals having happened). This adds the
-- complete set of action strings actually used across every edge function,
-- including the new dispatch/deliver shipment-tracking actions.

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check
CHECK (action IN (
    'DELETE',
    'BULK_DELETE',
    'RESTORE',
    'APPROVE_REQUEST',
    'REJECT_REQUEST',
    'REGISTER_CAMP',
    'REGISTER_CAMP_DIRECT',
    'APPROVE_CAMP_REQUEST',
    'REJECT_CAMP_REQUEST',
    'APPROVE_ALLOCATION_PLAN',
    'REJECT_ALLOCATION_PLAN',
    'DISPATCH_ALLOCATION_PLAN',
    'DELIVER_ALLOCATION_PLAN'
));
