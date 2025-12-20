# SST Migration Plan for GroveEngine

> **Status:** Draft - Pending Review
> **Created:** 2025-12-20
> **Scope:** Migrate GroveEngine to SST for unified infrastructure management

---

## Executive Summary

Migrate GroveEngine from manual wrangler.toml configuration to SST (sst.dev) for:
- Unified infrastructure-as-code in TypeScript
- Native Stripe integration with type-safe resource linking
- Simplified local development with `sst dev`
- Multi-stage deployments (dev/staging/production)

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

## Phase 2: Stripe Integration

### 2.1 Define Products in Code

Replace placeholder price IDs with SST-managed Stripe resources:

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

### 3.4 Multi-Tenant Routing Overhaul

**Current Problem:** The grove-router Worker proxies all `*.grove.place` traffic, with a hardcoded routing table for internal services. This adds latency and complexity.

**Solution:** Hybrid approach using Cloudflare for SaaS + explicit Worker routes.

#### 3.4.1 Cloudflare for SaaS Setup

For tenant subdomains (alice.grove.place, bob.grove.place, etc.):

```typescript
// sst.config.ts - conceptual, actual API calls may vary

// Engine becomes the fallback origin for CF for SaaS
const engine = new sst.cloudflare.SvelteKit("Engine", {
  path: "packages/engine",
  link: [db, cache, media],
  // This is the fallback origin for all tenant subdomains
});

// When a tenant signs up, call Cloudflare API to add custom hostname
// This moves from the app code, not SST config
```

**Tenant Hostname Creation (in app code):**
```typescript
// Called when new tenant signs up
async function createTenantHostname(username: string) {
  await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/custom_hostnames`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` },
    body: JSON.stringify({
      hostname: `${username}.grove.place`,
      ssl: { method: 'http', type: 'dv' },
    }),
  });
}
```

#### 3.4.2 Internal Services (Explicit Routes)

For internal services, use explicit Worker routes (no proxy needed):

```typescript
// Auth service
const auth = new sst.cloudflare.SvelteKit("Auth", {
  path: "apps/groveauth",
  domain: "auth.grove.place",
});

// Plant/billing
const plant = new sst.cloudflare.SvelteKit("Plant", {
  path: "plant",
  domain: "plant.grove.place",
});

// Domains/Forage
const domains = new sst.cloudflare.SvelteKit("Domains", {
  path: "domains",
  domain: "domains.grove.place",
});

// Auth API Worker
const authApi = new sst.cloudflare.Worker("AuthAPI", {
  handler: "apps/groveauth-api/src/index.ts",
  domain: "auth-api.grove.place",
});
```

#### 3.4.3 Retire grove-router

After migration:
- Tenant subdomains: handled by Cloudflare for SaaS (no proxy)
- Internal services: direct Worker routes (no proxy)
- `packages/grove-router/` can be deleted

**Benefits:**
- No proxy latency on tenant requests
- No hardcoded routing table to maintain
- Automatic SSL for all tenant subdomains
- Supports customer custom domains in future (alice.com → their grove blog)

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
2. ~~**Domain Configuration**~~: Cloudflare manages all DNS. Migration will use Cloudflare for SaaS for tenant routing.

## Open Questions

1. **Existing Stripe Products**: Do you have products already in Stripe Dashboard, or starting fresh?
2. **Preview Environments**: Do you want PR preview deployments? SST Console offers this.
3. **Cloudflare for SaaS Tier**: Free tier has 100 custom hostnames. Do you expect more tenants soon?

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
