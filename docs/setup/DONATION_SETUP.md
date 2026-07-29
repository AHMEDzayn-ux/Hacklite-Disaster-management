# Donation System Setup Guide

## ✅ Complete! All Components Created

Your comprehensive donation management system has been successfully implemented with:

### Components Created:

1. **DonationCounter.jsx** - Animated donation total with progress bar
2. **DonationMotivation.jsx** - Rotating motivational slogans
3. **DonationForm.jsx** - Multi-step Stripe payment form
4. **RecentDonations.jsx** - Live donation ticker and list
5. **DonationList.jsx** - Full transparency ledger with filters
6. **Donations.jsx** - Main page integrating all components

### Database Schema:

- **donations-schema.sql** - Complete Supabase schema with RLS policies

### State Management:

- **useDonationStore** - Zustand store with real-time subscriptions

---

## 🚀 Setup Instructions

### Step 1: Configure Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `src/config/donations-schema.sql`
5. Click **Run** to create the donations table

### Step 2: Get Your Stripe API Keys

1. Create a Stripe account at https://stripe.com (or log in)
2. Go to **Developers → API Keys**
3. Copy your **Publishable Key** (starts with `pk_test_` for testing)
4. Copy your **Secret Key** (starts with `sk_test_` for testing)

### Step 3: Configure Environment Variables

Create/update your `.env` file in the project root:

```env
# Existing Supabase config
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Add Stripe keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

**IMPORTANT:** The Secret Key should NEVER be in your frontend code. You'll need it for the backend endpoint (see Step 4).

### Step 4: Payment Intent Endpoint - ✅ Already Implemented

This used to be a manual step; it's now implemented at `supabase/functions/create-payment-intent/index.ts`. It differs from the template that used to be here in one deliberate way: it calls Stripe's REST API directly via `fetch` instead of the `stripe` npm/Deno package, matching the rest of this codebase's "no heavy SDK, just fetch what's needed" style (the same approach `sms-report` uses for Gemini). It also inserts the `donations` row itself (as `pending`) - the browser never writes to `donations` directly, which is what closes the RLS hole described in `AI_AGENTS_SETUP.md`.

Deploy it (no JWT verification, since donors have no Supabase session):

```bash
supabase functions deploy create-payment-intent --no-verify-jwt
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key
```

`DonationForm.jsx` already calls this via `supabase.functions.invoke('create-payment-intent', ...)` - no manual endpoint wiring needed.

### Step 5: Stripe Webhook - ✅ Already Implemented

Implemented at `supabase/functions/stripe-webhook/index.ts` (signature verification via Web Crypto `crypto.subtle`, no `stripe` package needed).

1. In Stripe Dashboard, go to **Developers → Webhooks**
2. Add endpoint: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the webhook signing secret and set it:

```bash
supabase functions deploy stripe-webhook --no-verify-jwt
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

For local testing, use the Stripe CLI: `stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook`.

---

## 🧪 Testing

### Test Mode (Development)

Use Stripe test cards:

- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **Requires Auth:** 4000 0025 0000 3155

Any future expiry date and any 3-digit CVC works.

### Verify Setup:

1. Start your dev server: `npm run dev`
2. Navigate to `/donations`
3. You should see:
   - Animated donation counter
   - Rotating motivational messages
   - Payment form with Stripe elements
   - Recent donations ticker
   - Transparency report tab

---

## 📋 Features Included

### ✅ Frontend Features:

- 💳 Stripe payment integration
- 📊 Real-time donation counter with animations
- 🎯 Progress bar to fundraising goal
- 💬 Rotating motivational slogans (12 messages)
- 📝 Multi-step donation form (Amount → Info → Payment)
- 🎁 Preset donation amounts ($10, $25, $50, $100, $250, $500)
- 💰 Custom amount input
- 🙏 Anonymous donation option
- 🎯 Purpose selection (8 categories)
- 📱 Live donation ticker
- 🎉 Success modal with confetti effect
- 📊 Complete transparency ledger
- 🔍 Advanced filtering and search
- 📈 Donation statistics dashboard
- 🔒 Security indicators and trust badges

### ✅ Backend Features:

- 🗄️ Supabase database with RLS
- 🔄 Real-time subscriptions
- 💾 Automatic caching
- 📊 Statistical functions
- 🔐 Payment verification via Stripe
- 📧 Email receipts (via Stripe)

### ✅ Transparency Features:

- 📊 Public donation ledger
- 💵 Real-time total raised counter
- 👥 Donor names (with anonymous option)
- 🎯 Purpose tracking
- 💳 Stripe Payment ID verification
- 📈 Statistics (total, average, max, count)
- 🔍 Searchable and filterable

---

## 🎨 Customization

### Change Fundraising Goal:

In `Donations.jsx`, update:

```javascript
<DonationCounter goalAmount={200000} /> // Change to your goal
```

### Modify Donation Purposes:

In `DonationForm.jsx`, edit the `DONATION_PURPOSES` array (line ~10)

### Add More Slogans:

In `DonationMotivation.jsx`, add to the `motivationalMessages` array

### Change Preset Amounts:

In `DonationForm.jsx`, modify `PRESET_AMOUNTS` array (line ~8)

---

## 🔒 Security Checklist

- [ ] ✅ Never commit `.env` file
- [ ] ✅ Use Stripe test keys for development
- [ ] ✅ Secret key only on backend (never frontend)
- [ ] ✅ Enable Stripe webhook signature verification
- [ ] ✅ Use HTTPS in production
- [ ] ✅ Enable Supabase RLS policies
- [ ] ✅ Validate amounts server-side
- [ ] ✅ Rate limit donation endpoints

---

## 🚀 Go Live Checklist

When ready for production:

1. **Switch to Live Stripe Keys:**

   - Replace `pk_test_*` with `pk_live_*`
   - Replace `sk_test_*` with `sk_live_*`

2. **Activate Stripe Account:**

   - Complete Stripe account verification
   - Add bank account for payouts

3. **Update Webhook URL:**

   - Point to production endpoint
   - Test webhook delivery

4. **Legal Compliance:**

   - Add terms and conditions
   - Privacy policy for donor data
   - Tax receipt generation (if applicable)
   - Charity registration verification

5. **Testing:**
   - Test full donation flow
   - Verify email receipts
   - Check database updates
   - Test refunds

---

## 📞 Support

For issues:

- **Stripe:** https://stripe.com/docs
- **Supabase:** https://supabase.com/docs
- **React Stripe.js:** https://stripe.com/docs/stripe-js/react

---

## 🎉 You're Ready!

The complete donation system is now implemented. Just:

1. Run the SQL schema in Supabase
2. Add your Stripe keys to `.env`
3. Create the payment intent endpoint
4. Start accepting donations! 💝
