# Code Standards

> Extracted from `AGENT.md` — the authoritative reference for Grove's coding patterns and conventions.

---

## Engine-First Pattern (CRITICAL)

> **The engine exists to prevent duplication. USE IT.**

**Before implementing ANY utility, component, or pattern in an app:**

```
1. CHECK: Does the engine already have this?
   └── YES → Import from @autumnsgrove/lattice
   └── NO  → Continue to step 2

2. IMPLEMENT: Add it to the engine FIRST
   └── libs/engine/src/lib/...

3. IMPORT: Then use it from the engine in your app
   └── import { thing } from '@autumnsgrove/lattice/...'
```

### What the Engine Provides

| Category              | Import Path                           | Examples                     |
| --------------------- | ------------------------------------- | ---------------------------- |
| **UI Components**     | `@autumnsgrove/lattice/ui/chrome`     | Header, Footer, Logo         |
| **UI Utilities**      | `@autumnsgrove/lattice/ui/utils`      | `cn()` (with tailwind-merge) |
| **Stores**            | `@autumnsgrove/lattice/ui/stores`     | `seasonStore`, `themeStore`  |
| **Nature Components** | `@autumnsgrove/lattice/ui/nature`     | Trees, creatures, palette    |
| **Glass UI**          | `@autumnsgrove/lattice/ui`            | GlassCard, GlassButton       |
| **General Utils**     | `@autumnsgrove/lattice/utils`         | csrf, sanitize, markdown     |
| **Content**           | `@autumnsgrove/lattice/ui/content`    | ContentWithGutter, TOC       |
| **Forms**             | `@autumnsgrove/lattice/ui/forms`      | Form components              |
| **Gallery**           | `@autumnsgrove/lattice/ui/gallery`    | Image galleries              |
| **Charts**            | `@autumnsgrove/lattice/ui/charts`     | Data visualization           |
| **Icons**             | `@autumnsgrove/prism/icons`           | Icon gateway (ALL icons)     |
| **Typography**        | `@autumnsgrove/lattice/ui/typography` | Text components              |
| **Auth**              | `@autumnsgrove/lattice/auth`          | Authentication utilities     |
| **Errors**            | `@autumnsgrove/lattice/errors`        | Signpost error codes         |
| **Type Safety**       | `@autumnsgrove/lattice/server`        | Rootwork boundary utilities  |
| **Infrastructure**    | `@autumnsgrove/lattice/infra`         | Infra SDK (DB, Storage, KV)  |

### Common Violations (Don't Do These)

```typescript
// ❌ BAD - Creating local utilities
export function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

// ✅ GOOD - Import from engine
import { cn } from "@autumnsgrove/lattice/ui/utils";
```

### Icons — Prism Gateway (CRITICAL)

**ALL icons go through `@autumnsgrove/prism/icons`.** This is enforced by pre-commit hook.

```svelte
<!-- ✅ CORRECT — Prism dotted access -->
<script>
  import { stateIcons, navIcons, natureIcons } from '@autumnsgrove/prism/icons';
</script>
<stateIcons.check class="w-5 h-5" />
<navIcons.arrowRight class="w-4 h-4" />

<!-- ❌ WRONG — bare Lucide import (blocked by pre-commit) -->
import { Check } from '@lucide/svelte';

<!-- ❌ WRONG — individual named imports from engine barrel -->
import { Check, ArrowRight } from '@autumnsgrove/lattice/ui/icons';

<!-- ❌ WRONG — svelte:component (Svelte 4 pattern) -->
<svelte:component this={stateIcons.check} />
```

**12 semantic groups:** `navIcons`, `stateIcons`, `natureIcons`, `seasonIcons`, `actionIcons`, `featureIcons`, `authIcons`, `metricIcons`, `phaseIcons`, `toolIcons`, `blazeIcons`, `chromeIcons`

**Lookup utilities:** `resolveAnyIcon(name, fallback)` — resolves by alias OR Lucide name (case-insensitive)

**Manifest:** `libs/prism/src/lib/icons/manifest.ts` — the SSOT for all icon identity. To add an icon: one line here.

**Adapter:** `libs/prism/src/lib/icons/adapters/lucide.ts` — the ONE file importing from `@lucide/svelte`. Swapping icon packs = changing this file.

### Quick Engine Export Check

```bash
cat libs/engine/package.json | grep -A2 '"\./'
```

---

## Code Style

### Function & Variable Naming

- Use meaningful, descriptive names
- Keep functions small and focused on single responsibilities

### Error Handling (Signpost Standard)

**MANDATORY: Every error MUST use a Signpost error code.** Bare `throw new Error()` is not acceptable.

**Import:**

```typescript
import {
	API_ERRORS,
	ARBOR_ERRORS,
	SITE_ERRORS,
	throwGroveError,
	logGroveError,
	buildErrorJson,
	buildErrorUrl,
} from "@autumnsgrove/lattice/errors";
```

**Which Helper Where:**

| Context                        | Helper              | Example                                                                    |
| ------------------------------ | ------------------- | -------------------------------------------------------------------------- |
| API routes (`+server.ts`)      | `buildErrorJson()`  | `return json(buildErrorJson(API_ERRORS.UNAUTHORIZED), { status: 401 })`    |
| Page loads (`+page.server.ts`) | `throwGroveError()` | `throwGroveError(404, SITE_ERRORS.POST_NOT_FOUND, 'Engine')`               |
| Auth redirects                 | `buildErrorUrl()`   | `redirect(302, buildErrorUrl(AUTH_ERRORS.SESSION_EXPIRED, '/login'))`      |
| Any server context             | `logGroveError()`   | `logGroveError('Engine', API_ERRORS.INTERNAL_ERROR, { path, cause: err })` |

**Error Catalogs:**

| Catalog        | Prefix            | Import                            |
| -------------- | ----------------- | --------------------------------- |
| `API_ERRORS`   | `GROVE-API-XXX`   | `@autumnsgrove/lattice/errors`    |
| `ARBOR_ERRORS` | `GROVE-ARBOR-XXX` | `@autumnsgrove/lattice/errors`    |
| `SITE_ERRORS`  | `GROVE-SITE-XXX`  | `@autumnsgrove/lattice/errors`    |
| `AUTH_ERRORS`  | `HW-AUTH-XXX`     | `@autumnsgrove/lattice/heartwood` |
| `SRV_ERRORS`   | `SRV-XXX`         | `@autumnsgrove/infra`             |
| `PLANT_ERRORS` | `PLANT-XXX`       | `apps/plant/src/lib/errors.ts`    |

**Client-Side Feedback (Toast):**

```typescript
import { toast } from "@autumnsgrove/lattice/ui";

toast.success("Post published!");
toast.error(err instanceof Error ? err.message : "Something went wrong");
toast.promise(apiRequest("/api/export", { method: "POST" }), {
	loading: "Exporting...",
	success: "Export complete!",
	error: "Export failed.",
});
```

**When NOT to use toast:** form validation errors (use `fail()` + inline), page load failures (`+error.svelte`), persistent notices (use GroveMessages)

### Type Safety at Boundaries (Rootwork)

**MANDATORY: No `as` casts at trust boundaries.** Use Rootwork utilities for form data, KV reads, caught exceptions, and webhook payloads.

```typescript
import {
	parseFormData,
	safeJsonParse,
	isRedirect,
	isHttpError,
} from "@autumnsgrove/lattice/server";
```

| Boundary               | Utility                                |
| ---------------------- | -------------------------------------- |
| `request.formData()`   | `parseFormData(formData, ZodSchema)`   |
| KV / JSON strings      | `safeJsonParse(raw, ZodSchema)`        |
| SvelteKit catch blocks | `isRedirect(err)` / `isHttpError(err)` |

### File Organization

- Group related functionality into modules
- Import ordering: standard library → third-party → local imports
- Keep configuration separate from logic

### Database Query Patterns (Multi-DB)

**Choose the right binding** — see `ARCHITECTURE.md` for the D1 database layout.

```typescript
// Standard curio route — single binding
const db = platform?.env?.CURIO_DB;
if (!db) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");

// Cross-DB route (e.g., timeline generate) — dual binding
const db = platform?.env?.DB; // Core: SecretsManager, tenants
const curioDb = platform?.env?.CURIO_DB; // Curios: timeline_*, gallery_*, etc.
if (!db || !curioDb) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
```

**Isolate independent queries** — never put multiple in the same try/catch:

```typescript
// ❌ BAD - one failure blocks all
try {
	const settings = await db.prepare("SELECT * FROM settings").all();
	const pages = await db.prepare("SELECT * FROM pages").all();
} catch (error) {}

// ✅ GOOD - isolated with individual fallbacks
const [settings, pages] = await Promise.all([
	db
		.prepare("SELECT * FROM settings")
		.all()
		.catch(() => null),
	db
		.prepare("SELECT * FROM pages")
		.all()
		.catch(() => null),
]);
```

**Use typed query builders** from `libs/engine/src/lib/server/services/database.ts` instead of raw SQL.

**Drizzle ORM (preferred for new code)** — typed queries with compile-time safety:

```typescript
import { createDb, scopedDb } from "@autumnsgrove/lattice/db";
import type { Post } from "@autumnsgrove/lattice/db";

// Create client from D1 binding
const db = createDb(platform.env.DB);

// Tenant-scoped queries (automatic WHERE tenant_id = ?)
const tenant = scopedDb(db, locals.tenantId);
const post = await tenant.posts.findBySlug("hello-world");
const published = await tenant.posts.listPublished();

// Direct Drizzle queries (for platform-wide operations)
import { posts } from "@autumnsgrove/lattice/db/schema";
import { eq, desc } from "@autumnsgrove/lattice/db";
const allPosts = await db
	.select()
	.from(posts)
	.where(eq(posts.status, "published"))
	.orderBy(desc(posts.publishedAt));
```

Drizzle and raw D1 coexist. Both patterns work in the same file. New code should prefer Drizzle; existing raw D1 queries migrate incrementally. See `docs/specs/drizzle-integration-spec.md` for the full migration plan.

**Schema files** live at `libs/engine/src/lib/server/db/schema/` (engine.ts, curios.ts, observability.ts). When a column changes in the schema, types update everywhere automatically.

### Multi-Tenant CSRF

SvelteKit's built-in CSRF fails behind `grove-router` proxy. Configure `csrf.trustedOrigins` in `svelte.config.js`:

```javascript
kit: {
  csrf: {
    checkOrigin: true,
    trustedOrigins: ["https://grove.place", "https://*.grove.place", "http://localhost:5173"],
  },
}
```
