---
title: Feature Flags — Feature Customization (Grafts)
description: >-
  Per-tenant feature customization with boolean flags, percentage rollouts, and
  A/B variants. Historically called "Grafts"; code now uses "feature flags" terminology.
category: specs
specCategory: core-infrastructure
icon: flag
lastUpdated: "2026-03-28"
aliases:
  - grafts-spec
tags:
  - feature-flags
  - ui-components
  - configuration
  - cloudflare-workers
---

# Feature Flags — Feature Customization (Grafts)

```
                              🌳
                             ╱│╲
                            ╱ │ ╲
                           ╱  │  ╲
                    ┌─────╱   │   ╲─────┐
                    │    ╱    │    ╲    │
                    │   ·─────┼─────·   │
                    │  ╱ graft│joint ╲  │
                    │ ╱       │       ╲ │
                   ╱│╱        │        ╲│╲
                  ╱ │         │         │ ╲
                 ╱  │      rootstock    │  ╲
                ════╧═════════╧═════════╧════

           A branch joined onto rootstock—
         making one tree bear fruit no other can.
```

> _A graft makes your tree bear fruit no other can._

Grove's per-tenant customization system. In code, this is the **feature flags** system. The term "graft" is user-facing language — the horticulture metaphor that Grove uses when talking to tenants about enabling capabilities for their tree. Code uses `flag`, `isFlagEnabled`, `FlagId`, etc.

There are three layers:

- **Feature flags** control _what_ capabilities a tenant receives (flags, rollouts, tier-gating) — _user-facing language: "Feature Grafts"_
- **Domain components** provide _how_ those capabilities render (reusable components at domain paths) — _user-facing language: "UI Grafts"_
- **Greenhouse mode** determines _who_ gets early access (tenant classification for internal testing)

Want a photo gallery? Enable the flag. Need a pricing page? Use the pricing domain components. Testing a feature before rollout? Put the tenant in the greenhouse.

**Public Name:** Grafts _(user-facing horticulture metaphor)_
**Code Term:** Feature Flags
**Internal Name:** GroveGrafts
**Domain:** _Operator-configured_
**Repository:** Part of [AutumnsGrove/Lattice](https://github.com/AutumnsGrove/Lattice)
**Last Updated:** March 2026 (The Big Refactor)

In orcharding, a graft joins a cutting from one tree onto the rootstock of another. The cutting grows, becomes one with the tree, yet retains what makes it special. One apple tree can bear four different varieties. One grove can serve tenants with entirely different capabilities.

_Feature Grafts_ decide which branches grow. _UI Grafts_ are the branches themselves. Together, they let any Grove property customize its features and appearance while sharing a common rootstock. _(This is user-facing language. In code: feature flags decide what's enabled; domain components render the UI.)_

## Terminology

- **Feature flag** _(user-facing: "Feature Graft")_: A flag controlling what capabilities are enabled for a tenant. Lives in the `feature_flags` table with rules in `flag_rules`. Code uses `FlagId`, `isFlagEnabled()`, `getEnabledFlags()`.
- **Domain component** _(user-facing: "UI Graft")_: A reusable Svelte component (e.g., `PricingGraft`) that renders feature UI. After The Big Refactor, these live at domain-specific paths (e.g., `$lib/platform/pricing/`, `$lib/auth/login/`) rather than a shared `grafts/` directory.
- **Greenhouse:** The early access program — membership determines who gets experimental features. Tenants are enrolled via the `greenhouse_tenants` table.
- **Maturity:** The lifecycle stage of a feature flag: `experimental → beta → stable → graduated`. Stored as a column on `feature_flags` (migration 100). Replaces the previous convention of deriving category from flag ID prefixes.

---

## The Graft Lexicon

> **Note:** The following vocabulary is user-facing language — what Grove presents to tenants and in public documentation. In code, the system uses standard feature flag terminology (`FlagId`, `isFlagEnabled()`, etc.). The horticulture metaphor is a design choice, not a code convention.

Grove presents this system to tenants using horticultural metaphors:

| Term          | Action             | Description                                  |
| ------------- | ------------------ | -------------------------------------------- |
| **Graft**     | Enable             | Join a feature onto a tenant's tree          |
| **Prune**     | Disable            | Remove a feature from a tenant               |
| **Propagate** | Percentage rollout | Roll out to a percentage of the grove        |
| **Cultivate** | Full rollout       | Roll out to everyone                         |
| **Cultivars** | A/B variants       | Test different varieties of the same feature |
| **Blight**    | Kill switch        | Emergency disable, instant effect            |
| **Took**      | Status check       | The graft is active and working              |
| **Splice**    | Attach UI          | Add a UI Graft component to a page           |

_"I'll graft it onto your tree at dusk."_
_"Splice the PricingGraft into the landing page."_

---

## Goals

1. **Per-tenant features** — Enable capabilities for specific trees
2. **Percentage rollouts** — Gradual propagation across the grove
3. **Tier-gated features** — Features available at certain subscription tiers
4. **Kill switches** — Instant blight when something goes wrong
5. **A/B testing** — Cultivar comparisons for product experiments
6. **Audit logging** — Know who grafted what, and when
7. **Reusable UI** — Splice consistent components across Grove properties
8. **Engine-first** — UI Grafts live in `@autumnsgrove/lattice`, not individual apps

---

# Part I: Feature Flags

The feature flags system is Grove's Cloudflare-native per-tenant customization infrastructure. It supports boolean flags, percentage rollouts, tier-gated features, and A/B variants. _(User-facing name: "Feature Grafts.")_ Simple infrastructure that lets operators control exactly which features each tenant receives.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Feature Flag Evaluation                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Request arrives with context                                      │
│        (tenantId, userId, tier)                                     │
│              ↓                                                      │
│   ┌─────────────────┐                                               │
│   │    FLAGS_KV     │ ← Check KV cache (1-5ms)                      │
│   │   (Cloudflare)  │                                               │
│   └─────────────────┘                                               │
│         │                                                           │
│         ├── HIT → Return cached value                               │
│         │                                                           │
│         └── MISS ────┐                                              │
│                      ↓                                              │
│              ┌─────────────┐                                        │
│              │     D1      │ ← Load flag config                     │
│              │  (SQLite)   │                                        │
│              └─────────────┘                                        │
│                      ↓                                              │
│              Evaluate rules (tier, tenant, percentage)              │
│                      ↓                                              │
│              Cache result in KV (TTL: 60s)                          │
│                      ↓                                              │
│              Return value                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      Feature Flag Management                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Admin updates flag                                                │
│              ↓                                                      │
│   Update D1 → Invalidate KV keys → Effect within 60s                │
│                                                                     │
│   Emergency blight (kill switch)                                    │
│              ↓                                                      │
│   Disable flag → Clear KV → Immediate effect                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Why this architecture:**

- **KV provides sub-5ms reads** for hot paths (image processing, middleware)
- **D1 provides queryable config** for admin UI
- **60-second TTL** balances freshness with performance
- **No external dependencies** — everything runs on Cloudflare

---

## Rule Types

```
┌───────────────────────────────────────────────────────────────┐
│                      Rule Evaluation Order                     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│   Rules evaluated by priority (highest first)                 │
│   First matching rule determines the flag value               │
│                                                               │
│   ┌─────────────┐    Priority 100                             │
│   │   tenant    │ ── "Enable for tenant_abc only"             │
│   └─────────────┘                                             │
│          ↓                                                    │
│   ┌─────────────┐    Priority 90                              │
│   │    user     │ ── "Enable for user_xyz (beta tester)"      │
│   └─────────────┘                                             │
│          ↓                                                    │
│   ┌─────────────┐    Priority 80                              │
│   │    tier     │ ── "Enable for Oak and Evergreen"           │
│   └─────────────┘                                             │
│          ↓                                                    │
│   ┌─────────────┐    Priority 50                              │
│   │ percentage  │ ── "Propagate to 25% of grove"              │
│   └─────────────┘                                             │
│          ↓                                                    │
│   ┌─────────────┐    Priority 10                              │
│   │    time     │ ── "Active Dec 1 - Dec 31"                  │
│   └─────────────┘                                             │
│          ↓                                                    │
│   ┌─────────────┐    Priority 0                               │
│   │   always    │ ── "Default fallback"                       │
│   └─────────────┘                                             │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Tenant Rules

Enable features for specific tenants:

```typescript
{
  ruleType: 'tenant',
  ruleValue: { tenantIds: ['tenant_abc', 'tenant_def'] },
  resultValue: true
}
```

### Tier Rules

Gate features by subscription tier:

```typescript
{
  ruleType: 'tier',
  ruleValue: { tiers: ['oak', 'evergreen'] },
  resultValue: true
}
```

### Percentage Rules

Gradual propagation across the grove:

```typescript
{
  ruleType: 'percentage',
  ruleValue: { percentage: 25, salt: 'photo_gallery_rollout_2026' },
  resultValue: true
}
```

The percentage is deterministic. Same tenant always gets the same result for the same flag. This uses SHA-256 hashing with a salt to bucket identifiers.

### Time Rules

Seasonal or scheduled features:

```typescript
{
  ruleType: 'time',
  ruleValue: {
    startDate: '2026-12-01T00:00:00Z',
    endDate: '2026-12-31T23:59:59Z'
  },
  resultValue: true
}
```

---

## Database Schema

```sql
-- Core feature flags table
CREATE TABLE feature_flags (
  id TEXT PRIMARY KEY,               -- e.g., 'photo_gallery', 'meadow_access'
  name TEXT NOT NULL,                -- Human-readable name
  description TEXT,                  -- What this flag controls
  flag_type TEXT NOT NULL,           -- 'boolean', 'percentage', 'variant', 'tier', 'json'
  default_value TEXT NOT NULL,       -- Default when no rules match (JSON)
  enabled INTEGER NOT NULL DEFAULT 1, -- Master blight switch
  cache_ttl INTEGER,                 -- KV cache TTL in seconds
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);

-- Rules determine flag values based on context
CREATE TABLE flag_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id TEXT NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,  -- Higher priority first
  rule_type TEXT NOT NULL,              -- 'tenant', 'tier', 'percentage', etc.
  rule_value TEXT NOT NULL,             -- JSON criteria
  result_value TEXT NOT NULL,           -- JSON value if rule matches
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(flag_id, priority)
);

-- Audit log for changes
CREATE TABLE flag_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id TEXT NOT NULL,
  action TEXT NOT NULL,                 -- 'create', 'update', 'enable', 'disable'
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  reason TEXT
);

-- Indexes
CREATE INDEX idx_flags_enabled ON feature_flags(enabled);
CREATE INDEX idx_rules_flag ON flag_rules(flag_id, priority DESC);
CREATE INDEX idx_audit_flag ON flag_audit_log(flag_id, changed_at DESC);
```

---

## Feature Flag API

### Check if a Flag Is Enabled

_(User-facing: "Check if a Graft Took")_

```typescript
import { isFeatureEnabled } from "@autumnsgrove/lattice/platform/feature-flags";

// Is the gallery flag enabled? (user-facing: "did the graft take?")

const galleryEnabled = await isFeatureEnabled(
	"photo_gallery",
	{
		tenantId: locals.tenantId,
		userId: locals.user?.id,
	},
	platform.env,
);

if (galleryEnabled) {
	return renderGallery();
}
```

### Get Flag Value with Default

```typescript
import { getFeatureValue } from "@autumnsgrove/lattice/platform/feature-flags";

// Get post limit, defaulting to 50
const maxPosts = await getFeatureValue(
	"max_posts_override",
	{
		tier: locals.tenant?.tier,
	},
	platform.env,
	50,
);
```

### Check Cultivar (A/B Variant)

```typescript
import { getVariant } from "@autumnsgrove/lattice/platform/feature-flags";

// Which pricing cultivar?
const variant = await getVariant(
	"pricing_experiment",
	{
		sessionId: cookies.get("session_id"),
	},
	platform.env,
);

// Returns 'control', 'annual_first', or 'comparison_table'
```

### Batch Evaluation

```typescript
import { getFlags } from "@autumnsgrove/lattice/platform/feature-flags";

// Evaluate multiple flags at once
const flags = await getFlags(
	["meadow_access", "dark_mode_default", "new_nav"],
	{ tenantId, tier, userId },
	platform.env,
);

return {
	canAccessMeadow: flags.get("meadow_access")?.value ?? false,
	darkModeDefault: flags.get("dark_mode_default")?.value ?? false,
};
```

---

## Implementation Details

### Percentage Rollout (Deterministic)

Uses Web Crypto API (Cloudflare Workers compatible):

```typescript
// Same identifier always gets same bucket
async function hashToBucket(input: string): Promise<number> {
	const encoder = new TextEncoder();
	const data = encoder.encode(input);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = new Uint8Array(hashBuffer);

	// Use first 4 bytes as uint32, mod 100 for percentage
	const view = new DataView(hashArray.buffer);
	const uint32 = view.getUint32(0, false); // big-endian
	return uint32 % 100;
}

async function evaluatePercentage(
	condition: { percentage: number; salt?: string },
	context: EvaluationContext,
	flagId: string,
): Promise<boolean> {
	const { percentage, salt = "" } = condition;

	// Edge cases
	if (percentage <= 0) return false;
	if (percentage >= 100) return true;

	// Priority: userId > tenantId > sessionId
	const identifier = context.userId ?? context.tenantId ?? context.sessionId;

	if (!identifier) {
		// No identifier - fail safe, don't randomly assign
		console.warn(`No identifier for percentage rollout of "${flagId}"`);
		return false;
	}

	// Hash with flag-specific salt for independence between flags
	const hashInput = `${flagId}:${salt}:${identifier}`;
	const bucket = await hashToBucket(hashInput);
	return bucket < percentage;
}
```

### Cache Key Structure

```
flag:{flag_id}:global                    → Global evaluation
flag:{flag_id}:tenant:{tenant_id}        → Tenant-specific
flag:{flag_id}:tier:{tier}               → Tier-specific
flag:{flag_id}:user:{user_id}            → User-specific
```

### Cache Invalidation

```typescript
import { invalidateFlag } from "@autumnsgrove/lattice/platform/feature-flags";

// When admin updates a flag
await invalidateFlag("photo_gallery", env);
// Clears all KV keys with prefix flag:photo_gallery:
```

---

# Part II: Domain Components (UI Grafts)

> **The Big Refactor:** What were previously called "UI Grafts" (living in `libs/engine/src/lib/grafts/`) are now regular Svelte components organized at domain-specific paths. They are no longer in a shared `grafts/` directory or exported under `@autumnsgrove/lattice/grafts/`. _(User-facing name: "UI Grafts" — the horticulture metaphor is preserved in public language.)_

Domain components are reusable, configurable components that can be used in any Grove property. They live in `@autumnsgrove/lattice` under domain-specific subpaths and provide consistent UI for features like pricing, navigation, and footers.

**Domain paths (after The Big Refactor):**
- Pricing: `$lib/platform/pricing/` → `@autumnsgrove/lattice/platform/pricing`
- Login: `$lib/auth/login/` → `@autumnsgrove/lattice/auth/login`
- Greenhouse: `$lib/platform/greenhouse/` → `@autumnsgrove/lattice/platform/greenhouse`
- Upgrades: `$lib/platform/upgrades/` → `@autumnsgrove/lattice/platform/upgrades`
- Uploads: `$lib/platform/uploads/` → `@autumnsgrove/lattice/platform/uploads`
- Feature flags: `$lib/platform/feature-flags/` → `@autumnsgrove/lattice/platform/feature-flags`

```
┌─────────────────────────────────────────────────────────────────────┐
│              Feature Flags vs Domain Components (UI Grafts)         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Feature flags                       Domain components             │
│   ├── isFeatureEnabled()      ───►    ├── PricingGraft              │
│   ├── getFeatureValue()               ├── (future: NavGraft)        │
│   └── rules/tier/percentage           └── (future: FooterGraft)     │
│                                                                     │
│   "Is pricing_flag enabled?"          "Render the pricing UI"       │
│                                                                     │
│                        ┌───────────┐                                │
│   Feature flag ───────►│  checks   │──────► Component renders       │
│   (optional)           │ isEnabled │        (or not)                │
│                        └───────────┘                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key distinction:** Feature flags ask "is X enabled?" Domain components answer "render X." A domain component can optionally check a feature flag before rendering, enabling gradual rollouts of new UI.

---

## Domain Component Architecture

After The Big Refactor, components live at domain-specific paths rather than in a shared `grafts/` directory.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Domain Component System                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   libs/engine/src/lib/platform/feature-flags/                       │
│   ├── index.ts              # Public API exports                    │
│   ├── types.ts              # TypeScript interfaces (FlagId, etc.)  │
│   ├── flags.ts              # isFlagEnabled(), getEnabledFlags()    │
│   └── registry.ts           # Flag registry & isFlagEnabled()       │
│                                                                     │
│   libs/engine/src/lib/platform/pricing/                             │
│   ├── index.ts              # Pricing exports                       │
│   ├── types.ts              # Pricing-specific types                │
│   ├── config.ts             # Tier transformation utilities         │
│   ├── checkout.ts           # LemonSqueezy URL generation           │
│   ├── PricingGraft.svelte        # Main orchestrator                │
│   ├── PricingTable.svelte        # Comparison table                 │
│   ├── PricingCard.svelte         # Individual tier card             │
│   ├── PricingToggle.svelte       # Monthly/Annual toggle            │
│   ├── PricingCTA.svelte          # Checkout button                  │
│   └── PricingFineprint.svelte    # Expandable fine print            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      Flag Registry Flow                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   1. Register flag in FLAG_REGISTRY                                 │
│              ↓                                                      │
│   2. (Optional) Link to feature flag via featureFlagId              │
│              ↓                                                      │
│   3. Consumer calls isFlagEnabled() with context                    │
│              ↓                                                      │
│   4. If linked, checks feature flags system                         │
│              ↓                                                      │
│   5. Returns boolean: should this UI render?                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The Flag Registry

Every domain component that supports optional feature-flag gating registers its metadata in a central registry. This enables discovery, versioning, and optional feature flag integration.

```typescript
// libs/engine/src/lib/platform/feature-flags/registry.ts

import { isFeatureEnabled } from "../feature-flags/flags.js";
import type { FlagId, FlagContext, FlagRegistryEntry } from "./types.js";

/**
 * Registry of all available domain components with optional flag gating.
 */
export const FLAG_REGISTRY = new Map<FlagId, FlagRegistryEntry>([
	[
		"pricing",
		{
			id: "pricing",
			name: "Pricing Graft", // user-facing name preserves "Graft" metaphor
			description: "Reusable pricing table, cards, and checkout components",
			featureFlagId: "pricing_flag", // Optional: link to feature flag
			version: "1.0.0",
			status: "stable",
		},
	],
	// Future components register here
]);

/**
 * Check if a domain component should render based on its linked feature flag.
 */
export async function isFlagEnabled(flagId: FlagId, context: FlagContext): Promise<boolean> {
	const entry = FLAG_REGISTRY.get(flagId);

	// Unknown flag - don't render
	if (!entry) return false;

	// No feature flag linked - always enabled
	if (!entry.featureFlagId) return true;

	// No env provided - can't check flags, default to enabled
	if (!context.env) return true;

	// Check the linked feature flag
	return isFeatureEnabled(
		entry.featureFlagId,
		{ tenantId: context.tenantId, tier: context.tier },
		context.env,
	);
}
```

### Registry Entry Type

```typescript
// libs/engine/src/lib/platform/feature-flags/types.ts

export type FlagId = "pricing" | "nav" | "footer" | "hero" | (string & {});

export type ProductId = "grove" | "scout" | "daily-clearing" | "meadow" | (string & {});

export interface FlagRegistryEntry {
	/** Unique flag identifier */
	id: FlagId;

	/** Human-readable name (may use user-facing "Graft" terminology) */
	name: string;

	/** Description of what this component does */
	description: string;

	/**
	 * Optional feature flag ID that controls this component's availability.
	 * If specified, isFlagEnabled() checks this flag before allowing render.
	 */
	featureFlagId?: string;

	/** Semantic version */
	version: string;

	/** Stability status */
	status: "stable" | "beta" | "experimental" | "deprecated";
}

export interface FlagContext {
	/** Which product this component is rendering for */
	productId: ProductId;

	/** Optional tenant ID for multi-tenant scenarios */
	tenantId?: string;

	/** Optional tier for tier-gated rendering */
	tier?: TierKey;

	/** Optional feature flags environment */
	env?: FeatureFlagsEnv;
}
```

---

## PricingGraft: The First Domain Component

_(User-facing name: "Pricing Graft" — the "UI Graft" metaphor is preserved in public language.)_

PricingGraft provides a complete pricing page solution: tier cards, comparison tables, billing toggles, and checkout buttons. Any Grove property can use it with a single import.

### The Problem It Solves

Before PricingGraft, each Grove property duplicated pricing UI:

```
apps/landing/src/routes/pricing/+page.svelte    → 543 lines
apps/scout/src/routes/pricing/+page.svelte      → 487 lines (similar)
apps/meadow/src/routes/pricing/+page.svelte     → 512 lines (similar)
```

After PricingGraft:

```
apps/landing/src/routes/pricing/+page.svelte    → 82 lines
```

An 85% reduction. Same UI, single source of truth.

### Using PricingGraft

_(User-facing: "Splicing PricingGraft")_

```svelte
<!-- apps/landing/src/routes/pricing/+page.svelte -->
<script lang="ts">
	import { PricingGraft } from "@autumnsgrove/lattice/platform/pricing";

	let { data } = $props();
</script>

<PricingGraft productId="grove" tiers={data.tiers} showComparison={true} showFineprint={true}>
	{#snippet header()}
		<h1 class="text-4xl font-display">Find Your Perfect Grove</h1>
		<p class="text-bark/70">Choose the plan that fits your creative journey</p>
	{/snippet}

	{#snippet footer()}
		<p class="text-sm text-foreground-muted">
			Questions? <a href="/contact">Reach out</a>. We're happy to help.
		</p>
	{/snippet}
</PricingGraft>
```

### Server-Side Tier Transformation

```typescript
// apps/landing/src/routes/pricing/+page.server.ts
import { transformAllTiers } from "@autumnsgrove/lattice/platform/pricing";

export function load() {
	const tiers = transformAllTiers({
		highlightTier: "seedling",
		badges: {
			seedling: "Start Here",
		},
		// When LemonSqueezy is configured:
		// checkoutUrls: getAllCheckoutUrls(createCheckoutConfigFromEnv(platform.env)),
	});

	return { tiers };
}
```

---

## PricingGraft Components

### Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PricingGraft                                 │
│                     (main orchestrator)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  {#snippet header()} - Custom header content                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  PricingToggle - Monthly/Annual billing switch              │   │
│   │  ┌─────────┐  ┌─────────────┐                               │   │
│   │  │ Monthly │  │ Annual -15% │                               │   │
│   │  └─────────┘  └─────────────┘                               │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  PricingTable (if showComparison)                           │   │
│   │  ┌──────────┬──────────┬──────────┬──────────┬──────────┐   │   │
│   │  │ Feature  │   Free   │ Seedling │  Sapling │   Oak    │   │   │
│   │  ├──────────┼──────────┼──────────┼──────────┼──────────┤   │   │
│   │  │ Posts    │    —     │    50    │   250    │    ∞     │   │   │
│   │  │ Storage  │    —     │   1 GB   │   5 GB   │  20 GB   │   │   │
│   │  └──────────┴──────────┴──────────┴──────────┴──────────┘   │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  PricingCard[] (if showCards)                               │   │
│   │  ┌───────────┐  ┌───────────┐  ┌───────────┐                │   │
│   │  │ 🌱        │  │ 🌳        │  │ 🌲        │                │   │
│   │  │ Seedling  │  │ Sapling   │  │ Oak       │                │   │
│   │  │ $8/mo     │  │ $12/mo    │  │ $25/mo    │                │   │
│   │  │           │  │           │  │           │                │   │
│   │  │ [Get Started]│ [Get Started]│[Get Started]│              │   │
│   │  └───────────┘  └───────────┘  └───────────┘                │   │
│   │                                                             │   │
│   │  Each card contains: PricingCTA (checkout button)           │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  PricingFineprint (if showFineprint)                        │   │
│   │  ▸ About Reading                                            │   │
│   │  ▸ The Free Tier                                            │   │
│   │  ▸ Theme Details                                            │   │
│   │  ...expandable sections                                     │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  {#snippet footer()} - Custom footer content                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### PricingGraft Props

```typescript
interface PricingGraftProps extends BaseGraftProps {
	/** Which product this pricing is for */
	productId: ProductId;

	/** Tiers to display (transformed for display) */
	tiers: PricingTier[];

	/** Default billing period selection */
	defaultPeriod?: BillingPeriod; // 'monthly' | 'annual'

	/** Show the full comparison table */
	showComparison?: boolean;

	/** Show the fine print section */
	showFineprint?: boolean;

	/** Show the billing period toggle */
	showToggle?: boolean;

	/** Show cards instead of/alongside table */
	showCards?: boolean;

	// Customization snippets (Svelte 5)
	header?: Snippet;
	tierBadge?: Snippet<[PricingTier]>;
	tierFooter?: Snippet<[PricingTier]>;
	afterTable?: Snippet;
	footer?: Snippet;

	// Events
	onCheckout?: (tier: TierKey, period: BillingPeriod) => void;
	onPeriodChange?: (period: BillingPeriod) => void;
}
```

### PricingTier Type

The `transformTier()` and `transformAllTiers()` functions convert raw tier config into this display-ready format:

```typescript
interface PricingTier {
	key: TierKey; // 'free' | 'seedling' | 'sapling' | 'oak' | 'evergreen'
	name: string; // 'Seedling'
	tagline: string; // 'Plant your first seeds'
	icon: TierIcon; // 'sprout'
	status: TierStatus; // 'available' | 'coming_soon' | 'future' | 'deprecated'
	bestFor: string; // 'New writers getting started'

	monthlyPrice: number; // 8
	annualPrice: number; // 81.60
	annualSavings: number; // 15 (percentage)

	limits: PricingTierLimits; // Formatted strings: { posts: '50', storage: '1 GB', ... }
	features: TierFeatures; // Booleans: { blog: true, customDomain: false, ... }
	featureStrings: string[]; // Bullet points for cards
	supportLevel: string; // 'Community'

	highlight?: boolean; // Visual emphasis
	badge?: string; // 'Most Popular'

	checkoutUrls: {
		monthly?: string;
		annual?: string;
	};
}
```

---

## LemonSqueezy Checkout Integration

PricingGraft integrates with LemonSqueezy for payment processing. The `checkout.ts` module generates secure checkout URLs.

```typescript
// libs/engine/src/lib/platform/pricing/checkout.ts

export interface CheckoutConfig {
	storeId: string;
	products: Partial<
		Record<
			TierKey,
			{
				monthlyVariantId?: string;
				annualVariantId?: string;
			}
		>
	>;
}

/**
 * Generate a LemonSqueezy checkout URL.
 */
export function getCheckoutUrl(
	config: CheckoutConfig,
	tierKey: TierKey,
	period: BillingPeriod,
	options?: {
		email?: string;
		discountCode?: string;
		successUrl?: string;
		cancelUrl?: string;
		customData?: Record<string, string>;
	},
): string | undefined {
	const product = config.products[tierKey];
	if (!product) return undefined;

	const variantId = period === "monthly" ? product.monthlyVariantId : product.annualVariantId;

	if (!variantId) return undefined;

	const url = new URL(`https://${config.storeId}.lemonsqueezy.com/checkout/buy/${variantId}`);

	if (options?.email) {
		url.searchParams.set("checkout[email]", options.email);
	}
	if (options?.discountCode) {
		url.searchParams.set("checkout[discount_code]", options.discountCode);
	}
	// Custom data is validated to prevent XSS
	if (options?.customData) {
		for (const [key, value] of Object.entries(options.customData)) {
			if (/^[a-zA-Z0-9_-]+$/.test(key)) {
				url.searchParams.set(`checkout[custom][${key}]`, value);
			}
		}
	}

	return url.toString();
}

/**
 * Create checkout config from environment variables.
 */
export function createCheckoutConfigFromEnv(env: {
	LEMON_SQUEEZY_STORE_ID?: string;
	LEMON_SEEDLING_MONTHLY?: string;
	LEMON_SEEDLING_ANNUAL?: string;
	// ... other tier variants
}): CheckoutConfig {
	return {
		storeId: env.LEMON_SQUEEZY_STORE_ID ?? "",
		products: {
			seedling: {
				monthlyVariantId: env.LEMON_SEEDLING_MONTHLY,
				annualVariantId: env.LEMON_SEEDLING_ANNUAL,
			},
			// ... other tiers
		},
	};
}
```

---

## Creating a New Domain Component

_(User-facing: "Creating a New UI Graft")_

To add a new domain component (e.g., NavGraft), place it in its domain directory rather than a shared `grafts/` folder:

### 1. Create the domain folder structure

```
libs/engine/src/lib/platform/nav/
├── index.ts              # Public exports
├── types.ts              # Nav-specific types
├── config.ts             # Configuration helpers
├── NavGraft.svelte       # Main component (name preserves user-facing "Graft" metaphor)
├── NavItem.svelte        # Child component
└── NavGraft.test.ts      # Tests
```

### 2. Register in the flag registry (if feature-flag gating is needed)

```typescript
// libs/engine/src/lib/platform/feature-flags/registry.ts

FLAG_REGISTRY.set("nav", {
	id: "nav",
	name: "Navigation Graft", // user-facing name
	description: "Reusable navigation bar with product-specific links",
	featureFlagId: "nav_flag", // Optional
	version: "1.0.0",
	status: "beta",
});
```

### 3. Add package.json exports

```json
// libs/engine/package.json
{
	"exports": {
		"./platform/nav": {
			"types": "./dist/platform/nav/index.d.ts",
			"svelte": "./dist/platform/nav/index.js",
			"default": "./dist/platform/nav/index.js"
		}
	}
}
```

### 4. Export from the domain index

```typescript
// libs/engine/src/lib/platform/nav/index.ts
export * from "./NavGraft.svelte";
export * from "./types.js";
```

---

## Package Exports

Domain components are exported from `@autumnsgrove/lattice` under domain-specific subpaths:

```json
{
	"exports": {
		"./platform/feature-flags": {
			"types": "./dist/platform/feature-flags/index.d.ts",
			"default": "./dist/platform/feature-flags/index.js"
		},
		"./platform/pricing": {
			"types": "./dist/platform/pricing/index.d.ts",
			"svelte": "./dist/platform/pricing/index.js",
			"default": "./dist/platform/pricing/index.js"
		}
	}
}
```

### Import Patterns

```typescript
// Feature flag registry utilities
import { isFlagEnabled, getFlagEntry, FLAG_REGISTRY } from "@autumnsgrove/lattice/platform/feature-flags";

// PricingGraft and utilities
import {
	PricingGraft,
	PricingTable,
	PricingCard,
	PricingToggle,
	transformTier,
	transformAllTiers,
	getCheckoutUrl,
} from "@autumnsgrove/lattice/platform/pricing";
```

---

# Part III: Greenhouse Mode

Greenhouse mode is Grove's approach to internal testing and early access — an entire abstraction layer above the feature flags system and domain components. Where feature flags ask "is X enabled?" and domain components answer "render X," Greenhouse mode asks a more fundamental question: "is this tenant in the greenhouse?"

```
                              🌱
                    ┌─────────────────────┐
                    │                     │
                    │    THE GREENHOUSE   │
                    │                     │
                    │   ╭───────────────╮ │
                    │   │ 🧪 Seedlings  │ │
                    │   │  under glass  │ │
                    │   ╰───────────────╯ │
                    │                     │
                    └─────────────────────┘
                              ↓
           Features mature, then propagate to...
                              ↓
                    ┌─────────────────────┐
                    │                     │
                    │      THE GROVE      │
                    │                     │
                    │   🌳  🌲  🌳  🌲    │
                    │   Production trees  │
                    │                     │
                    └─────────────────────┘

        The greenhouse shelters experiments
           before they're ready for the grove.
```

> _In gardening, a greenhouse shelters seedlings from harsh conditions until they're strong enough to transplant. Features grown under glass can be observed, adjusted, and hardened before facing the wild._

**Public Name:** Greenhouse mode
**Internal Name:** Dave mode[^1]

[^1]: Named after the first test tenant in Grove. "Dave" was chosen as the most wonderfully mundane, generic example name imaginable during early development. When it came time to name the internal testing mode, "Dave mode" felt perfect: unpretentious, memorable, and a small tribute to Grove's earliest days.

---

## The Abstraction Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│               The Three Layers of Feature Flags (Grafts)            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Layer 3: GREENHOUSE MODE                                          │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  "Who gets early access?"                                   │   │
│   │  ├── Tenant classification (greenhouse vs. production)      │   │
│   │  ├── Automatic feature inheritance                          │   │
│   │  └── Testing isolation                                      │   │
│   └─────────────────────────────────────────────────────────────┘   │
│              ↓ Greenhouse tenants automatically receive...          │
│                                                                     │
│   Layer 2: FEATURE FLAGS (user-facing: "Feature Grafts")            │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  "What capabilities are enabled?"                           │   │
│   │  ├── Boolean flags                                          │   │
│   │  ├── Percentage rollouts                                    │   │
│   │  ├── Tier-gated features                                    │   │
│   │  └── A/B variants (cultivars)                               │   │
│   └─────────────────────────────────────────────────────────────┘   │
│              ↓ Enabled features can use...                          │
│                                                                     │
│   Layer 1: DOMAIN COMPONENTS (user-facing: "UI Grafts")             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  "How do features render?"                                  │   │
│   │  ├── PricingGraft ($lib/platform/pricing/)                  │   │
│   │  ├── NavGraft ($lib/platform/nav/, planned)                 │   │
│   │  └── FooterGraft ($lib/platform/footer/, planned)           │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Why three layers?**

- **Domain components** (UI Grafts) are granular: individual components used on pages
- **Feature flags** (Feature Grafts) are specific: individual flags for individual tenants
- **Greenhouse mode** is holistic: tenant-wide classification that unlocks self-serve control

A tenant in greenhouse mode doesn't need individual feature flags for each experimental feature — they automatically receive features marked as `greenhouse_only: true`. This is the key distinction: greenhouse mode operates on _tenant classification_, not feature configuration.

---

## The Dev Mode Revelation

Greenhouse mode solves a fundamental architectural question: **where do feature flag controls live?**

The original plan was to abstract flag controls into a separate admin panel (Arbor). But this creates friction — tenants who want to experiment with their own trees would need operator intervention for every toggle. That's not how a grove should work.

**The insight:** Greenhouse mode _is_ dev mode.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    The Two Modes of Operation                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   PRODUCTION MODE (Default)                                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Feature flags are operator-configured                      │   │
│   │  ├── Wayfinder decides what's enabled                       │   │
│   │  ├── Tenant sees the result, not the controls               │   │
│   │  └── Safe, stable, curated experience                       │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   GREENHOUSE MODE (Dev Mode)                                        │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Feature flags are self-serve                               │   │
│   │  ├── Tenant sees AND controls the flag toggles              │   │
│   │  ├── Can freely graft/prune features on their own tree      │   │
│   │  ├── Access to experimental features before general release │   │
│   │  └── More tweakability, tuning, and control                 │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   The greenhouse isn't just for testing new features—              │
│   it's where power users cultivate their own gardens.              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**What greenhouse mode enables:**

| Capability                        | Production | Greenhouse |
| --------------------------------- | ---------- | ---------- |
| View active flags (grafts)        | ✗          | ✓          |
| Toggle feature flags              | ✗          | ✓          |
| Access experimental features      | ✗          | ✓          |
| Adjust flag parameters            | ✗          | ✓          |
| See flag admin UI                 | ✗          | ✓          |
| Reset to defaults                 | ✗          | ✓          |

**Why this matters architecturally:**

1. **No separate admin panel needed** — Feature flag controls live in the tenant's own dashboard, visible only in greenhouse mode
2. **Progressive disclosure** — Most tenants never see the complexity; power users opt into it
3. **Self-serve experimentation** — Tenants can try features without waiting for operator approval
4. **Clean separation** — Production tenants get a curated experience; greenhouse tenants get full control

_The greenhouse isn't a testing environment. It's a tinkerer's workshop._

---

## Greenhouse Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Greenhouse Mode Evaluation                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Request arrives with tenant context                               │
│              ↓                                                      │
│   ┌─────────────────────────┐                                       │
│   │  Is tenant in           │                                       │
│   │  greenhouse mode?       │                                       │
│   └─────────────────────────┘                                       │
│         │                                                           │
│         ├── YES → All greenhouse_only features enabled              │
│         │         ┌─────────────────────────────────────────────┐   │
│         │         │  Feature flag evaluation includes:          │   │
│         │         │  • Standard rules (tier, percentage, etc.)  │   │
│         │         │  • PLUS greenhouse_only features            │   │
│         │         │  • PLUS experimental UI components          │   │
│         │         └─────────────────────────────────────────────┘   │
│         │                                                           │
│         └── NO → Standard feature flag evaluation                   │
│                  (greenhouse_only features excluded)                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Greenhouse Extension)

```sql
-- Greenhouse tenants table
CREATE TABLE greenhouse_tenants (
  tenant_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
  enrolled_by TEXT,               -- Who added this tenant to the greenhouse
  notes TEXT,                     -- Why this tenant is in the greenhouse
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Feature flags can be marked as greenhouse-only
-- Add to existing feature_flags table
ALTER TABLE feature_flags ADD COLUMN greenhouse_only INTEGER NOT NULL DEFAULT 0;

-- Index for efficient greenhouse lookups
CREATE INDEX idx_greenhouse_tenants_enabled ON greenhouse_tenants(enabled);
CREATE INDEX idx_flags_greenhouse ON feature_flags(greenhouse_only) WHERE greenhouse_only = 1;
```

---

## Greenhouse API

### Check if Tenant is in Greenhouse

```typescript
import { isInGreenhouse } from "@autumnsgrove/lattice/platform/feature-flags";

// Is this tenant part of the greenhouse?
const inGreenhouse = await isInGreenhouse(locals.tenantId, platform.env);

if (inGreenhouse) {
	// Show experimental UI, enable bleeding-edge features
	console.log("🌱 Greenhouse tenant detected");
}
```

### Evaluate with Greenhouse Context

```typescript
import { isFeatureEnabled } from "@autumnsgrove/lattice/platform/feature-flags";

// Greenhouse context is automatically included
const useExperimentalEditor = await isFeatureEnabled(
	"experimental_editor",
	{
		tenantId: locals.tenantId,
		// No need to specify greenhouse mode—it's inferred from tenant
	},
	platform.env,
);

// For greenhouse tenants, this returns true even if the feature
// is marked greenhouse_only and has no other rules
```

### Mark a Feature as Greenhouse-Only

```typescript
// In admin UI or migration
await db
	.prepare(
		`
  INSERT INTO feature_flags (id, name, flag_type, default_value, greenhouse_only)
  VALUES ('experimental_editor', 'Experimental Editor', 'boolean', 'false', 1)
`,
	)
	.run();
```

---

## The Greenhouse Lexicon

Building on the established Graft vocabulary:

| Term            | Action          | Description                                              |
| --------------- | --------------- | -------------------------------------------------------- |
| **Greenhouse**  | Tenant state    | A tenant enrolled in early access testing                |
| **Under glass** | Feature state   | A feature only available in the greenhouse               |
| **Transplant**  | Promotion       | Move a feature from greenhouse to general availability   |
| **Harden off**  | Gradual rollout | Slowly expose a greenhouse feature to production         |
| **Nursery**     | Group           | Collection of greenhouse tenants for coordinated testing |

_"Dave's tree is in the greenhouse—they'll see the new editor first."_
_"We're hardening off the photo gallery this week—25% propagation."_

---

## Implementation Patterns

### Pattern 1: Greenhouse-Only Features

For features that should only exist in the greenhouse until ready:

```typescript
// Create a greenhouse-only feature
const experimentalFeature = {
	id: "voice_posts",
	name: "Voice Posts",
	description: "Record posts as audio",
	flag_type: "boolean",
	default_value: "false",
	greenhouse_only: true, // Only visible to greenhouse tenants
};
```

### Pattern 2: Greenhouse Priority Rules

Greenhouse tenants can have dedicated rules that override standard rules:

```typescript
// Greenhouse tenants get 100% rollout of beta features
{
  ruleType: 'greenhouse',
  priority: 95,  // High priority, just below explicit tenant rules
  resultValue: true
}
```

### Pattern 3: Gradual Transplant

Moving a feature from greenhouse to production:

```typescript
// Week 1: Greenhouse only
await setGreenhouseOnly("voice_posts", true);

// Week 2: Add 10% propagation to production
await addRule("voice_posts", {
	ruleType: "percentage",
	ruleValue: { percentage: 10 },
	resultValue: true,
});

// Week 3: Increase to 50%
await updateRule("voice_posts", "percentage", { percentage: 50 });

// Week 4: Full cultivation, remove greenhouse restriction
await setGreenhouseOnly("voice_posts", false);
await updateRule("voice_posts", "always", true);
```

---

## Why "Dave Mode"?

The very first test tenant created in Grove was named "Dave."

It was chosen for the most practical of reasons: Dave is wonderfully generic. When you need a placeholder name that won't distract from what you're testing, Dave is perfect. Not creative. Not memorable. Just... Dave.

Months later, when designing the internal testing mode, the obvious question arose: what do we call tenants that are part of our testing pool? "Beta tenants" felt corporate. "Test tenants" felt clinical. And then someone remembered: we already have a name for the first tenant to test anything. Dave.

The internal codename stuck. In commit messages and Slack channels, it's "Dave mode." In documentation and user-facing text, it's "greenhouse mode." Both names honor the same idea: a place where things are tested before they're ready for the world.

_Sometimes the best names aren't discovered through careful deliberation—they're already sitting there in your git history, waiting to be recognized._

---

# Part IV: Configuration & Operations

## wrangler.toml Bindings

```toml
[[kv_namespaces]]
binding = "FLAGS_KV"
id = "your-kv-namespace-id"

[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "your-database-id"
```

## Environment Interface

```typescript
interface FeatureFlagsEnv {
	DB: D1Database;
	FLAGS_KV: KVNamespace;
}
```

---

## Emergency Procedures

### Invoking Blight (Kill Switch)

When a flag causes problems:

1. **Via Admin UI**: Navigate to flag → Toggle master switch OFF
2. **Direct D1 update**:
   ```sql
   UPDATE feature_flags SET enabled = 0 WHERE id = 'problem_flag';
   ```
3. **Clear cache** (if invalidation fails):
   ```bash
   wrangler kv:key list --namespace-id=FLAGS_KV_ID --prefix="flag:problem_graft:" | \
     jq -r '.[].name' | \
     xargs -I {} wrangler kv:key delete --namespace-id=FLAGS_KV_ID {}
   ```

### Recovery Timeline

| Action                         | Effect Time            |
| ------------------------------ | ---------------------- |
| Toggle master switch           | 60 seconds (cache TTL) |
| Clear KV cache                 | Immediate              |
| Direct D1 update + cache clear | Immediate              |

---

## Example Flags (Grafts)

### Feature Flags

_(User-facing: "Feature Grafts")_

| Flag ID           | Type       | Purpose                     | Example Use                 |
| ----------------- | ---------- | --------------------------- | --------------------------- |
| `photo_gallery`   | percentage | Photo galleries per grove   | Propagate to 25% of grove   |
| `meadow_access`   | tier       | Gate Meadow social features | Oak and Evergreen only      |
| `pricing_flag`    | boolean    | Gate PricingGraft rollout   | Gradual UI rollout          |

### Domain Components

_(User-facing: "UI Grafts")_

| Component ID | Status  | Path                           | Components                                    |
| ------------ | ------- | ------------------------------ | --------------------------------------------- |
| `pricing`    | stable  | `$lib/platform/pricing/`       | PricingGraft, PricingTable, PricingCard, etc. |
| `nav`        | planned | `$lib/platform/nav/`           | NavGraft, NavItem                             |
| `footer`     | planned | `$lib/platform/footer/`        | FooterGraft, FooterLinks                      |
| `hero`       | planned | `$lib/platform/hero/`          | HeroGraft, HeroContent                        |

---

## Project Structure

After The Big Refactor, the structure is domain-organized rather than grouped under `grafts/`:

```
libs/engine/src/lib/
├── platform/
│   ├── feature-flags/        # Feature flag system (user-facing: "Feature Grafts")
│   │   ├── index.ts          # Public API exports
│   │   ├── types.ts          # TypeScript interfaces (FlagId, FlagContext, etc.)
│   │   ├── flags.ts          # isFlagEnabled(), getEnabledFlags()
│   │   ├── evaluate.ts       # Core evaluation logic
│   │   ├── percentage.ts     # Deterministic bucketing
│   │   ├── rules.ts          # Rule evaluation
│   │   ├── cache.ts          # KV caching utilities
│   │   ├── registry.ts       # FLAG_REGISTRY, isFlagEnabled() for components
│   │   └── *.test.ts         # Unit tests
│   │
│   ├── pricing/              # PricingGraft (user-facing: "Pricing UI Graft")
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── config.ts
│   │   ├── config.test.ts
│   │   ├── checkout.ts
│   │   ├── checkout.test.ts
│   │   ├── PricingGraft.svelte
│   │   ├── PricingTable.svelte
│   │   ├── PricingCard.svelte
│   │   ├── PricingToggle.svelte
│   │   ├── PricingCTA.svelte
│   │   └── PricingFineprint.svelte
│   │
│   ├── greenhouse/           # Greenhouse mode utilities
│   ├── upgrades/             # Upgrade flow components
│   └── uploads/              # Upload components
│
└── auth/
    └── login/                # Login components
```

---

## Implementation Checklist

### Phase 1: Feature Flag Infrastructure (Complete)

- [x] D1 schema migration
- [x] Type definitions
- [x] Evaluation logic
- [x] Percentage bucketing
- [x] KV caching
- [x] Unit tests

### Phase 2: Feature Flag Integration (Complete)

- [x] Photo gallery flag
- [x] Kill switch support
- [x] SvelteKit hooks integration

### Phase 3: Admin UI (Planned)

- [ ] Flag listing page (`/admin/flags`)
- [ ] Flag editor with rule builder
- [ ] Percentage slider component
- [ ] Tier selector component
- [ ] Audit log viewer

### Phase 4: Analytics (Planned)

- [ ] Rings integration for flag evaluations
- [ ] Cultivar experiment tracking
- [ ] Conversion metrics per variant

### Phase 5: Domain Component Infrastructure (Complete)

_(Previously: "UI Grafts Infrastructure")_

- [x] Flag registry system (`FLAG_REGISTRY`)
- [x] Registry-to-feature-flag integration
- [x] Package exports structure (domain paths)
- [x] Svelte context helpers
- [x] Core type definitions (`FlagId`, `FlagContext`, `FlagRegistryEntry`)

### Phase 6: PricingGraft (Complete)

- [x] Tier transformation utilities
- [x] LemonSqueezy checkout integration
- [x] PricingGraft orchestrator component
- [x] PricingTable comparison component
- [x] PricingCard individual tier component
- [x] PricingToggle billing switch
- [x] PricingCTA checkout button
- [x] PricingFineprint expandable sections
- [x] Landing page migration (543 → 82 lines)
- [x] Unit tests (74 tests)
- [x] Accessibility improvements
- [x] Migrated to `$lib/platform/pricing/` (The Big Refactor)

### Phase 7: Future Domain Components (Planned)

_(User-facing: "Future UI Grafts")_

- [ ] NavGraft (`$lib/platform/nav/`)
- [ ] FooterGraft (`$lib/platform/footer/`)
- [ ] HeroGraft (`$lib/platform/hero/`)
- [ ] TestimonialGraft (social proof components)

### Phase 8: Greenhouse Mode (Planned)

- [ ] Database schema extension (`greenhouse_tenants` table)
- [ ] `greenhouse_only` column on `feature_flags` table
- [ ] `isInGreenhouse()` API function
- [ ] Greenhouse context in flag evaluation
- [ ] Greenhouse rule type support
- [ ] Wayfinder UI for enrolling tenants in greenhouse mode
- [ ] Transplant workflow (greenhouse → production)

### Phase 9: Self-Serve Flag Controls (Planned)

_(User-facing: "Self-Serve Graft Controls")_

- [ ] Flag control panel in tenant dashboard (greenhouse-only visibility)
- [ ] Toggle UI for feature flags
- [ ] Parameter adjustment UI for configurable flags
- [ ] "Active flags" overview showing what's enabled (user-facing: "Active grafts")
- [ ] Reset to defaults functionality
- [ ] Flag discovery UI (browse available flags to enable)
- [ ] Experimental features badge/indicator

---

## Related Documents

- [Feature Flags Planning Spec](../plans/planning/feature-flags-spec.md) — Original technical spec
- [Loom Pattern](../patterns/loom-durable-objects-pattern.md) — DO coordination
- [Threshold Pattern](../patterns/threshold-pattern.md) — Rate limiting (uses feature flags for configuration)

---

## Museum Exhibit Notes

> **For future inclusion in The Grafts Exhibit, Wing 5: The Personalization Wing**
> _See [docs/museum/MUSEUM.md](/docs/museum/MUSEUM.md) for museum structure_

When The Grafts Exhibit is created (note: the exhibit retains the "Grafts" user-facing name), include this origin story for Dave Mode:

> **On "Dave Mode"**: When Grafts needed a third mode for internal testing, the obvious choice emerged from Grove's history. The very first test tenant created during early development was named "Dave"—chosen as the most wonderfully mundane, generic example name imaginable. When it came time to name the internal testing mode, "Dave mode" felt perfect: unpretentious, memorable, and a small tribute to Grove's earliest days. Externally, we call it "greenhouse mode" (fitting the nature theme), but in commit messages and Slack channels, it's forever Dave mode. Sometimes the best names aren't discovered through careful deliberation—they're already sitting there in your git history, waiting to be recognized.

**Exhibit placement suggestions:**

- Display alongside the Graft Lexicon interactive (user-facing exhibit element)
- Include in the "Names That Found Us" subsection of the Naming Wing (Wing 7) cross-reference
- Consider a "Dave's Corner" Easter egg that reveals this story when visitors click on a hidden greenhouse icon

---

_Orchardists have known for centuries: the right graft makes a tree bear fruit it never could alone. The right splice makes a grove feel like home._
