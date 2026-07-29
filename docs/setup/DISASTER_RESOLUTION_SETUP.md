# Disaster Resolution Feature - Setup Guide

## Database Changes Required

To enable the disaster resolution feature, you need to add three new columns to the `disasters` table in Supabase.

### Option 1: Automatic Migration (Recommended)

If you're using Supabase migrations, the migration file has been created at:

```
supabase/migrations/20260102000000_add_disaster_resolution_fields.sql
```

Run the migration:

```bash
supabase db push
```

### Option 2: Manual SQL Execution

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the SQL script: `add-disaster-resolution-fields.sql`

Or copy and paste this SQL:

```sql
-- Add resolution tracking columns
ALTER TABLE disasters
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_by TEXT,
ADD COLUMN IF NOT EXISTS responder_notes TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_disasters_status ON disasters(status);
CREATE INDEX IF NOT EXISTS idx_disasters_resolved_at ON disasters(resolved_at) WHERE resolved_at IS NOT NULL;
```

### What's New

The following columns are added to the `disasters` table:

- **resolved_at** (TIMESTAMP): When the disaster was marked as resolved
- **resolved_by** (TEXT): Name of the team/organization/person who resolved it
- **responder_notes** (TEXT): Additional notes about the resolution

### Features Enabled

After running the migration, responders can:

1. View disaster details with all fields (people affected, casualties, area size, reporter contact)
2. Click "Mark as Resolved" button on active disasters
3. Enter their name/organization and resolution notes
4. The system will automatically:
   - Update the status to "Resolved"
   - Record the resolution timestamp
   - Store who resolved it
   - Save any notes provided
   - Update the UI to show the resolved status

### Verification

To verify the columns were added successfully, run:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'disasters'
  AND column_name IN ('resolved_at', 'resolved_by', 'responder_notes')
ORDER BY column_name;
```

You should see all three columns listed.
