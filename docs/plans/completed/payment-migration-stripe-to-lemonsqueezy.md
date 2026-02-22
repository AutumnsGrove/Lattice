> **ARCHIVED:** This migration was planned but never executed. Stripe approval came through in Feb 2026 and Stripe remains the live payment provider. Kept for historical reference.

# Grove Payment Migration Plan: Stripe → Lemon Squeezy

## Executive Summary

This plan migrates Grove's payment infrastructure from Stripe to Lemon Squeezy (LS). The excellent news: **your codebase already has a provider-agnostic payment architecture** in `libs/engine/src/lib/payments/`. This means we implement a new provider rather than ripping out and replacing existing code.

**Key Advantages:**

- No live Stripe transactions exist (clean migration)
- Provider factory already supports `'lemonsqueezy'` type (just needs implementation)
- Database uses `provider_*` naming convention (mostly provider-agnostic)
- Lemon Squeezy handles tax compliance as Merchant of Record

---

## Scope Analysis

### Two Integration Points

| Location       | Type                    | Complexity                                       |
| -------------- | ----------------------- | ------------------------------------------------ |
| `libs/engine/` | Provider abstraction    | Medium - Implement `LemonSqueezyProvider`        |
| `plant/`       | Direct Stripe API calls | Low - Replace with LS SDK or use engine provider |

### Files to Modify/Create

**Create (new files):**

- `libs/engine/src/lib/payments/lemonsqueezy/client.ts` - LS API client
- `libs/engine/src/lib/payments/lemonsqueezy/provider.ts` - PaymentProvider implementation
- `libs/engine/src/lib/payments/lemonsqueezy/index.ts` - Exports
- `libs/engine/migrations/012_lemonsqueezy_columns.sql` - Add LS-specific columns

**Modify (existing files):**

- `libs/engine/src/lib/payments/index.ts` - Import and wire up LS provider
- `plant/src/lib/server/stripe.ts` → Rename to `lemonsqueezy.ts` and rewrite
- `plant/src/routes/checkout/+server.ts` - Use LS checkout
- `plant/src/routes/api/webhooks/stripe/` → Move to `/lemonsqueezy/`
- `plant/wrangler.toml` - Update env var references
- `libs/engine/wrangler.toml` - Update env var references

**Remove (after migration verified):**

- `libs/engine/src/lib/payments/stripe/` (keep initially for reference)
- `plant/package.json` - Remove `stripe` dependency

---

## Phase 1: Foundation Setup

### 1.1 Environment Configuration

Add to `wrangler.toml` vars:

```toml
[vars]
LEMON_SQUEEZY_STORE_ID = "your_store_id"
```

Add as secrets via `wrangler secret put`:

- `LEMON_SQUEEZY_API_KEY`
- `LEMON_SQUEEZY_WEBHOOK_SECRET`

### 1.2 Install SDK

```bash
cd libs/ and apps/ and services/engine && pnpm add @lemonsqueezy/lemonsqueezy.js
cd plant && pnpm add @lemonsqueezy/lemonsqueezy.js
```

### 1.3 Verify nodejs_compat

Both `plant/wrangler.toml` and `libs/engine/wrangler.toml` already have:

```toml
compatibility_flags = ["nodejs_compat"]
```

✅ Already configured

---

## Phase 2: Implement LemonSqueezyProvider

### 2.1 Create Provider Structure

```
libs/engine/src/lib/payments/lemonsqueezy/
├── client.ts      # Low-level LS API wrapper
├── provider.ts    # PaymentProvider implementation
├── types.ts       # LS-specific types (webhook payloads, etc.)
└── index.ts       # Public exports
```

### 2.2 Implement PaymentProvider Interface

The provider must implement these methods from `types.ts`:

**Required (must implement):**

- `syncProduct()` - Create/update products in LS
- `syncPrice()` - Create/update variants in LS
- `archiveProduct()` - Archive products
- `createCheckoutSession()` - Create LS checkout URL
- `getCheckoutSession()` - Retrieve session status
- `getPaymentStatus()` - Check payment status
- `refund()` - Process refunds
- `getSubscription()` - Get subscription details
- `cancelSubscription()` - Cancel subscription
- `resumeSubscription()` - Resume canceled subscription
- `syncCustomer()` - Create/update LS customer
- `getCustomer()` - Get customer details
- `createBillingPortalSession()` - Get customer portal URL
- `handleWebhook()` - Verify and parse webhooks

**Optional (Stripe Connect - not needed for LS):**

- `createConnectAccount()` - N/A for LS
- `getConnectAccount()` - N/A for LS
- `createConnectAccountLink()` - N/A for LS
- `createConnectLoginLink()` - N/A for LS

### 2.3 Key Implementation Notes

**Checkout Creation:**
LS checkouts are created via API and return a URL:

```typescript
const { data } = await createCheckout(storeId, variantId, {
	checkoutData: {
		email: customerEmail,
		custom: { user_id: userId },
	},
	productOptions: {
		redirectUrl: successUrl,
	},
});
return data.data.attributes.url;
```

**Webhook Verification:**
LS uses HMAC-SHA256 with `x-signature` header:

```typescript
const hmac = createHmac("sha256", secret);
hmac.update(rawBody);
const digest = hmac.digest("hex");
return timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
```

**Subscription Status Mapping:**
| Lemon Squeezy | Grove (types.ts) |
|---------------|------------------|
| `on_trial` | `trialing` |
| `active` | `active` |
| `paused` | `paused` |
| `past_due` | `past_due` |
| `unpaid` | `unpaid` |
| `cancelled` | `canceled` |
| `expired` | `canceled` |

---

## Phase 3: Update Plant Checkout Flow

### 3.1 Replace Stripe Config

Rename `plant/src/lib/server/stripe.ts` → `lemonsqueezy.ts`

Create variant ID mapping:

```typescript
export const LS_VARIANTS = {
	seedling: {
		monthly: 123456, // Get from LS dashboard
		yearly: 123457,
	},
	sapling: {
		monthly: 123458,
		yearly: 123459,
	},
	// ... etc
} as const;
```

### 3.2 Update Checkout Route

Replace `plant/src/routes/checkout/+server.ts`:

- Import LS SDK instead of Stripe
- Create checkout with `createCheckout()` from LS SDK
- Pass `onboarding_id` in custom data for webhook correlation

### 3.3 Create LS Webhook Handler

Move and rewrite:
`plant/src/routes/api/webhooks/stripe/+server.ts` → `plant/src/routes/api/webhooks/lemonsqueezy/+server.ts`

Handle these events:

- `subscription_created` - Mark onboarding payment complete, create tenant
- `subscription_payment_failed` - Log/notify
- `subscription_cancelled` - Update onboarding status

---

## Phase 4: Database Migration

### 4.1 Add LS Columns to user_onboarding

Create `migrations/012_lemonsqueezy_columns.sql`:

```sql
-- Add Lemon Squeezy columns alongside existing Stripe columns
-- This allows gradual migration without breaking existing flows

ALTER TABLE user_onboarding ADD COLUMN lemonsqueezy_customer_id TEXT;
ALTER TABLE user_onboarding ADD COLUMN lemonsqueezy_subscription_id TEXT;
ALTER TABLE user_onboarding ADD COLUMN lemonsqueezy_order_id TEXT;

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_ls_subscription
  ON user_onboarding(lemonsqueezy_subscription_id)
  WHERE lemonsqueezy_subscription_id IS NOT NULL;
```

### 4.2 Shop Tables (Already Provider-Agnostic)

The `007_shop_payments.sql` tables already use generic naming:

- `provider_product_id` ✅
- `provider_price_id` ✅
- `provider_customer_id` ✅
- `provider_subscription_id` ✅
- `provider_payment_id` ✅

No changes needed!

---

## Phase 5: Wire Up Provider Factory

### 5.1 Update index.ts

```typescript
// libs/engine/src/lib/payments/index.ts

import { createStripeProvider } from "./stripe/index.js";
import { createLemonSqueezyProvider } from "./lemonsqueezy/index.js"; // NEW

export function createPaymentProvider(
	type: ProviderType,
	config: PaymentProviderConfig,
): PaymentProvider {
	switch (type) {
		case "stripe":
			return createStripeProvider(config);
		case "lemonsqueezy":
			return createLemonSqueezyProvider(config); // NEW
		case "paddle":
			throw new Error("Paddle provider not yet implemented");
		default:
			throw new Error(`Unknown payment provider: ${type}`);
	}
}
```

### 5.2 Add LS Exports

```typescript
// Add to re-exports
export {
	LemonSqueezyClient,
	LemonSqueezyProvider,
	createLemonSqueezyProvider,
} from "./lemonsqueezy/index.js";
```

---

## Phase 6: Lemon Squeezy Dashboard Setup

### 6.1 Products to Create

| Product   | Monthly | Yearly            | Notes        |
| --------- | ------- | ----------------- | ------------ |
| Seedling  | $8/mo   | ~$81/yr (15% off) | Entry tier   |
| Sapling   | $12/mo  | ~$122/yr          | Mid tier     |
| Oak       | $25/mo  | ~$255/yr          | BYOD domain  |
| Evergreen | $35/mo  | ~$357/yr          | Full service |

### 6.2 Webhook Configuration

URL: `https://plant.grove.place/api/webhooks/lemonsqueezy`

Events to subscribe:

- ✅ `subscription_created`
- ✅ `subscription_updated`
- ✅ `subscription_cancelled`
- ✅ `subscription_resumed`
- ✅ `subscription_expired`
- ✅ `subscription_paused`
- ✅ `subscription_unpaused`
- ✅ `subscription_payment_success`
- ✅ `subscription_payment_failed`
- ✅ `subscription_payment_recovered`

---

## Phase 7: Testing

### 7.1 Local Testing Setup

```bash
# Expose local webhook endpoint
cloudflared tunnel --url http://localhost:5173
```

Update LS dashboard webhook URL temporarily to tunnel URL.

### 7.2 Test Scenarios

1. **New subscription** - Create checkout → complete with test card → verify webhook received → verify tenant created
2. **Subscription update** - Change plan via API → verify webhook
3. **Cancellation** - Cancel subscription → verify status update
4. **Payment failure** - Simulate failed payment in LS test mode
5. **Webhook security** - Send invalid signature → verify rejection

### 7.3 Test Cards (LS uses Stripe under the hood)

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

---

## Phase 8: Cleanup (Post-Migration)

After verifying LS integration works:

### 8.1 Remove Stripe Code

```bash
# Remove Stripe dependency
cd plant && pnpm remove stripe

# Remove Stripe provider (optional - keep for reference)
# rm -rf libs/engine/src/lib/payments/stripe/
```

### 8.2 Remove Stripe Environment Variables

From Cloudflare Dashboard secrets:

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_*_PRICE_MONTHLY`
- `STRIPE_*_PRICE_YEARLY`

### 8.3 Update Documentation

- Update `AGENT.md` to reference Lemon Squeezy instead of Stripe
- Archive `docs/STRIPE-SETUP.md` or replace with LS setup docs

---

## Implementation Order

1. **Foundation** (Phase 1) - Install SDK, configure env vars
2. **Provider Implementation** (Phase 2) - Create LemonSqueezyProvider
3. **Plant Checkout** (Phase 3) - Update checkout flow
4. **Database** (Phase 4) - Run migration for LS columns
5. **Wire Up** (Phase 5) - Connect provider to factory
6. **Dashboard** (Phase 6) - Create products in LS
7. **Test** (Phase 7) - End-to-end testing
8. **Cleanup** (Phase 8) - Remove Stripe code

---

## Risk Mitigation

| Risk                                 | Mitigation                                        |
| ------------------------------------ | ------------------------------------------------- |
| Webhook signature verification fails | Test locally with ngrok/cloudflared first         |
| LS API differs from expectations     | Reference official SDK, not just docs             |
| Database migration breaks queries    | Add columns, don't remove existing ones initially |
| Checkout flow breaks                 | Keep Stripe code until LS verified                |

---

## Estimated Effort

| Phase   | Tasks                               | Complexity   |
| ------- | ----------------------------------- | ------------ |
| Phase 1 | Environment setup                   | Low          |
| Phase 2 | LemonSqueezyProvider implementation | Medium-High  |
| Phase 3 | Plant checkout updates              | Medium       |
| Phase 4 | Database migration                  | Low          |
| Phase 5 | Factory wiring                      | Low          |
| Phase 6 | Dashboard setup                     | Low (manual) |
| Phase 7 | Testing                             | Medium       |
| Phase 8 | Cleanup                             | Low          |

---

## Go-Live Checklist

- [ ] LS SDK installed in both `libs/ and apps/ and services/engine` and `plant`
- [ ] Environment variables configured (API key, store ID, webhook secret)
- [ ] LemonSqueezyProvider fully implemented and tested
- [ ] Plant checkout flow using LS
- [ ] Webhook handler deployed and verified
- [ ] Products created in LS dashboard with correct pricing
- [ ] Variant IDs updated in codebase
- [ ] Database migration applied
- [ ] WAF rule created (if webhooks blocked)
- [ ] Test mode purchases completed successfully
- [ ] LS store switched to live mode
- [ ] First live transaction verified
- [ ] Stripe code removed or archived

---

_Plan created: 2026-01-13_
_Ready for implementation upon approval_
