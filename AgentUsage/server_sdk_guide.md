# Server SDK Guide

> _The roots run deep. The tree stands anywhere._

The Server SDK abstracts every Cloudflare infrastructure primitive behind clean TypeScript interfaces. Application code imports the interface, adapters get wired at startup. When you need to migrate, you swap the adapter — not the tree.

---

## When to Use Server SDK vs Direct Bindings

| Situation                                | Use                                                     |
| ---------------------------------------- | ------------------------------------------------------- |
| New service or feature                   | **Server SDK** — start with `GroveContext` from day one |
| Existing code with `env.DB.prepare(...)` | **Keep direct** until you have a migration window       |
| Test code that needs a database          | **Server SDK mocks** — `createMockContext()`            |
| Loom DO internals                        | **Direct** — DOs have their own storage model           |
| One-off wrangler CLI scripts             | **Direct** — no abstraction needed                      |

---

## GroveContext Pattern

### Creating Context

Every Worker entry point creates a `GroveContext` once, then passes it to all handlers:

```typescript
import { createCloudflareContext } from "@autumnsgrove/server-sdk/cloudflare";
// Or via Lattice: "@autumnsgrove/lattice/infra/cloudflare"

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const ctx = createCloudflareContext({
			db: env.DB,
			storage: env.STORAGE,
			kv: env.CACHE_KV,
			services: { auth: env.AUTH, amber: env.AMBER },
			env,
			// Optional diagnostic names
			dbName: "grove-engine-db",
			bucketName: "grove-media",
			kvNamespace: "CACHE_KV",
		});
		return handleRequest(request, ctx);
	},
};
```

### Passing Context

Thread `GroveContext` through function parameters. Never store it globally.

```typescript
// ✅ GOOD — context as parameter
async function getPost(ctx: GroveContext, postId: string) {
	return ctx.db.execute("SELECT * FROM posts WHERE id = ?", [postId]);
}

// ❌ BAD — global context
let globalCtx: GroveContext;
```

### Typing with Context

Application code imports only the interface types:

```typescript
import type { GroveContext, GroveDatabase, GroveStorage } from "@autumnsgrove/server-sdk";
// Or: "@autumnsgrove/lattice/infra"
```

Never import adapter classes in application code — only in the entry point.

---

## Adapter Reference

### Database (`ctx.db`)

```typescript
// Execute a query
const result = await ctx.db.execute("SELECT * FROM posts WHERE tenant_id = ?", [tenantId]);
// result.results: Record<string, unknown>[]
// result.meta: { changes, duration, rows_read, rows_written, last_row_id }

// Batch (atomic on D1)
const stmt1 = ctx.db.prepare("INSERT INTO posts (title) VALUES (?)").bind("Hello");
const stmt2 = ctx.db.prepare("INSERT INTO posts (title) VALUES (?)").bind("World");
const results = await ctx.db.batch([stmt1, stmt2]);

// Transaction — NOT supported on D1, use batch() or Loom DOs
await ctx.db.transaction(fn); // throws SRV-045
```

### Storage (`ctx.storage`)

```typescript
// Upload
const obj = await ctx.storage.put("tenant/photo.jpg", imageBuffer, {
	contentType: "image/jpeg",
	metadata: { uploadedBy: "autumn" },
});

// Download
const file = await ctx.storage.get("tenant/photo.jpg");
if (file) {
	return new Response(file.body, {
		headers: { "Content-Type": file.contentType },
	});
}

// List by prefix
const listing = await ctx.storage.list({ prefix: "tenant/", limit: 50 });

// Delete
await ctx.storage.delete("tenant/old-photo.jpg");
await ctx.storage.deleteMany(["a.txt", "b.txt"]);
```

Key validation: empty keys, path traversal (`..`, leading `/`) are rejected with `SRV-080`.

### Key-Value (`ctx.kv`)

```typescript
// Get (text by default)
const cached = await ctx.kv.get("cache:settings:123");

// Get as JSON
const data = await ctx.kv.get("cache:data:123", { type: "json" });

// Put with TTL
await ctx.kv.put("session:abc", JSON.stringify(sessionData), {
	expirationTtl: 3600,
	metadata: { role: "admin" },
});

// List with prefix
const keys = await ctx.kv.list({ prefix: "cache:" });

// Get with metadata
const result = await ctx.kv.getWithMetadata("session:abc");
// result.value + result.metadata
```

### Service Bus (`ctx.services`)

```typescript
// Call another service
const response = await ctx.services.call<{ user: User }>("auth", {
	method: "GET",
	path: `/session/${sessionId}`,
});
// response.status, response.headers, response.data

// Check availability
const isUp = await ctx.services.ping("auth");

// List services
const available = ctx.services.services(); // ["auth", "amber"]
```

### Scheduler (`ctx.scheduler`)

```typescript
// Register handlers (during Worker setup)
ctx.scheduler.register("daily-cleanup", "0 0 * * *", async (event) => {
	await cleanupExpiredSessions(ctx);
});

// Dispatch from Worker's scheduled() export
ctx.scheduler.dispatch(event.cron, new Date(event.scheduledTime));
```

### Config (`ctx.config`)

```typescript
// Required (throws SRV-005 if missing)
const stripeKey = ctx.config.require("STRIPE_SECRET_KEY");

// Optional
const debugMode = ctx.config.get("DEBUG");

// With default
const region = ctx.config.getOrDefault("REGION", "us-east-1");

// Check existence
if (ctx.config.has("FEATURE_FLAG_NEW_UI")) { ... }
```

---

## Testing Patterns

### Mock Context

```typescript
import { createMockContext } from "@autumnsgrove/server-sdk/testing";

const ctx = createMockContext();

// Pre-configure responses
ctx.db.whenQuery("SELECT", [{ id: 1, title: "Test" }]);
ctx.config.set("STRIPE_KEY", "sk_test_123");
ctx.services.whenCall("auth", { user: { id: "123" } });

// Use in tests
const result = await ctx.db.execute("SELECT * FROM posts");
expect(result.results).toHaveLength(1);

// Reset between tests
ctx.db.reset();
ctx.storage.reset();
ctx.kv.reset();
```

### Cloudflare Adapter Tests

Test adapters by mocking the CF binding interfaces with `vi.fn()`:

```typescript
import { createMockD1, createMockR2, createMockKVNamespace } from "tests/cloudflare/helpers";

const mockD1 = createMockD1();
const db = new CloudflareDatabase(mockD1 as unknown as D1Database);
```

See `libs/server-sdk/tests/cloudflare/` for the full test suite.

---

## Error Handling

All SDK operations use `logGroveError` with `SRV_ERRORS`:

```typescript
import { SRV_ERRORS } from "@autumnsgrove/server-sdk";
import { logGroveError } from "@autumnsgrove/lattice/errors";
```

| Code      | Key                          | When                                              |
| --------- | ---------------------------- | ------------------------------------------------- |
| `SRV-001` | `DB_NOT_AVAILABLE`           | Missing db binding                                |
| `SRV-002` | `STORAGE_NOT_AVAILABLE`      | Missing storage binding                           |
| `SRV-003` | `KV_NOT_AVAILABLE`           | Missing KV binding                                |
| `SRV-004` | `SERVICE_NOT_FOUND`          | Unknown service name                              |
| `SRV-005` | `CONFIG_MISSING`             | Required config key absent                        |
| `SRV-006` | `CONTEXT_INIT_FAILED`        | Context creation error                            |
| `SRV-007` | `SCHEDULE_UNMATCHED`         | No handler for cron                               |
| `SRV-040` | `QUERY_FAILED`               | SQL execution error                               |
| `SRV-041` | `STORAGE_UPLOAD_FAILED`      | R2 put error                                      |
| `SRV-042` | `STORAGE_DOWNLOAD_FAILED`    | R2 get error                                      |
| `SRV-043` | `KV_OPERATION_FAILED`        | KV operation error                                |
| `SRV-044` | `SERVICE_CALL_FAILED`        | Service fetch error                               |
| `SRV-045` | `TRANSACTIONS_NOT_SUPPORTED` | D1 doesn't support interactive transactions       |
| `SRV-046` | `PRESIGNED_URL_FAILED`       | R2 presigned URL not available via worker binding |
| `SRV-080` | `ADAPTER_ERROR`              | Catch-all adapter error                           |
| `SRV-081` | `SERIALIZATION_ERROR`        | Data serialization failure                        |
| `SRV-082` | `TIMEOUT`                    | Operation exceeded threshold                      |

---

## Common Patterns

### ✅ Good: Interface-first dependencies

```typescript
// Function accepts the interface
async function syncTenant(db: GroveDatabase, tenantId: string) {
	await db.execute("UPDATE tenants SET synced_at = ? WHERE id = ?", [Date.now(), tenantId]);
}
```

### ❌ Bad: Adapter-specific dependencies

```typescript
// Function is locked to Cloudflare
async function syncTenant(d1: D1Database, tenantId: string) {
	await d1
		.prepare("UPDATE tenants SET synced_at = ?1 WHERE id = ?2")
		.bind(Date.now(), tenantId)
		.run();
}
```

### ✅ Good: Context creation in entry point only

```typescript
// worker.ts (entry point)
import { createCloudflareContext } from "@autumnsgrove/server-sdk/cloudflare";

// handlers.ts (application code)
import type { GroveContext } from "@autumnsgrove/server-sdk";
```

### ❌ Bad: Adapter imports in application code

```typescript
// handlers.ts — now locked to Cloudflare
import { CloudflareDatabase } from "@autumnsgrove/server-sdk/cloudflare";
```

---

## Migration Guidance

### Migrating a Service to Server SDK

1. **Add dependency**: `pnpm add @autumnsgrove/server-sdk` (or use `@autumnsgrove/lattice/infra`)
2. **Create context**: Add `createCloudflareContext()` in the Worker entry point
3. **Thread context**: Pass `GroveContext` through to handlers
4. **Replace one binding at a time**: Start with KV (simplest), then R2, then D1
5. **Remove direct `env.*` access**: Once all calls go through context, the service is fully abstracted

### Migration Priority

| Service | Bindings Used              | Priority |
| ------- | -------------------------- | -------- |
| Shade   | KV                         | First    |
| Vista   | KV, D1                     | Second   |
| Amber   | R2, D1                     | Third    |
| Engine  | D1, R2, KV, Services, Cron | Last     |

---

_Last updated: 2026-02-23_
