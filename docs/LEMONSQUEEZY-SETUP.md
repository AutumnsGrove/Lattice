# Lemon Squeezy Setup Guide

> **Status:** Live as of January 2026
> **Migration Guide:** See `grove-payment-migration.md` for the full migration story

Grove uses Lemon Squeezy as our payment processor and Merchant of Record (MoR). This means LS handles all tax collection, VAT compliance, fraud protection, and payment disputes.

---

## Quick Reference

### Environment Variables (Cloudflare Pages: grove-plant)

```bash
# API Credentials
LEMON_SQUEEZY_API_KEY          # From LS Dashboard → Settings → API
LEMON_SQUEEZY_STORE_ID         # From LS Dashboard URL or Settings → Stores
LEMON_SQUEEZY_WEBHOOK_SECRET   # Generated when creating webhook

# Variant IDs (one per plan/billing combo)
LEMON_SQUEEZY_SEEDLING_VARIANT_MONTHLY
LEMON_SQUEEZY_SEEDLING_VARIANT_YEARLY
LEMON_SQUEEZY_SAPLING_VARIANT_MONTHLY
LEMON_SQUEEZY_SAPLING_VARIANT_YEARLY
LEMON_SQUEEZY_OAK_VARIANT_MONTHLY
LEMON_SQUEEZY_OAK_VARIANT_YEARLY
LEMON_SQUEEZY_EVERGREEN_VARIANT_MONTHLY
LEMON_SQUEEZY_EVERGREEN_VARIANT_YEARLY
```

### Current Variant IDs (Production)

| Plan | Monthly | Yearly |
|------|---------|--------|
| Seedling | 1215927 | 1215925 |
| Sapling | 1215935 | 1215936 |
| Oak | 1215938 | 1215939 |
| Evergreen | 1215944 | 1215946 |

### Pricing

| Plan | Monthly | Yearly (15% off) |
|------|---------|------------------|
| Seedling | $8/mo | $81.60/yr (~$6.80/mo) |
| Sapling | $12/mo | $122.40/yr (~$10.20/mo) |
| Oak | $25/mo | $255/yr (~$21.25/mo) |
| Evergreen | $35/mo | $357/yr (~$29.75/mo) |

---

## Architecture

### How Checkout Works

1. User selects plan on `/plans`
2. Frontend POSTs to `/checkout`
3. Server creates LS checkout session via API
4. User redirected to LS-hosted checkout page (or `payments.grove.place` if custom domain configured)
5. After payment, user redirected to `/success?checkout_id={ID}`
6. LS sends `subscription_created` webhook
7. Webhook handler creates tenant in database

### Key Files

| File | Purpose |
|------|---------|
| `plant/src/lib/server/lemonsqueezy.ts` | SDK wrapper, checkout creation, webhook verification |
| `plant/src/routes/checkout/+server.ts` | Creates checkout sessions |
| `plant/src/routes/api/webhooks/lemonsqueezy/+server.ts` | Handles all LS webhook events |
| `plant/src/routes/success/+page.server.ts` | Post-checkout redirect handler |
| `packages/engine/src/lib/payments/lemonsqueezy/` | Provider abstraction (for shop features) |

### Database Tables

The `user_onboarding` table has these LS columns:
- `lemonsqueezy_customer_id`
- `lemonsqueezy_subscription_id`
- `lemonsqueezy_checkout_id`

The `platform_billing` table uses generic columns:
- `provider_customer_id` (works for both Stripe and LS)
- `provider_subscription_id`

---

## Webhook Events

Webhook URL: `https://plant.grove.place/api/webhooks/lemonsqueezy`

### Events We Handle

| Event | Action |
|-------|--------|
| `subscription_created` | Creates tenant, updates onboarding |
| `subscription_updated` | Updates billing status |
| `subscription_plan_changed` | Updates billing status |
| `subscription_cancelled` | Marks subscription cancelled |
| `subscription_expired` | Marks subscription expired |
| `subscription_paused` | Marks subscription paused |
| `subscription_unpaused` | Resumes subscription |
| `subscription_resumed` | Resumes subscription |
| `subscription_payment_success` | Updates billing, sends receipt email |
| `subscription_payment_recovered` | Updates billing, sends receipt email |
| `subscription_payment_failed` | Marks past_due, sends failure email |
| `order_created` | Logged (for one-time purchases) |

### Webhook Security

- Signature verification using HMAC-SHA256
- Constant-time comparison to prevent timing attacks
- Idempotency via `webhook_events` table (deduplication by event ID)

---

## Common Tasks

### Adding a New Plan

1. Create product in LS Dashboard
2. Create monthly + yearly variants
3. Note the variant IDs
4. Add environment variables:
   ```bash
   wrangler pages secret put LEMON_SQUEEZY_NEWPLAN_VARIANT_MONTHLY --project=grove-plant
   wrangler pages secret put LEMON_SQUEEZY_NEWPLAN_VARIANT_YEARLY --project=grove-plant
   ```
5. Update `plant/src/lib/server/lemonsqueezy.ts` to include new plan in `getLemonSqueezyVariants()`
6. Update tier config in `packages/engine/src/lib/config/tiers.ts`

### Changing Prices

1. Update in LS Dashboard (create new variant or update existing)
2. If variant ID changed, update the environment variable
3. Update tier config to reflect new prices in UI

### Rotating Webhook Secret

1. Generate new secret: `openssl rand -hex 16`
2. Update in LS Dashboard (Settings → Webhooks → Edit)
3. Update in Cloudflare:
   ```bash
   echo "NEW_SECRET" | wrangler pages secret put LEMON_SQUEEZY_WEBHOOK_SECRET --project=grove-plant
   ```

### Testing Webhooks Locally

1. Use LS test mode
2. Use a tunnel like `ngrok` or `cloudflared tunnel`
3. Point webhook to your tunnel URL

---

## Lemon Squeezy Dashboard Links

- **Products:** https://app.lemonsqueezy.com/products
- **Orders:** https://app.lemonsqueezy.com/orders
- **Subscriptions:** https://app.lemonsqueezy.com/subscriptions
- **Webhooks:** https://app.lemonsqueezy.com/settings/webhooks
- **API Keys:** https://app.lemonsqueezy.com/settings/api

---

## Why Lemon Squeezy?

Grove chose LS over Stripe because:

1. **Merchant of Record** — LS handles all tax compliance, VAT, and sales tax globally
2. **Simpler Integration** — No need to manage tax jurisdictions ourselves
3. **Fraud Protection** — Built-in, no additional setup
4. **Better for Indies** — Designed for solo founders and small teams
5. **Refund Policy** — We offer full refunds instead of trials, and LS makes this easy

---

## Troubleshooting

### "Variant not configured" error
- Check that all `LEMON_SQUEEZY_*_VARIANT_*` env vars are set
- Verify variant IDs match LS Dashboard

### Webhook not firing
- Check webhook URL is correct in LS Dashboard
- Verify signing secret matches
- Check LS Dashboard → Webhooks → Logs for delivery status

### Tenant not created after payment
- Check webhook logs in LS Dashboard
- Check Cloudflare Pages logs for errors
- Verify `onboarding_id` is being passed in checkout custom_data

### Signature verification failing
- Ensure webhook secret is exactly 32 characters
- Check for whitespace in the secret
- Verify you're using the raw request body for verification
