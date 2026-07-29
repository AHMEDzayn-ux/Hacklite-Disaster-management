-- =====================================================
-- QUICK FIX: Add ds_division and nearby_landmark columns to camp_requests
-- Run this directly in Supabase SQL Editor
-- =====================================================

-- Method 1: Safe add columns (recommended)
-- This will only add the columns if they don't exist
DO $$
BEGIN
    -- Add ds_division column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'camp_requests' 
        AND column_name = 'ds_division'
    ) THEN
        ALTER TABLE camp_requests 
        ADD COLUMN ds_division VARCHAR(100);
        
        RAISE NOTICE 'Successfully added ds_division column to camp_requests table';
    ELSE
        RAISE NOTICE 'ds_division column already exists in camp_requests table';
    END IF;
    
    -- Add nearby_landmark column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'camp_requests' 
        AND column_name = 'nearby_landmark'
    ) THEN
        ALTER TABLE camp_requests 
        ADD COLUMN nearby_landmark TEXT;
        
        RAISE NOTICE 'Successfully added nearby_landmark column to camp_requests table';
    ELSE
        RAISE NOTICE 'nearby_landmark column already exists in camp_requests table';
    END IF;
END $$;

-- Method 2: Direct alter (if you're sure the columns don't exist)
-- Uncomment the lines below if you want to use this method instead:
-- ALTER TABLE camp_requests ADD COLUMN ds_division VARCHAR(100);
-- ALTER TABLE camp_requests ADD COLUMN nearby_landmark TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'camp_requests'
ORDER BY ordinal_position;
