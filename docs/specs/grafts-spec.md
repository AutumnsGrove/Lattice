---
aliases: []
date created: Monday, January 20th 2026
date modified: Monday, January 20th 2026
tags:
  - feature-flags
  - configuration
  - cloudflare-workers
type: tech-spec
---

# Grafts — Feature Customization

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

> *A graft makes your tree bear fruit no other can.*

Grove's per-tenant feature customization system. Grafts are the deliberate act of joining new capabilities onto existing trees. Not plugins users upload, but trusted configurations the Wayfinder enables for specific groves. Want JXL encoding? Graft it on. Need a beta feature? Graft it on.

**Public Name:** Grafts
**Internal Name:** GroveGrafts (feature-flags module)
**Domain:** *Operator-configured*
**Repository:** Part of [AutumnsGrove/GroveEngine](https://github.com/AutumnsGrove/GroveEngine)
**Last Updated:** January 2026

In orcharding, a graft joins a cutting from one tree onto the rootstock of another. The cutting grows, becomes one with the tree, yet retains what makes it special. One apple tree can bear four different varieties. One grove can serve tenants with entirely different capabilities.

Grafts is Grove's Cloudflare-native feature flag system. It supports boolean flags, percentage rollouts, tier-gated features, and A/B variants. Simple infrastructure that lets operators control exactly which features each tenant receives.

---

## The Graft Lexicon

Grove doesn't call them "feature flags." We call them grafts, and the vocabulary follows:

| Term | Action | Description |
|------|--------|-------------|
| **Graft** | Enable | Join a feature onto a tenant's tree |
| **Prune** | Disable | Remove a feature from a tenant |
| **Propagate** | Percentage rollout | Roll out to a percentage of the grove |
| **Cultivate** | Full rollout | Roll out to everyone |
| **Cultivars** | A/B variants | Test different varieties of the same feature |
| **Blight** | Kill switch | Emergency disable, instant effect |
| **Took** | Status check | The graft is active and working |

*"I'll graft it onto your tree at dusk."*

---

## Goals

1. **Per-tenant features** — Enable capabilities for specific trees
2. **Percentage rollouts** — Gradual propagation across the grove
3. **Tier-gated features** — Features available at certain subscription tiers
4. **Kill switches** — Instant blight when something goes wrong
5. **A/B testing** — Cultivar comparisons for product experiments
6. **Audit logging** — Know who grafted what, and when

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Graft Evaluation                            │
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
│              │     D1      │ ← Load graft config                    │
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
│                        Graft Management                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Admin updates graft                                               │
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
│   First matching rule determines the graft value              │
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
  ruleValue: { percentage: 25, salt: 'jxl_rollout_2026' },
  resultValue: true
}
```

The percentage is deterministic. Same tenant always gets the same result for the same graft. This uses SHA-256 hashing with a salt to bucket identifiers.

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
-- Core grafts table
CREATE TABLE feature_flags (
  id TEXT PRIMARY KEY,               -- e.g., 'jxl_encoding', 'meadow_access'
  name TEXT NOT NULL,                -- Human-readable name
  description TEXT,                  -- What this graft controls
  flag_type TEXT NOT NULL,           -- 'boolean', 'percentage', 'variant', 'tier', 'json'
  default_value TEXT NOT NULL,       -- Default when no rules match (JSON)
  enabled INTEGER NOT NULL DEFAULT 1, -- Master blight switch
  cache_ttl INTEGER,                 -- KV cache TTL in seconds
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);

-- Rules determine graft values based on context
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

## API Usage

### Check if a Graft Took

```typescript
import { isFeatureEnabled } from '$lib/feature-flags';

// Did the JXL graft take?
const useJxl = await isFeatureEnabled('jxl_encoding', {
  tenantId: locals.tenantId,
  userId: locals.user?.id
}, platform.env);

if (useJxl) {
  return encodeAsJxl(file);
}
```

### Get Graft Value with Default

```typescript
import { getFeatureValue } from '$lib/feature-flags';

// Get post limit, defaulting to 50
const maxPosts = await getFeatureValue('max_posts_override', {
  tier: locals.tenant?.tier
}, platform.env, 50);
```

### Check Cultivar (A/B Variant)

```typescript
import { getVariant } from '$lib/feature-flags';

// Which pricing cultivar?
const variant = await getVariant('pricing_experiment', {
  sessionId: cookies.get('session_id')
}, platform.env);

// Returns 'control', 'annual_first', or 'comparison_table'
```

### Batch Evaluation

```typescript
import { getFlags } from '$lib/feature-flags';

// Evaluate multiple grafts at once
const flags = await getFlags(
  ['meadow_access', 'dark_mode_default', 'new_nav'],
  { tenantId, tier, userId },
  platform.env
);

return {
  canAccessMeadow: flags.get('meadow_access')?.value ?? false,
  darkModeDefault: flags.get('dark_mode_default')?.value ?? false,
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
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);

  // Use first 4 bytes as uint32, mod 100 for percentage
  const view = new DataView(hashArray.buffer);
  const uint32 = view.getUint32(0, false); // big-endian
  return uint32 % 100;
}

async function evaluatePercentage(
  condition: { percentage: number; salt?: string },
  context: EvaluationContext,
  flagId: string
): Promise<boolean> {
  const { percentage, salt = '' } = condition;

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
import { invalidateFlag } from '$lib/feature-flags';

// When admin updates a graft
await invalidateFlag('jxl_encoding', env);
// Clears all KV keys with prefix flag:jxl_encoding:
```

---

## Project Structure

```
packages/engine/src/lib/feature-flags/
├── index.ts              # Public API exports
├── types.ts              # TypeScript interfaces
├── evaluate.ts           # Core evaluation logic
├── percentage.ts         # Deterministic percentage bucketing
├── rules.ts              # Rule evaluation (tier, tenant, time, etc.)
├── cache.ts              # KV caching utilities
├── evaluate.test.ts      # Unit tests
├── percentage.test.ts    # Percentage distribution tests
├── rules.test.ts         # Rule evaluation tests
├── cache.test.ts         # Cache key/invalidation tests
└── test-utils.ts         # Test helpers
```

---

## Configuration

### wrangler.toml Bindings

```toml
[[kv_namespaces]]
binding = "FLAGS_KV"
id = "your-kv-namespace-id"

[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "your-database-id"
```

### Environment Interface

```typescript
interface FeatureFlagsEnv {
  DB: D1Database;
  FLAGS_KV: KVNamespace;
}
```

---

## Emergency Procedures

### Invoking Blight (Kill Switch)

When a graft causes problems:

1. **Via Admin UI**: Navigate to graft → Toggle master switch OFF
2. **Direct D1 update**:
   ```sql
   UPDATE feature_flags SET enabled = 0 WHERE id = 'problem_graft';
   ```
3. **Clear cache** (if invalidation fails):
   ```bash
   wrangler kv:key list --namespace-id=FLAGS_KV_ID --prefix="flag:problem_graft:" | \
     jq -r '.[].name' | \
     xargs -I {} wrangler kv:key delete --namespace-id=FLAGS_KV_ID {}
   ```

### Recovery Timeline

| Action | Effect Time |
|--------|-------------|
| Toggle master switch | 60 seconds (cache TTL) |
| Clear KV cache | Immediate |
| Direct D1 update + cache clear | Immediate |

---

## Example Grafts

Example configurations showing common graft patterns:

| Graft ID | Type | Purpose | Example Use |
|----------|------|---------|-------------|
| `jxl_encoding` | percentage | JPEG XL image encoding | Propagate to 25% of grove |
| `jxl_kill_switch` | boolean | Emergency disable for JXL | Blight switch (instant off) |
| `meadow_access` | tier | Gate Meadow social features | Oak and Evergreen only |
| `dark_mode_default` | percentage | Dark mode preference rollout | Gradual propagation |

*Check the database for actual current graft states.*

---

## Implementation Checklist

### Phase 1: Core Infrastructure (Complete)
- [x] D1 schema migration
- [x] Type definitions
- [x] Evaluation logic
- [x] Percentage bucketing
- [x] KV caching
- [x] Unit tests

### Phase 2: Integration (Complete)
- [x] JXL encoding graft
- [x] Kill switch support
- [x] SvelteKit hooks integration

### Phase 3: Admin UI (Planned)
- [ ] Graft listing page (`/admin/grafts`)
- [ ] Graft editor with rule builder
- [ ] Percentage slider component
- [ ] Tier selector component
- [ ] Audit log viewer

### Phase 4: Analytics (Planned)
- [ ] Rings integration for graft evaluations
- [ ] Cultivar experiment tracking
- [ ] Conversion metrics per variant

---

## Related Documents

- [Feature Flags Planning Spec](../plans/planning/feature-flags-spec.md) — Original technical spec
- [JXL Migration Spec](../plans/planning/jxl-migration-spec.md) — First use case for Grafts
- [Loom Pattern](../patterns/loom-durable-objects-pattern.md) — DO coordination
- [Threshold Pattern](../patterns/threshold-pattern.md) — Rate limiting (uses Grafts for configuration)

---

*Orchardists have known for centuries: the right graft makes a tree bear fruit it never could alone.*
