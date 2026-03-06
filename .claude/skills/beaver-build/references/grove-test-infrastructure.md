# Beaver Build — Grove Test Infrastructure Map

## Where Test Utilities Live

Grove already has rich test infrastructure. **Use it** — don't reinvent the wheel.

### Integration Test Helpers (Start Here)

**Import from:** `libs/engine/tests/integration/helpers`

```typescript
import {
	// Factories — create test data objects
	createTestUser, // → TestUser with email, name, avatar, provider
	createTestSession, // → TestSession with token, expiry
	createTestSubscription, // → TestSubscription with tier, status, lsId
	createTestImage, // → TestImage metadata (key, contentType, size)
	createTestWebhookEvent, // → TestWebhookEvent with signature, timestamp
	resetFactoryCounters, // Call in beforeEach to reset auto-incrementing IDs

	// Request event mocks
	createMockRequestEvent, // → Full SvelteKit RequestEvent mock
	createAuthenticatedTenantEvent, // → Pre-configured tenant + user context
	createMockServiceBinding, // → Mock service binding (e.g., AUTH Worker)
	createMockDONamespace, // → Mock Durable Object namespace

	// Cloudflare mocks
	createMockD1, // → Full D1Database mock with prepare/bind/run/first/all
	createMockR2, // → Full R2Bucket mock with get/put/delete/list
	createMockKV, // → Full KVNamespace mock with get/put/delete/list
	seedMockD1, // → Seed D1 mock with table data
	clearMockD1, // → Clear all D1 mock data
	advanceKVTime, // → Fast-forward KV expiration clock

	// Types
	type TestUser,
	type TestSession,
	type TestSubscription,
	type TestImage,
	type TestWebhookEvent,
	type MockRequestEvent,
	type MockRequestEventConfig,
	type MockCookies,
	type MockPlatformEnv,
	type MockServiceBinding,
	type MockDONamespace,
} from "../helpers";
```

### Durable Object Test Helpers

**Import from:** `libs/engine/tests/utils/test-helpers`

```typescript
import {
	// Fixture factories
	createTestTenant, // → TestTenant with subdomain, plan, active flag
	createTestPost, // → TestPost with markdown, html, gutter content
	resetTestCounters, // Call in beforeEach

	// Database helpers (insert into mock D1)
	insertTestTenant, // Insert tenant into D1
	insertTestPost, // Insert post into D1
	insertTestViews, // Insert view records with configurable daysAgo

	// DO stubs
	getTenantDOStub, // → DurableObjectStub for tenant:subdomain
	getPostMetaDOStub, // → DurableObjectStub for post:tenantId:slug
	getPostContentDOStub, // → DurableObjectStub for content:tenantId:slug

	// Request helpers
	createJsonRequest, // → Request with JSON body and Content-Type header
	parseJsonResponse, // → Parse and validate JSON response

	// Assertion helpers
	assertJsonResponse, // → Assert 200 + JSON + optional field matching
	assertErrorResponse, // → Assert error status + optional message matching

	// Cleanup
	cleanupTestData, // → Delete test-prefixed rows from D1

	// Types
	type TestTenant,
	type TestPost,
	type TierKey,
} from "../utils/test-helpers";
```

### Global Test Setup

**File:** `libs/engine/tests/utils/setup.ts`

Auto-loaded by vitest via `setupFiles` config. Provides:

- **localStorage mock** — full implementation with getItem, setItem, removeItem, clear
- **matchMedia mock** — for system preference detection (dark mode, etc.)
- **jest-dom matchers** — extends vitest `expect` with DOM assertions (toBeInTheDocument, etc.)
- **Mock DurableObject environment** — `mockEnv` with TENANTS, POST_META, POST_CONTENT, DB, CACHE_KV

### SvelteKit Module Mocks

**Location:** `libs/engine/tests/mocks/`

These alias SvelteKit virtual modules so they work in vitest:

| Mock File            | Aliases            | What It Provides                      |
| -------------------- | ------------------ | ------------------------------------- |
| `app-stores.ts`      | `$app/stores`      | Mock page, navigating, updated stores |
| `app-state.ts`       | `$app/state`       | Mock app state                        |
| `app-navigation.ts`  | `$app/navigation`  | Mock goto, invalidate, beforeNavigate |
| `app-environment.ts` | `$app/environment` | Mock browser, dev, building flags     |

**Also available in:** `apps/landing/src/lib/test-mocks/` (landing-specific overrides)

### Cloudflare Mock Details

**File:** `libs/engine/src/lib/server/services/__mocks__/cloudflare.ts`

Full-featured mocks for Cloudflare bindings:

| Mock             | Key Methods                                 | Special Features                                  |
| ---------------- | ------------------------------------------- | ------------------------------------------------- |
| `createMockD1()` | prepare, bind, run, first, all, batch, exec | Full SQL simulation with parametric binding       |
| `createMockKV()` | get, put, delete, list                      | TTL support, `advanceKVTime()` for testing expiry |
| `createMockR2()` | get, put, delete, list, head                | Supports metadata, content-type, checksums        |

### Feature-Specific Test Utilities

| Feature              | Location                                               | What It Provides                           |
| -------------------- | ------------------------------------------------------ | ------------------------------------------ |
| Feature flags        | `libs/engine/src/lib/feature-flags/test-utils.ts`      | Mock KV, D1, env helpers for graft testing |
| Loom (DOs)           | `libs/engine/src/lib/loom/test-utils.ts`               | DO coordination layer mocks                |
| Rate limiting        | `libs/engine/src/lib/threshold/test-utils.ts`          | Rate limiter mocks                         |
| Rate limits (server) | `libs/engine/src/lib/server/rate-limits/test-utils.ts` | Server-side rate limit mocks               |
| Heartwood            | `services/heartwood/src/test-helpers.ts`               | Auth service test helpers                  |
| Infra SDK            | `libs/infra/tests/cloudflare/helpers.ts`               | Infrastructure mock helpers                |

## Vitest Configuration Patterns

### Standard Engine Config

```typescript
// libs/engine/vitest.config.ts — the reference config
export default defineConfig({
	plugins: [svelte({ hot: false })],
	test: {
		globals: true,
		environment: "happy-dom",
		include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
		setupFiles: ["./tests/utils/setup.ts"],
		coverage: { provider: "v8" },
	},
	resolve: {
		conditions: ["browser"], // Required for Svelte 5 mount()
		alias: {
			$lib: "/src/lib",
			"$app/stores": resolve(__dirname, "tests/mocks/app-stores.ts"),
			"$app/state": resolve(__dirname, "tests/mocks/app-state.ts"),
			"$app/navigation": resolve(__dirname, "tests/mocks/app-navigation.ts"),
			"$app/environment": resolve(__dirname, "tests/mocks/app-environment.ts"),
		},
	},
});
```

### Worker/Service Config

```typescript
// services/heartwood/vitest.config.ts — node environment for workers
export default defineConfig({
	test: {
		globals: true,
		environment: "node", // Workers run in Node-like env
		include: ["src/**/*.test.ts"],
	},
});
```

## Quick Start: Writing a Test

### 1. Service/Utility Test

```typescript
// src/lib/services/my-service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { myFunction } from "./my-service";

describe("myFunction", () => {
	it("should do the thing", async () => {
		const result = await myFunction(input);
		expect(result).toBe(expected);
	});
});
```

### 2. API Route Test (with Cloudflare mocks)

```typescript
// src/routes/api/my-route/+server.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "./+server";
import {
	createMockRequestEvent,
	createTestUser,
	resetFactoryCounters,
} from "../../../../tests/integration/helpers";

describe("GET /api/my-route", () => {
	beforeEach(() => {
		resetFactoryCounters();
	});

	it("should return data for authenticated user", async () => {
		const user = createTestUser();
		const event = createMockRequestEvent({
			url: "https://test.grove.place/api/my-route",
			locals: { user, tenantId: "tenant-1" },
		});

		const response = await GET(event as any);
		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data).toBeDefined();
	});

	it("should return Signpost error for unauthenticated", async () => {
		const event = createMockRequestEvent({
			url: "https://test.grove.place/api/my-route",
		});

		const response = await GET(event as any);
		expect(response.status).toBe(401);

		const data = await response.json();
		expect(data.error_code).toMatch(/^GROVE-API-\d{3}$/);
	});
});
```

### 3. Component Test (with Testing Library)

```typescript
// src/lib/components/MyComponent.test.ts
import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import MyComponent from "./MyComponent.svelte";

describe("MyComponent", () => {
	it("should render with props", () => {
		render(MyComponent, { props: { title: "Hello" } });
		expect(screen.getByText("Hello")).toBeInTheDocument();
	});

	it("should handle user interaction", async () => {
		render(MyComponent, { props: { title: "Click me" } });
		await fireEvent.click(screen.getByRole("button"));
		expect(screen.getByText("Clicked!")).toBeInTheDocument();
	});
});
```

### 4. Authenticated Tenant Test (shortcut)

```typescript
import { createAuthenticatedTenantEvent } from "../../../../tests/integration/helpers";

it("should work for tenant owner", async () => {
	const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
		url: "https://test-tenant.grove.place/api/settings",
		method: "PUT",
		body: { displayName: "Updated Name" },
	});

	const response = await PUT(event as any);
	expect(response.status).toBe(200);
});
```

## Running Tests

```bash
# All tests across monorepo
pnpm test

# Specific package
pnpm --filter @autumnsgrove/lattice test:run    # Engine
pnpm --filter grove-landing test:run             # Landing
pnpm --filter grove-plant test:run               # Plant
pnpm --filter grove-heartwood test:run           # Heartwood

# Watch mode (for development)
pnpm --filter @autumnsgrove/lattice test

# Coverage report
pnpm --filter @autumnsgrove/lattice test:run -- --coverage

# UI dashboard
pnpm --filter @autumnsgrove/lattice test:ui

# Security-specific tests
pnpm --filter @autumnsgrove/lattice test:run -- tests/security

# Shell script tests (BATS)
pnpm test:shell

# E2E tests (Playwright — heartwood only)
pnpm --filter grove-heartwood test:e2e

# CI verification (run this before committing)
gw ci --affected --fail-fast --diagnose
```
