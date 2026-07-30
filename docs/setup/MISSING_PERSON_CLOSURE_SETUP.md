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

Outbound SMS goes through the same Android SMS Gateway (sms-gate.app) that
`sms-report` already uses for inbound messages, via its 3rd-party send API.

Set these as **edge function secrets** (not `VITE_` variables - they must never
reach the browser):

```bash
supabase secrets set SMS_GATEWAY_USERNAME=your_gateway_username
supabase secrets set SMS_GATEWAY_PASSWORD=your_gateway_password
supabase secrets set PUBLIC_SITE_URL=https://your-deployed-site
supabase secrets set PUBLIC_BRAND_NAME="Disaster Management LK"
```

Optional:

| Secret | Default |
| --- | --- |
| `SMS_GATEWAY_API_URL` | `https://api.sms-gate.app/3rdparty/v1/message` |

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

Evasion handling: simple character substitution is undone (`m0n3y` → `money`,
`5end` → `send`) and high-signal terms are also matched with all punctuation and
spacing removed, so `b.r.i.b.e` and `o t p` are caught.

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
