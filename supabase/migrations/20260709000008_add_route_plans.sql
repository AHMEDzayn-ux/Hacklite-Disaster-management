-- Migration: route_plans - output of the Route Optimization agent (OSRM
-- road-network routing + 2-opt TSP for multi-stop runs). Rendered as a
-- polyline on the existing Leaflet map.

CREATE TABLE IF NOT EXISTS route_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    route_type TEXT NOT NULL CHECK (route_type IN ('single_destination', 'multi_stop')),
    origin_camp_id UUID REFERENCES camps(id) ON DELETE SET NULL,
    stop_camp_ids UUID[] NOT NULL DEFAULT '{}',
    allocation_plan_id UUID REFERENCES allocation_plans(id) ON DELETE SET NULL,
    stop_order INTEGER[],
    total_distance_km NUMERIC(8,2),
    total_duration_min NUMERIC(8,2),
    geometry JSONB, -- GeoJSON LineString from OSRM, consumed directly by react-leaflet Polyline
    optimization_method TEXT CHECK (optimization_method IN ('osrm_direct', 'nearest_neighbor', 'nearest_neighbor_2opt')),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_plans_run ON route_plans(run_id);
CREATE INDEX IF NOT EXISTS idx_route_plans_allocation ON route_plans(allocation_plan_id) WHERE allocation_plan_id IS NOT NULL;

ALTER TABLE route_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_route_plans" ON route_plans FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_active = true
    )
);

COMMENT ON TABLE route_plans IS 'Real road-network routes (OSRM), not straight-line distance. multi_stop routes use nearest-neighbor construction + 2-opt local search (classic TSP heuristic) over an OSRM distance/duration matrix.';
