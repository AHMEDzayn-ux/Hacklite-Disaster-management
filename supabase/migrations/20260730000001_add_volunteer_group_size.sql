-- Volunteers register with a group size, not just an individual identity -
-- how many people they can actually bring matters as much as their skill
-- tags for the AI suggestion agent (a group of 5 can take on a bigger
-- debris-clearing job than one person).

ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS group_size INTEGER NOT NULL DEFAULT 1 CHECK (group_size >= 1);
COMMENT ON COLUMN volunteers.group_size IS 'How many people (including the registrant) this volunteer entry represents - considered by the suggestion agent when ranking cases.';
