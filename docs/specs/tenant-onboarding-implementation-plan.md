# Tenant Onboarding Implementation Plan

**Status:** Ready for Implementation
**Date:** December 2025
**Session:** Remote Implementation

---

## Architecture Overview

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Subdomain** | `create.grove.place` | Dedicated signup experience, separate from landing |
| **Auth Provider** | Heartwood (GroveAuth) | Already integrated; handles Google, GitHub, magic code |
| **Auth Flow** | Heartwood first → collect profile after | Leverages existing OAuth, avoids duplicate systems |
| **Tour Location** | `example.grove.place` + `autumnsgrove.com` | Demo site (Midnight Bloom) + real-world example |
| **D1 Creation** | After profile completion (free) or payment (paid) | Ensures commitment before provisioning |
| **Free Tier** | Stub implementation now, full later | Focus on paid tiers first |

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SIGNUP FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Landing Page (grove.place)                                              │
│     └─→ "Start your blog" button → create.grove.place                       │
│                                                                             │
│  2. Create Subdomain (create.grove.place)                                   │
│     ├─→ /                     Welcome + auth options (Google/GitHub/Email)  │
│     ├─→ /auth/callback        Heartwood callback → redirect to /profile     │
│     ├─→ /profile              Collect: username, display name, color, etc.  │
│     ├─→ /plans                Select plan (Seedling/Sapling/Oak/Evergreen)  │
│     ├─→ /checkout             Stripe Checkout (embedded or redirect)        │
│     ├─→ /success              Post-payment confirmation + tour start        │
│     └─→ /tour                 Interactive tour iframe/redirect              │
│                                                                             │
│  3. Tour                                                                    │
│     ├─→ example.grove.place   Demo blog walkthrough (Midnight Bloom)        │
│     └─→ autumnsgrove.com      Real-world example                            │
│                                                                             │
│  4. Handoff                                                                 │
│     └─→ {username}.grove.place/admin?welcome=true                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Database Migrations

**New Migration: `011_user_onboarding.sql`**

```sql
-- User onboarding state (stored in landing D1, linked to tenant)
CREATE TABLE IF NOT EXISTS user_onboarding (
  id TEXT PRIMARY KEY,

  -- Heartwood link
  groveauth_id TEXT UNIQUE NOT NULL,     -- From Heartwood /userinfo
  email TEXT NOT NULL,

  -- Profile data (collected after auth)
  display_name TEXT,
  username TEXT UNIQUE,                   -- Becomes subdomain
  favorite_color TEXT,                    -- HSL values or preset name
  interests TEXT DEFAULT '[]',            -- JSON array

  -- Progress tracking
  auth_completed_at INTEGER,              -- When Heartwood auth finished
  profile_completed_at INTEGER,           -- When profile form submitted
  plan_selected TEXT,                     -- 'seedling', 'sapling', 'oak', 'evergreen', 'free'
  plan_selected_at INTEGER,
  payment_completed_at INTEGER,           -- NULL for free tier
  tour_started_at INTEGER,
  tour_completed_at INTEGER,
  tour_skipped INTEGER DEFAULT 0,

  -- Checklist
  checklist_dismissed INTEGER DEFAULT 0,
  first_post_at INTEGER,
  first_vine_at INTEGER,
  theme_customized_at INTEGER,

  -- Follow-up emails
  welcome_email_sent INTEGER DEFAULT 0,
  day1_email_sent INTEGER DEFAULT 0,
  day3_email_sent INTEGER DEFAULT 0,
  day7_email_sent INTEGER DEFAULT 0,
  day30_email_sent INTEGER DEFAULT 0,
  checkin_emails_unsubscribed INTEGER DEFAULT 0,

  -- Stripe
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Link to tenant (once created)
  tenant_id TEXT,

  -- Timestamps
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_onboarding_groveauth ON user_onboarding(groveauth_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_username ON user_onboarding(username);
CREATE INDEX IF NOT EXISTS idx_onboarding_email ON user_onboarding(email);
CREATE INDEX IF NOT EXISTS idx_onboarding_tenant ON user_onboarding(tenant_id);

-- Reserved usernames table
CREATE TABLE IF NOT EXISTS reserved_usernames (
  username TEXT PRIMARY KEY,
  reason TEXT NOT NULL,  -- 'system', 'trademark', 'offensive', 'taken'
  created_at INTEGER DEFAULT (unixepoch())
);

-- Insert system reserved names
INSERT OR IGNORE INTO reserved_usernames (username, reason) VALUES
  ('admin', 'system'), ('api', 'system'), ('app', 'system'), ('auth', 'system'),
  ('login', 'system'), ('logout', 'system'), ('signup', 'system'), ('register', 'system'),
  ('account', 'system'), ('settings', 'system'), ('dashboard', 'system'), ('billing', 'system'),
  ('help', 'system'), ('support', 'system'), ('www', 'system'), ('mail', 'system'),
  ('email', 'system'), ('smtp', 'system'), ('cdn', 'system'), ('static', 'system'),
  ('assets', 'system'), ('media', 'system'), ('images', 'system'), ('files', 'system'),
  ('upload', 'system'), ('uploads', 'system'), ('grove', 'trademark'), ('groveplace', 'trademark'),
  ('meadow', 'trademark'), ('autumn', 'trademark'), ('lattice', 'trademark'),
  ('heartwood', 'trademark'), ('acorn', 'trademark'), ('create', 'system'), ('new', 'system'),
  ('blog', 'system'), ('blogs', 'system'), ('post', 'system'), ('posts', 'system'),
  ('feed', 'system'), ('rss', 'system'), ('atom', 'system'), ('sitemap', 'system'),
  ('robots', 'system'), ('favicon', 'system'), ('legal', 'system'), ('terms', 'system'),
  ('privacy', 'system'), ('dmca', 'system'), ('copyright', 'system'), ('abuse', 'system'),
  ('security', 'system'), ('status', 'system'), ('docs', 'system'), ('documentation', 'system'),
  ('about', 'system'), ('contact', 'system'), ('team', 'system'), ('root', 'system'),
  ('null', 'system'), ('undefined', 'system'), ('test', 'system'), ('demo', 'system'),
  ('example', 'system'), ('sample', 'system'), ('official', 'system'), ('verified', 'system'),
  ('moderator', 'system'), ('mod', 'system'), ('staff', 'system'), ('employee', 'system');
```

**Update to `tenants` table plan values:**
- Change `plan` CHECK constraint: `('free', 'seedling', 'sapling', 'oak', 'evergreen')`
- This requires a migration to alter the constraint

---

### Phase 2: Create Subdomain App (`create.grove.place`)

**Directory Structure:**
```
/home/user/GroveEngine/create/
├── src/
│   ├── routes/
│   │   ├── +page.svelte                    # Welcome + auth options
│   │   ├── +layout.svelte                  # Shared layout
│   │   ├── +layout.server.ts               # Auth state loader
│   │   ├── auth/
│   │   │   ├── +server.ts                  # Initiate Heartwood OAuth
│   │   │   └── callback/
│   │   │       └── +server.ts              # Handle Heartwood callback
│   │   ├── profile/
│   │   │   ├── +page.svelte                # Profile form (username, etc.)
│   │   │   └── +page.server.ts             # Form actions
│   │   ├── plans/
│   │   │   ├── +page.svelte                # Plan selection cards
│   │   │   └── +page.server.ts             # Plan selection action
│   │   ├── checkout/
│   │   │   ├── +page.svelte                # Stripe Checkout embed
│   │   │   └── +server.ts                  # Create checkout session
│   │   ├── success/
│   │   │   ├── +page.svelte                # Post-payment success
│   │   │   └── +page.server.ts             # Verify session, create tenant
│   │   ├── tour/
│   │   │   └── +page.svelte                # Tour intro/wrapper
│   │   └── api/
│   │       ├── check-username/
│   │       │   └── +server.ts              # Real-time username availability
│   │       └── webhooks/
│   │           └── stripe/
│   │               └── +server.ts          # Stripe webhook handler
│   ├── lib/
│   │   ├── server/
│   │   │   ├── stripe.ts                   # Stripe client & helpers
│   │   │   ├── tenant.ts                   # Tenant provisioning
│   │   │   ├── email.ts                    # Email sending
│   │   │   └── validation.ts               # Username validation
│   │   └── components/
│   │       ├── AuthButtons.svelte          # Google/GitHub/Email buttons
│   │       ├── UsernameInput.svelte        # Username with availability check
│   │       ├── ColorPicker.svelte          # Favorite color selector
│   │       ├── InterestsPicker.svelte      # Multi-select interests
│   │       ├── PlanCard.svelte             # Individual plan card
│   │       └── ProgressSteps.svelte        # Step indicator (1-2-3-4)
│   └── app.html
├── static/
├── wrangler.toml
├── package.json
├── svelte.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

### Phase 3: Routes & Components

#### 3.1 Welcome Page (`/`)

```svelte
<!-- Shows auth options: Google, GitHub, Email -->
<!-- Warm welcome message -->
<!-- Links to pricing for comparison -->
<!-- Progress indicator: Step 1 of 4 -->
```

**Functionality:**
- Display auth buttons (Google, GitHub, Magic Code)
- Each button initiates Heartwood OAuth with appropriate provider
- Store `return_to` in cookie for post-auth redirect

#### 3.2 Auth Routes

**`/auth` (GET):**
- Initiate Heartwood OAuth
- Query param: `?provider=google|github|email`
- Set PKCE state cookies
- Redirect to GroveAuth authorize endpoint

**`/auth/callback` (GET):**
- Exchange authorization code for tokens
- Fetch user info from GroveAuth `/userinfo`
- Create/update `user_onboarding` record
- Redirect to `/profile`

#### 3.3 Profile Page (`/profile`)

```svelte
<!-- Collect: Display Name, Username, Favorite Color, Interests -->
<!-- Real-time username availability checking -->
<!-- Skip option for optional fields -->
<!-- Progress indicator: Step 2 of 4 -->
```

**Functionality:**
- Pre-fill email from Heartwood
- Real-time username availability (debounced API call)
- Show suggestions if username taken
- Validate username format
- Save to `user_onboarding` table
- Redirect to `/plans`

#### 3.4 Plan Selection (`/plans`)

```svelte
<!-- 4 plan cards: Seedling, Sapling, Oak, Evergreen -->
<!-- Monthly/Yearly toggle -->
<!-- Feature highlights -->
<!-- "Free tier coming soon" stub -->
<!-- Progress indicator: Step 3 of 4 -->
```

**Pricing (from spec):**
| Plan | Monthly | Yearly (15% off) |
|------|---------|------------------|
| Seedling | $8 | $81.60 (~$6.80/mo) |
| Sapling | $12 | $122.40 (~$10.20/mo) |
| Oak | $25 | $255 (~$21.25/mo) |
| Evergreen | $35 | $357 (~$29.75/mo) |

**Functionality:**
- Click plan → store selection → redirect to `/checkout`
- Free tier: show "Coming soon" or redirect to waitlist

#### 3.5 Checkout (`/checkout`)

```svelte
<!-- Stripe Checkout embedded or redirect -->
<!-- Order summary sidebar -->
<!-- Back to plans link -->
<!-- Progress indicator: Step 4 of 4 -->
```

**Functionality:**
- Create Stripe Checkout session with:
  - `mode: 'subscription'`
  - `customer_email: user.email`
  - `metadata: { onboarding_id, username, plan }`
  - `success_url: /success?session_id={CHECKOUT_SESSION_ID}`
  - `cancel_url: /plans`
- Use embedded checkout (Stripe.js) or redirect

#### 3.6 Success Page (`/success`)

```svelte
<!-- Confirmation message -->
<!-- "Your blog is being set up..." spinner briefly -->
<!-- Then "Ready! Let's take a tour" -->
<!-- Skip tour option -->
```

**Functionality:**
- Verify Stripe session with `?session_id`
- If not already done by webhook:
  - Create tenant in D1
  - Set up subdomain routing (DNS already wildcards *.grove.place)
  - Create default settings
  - Send welcome email
- Redirect to `/tour` or their blog (if skipping)

#### 3.7 Stripe Webhook (`/api/webhooks/stripe`)

**Events to handle:**
- `checkout.session.completed` → Create tenant, mark payment complete
- `customer.subscription.updated` → Update plan status
- `customer.subscription.deleted` → Mark inactive
- `invoice.payment_failed` → Send notification

**Idempotency:**
- Store event ID in `webhook_events` table
- Check before processing

---

### Phase 4: Tenant Provisioning

**`/lib/server/tenant.ts`:**

```typescript
interface CreateTenantInput {
  onboardingId: string;
  username: string;
  displayName: string;
  email: string;
  plan: 'seedling' | 'sapling' | 'oak' | 'evergreen' | 'free';
  favoriteColor?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

async function createTenant(db: D1Database, input: CreateTenantInput): Promise<string> {
  const tenantId = crypto.randomUUID();

  // 1. Insert into tenants table
  await db.prepare(`
    INSERT INTO tenants (id, subdomain, display_name, email, plan, theme, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).bind(
    tenantId,
    input.username,
    input.displayName,
    input.email,
    input.plan,
    'default'
  ).run();

  // 2. Create platform_billing record (for paid tiers)
  if (input.plan !== 'free') {
    await db.prepare(`
      INSERT INTO platform_billing (id, tenant_id, plan, status, provider_customer_id, provider_subscription_id)
      VALUES (?, ?, ?, 'active', ?, ?)
    `).bind(
      crypto.randomUUID(),
      tenantId,
      input.plan,
      input.stripeCustomerId,
      input.stripeSubscriptionId
    ).run();
  }

  // 3. Create default tenant_settings
  const defaultSettings = [
    ['site_title', input.displayName],
    ['site_description', `${input.displayName}'s blog on Grove`],
    ['accent_color', input.favoriteColor || '#16a34a'],
  ];

  for (const [key, value] of defaultSettings) {
    await db.prepare(`
      INSERT INTO tenant_settings (tenant_id, setting_key, setting_value)
      VALUES (?, ?, ?)
    `).bind(tenantId, key, value).run();
  }

  // 4. Link onboarding record to tenant
  await db.prepare(`
    UPDATE user_onboarding SET tenant_id = ?, updated_at = unixepoch()
    WHERE id = ?
  `).bind(tenantId, input.onboardingId).run();

  return tenantId;
}
```

---

### Phase 5: Tour Implementation

**Approach:** Redirect-based tour with progress tracking

**Tour Stops:**
1. `example.grove.place?tour=1` - Homepage intro
2. `example.grove.place/post/midnight-blend?tour=2` - Blog post + vines
3. `example.grove.place/admin?tour=3` - Admin dashboard (read-only)
4. `example.grove.place/admin/posts/new?tour=4` - Post editor
5. `example.grove.place/admin/media?tour=5` - Media gallery
6. `autumnsgrove.com?tour=6` - Real-world example
7. `create.grove.place/tour/complete` - Completion + redirect

**Tour UI Component:**
- Floating overlay with title, description, progress
- Next/Back/Skip buttons
- Persists across page navigations via cookie/localStorage
- Tour state stored in `user_onboarding` table

**Implementation:**
- Add `TourOverlay.svelte` component to engine
- Check for `?tour=N` param in layout
- Display appropriate overlay content
- "Next" links to next tour URL
- "Skip" redirects to their blog

---

### Phase 6: Email Templates

**Templates to create:**

1. **Verification Email** (if using email magic code via Heartwood - already handled)

2. **Welcome Email** (immediate after tenant creation)
   - Blog URL
   - Quick tips
   - Link to tour (if skipped)

3. **Day 1 Checklist Reminder** (if checklist incomplete)
   - Progress summary
   - Encouragement
   - Help link

4. **Day 3 Check-in**
   - How's it going?
   - Conditional: post count, checklist status

5. **Day 7 Check-in**
   - One week milestone
   - Tips: RSS, vines, export

6. **Day 30 Check-in**
   - One month celebration
   - Stats: posts, words
   - Feedback request

---

### Phase 7: Onboarding Checklist Component

**Location:** Engine package (`packages/engine/src/lib/components/OnboardingChecklist.svelte`)

**Behavior:**
- Appears in admin sidebar when `?welcome=true` or checklist incomplete
- Tracks 4 items:
  - ✓ Complete the tour
  - ○ Write your first post
  - ○ Add a vine to a post
  - ○ Customize your theme
- Updates via API when actions complete
- Can be dismissed

---

## File Checklist

### New Files to Create

| File | Purpose |
|------|---------|
| `create/` (new SvelteKit app) | Entire signup subdomain |
| `packages/engine/migrations/011_user_onboarding.sql` | New tables |
| `packages/engine/migrations/012_update_tenant_plans.sql` | Update plan enum |
| `packages/engine/src/lib/components/OnboardingChecklist.svelte` | Checklist widget |
| `packages/engine/src/lib/components/TourOverlay.svelte` | Tour floating UI |
| `landing/src/lib/email/onboarding-templates.ts` | Email templates |

### Files to Modify

| File | Change |
|------|--------|
| `landing/src/routes/+page.svelte` | Add "Start your blog" CTA linking to create.grove.place |
| `docs/specs/tenant-onboarding-spec.md` | Update to reflect Heartwood auth approach |

---

## Implementation Order

1. **Database migrations** - Foundation for everything
2. **Create app scaffolding** - SvelteKit app structure
3. **Auth routes** - Heartwood integration
4. **Profile page** - Username validation, form
5. **Plans page** - UI for selection
6. **Checkout integration** - Stripe session creation
7. **Webhook handler** - Payment processing
8. **Tenant provisioning** - D1 creation logic
9. **Success page** - Post-payment flow
10. **Tour component** - Overlay UI
11. **Checklist component** - Admin sidebar widget
12. **Email templates** - Welcome + check-ins
13. **Testing** - End-to-end flow

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| Auth integration | Heartwood first, profile collection after |
| Signup subdomain | `create.grove.place` |
| Free tier | Stubs now, full implementation later |
| Tour location | example.grove.place + autumnsgrove.com |
| D1 creation timing | After profile (free) or payment (paid) |

---

## Estimated Components

| Category | Count |
|----------|-------|
| New routes | ~12 |
| New components | ~10 |
| API endpoints | ~4 |
| Database migrations | 2 |
| Email templates | 6 |

---

*Ready for implementation. All code can be written remotely; testing and deployment when home.*
