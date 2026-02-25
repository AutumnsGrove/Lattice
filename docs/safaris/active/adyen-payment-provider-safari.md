# Adyen Payment Provider Safari — Should Grove Switch from Stripe?

> Can a payment provider built for Uber and Spotify serve an indie tea shop for queer creators?
> **Aesthetic principle**: Honest assessment over hopeful migration
> **Scope**: Platform overview, pricing, API/DX, subscriptions, small-biz fit, compliance, Grove integration

---

## Context: Where Grove Stands Today

Grove currently runs on **Stripe** for payment processing. There was a previous plan to migrate to LemonSqueezy (documented in `docs/plans/infra/completed/grove-payment-migration.md`), but that migration was **never executed** — Stripe approval came through in Feb 2026 and Stripe remains the live provider.

### Current Payment Architecture

| Layer | File | Role |
|-------|------|------|
| **PaymentProvider Interface** | `libs/engine/src/lib/payments/types.ts` | Full abstract interface: products, checkout, payments, subscriptions, customers, webhooks, Connect |
| **Provider Factory** | `libs/engine/src/lib/payments/index.ts` | `createPaymentProvider('stripe' | 'paddle', config)` — pluggable |
| **Stripe Implementation** | `libs/engine/src/lib/payments/stripe/provider.ts` (20KB) | Full `PaymentProvider` implementation for Stripe |
| **Stripe Client** | `libs/engine/src/lib/payments/stripe/client.ts` (11KB) | Low-level Stripe API wrapper |
| **Stripe Checkout** | `apps/plant/src/lib/server/stripe.ts` | Platform-level checkout sessions, webhook verification, billing portal |
| **Billing Abstraction** | `libs/engine/src/lib/server/billing.ts` | Provider-agnostic billing checks via `platform_billing` table |
| **Warden Stripe** | `libs/engine/src/lib/warden/services/stripe.ts` | Read-only Stripe access (customers, subscriptions, invoices) |
| **Tier Config** | `libs/engine/src/lib/config/tiers.ts` | Unified tier definitions (free → seedling → sapling → oak → evergreen) |
| **Heartwood Subscriptions** | `services/heartwood/src/routes/subscription.ts` | User subscription management, post limits |
| **Checkout URLs** | `libs/engine/src/lib/grafts/pricing/checkout.ts` | LemonSqueezy checkout URL generation (legacy, may be unused) |

**Key abstraction**: Grove has a complete `PaymentProvider` interface with a factory pattern. Adding a new provider means implementing `syncProduct()`, `createCheckoutSession()`, `getSubscription()`, `cancelSubscription()`, `syncCustomer()`, `createBillingPortalSession()`, `handleWebhook()`, and more. The database uses generic `provider_*` columns throughout (`provider_customer_id`, `provider_subscription_id`, `provider_product_id`, etc.), making it truly provider-agnostic.

**The factory already has a slot for Paddle** and could trivially add `"adyen"` as a type — the question is whether Adyen can fulfill the interface contract (spoiler: it can't fully, since it lacks billing portal and subscription management).

### Grove's Transaction Profile

- **Tiers**: Free ($0), Seedling ($8/mo), Sapling ($12/mo), Oak ($25/mo), Evergreen ($35/mo)
- **Billing**: Monthly and yearly subscriptions
- **Volume**: Early-stage indie SaaS — likely fewer than 100 paying subscribers currently
- **Revenue per transaction**: $8–$35/month range
- **Target audience**: Queer creators, indie writers, small bloggers

---

## 1. Company & Platform Overview

**Character**: *A sleek corporate tower in Amsterdam, built for companies that process millions. The elevator doesn't stop at floors below 10.*

### What Adyen IS

- Founded 2006 in Amsterdam, Netherlands
- Public company (AMS: ADYEN), market cap ~€40B+
- Processes payments for **Uber, Spotify, eBay, McDonald's, Microsoft**
- "Unified commerce" platform — online, in-store, mobile, all in one
- Supports 250+ payment methods globally
- Built-in acquiring (they ARE the payment processor, not a gateway)

### What Adyen is NOT

- A startup-friendly, self-serve platform
- A "sign up and start accepting payments in 5 minutes" service
- A subscription billing engine
- A platform optimized for low-volume merchants

### Verdict: 🔴 Barren for Grove's Size

Adyen is genuinely impressive technology — but it's built for companies processing millions per month. Every signal points to enterprise-first, enterprise-always.

---

## 2. Pricing & Fee Structure

**Character**: *Cheaper per transaction at scale, but the cover charge to get in the door is steep.*

### Adyen's Interchange++ Model

Every transaction has three cost components:

```
Total = Interchange Fee + Scheme Fee + Adyen Markup
         (card issuer)    (Visa/MC)    (€0.13 + 0.60%)
```

**Example for a $8/mo Seedling subscription (US Visa debit):**
- Interchange: ~1.05% (~$0.08)
- Scheme fee: ~0.13% (~$0.01)
- Adyen markup: $0.13 + 0.60% (~$0.05)
- **Total: ~$0.27 per $8 transaction (3.4%)**

**Stripe comparison for the same transaction:**
- Stripe: 2.9% + $0.30 = ~$0.53
- Adyen: ~$0.27

Wait — Adyen is cheaper per transaction? Yes, **but**...

### The Minimum Monthly Invoice

| | Stripe | Adyen |
|---|---|---|
| Monthly minimum | **$0** | **$120 minimum** (some sources: €1,000) |
| Setup fee | $0 | $0 (but requires sales team) |
| Monthly fee | $0 | $0 (but minimum invoice) |

**What the minimum means**: If your transaction fees don't add up to $120/month, you pay $120 anyway. At Grove's current $8–$35/subscription prices:
- To generate $120 in Adyen fees (~3.4% avg), you'd need **~$3,500/month in revenue**
- That's roughly **200+ Seedling subscribers** or **100+ Oak subscribers** just to break even on the minimum
- If you have fewer, you're **paying Adyen more than your actual transaction fees**

### The Real Math

| Scenario | Stripe Cost | Adyen Cost | Winner |
|----------|-------------|------------|--------|
| 10 subscribers ($80/mo) | ~$5.32 | **$120.00** | Stripe by $115 |
| 50 subscribers ($400/mo) | ~$26.60 | **$120.00** | Stripe by $93 |
| 200 subscribers ($1,600/mo) | ~$106.40 | ~$54.40 | Adyen by $52 |
| 500 subscribers ($4,000/mo) | ~$266.00 | ~$136.00 | Adyen by $130 |

**Adyen only becomes cheaper at ~180+ subscribers.** Grove is not there yet.

### Verdict: 🔴 Barren at Current Scale

The per-transaction pricing is favorable at volume, but the minimum monthly invoice is a dealbreaker for early-stage SaaS.

---

## 3. API & Developer Experience

**Character**: *Well-built machinery with extensive documentation, but the foreman expects you to already know how factories work.*

### Node.js SDK

- **Package**: `@adyen/api-library` on npm
- **Stars**: ~130 on GitHub (vs Stripe's 3,800+)
- **TypeScript**: Full support with typed models
- **APIs**: 25+ supported (Checkout v71, Payments v68, Recurring v68, etc.)
- **Node.js**: Requires v18+
- **Maintenance**: Actively maintained, auto-generated from OpenAPI specs

### Developer Experience Comparison

| Aspect | Stripe | Adyen |
|--------|--------|-------|
| **Onboarding** | Self-serve, instant test mode | Sales team required, approval process |
| **Documentation** | Industry-leading, with examples | Good but enterprise-oriented |
| **Test mode** | Instant, free, no approval | Requires test account setup |
| **Community** | Massive (Stack Overflow, forums) | Smaller, enterprise-focused |
| **SDK quality** | Excellent, battle-tested | Good, auto-generated |
| **npm weekly downloads** | `stripe`: ~2.1M/week | `@adyen/api-library`: ~80K/week |
| **Pre-built UI** | Stripe Checkout, Elements | Drop-in Components (newer) |
| **Webhook DX** | Stripe CLI for local testing | Manual setup required |

### Integration Complexity

Stripe integration is essentially:
1. `npm install stripe`
2. Create checkout session
3. Handle webhooks
4. Done

Adyen integration requires:
1. Contact sales team
2. Get approved
3. Set up test account
4. Configure merchant account
5. Implement checkout (more manual than Stripe)
6. Handle webhooks (different format)
7. Configure risk rules
8. Set up live URL prefix for production

### Verdict: 🟠 Wilting

The SDK is competent but the ecosystem is a fraction of Stripe's. The onboarding process alone would add significant friction for a solo developer.

---

## 4. Subscription & Recurring Billing

**Character**: *A payment processor that can repeat charges — but doesn't manage subscriptions for you.*

### Critical Distinction

**Stripe Billing** is a full subscription management system:
- Plan creation, upgrades, downgrades, prorations
- Metered billing, usage-based pricing
- Smart retry logic for failed payments
- Customer billing portal
- Invoice generation
- Tax calculation

**Adyen** has tokenization for recurring payments:
- Store card details as tokens
- Three models: CardOnFile, Subscription, UnscheduledCardOnFile
- You submit repeat charges using stored tokens
- **No subscription management** — you build all of that yourself

### What Grove Would Need to Build

If switching to Adyen, Grove would need to implement:

- [ ] Subscription lifecycle management (create, update, cancel, pause, resume)
- [ ] Billing cycle tracking (when to charge next)
- [ ] Proration logic for plan changes
- [ ] Failed payment retry logic with exponential backoff
- [ ] Invoice generation
- [ ] Customer notification system for billing events
- [ ] Billing portal for customers to manage payment methods
- [ ] Tax calculation integration (separate service needed)

**This is essentially rebuilding Stripe Billing from scratch.**

### What Grove Currently Gets for Free from Stripe

```typescript
// apps/plant/src/lib/server/stripe.ts — this one function does SO much:
export async function createCheckoutSession(params) {
  // Stripe handles: payment collection, tax calc, billing address,
  // promotion codes, subscription creation, metadata...
}

// And the billing portal — one API call:
export async function createBillingPortalSession(stripeSecretKey, customerId, returnUrl) {
  // Customers can update payment method, view invoices, cancel...
}
```

With Adyen, every piece of that would need custom implementation.

### Verdict: 🔴 Barren

This is the single biggest dealbreaker. Adyen does not have a Stripe Billing equivalent. Grove would need to build an entire subscription management system.

---

## 5. Small Business & Indie SaaS Suitability

**Character**: *A 5-star restaurant that doesn't have a counter for walk-ins.*

### Onboarding Requirements

- **Sales team call required** — no self-serve signup
- **Business documentation**: Legal registration, tax ID, ownership structure
- **KYC verification**: Director identity verification
- **Volume discussion**: Expected transaction volumes, average order value
- **Risk profile assessment**: What you sell, where you operate
- **Approval process**: Not instant — can take weeks

### Known Pain Points for Small Businesses

- Minimum monthly invoice ($120–€1,000 depending on agreement)
- Complex Interchange++ pricing hard to predict
- 0.5% chargeback rate limit (stricter than industry standard 1%)
- Support prioritized for enterprise clients
- 5–6 month implementation timelines reported for platforms
- 2-month cancellation notice required

### Community Sentiment

From multiple comparison sources: "Small or early-stage sellers should avoid Adyen due to minimum invoice requirements and complex setup processes." Every comparison site recommends Stripe for startups and small SaaS.

### Verdict: 🔴 Barren

Adyen explicitly targets mid-market and enterprise. Every aspect of their model — from onboarding to minimums to support — is designed for businesses processing significantly more than Grove.

---

## 6. Compliance, Fraud & Security

**Character**: *A fortress with excellent walls — if you can afford the gatehouse.*

### RevenueProtect (Fraud Prevention)

- **Basic** (included): Standard risk checks, fraud scoring
- **Premium** (paid): Machine learning, custom rules, case management, dynamic 3D Secure
- **ShopperDNA**: Device fingerprinting + behavioral analytics
- Built-in dynamic decisioning engine

### PCI & Compliance

- Full PCI DSS compliance
- End-to-end encryption by default
- GDPR compliant
- Global regulatory compliance

### Restricted/Prohibited Businesses

**Relevant categories for Grove:**
- Adult content (books, videos, streaming): **Restricted** (requires approval)
- "Offensive" content: **Prohibited** (vague language — risk for queer content?)
- Cloud storage/VPN/file sharing: **Restricted**
- Content creation platforms: Not specifically listed (neither restricted nor prohibited)

**Important concern**: The "offensive content" category is vaguely defined. While Adyen doesn't explicitly restrict LGBTQ businesses, the language around "content deemed offensive or of a sexual nature" could be problematic for a platform explicitly serving queer creators. Stripe has been more transparent and predictable here.

### Verdict: 🟡 Growing (but risk flag for content policy)

Solid security features, but the content policy vagueness is a concern for Grove's community.

---

## 7. Integration with Grove's Payment Abstractions

**Character**: *The bridge exists, but it leads to a different country.*

### The PaymentProvider Interface Challenge

Grove has a beautiful `PaymentProvider` interface (`libs/engine/src/lib/payments/types.ts`) that any new provider must implement. Here's what Adyen can and can't fulfill:

| Interface Method | Can Adyen Implement? | Notes |
|-----------------|---------------------|-------|
| `syncProduct()` | Partially | Adyen doesn't have a product catalog concept |
| `syncPrice()` | No | No price objects — you manage pricing yourself |
| `createCheckoutSession()` | Yes | Adyen Drop-in/Components, but different flow |
| `getCheckoutSession()` | Partially | Different session model |
| `getPaymentStatus()` | Yes | Via Payment API |
| `refund()` | Yes | Via Modifications API |
| `getSubscription()` | **No** | Adyen has no subscription management |
| `cancelSubscription()` | **No** | You'd build this yourself |
| `resumeSubscription()` | **No** | You'd build this yourself |
| `syncCustomer()` | Partially | Shopper references, not full customer objects |
| `getCustomer()` | Partially | Limited compared to Stripe |
| `createBillingPortalSession()` | **No** | No equivalent exists |
| `handleWebhook()` | Yes | Different format, different signing |
| `createConnectAccount()` | **No** | Adyen for Platforms exists but very different model |

**6 of 14 interface methods cannot be directly implemented** — they'd require building entirely new systems around Adyen's primitives.

### What Would Change

**Provider factory (`payments/index.ts`)**: Easy — add `"adyen"` to the `ProviderType` union. Trivial change.

**PaymentProvider implementation**: **Massive effort.** Must build subscription lifecycle, billing portal, and product sync from scratch since Adyen doesn't have these concepts.

**Billing abstraction (`billing.ts`)**: Mostly fine — uses `provider_customer_id` generically. Minimal changes.

**Stripe checkout (`apps/plant/src/lib/server/stripe.ts`)**: **Complete rewrite.** Adyen's checkout API is fundamentally different.

**Warden Stripe service**: **Complete rewrite.** Different API, different response shapes.

**Webhook handling**: **Complete rewrite.** Different event names, different payload structures, different signature verification (HMAC but different format).

**Tier config (`tiers.ts`)**: No changes needed — tier definitions are provider-agnostic.

**Database**: No schema changes needed — `provider_*` columns already support any provider's IDs.

**Subscription management**: **New system needed.** Adyen stores payment tokens but doesn't schedule or manage recurring charges — you'd need a cron/scheduler to initiate charges.

**Heartwood subscriptions**: Would need updates to work with whatever custom subscription system replaces Stripe Billing.

### Estimated Effort

| Component | Effort |
|-----------|--------|
| Adyen SDK integration | Low |
| Checkout flow rewrite | Medium |
| Webhook handler rewrite | Medium |
| Subscription management system | **High** (new system from scratch) |
| Billing portal replacement | **High** (Adyen has no equivalent) |
| Tax calculation integration | Medium (need separate provider) |
| Failed payment retry system | Medium |
| Testing & verification | High |

### Verdict: 🔴 Barren

The migration would require rebuilding most of the payment infrastructure and creating systems that Stripe provides out of the box.

---

## Expedition Summary

### By the Numbers

| Metric | Count |
|--------|-------|
| Total stops | 7 |
| Thriving 🟢 | 0 |
| Growing 🟡 | 1 (Compliance/Security — decent but risky) |
| Wilting 🟠 | 1 (API/DX — capable but smaller ecosystem) |
| Barren 🔴 | 5 (Overview, Pricing, Subscriptions, Small Biz, Integration) |

### The Honest Verdict

**Do not migrate to Adyen.** Not now. Probably not for a long time.

Adyen is genuinely excellent technology — for the right customer. That customer processes millions in monthly volume, has an in-house payments team, needs omnichannel (online + POS), and operates across multiple countries. That customer is Uber, not Grove.

### Why Adyen Doesn't Fit Grove

1. **Minimum monthly invoice** ($120–€1,000) would cost more than the actual transaction fees at current volume
2. **No subscription billing** — you'd rebuild Stripe Billing from scratch
3. **Enterprise onboarding** — sales calls, KYC, approval process vs Stripe's instant setup
4. **Vague content policy** — "offensive content" restrictions could be weaponized against queer creators
5. **Smaller ecosystem** — 130 GitHub stars vs 3,800+ for Stripe, fraction of the community support
6. **Massive migration effort** — most of the payment stack would need rewriting

### When Adyen Might Make Sense

Revisit Adyen when (ALL of these are true):
- [ ] Grove has 500+ paying subscribers
- [ ] Monthly revenue exceeds $10,000
- [ ] There's a need for in-person payments (merch, events)
- [ ] International expansion requires 100+ payment methods
- [ ] Transaction fee savings exceed $100+/month over Stripe
- [ ] There's engineering bandwidth for a 3–6 month migration

### Recommended Path Forward

**Stay on Stripe.** It's working. The integration is solid. The abstractions are clean. The pricing is fair for Grove's scale.

If payment provider diversification is a goal, consider these instead:

| Provider | Why Consider | When |
|----------|-------------|------|
| **Stripe** (current) | Excellent for SaaS, best DX, zero minimums | Now |
| **Paddle** | Merchant of Record (handles taxes), great for SaaS | If tax compliance becomes painful |
| **LemonSqueezy** | Merchant of Record, indie-friendly | Already explored, decent fallback |
| **Polar.sh** | Built for open source / indie creators | If Grove has open-source revenue streams |
| **Adyen** | Lower per-transaction fees at scale | 500+ subscribers, $10K+/mo revenue |

### Cross-Cutting Themes

1. **Grove is at the wrong scale for Adyen.** Every Adyen advantage activates at volumes Grove hasn't reached.
2. **Subscription billing is non-negotiable.** Any provider switch must include built-in subscription management or the migration cost explodes.
3. **Content policy clarity matters.** For a platform serving queer creators, vague "offensive content" policies are a business risk, not just a compliance checkbox.
4. **The existing abstractions are good.** `billing.ts` and the tier system are provider-agnostic. When a switch does make sense someday, the foundation is there.

---

## Sources

- [Adyen Official Site](https://www.adyen.com/)
- [Adyen Pricing](https://www.adyen.com/pricing)
- [Adyen Node.js SDK](https://github.com/Adyen/adyen-node-api-library)
- [Adyen API Explorer](https://docs.adyen.com/api-explorer/)
- [Adyen Restricted/Prohibited List](https://www.adyen.com/legal/list-restricted-prohibited)
- [Adyen PCI DSS Compliance](https://docs.adyen.com/online-payments/pci-dss-compliance)
- [Adyen RevenueProtect](https://help.adyen.com/en_US/knowledge/risk/revenueprotect/what-is-revenueprotect)
- [Stripe vs Adyen — Chargeflow](https://www.chargeflow.io/blog/stripe-vs-adyen)
- [Stripe vs Adyen — Airwallex](https://www.airwallex.com/us/blog/stripe-vs-adyen-comparison)
- [Stripe vs Adyen — NerdWallet](https://www.nerdwallet.com/business/software/learn/adyen-vs-stripe)
- [Adyen Fees Analysis — Noda](https://noda.live/articles/adyen-fees)
- [Adyen Pricing 2026 — Finexer](https://blog.finexer.com/adyen-pricing/)
- [Adyen for Platforms — Sharetribe](https://www.sharetribe.com/academy/marketplace-payments/adyen-for-platforms-overview/)
- [Adyen vs Stripe for SaaS — Embed](https://www.embed.co/blog/stripe-vs-adyen-comparison)
- [Mollie vs Stripe vs Adyen — Codelevate](https://www.codelevate.com/blog/mollie-vs-stripe-vs-adyen-psp-comparison-2025)

---

*The fire dies to embers. The journal is full — 7 stops, the whole landscape mapped. The verdict is clear: Adyen is a magnificent creature, but it lives in a different ecosystem. Grove's forest is warm and small and indie, and Stripe is the right companion for that journey. The jeep cools under the acacia tree. Tomorrow, we keep building with what we have — and it's good.*
