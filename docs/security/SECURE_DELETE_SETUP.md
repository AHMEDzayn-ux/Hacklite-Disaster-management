# Secure Admin Delete - Deployment Guide

## 🔐 Security Architecture Overview

This implementation follows the **safest approach** for admin-only deletion using Supabase Edge Functions.

### How It Works

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   Admin UI      │────►│  Edge Function      │────►│   Supabase DB   │
│  (Frontend)     │     │  (Server-side)      │     │                 │
│                 │     │                     │     │                 │
│ • JWT Token     │     │ • Verify JWT        │     │ • RLS Policies  │
│ • No service    │     │ • Check admin_users │     │ • Audit logs    │
│   role key      │     │ • Use service key   │     │ • Delete record │
└─────────────────┘     └─────────────────────┘     └─────────────────┘
```

### Security Features

✅ **Service role key NEVER in frontend** - Only in Edge Function environment  
✅ **Server-side admin verification** - Checked against `admin_users` table  
✅ **Complete audit trail** - Every deletion logged with snapshot  
✅ **Role-based access** - Super admins for sensitive tables  
✅ **Explicit confirmation** - Type "DELETE" + reason required

---

## 📋 Step 1: Run Database Migrations

Execute the migration in your Supabase SQL Editor:

```sql
-- Run the file: supabase/migrations/001_admin_audit_tables.sql
```

This creates:

- `admin_users` table (whitelist of authorized admins)
- `audit_logs` table (immutable deletion records)
- Helper functions for admin verification

---

## 📋 Step 2: Add Initial Admin User

In Supabase SQL Editor, add your first super admin:

```sql
-- First, get your user ID from auth.users
SELECT id, email FROM auth.users WHERE email = 'your-admin@email.com';

-- Then insert into admin_users
INSERT INTO admin_users (user_id, email, role, is_active)
VALUES (
    'your-user-id-from-above',  -- Replace with actual UUID
    'your-admin@email.com',      -- Replace with actual email
    'super_admin',               -- 'super_admin' or 'admin'
    true
);
```

### Admin Roles

| Role          | Permissions                                                                    |
| ------------- | ------------------------------------------------------------------------------ |
| `admin`       | Delete from: `camp_requests`, `missing_persons`, `disasters`, `animal_rescues` |
| `super_admin` | All above + Delete from: `camps` (approved relief camps)                       |

---

## 📋 Step 3: Deploy Edge Function

### Option A: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not installed):

   ```powershell
   # Windows (using scoop)
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase

   # Or using npm
   npm install -g supabase
   ```

2. **Login to Supabase**:

   ```powershell
   supabase login
   ```

3. **Link your project**:

   ```powershell
   cd Disaster-management
   supabase link --project-ref YOUR_PROJECT_REF
   ```

   Find your project ref in Supabase Dashboard → Settings → General → Reference ID

4. **Deploy the Edge Function**:

   ```powershell
   supabase functions deploy secure-admin-delete
   ```

5. **Set environment variables** (automatic - uses your project's service role key)

### Option B: Manual Deployment via Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click **New Function**
3. Name it: `secure-admin-delete`
4. Copy the contents from `supabase/functions/secure-admin-delete/index.ts`
5. Deploy

---

## 📋 Step 4: Verify Edge Function URL

After deployment, verify the function URL format:

```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/secure-admin-delete
```

This is automatically constructed in the frontend using `VITE_SUPABASE_URL`.

---

## 📋 Step 5: Test the Setup

### Test 1: Verify Admin Check

```javascript
// In browser console (while logged in as admin)
import { checkIsAdmin } from "./services/adminService";
const status = await checkIsAdmin();
console.log(status); // Should show { isAdmin: true, role: 'super_admin' }
```

### Test 2: Test Delete (on non-critical data)

1. Create a test camp request
2. Navigate to `/admin/review-requests`
3. Click Delete on the test request
4. Type DELETE and provide reason
5. Check `audit_logs` table for the record

### Test 3: Verify Audit Log

```sql
SELECT * FROM audit_logs ORDER BY performed_at DESC LIMIT 5;
```

---

## 🔒 Security Verification Checklist

Before going to production, verify:

- [ ] `admin_users` table has correct users with proper roles
- [ ] No `DELETE` policies for `anon` role on any sensitive table
- [ ] Edge function is deployed and accessible
- [ ] Service role key is NOT in any frontend environment file
- [ ] `audit_logs` table has NO delete policy (immutable)
- [ ] Test deletion creates audit log entry
- [ ] Non-admin users cannot access delete buttons
- [ ] Non-admin API calls return 403 Forbidden

---

## 📁 Files Created

```
supabase/
├── migrations/
│   └── 001_admin_audit_tables.sql    # Database schema
└── functions/
    └── secure-admin-delete/
        └── index.ts                   # Edge function

src/
├── services/
│   └── adminService.js               # Frontend admin API
├── components/
│   └── shared/
│       └── DeleteConfirmModal.jsx    # Confirmation dialog
└── pages/
    ├── AdminReviewRequests.jsx       # Updated with delete
    └── AdminManageCamps.jsx          # New camp management
```

---

## 🚨 Troubleshooting

### "Unauthorized: You are not an authorized admin"

- User is not in `admin_users` table
- User's `is_active` is false
- Solution: Add user to `admin_users` table

### "Deleting from camps requires super_admin role"

- User has `admin` role, not `super_admin`
- Solution: Update role in `admin_users` table

### Edge Function 500 Error

- Check Supabase Dashboard → Edge Functions → Logs
- Verify service role key is set correctly
- Check table names match exactly

### CORS Errors

- Edge function includes CORS headers
- Verify `Access-Control-Allow-Origin` in response

---

## 📞 Emergency: Recover Deleted Data

All deleted records are stored in `audit_logs.record_snapshot`:

```sql
-- Find deleted record
SELECT
    id,
    admin_email,
    table_name,
    record_id,
    record_snapshot,
    reason,
    performed_at
FROM audit_logs
WHERE table_name = 'camps'
ORDER BY performed_at DESC;

-- Restore from snapshot (example for camps)
INSERT INTO camps
SELECT * FROM jsonb_populate_record(null::camps,
    (SELECT record_snapshot FROM audit_logs WHERE record_id = 'uuid-of-deleted-record')
);
```

---

## ✅ Summary

| Component     | Security Level | Notes                                    |
| ------------- | -------------- | ---------------------------------------- |
| Frontend      | ✅ Safe        | No service key, only anon key            |
| Edge Function | ✅ Safe        | Service key only server-side             |
| Database      | ✅ Safe        | RLS prevents public deletes              |
| Audit         | ✅ Safe        | Immutable logs, no delete policy         |
| UI            | ✅ Safe        | Admin-only routes, confirmation required |
