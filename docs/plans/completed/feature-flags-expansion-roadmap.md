# Feature Flags Expansion Roadmap

```
           ┌─────────────────────────────────────────────┐
           │      🚩 Feature Flags Expansion Plan        │
           │                                             │
           │   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
           │   │ JXL │ │ 🍋  │ │ DO  │ │ 🌿  │ │ 🛒  │  │
           │   │ ✓   │ │     │ │     │ │     │ │     │  │
           │   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │
           │                                             │
           │   Infrastructure flags for safe rollouts    │
           └─────────────────────────────────────────────┘
```

**Created**: 2026-01-13
**Status**: Planning
**Priority**: High (enables safe deployment of 10+ features)
**Prerequisites**: Feature flags infrastructure (✅ DEPLOYED - migration 018)
**Related**: `docs/plans/feature-flags-spec.md` (core spec)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State](#current-state)
3. [Flag Categories](#flag-categories)
4. [Detailed Flag Specifications](#detailed-flag-specifications)
5. [Migration SQL](#migration-sql)
6. [Integration Patterns](#integration-patterns)
7. [Rollout Strategy](#rollout-strategy)
8. [Admin UI Enhancements](#admin-ui-enhancements)

---

## Executive Summary

### The Opportunity

Grove has **13+ features** either built or nearly built that are waiting for safe rollout mechanisms. With feature flags infrastructure now deployed, we can:

1. **Ship faster** — Deploy code without enabling features
2. **Test safely** — Beta test with specific tenants/tiers
3. **Rollback instantly** — Kill switches without deployments
4. **Gate by tier** — Premium features without hardcoding

### What's Already Deployed

| Component                         | Status        |
| --------------------------------- | ------------- |
| D1 Schema (018_feature_flags.sql) | ✅ Deployed   |
| FLAGS_KV namespace                | ✅ Created    |
| wrangler.toml binding             | ✅ Configured |
| Seed flags (3)                    | ✅ Inserted   |

### Current Seeded Flags

| ID                | Name             | Enabled | Purpose                                 |
| ----------------- | ---------------- | ------- | --------------------------------------- |
| `jxl_encoding`    | JPEG XL Encoding | ❌ (0)  | Percentage rollout for new image format |
| `jxl_kill_switch` | JXL Kill Switch  | ✅ (1)  | Emergency disable (enabled = JXL OFF)   |
| `meadow_access`   | Meadow Access    | ❌ (0)  | Tier-gated social features              |

---

## Current State

### Codebase Exploration Results

After thorough exploration of TODOS.md, specs, and existing code, we identified **13 features** that need flags:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Feature Flag Candidates                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  READY TO SHIP (code complete)                                  │
│  ├── JXL Encoding .............. percentage rollout             │
│  ├── Lemon Squeezy ............. provider switch               │
│  └── Shop ...................... global toggle                  │
│                                                                  │
│  INFRASTRUCTURE (safety nets)                                   │
│  ├── Durable Objects ........... per-DO-type toggles           │
│  ├── Rate Limiting ............. enforcement toggle            │
│  └── Comments .................. global + moderation           │
│                                                                  │
│  TIER-GATED (premium features)                                  │
│  ├── Meadow Access ............. oak+ only                     │
│  ├── Custom Domains ............ oak+ only                     │
│  ├── Custom Fonts .............. evergreen only                │
│  └── Nav Page Limits ........... tier-based config            │
│                                                                  │
│  BETA FEATURES (invite-only)                                    │
│  ├── Trails .................... beta tenant list              │
│  ├── Ivy (Email) ............... beta access                   │
│  └── Clearing Admin ............ internal only                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flag Categories

### Category 1: Percentage Rollouts

For gradual feature deployment with deterministic user bucketing.

| Flag ID           | Default | Use Case                  |
| ----------------- | ------- | ------------------------- |
| `jxl_encoding`    | 0%      | JPEG XL image compression |
| `new_editor_beta` | 0%      | Rich text editor v2       |

### Category 2: Kill Switches

Emergency disables — **enabled = feature OFF**. No caching, instant effect.

| Flag ID                | Default | What it kills               |
| ---------------------- | ------- | --------------------------- |
| `jxl_kill_switch`      | ON      | JXL encoding (safety valve) |
| `payments_kill_switch` | OFF     | All payment processing      |
| `uploads_kill_switch`  | OFF     | Image/file uploads          |

### Category 3: Tier-Gated Features

Premium features controlled by subscription tier.

| Flag ID            | Tiers          | Feature               |
| ------------------ | -------------- | --------------------- |
| `meadow_access`    | oak, evergreen | Social features       |
| `custom_domains`   | oak, evergreen | Custom domain support |
| `custom_fonts`     | evergreen      | Font uploads          |
| `theme_customizer` | sapling+       | Advanced theming      |

### Category 5: Beta Access

Tenant-list gated for invite-only features.

| Flag ID           | Access      | Feature             |
| ----------------- | ----------- | ------------------- |
| `trails_beta`     | Tenant list | Personal roadmaps   |
| `ivy_beta`        | Tenant list | Email service       |
| `clearing_admin`  | Tenant list | Status page admin   |
| `rings_dashboard` | Tenant list | Analytics dashboard |

### Category 6: Infrastructure Toggles

Enable/disable infrastructure components independently.

| Flag ID                    | Default | Component                |
| -------------------------- | ------- | ------------------------ |
| `durable_objects_sessions` | OFF     | SessionDO for auth       |
| `durable_objects_tenants`  | OFF     | TenantDO for caching     |
| `durable_objects_posts`    | OFF     | PostMetaDO/PostContentDO |
| `rate_limiting_strict`     | OFF     | Enforce tier rate limits |

---

## Detailed Flag Specifications

### 1. Shop Feature (`shop_enabled`)

**Purpose:** Re-enable e-commerce functionality when ready.

**Type:** Boolean

**Current State:** Routes return 503 "Coming Soon"

**Files:**

- `libs/engine/src/routes/api/shop/+server.ts`
- `libs/engine/src/routes/[username]/shop/+page.svelte`

```typescript
// In shop route loader
const shopEnabled = await isFeatureEnabled(
	"shop_enabled",
	{
		tenantId: locals.tenantId,
		tier: locals.tenant?.tier,
	},
	platform.env,
);

if (!shopEnabled) {
	throw redirect(302, "/upgrade?feature=shop");
}
```

**Rules:**
| Priority | Rule | Result |
|----------|------|--------|
| 100 | Global disabled | false |
| 50 | Tier: oak, evergreen | true |
| 10 | Default | false |

---

### 2. Durable Objects Toggles

**Purpose:** Phased DO rollout with per-component control.

**Architecture:** 5 DO types, each with independent flag.

| Flag                           | DO Class      | Purpose                    |
| ------------------------------ | ------------- | -------------------------- |
| `durable_objects_sessions`     | SessionDO     | Auth session management    |
| `durable_objects_tenants`      | TenantDO      | Tenant config caching      |
| `durable_objects_post_meta`    | PostMetaDO    | Reactions, views, presence |
| `durable_objects_post_content` | PostContentDO | Content caching            |
| `durable_objects_analytics`    | AnalyticsDO   | Event buffering            |

**Integration Pattern:**

```typescript
// In hooks.server.ts
const useSessionDO = await isFeatureEnabled("durable_objects_sessions", {}, env);

if (useSessionDO) {
	// Use Durable Object for session
	const sessionDO = env.SESSIONS.get(env.SESSIONS.idFromName(sessionId));
	session = await sessionDO.fetch("/validate");
} else {
	// Fall back to D1 direct query
	session = await validateSessionD1(sessionId, env.DB);
}
```

**Rollout Order:**

1. `durable_objects_sessions` — Highest impact, test first
2. `durable_objects_tenants` — Config caching
3. `durable_objects_post_meta` — Hot data (reactions)
4. `durable_objects_post_content` — Warm data (content)
5. `durable_objects_analytics` — Buffering (lowest priority)

---

### 3. Custom Domains (`custom_domains`)

**Purpose:** Gate Cloudflare for SaaS feature by tier.

**Type:** Tier-gated boolean

**Cost Implication:** $0.10/hostname/month

**Rules:**
| Priority | Rule | Result |
|----------|------|--------|
| 50 | Tier: oak, evergreen | true |
| 10 | Default | false |

**Integration:**

```typescript
// In domain setup flow
const canUseCustomDomain = await isFeatureEnabled(
	"custom_domains",
	{
		tenantId,
		tier: tenant.tier,
	},
	env,
);

if (!canUseCustomDomain) {
	return { error: "Custom domains require Oak or Evergreen plan" };
}
```

---

### 4. Rate Limiting Enforcement (`rate_limiting_strict`)

**Purpose:** Gradually enforce tier-based rate limits.

**Current State:** Rate limit system built, not enforced.

**Files:** `libs/engine/src/lib/server/rate-limits/`

**Phases:**

1. **Monitor only** — Log violations, don't block
2. **Soft enforce** — 429 with generous buffer
3. **Strict enforce** — Hard limits per tier

```typescript
// In rate limit middleware
const strictMode = await isFeatureEnabled(
	"rate_limiting_strict",
	{
		tenantId,
	},
	env,
);

if (isRateLimited) {
	if (strictMode) {
		return new Response("Too Many Requests", { status: 429 });
	} else {
		// Log but allow
		console.warn(`Rate limit exceeded for ${tenantId}, not enforced`);
	}
}
```

---

### 5. Beta Feature Access

**Pattern:** Tenant-list based access for invite-only features.

#### Trails (`trails_beta`)

Personal roadmap/changelog feature.

**Spec:** `docs/specs/trails-spec.md`

**Rules:**
| Priority | Rule | Result |
|----------|------|--------|
| 50 | Tenant in list | true |
| 10 | Default | false |

#### Ivy (`ivy_beta`)

Email service integration.

**Spec:** `docs/specs/ivy-mail-spec.md`

#### Rings Dashboard (`rings_dashboard`)

Analytics dashboard access.

**Spec:** `docs/specs/rings-spec.md`

---

## Migration SQL

### Full Expansion Migration

Create `migrations/020_feature_flags_expansion.sql`:

```sql
-- ============================================================================
-- FEATURE FLAGS EXPANSION
-- Migration: 020_feature_flags_expansion.sql
-- Date: 2026-01-13
-- Purpose: Add comprehensive feature flags for Grove rollouts
-- ============================================================================

-- =============================================================================
-- KILL SWITCHES (emergency disables)
-- Pattern: enabled=1 means feature is DISABLED
-- =============================================================================

INSERT INTO feature_flags (id, name, description, flag_type, default_value, enabled)
VALUES
  ('payments_kill_switch', 'Payments Kill Switch',
   'Emergency disable all payment processing', 'boolean', 'false', 0),
  ('uploads_kill_switch', 'Uploads Kill Switch',
   'Emergency disable file uploads', 'boolean', 'false', 0);

-- =============================================================================
-- FEATURE TOGGLES (enable/disable features)
-- =============================================================================

INSERT INTO feature_flags (id, name, description, flag_type, default_value, enabled)
VALUES
  ('shop_enabled', 'Shop Feature',
   'Enable e-commerce/shop functionality', 'boolean', 'false', 0),
  ('comments_enabled', 'Comments System',
   'Enable post comments', 'boolean', 'false', 0),
  ('trails_enabled', 'Trails Feature',
   'Enable personal roadmaps/changelogs', 'boolean', 'false', 0);

-- =============================================================================
-- INFRASTRUCTURE FLAGS (component toggles)
-- =============================================================================

INSERT INTO feature_flags (id, name, description, flag_type, default_value, enabled)
VALUES
  ('durable_objects_sessions', 'DO: Sessions',
   'Use Durable Objects for session management', 'boolean', 'false', 0),
  ('durable_objects_tenants', 'DO: Tenants',
   'Use Durable Objects for tenant config caching', 'boolean', 'false', 0),
  ('durable_objects_posts', 'DO: Posts',
   'Use Durable Objects for post meta/content', 'boolean', 'false', 0),
  ('rate_limiting_strict', 'Strict Rate Limits',
   'Enforce tier-based rate limits (vs monitor only)', 'boolean', 'false', 0);

-- =============================================================================
-- TIER-GATED FLAGS (premium features)
-- =============================================================================

INSERT INTO feature_flags (id, name, description, flag_type, default_value, enabled)
VALUES
  ('custom_domains', 'Custom Domains',
   'Allow custom domain configuration (Oak+)', 'boolean', 'false', 1),
  ('custom_fonts', 'Custom Fonts',
   'Allow font uploads (Evergreen)', 'boolean', 'false', 1),
  ('theme_customizer', 'Theme Customizer',
   'Advanced theme customization (Sapling+)', 'boolean', 'false', 1);

-- =============================================================================
-- BETA ACCESS FLAGS (invite-only)
-- =============================================================================

INSERT INTO feature_flags (id, name, description, flag_type, default_value, enabled)
VALUES
  ('trails_beta', 'Trails Beta Access',
   'Beta access to Trails feature', 'boolean', 'false', 1),
  ('ivy_beta', 'Ivy Beta Access',
   'Beta access to Ivy email service', 'boolean', 'false', 1),
  ('rings_dashboard', 'Rings Dashboard',
   'Access to analytics dashboard', 'boolean', 'false', 1),
  ('clearing_admin', 'Clearing Admin UI',
   'Access to status page admin interface', 'boolean', 'false', 1);

-- =============================================================================
-- DEFAULT RULES (tier-gating)
-- =============================================================================

-- Meadow: Oak and Evergreen only
INSERT INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES
  ('meadow_access', 100, 'tier', '{"tiers": ["oak", "evergreen"]}', 'true', 1);

-- Custom Domains: Oak and Evergreen only
INSERT INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES
  ('custom_domains', 100, 'tier', '{"tiers": ["oak", "evergreen"]}', 'true', 1);

-- Custom Fonts: Evergreen only
INSERT INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES
  ('custom_fonts', 100, 'tier', '{"tiers": ["evergreen"]}', 'true', 1);

-- Theme Customizer: Sapling and above
INSERT INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES
  ('theme_customizer', 100, 'tier', '{"tiers": ["sapling", "oak", "evergreen"]}', 'true', 1);

-- JXL Encoding: Start at 0% rollout
INSERT INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES
  ('jxl_encoding', 50, 'percentage', '{"percentage": 0}', 'true', 1);
```

---

## Integration Patterns

### Pattern 1: Simple Boolean Check

For on/off features:

```typescript
import { isFeatureEnabled } from "$lib/feature-flags";

export async function load({ locals, platform }) {
	const commentsEnabled = await isFeatureEnabled(
		"comments_enabled",
		{
			tenantId: locals.tenantId,
		},
		platform.env,
	);

	return { commentsEnabled };
}
```

### Pattern 2: Tier-Gated Access

For premium features:

```typescript
const canAccess = await isFeatureEnabled(
	"meadow_access",
	{
		tenantId: locals.tenantId,
		tier: locals.tenant?.tier, // Critical: pass tier for rule evaluation
		userId: locals.user?.id,
	},
	platform.env,
);

if (!canAccess) {
	throw redirect(302, "/upgrade?feature=meadow");
}
```

### Pattern 3: Percentage Rollout

For gradual deployments:

```typescript
// User/tenant gets deterministic bucket assignment
const useJxl = await isFeatureEnabled(
	"jxl_encoding",
	{
		tenantId: locals.tenantId, // Same tenant always gets same result
		userId: locals.user?.id,
	},
	platform.env,
);

// Check kill switch first (no caching)
const killed = await isFeatureEnabled("jxl_kill_switch", {}, platform.env);
if (killed) return processAsWebP(file);

if (useJxl) return processAsJxl(file);
return processAsWebP(file);
```

### Pattern 4: Beta Tenant List

For invite-only features:

```typescript
// Admin UI: Add tenant to beta list
await addFlagRule("trails_beta", {
	ruleType: "tenant",
	ruleValue: { tenantIds: ["tenant-abc", "tenant-xyz"] },
	resultValue: true,
	priority: 50,
});

// In route:
const hasBetaAccess = await isFeatureEnabled(
	"trails_beta",
	{
		tenantId: locals.tenantId,
	},
	platform.env,
);
```

---

## Rollout Strategy

### Phase 1: Core Infrastructure (Week 1)

**Goal:** Evaluation logic working, admin UI basic functionality

- [ ] Deploy migration 020 with all flags
- [ ] Verify KV caching works
- [ ] Test flag evaluation in dev
- [ ] Basic admin UI for toggling

### Phase 2: First Integrations (Week 2)

**Goal:** Integrate flags with existing features

| Flag               | Integration       |
| ------------------ | ----------------- |
| `jxl_encoding`     | imageProcessor.ts |
| `shop_enabled`     | Shop routes       |
| `comments_enabled` | Comments system   |

### Phase 3: Tier-Gating (Week 3)

**Goal:** Premium features properly gated

| Flag             | Feature       |
| ---------------- | ------------- |
| `meadow_access`  | Meadow routes |
| `custom_domains` | Domain setup  |
| `custom_fonts`   | Font upload   |

### Phase 4: Beta Programs (Week 4+)

**Goal:** Invite-only features accessible to beta users

| Flag              | Beta Program        |
| ----------------- | ------------------- |
| `trails_beta`     | Trails early access |
| `ivy_beta`        | Ivy email beta      |
| `rings_dashboard` | Analytics preview   |

---

## Admin UI Enhancements

### Flag Quick Actions

Add to admin sidebar:

```svelte
<!-- Quick toggle for common flags -->
<div class="quick-flags">
	<h3>Quick Toggles</h3>

	<FlagToggle id="jxl_encoding" label="JXL Encoding" description="JPEG XL image compression" />

	<FlagToggle id="shop_enabled" label="Shop Feature" description="E-commerce functionality" />

	<FlagToggle
		id="rate_limiting_strict"
		label="Strict Rate Limits"
		description="Enforce tier limits"
	/>
</div>
```

### Percentage Rollout Dashboard

Visual for gradual rollouts:

```
JXL Encoding Rollout
├─ Current: 10%
├─ Target: 100%
├─ Error rate: 0.2%
└─ [━━░░░░░░░░] Progress

   [+10%] [+25%] [50%] [100%] [Kill]
```

### Beta Tenant Manager

UI for managing beta access lists:

```
Trails Beta Access
├─ 3 tenants enrolled
├─ tenant-autumn ✓
├─ tenant-testuser ✓
└─ tenant-betafriend ✓

[+ Add Tenant] [Remove Selected]
```

---

## Success Metrics

| Metric                             | Target  |
| ---------------------------------- | ------- |
| Flag evaluation latency (cached)   | < 5ms   |
| Flag evaluation latency (uncached) | < 50ms  |
| Cache hit rate                     | > 95%   |
| Admin UI response time             | < 200ms |
| Zero downtime deployments          | 100%    |

---

## Next Steps

1. **Review this plan** — Align on flag priorities
2. **Create migration 020** — Add expansion flags
3. **Integrate first flags** — JXL + payment provider
4. **Build admin quick actions** — Easy toggle UI
5. **Document for team** — Usage patterns guide

---

_Document version: 1.0_
_Created: 2026-01-13_
_Author: Claude (AI-assisted planning)_
