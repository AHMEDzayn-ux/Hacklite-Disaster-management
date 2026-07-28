-- Migration: Call recording transcription pipeline.
-- Staff/volunteers upload local call recordings; call-transcription-agent
-- (Gemini audio understanding) transcribes + classifies + extracts fields,
-- then inserts directly into disasters/missing_persons/animal_rescues -
-- mirroring how sms-report already handles SMS text. call_recordings acts as
-- both the upload record and the processing/audit log (the role
-- sms_processing_logs plays for SMS), since there's no pre-existing row for
-- a call the way there implicitly is for an inbound SMS.

CREATE TABLE IF NOT EXISTS call_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_path TEXT NOT NULL,
    original_filename TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    caller_phone TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    transcript TEXT,
    detected_language TEXT,
    detected_category TEXT,
    confidence NUMERIC,
    created_record_id UUID,
    created_record_table TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_call_recordings_status_pending
    ON call_recordings(status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_call_recordings_created_at ON call_recordings(created_at);

ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;

-- Same admin gate as every other staff-facing table (volunteers/camps/etc):
-- only active admin_users can read or upload call recordings. The
-- call-transcription-agent edge function writes status/transcript/etc via the
-- service-role key, which bypasses RLS entirely - no policy needed for it.
CREATE POLICY "admin_read_call_recordings" ON call_recordings FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_active = true
    )
);

CREATE POLICY "admin_insert_call_recordings" ON call_recordings FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_active = true
    )
);

COMMENT ON TABLE call_recordings IS 'Uploaded call recordings + their transcription/extraction status. Processed by call-transcription-agent (Gemini audio understanding), which writes the extracted report directly into disasters/missing_persons/animal_rescues, same as sms-report does for SMS text.';

-- Storage RLS: creating the call-recordings bucket (a manual dashboard step,
-- since bucket creation isn't run through migrations here) does NOT add any
-- access policy on storage.objects - every bucket needs one explicitly,
-- regardless of its Public/Private toggle, or every upload gets rejected
-- with "new row violates row-level security policy". Same admin gate as the
-- table itself above.
CREATE POLICY "admin_upload_call_recordings_storage" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'call-recordings'
    AND EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_active = true
    )
);

CREATE POLICY "admin_read_call_recordings_storage" ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'call-recordings'
    AND EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_active = true
    )
);

-- Mirror the reported_via_sms / sms_sender_phone precedent
-- (20260101000000_add_reported_via_sms_column.sql) for call-sourced reports.
ALTER TABLE disasters ADD COLUMN IF NOT EXISTS reported_via_call BOOLEAN DEFAULT FALSE;
ALTER TABLE disasters ADD COLUMN IF NOT EXISTS call_recording_id UUID REFERENCES call_recordings(id);

ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS reported_via_call BOOLEAN DEFAULT FALSE;
ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS call_recording_id UUID REFERENCES call_recordings(id);

ALTER TABLE animal_rescues ADD COLUMN IF NOT EXISTS reported_via_call BOOLEAN DEFAULT FALSE;
ALTER TABLE animal_rescues ADD COLUMN IF NOT EXISTS call_recording_id UUID REFERENCES call_recordings(id);

CREATE INDEX IF NOT EXISTS idx_disasters_reported_via_call ON disasters(reported_via_call) WHERE reported_via_call = TRUE;
CREATE INDEX IF NOT EXISTS idx_missing_persons_reported_via_call ON missing_persons(reported_via_call) WHERE reported_via_call = TRUE;
CREATE INDEX IF NOT EXISTS idx_animal_rescues_reported_via_call ON animal_rescues(reported_via_call) WHERE reported_via_call = TRUE;

COMMENT ON COLUMN disasters.reported_via_call IS 'True if this report was created from a transcribed call recording';
COMMENT ON COLUMN missing_persons.reported_via_call IS 'True if this report was created from a transcribed call recording';
COMMENT ON COLUMN animal_rescues.reported_via_call IS 'True if this report was created from a transcribed call recording';
