# Loom Developer Guide

How to build, deploy, and debug Durable Objects in the Grove monorepo.

## How Loom Works

Loom is Grove's Durable Object SDK. It provides a base class (`LoomDO`) that every DO in the platform extends. The base class handles the boilerplate that every DO needs: structured logging, route matching, alarm scheduling, WebSocket management, SQL helpers, and error responses.

All DO classes live in `services/durable-objects/src/` and are hosted by a single Cloudflare Worker called `grove-durable-objects`. Other services (the Lattice Pages app, Ivy, Meadow, Reverie) reference these DOs through service bindings with `script_name = "grove-durable-objects"` in their own `wrangler.toml` files.

The SDK itself lives in `libs/engine/src/lib/loom/` and is exported from the engine package as four subpaths:

| Import Path | Purpose |
|---|---|
| `@autumnsgrove/lattice/loom` | Core: `LoomDO`, types, router, storage helpers |
| `@autumnsgrove/lattice/loom/sveltekit` | SvelteKit adapter: `getLoomDO`, `fetchLoomJson` |
| `@autumnsgrove/lattice/loom/worker` | Worker adapter: `getWorkerDO`, `workerFetchJson` |
| `@autumnsgrove/lattice/loom/testing` | Mock factories: `createMockDOState`, `createMockD1`, `createMockR2` |

### What LoomDO gives you

When you extend `LoomDO`, your subclass gets these utilities on `this`:

- `this.log` -- Structured logger, auto-tagged with DO name and instance ID
- `this.alarms` -- Deduplicating alarm scheduler (`ensureScheduled`, `schedule`, `cancel`)
- `this.sockets` -- WebSocket lifecycle management with broadcast and cleanup
- `this.locks` -- Named promise dedup (prevents concurrent execution of the same operation)
- `this.sql` -- Safe SQL wrappers (`queryOne`, `queryAll`, `exec`) around DO SQLite
- `this.store` -- JSON key-value store backed by DO SQLite
- `this.emit()` -- Send messages to Cloudflare Queues
- `this.workflow()` -- Create Cloudflare Workflow instances

The base class also handles `fetch()` routing (declarative path+method matching), `alarm()` dispatch, and WebSocket lifecycle methods. You define routes, the base class matches them.

### Gen1 vs Gen2 DOs

There are two initialization strategies, controlled by `blockOnInit` in your `config()`:

- **Gen1 (blockOnInit: true, the default):** Schema DDL runs inside `blockConcurrencyWhile` during construction. The DO is ready before the first request. Used by PostContentDO, PostMetaDO, TenantDO.
- **Gen2 (blockOnInit: false):** Lazy init on first `fetch()`. Useful for DOs that may never receive a request, or that need non-blocking startup. Used by ThresholdDO, ExportDO, TriageDO, ChatDO.

## How to Add a New Durable Object

### 1. Write the DO class

Create a new file in `services/durable-objects/src/`. Here is a minimal example:

```typescript
import {
  LoomDO,
  type LoomRoute,
  type LoomConfig,
  type LoomRequestContext,
} from "@autumnsgrove/lattice/loom";

interface MyState {
  counter: number;
}

interface MyEnv extends Record<string, unknown> {
  DB: D1Database;
}

export class MyNewDO extends LoomDO<MyState, MyEnv> {
  config(): LoomConfig {
    return { name: "MyNewDO" };
  }

  protected schema(): string {
    return `
      CREATE TABLE IF NOT EXISTS counters (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL
      )
    `;
  }

  protected async loadState(): Promise<MyState | null> {
    const row = this.sql.queryOne<{ value: number }>(
      "SELECT value FROM counters WHERE key = 'main'"
    );
    return row ? { counter: row.value } : { counter: 0 };
  }

  routes(): LoomRoute[] {
    return [
      { method: "GET", path: "/count", handler: () => this.getCount() },
      { method: "POST", path: "/increment", handler: () => this.increment() },
    ];
  }

  private getCount(): Response {
    return Response.json({ count: this.state_data?.counter ?? 0 });
  }

  private async increment(): Promise<Response> {
    const next = (this.state_data?.counter ?? 0) + 1;
    this.sql.exec(
      "INSERT OR REPLACE INTO counters (key, value) VALUES ('main', ?)",
      next
    );
    if (this.state_data) this.state_data.counter = next;
    return Response.json({ count: next });
  }
}
```

Two methods are required: `config()` returns a name (and optionally `blockOnInit` / `hibernation`), and `routes()` returns your route table. The `schema()` and `loadState()` overrides are optional.

### 2. Export from the worker entrypoint

Open `services/durable-objects/src/index.ts` and add the export:

```typescript
export { MyNewDO } from "./MyNewDO.js";
```

Cloudflare needs the class to be a top-level export of the worker's `main` entrypoint to instantiate it. Also add the class name to the `classes` array in the health check response so monitoring picks it up.

### 3. Add the DO binding in `services/durable-objects/wrangler.toml`

```toml
[[durable_objects.bindings]]
name = "MY_NEW"
class_name = "MyNewDO"
```

The `name` is the env binding name that other code uses to access this DO (e.g., `env.MY_NEW`). The `class_name` must match the exported class name exactly.

### 4. Add a SQLite migration tag

Every new DO class that uses SQLite storage needs a migration entry. Add a new `[[migrations]]` block with the next `tag` version:

```toml
[[migrations]]
tag = "v8"
new_sqlite_classes = ["MyNewDO"]
```

Check the existing tags in the file and increment. If you skip this, the DO will fail to create its SQLite database and you will get opaque init errors.

### 5. Add service bindings in consuming services

Any worker or Pages app that needs to call your DO must declare a binding in its own `wrangler.toml`:

```toml
[[durable_objects.bindings]]
name = "MY_NEW"
class_name = "MyNewDO"
script_name = "grove-durable-objects"
```

The `script_name` tells Cloudflare to look for the class in the `grove-durable-objects` worker, not the current worker. Without it, Cloudflare expects the class to be exported from the current worker and will throw at deploy time.

For the Lattice (engine) Pages app, these bindings go in `libs/engine/wrangler.toml`.

### 6. Add extra bindings if your DO needs them

If your DO accesses D1, R2, KV, AI, or service bindings, add those to `services/durable-objects/wrangler.toml`. The DO worker has its own binding namespace, separate from the Pages app. Check the existing bindings in that file for examples (DB, IMAGES, EXPORTS_BUCKET, IVY_DB, KV, ZEPHYR, AI).

### 7. Rebuild the engine

The DO worker imports from `@autumnsgrove/lattice/loom`, which resolves to `dist/`. If you changed anything in `libs/engine/src/lib/loom/`, rebuild:

```bash
cd libs/engine && pnpm run build
```

The deploy CI workflow does this automatically (`needs-engine: true` in the workflow).

## How the Deploy Pipeline Works

### CI trigger

The GitHub Actions workflow at `.github/workflows/deploy-durable-objects.yml` triggers on pushes to `main` that touch:

- `services/durable-objects/**`
- `libs/engine/src/lib/loom/**`
- `libs/engine/src/lib/lumen/**`
- `libs/engine/src/lib/zephyr/**`

It can also be triggered manually via `workflow_dispatch`.

### What the workflow does

1. Builds the engine (`svelte-package`), producing `dist/` with the Loom SDK
2. Runs `tsc --noEmit` in the DO worker directory (type checking)
3. Runs `wrangler deploy` from `services/durable-objects/`

### The service binding chain

```
User Request
    |
    v
Lattice Pages App (libs/engine/wrangler.toml)
    |  script_name = "grove-durable-objects"
    v
grove-durable-objects Worker (services/durable-objects/wrangler.toml)
    |  hosts all 8 DO classes
    v
TenantDO / PostContentDO / ChatDO / ThresholdDO / ...
```

Other workers (Reverie, Ivy, Meadow) follow the same pattern: they declare a `[[durable_objects.bindings]]` with `script_name = "grove-durable-objects"` pointing to the DO they need.

### Calling a DO from SvelteKit

```typescript
import { getLoomDO } from "@autumnsgrove/lattice/loom/sveltekit";
import { loomFetch } from "@autumnsgrove/lattice/loom/sveltekit";

// In a +page.server.ts or +server.ts:
const stub = getLoomDO(platform, "POST_CONTENT", `content:${tenantId}:${slug}`);
const response = await loomFetch(stub, "/content", "GET");
```

### Calling a DO from a Worker

```typescript
import { getWorkerDO, loomFetchJson } from "@autumnsgrove/lattice/loom/worker";

const stub = getWorkerDO(env.THRESHOLD, `threshold:${userId}`);
const result = await loomFetchJson<ThresholdResult>(stub, "/check", "POST", {
  key: "api",
  limit: 100,
  windowSeconds: 60,
});
```

## Why Things Break

### "DO binding not found in platform.env"

The service binding is missing from the consuming app's `wrangler.toml`. You added the DO class and exported it from the worker, but forgot step 5 (adding the binding with `script_name` in the consuming service).

### "Class not found" errors on deploy

The class name in `wrangler.toml` doesn't match the exported class name in `src/index.ts`. These must be identical, including casing.

### Init failures (GROVE-LOOM-001)

The `schema()` DDL is failing. Common causes: syntax error in SQL, or you forgot to add a `[[migrations]]` tag for the new class. Without the migration tag, the DO has no SQLite database and `sql.exec()` fails.

### Stale types after changing the SDK

The DO worker imports from `@autumnsgrove/lattice/loom`, which resolves to `dist/`. If you edit files in `libs/engine/src/lib/loom/` and then run type checks on the DO worker, you will see stale types until you rebuild the engine. Run `cd libs/engine && pnpm run build` first.

### Alarm not firing

Check that you called `this.alarms.ensureScheduled(ms)` or `this.alarms.schedule(ms)`. The difference: `ensureScheduled` is a no-op if an alarm is already pending (dedup), while `schedule` always overwrites. If your alarm logic uses `ensureScheduled` and there is already a pending alarm from a previous cycle, your new alarm will be ignored.

### WebSocket upgrade returns 500

For DOs using hibernation-aware WebSockets (`hibernation: true` in config), the WebSocket upgrade must go through `this.sockets.accept()`, which calls `state.acceptWebSocket()` internally. If you try to use the regular `server.accept()` pattern with hibernation enabled, or vice versa, the connection will fail.

### Queue emit fails (GROVE-LOOM-071)

`this.emit()` was called but the queue binding doesn't exist in `services/durable-objects/wrangler.toml`. Add the `[[queues.producers]]` binding.

### DO works locally but fails in production

The DO worker has its own env bindings, separate from the Pages app. If your DO reads from D1 or R2, those bindings must be declared in `services/durable-objects/wrangler.toml`. The Pages app's bindings do not carry over to the DO worker.

## Key Files

### Loom SDK (`libs/engine/src/lib/loom/`)

| File | What it does |
|---|---|
| `base.ts` | `LoomDO` abstract class. Constructor, fetch routing, alarm dispatch, init lifecycle. |
| `types.ts` | All public interfaces: `LoomConfig`, `LoomRoute`, `LoomRequestContext`, `LoomQueueMessage`. |
| `router.ts` | Path+method matching with `:param` support. ~30 lines of matching logic. |
| `storage.ts` | `SqlHelper` (queryOne/queryAll/exec wrappers), `JsonStore` (KV on SQLite), `safeJsonParse`. |
| `alarm.ts` | `AlarmScheduler` with `ensureScheduled` (dedup) and `schedule` (force). |
| `websocket.ts` | `WebSocketManager` with accept, broadcast, cleanup. Supports regular and hibernation modes. |
| `logger.ts` | `LoomLogger` emitting structured JSON tagged with DO name and ID. |
| `lock.ts` | `PromiseLockMap` for named promise dedup. |
| `factory.ts` | `getLoomStub`, `loomFetch`, `loomFetchJson` for getting DO stubs and making calls. |
| `errors.ts` | `LOOM_ERRORS` catalog (GROVE-LOOM-001 through GROVE-LOOM-080), `LoomResponse` helpers. |
| `test-utils.ts` | Mock factories for `DurableObjectState`, `D1Database`, `R2Bucket`. |
| `index.ts` | Barrel export. |
| `adapters/sveltekit.ts` | `getLoomDO`, `fetchLoomJson` for SvelteKit server code. |
| `adapters/worker.ts` | `getWorkerDO`, `workerFetchJson` for Hono/Worker contexts. |

### DO Worker (`services/durable-objects/`)

| File | What it does |
|---|---|
| `src/index.ts` | Worker entrypoint. Exports all DO classes, provides `/health` endpoint. |
| `wrangler.toml` | DO bindings, migration tags, external resource bindings (D1, R2, KV, AI, services). |
| `package.json` | Dependencies: `@autumnsgrove/lattice` workspace link, `fflate` for zip. |
| `tsconfig.json` | TypeScript config with `@cloudflare/workers-types`. |

### DO Implementations (`services/durable-objects/src/`)

| Class | ID Pattern | Purpose | Init |
|---|---|---|---|
| `TenantDO` | `tenant:{subdomain}` | Config caching, draft sync, analytics buffering | Gen1 |
| `PostMetaDO` | `post:{tenantId}:{slug}` | Reactions, views, real-time presence | Gen1 |
| `PostContentDO` | `content:{tenantId}:{slug}` | Cached rendered HTML, markdown, metadata | Gen1 |
| `SentinelDO` | `sentinel:{testId}` | Stress test coordination, WebSocket updates | Gen2 |
| `ExportDO` | `export:{tenantId}:{exportId}` | Multi-phase zip assembly (alarm-driven state machine) | Gen2 |
| `TriageDO` | `triage:{tenantId}` | Email triage processing, digest scheduling | Gen2 |
| `ThresholdDO` | `threshold:{identifier}` | Per-identifier rate limiting | Gen2 |
| `ChatDO` | `chat:{minTenant}:{maxTenant}` | 1:1 DM messaging, hibernation-aware WebSockets | Gen2 |

### Deploy and Config

| File | What it does |
|---|---|
| `.github/workflows/deploy-durable-objects.yml` | CI deploy on push to main (path-filtered). |
| `libs/engine/wrangler.toml` | Lattice Pages app DO bindings (all use `script_name`). |

## Quick Checklist: Adding a New DO

1. [ ] Create `services/durable-objects/src/MyNewDO.ts` extending `LoomDO`
2. [ ] Implement `config()` and `routes()` (required), `schema()` and `loadState()` (if needed)
3. [ ] Export from `services/durable-objects/src/index.ts`
4. [ ] Add class name to the health check `classes` array in `src/index.ts`
5. [ ] Add `[[durable_objects.bindings]]` in `services/durable-objects/wrangler.toml`
6. [ ] Add `[[migrations]]` tag with the next version number
7. [ ] Add any extra resource bindings (D1, R2, KV) the DO needs to the same `wrangler.toml`
8. [ ] Add `[[durable_objects.bindings]]` with `script_name = "grove-durable-objects"` in every consuming service's `wrangler.toml`
9. [ ] Add type declarations to `app.d.ts` if accessing from SvelteKit (for `platform.env` typing)
10. [ ] Rebuild engine if you changed SDK files: `cd libs/engine && pnpm run build`
11. [ ] Run `tsc --noEmit` in `services/durable-objects/` to catch type errors before deploy
12. [ ] Deploy: push to main (path-filtered CI) or `workflow_dispatch`
