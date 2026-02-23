# Server SDK

> _The roots run deep. The tree stands anywhere._

Infrastructure abstraction layer that wraps each primitive (database, storage, key-value, scheduling, service calls, configuration) in a clean TypeScript interface. Today, Cloudflare adapters power everything. Tomorrow, the same application code could run on any cloud. The interface stays the same. Only the roots change.

## Installation

```bash
# Direct dependency
pnpm add @autumnsgrove/server-sdk

# Or via Lattice monorepo (recommended for Grove apps)
import type { GroveContext } from "@autumnsgrove/lattice/infra";
import { createCloudflareContext } from "@autumnsgrove/lattice/infra/cloudflare";
import { createMockContext } from "@autumnsgrove/lattice/infra/testing";
```

## Quick Start

```typescript
import { createCloudflareContext } from "@autumnsgrove/server-sdk/cloudflare";

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const ctx = createCloudflareContext({
			db: env.DB,
			storage: env.STORAGE,
			kv: env.CACHE_KV,
			services: { auth: env.AUTH, amber: env.AMBER },
			env,
		});
		return handleRequest(request, ctx);
	},
};
```

Application code only sees `GroveContext` — never Cloudflare-specific types:

```typescript
async function handleRequest(request: Request, ctx: GroveContext): Promise<Response> {
	const posts = await ctx.db.execute("SELECT * FROM posts WHERE tenant_id = ?", [tenantId]);
	const avatar = await ctx.storage.get(`${tenantId}/avatar.webp`);
	const cached = await ctx.kv.get(`cache:${tenantId}:settings`);
	// ...
}
```

## Interfaces

| Interface         | `ctx.*`         | CF Adapter             | What It Wraps       |
| ----------------- | --------------- | ---------------------- | ------------------- |
| `GroveDatabase`   | `ctx.db`        | `CloudflareDatabase`   | D1 (SQLite)         |
| `GroveStorage`    | `ctx.storage`   | `CloudflareStorage`    | R2 (S3-compatible)  |
| `GroveKV`         | `ctx.kv`        | `CloudflareKV`         | Workers KV          |
| `GroveServiceBus` | `ctx.services`  | `CloudflareServiceBus` | Service Bindings    |
| `GroveScheduler`  | `ctx.scheduler` | `CloudflareScheduler`  | Cron Triggers       |
| `GroveConfig`     | `ctx.config`    | `CloudflareConfig`     | Worker env bindings |

## Export Paths

| Path                                  | Contents                                | Use In                            |
| ------------------------------------- | --------------------------------------- | --------------------------------- |
| `@autumnsgrove/server-sdk`            | Interfaces + types + error catalog      | Application code, type signatures |
| `@autumnsgrove/server-sdk/cloudflare` | CF adapters + `createCloudflareContext` | Worker entry points only          |
| `@autumnsgrove/server-sdk/testing`    | In-memory mocks + `createMockContext`   | Test files                        |

Via Lattice re-exports: `@autumnsgrove/lattice/infra`, `@autumnsgrove/lattice/infra/cloudflare`, `@autumnsgrove/lattice/infra/testing`.

## Testing

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createMockContext, type MockGroveContext } from "@autumnsgrove/server-sdk/testing";

describe("PostService", () => {
	let ctx: MockGroveContext;

	beforeEach(() => {
		ctx = createMockContext();
	});

	it("should fetch posts from database", async () => {
		ctx.db.whenQuery("SELECT", [{ id: 1, title: "Hello" }]);
		const result = await ctx.db.execute("SELECT * FROM posts");
		expect(result.results).toHaveLength(1);
	});

	it("should upload to storage", async () => {
		await ctx.storage.put("tenant/file.txt", "hello");
		expect(ctx.storage.has("tenant/file.txt")).toBe(true);
	});

	it("should read config", () => {
		ctx.config.set("STRIPE_KEY", "sk_test_123");
		expect(ctx.config.require("STRIPE_KEY")).toBe("sk_test_123");
	});
});
```

## Error Codes

The SDK uses `SRV-XXX` Signpost error codes. All errors flow through `logGroveError` with warm user-facing messages and detailed admin messages.

| Range                 | Category                        | Examples                                             |
| --------------------- | ------------------------------- | ---------------------------------------------------- |
| `SRV-001` – `SRV-019` | Infrastructure & initialization | Missing bindings, context init failure               |
| `SRV-020` – `SRV-039` | Auth & sessions                 | Reserved for future use                              |
| `SRV-040` – `SRV-059` | Business logic / operations     | Query failures, upload errors, service call failures |
| `SRV-060` – `SRV-079` | Rate limiting                   | Reserved for Threshold integration                   |
| `SRV-080` – `SRV-099` | Internal / catch-all            | Adapter errors, serialization, timeouts              |

See `docs/specs/server-sdk-spec.md` for the full catalog.

## Architecture

The SDK follows the **Ports and Adapters** pattern (hexagonal architecture):

- **Ports** = the TypeScript interfaces (`GroveDatabase`, `GroveStorage`, etc.)
- **Adapters** = the platform-specific implementations (`CloudflareDatabase`, etc.)
- **Context** = the wiring point that connects ports to adapters (`createCloudflareContext`)

Application code depends only on ports. Adapters are injected at startup. To support a new platform, you write new adapters — the application code doesn't change.

```
  Application Code  →  GroveContext (interfaces)
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              Cloudflare   Node.js   Testing
              adapters    adapters    mocks
```

## Related

- **Spec:** `docs/specs/server-sdk-spec.md`
- **Agent guide:** `AgentUsage/server_sdk_guide.md`
- **Error handling:** `AgentUsage/error_handling.md`
- **Loom SDK:** `packages/engine/src/lib/loom/` (Durable Object coordination, integrates with Server SDK)
