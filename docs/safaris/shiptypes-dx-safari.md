---
title: "ShipTypes DX Safari"
description: "Exploring developer experience patterns for type-safe shipping"
category: safari
lastUpdated: "2026-03-02"
tags:
  - dx
  - types
---

# ShipTypes DX Safari — Types as Contracts Across the Grove

> "The type signature _is_ the documentation. It cannot drift because it _is_ the code."
> — shiptypes.com
>
> **Aesthetic principle**: Schema-first boundaries. Every surface where data crosses a trust boundary gets a Zod schema. Types become the executable contract — not documentation that drifts, but code that enforces.
>
> **Scope**: Every boundary where data enters, exits, or crosses between services in the Grove monorepo. Database ↔ App. Service ↔ Service. Client ↔ Server. External ↔ Internal.

---

## Ecosystem Overview

**10 stops** across the Grove's type landscape
**~600 instances** of weak typing identified by scout reconnaissance
**11 files** currently use Zod (mostly in `workers/warden/` and `services/heartwood/`)
**33 `types.ts` files** in the engine — compile-time types are plentiful, runtime validation is nearly absent
**80+ export paths** from `@autumnsgrove/lattice` — the engine's surface area is enormous

### The Core Diagnosis

The Grove has **types as documentation** (TypeScript interfaces that describe shapes) but NOT **types as contracts** (runtime schemas that enforce shapes). The gap lives at every boundary where data enters the system: database results, JSON.parse, fetch responses, form data, cache reads, webhook payloads.

ShipTypes says: "Any system where two things must stay in sync manually will eventually fall out of sync." In the Grove, TypeScript generics (`queryOne<User>()`) and type assertions (`as any`) are the manual sync. They compile. They don't validate.

### Items by condition

**Thriving** 🟢: Engine package exports, Warden service registry, Heartwood token validation
**Growing** 🟡: Database service layer, Loom SDK types, App.d.ts declarations
**Wilting** 🟠: Service binding communication, API route contracts, form actions, test mocking
**Barren** 🔴: Cache boundary typing, JSON.parse everywhere, webhook ingestion

---

## 1. Database ↔ Application Boundary

_The jeep rolls to the first stop. The savanna stretches wide — this is the biggest watering hole in the Grove. Every app drinks here. Binoculars up..._

**Character**: The faithful workhorse. `database.ts` is beautifully architected — TenantDb with automatic scoping, SQL injection prevention, batch operations. But it has a blind spot: it trusts the generic.

### Safari findings: What exists today

**Database service** (`libs/engine/src/lib/server/services/database.ts`, 1075 lines):

- [x] `TenantDb` class with automatic tenant_id injection — excellent security boundary
- [x] SQL injection prevention via `validateTableName()` / `validateColumnName()`
- [x] Typed error hierarchy (`DatabaseError`, `DatabaseErrorCode`)
- [x] Session/batch support for atomic operations
- [x] `D1DatabaseOrSession` union type for flexibility
- [ ] **`queryOne<T>()` trusts the generic entirely** — `T` is never validated at runtime. If D1 returns `{ Name: "..." }` but `T` says `{ name: "..." }`, TypeScript is happy but the app breaks silently
- [ ] **`insert()` accepts `Record<string, unknown>`** — no validation that the data matches the table schema. Typo in a column name? Silent D1 error at runtime, not compile time
- [ ] **No schema registry for tables** — each caller independently declares the shape they expect. 10 different files might have 10 slightly different `Post` interfaces
- [ ] **~180 raw `db.prepare().bind().first()` calls** outside the TenantDb wrapper — especially in heartwood, DOs, and older code

### Design spec (safari-approved)

**Core principle**: Define table schemas as Zod schemas once. Derive TypeScript types from them. Validate at the boundary.

#### Schema Registry Pattern

```typescript
// libs/engine/src/lib/server/schemas/posts.ts
import { z } from "zod";

export const PostSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  content: z.string(),
  status: z.enum(["draft", "published", "archived"]),
  published_at: z.number().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
});

export type Post = z.infer<typeof PostSchema>;

// Insert schema = Post minus auto-generated fields
export const InsertPostSchema = PostSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertPost = z.infer<typeof InsertPostSchema>;
```

#### Validated Query Helpers

```typescript
// Enhanced queryOne that validates results
export async function queryOne<T>(
  db: D1DatabaseOrSession,
  sql: string,
  params: unknown[],
  schema?: z.ZodType<T>,  // Optional — validate when provided
): Promise<T | null> {
  const result = await db.prepare(sql).bind(...params).first();
  if (!result) return null;
  if (schema) return schema.parse(result);  // Runtime validation
  return result as T;  // Backward-compatible fallback
}
```

#### TenantDb with Schema Awareness

```typescript
// tenantDb.queryOne('posts', PostSchema, 'slug = ?', [slug])
// Instead of: tenantDb.queryOne<Post>('posts', 'slug = ?', [slug])
```

### Database fixes

- [ ] Create `libs/engine/src/lib/server/schemas/` directory for table schemas
- [ ] Define Zod schemas for top-5 tables: `tenants`, `posts`, `pages`, `settings`, `cdn_files`
- [ ] Add optional `schema` parameter to `queryOne`, `queryMany`, `findById`
- [ ] Export `InsertX` / `UpdateX` derived types for each schema
- [ ] Migrate highest-traffic queries to schema-validated versions first

### Migration note

This is **incremental** — the optional schema parameter means existing code continues to work. New code gets validation. Over time, make the schema parameter required.

---

## 2. Service Binding Communication (AUTH.fetch)

_The jeep bounces over a dry riverbed. Through the dust haze, the Heartwood service looms on the horizon — the auth fortress. Every request to the Grove passes through its gates. But the gates speak HTTP, not types..._

**Character**: The critical security gate. `platform.env.AUTH.fetch()` is the right pattern (service binding, not public internet). But every call constructs a URL string, sends a fetch, and parses JSON without knowing what shape comes back.

### Safari findings: What exists today

**Auth service binding** (used in `apps/login/`, `apps/plant/`, `apps/domains/`, `libs/engine/`):

- [x] Uses Cloudflare service bindings (`env.AUTH: Fetcher`) — fast, internal, no public internet
- [x] Consistent pattern across apps: `platform.env.AUTH.fetch(url, options)`
- [x] Heartwood has Zod validation on its token endpoints internally
- [ ] **Callers get `Response` back, not typed data** — every call site does `await res.json()` and hopes for the best
- [ ] **No shared response types** — `apps/login/src/routes/+page.server.ts:106` parses a session response with no type guard. `apps/plant/src/routes/auth/callback/+server.ts:110` does the same thing differently
- [ ] **Error responses untyped** — when AUTH returns 401 or 500, the error shape is unknown. Callers check `res.ok` but can't safely read the error body
- [ ] **URL construction is string-based** — `\`${authBaseUrl}/api/auth/sign-in/social\`` — a typo in the path is a runtime 404, not a compile error

### Design spec (safari-approved)

**Core principle**: Ship a typed client, not docs about endpoints. ShipTypes says: "Ship SDKs, not docs."

#### Heartwood Client SDK

```typescript
// libs/engine/src/lib/heartwood/client.ts
import { z } from "zod";

// Response schemas — defined once, used everywhere
const SessionResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("Bearer"),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().optional(),
    picture: z.string().url().optional(),
  }),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export class HeartwoodClient {
  constructor(private auth: Fetcher, private baseUrl = "https://auth.grove.place") {}

  async signInSocial(params: {
    provider: "google";
    code: string;
    redirect_uri: string;
    code_verifier?: string;
  }): Promise<SessionResponse> {
    const res = await this.auth.fetch(`${this.baseUrl}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw await this.parseError(res);
    return SessionResponseSchema.parse(await res.json());
  }

  async validateSession(token: string): Promise<{ valid: boolean; user?: User }> { /* ... */ }
  async revokeToken(token: string): Promise<void> { /* ... */ }
}
```

#### Future: Cloudflare RPC (when Heartwood migrates to Workers)

ShipTypes specifically calls out Cloudflare's JS-native RPC. Today, Heartwood runs as a Worker with HTTP routes. When it adopts `WorkerEntrypoint` + `RpcTarget`, callers would get:

```typescript
// Future — compile-time type safety, no HTTP involved
const session = await env.AUTH.signInSocial({ provider: "google", code, redirect_uri });
// TypeScript KNOWS the return type. No fetch. No JSON.parse. No hope.
```

### Service binding fixes

- [ ] Create `HeartwoodClient` class in `libs/engine/src/lib/heartwood/client.ts`
- [ ] Define Zod schemas for all Heartwood response shapes (session, token, user, error)
- [ ] Replace raw `AUTH.fetch()` calls in all 5 consuming apps with client method calls
- [ ] Add error envelope type (`{ error: string; code: string }`) so error handling is typed
- [ ] Document RPC migration path for when Heartwood adopts `WorkerEntrypoint`

---

## 3. Durable Object Communication

_A herd of Durable Objects grazes on the plain — TenantDO, PostMetaDO, PostContentDO, ExportDO, SentinelDO. They communicate through Loom routes — typed on the inside, but the callers send fetch requests and parse JSON by hand..._

**Character**: The coordination layer. Loom is a well-designed DO framework with typed routes, structured logging, and SQLite storage. But the boundary between "caller" and "DO" is a fetch call with an untyped JSON response.

### Safari findings: What exists today

**Loom SDK** (`libs/engine/src/lib/loom/`, ~600 lines):

- [x] `LoomRoute` type with method, path, handler — well-structured routing
- [x] `LoomRequestContext` with parsed URL, params, query — good DX inside the DO
- [x] `LoomQueueMessage<T>` — generic queue messages with source tracking
- [x] `LoomConfig` with hibernation and init options
- [x] `LoomResponse` helper for consistent JSON responses
- [ ] **No typed client for DO callers** — apps do `stub.fetch(new Request(url))` and parse the response themselves
- [ ] **Route definitions are strings** — `{ method: "GET", path: "/config" }` — a typo is a 404 at runtime
- [ ] **`LoomWebSocketMessage.json` is typed as `unknown | null`** — callers must cast
- [ ] **No shared request/response types per route** — TenantDO's `/config` route returns `TenantConfig`, but callers can't import that contract

### Design spec (safari-approved)

**Core principle**: Each DO should export a typed client. The route table is the schema. Derive types from it.

#### Typed DO Client Pattern

```typescript
// libs/engine/src/lib/loom/client.ts
export class LoomClient<TRoutes extends Record<string, { input?: z.ZodType; output: z.ZodType }>> {
  constructor(
    private stub: DurableObjectStub,
    private routes: TRoutes,
    private baseUrl: string,
  ) {}

  async call<K extends keyof TRoutes>(
    route: K,
    input?: z.infer<TRoutes[K]["input"]>,
  ): Promise<z.infer<TRoutes[K]["output"]>> {
    const res = await this.stub.fetch(`${this.baseUrl}${String(route)}`, {
      method: input ? "POST" : "GET",
      body: input ? JSON.stringify(input) : undefined,
    });
    if (!res.ok) throw new Error(`DO call failed: ${String(route)}`);
    return this.routes[route].output.parse(await res.json());
  }
}
```

#### TenantDO Client Example

```typescript
// services/durable-objects/src/TenantDO.client.ts
const TenantConfigSchema = z.object({
  id: z.string(),
  subdomain: z.string(),
  displayName: z.string(),
  theme: z.record(z.unknown()).nullable(),
  tier: z.enum(["seedling", "sapling", "oak", "evergreen"]),
  limits: z.object({ postsPerMonth: z.number(), storageBytes: z.number(), customDomains: z.number() }),
  ownerId: z.string(),
});

const tenantRoutes = {
  "/config": { output: TenantConfigSchema },
  "/analytics": { input: AnalyticsEventSchema, output: z.object({ success: z.boolean() }) },
} as const;

export function getTenantClient(stub: DurableObjectStub) {
  return new LoomClient(stub, tenantRoutes, "https://tenant.internal");
}
```

### Loom fixes

- [ ] Create `LoomClient` base class with typed route calling
- [ ] Export request/response schemas from each DO alongside the DO class
- [ ] Create typed client factories: `getTenantClient()`, `getPostMetaClient()`, etc.
- [ ] Add response schema to `LoomRoute` type: `{ method, path, handler, responseSchema? }`
- [ ] Long-term: Migrate DOs to RPC methods (`extends DurableObject` with typed public methods)

---

## 4. API Route Request/Response Contracts

_The terrain changes. We're in the thickest part of the grove now — dozens of `+server.ts` files, each an API endpoint. Each one accepts requests and returns responses. But what shape? You have to read the code to find out..._

**Character**: The public face. API routes are where external clients, frontend fetch calls, and AI agents interact with the Grove. ShipTypes says this is exactly where types matter most — "Types are the UX of your application."

### Safari findings: What exists today

**API routes** (across all apps):

- [x] Consistent use of SvelteKit's `json()` helper for responses
- [x] Signpost error codes (`buildErrorJson()`) for error responses — structured errors
- [x] CSRF protection via engine middleware
- [ ] **`request.json()` is unvalidated** — every API route does `const data = await request.json()` and immediately uses `data.title`, `data.content` etc. with no schema check
- [ ] **Response shapes undeclared** — what does `GET /api/posts` return? You have to read the handler to find out. No exported type, no schema
- [ ] **No shared API contract** — frontend fetch calls and server handlers independently agree on shapes. They drift
- [ ] **FormData extraction untyped** — `formData.get("title")` returns `FormDataEntryValue | null`. Every caller casts or `|| ""`s

### Design spec (safari-approved)

**Core principle**: Define API contracts as schemas. Validate incoming, type outgoing. One source of truth.

#### API Contract Pattern

```typescript
// libs/engine/src/lib/server/contracts/posts.ts
import { z } from "zod";

export const CreatePostContract = {
  input: z.object({
    title: z.string().min(1).max(500),
    content: z.string(),
    status: z.enum(["draft", "published"]).default("draft"),
  }),
  output: z.object({
    id: z.string().uuid(),
    slug: z.string(),
  }),
};

export const ListPostsContract = {
  query: z.object({
    status: z.enum(["draft", "published", "archived"]).optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
  }),
  output: z.object({
    posts: z.array(PostSchema.pick({ id: true, title: true, slug: true, status: true, published_at: true })),
    total: z.number(),
  }),
};
```

#### Route Handler with Validation

```typescript
// Usage in +server.ts
import { CreatePostContract } from "@autumnsgrove/lattice/server/contracts/posts";

export async function POST({ request }) {
  const body = CreatePostContract.input.safeParse(await request.json());
  if (!body.success) return json(buildErrorJson(API_ERRORS.VALIDATION_FAILED, body.error), { status: 400 });

  // body.data is now fully typed — IDE autocomplete, no guessing
  const id = await tenantDb.insert("posts", body.data);
  return json(CreatePostContract.output.parse({ id, slug: slugify(body.data.title) }));
}
```

### API route fixes

- [ ] Create `libs/engine/src/lib/server/contracts/` directory
- [ ] Define contracts for top-5 API surface areas: posts, settings, media, export, auth-proxy
- [ ] Create `validateRequest()` helper that combines Zod parsing with Signpost error responses
- [ ] Export contract types so frontend fetch calls can import them: `type CreatePostInput = z.infer<typeof CreatePostContract.input>`
- [ ] Add `validateQuery()` for URL search params validation (wraps `z.coerce`)

---

## 5. Cache Boundaries (KV + DO State)

_The jeep reaches a shimmering mirage — data that looks solid but dissolves when you touch it. Cache reads return strings that become `as any` the moment they're parsed..._

**Character**: The invisible boundary. Cache is where type safety goes to die. Data goes in typed, gets serialized to a string, comes back as `unknown`, and gets cast to `any` because nobody wants to validate what should be a known shape.

### Safari findings: What exists today

**KV Cache** (`libs/engine/src/lib/server/services/cache.ts`) + inline usage:

- [x] Cache service exists with get/set/delete patterns
- [x] TTL-based expiration
- [ ] **`KV.get()` returns `string | null`** — every read requires `JSON.parse` + type assertion
- [ ] **Pulse page: `(activeData as any)`, `(todayData as any)`, `(streakData as any)`** — three `as any` casts for cache reads in `libs/engine/src/routes/(site)/pulse/+page.server.ts:135-143`
- [ ] **DO state via `JSON.parse(rows[0].value)`** — `TenantDO.ts:134,233,276,390,425` parses stored state with no validation. Theme corruption, metadata corruption undetectable
- [ ] **Forage (AI service): `JSON.parse(r.flags)`, `JSON.parse(r.evaluation_data)`** — feature flag state and AI evaluation data untyped after deserialization

### Design spec (safari-approved)

**Core principle**: Typed cache. Serialize with a schema key, deserialize with the same schema.

#### TypedCache Wrapper

```typescript
// libs/engine/src/lib/server/services/typed-cache.ts
import { z } from "zod";

type CacheRegistry = Record<string, z.ZodType>;

export class TypedCache<R extends CacheRegistry> {
  constructor(private kv: KVNamespace, private schemas: R) {}

  async get<K extends keyof R>(key: K, cacheKey: string): Promise<z.infer<R[K]> | null> {
    const raw = await this.kv.get(`${String(key)}:${cacheKey}`);
    if (!raw) return null;
    return this.schemas[key].parse(JSON.parse(raw));
  }

  async set<K extends keyof R>(key: K, cacheKey: string, value: z.infer<R[K]>, ttl?: number): Promise<void> {
    // Validate on write too — catch corruption early
    this.schemas[key].parse(value);
    await this.kv.put(`${String(key)}:${cacheKey}`, JSON.stringify(value), ttl ? { expirationTtl: ttl } : undefined);
  }
}

// Usage:
const cache = new TypedCache(env.CACHE_KV, {
  "pulse:active": PulseActiveSchema,
  "pulse:streak": PulseStreakSchema,
  "tenant:config": TenantConfigSchema,
});

const active = await cache.get("pulse:active", tenantId); // Typed! No `as any`!
```

### Cache fixes

- [ ] Create `TypedCache` wrapper in engine services
- [ ] Define schemas for Pulse cache entries (active, today, streak)
- [ ] Define schemas for tenant config cache
- [ ] Replace `as any` casts in pulse page server with typed cache reads
- [ ] Add `safeJsonParse<T>(raw: string, schema: z.ZodType<T>): T | null` utility to engine

---

## 6. Webhook & External Data Ingestion

_Something glints at the edge of the plain — foreign objects. Stripe webhooks. GitHub payloads. Email events. Data from outside the grove, entering through narrow gates with no type guards..._

**Character**: The untrusted frontier. External data is the most dangerous boundary — it's not your code, not your schema, and it changes without notice. ShipTypes says: "Types as contracts" matters most here.

### Safari findings: What exists today

**Webhook handlers** (across `apps/ivy/`, `services/durable-objects/`, `apps/plant/`):

- [x] Stripe webhook signature verification exists
- [x] Some TypeScript type annotations on payloads
- [ ] **`JSON.parse(entry.raw_payload)` without validation** — `apps/ivy/src/workers/webhook/handler.ts:149` declares `WebhookPayload` type but doesn't validate
- [ ] **GitHub webhook data: `(event.data as any)?.sha`** — `services/pulse/src/store.ts:89,134-136` — three `as any` casts for commit data
- [ ] **Encrypted envelope parsing: `JSON.parse(row.encrypted_envelope as string)`** — `apps/ivy/src/routes/api/emails/[id]/+server.ts:45` — crypto boundary with no shape validation
- [ ] **OAuth redirect_uris: `JSON.parse(client.redirect_uris)` typed as `string[]`** — `services/heartwood/src/db/queries.ts:127` — security boundary; malformed URIs silently accepted

### Design spec (safari-approved)

**Core principle**: External data gets validated at the gate. Period. Use Zod discriminated unions for webhook event types.

#### Webhook Validation Pattern

```typescript
// libs/engine/src/lib/server/schemas/webhooks.ts
const StripeEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("checkout.session.completed"), data: z.object({ object: CheckoutSessionSchema }) }),
  z.object({ type: z.literal("customer.subscription.updated"), data: z.object({ object: SubscriptionSchema }) }),
  z.object({ type: z.literal("invoice.payment_failed"), data: z.object({ object: InvoiceSchema }) }),
]);

const GitHubPushEventSchema = z.object({
  ref: z.string(),
  commits: z.array(z.object({
    sha: z.string(),
    message: z.string(),
    added: z.array(z.string()),
    removed: z.array(z.string()),
    modified: z.array(z.string()),
  })),
  // ... only the fields you actually use
});
```

### Webhook fixes

- [ ] Create webhook schemas for Stripe events (only the event types actually handled)
- [ ] Create webhook schema for GitHub push events (Pulse)
- [ ] Validate all `JSON.parse(raw_payload)` calls through schemas
- [ ] Replace `(event.data as any)` casts in Pulse store with typed accessors
- [ ] Create `parseOAuthUris()` validated helper in heartwood

---

## 7. Engine Package Exports (The Bright Spot)

_The jeep crests a hill and the view opens up — the engine, the heart of the Grove. 80+ export paths, each with proper `types` conditions. This is what "ship types" looks like when it's working..._

**Character**: The gold standard. The engine's `package.json` exports are exemplary — every path has a `types` condition, the barrel structure is clean, and consumers get IDE autocomplete on import. This is what ShipTypes looks like in practice.

### Safari findings: What exists today

**Engine package** (`libs/engine/package.json`, 80+ export paths):

- [x] Every export path has `"types": "./dist/...d.ts"` condition — proper TypeScript resolution
- [x] Svelte components export both `types` and `svelte` conditions
- [x] 33 `types.ts` files provide dedicated type modules
- [x] Clean barrel exports (`index.ts` files) with explicit re-exports
- [x] Signpost error catalog (`errors/`) with typed error codes
- [ ] **No runtime validation schemas exported** — types are compile-time only. Consumers can't import a Zod schema to validate data at boundaries
- [ ] **Discovery is hard** — 80+ paths means you need to read `package.json` or AGENT.md to know what's available. No searchable type catalog
- [ ] **Some types are duplicated across apps** — `TenantInfo` in `app.d.ts` vs `TenantConfig` in TenantDO vs tenant row types in various service files

### Design spec (safari-approved)

**Core principle**: The engine should export schemas alongside types. When a consumer needs a `Post` type, they should be able to import both the type AND the schema.

#### Dual Export Pattern

```typescript
// libs/engine/src/lib/server/schemas/index.ts
// Re-export all schemas for consumers who need runtime validation
export { PostSchema, type Post, InsertPostSchema, type InsertPost } from "./posts.js";
export { TenantSchema, type Tenant } from "./tenants.js";
export { SettingsSchema, type Settings } from "./settings.js";
```

```jsonc
// Addition to package.json exports:
"./schemas": {
  "types": "./dist/server/schemas/index.d.ts",
  "default": "./dist/server/schemas/index.js"
}
```

### Engine export fixes

- [ ] Add `./schemas` export path to engine package.json
- [ ] Consolidate duplicate type definitions (TenantInfo vs TenantConfig vs tenant row)
- [ ] Export Zod schemas alongside TypeScript types for all major entities
- [ ] Create `./contracts` export path for API input/output schemas

---

## 8. Cross-App Type Sharing (app.d.ts)

_The herd splits here — each app has its own `app.d.ts`, its own view of the world. Some are comprehensive. Some are barren. They should all speak the same language..._

**Character**: The diverging paths. SvelteKit's `app.d.ts` is where apps declare their platform bindings, locals shape, and error type. The engine's is comprehensive (146 lines). Some apps are nearly empty.

### Safari findings: What exists today

**app.d.ts files** (10 total across apps + engine):

- [x] `libs/engine/src/app.d.ts` — Comprehensive: `App.Locals`, `App.Platform`, `App.Error`, `AppContext`, `TenantInfo` (184 lines)
- [x] `apps/landing/src/app.d.ts` — Decent: proper platform bindings
- [x] `apps/ivy/src/app.d.ts` — Clean auth locals
- [ ] **`apps/terrarium/src/app.d.ts` — Empty `Locals {}` interface** — all `locals.*` usage untyped
- [ ] **`apps/plant/src/app.d.ts` — Minimal** — no mention of `tenantId` or `dbSession` despite usage
- [ ] **`apps/meadow/` uses `locals.user.tenantId` and `locals.user.subdomain`** — properties not in the type declaration. Runtime error waiting to happen
- [ ] **No shared base type** — each app independently declares overlapping interfaces. Changes in one don't propagate

### Design spec (safari-approved)

**Core principle**: The engine should provide base type declarations that apps extend. One source of truth for shared shapes.

#### Shared App Types

```typescript
// libs/engine/src/lib/types/app-base.d.ts (exported from engine)
// Apps can extend these rather than redeclaring from scratch

export interface BaseLocals {
  user: GroveUser | null;
  csrfToken?: string;
  origin?: string;
}

export interface BasePlatformEnv {
  DB: D1Database;
  CACHE_KV: KVNamespace;
  AUTH: Fetcher;
  // ... common bindings all apps need
}
```

### app.d.ts fixes

- [ ] Create shared base types in engine for `App.Locals`, `App.Platform.env`
- [ ] Fix `apps/terrarium/src/app.d.ts` — populate with actual Locals shape
- [ ] Fix `apps/plant/src/app.d.ts` — add missing `tenantId`, `dbSession` types
- [ ] Fix `apps/meadow/` — add `tenantId`, `subdomain` to user type or create proper local type
- [ ] Audit all apps: every property accessed on `locals.*` must exist in the type

---

## 9. Test Mocking DX

_The jeep reaches a rocky outcrop — the testing grounds. `as any` dominates the landscape here. Not because developers are lazy, but because the D1 chain is genuinely hard to mock with proper types..._

**Character**: The indicator species. When tests need 100+ `as any` casts to mock a database, that's not a test problem — it's a design problem. The D1 interface (`prepare().bind().first()`) creates a fluent chain that's hostile to typed mocking.

### Safari findings: What exists today

**Test files** (especially `libs/engine/src/lib/server/billing.test.ts`, `services/zephyr/tests/`):

- [x] Tests exist and cover critical paths
- [x] Vitest is the test runner with good config
- [ ] **`billing.test.ts` has 100+ `as any` casts** — every mock of the `db.prepare().bind().all()` chain requires casting
- [ ] **`zephyr/tests/` has 26+ `as any` casts** — mock context, mock Resend client, mock DB all need casting
- [ ] **No shared mock builders** — each test file reinvents the mock pattern
- [ ] **Mocking the fluent chain is the root cause** — `db.prepare(sql).bind(...params).first<T>()` requires mocking 3 chained methods

### Design spec (safari-approved)

**Core principle**: If your types make testing hard, the types need to improve — not the tests.

#### Typed Mock Builders

```typescript
// libs/engine/src/lib/loom/test-utils.ts (already exported as ./loom/testing!)
// Extend with database mock builders

export function mockDb(overrides?: {
  first?: <T>(sql?: string) => T | null;
  all?: <T>(sql?: string) => { results: T[] };
}) {
  return {
    prepare: (sql: string) => ({
      bind: (..._params: unknown[]) => ({
        first: <T>() => Promise.resolve(overrides?.first?.<T>(sql) ?? null),
        all: <T>() => Promise.resolve({ results: overrides?.all?.<T>(sql) ?? [], success: true, meta: {} }),
        run: () => Promise.resolve({ success: true, meta: { changes: 1 } }),
      }),
    }),
    batch: (stmts: unknown[]) => Promise.resolve(stmts.map(() => ({ success: true, meta: {} }))),
  } satisfies Partial<D1Database> as unknown as D1Database;
}
```

### Test DX fixes

- [ ] Create `mockDb()` builder in `libs/engine/src/lib/server/services/database.test-utils.ts`
- [ ] Create `mockKV()`, `mockR2()` builders for storage mocks
- [ ] Export from `@autumnsgrove/lattice/testing` (new export path)
- [ ] Refactor billing.test.ts as proof-of-concept: replace 100+ `as any` with typed mocks
- [ ] Document mock builder pattern in engine

---

## 10. The Warden — Schema-First Exemplar

_The last stop. The jeep pulls up to the Warden's tower — and it's beautiful. Every service action has a Zod schema. Every request is validated. Every response is typed. This is what ShipTypes looks like when it's done right..._

**Character**: The proof that it works. Warden's service registry is the only part of the Grove that fully implements ShipTypes principles. Every external service action (GitHub, Stripe, Cloudflare, Resend, Exa, Tavily) has a Zod schema for params validation, a typed request builder, and structured responses.

### Safari findings: What exists today

**Warden service registry** (`workers/warden/src/services/`):

- [x] `ServiceAction` interface with `schema: z.ZodType` — every action validated
- [x] `buildRequest()` returns typed `{ url, method, headers, body }` — structured, not string soup
- [x] `AuthInjection` discriminated union — bearer, header, query, body — type-safe auth
- [x] Individual service files (`github.ts`, `stripe.ts`, `cloudflare.ts`, etc.) each define Zod schemas for their params
- [x] Global registry with `registerService()` / `getService()` — discoverable
- [x] This is the ShipTypes pattern: schema defines the contract, buildRequest implements it

### What the rest of the Grove can learn

Warden proves the pattern works in this codebase. The architecture decisions are already made. The question is: propagate outward.

### No fixes needed — this is the reference implementation

- [ ] Document Warden's pattern as the "ShipTypes reference" in AGENT.md or developer guides
- [ ] Use Warden's `ServiceAction` pattern as template for HeartwoodClient, LoomClient, etc.

---

## Expedition Summary

### By the numbers

| Metric              | Count |
| ------------------- | ----- |
| Total stops         | 10    |
| Thriving 🟢         | 2     |
| Growing 🟡          | 3     |
| Wilting 🟠          | 3     |
| Barren 🔴           | 2     |
| Total fix items     | 42    |
| Files using Zod now | 11    |
| `as any` instances  | ~230  |
| Untyped JSON.parse  | ~150  |
| Untyped fetch calls | ~200  |

### Recommended trek order

**Phase 1 — Foundation (Schema Infrastructure)**
1. Add Zod to engine dependencies (it's not there yet!)
2. Create `libs/engine/src/lib/server/schemas/` directory
3. Create `safeJsonParse()` utility
4. Create `validateRequest()` API helper

**Phase 2 — Highest-Pain Boundaries**
5. Heartwood client SDK (Stop 2) — every app benefits immediately
6. API route contracts for posts/settings (Stop 4) — most-used endpoints
7. Cache typing for Pulse (Stop 5) — eliminates the worst `as any` cluster

**Phase 3 — Deep Infrastructure**
8. Database schema registry (Stop 1) — foundational but larger scope
9. Loom typed clients (Stop 3) — requires DO changes
10. Webhook validation (Stop 6) — external boundary hardening

**Phase 4 — DX Polish**
11. Test mock builders (Stop 9) — makes everything else testable
12. Cross-app type consolidation (Stop 8) — prevents drift
13. Engine schema exports (Stop 7) — complete the circle

### Cross-cutting themes

**Theme 1: Zod is barely present.** Only 11 files import Zod. The engine doesn't even have it as a dependency. Every pattern in this journal requires Zod (or a similar runtime validator). Adding `zod` to the engine is Step 0.

**Theme 2: `JSON.parse` is the #1 type-safety killer.** 150+ untyped deserializations. A single `safeJsonParse(raw, schema)` utility would improve half the codebase.

**Theme 3: The fetch → JSON → hope pattern.** Whether it's `AUTH.fetch()`, `stub.fetch()`, or external API calls, the pattern is identical: fetch, check `.ok`, call `.json()`, hope the shape is right. A typed client pattern (like Warden's `ServiceAction`) solves it everywhere.

**Theme 4: Warden already solved it.** The pattern exists in the codebase. It works. It's clean. The task is propagation, not invention.

**Theme 5: AI agents would benefit enormously.** ShipTypes explicitly calls this out — AI coding agents work dramatically better with schemas. When Claude works on this codebase, typed contracts mean correct code on the first attempt instead of trial-and-error.

---

_The fire dies to embers. The journal is full — 10 stops, 42 fixes sketched, the whole type landscape mapped. The Warden showed us what's possible. The database, the services, the caches — they all want the same thing: schemas at the boundary, types as contracts, no more hoping the shape is right. Tomorrow, the animals go to work. But tonight? Tonight was the drive. And it was glorious._ 🚙
