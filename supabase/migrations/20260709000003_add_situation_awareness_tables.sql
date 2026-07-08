-- Migration: situation_reports - output table for the Situation Awareness Agent
-- (damage index aggregation, risk score/trend, Gemini-generated SITREP narrative).

CREATE TABLE IF NOT EXISTS situation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    district TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    disaster_active_count INTEGER NOT NULL DEFAULT 0,
    disaster_critical_count INTEGER NOT NULL DEFAULT 0,
    disaster_high_count INTEGER NOT NULL DEFAULT 0,
    missing_persons_active_count INTEGER NOT NULL DEFAULT 0,
    animal_rescue_active_count INTEGER NOT NULL DEFAULT 0,

    camp_count INTEGER NOT NULL DEFAULT 0,
    camp_total_capacity INTEGER NOT NULL DEFAULT 0,
    camp_total_occupancy INTEGER NOT NULL DEFAULT 0,
    camp_occupancy_pct NUMERIC(5,2),

    damage_index_avg NUMERIC(5,2),
    damage_index_max NUMERIC(5,2),

    -- Velocity-based risk score: rate of new active reports over rolling windows,
    -- combined with shrinking camp-capacity headroom. Distinct from damage_index,
    -- which measures current severity, not trajectory.
    reports_last_1h INTEGER NOT NULL DEFAULT 0,
    reports_last_6h INTEGER NOT NULL DEFAULT 0,
    reports_last_24h INTEGER NOT NULL DEFAULT 0,
    risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    risk_trend TEXT NOT NULL DEFAULT 'stable' CHECK (risk_trend IN ('rising', 'stable', 'falling')),

    narrative_summary TEXT,
    narrative_model TEXT,
    raw_stats JSONB NOT NULL DEFAULT '{}'::jsonb,

    UNIQUE(run_id, district)
);

CREATE INDEX IF NOT EXISTS idx_situation_reports_district_gen ON situation_reports(district, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_situation_reports_risk ON situation_reports(risk_score DESC);

ALTER TABLE situation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_situation_reports" ON situation_reports FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_active = true
    )
);

COMMENT ON TABLE situation_reports IS 'Per-district output of the Situation Awareness Agent: damage index (reactive severity), risk score/trend (predictive, velocity-based), and a Gemini-generated SITREP narrative with deterministic-template fallback.';
COMMENT ON COLUMN situation_reports.risk_score IS 'Forward-looking escalation signal from new-report velocity + shrinking camp capacity headroom - distinct from damage_index, which is a snapshot of current severity.';
