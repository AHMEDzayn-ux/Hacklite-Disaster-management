-- Migration: close a real security hole - donations RLS currently allows any
-- anonymous client to INSERT or UPDATE a donation row directly (including
-- setting stripe_payment_status = 'succeeded'), completely bypassing Stripe.
-- All writes now go exclusively through the create-payment-intent and
-- stripe-webhook edge functions using the service-role key. Public SELECT is
-- kept for the transparency ledger.

DROP POLICY IF EXISTS "Allow public insert" ON donations;
DROP POLICY IF EXISTS "Allow status updates" ON donations;

-- "Allow public read access" is intentionally left in place - the donation
-- ledger is meant to be publicly auditable.

COMMENT ON TABLE donations IS 'Public SELECT for transparency. All INSERT/UPDATE happens via the create-payment-intent (creates the row as pending, tied to a real Stripe PaymentIntent) and stripe-webhook (flips status on payment_intent.succeeded/failed) edge functions only - no client role can write directly.';
