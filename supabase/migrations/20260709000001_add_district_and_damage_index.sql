-- Migration: Add district classification + damage index + duplicate-detection pointer
-- to the three citizen-report tables. Only camps/camp_requests have a real
-- district column today; disasters/missing_persons/animal_rescues only carry
-- a free-text location jsonb {lat,lng,address}. The Situation Awareness Agent
-- backfills district via ILIKE match against the known 25-district list.

ALTER TABLE disasters
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS damage_index NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS possible_duplicate_of UUID REFERENCES disasters(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS duplicate_status TEXT DEFAULT NULL CHECK (duplicate_status IS NULL OR duplicate_status IN ('flagged', 'confirmed_duplicate', 'confirmed_distinct'));

ALTER TABLE missing_persons
ADD COLUMN IF NOT EXISTS district TEXT;

ALTER TABLE animal_rescues
ADD COLUMN IF NOT EXISTS district TEXT;

CREATE INDEX IF NOT EXISTS idx_disasters_district ON disasters(district);
CREATE INDEX IF NOT EXISTS idx_missing_persons_district ON missing_persons(district);
CREATE INDEX IF NOT EXISTS idx_animal_rescues_district ON animal_rescues(district);
CREATE INDEX IF NOT EXISTS idx_disasters_damage_index ON disasters(damage_index DESC) WHERE damage_index IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disasters_possible_duplicate ON disasters(possible_duplicate_of) WHERE possible_duplicate_of IS NOT NULL;

COMMENT ON COLUMN disasters.district IS 'Best-effort Sri Lanka district match derived from location->>address. Backfilled by situation-awareness-agent; NULL rows are bucketed under "Unclassified" until matched.';
COMMENT ON COLUMN disasters.damage_index IS '0-100 composite score computed by situation-awareness-agent from severity + people_affected + casualties. Recomputed on every agent run.';
COMMENT ON COLUMN disasters.possible_duplicate_of IS 'Set by incident-prioritization-agent when a high-confidence duplicate candidate is found. Never auto-merged - requires admin confirm/reject.';
COMMENT ON COLUMN disasters.duplicate_status IS 'NULL = not evaluated or no match found. flagged = awaiting admin review. confirmed_duplicate/confirmed_distinct = admin decision recorded.';
