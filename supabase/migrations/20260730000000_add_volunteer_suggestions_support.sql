-- Volunteer self-service task suggestions.
-- src/features/volunteers/pages/Volunteers.jsx previously only ever showed a
-- single AI-optimizer-proposed assignment. This adds: a freeform capability
-- field for skills not covered by the fixed tag list, and a way to tell
-- apart assignments a coordinator's optimizer proposed (still requires
-- accept/decline) from ones a volunteer pulled themselves from a ranked
-- suggestion list (created already-accepted, since the volunteer chose it).

ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS custom_skill TEXT;
COMMENT ON COLUMN volunteers.custom_skill IS 'Freeform "other" capability the volunteer described at registration. Informational for coordinators only - never used for automated hazard-matching since arbitrary text cannot be safely verified as hazard-capable.';

ALTER TABLE volunteer_assignments ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'agent'
    CHECK (source IN ('agent', 'self_selected'));
COMMENT ON COLUMN volunteer_assignments.source IS '"agent" = proposed by the volunteer-assignment-agent optimizer (requires accept/decline). "self_selected" = volunteer picked it themselves from their ranked suggestion list (created already-accepted).';
