# Missing Person Case Closure & Reporter SMS - Setup Guide

Closing a missing person case now notifies the person who reported it, by SMS,
with the details of where their relative actually is.

That single change turns the closure form into a delivery channel aimed at a
frightened family member, so it is built defensively. Three things go together
and none of them work alone:

1. **Structured closure.** The responder must state where the person is now and
   what condition they are in, not just "found her".
2. **Screening.** Every free-text field is checked for payment demands and
   private contact routes *before* anything is written or sent. A flagged
   closure is rejected, the case stays open, and the attempt is logged for a
   coordinator.
3. **Reporter privacy.** The reporter's name and phone number are hidden from
   every responder and public view. Only the server ever reads the number, and
   only to send this SMS. Administrators can still see it in the records
   console.

The threat this addresses is specific: "I found your daughter - transfer
Rs 50,000 and I'll tell you where she is." Anyone can respond to a case (that is
deliberate - it is what makes the platform useful in a disaster), so the
protection has to sit around the message, not around the account.

## 1. Database migration

```
supabase/migrations/20260730000002_add_missing_person_closure_notifications.sql
```

```bash
supabase db push
```

Or paste the file into the Supabase SQL editor.

It adds to `missing_persons`:

| Column | Purpose |
| --- | --- |
| `resolved_by_name` | Name the responder gave; sent to the reporter |
| `found_person_location` | Where the person is now (required at closure) |
| `found_person_condition` | `safe` / `injured_treated` / `hospitalised` / `in_official_care` / `deceased` |
| `authority_contact` | Official desk + hotline the reporter can verify with |
| `reporter_notified_at` | When the closure SMS was accepted by the gateway |
| `reporter_notification_status` | `sent` / `failed` / `no_recipient` / `not_configured` |

And two new tables:

- **`outbound_sms_log`** - every message sent to a member of the public, with its
  exact text. If someone later claims "the system told me to pay", the text that
  actually went out is on file. Contains phone numbers, so it has no `anon`
  policy at all: administrators read, edge functions write via the service role.
- **`flagged_closure_attempts`** - closures the screener rejected, with the full
  payload as evidence and a `pending` / `cleared` / `rejected` review status.
  Administrator-only for the same reason: echoing that text publicly would just
  re-publish the extortion attempt.

## 2. Deploy the edge function

```bash
supabase functions deploy resolve-missing-person
```

This is the only path that may close a case. It runs with the service role so
that the reporter's phone number never reaches a browser.

Note that RLS still allows an anonymous `UPDATE` on `missing_persons`, so this
is not a hard write boundary - someone could still flip a status directly with
the anon key. It *is* the boundary on the thing an extortionist wants, which is
reaching the reporter: sending is only possible through this function, and only
after screening. Tightening the table's UPDATE policy to status-only is a
worthwhile follow-up but is not what makes this safe.

## 3. Configure the SMS gateway

Outbound SMS goes through **TextBee** (textbee.dev) — the same Android gateway
app behind inbound `sms-report` — via `POST /gateway/devices/{deviceId}/send-sms`
with an `x-api-key` header and body `{recipients: [...], message}`.

Set these as **edge function secrets** (not `VITE_` variables - they must never
reach the browser):

```bash
supabase secrets set TEXTBEE_API_KEY=your_api_key
supabase secrets set TEXTBEE_DEVICE_ID=your_device_id
supabase secrets set PUBLIC_SITE_URL=https://your-deployed-site
supabase secrets set PUBLIC_BRAND_NAME="Disaster Management LK"
```

**Both** TextBee values are required, and both are UUIDs — so it is easy to set
one to the other's value. That mistake does not crash anything: it surfaces as a
`401` (bad key) or `404` (bad device id) recorded against a `failed` row in
`outbound_sms_log`, with TextBee's own message preserved. Check there first if
messages stop arriving.

Optional:

| Secret | Default |
| --- | --- |
| `TEXTBEE_API_BASE` | `https://api.textbee.dev/api/v1` |

**Without gateway credentials the feature still works.** Closure is recorded,
the message is written to `outbound_sms_log` with status `not_configured`, and
the responder is told the notification could not be delivered. Nothing breaks
and nothing is silently lost - a coordinator can follow up from the log.

Local numbers are normalised to E.164 (`0771234567` → `+94771234567`) before
sending.

## 4. What the reporter receives

```
Disaster Management LK - AUTOMATED UPDATE (do not reply)
Case #A1B2C3D4: Kamala Perera has been reported FOUND.
Condition: Admitted to hospital
Where: Teaching Hospital Kandy, ward 4
Closed by: Nimal Perera
Verify with: Kandy Police Station, 081-2222222
Note: Found near the river bank around 4pm and walked to the hospital with
neighbours. Her son is with her now.

Automated message from an unverified public report. No payment is ever part of
this process - never send money, bank or card details, OTP codes or gift cards
to anyone claiming to have found this person. Verify this update, or report
anyone demanding money, at https://your-site/missing-persons/<case id>
```

That example is 698 characters, about five SMS segments.

The safety paragraph is the point, not boilerplate. The reporter is receiving an
unverified claim about a missing relative from a stranger - the moment they are
most likely to pay whoever asks. So the message says plainly that it is
machine-generated, that payment is never part of the process, and that the only
place to verify or escalate is the platform.

The message is capped at 900 characters (six segments). The whereabouts, the
verification contact and the safety paragraph are never what gets cut — the
responder's note gets whatever budget is left and is trimmed to fit.

## 5. Screening rules

Implemented in `supabase/functions/_shared/closureScreening.ts` as plain pattern
matching, deliberately not an AI call: it cannot be prompt-injected by the text
it is screening, it is deterministic enough to explain a flag to an
administrator, and it cannot time out on the critical path.

| Rule | Fires on |
| --- | --- |
| `payment_demand` | bribe, ransom, reward, compensation, "send money", "pay first", eZ Cash, Western Union, gift cards… (English, Sinhala, Tamil, and common romanisations) |
| `financial_credentials` | bank account, card number, CVV, OTP, PIN, crypto wallets, PayPal |
| `money_amount` | `Rs 5,000`, `LKR 20000`, `$300`, "5000 rupees" |
| `off_platform_contact` | phone numbers, emails, URLs, WhatsApp/Telegram/Viber handles in the name, location or notes |
| `personal_number_in_authority_contact` | a `07x` mobile passed off as an official desk (landlines and short codes like 119 / 1990 are fine) |
| `coercion` | "unless you pay", "will not release her", "don't tell police", "come alone" |

### Matching, and why it works the way it does

Terms are matched **boundary-anchored**, not as bare substrings, and
de-obfuscation only ever collapses characters *within* a single token. Each field
is tested in three forms:

| Form | Catches |
| --- | --- |
| lowercased, character substitution undone | `m0n3y`, `5end money` |
| punctuation dropped, spaces kept | `b.r.i.b.e`, `o.t.p`, `pay-first` |
| runs of three or more lone letters collapsed | `b r i b e` |

Plus one whitespace-free pass, restricted to a short list of long distinctive
terms (`sendmoney`, `bankaccount`, `westernunion`…) that cannot collide across
word boundaries.

That structure is not incidental — it is the fix for a real defect. An earlier
version matched substrings against a form of the text with **all** whitespace
stripped, which merged adjacent words:

- "he **got p**arents nearby" → `gotparents` → flagged as containing `otp`
- "she **ran som**ewhere near the canal" → `ransomewhere` → flagged as `ransom`
- a responder named S**imo**n → flagged as an `imo` messaging handle

A responder with genuine news would have been told their closure looked like
extortion. Short terms like `otp`, `cvv` and `ransom` are therefore never matched
against a whitespace-free form, and single words are boundary-anchored so
`reward` does not fire on "rewarding" and `in cash` does not fire on "cashew".

Some plausible-sounding terms are deliberately **not** in the lists, because they
have ordinary uses in a rescue note: bare `no police` ("there is no police
station nearby"), `some money` ("she had some money with her"), `small amount`
("she drank a small amount of water"), `in cash` ("the fare was paid in cash").
The demand forms — `send money`, `pay me`, `pay first`, `money first`,
`give me money` — carry that weight instead.

Regression coverage lives in
`supabase/functions/_shared/closureScreening.test.ts` — 17 must-pass closures and
28 must-flag attempts, including every case above. Run it after touching a term
list:

```bash
deno test supabase/functions/_shared/closureScreening.test.ts
```

### Why rules and not a Bayesian classifier

A spam-filter-style Naive Bayes model is the obvious alternative and it is worth
knowing why it is not the gate here:

- **No training data.** The feature has never run in production, so there are
  zero labelled closure notes. A model hand-fed synthetic examples is just this
  term list with the guarantees removed.
- **Bayesian poisoning is the normal shape of this attack.** A closure note is
  mostly legitimate narrative with one short demand clause appended — "found her
  at the hospital, she is fine, her son is with her, now send Rs 50,000". Bag-of-
  words scoring dilutes: the ham words outvote the demand. A rule that rejects
  any payment demand outright cannot be diluted.
- **A flag has to be explainable.** A coordinator reviewing an accusation and a
  responder being told to rewrite both need "the word `bribe` was found", not
  "p(abuse) = 0.71".

The right place for a classifier is as a **second, non-blocking** signal once
labels exist. `flagged_closure_attempts.review_status` (`cleared` / `rejected`)
is already the labelling pipeline, so after a few hundred reviewed closures a
model can be trained to route *additional* notes to review — catching the
paraphrase attacks the term lists miss — while the rules keep the hard reject.

### What this does not catch

Pure paraphrase with no listed term: "I'll tell you where she is once we settle
things between us." No keyword, no amount, no phone number, so it passes. That is
the real limit of the approach, and it is why the reporter's SMS carries the
"never pay anyone" warning regardless of whether the note was clean — the warning
is the control that does not depend on detection working.

A flag **rejects** the closure. The case stays `Active` - a bad actor must not be
able to shut down a live search - and no SMS goes out. The submitter sees
category-level guidance so a genuine responder can rewrite ("closure details
must not contain phone numbers…"), never the rule that matched.

False positives are the intended trade: one rewrite for a responder, versus an
extortion demand delivered to someone whose child is missing. Coordinators
review flags in **Admin Dashboard → Flagged Case Closures** and can mark them
*False positive* or *Confirm abuse*.

## 6. Known gap: reporter PII in the API payload

The reporter's name and number are removed from every responder and public
**view**, and the closure flow no longer needs them. But `missing_persons` still
has a blanket `public_read` RLS policy and the frontend reads it with
`select('*')`, so those columns are still present in the anon API response for
anyone who calls the REST endpoint directly. Hiding them in the UI raises the
bar; it does not remove the data.

Closing that properly means one of:

- moving `reporter_name` / `contact_number` into a companion table with no
  `anon` SELECT policy (a `BEFORE INSERT` trigger can keep the existing public
  report form working unchanged), or
- serving public reads from a view that omits those columns, and revoking direct
  table SELECT from `anon`.

Both are larger changes than this feature, and both would affect the
`volunteer-suggestions` / `volunteer-self-service` functions, which hand reporter
phone numbers to self-registered volunteers on purpose. That is worth revisiting
against the same "contact through the platform only" principle.
