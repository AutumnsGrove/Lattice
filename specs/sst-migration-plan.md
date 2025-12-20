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

### Definitely Use

| Integration | Current Setup | SST Benefit |
|-------------|---------------|-------------|
| **Cloudflare D1** | Manual wrangler.toml | Type-safe linking, automatic migrations |
| **Cloudflare KV** | Manual wrangler.toml | Unified config, resource linking |
| **Cloudflare R2** | Manual wrangler.toml | Simplified bucket management |
| **Cloudflare Workers** | grove-router | Easier routing config |
| **SvelteKit** | adapter-cloudflare | Native SST component |
| **Stripe** | Manual API calls | Native webhooks, type-safe products/prices |

### Consider for Future Growth

| Integration | Use Case | Notes |
|-------------|----------|-------|
| **OpenAuth** | Replace Heartwood? | SST's auth solution, self-hosted OAuth 2.0 |
| **Resend** | Already using | SST has email components, could simplify |
| **Upstash** | Rate limiting | Redis-compatible, if KV limits become an issue |

### Skip for Now

| Integration | Reason |
|-------------|--------|
| **Auth0/Okta** | You have Heartwood, OpenAuth is closer fit |
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

### 3.4 Grove Router

```typescript
const router = new sst.cloudflare.Worker("GroveRouter", {
  handler: "packages/grove-router/src/index.ts",
  domain: {
    name: "*.grove.place",
    zone: "grove.place",
  },
});
```

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

## Open Questions

1. **OpenAuth vs Heartwood**: Should we migrate auth to SST's OpenAuth, or keep Heartwood?
2. **Existing Stripe Products**: Do you have products already in Stripe Dashboard, or starting fresh?
3. **Domain Configuration**: How is DNS currently managed? SST can handle this too.
4. **Preview Environments**: Do you want PR preview deployments? SST Console offers this.

---

## Resources

- [SST Documentation](https://sst.dev/docs/)
- [SST Cloudflare Components](https://sst.dev/docs/component/cloudflare/)
- [SST + SvelteKit Guide](https://sst.dev/docs/start/cloudflare/sveltekit/)
- [Stripe Provider](https://sst.dev/docs/component/stripe/)
- [All SST Providers](https://sst.dev/docs/all-providers/)
