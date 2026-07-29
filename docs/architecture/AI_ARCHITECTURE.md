# How the AI Works — Complete Implementation Guide

This document explains, in plain language, **exactly how the platform's "AI" works**: what is powered by a large language model (Gemini), what is powered by classic algorithms, how each piece is computed, and how everything is wired together.

> **The one-sentence answer:** Yes, we call **Google Gemini** — but only for a few *narrow, language-shaped* jobs (writing short narratives, reading free-text SMS, a tie-break on duplicate reports). **Every important decision** — how bad an incident is, what to prioritize, what supplies to move where, which route to take, which volunteer to send — is made by **transparent, deterministic algorithms** (weighted scoring + Operations-Research optimization), *not* by an LLM. And **no algorithm ever fails just because Gemini is unavailable** — every Gemini call has a hand-written fallback.

---

## Table of contents

1. [Two different "AI layers" (don't confuse them)](#1-two-different-ai-layers)
2. [The big picture: a "blackboard" of cooperating agents](#2-the-big-picture)
3. [Where Gemini is used — and where it is deliberately *not*](#3-where-gemini-is-used)
4. [The Gemini client itself (model, config, fallback)](#4-the-gemini-client)
5. [Agent 1 — Situation Awareness (Damage Index + Risk Score)](#5-agent-1--situation-awareness)
6. [Agent 2 — Incident Prioritization + Duplicate Detection](#6-agent-2--incident-prioritization--duplicate-detection)
7. [Agent 3 — Resource Allocation (Vogel's transportation solver)](#7-agent-3--resource-allocation)
8. [Agent 4 — Route Optimization (OSRM + TSP 2-opt)](#8-agent-4--route-optimization)
9. [Agent 5 — Volunteer Assignment (Hungarian algorithm)](#9-agent-5--volunteer-assignment)
10. [The SMS intake pipeline (Gemini structured extraction)](#10-the-sms-intake-pipeline)
11. [Human-in-the-loop & safety guarantees](#11-human-in-the-loop--safety)
12. [Authentication & how agents are triggered](#12-authentication--triggering)
13. [The data model (the blackboard tables)](#13-the-data-model)
14. [Observability & failure handling](#14-observability--failure-handling)
15. [File map — where everything lives](#15-file-map)
16. [Glossary](#16-glossary)

---

## 1. Two different "AI layers"

The platform has **two independent things people call "AI"**. Keeping them separate avoids a lot of confusion:

| | **Server-side Agent Pipeline** | **Responder Dashboard "AI"** |
|---|---|---|
| Where | Supabase **Edge Functions** (Deno/TypeScript) | Browser (`src/pages/RespondDashboard.jsx`) |
| Who sees it | **Admins** at `/admin/command` | **Public** at `/respond` |
| Uses Gemini? | Yes (narrow jobs) | **No** |
| Uses a database? | Writes results to Postgres "blackboard" tables | Reads live report data, computes in-memory |
| What it does | Prioritization, allocation, routing, volunteer matching, SITREPs | KPIs, hotspots, duplicate clustering, insights, recommendations |

This document is mostly about the **server-side agent pipeline** (the real one). The responder dashboard is intentionally a *self-contained, client-side* re-derivation (trends, keyword extraction, proximity clustering) because `/respond` is a public route and the agent output tables are admin-only. It **does not call any LLM.**

---

## 2. The big picture

The agents use the classic **"blackboard" architecture**: independent agents don't call each other directly. Instead, each agent **reads shared Postgres tables, does its work, and writes its results back** to shared tables. The *next* agent reads those results. The "blackboard" is the set of Postgres tables.

```
                          ┌─────────────────────────────────────────────┐
   Raw data               │            SHARED POSTGRES "BLACKBOARD"       │
  (reports, camps,        │  disasters · missing_persons · animal_rescues │
   volunteers,            │  camps · volunteers · inventory_transactions  │
   inventory)             │  ─────────── agents write here ───────────    │
        │                 │  situation_reports · incident_priority_queue  │
        │                 │  allocation_plans · route_plans               │
        │                 │  volunteer_assignments · agent_runs (log)     │
        ▼                 └─────────────────────────────────────────────┘
                                  ▲        ▲        ▲        ▲        ▲
   run in dependency order ──►    │        │        │        │        │
                                  │        │        │        │        │
   1. Situation Awareness ────────┘        │        │        │        │
   2. Incident Prioritization ─────────────┘        │        │        │
   3. Resource Allocation ──────────────────────────┘        │        │
   4. Route Optimization ────────────────────────────────────┘        │
   5. Volunteer Assignment ─────────────────────────────────────────── ┘
        (reads the priority queue agent #2 wrote)
```

**Why this order?** Later agents consume what earlier agents produce:
- Prioritization ranks incidents → Volunteer Assignment sends people to the **top-ranked** incidents.
- Resource Allocation decides *what moves where* → Route Optimization computes the **road route** for each move.

**Who runs them, and when?** Two triggers, same functions (see [§12](#12-authentication--triggering)):
- **Scheduled**: a GitHub Actions cron (`.github/workflows/ai-agents-schedule.yml`) calls all five in order **every 2 hours**.
- **On demand**: the admin clicks **"Run AI Analysis"** on `/admin/command`, which calls the same five functions via `src/services/aiAgentService.js`.

---

## 3. Where Gemini is used

Gemini is used **sparingly and only for language tasks**. It is never the thing that makes an operational decision.

| Feature | Uses Gemini? | What Gemini does | What happens if Gemini is down |
|---|---|---|---|
| Damage Index / Risk Score | ❌ | — | n/a (pure math) |
| Incident priority ranking | ❌ | — | n/a (pure math) |
| Resource allocation (what to move) | ❌ | — | n/a (Operations Research solver) |
| Route optimization | ❌ | — | n/a (OSRM + TSP) |
| Volunteer matching | ❌ | — | n/a (Hungarian algorithm) |
| **SITREP narrative** (1–2 sentence district summary) | ✅ | Turns computed stats into a readable sentence | Falls back to a **template sentence** built from the same stats |
| **Duplicate report tie-break** | ✅ (only the ambiguous cases) | Answers "same incident? yes/no + confidence" | Pair is simply **not** flagged as duplicate |
| **Allocation recommendation text** | ✅ | One-sentence "move X from A to B" blurb | Field is left `null`; the plan still exists |
| **SMS parsing** | ✅ | Extracts structured fields from free-text SMS | Sender gets a "couldn't understand, please resend" reply |

**Key design rule (from the code comments):**
> *"Every caller MUST have a deterministic fallback for when this returns null (quota exhausted, network failure, malformed response) — no agent run should ever fail solely because Gemini was unavailable."*

So Gemini is a **presentation/parsing convenience**, not the brain.

---

## 4. The Gemini client

**File:** `supabase/functions/_shared/geminiClient.ts`

- **Model:** `gemini-flash-lite-latest` (the cheapest/fastest Gemini tier — chosen for quota headroom).
- **API:** Google's Generative Language REST API, called with a **plain `fetch`** (no SDK):
  `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=<GEMINI_API_KEY>`
- **Auth:** an API key stored as the `GEMINI_API_KEY` edge-function secret. It never reaches the browser.
- **Generation config:** `temperature: 0.2`, `topK: 1`, `topP: 0.95`, `maxOutputTokens: 300` (small — these are short outputs). Low temperature = near-deterministic, factual output.
- **Safety settings:** all four categories set to `BLOCK_NONE` — deliberately, because disaster text ("casualties", "trapped", "fatalities") would otherwise trip safety filters and lose real reports.
- **Contract:** every prompt asks for **JSON only**. The client strips ```` ```json ```` fences and `JSON.parse`s the result.
- **Return type:** `{ ok: true, data }` or `{ ok: false, data: null }`. It **never throws** — any error (network, quota, bad JSON) becomes `ok: false`, and the caller uses its fallback.

```ts
// Simplified shape of the only LLM call in the agent system:
const result = await callGeminiForJSON<{ narrative: string }>(prompt, apiKey);
const narrative = result.ok ? result.data.narrative : buildTemplateSentence(stats); // fallback
```

---

## 5. Agent 1 — Situation Awareness

**File:** `supabase/functions/situation-awareness-agent/index.ts`
**Writes:** `situation_reports` (one row per district per run)

**What it produces per district:**
1. A **Damage Index** (reactive: "how bad is it right now").
2. A **Risk Score + trend** (predictive: "is it escalating").
3. A **SITREP narrative** (Gemini, with template fallback).

It first **backfills districts** for any report missing one (by matching the address text against Sri Lanka's 25 districts), then aggregates all reports/camps per district.

### 5a. Damage Index (0–100) — pure math

**File:** `supabase/functions/_shared/scoring.ts` → `computeDamageIndex`

A weighted average of three fields already collected on every disaster report (no new input needed):

```
severityComponent   = SEVERITY_WEIGHT[severity] / 4      # low1 moderate2 high3 critical4
peopleComponent     = PEOPLE_WEIGHT[bucket]     / 4      # 0→0, 1-10→1, 11-50→2, 51-100→3, 100+→4
casualtiesComponent = CASUALTIES_WEIGHT[bucket] / 4      # none0 minor1 serious2 fatalities4

DamageIndex = 100 × ( 0.50·severityComponent
                    + 0.25·peopleComponent
                    + 0.25·casualtiesComponent )
```

The result is written back onto each disaster row (`disasters.damage_index`) and also feeds the map heatmap.

### 5b. Risk Score (0–100) — pure math

**File:** `scoring.ts` → `computeRiskScore`

Damage Index is a *snapshot*; Risk Score answers "is this district **accelerating**?" — the same early-warning principle epidemic/disaster surveillance uses. Driven by the **velocity** of new reports and by shrinking camp headroom:

```
avgHourlyRate24h  = reports_last_24h / 24
velocityRatio     = reports_last_1h / avgHourlyRate24h      # > 1 means accelerating
velocityComponent = min(velocityRatio / 2, 1)               # 2× average = fully saturated
shortWindowComp   = min(reports_last_6h / 10, 1)
occupancyComp     = campOccupancyPct / 100  (0.5 if district has no camps)

RiskScore = 100 × ( 0.45·velocityComponent
                  + 0.30·shortWindowComp
                  + 0.25·occupancyComp )

riskTrend = "rising"  if velocityRatio > 1.2
            "falling" if velocityRatio < 0.8
            "stable"  otherwise
```

### 5c. The SITREP narrative — Gemini (with fallback)

The computed stats are handed to Gemini with a prompt like *"Write a 1–2 sentence factual SITREP… do not invent numbers not present in STATS."* If Gemini is unavailable, `fallbackNarrative()` stitches the same numbers into a plain sentence, e.g.:

> *"Ratnapura: 4 active disaster report(s), 1 critical, camp occupancy 88%, risk trend rising."*

The `narrative_model` column records whether the sentence came from `gemini-flash-lite-latest` or `fallback-template`, so you always know.

---

## 6. Agent 2 — Incident Prioritization + Duplicate Detection

**File:** `supabase/functions/incident-prioritization-agent/index.ts`
**Writes:** `incident_priority_queue` + flags on `disasters` (`duplicate_status`, `possible_duplicate_of`)

### 6a. Priority Score (0–100) — pure math, EMD-style triage

**File:** `scoring.ts` → `computePriorityScore`

Every **active** disaster gets a triage score; the queue is re-ranked every run.

```
severityComponent         = SEVERITY_WEIGHT / 4
casualtiesComponent       = CASUALTIES_WEIGHT / 4
peopleAffectedComponent   = PEOPLE_WEIGHT / 4
agingComponent            = min(hoursSinceReport / 24, 1)      # saturates at 24h
capacityPressureComponent = 1 − (nearestCampHeadroom% / 100)   # 0.5 if no camp nearby

PriorityScore = 100 × ( 0.30·severity
                      + 0.25·casualties
                      + 0.15·peopleAffected
                      + 0.15·aging
                      + 0.15·capacityPressure )
```

**Why the aging term matters:** without it, an old unaddressed report silently sinks below newer, more dramatic-sounding ones — a well-known failure mode in triage/queueing systems. The `nearestCampHeadroom` is found by a **Haversine** nearest-camp lookup: if the closest camp is nearly full, acting *now* (before it's exhausted) is more urgent.

Each row stores every component (`contributing_factors` JSON) so a human can see **exactly why** a score is what it is — nothing here is a black box.

### 6b. Duplicate detection — cheap filter first, Gemini only for the gray zone

Compares every pair of active disasters and gates aggressively before ever touching an LLM:

```
Skip the pair unless ALL of:
  • same disaster_type
  • created within 6 hours of each other        (DUPLICATE_WINDOW_HOURS)
  • within 2 km of each other (Haversine)        (DUPLICATE_RADIUS_KM)

Then, on description text (Jaccard word-overlap similarity):
  Jaccard ≥ 0.50  →  DUPLICATE (confident, no LLM needed)
  0.15 – 0.50     →  ask Gemini "same incident? {yes/no, confidence}";
                      duplicate only if yes AND confidence ≥ 0.70
  < 0.15          →  NOT a duplicate
```

- **Jaccard similarity** (`_shared/textSimilarity.ts`) = `|words(A) ∩ words(B)| / |words(A) ∪ words(B)|` — a fast, dependency-free text overlap measure. It handles the obvious cases so the LLM is only consulted for genuinely ambiguous pairs, keeping API usage low.
- **Never auto-merged.** The later (newer) report is flagged `duplicate_status = 'flagged'` and pointed at the earlier one via `possible_duplicate_of`. An admin confirms or rejects; the agent will never overwrite an admin's decision.

---

## 7. Agent 3 — Resource Allocation

**File:** `supabase/functions/resource-allocation-agent/index.ts`
**Solver:** `supabase/functions/_shared/transportationSolver.ts`
**Writes:** `allocation_plans` (all `status = 'pending'`)

This is **real Operations Research**, not a heuristic score. For **each of 7 resource categories** (food, water, medical, shelter, clothing, hygiene, other) it solves a classic **transportation problem**: move a resource from **surplus** camps to **shortage** camps at **minimum total distance**.

### How supply and demand are measured
- **Preferred (real data):** from the inventory ledger — `camp_inventory_levels` (quantity on hand) vs. `camps.inventory_thresholds` (target stock). `demand = max(0, threshold − onHand)`.
- **Fallback (legacy):** camps that haven't adopted the inventory system yet use their free-text `needs` tags, mapped to categories (`_shared/resourceCategories.ts`), with demand approximated as **10% of camp capacity** (documented as interim, not permanent).

### The solve
- **Cost matrix** = pairwise **Haversine distance (km)** between camps. A camp's diagonal is set to `1e6` so it never "ships to itself."
- **Algorithm: Vogel's Approximation Method (VAM).** For each row/column it computes a **penalty** = (2nd-cheapest − cheapest) route cost, then serves the row/column with the **largest penalty** first (delaying it is the riskiest), allocating to its cheapest cell. Repeats until supply/demand are exhausted.
- **Imbalance handling:** if totals don't match, a **zero-cost dummy node** absorbs the difference. Genuinely unmet demand (supply < demand) is reported separately as `unmetDemand` rather than hidden.
- **Honest scope note (from the code):** VAM finds a **strong feasible solution — frequently optimal, always a good approximation** — but it does *not* run a MODI/stepping-stone optimality pass, so it is not a certified-optimal simplex solve. This was a deliberate trade-off to run with **zero external packages** inside a Deno edge function.

Each shipment becomes one `allocation_plans` row with `quantity`, `distance_km`, `lp_objective_value` (total plan cost), and `solver_metadata` (`method: 'vogel_approximation'`, imbalance flags, and the optional Gemini one-liner). **Everything is `pending`** — see [§11](#11-human-in-the-loop--safety).

---

## 8. Agent 4 — Route Optimization

**File:** `supabase/functions/route-optimization-agent/index.ts`
**Helpers:** `_shared/osrmClient.ts`, `_shared/tsp2opt.ts`
**Writes:** `route_plans`

Produces **real road-network routes**, not straight lines, via **OSRM** (Open Source Routing Machine — a free public API, no key). Two modes:

### Batch mode (default)
For every `pending`/`approved` allocation plan that doesn't yet have a route, it calls OSRM `/route` for the from-camp → to-camp road path and stores distance (km), duration (min), and the GeoJSON geometry (drawn directly on the map as a polyline). `optimization_method = 'osrm_direct'`.

### Multi-stop mode (`action: 'multi-stop'`)
"One relief vehicle visiting several camps" — a **Traveling Salesman Problem**:
1. Fetch a full pairwise **distance matrix** from OSRM `/table` (falls back to a Haversine matrix if OSRM is unreachable).
2. **Nearest-neighbor** construction builds an initial tour.
3. **2-opt local search** repeatedly reverses tour segments whenever that shortens total distance, until no single reversal helps (a local optimum). This typically improves the nearest-neighbor tour by ~5–15%.
4. Modeled as a **closed tour** (vehicle returns to the depot to reload). `optimization_method = 'nearest_neighbor_2opt'` (or `nearest_neighbor` if 2-opt didn't improve it).

**Resilience:** if the public OSRM server is unreachable, the agent falls back to Haversine distances and flags the method accordingly — a routing outage never hard-fails a run.

---

## 9. Agent 5 — Volunteer Assignment

**File:** `supabase/functions/volunteer-assignment-agent/index.ts`
**Solver:** `_shared/hungarianAlgorithm.ts`
**Writes:** `volunteer_assignments` (all `status = 'proposed'`)

A genuine **bipartite assignment-problem** solve using the **Hungarian algorithm (Kuhn–Munkres, O(n³))** — not a greedy nearest-match. It matches **available volunteers** to the **top-ranked open incidents** (it reads the latest `incident_priority_queue`, top 20), minimizing total travel distance **subject to a hard skill constraint**.

### Building the cost matrix (`cost[volunteer][task]`)
```
if volunteer lacks a required skill  → FORBIDDEN_PAIRING_COST (1e9)   # effectively disallowed
else if both have coordinates        → Haversine distance (km)
else                                 → 500 km   # missing location disfavors but doesn't forbid
```
- **Required skills** are inferred from each incident's `needs` flags (`_shared/taskSkills.ts`): `rescue/evacuation → rescue`, `medical → medical`, `shelter/food/water → logistics`.
- `FORBIDDEN_PAIRING_COST` is a **large finite number, not Infinity** — the algorithm subtracts costs during its potential updates, and `Infinity − Infinity` would produce `NaN` and corrupt the solve. After solving, any pairing whose real cost hit that sentinel is dropped.
- Rectangular matrices (more volunteers than tasks or vice-versa) are padded to square with zero-cost dummies, which are stripped from the result.

**Output is `proposed` only** — a volunteer must accept and a coordinator can review; nothing auto-dispatches a person.

---

## 10. The SMS intake pipeline

**File:** `supabase/functions/sms-report/index.ts`

This is the other place Gemini does real work — turning an unstructured emergency **SMS** into a structured report. Flow:

```
Android SMS Gateway ──(webhook, HMAC-SHA256 signed)──► sms-report function
   │
   ├─ 1. Verify the HMAC signature (constant-time) against SMS_WEBHOOK_SECRET
   ├─ 2. Gemini (gemini-flash-lite-latest, temp 0.1) reads the free text and returns JSON:
   │       { category: disaster | missing_person | animal_rescue,
   │         confidence, data: {…schema-matched fields…} }
   ├─ 3. Geocode the extracted address via OpenStreetMap Nominatim (free, no key) → lat/lng
   ├─ 4. Insert into disasters / missing_persons / animal_rescues (status Active)
   └─ 5. Reply to the sender with a reference ID
```

- The prompt **pins Gemini to the exact DB schema** (allowed enum values for `disaster_type`, `severity`, `condition`, etc.) so output drops straight into the tables.
- If Gemini can't parse the message, the sender is asked to resend with more detail — the report is **not** fabricated.
- Every attempt is logged to `sms_processing_logs` for audit.

> Note: the file header comment mentions "gemini-2.0-flash", but the actual call uses `gemini-flash-lite-latest` (line ~238) — same as the rest of the system.

---

## 11. Human-in-the-loop & safety

The system is built so that **AI proposes, humans dispose.** Nothing the AI outputs changes real-world state on its own:

| AI output | Status it's created with | What makes it "real" |
|---|---|---|
| Allocation plan | `pending` | An admin clicks **Approve** (`allocation-plan-review` function) |
| Volunteer match | `proposed` | Volunteer accepts / coordinator confirms |
| Duplicate report | `flagged` | Admin confirms duplicate or distinct — never auto-merged |
| SITREP / priority | (informational) | Read-only decision support |

**The approval flow** (`supabase/functions/allocation-plan-review/index.ts`) is the *only* thing that moves inventory, and it does so atomically: approving a plan writes a matched **`transferred_out` + `transferred_in`** pair into `inventory_transactions`. It enforces a real lifecycle —
`pending → approved → dispatched → delivered` — and rejects out-of-order transitions. Every approve/reject/dispatch/deliver is written to `audit_logs` with the admin's identity, IP, and a snapshot. This function is **admin-JWT only** (no cron path) because it is always a human decision.

---

## 12. Authentication & triggering

**File:** `supabase/functions/_shared/agentAuth.ts`

Every agent accepts **exactly two** ways to be called:

1. **Admin JWT** — `Authorization: Bearer <token>`. Verified with `supabase.auth.getUser(token)`, then checked against the `admin_users` table (`is_active = true`). This is the path the **"Run AI Analysis"** button uses.
2. **Cron secret** — `x-agent-cron-secret` header, **constant-time compared** against the `AGENT_CRON_SECRET` edge secret. This is the path the **GitHub Actions schedule** uses (it has no user session).

Anything else is rejected with 401.

> **Deployment note:** the agent functions are deployed with `--no-verify-jwt` so Supabase's gateway lets the *cron* (non-JWT) request reach the code, where `authenticateAgentCaller` does the real check. `allocation-plan-review` keeps default JWT verification since it's admin-only.

**The schedule** (`.github/workflows/ai-agents-schedule.yml`): cron `0 */2 * * *` (every 2 hours) + manual `workflow_dispatch`, calling the five agents in dependency order with `curl`.

---

## 13. The data model

The "blackboard" tables (added by the `20260709*` migrations, see `AI_AGENTS_SETUP.md`):

| Table | Written by | Purpose |
|---|---|---|
| `agent_runs` | every agent | One row per run: status, duration, items processed/failed, `gemini_calls`, `gemini_failures` |
| `situation_reports` | Situation Awareness | Per-district damage index, risk score/trend, SITREP narrative |
| `incident_priority_queue` | Incident Prioritization | Ranked active disasters + each score component |
| `allocation_plans` | Resource Allocation | Proposed supply movements + solver metadata + lifecycle status |
| `route_plans` | Route Optimization | Road route geometry, distance, duration per plan / multi-stop |
| `volunteer_assignments` | Volunteer Assignment | Proposed volunteer↔incident matches + cost |
| `inventory_transactions` | Allocation **approval** | The ledger that actually moves stock |
| `camp_inventory_levels` (view) | — | Current on-hand quantities per camp/item |

Source data the agents read: `disasters`, `missing_persons`, `animal_rescues`, `camps`, `volunteers`.

---

## 14. Observability & failure handling

- **Every run is logged.** Each agent inserts an `agent_runs` row (`status: 'running'`) at the start and updates it at the end with `success` / `partial_failure` / `failed`, `duration_ms`, counts, and `gemini_calls` / `gemini_failures`. The admin dashboard shows the last run per agent.
- **`partial_failure`** is a first-class state: if 40 of 42 districts processed, the run isn't marked a total failure — you still get 40 good results.
- **Graceful degradation everywhere:**
  - Gemini down → template narrative / null recommendation text / duplicate simply not flagged.
  - OSRM down → Haversine distance, method flagged.
  - Missing coordinates → skipped (routing) or a finite penalty (volunteer matching), never a crash.
- **Explainability:** scores are documented weighted sums with every component persisted — an admin (or a hackathon judge) can trace any number back to its inputs.

---

## 15. File map

```
supabase/functions/
├── _shared/
│   ├── geminiClient.ts        ← the ONLY LLM call (gemini-flash-lite-latest, JSON-only, fallback)
│   ├── scoring.ts             ← Damage / Risk / Priority / Shortage formulas (pure math)
│   ├── transportationSolver.ts← Vogel's Approximation Method (resource allocation)
│   ├── hungarianAlgorithm.ts  ← Kuhn–Munkres assignment (volunteer matching)
│   ├── tsp2opt.ts             ← nearest-neighbor + 2-opt (multi-stop routing)
│   ├── osrmClient.ts          ← OSRM road routing / distance matrix
│   ├── geo.ts                 ← Haversine distance
│   ├── textSimilarity.ts      ← Jaccard similarity (duplicate pre-filter)
│   ├── taskSkills.ts          ← needs → required-skill inference
│   ├── resourceCategories.ts  ← legacy needs-tags → 7 categories
│   ├── districts.ts           ← address → Sri Lanka district matching
│   └── agentAuth.ts           ← admin-JWT / cron-secret auth
│
├── situation-awareness-agent/     (Agent 1)
├── incident-prioritization-agent/ (Agent 2 + duplicate detection)
├── resource-allocation-agent/     (Agent 3)
├── route-optimization-agent/      (Agent 4)
├── volunteer-assignment-agent/    (Agent 5)
├── allocation-plan-review/        (human approval → moves inventory)
└── sms-report/                    (Gemini SMS → structured report)

src/services/aiAgentService.js      ← browser client: triggers agents, reads blackboard (admin only)
src/pages/AdminCommandDashboard.jsx ← admin EOC UI ("Run AI Analysis")
src/pages/RespondDashboard.jsx      ← public responder EOC (client-side heuristics, NO LLM)
.github/workflows/ai-agents-schedule.yml ← 2-hourly cron orchestration
AI_AGENTS_SETUP.md                  ← deployment / secrets / migration guide
```

---

## 16. Glossary

- **LLM / Gemini** — Google's large language model. Here: `gemini-flash-lite-latest`, used only for short narratives, SMS parsing, and duplicate tie-breaks.
- **Blackboard architecture** — agents cooperate by reading/writing shared tables, not by calling each other.
- **Edge Function** — a small server-side function (Deno/TypeScript) hosted by Supabase.
- **Haversine** — great-circle straight-line distance between two lat/lng points.
- **OSRM** — Open Source Routing Machine; gives real road distances/durations/geometry.
- **Vogel's Approximation Method (VAM)** — an Operations Research heuristic for the transportation (supply→demand min-cost) problem.
- **Hungarian algorithm (Kuhn–Munkres)** — exact O(n³) solver for the assignment (one-to-one min-cost matching) problem.
- **TSP / 2-opt** — Traveling Salesman Problem; 2-opt is a local-search improvement that un-crosses a tour.
- **Jaccard similarity** — set-overlap ratio used to compare report descriptions.
- **EMD triage** — Emergency Medical Dispatch style prioritization (severity + acuity + aging).
- **SITREP** — Situation Report; a short operational summary.

---

### The bottom line

- **Do we call LLMs / Gemini?** Yes — `gemini-flash-lite-latest`, via a plain REST `fetch`, for **language jobs only** (SITREP sentences, SMS extraction, ambiguous-duplicate tie-breaks, allocation blurbs).
- **What makes the real decisions?** Transparent, deterministic algorithms: **weighted scoring** (damage/risk/priority), **Vogel's transportation solver** (allocation), **OSRM + TSP 2-opt** (routing), and the **Hungarian algorithm** (volunteer matching).
- **Is it safe?** AI only ever *proposes*; a human approval is what changes real state, and every action is audit-logged. No agent run depends on Gemini being up.
