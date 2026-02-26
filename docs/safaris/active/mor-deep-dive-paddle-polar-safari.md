# Merchant of Record Deep Dive — Paddle vs Polar.sh for Grove

> Stripe isn't bad. It's just not what we want. We want someone else to handle the taxes.
> **Aesthetic principle**: Find the MoR that fits a warm indie tea shop, not a corporate cafeteria
> **Scope**: Deep comparison of the two viable MoR candidates for Grove

---

## Why MoR?

With a traditional payment processor (Stripe), **you** are the legal seller. You collect payments, you calculate sales tax across every US state and country where your customers live, you file returns, you handle chargebacks, you deal with VAT compliance. For a solo indie project selling $8–$35/month subscriptions to creators worldwide, that's a lot of bureaucracy.

With a Merchant of Record, **they** are the legal seller. Your customers' credit card statements show "PADDLE" or "POLAR" instead of "GROVE." In exchange, they handle:
- Sales tax calculation and remittance (all US states)
- VAT/GST collection and filing (EU, UK, Australia, etc.)
- Chargeback liability and dispute handling
- Payment method compliance (PCI DSS, SCA/3DS)
- Currency conversion

**The trade-off**: Higher per-transaction fees (4–5% vs Stripe's 2.9%) but zero tax compliance work.

---

## The Two Contenders

```
                    ┌──────────────────┐    ┌──────────────────┐
                    │     PADDLE       │    │    POLAR.SH      │
                    │                  │    │                  │
                    │  The Established │    │  The Indie       │
                    │  Professional    │    │  Upstart         │
                    │                  │    │                  │
                    │  $1.4B valuation │    │  Open source     │
                    │  Est. 2012       │    │  Est. 2023       │
                    │  London, UK      │    │  Stockholm, SE   │
                    │  200+ employees  │    │  Small team      │
                    │                  │    │                  │
                    │  5% + $0.50/txn  │    │  4% + $0.40/txn  │
                    └──────────────────┘    └──────────────────┘
```

---

## 1. Company & Stability

### Paddle

- **Founded**: 2012 in London, UK
- **Valuation**: $1.4B (2022 — acquired ProfitWell at this valuation)
- **Funding**: $318.3M debt financing (July 2025) + $25M equity for international expansion
- **Employees**: 200+
- **Customers**: 4,000+ software companies
- **Notable users**: Framer, 1Password, Notion, Linear, Lottie
- **Revenue**: Processing significant volume — this is a mature business
- **Risk level**: **Low.** Well-funded, profitable trajectory, no signs of instability

### Polar.sh

- **Founded**: 2023 in Stockholm, Sweden
- **Stage**: Post-v1.0, but still young. Was in beta as late as 2025
- **Funding**: Not publicly disclosed beyond early rounds. Open Collective presence
- **Team**: Small (exact headcount unclear, estimated 5–15)
- **Customers**: "Thousands of developers" — mostly indie/open-source
- **Notable endorsement**: Guillermo Rauch (CEO Vercel) praised their execution speed
- **Open source**: Fully open source on GitHub — you can inspect everything
- **Risk level**: **Medium-High.** Young startup, small team. If they shut down, you need a migration plan. Open source is a hedge — you could theoretically fork

### Verdict

Paddle is the **safe, professional choice** — you're betting on a $1.4B company with 12 years of track record. Polar is the **exciting, aligned choice** — philosophically perfect for Grove but with startup risk.

---

## 2. Pricing — Real Math for Grove's Tiers

### Fee Structure

| | Paddle | Polar.sh |
|---|---|---|
| **Base fee** | 5% + $0.50 | 4% + $0.40 |
| **International cards** | Included | +1.5% (Stripe pass-through) |
| **Subscription surcharge** | Included | +0.5% |
| **Chargeback fee** | Included (they absorb it) | $15 per dispute |
| **Payout fee** | Included | Stripe: $2/mo active + 0.25% + $0.25/payout |
| **Currency conversion** | Included | 0.25% (EU) to 1% (other) |

### Per-Transaction Cost for Each Grove Tier

**US customer, monthly billing, domestic card:**

| Tier | Price | Stripe Cost | Paddle Cost | Polar Cost |
|------|-------|-------------|-------------|------------|
| Seedling | $8/mo | $0.53 (6.6%) | $0.90 (11.3%) | $0.76 (9.5%) |
| Sapling | $12/mo | $0.65 (5.4%) | $1.10 (9.2%) | $0.88 (7.3%) |
| Oak | $25/mo | $1.03 (4.1%) | $1.75 (7.0%) | $1.40 (5.6%) |
| Evergreen | $35/mo | $1.32 (3.8%) | $2.25 (6.4%) | $1.80 (5.1%) |

**International customer (e.g., EU), monthly billing:**

| Tier | Price | Stripe Cost | Paddle Cost | Polar Cost |
|------|-------|-------------|-------------|------------|
| Seedling | $8/mo | $0.53* | $0.90 | $0.96 (+intl +sub) |
| Sapling | $12/mo | $0.65* | $1.10 | $1.12 |
| Oak | $25/mo | $1.03* | $1.75 | $1.90 |
| Evergreen | $35/mo | $1.32* | $2.25 | $2.50 |

*\*Stripe doesn't charge extra for international cards on standard pricing, but you'd need Stripe Tax ($0.50/transaction) for compliance.*

**With Stripe Tax ($0.50/txn for tax calculation):**

| Tier | Stripe + Tax | Paddle | Polar (US) |
|------|-------------|--------|------------|
| Seedling $8 | $1.03 (12.9%) | $0.90 (11.3%) | $0.76 (9.5%) |
| Sapling $12 | $1.15 (9.6%) | $1.10 (9.2%) | $0.88 (7.3%) |
| Oak $25 | $1.53 (6.1%) | $1.75 (7.0%) | $1.40 (5.6%) |
| Evergreen $35 | $1.82 (5.2%) | $2.25 (6.4%) | $1.80 (5.1%) |

**Key insight**: Once you add Stripe Tax ($0.50/txn), the gap narrows dramatically. Paddle and Stripe+Tax are nearly identical for mid-range tiers. **Polar is actually the cheapest option for US customers** even compared to Stripe+Tax.

### Monthly Revenue Impact (50 subscribers, mixed tiers)

Assuming: 20 Seedling, 15 Sapling, 10 Oak, 5 Evergreen = $745/mo revenue

| Provider | Monthly Fees | % of Revenue |
|----------|-------------|--------------|
| Stripe (no tax) | ~$36 | 4.8% |
| Stripe + Tax | ~$61 | 8.2% |
| Paddle | ~$62 | 8.3% |
| Polar (US) | ~$50 | 6.7% |

**Polar wins on price. Paddle and Stripe+Tax are essentially tied.**

### Verdict

- **Polar is cheapest** for domestic US customers
- **Paddle and Stripe+Tax are comparable** — you're essentially paying the same for full tax compliance
- **Polar gets more expensive for international** customers due to +1.5% surcharge
- **Paddle includes everything** — no surprise fees, no payout charges, no chargeback costs

---

## 3. API & Developer Experience

### Paddle

| Aspect | Details |
|--------|---------|
| **SDK** | `@paddle/paddle-node-sdk` — official, TypeScript definitions included |
| **npm** | Actively maintained. Uses camelCase (JS convention) vs API's snake_case |
| **API model** | REST API. Products, Prices, Customers, Subscriptions, Transactions as core resources |
| **Checkout** | Paddle.js overlay (hosted) or inline checkout. Custom subdomains since Sep 2025 |
| **Webhooks** | HMAC signature verification. Events for subscriptions, transactions, customers |
| **Test mode** | Sandbox environment with separate API keys |
| **Starter kits** | Next.js + Vercel + Supabase starter kit available |
| **Framework support** | General Node.js. Community integrations for various frameworks |
| **Recent additions** | Apple Pay express checkout (Feb 2026), cardless trials (Nov 2025), cancellation flows (Jan 2026) |

**Paddle Subscription Webhook Events:**

| Event | Maps to Grove |
|-------|--------------|
| `subscription.created` | New subscriber |
| `subscription.activated` | Trial ended, billing started |
| `subscription.trialing` | Trial started |
| `subscription.updated` | Plan change, payment method update |
| `subscription.paused` | Subscription paused |
| `subscription.resumed` | Subscription resumed |
| `subscription.canceled` | Subscription canceled |
| `subscription.past_due` | Payment failed, dunning started |

**Paddle API Resources:**

| Resource | Equivalent to Stripe |
|----------|---------------------|
| Products | ✅ Products |
| Prices | ✅ Prices |
| Customers | ✅ Customers |
| Addresses | ✅ Customer addresses |
| Subscriptions | ✅ Subscriptions |
| Transactions | ✅ PaymentIntents / Charges |
| Adjustments | ✅ Refunds / Credits |
| Notifications | ✅ Webhooks |
| Customer Portal | ✅ Billing Portal (built-in since Jan 2026) |

### Polar.sh

| Aspect | Details |
|--------|---------|
| **SDK** | JavaScript/TypeScript, Python, Go, PHP — official SDKs |
| **API model** | REST API. Products, Customers, Orders, Subscriptions, Checkouts |
| **Checkout** | Checkout links (no-code), embedded components, or API-driven |
| **Webhooks** | Event-based webhooks for subscription lifecycle, orders |
| **Test mode** | Sandbox environment available |
| **Framework adapters** | **12 frameworks including SvelteKit** — this is huge for Grove |
| **Special features** | Auto license keys, GitHub repo access, Discord roles, file downloads |

**Polar API Resources:**

| Resource | Equivalent to Stripe |
|----------|---------------------|
| Products | ✅ Products (but no variants — each is a separate product) |
| Checkouts | ✅ Checkout Sessions |
| Customers | ✅ Customers |
| Orders | ✅ Charges / PaymentIntents |
| Subscriptions | ✅ Subscriptions |
| Customer Portal | ✅ Billing Portal |
| Benefits | ❌ No Stripe equivalent (entitlements system) |
| Webhooks | ✅ Webhooks |
| Meters | ✅ Usage records (metered billing) |

### Grove PaymentProvider Interface Mapping

How well does each map to Grove's existing `PaymentProvider` interface at `libs/engine/src/lib/payments/types.ts`?

| Interface Method | Paddle | Polar.sh |
|-----------------|--------|----------|
| `syncProduct()` | ✅ Products API | ✅ Products API |
| `syncPrice()` | ✅ Prices API | ⚠️ Prices are per-product, not separate entities |
| `archiveProduct()` | ✅ Archive via API | ✅ Archive (can't delete, only archive) |
| `createCheckoutSession()` | ✅ Transactions API / Paddle.js | ✅ Checkouts API / embedded component |
| `getCheckoutSession()` | ✅ Get transaction | ✅ Get checkout |
| `getPaymentStatus()` | ✅ Transaction status | ✅ Order status |
| `refund()` | ✅ Adjustments API (credits/refunds) | ⚠️ Refunds via API but Polar controls policy (60-day window) |
| `getSubscription()` | ✅ Subscriptions API | ✅ Subscriptions API |
| `cancelSubscription()` | ✅ Cancel subscription | ✅ Cancel subscription |
| `resumeSubscription()` | ✅ Resume subscription | ✅ Resume subscription |
| `syncCustomer()` | ✅ Customers API | ✅ Customers API |
| `getCustomer()` | ✅ Get customer | ✅ Get customer |
| `createBillingPortalSession()` | ✅ Customer portal (built-in) | ✅ Customer portal |
| `handleWebhook()` | ✅ HMAC verification + events | ✅ Webhook verification + events |
| `createConnectAccount()` | ❌ No marketplace equivalent | ❌ No marketplace equivalent |

**Paddle: 13/14 methods fully implementable.** Only missing Connect (marketplace), which is a Stripe-specific feature.

**Polar: 12/14 methods implementable.** Missing Connect, and `syncPrice()` needs adaptation since Polar doesn't separate prices from products.

### Verdict

Both are dramatically better than Adyen (which could only implement 8/14). Either could slot into Grove's `PaymentProvider` interface with manageable effort.

- **Paddle** has the more mature, Stripe-like API model — resources map almost 1:1
- **Polar** has the better framework story — native SvelteKit adapter is a significant DX win for Grove

---

## 4. Subscription Management

This was the dealbreaker for Adyen. How do Paddle and Polar handle it?

### Paddle Subscription Lifecycle

```
  Create Plan → Customer Checkout → subscription.created
       │
       ▼
  Trial Period (optional) → subscription.trialing
       │
       ▼
  First Payment → subscription.activated
       │
       ├─→ Plan Change → subscription.updated (proration handled)
       ├─→ Payment Fails → subscription.past_due → dunning
       ├─→ Pause → subscription.paused → Resume → subscription.resumed
       │
       ▼
  Cancel → subscription.canceled (at period end or immediately)
```

**Paddle handles**: Plan creation, upgrades/downgrades with proration, dunning (automatic retry on failed payments), pause/resume, cancellation with retention flows (new Jan 2026), billing portal for customers, invoice generation, usage-based metering.

**Paddle does NOT handle**: Stripe Connect marketplace payouts (different model)

### Polar Subscription Lifecycle

```
  Create Product → Customer Checkout → subscription created
       │
       ▼
  Trial Period (configurable in days/weeks/months/years)
       │
       ▼
  First Payment → subscription active
       │
       ├─→ Benefits auto-delivered (license keys, Discord, GitHub)
       ├─→ Payment Fails → dunning
       │
       ▼
  Cancel → subscription canceled
```

**Polar handles**: Product creation, subscriptions with trials, automatic benefit delivery, dunning, customer portal, flexible billing intervals (even "every 2 weeks"), pay-what-you-want pricing.

**Polar limitations**: Can't change billing cycle or pricing type after product creation. No variants — everything is a separate product. Less mature proration/upgrade flow.

### Verdict

**Paddle is the clear winner for subscription management.** It has full parity with Stripe Billing — prorations, pause/resume, cancellation flows, usage metering, the works. It's what you'd expect from a platform that's been doing this for 12 years.

**Polar is adequate** for straightforward subscription billing but less flexible for complex plan changes. The "everything is a product, no variants" model means tier changes require more orchestration on your side.

---

## 5. Content Policy & Queer Creator Safety

This matters deeply for Grove. Let's look at what each platform explicitly prohibits.

### Paddle — Acceptable Use Policy

**Prohibited:**
- Adult/sexually-oriented content and services
- Dating services/applications
- Products celebrating violence based on race, religion, disability, gender, **sexual orientation**, or national origin
- Gambling, physical products, financial services, pseudo-science

**Key language**: Paddle explicitly **protects** against violence targeting sexual orientation. They don't restrict LGBTQ+ content — they restrict content that targets LGBTQ+ people. This is the right framing.

**No vague "offensive content" clause** like Adyen has. Restrictions are tied to specific categories (adult content, gambling, etc.), not subjective judgments.

**Risk for Grove**: Low. A writing/blogging platform for queer creators selling SaaS subscriptions doesn't trigger any prohibited categories. Writing about queer experiences ≠ "adult content."

### Polar.sh — Acceptable Use Policy

**Prohibited:**
- Illegal/age-restricted products (drugs, alcohol, tobacco)
- Financial advice, investment strategies
- IPTV services, IP cloaking
- Pseudo-science, travel services, medical advice

**Key language**: "Something you'd proudly boast about in public — nothing illegal, unfair, deceptive, abusive, harmful, or shady." This is broad but positive-framing.

**No mention of adult content restrictions** in the same explicit way as Paddle. No "offensive content" clause. The policy focuses on fraud prevention and legal compliance rather than content policing.

**Risk for Grove**: Low. Polar's policy is the most permissive of any MoR we've reviewed. It's designed for indie developers selling digital products — exactly what Grove is.

### The Stripe LGBTQ+ Incident (August 2025)

Worth noting: In August 2025, Stripe employees reportedly told customers that LGBTQ+ content purchases were banned. Stripe's CEO called this "totally wrong" and apologized, but the incident happened. Neither Paddle nor Polar has any similar controversy.

### Verdict

Both Paddle and Polar are **safer for queer creators** than Stripe (which had the 2025 incident) or Adyen (which has vague "offensive content" language). Polar's policy is the most permissive. Paddle's is more structured but equally safe.

---

## 6. Checkout Experience

What do Grove's customers actually see when they pay?

### Paddle

- **Hosted overlay**: Paddle.js opens a checkout overlay on your site — customers don't leave your page
- **Custom subdomains**: Since Sep 2025, you can use `checkout.yourgrove.com` style URLs
- **Branding**: Customers see "PADDLE.COM" or "PADDLE.NET" on their bank statements
- **Payment methods**: Credit/debit cards, PayPal, Apple Pay, Google Pay, wire transfers. 30+ currencies
- **Localization**: Automatic currency, language, and tax display based on customer location
- **Express checkout**: Apple Pay one-click (new Feb 2026)

### Polar

- **Three modes**: Checkout links (redirect), embedded components (inline on your page), or API-driven (full control)
- **Branding**: Customers see "POLAR" on their bank statements
- **Payment methods**: Credit/debit cards via Stripe. No PayPal, no BNPL, no regional methods
- **Localization**: Multi-currency support (10 currencies in private beta)
- **SvelteKit component**: Native embedded checkout component for SvelteKit

### Verdict

**Paddle wins on payment methods and polish** — PayPal, Apple Pay, Google Pay, wire transfers, 30+ currencies. This directly impacts conversion rates.

**Polar wins on integration simplicity** — native SvelteKit components mean less work for Grove specifically. But card-only limits accessibility.

---

## 7. Migration Path from Stripe

What would switching actually look like?

### Common to Both

- **Paddle and Polar cannot import Stripe payment methods.** Active subscribers must re-enter card details
- **Recommended approach**: Grandfather existing Stripe customers, route new signups to the MoR. Stripe cohort shrinks naturally over 12–18 months
- **Database**: Grove's `provider_*` columns already support any provider ID format — no schema changes needed
- **Factory pattern**: Add `"paddle"` or `"polar"` to `ProviderType` union in `payments/index.ts`

### Migrating to Paddle

| Step | Effort | Notes |
|------|--------|-------|
| Implement `PaddleProvider` class | Medium | Maps well to PaymentProvider interface — 13/14 methods |
| Wire into factory (`payments/index.ts`) | Trivial | Add case to switch statement |
| Rewrite checkout flow (`apps/plant`) | Medium | Replace Stripe Checkout with Paddle.js overlay |
| Webhook handler | Medium | Different event names/payload shapes, but same concept |
| Billing portal | Low | Paddle has built-in portal — just link to it |
| Update Warden service | Medium | Different API for reading subscription/customer data |
| Tier config | Trivial | Replace Stripe price_xxx IDs with Paddle price IDs |
| Dual-provider support | Medium | Run Stripe + Paddle simultaneously during transition |
| **Total estimated effort** | **3–4 weeks** | Paddle's Stripe-like API model reduces surprise |

**Paddle claims average migration takes 12 days.** For Grove's relatively simple billing model (4 tiers, monthly/yearly), that's plausible.

### Migrating to Polar

| Step | Effort | Notes |
|------|--------|-------|
| Implement `PolarProvider` class | Medium | 12/14 methods — `syncPrice()` needs adaptation |
| Wire into factory | Trivial | Add case |
| Integrate SvelteKit adapter | Low | Native framework support — less glue code |
| Checkout flow | Low-Medium | Embedded component or checkout links |
| Webhook handler | Medium | Different events/payloads |
| Billing portal | Low | Polar has built-in portal |
| Products setup | Medium | No variants — each tier+interval = separate product (8 products total) |
| Dual-provider support | Medium | Same as Paddle |
| **Total estimated effort** | **2–3 weeks** | SvelteKit adapter saves time, simpler API |

**Polar's SvelteKit adapter could make this faster than Paddle** for Grove specifically, since there's less framework plumbing to build.

---

## 8. The "What If They Disappear?" Question

### Paddle

Probability of disappearing: **Very low.** $1.4B valuation, $343M recent raise, 200+ employees, 4,000+ customers, 12 years old. If Paddle somehow failed, the migration window would likely be months, not days.

### Polar

Probability of disappearing: **Non-trivial.** Young startup, small team, unclear revenue/profitability. However:
- **Open source** — you could theoretically fork the codebase
- **Built on Stripe Connect** — underneath, your customers' payments still go through Stripe
- **Data portability** — Polar claims 100% data ownership

**The hedge**: Since Polar runs on Stripe Connect under the hood, a Polar shutdown would mean falling back to... Stripe. Which you already know how to do. The migration would be "unwrap the MoR layer" rather than "find an entirely new provider."

---

## Head-to-Head Summary

| Dimension | Paddle | Polar.sh | Winner |
|-----------|--------|----------|--------|
| **Company stability** | $1.4B, 12 years, 200+ staff | Young startup, small team | Paddle |
| **Pricing (US)** | 5% + $0.50 | 4% + $0.40 | Polar |
| **Pricing (international)** | 5% + $0.50 (all-in) | 4% + $0.40 + 1.5% intl + 0.5% sub | Paddle (simpler) |
| **Pricing (hidden costs)** | None | $15/chargeback, payout fees | Paddle |
| **Subscription management** | Full Stripe Billing parity | Adequate, less flexible | Paddle |
| **API maturity** | 12 years of iteration | Young but clean | Paddle |
| **TypeScript SDK** | Official, well-maintained | Official, 4 languages | Tie |
| **SvelteKit support** | Community/manual | **Native adapter** | **Polar** |
| **Checkout UX** | Overlay, Apple Pay, PayPal | Links, embedded, API | Paddle |
| **Payment methods** | Cards, PayPal, Apple Pay, GPay, wire | Cards only | Paddle |
| **Content policy** | Clear, structured, queer-safe | Permissive, queer-safe | Tie |
| **Open source** | No | Yes | Polar |
| **Philosophical alignment** | Professional SaaS tool | Built for indie creators | Polar |
| **Migration effort** | ~3–4 weeks | ~2–3 weeks | Polar |
| **Disappearance risk** | Very low | Medium | Paddle |
| **Grove PaymentProvider fit** | 13/14 methods | 12/14 methods | Paddle (slightly) |

---

## Recommendation

### If Safety and Maturity Matter Most: **Paddle**

Paddle is the grown-up choice. It's what you pick when you want to solve the MoR problem and not think about it again for years. The API is mature, subscription management is full-featured, payment methods are comprehensive, and the company isn't going anywhere.

The trade-off is higher fees ($0.90 on an $8 Seedling vs Polar's $0.76) and no special sauce for indie/queer creators. It's a professional tool, not a community.

### If Alignment and Cost Matter Most: **Polar.sh**

Polar is the romantic choice. It's open source, indie-focused, cheapest MoR on the market, has a native SvelteKit adapter, and feels like it was built for exactly the kind of project Grove is. The team clearly understands the indie developer audience.

The trade-off is startup risk (what if they shut down?), card-only payments (no PayPal/Apple Pay), less mature subscription management, and additional fees that add up for international customers.

### The Third Option: **Both**

This sounds complicated but is actually the most interesting path:

1. **Use Polar for new signups** — cheapest fees, native SvelteKit, delightful DX
2. **Keep Stripe as the fallback** — existing subscribers stay on Stripe during transition
3. **If Polar proves reliable over 6–12 months**, go all-in
4. **If Polar stumbles**, you still have Stripe and your existing `PaymentProvider` abstraction makes switching painless

Grove's architecture was literally built for this. The `PaymentProvider` interface + factory pattern + generic `provider_*` database columns mean you can run multiple providers simultaneously with minimal friction. The code is already designed for this exact scenario.

### If Starting Today From Scratch: **Polar**

If Grove had no existing Stripe integration and was choosing a provider today, Polar would be the pick. Cheapest MoR, native SvelteKit, open source, built for this exact audience. The startup risk is real but manageable.

### Given Reality (Existing Stripe Integration): **Paddle or the Both-Path**

Since Stripe is already live and working, the question is what justifies the migration effort. Paddle justifies it through stability and completeness. The Both-Path justifies it through minimal risk and the ability to evaluate Polar in production before committing.

---

## Sources

### Paddle
- [Paddle Official](https://www.paddle.com/)
- [Paddle Pricing](https://www.paddle.com/pricing)
- [Paddle Developer Docs](https://developer.paddle.com/)
- [Paddle Node.js SDK](https://github.com/PaddleHQ/paddle-node-sdk)
- [Paddle AUP — What Can't You Sell](https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle)
- [Paddle Webhooks Overview](https://developer.paddle.com/webhooks/overview)
- [Paddle API Reference](https://developer.paddle.com/api-reference/overview)
- [Paddle Changelog](https://developer.paddle.com/changelog/overview)
- [Paddle Review — Dodo Payments](https://dodopayments.com/blogs/paddle-review)
- [Paddle Review — G2](https://www.g2.com/products/paddle/reviews)
- [Paddle Review — The CFO Club](https://thecfoclub.com/tools/paddle-software-review/)
- [Stripe vs Paddle — DesignRevision](https://designrevision.com/blog/stripe-vs-paddle)
- [Stripe vs Paddle — Flowjam](https://www.flowjam.com/blog/paddle-vs-stripe-billing-2024-complete-comparison-guide-for-saas)
- [Paddle vs Stripe — Boathouse](https://www.boathouse.co/knowledge/paddle-vs-stripe-which-billing-solution-is-better-for-you)
- [Paddle Integration Guide — AverageDevs](https://www.averagedevs.com/blog/paddle-integration-for-saas)

### Polar.sh
- [Polar Official](https://polar.sh)
- [Polar Pricing](https://polar.sh/resources/pricing)
- [Polar Docs — Introduction](https://polar.sh/docs/introduction)
- [Polar Docs — Products](https://polar.sh/docs/features/products)
- [Polar Customer Management](https://polar.sh/features/customers)
- [Polar Why Polar](https://polar.sh/resources/why)
- [Polar Terms of Service](https://polar.sh/legal/terms)
- [Polar Acceptable Use](https://polar.sh/docs/merchant-of-record/acceptable-use)
- [Polar Review — Dodo Payments](https://dodopayments.com/blogs/polar-sh-review)
- [Polar Review — Buildcamp](https://www.buildcamp.io/blogs/stripe-vs-polarsh-which-payment-platform-is-best-for-your-saas)

### Context
- [Stripe LGBTQ+ Incident — PinkNews](https://www.thepinknews.com/2025/08/14/stripe-lgbtq-content-purchase-ban/)
- [Best MoR Platforms 2026 — Fungies](https://fungies.io/the-best-merchant-of-record-platforms-for-saas-in-2026/)
- [MoR Providers 2026 — Cleverbridge](https://grow.cleverbridge.com/blog/top-merchant-of-record-providers-2026)

---

*Two creatures at the watering hole. One is a sturdy oak — deep roots, wide canopy, unshakable in a storm. The other is a sapling — young, flexible, growing toward the same sun Grove reaches for. Both would make good companions. The oak won't surprise you. The sapling might become something extraordinary — or it might not survive the winter. But the forest has room for both, and Grove's architecture was built to let them drink side by side.*
