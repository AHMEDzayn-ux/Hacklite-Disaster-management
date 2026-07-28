-- Migration: columns for device-pushed call recordings.
-- receive-call-recording (a new edge function) lets a Tasker/MacroDroid
-- automation on a dedicated gateway phone auto-upload a call recording the
-- moment its native dialer finishes saving it, instead of a staff member
-- manually uploading via /admin/call-reports. These columns distinguish
-- device-pushed rows from manual uploads and keep basic device provenance,
-- mirroring the deviceId tracking sms_processing_logs already does for SMS.

ALTER TABLE call_recordings
    ADD COLUMN IF NOT EXISTS ingestion_source TEXT NOT NULL DEFAULT 'manual'
        CHECK (ingestion_source IN ('manual', 'gateway_device'));

ALTER TABLE call_recordings ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE call_recordings ADD COLUMN IF NOT EXISTS device_location TEXT;
ALTER TABLE call_recordings ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ;

COMMENT ON COLUMN call_recordings.ingestion_source IS 'manual = uploaded via /admin/call-reports by a staff member; gateway_device = auto-pushed by the Tasker/MacroDroid automation on the intake phone';
COMMENT ON COLUMN call_recordings.device_id IS 'Gateway phone identifier, only set for ingestion_source = gateway_device';
COMMENT ON COLUMN call_recordings.device_location IS 'Best-effort location reported by the gateway device at upload time (not necessarily the incident location) - context only, not geocoded/authoritative';
COMMENT ON COLUMN call_recordings.recorded_at IS 'When the call itself happened, per the device - may differ from created_at (when the file was ingested) if upload was delayed';
