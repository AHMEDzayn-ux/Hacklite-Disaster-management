-- Quick setup script to add resolution fields to disasters table
-- Run this in your Supabase SQL Editor if the migration hasn't been applied

-- Add resolution tracking columns
ALTER TABLE disasters 
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_by TEXT,
ADD COLUMN IF NOT EXISTS responder_notes TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_disasters_status ON disasters(status);
CREATE INDEX IF NOT EXISTS idx_disasters_resolved_at ON disasters(resolved_at) WHERE resolved_at IS NOT NULL;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'disasters' 
  AND column_name IN ('resolved_at', 'resolved_by', 'responder_notes')
ORDER BY column_name;
