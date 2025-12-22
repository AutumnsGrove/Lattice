# Pricing Discussions & Decisions

*Internal document tracking pricing evolution and rationale*

*Last updated: December 2025*

---

## Current Pricing Structure (December 2025)

### Subscription Tiers

| Feature | Seedling | Sapling | Oak | Evergreen |
|---------|:--------:|:-------:|:---:|:---------:|
| **Monthly** | **$8** | **$12** | **$25** | **$35** |
| **Yearly (15% off)** | $82 | $122 | $255 | $357 |
| Posts | 50 | 250 | Unlimited | Unlimited |
| Storage | 1 GB | 5 GB | 20 GB | 100 GB |
| Themes | 3 + accent | 10 + accent | Customizer | + Custom Fonts |
| Meadow | ✓ | ✓ | ✓ | ✓ |
| Public Comments | Unlimited | Unlimited | Unlimited | Unlimited |
| Custom Domain | — | — | BYOD only | ✓ (incl. search) |
| @grove.place Email | — | Forward only | Full (send/receive) | Full (send/receive) |
| Domain Registration | — | — | — | Included (up to $100/yr) |
| Privacy Controls | — | — | — | Login-required option |
| Support | Community | Email | Priority email | 8hrs free + priority |
| Analytics | Basic | Basic | Full | Full |
| **Target User** | *Curious* | *Hobbyists* | *Serious* | *Professional* |

### Domain Search Service (Evergreen)

| Turnaround | Setup Fee | Credited As |
|:----------:|:---------:|:-----------:|
| Same Day | $200 | 4 months Evergreen |
| 3 Days | $100 | 2 months Evergreen |
| 1 Week | $50 | 1 month Evergreen |

**Note:** Domain registration cost (~$20/year for standard TLDs) included in Evergreen subscription up to $100/year. Premium domains over $100/year: user covers the difference.

### Bring Your Own Domain (BYOD)

Available at Oak tier and above. Users who already own a domain can connect it without using the domain search service. No setup fee, no domain registration cost to Grove.

### Support Pricing (Beyond Included Hours)

| Tier | Included Support | Additional Hours |
|------|------------------|------------------|
| Seedling | Community/docs only | $100/hour |
| Sapling | Email support | $100/hour |
| Oak | Priority email | $100/hour |
| Evergreen | 8 hours free (first month) | $75/hour |

---

## Pricing Rationale

### Why Four Tiers?

**Seedling ($8):** Low-friction entry point for people who want to try blogging without commitment. 50 posts is enough to genuinely explore the platform. Creates upgrade path when they hit limits.

**Sapling ($12):** For regular bloggers who know they'll stick around. 250 posts covers most hobbyist needs. Email forwarding gives a taste of professional features.

**Oak ($25):** The "serious blogger" tier. Unlimited posts, BYOD, full email capabilities. For people whose blog is part of their identity or side business.

**Evergreen ($35):** Full-service option. Domain search, registration included, priority support. For professionals who want Grove to handle everything.

### Why 15% Yearly Discount?

- Industry standard is 15-20%
- Reduces churn (committed users)
- Improves cash flow predictability
- Rewards commitment without being so steep it cannibalizes monthly

### Why $35 Instead of $50 for Evergreen?

Original thinking: $50 felt "premium" and covered support costs.

Revised thinking: The value delta between Oak ($25) and Evergreen ($50) wasn't justified. At $35:
- Only $10 more than Oak
- Domain search + registration included justifies the difference
- Support hours are genuinely valuable
- More accessible price point for serious users

### Why Post Limits?

**Seedling (50 posts):** Creates natural upgrade trigger. "You've been writing consistently—time to commit!"

**Sapling (250 posts):** Generous for hobbyists, but serious bloggers will eventually need more. Natural ceiling for "hobby" vs "serious" distinction.

**Oak/Evergreen (Unlimited):** Once you're paying $25+, artificial limits feel punitive. Trust that storage limits provide natural constraints.

---

## Email Feature Decisions

### Implementation Plan

1. **Cloudflare Email Routing (Free):** Sapling tier forwarding
   - API: `POST /zones/{zone_id}/email/routing/rules`
   - Automatic provisioning when user reaches Sapling tier
   - Forward to user's personal email address

2. **Forward Email ($3/month total):** Oak+ full mailboxes
   - Full IMAP/SMTP access
   - Users can send AND receive from their @grove.place address
   - Unlimited aliases on one $3/month plan

### Why Tiered Email?

**Sapling (forwarding only):**
- Costs Grove $0 (Cloudflare is free)
- Users get professional-looking contact address
- Creates upgrade incentive: "want to reply from this address? upgrade!"

**Oak+ (full mailbox):**
- Costs Grove ~$3/month total for all users
- Fully professional email experience
- Key differentiator from Sapling tier

---

## Domain-Related Decisions

### Domain Registration Bundling

**Included in Evergreen:** Registration up to $100/year

**Rationale:**
- Most .com/.net/.org domains are $10-30/year
- Premium TLDs (.io, .co, etc.) are $30-60/year
- $100 covers 95%+ of domains users would want
- Exotic TLDs (premium .com resales, etc.) require user contribution

**If domain costs >$100/year:**
- User covers the difference
- Added to monthly subscription as pro-rated amount
- Example: $180/year domain = +$6.67/month

### Domain Overage Billing Implementation

**Detection Flow:**
1. When domain is selected via Acorn, fetch registration price from registrar API (Cloudflare Registrar)
2. If price > $100/year, calculate monthly overage: `(price - 100) / 12`

**User Experience:**
1. Display overage during domain selection:
   > "This domain costs $180/year. Your Evergreen subscription includes $100/year, so your monthly rate will be $35 + $6.67 = $41.67"
2. User confirms before proceeding
3. Overage shown as line item on all invoices

**Stripe Implementation:**
```typescript
// Create custom price for overage
const overagePrice = await stripe.prices.create({
  unit_amount: Math.round((domainCost - 10000) / 12), // cents
  currency: 'usd',
  recurring: { interval: 'month' },
  product: DOMAIN_OVERAGE_PRODUCT_ID,
  metadata: { domain: domainName, annual_cost: domainCost },
});

// Add to subscription
await stripe.subscriptions.update(subscriptionId, {
  items: [
    { id: existingItemId },
    { price: overagePrice.id },
  ],
});
```

**Database Additions:**
```sql
ALTER TABLE user_subscriptions ADD COLUMN domain_name TEXT;
ALTER TABLE user_subscriptions ADD COLUMN domain_annual_cost_cents INTEGER;
ALTER TABLE user_subscriptions ADD COLUMN domain_overage_monthly_cents INTEGER;
ALTER TABLE user_subscriptions ADD COLUMN domain_registered_at TIMESTAMP;
ALTER TABLE user_subscriptions ADD COLUMN domain_expires_at TIMESTAMP;
ALTER TABLE user_subscriptions ADD COLUMN stripe_overage_price_id TEXT;
```

**Renewal Handling:**
- 60 days before expiration: Check if registrar price changed
- If increased <20%: Renew, notify user of new rate
- If increased >20%: Require user confirmation before renewal
- Store price history for transparency

### Domain Search Service Value

**Why charge for faster turnaround?**

The domain search tool (Acorn) uses AI to reduce 2-week manual searches to 1-2 hours. This represents genuine labor savings.

**Setup fees credited to subscription:**
- Users don't "lose" the money
- Creates commitment to Evergreen tier
- Feels fair: pay for expedited service, get subscription credit

### BYOD (Bring Your Own Domain)

**Available at Oak+**

**Why not Sapling?**
- Custom domains require more support (DNS issues, SSL)
- Users with their own domains are typically more serious
- Creates clear upgrade incentive

**Why no fee?**
- User already paid for their domain
- No domain search labor required
- DNS setup is minimal effort

---

## Revenue Projections (Updated)

### Conservative Estimate (Early Stage)

Most SaaS products see 60-70% concentration on entry tier initially. Using conservative distribution:

**Expected tier distribution:** 60% Seedling, 25% Sapling, 10% Oak, 5% Evergreen

| Users | Monthly Revenue | Annual Revenue |
|:-----:|:---------------:|:--------------:|
| 50 | $545 | $6,540 |
| 100 | $1,090 | $13,080 |
| 500 | $5,450 | $65,400 |
| 1,000 | $10,900 | $130,800 |

**Calculation basis (per 100 users):**
- 60 Seedling × $8 = $480
- 25 Sapling × $12 = $300
- 10 Oak × $25 = $250
- 5 Evergreen × $35 = $175
- **Per 100 users = $1,205** (weighted average: $12.05/user)

### Optimistic Estimate (Mature Product)

As product matures and Seedling users upgrade or churn:

**Mature tier distribution:** 40% Seedling, 35% Sapling, 15% Oak, 10% Evergreen

| Users | Monthly Revenue | Annual Revenue |
|:-----:|:---------------:|:--------------:|
| 50 | $730 | $8,760 |
| 100 | $1,465 | $17,580 |
| 500 | $7,325 | $87,900 |
| 1,000 | $14,650 | $175,800 |

**Calculation basis (per 100 users):**
- 40 Seedling × $8 = $320
- 35 Sapling × $12 = $420
- 15 Oak × $25 = $375
- 10 Evergreen × $35 = $350
- **Per 100 users = $1,465** (weighted average: $14.65/user)

### Key Milestones

| Milestone | Conservative | Optimistic |
|-----------|:------------:|:----------:|
| $1,000 MRR | ~92 users | ~68 users |
| $3,000 MRR | ~275 users | ~205 users |
| Break-even* | TBD | TBD |

*Break-even depends on infrastructure costs, support time, and Autumn's living expenses.

*Note: Actual revenue likely higher as yearly plans, domain search fees, and support hours are not included.*

---

## Blog Access & Privacy Controls

### Default Access Model

**Blogs are publicly readable by default.** Anyone can visit a Grove blog and read posts without logging in or creating an account. This is intentional—it aligns with Grove's mission to be a space for authentic expression on the open web.

### What Requires Login

**Meadow (the community feed)** requires a free account:
- Browsing the community feed
- Following other blogs
- Reacting to posts
- Leaving comments or replies

**Free accounts** provide full Meadow access. No paid tier needed.

### Privacy Controls (Evergreen Only)

**Only Evergreen tier users** can choose to make their blog require login to read. This is a premium feature because:

1. **Most users benefit from public blogs:** Public access is better for discovery, sharing, and building readership
2. **Privacy has infrastructure costs:** Login-required blogs need additional access control checks on every page load
3. **It's a professional use case:** Users who need private blogs (client work, paid memberships, internal documentation) are typically professionals willing to pay for the feature
4. **Maintains Grove's open web ethos:** Keeping this as an opt-in premium feature (rather than default) reinforces that Grove is about sharing, not hiding

### Implementation Notes

**When login-required is enabled:**
- Blog homepage shows "Login Required" message
- Individual post URLs redirect to login
- RSS feed is **disabled entirely** (authenticated RSS breaks most feed readers)
- Public sharing is disabled
- Search engines are blocked via robots.txt

**Default behavior (all other tiers):**
- Blogs are publicly accessible
- No login required to read
- RSS feeds work
- Search engines can index (with AI crawler blocking per privacy policy)
- Public sharing enabled

### Downgrade Behavior

**What happens when an Evergreen user with privacy enabled downgrades:**

1. **7-day warning email** sent when downgrade is initiated
   - Subject: "Your blog will become public in 7 days"
   - Explains privacy controls will be disabled
   - Provides option to cancel downgrade
   - Lists alternatives (export data, delete blog, stay on Evergreen)

2. **On downgrade effective date:**
   - Privacy mode automatically set to `public`
   - Blog becomes publicly accessible
   - RSS feed re-enabled
   - Search engine indexing re-enabled
   - Confirmation email sent: "Your blog is now public"

3. **Grace period considerations:**
   - No grace period for privacy feature (auto-disable on downgrade)
   - User can upgrade back to Evergreen anytime to re-enable
   - Privacy setting preserved in database (can be re-enabled if user upgrades again within 30 days)

4. **Edge cases:**
   - Payment failure during Evergreen subscription: 7-day grace, then auto-disable privacy
   - Trial period end: Same 7-day warning applies
   - Admin-initiated downgrade: Immediate email notification, privacy disabled on effective date

### Security Considerations

**Critical security requirements for private blogs:**

1. **Authentication Checks**
   - All blog routes must check authentication before serving content
   - Direct post URLs (`/blog/post-slug`) must redirect to login if private
   - API endpoints must not return private blog content to unauthenticated requests
   - Middleware should handle authentication checks, not per-route logic

2. **Content Leakage Prevention**
   - OpenGraph tags (`og:title`, `og:description`, `og:image`) must not render for private blogs when unauthenticated
   - RSS feed URLs must return 403 or redirect to login for private blogs
   - Preview images and thumbnails must not be publicly accessible
   - Sitemap must exclude private blogs
   - robots.txt must include `Disallow: /` for private blogs

3. **Metadata Protection**
   - API responses must not leak private blog metadata (post count, post titles, author info)
   - Search endpoints must not return results from private blogs for unauthenticated users
   - Meadow feed must not show posts from private blogs (unless user is logged in)

4. **User Education**
   - Clear warning in post editor: "This post will be publicly visible"
   - Confirmation modal when publishing first post: "Your blog is public. Anyone can read this."
   - Dashboard banner for non-Evergreen users: "Your blog is publicly accessible"
   - Privacy settings page clearly explains public vs private

5. **CDN and Caching**
   - Cloudflare cache must not serve private content to unauthenticated users
   - Cache-Control headers must be `private, no-store` for login-required blogs
   - Media files (images, videos) must respect blog privacy settings
   - R2 bucket access must check blog privacy before serving assets

6. **Session Security**
   - Session fixation prevention (regenerate session ID after login)
   - Secure session cookies (`HttpOnly`, `Secure`, `SameSite=Strict`)
   - Session timeout for inactive users (30 minutes)
   - Referrer-Policy header set to `no-referrer` or `same-origin` for private blogs

7. **Enumeration Prevention**
   - Timing attack mitigation (constant-time responses for private blog checks)
   - Generic error messages (don't reveal if blog exists when unauthenticated)
   - Rate limiting on blog access attempts
   - No metadata leakage through 404 vs 403 differences

8. **Image Hotlinking**
   - R2 image URLs must validate blog privacy before serving
   - Signed URLs for private blog images (time-limited)
   - Referer checking for hotlink prevention
   - Direct R2 URL access blocked for private blogs

9. **API Versioning**
   - Privacy controls must be built into API from day one
   - All API endpoints must check blog privacy before returning data
   - Future API versions maintain privacy checks
   - No backwards compatibility issues that bypass privacy

### Implementation Checklist

**Phase 1: Backend (Privacy Controls)**
- [ ] Add `privacy_mode` field to `blogs` table (`public` | `login_required`)
- [ ] Create middleware for blog authentication checks
- [ ] Implement API access control for private blogs
- [ ] Update RSS feed endpoint to disable for private blogs (no authenticated RSS)
- [ ] Block private blog content from Meadow feed for unauthenticated users
- [ ] Add privacy checks to media serving (R2 bucket access)
- [ ] Implement audit logging for privacy setting changes (who, when, old/new value)
- [ ] Add rate limiting for blog access attempts (prevent enumeration)
- [ ] Create tier validation checks (Evergreen-only for privacy controls)
- [ ] Implement downgrade handler (auto-disable privacy, send emails)
- [ ] Add billing integration (verify active Evergreen before allowing privacy toggle)

**Phase 2: Frontend (User Experience)**
- [ ] Build privacy settings UI (Evergreen tier only)
- [ ] Add "public blog" warning to post editor
- [ ] Create "first publish" confirmation modal
- [ ] Add privacy status badge to dashboard
- [ ] Implement login redirect for private blog URLs
- [ ] Design "Login Required" page for private blogs

**Phase 3: SEO & Discovery**
- [ ] Update robots.txt generation to block private blogs
- [ ] Remove private blogs from sitemap
- [ ] Strip OpenGraph/meta tags from private blog pages when unauthenticated
- [ ] Update AI crawler blocking to respect privacy settings
- [ ] Disable public share links for private blogs

**Phase 4: Testing & Security Audit**
- [ ] Test unauthenticated access to all private blog routes
- [ ] Verify OG tags don't leak private content
- [ ] Test RSS feed disabled for private blogs
- [ ] Verify media files respect privacy settings (R2 hotlinking)
- [ ] Test API endpoints for metadata leakage
- [ ] Test timing attack resistance (constant-time responses)
- [ ] Verify session fixation prevention
- [ ] Test Referrer-Policy headers for private blogs
- [ ] Test downgrade flow (email warnings, auto-disable)
- [ ] Verify tier validation (non-Evergreen can't enable privacy)
- [ ] Test audit logging for all privacy changes
- [ ] Perform penetration testing (OWASP top 10)
- [ ] Security audit by external reviewer before launch

---

## Open Questions

1. **Support time tracking:** How much time do Evergreen users actually need in month 1?
2. **Email adoption:** Will users actually use @grove.place emails or ignore them?
3. **Tier distribution:** Is 40% Seedling realistic or will more people skip to Sapling?
4. **BYOD demand:** How many Oak users already have domains?
5. **Domain price threshold:** Is $100/year the right cutoff for included registration?

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Nov 2025 | Raised prices from $5-10 to $12-25 | Original pricing undervalued the product |
| Nov 2025 | Set support rate at $75/hour | Reflects actual value of time |
| Dec 2025 | Added Seedling tier at $8 | User feedback: $12 entry too high |
| Dec 2025 | Reduced Evergreen from $50 to $35 | Value delta not justified at $50 |
| Dec 2025 | Added @grove.place email feature | Low-cost high-value differentiator |
| Dec 2025 | Added BYOD option at Oak | Users with domains shouldn't need Evergreen |
| Dec 2025 | Set yearly discount at 15% | Industry standard, reduces churn |
| Dec 2025 | Set post limits (50/250/unlimited) | Creates natural upgrade triggers |
| Dec 2025 | Domain bundling up to $100/yr | Covers 95%+ of normal domains |
| Dec 2025 | Privacy controls (Evergreen only) | Blogs publicly readable by default; only Evergreen can require login |

---

## Competitive Context

| Platform | Entry Price | Mid Tier | Top Tier |
|----------|-------------|----------|----------|
| Ghost | $9/mo (500 members) | $25/mo | $50/mo |
| Substack | Free (10% of paid) | N/A | N/A |
| WordPress.com | $4/mo (ads) | $8/mo | $25/mo |
| Squarespace | $16/mo | $23/mo | $27/mo |
| **Grove** | **$8/mo** | **$12-25/mo** | **$35/mo** |

**Grove's positioning:** More affordable than Squarespace, more personal than Ghost, not algorithm-driven like Substack.

---

## Custom/Enterprise Plans

For users with special needs beyond Evergreen:

> **Custom Plans** — Need something specific? Let's talk. Custom storage, multiple domains, white-label options, team collaboration, dedicated support. Contact autumnbrown23@pm.me.

No public pricing. Handle case-by-case based on actual requirements.

---

*This document is for internal planning. Refer to `/docs/grove-pricing.md` for the public-facing pricing page.*
