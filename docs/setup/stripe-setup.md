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

**Secrets Required: Only 2!**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Price IDs are hardcoded in code (they're not secrets).

---

## Step 1: Get Your Price IDs

Products should already exist in your Stripe Dashboard.

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click on each product (Seedling, Sapling, Oak, Evergreen)
3. In the **Pricing** section, click on each price
4. Copy the **Price ID** (starts with `price_`)

You need 8 price IDs total:
- Seedling Monthly + Yearly
- Sapling Monthly + Yearly
- Oak Monthly + Yearly
- Evergreen Monthly + Yearly

---

## Step 2: Update Price IDs in Code

Edit `packages/plant/src/lib/server/stripe.ts`:

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

**Note:** Price IDs are NOT secrets. They're visible in checkout URLs and safe to commit.

---

## Step 3: Get API Keys

1. Go to [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys)
2. Copy your **Secret key** (`sk_live_...` for production, `sk_test_...` for testing)

> **Important:** Use test keys for development, live keys for production.

---

## Step 4: Create Webhook Endpoint

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"+ Add endpoint"**
3. Configure:
   - **Endpoint URL:** `https://plant.grove.place/api/webhooks/stripe`
   - **Events to send:** Select these events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.trial_will_end`
4. Click **"Add endpoint"**
5. Click **"Reveal"** next to **Signing secret**
6. Copy the signing secret (`whsec_...`)

---

## Step 5: Set Environment Variables in Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to: **Workers & Pages → grove-plant → Settings → Variables and Secrets**
3. Add these secrets:

| Variable | Value | Type |
|----------|-------|------|
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` | Secret |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Secret |

4. Click **"Save"**

**That's it! Only 2 secrets needed.**

---

## Step 6: Enable Stripe Tax (Recommended)

1. Go to [Stripe Dashboard → Settings → Tax](https://dashboard.stripe.com/settings/tax)
2. Enable **Stripe Tax**
3. Set your business address (Georgia, USA)
4. Tax is automatically calculated at checkout

**Georgia Note:** Georgia does not tax SaaS products. Stripe Tax will only collect tax for customers in states that do tax SaaS.

---

## Step 7: Test the Integration

### Test Checkout Flow
1. Deploy to preview or use local dev
2. Go through the signup flow
3. Select a plan
4. Use test card: `4242 4242 4242 4242` (any future date, any CVC)
5. Verify tenant is created after payment

### Test Cards

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0025 0000 3155` | 3D Secure authentication |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0341` | Declined (card declined) |

Use any future expiration date and any 3-digit CVC.

### Verify Webhook
Check Stripe Dashboard → Developers → Webhooks → [Your endpoint] to see webhook delivery status.

---

## Comping Friends

To comp a friend (100% free subscription):

1. Go to Stripe Dashboard → Products → Coupons
2. Create a coupon:
   - **Percent off:** 100%
   - **Duration:** Forever
   - **Max redemptions:** 1
3. Share the coupon code with your friend
4. They apply it at checkout

---

## Troubleshooting

### "No such price" Error
- Verify price IDs in `stripe.ts` match your Stripe Dashboard
- Make sure you're using the correct mode (test vs live)

### Webhook Signature Invalid
- Verify `STRIPE_WEBHOOK_SECRET` matches the signing secret in Stripe Dashboard
- Make sure you copied the secret from the correct webhook endpoint

### Checkout Returns 500
- Check Cloudflare logs for the actual error
- Verify `STRIPE_SECRET_KEY` is set in Cloudflare Dashboard

### Test Locally with Stripe CLI
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local dev server
stripe listen --forward-to localhost:5173/api/webhooks/stripe

# Use the webhook signing secret it provides for local testing
```

---

## File Reference

| File | Purpose |
|------|---------|
| `packages/plant/src/lib/server/stripe.ts` | Price IDs and Stripe API helpers |
| `packages/plant/src/routes/checkout/+server.ts` | Creates checkout sessions |
| `packages/plant/src/routes/api/webhooks/stripe/+server.ts` | Handles Stripe webhook events |
| `packages/plant/src/routes/success/+page.server.ts` | Handles successful payment redirect |

---

*Last updated: February 2026*
