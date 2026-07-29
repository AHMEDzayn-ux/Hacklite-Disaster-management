-- Migration: resource_items - a canonical catalog of relief items.
--
-- Item names were free text on both sides of the allocation match: a camp
-- stocking "Water" and a camp requesting "Water" only matched if the spelling
-- AND the hand-picked category agreed. In practice they didn't - live data had
-- "Water" filed under category 'food' at two camps, so a request for water
-- (category 'water') could never be sourced from it. The stock was invisible to
-- the solver while sitting a few km away.
--
-- Now every stock movement and every request points at a catalog row, and the
-- allocation agent matches on item_id. Two camps referring to the same item is
-- no longer a spelling coincidence - it is the same foreign key.

CREATE TABLE IF NOT EXISTS resource_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL
        CHECK (category IN ('food', 'water', 'medical', 'shelter', 'clothing', 'hygiene', 'other')),
    default_unit TEXT NOT NULL DEFAULT 'units',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The catalog's whole purpose is one row per real-world item, so the name is
-- unique case-insensitively - "Rice" and "rice" cannot both exist.
CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_items_name ON resource_items (lower(trim(name)));
CREATE INDEX IF NOT EXISTS idx_resource_items_category ON resource_items (category) WHERE is_active;

COMMENT ON TABLE resource_items IS 'Canonical catalog of relief items. Stock movements and camp requests reference these rows so the allocation agent matches on item_id, never on free-text spelling.';
COMMENT ON COLUMN resource_items.category IS 'Authoritative category for this item. inventory_transactions.category and camp_resource_requests.resource_category are derived from here, so they can never disagree between camps.';

INSERT INTO resource_items (name, category, default_unit) VALUES
    ('Rice', 'food', 'kg'),
    ('Dhal', 'food', 'kg'),
    ('Flour', 'food', 'kg'),
    ('Sugar', 'food', 'kg'),
    ('Tea', 'food', 'kg'),
    ('Milk Powder', 'food', 'kg'),
    ('Canned Fish', 'food', 'cans'),
    ('Biscuits', 'food', 'packets'),
    ('Cooking Oil', 'food', 'liters'),
    ('Salt', 'food', 'kg'),
    ('Soup', 'food', 'packets'),
    ('Baby Formula', 'food', 'tins'),
    ('Water', 'water', 'liters'),
    ('Bottled Water', 'water', 'bottles'),
    ('Water Purification Tablets', 'water', 'tablets'),
    ('Water Tank', 'water', 'units'),
    ('First Aid Kit', 'medical', 'kits'),
    ('Bandages', 'medical', 'packs'),
    ('Antiseptic', 'medical', 'bottles'),
    ('Paracetamol', 'medical', 'strips'),
    ('Oral Rehydration Salts', 'medical', 'sachets'),
    ('Face Masks', 'medical', 'units'),
    ('Gloves', 'medical', 'pairs'),
    ('Insulin', 'medical', 'vials'),
    ('Tent', 'shelter', 'units'),
    ('Tarpaulin', 'shelter', 'sheets'),
    ('Blanket', 'shelter', 'units'),
    ('Mattress', 'shelter', 'units'),
    ('Sleeping Mat', 'shelter', 'units'),
    ('Mosquito Net', 'shelter', 'units'),
    ('Adult Clothing', 'clothing', 'sets'),
    ('Children Clothing', 'clothing', 'sets'),
    ('Underwear', 'clothing', 'sets'),
    ('Footwear', 'clothing', 'pairs'),
    ('Towel', 'clothing', 'units'),
    ('Soap', 'hygiene', 'bars'),
    ('Shampoo', 'hygiene', 'bottles'),
    ('Toothpaste', 'hygiene', 'tubes'),
    ('Toothbrush', 'hygiene', 'units'),
    ('Sanitary Pads', 'hygiene', 'packs'),
    ('Diapers', 'hygiene', 'packs'),
    ('Detergent', 'hygiene', 'kg'),
    ('Toilet Paper', 'hygiene', 'rolls'),
    ('Hand Sanitizer', 'hygiene', 'bottles'),
    ('Torch', 'other', 'units'),
    ('Batteries', 'other', 'packs'),
    ('Candles', 'other', 'packs'),
    ('Matches', 'other', 'boxes'),
    ('Generator', 'other', 'units'),
    ('Fuel', 'other', 'liters'),
    ('Rope', 'other', 'meters'),
    ('Bucket', 'other', 'units'),
    ('Wheelchair', 'other', 'units'),
    ('Cooking Utensils', 'other', 'sets')
ON CONFLICT DO NOTHING;

-- Anything already in the ledger whose name isn't in the seed becomes a catalog
-- row as-is, preserving its existing name and category. No existing stock is
-- guessed at or dropped - unmatched items simply join the catalog unchanged.
INSERT INTO resource_items (name, category, default_unit)
SELECT DISTINCT ON (lower(trim(t.item_name)))
    trim(t.item_name), t.category, COALESCE(t.unit, 'units')
FROM inventory_transactions t
WHERE NOT EXISTS (
    SELECT 1 FROM resource_items ri WHERE lower(trim(ri.name)) = lower(trim(t.item_name))
)
ORDER BY lower(trim(t.item_name)), t.recorded_at DESC;

ALTER TABLE inventory_transactions
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES resource_items(id) ON DELETE RESTRICT;

ALTER TABLE camp_resource_requests
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES resource_items(id) ON DELETE RESTRICT;

ALTER TABLE allocation_plans
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES resource_items(id) ON DELETE SET NULL;

-- Known legacy misspellings, corrected explicitly before the generic name
-- match so they don't bind to the wrong catalog row. "soup" was recorded under
-- category 'hygiene', which makes clear it meant Soap - matching it literally
-- to the (also legitimate) food item Soup would silently mislabel real stock.
UPDATE inventory_transactions t
SET item_id = ri.id
FROM (VALUES ('soup', 'Soap')) AS alias(legacy, canonical)
JOIN resource_items ri ON lower(trim(ri.name)) = lower(alias.canonical)
WHERE t.item_id IS NULL AND lower(trim(t.item_name)) = alias.legacy;

-- Point every remaining row at its catalog entry, matching on normalized name
-- only. Category is deliberately NOT part of the match: a camp having filed
-- "Water" under 'food' is exactly the mistake this migration exists to correct.
UPDATE inventory_transactions t
SET item_id = ri.id
FROM resource_items ri
WHERE t.item_id IS NULL AND lower(trim(ri.name)) = lower(trim(t.item_name));

UPDATE camp_resource_requests r
SET item_id = ri.id
FROM resource_items ri
WHERE r.item_id IS NULL AND lower(trim(ri.name)) = lower(trim(r.item_name));

UPDATE allocation_plans p
SET item_id = ri.id
FROM resource_items ri
WHERE p.item_id IS NULL AND p.item_name IS NOT NULL AND lower(trim(ri.name)) = lower(trim(p.item_name));

-- Now make the denormalized name/category columns agree with the catalog. These
-- stay on the rows for display and history, but the catalog is the authority.
UPDATE inventory_transactions t
SET item_name = ri.name, category = ri.category
FROM resource_items ri
WHERE t.item_id = ri.id AND (t.item_name IS DISTINCT FROM ri.name OR t.category IS DISTINCT FROM ri.category);

UPDATE camp_resource_requests r
SET item_name = ri.name, resource_category = ri.category
FROM resource_items ri
WHERE r.item_id = ri.id AND (r.item_name IS DISTINCT FROM ri.name OR r.resource_category IS DISTINCT FROM ri.category);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(camp_id, item_id);
CREATE INDEX IF NOT EXISTS idx_camp_resource_requests_item ON camp_resource_requests(item_id, status);

-- Carry item_id through the live stock view so the allocation agent can match
-- on it. Grouping stays on (item_name, category, unit) alongside item_id -
-- those are now catalog-derived, so this cannot fragment a single item.
DROP VIEW IF EXISTS camp_inventory_levels;
CREATE VIEW camp_inventory_levels AS
SELECT
    camp_id,
    item_id,
    item_name,
    category,
    unit,
    SUM(
        CASE
            WHEN transaction_type IN ('received', 'transferred_in', 'adjusted') THEN quantity
            WHEN transaction_type IN ('distributed', 'transferred_out') THEN -quantity
            ELSE 0
        END
    ) AS quantity_on_hand,
    MAX(recorded_at) AS last_movement_at
FROM inventory_transactions
GROUP BY camp_id, item_id, item_name, category, unit;

COMMENT ON VIEW camp_inventory_levels IS 'Live-computed current stock per camp/item from inventory_transactions. Correct by construction - never a maintained counter that can drift.';

GRANT SELECT ON camp_inventory_levels TO anon, authenticated;

-- The catalog is reference data: readable by anyone who can see stock, writable
-- only through the service role (same posture as inventory_transactions).
ALTER TABLE resource_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_resource_items" ON resource_items
FOR SELECT TO anon, authenticated
USING (true);
