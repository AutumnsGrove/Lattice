# Amber Storage Safari — From Beautiful Shell to Data Sovereignty

> Your data doesn't belong to Grove — it belongs to you. Amber is how we prove it.
> **Aesthetic principle**: Warm glassmorphism meets functional infrastructure
> **Scope**: `apps/amber` (SvelteKit frontend), `services/amber` (CF Worker backend), specs, plans, and the vision for automated backup + external storage sync

---

## Ecosystem Overview

**6 stops** across the Amber landscape:

1. `services/amber` — The Worker backend (API layer)
2. `apps/amber` — The SvelteKit frontend (UI layer)
3. `docs/specs/amber-spec.md` — The original specification
4. `docs/specs/amber-sync-spec.md` — The sync extension vision
5. `docs/plans/completed/amber-zip-export-integration.md` — Export ported to Engine
6. The gap: Automated backups + external storage providers

### Items by condition

**Growing** 🟡: Worker backend (solid API, no real data), SvelteKit frontend (beautiful UI, disconnected)
**Wilting** 🟠: Integration with other Grove services (nothing writes to Amber)
**Barren** 🔴: File upload endpoint, external storage sync, automated backups, Stripe integration

---

## 1. Worker Backend (`services/amber`)

**Character**: A well-built house with no one living in it. The plumbing works, the electrical is wired, but nobody moved in.

### Safari findings: What exists today

**API Routes** (`services/amber/src/index.ts`, 1100 lines):

- [x] Full CRUD for files: list, get, delete (soft), restore, permanent delete
- [x] Trash management: list trash, empty trash, permanent delete single
- [x] Pagination with sort/filter on file listing
- [x] Search files by name via LIKE query
- [x] Quota calculation with warning levels (none/warning/critical/full)
- [x] Usage breakdown by product and category
- [x] Export system: create job, poll status, download zip
- [x] Add-on listing with available tiers
- [x] Cron: trash cleanup (30 days), export cleanup (7 days), pending export processing
- [x] Parameterized D1 queries throughout (no SQL injection)
- [x] CORS handling with origin validation
- [ ] **No file upload endpoint** — the most critical gap
- [ ] **No file download by R2 key** — download route requires matching DB record
- [ ] **Stripe add-on purchase is stubbed** — returns "Stripe integration pending"
- [ ] **Custom router instead of Hono** — hand-rolled regex router (~30 lines) when the rest of Lattice uses Hono for workers

**Auth** (`services/amber/src/index.ts:224-260`):

- [x] Heartwood service binding for session validation
- [x] Cookie forwarding to auth service
- [x] User ID + tier extraction from session
- [ ] **No CSRF protection** — POST/DELETE routes don't validate origin
- [ ] **No rate limiting** — no protection against abuse

**D1 Schema** (`services/amber/migrations/schema.sql`):

- [x] `user_storage` — quota tracking (tier_gb, additional_gb, used_bytes)
- [x] `storage_files` — file metadata (r2_key, filename, mime_type, size, product, category)
- [x] `storage_addons` — purchased storage add-ons
- [x] `storage_exports` — async export job tracking
- [x] Proper indexes on user+deleted_at, user+product, user+created_at, user+size
- [ ] **Tables exist but are empty** — nothing writes to them

**Durable Objects** (`services/amber/src/services/`):

- [x] `ExportJobV2` — Full async export with chunked processing, alarm chaining, R2 streaming
- [x] `ExportJob` — Legacy stub for migration
- [x] `zipStream.ts` — Streaming ZIP creation with fflate, multipart R2 upload
- [x] Handles exports >30s via DO alarm scheduling

**Wrangler Config** (`services/amber/wrangler.toml`):

- [x] D1 binding (`AMBER_DB`)
- [x] R2 binding (`R2_BUCKET` → `grove-storage`)
- [x] DO bindings for export jobs
- [x] Heartwood service binding (`AUTH`)
- [x] Cron triggers: `*/5 * * * *` (exports), `0 3 * * *` (cleanup)

### Design spec (safari-approved)

**The worker needs to stop being standalone.** The biggest architectural question is whether Amber's worker should remain independent or merge into the main Engine worker. Given that:

1. The export system was already ported to Engine (`amber-zip-export-integration.md` completed)
2. Blog/Ivy/Profile uploads go through Engine, not Amber
3. Amber's worker duplicates auth patterns that Engine already handles
4. Having a separate worker means cross-service coordination for every file operation

**Recommendation: Amber becomes a view into Engine's data, not a parallel system.**

#### What this means

- Engine tracks all file uploads in `storage_files` (it already puts files in R2)
- Amber's D1 becomes Engine's D1 (or Amber queries Engine's D1 via service binding)
- The Amber frontend calls Engine API routes, not its own worker
- Amber worker becomes thin: just serves the SvelteKit app + proxies to Engine

#### Critical missing pieces

- [ ] **File upload endpoint in Engine** that writes to both R2 and `storage_files`
- [ ] **Migration script** to backfill existing R2 objects into `storage_files`
- [ ] **Upload tracking hooks** in Blog, Ivy, Profile services
- [ ] **Quota enforcement** at upload time across all services

---

## 2. SvelteKit Frontend (`apps/amber`)

**Character**: A gorgeous showroom car with no engine. Every panel polished, every light working — but turn the key and nothing happens.

### Safari findings: What exists today

**Pages** (4 routes under `(app)/`):

- [x] **Dashboard** (`+page.svelte`, ~350 lines) — StorageMeter, UsageBreakdown, recent files, quick actions
- [x] **Files** (`+page.svelte`, ~300 lines) — FileGrid and FileList views, sort/filter, search, grid/list toggle
- [x] **Trash** (`+page.svelte`, ~265 lines) — Trash listing with restore/permanent delete/empty
- [x] **Settings** (`+page.svelte`, ~250 lines) — Account info, storage add-ons, export section
- [x] **Login** (`login/+page.svelte`, ~175 lines) — Google/GitHub sign-in buttons

**Components** (8 components):

- [x] `StorageMeter.svelte` — Progress bar with warning levels, well-themed
- [x] `UsageBreakdown.svelte` — Per-product bars (blog, ivy, profile, themes) with colors
- [x] `FileGrid.svelte` — Card grid view with preview area, selection, actions
- [x] `FileList.svelte` — Table view with sorting, responsive column hiding
- [x] `TrashBin.svelte` — Trash container with confirm-empty flow
- [x] `AddStorageModal.svelte` — Add-on purchase modal with tier cards
- [x] `Icons.svelte` — Lucide icon wrapper with semantic names
- [ ] **No UploadModal/UploadDropzone** — upload button exists in sidebar but does nothing

**Architecture** (`src/lib/`):

- [x] `api.ts` — Client-side API wrapper with mock data fallback for dev
- [x] `stores.ts` — Svelte stores for theme, currentUser, searchQuery, sidebarOpen
- [x] `auth.ts` — Better Auth client setup (signIn, signOut, session)
- [x] `types/index.ts` — StorageFile, QuotaStatus, UsageBreakdown, StorageAddon types
- [x] `styles/theme.css` — Full CSS custom property system with light/dark themes
- [ ] **No `+page.server.ts` files** — all data loading is client-side
- [ ] **No SSR** — entirely client-rendered
- [ ] **Uses Inter font from Google Fonts** instead of Lexend (Grove's standard)
- [ ] **Doesn't use Lattice engine components** — only Logo imported
- [ ] **Doesn't use Lattice's Tailwind preset** — has its own CSS custom properties
- [ ] **Auth client pattern mismatch** — uses Better Auth client while worker expects Heartwood cookies
- [ ] **Mock data is default** — API client falls back to fake data when calls fail

### Design spec (safari-approved)

**The frontend should be rebuilt on Lattice conventions.**

#### Integration fixes

- [ ] Replace custom `theme.css` with Lattice Tailwind preset (`@autumnsgrove/lattice/tailwind`)
- [ ] Replace Inter with Lexend (Grove's standard font)
- [ ] Use Lattice UI components where they exist (GlassButton, etc.)
- [ ] Add `+page.server.ts` for SSR data loading
- [ ] Connect auth to Heartwood properly (session validation on server, not client-side Better Auth)
- [ ] Remove mock data fallback — connect to real APIs

#### Missing features

- [ ] Upload dropzone with drag-and-drop
- [ ] File preview modal (images, PDFs)
- [ ] Bulk selection toolbar (delete, download, move)
- [ ] Sort dropdown (currently hardcoded)
- [ ] Filter by product/category (UI exists conceptually but not wired)

---

## 3. Amber Spec (`docs/specs/amber-spec.md`)

**Character**: A well-thought-out blueprint that's only been partially followed. The house was built, but not wired to the city grid.

### Safari findings

- [x] Comprehensive feature roadmap across 4 phases
- [x] Clear tier/pricing structure matching Grove's plans
- [x] Detailed DB schema with proper indexes
- [x] R2 storage structure defined
- [x] API endpoint spec covering all operations
- [x] Export streaming implementation with DO alarm chaining
- [x] Cron job specs for automated cleanup
- [x] Quota enforcement rules (what gets blocked, what doesn't)
- [ ] **No mention of automated backups** — this is a new concept
- [ ] **No mention of external storage providers** — Google Drive, iCloud, etc.
- [ ] **No mention of the Lattice SDK** or shared patterns — written before the monorepo matured
- [ ] **Phase 1 checklist is all unchecked** despite significant code existing
- [ ] **Open questions are all still open** — deduplication, image variants, encryption, folders

### Design spec (safari-approved)

The spec needs a **Phase 5: Data Sovereignty** section covering:

1. Automated backups (Cloudflare Queues + Workflows)
2. External storage provider integration
3. The "your data is already in your hands" philosophy

---

## 4. Amber Sync Spec (`docs/specs/amber-sync-spec.md`)

**Character**: A seed planted in January 2026, deliberately left to germinate. Not for now.

### Safari findings

- [x] Vision: Obsidian Sync-like cross-device sync built on R2
- [x] Honest about hard problems (conflict resolution, offline-first, iOS limits)
- [x] CRDT consideration for text files
- [x] VaultDO architecture pattern sketched
- [x] "Plant the seed" timeline — not Q1 or Q2 2026
- [x] Status: Seedling — not actively developing

### Design spec (safari-approved)

**Leave this alone for now.** Amber Sync is a different beast from what we're building. The automated backup → external storage vision is complementary but architecturally separate. Sync requires two-way reconciliation; backup-to-external-storage is one-way push. Don't conflate them.

---

## 5. Amber ZIP Export Integration (`docs/plans/completed/amber-zip-export-integration.md`)

**Character**: The bridge that was built. Amber's export system was successfully ported to Engine.

### Safari findings

- [x] Plan: Port ExportJobV2 and zipStream to Engine
- [x] Architecture decision: Copy to Engine (not service binding)
- [x] DB migration for `tenant_exports` table
- [x] API routes: start, poll, download
- [x] Content formatting: posts → markdown with YAML frontmatter
- [x] Cron: process pending, cleanup expired
- [x] Security reviewed by Hawk (report exists, 0 critical, 1 high)
- [x] Status: Completed — this work was done

### Design spec (safari-approved)

**This validates the approach.** The export system already moved from Amber's worker to Engine. This sets the precedent: Amber's backend logic should live in Engine, with Amber being primarily a frontend view.

---

## 6. The Vision: Automated Backup → External Storage

**Character**: The creature that doesn't exist yet — but when it arrives, it changes everything.

### What the user envisions

1. **Automated backups** — Grove automatically packages user data (posts, media, settings) on a schedule
2. **Push to Amber** — Backup archives land in the user's Amber storage (R2)
3. **External storage sync** — Amber connects to user's Google Drive, iCloud, Dropbox, etc.
4. **Data sovereignty** — "The data is already in your hands. It's already in your storage."

### Why this matters

This isn't just a feature — it's a philosophical differentiator. Most platforms say "you can export your data." Grove says "your data is already in your Google Drive. You don't need to ask us for it." That's profoundly different. It means:

- If Grove goes down, users already have their data
- If users leave, they don't need to wait for an export
- Trust is built through continuous proof, not promises

### Architecture sketch

```
┌──────────────────────────────────────────────────────────┐
│                    Backup Pipeline                        │
│                                                          │
│  CF Queue ──→ CF Workflow ──→ Package Data ──→ R2        │
│  (trigger)    (orchestrate)   (zip/bundle)    (store)    │
│                                                          │
│                                    ↓                     │
│                            Amber Storage                 │
│                            (user can see it)             │
│                                    ↓                     │
│                         External Sync Worker             │
│                                    ↓                     │
│                    ┌───────────────┼───────────────┐     │
│                    ↓               ↓               ↓     │
│              Google Drive     iCloud Drive     Dropbox   │
│              (OAuth2 API)    (CloudKit/web)   (API v2)   │
└──────────────────────────────────────────────────────────┘
```

### Critical decisions needed

1. **Backup format**: Reuse the existing export ZIP format? Or something more incremental?
2. **Backup frequency**: Daily? On-change? User-configurable?
3. **External provider auth**: OAuth2 flows for Google/Dropbox. iCloud is harder (no public API for Drive).
4. **Incremental vs full**: Full backup every time is wasteful. Incremental needs diffing.
5. **Provider priority**: Google Drive first (best API), Dropbox second, iCloud... maybe never (Apple's API story is bad).
6. **CF Queues + Workflows**: User mentioned researching these — they're the right tool for reliable async processing.

### What needs to exist first

Before external sync can work, Amber itself needs to work:

1. **Engine tracks all uploads** → `storage_files` populated with real data
2. **Amber frontend shows real files** → not mock data
3. **Backup job creates archives** → Queues/Workflows package data to R2
4. **User connects external storage** → OAuth2 flow in settings
5. **Sync worker pushes to external** → Reads from R2, writes to provider API

---

## Expedition Summary

### By the numbers

| Metric          | Count |
| --------------- | ----- |
| Total stops     | 6     |
| Thriving 🟢     | 0     |
| Growing 🟡      | 2     |
| Wilting 🟠      | 1     |
| Barren 🔴       | 3     |
| Total fix items | 37    |

### Recommended trek order

**Phase A: Make Amber Real (Foundation)**

1. Add `storage_files` tracking to Engine's upload pipeline
2. Migration script for existing R2 objects
3. Connect Amber frontend to real Engine data (not mock)
4. Rebuild frontend on Lattice conventions (Tailwind, Lexend, components)
5. File upload endpoint with quota enforcement

**Phase B: Automated Backups (The Pipeline)**

6. Research CF Queues + Workflows (user bringing data from another session)
7. Backup job: package tenant data into archive format
8. Backup scheduling: cron or queue-triggered
9. Backup visible in Amber dashboard

**Phase C: External Storage Sync (Data Sovereignty)**

10. OAuth2 flow for Google Drive
11. Sync worker: push backup archives to connected provider
12. Provider settings in Amber UI
13. Dropbox integration (second provider)

### Cross-cutting themes

1. **Amber's backend logic should move to Engine** — the export system already did this. File tracking, quota enforcement, and backup orchestration belong in Engine. Amber becomes a specialized frontend.

2. **Nothing writes to Amber's DB** — this is THE problem. Blog uploads go to R2 but don't create `storage_files` records. Until Engine tracks uploads, Amber has nothing to show.

3. **The frontend is disconnected from Lattice patterns** — custom theme.css, Inter font, no Tailwind preset, no shared components. This should be normalized.

4. **The export system was the proof of concept** — it showed that porting Amber's backend logic to Engine works. The same pattern applies to everything else.

5. **External storage sync is the killer feature** — but it requires the foundation (phases A and B) first. Can't sync what doesn't exist.

---

*The fire dies to embers. The journal is full — 6 stops, 37 fixes sketched, the whole landscape mapped. Amber isn't broken — it was never turned on. The beautiful UI is waiting for real data. The comprehensive API is waiting for real file uploads. And the vision — data already in your hands — is waiting for the plumbing that connects Grove to the world outside.*

*Tomorrow, the animals go to work. But tonight? Tonight was the drive. And it was magnificent.* 🚙
