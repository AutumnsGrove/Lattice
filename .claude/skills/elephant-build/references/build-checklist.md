# Elephant Build — Build Checklist Reference

## Multi-File Build Checklist

Use this during Phase 3 (BUILD) to track progress across all files.

### Database / Schema Checklist

```
[ ] Table definition added to schema.ts
[ ] Column types match TypeScript types
[ ] Foreign keys reference correct tables
[ ] Indexes added for frequent query patterns
[ ] Migration script created (if needed)
[ ] Schema tested locally with wrangler d1
[ ] Correct D1 binding selected (DB for core, CURIO_DB for curios, OBS_DB for observability)
[ ] Queries scoped to tenant_id for multi-tenant safety
```

### Backend Service Checklist

```
[ ] Service file created at src/lib/services/{feature}.ts
[ ] Functions exported with proper TypeScript types
[ ] Input validated before database operations
[ ] Errors use Signpost codes (not raw throw)
[ ] logGroveError() called for server-side errors
[ ] Database queries use typed helpers from database.ts
[ ] Independent queries parallelized with Promise.all()
[ ] Queries isolated in separate try/catch blocks
```

### API Endpoint Checklist

```
[ ] Route file at src/routes/api/{feature}/+server.ts
[ ] Auth check at top (return 401 if not authenticated)
[ ] Input parsed and validated (Zod schema)
[ ] Correct HTTP verbs (GET=read, POST=create, PUT=update, DELETE=delete)
[ ] Success responses return consistent shape
[ ] Error responses use buildErrorJson() — never ad-hoc JSON
[ ] Rate limiting considered for sensitive operations
[ ] Multi-tenant: queries scoped to tenant_id
```

### Type Safety at Boundaries (Rootwork)

> Validate at the boundary, trust inside. See `AgentUsage/rootwork_type_safety.md`.

```
[ ] Form data parsed with `parseFormData(formData, ZodSchema)` — no raw `.get()` casts
[ ] KV/JSON reads use `safeJsonParse(raw, ZodSchema)` — no bare `JSON.parse()`
[ ] Cache reads use `createTypedCacheReader()` with schema + fallback
[ ] SvelteKit catch blocks use `isRedirect(err)` / `isHttpError(err)` — no `as any` casts
[ ] Zod schemas defined at module scope, not inside handlers
[ ] No `as` casts at trust boundaries (form data, KV, webhooks, caught exceptions)
[ ] All imports from `@autumnsgrove/lattice/server`
```

### Storage & File Operations Checklist

```
[ ] File operations use Amber SDK (FileManager, QuotaManager) — not raw R2
[ ] Quota checked before upload via QuotaManager.canUpload()
[ ] File exports use ExportManager for multi-format support
[ ] Addon file management uses AddonManager for sandboxed storage
[ ] All storage imports from `@autumnsgrove/lattice/amber`
```

### Frontend Component Checklist

```
[ ] Uses Svelte 5 runes ($state, $derived, $props, $effect)
[ ] Imports from engine, not local duplicates
[ ] Loading states implemented
[ ] Error states handled
[ ] Toast feedback on success and failure
[ ] Form validation with inline errors (not toast)
[ ] Accessible markup (labels, ARIA, keyboard nav)
[ ] Mobile layout tested
```

### Integration Wiring Checklist

```
[ ] New route linked from navigation (if applicable)
[ ] Links added to relevant existing pages
[ ] Breadcrumbs updated (if applicable)
[ ] Sidebar/menu updated (if applicable)
[ ] Feature flag added (if rolling out gradually)
```

### Environment & Config Checklist

```
[ ] New env vars added to .env.local
[ ] .env.example updated with descriptions
[ ] Cloudflare bindings added to wrangler.toml
[ ] Secrets added to Cloudflare Worker secrets
[ ] D1 bindings match wrangler.toml names
```

## Database Schema Patterns

### Standard Table Structure

```typescript
// In src/lib/db/schema.ts (or equivalent)
export const myTable = sqliteTable("my_table", {
	id: text("id").primaryKey(), // nanoid or UUID
	tenantId: text("tenant_id").notNull(), // multi-tenant scoping
	userId: text("user_id").notNull(), // owner
	title: text("title").notNull(),
	content: text("content"),
	status: text("status").notNull().default("draft"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

// Indexes for common query patterns
export const myTableIdx = index("my_table_tenant_status_idx").on(myTable.tenantId, myTable.status);
```

### Multi-Tenant Query Pattern

```typescript
// Always scope to tenant
const items = await db
	.prepare("SELECT * FROM my_table WHERE tenant_id = ? AND status = ?")
	.bind(tenantId, "published")
	.all();

// Or with typed helper
const item = await queryOne<MyItem>(db, "SELECT * FROM my_table WHERE id = ? AND tenant_id = ?", [
	id,
	tenantId,
]);
```

### Parallel Query Pattern

```typescript
// Independent queries in parallel (not sequential)
const [posts, settings, config] = await Promise.all([
	db
		.prepare("SELECT * FROM posts WHERE tenant_id = ?")
		.bind(tenantId)
		.all()
		.catch(() => ({ results: [] })),
	db
		.prepare("SELECT * FROM settings WHERE tenant_id = ?")
		.bind(tenantId)
		.first()
		.catch(() => null),
	db
		.prepare("SELECT * FROM config WHERE tenant_id = ?")
		.bind(tenantId)
		.first()
		.catch(() => null),
]);
```

## Integration Point Patterns

### Navigation Links

```svelte
<!-- In layout or nav component -->
<nav>
	<a href="/existing-feature">Existing Feature</a>
	<a href="/new-feature">New Feature</a>
	<!-- Add this -->
</nav>
```

### Cross-Feature References

```svelte
<!-- In existing page, add reference to new feature -->
<section>
	<h2>Related Feature</h2>
	<a href="/new-feature" class="see-also-link"> Check out the new feature → </a>
</section>
```

### Feature Flags

```typescript
// In +page.server.ts or +layout.server.ts
const featureEnabled = platform?.env?.FEATURE_FLAG_NEW_THING === "true";

return {
	featureEnabled,
	// rest of data
};
```

## Completion Summary Template

After BUILD phase, document what was created:

```markdown
## Build Summary

### Feature: [Name]

#### Files Created

- `src/lib/services/feature.ts` — Business logic
- `src/routes/feature/+page.svelte` — UI
- `src/routes/api/feature/+server.ts` — API endpoint

#### Files Modified

- `src/lib/db/schema.ts` — Added feature table
- `src/routes/+layout.svelte` — Added nav link

#### Config

- Added FEATURE_SECRET to .env.example
- Added feature binding to wrangler.toml

#### Tests

- Unit: service functions
- Integration: API endpoint flow
- Component: form submission
```
