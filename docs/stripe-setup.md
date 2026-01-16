# Stripe Setup Guide

Complete guide for configuring Stripe payments for Grove's plant.grove.place signup flow.

---

## Overview

Grove uses Stripe for subscription billing with 4 plans:

| Plan | Monthly | Yearly (15% off) |
|------|---------|------------------|
| Seedling | $8 | $81.60 |
| Sapling | $12 | $122.40 |
| Oak | $25 | $255 |
| Evergreen | $35 | $357 |

---

## Step 1: Create Products in Stripe Dashboard

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products) (use test mode first)
2. Click **"+ Add product"** for each plan:

### Seedling Plan
- **Name:** Seedling Plan
- **Description:** Perfect for personal blogs - 1GB storage, 3 themes
- **Pricing:**
  - Add price: $8.00 USD, Recurring, Monthly
  - Add price: $81.60 USD, Recurring, Yearly

### Sapling Plan
- **Name:** Sapling Plan
- **Description:** For growing communities - 5GB storage, 10 themes
- **Pricing:**
  - Add price: $12.00 USD, Recurring, Monthly
  - Add price: $122.40 USD, Recurring, Yearly

### Oak Plan
- **Name:** Oak Plan
- **Description:** Professional publishing - 20GB storage, customizer, custom domain
- **Pricing:**
  - Add price: $25.00 USD, Recurring, Monthly
  - Add price: $255.00 USD, Recurring, Yearly

### Evergreen Plan
- **Name:** Evergreen Plan
- **Description:** Enterprise features - 100GB storage, custom fonts, priority support
- **Pricing:**
  - Add price: $35.00 USD, Recurring, Monthly
  - Add price: $357.00 USD, Recurring, Yearly

---

## Step 2: Copy Price IDs

After creating products, get the price IDs:

1. Click on each product in Stripe Dashboard
2. In the **Pricing** section, click on each price
3. Copy the **Price ID** (starts with `price_`)

Update `plant/src/lib/server/stripe.ts`:

```typescript
export const STRIPE_PRICES = {
  seedling: {
    monthly: "price_YOUR_SEEDLING_MONTHLY_ID",
    yearly: "price_YOUR_SEEDLING_YEARLY_ID",
  },
  sapling: {
    monthly: "price_YOUR_SAPLING_MONTHLY_ID",
    yearly: "price_YOUR_SAPLING_YEARLY_ID",
  },
  oak: {
    monthly: "price_YOUR_OAK_MONTHLY_ID",
    yearly: "price_YOUR_OAK_YEARLY_ID",
  },
  evergreen: {
    monthly: "price_YOUR_EVERGREEN_MONTHLY_ID",
    yearly: "price_YOUR_EVERGREEN_YEARLY_ID",
  },
} as const;
```

---

## Step 3: Get API Keys

1. Go to [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/test/apikeys)
2. Copy:
   - **Publishable key** (`pk_test_...` or `pk_live_...`)
   - **Secret key** (`sk_test_...` or `sk_live_...`)

> **Important:** Use test keys (`pk_test_`, `sk_test_`) for development. Switch to live keys (`pk_live_`, `sk_live_`) for production.

---

## Step 4: Create Webhook Endpoint

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **"+ Add endpoint"**
3. Configure:
   - **Endpoint URL:** `https://plant.grove.place/api/webhooks/stripe`
   - **Events to send:** Select these events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.paid`
     - `customer.subscription.trial_will_end`
4. Click **"Add endpoint"**
5. Click **"Reveal"** next to **Signing secret**
6. Copy the signing secret (`whsec_...`)

---

## Step 5: Set Environment Variables in Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to: **Workers & Pages → grove-plant → Settings → Environment Variables**
3. Add these variables (for both Preview and Production):

| Variable | Value | Example |
|----------|-------|---------|
| `STRIPE_SECRET_KEY` | Your Stripe secret key | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | `whsec_...` |

4. Click **"Save"**

---

## Step 6: Test the Integration

### Verify API Key Works
```bash
curl -s https://api.stripe.com/v1/account \
  -u "sk_test_YOUR_KEY:" | jq '.email'
```

### Verify Price IDs Exist
```bash
curl -s https://api.stripe.com/v1/prices/price_YOUR_PRICE_ID \
  -u "sk_test_YOUR_KEY:" | jq '.id'
```

### Test Checkout Flow
1. Go to `https://plant.grove.place`
2. Complete the signup flow
3. Select a plan
4. You should be redirected to Stripe Checkout
5. Use test card: `4242 4242 4242 4242` (any future date, any CVC)

---

## Test Cards

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 3220` | 3D Secure authentication |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0341` | Declined (card declined) |

Use any future expiration date and any 3-digit CVC.

---

## Going Live

When ready for production:

1. Switch Stripe Dashboard to **Live mode** (toggle in top-right)
2. Create products/prices in live mode (same as Step 1)
3. Update `stripe.ts` with **live** price IDs
4. Get **live** API keys from Stripe Dashboard
5. Create webhook endpoint with **live** URL
6. Update Cloudflare environment variables with **live** keys

---

## Troubleshooting

### "No such price" Error
- Your `STRIPE_SECRET_KEY` is from a different account than where prices were created
- Make sure API key and price IDs are from the same Stripe account
- Check if you're mixing test and live mode

### Checkout Returns 500
- Check Cloudflare logs for the actual error message
- Verify `STRIPE_SECRET_KEY` is set in Cloudflare Dashboard
- Verify price IDs in `stripe.ts` match your Stripe Dashboard

### Webhook Signature Invalid
- Verify `STRIPE_WEBHOOK_SECRET` matches the signing secret in Stripe Dashboard
- Make sure you're using the secret from the correct webhook endpoint
- Check that the webhook URL is exactly `https://plant.grove.place/api/webhooks/stripe`

### Test Script
Run the diagnostic script:
```bash
export STRIPE_SECRET_KEY="sk_test_..."
node --loader tsx plant/scripts/test-stripe.ts
```

---

## File Reference

| File | Purpose |
|------|---------|
| `plant/src/lib/server/stripe.ts` | Price IDs and Stripe API helpers |
| `plant/src/routes/checkout/+server.ts` | Creates checkout sessions |
| `plant/src/routes/api/webhooks/stripe/+server.ts` | Handles Stripe events |
| `plant/src/routes/success/+page.server.ts` | Handles successful payment redirect |
| `plant/scripts/test-stripe.ts` | Diagnostic script |

---

*Last updated: January 2026*
