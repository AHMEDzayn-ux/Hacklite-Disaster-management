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

## What was NOT changed

- Docker/DigitalOcean/CI-CD for hosting was explicitly scoped out of this round (see the plan) - the frontend still deploys via the existing AWS Amplify pipeline (`amplify.yml`), unchanged.
- Voice call intelligence and the original proposal's XGBoost-based ML forecasting remain future phases, not built here.
