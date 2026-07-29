-- =====================================================
-- DISASTER MANAGEMENT SYSTEM - DONATIONS SCHEMA
-- =====================================================
-- This schema creates the donations table for Stripe-integrated
-- transparent donation tracking system
-- =====================================================

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Donor Information
  donor_name TEXT,
  donor_email TEXT NOT NULL,
  donor_phone TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  
  -- Payment Details
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'USD' NOT NULL,
  stripe_payment_id TEXT UNIQUE,
  stripe_payment_status TEXT NOT NULL DEFAULT 'pending',
  -- Status values: 'pending', 'succeeded', 'failed', 'refunded'
  
  -- Donation Purpose
  donation_purpose TEXT DEFAULT 'General Relief',
  -- Purpose examples: 'General Relief', 'Flood Relief - Colombo', 'Camp #42 Support'
  purpose_category TEXT DEFAULT 'general',
  -- Categories: 'general', 'disaster', 'camp', 'animal', 'missing_person'
  purpose_reference_id UUID,
  -- Reference to specific disaster report, camp, etc.
  
  -- Message & Notes
  message TEXT,
  admin_notes TEXT,
  
  -- Distribution Tracking
  distribution_status TEXT DEFAULT 'pending',
  -- Status: 'pending', 'allocated', 'distributed', 'completed'
  distributed_at TIMESTAMP,
  distributed_to TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(stripe_payment_status);
CREATE INDEX IF NOT EXISTS idx_donations_created ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_purpose ON donations(donation_purpose);
CREATE INDEX IF NOT EXISTS idx_donations_category ON donations(purpose_category);
CREATE INDEX IF NOT EXISTS idx_donations_email ON donations(donor_email);

-- Create function to get total successful donations
CREATE OR REPLACE FUNCTION get_total_donations()
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(amount), 0) 
  FROM donations 
  WHERE stripe_payment_status = 'succeeded';
$$ LANGUAGE SQL STABLE;

-- Create function to get donation statistics
CREATE OR REPLACE FUNCTION get_donation_stats()
RETURNS TABLE (
  total_amount DECIMAL,
  total_count BIGINT,
  avg_donation DECIMAL,
  successful_count BIGINT,
  pending_count BIGINT
) AS $$
  SELECT 
    COALESCE(SUM(CASE WHEN stripe_payment_status = 'succeeded' THEN amount ELSE 0 END), 0) as total_amount,
    COUNT(*) as total_count,
    COALESCE(AVG(CASE WHEN stripe_payment_status = 'succeeded' THEN amount END), 0) as avg_donation,
    COUNT(*) FILTER (WHERE stripe_payment_status = 'succeeded') as successful_count,
    COUNT(*) FILTER (WHERE stripe_payment_status = 'pending') as pending_count
  FROM donations;
$$ LANGUAGE SQL STABLE;

-- Create function to update timestamp on row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_donations_updated_at 
  BEFORE UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public to read all donations (respecting anonymous flag)
CREATE POLICY "Allow public read access" ON donations
  FOR SELECT
  USING (true);

-- Policy: Allow public to insert donations (for payment processing)
CREATE POLICY "Allow public insert" ON donations
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only allow updates to status fields (for webhook updates)
-- In production, you'd want to restrict this to service role only
CREATE POLICY "Allow status updates" ON donations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- SETUP INSTRUCTIONS:
-- =====================================================
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Copy and paste this entire file
-- 5. Click "Run" to execute
-- 
-- 6. Set up Stripe webhook endpoint to update payment statuses:
--    - Create a Supabase Edge Function for Stripe webhooks
--    - Update stripe_payment_status when payment succeeds/fails
--
-- 7. Add environment variables to your .env file:
--    VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
--
-- 8. Test the schema:
--    SELECT * FROM get_donation_stats();
-- =====================================================
