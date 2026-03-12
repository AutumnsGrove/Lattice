---
title: "Infra SDK Developer Guide"
description: "How to wire, extend, and test the infrastructure abstraction layer that wraps Cloudflare primitives into portable TypeScript interfaces."
category: guides
guideCategory: infrastructure
lastUpdated: "2026-03-12"
aliases: []
tags:
  - infra
  - sdk
  - cloudflare
  - database
  - storage
---

# Infra SDK Developer Guide

How to wire, extend, and test `@autumnsgrove/infra`, the abstraction layer that wraps Cloudflare D1, R2, KV, Service Bindings, and Cron Triggers into clean TypeScript interfaces. The interfaces stay the same. Only the roots change.

## How It Works

Every request handler in Grove receives a single `GroveContext` object. That context bundles six infrastructure services behind stable interfaces:

| Property     | Interface         | Cloudflare Adapter     | What it wraps         |
|-------------|-------------------|------------------------|-----------------------|
| `db`        | `GroveDatabase`   | `CloudflareDatabase`   | D1                    |
| `storage`   | `GroveStorage`    | `CloudflareStorage`    | R2                    |
| `kv`        | `GroveKV`         | `CloudflareKV`         | Workers KV            |
| `services`  | `GroveServiceBus` | `CloudflareServiceBus` | Service Bindings      |
| `scheduler` | `GroveScheduler`  | `CloudflareScheduler`  | Cron Triggers         |
| `config`    | `GroveConfig`     | `CloudflareConfig`     | `env` binding object  |

There is also an optional `observer` field on the context. When set, every adapter calls it after each operation with timing, success/failure, and a detail snippet. The SDK does not aggregate, buffer, or transmit events. What happens with them is up to the consumer.

### Import paths

Three entry points, each with a distinct role:

```typescript
// Platform-agnostic interfaces and types (use in application code)
import type { GroveContext, GroveDatabase, GroveStorage, GroveKV } from "@autumnsgrove/infra";

// Cloudflare adapters + middleware (use in entry points only)
import { createCloudflareContext, groveInfraMiddleware, createGroveHandle } from "@autumnsgrove/infra/cloudflare";

// In-memory mocks (use in tests)
import { createMockContext, MockDatabase, MockStorage, MockKV } from "@autumnsgrove/infra/testing";
```

Keep application logic importing from `@autumnsgrove/infra` (types only). The cloudflare subpath belongs in your Worker entry point or framework middleware setup. This separation is what makes the code portable.

### Wiring context in a Cloudflare Worker

Call `createCloudflareContext()` once in your Worker's `fetch` handler:

```typescript
import { createCloudflareContext } from "@autumnsgrove/infra/cloudflare";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const ctx = createCloudflareContext({
      db: env.DB,
      storage: env.STORAGE,
      kv: env.CACHE_KV,
      services: { auth: env.AUTH, amber: env.AMBER },
      env: env as Record<string, unknown>,
      dbName: "grove-engine-db",
      bucketName: "grove-storage",
    });
    return handleRequest(request, ctx);
  }
};
```

### Wiring context with Hono

For Hono workers, use the middleware. It calls `createCloudflareContext` internally and sets `ctx` on the Hono context:

```typescript
import { Hono } from "hono";
import { groveInfraMiddleware } from "@autumnsgrove/infra/cloudflare";

type AppVariables = { ctx: GroveContext };
const app = new Hono<{ Variables: AppVariables }>();

app.use("*", groveInfraMiddleware((env) => ({
  db: env.DB as D1Database,
  storage: env.BUCKET as R2Bucket,
  env: env as Record<string, unknown>,
})) as MiddlewareHandler);

app.get("/posts", async (c) => {
  const ctx = c.get("ctx");
  const result = await ctx.db.execute("SELECT * FROM posts WHERE tenant_id = ?", [tenantId]);
  return c.json(result.results);
});
```

Note the `as MiddlewareHandler` cast. The SDK defines a minimal `MiddlewareHandler` type to avoid a hard dependency on Hono. The cast bridges the type gap.

### Wiring context with SvelteKit

For SvelteKit apps deployed on Cloudflare Pages, use `createGroveHandle` in your hooks file:

```typescript
// src/hooks.server.ts
import { createGroveHandle } from "@autumnsgrove/infra/cloudflare";

export const handle = createGroveHandle((env) => ({
  db: env.DB as D1Database,
  storage: env.BUCKET as R2Bucket,
  kv: env.CACHE_KV as KVNamespace,
  env: env as Record<string, unknown>,
}));
```

The handle reads `event.platform?.env` to get bindings. When running local dev without the Cloudflare adapter, `event.locals.ctx` will not be set. A warning is logged (throttled to once per 60 seconds). Use `wrangler pages dev` for local testing with real bindings.

## Partial Bindings and Unavailable Proxies

Every binding in `CloudflareContextOptions` is optional. When you omit one, the SDK creates an "unavailable" proxy in its place. The proxy fulfills the interface contract but rejects with a descriptive error on any data operation:

- Missing `db` throws `[SRV-001] Database binding not available`
- Missing `storage` throws `[SRV-002] Object storage binding not available`
- Missing `kv` throws `[SRV-003] Key-value store binding not available`

The one exception: `info()` on unavailable proxies returns safely with `{ provider: "unavailable" }`. This lets you check availability before attempting real operations.

Async methods return `Promise.reject()` (not sync throws) so that both `await fn()` and `fn().catch()` catch the error consistently. Sync methods like `prepare()` throw synchronously.

This design enables workers that only need a subset of infrastructure. A cleanup worker that only touches the database does not crash because `storage` was never wired up.

## The Six Services

### GroveDatabase

Wraps SQL operations. The Cloudflare adapter delegates to D1's native API with zero overhead on the happy path.

```typescript
// Simple query
const posts = await ctx.db.execute(
  "SELECT * FROM posts WHERE tenant_id = ? AND published = 1",
  [tenantId]
);

// Prepared statements
const stmt = ctx.db.prepare("INSERT INTO posts (tenant_id, title, body) VALUES (?, ?, ?)");
await stmt.bind(tenantId, title, body).run();

// Batch (atomic, multiple statements in one round-trip)
const insert = ctx.db.prepare("INSERT INTO tags (post_id, name) VALUES (?, ?)");
await ctx.db.batch([
  insert.bind(postId, "grove"),
  insert.bind(postId, "solarpunk"),
]);
```

**Interactive transactions are not supported** on the D1 adapter. Calling `ctx.db.transaction()` throws `SRV-045` with a message pointing you toward `batch()` for atomic multi-statement work or Loom Durable Objects for interactive transaction support.

**`extractMeta()` guarantees**: The `QueryMeta` object always has numeric fields. The adapter defaults every D1 meta field to `0` if the runtime returns `undefined`. You never need optional chaining on `result.meta.changes`.

### GroveStorage

Wraps object/blob storage. The Cloudflare adapter maps R2's S3-compatible API to the `GroveStorage` interface.

```typescript
// Upload
const obj = await ctx.storage.put(
  `${tenantId}/avatar.webp`,
  imageBuffer,
  { contentType: "image/webp", metadata: { uploadedBy: wandererId } }
);

// Download
const file = await ctx.storage.get(`${tenantId}/avatar.webp`);
if (file) {
  return new Response(file.body, {
    headers: { "Content-Type": file.contentType },
  });
}

// List with prefix
const exports = await ctx.storage.list({ prefix: `${tenantId}/exports/` });

// Delete
await ctx.storage.delete(`${tenantId}/old-avatar.webp`);
await ctx.storage.deleteMany([key1, key2, key3]);
```

**Key validation**: Storage keys cannot be empty, cannot start with `/`, and cannot contain `..` (path traversal). The adapter rejects these synchronously before touching R2.

**Presigned URLs**: The R2 adapter throws `SRV-046` for `presignedUrl()`. R2 presigned URLs require S3-compatible API credentials, which are not available through Worker bindings. The mock storage returns a fake URL for testing.

**Put return value**: When you `put()` with a `ReadableStream`, the returned `StorageObject` has an empty body stream (the original stream was consumed by R2). Call `get()` if you need to re-read what you wrote.

### GroveKV

Wraps key-value storage with optional TTL. The Cloudflare adapter delegates to Workers KV.

```typescript
// Simple get/put
await ctx.kv.put("cache:settings:abc", JSON.stringify(settings), {
  expirationTtl: 3600,  // 1 hour
});
const cached = await ctx.kv.get("cache:settings:abc");

// JSON type
const data = await ctx.kv.get<Settings>("cache:settings:abc", { type: "json" });

// With metadata
await ctx.kv.put("session:xyz", token, {
  expirationTtl: 86400,
  metadata: { tier: "sapling" },
});
const session = await ctx.kv.getWithMetadata<string, { tier: string }>("session:xyz");
if (session) {
  console.log(session.value, session.metadata?.tier);
}

// List by prefix
const keys = await ctx.kv.list({ prefix: "cache:settings:" });
```

The `get()` method supports four type options: `"text"` (default), `"json"`, `"arrayBuffer"`, and `"stream"`. For validated JSON shapes, use `safeJsonParse()` from Rootwork on the returned value.

### GroveServiceBus

Wraps inter-service communication. On Cloudflare, this uses zero-latency service bindings, which means calls between workers on the same account skip the public internet.

```typescript
// Call another service
const response = await ctx.services.call<{ ok: boolean }>("auth", {
  method: "POST",
  path: "/api/verify",
  body: { token },
});

// Check if a service is reachable
const alive = await ctx.services.ping("auth");

// List available services
const available = ctx.services.services();
```

The adapter constructs a synthetic URL (`https://${serviceName}${path}`) for the fetch call. Request bodies are JSON-serialized automatically with the `Content-Type` header set. Responses are parsed as JSON. For response validation, use Zod or `safeJsonParse()` at your trust boundary.

If a service binding is missing, calling it throws `SRV-004`.

### GroveScheduler

Wraps cron-triggered operations. The Cloudflare adapter matches incoming `ScheduledEvent` cron expressions to registered handlers.

```typescript
// In your worker setup
const scheduler = ctx.scheduler as CloudflareScheduler;
scheduler.register("cleanup", "0 * * * *", async (event) => {
  console.log(`Running ${event.name} at ${event.scheduledTime}`);
  await cleanupExpiredSessions(ctx);
});

// In your Worker's scheduled export
export default {
  async scheduled(event: ScheduledEvent, env: Env, execCtx: ExecutionContext) {
    await scheduler.dispatch(event.cron, new Date(event.scheduledTime));
  }
};
```

The `register()` method (Cloudflare-specific, not on the base interface) stores both the handler and its cron expression. The `dispatch()` method looks up handlers by cron string. If no handler matches, it logs `SRV-007` but does not throw.

The base `on()` method registers by name only (no cron mapping). The `dispatch()` method falls back to name-based lookup if cron matching fails.

### GroveConfig

Wraps environment variable and secret access. The Cloudflare adapter reads from the Worker's `env` binding object.

```typescript
// Required (throws SRV-005 if missing)
const apiKey = ctx.config.require("REVERIE_API_KEY");

// Optional
const debugMode = ctx.config.get("DEBUG");

// With default
const region = ctx.config.getOrDefault("REGION", "us-east-1");

// Check existence
if (ctx.config.has("FEATURE_FLAG_NEW_EDITOR")) {
  // ...
}
```

## Observability

Every adapter emits events through the optional `GroveObserver` callback. The observer is set during context creation:

```typescript
const observer: GroveObserver = (event) => {
  console.log(`[${event.service}] ${event.operation} ${event.ok ? "ok" : "FAIL"} ${event.durationMs}ms`);
  if (!event.ok) {
    console.error(`  detail: ${event.detail}, error: ${event.error}`);
  }
};

const ctx = createCloudflareContext({ ..., observer });
```

Each `GroveEvent` includes:

- `service`: which primitive (`"db"`, `"storage"`, `"kv"`, `"services"`, `"scheduler"`)
- `operation`: the method name (`"execute"`, `"get"`, `"put"`, `"call"`, `"dispatch"`, etc.)
- `durationMs`: wall-clock time for the operation
- `ok`: boolean success flag
- `detail`: optional context (SQL snippet truncated to 100 chars, storage key, service name)
- `error`: error message when `ok` is `false`

The SDK does not aggregate or transmit. Log to console, write to a D1 table that Vista reads, pipe to an analytics service, or ignore entirely.

## Error Catalog

All errors use structured `SRV-XXX` codes following the `GroveErrorDef` pattern from `@autumnsgrove/lattice/errors`.

| Code     | Key                         | When it fires                                        |
|----------|-----------------------------|------------------------------------------------------|
| SRV-001  | `DB_NOT_AVAILABLE`          | Database binding omitted, proxy accessed              |
| SRV-002  | `STORAGE_NOT_AVAILABLE`     | Storage binding omitted, proxy accessed               |
| SRV-003  | `KV_NOT_AVAILABLE`          | KV binding omitted, proxy accessed                    |
| SRV-004  | `SERVICE_NOT_FOUND`         | Service binding name not in the bindings map          |
| SRV-005  | `CONFIG_MISSING`            | `config.require()` called with a key that does not exist |
| SRV-006  | `CONTEXT_INIT_FAILED`       | `createCloudflareContext()` threw during setup        |
| SRV-007  | `SCHEDULE_UNMATCHED`        | No handler registered for a dispatched cron expression |
| SRV-040  | `QUERY_FAILED`              | D1 query execution failed                            |
| SRV-041  | `STORAGE_UPLOAD_FAILED`     | R2 put failed                                        |
| SRV-042  | `STORAGE_DOWNLOAD_FAILED`   | R2 get/head failed                                   |
| SRV-043  | `KV_OPERATION_FAILED`       | KV get/put/delete/list failed                        |
| SRV-044  | `SERVICE_CALL_FAILED`       | Inter-service fetch failed or returned non-JSON      |
| SRV-045  | `TRANSACTIONS_NOT_SUPPORTED`| `transaction()` called on the D1 adapter             |
| SRV-046  | `PRESIGNED_URL_FAILED`      | `presignedUrl()` called on the R2 adapter            |
| SRV-080  | `ADAPTER_ERROR`             | Unexpected adapter-level error (input validation, etc.) |
| SRV-081  | `SERIALIZATION_ERROR`       | Data serialization/deserialization failure            |
| SRV-082  | `TIMEOUT`                   | Operation exceeded timeout threshold                 |

Every error has both a `userMessage` (safe to show Wanderers) and an `adminMessage` (for developer logs).

## Testing

### createMockContext()

The `@autumnsgrove/infra/testing` subpath provides full in-memory mocks. Call `createMockContext()` to get a typed `MockGroveContext` where every service is backed by an in-memory Map.

```typescript
import { createMockContext } from "@autumnsgrove/infra/testing";

const ctx = createMockContext();

// Pre-configure database responses
ctx.db.whenQuery("SELECT", [{ id: 1, title: "Test Post" }]);
const result = await ctx.db.execute("SELECT * FROM posts");
expect(result.results).toHaveLength(1);

// Check what queries ran
expect(ctx.db.calls).toEqual([{ sql: "SELECT * FROM posts", params: undefined }]);

// Storage works with real data
await ctx.storage.put("test/file.txt", "hello");
const obj = await ctx.storage.get("test/file.txt");
expect(obj).not.toBeNull();
expect(ctx.storage.has("test/file.txt")).toBe(true);

// KV supports TTL (expiration is checked on read)
await ctx.kv.put("temp", "value", { expirationTtl: 60 });
const val = await ctx.kv.get("temp");
expect(val).toBe("value");

// Service bus with pre-configured responses
ctx.services.whenCall("auth", { verified: true });
const resp = await ctx.services.call("auth", { method: "POST", path: "/verify" });
expect(resp.data).toEqual({ verified: true });

// Config
ctx.config.set("API_KEY", "test-key");
expect(ctx.config.require("API_KEY")).toBe("test-key");
```

### Resetting between tests

Every mock has a `reset()` method. Call it in `beforeEach` or `afterEach`:

```typescript
afterEach(() => {
  ctx.db.reset();
  ctx.storage.reset();
  ctx.kv.reset();
  ctx.services.reset();
  ctx.config.reset();
});
```

### Key differences between mocks and production

| Behavior                 | Mock                              | Production (Cloudflare)                 |
|--------------------------|-----------------------------------|-----------------------------------------|
| `db.transaction()`      | Runs the function directly        | Throws SRV-045                          |
| `storage.presignedUrl()`| Returns a fake URL                | Throws SRV-046                          |
| Input validation         | Minimal (no key validation)       | Full (empty checks, path traversal)     |
| `db.whenQuery()`         | Pattern matching via `includes()` | Real SQL execution                      |
| Observer events          | Not emitted                       | Emitted on every operation              |

The mock `transaction()` executes the callback directly, which makes unit testing easier. If you need to test the "transactions not supported" behavior, use the Cloudflare adapter directly.

### Capturing observer events in tests

Pass an observer function to `createMockContext()` if your code depends on observer behavior:

```typescript
const events: GroveEvent[] = [];
const ctx = createMockContext((event) => events.push(event));
```

Note that mock adapters do not emit observer events themselves. The observer is only stored on the context. If your code reads `ctx.observer` and calls it manually, the captured events will appear.

## Adding a New Adapter

To support a new platform (Turso, Redis, AWS, etc.):

1. Create a new directory under `libs/infra/src/` (e.g., `turso/`)
2. Implement each interface (`GroveDatabase`, `GroveStorage`, etc.) as a class
3. Create a `createTursoContext()` function that assembles a `GroveContext`
4. Add an export path in `package.json`:
   ```json
   "./turso": {
     "types": "./src/turso/index.ts",
     "default": "./src/turso/index.ts"
   }
   ```
5. Run the conformance tests in `src/testing/conformance/` against your adapter

The conformance tests in `src/testing/conformance/` validate that an adapter implementation meets the interface contract. They cover database queries, KV operations, and storage CRUD.

## Why It Breaks

**"SRV-001/002/003 binding not available"**: The binding was not passed to `createCloudflareContext()`. Check your `wrangler.toml` for the correct binding name and make sure you are passing it in the options. For Hono, verify your `configure` callback maps the right `env` property. For SvelteKit, make sure you are running through `wrangler pages dev` (not bare `vite dev`).

**"Interactive transactions not supported"**: D1 does not support `BEGIN`/`COMMIT` style transactions through the Worker binding. Use `batch()` for atomic multi-statement work. For truly interactive transactions, route the work through a Loom Durable Object.

**"SQL query cannot be empty"**: The adapter validates that SQL strings are non-empty before executing. This catches accidental template literal bugs where a variable resolved to an empty string.

**"Storage key contains invalid path pattern"**: Keys starting with `/` or containing `..` are rejected. This is a safety check against path traversal. Use relative paths like `tenant123/uploads/photo.webp`.

**"Presigned URL generation failed"**: R2 presigned URLs require S3-compatible API credentials configured outside the Worker binding. The Worker binding API does not expose this capability. If you need presigned URLs, set up R2's S3 API endpoint and use the `aws4fetch` library directly.

**Hono middleware type mismatch**: The SDK defines a minimal `MiddlewareHandler` type to avoid a hard Hono dependency. Cast the return value of `groveInfraMiddleware()` as `MiddlewareHandler` from Hono.

**SvelteKit: `ctx` is undefined in local dev**: The `createGroveHandle` hook checks for `event.platform?.env`. Plain `vite dev` does not set `event.platform`. Use `wrangler pages dev` or guard `ctx` access in your routes.

**Dual-binding workers (like Warden)**: Some workers need the primary DB through `GroveContext` and additional bindings (secondary D1, dual KV namespaces) through `c.env` directly. Pass your primary DB to `createCloudflareContext` and access secondary bindings via `c.env.TENANT_DB` in your handlers.

## Architecture Notes

The SDK is source-only. There is no build step. Consuming packages import TypeScript source files directly via `workspace:*` resolution, the same pattern used by `@autumnsgrove/prism`. This means changes are instantly visible without rebuilding.

The dependency graph is intentionally shallow. The SDK depends only on `@autumnsgrove/lattice` (for `GroveErrorDef` and `logGroveError`). Cloudflare types come from `@cloudflare/workers-types` as a dev dependency.

The adapter layer is a thin wrapper. `CloudflareDatabase.execute()` calls `d1.prepare(sql).bind(...params).all()` and wraps the result. There is no query builder, no ORM, no magic. The SQL is yours to write and yours to debug.

Observer calls are fire-and-forget. If an observer throws, the error is not caught by the adapter. Keep observers lightweight.

## Key Files

| File | Purpose |
|------|---------|
| `libs/infra/src/types.ts` | All interface definitions (GroveDatabase, GroveStorage, GroveKV, etc.) |
| `libs/infra/src/context.ts` | GroveContext interface definition |
| `libs/infra/src/errors.ts` | SRV-XXX error catalog |
| `libs/infra/src/cloudflare/index.ts` | `createCloudflareContext()` and all Cloudflare re-exports |
| `libs/infra/src/cloudflare/database.ts` | D1 adapter with `extractMeta()` |
| `libs/infra/src/cloudflare/storage.ts` | R2 adapter with key validation |
| `libs/infra/src/cloudflare/kv.ts` | Workers KV adapter |
| `libs/infra/src/cloudflare/service-bus.ts` | Service Bindings adapter |
| `libs/infra/src/cloudflare/scheduler.ts` | Cron Triggers adapter with `register()` and `dispatch()` |
| `libs/infra/src/cloudflare/config.ts` | Environment variable adapter |
| `libs/infra/src/cloudflare/unavailable.ts` | Proxy factories for missing bindings |
| `libs/infra/src/cloudflare/hono.ts` | `groveInfraMiddleware()` |
| `libs/infra/src/cloudflare/sveltekit.ts` | `createGroveHandle()` |
| `libs/infra/src/testing/index.ts` | `createMockContext()` and mock re-exports |
| `libs/infra/src/testing/mock-database.ts` | In-memory MockDatabase with `whenQuery()` |
| `libs/infra/src/testing/mock-storage.ts` | In-memory MockStorage with `has()`, `size` |
| `libs/infra/src/testing/mock-kv.ts` | In-memory MockKV with TTL expiration |
| `libs/infra/package.json` | Export map (`.`, `./cloudflare`, `./testing`) |

## Checklist

When wiring a new worker or consumer:

- [ ] Pass only the bindings you need to `createCloudflareContext()` (omit the rest)
- [ ] Import types from `@autumnsgrove/infra`, adapters from `@autumnsgrove/infra/cloudflare`
- [ ] Cast `groveInfraMiddleware()` as `MiddlewareHandler` in Hono apps
- [ ] Use `wrangler pages dev` for local SvelteKit testing with real bindings
- [ ] Use `batch()` for atomic multi-statement operations (not `transaction()`)
- [ ] Validate storage keys: no leading `/`, no `..`, no empty strings
- [ ] Use `createMockContext()` in tests, call `reset()` between test cases
- [ ] Check `ctx.db.info().provider` if you need to branch on adapter type
- [ ] Add an observer if you want operation-level timing and error visibility
