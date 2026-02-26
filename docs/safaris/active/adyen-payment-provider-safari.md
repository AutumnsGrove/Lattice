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

---

## Full Landscape Survey — Every Payment Provider on the Savanna

*The jeep turns. We're not done — we're zooming out to survey the entire landscape. Every creature on the savanna, sorted by species.*

### Category 1: Full-Stack Payment Processors (You Are the Merchant)

These are payment gateways / processors — they handle the technical act of moving money, but **you** remain the legal seller, responsible for taxes, compliance, chargebacks, etc.

#### Stripe (Current Provider) — 🟢 Thriving

Already deeply researched. Best-in-class for indie SaaS.

| Aspect | Details |
|--------|---------|
| **Pricing** | 2.9% + $0.30 per transaction. Zero minimums, zero monthly fees |
| **Subscriptions** | Full Stripe Billing — plans, prorations, dunning, billing portal, tax calc |
| **DX** | Industry gold standard. 2.1M+ npm downloads/week, instant test mode |
| **MoR** | Private beta for Stripe's own MoR service (~3.5% surcharge) |
| **Connect** | Marketplace payments (Grove already uses this) |
| **Fit for Grove** | Perfect. Already integrated, abstractions are clean |
| **When to use** | Now. Keep using it |

#### Adyen — 🔴 Barren

Fully analyzed above. Enterprise-only, $120+/mo minimums, no subscription billing. Not for Grove.

#### Braintree (PayPal) — 🟠 Wilting

| Aspect | Details |
|--------|---------|
| **Pricing** | 2.9% + $0.30 per transaction (same as Stripe). Volume discounts at $80K+/mo |
| **Subscriptions** | Basic recurring billing — create plans, bill automatically. Less sophisticated than Stripe Billing |
| **DX** | Decent APIs, but aging. Considered a "step up from PayPal" rather than cutting-edge |
| **PayPal integration** | Native PayPal + Venmo support (Stripe can't offer this) |
| **Fit for Grove** | Mediocre. No real advantage over Stripe, and recurring billing is less capable |
| **When to consider** | Only if PayPal/Venmo acceptance becomes critical (unlikely for Grove's audience) |
| **Deal-breaker** | Recurring billing is NOT compatible with Braintree Marketplace. Grove uses marketplace features |

#### Square — 🔴 Barren

| Aspect | Details |
|--------|---------|
| **Pricing** | 2.9% + $0.30 online. Slightly cheaper than Stripe |
| **Subscriptions** | Basic. Locked into Square's ecosystem |
| **DX** | Simpler than Stripe, designed for non-developers |
| **Fit for Grove** | Poor. Square is a retail/POS-first company. SaaS billing is an afterthought |
| **When to consider** | Only if Grove opened a physical shop/cafe (the midnight tea shop becomes literal?) |

#### Mollie — 🟡 Growing (Europe-only)

| Aspect | Details |
|--------|---------|
| **Pricing** | ~1.2% + €0.25 for EU cards. Pay-as-you-go, no minimums |
| **Subscriptions** | Tokenization-based recurring. Less feature-rich than Stripe Billing |
| **DX** | Clean API, well-regarded in European dev community |
| **Payment methods** | 35+ including iDEAL, Bancontact, Sofort, Giropay — strong EU local methods |
| **Limitation** | **Europe-only.** Companies must be registered in EEA/UK/Switzerland |
| **Fit for Grove** | Irrelevant unless Grove is a European entity. Interesting if EU expansion happens |
| **When to consider** | If Grove establishes a European legal entity and needs local payment optimization |

#### Helcim — 🟡 Growing (Niche)

| Aspect | Details |
|--------|---------|
| **Pricing** | Interchange+ with ~2.40% + $0.25 average. Volume-based discounts |
| **Subscriptions** | Basic recurring billing, invoicing |
| **DX** | Less developer-focused than Stripe. More for traditional businesses |
| **Fit for Grove** | Marginal. Good pricing at scale but lacks SaaS-specific features |
| **When to consider** | Probably never for Grove |

#### Stax — 🔴 Barren

| Aspect | Details |
|--------|---------|
| **Pricing** | Subscription model: flat monthly fee ($99+/mo) instead of per-transaction percentage. Only saves money at ~$8K+/mo volume |
| **Subscriptions** | Recurring billing and invoicing included |
| **Fit for Grove** | Terrible at current scale. The fixed monthly fee only makes sense at high volume |
| **When to consider** | Never, realistically |

---

### Category 2: Merchant of Record (MoR) Platforms

These platforms **become the legal seller** on behalf of your business. They handle taxes (VAT, GST, sales tax), compliance, chargebacks, and regulatory requirements. You focus on building — they handle the financial bureaucracy.

**Why this matters for Grove**: Tax compliance gets complex fast when selling subscriptions across US states and internationally. An MoR eliminates that entire burden.

#### Paddle — 🟢 Thriving

**Deep dive**: See [`mor-deep-dive-paddle-polar-safari.md`](./mor-deep-dive-paddle-polar-safari.md) for full analysis.

| Aspect | Details |
|--------|---------|
| **Pricing** | 5% + $0.50 per transaction. Higher than Stripe but includes all tax compliance |
| **Subscriptions** | Full subscription management — plans, upgrades, downgrades, dunning. Full Stripe Billing parity |
| **Tax compliance** | Global VAT/GST/sales tax — they handle everything |
| **DX** | Good APIs, TypeScript SDK, 12+ webhook events. Not as polished as Stripe but close |
| **Content policy** | Explicitly protects against targeting sexual orientation. No vague "offensive content" clause |
| **Fit for Grove** | Strong. Maps to 13/14 PaymentProvider interface methods. The safe MoR choice |
| **When to consider** | When tax compliance becomes painful, or when wanting full MoR protection |
| **Caveat** | Higher per-transaction cost. At $8/mo Seedling: $0.90 (vs Stripe's $0.53). But with Stripe Tax: $1.03 — Paddle is cheaper |

#### LemonSqueezy (Stripe-owned) — 🟠 Wilting

Already researched. Acquired by Stripe in late 2023.

| Aspect | Details |
|--------|---------|
| **Pricing** | 5% + $0.50 per transaction |
| **Subscriptions** | Full subscription management with no-code storefront |
| **Tax compliance** | Global tax handling as MoR |
| **Status** | **Acquired by Stripe.** Features being consolidated into Stripe's MoR offering. Reduced development velocity |
| **Fit for Grove** | Declining. Was promising, but Stripe acquisition creates uncertainty |
| **When to consider** | Probably not anymore — Paddle is a safer bet in this category |

#### FastSpring — 🟡 Growing

| Aspect | Details |
|--------|---------|
| **Pricing** | Custom/opaque — contact sales. Estimated ~4% + $0.40 for standard. Mid-volume businesses: $3K–$4K+/mo |
| **Subscriptions** | Full lifecycle management included |
| **Tax compliance** | Global — they handle it all |
| **DX** | Decent but not developer-first. More enterprise-oriented checkout |
| **Fit for Grove** | Mediocre. Pricing opacity is a red flag for indie projects. More suited to mid-size software companies |
| **When to consider** | If Grove becomes a software publisher with complex digital product sales. Unlikely fit |

#### Polar.sh — 🟡 Growing (Exciting for Indie)

**Deep dive**: See [`mor-deep-dive-paddle-polar-safari.md`](./mor-deep-dive-paddle-polar-safari.md) for full analysis.

| Aspect | Details |
|--------|---------|
| **Pricing** | **4% + $0.40 per transaction** — cheapest MoR base rate. But +1.5% intl cards, +0.5% subs, $15/chargeback |
| **Subscriptions** | Memberships, SaaS billing, digital products. Adequate but less flexible than Paddle |
| **Tax compliance** | Full MoR — VAT, GST, sales tax. EU B2B reverse charge supported |
| **DX** | Developer-first. Open source. **Native SvelteKit adapter** — huge win for Grove's stack |
| **Content policy** | Most permissive of any MoR. No content policing — "proudly boast about in public" framing |
| **Special features** | Auto license keys, digital asset delivery (up to 10GB), auto Discord role assignment, GitHub repo access |
| **Fit for Grove** | Philosophically aligned. Maps to 12/14 PaymentProvider methods. The romantic MoR choice |
| **Limitations** | Card-only (no PayPal/Apple Pay). Built on Stripe Connect under the hood. Can't change billing cycle after product creation |
| **Risk** | Young startup (est. 2023), small team. But open source = fork hedge, and Stripe Connect underneath = clean fallback |

#### Creem — 🟠 Wilting (Concerning)

| Aspect | Details |
|--------|---------|
| **Pricing** | 3.9% + $0.40 per transaction. First $10K at 0% (promotional) |
| **Subscriptions** | Included |
| **Tax compliance** | Global MoR, 100+ countries |
| **DX** | Developer-focused. API + no-code components. Crypto support |
| **Special features** | AI assistant for financial data, crypto payments |
| **Fit for Grove** | Risky. Trustpilot reviews raise concerns about merchant quality control |
| **Red flags** | Reports of processing payments for counterfeit sites. "Dashboard looks unprofessional." Some users question legitimacy |
| **When to consider** | Not recommended until trust signals improve significantly |

#### Gumroad — 🟠 Wilting

| Aspect | Details |
|--------|---------|
| **Pricing** | **10% per transaction** — most expensive option by far |
| **Subscriptions** | Basic memberships |
| **Tax compliance** | Became MoR in January 2025 — handles sales tax |
| **Fit for Grove** | Poor. Too expensive, too simple, designed for individual creators selling PDFs/courses, not SaaS platforms |
| **When to consider** | Never for the platform billing. Could theoretically be used by Grove *users* to sell digital products |

#### Dodo Payments — 🟡 Growing (Niche)

| Aspect | Details |
|--------|---------|
| **Pricing** | 4% + $0.40 per transaction |
| **Subscriptions** | Usage-based billing, tiered subscriptions, one-time purchases |
| **Tax compliance** | Full MoR, 150+ countries, 30+ payment methods |
| **DX** | Developer-focused, praised for quick integration |
| **Fit for Grove** | Possibly interesting. Built for indie startups. But very young (founded 2024, $1.1M seed) |
| **Risk** | Seed-stage startup. Payout hold complaints. Sustainability uncertain |
| **When to consider** | Watch from afar. Too young to bet on |

#### Fungies.io — 🟡 Growing (Niche)

| Aspect | Details |
|--------|---------|
| **Pricing** | Similar to Paddle/Polar (~5% + $0.50) |
| **Focus** | SaaS, games, digital products. Strong EU/LATAM optimization |
| **Fit for Grove** | Niche. Not enough differentiation to justify switching from Stripe or Paddle |

#### PayPro Global — 🟠 Wilting

| Aspect | Details |
|--------|---------|
| **Focus** | B2B/B2C software companies. Strong localization |
| **Fit for Grove** | Poor. Enterprise B2B orientation doesn't match Grove's indie creator market |

---

### Category 3: Subscription Billing Platforms (Bolt-On Layer)

These platforms sit **on top of** a payment processor (usually Stripe) and add sophisticated subscription management, dunning, revenue recognition, and analytics. They don't process payments themselves.

**Why this matters**: Grove already has Stripe Billing. These are only relevant if Stripe Billing's features become insufficient.

#### Chargebee — 🟡 Growing (Overkill)

| Aspect | Details |
|--------|---------|
| **Pricing** | Free up to $250K cumulative billing, then 0.75%. Performance plan ~$7K/yr |
| **Features** | Advanced dunning, trial management, revenue recognition, multi-sub management |
| **Integrates with** | Stripe, Braintree, Adyen, and others |
| **Fit for Grove** | Massive overkill at current scale. The free tier is generous but adds unnecessary complexity |
| **When to consider** | If Stripe Billing's dunning or proration logic becomes genuinely insufficient (unlikely) |

#### Recurly — 🟡 Growing (Overkill)

| Aspect | Details |
|--------|---------|
| **Pricing** | ~$149/mo+ for Essentials plan |
| **Superpower** | ML-powered payment recovery. Claims to reduce involuntary churn significantly |
| **Fit for Grove** | Overkill and expensive for the scale. $149/mo minimum doesn't make sense until churn-from-failed-payments is a measurable problem |
| **When to consider** | If Grove reaches 1000+ subscribers and involuntary churn exceeds 5% |

#### Zuora — 🔴 Barren

| Aspect | Details |
|--------|---------|
| **Pricing** | ~$75K/yr+. Enterprise-only |
| **Fit for Grove** | Laughably inappropriate. This is for Zoom and the New York Times |

#### Lago — 🟡 Growing (Interesting)

| Aspect | Details |
|--------|---------|
| **Pricing** | Open source (self-hosted free). Cloud plans available |
| **Superpower** | Usage-based and metered billing. Open source |
| **Fit for Grove** | Potentially interesting if Grove ever adds metered features (API calls, storage overage billing). Not needed now |
| **When to consider** | If Grove introduces usage-based pricing tiers |

#### Outseta — 🟡 Growing (Interesting)

| Aspect | Details |
|--------|---------|
| **Features** | All-in-one: billing + CRM + email + auth. Built for early SaaS |
| **Fit for Grove** | Interesting concept but Grove already has auth (Heartwood), email, and billing separately. Switching would mean ripping out existing systems |
| **When to consider** | Only if starting from scratch (too late for Grove) |

---

### Category 4: Creator/Community Platforms (Not Competitors)

These platforms embed payments into a broader creator ecosystem. They're not payment providers you'd integrate — they're platforms your *users* might use.

| Platform | Fee | Model | Relevance to Grove |
|----------|-----|-------|-------------------|
| **Patreon** | 10% + processing | Membership platform | Not a payment provider. Possible integration target for Grove users |
| **Ko-fi** | 0% (tips) / 5% (shops) | Tips + memberships | Not relevant as infrastructure. Could inspire Grove's tip feature |
| **Buy Me a Coffee** | 5% + processing | Tips + memberships | Same — inspiration, not infrastructure |

---

### The Complete Landscape Map

```
                        GROVE'S PAYMENT PROVIDER LANDSCAPE
                        ==================================

                     ┌─── YOU HANDLE TAXES ───┐   ┌── THEY HANDLE TAXES ──┐
                     │   Payment Processors    │   │  Merchant of Record   │
                     │                         │   │                       │
    BEST FIT ──────► │  ★ Stripe (current)     │   │  ★ Paddle             │
                     │    Braintree            │   │    Polar.sh           │
                     │    Mollie (EU only)     │   │    FastSpring         │
                     │    Helcim              │   │    LemonSqueezy (→Stripe)│
    TOO BIG ───────► │    Adyen               │   │    Gumroad            │
    FOR GROVE        │    Square              │   │    Creem              │
                     │    Stax               │   │    Dodo Payments      │
                     └─────────────────────────┘   │    Fungies.io         │
                                                   │    PayPro Global      │
                     ┌─── BOLT-ON BILLING ────┐   └───────────────────────┘
                     │  (sits on top of Stripe)│
                     │                         │
                     │    Chargebee           │
                     │    Recurly             │
                     │    Lago (open source)  │
    TOO BIG ───────► │    Zuora               │
    FOR GROVE        │    Outseta             │
                     │    Maxio               │
                     └─────────────────────────┘
```

### Final Rankings for Grove

> **Full MoR comparison**: [`mor-deep-dive-paddle-polar-safari.md`](./mor-deep-dive-paddle-polar-safari.md)

| Rank | Provider | Category | Why |
|------|----------|----------|-----|
| **1** | **Stripe** | Processor | Already integrated, best DX, zero minimums, full billing. No reason to leave |
| **2** | **Paddle** | MoR | Safe MoR choice — 13/14 interface methods, full sub management, $1.4B stable company. Fees match Stripe+Tax |
| **3** | **Polar.sh** | MoR | Aligned MoR choice — cheapest fees, native SvelteKit, open source, built for indie. Startup risk is real |
| **4** | **Chargebee** | Bolt-on | If Stripe Billing's dunning ever falls short (free tier is generous). Unlikely to need |
| **5** | **Mollie** | Processor | Only if Grove has a European entity and needs EU payment optimization |
| **6–∞** | Everyone else | Various | Not relevant at Grove's current or near-future scale |

### Cross-Cutting Themes

1. **Stripe is the right answer.** Not because alternatives don't exist, but because nothing offers a better combination of features, DX, and pricing at Grove's scale.
2. **Merchant of Record is the most interesting "what-if."** Tax compliance is the one area where Stripe creates real ongoing work. Paddle or Polar could eliminate that burden.
3. **Subscription billing is non-negotiable.** Any provider without built-in subscription management (Adyen, Square, raw Braintree) requires rebuilding what Stripe Billing gives you free.
4. **Content policy clarity matters.** For a platform serving queer creators, vague "offensive content" policies are a business risk. Stripe and Paddle have the clearest, most predictable policies.
5. **The existing abstractions are great.** Grove's `PaymentProvider` interface and `provider_*` database columns mean a switch is architecturally possible whenever the business case arrives. That day isn't today.
6. **Watch Polar.sh.** It's the most philosophically aligned option — open source, indie-focused, creator-friendly, cheapest MoR fees. If it matures and proves stable, it could become the ideal complement to Stripe.

---

## Sources

### Adyen Research
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

### Landscape Survey
- [Stripe Alternatives — Paddle](https://www.paddle.com/alternatives/stripe)
- [Stripe Alternatives — FastSpring](https://fastspring.com/blog/stripe-alternatives/)
- [19 Stripe Alternatives — UniBee](https://unibee.dev/blog/top-19-stripe-alternatives/)
- [Top 7 Stripe Alternatives 2026 — TechnologyAdvice](https://technologyadvice.com/blog/sales/stripe-alternatives/)
- [Best MoR Platforms for SaaS 2026 — Fungies](https://fungies.io/the-best-merchant-of-record-platforms-for-saas-in-2026/)
- [Top MoR Providers 2026 — Cleverbridge](https://grow.cleverbridge.com/blog/top-merchant-of-record-providers-2026)
- [Best Payment Gateway for Subscriptions 2026 — SitePoint](https://www.sitepoint.com/payment-gateway-for-subscriptions/)
- [10 Best SaaS Billing Platforms 2026 — Outseta](https://www.outseta.com/posts/best-saas-billing-platforms)
- [SaaS Subscription Management 2026 — Zenskar](https://www.zenskar.com/blog/saas-subscription-management-solutions)
- [Polar.sh — Why Polar](https://polar.sh/resources/why)
- [Polar.sh Review — Dodo Payments](https://dodopayments.com/blogs/polar-sh-review)
- [Polar.sh — Buildcamp](https://www.buildcamp.io/blogs/stripe-vs-polarsh-which-payment-platform-is-best-for-your-saas)
- [Creem Review — SaaSGenius](https://www.saasgenius.com/new-tools/creem/)
- [Creem Review — Revuary](https://revuary.com/reviews/creem-review/)
- [Creem — FWFW](https://fwfw.app/blog/creem)
- [FastSpring Pricing](https://fastspring.com/pricing/)
- [FastSpring Review — Dodo Payments](https://dodopayments.com/blogs/fastspring-review-alternative)
- [Chargebee vs Recurly vs Zuora — Crozdesk](https://crozdesk.com/compare/zuora-vs-chargebee-vs-recurly)
- [Best Subscription Billing 2026 — Alguna](https://blog.alguna.com/subscription-billing-software/)
- [Zuora Alternatives 2026 — Schematic](https://schematichq.com/blog/zuora-alternatives)
- [Mollie Pricing 2026 — Finexer](https://blog.finexer.com/mollie-pricing/)
- [Mollie vs Stripe — Airwallex](https://www.airwallex.com/uk/blog/mollie-vs-stripe-comparison)
- [Braintree Recurring Billing — PayPal Developer](https://developer.paypal.com/braintree/articles/guides/recurring-billing/overview)
- [Dodo Payments Review — Research.com](https://research.com/software/reviews/dodo-payments-review)
- [Creator Monetization Platforms 2026 — Passes](https://blog.passes.com/best-creator-monetization-platforms/)
- [Payment Processing for Creators 2026 — InfluenceFlow](https://influenceflow.io/resources/payment-processing-platforms-for-creators-the-complete-2026-guide/)

---

*The fire dies to embers. The journal is full — the whole savanna mapped, every creature observed and catalogued. 20+ providers across four categories, and the verdict hasn't changed: Stripe is the right companion for Grove's journey. Paddle watches from the treeline as the strongest backup. Polar.sh rustles in the undergrowth — young, promising, philosophically aligned. Everyone else is either too big, too expensive, too immature, or solving a different problem. The jeep cools under the acacia tree. Tomorrow, we keep building with what we have — and it's good.*
