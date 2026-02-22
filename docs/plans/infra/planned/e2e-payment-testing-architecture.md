---
title: "E2E Payment Testing Architecture"
status: planned
category: infra
---

# E2E Payment Testing Architecture

```
        ╭──────────────────────────────────────────────────────────╮
        │                                                          │
        │     🧪 END-TO-END    ════►    💳 PAYMENTS    ════►   ✓   │
        │                                                          │
        │     From signup to subscription,                         │
        │     every step tested automatically.                     │
        │                                                          │
        ╰──────────────────────────────────────────────────────────╯
```

> _Confidence in payments isn't optional. It's foundational._

**Issue:** Part of v1 launch readiness
**Created:** 2026-02-04
**Status:** Planned
**Category:** Infrastructure / Testing

---

## Overview

### The Problem

Grove's payment flow touches multiple systems:

- Plant (onboarding + checkout)
- Stripe (payment processing)
- Webhooks (tenant provisioning)
- Engine (tenant creation + billing records)
- Heartwood (authentication)

A failure anywhere in this chain blocks user signups. Currently, we rely on manual testing. This spec defines an automated E2E test suite that exercises the complete user journey from signup to content creation.

### Goals

1. **Catch payment regressions** before users hit them
2. **Test the full journey**: signup → payment → auth → admin → content
3. **Run in CI** on every PR touching payment-related code
4. **Provide reliability metrics** for the Clearing status page
5. **Zero flakiness** through careful design

### Non-Goals

- Load testing (separate concern)
- Testing every Stripe edge case (rely on Stripe's own testing)
- Testing non-payment features (covered by other test suites)

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           E2E TEST ENVIRONMENT                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                     PLAYWRIGHT TEST RUNNER                              │   │
│   │                                                                         │   │
│   │   • Runs in GitHub Actions (ubuntu-latest)                              │   │
│   │   • Virtual WebAuthn authenticator for passkeys                         │   │
│   │   • Chromium browser (headless)                                         │   │
│   │   • Video recording on failure                                          │   │
│   └───────────────────────────────┬─────────────────────────────────────────┘   │
│                                   │                                             │
│                                   ▼                                             │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                     PRODUCTION ENVIRONMENT                              │   │
│   │                     (with Stripe Test Mode)                             │   │
│   │                                                                         │   │
│   │   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐          │   │
│   │   │     Plant     │───▶│    Stripe     │───▶│    Engine     │          │   │
│   │   │  (Onboarding) │    │  (Test Mode)  │    │   (Tenant)    │          │   │
│   │   └───────────────┘    └───────────────┘    └───────────────┘          │   │
│   │          │                    │                    │                    │   │
│   │          │                    │                    │                    │   │
│   │          ▼                    ▼                    ▼                    │   │
│   │   ┌─────────────────────────────────────────────────────────────────┐   │   │
│   │   │                    Cloudflare D1 Database                       │   │   │
│   │   │                                                                 │   │   │
│   │   │  • user_onboarding (signup state)                               │   │   │
│   │   │  • tenants (tenant records)                                     │   │   │
│   │   │  • platform_billing (subscription state)                        │   │   │
│   │   │  • webhook_events (audit trail)                                 │   │   │
│   │   └─────────────────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                     TEST TENANT ISOLATION                               │   │
│   │                                                                         │   │
│   │   Username:  grove-e2e-test (reserved, reason: "system")               │   │
│   │   Subdomain: grove-e2e-test.grove.place                                │   │
│   │   Email:     e2e-test@grove.place (internal, no inbox)                 │   │
│   │   Plan:      Seedling (tests basic tier features)                      │   │
│   │                                                                         │   │
│   │   Lifecycle: Created fresh each test run, cleaned up after             │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component              | Role in E2E Testing                                   |
| ---------------------- | ----------------------------------------------------- |
| **Playwright**         | Browser automation, virtual authenticator, assertions |
| **Plant**              | Onboarding flow, Stripe checkout redirect             |
| **Stripe (Test Mode)** | Payment processing with test cards                    |
| **Webhook Handler**    | Receives Stripe events, creates tenant                |
| **Engine**             | Tenant provisioning, admin panel, content             |
| **E2E API Endpoints**  | Setup/teardown, protected by token                    |

---

## Test Tenant Strategy

### Reserved Username

The test tenant uses a permanently reserved username:

```sql
-- Already in reserved_usernames table (or add via migration)
INSERT INTO reserved_usernames (username, reason, created_at)
VALUES ('grove-e2e-test', 'system', unixepoch());
```

**Why "grove-e2e-test" instead of "test":**

- Clear purpose from the name
- Won't conflict with user expectations
- Easily identified in logs and database
- Can filter out of analytics

### Tenant Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         TEST TENANT LIFECYCLE                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   BEFORE EACH TEST RUN (globalSetup)                                            │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                         │   │
│   │   1. Call DELETE /api/e2e/cleanup                                       │   │
│   │      ├── Delete tenant from `tenants` (CASCADE deletes related)         │   │
│   │      ├── Delete from `user_onboarding` WHERE username = 'grove-e2e-test'│   │
│   │      ├── Cancel Stripe subscription if active (API call)                │   │
│   │      ├── Delete R2 assets under tenant prefix                           │   │
│   │      └── Clear KV cache for tenant                                      │   │
│   │                                                                         │   │
│   │   2. Verify clean state                                                 │   │
│   │      └── SELECT * FROM tenants WHERE subdomain = 'grove-e2e-test'       │   │
│   │          (should return 0 rows)                                         │   │
│   │                                                                         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│   DURING TEST (test creates tenant via normal flow)                             │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                         │   │
│   │   Test exercises real signup → payment → webhook → tenant flow          │   │
│   │   No special treatment, just like a real user                           │   │
│   │                                                                         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│   AFTER TEST RUN (globalTeardown) - OPTIONAL                                    │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                         │   │
│   │   Option A: Delete tenant (clean slate for next run)                    │   │
│   │   Option B: Keep tenant for inspection, delete on NEXT run's setup      │   │
│   │                                                                         │   │
│   │   RECOMMENDATION: Option B - allows debugging failed runs               │   │
│   │                                                                         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Strategy: Passkeys

### Why Passkeys Over OAuth Mocking

| Approach              | Pros                                  | Cons                                                   |
| --------------------- | ------------------------------------- | ------------------------------------------------------ |
| **Mock OAuth**        | Fast, simple                          | Doesn't test real auth, fake confidence                |
| **Real Google OAuth** | Realistic                             | Flaky (Google's servers), slow, credentials management |
| **Passkeys (chosen)** | Tests real flow, fast, self-contained | Need virtual authenticator setup                       |

### Playwright Virtual Authenticator

Playwright supports WebAuthn virtual authenticators via Chrome DevTools Protocol:

```typescript
// tests/e2e/helpers/authenticator.ts

export async function setupVirtualAuthenticator(page: Page) {
  const client = await page.context().newCDPSession(page);

  await client.send("WebAuthn.enable");

  const { authenticatorId } = await client.send(
    "WebAuthn.addVirtualAuthenticator",
    {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true, // Auto-approve biometric prompts
      },
    },
  );

  return { client, authenticatorId };
}

export async function removeVirtualAuthenticator(
  client: CDPSession,
  authenticatorId: string,
) {
  await client.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
  await client.send("WebAuthn.disable");
}
```

### Auth Test Flow

```typescript
// tests/e2e/auth.spec.ts

test("user can register and authenticate with passkey", async ({ page }) => {
  const { client, authenticatorId } = await setupVirtualAuthenticator(page);

  try {
    // Navigate to admin (requires auth)
    await page.goto("https://grove-e2e-test.grove.place/admin");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Register passkey
    await page.click("text=Create Passkey");

    // Virtual authenticator auto-responds to WebAuthn ceremony
    // No manual interaction needed!

    // Should be redirected to admin dashboard
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator("h1")).toContainText("Dashboard");
  } finally {
    await removeVirtualAuthenticator(client, authenticatorId);
  }
});
```

---

## Stripe Integration

### Test Mode Configuration

Stripe provides separate API keys for test mode:

```bash
# Production (NEVER in E2E tests)
STRIPE_SECRET_KEY=sk_live_...

# Test mode (safe for E2E)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Important:** E2E tests run against the SAME production deployment but use Stripe's test mode. This is safe because:

1. Test mode transactions are completely isolated
2. Test mode uses separate webhook endpoints (optional)
3. No real money moves
4. Test data visible in Stripe Dashboard under "Test mode"

### Test Card Numbers

Stripe provides deterministic test cards:

| Card Number        | Behavior           |
| ------------------ | ------------------ |
| `4242424242424242` | Always succeeds    |
| `4000000000000002` | Always declines    |
| `4000002500003155` | Requires 3D Secure |
| `4000000000009995` | Insufficient funds |

**For E2E tests:** Use `4242424242424242` for happy path, others for error handling tests.

### Webhook Handling

The E2E test must wait for the Stripe webhook to be processed:

```typescript
// tests/e2e/helpers/stripe.ts

export async function waitForTenantCreation(
  subdomain: string,
  timeoutMs = 30000,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // Check if tenant exists
    const response = await fetch(`https://${subdomain}.grove.place/api/health`);

    if (response.ok) {
      return true;
    }

    // Wait before retry
    await new Promise((r) => setTimeout(r, 1000));
  }

  return false;
}
```

**Flakiness Mitigation:**

- 30-second timeout for webhook processing
- Exponential backoff on retries
- Clear error messages on timeout
- Webhook events stored in DB for debugging

---

## E2E API Endpoints

### Security Model

All E2E endpoints require a secret token:

```typescript
// Header required for all /api/e2e/* endpoints
X-E2E-Test-Token: <E2E_TEST_TOKEN from Cloudflare secrets>
```

The token is:

- 64-character random string
- Stored as Cloudflare Secret (not in code)
- Only available in CI environment
- Rate-limited to prevent abuse

### Endpoint: POST /api/e2e/cleanup

Cleans up test tenant and related data:

```typescript
// apps/plant/src/routes/api/e2e/cleanup/+server.ts

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const TEST_TENANT_SUBDOMAIN = "grove-e2e-test";

export const POST: RequestHandler = async ({ request, platform }) => {
  // Verify E2E token
  const token = request.headers.get("X-E2E-Test-Token");
  if (token !== platform?.env?.E2E_TEST_TOKEN) {
    throw error(403, "Invalid E2E test token");
  }

  const db = platform?.env?.DB;
  if (!db) throw error(500, "Database unavailable");

  // 1. Find tenant
  const tenant = await db
    .prepare("SELECT id FROM tenants WHERE subdomain = ?")
    .bind(TEST_TENANT_SUBDOMAIN)
    .first<{ id: string }>();

  if (!tenant) {
    return json({ cleaned: false, reason: "Tenant not found" });
  }

  // 2. Get billing info for Stripe cleanup
  const billing = await db
    .prepare(
      "SELECT provider_subscription_id FROM platform_billing WHERE tenant_id = ?",
    )
    .bind(tenant.id)
    .first<{ provider_subscription_id: string | null }>();

  // 3. Cancel Stripe subscription if exists
  if (billing?.provider_subscription_id) {
    try {
      await fetch(
        `https://api.stripe.com/v1/subscriptions/${billing.provider_subscription_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${platform.env.STRIPE_SECRET_KEY}`,
          },
        },
      );
    } catch (e) {
      console.warn("[E2E Cleanup] Failed to cancel Stripe subscription:", e);
    }
  }

  // 4. Delete tenant (CASCADE handles related tables)
  await db.prepare("DELETE FROM tenants WHERE id = ?").bind(tenant.id).run();

  // 5. Delete orphaned onboarding records
  await db
    .prepare("DELETE FROM user_onboarding WHERE username = ?")
    .bind(TEST_TENANT_SUBDOMAIN)
    .run();

  // 6. Clean up R2 assets (optional, can let them expire)
  // const r2 = platform.env.IMAGES;
  // await deleteR2Prefix(r2, `${tenant.id}/`);

  return json({
    cleaned: true,
    tenantId: tenant.id,
    stripeSubscriptionCancelled: !!billing?.provider_subscription_id,
  });
};
```

### Endpoint: GET /api/e2e/status

Health check for E2E environment:

```typescript
// apps/plant/src/routes/api/e2e/status/+server.ts

export const GET: RequestHandler = async ({ platform }) => {
  const db = platform?.env?.DB;

  // Check if test tenant exists
  const tenant = await db
    ?.prepare("SELECT id, created_at FROM tenants WHERE subdomain = ?")
    .bind("grove-e2e-test")
    .first();

  return json({
    e2eEnabled: !!platform?.env?.E2E_TEST_TOKEN,
    stripeTestMode: platform?.env?.STRIPE_SECRET_KEY?.startsWith("sk_test_"),
    testTenantExists: !!tenant,
    testTenantCreatedAt: tenant?.created_at,
  });
};
```

---

## Test Suite Structure

### Directory Layout

```
tests/
└── e2e/
    ├── playwright.config.ts      # Playwright configuration
    ├── global-setup.ts           # Cleanup before test run
    ├── global-teardown.ts        # Optional cleanup after
    │
    ├── helpers/
    │   ├── authenticator.ts      # Virtual WebAuthn setup
    │   ├── stripe.ts             # Stripe test helpers
    │   └── api.ts                # E2E API client
    │
    ├── fixtures/
    │   └── test-data.ts          # Test constants
    │
    └── specs/
        ├── 01-signup.spec.ts     # Onboarding + payment
        ├── 02-auth.spec.ts       # Passkey registration
        ├── 03-admin.spec.ts      # Admin panel navigation
        ├── 04-content.spec.ts    # Create/edit/publish post
        ├── 05-billing.spec.ts    # Subscription management
        └── full-journey.spec.ts  # Complete happy path
```

### Playwright Configuration

```typescript
// tests/e2e/playwright.config.ts

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",

  // Run tests sequentially (order matters for full journey)
  fullyParallel: false,

  // Fail fast on CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests once
  retries: process.env.CI ? 1 : 0,

  // Single worker (tests share state)
  workers: 1,

  // Reporter
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results.json" }],
  ],

  // Global setup/teardown
  globalSetup: require.resolve("./global-setup"),
  globalTeardown: require.resolve("./global-teardown"),

  use: {
    // Base URL for relative navigations
    baseURL: "https://plant.grove.place",

    // Capture traces on failure
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
```

### Global Setup

```typescript
// tests/e2e/global-setup.ts

import { request } from "@playwright/test";

const E2E_API_BASE = "https://plant.grove.place/api/e2e";

async function globalSetup() {
  const token = process.env.E2E_TEST_TOKEN;

  if (!token) {
    throw new Error("E2E_TEST_TOKEN environment variable is required");
  }

  const context = await request.newContext();

  // Clean up any existing test tenant
  const response = await context.post(`${E2E_API_BASE}/cleanup`, {
    headers: {
      "X-E2E-Test-Token": token,
    },
  });

  const result = await response.json();
  console.log("[E2E Setup] Cleanup result:", result);

  // Verify Stripe is in test mode
  const status = await context.get(`${E2E_API_BASE}/status`);
  const statusData = await status.json();

  if (!statusData.stripeTestMode) {
    throw new Error("Stripe is not in test mode! Aborting E2E tests.");
  }

  console.log("[E2E Setup] Environment ready:", statusData);

  await context.dispose();
}

export default globalSetup;
```

---

## Full Journey Test

### The Complete Happy Path

```typescript
// tests/e2e/specs/full-journey.spec.ts

import { test, expect, Page } from "@playwright/test";
import { setupVirtualAuthenticator } from "../helpers/authenticator";
import { waitForTenantCreation, fillStripeCheckout } from "../helpers/stripe";

const TEST_TENANT = {
  username: "grove-e2e-test",
  displayName: "E2E Test Garden",
  email: "e2e-test@grove.place",
};

test.describe("Full User Journey", () => {
  test("signup → payment → auth → content → billing", async ({ page }) => {
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 1: SIGNUP
    // ═══════════════════════════════════════════════════════════════════

    await test.step("Complete onboarding form", async () => {
      await page.goto("/");

      // Fill onboarding
      await page.fill('[name="username"]', TEST_TENANT.username);
      await page.fill('[name="displayName"]', TEST_TENANT.displayName);
      await page.fill('[name="email"]', TEST_TENANT.email);

      // Select favorite color
      await page.click('[data-color="#16a34a"]');

      // Continue to plans
      await page.click("text=Continue");
    });

    await test.step("Select Seedling plan", async () => {
      await expect(page).toHaveURL(/\/plans/);
      await page.click('[data-plan="seedling"]');
      await page.click("text=Continue to Checkout");
    });

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2: STRIPE CHECKOUT
    // ═══════════════════════════════════════════════════════════════════

    await test.step("Complete Stripe Checkout", async () => {
      // Wait for redirect to Stripe
      await page.waitForURL(/checkout\.stripe\.com/);

      // Fill test card details
      await fillStripeCheckout(page, {
        cardNumber: "4242424242424242",
        expiry: "12/30",
        cvc: "123",
        name: TEST_TENANT.displayName,
        country: "United States",
        zip: "12345",
      });

      // Submit payment
      await page.click('[data-testid="hosted-payment-submit-button"]');
    });

    await test.step("Wait for tenant creation", async () => {
      // Should redirect to success page
      await page.waitForURL(/\/success/, { timeout: 60000 });

      // Wait for webhook to process and tenant to be created
      const created = await waitForTenantCreation(TEST_TENANT.username);
      expect(created).toBe(true);
    });

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 3: PASSKEY AUTH
    // ═══════════════════════════════════════════════════════════════════

    const tenantUrl = `https://${TEST_TENANT.username}.grove.place`;

    await test.step("Register passkey and authenticate", async () => {
      const { client, authenticatorId } = await setupVirtualAuthenticator(page);

      try {
        // Navigate to admin
        await page.goto(`${tenantUrl}/admin`);

        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);

        // Register passkey
        await page.click("text=Create Passkey");

        // Virtual authenticator handles WebAuthn ceremony
        // Should be authenticated and redirected
        await expect(page).toHaveURL(`${tenantUrl}/admin`);
        await expect(page.locator("h1")).toContainText("Dashboard");
      } finally {
        // Keep authenticator for remaining tests
        // Will be cleaned up at end
      }
    });

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 4: ADMIN PANEL
    // ═══════════════════════════════════════════════════════════════════

    await test.step("Verify admin panel access", async () => {
      // Check dashboard loads
      await expect(page.locator('[data-testid="usage-stats"]')).toBeVisible();

      // Navigate to settings
      await page.click("text=Settings");
      await expect(page).toHaveURL(/\/admin\/settings/);

      // Verify site title shows
      await expect(page.locator('[name="siteTitle"]')).toHaveValue(
        TEST_TENANT.displayName,
      );
    });

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 5: CREATE CONTENT
    // ═══════════════════════════════════════════════════════════════════

    const postTitle = `E2E Test Post - ${Date.now()}`;

    await test.step("Create and publish a post", async () => {
      // Navigate to new post
      await page.click("text=Garden");
      await page.click("text=New Bloom");

      // Fill post details
      await page.fill('[name="title"]', postTitle);
      await page.fill(
        '[data-testid="markdown-editor"]',
        `
# Hello from E2E Tests!

This post was created automatically by the E2E test suite.

**Timestamp:** ${new Date().toISOString()}
      `,
      );

      // Publish
      await page.click("text=Publish");

      // Should redirect to post list
      await expect(page.locator("text=" + postTitle)).toBeVisible();
    });

    await test.step("Verify post is publicly visible", async () => {
      // Navigate to public blog
      await page.goto(`${tenantUrl}/garden`);

      // Post should be visible
      await expect(page.locator("text=" + postTitle)).toBeVisible();
    });

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 6: BILLING
    // ═══════════════════════════════════════════════════════════════════

    await test.step("Access billing portal", async () => {
      // Go to account settings
      await page.goto(`${tenantUrl}/admin/account`);

      // Click manage subscription
      await page.click("text=Manage Subscription");

      // Should open Stripe Billing Portal
      await page.waitForURL(/billing\.stripe\.com/);

      // Verify portal loads (just check we got there)
      await expect(page.locator("text=Subscription")).toBeVisible();
    });

    // ═══════════════════════════════════════════════════════════════════
    // SUCCESS!
    // ═══════════════════════════════════════════════════════════════════

    console.log("✅ Full journey completed successfully!");
  });
});
```

---

## CI Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e-payments.yml

name: E2E Payment Tests

on:
  push:
    branches: [main]
    paths:
      - "apps/plant/**"
      - "libs/engine/src/routes/api/billing/**"
      - "libs/engine/src/lib/payments/**"

  pull_request:
    paths:
      - "apps/plant/**"
      - "libs/engine/src/routes/api/billing/**"

  # Run daily at 6 AM UTC
  schedule:
    - cron: "0 6 * * *"

  workflow_dispatch:

jobs:
  e2e-payments:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm exec playwright install chromium

      - name: Run E2E tests
        run: pnpm exec playwright test --project=chromium
        working-directory: tests/e2e
        env:
          E2E_TEST_TOKEN: ${{ secrets.E2E_TEST_TOKEN }}
          # Note: Stripe keys are in production env, tests use test mode

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: tests/e2e/playwright-report/
          retention-days: 7

      - name: Upload failure videos
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-videos
          path: tests/e2e/test-results/
          retention-days: 7
```

### Clearing Status Page Integration

The E2E test results can be displayed on Clearing:

```typescript
// apps/clearing/src/routes/+page.server.ts

// Add E2E test status
const e2eStatus = await fetch(
  "https://api.github.com/repos/AutumnsGrove/Lattice/actions/workflows/e2e-payments.yml/runs?per_page=1",
  { headers: { Accept: "application/vnd.github.v3+json" } },
).then((r) => r.json());

return {
  // ... other status
  e2ePayments: {
    status: e2eStatus.workflow_runs[0]?.conclusion || "unknown",
    lastRun: e2eStatus.workflow_runs[0]?.created_at,
    url: e2eStatus.workflow_runs[0]?.html_url,
  },
};
```

---

## Flakiness Mitigation

### Common Sources of Flakiness

| Issue                 | Mitigation                  |
| --------------------- | --------------------------- |
| Webhook delays        | 30s timeout with polling    |
| Stripe iframe loading | Wait for specific selectors |
| Network variability   | Retry failed tests once     |
| Race conditions       | Sequential test execution   |
| Stale test data       | Clean slate before each run |

### Best Practices

1. **Use `test.step()` for clear failure reporting**
2. **Wait for specific elements, not arbitrary timeouts**
3. **Store debugging info (screenshots, videos) on failure**
4. **Run tests serially, not in parallel** (shared state)
5. **Clean up before, not after** (allows inspection of failed state)

---

## Security Considerations

### E2E Token Protection

- **Never commit** E2E_TEST_TOKEN to code
- Store in GitHub Secrets and Cloudflare Secrets
- Rate-limit E2E endpoints (10 requests/minute)
- Log all E2E endpoint calls for audit

### Test Data Isolation

- Test tenant is clearly marked (`grove-e2e-test`)
- All test data uses internal email (`@grove.place`)
- Stripe test mode completely isolated from production
- No real payment information ever used

### Access Control

```typescript
// Middleware for E2E endpoints
function validateE2EAccess(request: Request, env: Env) {
  // Only allow from CI or with valid token
  const token = request.headers.get("X-E2E-Test-Token");

  if (!token || token !== env.E2E_TEST_TOKEN) {
    return false;
  }

  // Additional: could check User-Agent for Playwright
  // Additional: could check IP allowlist

  return true;
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

- [ ] Add `grove-e2e-test` to reserved usernames
- [ ] Create E2E API endpoints (`/api/e2e/cleanup`, `/api/e2e/status`)
- [ ] Set up `E2E_TEST_TOKEN` secret in Cloudflare
- [ ] Create basic Playwright config and test structure

### Phase 2: Core Tests (Week 2)

- [ ] Implement signup test with Stripe checkout
- [ ] Implement passkey auth test with virtual authenticator
- [ ] Implement admin panel navigation tests
- [ ] Implement content creation test

### Phase 3: CI Integration (Week 3)

- [ ] Create GitHub Actions workflow
- [ ] Add to Clearing status page
- [ ] Set up Slack/Discord notifications for failures
- [ ] Document test maintenance procedures

### Phase 4: Polish (Week 4)

- [ ] Add billing portal tests
- [ ] Add error scenario tests (declined cards, etc.)
- [ ] Performance baseline measurements
- [ ] Team training on running/debugging tests

---

## Appendix

### Stripe Test Card Reference

| Scenario           | Card Number      | Expected Result |
| ------------------ | ---------------- | --------------- |
| Successful payment | 4242424242424242 | Succeeds        |
| Generic decline    | 4000000000000002 | Declined        |
| Insufficient funds | 4000000000009995 | Declined        |
| 3D Secure required | 4000002500003155 | Requires auth   |
| Expired card       | 4000000000000069 | Declined        |

### Environment Variables

| Variable                | Where                       | Purpose                |
| ----------------------- | --------------------------- | ---------------------- |
| `E2E_TEST_TOKEN`        | GitHub Secrets + Cloudflare | E2E endpoint auth      |
| `STRIPE_SECRET_KEY`     | Cloudflare (existing)       | Stripe API (test mode) |
| `STRIPE_WEBHOOK_SECRET` | Cloudflare (existing)       | Webhook verification   |

### Related Documentation

- [Testing Infrastructure Spec](../docs/specs/testing-spec.md)
- [Heartwood Auth Spec](../docs/specs/heartwood-spec.md)
- [Plant Onboarding Flow](../apps/plant/README.md)
- [Stripe Setup Guide](../docs/setup/stripe-setup.md)

---

_From 10,000 feet, the path is clear: signup, payment, auth, create, manage. Every step tested, every journey verified._ 🦅
