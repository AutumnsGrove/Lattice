---
title: "Feature Flags Specification"
status: planning
category: features
---

# Feature Flags Specification

```
              ┌──────────────────────────────────────────┐
              │         🚩 Grove Feature Flags           │
              │                                          │
              │   ░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░     │
              │   75% rollout → JXL encoding            │
              │                                          │
              │   Gradual rollouts · Kill switches       │
              │   A/B testing · Per-tenant features      │
              └──────────────────────────────────────────┘
```

**Created**: 2026-01-13
**Status**: Planning
**Priority**: Medium-High (enables JXL rollout, A/B testing, safe deployments)
**Prerequisites**: Tier centralization (for tier-based flags)
**Blocks**: JXL migration (Phase 3), future A/B testing

---

## Table of Contents

1. [Overview](#overview)
2. [Use Cases](#use-cases)
3. [Architecture Decision](#architecture-decision)
4. [Schema Design](#schema-design)
5. [API Design](#api-design)
6. [Evaluation Logic](#evaluation-logic)
7. [Admin UI](#admin-ui)
8. [Caching Strategy](#caching-strategy)
9. [Integration Points](#integration-points)
10. [Implementation Plan](#implementation-plan)
11. [Testing](#testing)
12. [Rollback & Emergency Procedures](#rollback--emergency-procedures)

---

## Overview

### The Problem

Grove lacks infrastructure for controlled feature rollouts. Currently, features are either fully deployed or require code changes to enable/disable. This creates risk:

- **No gradual rollout**: New features affect 100% of users immediately
- **No quick disable**: Problems require code deployments to fix
- **No A/B testing**: Can't compare feature variants
- **No per-tenant control**: Can't give beta features to specific tenants
- **No tier-gated features**: Feature access tied to code, not configuration

### The Solution

A lightweight, Cloudflare-native feature flag system that supports:

- **Global flags**: Enable/disable features platform-wide
- **Tenant flags**: Per-tenant feature access
- **Tier flags**: Features gated by subscription tier
- **Percentage rollouts**: Gradual rollout with deterministic user bucketing
- **Kill switches**: Instant disable without deployment
- **A/B variants**: Multiple values per flag for experimentation

### Design Principles

1. **Cloudflare-native**: KV for fast reads, D1 for configuration
2. **Simple over complex**: No external services, minimal dependencies
3. **Deterministic**: Same user always gets same flag value (for rollouts)
4. **Observable**: All flag evaluations trackable for analytics
5. **Safe defaults**: Unknown flags return false, never break the app

---

## Use Cases

### Immediate (Blocks JXL Migration)

| Use Case        | Flag Type          | Description                            |
| --------------- | ------------------ | -------------------------------------- |
| JXL encoding    | Percentage rollout | Enable JPEG XL for X% of image uploads |
| JXL kill switch | Global boolean     | Instantly disable JXL if issues arise  |

### Near-term

| Use Case          | Flag Type      | Description                                 |
| ----------------- | -------------- | ------------------------------------------- |
| New editor beta   | Tenant boolean | Enable new editor for specific beta tenants |
| Dark mode default | Percentage     | Roll out dark mode preference gradually     |
| Meadow access     | Tier boolean   | Gate Meadow features by subscription tier   |

### Future

| Use Case           | Flag Type         | Description                            |
| ------------------ | ----------------- | -------------------------------------- |
| AI features        | Tier + percentage | Oak+ tiers, 50% rollout initially      |
| Pricing experiment | A/B variant       | Test different pricing displays        |
| Holiday themes     | Time-based        | Enable seasonal themes during holidays |

---

## Architecture Decision

### Options Evaluated

| Option                    | Pros                | Cons                                  |
| ------------------------- | ------------------- | ------------------------------------- |
| **D1 only**               | Simple, SQL queries | Too slow for every request (50-100ms) |
| **KV only**               | Fast reads (1-5ms)  | No admin UI, hard to query            |
| **D1 + KV cache**         | Fast + queryable    | Two systems to manage                 |
| **Durable Objects**       | Real-time, atomic   | Overkill for read-heavy flags         |
| **LaunchDarkly/Statsig**  | Feature-rich        | External dependency, cost, privacy    |
| **Environment variables** | Zero latency        | Requires deployment to change         |

### Chosen: D1 + KV Hybrid

```
┌─────────────────────────────────────────────────────────────────┐
│                    Flag Evaluation Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Request arrives                                                 │
│       ↓                                                          │
│  ┌─────────────┐                                                 │
│  │   KV Cache  │ ← Check KV for flag (1-5ms)                    │
│  └─────────────┘                                                 │
│       │                                                          │
│       ├─ HIT → Return cached value                               │
│       │                                                          │
│       └─ MISS ─┐                                                 │
│                ↓                                                  │
│          ┌─────────────┐                                         │
│          │     D1      │ ← Query flag config                    │
│          └─────────────┘                                         │
│                ↓                                                  │
│          Evaluate rules (tier, tenant, percentage)               │
│                ↓                                                  │
│          Write result to KV (TTL: 60s)                           │
│                ↓                                                  │
│          Return value                                            │
│                                                                  │
│                                                                  │
│  Admin updates flag                                              │
│       ↓                                                          │
│  Update D1 → Invalidate KV keys → Takes effect within 60s       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Why this approach:**

1. **KV provides sub-5ms reads** for hot paths (image processor, middleware)
2. **D1 provides queryable config** for admin UI
3. **60-second TTL** balances freshness with performance
4. **Simple invalidation** - admin changes invalidate affected KV keys
5. **No external dependencies** - everything runs on Cloudflare

---

## Schema Design

### D1 Tables

```sql
-- ============================================================================
-- FEATURE FLAGS SCHEMA
-- ============================================================================

-- Core flags table
CREATE TABLE feature_flags (
  id TEXT PRIMARY KEY,               -- e.g., 'jxl_encoding', 'meadow_access'
  name TEXT NOT NULL,                -- Human-readable name
  description TEXT,                  -- What this flag controls
  flag_type TEXT NOT NULL,           -- 'boolean', 'percentage', 'variant', 'tier', 'json'
  default_value TEXT NOT NULL,       -- Default when no rules match (JSON encoded)
  enabled INTEGER NOT NULL DEFAULT 1, -- Master kill switch (0 = always returns default)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,                   -- User ID who created
  updated_by TEXT                    -- User ID who last updated
);

-- Rules determine flag values based on context
CREATE TABLE flag_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id TEXT NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,  -- Higher priority rules evaluated first
  rule_type TEXT NOT NULL,              -- 'tenant', 'tier', 'percentage', 'user', 'time', 'always'
  rule_value TEXT NOT NULL,             -- JSON: criteria for this rule
  result_value TEXT NOT NULL,           -- JSON: value to return if rule matches
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(flag_id, priority)
);

-- Audit log for flag changes
CREATE TABLE flag_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id TEXT NOT NULL,
  action TEXT NOT NULL,                 -- 'create', 'update', 'delete', 'enable', 'disable'
  old_value TEXT,                       -- JSON: previous state
  new_value TEXT,                       -- JSON: new state
  changed_by TEXT,                      -- User ID
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  reason TEXT                           -- Optional: why the change was made
);

-- Indexes
CREATE INDEX idx_flags_enabled ON feature_flags(enabled);
CREATE INDEX idx_rules_flag ON flag_rules(flag_id, priority DESC);
CREATE INDEX idx_rules_type ON flag_rules(rule_type);
CREATE INDEX idx_audit_flag ON flag_audit_log(flag_id, changed_at DESC);
```

### KV Structure

```
Key format: flag:{flag_id}:{context_hash}
Value: JSON { value: any, evaluatedAt: timestamp, rules: string[] }
TTL: 60 seconds (configurable per flag)

Examples:
  flag:jxl_encoding:global                    → { value: true, ... }
  flag:jxl_encoding:tenant:abc123             → { value: true, ... }
  flag:meadow_access:tier:oak                 → { value: true, ... }
  flag:new_editor:tenant:xyz789               → { value: false, ... }
```

### Type Definitions

```typescript
// libs/engine/src/lib/feature-flags/types.ts

export type FlagType = "boolean" | "percentage" | "variant" | "tier" | "json";

export type RuleType =
	| "tenant" // Specific tenant IDs
	| "tier" // Subscription tiers
	| "percentage" // Gradual rollout
	| "user" // Specific user IDs
	| "time" // Time-based (start/end dates)
	| "always"; // Catch-all default

export interface FeatureFlag {
	id: string;
	name: string;
	description?: string;
	flagType: FlagType;
	defaultValue: unknown;
	enabled: boolean;
	rules: FlagRule[];
	createdAt: Date;
	updatedAt: Date;
}

export interface FlagRule {
	id: number;
	flagId: string;
	priority: number;
	ruleType: RuleType;
	ruleValue: RuleCondition;
	resultValue: unknown;
	enabled: boolean;
}

// Rule conditions vary by type
export type RuleCondition =
	| { tenantIds: string[] } // tenant rule
	| { tiers: TierKey[] } // tier rule
	| { percentage: number; salt?: string } // percentage rule
	| { userIds: string[] } // user rule
	| { startDate?: string; endDate?: string } // time rule
	| Record<string, never>; // always rule (empty)

export interface EvaluationContext {
	tenantId?: string;
	userId?: string;
	tier?: TierKey;
	sessionId?: string; // For anonymous percentage rollouts
	attributes?: Record<string, unknown>; // Custom attributes
}

export interface EvaluationResult<T = unknown> {
	value: T;
	flagId: string;
	matched: boolean;
	matchedRuleId?: number;
	evaluatedAt: Date;
	cached: boolean;
}
```

---

## API Design

### Core Functions

```typescript
// libs/engine/src/lib/feature-flags/index.ts

import type { EvaluationContext, EvaluationResult, FeatureFlag } from "./types.js";

/**
 * Check if a boolean feature is enabled
 * Most common use case - simple on/off flags
 */
export async function isFeatureEnabled(
	flagId: string,
	context: EvaluationContext,
	env: Env,
): Promise<boolean> {
	const result = await evaluateFlag<boolean>(flagId, context, env);
	return result.value === true;
}

/**
 * Get the value of a feature flag (any type)
 * For percentage rollouts, variants, or JSON configs
 */
export async function getFeatureValue<T>(
	flagId: string,
	context: EvaluationContext,
	env: Env,
	defaultValue: T,
): Promise<T> {
	const result = await evaluateFlag<T>(flagId, context, env);
	return result.matched ? result.value : defaultValue;
}

/**
 * Get a variant value for A/B testing
 * Returns the variant key (e.g., 'control', 'treatment_a', 'treatment_b')
 */
export async function getVariant(
	flagId: string,
	context: EvaluationContext,
	env: Env,
): Promise<string> {
	const result = await evaluateFlag<string>(flagId, context, env);
	return result.value ?? "control";
}

/**
 * Batch evaluate multiple flags at once
 * Efficient for pages that need multiple flags
 */
export async function evaluateFlags(
	flagIds: string[],
	context: EvaluationContext,
	env: Env,
): Promise<Map<string, EvaluationResult>> {
	const results = await Promise.all(flagIds.map((id) => evaluateFlag(id, context, env)));
	return new Map(flagIds.map((id, i) => [id, results[i]]));
}

/**
 * Core evaluation function
 * Handles caching, rule evaluation, and logging
 */
export async function evaluateFlag<T>(
	flagId: string,
	context: EvaluationContext,
	env: Env,
): Promise<EvaluationResult<T>> {
	// Implementation details in Evaluation Logic section
}
```

### Usage Examples

```typescript
// In image processor (JXL rollout)
import { isFeatureEnabled } from "$lib/feature-flags";

export async function processImage(file: File, env: Env, context: EvaluationContext) {
	const useJxl = await isFeatureEnabled("jxl_encoding", context, env);

	if (useJxl) {
		return encodeAsJxl(file);
	}
	return encodeAsWebp(file);
}

// In layout (tier-based feature)
import { isFeatureEnabled } from "$lib/feature-flags";

export async function load({ locals, platform }) {
	const canAccessMeadow = await isFeatureEnabled(
		"meadow_access",
		{
			tenantId: locals.tenantId,
			tier: locals.tenant?.tier,
			userId: locals.user?.id,
		},
		platform.env,
	);

	return { canAccessMeadow };
}

// A/B test for pricing page
import { getVariant } from "$lib/feature-flags";

export async function load({ cookies, platform }) {
	const pricingVariant = await getVariant(
		"pricing_experiment",
		{
			sessionId: cookies.get("session_id"),
		},
		platform.env,
	);

	// Returns 'control', 'annual_first', or 'comparison_table'
	return { pricingVariant };
}
```

### SvelteKit Hook Integration

```typescript
// libs/engine/src/hooks.server.ts

import { evaluateFlags } from "$lib/feature-flags";

// Pre-evaluate common flags for all requests
const COMMON_FLAGS = ["meadow_access", "dark_mode_default", "new_nav"];

export async function handle({ event, resolve }) {
	// ... existing auth/tenant logic ...

	// Evaluate common flags once per request
	const context = {
		tenantId: event.locals.tenantId,
		userId: event.locals.user?.id,
		tier: event.locals.tenant?.tier,
		sessionId: event.cookies.get("session_id"),
	};

	const flags = await evaluateFlags(COMMON_FLAGS, context, event.platform.env);
	event.locals.flags = flags;

	return resolve(event);
}

// Access in any route
export async function load({ locals }) {
	const { flags } = locals;
	return {
		canAccessMeadow: flags.get("meadow_access")?.value ?? false,
	};
}
```

---

## Evaluation Logic

### Rule Evaluation Algorithm

```typescript
// libs/engine/src/lib/feature-flags/evaluate.ts

export async function evaluateFlag<T>(
	flagId: string,
	context: EvaluationContext,
	env: Env,
): Promise<EvaluationResult<T>> {
	const startTime = performance.now();

	// 1. Check KV cache first
	const cacheKey = buildCacheKey(flagId, context);
	const cached = await env.FLAGS_KV.get(cacheKey, "json");

	if (cached && !isCacheExpired(cached)) {
		return { ...cached, cached: true };
	}

	// 2. Load flag from D1
	const flag = await loadFlagWithRules(flagId, env.DB);

	if (!flag) {
		// Unknown flag - return safe default
		return {
			value: false as T,
			flagId,
			matched: false,
			evaluatedAt: new Date(),
			cached: false,
		};
	}

	// 3. Check master kill switch
	if (!flag.enabled) {
		return cacheAndReturn(
			cacheKey,
			{
				value: flag.defaultValue as T,
				flagId,
				matched: false,
				evaluatedAt: new Date(),
				cached: false,
			},
			env,
		);
	}

	// 4. Evaluate rules in priority order
	const sortedRules = flag.rules.filter((r) => r.enabled).sort((a, b) => b.priority - a.priority);

	for (const rule of sortedRules) {
		const matches = evaluateRule(rule, context);

		if (matches) {
			return cacheAndReturn(
				cacheKey,
				{
					value: rule.resultValue as T,
					flagId,
					matched: true,
					matchedRuleId: rule.id,
					evaluatedAt: new Date(),
					cached: false,
				},
				env,
			);
		}
	}

	// 5. No rules matched - use default
	return cacheAndReturn(
		cacheKey,
		{
			value: flag.defaultValue as T,
			flagId,
			matched: false,
			evaluatedAt: new Date(),
			cached: false,
		},
		env,
	);
}

function evaluateRule(rule: FlagRule, context: EvaluationContext): boolean {
	switch (rule.ruleType) {
		case "tenant":
			return evaluateTenantRule(rule.ruleValue, context);
		case "tier":
			return evaluateTierRule(rule.ruleValue, context);
		case "percentage":
			return evaluatePercentageRule(rule.ruleValue, context);
		case "user":
			return evaluateUserRule(rule.ruleValue, context);
		case "time":
			return evaluateTimeRule(rule.ruleValue);
		case "always":
			return true;
		default:
			return false;
	}
}
```

### Percentage Rollout (Deterministic Hashing)

```typescript
// libs/engine/src/lib/feature-flags/percentage.ts

import { createHash } from "crypto";

/**
 * Deterministic percentage evaluation
 * Same user/tenant always gets same result for same flag
 */
function evaluatePercentageRule(
	condition: { percentage: number; salt?: string },
	context: EvaluationContext,
): boolean {
	const { percentage, salt = "" } = condition;

	// Build stable identifier
	// Priority: userId > tenantId > sessionId
	const identifier = context.userId ?? context.tenantId ?? context.sessionId ?? "";

	if (!identifier) {
		// No identifier - random assignment (not recommended)
		return Math.random() * 100 < percentage;
	}

	// Hash identifier with flag-specific salt for independence
	const hash = createHash("sha256").update(`${salt}:${identifier}`).digest();

	// Use first 4 bytes as uint32, mod 100 for percentage
	const bucket = hash.readUInt32BE(0) % 100;

	return bucket < percentage;
}

/**
 * Get exact bucket for debugging/logging
 */
export function getUserBucket(flagId: string, identifier: string): number {
	const hash = createHash("sha256").update(`${flagId}:${identifier}`).digest();
	return hash.readUInt32BE(0) % 100;
}
```

### Tier-Based Evaluation

```typescript
// libs/engine/src/lib/feature-flags/tier.ts

import { TIER_ORDER, type TierKey } from "../config/tiers.js";

function evaluateTierRule(condition: { tiers: TierKey[] }, context: EvaluationContext): boolean {
	if (!context.tier) return false;

	const { tiers } = condition;

	// Check if user's tier is in allowed list
	return tiers.includes(context.tier);
}

/**
 * Helper: Check if tier is at or above minimum
 * Useful for "oak_and_above" type rules
 */
export function isTierAtLeast(userTier: TierKey, minimumTier: TierKey): boolean {
	const userIndex = TIER_ORDER.indexOf(userTier);
	const minIndex = TIER_ORDER.indexOf(minimumTier);
	return userIndex >= minIndex;
}
```

---

## Admin UI

### Flag Management Interface

Location: `/admin/flags` (new route in engine admin panel)

```svelte
<!-- libs/engine/src/routes/admin/flags/+page.svelte -->
<script lang="ts">
	import { GlassCard, GlassButton, GlassInput } from "$lib/ui/components/ui";
	import { Toggle, Badge } from "$lib/ui/components/ui";

	let { data } = $props();
	let flags = $state(data.flags);
	let search = $state("");

	const filteredFlags = $derived(
		flags.filter(
			(f) =>
				f.name.toLowerCase().includes(search.toLowerCase()) ||
				f.id.toLowerCase().includes(search.toLowerCase()),
		),
	);
</script>

<div class="p-6 space-y-6">
	<header class="flex justify-between items-center">
		<div>
			<h1 class="text-2xl font-semibold">Feature Flags</h1>
			<p class="text-grove-600 dark:text-grove-400">Control feature rollouts and experiments</p>
		</div>
		<GlassButton href="/admin/flags/new">Create Flag</GlassButton>
	</header>

	<GlassCard>
		<GlassInput bind:value={search} placeholder="Search flags..." class="mb-4" />

		<table class="w-full">
			<thead class="glass-surface">
				<tr>
					<th class="text-left p-3">Flag</th>
					<th class="text-left p-3">Type</th>
					<th class="text-left p-3">Status</th>
					<th class="text-left p-3">Rules</th>
					<th class="text-left p-3">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredFlags as flag}
					<tr class="border-t border-white/10">
						<td class="p-3">
							<div class="font-medium">{flag.name}</div>
							<div class="text-sm text-gray-500">{flag.id}</div>
						</td>
						<td class="p-3">
							<Badge variant={flag.flagType}>{flag.flagType}</Badge>
						</td>
						<td class="p-3">
							<Toggle checked={flag.enabled} onchange={() => toggleFlag(flag.id)} />
						</td>
						<td class="p-3">
							{flag.rules.length} rule{flag.rules.length !== 1 ? "s" : ""}
						</td>
						<td class="p-3">
							<GlassButton variant="ghost" href="/admin/flags/{flag.id}">Edit</GlassButton>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</GlassCard>
</div>
```

### Flag Editor

```svelte
<!-- libs/engine/src/routes/admin/flags/[id]/+page.svelte -->
<script lang="ts">
	import RuleEditor from "./RuleEditor.svelte";
	import PercentageSlider from "./PercentageSlider.svelte";
	import TierSelector from "./TierSelector.svelte";
	import TenantPicker from "./TenantPicker.svelte";

	let { data } = $props();
	let flag = $state(data.flag);
	let rules = $state(data.rules);
	let showAddRule = $state(false);
	let changeReason = $state("");
</script>

<div class="p-6 max-w-4xl mx-auto space-y-6">
	<GlassCard>
		<h2 class="text-xl font-semibold mb-4">Flag Settings</h2>

		<div class="space-y-4">
			<GlassInput
				label="Flag ID"
				value={flag.id}
				disabled
				hint="Cannot be changed after creation"
			/>

			<GlassInput label="Display Name" bind:value={flag.name} />

			<GlassInput label="Description" bind:value={flag.description} multiline />

			<div class="flex items-center justify-between p-4 bg-white/5 rounded-lg">
				<div>
					<div class="font-medium">Master Kill Switch</div>
					<div class="text-sm text-gray-500">When disabled, flag always returns default value</div>
				</div>
				<Toggle bind:checked={flag.enabled} />
			</div>

			<div>
				<label class="block text-sm font-medium mb-2">Default Value</label>
				{#if flag.flagType === "boolean"}
					<Toggle bind:checked={flag.defaultValue} />
				{:else if flag.flagType === "percentage"}
					<PercentageSlider bind:value={flag.defaultValue} />
				{:else}
					<GlassInput bind:value={flag.defaultValue} />
				{/if}
			</div>
		</div>
	</GlassCard>

	<GlassCard>
		<div class="flex justify-between items-center mb-4">
			<h2 class="text-xl font-semibold">Rules</h2>
			<GlassButton onclick={() => (showAddRule = true)}>Add Rule</GlassButton>
		</div>

		<p class="text-sm text-gray-500 mb-4">
			Rules are evaluated in priority order (highest first). First matching rule determines the flag
			value.
		</p>

		<div class="space-y-3">
			{#each rules.sort((a, b) => b.priority - a.priority) as rule}
				<RuleEditor
					{rule}
					flagType={flag.flagType}
					onupdate={(r) => updateRule(r)}
					ondelete={() => deleteRule(rule.id)}
				/>
			{/each}

			{#if rules.length === 0}
				<div class="text-center py-8 text-gray-500">
					No rules configured. Flag will always return default value.
				</div>
			{/if}
		</div>
	</GlassCard>

	<GlassCard>
		<h2 class="text-xl font-semibold mb-4">Save Changes</h2>

		<GlassInput
			label="Change Reason (optional)"
			bind:value={changeReason}
			placeholder="Why are you making this change?"
			hint="Recorded in audit log"
		/>

		<div class="flex gap-3 mt-4">
			<GlassButton variant="primary" onclick={saveFlag}>Save Changes</GlassButton>
			<GlassButton variant="ghost" href="/admin/flags">Cancel</GlassButton>
		</div>
	</GlassCard>

	<!-- Audit Log -->
	<GlassCard>
		<h2 class="text-xl font-semibold mb-4">Audit Log</h2>
		<div class="space-y-2 text-sm">
			{#each data.auditLog as entry}
				<div class="flex justify-between p-2 bg-white/5 rounded">
					<span>{entry.action} by {entry.changed_by}</span>
					<span class="text-gray-500">{formatDate(entry.changed_at)}</span>
				</div>
			{/each}
		</div>
	</GlassCard>
</div>
```

### Rule Types UI Components

```svelte
<!-- PercentageSlider.svelte -->
<script lang="ts">
  let { value = $bindable(0), flagId = '', onChange } = $props();

  // Show preview of which users would be in this percentage
  const previewUsers = $derived(
    value > 0 ? `~${value}% of users/tenants will see this` : 'No users'
  );
</script>

<div class="space-y-2">
  <div class="flex items-center gap-4">
    <input
      type="range"
      min="0"
      max="100"
      bind:value
      class="flex-1"
    />
    <span class="w-16 text-right font-mono">{value}%</span>
  </div>

  <!-- Visual progress bar -->
  <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
    <div
      class="h-full bg-grove-500 transition-all"
      style="width: {value}%"
    />
  </div>

  <p class="text-sm text-gray-500">{previewUsers}</p>
</div>

<!-- TierSelector.svelte -->
<script lang="ts">
  import { TIERS, TIER_ORDER } from '$lib/config/tiers';

  let { selected = $bindable([]) } = $props();

  function toggleTier(tier: string) {
    if (selected.includes(tier)) {
      selected = selected.filter(t => t !== tier);
    } else {
      selected = [...selected, tier];
    }
  }
</script>

<div class="flex flex-wrap gap-2">
  {#each TIER_ORDER as tier}
    <button
      class="px-3 py-1.5 rounded-full text-sm transition-colors
             {selected.includes(tier)
               ? 'bg-grove-500 text-white'
               : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'}"
      onclick={() => toggleTier(tier)}
    >
      {TIERS[tier].display.name}
    </button>
  {/each}
</div>
```

---

## Caching Strategy

### KV Cache Design

```typescript
// libs/engine/src/lib/feature-flags/cache.ts

const DEFAULT_TTL = 60; // seconds
const INSTANT_FLAGS = new Set(["jxl_kill_switch", "maintenance_mode"]); // No caching

interface CachedValue<T> {
	value: T;
	flagId: string;
	matched: boolean;
	matchedRuleId?: number;
	evaluatedAt: string;
	expiresAt: string;
}

export function buildCacheKey(flagId: string, context: EvaluationContext): string {
	// Build deterministic cache key from context
	const parts = ["flag", flagId];

	if (context.tenantId) parts.push("tenant", context.tenantId);
	if (context.tier) parts.push("tier", context.tier);
	if (context.userId) parts.push("user", context.userId);

	// If no context, use 'global'
	if (parts.length === 2) parts.push("global");

	return parts.join(":");
}

export async function cacheResult<T>(
	key: string,
	result: EvaluationResult<T>,
	env: Env,
): Promise<void> {
	// Skip caching for instant flags
	if (INSTANT_FLAGS.has(result.flagId)) return;

	const ttl = await getFlagTTL(result.flagId, env);
	const cached: CachedValue<T> = {
		...result,
		evaluatedAt: result.evaluatedAt.toISOString(),
		expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
	};

	await env.FLAGS_KV.put(key, JSON.stringify(cached), {
		expirationTtl: ttl,
	});
}

export async function invalidateFlag(flagId: string, env: Env): Promise<void> {
	// List all keys for this flag and delete them
	const list = await env.FLAGS_KV.list({ prefix: `flag:${flagId}:` });

	await Promise.all(list.keys.map((key) => env.FLAGS_KV.delete(key.name)));

	console.log(`Invalidated ${list.keys.length} cache entries for flag ${flagId}`);
}
```

### Cache Invalidation Triggers

```typescript
// libs/engine/src/routes/admin/flags/[id]/+page.server.ts

export const actions = {
	save: async ({ request, params, platform }) => {
		const formData = await request.formData();
		const flagId = params.id;

		// Update D1
		await updateFlagInD1(flagId, formData, platform.env.DB);

		// Invalidate KV cache
		await invalidateFlag(flagId, platform.env);

		// Log to audit
		await logFlagChange(flagId, "update", formData.get("reason"), platform.env.DB);

		return { success: true };
	},

	toggle: async ({ params, platform }) => {
		const flagId = params.id;

		// Toggle enabled state
		await toggleFlagEnabled(flagId, platform.env.DB);

		// Invalidate immediately
		await invalidateFlag(flagId, platform.env);

		return { success: true };
	},
};
```

---

## Integration Points

### 1. JXL Migration

```typescript
// libs/engine/src/lib/utils/imageProcessor.ts

import { isFeatureEnabled } from "$lib/feature-flags";

export async function processImage(
	file: File,
	options: ProcessImageOptions,
	context: { env: Env; tenantId?: string; userId?: string },
): Promise<ProcessedImageResult> {
	// Check kill switch first (no caching, instant response)
	const isKilled = await isFeatureEnabled("jxl_kill_switch", {}, context.env);
	if (isKilled) {
		return processImageAsWebP(file, options);
	}

	// Check percentage rollout
	const useJxl = await isFeatureEnabled(
		"jxl_encoding",
		{
			tenantId: context.tenantId,
			userId: context.userId,
		},
		context.env,
	);

	if (useJxl && (await supportsJxlEncoding())) {
		return processImageAsJxl(file, options);
	}

	return processImageAsWebP(file, options);
}
```

### 2. Tier-Based Features

```typescript
// libs/engine/src/routes/meadow/+layout.server.ts

import { isFeatureEnabled } from "$lib/feature-flags";
import { redirect } from "@sveltejs/kit";

export async function load({ locals, platform }) {
	const canAccessMeadow = await isFeatureEnabled(
		"meadow_access",
		{
			tenantId: locals.tenantId,
			tier: locals.tenant?.tier,
			userId: locals.user?.id,
		},
		platform.env,
	);

	if (!canAccessMeadow) {
		throw redirect(302, "/upgrade?feature=meadow");
	}

	return {
		/* meadow data */
	};
}
```

### 3. Analytics Integration (Rings)

```typescript
// libs/engine/src/lib/feature-flags/analytics.ts

import { trackEvent } from "$lib/analytics/rings";

export async function logFlagEvaluation(
	result: EvaluationResult,
	context: EvaluationContext,
): Promise<void> {
	// Only log non-cached evaluations to reduce volume
	if (result.cached) return;

	await trackEvent({
		event: "flag_evaluation",
		flagId: result.flagId,
		value: result.value,
		matched: result.matched,
		matchedRuleId: result.matchedRuleId,
		tenantId: context.tenantId,
		tier: context.tier,
		// Don't log userId for privacy
	});
}

// Dashboard query for flag effectiveness
const FLAG_ANALYTICS_QUERY = `
  SELECT
    flagId,
    value,
    COUNT(*) as evaluations,
    COUNT(DISTINCT tenantId) as unique_tenants
  FROM flag_evaluations
  WHERE evaluatedAt > datetime('now', '-7 days')
  GROUP BY flagId, value
`;
```

### 4. A/B Testing

```typescript
// libs/engine/src/routes/pricing/+page.server.ts

import { getVariant } from "$lib/feature-flags";

export async function load({ cookies, platform }) {
	// Get pricing page variant
	const variant = await getVariant(
		"pricing_experiment",
		{
			sessionId: cookies.get("session_id"),
		},
		platform.env,
	);

	// Track exposure for analytics
	await trackExposure("pricing_experiment", variant, platform.env);

	// Return variant-specific data
	switch (variant) {
		case "annual_first":
			return { showAnnualFirst: true, showComparison: false };
		case "comparison_table":
			return { showAnnualFirst: false, showComparison: true };
		default: // 'control'
			return { showAnnualFirst: false, showComparison: false };
	}
}
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (4-6 hours)

**Goal:** Basic flag evaluation working without admin UI

#### Step 1.1: Create D1 Schema

```bash
# Create migration
touch libs/engine/migrations/XXX_feature_flags.sql
```

#### Step 1.2: Create Type Definitions

```bash
# Create types file
touch libs/engine/src/lib/feature-flags/types.ts
```

#### Step 1.3: Implement Evaluation Logic

```bash
# Core evaluation functions
touch libs/engine/src/lib/feature-flags/evaluate.ts
touch libs/engine/src/lib/feature-flags/percentage.ts
touch libs/engine/src/lib/feature-flags/cache.ts
touch libs/engine/src/lib/feature-flags/index.ts
```

#### Step 1.4: Add KV Binding

Update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "FLAGS_KV"
id = "xxx"  # Create in Cloudflare Dashboard
```

#### Step 1.5: Write Unit Tests

```bash
touch libs/engine/src/lib/feature-flags/evaluate.test.ts
```

### Phase 2: Admin UI (3-4 hours)

**Goal:** Basic flag management interface

#### Step 2.1: Create Admin Routes

```bash
mkdir -p libs/engine/src/routes/admin/flags
touch libs/engine/src/routes/admin/flags/+page.svelte
touch libs/engine/src/routes/admin/flags/+page.server.ts
touch libs/engine/src/routes/admin/flags/[id]/+page.svelte
touch libs/engine/src/routes/admin/flags/[id]/+page.server.ts
touch libs/engine/src/routes/admin/flags/new/+page.svelte
```

#### Step 2.2: Create UI Components

```bash
touch libs/engine/src/routes/admin/flags/RuleEditor.svelte
touch libs/engine/src/routes/admin/flags/PercentageSlider.svelte
touch libs/engine/src/routes/admin/flags/TierSelector.svelte
```

#### Step 2.3: Add Navigation Link

Update admin sidebar to include flags link.

### Phase 3: Integration (2-3 hours)

**Goal:** Connect to existing systems

#### Step 3.1: Create Initial Flags

```sql
-- Seed data for initial flags
INSERT INTO feature_flags (id, name, description, flag_type, default_value, enabled)
VALUES
  ('jxl_encoding', 'JPEG XL Encoding', 'Enable JXL image compression', 'boolean', 'false', 0),
  ('jxl_kill_switch', 'JXL Kill Switch', 'Emergency disable for JXL', 'boolean', 'false', 1),
  ('meadow_access', 'Meadow Access', 'Enable Meadow social features', 'boolean', 'false', 0);
```

#### Step 3.2: Update JXL Migration Code

Integrate feature flag checks into image processor.

#### Step 3.3: Add Hooks Integration

Pre-evaluate common flags in server hooks.

### Phase 4: Polish (1-2 hours)

**Goal:** Production readiness

- [ ] Add flag audit logging
- [ ] Add Rings analytics integration
- [ ] Add flag validation (prevent invalid configurations)
- [ ] Add export/import for flag configurations
- [ ] Documentation in knowledge base

---

## Testing

### Unit Tests

```typescript
// libs/engine/src/lib/feature-flags/evaluate.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateFlag, isFeatureEnabled } from "./index";
import { createMockEnv } from "../test-utils";

describe("Feature Flags", () => {
	let mockEnv: ReturnType<typeof createMockEnv>;

	beforeEach(() => {
		mockEnv = createMockEnv();
	});

	describe("isFeatureEnabled", () => {
		it("returns false for unknown flags", async () => {
			const result = await isFeatureEnabled("unknown_flag", {}, mockEnv);
			expect(result).toBe(false);
		});

		it("returns default value when flag is disabled", async () => {
			mockEnv.DB.prepare.mockReturnValueOnce({
				first: () => ({ enabled: 0, default_value: "true" }),
			});

			const result = await isFeatureEnabled("test_flag", {}, mockEnv);
			expect(result).toBe(true); // default_value
		});

		it("caches results in KV", async () => {
			mockEnv.DB.prepare.mockReturnValueOnce({
				first: () => ({ enabled: 1, default_value: "true", flag_type: "boolean" }),
			});

			await isFeatureEnabled("test_flag", {}, mockEnv);

			expect(mockEnv.FLAGS_KV.put).toHaveBeenCalledWith(
				expect.stringContaining("flag:test_flag"),
				expect.any(String),
				expect.objectContaining({ expirationTtl: 60 }),
			);
		});
	});

	describe("percentage rollout", () => {
		it("is deterministic for same identifier", async () => {
			// Flag with 50% rollout
			mockEnv.DB.prepare.mockReturnValue({
				first: () => ({
					enabled: 1,
					default_value: "false",
					flag_type: "boolean",
				}),
				all: () => ({
					results: [
						{
							rule_type: "percentage",
							rule_value: JSON.stringify({ percentage: 50 }),
							result_value: "true",
							enabled: 1,
							priority: 1,
						},
					],
				}),
			});

			const context = { userId: "user123" };

			// Same user should always get same result
			const results = await Promise.all([
				isFeatureEnabled("test_rollout", context, mockEnv),
				isFeatureEnabled("test_rollout", context, mockEnv),
				isFeatureEnabled("test_rollout", context, mockEnv),
			]);

			// All results should be identical
			expect(results.every((r) => r === results[0])).toBe(true);
		});

		it("distributes approximately correctly over population", async () => {
			// Test statistical distribution
			const results = [];
			for (let i = 0; i < 1000; i++) {
				const result = await isFeatureEnabled(
					"test_rollout",
					{
						userId: `user_${i}`,
					},
					mockEnv,
				);
				results.push(result);
			}

			const enabledCount = results.filter(Boolean).length;
			// Should be ~500 (50%), allow 10% variance
			expect(enabledCount).toBeGreaterThan(400);
			expect(enabledCount).toBeLessThan(600);
		});
	});

	describe("tier rules", () => {
		it("matches correct tiers", async () => {
			mockEnv.DB.prepare.mockReturnValue({
				first: () => ({ enabled: 1, default_value: "false", flag_type: "boolean" }),
				all: () => ({
					results: [
						{
							rule_type: "tier",
							rule_value: JSON.stringify({ tiers: ["oak", "evergreen"] }),
							result_value: "true",
							enabled: 1,
							priority: 1,
						},
					],
				}),
			});

			const oakResult = await isFeatureEnabled("premium_feature", { tier: "oak" }, mockEnv);
			const seedlingResult = await isFeatureEnabled(
				"premium_feature",
				{ tier: "seedling" },
				mockEnv,
			);

			expect(oakResult).toBe(true);
			expect(seedlingResult).toBe(false);
		});
	});
});
```

### Integration Tests

```typescript
// libs/engine/src/lib/feature-flags/integration.test.ts

describe("Flag Admin Integration", () => {
	it("creates flag and evaluates correctly", async () => {
		// Create flag via API
		await fetch("/admin/api/flags", {
			method: "POST",
			body: JSON.stringify({
				id: "test_flag",
				name: "Test Flag",
				flagType: "boolean",
				defaultValue: false,
				enabled: true,
			}),
		});

		// Add rule
		await fetch("/admin/api/flags/test_flag/rules", {
			method: "POST",
			body: JSON.stringify({
				ruleType: "tenant",
				ruleValue: { tenantIds: ["tenant1"] },
				resultValue: true,
				priority: 1,
			}),
		});

		// Evaluate
		const result1 = await isFeatureEnabled("test_flag", { tenantId: "tenant1" }, env);
		const result2 = await isFeatureEnabled("test_flag", { tenantId: "tenant2" }, env);

		expect(result1).toBe(true);
		expect(result2).toBe(false);
	});

	it("invalidates cache on update", async () => {
		// ... test cache invalidation
	});
});
```

---

## Rollback & Emergency Procedures

### Kill Switch Usage

For emergency situations, every flag has a master kill switch (`enabled` field).

```typescript
// Emergency disable via admin API
await fetch('/admin/api/flags/jxl_encoding/disable', {
  method: 'POST',
  headers: { 'X-Emergency': 'true' }
});

// Or directly in D1
UPDATE feature_flags SET enabled = 0 WHERE id = 'jxl_encoding';
```

### Manual Cache Clear

If cache invalidation fails:

```bash
# Clear all flag caches via wrangler
wrangler kv:key list --namespace-id=FLAGS_KV_ID --prefix="flag:" | \
  jq -r '.[].name' | \
  xargs -I {} wrangler kv:key delete --namespace-id=FLAGS_KV_ID {}
```

### Rollback Procedure

1. **Identify the problem flag** - Check error logs, Rings analytics
2. **Disable flag master switch** - Admin UI → Flag → Toggle off
3. **Verify cache invalidation** - Check KV keys are cleared
4. **Monitor error rates** - Should drop within 60 seconds
5. **Post-mortem** - Document what went wrong, fix rule configuration

### Emergency Contacts

If feature flags are causing outages:

1. Disable affected flag via admin UI
2. If admin UI is down, update D1 directly via Wrangler
3. Clear KV cache manually if needed
4. All flag changes are logged in `flag_audit_log`

---

## Future Enhancements

### Not in Scope (v1)

- **Scheduling** - Time-based flag activation (can add later)
- **Mutual exclusion** - Flags that can't be enabled together
- **Gradual ramp-up** - Auto-increase percentage over time
- **Segment targeting** - Complex user attribute matching
- **Multi-variate testing** - Beyond simple A/B variants

### Potential v2 Features

| Feature               | Use Case                         | Complexity |
| --------------------- | -------------------------------- | ---------- |
| Scheduled activation  | Holiday features                 | Low        |
| Webhook notifications | Slack alerts on changes          | Low        |
| Flag dependencies     | Feature A requires Feature B     | Medium     |
| Geographic targeting  | Enable by country/region         | Medium     |
| Staged rollout        | Auto-ramp 10% → 25% → 50% → 100% | High       |

---

## Summary

This feature flag system provides Grove with:

- **Safe deployments** via percentage rollouts and kill switches
- **Tier-gated features** that integrate with the subscription system
- **A/B testing** capability for product experiments
- **Audit logging** for compliance and debugging
- **Fast evaluation** via KV caching (sub-5ms reads)
- **Simple admin UI** that matches Grove's design language

The system is intentionally simple - it solves Grove's immediate needs (JXL rollout, tier features) without over-engineering for hypothetical future requirements.

---

_Document version: 1.0_
_Created: 2026-01-13_
_Author: Claude (AI-assisted planning)_
