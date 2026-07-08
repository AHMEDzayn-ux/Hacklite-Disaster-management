-- Baseline migration: the donations table was documented in
-- src/config/donations-schema.sql (a "run this manually in the SQL Editor"
-- file) but never actually tracked as a migration, and turned out not to
-- exist yet on the live database when this migration set was first applied.
-- Captured here verbatim so schema history is reproducible going forward.
-- The public INSERT/UPDATE policies created here are intentionally dropped
-- again by 20260709000009_lock_down_donations_rls.sql in the same batch.

CREATE TABLE IF NOT EXISTS donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  donor_name TEXT,
  donor_email TEXT NOT NULL,
  donor_phone TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,

  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'USD' NOT NULL,
  stripe_payment_id TEXT UNIQUE,
  stripe_payment_status TEXT NOT NULL DEFAULT 'pending',

  donation_purpose TEXT DEFAULT 'General Relief',
  purpose_category TEXT DEFAULT 'general',
  purpose_reference_id UUID,

  message TEXT,
  admin_notes TEXT,

  distribution_status TEXT DEFAULT 'pending',
  distributed_at TIMESTAMP,
  distributed_to TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(stripe_payment_status);
CREATE INDEX IF NOT EXISTS idx_donations_created ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_purpose ON donations(donation_purpose);
CREATE INDEX IF NOT EXISTS idx_donations_category ON donations(purpose_category);
CREATE INDEX IF NOT EXISTS idx_donations_email ON donations(donor_email);

CREATE OR REPLACE FUNCTION get_total_donations()
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM donations
  WHERE stripe_payment_status = 'succeeded';
$$ LANGUAGE SQL STABLE;

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

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_donations_updated_at ON donations;
CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON donations;
CREATE POLICY "Allow public read access" ON donations
  FOR SELECT
  USING (true);

-- Intentionally created here, then dropped by 20260709000009 in the same
-- batch - kept for historical/documentation fidelity with the original
-- donations-schema.sql rather than silently omitted.
DROP POLICY IF EXISTS "Allow public insert" ON donations;
CREATE POLICY "Allow public insert" ON donations
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow status updates" ON donations;
CREATE POLICY "Allow status updates" ON donations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
