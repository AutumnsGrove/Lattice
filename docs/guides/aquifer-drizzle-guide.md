# The Aquifer: Typed Database Queries with Drizzle

> A developer guide for using Drizzle ORM in Grove.

---

## Quick Reference

| Term | Meaning |
| ---- | ------- |
| **Aquifer** | Grove's Drizzle ORM integration (from geology: water held in stone) |
| **Schema** | TypeScript table definitions that mirror the D1 database state |
| **`createDb()`** | Factory that wraps a D1 binding with Drizzle's typed query builder |
| **`scopedDb()`** | Tenant-scoped helper that injects `tenant_id` into every query |
| **`TenantDb`** | The existing raw D1 tenant wrapper (still works, coexists with Drizzle) |

---

## What Is This?

Grove has three D1 databases with over 115 tables. Until now, every query was raw SQL with manually defined TypeScript types. A typo in a column name was a runtime error. A missing `WHERE tenant_id = ?` was a data leak.

The Aquifer maps all three databases into TypeScript schema files. Drizzle reads those schemas and gives you typed queries where column names, table names, and return types are all checked at compile time. Same SQL output, same D1 underneath. The compiler just sees the shape now.

```
  @autumnsgrove/lattice/services   ← existing raw D1 path (still works)
  @autumnsgrove/lattice/db         ← Drizzle path (preferred for new code)
```

Both paths work in the same file. No route needs to choose one or the other.

---

## Getting Started

### Create a Drizzle Client

Each D1 binding gets its own client. Pass the raw binding, get back a typed query builder.

```typescript
import { createDb, createCurioDb, createObsDb } from "@autumnsgrove/lattice/db";

const db = createDb(platform.env.DB);           // Engine: tenants, posts, users, billing
const curioDb = createCurioDb(platform.env.CURIO_DB);  // Curios: timeline, gallery, guestbook
const obsDb = createObsDb(platform.env.OBS_DB);        // Observability: sentinel, vista
```

Drizzle clients are lightweight. Creating one per request is fine. No connection pooling needed for D1.

### Tenant-Scoped Queries

Most routes work with a single tenant. `scopedDb()` wraps the Drizzle client so every query automatically includes `WHERE tenant_id = ?`. You never forget it because you never type it.

```typescript
import { createDb, scopedDb } from "@autumnsgrove/lattice/db";

const db = createDb(platform.env.DB);
const tenant = scopedDb(db, locals.tenantId);

// Every method here filters by tenant_id automatically
const post = await tenant.posts.findBySlug("hello-world");
const published = await tenant.posts.listPublished();
const allPages = await tenant.pages.listAll();
```

### Available Scoped Methods

**Posts:** `findBySlug`, `findById`, `listPublished`, `listAll`, `create`, `updateBySlug`, `deleteBySlug`

**Pages:** `findBySlug`, `findById`, `listAll`, `create`, `updateBySlug`, `deleteBySlug`

**Media:** `findById`, `listAll`, `create`, `deleteById`

More scoped methods will be added as routes migrate to Drizzle.

### Direct Queries

For platform-wide operations (admin dashboards, migrations, cron jobs), use the Drizzle client directly. Import table definitions from the schema.

```typescript
import { createDb, eq, desc } from "@autumnsgrove/lattice/db";
import { posts, tenants } from "@autumnsgrove/lattice/db/schema";

const db = createDb(platform.env.DB);

// Direct query (no tenant scoping, use intentionally)
const recentPosts = await db
  .select()
  .from(posts)
  .where(eq(posts.status, "published"))
  .orderBy(desc(posts.publishedAt))
  .limit(20);

// Join across tables
const postWithTenant = await db
  .select()
  .from(posts)
  .innerJoin(tenants, eq(posts.tenantId, tenants.id))
  .where(eq(posts.slug, "hello-world"))
  .get();
```

> **Warning:** Direct queries without `tenant_id` filtering should only appear in platform-level code. Code review should flag any unscoped query against tenant data.

---

## Types

Types are inferred from the schema. No separate interface files to maintain.

```typescript
import type { Post, NewPost, Tenant, User } from "@autumnsgrove/lattice/db";

// Post is what you get back from a query
function renderPost(post: Post) {
  console.log(post.title, post.slug, post.status);
}

// NewPost is what you provide when inserting
const draft: NewPost = {
  id: crypto.randomUUID(),
  tenantId: locals.tenantId,
  title: "Hello World",
  slug: "hello-world",
  content: "# Welcome",
  status: "draft",
  createdAt: Math.floor(Date.now() / 1000),
  updatedAt: Math.floor(Date.now() / 1000),
};
```

When a column changes in the schema file, the types update everywhere. No manual synchronization.

---

## Schema Files

The source of truth lives at `libs/engine/src/lib/server/db/schema/`:

| File | Database | Tables |
| ---- | -------- | ------ |
| `engine.ts` | `grove-engine-db` (env.DB) | ~60 tables |
| `curios.ts` | `grove-curios-db` (env.CURIO_DB) | 45 tables |
| `observability.ts` | `grove-observability-db` (env.OBS_DB) | 10 tables |
| `index.ts` | All three | Re-exports everything |

Import individual tables from the schema:

```typescript
import { posts, tenants, sessions } from "@autumnsgrove/lattice/db/schema";
import { timelineCurioConfig } from "@autumnsgrove/lattice/db/schema/curios";
import { observabilityMetrics } from "@autumnsgrove/lattice/db/schema/observability";
```

Or import the full schema namespace for the Drizzle client:

```typescript
import * as engineSchema from "@autumnsgrove/lattice/db/schema/engine";
```

---

## Coexistence with Raw D1

Both patterns work side by side. A single file can use both.

```typescript
// New code uses Drizzle
const post = await tenant.posts.findBySlug(slug);

// Old code still works with TenantDb
const tenantDb = getTenantDb(platform.env.DB, { tenantId: locals.tenantId });
const oldPost = await tenantDb.queryOne<PostRecord>("posts", "slug = ?", [slug]);
```

No route needs to migrate all at once. Convert one query at a time, run tests after each change. The existing `queryOne`, `queryMany`, `insert`, `TenantDb`, and all other raw D1 helpers continue to work.

---

## Package Exports

| Import Path | What You Get |
| ----------- | ------------ |
| `@autumnsgrove/lattice/db` | Client factories, `scopedDb`, types, Drizzle utilities (`eq`, `and`, `desc`, etc.) |
| `@autumnsgrove/lattice/db/schema` | All table definitions from all 3 databases |
| `@autumnsgrove/lattice/db/schema/engine` | Engine tables only |
| `@autumnsgrove/lattice/db/schema/curios` | Curio tables only |
| `@autumnsgrove/lattice/db/schema/observability` | Observability tables only |
| `@autumnsgrove/lattice/services` | Both raw D1 (`db.*`) and Drizzle (`drizzle.*`) exports |

---

## Adding a New Table

When you add a new migration:

1. Write the `.sql` migration as usual
2. Add the matching table definition to the schema file (`engine.ts`, `curios.ts`, or `observability.ts`)
3. If you want types, add `InferSelectModel` / `InferInsertModel` exports to `types.ts`
4. If you want scoped methods, add them to `helpers.ts`
5. Commit the schema change and migration together

The schema file must match the actual D1 state. If they drift, queries may fail or return wrong types.

---

## Related Documents

| Document | What It Covers |
| -------- | -------------- |
| `docs/specs/drizzle-integration-spec.md` | Full technical spec with architecture diagrams, migration phases, security considerations |
| `libs/engine/src/lib/server/services/database.ts` | Existing raw D1 helpers (`queryOne`, `TenantDb`, etc.) |
| `AGENT.md` > Database Query Patterns | Quick reference for both raw D1 and Drizzle paths |

---

*The water was always there. Now we know where it flows.*
