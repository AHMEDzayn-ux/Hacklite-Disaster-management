# Stripe Payment Setup Guide

This guide will help you set up Stripe payments for your Donation Management System.

## Prerequisites

- A Stripe account (sign up at https://stripe.com)
- Node.js backend or serverless function capability
- Basic understanding of API endpoints

## Step 1: Create a Stripe Account

1. Go to https://stripe.com and sign up for an account
2. Complete the account verification process
3. Navigate to the Developers section in your Stripe Dashboard

## Step 2: Get Your API Keys

1. In the Stripe Dashboard, go to **Developers** → **API Keys**
2. You'll find two types of keys:
   - **Publishable Key** (starts with `pk_test_` for test mode)
   - **Secret Key** (starts with `sk_test_` for test mode)

⚠️ **IMPORTANT**: Never expose your Secret Key in client-side code!

## Step 3: Configure Environment Variables

Create a `.env` file in your project root (if not already present):

```env
# Frontend - Publishable Key (safe to expose)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

# Backend - Secret Key (NEVER expose this!)
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
```

## Step 4: Create Backend Payment Intent Endpoint

You need to create a backend endpoint at `/api/create-payment-intent` to securely process payments.

### Option A: Using Netlify Functions (Recommended for this project)

1. Create a `netlify/functions` directory in your project root
2. Install Stripe SDK:

```bash
npm install stripe
```

3. Create `netlify/functions/create-payment-intent.js`:

```javascript
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { amount, currency, email, metadata } = JSON.parse(event.body);

    // Validate input
    if (!amount || amount < 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid amount" }),
      };
    }

    // Currency conversion for Stripe (amounts must be in smallest unit)
    // For LKR, INR, JPY - no conversion needed (already in smallest unit)
    // For USD, EUR, GBP - multiply by 100 (dollars to cents)
    const currencyLowerCase = currency.toLowerCase();
    const zeroDecimalCurrencies = [
      "lkr",
      "jpy",
      "krw",
      "bif",
      "clp",
      "djf",
      "gnf",
      "idr",
      "isk",
      "pyg",
      "rwf",
      "ugx",
      "vnd",
      "vuv",
      "xaf",
      "xof",
      "xpf",
    ];

    const stripeAmount = zeroDecimalCurrencies.includes(currencyLowerCase)
      ? Math.round(amount)
      : Math.round(amount * 100);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: currencyLowerCase,
      receipt_email: email,
      metadata: metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
    };
  } catch (error) {
    console.error("Stripe error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Failed to create payment intent",
      }),
    };
  }
};
```

4. Update your `netlify.toml`:

```toml
[build]
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

### Option B: Using Vercel Functions

1. Create a `api` directory in your project root
2. Install Stripe SDK: `npm install stripe`
3. Create `api/create-payment-intent.js`:

```javascript
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, currency, email, metadata } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const currencyLowerCase = currency.toLowerCase();
    const zeroDecimalCurrencies = [
      "lkr",
      "jpy",
      "krw",
      "bif",
      "clp",
      "djf",
      "gnf",
      "idr",
      "isk",
      "pyg",
      "rwf",
      "ugx",
      "vnd",
      "vuv",
      "xaf",
      "xof",
      "xpf",
    ];

    const stripeAmount = zeroDecimalCurrencies.includes(currencyLowerCase)
      ? Math.round(amount)
      : Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: currencyLowerCase,
      receipt_email: email,
      metadata: metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ error: error.message });
  }
}
```

### Option C: Using Express.js Backend

```javascript
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(express.json());

app.post("/api/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency, email, metadata } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const currencyLowerCase = currency.toLowerCase();
    const zeroDecimalCurrencies = [
      "lkr",
      "jpy",
      "krw",
      "bif",
      "clp",
      "djf",
      "gnf",
      "idr",
      "isk",
      "pyg",
      "rwf",
      "ugx",
      "vnd",
      "vuv",
      "xaf",
      "xof",
      "xpf",
    ];

    const stripeAmount = zeroDecimalCurrencies.includes(currencyLowerCase)
      ? Math.round(amount)
      : Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: currencyLowerCase,
      receipt_email: email,
      metadata: metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log("Server running on port 3001"));
```

## Step 5: Enable International Payments & Currency Support

1. In Stripe Dashboard, go to **Settings** → **Payment Methods**
2. Enable payment methods you want to support:

   - Credit/Debit Cards (Visa, Mastercard, Amex)
   - Digital Wallets (Apple Pay, Google Pay)
   - Local payment methods (if needed)

3. For multi-currency support:
   - Go to **Settings** → **Business settings** → **Customer payments**
   - Enable **International payments**
   - Add supported currencies (LKR, USD, EUR, GBP)

⚠️ **Note**: LKR (Sri Lankan Rupee) support requires:

- Business account verification
- Local bank account in Sri Lanka (for payouts)
- Contact Stripe support to enable LKR if not automatically available

## Step 6: Test Your Integration

1. Use Stripe test cards for testing:

   - **Success**: `4242 4242 4242 4242`
   - **Declined**: `4000 0000 0000 0002`
   - **Requires Authentication**: `4000 0025 0000 3155`
   - Use any future expiry date and any 3-digit CVC

2. Test with different currencies to ensure proper conversion

3. Check test payments in Stripe Dashboard under **Developers** → **Events**

## Step 7: Go Live (Production)

1. Complete Stripe account verification
2. Switch to Live mode in Stripe Dashboard
3. Get your **Live API Keys** (starting with `pk_live_` and `sk_live_`)
4. Update your production environment variables:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
```

5. Test with small real transactions first

## Security Best Practices

✅ **DO**:

- Keep your Secret Key secure and never expose it
- Use HTTPS for all transactions
- Validate amounts on the backend
- Log all payment attempts
- Handle errors gracefully

❌ **DON'T**:

- Never commit API keys to version control
- Don't trust amount/currency from client-side only
- Don't store card details yourself (let Stripe handle it)

## Troubleshooting

### "Payment Failed" Error

- Check that your backend endpoint is running
- Verify API keys are correct
- Check browser console for detailed errors

### "Currency not supported" Error

- Verify currency is enabled in your Stripe account
- For LKR, contact Stripe support

### CORS Errors

- Ensure your backend allows requests from your frontend domain
- Add proper CORS headers in your serverless function

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Payment Intents API](https://stripe.com/docs/api/payment_intents)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Supported Currencies](https://stripe.com/docs/currencies)

## Support

For Stripe-specific issues:

- Visit [Stripe Support](https://support.stripe.com)
- Check [Stripe Status Page](https://status.stripe.com)

For project-specific issues:

- Check the donation form implementation in `src/components/DonationForm.jsx`
- Review the backend endpoint configuration
