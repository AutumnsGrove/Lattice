# ADR: Dynamic Grafts Cascade Architecture

**Date:** 2026-01-31
**Status:** Proposed
**Author:** Claude (Eagle Architect)

## Context

Grove's feature flag system currently requires per-page implementation:
- Each page that needs a graft must add `+page.server.ts` with flag checks
- Each new graft requires touching multiple files
- Flags are hardcoded by ID in each page
- No discoverability — pages don't know what grafts exist

This violates Grove's engine-first philosophy: **one function, get them all**.

## Decision

### Load ALL enabled grafts ONCE at the admin layout level

Instead of per-page flag checking, we will:

1. Create `getEnabledGrafts()` — loads ALL flags, evaluates each with context
2. Call it in `admin/+layout.server.ts` — single point of truth
3. Cascade `data.grafts` to ALL child pages — no per-page code needed
4. Components access `data.grafts.flag_id` directly — dynamic, no hardcoding

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  admin/+layout.server.ts                                        │
│                                                                 │
│  const grafts = await getEnabledGrafts(context, env);           │
│  return { ...parentData, grafts };                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  data.grafts: Record<string, boolean>                           │
│  {                                                              │
│    fireside_mode: true,                                         │
│    scribe_mode: true,                                           │
│    meadow_access: false,                                        │
│    ... (ALL grafts, dynamically loaded)                         │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ANY page under /admin/ accesses data.grafts.flag_id            │
│  NO per-page server code needed!                                │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

#### 1. New function: `getEnabledGrafts()`

```typescript
// $lib/feature-flags/grafts.ts

/**
 * Load ALL enabled grafts for a tenant context.
 * Returns a Record where keys are flag IDs and values are booleans.
 *
 * This is the engine-first approach: load once at layout level,
 * cascade to all pages. No per-page flag checking needed.
 */
export async function getEnabledGrafts(
  context: EvaluationContext,
  env: FeatureFlagsEnv,
): Promise<Record<string, boolean>> {
  // 1. Load all enabled flag IDs from D1
  const flagIds = await getAllFlagIds(env.DB);

  // 2. Batch evaluate all flags
  const results = await evaluateFlags(flagIds, context, env);

  // 3. Convert to simple boolean record
  const grafts: Record<string, boolean> = {};
  for (const [id, result] of results) {
    grafts[id] = result.value === true;
  }

  return grafts;
}
```

#### 2. Update admin layout

```typescript
// admin/+layout.server.ts

import { getEnabledGrafts } from "$lib/feature-flags";
import { isInGreenhouse } from "$lib/feature-flags";

export const load: LayoutServerLoad = async ({ locals, platform, parent }) => {
  const parentData = await parent();

  // ... existing tenant loading ...

  // Load ALL grafts for this tenant (engine-first approach)
  let grafts: Record<string, boolean> = {};
  if (platform?.env?.DB && platform?.env?.FLAGS_KV && locals.tenantId) {
    const inGreenhouse = await isInGreenhouse(locals.tenantId, platform.env);
    grafts = await getEnabledGrafts(
      { tenantId: locals.tenantId, inGreenhouse },
      { DB: platform.env.DB, FLAGS_KV: platform.env.FLAGS_KV }
    );
  }

  return {
    ...parentData,
    user: locals.user,
    tenant,
    grafts,  // ← NEW: all grafts available to all admin pages
    csrfToken: locals.csrfToken,
  };
};
```

#### 3. Usage in pages (no server code!)

```svelte
<!-- admin/blog/new/+page.svelte -->
<script>
  let { data } = $props();
</script>

<MarkdownEditor
  firesideEnabled={data.grafts.fireside_mode ?? false}
  scribeEnabled={data.grafts.scribe_mode ?? false}
/>
```

### Dynamic Flag Creation

When you add a NEW flag to the `feature_flags` table:
- It automatically appears in `data.grafts`
- No code changes required
- Components just use `data.grafts.new_flag_id`

To add a new graft:
```sql
INSERT INTO feature_flags (id, name, flag_type, default_value, enabled, greenhouse_only)
VALUES ('new_feature', 'New Feature', 'boolean', 'true', 1, 1);
```

That's it. Every admin page now has access to `data.grafts.new_feature`.

## Consequences

### Positive
- **Engine-first**: One function loads all grafts
- **No per-page code**: Pages just read `data.grafts`
- **Dynamic**: New flags appear automatically
- **Cacheable**: Single KV cache for all grafts per tenant
- **Type-safe**: Can define known graft IDs for autocomplete

### Negative
- **Slight overhead**: Loads all flags even if page only needs one
  - Mitigated by: KV caching, batch D1 query
- **Layout dependency**: Grafts only available under /admin/
  - Acceptable: Public pages don't need experimental features

### Trade-offs
- We trade per-flag granular caching for simpler architecture
- We load ~10-20 flags per request instead of 1-2
- Net win: fewer D1 queries, simpler code, better DX

## Alternatives Considered

### 1. Keep per-page checking
**Rejected**: Too much boilerplate, violates engine-first

### 2. Svelte Context API
**Rejected**: Component-scoped, doesn't cascade through SvelteKit data

### 3. Global store
**Rejected**: Requires hydration, SSR complexity

## Related Issues
- #640 — Add Fireside Mode as a graft toggle
- Bonus: Also gates Scribe behind graft
