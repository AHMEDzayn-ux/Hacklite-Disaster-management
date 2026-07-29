# Supabase Setup Guide

## ✅ Completed Steps

1. **Supabase Client Installed**

   ```bash
   npm install @supabase/supabase-js
   ```

2. **Configuration Files Created**
   - `/src/config/supabase.js` - Supabase client initialization
   - `/src/services/supabaseService.js` - Service layer for database operations and storage
   - `/src/store/supabaseStore.js` - Zustand stores integrated with Supabase
   - `/src/store/index.js` - Export Supabase stores

## 🔧 Next Steps (Do These Now)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account (FREE - no credit card required!)
3. Click "New Project"
4. Fill in:
   - **Name**: disaster-management
   - **Database Password**: (choose a strong password - save it!)
   - **Region**: Southeast Asia (Singapore) or closest to you
5. Click "Create new project"
6. Wait 2-3 minutes for project to be ready

### 2. Get Your Supabase Credentials

1. In your project dashboard, click "Settings" (gear icon)
2. Click "API" in the sidebar
3. Copy these values:
   - **Project URL** (looks like: https://xxxxx.supabase.co)
   - **anon/public key** (looks like: eyJhbG...)

### 3. Update .env File

Replace the placeholder values in `.env`:

```env
VITE_SUPABASE_URL=your_actual_project_url
VITE_SUPABASE_ANON_KEY=your_actual_anon_key
```

### 4. Create Database Tables

1. In Supabase dashboard, click "SQL Editor"
2. Click "New query"
3. Paste and run this SQL:

```sql
-- Missing Persons Table
CREATE TABLE missing_persons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  description TEXT,
  last_seen_location JSONB NOT NULL,
  last_seen_date TIMESTAMP NOT NULL,
  reporter_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  additional_info TEXT,
  photo TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Disaster Reports Table
CREATE TABLE disasters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  disaster_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  people_affected TEXT,
  casualties TEXT,
  needs JSONB,
  location JSONB NOT NULL,
  occurred_date TIMESTAMP,
  area_size TEXT,
  reporter_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  photo TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Animal Rescues Table
CREATE TABLE animal_rescues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_type TEXT NOT NULL,
  breed TEXT,
  description TEXT NOT NULL,
  condition TEXT NOT NULL,
  is_dangerous BOOLEAN DEFAULT FALSE,
  location JSONB NOT NULL,
  reporter_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  photo TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Camps Table
CREATE TABLE camps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  current_occupancy INTEGER DEFAULT 0,
  location JSONB NOT NULL,
  contact_person TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  facilities JSONB,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE missing_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE disasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_rescues ENABLE ROW LEVEL SECURITY;
ALTER TABLE camps ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (for reporting)
CREATE POLICY "Anyone can view missing persons" ON missing_persons FOR SELECT USING (true);
CREATE POLICY "Anyone can insert missing persons" ON missing_persons FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update missing persons" ON missing_persons FOR UPDATE USING (true);

CREATE POLICY "Anyone can view disasters" ON disasters FOR SELECT USING (true);
CREATE POLICY "Anyone can insert disasters" ON disasters FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update disasters" ON disasters FOR UPDATE USING (true);

CREATE POLICY "Anyone can view animal rescues" ON animal_rescues FOR SELECT USING (true);
CREATE POLICY "Anyone can insert animal rescues" ON animal_rescues FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update animal rescues" ON animal_rescues FOR UPDATE USING (true);

CREATE POLICY "Anyone can view camps" ON camps FOR SELECT USING (true);
CREATE POLICY "Anyone can insert camps" ON camps FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update camps" ON camps FOR UPDATE USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE missing_persons;
ALTER PUBLICATION supabase_realtime ADD TABLE disasters;
ALTER PUBLICATION supabase_realtime ADD TABLE animal_rescues;
ALTER PUBLICATION supabase_realtime ADD TABLE camps;
```

### 5. Create Storage Bucket for Photos

1. In Supabase dashboard, click "Storage"
2. Click "Create a new bucket"
3. Name it: **photos**
4. Make it **Public** (check the box)
5. Click "Create bucket"
6. Click on the "photos" bucket
7. Click "Policies" tab
8. Add these policies:
   - Click "New Policy"
   - Select "For full customization"
   - Name: "Public Upload"
   - Target roles: **public**
   - Policy definition: **ALL**
   - Click "Review" then "Save"

### 6. Update Forms to Use Supabase

The forms need to be updated from the Firebase branch. Since they're not on main yet, you'll need to:

**Option A: Manually update each form** (copy from Firebase branch)

- Update `MissingPersonForm.jsx`, `DisasterReportForm.jsx`, `AnimalRescueForm.jsx`
- Add `photoFile` state
- Add photo upload logic using `uploadPhoto` from `supabaseService`

**Option B: Cherry-pick from firebase-implementation branch**

```bash
git checkout firebase-implementation -- src/components/MissingPersonForm.jsx
git checkout firebase-implementation -- src/components/DisasterReportForm.jsx
git checkout firebase-implementation -- src/components/AnimalRescueForm.jsx
```

Then update the imports in all three files:

```javascript
import { uploadPhoto } from "../services/supabaseService";

// In onSubmit, change:
const uploadResult = await uploadPhoto(photoFile, "photos", "missing-persons");
```

### 7. Update List Components

Make sure list components subscribe to Supabase:

- `MissingPersonsList.jsx`
- `DisasterReportsList.jsx`
- `AnimalRescueList.jsx`
- `CampsList.jsx`

They should call `subscribeToX()` in useEffect.

### 8. Test the App

```bash
npm run dev
```

1. Fill out a form (use Autofill Test Data button)
2. Add a small image
3. Submit
4. Check if it appears in:
   - The respond dashboard
   - Supabase dashboard → Table Editor

## 🎉 Benefits of Supabase

- ✅ **FREE** - No credit card required
- ✅ **Real-time** - Automatic updates across all users
- ✅ **Storage** - Built-in file storage
- ✅ **No billing issues** - Generous free tier
- ✅ **PostgreSQL** - Powerful relational database
- ✅ **Row Level Security** - Fine-grained access control
- ✅ **Easy setup** - No Firebase Blaze plan problems!

## � SMS Reporting System Setup

The SMS reporting system allows users to submit disaster reports, missing person reports, and animal rescue reports via SMS. The system uses AI (Google Gemini) to parse free-text messages and automatically categorize them.

### SMS Webhook URL

After deploying the edge function, your SMS gateway webhook URL will be:

```
https://<your-project-ref>.supabase.co/functions/v1/sms-report
```

Replace `<your-project-ref>` with your Supabase project reference (found in your project URL).

### 1. Run the SMS Migration

Run this migration to add SMS tracking columns:

```sql
-- Add to SQL Editor and run
ALTER TABLE disasters ADD COLUMN IF NOT EXISTS reported_via_sms BOOLEAN DEFAULT FALSE;
ALTER TABLE disasters ADD COLUMN IF NOT EXISTS sms_sender_phone TEXT;

ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS reported_via_sms BOOLEAN DEFAULT FALSE;
ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS sms_sender_phone TEXT;

ALTER TABLE animal_rescues ADD COLUMN IF NOT EXISTS reported_via_sms BOOLEAN DEFAULT FALSE;
ALTER TABLE animal_rescues ADD COLUMN IF NOT EXISTS sms_sender_phone TEXT;
```

Or run the migration file: `supabase/migrations/20260101000000_add_reported_via_sms_column.sql`

### 2. Set Up Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### 3. Configure Edge Function Secrets

In your Supabase project dashboard:

1. Go to **Project Settings** → **Edge Functions**
2. Click **Manage Secrets**
3. Add a new secret:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key from step 2

### 4. Deploy the Edge Function

Using Supabase CLI:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Deploy the SMS function
supabase functions deploy sms-report
```

### 5. Configure Android SMS Gateway

In your Android SMS Gateway app, set up the webhook:

1. **Webhook URL**: `https://<your-project-ref>.supabase.co/functions/v1/sms-report`
2. **Method**: POST
3. **Content-Type**: application/json
4. **Payload Format**: The function accepts these field names:
   ```json
   {
     "from": "+1234567890", // or "phone" or "sender"
     "message": "SMS text...", // or "text" or "body"
     "sentStamp": 1704067200000,
     "receivedStamp": 1704067200000
   }
   ```

### 6. Test the SMS System

Send a test SMS to your gateway number:

**Example messages:**

1. **Disaster Report**:

   ```
   Flood in Kochi near MG Road. Water level rising fast. About 50 families affected. Need rescue boats. My name is Rahul, contact 9876543210
   ```

2. **Missing Person**:

   ```
   My father John aged 65 is missing since yesterday from Trivandrum Central. He has gray hair and was wearing a blue shirt. Please help. Contact Mary 9123456789
   ```

3. **Animal Rescue**:
   ```
   Dog stuck on rooftop at Ernakulam South. Building is flooded. Dog looks injured. Please send help. Arun 8765432109
   ```

### 7. Response Format

The webhook returns a JSON response that includes a `reply` field for sending confirmation SMS back:

```json
{
  "success": true,
  "category": "disaster",
  "confidence": 0.95,
  "record_id": "uuid-here",
  "table": "disasters",
  "reply": "Your disaster report has been received. Reference ID: ABC12345. Our team will respond soon.",
  "extracted_data": { ... }
}
```

Configure your Android Gateway to send the `reply` message back to the sender.

### 8. Error Handling

If the AI cannot parse the message, the response will include an error and a helpful reply:

```json
{
  "error": "Could not parse message",
  "reply": "We could not understand your message. Please try again with more details about the emergency, location, and your name."
}
```

### 9. Optional: SMS Processing Logs Table

Create this table to track SMS processing for debugging:

```sql
CREATE TABLE sms_processing_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_phone TEXT NOT NULL,
  raw_message TEXT NOT NULL,
  detected_category TEXT,
  processing_success BOOLEAN DEFAULT FALSE,
  created_record_id UUID,
  error_message TEXT,
  processed_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sms_processing_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can access logs
CREATE POLICY "Service role can manage logs" ON sms_processing_logs
  FOR ALL USING (auth.role() = 'service_role');
```

### SMS System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User's Phone  │────▶│  Android Gateway │────▶│  Supabase Edge  │
│   (SMS)         │     │  App             │     │  Function       │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌─────────────────────────────────┼─────────────────────────────────┐
                        │                                 │                                 │
                        ▼                                 ▼                                 ▼
               ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
               │  Gemini AI      │              │  OpenStreetMap  │              │  Supabase DB    │
               │  (Parse SMS)    │              │  (Geocoding)    │              │  (Store Report) │
               └─────────────────┘              └─────────────────┘              └─────────────────┘
                        │                                                                  │
                        └────────────────────────────────┬─────────────────────────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │ Confirmation SMS │
                                                │ (via Gateway)    │
                                                └─────────────────┘
```

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Google Gemini API](https://ai.google.dev/docs)
- [OpenStreetMap Nominatim](https://nominatim.org/release-docs/latest/api/Search/)
