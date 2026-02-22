---
title: "Loom SDK — Durable Object Framework for Grove"
status: planned
category: infra
---

# Loom SDK — Durable Object Framework for Grove

## Context

Grove has 7 Durable Objects across 2 packages that all manually implement ~150 lines of identical scaffolding — constructor init, HTTP routing, alarm dedup, JSON persistence, error responses, structured logging. Every new DO means copying this boilerplate and hoping nothing is missed. The Threshold SDK (#943) proved that extracting shared patterns into an engine SDK dramatically improves consistency and developer experience. Loom SDK does the same for Durable Objects.

**Problem:** Building a new DO requires implementing 7 patterns from scratch, each with subtle correctness requirements (alarm dedup, persist-before-memory, safe JSON parse, etc.)
**Solution:** A base class + utilities SDK that encodes these patterns, letting DO authors focus on business logic
**Outcome:** New DOs need ~30 lines of scaffolding instead of ~150. Existing DOs migrate incrementally.

---

## Phase 1: Core SDK (`libs/engine/src/lib/loom/`)

Create the SDK following the Threshold directory pattern.

### Files to Create

```
libs/engine/src/lib/loom/
├── index.ts              — Barrel export (public API surface)
├── types.ts              — Core interfaces (LoomRoute, LoomRequestContext, etc.)
├── base.ts               — LoomDO<TState, TEnv> base class
├── router.ts             — Route matching (path+method → handler)
├── alarm.ts              — AlarmScheduler (dedup, ensureScheduled, cancel)
├── storage.ts            — JsonStore + SqlHelper + safeJsonParse
├── websocket.ts          — WebSocketManager (accept, broadcast, cleanup)
├── logger.ts             — LoomLogger (structured JSON, auto-tagged with DO name+ID)
├── errors.ts             — LOOM_ERRORS catalog + LoomResponse helpers
├── lock.ts               — PromiseLockMap (named promise dedup)
├── factory.ts            — loomFetch(), getLoomStub(), getLoomRPCStub()
├── test-utils.ts         — createMockDOState(), createMockDOEnv()
└── adapters/
    ├── sveltekit.ts      — getLoomDO() helper for platform.env access
    └── worker.ts         — Worker-to-Worker DO access helpers
```

### Base Class Design (`base.ts`)

```typescript
abstract class LoomDO<
  TState = unknown,
  TEnv = Record<string, unknown>,
> extends DurableObject<TEnv> {
  // Provided automatically:
  protected readonly log: LoomLogger;
  protected readonly alarms: AlarmScheduler;
  protected readonly sockets: WebSocketManager;
  protected readonly locks: PromiseLockMap;
  protected readonly sql: SqlHelper;
  protected state_data: TState | null;

  // Subclasses MUST implement:
  abstract schema(): string; // SQL DDL
  abstract routes(): LoomRoute[]; // Route config (empty [] for RPC-only)

  // Subclasses MAY override:
  protected async loadState(): Promise<TState | null>; // Load from storage
  protected async onAlarm(): Promise<void>; // Alarm handler
  protected async onWebSocketMessage(ws, msg): Promise<void>;
  protected async onWebSocketClose(ws): Promise<void>;

  // Provided helpers:
  protected markDirty(): void;
  protected async persistIfDirty(minIntervalMs?): Promise<void>;
}
```

**Why inheritance over composition:** DOs have a fixed lifecycle (constructor → fetch → alarm → webSocket\*). Inheritance maps naturally. Composition would require manual wiring of every lifecycle method.

### Router Design (`router.ts`)

Config-object approach — routes declared as data, not if/else chains:

```typescript
routes(): LoomRoute[] {
  return [
    { method: "GET",  path: "/content",       handler: (ctx) => this.getContent(ctx) },
    { method: "PUT",  path: "/content",       handler: (ctx) => this.setContent(ctx) },
    { method: "GET",  path: "/drafts/:slug",  handler: (ctx) => this.getDraft(ctx) },
  ];
}
```

Supports `:param` segments (replaces manual `path.split("/").pop()`). ~30 lines of matching logic, no external deps.

### Key Utilities

| Utility                              | Replaces                                                                        | Used by |
| ------------------------------------ | ------------------------------------------------------------------------------- | ------- |
| `AlarmScheduler.ensureScheduled(ms)` | Manual `getAlarm()` + `if (!current)` dedup                                     | 5/7 DOs |
| `JsonStore.set(key, value)`          | Manual `INSERT OR REPLACE INTO ... VALUES (?, JSON.stringify(...), Date.now())` | 4/7 DOs |
| `SqlHelper.queryOne()`               | Manual `.toArray()[0]` (safe, returns null not throws)                          | All DOs |
| `LoomResponse.error(err)`            | Copy-pasted 6-line JSON error response                                          | 6/7 DOs |
| `LoomLogger`                         | Inconsistent `console.error("[ClassName]")`                                     | All DOs |
| `PromiseLockMap.withLock(key, fn)`   | Manual `this.refreshPromise` pattern                                            | 2/7 DOs |
| `WebSocketManager.broadcast(msg)`    | Manual connection Set + try/catch/delete loop                                   | 2/7 DOs |
| `safeJsonParse(str, fallback)`       | Duplicated per-DO `parseJsonFor*` functions                                     | 4/7 DOs |

### Error Catalog (`errors.ts`)

Uses existing `GroveErrorDef` from `libs/engine/src/lib/errors/types.ts`:

- `GROVE-LOOM-001` through `GROVE-LOOM-049` — infrastructure/routing/persist/alarm/websocket errors
- `LoomResponse` object: `.json()`, `.success()`, `.notFound()`, `.badRequest()`, `.error()`

### Package Exports

Add to `libs/engine/package.json`:

```json
"./loom": {
  "types": "./dist/loom/index.d.ts",
  "default": "./dist/loom/index.js"
},
"./loom/sveltekit": {
  "types": "./dist/loom/adapters/sveltekit.d.ts",
  "default": "./dist/loom/adapters/sveltekit.js"
},
"./loom/worker": {
  "types": "./dist/loom/adapters/worker.d.ts",
  "default": "./dist/loom/adapters/worker.js"
},
"./loom/testing": {
  "types": "./dist/loom/test-utils.d.ts",
  "default": "./dist/loom/test-utils.js"
}
```

---

## Phase 2: Migrate PostContentDO (Validation Target)

**Why first:** Simplest DO — no alarms, no WebSocket, no promise locks. Validates the base class design with minimal risk.

### Before (~353 lines)

Manual constructor, initializeStorage, fetch router, error handling, persist pattern

### After (~120 lines)

```typescript
export class PostContentDO extends LoomDO<PostContent, ContentEnv> {
  schema() {
    return `CREATE TABLE IF NOT EXISTS content (...)`;
  }
  routes() {
    return [
      {
        method: "GET",
        path: "/content",
        handler: (ctx) => this.getContent(ctx),
      },
      // ... 5 more routes
    ];
  }
  protected async loadState() {
    /* load from JsonStore */
  }
  // ... only business logic methods remain
}
```

### Verification

- Deploy to staging, run existing integration tests
- Compare response formats (must be byte-identical)
- Monitor for 24h in production before proceeding

---

## Phase 3: Migrate Remaining DOs (Incremental)

Order by increasing complexity:

| Order | DO            | New SDK features exercised                           |
| ----- | ------------- | ---------------------------------------------------- |
| 1     | PostContentDO | Base class, router, storage, errors                  |
| 2     | TenantDO      | + AlarmScheduler, PromiseLockMap, TTL cache          |
| 3     | PostMetaDO    | + WebSocketManager, dirty-flag persist               |
| 4     | ExportDO      | + Alarm chaining (phase state machine)               |
| 5     | TriageDO      | + Similar to ExportDO                                |
| 6     | SentinelDO    | + WebSocket + alarm + batching                       |
| 7     | SessionDO     | RPC-based — uses utilities as mixins, not base class |

**SessionDO note:** Uses RPC (not HTTP), so `routes()` returns `[]`. It can extend `LoomDO` for the logger/alarm/sql helpers, or use them as standalone imports. Decision deferred to Phase 3 implementation.

---

## Phase 4: Consolidate Type Exports

Merge existing `libs/engine/src/lib/durable-objects/` type files into `loom/`:

- Move `TenantDO.ts`, `PostMetaDO.ts`, `PostContentDO.ts` types into `loom/types.ts` or colocated type files
- Update barrel export in `loom/index.ts` to re-export all DO types
- Deprecate `durable-objects/` directory (keep redirect re-exports for one release cycle)

---

## Critical Files

| File                                            | Role                                                      |
| ----------------------------------------------- | --------------------------------------------------------- |
| `libs/engine/src/lib/threshold/`            | Pattern template (directory structure, exports, adapters) |
| `libs/engine/src/lib/errors/types.ts`       | `GroveErrorDef` interface for error catalog               |
| `libs/engine/package.json`                  | Export map (add `./loom` entries)                         |
| `services/durable-objects/src/PostContentDO.ts` | First migration target (353 lines → ~120)                 |
| `services/durable-objects/src/TenantDO.ts`      | Second migration (exercises alarms + locks)               |
| `services/durable-objects/src/PostMetaDO.ts`    | Third migration (exercises WebSocket)                     |
| `libs/engine/src/lib/durable-objects/`      | Existing type re-exports (consolidate into loom/)         |

---

## Verification Plan

1. **Unit tests** — Each SDK module gets its own `.test.ts` file (router matching, alarm dedup, JSON store, WebSocket broadcast)
2. **Migration test** — Rewrite PostContentDO, verify identical HTTP responses with snapshot tests
3. **Type check** — `npx svelte-check` across engine + durable-objects packages
4. **Engine rebuild** — `pnpm run package` in engine after SDK creation
5. **Integration** — Deploy migrated PostContentDO to staging, exercise all 6 endpoints
6. **Regression** — Existing DO tests must pass unchanged for non-migrated DOs

---

## Implementation Estimate

- **Phase 1 (Core SDK):** 13 files, ~800–1000 lines total
- **Phase 2 (PostContentDO migration):** 1 file rewrite + tests
- **Phase 3 (remaining DOs):** 6 files, incremental over multiple sessions
- **Phase 4 (type consolidation):** Housekeeping

Phase 1 + Phase 2 are the critical path. Phase 3 is incremental and can happen over time. Phase 4 is cleanup.
