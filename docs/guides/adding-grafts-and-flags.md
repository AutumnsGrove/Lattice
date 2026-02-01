# Adding Grafts and Feature Flags

> A developer guide for adding new feature flags and grafts to Grove.

---

## Quick Reference

| Term | Meaning |
|------|---------|
| **Feature Flag** | A database toggle that controls whether a capability is enabled |
| **Graft** | Grove's term for a feature flag (from horticulture: grafting branches) |
| **UI Graft** | A reusable component that can be "spliced" onto pages |
| **Greenhouse** | Early access program for trusted tenants to test experimental features |
| **Cultivate** | Enable a flag globally |
| **Prune** | Disable a flag globally |
| **Blight** | Emergency kill switch (instant disable, no caching) |

---

## The Three Layers

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: GREENHOUSE MODE                                   │
│  "Who gets early access?"                                   │
│  └─ Tenant enrollment in greenhouse_tenants table           │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2: FEATURE GRAFTS (Feature Flags)                    │
│  "What capabilities are enabled?"                           │
│  └─ Boolean flags, percentage rollouts, tier-gating         │
├─────────────────────────────────────────────────────────────┤
│  LAYER 1: UI GRAFTS                                         │
│  "How do features render?"                                  │
│  └─ Reusable components from @autumnsgrove/groveengine      │
└─────────────────────────────────────────────────────────────┘
```

---

## Adding a New Feature Flag

### Step 1: Create the Migration

Create a new migration file in `packages/engine/migrations/`:

```sql
-- packages/engine/migrations/XXX_my_feature.sql
-- ============================================================================
-- Migration XXX: My Feature Flag
-- ============================================================================
-- Brief description of what this flag controls and why it exists.
--
-- @see docs/specs/relevant-spec.md (if applicable)
-- ============================================================================

INSERT OR IGNORE INTO feature_flags (
  id,
  name,
  description,
  flag_type,
  default_value,
  enabled,
  greenhouse_only
) VALUES (
  'my_feature',                    -- Unique ID (snake_case)
  'My Feature',                    -- Human-readable name
  'Description of what this controls and when to enable it.',
  'boolean',                       -- Type: boolean, percentage, variant, tier, json
  'false',                         -- Default value (JSON-encoded string)
  0,                               -- enabled: 0 = globally disabled, 1 = rules are evaluated
  0                                -- greenhouse_only: 1 = only visible to greenhouse tenants
);
```

### Step 2: Apply the Migration

```bash
# Apply to production D1
npx wrangler d1 execute grove-engine-db --remote --file=packages/engine/migrations/XXX_my_feature.sql

# Verify it was created
npx wrangler d1 execute grove-engine-db --remote --command="SELECT * FROM feature_flags WHERE id = 'my_feature';"
```

### Step 3: Add to Known Grafts (Type Safety)

Update `packages/engine/src/lib/feature-flags/grafts.ts`:

```typescript
export type KnownGraftId =
  | "fireside_mode"
  | "scribe_mode"
  | "meadow_access"
  | "jxl_encoding"
  | "jxl_kill_switch"
  | "my_feature";  // Add your new flag
```

### Step 4: Use in Code

```typescript
import { isGraftEnabled } from '@autumnsgrove/groveengine/feature-flags';

// In a +page.server.ts or +layout.server.ts
export const load: PageServerLoad = async ({ parent, platform }) => {
  const parentData = await parent();

  // Option A: Check from cascaded grafts (preferred - no extra DB call)
  const myFeatureEnabled = parentData.grafts?.my_feature ?? false;

  // Option B: Direct check (use sparingly - adds DB/KV call)
  const myFeatureEnabled = await isGraftEnabled(
    'my_feature',
    { tenantId: locals.tenantId, inGreenhouse: parentData.inGreenhouse },
    { DB: platform.env.DB, FLAGS_KV: platform.env.FLAGS_KV }
  );

  return { myFeatureEnabled };
};
```

---

## Flag Types and When to Use Them

| Type | Use Case | Default Value Example |
|------|----------|----------------------|
| `boolean` | Simple on/off toggle | `'false'` or `'true'` |
| `percentage` | Gradual rollout (0-100%) | `'0'` |
| `tier` | Subscription-gated features | `'["oak", "evergreen"]'` |
| `variant` | A/B testing with named variants | `'{"control": 50, "variant_a": 50}'` |
| `json` | Complex configuration | `'{"limit": 10, "enabled": true}'` |

---

## Adding Rules to a Flag

Rules determine WHO gets what value. Higher priority = evaluated first.

### Priority Conventions

| Priority | Rule Type | Use Case |
|----------|-----------|----------|
| 100 | `tenant` | Always enable for specific tenants |
| 90 | `user` | Always enable for specific users |
| 80 | `tier` | Enable for subscription tiers |
| 50 | `percentage` | Gradual rollout |
| 50 | `tenant_override` | Greenhouse self-serve (auto-created) |
| 10 | `time` | Seasonal/time-based features |
| 0 | `always` | Default catch-all |

### Example: Enable for Specific Tenant

```sql
INSERT INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES (
  'my_feature',
  100,                              -- High priority
  'tenant',
  '{"tenant_id": "autumn-primary"}', -- JSON condition
  'true',                           -- Result if rule matches
  1
);
```

### Example: Percentage Rollout

```sql
INSERT INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES (
  'my_feature',
  50,
  'percentage',
  '{"percentage": 25}',  -- 25% of tenants
  'true',
  1
);
```

### Example: Tier-Gated Feature

```sql
INSERT INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES (
  'my_feature',
  80,
  'tier',
  '{"tiers": ["oak", "evergreen"]}',
  'true',
  1
);
```

---

## Greenhouse-Only Flags

For experimental features that only greenhouse tenants should see:

```sql
INSERT OR IGNORE INTO feature_flags (
  id, name, description, flag_type, default_value, enabled, greenhouse_only
) VALUES (
  'experimental_feature',
  'Experimental Feature',
  'Beta feature for greenhouse testers.',
  'boolean',
  'true',      -- Default ON for those who can see it
  1,           -- Flag is active
  1            -- ONLY greenhouse tenants can see/use this
);
```

**When to use `greenhouse_only`:**
- Experimental user-facing features needing feedback
- Features that might change based on beta testing
- "Try before everyone else" experiences

**When NOT to use `greenhouse_only`:**
- Safety gates (like `image_uploads_enabled`)
- Infrastructure toggles (like `jxl_kill_switch`)
- Features not ready for anyone yet (use `enabled=0` instead)

---

## The Admin Layout Cascade Pattern

Grafts are loaded ONCE at the admin layout level and cascaded to all child pages:

```
/admin/+layout.server.ts
├── Loads all enabled grafts for tenant
├── Returns { grafts: Record<string, boolean> }
│
├── /admin/blog/+page.server.ts
│   └── Uses parentData.grafts.fireside_mode
│
├── /admin/settings/+page.server.ts
│   └── Uses parentData.grafts (shows toggle UI)
│
└── /admin/posts/edit/[slug]/+page.server.ts
    └── Uses parentData.grafts.scribe_mode
```

**Why this pattern?**
- Single DB/KV call per request (not per page)
- Consistent graft state across all admin pages
- Easy to access: `const { grafts } = await parent()`

---

## Caching Behavior

| Cache TTL | Use Case | Example |
|-----------|----------|---------|
| 60s (default) | Normal flags | Most features |
| 0s (instant) | Kill switches | `jxl_kill_switch` |
| 300s | Stable, rarely-changed | Tier gates |

To set custom TTL:

```sql
INSERT INTO feature_flags (..., cache_ttl) VALUES (..., 0);  -- Instant effect
```

---

## Emergency: Kill Switch Pattern

For features that need instant disable capability:

```sql
-- The kill switch flag (cache_ttl = 0 for instant effect)
INSERT OR IGNORE INTO feature_flags (
  id, name, flag_type, default_value, enabled, cache_ttl
) VALUES (
  'my_feature_kill_switch',
  'My Feature Kill Switch',
  'boolean',
  'false',    -- Default: kill switch is OFF (feature works normally)
  1,          -- Kill switch is "armed" and ready
  0           -- NO CACHING - instant effect
);
```

In code, check kill switch first:

```typescript
const killSwitch = await isFeatureEnabled('my_feature_kill_switch', ctx, env);
if (killSwitch) {
  // Feature is killed - skip everything
  return fallbackBehavior();
}

// Normal feature logic...
```

---

## Checklist: Adding a New Flag

- [ ] Create migration file in `packages/engine/migrations/`
- [ ] Choose appropriate `flag_type` (boolean, percentage, tier, etc.)
- [ ] Set `enabled` (0 = globally off, 1 = evaluate rules)
- [ ] Set `greenhouse_only` if it's an experimental feature
- [ ] Add rules if needed (tenant, percentage, tier)
- [ ] Apply migration to production: `npx wrangler d1 execute grove-engine-db --remote --file=...`
- [ ] Add to `KnownGraftId` type for type safety
- [ ] Use via cascaded `parentData.grafts` or direct `isGraftEnabled()` call
- [ ] Test in greenhouse before cultivating globally

---

## File Reference

| File | Purpose |
|------|---------|
| `packages/engine/migrations/` | SQL migrations that create flags |
| `packages/engine/src/lib/feature-flags/types.ts` | Type definitions |
| `packages/engine/src/lib/feature-flags/grafts.ts` | `getEnabledGrafts()`, `isGraftEnabled()` |
| `packages/engine/src/lib/feature-flags/evaluate.ts` | Core evaluation logic |
| `packages/engine/src/lib/feature-flags/greenhouse.ts` | Greenhouse enrollment |
| `packages/engine/src/lib/feature-flags/tenant-grafts.ts` | Self-serve controls |
| `packages/engine/src/lib/feature-flags/admin.ts` | Admin UI functions |
| `docs/specs/grafts-spec.md` | Full specification |

---

## Common Patterns

### Pattern: Feature Gate in UI

```svelte
{#if data.grafts.my_feature}
  <MyFeatureComponent />
{/if}
```

### Pattern: Conditional API Behavior

```typescript
// In +server.ts
if (grafts.enhanced_uploads) {
  return handleEnhancedUpload(request);
}
return handleBasicUpload(request);
```

### Pattern: Gradual Rollout

1. Create flag with `enabled=1`, no rules (everyone gets default)
2. Add percentage rule starting at 5%
3. Monitor for issues
4. Increase percentage: 5% → 25% → 50% → 100%
5. Remove percentage rule, set `default_value='true'`

### Pattern: Tier-Gated with Greenhouse Preview

```sql
-- Flag available to Oak+ OR greenhouse tenants
INSERT INTO feature_flags (...) VALUES ('premium_feature', ..., 1, 0);

-- Rule 1: Greenhouse always gets it
INSERT INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value)
VALUES ('premium_feature', 90, 'greenhouse', '{}', 'true');

-- Rule 2: Oak and Evergreen tiers get it
INSERT INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value)
VALUES ('premium_feature', 80, 'tier', '{"tiers": ["oak", "evergreen"]}', 'true');
```

---

## Vocabulary Quick Reference

| Grove Term | Meaning |
|------------|---------|
| **Graft** | Enable a feature |
| **Prune** | Disable a feature |
| **Cultivate** | Full rollout (100%) |
| **Propagate** | Gradual rollout (percentage) |
| **Cultivars** | A/B test variants |
| **Blight** | Emergency kill switch |
| **Under glass** | Greenhouse-only feature |
| **Transplant** | Move from greenhouse to production |
| **Harden off** | Gradual rollout during transplant |
| **Took** | Graft is active and working |

---

*For the complete specification, see `docs/specs/grafts-spec.md`.*
