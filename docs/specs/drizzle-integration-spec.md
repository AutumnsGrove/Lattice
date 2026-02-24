---
title: Drizzle ORM Integration
description: Migration from raw D1 queries to Drizzle ORM across all three Grove databases
category: specs
specCategory: core-infrastructure
icon: database
lastUpdated: "2026-02-23"
aliases: []
date created: Sunday, February 23rd 2026
date modified: Sunday, February 23rd 2026
tags:
  - database
  - drizzle
  - d1
  - engine
  - lattice
  - refactor
type: tech-spec
---

# Drizzle: The Aquifer

> *Rain that seeped through stone for years, finally mapped and channeled.*

```
          ~  ~  ~  rain  ~  ~  ~
          ·  ·  ·  ·  ·  ·  ·  ·
     ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ soil
        ░░░░░░░░░░░░░░░░░░░░░░░░░░░
        ░ ┌─────┐  ┌─────┐  ┌─────┐░
        ░ │ DB  │══│CURIO│══│ OBS │░
        ░ │·····│  │·····│  │·····│░
        ░ │typed│  │typed│  │typed│░
        ░ └──┬──┘  └──┬──┘  └──┬──┘░
        ░░░░░│░░░░░░░░│░░░░░░░░│░░░░
     ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ bedrock
             └────────┼────────┘
                   schema
              one source of truth

     The water was always there.
       Now we know where it flows.
```

> _Rain that seeped through stone for years, finally mapped and channeled._

**Internal Name:** Drizzle Integration (Aquifer)
**Affects:** `@autumnsgrove/lattice` (services, server SDK)
**Schema Location:** `libs/engine/src/lib/server/db/schema/`
**Last Updated:** February 2026

An aquifer is water held in stone. It's been there all along, flowing through cracks and pores, feeding wells and springs. You just couldn't see it until someone mapped the geology.

Grove's data has flowed through raw D1 queries for months. `TenantDb` and CRUD helpers give us multi-tenant isolation, safety guards, and clean abstractions. What they don't give us is shape. Every `queryOne<T>()` call trusts the developer to get `T` right. Every column name is a string. Every table name is a string.

Drizzle maps the aquifer. The TypeScript compiler sees every channel, every column, every table. Same water, same stone. Now we know where it flows.

---

## Overview

### What This Is

Drizzle ORM is a TypeScript-first query builder that generates plain SQL. No runtime engine, no magic, no abstraction over SQL. It's ideal for Cloudflare Workers where bundle size and cold starts matter. This integration brings Drizzle into Grove's existing database layer, giving us compile-time safety for every query across all three D1 databases.

### Goals

- **Type safety end-to-end.** Query results typed from schema, not from `as T` assertions.
- **Incremental adoption.** No big-bang migration. Raw D1 and Drizzle coexist.
- **Zero runtime overhead.** Drizzle generates the same SQL we write by hand.
- **Schema as source of truth.** One TypeScript file per database, from which types, queries, and migrations all flow.
- **Preserve tenant isolation.** The `TenantDb` pattern stays. It just gets typed.

### Non-Goals (Out of Scope)

- Rewriting all existing queries at once.
- Changing the migration workflow (we still apply `.sql` files via Wrangler).
- Adding Drizzle Studio or any dev-time GUI.
- Modifying the database-safety layer (it wraps Drizzle the same way it wraps raw D1).

---

## Architecture

### How Drizzle Fits Into the Stack

```
 SvelteKit Route / Worker Handler
        │
        ▼
 ┌─────────────────────────────────────────────┐
 │  Service Layer (existing)                    │
 │  users.ts, reeds.ts, storage.ts, etc.       │
 │                                              │
 │  Calls either:                               │
 │    ① db.queryOne<T>(sql, params)   ← raw    │
 │    ② db.select().from(table)       ← drizzle│
 └──────────────┬──────────────────────────────┘
                │
                ▼
 ┌─────────────────────────────────────────────┐
 │  Database Module (new)                       │
 │  libs/engine/src/lib/server/db/              │
 │                                              │
 │  ┌──────────┐  ┌───────────┐  ┌──────────┐  │
 │  │ client.ts│  │ schema/   │  │ helpers.ts│  │
 │  │          │  │ engine.ts │  │           │  │
 │  │ createDb │  │ curios.ts │  │ scoped()  │  │
 │  │ createCu │  │ obs.ts    │  │ tenant()  │  │
 │  │ createObs│  │ index.ts  │  │           │  │
 │  └──────────┘  └───────────┘  └──────────┘  │
 └──────────────┬──────────────────────────────┘
                │
                ▼
 ┌─────────────────────────────────────────────┐
 │  D1 Bindings (Cloudflare Workers)            │
 │                                              │
 │  env.DB        env.CURIO_DB    env.OBS_DB    │
 │  (engine)      (curios)        (observability)│
 └─────────────────────────────────────────────┘
```

### File Layout

```
libs/engine/src/lib/server/db/
├── schema/
│   ├── engine.ts        ← ~60 engine DB tables
│   ├── curios.ts        ← 45 curio widget tables
│   ├── observability.ts ← 10 observability tables
│   └── index.ts         ← re-exports all + InferSelectModel
├── client.ts            ← createDb(), createCurioDb(), createObsDb()
├── helpers.ts           ← tenant-scoped Drizzle query helpers
├── types.ts             ← inferred types (Tenant, Post, User, etc.)
└── index.ts             ← public API barrel
```

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| ORM | Drizzle ORM (`drizzle-orm`) | TypeScript-first, zero runtime, plain SQL output |
| D1 Adapter | `drizzle-orm/d1` | Built-in Cloudflare D1 support |
| Migration Tool | Drizzle Kit (`drizzle-kit`) | Schema diffing, SQL generation |
| Database | Cloudflare D1 (SQLite) | Existing infrastructure, three databases |
| Framework | SvelteKit on Cloudflare Workers | Existing stack |

---

## Client Initialization

### Per-Database Drizzle Clients

Each D1 binding gets its own Drizzle client. The client wraps the raw D1 binding and attaches the schema for full type inference on relational queries.

**`libs/engine/src/lib/server/db/client.ts`:**

```typescript
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import * as engineSchema from './schema/engine.js';
import * as curiosSchema from './schema/curios.js';
import * as obsSchema from './schema/observability.js';

// ── Engine DB (env.DB) ──────────────────────────────────────────────
export type EngineDb = DrizzleD1Database<typeof engineSchema>;

export function createDb(d1: D1Database): EngineDb {
  return drizzle(d1, { schema: engineSchema });
}

// ── Curios DB (env.CURIO_DB) ────────────────────────────────────────
export type CurioDb = DrizzleD1Database<typeof curiosSchema>;

export function createCurioDb(d1: D1Database): CurioDb {
  return drizzle(d1, { schema: curiosSchema });
}

// ── Observability DB (env.OBS_DB) ───────────────────────────────────
export type ObsDb = DrizzleD1Database<typeof obsSchema>;

export function createObsDb(d1: D1Database): ObsDb {
  return drizzle(d1, { schema: obsSchema });
}
```

### Usage in SvelteKit Hooks

```typescript
// In hooks.server.ts or a load function:
import { createDb, createCurioDb } from '@autumnsgrove/lattice/db';

const db = createDb(platform.env.DB);
const curioDb = createCurioDb(platform.env.CURIO_DB);
```

### Caching the Client

Drizzle clients are lightweight. Creating one per request is fine. No connection pooling needed for D1.

---

## Tenant-Scoped Query Helpers

### The Problem

Every query against tenant-scoped tables must include `WHERE tenant_id = ?`. Forgetting this is a data leak. The current `TenantDb` wrapper solves this by injecting `tenant_id` automatically. Drizzle needs the same pattern.

### The Solution: `scopedDb()`

**`libs/engine/src/lib/server/db/helpers.ts`:**

```typescript
import { eq, and, desc, asc, type SQL } from 'drizzle-orm';
import { tenants, posts, pages, media, sessions } from './schema/engine.js';
import type { EngineDb } from './client.js';

/**
 * Creates a tenant-scoped query context for Drizzle.
 * All queries automatically filter by tenant_id.
 */
export function scopedDb(db: EngineDb, tenantId: string) {
  return {
    // ── Posts ──────────────────────────────────────────────────
    posts: {
      findBySlug: (slug: string) =>
        db.select()
          .from(posts)
          .where(and(eq(posts.tenantId, tenantId), eq(posts.slug, slug)))
          .get(),

      listPublished: () =>
        db.select()
          .from(posts)
          .where(and(
            eq(posts.tenantId, tenantId),
            eq(posts.status, 'published')
          ))
          .orderBy(desc(posts.publishedAt)),

      listAll: () =>
        db.select()
          .from(posts)
          .where(eq(posts.tenantId, tenantId))
          .orderBy(desc(posts.createdAt)),

      create: (data: typeof posts.$inferInsert) =>
        db.insert(posts).values({ ...data, tenantId }),

      updateBySlug: (slug: string, data: Partial<typeof posts.$inferInsert>) =>
        db.update(posts)
          .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
          .where(and(eq(posts.tenantId, tenantId), eq(posts.slug, slug))),

      deleteBySlug: (slug: string) =>
        db.delete(posts)
          .where(and(eq(posts.tenantId, tenantId), eq(posts.slug, slug))),
    },

    // ── Pages ─────────────────────────────────────────────────
    pages: {
      findBySlug: (slug: string) =>
        db.select()
          .from(pages)
          .where(and(eq(pages.tenantId, tenantId), eq(pages.slug, slug)))
          .get(),

      listAll: () =>
        db.select()
          .from(pages)
          .where(eq(pages.tenantId, tenantId))
          .orderBy(asc(pages.slug)),
    },

    // ── Media ─────────────────────────────────────────────────
    media: {
      listAll: () =>
        db.select()
          .from(media)
          .where(eq(media.tenantId, tenantId))
          .orderBy(desc(media.uploadedAt)),
    },

    // Pattern continues for sessions, comments, etc.
  };
}
```

### Comparison: Before and After

**Before (raw D1):**

```typescript
const tenantDb = getTenantDb(platform.env.DB, { tenantId: locals.tenantId });

const post = await tenantDb.queryOne<PostRecord>(
  "posts",
  "slug = ?",
  [slug]
);
// PostRecord is manually defined. Column names are strings.
// A typo in "slug" is a runtime error.
```

**After (Drizzle):**

```typescript
const db = createDb(platform.env.DB);
const tenant = scopedDb(db, locals.tenantId);

const post = await tenant.posts.findBySlug(slug);
// Return type is inferred from the schema.
// Column names are checked at compile time.
// tenant_id is always included.
```

### Coexistence with TenantDb

During migration, both patterns coexist:

```typescript
// New code uses Drizzle:
const post = await tenant.posts.findBySlug(slug);

// Old code still works with TenantDb:
const oldPost = await tenantDb.queryOne<PostRecord>("posts", "slug = ?", [slug]);
```

No route needs to migrate all at once. A single file can use both.

---

## Type Inference

### Schema-Derived Types

Types flow directly from the schema definition. No separate interface files to maintain.

**`libs/engine/src/lib/server/db/types.ts`:**

```typescript
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import {
  tenants, users, posts, pages, media, sessions,
  platformBilling, featureFlags, comments, meadowPosts,
  userOnboarding, themeSettings,
} from './schema/engine.js';

// ── Select Types (what you get back from queries) ───────────────
export type Tenant = InferSelectModel<typeof tenants>;
export type User = InferSelectModel<typeof users>;
export type Post = InferSelectModel<typeof posts>;
export type Page = InferSelectModel<typeof pages>;
export type Media = InferSelectModel<typeof media>;
export type Session = InferSelectModel<typeof sessions>;
export type PlatformBilling = InferSelectModel<typeof platformBilling>;
export type FeatureFlag = InferSelectModel<typeof featureFlags>;
export type Comment = InferSelectModel<typeof comments>;
export type MeadowPost = InferSelectModel<typeof meadowPosts>;
export type UserOnboarding = InferSelectModel<typeof userOnboarding>;
export type ThemeSettings = InferSelectModel<typeof themeSettings>;

// ── Insert Types (what you provide when creating) ───────────────
export type NewTenant = InferInsertModel<typeof tenants>;
export type NewPost = InferInsertModel<typeof posts>;
export type NewPage = InferInsertModel<typeof pages>;
export type NewMedia = InferInsertModel<typeof media>;
export type NewComment = InferInsertModel<typeof comments>;
export type NewMeadowPost = InferInsertModel<typeof meadowPosts>;

// Curio types can be generated on demand from curios.ts
// Observability types are internal to vista collectors
```

### Where Types Flow

```
  schema/engine.ts
        │
        ├──→ types.ts (Tenant, Post, User, etc.)
        │        │
        │        ├──→ API response types
        │        ├──→ Svelte component props
        │        └──→ Service function signatures
        │
        ├──→ helpers.ts (scopedDb return types are inferred)
        │
        └──→ client.ts (DrizzleD1Database<typeof schema>)
```

When a column is added to a migration and the schema file is updated, every query, every component prop, and every API response type updates automatically. No manual synchronization.

---

## Migration Strategy

### Guiding Principle

**Incremental, not big-bang.** Drizzle and raw D1 coexist. Routes migrate one at a time. Tests keep passing at every step.

### Phase 1: Foundation (This PR)

- [x] Create Drizzle schema files matching current DB state
- [ ] Install `drizzle-orm` and `drizzle-kit`
- [ ] Create `client.ts` with per-database factory functions
- [ ] Create `types.ts` with core type exports
- [ ] Create `helpers.ts` with `scopedDb()` pattern
- [ ] Create `index.ts` barrel with public API
- [ ] Add `@autumnsgrove/lattice/db` export path to `package.json`
- [ ] Add `drizzle.config.ts` at project root
- [ ] Write tests for `scopedDb()` against a mock D1

### Phase 2: Pilot Routes

Pick 3-5 routes with simple CRUD patterns and convert them:

- [ ] `GET /api/blooms` (list published posts)
- [ ] `GET /api/blooms/[slug]` (single post by slug)
- [ ] `GET /api/pages/[slug]` (single page)
- [ ] `POST /api/blooms` (create post)
- [ ] `PATCH /api/blooms/[slug]` (update post)

Each route conversion:
1. Import `createDb` and `scopedDb` alongside existing `getTenantDb`.
2. Replace one query at a time.
3. Remove the old query import when all usages are gone.
4. Run tests after each replacement.

### Phase 3: Service Layer Migration

Move service functions from raw D1 to Drizzle:

- [ ] `users.ts` — `getUserByGroveAuthId`, `getUserById`, etc.
- [ ] `reeds.ts` — Comment CRUD operations
- [ ] `messages.ts` — `loadChannelMessages`
- [ ] `storage.ts` — Media record operations (R2 operations stay unchanged)

### Phase 4: Full Coverage

- [ ] Convert remaining routes across all apps
- [ ] Convert curio endpoints to use `createCurioDb()`
- [ ] Convert vista/sentinel to use `createObsDb()`
- [ ] Deprecate raw `queryOne`/`queryMany` from public exports
- [ ] Remove manual type definitions that Drizzle now infers

### Phase 5: Migration Generation

Once all queries go through Drizzle, enable Drizzle Kit for future schema changes:

- [ ] Verify `drizzle-kit generate` produces correct diffs
- [ ] Add `drizzle-kit generate` to the development workflow
- [ ] Update AGENT.md with new migration instructions

---

## Drizzle Kit Configuration

Drizzle Kit diffs the schema files and generates SQL migration files. It does not run them. Wrangler still applies migrations to D1.

**`drizzle.config.ts`** (project root):

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Engine DB is the primary migration target.
  // Curios and Observability have their own config files if needed.
  schema: './libs/engine/src/lib/server/db/schema/engine.ts',
  out: './libs/engine/migrations',
  dialect: 'sqlite',
});
```

### Workflow

```
 1. Edit schema/engine.ts (add column, new table, etc.)
        │
        ▼
 2. npx drizzle-kit generate
        │
        ▼
 3. Review generated .sql in libs/engine/migrations/
        │
        ▼
 4. wrangler d1 migrations apply grove-engine-db --remote
        │
        ▼
 5. Commit schema change + migration together
```

### Important: Existing Migrations Stay

The 88 existing engine migrations are untouched. Drizzle Kit picks up numbering from where they left off. The schema files were written to match the current DB state, so the first `drizzle-kit generate` after setup should produce an empty diff.

---

## Package Exports

### New Export Path

Add to `libs/engine/package.json`:

```json
{
  "exports": {
    "./db": {
      "types": "./dist/server/db/index.d.ts",
      "default": "./dist/server/db/index.js"
    },
    "./db/schema": {
      "types": "./dist/server/db/schema/index.d.ts",
      "default": "./dist/server/db/schema/index.js"
    },
    "./db/schema/*": {
      "types": "./dist/server/db/schema/*.d.ts",
      "default": "./dist/server/db/schema/*.js"
    }
  }
}
```

### Public API Surface

**`libs/engine/src/lib/server/db/index.ts`:**

```typescript
// ── Client Factories ────────────────────────────────────────────
export { createDb, createCurioDb, createObsDb } from './client.js';
export type { EngineDb, CurioDb, ObsDb } from './client.js';

// ── Tenant-Scoped Helpers ───────────────────────────────────────
export { scopedDb } from './helpers.js';

// ── Types ───────────────────────────────────────────────────────
export type {
  Tenant, User, Post, Page, Media, Session,
  NewTenant, NewPost, NewPage, NewMedia,
  PlatformBilling, FeatureFlag, Comment, MeadowPost,
} from './types.js';

// ── Schema (for advanced queries and Drizzle Kit) ───────────────
// Individual schemas available via @autumnsgrove/lattice/db/schema
export * as engineSchema from './schema/engine.js';
export * as curiosSchema from './schema/curios.js';
export * as obsSchema from './schema/observability.js';

// ── Re-export Drizzle utilities for consumers ───────────────────
export { eq, and, or, not, desc, asc, sql, like, between, isNull, isNotNull, inArray } from 'drizzle-orm';
```

### Usage from Consumer Apps

```typescript
// Full typed database access:
import { createDb, scopedDb, eq, desc } from '@autumnsgrove/lattice/db';
import { posts } from '@autumnsgrove/lattice/db/schema';

// Type-only import:
import type { Post, NewPost } from '@autumnsgrove/lattice/db';
```

---

## Integration with Existing Services

### services/database.ts Stays

The existing database service (`queryOne`, `queryMany`, `insert`, `TenantDb`, etc.) is not removed. It continues to work for all existing code. The new Drizzle module is an alternative path, not a replacement.

```
  @autumnsgrove/lattice/services   ← existing raw D1 path
  @autumnsgrove/lattice/db         ← new Drizzle path
```

Over time, as routes migrate, the raw D1 helpers will see less usage. They can be deprecated in a future release once coverage is high enough.

### services/index.ts Updates

Add the Drizzle module alongside existing database exports:

```typescript
// ============================================================================
// Drizzle ORM (Typed Database Layer)
// ============================================================================

export * as drizzle from "../db/index.js";
export {
  createDb,
  createCurioDb,
  createObsDb,
  scopedDb,
} from "../db/index.js";
```

### Database Safety Layer

The safety layer (`database-safety.ts`) currently wraps raw D1. For Drizzle queries, safety enforcement happens at the `scopedDb` level, the tenant scope is baked into every helper. For agent-safe contexts, the existing `withAgentSafetyGuards()` continues to work on the raw D1 binding.

Future work may add a Drizzle-aware safety wrapper, but this is out of scope for the initial integration.

---

## Security Considerations

### Tenant Isolation (Non-Negotiable)

- The `scopedDb()` helper injects `tenant_id` into every `WHERE` clause.
- Direct Drizzle queries (bypassing `scopedDb`) are allowed for platform-wide operations like admin dashboards, but must be used intentionally.
- Code review should flag any `db.select().from(posts)` without a `tenant_id` filter.

### SQL Injection

Drizzle uses parameterized queries internally. All values pass through `?` placeholders. Column and table names come from the schema definition, not user input. The injection surface is effectively zero.

### Schema Drift

The schema files must match the actual D1 state. If a migration is applied without updating the schema, queries may fail or return wrong types. The Drizzle Kit `generate` step catches drift by comparing schema to migration history.

### Sensitive Data

Drizzle does not change what data is stored or how it's encrypted. The `tenant_secrets` table still uses application-level encryption. Petal and Thorn moderation tables still store hashes, never content.

---

## Requirements

| ID | Pattern | Requirement | Priority |
|----|---------|-------------|----------|
| DRZ-001 | Ubiquitous | The schema files shall match the current D1 database state exactly | Must Have |
| DRZ-002 | Ubiquitous | Every tenant-scoped Drizzle query shall include a `tenant_id` filter | Must Have |
| DRZ-003 | Event-Driven | When a schema file is modified, Drizzle Kit shall generate a corresponding migration | Should Have |
| DRZ-004 | Ubiquitous | Raw D1 queries and Drizzle queries shall coexist without conflict | Must Have |
| DRZ-005 | Ubiquitous | The `drizzle-orm` package shall be a runtime dependency, `drizzle-kit` a dev dependency | Must Have |
| DRZ-006 | State-Driven | While Drizzle and raw D1 coexist, no route shall be required to use one or the other | Should Have |
| DRZ-007 | Event-Driven | When a query is converted to Drizzle, its return type shall be inferred from the schema | Must Have |
| DRZ-008 | Unwanted | If a schema file drifts from the D1 state, `drizzle-kit generate` shall produce a non-empty diff | Should Have |

---

## Implementation Checklist

### Phase 1: Foundation

- [x] Create `schema/engine.ts` (60+ tables)
- [x] Create `schema/curios.ts` (45 tables)
- [x] Create `schema/observability.ts` (10 tables)
- [x] Create `schema/index.ts` (barrel)
- [ ] `npm install drizzle-orm && npm install -D drizzle-kit`
- [ ] Create `db/client.ts` with `createDb()`, `createCurioDb()`, `createObsDb()`
- [ ] Create `db/types.ts` with `InferSelectModel` exports
- [ ] Create `db/helpers.ts` with `scopedDb()` pattern
- [ ] Create `db/index.ts` barrel
- [ ] Add `./db` and `./db/schema` export paths to `package.json`
- [ ] Create `drizzle.config.ts` at project root
- [ ] Verify `drizzle-kit generate` produces empty diff (schema matches DB)
- [ ] Write unit tests for `scopedDb()` helpers

### Phase 2: Pilot Conversion

- [ ] Convert `/api/blooms` (GET) to Drizzle
- [ ] Convert `/api/blooms/[slug]` (GET) to Drizzle
- [ ] Convert `/api/pages/[slug]` (GET) to Drizzle
- [ ] Convert `/api/blooms` (POST) to Drizzle
- [ ] Convert `/api/blooms/[slug]` (PATCH) to Drizzle
- [ ] Confirm all existing tests pass after each conversion

### Phase 3: Service Layer

- [ ] Migrate `users.ts` query functions
- [ ] Migrate `reeds.ts` comment operations
- [ ] Migrate `messages.ts` message loading
- [ ] Update `services/index.ts` with Drizzle exports

### Phase 4+: Ongoing

- [ ] Convert remaining routes as they're touched
- [ ] Convert curio endpoints
- [ ] Convert observability endpoints
- [ ] Deprecate raw query helpers when coverage is sufficient

---

*The aquifer doesn't replace the wells. It just means you know exactly where to dig.*
