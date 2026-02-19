# Integration Tests

Tests that exercise real module logic through mocked Cloudflare bindings (D1, R2, KV, service bindings).

## When to Use Integration vs Unit Tests

| Use integration tests when...         | Use unit tests when...           |
| ------------------------------------- | -------------------------------- |
| Testing request → response flows      | Testing pure utility functions   |
| Verifying tenant isolation in queries | Testing parsing/formatting logic |
| Testing auth/session orchestration    | Testing individual validators    |
| Exercising multi-step workflows       | Testing data transformations     |

## Directory Structure

```
tests/integration/
├── helpers/           Shared factories, mock RequestEvent, re-exports
├── api/               Form action and API endpoint tests
├── auth/              OAuth login/callback flow tests
├── hooks/             SvelteKit hooks.server.ts orchestration
├── storage/           R2 upload/delete/list tests
└── webhooks/          Webhook signature + event processing
```

## Using the Helpers

### Create a Mock Request Event

```ts
import { createMockRequestEvent } from "../helpers/index.js";

const event = createMockRequestEvent({
  url: "https://tenant.grove.place/admin/posts?/create",
  method: "POST",
  locals: {
    user: { id: "user-1", email: "test@grove.place", name: "Test" },
    tenantId: "tenant-1",
  },
});
```

The event includes a full `platform.env` with D1, R2 (CDN + IMAGES), KV, and AUTH service binding.

### Seed Database Data

```ts
import { createMockD1, seedMockD1 } from "../helpers/index.js";

const db = createMockD1();
seedMockD1(db, "posts", [
  {
    id: 1,
    tenant_id: "t1",
    slug: "hello",
    title: "Hello World",
    created_at: Date.now(),
  },
]);

const result = await db
  .prepare("SELECT * FROM posts WHERE tenant_id = ?")
  .bind("t1")
  .all();
```

### Use Factories

```ts
import { createTestUser, createTestSession } from "../helpers/index.js";

const user = createTestUser({ email: "custom@grove.place" });
const session = createTestSession({ userId: user.id });
```

Factories use counter-based IDs and sensible defaults. Spread overrides for customization.

## Mock D1 Capabilities

The mock D1 supports common patterns but not all SQL features:

**Supported:** SELECT with WHERE/ORDER BY/LIMIT, INSERT, UPDATE, DELETE, AND conditions, IS NULL / IS NOT NULL

**NOT supported:** OR, LIKE, IN, JOINs, subqueries, GROUP BY, upserts, aggregate functions

If your test needs advanced SQL, use Miniflare via `@cloudflare/vitest-pool-workers` instead.

## Test Isolation

- Use `beforeEach` for setup (not `afterEach` for cleanup) — protects against mid-test failures
- Call `vi.clearAllMocks()` to reset mock call counts between tests
- Each `createMockD1()` / `createMockR2()` / `createMockKV()` is a fresh isolated instance
- Factory counters reset between test files (each import gets a fresh module)

## Mocking Strategy

Mock at boundaries, test real logic:

```ts
// Mock external dependencies (boundaries)
vi.mock("$lib/utils/csrf.js", () => ({
  validateCSRF: vi.fn(() => true),
}));

// Test real business logic (no mocking)
const result = await handler(event);
expect(result.status).toBe(200);
```

For security-critical paths, consider also writing tests that exercise real validators (no mocking) to ensure the full stack works together.
