# SST Migration Plan for GroveEngine

> **Status:** Draft - Pending Review
> **Created:** 2025-12-20
> **Updated:** 2025-12-20
> **Scope:** Migrate GroveEngine to SST for unified infrastructure management

---

## Executive Summary

Migrate GroveEngine from manual wrangler.toml configuration to SST (sst.dev) for:
- Unified infrastructure-as-code in TypeScript
- Native Stripe integration with type-safe resource linking (greenfield!)
- Simplified local development with `sst dev`
- Multi-stage deployments (dev/staging/production)
- **Hybrid routing:** Worker wildcards for subdomains + Cloudflare for SaaS for custom domains

---

## Key Decision: Hybrid Routing Architecture

### The Insight

Keep what works (Worker wildcard routing for `*.grove.place`) and add Cloudflare for SaaS **only** for custom domain customers (Oak+ tier).

```
*.grove.place (tenant subdomains)
    ↓
Grove Router Worker (SST-managed)
    ↓
GroveEngine Worker → D1 tenant lookup
    ↓
Serves tenant blog

customdomain.com (Oak+ customers)
    ↓
Cloudflare for SaaS → Falls back to GroveEngine
    ↓
GroveEngine Worker → D1 custom_domain lookup
    ↓
Serves tenant blog
```

### Why This Approach

| Approach | Cost | Tenants | Complexity |
|----------|------|---------|------------|
| **Worker wildcard only** | FREE | Unlimited | Low |
| **CF for SaaS only** | $0.10/tenant after 100 | 5,000 max | Medium |
| **Hybrid (recommended)** | $0.10/custom domain | Unlimited subdomains, 5k custom | Low |

**Math for 1,000 tenants (conservative):**
- 95% use `*.grove.place` → FREE
- 5% use custom domains (50 Oak+ users) → FREE (under 100)
- Total cost: $0

**Math for 5,000 tenants (optimistic):**
- 90% use `*.grove.place` → FREE
- 10% use custom domains (500 Oak+ users) → 100 free + 400 × $0.10 = $40/month
- Total cost: $40/month

This is negligible compared to subscription revenue from 500 Oak+ users ($12,500/month)

---

## Relevant SST Integrations for Grove

Based on your current stack and project vision, here are the SST integrations worth using:

### Phase 1: Immediate Value (This Migration)

| Integration | Current Setup | SST Benefit |
|-------------|---------------|-------------|
| **Cloudflare D1** | Manual wrangler.toml | Type-safe linking, automatic migrations |
| **Cloudflare KV** | Manual wrangler.toml | Unified config, resource linking |
| **Cloudflare R2** | Manual wrangler.toml | Simplified bucket management |
| **Cloudflare Workers** | grove-router proxy | Easier routing config |
| **SvelteKit** | adapter-cloudflare | Native SST component |
| **Stripe** | Manual API calls | Native webhooks, type-safe products/prices |
| **Cloudflare for SaaS** | grove-router proxy | Eliminate proxy worker for tenant subdomains |

### Phase 2: Future Scaling

| Integration | Use Case | When to Consider |
|-------------|----------|------------------|
| **OpenAuth** | Replace Heartwood | When scaling auth, adding providers, or consolidating login UIs |
| **Resend** | Email components | When email complexity grows |
| **Upstash** | Rate limiting | If KV limits become an issue |

### Skip

| Integration | Reason |
|-------------|--------|
| **Auth0/Okta** | OpenAuth is closer fit when ready |
| **AWS services** | Cloudflare-first architecture |
| **PostgreSQL/MySQL** | D1 works well for your scale |

---

## Migration Strategy

### Approach: Engine-First Cascade

Since `@autumnsgrove/groveengine` is the core package that other apps consume, migrating it creates a natural cascade:

```
Phase 1: Engine Package + SST Config
    ↓
Phase 2: Landing/Domains/Plant consume new engine
    ↓
Phase 3: Each app adds app-specific SST resources
    ↓
Phase 4: Retire wrangler.toml files
```

---

## Phase 1: Foundation Setup

### 1.1 Initialize SST in Monorepo

```bash
# From project root
pnpm add sst@latest --save-dev -w
npx sst init
```

Creates:
- `sst.config.ts` - Main infrastructure config
- `.sst/` - SST working directory (gitignore)

### 1.2 Add Cloudflare & Stripe Providers

```bash
npx sst add cloudflare
npx sst add stripe
```

### 1.3 Core sst.config.ts Structure

```typescript
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "grove",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
      providers: {
        cloudflare: true,
        stripe: true,
      },
    };
  },
  async run() {
    // Phase 1: Shared resources
    const db = new sst.cloudflare.D1("GroveDB");
    const cache = new sst.cloudflare.Kv("GroveCache");
    const media = new sst.cloudflare.R2("GroveMedia");

    // Stripe products (defined in code!)
    const seedlingPrice = new stripe.Price("SeedlingMonthly", {
      product: seedlingProduct.id,
      currency: "usd",
      unitAmount: 800,
      recurring: { interval: "month" },
    });

    // More in Phase 2...
  },
});
```

---

## Phase 2: Stripe Integration (Greenfield)

Since there are no existing Stripe products, SST can manage everything from scratch. This is ideal—no migration, no sync issues.

### 2.1 Define Products in Code

SST creates and manages Stripe products/prices automatically:

```typescript
// In sst.config.ts run()

// Products
const seedling = new stripe.Product("Seedling", {
  name: "Seedling Plan",
  description: "Perfect for personal blogs",
});

const sapling = new stripe.Product("Sapling", {
  name: "Sapling Plan",
  description: "For growing communities",
});

const oak = new stripe.Product("Oak", {
  name: "Oak Plan",
  description: "Professional publishing",
});

const evergreen = new stripe.Product("Evergreen", {
  name: "Evergreen Plan",
  description: "Enterprise features",
});

// Prices
const prices = {
  seedling: {
    monthly: new stripe.Price("SeedlingMonthly", {
      product: seedling.id,
      currency: "usd",
      unitAmount: 800,
      recurring: { interval: "month" },
    }),
    yearly: new stripe.Price("SeedlingYearly", {
      product: seedling.id,
      currency: "usd",
      unitAmount: 8160,
      recurring: { interval: "year" },
    }),
  },
  // ... sapling, oak, evergreen
};
```

### 2.2 Webhook Handler

SST can auto-wire Stripe webhooks:

```typescript
// Stripe webhook endpoint
const stripeWebhook = new sst.cloudflare.Worker("StripeWebhook", {
  handler: "packages/engine/src/webhooks/stripe.ts",
  link: [db],
  url: true,
});

// Register with Stripe
new stripe.WebhookEndpoint("GroveWebhook", {
  url: stripeWebhook.url,
  enabledEvents: [
    "checkout.session.completed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
  ],
});
```

### 2.3 Update Engine Payment Module

Current: `packages/engine/src/lib/payments/stripe/client.ts` uses raw fetch
After: Use SST's resource linking for type-safe access

```typescript
// packages/engine/src/lib/payments/stripe/client.ts
import { Resource } from "sst";

export function getStripeClient() {
  return {
    secretKey: Resource.StripeSecretKey.value,
    prices: {
      seedling: {
        monthly: Resource.SeedlingMonthly.id,
        yearly: Resource.SeedlingYearly.id,
      },
      // ...
    },
  };
}
```

---

## Phase 3: SvelteKit Apps Migration

### 3.1 Engine App

```typescript
// In sst.config.ts run()

const engine = new sst.cloudflare.SvelteKit("Engine", {
  path: "packages/engine",
  link: [db, cache, media],
  environment: {
    GROVEAUTH_URL: "https://auth.grove.place",
  },
});
```

### 3.2 Landing App

```typescript
const landing = new sst.cloudflare.SvelteKit("Landing", {
  path: "landing",
  link: [db],
  domain: "grove.place",
});
```

### 3.3 Plant App (with Stripe)

```typescript
const plant = new sst.cloudflare.SvelteKit("Plant", {
  path: "plant",
  link: [db, stripeWebhook, ...Object.values(prices.seedling)],
  domain: "plant.grove.place",
});
```

### 3.4 Hybrid Routing Architecture

**Current Setup:** grove-router Worker proxies `*.grove.place` with a hardcoded routing table. Works but fragile.

**New Setup:** SST manages the grove-router Worker + adds Cloudflare for SaaS for custom domains only.

#### 3.4.1 Grove Router (SST-Managed, Simplified)

The grove-router stays, but SST makes it cleaner:

```typescript
// sst.config.ts

// Internal services get their own domains (no proxy needed)
const auth = new sst.cloudflare.Worker("Auth", {
  handler: "apps/groveauth/src/worker.ts",
  assets: "apps/groveauth/.svelte-kit/cloudflare",
  domain: "auth.grove.place",
});

const plant = new sst.cloudflare.Worker("Plant", {
  handler: "plant/src/worker.ts",
  assets: "plant/.svelte-kit/cloudflare",
  link: [db, stripeResources],
  domain: "plant.grove.place",
});

const domains = new sst.cloudflare.Worker("Domains", {
  handler: "domains/src/worker.ts",
  assets: "domains/.svelte-kit/cloudflare",
  link: [db],
  domain: "domains.grove.place",
});

// Main engine handles *.grove.place (wildcard)
const engine = new sst.cloudflare.Worker("Engine", {
  handler: "packages/engine/src/worker.ts",
  assets: "packages/engine/.svelte-kit/cloudflare",
  link: [db, cache, media],
  domain: {
    name: "*.grove.place",
    zone: "grove.place",
  },
});

// Landing page (root domain)
const landing = new sst.cloudflare.Worker("Landing", {
  handler: "landing/src/worker.ts",
  assets: "landing/.svelte-kit/cloudflare",
  link: [db],
  domain: "grove.place",
});
```

**What changes:**
- Internal services (auth, plant, domains) get **explicit domains** → no proxy
- Engine handles `*.grove.place` wildcard **directly** → no proxy for tenants
- grove-router routing table shrinks to near-zero

**What stays:**
- Engine's subdomain extraction logic in hooks.server.ts
- D1 tenant lookup
- X-Forwarded-Host handling (for any edge cases)

#### 3.4.2 Cloudflare for SaaS (Custom Domains Only)

Custom domains are an Oak+ feature. When enabled, use CF for SaaS:

```typescript
// packages/engine/src/lib/cloudflare/custom-domains.ts

const CF_API = "https://api.cloudflare.com/client/v4";

export async function createCustomHostname(
  domain: string,
  tenantId: string,
  env: { CF_ZONE_ID: string; CF_API_TOKEN: string }
) {
  const response = await fetch(
    `${CF_API}/zones/${env.CF_ZONE_ID}/custom_hostnames`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hostname: domain,
        ssl: {
          method: "http",
          type: "dv",
          settings: {
            min_tls_version: "1.2",
          },
        },
        custom_metadata: {
          tenant_id: tenantId,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create custom hostname: ${error.errors?.[0]?.message}`);
  }

  return response.json();
}

export async function deleteCustomHostname(
  hostnameId: string,
  env: { CF_ZONE_ID: string; CF_API_TOKEN: string }
) {
  await fetch(
    `${CF_API}/zones/${env.CF_ZONE_ID}/custom_hostnames/${hostnameId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` },
    }
  );
}

export async function verifyCustomHostname(
  hostnameId: string,
  env: { CF_ZONE_ID: string; CF_API_TOKEN: string }
) {
  const response = await fetch(
    `${CF_API}/zones/${env.CF_ZONE_ID}/custom_hostnames/${hostnameId}`,
    {
      headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` },
    }
  );

  const data = await response.json();
  return {
    status: data.result?.ssl?.status,
    verificationErrors: data.result?.ssl?.validation_errors,
  };
}
```

#### 3.4.3 Update hooks.server.ts for Custom Domains

Add custom domain lookup alongside subdomain lookup:

```typescript
// In hooks.server.ts - after subdomain extraction

// If no subdomain match, check for custom domain
if (!tenant && !isReservedSubdomain) {
  const hostname = getHostname(request);

  // Skip if it's a grove.place domain
  if (!hostname.endsWith('.grove.place') && !hostname.endsWith('pages.dev')) {
    // Custom domain lookup
    tenant = await db
      .prepare(
        "SELECT id, subdomain, display_name, email, theme, custom_domain " +
        "FROM tenants WHERE custom_domain = ? AND active = 1"
      )
      .bind(hostname)
      .first();

    if (tenant) {
      event.locals.context = { type: "tenant", tenant, isCustomDomain: true };
      event.locals.tenantId = tenant.id;
    }
  }
}
```

#### 3.4.4 User Flow for Custom Domains

1. **Oak+ user enables BYOD in settings**
2. **User enters their domain** (e.g., `blog.example.com`)
3. **System calls `createCustomHostname()`** → CF provisions SSL
4. **User adds CNAME** (`blog.example.com` → `grove.place`)
5. **System verifies DNS** via `verifyCustomHostname()`
6. **Domain goes live** → stored in `tenants.custom_domain`

#### 3.4.5 What Happens to grove-router?

**Option A: Simplify it** (recommended initially)
- Remove internal service routing (they have explicit domains now)
- Keep only for edge cases or legacy routes
- Significantly smaller routing table

**Option B: Delete it** (after SST is stable)
- Workers with explicit domains handle everything
- Wildcard routes work natively
- No proxy layer at all

**Recommendation:** Start with Option A, move to Option B once confident.

---

## Phase 4: Development Workflow

### 4.1 Local Development

Replace multiple `pnpm dev:wrangler` commands:

```bash
# Before (per-app)
cd packages/engine && pnpm dev:wrangler
cd landing && pnpm dev:wrangler

# After (unified)
npx sst dev
```

SST dev provides:
- Live Lambda/Worker mode
- Automatic infrastructure sync
- Unified console at localhost:3000

### 4.2 Deployment

```bash
# Deploy to dev stage
npx sst deploy --stage dev

# Deploy to production
npx sst deploy --stage production
```

### 4.3 Update GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: npx sst deploy --stage production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
```

---

## Phase 5: Cleanup

### 5.1 Files to Remove

After successful migration:

```
packages/engine/wrangler.toml      → DELETE
landing/wrangler.toml              → DELETE
domains/wrangler.toml              → DELETE
plant/wrangler.toml                → DELETE
packages/grove-router/wrangler.toml → DELETE
```

### 5.2 Scripts to Update

Update `package.json` scripts across all packages:

```json
{
  "scripts": {
    "dev": "sst dev",
    "deploy": "sst deploy",
    "deploy:prod": "sst deploy --stage production"
  }
}
```

### 5.3 Remove Manual Stripe Config

Delete from engine:
- `plant/src/lib/server/stripe.ts` STRIPE_PRICES constants
- Manual webhook verification (SST handles this)

---

## Migration Checklist

### Pre-Migration
- [ ] Backup current Cloudflare resource IDs
- [ ] Document current environment variables/secrets
- [ ] Ensure all wrangler.toml configs are committed
- [ ] Create feature branch for migration

### Phase 1: Foundation
- [ ] Install SST in monorepo root
- [ ] Add cloudflare and stripe providers
- [ ] Create base sst.config.ts
- [ ] Test `sst dev` starts without errors

### Phase 2: Stripe
- [ ] Define products in sst.config.ts
- [ ] Define prices in sst.config.ts
- [ ] Create webhook handler
- [ ] Update engine payment module to use Resource linking
- [ ] Test checkout flow in dev stage

### Phase 3: Apps
- [ ] Add Engine SvelteKit component
- [ ] Add Landing SvelteKit component
- [ ] Add Plant SvelteKit component
- [ ] Add Domains SvelteKit component
- [ ] Add GroveRouter Worker component
- [ ] Test all apps with `sst dev`

### Phase 4: CI/CD
- [ ] Update GitHub Actions workflow
- [ ] Test deploy to dev stage
- [ ] Test deploy to production
- [ ] Verify DNS/domains work correctly

### Phase 5: Cleanup
- [ ] Remove wrangler.toml files
- [ ] Update package.json scripts
- [ ] Remove deprecated stripe config
- [ ] Update documentation
- [ ] Bump engine version (0.7.0?)

---

## Risk Mitigation

### Existing Resources

SST can import existing Cloudflare resources:

```typescript
// Import existing D1 database instead of creating new
const db = sst.cloudflare.D1.get("GroveDB", "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68");
```

This prevents data loss during migration.

### Rollback Plan

Keep wrangler.toml files until Phase 5 is verified. If issues arise:

1. Stop using SST commands
2. Revert to wrangler-based deployment
3. Debug SST config separately

### Staging First

Always deploy to `--stage dev` before production. SST creates isolated resources per stage.

---

## Estimated Effort

| Phase | Complexity | Notes |
|-------|------------|-------|
| Phase 1 | Low | Mostly config, no code changes |
| Phase 2 | Medium | Stripe refactor, but well-isolated |
| Phase 3 | Medium | App configs, test thoroughly |
| Phase 4 | Low | CI/CD updates |
| Phase 5 | Low | Cleanup |

---

## Resolved Questions

1. ~~**OpenAuth vs Heartwood**~~: Keep Heartwood for now. Revisit OpenAuth when scaling (see Future Scaling section).
2. ~~**Domain Configuration**~~: Cloudflare manages all DNS. SST handles Worker domains.
3. ~~**Existing Stripe Products**~~: **Greenfield!** No existing products. SST will define everything in code.
4. ~~**Routing Architecture**~~: Hybrid approach—Worker wildcards for subdomains, CF for SaaS for custom domains only.
5. ~~**grove-router fate**~~: Simplify first (SST manages domains), potentially delete later.

## Open Questions

1. ~~**Preview Environments**~~: Yes! PR previews for testing before merge.
2. ~~**Staging Environment**~~: Yes! Everything has been going straight to production.

---

## Staging & Preview Environment Strategy

### The Problem

Currently: `push to main` → auto-deploy to production → live in minutes

This is fast but risky. No way to test Cloudflare-specific behavior before it hits real users.

### The Solution: SST Stages

SST has built-in support for multiple deployment stages:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Local Dev     │ ──▶ │    Staging      │ ──▶ │   Production    │
│   (your machine)│     │ dev.grove.place │     │   grove.place   │
│   sst dev       │     │ --stage dev     │     │ --stage prod    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Stage Configuration

```typescript
// sst.config.ts
export default $config({
  app(input) {
    return {
      name: "grove",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
      providers: {
        cloudflare: true,
        stripe: {
          // Use test keys for non-production
          apiKey: input?.stage === "production"
            ? process.env.STRIPE_SECRET_KEY
            : process.env.STRIPE_TEST_SECRET_KEY,
        },
      },
    };
  },
  async run() {
    const stage = $app.stage;
    const isProd = stage === "production";

    // Database: Shared or per-stage
    const db = isProd
      ? sst.cloudflare.D1.get("GroveDB", "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68")
      : new sst.cloudflare.D1("GroveDB"); // Fresh DB for dev/PR

    // Cache: Per-stage (no cross-contamination)
    const cache = new sst.cloudflare.Kv("GroveCache");

    // Media: Shared in staging, separate in PR previews
    const media = stage === "production" || stage === "dev"
      ? sst.cloudflare.R2.get("GroveMedia", "grove-media")
      : new sst.cloudflare.R2("GroveMedia");

    // Domain varies by stage
    const getDomain = (name: string) => {
      if (isProd) return name;
      if (stage === "dev") return `dev-${name}`;
      return `${stage}-${name}`; // PR previews: pr-42-grove.place
    };

    const engine = new sst.cloudflare.Worker("Engine", {
      // ...
      domain: isProd
        ? { name: "*.grove.place", zone: "grove.place" }
        : { name: `*.${stage}.grove.place`, zone: "grove.place" },
    });

    // ... rest of config
  },
});
```

### Staging URLs

| Stage | URL Pattern | Use Case |
|-------|-------------|----------|
| `production` | `*.grove.place` | Real users |
| `dev` | `*.dev.grove.place` | Team testing |
| `pr-42` | `*.pr-42.grove.place` | PR preview |

### Database Strategy

**Option A: Separate databases per stage** (safer)
```
production → grove-engine-db (real data)
dev        → grove-engine-db-dev (test data)
pr-*       → ephemeral DB (created/destroyed with PR)
```

**Option B: Shared database, separate by flag** (simpler)
```
production → grove-engine-db
dev        → grove-engine-db (with test tenants marked)
pr-*       → grove-engine-db (read-only or specific test tenant)
```

**Recommendation:** Option A for safety. You don't want a staging bug to corrupt production data.

### Stripe Test Mode

SST makes this easy:

```typescript
// Stripe products are per-stage
const seedling = new stripe.Product("Seedling", {
  name: isProd ? "Seedling Plan" : `[${stage}] Seedling Plan`,
  // ...
});
```

**Key insight:** Stripe has test mode and live mode. SST can:
- Use `sk_test_*` keys for dev/PR stages
- Use `sk_live_*` keys for production
- Products/prices are separate between test and live

This means you can test the entire checkout flow without touching real money.

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install

      # Determine stage
      - name: Set stage
        id: stage
        run: |
          if [ "${{ github.event_name }}" = "pull_request" ]; then
            echo "stage=pr-${{ github.event.number }}" >> $GITHUB_OUTPUT
          elif [ "${{ github.ref }}" = "refs/heads/main" ]; then
            echo "stage=production" >> $GITHUB_OUTPUT
          else
            echo "stage=dev" >> $GITHUB_OUTPUT
          fi

      # Deploy
      - name: Deploy to ${{ steps.stage.outputs.stage }}
        run: npx sst deploy --stage ${{ steps.stage.outputs.stage }}
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
          STRIPE_TEST_SECRET_KEY: ${{ secrets.STRIPE_TEST_SECRET_KEY }}

      # Comment PR with preview URL
      - name: Comment preview URL
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🌱 Preview deployed to https://pr-${{ github.event.number }}.grove.place`
            })

  # Cleanup PR previews when closed
  cleanup:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - name: Remove PR preview
        run: npx sst remove --stage pr-${{ github.event.number }}
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Manual Staging Deployment

For the persistent staging environment:

```bash
# Deploy to staging
pnpm run deploy:staging  # sst deploy --stage dev

# Deploy to production (after testing on staging)
pnpm run deploy:prod     # sst deploy --stage production
```

### New Workflow

```
1. Work locally with `sst dev`
2. Push to feature branch
3. Open PR → auto-deploys to pr-123.grove.place
4. Test in PR preview
5. Merge to main → deploys to production
   OR
5. Merge to develop → deploys to dev.grove.place
6. Manual promote: deploy:prod when ready
```

### DNS Setup Required

Add these DNS records in Cloudflare:

```
*.dev.grove.place    CNAME  grove.place  (proxied)
*.pr-*.grove.place   CNAME  grove.place  (proxied)
```

Or use a single wildcard that catches all:
```
*.grove.place        CNAME  <worker>     (proxied)
```

The Worker handles stage-based routing internally.

---

## Future Scaling: Auth Migration to OpenAuth

> **When to do this:** After SST migration is stable, when you want to:
> - Add more OAuth providers (Apple, Discord, Twitter, etc.)
> - Consolidate the three login page UIs into one
> - Simplify auth maintenance

### Why OpenAuth Makes Sense Later

| Current (Heartwood) | Future (OpenAuth) |
|---------------------|-------------------|
| Custom OAuth implementation | SST-managed, standards-based |
| Google + GitHub + Magic Code | Same + Apple, Discord, Twitter, etc. |
| Subscription tracking built-in | Subscription logic moves to GroveEngine DB |
| Three different login UIs | One themeable, prebuilt UI |
| Moderate complexity | Similar complexity, less to maintain |

### Architecture After OpenAuth Migration

```
OpenAuth (SST-managed)
├── Handles: Identity (Google, GitHub, etc.)
├── Returns: { sub, email, name, picture }
└── Deploys to: Cloudflare Workers

GroveEngine Database
├── users table (linked by groveauth_id / openauth sub)
├── subscriptions table (tier, post_limit, billing)
└── Handles: All business logic

App Flow:
1. User clicks "Sign in with Grove"
2. OpenAuth handles OAuth dance → returns identity
3. App looks up user in DB → gets subscription tier
4. App enforces post limits, features, etc.
```

### Migration Path (When Ready)

1. **Deploy OpenAuth alongside Heartwood**
   - New users go through OpenAuth
   - Existing users still work via Heartwood

2. **Migrate subscription logic to GroveEngine**
   - Move `getSubscription()`, `canUserCreatePost()` to engine
   - Query D1 directly instead of Heartwood API

3. **Migrate existing users**
   - Map Heartwood `groveauth_id` to OpenAuth `sub`
   - One-time token refresh for active sessions

4. **Retire Heartwood**
   - Sunset groveauth-frontend and groveauth-api
   - One login UI to maintain

### OpenAuth SST Config (Future Reference)

```typescript
// When ready to migrate
const auth = new sst.cloudflare.Auth("GroveAuth", {
  authenticator: {
    handler: "packages/auth/src/authenticator.ts",
    link: [db],
  },
});

// All apps use the same auth
const engine = new sst.cloudflare.SvelteKit("Engine", {
  link: [auth, db, cache, media],
});

const plant = new sst.cloudflare.SvelteKit("Plant", {
  link: [auth, db, stripeWebhook],
});
```

### Subscription Tier Logic (Post-Migration)

```typescript
// packages/engine/src/lib/subscriptions/index.ts
import { Resource } from "sst";

export async function getUserSubscription(userId: string) {
  const db = Resource.GroveDB;
  const result = await db.prepare(
    `SELECT tier, post_limit, posts_used FROM subscriptions WHERE user_id = ?`
  ).bind(userId).first();

  return result ?? { tier: 'free', post_limit: 10, posts_used: 0 };
}

export async function canCreatePost(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId);
  if (sub.tier === 'evergreen') return true; // unlimited
  return sub.posts_used < sub.post_limit;
}
```

---

## Resources

### SST Core
- [SST Documentation](https://sst.dev/docs/)
- [SST Cloudflare Components](https://sst.dev/docs/component/cloudflare/)
- [SST + SvelteKit Guide](https://sst.dev/docs/start/cloudflare/sveltekit/)
- [SST Custom Domains](https://sst.dev/docs/custom-domains/)
- [All SST Providers](https://sst.dev/docs/all-providers/)

### Stripe
- [SST Stripe Provider](https://sst.dev/docs/component/stripe/)

### Auth (Future Reference)
- [OpenAuth Documentation](https://openauth.js.org/)
- [OpenAuth GitHub](https://github.com/sst/openauth)
- [OpenAuth + SST Guide](https://openauth.js.org/docs/start/sst/)

### Cloudflare
- [Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/)
- [Custom Hostnames API](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/create-custom-hostnames/)
- [Wildcard Domains Article](https://hossamelshahawi.com/2025/01/26/handling-wildcard-domains-for-multi-tenant-apps-with-cloudflare-workers/)
