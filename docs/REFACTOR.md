# The Great Grove Refactor - May 2026

## The Problem

Grove has massively overextended. The codebase advertises **63 services** across Workshop.svelte, but the core blogging platform (Garden/Blooms creation) requires maybe 15-20 of them. The rest are:
- Experimental features with 0% test coverage
- Personal tools that snuck into the monorepo
- Ambitious vision features built on unstable foundations
- Half-implemented integrations with no actual usage

**The consequences:**
- **Auth/Signup breaks constantly** (67 fixes in 6 months) - the core onboarding flow is flaky
- **Engine core fragility** (101 fixes in 6 months) - large refactors cascade into 5-7 rounds of fixes
- **No local development environment** - commits go straight to production because service bindings and DOs can't be tested locally
- **11.5% test coverage overall** - critical systems like Billing (5%), Login (2%), Firefly (0%), and Durable Objects (0%) are untested
- **Zero observability** - no way to know if signups complete, which features are used, or what's breaking for users
- **Test theater** - heavily mocked tests that don't actually validate critical paths
- **Pre-commit/pre-push gaps** - no svelte-check, no tests, no full app builds in hooks. Only "affected shims" typechecked. This is why CI fails 5-7 rounds.

This is the exact pattern from the her-go refactor: too many features burning iteration budget while the core loop is fragile.

## The Decision

**Timeline:** THIS WEEK (emergency mode)

**Execution:** ONE ATOMIC PR - junk drawer everything at once, then stabilize what remains

**Philosophy:** Reliability over features. A stable blogging platform with solid core features beats an unstable platform with 63 half-working ones.

---

## The Scope

### **KEEP (Core Platform - The Essential 21)**

#### Infrastructure (5)
1. **Lattice/Engine** - Core framework (needs reliability work)
2. **Heartwood** - Auth (needs simplification: Google OAuth only)
3. **Prism** - Design tokens (16 files, stable)
4. **Lumen** - AI gateway (68 files, well-tested, tightly coupled with Thorn - cannot separate)
5. **Warden** - API credential gateway (12 tests, production-critical)

#### User-Facing Apps (5)
6. **Aspen** - Main blog app (325 files, most developed)
7. **Landing** - Marketing site (255 files, needs stability work)
8. **Garden/Blooms** - Content creation (the actual product)
9. **Arbor** - Admin panel (essential control plane)
10. **Flow** - Writing editor (2,280 lines, no alternative)

#### Supporting Services (5)
11. **Foliage** - Theming (61 files, well-tested)
12. **Amber** - Storage (basic file upload/storage viz only, not full Google Drive)
13. **Billing** - Stripe integration (95% untested, needs major work)
14. **Patina** - Backups (essential for trust)
15. **Clearing** - Status pages (essential for trust)

#### Social & Discovery (2) - ESSENTIAL TO THE GROVE VISION
16. **Lantern** - Cross-grove navigation (essential gateway to finding other groves; friends system needs reliability work, follows need fixing)
17. **Reeds** - Comments system (essential to blogging; threaded comments, moderation, private replies)

#### Curios (4 only - from 18+)
18. **Gallery** - Photo galleries (not technically a curio, works)
19. **Guestbook** - Visitor entries (works, keep it)
20. **Polls** - Voting (works)
21. **Timeline** - GitHub activity (works, **move OUT of greenhouse to production**)

**Total: 21 features/services** (down from 63)

---

### **JUNK DRAWER (Eventually Want - Needs Stable Foundation First)**

**19 services + Meadow** going to `_junkdrawer/` (may return when core is rock solid):

#### Experimental Features (5 greenhouse flags)
1. **Wisp** - AI writing assistant (parent feature)
2. **Fireside** - AI writing prompts (child of Wisp)
3. **Scribe** - Voice transcription (child of Wisp)
4. **Chirp** - Direct messaging (just added March, 0% tests, no love yet)
5. **Reverie** - AI site config ("just use Foliage" - active service bindings will be severed)

#### Ambitious Vision Features (7)
6. **Ivy** - Email client (49 files, 0% crypto tests, months away)
7. **Wander** - 3D grove exploration (completely out of scope for now)
8. **Nook** - Video sharing (planned, GitHub repo exists)
9. **Terrarium** - Graphical design editor (5 files stub)
10. **Gossamer** - ASCII effects (21 files, works but not essential)
11. **Meadow** - Social feed (7 tables, 61 files, needs extremely stable foundation)
12. **Amber (full)** - Full Google Drive experience (basic storage viz stays, full app goes)

#### Infrastructure (3)
13. **Firefly** - Job orchestration (1,089 LOC, 0% tests, powers NOTHING in production)
14. **Loft** - SSH dev sessions (worker directory is empty, only Go CLI exists)
15. **Outpost** - Minecraft server (going to junk drawer, mc-control doesn't even exist as a worker)

#### Curios (14+ widgets)
16-30+. **All curios except Gallery, Guestbook, Polls, Timeline:**
   - Journey, Pulse, Hit Counter, Link Garden, Bookmark Shelf, Shrines, Mood Ring, Badges, Now Playing, Status Badge, Activity Status, Webring, Artifacts, Cursor, Blogroll, Ambient, Clipart

---

### **REMOVE COMPLETELY (Out of Scope - Never Coming Back)**

**6 features** that are personal tools or completely out of scope:

1. **Verge** - Remote AI coding (personal tool, not Grove-related)
2. **Moss** - AI chat memory (no AI chat in Grove, out of scope)
3. **Weave** - Animations/visual composition (we're not Canva)
4. **Etch** - Link saving (we're not Raindrop, personal want)
5. **Loft** - Dev environments (starting in junk drawer, likely full removal)
6. **Outpost** - Minecraft server (starting in junk drawer, likely full removal)

---

## The Analysis

### **Firefly: The Great Mirage**

Based on comprehensive import graph analysis:

**What Firefly Actually Powers:**
- **Outpost (Minecraft):** Has config preset, but **no actual Firefly SDK integration exists**
- **Loft (SSH sessions):** Has config preset, but **worker directory is empty** (only Go CLI works)
- **Queen CI:** Fully spec'd (1,200+ lines), **zero implementation code**
- **Bloom (AI Agents):** Fully spec'd, **zero implementation code**

**Import Graph Results:**
- 20 source files (1,089 LOC)
- 0% test coverage
- **Zero actual usage** in production code
- Only imports are self-references and monitoring stubs

**Decision:** Firefly goes to junk drawer. 1,089 lines of unused infrastructure.

---

### **Reverie: Active Bindings, Still Junk-Drawering**

Reverie has active service bindings from Aspen and Engine wrangler.toml files. However:
- The feature is experimental and out of scope ("just use Foliage")
- Removing it requires: delete REVERIE binding from wrangler.toml + delete routes
- Workers `reverie` + `reverie-exec` move to junk drawer
- **This is a clean cut** - no other kept features import from Reverie

---

### **Engine Dependency Graph: Clean Separations**

Based on comprehensive import graph analysis:

| Feature | Imports From Kept | Imports From Junk | Clean to Remove? |
|---------|-------------------|-------------------|------------------|
| **Firefly** | auth/warden (types only) | None | YES (isolated) |
| **Reverie** | None | None | YES (cleanest cut) |
| **Scribe** | None | None | YES (only VoiceInput.svelte imports it) |
| **Curios (14+)** | None | None | YES (zero cross-curio deps) |
| **Thorn ↔ Lumen** | Each other | N/A | CANNOT separate (both kept) |
| **Email ↔ Zephyr** | Each other | N/A | CANNOT separate (both kept) |

**Conclusion:** This is a CLEAN ARCHITECTURAL CUT. Only 2 couplings exist (Thorn↔Lumen, Email↔Zephyr) and both are between kept features.

---

### **Curios Isolation: Surgical Precision**

The 4 kept curios (Gallery, Guestbook, Polls, Timeline) are COMPLETELY ISOLATED:
- Zero curio-to-curio imports
- Zero cross-curio foreign key constraints
- Each has its own API routes, admin UI, and database tables
- Shared infrastructure is curio-agnostic (`sanitize.ts`)

**Files to update (4 only):**
1. `libs/engine/src/lib/curios/index.ts` - Remove journey exports, keep 4
2. `libs/engine/src/lib/content/markdown/directives.ts` - Remove 12+ from CURIO_DIRECTIVES, keep guestbook + poll
3. `libs/engine/src/lib/curios/components/index.ts` - Remove 14+ curio component exports
4. `libs/engine/src/lib/server/curio-status.ts` - Remove queries for 14+ removed curios

**Directories to delete:** 16 curio directories (engine, Aspen admin, Aspen API)

---

### **Auth Simplification: Clean Surgery (~1,500 LOC)**

Google OAuth is **completely self-contained**:
- Uses `ba_account` table (separate from passkey/magic link tables)
- Zero shared code between auth methods
- Better Auth plugin architecture supports selective removal
- All 14 consumer apps unaffected (they just use sessions)

**Passkey removal (~1,100 LOC):**
- `services/heartwood/e2e/tests/passkey/` (3 files, 486 LOC)
- `services/heartwood/src/client/auth.ts` (passkey functions)
- `services/heartwood/src/auth/index.ts` (passkey plugin config)
- `services/heartwood/src/templates/settings.ts` (passkey UI)
- `apps/login/src/routes/passkey/` (setup page)
- `apps/plant/src/routes/auth/setup-passkey/` (onboarding redirect)
- Database table: `ba_passkey` (mark for removal)

**Magic link removal (~400 LOC):**
- `services/heartwood/src/client/auth.ts` (magic link function)
- `services/heartwood/src/auth/index.ts` (magic link plugin + email templates)
- `services/heartwood/src/routes/betterAuth.ts` (rate limiters + redirect logic)
- `apps/plant/src/routes/auth/magic-link/` (callback route)
- Database table: `ba_verification` (safe to drop, tokens are ephemeral)

**Risk level: LOW** — No shared dependencies outside Better Auth plugins.

---

### **Local Dev: The Missing Foundation**

**Current State:**
- 75% functional, 25% blocked
- Individual apps/workers work fine with `pnpm dev`
- Robust mocking infrastructure exists (D1, KV, R2, DOs all mocked) — but we want real code
- Only 3 workers use `@cloudflare/vitest-pool-workers` (lumen, durable-objects, billing-api)
- Wrangler 4.82 installed (supports multi-config dev)

**The Blockers (Original):**
1. ~~**Service bindings** - workers calling other workers require manual start-in-order~~
2. ~~**Durable Objects** - DOs in separate worker unreachable from apps~~
3. **Secrets management** - no `.dev.vars` propagation to all services
4. **Stripe** - needs test key + secret in local environment
5. **Data seeding** - empty local D1 databases need schema + test data

**Key Discovery (May 2026 research):**
- **Wrangler multi-config dev** (`wrangler dev -c a.toml -c b.toml`) runs all workers in a single miniflare instance with automatic service binding resolution and cross-script Durable Objects. This eliminates blockers #1 and #2 entirely.
- **Google OAuth works on localhost** — `http://localhost:8787/api/auth/callback/google` is valid. No tunnel needed for basic auth testing.
- **DOs are "just SQLite runners"** — Loom SDK wraps `DurableObjectState.storage.sql` with helpers. Miniflare provides real SQLite locally, preserving single-writer guarantees.
- **Existing mock SDK** (`libs/infra/src/testing/`) remains valuable for unit tests but is NOT needed for local dev integration.

**The Fix (Revised — Real Code, No Mocks):**
1. Use `wrangler dev -c` multi-config to run all workers in one process
2. SvelteKit apps (`vite dev`) connect to multi-worker instance via service bindings
3. Add `.dev.vars.example` templates for remaining services
4. Create `scripts/dev-stack.sh` orchestration (start wrangler + vite apps + optional tunnel)
5. Seed local D1 with migrations + test tenant data
6. Document everything in `docs/LOCAL_DEV.md`

**Service dependency chain:**
```
Multi-config wrangler dev (single miniflare instance, port 8787):
├── groveauth (Heartwood)     — auth API
├── grove-zephyr              — email gateway
├── grove-email-render        — email templates
├── grove-durable-objects     — 6 DO classes (real SQLite)
├── grove-lumen               — AI gateway
├── grove-warden              — credential gateway
├── grove-billing-api         — Stripe integration
├── grove-vista-collector     — observability
└── grove-onboarding          — email sequences

SvelteKit apps (separate vite dev processes):
├── aspen (5173)  → service bindings resolve to wrangler instance
├── landing (5174) → service bindings resolve to wrangler instance
└── plant (5175)   → service bindings resolve to wrangler instance
```

**Auth strategy:**
- **Day-to-day:** localhost OAuth (zero setup, Google exempts localhost from HTTPS)
- **Cookie testing:** `dev.grove.place` tunnel (production-identical `.grove.place` cookies)
- **Both documented**, user chooses based on what they're testing

---

### **Hooks Gap Analysis: Why CI Fails 5-7 Rounds**

**Pre-commit catches (11 checks):**
- YAML lint, Prettier, ESLint, TypeScript (staged files only)
- Bare fetch CSRF, engine barrel exports, @lucide/svelte imports
- Barrel cascade imports, hardcoded accent colors
- Commit message format, secrets scanner

**Pre-push catches (6 checks):**
- Lockfile sync, deploy manifest drift
- Affected libs build, SvelteKit sync
- Affected shims typecheck, wrangler dry-run

**CRITICAL GAPS (what's missing):**
| Gap | Impact | Fix |
|-----|--------|-----|
| No `svelte-check` | 10-15% of type errors slip through | Add to pre-push |
| No test execution | Broken tests only caught in CI | Add opt-in pre-push test runner |
| No full app build | App build failures only caught in CI | Add app builds to pre-push |
| Only "affected shims" typechecked | Cross-workspace type errors slip through | Expand to full workspace |
| No Tailwind class validation | Styling typos slip through | Add class validator |

**Adding svelte-check + full workspace typecheck to pre-push would eliminate ~40% of CI round-trips.**

---

### **Billing & Plant: Clean, Independent, Undertested**

**Key findings:**
- Billing is COMPLETELY independent of auth methods (only cares about Stripe webhooks)
- No junk drawer dependencies in either system
- Free tier (wanderer) creates tenant immediately, paid tier waits for webhook
- `payment_completed_at` column issue is fixed (was causing April breakage)
- Both have duplicate `createTenant()` logic (should centralize later)

**Minimum viable signup flow (Google OAuth only):**
1. Google OAuth → creates `user_onboarding` record
2. Profile page (username, display name)
3. Plan selection (wanderer = immediate tenant, paid = Stripe checkout)
4. Webhook creates tenant → redirect to blog

---

### **Workers: Minimal Set Needed**

| Worker | Status | Keep? | Reason |
|--------|--------|-------|--------|
| **grove-lumen** | Core | YES | AI gateway, bound by apps |
| **grove-warden** | Core | YES | Credential gateway |
| **grove-patina** | Core | YES | Backups (essential trust) |
| **grove-webhook-cleanup** | Core | YES | Retention cron |
| **grove-vista-collector** | Core | YES | Metrics |
| **grove-onboarding** | Core | YES | Email sequences |
| **grove-subscription-digest** | Core | YES | Nightly summaries |
| **grove-email-catchup** | Core | YES | Weekly digest |
| **grove-reverie** | Junk | NO | Sever binding from Aspen/Engine |
| **grove-reverie-exec** | Junk | NO | Goes with Reverie |
| **grove-timeline-sync** | Junk | NO | ORPHANED - Timeline works without it |
| **grove-meadow-poller** | Junk | NO | Goes with Meadow |
| **grove-loft** | Junk | NO | Empty directory |
| **mc-control** | Dead | REMOVE | Doesn't exist! Dead reference in router |

---

## The Plan

### **Phase 0: Research & Audit (Day 1 - Monday)** ✅ COMPLETE

1. ✅ Map feature surface area (Workshop.svelte: 63 services)
2. ✅ Identify junk drawer candidates (19 services + Meadow)
3. ✅ Analyze Firefly dependencies (powers nothing)
4. ✅ Investigate local dev blockers (service orchestration + secrets)
5. ✅ Audit remaining features for reliability (Heartwood, Aspen, Landing, Billing, Plant)
6. ✅ Create dependency graph (full service binding map)
7. ✅ Review pre-commit/pre-push hooks (11 checks, 6 critical gaps)
8. ✅ Document test coverage gaps (11.5% overall)
9. ✅ Confirm Lantern and Reeds STAY (essential features)
10. ✅ Get user approval on final junk drawer list

---

### **Phase 1: The Great Junk Drawer (Day 2-3 - Tue/Wed)**

**Goal:** Reduce scope from 63 services to 21 core features. ONE ATOMIC PR.

#### **Step 1: Create Infrastructure**
```bash
mkdir -p _junkdrawer/{features,workers,curios,apps}
```

#### **Step 2: Move Workers to Junk Drawer**
```bash
# Workers (5 moves)
mv workers/reverie _junkdrawer/workers/
mv workers/reverie-exec _junkdrawer/workers/
mv workers/loft _junkdrawer/workers/
mv workers/meadow-poller _junkdrawer/workers/
mv workers/timeline-sync _junkdrawer/workers/
```

#### **Step 3: Move Apps to Junk Drawer**
```bash
# Apps (3 moves)
mv apps/ivy _junkdrawer/apps/
mv apps/terrarium _junkdrawer/apps/
mv apps/meadow _junkdrawer/apps/
```

#### **Step 4: Move Engine Features to Junk Drawer**
```bash
# Engine lib features (3 moves)
mv libs/engine/src/lib/firefly _junkdrawer/features/
mv libs/engine/src/lib/ai/reverie _junkdrawer/features/reverie-schemas/
# Note: VoiceInput.svelte imports scribe - delete the component
```

#### **Step 5: Delete Curio Directories (16 removals)**
```bash
# Engine curio code
rm -rf libs/engine/src/lib/curios/{activitystatus,ambient,artifacts,badges,blogroll,clipart,cursors,customuploads,hitcounter,journey,moodring,nowplaying,shelves,shrines,statusbadge,webring}

# Aspen admin routes
rm -rf apps/aspen/src/routes/arbor/curios/{activitystatus,ambient,artifacts,badges,blogroll,clipart,cursors,customuploads,hitcounter,journey,moodring,nowplaying,shelves,shrines,statusbadge,webring}

# Aspen API routes
rm -rf apps/aspen/src/routes/api/curios/{activitystatus,ambient,artifacts,badges,blogroll,clipart,cursors,customuploads,hitcounter,journey,moodring,nowplaying,shelves,shrines,statusbadge,webring}
```

#### **Step 6: Delete Aspen Junk Drawer Routes**
```bash
# Reverie (AI config)
rm -rf apps/aspen/src/routes/arbor/reverie
rm -rf apps/aspen/src/routes/api/reverie

# Chirp (messaging)
rm -rf apps/aspen/src/routes/arbor/chat
rm -rf apps/aspen/src/routes/api/chat

# Wisp/Fireside (AI writing)
rm -rf apps/aspen/src/routes/api/grove/wisp

# Meadow opt-in
rm -f apps/aspen/src/routes/api/admin/meadow/+server.ts
```

#### **Step 7: Delete Landing Junk Drawer Routes**
```bash
# Outpost/Minecraft (mc-control doesn't even exist)
rm -rf apps/landing/src/routes/arbor/minecraft
rm -rf apps/landing/src/routes/api/minecraft

# Firefly observability (stub that returns empty data)
rm -rf apps/landing/src/routes/arbor/vista/firefly

# Meadow observability
rm -rf apps/landing/src/routes/arbor/vista/meadow
rm -rf apps/landing/src/routes/api/admin/observability/meadow
```

#### **Step 8: Update Service Bindings (wrangler.toml)**
```toml
# apps/aspen/wrangler.toml - REMOVE:
# [[services]] binding = "REVERIE"
# Durable Object: CHAT binding

# services/grove-router/wrangler.toml - REMOVE:
# [[services]] binding = "MC_CONTROL"

# services/heartwood/src/routes/minecraft.ts - DELETE FILE
```

#### **Step 9: Update Engine Barrels & Infrastructure**

**`libs/engine/src/lib/curios/index.ts`** - Remove journey, keep only:
- timeline, gallery, guestbook, polls

**`libs/engine/src/lib/content/markdown/directives.ts`** - Update CURIO_DIRECTIVES:
- Keep: `["guestbook", "poll"]`
- Remove: 12+ other curio types

**`libs/engine/src/lib/curios/components/index.ts`** - Remove all 14+ curio component exports

**`libs/engine/src/lib/server/curio-status.ts`** - Remove queries for 14+ removed curios

**`libs/engine/src/lib/monitoring/observability/`** - Remove firefly-aggregator, meadow references

#### **Step 10: Disable Feature Flags**
Set `enabled=0` for greenhouse flags of removed features:
- `wisp_enabled`
- `fireside_mode`
- `scribe_mode`
- `chirp_enabled`
- `reverie_enabled`

**KEEP ENABLED (promote to production):**
- `reeds_comments` → keep enabled, remove `greenhouse_only` restriction
- `lantern_enabled` → keep enabled, remove `greenhouse_only` restriction
- Timeline → move out of greenhouse to production

#### **Step 11: Update Workshop Data**
Update `apps/landing/src/routes/workshop/workshop-data.ts`:
- Remove or mark junk drawer features as "planned" or "coming later"
- Keep core 21 features prominently displayed
- Reduce visible active service count

#### **Step 12: Complete Removal (Out of Scope - Delete Entirely)**
Features with no preservation value:
- Verge, Moss, Weave, Etch references in Workshop data
- Any planned routes or stubs for these features

#### **Step 13: Validation**
```bash
pnpm install
pnpm -r run lint
pnpm -r run build
pnpm -r run check  # svelte-check
pnpm -r run test:run
```

All must pass before PR is created.

---

### **Phase 2: Auth Simplification (Day 3 - Wed)**

**Goal:** Reduce auth from 3 methods to 1 reliable method (Google OAuth only)

#### **Removal Checklist:**

**Passkeys (~1,100 LOC):**
- [ ] Delete `services/heartwood/e2e/tests/passkey/` (3 files, 486 LOC)
- [ ] Delete `services/heartwood/e2e/fixtures/webauthn.ts` (158 LOC)
- [ ] Delete `apps/login/src/routes/passkey/`
- [ ] Delete `apps/plant/src/routes/auth/setup-passkey/`
- [ ] Remove passkey functions from `services/heartwood/src/client/auth.ts`
- [ ] Remove passkey plugin from `services/heartwood/src/auth/index.ts`
- [ ] Remove passkey rate limiters from middleware
- [ ] Remove passkey UI from settings template

**Magic Links (~400 LOC):**
- [ ] Remove magic link function from `services/heartwood/src/client/auth.ts`
- [ ] Remove magic link plugin + email templates from `services/heartwood/src/auth/index.ts`
- [ ] Remove magic link rate limiter
- [ ] Delete `apps/plant/src/routes/auth/magic-link/`
- [ ] Clean up redirect conversion logic in betterAuth.ts

**Plant Signup Simplification:**
- [ ] Remove auth method selection UI (Google OAuth button only)
- [ ] Remove passkey setup step from onboarding
- [ ] Remove email verification step (OAuth verifies email)
- [ ] Simplify flow: OAuth → Profile → Plan → Checkout → Success

**Database (mark deprecated, don't drop yet):**
- [ ] `ba_passkey` table → mark for 30-day retention then drop
- [ ] `ba_verification` table → safe to drop immediately (ephemeral tokens)

**Validation:**
- [ ] Google OAuth login works end-to-end
- [ ] Signup flow completes without errors
- [ ] All 14 consumer apps still validate sessions
- [ ] E2E tests for Google OAuth pass

---

### **Phase 3: Local Dev Setup (Day 4 - Thu)**

**Goal:** Run the real Grove stack locally — real workers, real DOs, real D1/KV/R2, no mocks.

**Key discovery:** Wrangler 4.82 supports multi-config dev (`wrangler dev -c a.toml -c b.toml ...`), running all workers in a single miniflare instance with automatic service binding resolution, cross-script Durable Objects with real SQLite, and local D1/KV/R2. This eliminates the need for mocks, separate process orchestration, or dev-registry polling.

**Auth discovery:** Google OAuth allows `http://localhost` redirect URIs (explicit exemption from HTTPS requirement). No tunnel needed for day-to-day dev. The existing `dev.grove.place` tunnel (`scripts/dev-tunnel.sh`) is available for production-parity cookie testing when needed.

---

#### **Step 1: Design Multi-Config Dev Architecture**

Wrangler multi-config runs one **primary worker** (exposed over HTTP) and N **auxiliary workers** (reachable only via service bindings). Two modes:

**Full stack mode** (all workers):
```bash
# Primary: grove-router (gateway, catches all requests)
# Auxiliary: groveauth, grove-zephyr, grove-email-render,
#            grove-durable-objects, grove-lumen, grove-warden,
#            grove-billing-api, grove-vista-collector, grove-onboarding
wrangler dev \
  -c services/grove-router/wrangler.toml \
  -c services/heartwood/wrangler.toml \
  -c services/zephyr/wrangler.toml \
  -c services/durable-objects/wrangler.toml \
  -c workers/lumen/wrangler.toml \
  -c workers/warden/wrangler.toml \
  -c services/billing-api/wrangler.toml \
  # ... etc
```

**Minimal mode** (core platform only):
```bash
# Primary: groveauth (port 8787, handles auth directly)
# Auxiliary: grove-zephyr, grove-durable-objects
wrangler dev \
  -c services/heartwood/wrangler.toml \
  -c services/zephyr/wrangler.toml \
  -c services/durable-objects/wrangler.toml
```

**SvelteKit apps** (aspen, landing, plant) run as separate `vite dev` processes on their own ports (5173, 5174, 5175). Their service bindings (`AUTH`, `ZEPHYR`, etc.) need to resolve to the wrangler multi-worker instance — this may require dev-overlay wrangler configs or `wrangler pages dev` integration.

**Key constraint:** The multi-config `-c` flag is experimental (wrangler 4.x). If it doesn't work for our setup, fall back to separate `wrangler dev` processes with the file-based dev registry (`--x-registry`).

#### **Step 2: Create Dev Wrangler Overlays**

Production `wrangler.toml` files reference remote D1 database IDs, KV namespace IDs, etc. For local dev, miniflare creates local equivalents automatically — but we may need dev-specific configs that:

- Remove or stub `routes` declarations (no custom domains locally)
- Remove `[env.production]` sections
- Set explicit `[dev]` port assignments (avoid all defaulting to 8787)
- Use local-only D1/KV/R2 names (miniflare creates them as empty local stores)

Options:
- **Dev overlay files** (`wrangler.dev.toml`) — cleanest, but wrangler doesn't natively merge configs
- **Environment sections** (`[env.local]`) — use `wrangler dev --env local`
- **Symlinks / script generation** — orchestration script generates dev configs at startup

Decide which approach based on proof-of-concept results.

#### **Step 3: Port Assignments**

| Service | Port | Type |
|---------|------|------|
| grove-aspen | 5173 | SvelteKit (vite dev) |
| grove-landing | 5174 | SvelteKit (vite dev) |
| grove-plant | 5175 | SvelteKit (vite dev) |
| Multi-worker instance | 8787 | wrangler dev (primary worker) |
| showroom | 5188 | SvelteKit (vite dev) |

SvelteKit apps connect to the multi-worker instance at 8787 for service bindings.

#### **Step 4: Auth — Localhost Google OAuth**

**Simple path (no tunnel):**
1. Register `http://localhost:8787/api/auth/callback/google` in Google Cloud Console
2. Configure Heartwood for dev mode:
   - `trustedOrigins: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "localhost:*"]`
   - `advanced.defaultCookieAttributes.secure: false` (required for `http://`)
   - `advanced.defaultCookieAttributes.sameSite: "lax"`
3. Set `BETTER_AUTH_URL=http://localhost:8787` in heartwood `.dev.vars`

**Production-parity path (tunnel):**
- Use existing `scripts/dev-tunnel.sh` for `dev.grove.place` → localhost
- Already wired: Heartwood trusts `*.grove.place`, cookies on `.grove.place` domain
- Use when testing cookie behavior, CORS, or cross-subdomain flows

#### **Step 5: Add .dev.vars Templates**

Create `.dev.vars.example` for services missing them:

| Service | File | Required Vars |
|---------|------|---------------|
| billing-api | `services/billing-api/.dev.vars.example` | STRIPE_SECRET_KEY (test mode), STRIPE_WEBHOOK_SECRET |
| durable-objects | `services/durable-objects/.dev.vars.example` | (none required — bindings are local) |
| zephyr | `services/zephyr/.dev.vars.example` | RESEND_API_KEY (or stub for local) |
| lumen | `workers/lumen/.dev.vars.example` | OPENROUTER_API_KEY, ANTHROPIC_API_KEY |
| warden | `workers/warden/.dev.vars.example` | WARDEN_ADMIN_KEY |

Already exist: aspen, landing, plant, heartwood, engine.

#### **Step 6: Create Orchestration Script**

`scripts/dev-stack.sh` (or integrate as `gw dev`):

```bash
#!/usr/bin/env bash
# Usage:
#   ./scripts/dev-stack.sh              Full stack (all workers + aspen)
#   ./scripts/dev-stack.sh minimal      Core only (auth + email + DOs + aspen)
#   ./scripts/dev-stack.sh workers      Workers only (no SvelteKit apps)
#
# Starts:
#   1. Multi-config wrangler dev (all workers in one miniflare instance)
#   2. SvelteKit app(s) via vite dev
#   3. Optional: dev tunnel for auth testing
```

Script responsibilities:
- Check `.dev.vars` files exist (warn if missing, link to setup docs)
- Start wrangler multi-config in background
- Wait for wrangler to be healthy (poll `/health` or port check)
- Start SvelteKit apps
- Trap SIGINT to clean shutdown all processes
- Print URLs and status on startup

#### **Step 7: Seed Local Data**

Empty local D1 databases need schema + seed data to be useful:
- Run engine migrations against local D1 (`wrangler d1 migrations apply DB --local`)
- Run heartwood migrations against local heartwood D1
- Create seed script for a test tenant (user, tenant, sample posts)
- Consider: `scripts/dev-seed.sh` that populates a working local grove

#### **Step 8: Document in `docs/LOCAL_DEV.md`**

Sections:
- **Quick start** (3 commands to running stack)
- **Prerequisites** (cloudflared optional, Google Console setup for OAuth)
- **Architecture** (diagram of what runs where)
- **Port assignments** (table)
- **Modes** (full vs minimal vs workers-only)
- **Seeding data** (how to get a working local tenant)
- **Auth testing** (localhost vs tunnel)
- **Troubleshooting** (common issues)
- **What's NOT local** (Workers AI, Stripe webhooks in full mode)

#### **Step 9: Proof of Concept & Validation**

Before building the full orchestration:
1. PoC: Run 3 workers via `wrangler dev -c` and verify service bindings resolve
2. PoC: Verify cross-script DOs work (aspen calling TenantDO in grove-durable-objects)
3. PoC: Verify local D1 migrations work with multi-config
4. If multi-config doesn't work → fall back to dev-registry approach

**Validation gates:**
- [ ] `./scripts/dev-stack.sh` starts all services with one command
- [ ] Google OAuth login works end-to-end on localhost
- [ ] Can create a post in local Aspen (content creation flow)
- [ ] Durable Objects respond (TenantDO config, PostMetaDO reactions)
- [ ] D1 queries work (local database with seeded data)
- [ ] `Ctrl+C` cleanly shuts down everything
- [ ] Comments work (Reeds, if data is seeded)
- [ ] Lantern renders (even with empty friends list)

---

### **Phase 4: Observability Foundation — "Grove Pulse"**

**Goal:** Full product observability — know what's working, what's breaking, what's being used

**System: Grove Pulse** — a two-layer event pipeline (automatic + explicit) flowing through a
dedicated collector worker with DO-buffered D1 writes. Zero added latency to user requests
(fire-and-forget via service binding). Privacy-preserving (Rings model: daily-rotating visitor hash).

#### **1. Event Schema + Shared Library** (`libs/engine/src/lib/pulse/`)
- `PulseEvent` type: `{ event, category, route?, tenant_id?, visitor_hash?, metadata?, timestamp }`
- `emitEvent()` — fire-and-forget to pulse-collector via service binding
- `hashVisitor(ip, ua, dailySalt)` — privacy-preserving visitor identification
- Categories: `page`, `signup`, `publish`, `social`, `curio`, `error`, `feature`

#### **2. D1 Migrations** (in `grove-observability-db`)
- `pulse_events` — raw events, 90-day retention (daily cleanup via cron)
- `pulse_daily` — aggregated daily counts per route/event, 1-year retention
- `signup_funnel` — dedicated table: user_id, step, timestamp, metadata, duration_from_start

#### **3. Collector Worker** (`workers/pulse-collector/`)
- Receives events via service binding (POST) from all 8 apps
- Routes to `PulseBuffer` Durable Object (one per day partition)
- DO buffers events in memory, flushes to D1 on interval (10s) or threshold (100 events)
- Health endpoint + manual trigger for testing
- Daily cron: aggregate `pulse_events` → `pulse_daily`, prune >90-day raw events

#### **4. Automatic Instrumentation** (SvelteKit handle hooks)
- Add `pulseHook` to all 8 apps: aspen, landing, plant, billing, clearing, domains, login, amber
- Every request logged: route, method, status, duration_ms, tenant_id, visitor_hash
- Negligible overhead — async service binding call after response sent

#### **5. Signup Funnel Instrumentation** (Plant app)
- 7 explicit events across OAuth → tenant creation flow
- `signup.started` → `signup.oauth_complete` → `signup.profile_done` →
  `signup.email_verified` → `signup.plan_selected` → `signup.checkout_complete` →
  `signup.tenant_created`
- Each event includes: user_id, duration_from_start, step metadata

#### **6. Feature Instrumentation** (all apps)
- Publishing: `post.published`, `post.updated`, `post.deleted`
- Curios: `curio.deployed`, `curio.removed`
- Social: `comment.posted`, `comment.moderated`
- Navigation: `lantern.navigated`, `reeds.engaged`
- Content: `page.viewed` with section tag (knowledge_base, garden, settings, etc.)

#### **7. Error Capture**
- Server: automatic capture of uncaught errors in handle hook (`error.server`)
- Client: "Report Issue" button — captures URL + user agent + tenant + screenshot + stack
- Stored as pulse events with `error` category, queryable in dashboard

#### **8. Arbor Dashboard** (`/arbor/pulse`)
- Overview: today's requests, unique visitors, top routes, error rate
- Signup funnel: conversion rates between steps, drop-off visualization
- Feature usage: which features get used, by how many tenants
- Error log: recent errors with context, grouped by route
- Route heatmap: all routes ranked by traffic

#### **9. Vista Fixes (Stretch Goal)**
- Investigate API key sync issue blocking infra metrics
- Lower priority than Pulse — Pulse answers the questions that matter now

---

### **Phase 5: Stability Hardening (Day 5 - Fri)**

**Goal:** Fix the top breaking patterns and close hook gaps

#### **1. Close Hook Gaps**
- Add `svelte-check` to pre-push (catches 10-15% of type errors)
- Add full workspace typecheck for lib changes
- Consider opt-in test runner in pre-push

#### **2. Fix Plant (Signup) Reliability**
- Add integration tests for simplified OAuth-only flow
- Test edge cases: network failures, Stripe delays, duplicate webhooks
- Ensure idempotent tenant creation
- Target: signup works first try, every time

#### **3. Fix Color Token Enforcement**
- Pre-commit hook already catches hardcoded greens (good!)
- Verify no remaining violations
- Add CI lint rule for any that slip through

#### **4. Promote Lantern, Reeds, Timeline**
- Remove `greenhouse_only` restriction from Lantern flag
- Remove `greenhouse_only` restriction from Reeds flag
- Remove greenhouse gating from Timeline
- All three become production features available to all tenants

---

## Dependency Graph (Final)

```
CORE PLATFORM (21 features)
├── grove-aspen (Main blog app)
│   ├── → AUTH (groveauth) ✓
│   ├── → ZEPHYR (email) ✓
│   ├── → DB (grove-engine-db) ✓
│   ├── → CURIO_DB (grove-curios-db) ✓
│   ├── → CACHE_KV / FLAGS_KV ✓
│   ├── → IMAGES (R2) ✓
│   ├── → DOs: TENANTS, POST_META, POST_CONTENT, THRESHOLD, EXPORTS, SENTINEL ✓
│   ├── → REVERIE ❌ REMOVE BINDING
│   └── → CHAT ❌ REMOVE BINDING
│
├── grove-landing (Marketing + Admin)
│   ├── → AUTH, ZEPHYR, DB, OBS_DB, CURIO_DB ✓
│   ├── → VISTA_COLLECTOR, ONBOARDING ✓
│   └── → CDN_BUCKET (R2) ✓
│
├── grove-router (Passage)
│   ├── → AUTH_API ✓
│   ├── → WARDEN ✓
│   ├── → BILLING ✓
│   └── → MC_CONTROL ❌ DEAD (doesn't exist, remove reference)
│
├── groveauth (Heartwood) → ZEPHYR ✓
├── grove-billing-api → ZEPHYR ✓
├── grove-durable-objects (8 DOs) → ZEPHYR ✓
├── grove-zephyr → EMAIL_RENDER ✓
├── grove-lumen → WARDEN ✓
├── grove-warden (standalone) ✓
├── grove-patina (standalone backup cron) ✓
├── grove-clearing (standalone status page) ✓
├── grove-webhook-cleanup (standalone cron) ✓
├── grove-vista-collector (standalone metrics) ✓
├── grove-onboarding → ZEPHYR ✓
├── grove-subscription-digest → ZEPHYR ✓
└── grove-email-catchup → EMAIL_RENDER ✓

JUNK DRAWER (sever all connections)
├── grove-reverie → (was: lumen, auth, reverie-exec) ← SEVER
├── grove-reverie-exec → (was: grove-lattice) ← GOES WITH REVERIE
├── grove-timeline-sync ← ORPHANED (timeline works without it)
├── grove-meadow-poller ← GOES WITH MEADOW
├── grove-loft ← EMPTY DIRECTORY
└── mc-control ← DOESN'T EXIST (dead reference in router)
```

---

## Success Criteria

### **By End of Week:**

1. ✅ **Reduced scope:** 21 core features (down from 63)
2. ✅ **Junk drawer populated:** 19+ services preserved but inactive
3. ✅ **Auth simplified:** Google OAuth only, working reliably
4. ✅ **Lantern & Reeds promoted:** Out of greenhouse, available to all tenants
5. ✅ **Local dev works:** `pnpm dev:all` runs full stack
6. ✅ **Observability exists:** Can track signups, features, errors
7. ✅ **Hook gaps closed:** svelte-check + workspace typecheck in pre-push

### **Validation Gates:**

- [ ] `pnpm install && pnpm -r run build` passes with zero errors
- [ ] Can run full signup flow locally (no production commits needed)
- [ ] Can answer "how many signups this week?" with data
- [ ] Can answer "which curios are deployed?" with data
- [ ] Google OAuth login works end-to-end (all apps)
- [ ] Lantern renders for all logged-in users (not just greenhouse)
- [ ] Comments (Reeds) work for all tenants (not just greenhouse)
- [ ] CI passes first try after pre-push validation
- [ ] Workshop shows 21 core features clearly

---

## Risks & Mitigation

### **Risk 1: Breaking Production**
- **Mitigation:** One atomic PR allows clean rollback
- **Mitigation:** Full build + typecheck + test validation before merge
- **Mitigation:** Feature flags allow gradual re-enablement if needed

### **Risk 2: Losing Work**
- **Mitigation:** `_junkdrawer/` preserves all code (just moved)
- **Mitigation:** Git history preserved (file moves tracked as renames)
- **Mitigation:** Database migrations documented, not deleted

### **Risk 3: Missing Dependencies**
- **Mitigation:** Full dependency graph mapped via import analysis
- **Mitigation:** Service bindings explicitly documented
- **Mitigation:** Build validation catches any missing imports immediately

### **Risk 4: Reverie Binding Removal**
- **Mitigation:** Routes that USE Reverie are deleted in same PR
- **Mitigation:** wrangler.toml binding removal is reversible
- **Mitigation:** No other feature depends on Reverie

### **Risk 5: Curio Data Loss**
- **Mitigation:** Database tables stay (just orphaned, queries removed)
- **Mitigation:** Code moves to `_junkdrawer/`, not deleted
- **Mitigation:** Can reconnect later by moving code back + re-enabling

---

### **Phase 6: Dev Tooling Triage (GW + Git Hooks)**

**Goal:** Strip gw back to its useful core, fix broken git hooks, clean up Claude Code hooks.

**Context:** gw has grown to 76 Go files / 27,738 lines wrapping git, gh, wrangler, pnpm, and more. Most commands are thin passthrough that's _harder_ to use than the raw CLI because flags are missing. The pre-push git hook references stale `packages/` paths (should be `apps/` and `libs/`), so it type-checks zero packages. Claude Code hooks had a ghost (`buddi-hook.py`) firing on every event.

**Safari journal:** `docs/safaris/gw-triage-safari.md`

#### **Step 1: Claude Code Hook Cleanup** ✅ DONE (Session 4)
- Removed buddi-hook.py from user-level settings (was on 10 event types, file didn't exist)
- Removed block-bad-commands.py, block-npm.py (never wired in settings)
- Removed check-colors.py (duplicated pre-commit hook, never worked reliably)
- Removed auto-format.py (self-labeled "RETIRED"), langfuse.py (not working)
- Both `~/.claude/settings.json` and `.claude/settings.json` hooks now `{}`

#### **Step 2: Fix Pre-Push Git Hook**
- [ ] Fix stale `packages/$pkg` paths → should be `apps/` and `libs/` with correct names
- [ ] The hook checks 6 packages by name (`engine`, `landing`, `meadow`, `plant`, `clearing`, `terrarium`) — `meadow` and `terrarium` are junk-drawered, `clearing` may have moved
- [ ] Consider: is this hook even useful? It runs `pnpm check` per package sequentially, which is slow. The pre-commit hook already runs prettier + eslint + tsc on staged files.

#### **Step 3: GW Triage — Kill Dead Commands**
Remove ~16,000 lines (58% of gw) — commands that are harder than raw CLI:
- [ ] Kill all `gw git` except `worktree finish` (5,160 lines → ~100 lines)
- [ ] Kill `gw gh` except `issue` subcommand (4,500+ lines → ~782 lines)
- [ ] Kill `gw d1`, `gw kv`, `gw r2`, `gw deploy`, `gw flag`, `gw backup` (wrangler is easier)
- [ ] Kill `gw tui settings`, `gw loft`, `gw lattice`, `gw status`, `gw doctor`
- [ ] Kill `gw context`, `gw packages`, `gw monorepo-size`, `gw env-audit`, `gw config-validate`
- [ ] Kill `gw cache`, `gw history`, `gw metrics`, `gw health`, `gw onboarding`
- [ ] Kill `gw email`, `gw release`, `gw export`, `gw bindings`, `gw glimpse`, `gw logs`
- [ ] Kill `gw tenant`, `gw auth`, `gw login`

#### **Step 4: GW — Keep & Simplify**
What survives (~5,600 lines, 10 command groups):
- **KEEP:** `secret`, `publish`, `warden`, `social`, `todo`, `gh issue`, `update`
- **KEEP:** `git worktree finish` (the ONE git shortcut used)
- **SIMPLIFY:** `dev` (gut `dev_quality.go`, rebuild for Phase 3 local dev)
- **SIMPLIFY:** Safety tiers → only on commands that actually benefit

#### **Step 5: Update AGENT.md & Settings**
- [ ] Stop telling agents to use `gw git` — tell them to use raw `git`
- [ ] Remove `Bash(gw git:*)` from `.claude/settings.json` permissions
- [ ] Update `gw --help` to show ~10 things, not ~40
- [ ] Rebuild from the surviving cmd/ files (don't delete one by one — fork and keep)

---

### **Phase 7: Engine Decoupling**

**Goal:** Break the engine ↔ infra dependency cycle, decouple gossamer, establish a clean dependency DAG.

**Context (from dependency audit, Session 4):**

**The cycle:**
```
engine (@autumnsgrove/lattice)
  ├─ depends on: @autumnsgrove/infra     ←──┐
  └─ exports: ./errors                       │
                                             │
infra (@autumnsgrove/infra)                  │
  ├─ depends on: @autumnsgrove/lattice ──────┘  CYCLE
  └─ imports: logGroveError, GroveErrorDef from @autumnsgrove/lattice/errors (8 files)
```

**The gossamer coupling:**
- Only 2 files in the entire engine import gossamer: `Glass.svelte` and `GlassCard.svelte`
- Both import `GossamerClouds` from `@autumnsgrove/gossamer/svelte`
- Engine declares `@autumnsgrove/gossamer: workspace:*` as a dependency for 2 imports

**Foliage coupling:**
- NONE. Engine does not import foliage at all. Already decoupled.

#### **Step 1: Extract `grove-errors` Package**
- [ ] Create `libs/grove-errors/` — tiny package with `GroveErrorDef`, `logGroveError`, error catalog
- [ ] Move `libs/engine/src/lib/errors/` content into new package
- [ ] Update engine to depend on `@autumnsgrove/grove-errors` instead of self-referencing
- [ ] Update infra to depend on `@autumnsgrove/grove-errors` instead of `@autumnsgrove/lattice/errors`
- [ ] Remove infra's dependency on `@autumnsgrove/lattice` — **cycle broken**

#### **Step 2: Decouple Gossamer from Engine**
- [ ] Make gossamer a `peerDependency` or `optionalDependency` in engine
- [ ] OR: Move `GossamerClouds` import to a lazy/dynamic import in Glass.svelte and GlassCard.svelte
- [ ] OR: Move Glass/GlassCard out of engine into a UI package that depends on both engine + gossamer
- [ ] Remove `@autumnsgrove/gossamer: workspace:*` from engine's direct dependencies

#### **Step 3: Verify Clean DAG**
Target dependency graph:
```
prism (design tokens, zero deps)
grove-errors (error types + logging, zero deps)
  ↑
infra (depends on grove-errors, prism)
  ↑
engine (depends on infra, prism, grove-errors — NOT gossamer, NOT foliage)
  ↑
foliage (depends on prism)
gossamer (standalone, zero workspace deps)
grove-agent (depends on engine)
apps, services, workers
```

- [ ] `pnpm install` shows no cyclic workspace dependency warning
- [ ] Each lib builds independently in any order
- [ ] No lib depends on something "above" it in the graph

---

### **Phase 8: Engine Decomposition**

**Goal:** Break the monolithic engine (969 files, 24 subdirectories, 541 exports, 15 levels deep) into focused, independently-buildable packages.

**Context (from nesting audit, Session 4):**

The engine is a mega-package that re-exports everything through one `package.json` with 541 subpath exports. Finding anything requires navigating 10+ directory levels:

```
libs/engine/src/lib/ui/components/ui/waystone/Waystone.svelte  ← 10 dirs deep
```

**Current engine internals (24 subdirectories):**
| Directory | Files | What it is |
|-----------|-------|-----------|
| `ui/` | 369 | Components, stores, tokens, chat |
| `platform/` | 108 | Config, pricing, greenhouse, threshold, upgrades |
| `server/` | 97 | API helpers, services, middleware |
| `utils/` | 41 | Shared utilities |
| `auth/` | 37 | Auth integration, login, warden client |
| `components/` | 35 | Admin, custom, reeds, terminology |
| `email/` | 34 | Email templates and rendering |
| `ai/` | 34 | Lumen inference, providers |
| `monitoring/` | 30 | Observability, sentinel |
| `curios/` | 27 | Gallery, guestbook, polls, timeline |
| `content/` | 22 | Editor, markdown |
| `loom/` | 18 | Durable Objects SDK |
| `media/` | 15 | Amber media processing |
| `thorn/` | 14 | Content moderation |
| Everything else | ~88 | errors, social, data, types, styles, etc. |

**The Go-like approach:** Each concern becomes its own workspace package with flat structure:
- `@autumnsgrove/thorn` instead of `@autumnsgrove/lattice/thorn`
- `@autumnsgrove/loom` instead of `@autumnsgrove/lattice/loom`
- etc.

#### **Step 1: Identify Extraction Order**
Extract in dependency order (leaves first, roots last):
1. **Already extracted:** `grove-errors` (from Phase 7)
2. **Standalone subsystems:** `thorn`, `loom`, `scribe`, `zephyr` (few deps on engine internals)
3. **Data layer:** `content`, `curios`, `media/amber`
4. **Platform:** `platform` (config, pricing, greenhouse, threshold)
5. **Server:** `server` (API helpers, middleware)
6. **UI last:** `ui/` is the biggest and most interconnected — extract after everything else stabilizes

#### **Step 2: Define Package Template**
Each extracted package follows the same structure:
```
libs/<name>/
├── src/
│   ├── index.ts          (barrel export)
│   └── <flat files>.ts   (no deep nesting)
├── package.json          (workspace:* deps on what it needs)
├── tsconfig.json
└── vite.config.ts or svelte-package config
```

Max nesting: 3 levels from package root (`src/subfolder/file.ts`). No `src/lib/` wrapper unless SvelteKit requires it.

#### **Step 3: Extract Pilot — Thorn**
- [ ] Create `libs/thorn/` with thorn's 14 files
- [ ] Update all imports from `@autumnsgrove/lattice/thorn` → `@autumnsgrove/thorn`
- [ ] Remove thorn from engine's `src/lib/` and `package.json` exports
- [ ] Verify: thorn builds independently, consumers still work

#### **Step 4: Extract Pilot — Loom**
- [ ] Create `libs/loom/` with loom's 18 files
- [ ] Update all imports from `@autumnsgrove/lattice/loom` → `@autumnsgrove/loom`
- [ ] Remove loom from engine
- [ ] Verify: DOs still work with new import paths

#### **Step 5: Extraction Wave 2+**
Continue extracting based on Step 1 order. Each extraction follows the same pattern:
1. Create package, move files
2. Update imports across consumers
3. Remove from engine exports
4. Build + test

#### **Step 6: Engine Residual**
After extraction, the engine becomes a thin orchestration layer:
- Re-exports from extracted packages for backward compat (temporary)
- Contains only what's genuinely cross-cutting
- `package.json` exports shrink from 541 to ~50
- Eventually: engine disappears entirely, replaced by direct imports

---

## Post-Refactor: What's Next?

**After the phases above:**

1. **Increase test coverage** - Target 40% overall (currently 11.5%)
2. **Fix Lantern reliability** - Friends system flaky, follows don't work
3. **Fix Reeds reliability** - Ensure comments work consistently
4. **Evaluate junk drawer items** - Based on usage data from observability
5. **Selective rebuild** - Bring back features with clear demand, >40% test coverage, integration tests
6. **Foliage completion** - Theming needs work but separate effort
7. **Billing testing** - Add Stripe test mode to local dev, add integration tests

---

## The Bottom Line

Grove tried to be everything at once: blogging platform + email client + Minecraft server + 3D exploration + AI agents + 18 widget types + DMs + video sharing. The result: nothing works reliably.

**This refactor:** Cut scope to 21 core features (including Lantern for discovery and Reeds for comments), make those bulletproof, then selectively rebuild.

**Her-go taught us:** You can't stabilize the core while building 63 features simultaneously. Junk drawer the nice-to-haves, nail the essentials, then bring things back one at a time with tests.

**This week:** Emergency surgery. Reduce the surface area, stabilize what remains, add visibility so we can make data-driven decisions about what to bring back.

---
---

## Runbook: Session Continuity & Progress Tracking

### Handoff Prompt (Copy this to start a new session)

```
I'm working on The Great Grove Refactor (docs/REFACTOR.md). Read that document
fully before doing anything else. It contains:
- The full plan, dependency graph, and scope decisions
- Progress tracker showing exactly where we left off
- Conductor workflow (you orchestrate, subagents implement)

Check the Progress Tracker section to see what's done and what's next.
Then tell me what the next step is and ask if I'm ready to proceed.

Workflow: You are the conductor (Opus). Dispatch sonnet-coders or opus-coders
for implementation work. Use mv/rm commands directly for simple file moves.
Review all subagent work before marking steps complete. Update the progress
tracker in this document after each completed step.
```

---

### Conductor Workflow

**You (Opus) are the conductor.** Your job:
1. Read the progress tracker to understand current state
2. Identify the next step(s) that can be parallelized
3. Dispatch subagents (sonnet-coder for straightforward work, opus-coder for complex refactoring)
4. Review their work when it lands (check actual file changes, not just summaries)
5. Update the progress tracker in this document
6. Report to the user what was accomplished

**Subagent dispatch rules:**
- **Simple file moves** (`mv`, `rm -rf`): Do directly in Bash, no subagent needed
- **Barrel/index updates** (removing exports, updating arrays): sonnet-coder
- **Route deletions** (entire route trees): sonnet-coder
- **Service binding changes** (wrangler.toml edits): sonnet-coder
- **Auth simplification** (removing plugins, cleaning up logic): opus-coder (complex, cross-file)
- **Feature flag changes** (DB migrations, flag config): sonnet-coder
- **New infrastructure** (orchestration scripts, observability): opus-coder
- **Validation** (running builds, tests): house-bash

**After each step:**
1. Run `pnpm install` to verify no broken deps
2. Run `pnpm -r run build` for affected packages
3. Update progress tracker below
4. If build fails: fix before proceeding (don't accumulate errors)

---

### Progress Tracker

**Last updated:** 2026-05-18 (Session 10 - Phase 8 Step 5c DONE: grove-markdown extracted)

#### Phase 0: Research & Audit
| Step | Status | Notes |
|------|--------|-------|
| Map feature surface area | ✅ DONE | 63 services in Workshop.svelte |
| Identify junk drawer candidates | ✅ DONE | 19 services + Meadow |
| Analyze Firefly dependencies | ✅ DONE | Powers nothing in production |
| Investigate local dev blockers | ✅ DONE | Service orchestration + secrets |
| Audit Heartwood auth | ✅ DONE | Clean removal of passkeys + magic links (~1,500 LOC) |
| Audit Aspen dependencies | ✅ DONE | Full route deletion map created |
| Audit Landing dependencies | ✅ DONE | Minecraft/Outpost UI + dead refs identified |
| Audit Billing/Plant | ✅ DONE | Clean, independent, undertested |
| Audit engine dep graph | ✅ DONE | Moderately clean cut, 2 kept couplings |
| Audit workers/services | ✅ DONE | timeline-sync orphaned, mc-control dead |
| Audit pre-commit/pre-push hooks | ✅ DONE | 11 checks, 6 critical gaps |
| Audit curios isolation | ✅ DONE | Zero cross-curio deps, clean isolation |
| Confirm Lantern + Reeds STAY | ✅ DONE | Essential features, promote from greenhouse |
| User approval on final list | ✅ DONE | 21 keep, 19+ junk drawer, 6 remove |

#### Phase 1: The Great Junk Drawer ✅ COMPLETE
| Step | Status | Notes |
|------|--------|-------|
| 1. Create _junkdrawer/ structure | ✅ DONE | `_junkdrawer/{features,workers,curios,apps}` |
| 2. Move workers (5) | ✅ DONE | reverie, reverie-exec, loft, meadow-poller, timeline-sync |
| 3. Move apps (3) | ✅ DONE | ivy, terrarium, meadow |
| 4. Move engine features | ✅ DONE | firefly, reverie-schemas, VoiceInput, FiresideChat |
| 5. Move curio directories (16+) | ✅ DONE | Engine + Aspen admin/API + components + (site) routes |
| 6. Move Aspen junk drawer routes | ✅ DONE | reverie, chat, wisp, meadow opt-in |
| 7. Move Landing junk drawer routes | ✅ DONE | minecraft, firefly vista, meadow vista |
| 8. Update service bindings | ✅ DONE | REVERIE, CHAT, MC_CONTROL removed + minecraft route |
| 9. Update engine barrels | ✅ DONE | curios, directives, components, curio-status, observability, package.json |
| 10. Disable feature flags | ✅ DONE | KnownFlagId cleaned + migration 113 |
| 11. Promote Lantern/Reeds/Timeline | ✅ DONE | Migration 113: greenhouse_only = 0 |
| 12. Update Workshop data | ✅ DONE | 4 deleted, 12 marked "planned" |
| 13. Complete removal | ✅ DONE | Verge/Moss/Weave/Etch removed from workshop |
| 14. Validation (build + lint) | ✅ DONE | All packages build + lint clean (0 errors) |

#### Phase 2: Auth Simplification
| Step | Status | Notes |
|------|--------|-------|
| Remove passkey code (~1,100 LOC) | ✅ DONE | 28 files moved, 45+ files edited across 5 apps |
| Remove magic link code (~400 LOC) | ✅ DONE | 4 route dirs moved, email templates removed |
| Simplify Plant signup | ✅ DONE | Invite page → Google OAuth, setup-passkey step removed |
| Mark deprecated DB tables | ✅ DONE | ba_passkey, ba_verification (migration 0014), magic_codes |
| Remove dead deps | ✅ DONE | @better-auth/passkey, @simplewebauthn/browser from login+heartwood |
| Phase 1 deep sweep | ✅ DONE | 75+ more files: Lumen reverie tasks, threshold configs, FeedDO/ChatDO/TriageDO, Arbor UI, Lantern destinations, Router rules, Prism icons, pricing text, terrarium components |
| Validation (build + typecheck) | ✅ DONE | All packages build + typecheck clean |

#### Phase 3: Local Dev Setup (Revised — Real Code, No Mocks)
| Step | Status | Notes |
|------|--------|-------|
| 0. PoC — multi-config works | ✅ DONE | Aspen + DOs + Zephyr running in single miniflare instance |
| 0a. Fix LoomDO for local dev | ✅ DONE | `implements DurableObject` → `extends DurableObject` (cloudflare:workers import) |
| 0b. Fix DO migrations | ✅ DONE | Added `deleted_classes` v9 migration for TriageDO/ChatDO/FeedDO |
| 0c. Verify prod safety | ✅ DONE | dry-run deploy clean, tsc clean, svelte-check clean |
| 1. Design multi-config architecture | ✅ DONE | Heartwood runs separately (route leak bug); rest in multi-config. Dev registry auto-connects service bindings. |
| 2. Create dev wrangler overlays | ✅ SKIP | Not needed — prod wrangler.toml works locally as-is (miniflare ignores remote IDs) |
| 3. Assign ports | ✅ DONE | Aspen:5173, Heartwood:8787 |
| 4. Auth — localhost Google OAuth | 🔨 IN PROGRESS | Register localhost callback, Heartwood dev mode |
| 5. Add .dev.vars templates | ✅ DONE | durable-objects, zephyr, lumen, warden |
| 6. Create orchestration script | ✅ DONE | `scripts/dev-stack.sh` — seed, reset, full stack modes |
| 7. Seed local data | ✅ DONE | Midnight Bloom tenant rendering at localhost:5173 |
| 8. Document in LOCAL_DEV.md | ⬜ TODO | Quick start, architecture, troubleshooting |
| 9. Full validation | ⬜ TODO | End-to-end: OAuth login → create post → view post |

#### Phase 4: Observability — "Grove Pulse"

**Goal:** Full product observability — know what's working, what's breaking, what's being used.

**Architecture:**
```
┌─────────────────────────────────────────────────────┐
│  AUTOMATIC LAYER (every request)                     │
│  SvelteKit handle hook in each app                   │
│  → route, method, status, duration, tenant, visitor  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  grove-pulse   │  ← shared event API
              │  (engine lib)  │     libs/engine/src/lib/pulse/
              └───────┬────────┘
                      │
┌─────────────────────┼──────────────────────────────┐
│  EXPLICIT LAYER     │  (business events)            │
│  signup.started     │  signup.profile_completed     │
│  post.published     │  curio.deployed               │
│  comment.posted     │  error.client_reported        │
│  page.knowledge_base_read                           │
└─────────────────────┼──────────────────────────────┘
                      │
                      ▼ (service binding, fire-and-forget)
         ┌────────────────────────┐
         │  pulse-collector       │  ← new worker
         │  (Cloudflare Worker)   │     workers/pulse-collector/
         └───────────┬────────────┘
                     │
                     ▼ (buffered writes)
         ┌────────────────────────┐
         │  PulseBuffer DO        │  ← batches events
         │  flush every 10s or    │     reduces D1 write pressure
         │  when buffer hits 100  │
         └───────────┬────────────┘
                     │
                     ▼
         ┌────────────────────────┐
         │  grove-observability-db │  ← already exists
         │  (D1)                   │
         │  pulse_events (90-day)  │
         │  pulse_daily (1-year)   │
         │  signup_funnel          │
         └────────────────────────┘
                     │
                     ▼
         ┌────────────────────────┐
         │  Arbor Dashboard        │
         │  /arbor/pulse           │
         └────────────────────────┘
```

**Design decisions:**
- New worker (not extending vista-collector) — different concerns, different access patterns
- DO buffer — D1 can't handle a write per request at scale; batch 100 events → 1 INSERT
- Reuse `grove-observability-db` — already exists, already bound. No new DB needed
- Inherit Rings privacy model — daily-rotating visitor hash (IP+UA), no PII stored
- Service binding (fire-and-forget) — zero added latency to user requests

**Automatic instrumentation (handle hook, all 8 apps):**
- Every page load and API call: route, method, status, duration_ms, tenant_id, visitor_hash

**Explicit business events:**
- Signup: `signup.started`, `signup.oauth_complete`, `signup.profile_done`, `signup.email_verified`, `signup.plan_selected`, `signup.checkout_complete`, `signup.tenant_created`
- Publishing: `post.published`, `post.updated`, `post.deleted`
- Curios: `curio.deployed`, `curio.removed`
- Social: `comment.posted`, `comment.moderated`
- Navigation: `page.viewed` (with section: knowledge_base, garden, settings, etc.)
- Errors: `error.server` (uncaught), `error.client` (reported via button)
- Features: `lantern.navigated`, `reeds.engaged`

| Step | Status | Notes |
|------|--------|-------|
| 1. Event schema + shared lib | ✅ DONE | `libs/engine/src/lib/pulse/` — types, emitter, visitor hashing, 12 tests |
| 2. D1 migrations | ✅ DONE | `002_pulse_tables.sql` — pulse_events, pulse_daily, signup_funnel |
| 3. Collector worker | ✅ DONE | `workers/pulse-collector/` — PulseBuffer DO, daily aggregation cron |
| 4. SvelteKit handle hooks | ✅ DONE | All 8 apps instrumented via sequence() + PULSE_COLLECTOR service binding |
| 5. Signup funnel instrumentation | ✅ DONE | 6 explicit events: oauth_complete → tenant_created in Plant |
| 6. Feature instrumentation | ✅ DONE | post.published/updated/deleted, comment.posted/moderated in Aspen |
| 7. Error capture | ✅ DONE | createPulseErrorHook() in all 8 apps, sanitized stack traces |
| 8. Arbor dashboard | ✅ DONE | `/arbor/pulse` — overview, signup funnel, error log (3 pages) |
| 9. Vista fixes (stretch) | ⬜ TODO | Suspected API key sync issue — lower priority than Pulse |
| 10. Deploy: PULSE_VISITOR_SECRET | ⬜ TODO | Required for brute-force-resistant visitor hashes. `gw secret apply` to all 8 apps + collector |

**Audit notes (grove-audit quick, 2026-05-16):**
- Passed 6/10 lanes CLEAN (barrel, CSRF, signpost, SDK boundaries, icon, accent)
- Fixed: visitorSecret scoping bug (HIGH), JSON.parse crash risk (MEDIUM×2)
- Accepted risk: collector has no auth beyond service-binding isolation, no rate limiting
- Deferred: 3 test coverage gaps (secret param, sanitizeStack regex, secret forwarding)

#### Phase 5: Stability Hardening
| Step | Status | Notes |
|------|--------|-------|
| Add svelte-check to pre-push | ✅ DONE | Step 4 in validate.mjs — 12 packages checked, caught 29 hidden errors |
| Add workspace typecheck | ✅ DONE | Propagates to downstream consumers when libs change (via shim trigger paths) |
| Fix pulse hook type error | ✅ DONE | `extractTenantId` widened to accept SvelteKit `Locals` |
| Migrate Plant to GroveDatabase | ✅ DONE | 6 routes wrapped raw D1/KV with CloudflareDatabase/CloudflareKV |
| Color token final sweep | ✅ DONE | Script + CI job (`accent-colors`), 2 annotations added, 0 real violations |
| Plant integration tests | ✅ DONE | 62 new tests: auth callback service (35) + signup flow integration (27). Fixed barrel import + vitest aliases. |

#### Phase 6: Dev Tooling Triage
| Step | Status | Notes |
|------|--------|-------|
| 1. Claude Code hook cleanup | ✅ DONE | Removed buddi, block-*, check-colors, auto-format, langfuse |
| 2. Fix pre-push git hook | ✅ DONE | Already fixed — deploy-manifest system replaced hardcoded paths. No `packages/` refs remain in .githooks/ or scripts/pre-push/ |
| 3. GW triage — kill dead commands | ✅ DONE | 58 cmd/ files + 5 internal/ packages → `_junkdrawer/tools/`. 27,738→7,460 lines (73% cut) |
| 4. GW — keep & simplify | ✅ DONE | 10 command groups survive: secret, publish, warden, social, todo, gh issue, git worktree create/finish, update, dev (skeleton) |
| 5. Update AGENT.md & settings | ✅ DONE | Rewrote AGENT.md, CLAUDE.md, git_guide.md, settings.json permissions, grove-git agent, 11 skill files, git-workflows skill |

#### Phase 7: Engine Decoupling ✅ COMPLETE
| Step | Status | Notes |
|------|--------|-------|
| 1. Extract grove-errors package | ✅ DONE | `libs/grove-errors/` — infra imports from grove-errors, zero imports from lattice. Cycle broken. |
| 2. Decouple gossamer from engine | ✅ DONE | Optional peerDependency + devDep for local builds. Gossamer has zero workspace deps. |
| 3. Verify clean DAG | ✅ DONE | No cycle warnings from pnpm. prism→grove-errors→infra→engine, gossamer standalone. |

#### Phase 8: Engine Decomposition
| Step | Status | Notes |
|------|--------|-------|
| 1. Identify extraction order | ✅ DONE | Audit: loom (cleanest), thorn (peer deps), content-markdown, email, curios |
| 2. Define package template | ✅ DONE | src/ flat, max 3 levels, workspace:* deps, vitest |
| 3. Extract pilot — loom | ✅ DONE | 18 files → `libs/loom/`. Zero external deps (only grove-errors). 42 tests pass. Added cloudflare:workers vitest stubs. |
| 4. Extract pilot — thorn | ✅ DONE | 14 files → `libs/thorn/`. Peer dep on @autumnsgrove/lattice (threshold, lumen). 70 tests pass. Audit: CLEAN. |
| 5a. Extract grove-crypto | ✅ DONE | 3 files → `libs/grove-crypto/`. Zero deps (Web Crypto only). Envelope encryption + SecretsManager. Engine stubs re-export for compat. |
| 5b. Extract curios | ✅ DONE | 22+ files → `libs/curios/`. 4 curios (gallery, guestbook, polls, timeline). 191 tests pass. Peer deps: lattice, prism, svelte, markdown-it. Static loader map in ContentWithGutter. |
| 5c. Extract grove-markdown | ✅ DONE | 15 files → `libs/grove-markdown/`. Markdown pipeline + hum providers (data-primacy). 195 tests pass. Zero monorepo deps. |
| 5d. Extraction wave 2 (remaining) | ⬜ TODO | email — still has UI entanglement |
| 6. Engine residual | ⬜ TODO | 541 exports → shrinking, thin orchestration layer |
| 7. Gallery decoupling (future) | ⬜ TODO | Gallery is a full image mgmt system, not a widget. Needs own package or Amber integration. Pragmatically in curios for now. |

---

### Session Log

**Session 1 (2026-05-05):**
- Completed full Phase 0 research and audit
- Dispatched 13 explorer agents across the codebase
- Created comprehensive dependency graph
- Identified 21 core features to keep
- Confirmed Lantern + Reeds are essential (not junk drawer)
- Documented auth simplification path (~1,500 LOC removal)
- Documented curios isolation strategy (16 dirs, 4 file updates)
- Documented hook gaps (svelte-check, tests, app builds missing)
- Found mc-control is a dead reference (doesn't exist as a worker)
- Found timeline-sync is orphaned (timeline works without it)
- Created full REFACTOR.md plan document
- **Next session:** Begin Phase 1, Step 1 (create _junkdrawer/ and start moving)

**Session 2 (2026-05-05):**
- Completed full Phase 1 execution (14 steps)
- 499 files changed: moves, barrel updates, binding removals, UI cleanup
- Moved 5 workers, 3 apps, 16+ curio dirs, firefly, reverie-schemas
- Severed service bindings: REVERIE, CHAT, MC_CONTROL
- Cleaned FormattingToolbar, MarkdownEditor, garden new/edit pages (Wisp/Fireside/Meadow)
- Updated curio dashboard (19 entries → 4)
- Updated Workshop data (4 deleted, 12 marked "planned")
- Created migration 113 (promote Lantern/Reeds, disable junk flags)
- Gossamer stays in libs/ (actively used by Glass/GlassCard — deviation from plan)
- Full build + lint passes: 0 errors across all 17 packages
- **Next session:** Phase 2 (auth simplification — Google OAuth only)

**Session 3 (2026-05-06):**
- Phase 2: Auth Simplification — COMPLETE
  - Removed passkeys (~1,100 LOC) and magic links (~400 LOC) from entire auth stack
  - 90 files in main commit + 17 files in stragglers cleanup
  - Removed @better-auth/passkey and @simplewebauthn/browser dependencies
  - Converted invite page from magic link to Google OAuth
  - Created Heartwood migration 0014 (deprecate ba_passkey, ba_verification)
  - Updated help center, specs, FAQ, credits, workshop, skills, auto-label workflow
  - Two rounds of aggressive searching caught passkey/magic-link in 100+ files
- Phase 1 Deep Sweep — cross-cutting cleanup the blitz missed
  - Moved: WispPanel, WispButton, Terrarium components, FeedDO, ChatDO, TriageDO
  - Cleaned: Lumen reverie/reverie-compose tasks, threshold rate limiters, observability types
  - Cleaned: Arbor sidebar nav, settings pages, Lantern destinations, grove-router rules
  - Cleaned: Prism icons, pricing text, tier configs, DB schema deprecations
  - Removed FEED_QUEUE from Aspen bloom-service publish flow
  - Removed TriageDO/ChatDO/FeedDO from DO worker index + wrangler.toml
  - ~8,700 additional lines deleted across 75+ files
- All packages build + typecheck clean (0 errors)
- **Next session:** Phase 3 (local dev setup — full stack runnable locally)

**Session 4 (2026-05-09):**
- Rebased onto main (1 commit: edit button caching fix)
- Claude Code Hook Cleanup (Phase 6, Step 1) — COMPLETE
  - Removed `buddi-hook.py` from user-level settings (was on 10 event types, file missing)
  - Removed `block-bad-commands.py`, `block-npm.py` (never wired), `check-colors.py` (dead)
  - Removed `auto-format.py` (retired), `langfuse.py` (not working)
  - Both user-level and project-level hook configs now clean (`"hooks": {}`)
- GW Safari Triage — COMPLETE (docs/safaris/gw-triage-safari.md)
  - Audited all 76 Go files / 27,738 lines across 15 command groups
  - Verdict: KILL 58% (~16,000 lines), KEEP 20% (~5,600 lines), SIMPLIFY rest
  - Survivors: secret, publish, warden, social, todo, gh issue, update, git worktree finish, dev (skeleton)
  - Core insight: gw wraps CLIs that don't need wrapping. Every `gw git log` is `git log` with fewer flags.
- Engine Dependency Audit — COMPLETE
  - Engine → infra cycle caused by `logGroveError` / `GroveErrorDef` (8 imports in infra from engine/errors)
  - Gossamer coupling: only 2 files (Glass.svelte, GlassCard.svelte)
  - Foliage coupling: NONE (already decoupled)
  - Fix: extract `grove-errors` as independent package → cycle broken
- Engine Nesting Audit — COMPLETE
  - 969 files, 24 subdirectories, 541 subpath exports, max depth 15 (10 actual dirs)
  - `ui/` alone: 369 files, 17 component subdirectories, 46 files in `components/ui/`
  - Go-like restructuring: each subdirectory becomes its own workspace package
- Added Phases 6 (Dev Tooling Triage), 7 (Engine Decoupling), 8 (Engine Decomposition) to plan
- **Next session:** Phase 3 execution (local dev PoC) or Phase 6 Step 2-3 (git hooks + gw kill)

**Session 5 (2026-05-09):**
- Phase 3 PoC — COMPLETE (multi-config local dev WORKS)
  - Confirmed `wrangler dev -c` runs multiple workers in single miniflare instance
  - Aspen + DOs + Zephyr all running, static assets serving, D1/KV/R2 local
  - Fixed LoomDO: `implements DurableObject` → `extends DurableObject` with `import { DurableObject } from "cloudflare:workers"`
  - Root cause of DO crash: orphaned migration declarations for TriageDO/ChatDO/FeedDO (removed in Phase 1 but still in wrangler.toml migrations). Added v9 migration with `deleted_classes`.
  - Added `nodejs_compat` flag to DO wrangler.toml
  - Prod safety verified: dry-run deploy clean, tsc clean, svelte-check 0 errors
  - Key discovery: prod wrangler.toml files work locally as-is — miniflare ignores remote D1/KV/R2 IDs and creates local equivalents. No dev overlay configs needed.
  - Aspen returns GROVE-SITE-045 (empty D1) — correct behavior, needs data seeding (Phase 3 Step 7)
- Engine rebuild: `svelte-package` now emits `extends DurableObject` in dist/loom/base.js
- **Next:** Phase 3 Steps 4-9 (auth, .dev.vars, orchestration script, data seeding, docs)

**Session 6 (2026-05-11):**
- Phase 6 Steps 3-5: GW Triage — COMPLETE
  - Moved 58 cmd/ files + 5 internal/ packages to `_junkdrawer/tools/grove-wrap-go/`
  - cmd/ lines: 27,738 → 7,460 (73% reduction), total Go: 34,108 → 11,130 (67% cut)
  - Survivors: secret, publish, warden, social, todo, gh issue, git worktree create/finish, update, dev (skeleton), version
  - Killed: all git/gh/wrangler passthrough — every command that was "just the raw CLI with fewer flags"
  - Inlined safety checks for surviving commands (todo, worktree) — removed full safety/ package dependency
  - Rewrote help.go: ~40 commands → 10 focused groups
  - Added `worktree create` back (used by issue browser skill workflow)
  - Simplified `findPackagePath` in publish.go to avoid `discoverPackages` dependency
  - `go build`, `go vet`, `go test` all pass clean
- Updated documentation and agent instructions:
  - AGENT.md: "use raw git/gh, gw is for worktrees and infrastructure only"
  - CLAUDE.md: updated gw description
  - AgentUsage/git_guide.md: rewrote top section for raw git workflow
  - .claude/settings.json: replaced 18 dead gw permissions with raw git/gh permissions
  - .claude/agents/grove-git.md: updated from `gw git` to raw `git` commands
  - 11 skill files: bulk-replaced `gw git` → `git`, rewrote git-workflows/SKILL.md entirely
- 103 files changed in commit, all pre-push checks passed (22 deploys typechecked)
- **Next:** Phase 6 Step 2 (fix pre-push git hook), then Phase 3 Steps 4-9 (local dev completion)

**Session 7 (2026-05-16):**
- Phase 5: Stability Hardening — COMPLETE
  - Added svelte-check as step 4 in pre-push validate.mjs (12 packages checked)
  - Workspace propagation: when libs change, downstream consumers auto-checked via deploy shim trigger paths
  - Fixed pulse hook type error (`extractTenantId` widened for SvelteKit `Locals`)
  - Migrated Plant to GroveDatabase/GroveKV: 6 routes wrapped raw D1/KV with CloudflareDatabase/CloudflareKV
  - Color token enforcement: created `tools/check-accent-colors.sh`, added CI job `accent-colors` to ci.yml
  - 2 accent-ok annotations for legitimate uses (domains gradient, foliage tier badge)
  - Wrote 62 Plant integration tests across 2 new files:
    - `auth-callback-service.test.ts` (35 tests): session token, identity resolution, onboarding upsert
    - `signup-flow.integration.test.ts` (27 tests): happy path, idempotency, rate limiting, prerequisites, DB failures
  - Fixed Plant barrel import: `@autumnsgrove/lattice` → `@autumnsgrove/lattice/platform/config` (avoids Svelte component cascade in tests)
  - Fixed Plant vitest.config.ts: array-format aliases, dist path for platform/config
  - Pre-push hook now runs 5 checks: lockfile, deploy drift, typecheck, svelte-check, wrangler dry-run
  - All 27 shims typecheck clean, all 12 svelte-check targets pass, 158 Plant tests pass
- **Next:** Phase 7 (Engine Decoupling) or Phase 3 completion (local dev auth + docs)

**Session 9 (2026-05-17):**
- Phase 8 Steps 5a-5b: grove-crypto + curios extraction — COMPLETE
  - Created `libs/grove-crypto/` (3 files, ~400 lines): `encryptToken`, `decryptToken`, `SecretsManager`, `createSecretsManager`
  - Zero runtime deps (Web Crypto API only), engine re-export stubs for backward compat
  - Created `libs/curios/` (22+ files, 191 tests): gallery, guestbook, polls, timeline
  - Deps: grove-crypto, grove-errors. Peers: lattice, prism, svelte, markdown-it
  - Fixed 16 `$lib/` imports → relative or package paths
  - Created local `utils/date.ts` (formatRelativeTime) and `utils/json.ts` (safeParseJson)
  - Hardcoded 10 OpenRouter models in timeline (decoupled from lumen-models.json)
  - Replaced ContentWithGutter dynamic template import with static `CURIO_LOADERS` map (bundler-safe, eliminates VALID_CURIOS junk-drawer set)
  - Updated ~35 Aspen import sites, 2 engine re-export barrels
  - Removed ~15 curio exports from engine package.json, deleted `curios/`, `utils/gallery.ts`, `server/curio-status.ts`
  - Engine: 0 errors, Aspen: 0 errors, Curios: 191 tests pass
  - Key finding: Gallery is a full image management system (6 DB tables, uploads, tags, collections), not a widget. Placed pragmatically in curios for now; flagged for future decoupling.
- **Next:** grove-audit on Phase 8 work, then content-markdown or email extraction

**Session 10 (2026-05-18):**
- Phase 8 Step 5c: grove-markdown extraction — COMPLETE
  - Created `libs/grove-markdown/` (15 source files, 195 tests): renderMarkdown, createContentLoader, directives, hum embeds, @mentions, suppress
  - Zero monorepo deps — only npm packages (markdown-it, sanitize-html, dompurify, gray-matter, esm-env)
  - Hum providers restructured with data primacy: 8 provider files (one per service), separate detect logic, aggregated registry
  - Extracted sanitizeMarkdown (~200 lines) from engine's 575-line sanitize.ts — markdown-specific sanitizer with all data-* attribute allowlists
  - Copied self-contained utils: escape-html (29 lines), grove-url (85 lines)
  - Engine stubs: content/markdown/index.ts re-exports from grove-markdown, hum providers/types re-export stubs
  - Updated 17 Aspen consumer imports + 1 engine consumer (reeds.ts)
  - Engine: 0 type errors, Aspen: 0 type errors, grove-markdown: 195 tests pass
- **Next:** grove-audit on Phase 8 work, then email extraction
