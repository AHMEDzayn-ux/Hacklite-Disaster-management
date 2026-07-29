-- =====================================================
-- CAMP REQUESTS SYSTEM - SQL SETUP
-- Authentication required ONLY for admin actions
-- =====================================================

-- 1. Create camp_requests table for public submissions
CREATE TABLE IF NOT EXISTS camp_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Camp details
    camp_name VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    ds_division VARCHAR(100), -- DS Division / Area
    estimated_capacity INTEGER NOT NULL,
    
    -- Location details
    address TEXT NOT NULL,
    nearby_landmark TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Facilities and reason
    facilities_needed TEXT[], -- Array of needed facilities
    reason TEXT NOT NULL,
    
    -- Requester info
    requester_name VARCHAR(255) NOT NULL,
    requester_phone VARCHAR(20) NOT NULL,
    requester_email VARCHAR(255),
    additional_notes TEXT,
    
    -- Status management
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT
);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_camp_requests_status ON camp_requests(status);
CREATE INDEX IF NOT EXISTS idx_camp_requests_created_at ON camp_requests(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE camp_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for camp_requests

-- Public can INSERT new camp requests (no auth required)
CREATE POLICY "Anyone can submit camp requests"
ON camp_requests FOR INSERT
TO public
WITH CHECK (true);

-- Public can READ their own pending requests (optional - by phone match)
CREATE POLICY "Public can view pending requests"
ON camp_requests FOR SELECT
TO public
USING (true);

-- Authenticated admins can do everything
CREATE POLICY "Admins have full access to camp_requests"
ON camp_requests FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Update camps table RLS if needed
-- Ensure public can only read approved camps

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public can view approved camps" ON camps;
DROP POLICY IF EXISTS "Admins can manage camps" ON camps;

-- Public can only view approved camps
CREATE POLICY "Public can view approved camps"
ON camps FOR SELECT
TO public
USING (status = 'active' OR status = 'approved');

-- Authenticated users (admins) can do everything with camps
CREATE POLICY "Admins can manage camps"
ON camps FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Create function to convert approved request to camp
CREATE OR REPLACE FUNCTION approve_camp_request(request_id UUID, admin_id UUID)
RETURNS UUID AS $$
DECLARE
    new_camp_id UUID;
    req RECORD;
BEGIN
    -- Get the request details
    SELECT * INTO req FROM camp_requests WHERE id = request_id;
    
    IF req IS NULL THEN
        RAISE EXCEPTION 'Camp request not found';
    END IF;
    
    IF req.status != 'pending' THEN
        RAISE EXCEPTION 'Request has already been processed';
    END IF;
    
    -- Create new camp from request
    INSERT INTO camps (
        name,
        district,
        location,
        capacity,
        current_occupancy,
        status,
        contact_name,
        contact_phone,
        facilities,
        created_at
    ) VALUES (
        req.camp_name,
        req.district,
        jsonb_build_object(
            'address', req.address,
            'lat', req.latitude,
            'lng', req.longitude
        ),
        req.estimated_capacity,
        0,
        'active',
        req.requester_name,
        req.requester_phone,
        req.facilities_needed,
        NOW()
    ) RETURNING id INTO new_camp_id;
    
    -- Update request status
    UPDATE camp_requests 
    SET 
        status = 'approved',
        reviewed_at = NOW(),
        reviewed_by = admin_id
    WHERE id = request_id;
    
    RETURN new_camp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to reject camp request
CREATE OR REPLACE FUNCTION reject_camp_request(request_id UUID, admin_id UUID, reason TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE camp_requests 
    SET 
        status = 'rejected',
        reviewed_at = NOW(),
        reviewed_by = admin_id,
        rejection_reason = reason
    WHERE id = request_id AND status = 'pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- IMPORTANT: Run this in Supabase SQL Editor
-- This creates the camp_requests table with proper RLS
-- =====================================================
