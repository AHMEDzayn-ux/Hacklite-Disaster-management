# Multi-Agent AI System - Setup & Deployment Guide

This documents everything added by the multi-agent AI decision-support upgrade: the Situation Awareness, Incident Prioritization, Resource Allocation, Route Optimization, and Volunteer Assignment agents; the Smart Relief Inventory system; and the Stripe donation fix. **None of this could be run/deployed from the environment that built it** (no Supabase CLI or project credentials were available there) - every step below needs to be run by someone with access to the actual Supabase project and repo secrets.

## 0. Prerequisites

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
```

Before anything else, snapshot the current live schema as a proper baseline migration (the existing `supabase/migrations/*.sql` files are all incremental `ALTER TABLE`s with no `CREATE TABLE` baseline, so the schema isn't fully reproducible from migration history alone):

```bash
supabase db pull
```

Commit the generated `supabase/migrations/<timestamp>_remote_schema.sql` file unedited.

Also run `npm install` at the repo root - a new dependency (`leaflet.heat`, for the Command Dashboard's disaster density heatmap) was added to `package.json`.

## 1. Apply the new migrations

Nine new migration files were added under `supabase/migrations/`, all dated `20260709*`, in this order:

1. `20260709000001_add_district_and_damage_index.sql` - adds `district`/`damage_index`/`possible_duplicate_of`/`duplicate_status` to `disasters`, `district` to `missing_persons`/`animal_rescues`.
2. `20260709000002_add_agent_observability.sql` - `agent_runs` table.
3. `20260709000003_add_situation_awareness_tables.sql` - `situation_reports`.
4. `20260709000004_add_incident_priority_queue.sql` - `incident_priority_queue`.
5. `20260709000005_add_inventory_system.sql` - `camps.inventory_access_code`/`inventory_thresholds`, `donations.donation_type`, `inventory_transactions`, `camp_inventory_levels` view.
6. `20260709000006_add_resource_allocation_tables.sql` - `allocation_plans`.
7. `20260709000007_add_volunteers_system.sql` - `volunteers`, `volunteer_assignments`.
8. `20260709000008_add_route_plans.sql` - `route_plans`.
9. `20260709000009_lock_down_donations_rls.sql` - **closes a real security hole**: drops the public INSERT/UPDATE policies on `donations` that let any anonymous client fake a "succeeded" donation.

Apply them:

```bash
supabase db push
```

(Or paste each file into the Supabase SQL Editor in order, matching how earlier migrations in this repo were applied per `SUPABASE_SETUP.md`.)

## 2. Set edge function secrets

```bash
# Already required by sms-report - confirm these are already set
supabase secrets set GEMINI_API_KEY=your_gemini_key

# New secrets for this upgrade
supabase secrets set AGENT_CRON_SECRET=$(openssl rand -hex 32)
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# Optional - only if self-hosting OSRM instead of the free public demo server
supabase secrets set OSRM_BASE_URL=https://your-osrm-instance.example.com
```

`AGENT_CRON_SECRET` is a value you generate yourself (the command above generates a random one) - it's shared between this secret store and the GitHub Actions workflow (step 4).

## 3. Deploy the new edge functions

**Important:** Supabase enforces JWT verification at the platform gateway by default, which would reject the unattended cron trigger (no Supabase session at all) before your code ever runs. Every function that accepts a non-JWT auth path (the `x-agent-cron-secret` header, a volunteer access code, or a Stripe webhook signature) must be deployed with `--no-verify-jwt` so the gateway lets the request through and your own code does the real authorization check.

```bash
# Agents - accept either an admin JWT or the cron secret
supabase functions deploy situation-awareness-agent --no-verify-jwt
supabase functions deploy incident-prioritization-agent --no-verify-jwt
supabase functions deploy resource-allocation-agent --no-verify-jwt
supabase functions deploy route-optimization-agent --no-verify-jwt
supabase functions deploy volunteer-assignment-agent --no-verify-jwt

# Always requires a real admin session - default JWT verification is fine
supabase functions deploy allocation-plan-review

# Public/code-gated - no Supabase session at all
supabase functions deploy camp-inventory --no-verify-jwt
supabase functions deploy volunteer-self-service --no-verify-jwt
supabase functions deploy create-payment-intent --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
```

## 4. Configure the GitHub Actions cron trigger

Add these repo secrets (Settings → Secrets and variables → Actions):

- `SUPABASE_FUNCTIONS_URL` = `https://<project-ref>.supabase.co/functions/v1`
- `AGENT_CRON_SECRET` = the same value set in step 2

The workflow (`.github/workflows/ai-agents-schedule.yml`) runs every 2 hours and can also be triggered manually from the Actions tab (`workflow_dispatch`). It calls the five agents in dependency order, since later agents read what earlier ones wrote (Situation Awareness → Prioritization → Resource Allocation → Route Optimization → Volunteer Assignment).

The admin Command Dashboard's "Run AI Analysis" button triggers the same functions on-demand via the admin-JWT path, independent of this schedule.

## 5. Stripe dashboard setup

See the updated `DONATION_SETUP.md` Steps 4-5 - the payment-intent and webhook functions are implemented, this is just the Stripe-side webhook registration:

1. Stripe Dashboard → Developers → Webhooks → Add endpoint: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
2. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` (step 2 above)
4. Add `VITE_STRIPE_PUBLIC_KEY=pk_test_...` to your `.env`

## 6. Assign inventory access codes

Inventory tracking is opt-in per camp. For each active camp you want volunteers to track stock for: Admin → Manage Camps → Edit Camp → "Inventory Access Code" section → Generate Code. Share the camp ID and code with whoever is managing that camp's supplies; they use it at `/camp-inventory`.

## 7. Verifying the deployment

1. **Migrations applied**: `select table_name from information_schema.tables where table_name in ('agent_runs','situation_reports','incident_priority_queue','allocation_plans','inventory_transactions','volunteers','volunteer_assignments','route_plans');` should return all 8.
2. **Agents work**: log in as an admin, go to `/admin/command`, click "Run AI Analysis". Watch the `agent_runs` table (`select * from agent_runs order by started_at desc limit 5;`) for `status='success'` rows.
3. **Cron works**: in GitHub, Actions tab → "AI Agents Schedule" → "Run workflow" (manual dispatch) → confirm all 5 steps succeed and `agent_runs` gets new rows with `trigger_source='cron'`.
4. **Inventory works**: generate a camp access code, visit `/camp-inventory`, log a transaction, confirm it shows up in `/admin/inventory`.
5. **Donations work**: visit `/donations`, submit a test donation with Stripe test card `4242 4242 4242 4242`, confirm a `donations` row appears as `pending` then flips to `succeeded` (requires the webhook to be reachable - use `stripe listen --forward-to <url>` for local testing, per `DONATION_SETUP.md`).
6. **Volunteers work**: register at `/volunteers`, then trigger the Volunteer Assignment Agent and confirm a `volunteer_assignments` row appears if there's a matching active incident.

## 8. Call Recording Transcription setup

Adds `call-transcription-agent`: staff/volunteers upload local call recordings (Sinhala/Tamil/English, code-switching supported) at `/admin/call-reports`. The audio is transcribed by Gemini, and the resulting transcript is run through the **same extraction module `sms-report` uses for SMS text** (`_shared/reportExtraction.ts`) - a transcript is just treated as another incoming message, so there's one prompt/schema/insert path shared by both channels instead of two that could drift apart. Either way the result lands directly in `disasters`/`missing_persons`/`animal_rescues`.

1. **Migrations**: `20260724000000_add_call_recordings.sql` (the `call_recordings` table + `reported_via_call`/`call_recording_id` columns) and `20260724000001_add_call_gateway_columns.sql` (`ingestion_source`/`device_id`/`device_location`/`recorded_at`, for the Tasker gateway path in §9) - both included in the `supabase db push` from step 1.
2. **Storage bucket**: create a **private** bucket named `call-recordings` (Supabase Dashboard → Storage → New bucket, "Public" toggled OFF - recordings may contain caller PII, so they're only readable via the service-role key from the edge function, never a public URL).
3. **Secrets**: no new secrets - reuses `GEMINI_API_KEY` and `AGENT_CRON_SECRET` from step 2.
4. **Deploy**: same `--no-verify-jwt` reasoning as the other agents (it accepts either an admin JWT from the upload UI or the cron secret from the sweep):
   ```bash
   supabase functions deploy call-transcription-agent --no-verify-jwt
   ```
5. **Cron sweep**: already added as a step in `.github/workflows/ai-agents-schedule.yml`. This is only a safety net - the upload UI invokes the function directly per-recording for near-real-time results, so the 2-hourly cadence only matters for recovering anything left `pending`/stuck `processing`.
6. **Verify**: upload a short test recording at `/admin/call-reports`, confirm its status moves `pending` → `processing` → `completed` within roughly the length of the call, and that a new row appears in the matching report table with `reported_via_call = true`.

Also note: `sms-report/index.ts` itself was refactored in this round to call into `_shared/reportExtraction.ts` and `_shared/geocode.ts` instead of keeping its own private copies of the prompt/insert logic. Behavior is unchanged except one deliberate tightening that now applies to **both** channels: the extraction prompt no longer tells Gemini to invent a placeholder age (previously "estimate 30") when a missing person's age isn't stated - it now returns `null`, with `age || 30` kept only as a last-resort fallback in the insert function in case the `age` column is `NOT NULL`, not because the AI guessed it.

## 9. Call Recording Gateway (Tasker/MacroDroid auto-ingestion)

Adds `receive-call-recording`: instead of a staff member manually uploading each recording, a **dedicated intake phone** can auto-push every call recording the moment its native dialer finishes saving it - no custom Android app, same "off-the-shelf app + webhook" shape as the SMS gateway.

1. **Pick the intake phone by its dialer, not by installing a recorder app**: Android increasingly blocks third-party call-recording apps (Play Store policy since 2022; stock Android/Pixel has no path at all). Choose a device whose **native dialer** has built-in call recording (e.g. Xiaomi/Redmi/POCO's MIUI dialer, or a Samsung/Oppo/Vivo model sold in a region where it's enabled) - these save every call automatically to a fixed folder with no extra permissions battle.
   **Flag this to whoever runs the intake line**: call-recording consent laws vary by jurisdiction - an emergency line should almost certainly disclose that calls may be recorded. That's a policy decision, not something this code can enforce, so don't skip it.
2. **Migration**: `20260724000001_add_call_gateway_columns.sql` (already covered in §8, step 1).
3. **Secrets**: none new - reuses `AGENT_CRON_SECRET` from step 2. The gateway phone authenticates the same way the GitHub Actions cron does (`x-agent-cron-secret` header), since Tasker can set a static header trivially but can't easily compute an HMAC signature the way the SMS gateway app does.
4. **Deploy**:
   ```bash
   supabase functions deploy receive-call-recording --no-verify-jwt
   ```
5. **Configure Tasker (or MacroDroid) on the intake phone**:
   - **Trigger**: "new file added" on the dialer's call-recording folder (path is brand-specific, e.g. MIUI: `/storage/emulated/0/MIUI/sound_recorder/call_rec/`) - confirm the exact path by placing a test call first and checking where the file lands.
   - **Action**: HTTP Request → `POST https://<project-ref>.supabase.co/functions/v1/receive-call-recording`, `Content-Type: multipart/form-data`, header `x-agent-cron-secret: <AGENT_CRON_SECRET>`, form fields: `audio` (the file), `timestamp` (call time), `device_id` (a name for this phone), `phone_number`/`location` if available.
6. **Verify**: place a real test call to the intake number, confirm Tasker's HTTP action fires and returns `{"success": true, "report_id": "..."}`, confirm a `call_recordings` row appears with `ingestion_source = 'gateway_device'`, and that it flows through exactly like a manual upload (`pending` → `processing` → `completed`, new row in the matching report table).

## What was NOT changed

- Docker/DigitalOcean/CI-CD for hosting was explicitly scoped out of this round (see the plan) - the frontend still deploys via the existing AWS Amplify pipeline (`amplify.yml`), unchanged.
- The original proposal's XGBoost-based ML forecasting remains a future phase, not built here.
