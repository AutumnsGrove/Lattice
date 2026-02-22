---
title: "Database Consolidation Architecture"
status: completed
category: infra
completed: "2026-02-22"
---

# Database Consolidation Architecture

> _From this height, the boundaries are obvious._
>
> **Status: COMPLETE.** All three phases executed February 2026. `grove-engine-db` dropped from ~123 tables to 78. Two new databases created: `grove-curios-db` (45 tables) and `grove-observability-db` (16 tables).

```
                    ┌─────────────────────────────────────┐
                    │       grove-engine-db (BEFORE)       │
                    │                                     │
                    │  ┌─────┐ ┌───────┐ ┌──────┐        │
                    │  │Core │ │Curios │ │ Obs  │        │
                    │  │ 62  │ │  45   │ │  16  │        │
                    │  └─────┘ └───────┘ └──────┘        │
                    │                         ~123 tables │
                    └─────────────────────────────────────┘
                                    │
                                    ▼
          ┌───────────────────────────────────────────────────┐
          │                                                   │
    ┌─────┴──────┐    ┌──────────────┐    ┌──────────────────┐
    │grove-engine │    │grove-curios  │    │grove-observability│
    │    -db      │    │    -db       │    │       -db        │
    │             │    │              │    │                  │
    │  Core  78   │    │  Curios  45  │    │  Vista     16   │
    │             │    │              │    │                  │
    │  (tenants,  │    │  (all curio  │    │  (metrics,       │
    │   posts,    │    │   widgets)   │    │   health,        │
    │   auth,     │    │              │    │   costs,         │
    │   billing,  │    │              │    │   alerts,        │
    │   sentinel) │    │              │    │   sentinel)      │
    │             │    │              │    │                  │
    │  78 tables  │    │  45 tables   │    │  16 tables       │
    │  (-37%)     │    │              │    │                  │
    └─────────────┘    └──────────────┘    └──────────────────┘
```

---

## Guiding Principles

These principles came directly from the user and shape every decision below:

1. **D1 is the source of truth.** Always. For everything that needs long-term storage.
2. **DO SQLite is for caching and bursts.** Rate limiting, draft sync, analytics buffering — ephemeral state with a flush-to-D1 cycle.
3. **Once data is in a DO, it's hard to see.** No data explorer, no ad-hoc queries, no `wrangler d1 execute`. D1 is visible and extractable.
4. **Multiple D1 databases with clear ownership.** The fix isn't a different technology — it's better boundaries within D1.
5. **Tables are fine. Location matters.** 39 curio tables aren't a problem if they're in their own space. 120 tables in one database IS a problem.

---

## Phase 1: Drop Dead Weight (COMPLETED)

**Effort:** Low | **Impact:** -9 tables, -3000+ lines dead code, -2500+ lines LemonSqueezy | **Risk:** None
**Completed:** 2026-02 | **Migration:** `085_drop_shop_tables.sql` applied to production

### 1A. Shop Table Removal

The shop/e-commerce tables from migration `007_shop_payments.sql`. The audit confirmed:

| Table              | Safe to Drop? | Reason                                                                |
| ------------------ | :-----------: | --------------------------------------------------------------------- |
| `products`         |      YES      | No active callers — all behind `SHOP_ECOMMERCE_DISABLED = true`       |
| `product_variants` |      YES      | Same — disabled shop routes only                                      |
| `customers`        |      YES      | No active callers                                                     |
| `orders`           |      YES      | No active callers                                                     |
| `order_line_items` |      YES      | No active callers                                                     |
| `subscriptions`    |      YES      | Only in disabled webhook handler                                      |
| `connect_accounts` |      YES      | No active callers                                                     |
| `refunds`          |      YES      | No active callers                                                     |
| `discount_codes`   |      YES      | No active callers                                                     |
| `platform_billing` |    **NO**     | 15+ active production references (billing API, Stripe/LS webhooks)    |
| `webhook_events`   |    **NO**     | Core webhook idempotency — used by Stripe, LemonSqueezy, cleanup cron |

### Code to Delete Alongside

| File                                                         | Lines | Purpose             |
| ------------------------------------------------------------ | ----: | ------------------- |
| `libs/engine/src/lib/payments/shop.ts`                       | ~1284 | Shop CRUD functions |
| `libs/engine/src/lib/payments/shop.test.ts`                  | ~1433 | Shop tests          |
| `libs/engine/src/routes/api/shop/products/+server.ts`        |  ~150 | Product API         |
| `libs/engine/src/routes/api/shop/products/[slug]/+server.ts` |  ~100 | Product detail API  |
| `libs/engine/src/routes/api/shop/orders/+server.ts`          |  ~100 | Orders API          |
| `libs/engine/src/routes/api/shop/checkout/+server.ts`        |  ~100 | Checkout API        |
| `libs/engine/src/routes/api/shop/connect/+server.ts`         |  ~100 | Stripe Connect API  |

**Keep** `api/shop/webhooks/+server.ts` but refactor to remove the disabled shop handlers — it still processes platform billing subscription events.

### Migration

```sql
-- Migration: 085_drop_shop_tables.sql
-- Drop unused e-commerce tables from Pantry spec (deferred indefinitely)
-- platform_billing and webhook_events are KEPT (active production use)

DROP TABLE IF EXISTS discount_codes;
DROP TABLE IF EXISTS refunds;
DROP TABLE IF EXISTS connect_accounts;
DROP TABLE IF EXISTS order_line_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
```

### Pantry Future

When Pantry is built, the spec at `docs/specs/pantry-spec.md` already defines a new schema with `pantry_`-prefixed tables (`pantry_products`, `pantry_orders`, etc.). These will live in their own `grove-pantry-db` — not back in the engine monolith.

### 1B. LemonSqueezy Cleanup

We've migrated to Stripe. All LemonSqueezy-specific code is dead weight. The audit found **68 files** with LS references (12 active code, 1 migration, 55 docs/archived).

#### Code to Delete

| File / Directory                                             | Lines | Purpose                                                         |
| ------------------------------------------------------------ | ----: | --------------------------------------------------------------- |
| `libs/engine/src/lib/payments/lemonsqueezy/` (6 files)       |  ~800 | Full LS provider: client, provider, types, tests, index         |
| `apps/plant/src/lib/server/lemonsqueezy.ts`                  |  ~150 | LS config, variant IDs, checkout creation, webhook verification |
| `apps/plant/src/routes/api/webhooks/lemonsqueezy/+server.ts` |  ~200 | LS webhook handler (entire route)                               |

#### Code to Update (remove LS references, keep the rest)

| File                                             | What to Change                            |
| ------------------------------------------------ | ----------------------------------------- |
| `libs/engine/src/lib/payments/index.ts`          | Remove LS provider export/registration    |
| `libs/engine/src/lib/grafts/pricing/checkout.ts` | Remove LS checkout path (Stripe-only now) |
| `libs/engine/src/routes/arbor/account/utils.ts`  | Remove LS-specific account logic          |
| `apps/plant/src/routes/success/+page.server.ts`  | Remove LS success handling                |

#### Database Columns to Drop

Migration `022_lemonsqueezy_migration.sql` added 3 columns + 3 indexes to `user_onboarding`:

```sql
-- Migration: 085b_drop_lemonsqueezy_columns.sql
-- Remove LemonSqueezy columns from user_onboarding (migrated to Stripe)

-- SQLite doesn't support DROP COLUMN directly in older versions,
-- but D1 uses modern SQLite that does support it.
ALTER TABLE user_onboarding DROP COLUMN lemonsqueezy_customer_id;
ALTER TABLE user_onboarding DROP COLUMN lemonsqueezy_subscription_id;
ALTER TABLE user_onboarding DROP COLUMN lemonsqueezy_checkout_id;

DROP INDEX IF EXISTS idx_onboarding_ls_subscription;
DROP INDEX IF EXISTS idx_onboarding_ls_customer;
DROP INDEX IF EXISTS idx_onboarding_ls_checkout;
```

#### Environment Variables to Remove

These can be cleaned from wrangler configs, `.dev.vars`, and any secrets:

- `LEMON_SQUEEZY_API_KEY`
- `LEMON_SQUEEZY_STORE_ID`
- `LEMON_SQUEEZY_WEBHOOK_SECRET`
- `LEMON_SQUEEZY_*_VARIANT_MONTHLY` / `LEMON_SQUEEZY_*_VARIANT_YEARLY` (8 variant IDs across 4 tiers)

#### Documentation to Archive/Remove

55 files reference LemonSqueezy across docs/plans/specs. Key ones:

- `docs/plans/completed/payment-migration-stripe-to-lemonsqueezy.md` — archive or delete
- `docs/plans/completed/grove-payment-migration.md` — archive or delete
- `_archived/docs/lemonsqueezy-setup-archived-2026-02-02.md` — already archived, can delete
- Various spec files mentioning LS as an option — update to reflect Stripe-only reality

#### What to Keep

- `platform_billing` table — already uses provider-agnostic columns (`provider_customer_id`, `provider_subscription_id`), works with Stripe
- `webhook_events` table — `provider` column supports multiple providers, still used by Stripe
- Any Stripe-specific code — this is the active payment provider

---

## Phase 2: Extract Observability (COMPLETED)

**Effort:** Medium | **Impact:** -16 tables from engine-db (10 vista + 6 sentinel) | **Risk:** Low
**Completed:** 2026-02 | **Database:** `grove-observability-db` (`59e70f9e-8f9c-4021-96e5-1e130e753766`)
**Schema:** `libs/engine/migrations/observability/001_initial_schema.sql` | **Drop:** `087_drop_observability_tables.sql`

> **Implementation note:** During execution, sentinel tables (6) were also moved to `grove-observability-db` since SentinelDO's stress testing reads from observability tables, not application tables directly. This gave OBS_DB 16 tables total instead of the planned 10.

### Why Extract

Vista observability data is fundamentally different from application data:

- **High-write, time-series** — metrics collected every 5 minutes
- **Rolling retention** — 90-day window with daily cleanup
- **Single writer** — only `vista-collector` writes, only `landing/arbor/vista/*` reads
- **No application coupling** — observability queries never join with tenant/post/page data

### What Moves

All 10 tables from migration `080_observability_metrics.sql`:

```
observability_metrics          — General time-series metrics
observability_health_checks    — HTTP health check results
observability_d1_stats         — D1 database statistics
observability_r2_stats         — R2 bucket statistics
observability_kv_stats         — KV namespace statistics
observability_do_stats         — Durable Object statistics
observability_daily_costs      — Daily cost estimates
observability_alert_thresholds — Alert configuration
observability_alerts           — Fired alerts
observability_collection_log   — Collection run log
```

### What Stays

Sentinel tables (6) stay in `grove-engine-db`:

```
sentinel_runs, sentinel_metrics, sentinel_checkpoints,
sentinel_baselines, sentinel_schedules, sentinel_test_data
```

**Reason:** SentinelDO needs access to application tables (`posts`, `sessions`, `media`) for realistic stress testing. Extracting sentinel would create a cross-DB dependency on application tables. Sentinel is also low-write (on-demand tests only), so it doesn't have the write-pressure concern.

### New Database

```
Database name: grove-observability-db
Binding name:  OBS_DB
```

### Binding Changes

```
┌─────────────────────────────┐     ┌──────────────────────────────────┐
│ workers/vista-collector      │     │ apps/landing (Vista dashboard)   │
│                             │     │                                  │
│ BEFORE: DB → grove-engine-db│     │ BEFORE: DB → grove-engine-db     │
│                             │     │                                  │
│ AFTER:  OBS_DB → grove-obs  │     │ AFTER:  DB     → grove-engine-db │
│         (only binding       │     │         OBS_DB → grove-obs-db    │
│          it needs!)         │     │         (dual binding)            │
└─────────────────────────────┘     └──────────────────────────────────┘
```

### Code Changes

1. **`workers/vista-collector/wrangler.toml`**: Replace `DB` binding with `OBS_DB` pointing to `grove-observability-db`
2. **`apps/landing/wrangler.toml`**: Add `OBS_DB` binding alongside existing `DB`
3. **`libs/engine/src/lib/server/observability/`**: All functions in this directory change `env.DB` to `env.OBS_DB`
4. **`libs/engine/src/lib/server/observability/aggregators/sentinel-aggregator.ts`**: This one still reads from `env.DB` (sentinel tables stay in engine-db)
5. **Vista dashboard routes** (`apps/landing/src/routes/arbor/vista/**`): Pass `env.OBS_DB` to observability query functions

### Migration Strategy

```
1. Create grove-observability-db via wrangler
2. Apply the observability schema (extract from migration 080)
3. Copy existing data: wrangler d1 export/import
4. Update bindings in wrangler.toml files
5. Update code to use OBS_DB
6. Deploy — both DBs active during transition
7. After verification: migration 086_drop_observability_tables.sql in engine
```

---

## Phase 3: Extract Curios (COMPLETED)

**Effort:** High | **Impact:** -45 tables from engine-db | **Risk:** Medium
**Completed:** 2026-02-22 | **Database:** `grove-curios-db` (`b03756ad-30d7-427a-9a1b-ec2f6478fcbd`)
**Schema:** `libs/engine/migrations/curios/001_initial_schema.sql` | **Drop:** `088_drop_curio_tables.sql`

> **Implementation note:** Actual table count was 45 (not 39 as originally estimated). Additional tables discovered during migration compilation: `gallery_collection_images`, `nowplaying_history`, `hit_counter_visitors`, `badge_definitions`, `custom_badges`, `journey_snapshots`, `journey_summaries`, `journey_jobs` (replacing the planned `journey_milestones`). The cross-DB dual-binding pattern for timeline routes (save-token, generate, backfill) was more complex than anticipated — these routes need both `DB` (SecretsManager/Lumen for `tenant_secrets`/`tenants`) and `CURIO_DB` (timeline tables). ~91 files were modified total.

### The Decision

We considered three approaches:

| Approach                     | Tables Removed |           Code Changes           | Trade-offs                      |
| ---------------------------- | :------------: | :------------------------------: | ------------------------------- |
| **A: Move to own D1**        |       39       | ~50 route files (binding change) | Cleanest. Tables stay as-is.    |
| B: Consolidate to JSON blobs |      ~12       | ~50 route files (query rewrite)  | Partial fix. Loses type safety. |
| C: Move to TenantDO          |       39       |          Major rewrite           | Violates DO storage philosophy. |

**Option A wins.** The curio tables aren't poorly designed — they're just in the wrong database. Each curio's schema is correct for its purpose. Moving them to their own D1 preserves all existing query patterns while giving curios a clear home.

### New Database

```
Database name: grove-curios-db
Binding name:  CURIO_DB
```

### Architecture After Extraction

```
Request Flow (curio read):
─────────────────────────────────────────────────────
Browser → Engine Route → hooks.server.ts resolves tenant
                         (TenantDO cache → grove-engine-db)
                       → curio route handler
                         reads from grove-curios-db
                         using locals.tenantId
─────────────────────────────────────────────────────

Request Flow (curio write):
─────────────────────────────────────────────────────
Browser → Engine Route → hooks.server.ts resolves tenant
                       → curio route handler
                         writes to grove-curios-db
                       → (optionally) invalidates
                         TenantDO curio config cache
─────────────────────────────────────────────────────
```

**Key insight:** Curio routes already get `tenantId` from `locals.tenantId` (set by `hooks.server.ts` via TenantDO). They don't need to query `grove-engine-db` for tenant verification. The only thing that changes is which D1 binding they use for the curio SQL.

### TenantDO as Curio Config Cache (Optional Enhancement)

Following the user's philosophy: **D1 is truth, DO is cache.**

```
┌─────────────┐   cache miss    ┌──────────────┐
│  TenantDO   │ ──────────────→ │grove-curios-db│
│  (per-tenant)│ ←────────────── │  (D1 truth)   │
│             │   read config    │              │
│ curio_config│                  │ 22+ config   │
│  (cached)   │   flush cycle:   │   tables     │
│             │   invalidate on  │              │
│             │   admin save     │              │
└─────────────┘                  └──────────────┘
```

This is optional but valuable: `loadCurioStatus()` currently fires ~20 parallel D1 queries to check which curios are enabled. Caching this in TenantDO (with invalidation on admin save) would reduce it to a single DO fetch.

### What Moves (39 tables)

**Config tables (one row per tenant):**

- `timeline_curio_config`, `gallery_curio_config`, `journey_curio_config`
- `pulse_curio_config`, `guestbook_config`, `ambient_config`
- `hit_counters`, `status_badges`, `activity_status`
- `nowplaying_config`, `mood_ring_config`, `cursor_config`

**Data tables (growing collections per tenant):**

- `timeline_summaries`, `timeline_activity`, `timeline_ai_usage`
- `journey_snapshots`, `journey_summaries`, `journey_jobs`
- `gallery_images`, `gallery_tags`, `gallery_image_tags`, `gallery_collections`, `gallery_collection_images`
- `pulse_events`, `pulse_daily_stats`, `pulse_hourly_activity`
- `guestbook_entries`, `hit_counter_visitors`
- `link_gardens`, `link_garden_items`
- `nowplaying_history`, `polls`, `poll_votes`
- `mood_ring_log`, `blogroll_items`
- `webring_memberships`, `artifacts`
- `badge_definitions`, `tenant_badges`, `custom_badges`
- `bookmark_shelves`, `bookmarks`, `shrines`
- `clipart_placements`, `custom_uploads`

### Code Changes (Mechanical)

All curio routes use this pattern:

```typescript
// BEFORE
const db = platform?.env?.DB;
const result = await db
	.prepare(`SELECT ... FROM curio_table WHERE tenant_id = ?`)
	.bind(tenantId)
	.first();

// AFTER
const db = platform?.env?.CURIO_DB; // ← only this line changes
const result = await db
	.prepare(`SELECT ... FROM curio_table WHERE tenant_id = ?`)
	.bind(tenantId)
	.first();
```

Files to update (~50 files):

- `libs/engine/src/routes/api/curios/*/+server.ts` (22+ files)
- `libs/engine/src/routes/arbor/curios/*/+page.server.ts` (22+ files)
- `libs/engine/src/routes/(site)/*/+page.server.ts` (public curio pages)
- `libs/engine/src/lib/server/curio-status.ts` (loadCurioStatus)
- `workers/pulse/` (pulse aggregation)
- `workers/timeline-sync/` (timeline sync)

### Cross-Tenant Worker Considerations

Two workers currently do cross-tenant curio queries:

| Worker                   | Current Pattern                                              | After Extraction         |
| ------------------------ | ------------------------------------------------------------ | ------------------------ |
| `workers/pulse/`         | Queries `pulse_events` grouped by tenant_id from `env.DB`    | Change to `env.CURIO_DB` |
| `workers/timeline-sync/` | Queries `timeline_curio_config` across tenants from `env.DB` | Change to `env.CURIO_DB` |

Both workers' wrangler configs would get `CURIO_DB` bindings.

### Migration Strategy

```
1. Create grove-curios-db via wrangler
2. Compile curio migrations into a single schema file
3. Apply schema to new D1
4. Copy data: export from engine-db, import to curios-db
5. Add CURIO_DB binding to engine + worker wrangler configs
6. Update code (mechanical: env.DB → env.CURIO_DB in curio routes)
7. Deploy with feature flag: CURIO_DB_ENABLED
8. Verify reads from new DB match old DB
9. Switch writes to new DB
10. After verification: migration to drop curio tables from engine-db
```

---

## Phase 4: Hygiene

**Effort:** Low | **Impact:** Quality of life | **Risk:** None

### Migration Numbering

Document the 3 existing conflicts (031, 032, 056) — these are already applied and can't be renumbered. Add a reservation system:

```
libs/engine/migrations/NEXT_MIGRATION_NUMBER.txt
→ Contains: "085" (or whatever the current next number is)
→ Updated atomically when creating new migrations
```

### Landing Auth Investigation

Landing still actively uses its own `users`, `sessions`, `magic_codes` tables in `grove-engine-db`. This needs a separate investigation:

- Is landing auth redundant with Heartwood?
- Can it be migrated to use Heartwood session validation exclusively?
- If yes: drop 3 tables. If no: document why it exists separately.

**This is NOT part of the consolidation plan — it's a follow-up task.**

---

## Final State (Verified 2026-02-22)

### Database Map

| Database | ID | Tables | Binding | Owner | Purpose |
| --- | --- | :---: | --- | --- | --- |
| `grove-engine-db` | `a6394da2-b7a6-48ce-b7fe-b1eb3e730e68` | **78** | `DB` | libs/engine | Core platform (tenants, posts, pages, auth, social, moderation, billing) |
| `grove-curios-db` | `b03756ad-30d7-427a-9a1b-ec2f6478fcbd` | **45** | `CURIO_DB` | libs/engine (curios) | All curio widget config & data |
| `grove-observability-db` | `59e70f9e-8f9c-4021-96e5-1e130e753766` | **16** | `OBS_DB` | workers/vista-collector | Platform monitoring + sentinel |
| `groveauth` | — | ~22 | `DB` | services/heartwood | Authentication (Better Auth) |
| `ivy-db` | — | ~10 | `DB` | apps/ivy | Email client |
| `zephyr-logs` | — | ~5 | `DB` | services/zephyr | Email delivery |
| `forage-jobs` | — | ~2 | `DB` | services/forage | Domain search |
| `amber` | — | ~4 | `DB` | services/amber | Storage management |
| `grove-warden` | — | 2 | `DB` | workers/warden | Agent auth |
| `grove-backups-db` | — | ? | `DB` | apps/clearing | Backup metadata |
| `shutter-offenders` | — | 1 | `DB` | libs/shutter | Image moderation |

### Binding Map (Multi-DB Apps)

```
apps/landing/wrangler.toml:
  DB       → grove-engine-db      (core platform)
  OBS_DB   → grove-observability-db (vista dashboard)
  CURIO_DB → grove-curios-db      (curio routes)

workers/timeline-sync/wrangler.toml:
  DB       → grove-engine-db      (SecretsManager: tenant_secrets, tenants)
  CURIO_DB → grove-curios-db      (timeline_* tables)
```

### The Numbers (Actual)

| Metric | Before | After | Change |
| --- | :---: | :---: | :---: |
| `grove-engine-db` tables | ~123 | 78 | **-37%** |
| Shop tables dropped (Phase 1) | 9 | 0 | **-9** |
| Observability tables extracted (Phase 2) | 16 | 0 | **-16** |
| Curio tables extracted (Phase 3) | 45 | 0 | **-45** |
| Total D1 databases | 9 | 11 | +2 |
| Files modified (Phase 3) | 0 | ~91 | |
| Data rows migrated (Phase 3) | — | 398 | |

### Phase Execution Order (Actual)

```
Phase 1: Drop Shop Tables   ──→ DONE (migration 085)
              │
Phase 2: Extract Observability ──→ DONE (16 tables → grove-observability-db)
              │
Phase 3: Extract Curios      ──→ DONE (45 tables → grove-curios-db)
              │
Phase 4: Hygiene             ──→ Remaining (LS cleanup, migration numbering)
```

### Lessons Learned

1. **Table counts in planning docs are always wrong.** Plan said 39 curio tables, reality was 45. ALTER TABLE modifications across multiple migrations had to be merged into the unified schema.
2. **Cross-DB routes are the hard part.** The mechanical `DB → CURIO_DB` swap across 80+ files was trivial. The 3 timeline routes needing dual bindings (SecretsManager on core DB, curio tables on CURIO_DB) required careful analysis.
3. **D1 UNION ALL has a strict limit.** Can't count rows across 20+ tables in one query. Had to iterate individually.
4. **The extraction pattern proved repeatable.** Phase 2 (OBS_DB) established the pattern; Phase 3 (CURIO_DB) scaled it to 45 tables and ~91 files with confidence.

---

## Architecture Decision Record

**Context:** `grove-engine-db` accumulated ~120 tables across 11 responsibilities. Write pressure from time-series observability data mixed with low-write application data. Curio widget tables (39) dominated the table count.

**Decision:** Extract curio and observability tables into dedicated D1 databases. Drop unused shop tables. Keep D1 as the source of truth everywhere — use DO SQLite only for caching and ephemeral state with flush-to-D1 cycles.

**Consequences:**

- grove-engine-db shrinks by 48%, becoming a focused platform database
- Each domain owns its storage: curios have a database, observability has a database
- Workers can bind to only the databases they need (vista-collector no longer needs the full engine DB)
- The pattern is established: future features get their own D1 instead of piling into engine
- Trade-off: workers that touch both curios and core data need dual DB bindings
- Trade-off: 2 additional D1 databases to manage (but Cloudflare D1 databases are free to create)

---

_The blueprint held. From this height, every boundary is clear. The river of curio data flows to its own lake. The watchtowers of observability stand on their own hill. And the engine — lighter, focused, purposeful — does what it was always meant to do: serve the grove._

_Completed February 22, 2026. grove-engine-db: 123 → 78 tables. The forest breathes easier._
