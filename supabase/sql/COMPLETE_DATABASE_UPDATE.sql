-- ========================================================================
-- COMPLETE DATABASE UPDATE - Run this in Supabase SQL Editor
-- ========================================================================
-- This file combines all necessary database updates for the system
-- Run each section in order
-- ========================================================================

-- ========================================================================
-- SECTION 1: Missing Person Found Tracking
-- ========================================================================
ALTER TABLE missing_persons 
ADD COLUMN IF NOT EXISTS found_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE missing_persons 
ADD COLUMN IF NOT EXISTS found_by_contact TEXT;

ALTER TABLE missing_persons 
ADD COLUMN IF NOT EXISTS found_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_missing_persons_found_at ON missing_persons(found_at);
CREATE INDEX IF NOT EXISTS idx_missing_persons_status_found ON missing_persons(status, found_at);

COMMENT ON COLUMN missing_persons.found_at IS 'Timestamp when person was marked as found by a responder';
COMMENT ON COLUMN missing_persons.found_by_contact IS 'Contact phone number of person who found them';
COMMENT ON COLUMN missing_persons.found_notes IS 'Additional notes about how/where person was found';

-- ========================================================================
-- SECTION 2: Animal Rescue Found Tracking  
-- ========================================================================
ALTER TABLE animal_rescues 
ADD COLUMN IF NOT EXISTS found_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE animal_rescues 
ADD COLUMN IF NOT EXISTS found_by_contact TEXT;

ALTER TABLE animal_rescues 
ADD COLUMN IF NOT EXISTS found_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_animal_rescues_found_at ON animal_rescues(found_at);
CREATE INDEX IF NOT EXISTS idx_animal_rescues_status_found ON animal_rescues(status, found_at);

COMMENT ON COLUMN animal_rescues.found_at IS 'Timestamp when animal was marked as rescued';
COMMENT ON COLUMN animal_rescues.found_by_contact IS 'Contact phone number of person who rescued the animal';
COMMENT ON COLUMN animal_rescues.found_notes IS 'Additional notes about the rescue';

-- ========================================================================
-- SECTION 3: Fix Animal Rescue Status Field
-- ========================================================================
ALTER TABLE animal_rescues 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- Update existing records based on found_at
UPDATE animal_rescues 
SET status = CASE 
    WHEN found_at IS NOT NULL THEN 'Resolved'
    ELSE 'Active'
END
WHERE status IS NULL OR status NOT IN ('Active', 'Resolved');

-- Add constraint for valid status values
ALTER TABLE animal_rescues 
DROP CONSTRAINT IF EXISTS animal_rescues_status_check;

ALTER TABLE animal_rescues 
ADD CONSTRAINT animal_rescues_status_check 
CHECK (status IN ('Active', 'Resolved'));

-- Set default for new records
ALTER TABLE animal_rescues 
ALTER COLUMN status SET DEFAULT 'Active';

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_animal_rescues_status ON animal_rescues(status);

COMMENT ON COLUMN animal_rescues.status IS 'Current status: Active (needs rescue) or Resolved (rescued)';

-- ========================================================================
-- SECTION 4: Fix Missing Person Status Field
-- ========================================================================
ALTER TABLE missing_persons 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- Update existing records based on found_at
UPDATE missing_persons 
SET status = CASE 
    WHEN found_at IS NOT NULL THEN 'Resolved'
    ELSE 'Active'
END
WHERE status IS NULL OR status NOT IN ('Active', 'Resolved');

-- Add constraint for valid status values
ALTER TABLE missing_persons 
DROP CONSTRAINT IF EXISTS missing_persons_status_check;

ALTER TABLE missing_persons 
ADD CONSTRAINT missing_persons_status_check 
CHECK (status IN ('Active', 'Resolved'));

-- Set default for new records
ALTER TABLE missing_persons 
ALTER COLUMN status SET DEFAULT 'Active';

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_missing_persons_status ON missing_persons(status);

COMMENT ON COLUMN missing_persons.status IS 'Current status: Active (still missing) or Resolved (found)';

-- ========================================================================
-- SECTION 5: Update Camp Requests for New Public Form
-- ========================================================================

-- Add urgency_level column
ALTER TABLE camp_requests 
ADD COLUMN IF NOT EXISTS urgency_level TEXT DEFAULT 'medium' 
CHECK (urgency_level IN ('low', 'medium', 'high', 'critical'));

-- Add special_needs column
ALTER TABLE camp_requests 
ADD COLUMN IF NOT EXISTS special_needs TEXT;

-- Add village_area column
ALTER TABLE camp_requests 
ADD COLUMN IF NOT EXISTS village_area TEXT;

-- Create index for urgency filtering
CREATE INDEX IF NOT EXISTS idx_camp_requests_urgency ON camp_requests(urgency_level);

-- Add comments for documentation
COMMENT ON COLUMN camp_requests.urgency_level IS 'Urgency: low (1-2 days), medium (24h), high (12h), critical (immediate)';
COMMENT ON COLUMN camp_requests.special_needs IS 'Special circumstances: children, elderly, disabled, injured, pregnant women, medical conditions';
COMMENT ON COLUMN camp_requests.village_area IS 'Village or area name where camp is needed';

-- Update existing records to have default urgency
UPDATE camp_requests 
SET urgency_level = 'medium' 
WHERE urgency_level IS NULL;

-- ========================================================================
-- SECTION 6: Add Missing Camps Table Fields
-- ========================================================================

-- Add district as separate column for easy filtering
ALTER TABLE camps 
ADD COLUMN IF NOT EXISTS district TEXT;

-- Add address as separate column for easy access
ALTER TABLE camps 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add ds_division for administrative division
ALTER TABLE camps 
ADD COLUMN IF NOT EXISTS ds_division TEXT;

-- Add latitude and longitude as separate fields for easier querying
ALTER TABLE camps 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

ALTER TABLE camps 
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add managed_by field for camp manager name
ALTER TABLE camps 
ADD COLUMN IF NOT EXISTS managed_by TEXT;

-- Add needs array for tracking what supplies are needed
ALTER TABLE camps 
ADD COLUMN IF NOT EXISTS needs TEXT[];

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_camps_district ON camps(district);
CREATE INDEX IF NOT EXISTS idx_camps_status ON camps(status);
CREATE INDEX IF NOT EXISTS idx_camps_type ON camps(type);
CREATE INDEX IF NOT EXISTS idx_camps_location ON camps USING GIST ((location::jsonb));

-- Add comments for documentation
COMMENT ON COLUMN camps.district IS 'Sri Lankan district where camp is located';
COMMENT ON COLUMN camps.address IS 'Full address of the camp (also stored in location JSONB)';
COMMENT ON COLUMN camps.ds_division IS 'Divisional Secretariat division';
COMMENT ON COLUMN camps.latitude IS 'GPS latitude coordinate (also in location JSONB)';
COMMENT ON COLUMN camps.longitude IS 'GPS longitude coordinate (also in location JSONB)';
COMMENT ON COLUMN camps.managed_by IS 'Name of camp manager/person in charge';
COMMENT ON COLUMN camps.needs IS 'Array of needed supplies/resources';

-- Update existing records to extract district and address from location JSONB
UPDATE camps 
SET 
    district = location->>'district',
    address = location->>'address',
    latitude = (location->>'lat')::DECIMAL(10, 8),
    longitude = (location->>'lng')::DECIMAL(11, 8)
WHERE location IS NOT NULL;

-- Update managed_by from contact_person if null
UPDATE camps 
SET managed_by = contact_person
WHERE managed_by IS NULL AND contact_person IS NOT NULL;

-- ========================================================================
-- VERIFICATION QUERIES - Run these to verify the updates
-- ========================================================================

-- Verify missing_persons columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'missing_persons' 
AND column_name IN ('status', 'found_at', 'found_by_contact', 'found_notes')
ORDER BY ordinal_position;

-- Verify animal_rescues columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'animal_rescues' 
AND column_name IN ('status', 'found_at', 'found_by_contact', 'found_notes')
ORDER BY ordinal_position;

-- Verify camp_requests columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'camp_requests' 
AND column_name IN ('urgency_level', 'special_needs', 'village_area')
ORDER BY ordinal_position;

-- Verify camps columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'camps' 
AND column_name IN ('district', 'address', 'latitude', 'longitude', 'managed_by', 'needs')
ORDER BY ordinal_position;

-- Check status distribution
SELECT 'missing_persons' as table_name, status, COUNT(*) as count
FROM missing_persons 
GROUP BY status
UNION ALL
SELECT 'animal_rescues' as table_name, status, COUNT(*) as count
FROM animal_rescues 
GROUP BY status
ORDER BY table_name, status;

-- ========================================================================
-- COMPLETED
-- ========================================================================
-- All database updates applied successfully!
-- You can now:
-- 1. Submit animal rescue and missing person reports
-- 2. Mark them as found/rescued with notes
-- 3. Submit camp requests with urgency levels and special needs
-- 4. Review camp requests in admin portal with full details
-- ========================================================================
