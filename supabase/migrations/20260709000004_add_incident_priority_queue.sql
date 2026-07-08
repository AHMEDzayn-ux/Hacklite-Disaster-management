-- Migration: incident_priority_queue - output of the Incident Prioritization Agent.
-- Re-sorted every agent run; EMD-style triage score with an explicit aging factor
-- so an old unaddressed report doesn't silently fall off the bottom of the list.

CREATE TABLE IF NOT EXISTS incident_priority_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    disaster_id UUID NOT NULL REFERENCES disasters(id) ON DELETE CASCADE,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- transparent component breakdown, each 0.0-1.0 before weighting
    severity_component NUMERIC(5,4) NOT NULL DEFAULT 0,
    casualties_component NUMERIC(5,4) NOT NULL DEFAULT 0,
    people_affected_component NUMERIC(5,4) NOT NULL DEFAULT 0,
    aging_component NUMERIC(5,4) NOT NULL DEFAULT 0,
    capacity_pressure_component NUMERIC(5,4) NOT NULL DEFAULT 0,

    priority_score NUMERIC(5,2) NOT NULL,
    rank INTEGER,

    contributing_factors JSONB NOT NULL DEFAULT '{}'::jsonb,

    UNIQUE(run_id, disaster_id)
);

CREATE INDEX IF NOT EXISTS idx_priority_queue_run_rank ON incident_priority_queue(run_id, rank);
CREATE INDEX IF NOT EXISTS idx_priority_queue_disaster ON incident_priority_queue(disaster_id);
CREATE INDEX IF NOT EXISTS idx_priority_queue_score ON incident_priority_queue(priority_score DESC);

ALTER TABLE incident_priority_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_priority_queue" ON incident_priority_queue FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_active = true
    )
);

COMMENT ON TABLE incident_priority_queue IS 'Live-recomputed triage ranking of active disaster reports: priority = 0.3*severity + 0.25*casualties + 0.15*people_affected + 0.15*aging + 0.15*capacity_pressure. Aging component prevents old unaddressed reports from being buried by newer ones.';
