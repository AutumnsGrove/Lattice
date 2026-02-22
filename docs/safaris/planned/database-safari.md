---
title: "Database Safari — The Underground Expedition"
status: planned
category: safari
---

# Database Safari — The Underground Expedition

> _How big have we sprawled? Let's find out._
> **Aesthetic principle**: Lean, intentional schema design — every table earns its place
> **Scope**: All D1 databases, all migrations, all DO-internal SQLite, the full subterranean landscape

---

## Ecosystem Overview

**9 D1 databases** across the Lattice monorepo
**117 migration SQL files** across 9 migration directories
**~137 CREATE TABLE statements** in engine migrations alone
**~120 estimated live tables** in `grove-engine-db` (after drops/recreations)
**20 additional tables** inside 7 Durable Objects
**24 wrangler configs** with D1 bindings (all pointing at these 9 databases)

### The Nine Databases

| #   | Database            | Migrations                                  | Est. Tables | Owner              | Purpose                               |
| --- | ------------------- | ------------------------------------------- | ----------- | ------------------ | ------------------------------------- |
| 1   | `grove-engine-db`   | **96** (84 engine + 8 landing + 4 clearing) | **~120**    | libs/engine        | THE monolith — everything             |
| 2   | `groveauth`         | 14                                          | ~22         | services/heartwood | Authentication (Better Auth + legacy) |
| 3   | `ivy-db`            | 3                                           | ~10         | apps/ivy           | Email client                          |
| 4   | `zephyr-logs`       | 3                                           | ~5          | services/zephyr    | Email delivery & broadcasts           |
| 5   | `forage-jobs`       | 2                                           | ~2          | services/forage    | Domain search jobs                    |
| 6   | `amber`             | 1-2                                         | ~4          | services/amber     | Storage management                    |
| 7   | `grove-warden`      | schema only                                 | 2           | workers/warden     | Agent authentication                  |
| 8   | `grove-backups-db`  | 0 (ref only)                                | ?           | apps/clearing      | Backup metadata                       |
| 9   | `shutter-offenders` | 1                                           | 1           | libs/shutter       | Image moderation blocklist            |

### Plus: Durable Object Internal SQLite (20 tables across 7 DOs)

| DO Class      | Service         | Tables                                                         | Pattern                      |
| ------------- | --------------- | -------------------------------------------------------------- | ---------------------------- |
| PostContentDO | durable-objects | `content`, `kv_store`                                          | Single-row JSON per post     |
| PostMetaDO    | durable-objects | `meta`, `reactions`, `view_log`, `kv_store`                    | Per-post analytics           |
| TenantDO      | durable-objects | `config`, `drafts`, `analytics_buffer`, `kv_store`             | Per-tenant state             |
| ThresholdDO   | durable-objects | `rate_limits`, `kv_store`                                      | Per-identifier rate limiting |
| SessionDO     | heartwood       | `sessions`, `rate_limits`                                      | Per-user session management  |
| SearchJobDO   | forage          | `search_job`, `domain_results`, `search_artifacts`, `kv_store` | Per-search state             |
| ExportJobV2   | amber           | `export_job`, `export_files`, `export_missing`, `kv_store`     | Per-export state             |

---

## Phase 2: SURVEY — The Landscape from Above

_Standing up in the jeep, one hand on the roll bar. The terrain below is... dense. grove-engine-db is a city. The other databases are villages scattered at the edges. Let's categorize what we see._

### grove-engine-db: Table Categories

The ~120 tables in `grove-engine-db` can be grouped into **10 functional domains**:

| Domain                    | Est. Tables | Biggest Migration(s)                           | Condition                                              |
| ------------------------- | ----------- | ---------------------------------------------- | ------------------------------------------------------ |
| **Curios** (blog widgets) | **~39**     | 024-075 (20+ migrations)                       | 🟡 Growing — each curio = 1-4 tables                   |
| **Infrastructure/Ops**    | **~19**     | 032_sentinel (6), 080_observability (10)       | 🟠 Wilting — sentinel + obs = 16 tables for monitoring |
| **Commerce/Shop**         | **~11**     | 007_shop_payments (11 tables in ONE migration) | 🔴 Barren? — is the shop even active?                  |
| **Social/Community**      | **~12**     | 051_reeds (4), 076_meadow (6)                  | 🟡 Growing — meadow is new and active                  |
| **Auth & Security**       | **~12**     | 001, 002, 014, 020, 028, 029, 035, 039         | 🟡 Mixed — some legacy, some active                    |
| **Core Multi-Tenant**     | **~7**      | 005, 009                                       | 🟢 Thriving — the foundation                           |
| **Content Moderation**    | **~5**      | 030_petal (3), 044_thorn (2)                   | 🟡 Growing — safety infrastructure                     |
| **Git Dashboard**         | **~2**      | 032_git_dashboard (1)                          | 🟠 Questionable — is this still used?                  |
| **Landing/Marketing**     | **~8**      | landing/0000-0006                              | 🟡 Growing — porch, feedback, emails                   |
| **Status Page**           | **~6**      | clearing/0001                                  | 🟢 Stable — the clearing does its job                  |

---

## Phase 3 & 4: OBSERVE & SKETCH — Stop by Stop

### Stop 1: The Curio Sprawl (39 tables) 🟡

_The jeep rolls into a vast field of wildflowers. Each one different. Each one beautiful. But there are SO MANY and they're all planted in the same garden bed._

**What we see through the binoculars:**

Every curio gets its own table(s) in `grove-engine-db`. The pattern is consistent:

- Simple curios (1 table): `hit_counters`, `status_badges`, `activity_status`, `artifacts`, `cursor_config`, `mood_ring_config`, `ambient_config`, `shrines`, `clipart_placements`, `custom_uploads`
- Medium curios (2 tables): `link_gardens` + `link_garden_items`, `nowplaying_config` + `nowplaying_history`, `polls` + `poll_votes`, `mood_ring_config` + `mood_ring_log`, `bookmark_shelves` + `bookmarks`, `guestbook_config` + `guestbook_entries`
- Complex curios (3-4 tables): `badge_definitions` + `tenant_badges` + `custom_badges`, `timeline_*` (4 tables), `journey_*` (4 tables), `pulse_*` (4 tables)
- Gallery curio (6 tables!): config + images + tags + image_tags + collections + collection_images

**The pattern:** All curios are `tenant_id`-scoped. Most share the same schema shape: a config table keyed by `tenant_id`, plus data tables with `tenant_id` FK. This is consistent but repetitive.

**Key observation:** The curio tables are ALL in the same D1 database. Every tenant's curio data for all 22+ curio types lives in `grove-engine-db`. That's a lot of tables for what are essentially small, optional widgets.

**Sketch:**

- [ ] **Consider:** Could curio data live in TenantDO's internal SQLite instead? Each tenant gets their own DO — curio config/data could be per-tenant DO storage instead of central D1 rows. This would massively reduce grove-engine-db table count.
- [ ] **Or:** A generic `curio_data` table with `(tenant_id, curio_type, key, value_json)` pattern could replace 20+ single-purpose config tables.
- [ ] **Migration numbering:** The curio block runs from 056-075 and is relatively clean, but it's 20 migrations that each add 1-4 tables.

---

### Stop 2: The Shop System (11 tables) 🔴

_Through the dust haze, an entire marketplace appears — stalls set up, signs painted, counters built. But... is anyone shopping?_

**What we see:**

Migration `007_shop_payments.sql` created an entire e-commerce system in one shot:

- `products`, `product_variants`, `customers`, `orders`, `order_line_items`
- `subscriptions`, `connect_accounts`, `platform_billing`
- `refunds`, `discount_codes`, `webhook_events`

**Key question:** Is any of this actively used? If the shop is dormant or was an early experiment that never shipped, these 11 tables are pure dead weight in the schema.

**Sketch:**

- [ ] **Audit:** Check if any code currently reads/writes to shop tables
- [ ] **If dormant:** Consider a migration to DROP these tables and reclaim schema space
- [ ] **If active:** These belong in their own database (`grove-shop-db`?) not mixed into the engine monolith

---

### Stop 3: The Observability Empire (16 tables) 🟠

_A watchtower complex rises from the savanna. Towers within towers. Instruments everywhere. Who watches the watchers?_

**What we see:**

Two separate systems, both for monitoring:

**Sentinel (migration 032, 6 tables):**

- `sentinel_runs`, `sentinel_metrics`, `sentinel_checkpoints`
- `sentinel_baselines`, `sentinel_schedules`, `sentinel_test_data`

**Vista Observability (migration 080, 10 tables):**

- `observability_metrics` (general time-series)
- `observability_health_checks`
- `observability_d1_stats`, `observability_r2_stats`, `observability_kv_stats`, `observability_do_stats`
- `observability_daily_costs`
- `observability_alert_thresholds`, `observability_alerts`
- `observability_collection_log`

**The concern:** 16 tables for monitoring — in the same database that handles user content. Monitoring data is high-write, time-series data with rolling retention (90 days). This is fundamentally different from user content (low-write, keep-forever).

**Sketch:**

- [ ] **Strong candidate for extraction:** Observability data should NOT live in the same D1 as user content. A separate `grove-observability-db` would isolate write pressure.
- [ ] **Sentinel overlap:** Does Sentinel overlap with Vista? Are both needed, or did Vista supersede Sentinel?
- [ ] **Consider:** Zephyr already has its own DB for logs. Observability should follow the same pattern.

---

### Stop 4: The Feature Flag System (3 tables) 🟡

_A control panel in the wilderness. Switches and dials. Some are flipped, some are dusty._

**Migration 020:** `feature_flags`, `flag_rules`, `flag_audit_log`

**Observation:** Feature flags are critical infrastructure but also relatively small. These 3 tables are fine in the engine DB — they're low-write, frequently-read, and tightly coupled to tenant behavior. No action needed.

---

### Stop 5: The Auth Strata (12 tables) 🟡

_Layers of sediment. Old auth, new auth, rate limiting, magic codes. Archaeological strata visible in the canyon wall._

**What we see:**

Multiple generations of auth tables in `grove-engine-db`:

- **Gen 1 (migrations 001-002):** `magic_codes`, `rate_limits`, `failed_attempts`
- **Gen 2 (migration 014):** `users`
- **Gen 3 (migrations 028-029):** `email_verifications`, `username_audit_log`
- **Supporting:** `feature_flags` (020), `audit_log` (035), `tenant_secrets` (039)

**Key observation:** Auth also lives in `groveauth` (Heartwood). The engine DB has its OWN auth tables (`magic_codes`, `rate_limits`, `users`) that are separate from Heartwood's auth tables. This is a known split — engine handles tenant-level auth while Heartwood handles platform/SSO auth.

**Sketch:**

- [ ] **Verify:** Are engine-side `magic_codes` and `rate_limits` still used after the Heartwood migration to Better Auth?
- [ ] If legacy auth tables in engine are dead, they should be dropped

---

### Stop 6: Meadow Social (6 tables) 🟢

_A meadow, appropriately. Fresh grass. New growth. The community gathering space._

**Migration 076:** `meadow_posts`, `meadow_votes`, `meadow_reactions`, `meadow_bookmarks`, `meadow_follows`, `meadow_reports`
**Plus:** 077 (visibility), 078 (notes), 079 (per-post exclude) — ALTER TABLE additions

**Observation:** Clean, well-designed schema. Active feature. Properly scoped with tenant_id. The 6 tables are necessary and well-structured. No sprawl concern here.

---

### Stop 7: Reeds Comments (4 tables) 🟢

_A stream bed with rushes growing. Organized, flowing._

**Migration 051:** `comments`, `comment_rate_limits`, `blocked_commenters`, `comment_settings`

**Observation:** Clean schema. Each table serves a clear purpose. Active feature. No concerns.

---

### Stop 8: The Landing Tables in Engine DB (8 tables) 🟠

_Wait — what are THESE doing here?_

**What we see:**

The `apps/landing/migrations/` directory has 8 migration files that target `grove-engine-db`:

- `email_signups`, `users` (landing), `sessions` (landing), `magic_codes` (landing), `cdn_files`
- `feedback`, `porch_visits`, `porch_messages`

**The concern:** The landing page has its OWN auth tables (`users`, `sessions`, `magic_codes`) inside `grove-engine-db`. These are separate from both the engine auth tables AND the Heartwood auth tables. Three auth systems in one codebase.

**Sketch:**

- [ ] **Clarify:** Does the landing page still use its own auth? Or has it migrated to Heartwood?
- [ ] **If migrated:** Drop the landing auth tables
- [ ] **Porch tables** (`porch_visits`, `porch_messages`) seem fine where they are

---

### Stop 9: Migration Numbering Conflicts 🔴

_Three pairs of footprints diverge at the same point. Someone wasn't watching the trail markers._

**Duplicate migration numbers in `libs/engine/migrations/`:**

- `031_gallery_curio.sql` AND `031_petal_upload_gate.sql`
- `032_git_dashboard.sql` AND `032_sentinel.sql`
- `056_pulse_curio.sql` AND `056_storage_exports_updated_at.sql`

**Impact:** D1 migrations run in alphabetical order within the same number, so these likely executed fine. But it indicates times when two features were developed in parallel without coordinating migration numbers.

**Sketch:**

- [ ] Not fixable retroactively (migrations are already applied)
- [ ] Consider: Add a migration number reservation system (a simple text file?)

---

### Stop 10: Heartwood Auth DB (22 tables) 🟡

_A separate fortress on the hill. Well-built, but carrying archaeological layers._

**What we see:**

The `groveauth` database has:

- **Legacy auth (001-009, schema.sql):** `clients`, `users`, `allowed_emails`, `auth_codes`, `refresh_tokens`, `magic_codes`, `rate_limits`, `failed_attempts`, `audit_log`, `oauth_states`, `device_codes`, `user_sessions`, `user_client_preferences`, `user_subscriptions`, `subscription_audit_log`, `cdn_files`, `ba_two_factor`
- **Better Auth (0001-0002):** `ba_user`, `ba_session`, `ba_account`, `ba_verification`, `ba_passkey`
- **Cleanup (0010):** DROPPED `oauth_states`, `auth_codes`, `magic_codes`

**Key observation:** The mixed numbering scheme (001 vs 0001) tells the story of a migration FROM a custom auth system TO Better Auth. Legacy tables were dropped in 0010. This is actually CLEAN — the transition was handled properly.

**Sketch:**

- [ ] **Verify:** Are ALL legacy tables actually dropped, or do some zombies remain?
- [ ] The `cdn_files` table in an auth database is suspicious — what CDN files does auth need?

---

### Stop 11: Ivy Email DB (10 tables) 🟢

_A small, tidy post office at the edge of the settlement._

**3 migrations, 10 tables.** All prefixed with `ivy_`. Clean separation. Own database. This is how it should be done.

---

### Stop 12: The Durable Object Underground (20 tables) 🟢

_Below the surface, each creature has its own burrow. Isolated. Self-contained. Tidy._

**Pattern:** Each DO instance gets its own SQLite database via Cloudflare's storage API. Tables are created with `CREATE TABLE IF NOT EXISTS` — no versioned migrations.

**The good:** Perfect isolation. PostMetaDO for Post #123 has its own `reactions` table that can never collide with Post #456. TenantDO for Tenant A has its own `drafts` table.

**The concern:** No migration system. Schema changes must be backwards-compatible (`IF NOT EXISTS`, add columns with defaults). This is fine for now but could become painful for breaking changes.

**Sketch:**

- [ ] Consider: Could some grove-engine-db curio data migrate INTO TenantDO's SQLite? Each tenant's curio config is already tenant-scoped — it could live in their DO.
- [ ] The `kv_store` table (via LoomDO) is present in 5 of 7 DOs — good consistency.

---

## Phase 5: CAMP — The Expedition Summary

_The sun touches the horizon. Orange light floods the savanna. The journal comes out one last time._

### By the Numbers

| Metric                                      | Count       |
| ------------------------------------------- | ----------- |
| D1 Databases                                | **9**       |
| Total migration files                       | **117**     |
| Engine migrations (grove-engine-db)         | **84**      |
| Other DB migrations                         | **33**      |
| Estimated tables in grove-engine-db         | **~120**    |
| Tables in other D1 databases                | **~46**     |
| Tables in DO internal SQLite                | **~20**     |
| **Total tables across all storage**         | **~186**    |
| Migration numbering conflicts               | **3 pairs** |
| Auth systems (engine + landing + heartwood) | **3**       |

### Condition Report

| Zone                                             | Condition   | Assessment                                |
| ------------------------------------------------ | ----------- | ----------------------------------------- |
| Core multi-tenant (tenants, posts, pages, media) | 🟢 Thriving | Foundation is solid                       |
| Curio tables (39 tables)                         | 🟡 Growing  | Consistent pattern but MASSIVE footprint  |
| Shop/Commerce (11 tables)                        | 🔴 Barren?  | Possibly dead weight — needs audit        |
| Observability (16 tables)                        | 🟠 Wilting  | Wrong database — should be extracted      |
| Meadow/Reeds social (10 tables)                  | 🟢 Thriving | Clean, active, well-designed              |
| Landing auth in engine DB                        | 🟠 Wilting  | Possible zombie tables                    |
| Heartwood auth DB                                | 🟢 Thriving | Messy history but clean current state     |
| Ivy, Zephyr, Forage, Warden                      | 🟢 Thriving | Proper isolation in own databases         |
| DO internal SQLite                               | 🟢 Thriving | Good patterns, no migration system though |

### The Sprawl Diagnosis

**grove-engine-db is doing too much.** It's simultaneously:

1. A multi-tenant CMS (posts, pages, media)
2. A widget configuration store (22+ curio types)
3. An e-commerce platform (11 shop tables)
4. A monitoring system (16 observability/sentinel tables)
5. A social network (meadow + comments)
6. An auth system (magic codes, users, sessions)
7. A moderation platform (petal, thorn)
8. A feature flag service
9. A git dashboard backend
10. A landing page backend (email signups, feedback, porch)
11. A status page backend (clearing incidents)

**That's 11 distinct responsibilities in one database.**

### Cross-Cutting Themes

1. **The monolith problem:** `grove-engine-db` has grown organically from "the tenant database" to "the everything database." 16+ workers/services bind to it because it's the path of least resistance.

2. **Curio table explosion:** Each new curio adds 1-6 tables. With 22+ curios, this is the single biggest contributor to table count. A generic `curio_config` + `curio_data` pattern or moving curio state into TenantDO could dramatically reduce this.

3. **Monitoring doesn't belong with content:** Observability and Sentinel data (16 tables) is high-write time-series data living alongside low-write user content. These should be extracted to their own D1.

4. **Three auth systems:** Engine auth, Landing auth, and Heartwood auth all have their own tables. The first two may have zombie tables that can be dropped.

5. **Landing/Clearing migrations target engine DB:** Two separate apps push migrations into `grove-engine-db`. This makes migration coordination harder and blurs ownership boundaries.

6. **The good news:** Services that have their OWN databases (Ivy, Zephyr, Forage, Warden, Shutter) are clean, well-scoped, and properly isolated. The pattern works — it just wasn't applied to the engine.

### Recommended Action Plan

**Phase 1: Audit (low effort, high clarity)**

- [ ] Audit shop tables — is any code reading/writing to them? If not, drop all 11.
- [ ] Audit landing auth tables — still needed or replaced by Heartwood?
- [ ] Audit engine auth tables (magic_codes, rate_limits) — still used or legacy?
- [ ] Audit git_dashboard tables — active feature or experiment?
- [ ] Check Sentinel vs Vista overlap — do both monitoring systems need to exist?

**Phase 2: Extract (medium effort, high impact)**

- [ ] Extract observability tables to `grove-observability-db` (16 tables out)
- [ ] Extract sentinel tables to same DB or drop if superseded by Vista
- [ ] Consider extracting shop to `grove-shop-db` if it's active

**Phase 3: Consolidate Curios (high effort, highest impact)**

- [ ] Design a generic curio storage pattern (config table + data table with `curio_type` discriminator)
- [ ] OR move curio state into TenantDO internal SQLite
- [ ] Would remove ~30 tables from grove-engine-db

**Phase 4: Hygiene**

- [ ] Resolve the 3 duplicate migration number pairs (document, don't renumber)
- [ ] Add migration number reservation file to prevent future conflicts
- [ ] Consolidate landing/clearing migrations into engine migration directory (single owner)
- [ ] Document which tables are in which database (this safari journal is a start!)

### The Dream State

If all phases completed, `grove-engine-db` would go from ~120 tables to roughly:

- Core: ~7 (tenants, posts, pages, media, site_settings, sessions, tenant_settings)
- Auth: ~5 (users, email_verifications, audit_log, tenant_secrets, username_audit)
- Features: ~3 (feature_flags, flag_rules, flag_audit_log)
- Curios: ~2 (curio_config, curio_data) — generic pattern
- Social: ~10 (meadow + reeds)
- Moderation: ~5 (petal + thorn)
- Commerce: 0-11 (dropped or extracted)
- Landing: ~5 (signups, feedback, porch)
- Clearing: ~6 (status page)
- Misc: ~5 (themes, fonts, onboarding, storage exports, reserved usernames)

**That's ~48-58 tables** — less than half the current count.

---

_The fire dies to embers. The journal is full — 12 stops, ~186 tables mapped across 9 databases and 7 Durable Objects. The underground is vast, but the paths through it are clear now. Tomorrow, the animals go to work. But tonight? Tonight was the drive. And it was glorious._ 🚙
