-- Migration: agent_runs - shared observability table for every AI/OR agent
-- in the multi-agent architecture (situation awareness, prioritization,
-- resource allocation, routing, volunteer assignment). Modeled on the
-- existing audit_logs immutable-log convention: service-role writes only,
-- admin-only reads, no UPDATE/DELETE policy for any client role.

CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL CHECK (agent_name IN (
        'situation_awareness',
        'incident_prioritization',
        'resource_allocation',
        'route_optimization',
        'volunteer_assignment'
    )),
    trigger_source TEXT NOT NULL CHECK (trigger_source IN ('cron', 'manual', 'api')),
    triggered_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'success', 'partial_failure', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,
    items_processed INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    gemini_calls INTEGER DEFAULT 0,
    gemini_failures INTEGER DEFAULT 0,
    error_message TEXT,
    input_summary JSONB,
    output_summary JSONB
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_started ON agent_runs(agent_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_agent_runs" ON agent_runs FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_active = true
    )
);

-- No INSERT/UPDATE/DELETE policy for any client role.
-- All writes happen via the service-role key inside each agent's edge function.

COMMENT ON TABLE agent_runs IS 'Observability log for every AI/OR agent run. Single source of truth for "when did this last run, did it succeed". Immutable from the client side - only the service role (inside edge functions) ever writes here.';
