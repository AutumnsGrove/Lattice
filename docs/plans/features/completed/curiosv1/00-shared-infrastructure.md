# Curios Shared Infrastructure

> Build once, use everywhere. This is the foundation that every curio stands on.

**Priority:** Build BEFORE any individual curio
**Complexity:** Medium
**Placement:** N/A (infrastructure)

---

## What This Covers

Before building individual curios, we need shared pieces that benefit all of them:

1. **Curio Registry** — Single source of truth for what curios exist
2. **Vine Placement System** — How curios render in gutters/pages
3. **Tier Enforcement** — Check subscription tier before enabling a curio
4. **Curios Hub Admin Page** — `/arbor/curios/` listing all curios with toggles
5. **Curio Wrapper Component** — Shared loading/error/motion handling
6. **Curio Settings Table** — Per-tenant curio enable/disable state

---

## 1. Curio Registry

A single source of truth for all curios — what exists, their metadata, and requirements.

### File: `libs/engine/src/lib/curios/registry.ts`

```typescript
export type CurioCategory = 'interactive' | 'decoration' | 'integration' | 'media' | 'social';

export type CurioPlacement = 'dedicated' | 'left-vine' | 'right-vine' | 'header-vine'
  | 'footer-vine' | 'floating' | 'global' | 'inline';

export type SubscriptionTier = 'seedling' | 'sapling' | 'oak' | 'evergreen';

export interface CurioDefinition {
  id: string;
  name: string;
  description: string;
  category: CurioCategory;
  minTier: SubscriptionTier;
  placements: CurioPlacement[];
  defaultPlacement: CurioPlacement;
  hasAdminPanel: boolean;
  hasDedicatedPage: boolean;
  icon: string; // Lucide icon name
}

export const CURIO_REGISTRY: Record<string, CurioDefinition> = {
  guestbook: {
    id: 'guestbook',
    name: 'Guestbook',
    description: 'Let visitors sign your guestbook',
    category: 'social',
    minTier: 'seedling',
    placements: ['dedicated', 'right-vine'],
    defaultPlacement: 'dedicated',
    hasAdminPanel: true,
    hasDedicatedPage: true,
    icon: 'book-open',
  },
  hitcounter: {
    id: 'hitcounter',
    name: 'Hit Counter',
    description: 'Show how many visitors have stopped by',
    category: 'decoration',
    minTier: 'seedling',
    placements: ['left-vine', 'right-vine', 'footer-vine', 'floating'],
    defaultPlacement: 'footer-vine',
    hasAdminPanel: true,
    hasDedicatedPage: false,
    icon: 'hash',
  },
  // ... every curio gets an entry
} as const;

export function getCuriosByCategory(category: CurioCategory): CurioDefinition[] { ... }
export function getCuriosForTier(tier: SubscriptionTier): CurioDefinition[] { ... }
export function getCuriosByPlacement(placement: CurioPlacement): CurioDefinition[] { ... }
```

### Why This Matters

- Admin hub page reads from registry to show available curios
- Placement system queries registry for what can go where
- Tier enforcement uses `minTier` for gating
- New curios just add an entry — everything else picks it up

---

## 2. Vine Placement System

The system that renders curios in page gutters.

### File: `libs/engine/src/lib/curios/VinePlacement.svelte`

A layout component that reads the tenant's curio placement config and renders enabled curios in the correct slots.

```svelte
<!-- Usage in a layout -->
<div class="page-layout">
	<VineSlot position="left-vine" {tenantId} />

	<main class="content">
		<slot />
	</main>

	<VineSlot position="right-vine" {tenantId} />
</div>
```

### File: `libs/engine/src/lib/curios/VineSlot.svelte`

Renders all curios assigned to a specific vine position for the current tenant.

```svelte
<script>
	// Reads tenant's curio_placements from DB
	// Dynamically imports only the components needed
	// Renders them in order
</script>

<aside class="vine vine-{position}" aria-label="Site widgets">
	{#each enabledCurios as curio}
		<CurioWrapper {curio}>
			<svelte:component this={curio.component} {tenantId} />
		</CurioWrapper>
	{/each}
</aside>
```

### Dynamic Import Strategy

Curio components are lazy-loaded to avoid bundle bloat:

```typescript
const CURIO_LOADERS: Record<string, () => Promise<any>> = {
	hitcounter: () => import("./hitcounter/HitCounter.svelte"),
	nowplaying: () => import("./nowplaying/NowPlayingCompact.svelte"),
	activitystatus: () => import("./activitystatus/ActivityStatusInline.svelte"),
	moodring: () => import("./moodring/MoodRing.svelte"),
	// Each curio may have different components for vine vs dedicated placement
};
```

---

## 3. Tier Enforcement

### Server-Side: Middleware

```typescript
// libs/engine/src/lib/server/curios/tier-check.ts
export function canUseCurio(tenantTier: SubscriptionTier, curioId: string): boolean {
	const curio = CURIO_REGISTRY[curioId];
	if (!curio) return false;
	return TIER_ORDER.indexOf(tenantTier) >= TIER_ORDER.indexOf(curio.minTier);
}

export function getAvailableCurios(tenantTier: SubscriptionTier): CurioDefinition[] {
	return Object.values(CURIO_REGISTRY).filter((c) => canUseCurio(tenantTier, c.id));
}
```

### Client-Side: Gating UI

In the admin hub, curios above the tenant's tier show as locked with an upgrade prompt:

```
┌─────────────────────────────┐
│ ✅ Guestbook     [Enabled]  │  ← Available
│ ✅ Hit Counter   [Enabled]  │  ← Available
│ 🔒 Now Playing   [Oak+]     │  ← Locked, shows upgrade
│ 🔒 Ambient Sounds [Oak+]    │  ← Locked, shows upgrade
└─────────────────────────────┘
```

---

## 4. Curios Hub Admin Page

### Route: `/arbor/curios/`

The central management page where tenants see all curios, enable/disable them, and configure placement.

**Layout:**

- Grid of curio cards, grouped by category
- Each card shows: icon, name, description, tier requirement
- Toggle switch for enabled/disabled
- "Configure" link to curio-specific admin page
- Placement selector (which vine slot)
- Locked curios show tier badge + upgrade CTA

**Data Flow:**

1. Load tenant's `curio_settings` from D1
2. Cross-reference with `CURIO_REGISTRY`
3. Check tenant tier for availability
4. Render grid with correct states

---

## 5. Curio Wrapper Component

### File: `libs/engine/src/lib/curios/CurioWrapper.svelte`

Wraps every curio with shared behavior:

```svelte
<script>
	export let curio: CurioDefinition;
	export let loading = false;
	export let error: string | null = null;
</script>

{#if loading}
	<div class="curio-skeleton" aria-busy="true">...</div>
{:else if error}
	<div class="curio-error" role="alert">{error}</div>
{:else}
	<div
		class="curio-container curio-{curio.id}"
		data-curio={curio.id}
		data-placement={curio.defaultPlacement}
	>
		<slot />
	</div>
{/if}
```

**Responsibilities:**

- Loading skeleton while lazy-loading
- Error boundary (catch and display gracefully)
- `prefers-reduced-motion` detection passed as context
- Consistent CSS class naming for Foliage theming
- `data-curio` attribute for testing/debugging

---

## 6. Curio Settings Table

### Migration: `{next}_curio_settings.sql`

```sql
CREATE TABLE IF NOT EXISTS curio_settings (
  tenant_id TEXT NOT NULL,
  curio_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  placement TEXT NOT NULL DEFAULT 'right-vine',
  sort_order INTEGER NOT NULL DEFAULT 0,
  config TEXT DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, curio_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_curio_settings_tenant ON curio_settings(tenant_id);
CREATE INDEX idx_curio_settings_enabled ON curio_settings(tenant_id, enabled);
```

**Fields:**

- `tenant_id` + `curio_id` = composite primary key
- `enabled` — Is this curio active?
- `placement` — Which vine slot (maps to `CurioPlacement` type)
- `sort_order` — Order within the vine slot
- `config` — JSON blob for curio-specific settings (overrides defaults)

---

## Implementation Steps

1. Create `registry.ts` with all curio definitions
2. Create `curio_settings` migration
3. Build `CurioWrapper.svelte`
4. Build `VineSlot.svelte` and `VinePlacement.svelte`
5. Build tier enforcement utilities
6. Build `/arbor/curios/` hub page
7. Wire placement system into existing site layouts

After this, each individual curio just needs to:

- Add its entry to the registry
- Create its migration
- Build its components
- Add its admin page
- And it automatically shows up in the hub and can be placed in vines

---

_The trellis goes up before the vines grow._
