-- Missing person case closure: structured resolution + reporter SMS notification.
--
-- Closing a missing person case used to be two optional free-text fields
-- (found_by_contact, found_notes) written straight from the browser, and the
-- reporter was never told. Two problems with that:
--
--   1. The reporter - the person who is actually waiting for news - found out
--      nothing unless they happened to reload the page.
--   2. "I found your missing relative" is a well-known extortion opening. A
--      responder-facing form that forwards arbitrary text to a distressed
--      reporter is a channel for "found her, send Rs 50,000 first".
--
-- So closure now goes through the resolve-missing-person edge function, which
-- screens every free-text field for payment demands / off-platform contact
-- details before it writes anything or sends anything, and the reporter's own
-- phone number never leaves the server: the function reads it with the service
-- role and sends the SMS itself. Nothing in the responder UI needs it.

-- ---------------------------------------------------------------------------
-- 1. Structured closure fields on missing_persons
-- ---------------------------------------------------------------------------
-- found_by_contact/found_notes are kept as-is (existing rows use them);
-- found_by_contact is now the resolver's own number, held for administrators
-- only and never rendered in a responder/public view.

ALTER TABLE missing_persons
    ADD COLUMN IF NOT EXISTS resolved_by_name TEXT,
    ADD COLUMN IF NOT EXISTS found_person_location TEXT,
    ADD COLUMN IF NOT EXISTS found_person_condition TEXT,
    ADD COLUMN IF NOT EXISTS authority_contact TEXT,
    ADD COLUMN IF NOT EXISTS reporter_notified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reporter_notification_status TEXT;

COMMENT ON COLUMN missing_persons.resolved_by_name IS 'Name the responder gave when closing the case. Forwarded to the reporter by SMS so the update is attributable.';
COMMENT ON COLUMN missing_persons.found_person_location IS 'Where the missing person actually is now (hospital, police station, camp, home) - the single most useful fact for the reporter.';
COMMENT ON COLUMN missing_persons.found_person_condition IS 'Condition of the person at closure. Constrained set - see missing_persons_found_condition_check.';
COMMENT ON COLUMN missing_persons.authority_contact IS 'Official desk the reporter can verify the update with (station/hospital name + its official hotline). Personal mobile numbers are rejected by the closure screener - see flagged_closure_attempts.';
COMMENT ON COLUMN missing_persons.reporter_notified_at IS 'When the closure SMS to the reporter was accepted by the gateway.';
COMMENT ON COLUMN missing_persons.reporter_notification_status IS 'Outcome of the closure SMS: sent | failed | no_recipient | not_configured.';

DO $$
BEGIN
    ALTER TABLE missing_persons DROP CONSTRAINT IF EXISTS missing_persons_found_condition_check;
    ALTER TABLE missing_persons ADD CONSTRAINT missing_persons_found_condition_check
        CHECK (found_person_condition IS NULL OR found_person_condition IN (
            'safe',              -- found unharmed
            'injured_treated',   -- injured, receiving care
            'hospitalised',      -- admitted to hospital
            'in_official_care',  -- with police / relief camp / child protection
            'deceased'
        ));
END $$;

DO $$
BEGIN
    ALTER TABLE missing_persons DROP CONSTRAINT IF EXISTS missing_persons_notification_status_check;
    ALTER TABLE missing_persons ADD CONSTRAINT missing_persons_notification_status_check
        CHECK (reporter_notification_status IS NULL OR reporter_notification_status IN (
            'sent', 'failed', 'no_recipient', 'not_configured'
        ));
END $$;

-- ---------------------------------------------------------------------------
-- 2. Outbound SMS audit log
-- ---------------------------------------------------------------------------
-- Every message the platform sends to a member of the public is recorded with
-- its exact body. If someone later claims "the system told me to pay", the
-- text that actually went out is on file.

CREATE TABLE IF NOT EXISTS outbound_sms_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    related_table TEXT NOT NULL,
    related_id UUID,
    template TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    message_body TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'no_recipient', 'not_configured')),
    provider_message_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbound_sms_log_related ON outbound_sms_log(related_table, related_id);
CREATE INDEX IF NOT EXISTS idx_outbound_sms_log_created ON outbound_sms_log(created_at DESC);

COMMENT ON TABLE outbound_sms_log IS 'Audit trail of every outbound SMS. Contains recipient phone numbers, so anon has no policy here at all - administrators (authenticated) read only, edge functions write via the service role.';

ALTER TABLE outbound_sms_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_outbound_sms_log" ON outbound_sms_log;
CREATE POLICY "authenticated_read_outbound_sms_log" ON outbound_sms_log FOR SELECT TO authenticated
USING (true);

-- ---------------------------------------------------------------------------
-- 3. Flagged closure attempts
-- ---------------------------------------------------------------------------
-- A closure whose text trips the screener is NOT written to the case: the case
-- stays Active (a bad actor must not be able to shut down a live search) and
-- no SMS goes out. The attempt is parked here instead, with the full payload,
-- so administrators can see who tried to push a payment demand through the
-- system and act on it.

CREATE TABLE IF NOT EXISTS flagged_closure_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    related_table TEXT NOT NULL DEFAULT 'missing_persons',
    related_id UUID,
    submitted_by_name TEXT,
    submitted_contact TEXT,
    payload JSONB NOT NULL,
    flag_reasons TEXT[] NOT NULL DEFAULT '{}',
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'cleared', 'rejected')),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flagged_closure_attempts_review ON flagged_closure_attempts(review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flagged_closure_attempts_related ON flagged_closure_attempts(related_table, related_id);

COMMENT ON TABLE flagged_closure_attempts IS 'Case closures rejected by the payment-demand / off-platform-contact screener. Administrator-only: the rejected text is evidence, and echoing it back publicly would just re-publish the extortion attempt.';
COMMENT ON COLUMN flagged_closure_attempts.flag_reasons IS 'Screener rule ids that fired, e.g. payment_demand, financial_credentials, off_platform_contact, personal_number_in_authority_contact, coercion.';

ALTER TABLE flagged_closure_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_flagged_closure_attempts" ON flagged_closure_attempts;
CREATE POLICY "authenticated_read_flagged_closure_attempts" ON flagged_closure_attempts FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_review_flagged_closure_attempts" ON flagged_closure_attempts;
CREATE POLICY "authenticated_review_flagged_closure_attempts" ON flagged_closure_attempts FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);
