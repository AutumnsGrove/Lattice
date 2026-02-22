# Zephyr Client Library & Secrets Setup

**Status:** Planned
**Created:** 2026-02-05
**Author:** Claude (Panther Strike)

## Overview

The Zephyr client library already exists at `libs/engine/src/lib/zephyr/`. This plan covers:

1. Fixing the default URL (currently points to .pages.dev instead of .workers.dev)
2. Setting up secrets for all workers that need Zephyr access
3. Adding wrangler.toml vars for ZEPHYR_URL

## Current State

**Client library** ✅ Complete:

- `libs/engine/src/lib/zephyr/client.ts` - ZephyrClient class
- `libs/engine/src/lib/zephyr/types.ts` - All types defined
- `libs/engine/src/lib/zephyr/index.ts` - Exports
- Already exported in package.json as `@autumnsgrove/lattice/zephyr`

**One fix needed:** Default URL is `https://grove-zephyr.pages.dev` but actual deployment is `https://grove-zephyr.m7jv4v7npb.workers.dev`

## Implementation Plan

### Phase 1: Fix Client Default URL

**File:** `libs/engine/src/lib/zephyr/client.ts`

Change line 200:

```typescript
// FROM:
"https://grove-zephyr.pages.dev";
// TO:
"https://grove-zephyr.m7jv4v7npb.workers.dev";
```

### Phase 2: Generate & Apply Secrets

Using `gw secret` commands (agent-safe - values never exposed):

```bash
# 1. Generate ZEPHYR_API_KEY if not already in vault
gw secret generate ZEPHYR_API_KEY --length 32

# 2. Apply to all workers that send email
gw secret apply ZEPHYR_API_KEY --worker grove-lattice
gw secret apply ZEPHYR_API_KEY --worker grove-landing
gw secret apply ZEPHYR_API_KEY --worker grove-plant
gw secret apply ZEPHYR_API_KEY --worker clearing-monitor
gw secret apply ZEPHYR_API_KEY --worker onboarding-emails
```

### Phase 3: Add ZEPHYR_URL to wrangler.toml files

Add environment variable to each worker's wrangler.toml:

**Workers to update:**

- `libs/engine/wrangler.toml`
- `apps/landing/wrangler.toml`
- `apps/plant/wrangler.toml`
- `workers/clearing-monitor/wrangler.toml`
- `apps/landing/workers/onboarding-emails/wrangler.toml`

**Add to [vars] section:**

```toml
ZEPHYR_URL = "https://grove-zephyr.m7jv4v7npb.workers.dev"
```

### Phase 4: Rebuild Engine Package

```bash
cd libs/engine && pnpm package
```

## Files to Modify

| File                                                   | Change             |
| ------------------------------------------------------ | ------------------ |
| `libs/engine/src/lib/zephyr/client.ts`                 | Fix default URL    |
| `libs/engine/wrangler.toml`                            | Add ZEPHYR_URL var |
| `apps/landing/wrangler.toml`                           | Add ZEPHYR_URL var |
| `apps/plant/wrangler.toml`                             | Add ZEPHYR_URL var |
| `workers/clearing-monitor/wrangler.toml`               | Add ZEPHYR_URL var |
| `apps/landing/workers/onboarding-emails/wrangler.toml` | Add ZEPHYR_URL var |

## Verification

1. **Test client locally:**

   ```bash
   cd libs/engine && pnpm test src/lib/zephyr
   ```

2. **Verify secrets applied:**

   ```bash
   gw secret exists ZEPHYR_API_KEY
   wrangler secret list --name grove-lattice
   ```

3. **Test from a worker** (after deploying):
   - Call Zephyr health endpoint
   - Send a test email

## Future Work (Not in this plan)

Migration of existing Resend calls to use Zephyr client:

- `apps/plant/src/lib/server/send-email.ts`
- `apps/landing/src/lib/email/send.ts`
- Other direct Resend usages

This is a separate effort that should be done incrementally after secrets are in place.
