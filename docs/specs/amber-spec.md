---
title: Amber — Storage Management & Data Sovereignty
description: Unified storage visibility, automated backups, and external storage sync for Grove
category: specs
specCategory: platform-services
icon: harddrive
date created: Saturday, February 22nd 2026
date modified: Saturday, February 22nd 2026
aliases: []
tags:
  - storage
  - cloudflare-r2
  - data-sovereignty
  - backups
  - engine
type: tech-spec
lastUpdated: "2026-02-22"
---

# Amber: Grove Storage & Data Sovereignty Specification

```
                              ·
                             ╱ ╲
                            ╱   ╲
                           ╱  ✨ ╲
                          ╱       ╲
                         ╱   ···   ╲
                        ╱   ·   ·   ╲
                       ╱    · ◇ ·    ╲
                      ╱      ···      ╲
                     ╱_________________╲
                         ╲      ╱
                      ════╲════╱════
                           ╲  ╱
                            ··

         Moments preserved. Sovereignty granted.
```

> _Your data doesn't belong to Grove. It belongs to you. Amber is how we prove it._

Amber is Grove's unified storage management layer and data sovereignty system. Every file a Wanderer uploads, every image, every attachment, is preserved in Amber: visible, downloadable, and eventually, already sitting in their own Google Drive before they ever think to ask.

|                       |                                                      |
| --------------------- | ---------------------------------------------------- |
| **Public name**       | Amber                                                |
| **Internal codename** | GroveStorage                                         |
| **Domain**            | `amber.grove.place` (frontend), Engine API (backend) |
| **Last Updated**      | February 2026                                        |

### Why "Amber"

Amber is fossilized tree resin. It preserves moments in time, capturing life in suspended animation. Your digital Amber holds your files, keeps them safe, and lets you manage your space as it grows. The metaphor extends further than storage: amber is warm, translucent, honest. You can see what's inside. Nothing hidden.

### What Changed (February 2026 Rewrite)

This spec replaces the December 2025 version. The original treated Amber as a standalone service with its own Worker and D1 database. That architecture was never realized. Instead, Engine evolved to handle file tracking, uploads, exports, and tier management. This rewrite reflects architectural truth:

- **Amber is a view into Engine's data.** Engine owns the backend.
- **The export system was already ported to Engine.** That proved the pattern.
- **Data sovereignty is Amber's philosophical core.** Automated backups and external storage sync are first-class features, not footnotes.

---

## Overview

### What This Is

Amber gives Wanderers visibility and control over the storage that already exists inside Grove. Every paid Wanderer already has storage. Amber makes it visible: what's using space, how much is left, how to clean up, how to export. Beyond visibility, Amber is the foundation for data sovereignty, the promise that your data is already in your hands.

### Goals

- **Visibility**: See what's using storage, broken down by product
- **Management**: Delete, restore, search, and organize files
- **Export**: Download everything as a structured ZIP archive
- **Sovereignty**: Automated backups pushed to the Wanderer's own external storage
- **Trust**: "Your data is already in your Google Drive. You don't need to ask us for it."

### Non-Goals

- **File sync**: Two-way cross-device sync (Obsidian-style) is a separate product. See `amber-sync-spec.md`.
- **Becoming Dropbox**: Amber is the storage layer inside Grove, made visible. Not a general-purpose file manager.
- **Direct file uploads to Amber**: Files are uploaded through their respective products (Blog, Ivy, Profile). Amber surfaces them.

---

## Architecture

Amber is a **frontend application** that consumes **Engine's APIs**. It has no backend logic of its own.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Wanderer's Browser                           │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                 Amber Frontend (SvelteKit)                  │   │
│   │   Dashboard │ Files │ Trash │ Settings │ Backups            │   │
│   └──────────────────────────┬──────────────────────────────────┘   │
└──────────────────────────────┼──────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Engine Worker (grove-lattice)                    │
│                                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│   │ Storage  │  │ Export   │  │ Quota    │  │ Backup   │            │
│   │ API      │  │ API      │  │ Enforce  │  │ API      │            │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│        │             │             │             │                  │
│   ┌────┴─────────────┴─────────────┴─────────────┴──────────┐       │
│   │                  Engine D1 (SQLite)                     │       │
│   │   cdn_files │ storage_exports │ image_hashes │ tiers    │       │
│   └─────────────────────────────────────────────────────────┘       │
│        │                                                            │
│   ┌────┴──────────────────────────────────────────────────┐         │
│   │                    R2 (grove-storage)                 │         │
│   │   images/ │ exports/ │ backups/ │ fonts/ │ avatars/   │         │
│   └───────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │  Durable Objects    │
                    │  (grove-durable-    │
                    │   objects worker)   │
                    │                     │
                    │  ExportDO           │
                    │  BackupDO (planned) │
                    └─────────────────────┘
                               │
                    ┌──────────┴──────────┐   (Phase C)
                    │  External Storage   │
                    │  ┌────────────────┐ │
                    │  │ Google Drive   │ │
                    │  │ Dropbox        │ │
                    │  │ (OAuth2 push)  │ │
                    │  └────────────────┘ │
                    └─────────────────────┘
```

### Tech Stack

| Component            | Technology                    | Notes                                 |
| -------------------- | ----------------------------- | ------------------------------------- |
| Frontend             | SvelteKit on Cloudflare Pages | `apps/amber/`                         |
| Backend API          | Engine Worker                 | `libs/engine/` routes                 |
| File Storage         | Cloudflare R2                 | `grove-storage` bucket                |
| Metadata DB          | Engine's D1 (SQLite)          | `cdn_files` table (evolved)           |
| Export Processing    | Durable Objects               | `ExportDO` in `grove-durable-objects` |
| Backup Orchestration | CF Queues + Workflows         | Planned (Phase B)                     |
| Auth                 | Heartwood                     | SSO via session cookies               |
| Billing              | Stripe (via Plant)            | Add-on subscriptions                  |

### What Engine Already Provides

These systems exist today and Amber builds on them:

| System           | Location                                         | What It Does                                   |
| ---------------- | ------------------------------------------------ | ---------------------------------------------- |
| Storage Service  | `libs/engine/src/lib/server/services/storage.ts` | R2 upload, get, delete, list, sync (911 lines) |
| Tier Config      | `libs/engine/src/lib/config/tiers.ts`            | Storage limits per tier with rate limits       |
| Upload Gate      | `libs/engine/src/lib/server/upload-gate.ts`      | Feature-flagged per-tenant upload control      |
| Export System    | `libs/engine/src/routes/api/export/`             | Start, poll, download, cancel ZIP exports      |
| Image Dedup      | Engine D1 `image_hashes` table                   | Hash-based duplicate detection                 |
| Bucket Sync      | `storage.ts` `syncFromBucket()`                  | R2 to D1 metadata recovery                     |
| Upload Endpoints | `/api/images/upload`, `/api/settings/avatar`     | Image and avatar uploads with validation       |

---

## Tier Access

Storage is shared across all Grove products. Amber provides visibility into this unified pool.

| Tier            | Price  | Storage | Upload Rate | Add-ons |
| --------------- | ------ | ------- | ----------- | ------- |
| Wanderer (Free) | $0     | 100 MB  | 5/day       | —       |
| Seedling        | $8/mo  | 1 GB    | 10/day      | ✓       |
| Sapling         | $12/mo | 5 GB    | 50/day      | ✓       |
| Oak             | $25/mo | 20 GB   | 200/day     | ✓       |
| Evergreen       | $35/mo | 100 GB  | 1000/day    | ✓       |

Source of truth: `libs/engine/src/lib/config/tiers.ts`

### Storage Breakdown by Product

| Product     | What Uses Storage                                  |
| ----------- | -------------------------------------------------- |
| **Blog**    | Images, markdown content, custom fonts             |
| **Ivy**     | Email bodies, attachments                          |
| **Profile** | Avatar, banner images                              |
| **Themes**  | Custom CSS, uploaded assets                        |
| **Exports** | Generated ZIP archives (temporary, 7-day TTL)      |
| **Backups** | Automated backup archives (configurable retention) |

### Storage Add-ons

Wanderers who need more space can purchase additional storage:

| Add-on  | Price | Storage |
| ------- | ----- | ------- |
| +10 GB  | $1/mo | 10 GB   |
| +50 GB  | $4/mo | 50 GB   |
| +100 GB | $7/mo | 100 GB  |

**Cost basis:** R2 costs ~$0.015/GB/month. These prices provide healthy margin while remaining affordable. Add-ons are managed through Plant's Stripe integration and stack with the base tier.

---

## Schema: Unified File Tracking

### The Convergence

Engine currently tracks files in `cdn_files`. Amber needs additional fields for product categorization, trash, and storage management. The solution: evolve `cdn_files` with three new columns.

### Current Schema (Engine D1)

```sql
-- Exists today in libs/engine/migrations/
CREATE TABLE cdn_files (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,           -- R2 object key
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  folder TEXT DEFAULT '/',
  alt_text TEXT,
  uploaded_by TEXT NOT NULL,          -- tenant_id in multi-tenant context
  created_at TEXT NOT NULL
);

CREATE INDEX idx_cdn_files_folder ON cdn_files(folder);
CREATE INDEX idx_cdn_files_key ON cdn_files(key);
```

### Migration: Add Amber Columns

```sql
-- New migration: add Amber storage management columns to cdn_files
ALTER TABLE cdn_files ADD COLUMN product TEXT DEFAULT 'blog'
  CHECK (product IN ('blog', 'ivy', 'profile', 'themes', 'exports', 'backups'));

ALTER TABLE cdn_files ADD COLUMN category TEXT DEFAULT 'images';

ALTER TABLE cdn_files ADD COLUMN deleted_at TEXT;  -- soft delete for trash

-- Performance indexes for Amber queries
CREATE INDEX idx_cdn_files_product ON cdn_files(uploaded_by, product, category);
CREATE INDEX idx_cdn_files_deleted ON cdn_files(uploaded_by, deleted_at);
CREATE INDEX idx_cdn_files_size ON cdn_files(uploaded_by, size_bytes DESC);
CREATE INDEX idx_cdn_files_created_desc ON cdn_files(uploaded_by, created_at DESC);
```

### Why Evolve, Not Replace

The `cdn_files` table already has real data. Blog uploads, avatar uploads, CDN files all write to it through Engine's `storage.ts` service. Creating a separate `storage_files` table would mean two sources of truth. Instead, we add the columns Amber needs to the table Engine already uses.

**What changes in existing upload code:** Each upload endpoint sets `product` and `category` when calling `uploadFile()`. The storage service accepts these as optional parameters and defaults to `'blog'` / `'images'` for backward compatibility.

### Export Tracking (Already Exists)

```sql
-- Already in Engine: libs/engine/migrations/054_storage_exports.sql
CREATE TABLE storage_exports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  export_type TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  r2_key TEXT,
  size_bytes INTEGER,
  file_count INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  expires_at TEXT,
  updated_at TEXT
);
```

---

## Quota Enforcement

### Warning Thresholds

| Usage | Action                                           |
| ----- | ------------------------------------------------ |
| < 80% | Normal operation                                 |
| 80%   | Dashboard warning banner, yellow storage meter   |
| 95%   | Prominent warning, large file uploads restricted |
| 100%  | Block new uploads, prompt for cleanup or upgrade |

### What Gets Blocked at 100%

**Blocked:**

- New blog image uploads
- New email attachments (outgoing)
- Profile image changes
- Theme asset uploads

**Never Blocked:**

- Incoming email (Ivy receives, even if over quota)
- Reading existing content
- Downloading and exporting
- Deleting files
- Automated backups (these are essential, even at quota)

### Implementation

Quota enforcement happens at the Engine level. Each upload endpoint checks before accepting:

```typescript
// In Engine upload endpoints
import { TIERS } from "$lib/config/tiers.js";

async function enforceQuota(db: D1Database, tenantId: string, tier: TierKey, newFileSize: number) {
	const tierConfig = TIERS[tier];
	const storageLimit = tierConfig.limits.storage; // bytes

	// Calculate current usage from cdn_files
	const usage = await db
		.prepare(
			`
    SELECT COALESCE(SUM(size_bytes), 0) as total
    FROM cdn_files
    WHERE uploaded_by = ? AND deleted_at IS NULL
  `,
		)
		.bind(tenantId)
		.first<{ total: number }>();

	const currentUsage = usage?.total ?? 0;

	if (currentUsage + newFileSize > storageLimit) {
		return { allowed: false, used: currentUsage, limit: storageLimit };
	}

	return { allowed: true, used: currentUsage, limit: storageLimit };
}
```

### User Experience at Quota

```
┌──────────────────────────────────────────────────────────┐
│  Storage Full                                            │
│                                                          │
│  You've used all 20 GB of your storage.                  │
│                                                          │
│  To continue uploading, you can:                         │
│                                                          │
│  [ Clean Up ]       - Move unused files to trash         │
│  [ Add Storage ]    - Starting at $1/mo for 10 GB        │
│  [ Upgrade Plan ]   - Get more storage + features        │
│                                                          │
│  Your existing content is safe. You can still            │
│  receive emails and access everything.                   │
└──────────────────────────────────────────────────────────┘
```

---

## Features

### Phase A: Visibility (Foundation)

Make Amber real. Connect the frontend to Engine's actual data.

#### Storage Dashboard

- Visual breakdown: usage by product (blog, ivy, profile, themes)
- Storage meter: current usage vs quota with percentage
- Quota warnings: clear indicators at 80%, 95%, 100%
- Quick stats: total files, trash size, recent activity

#### File Browser

- Browse by product (Blog files, Ivy attachments, Profile images)
- Grid and list view modes
- Search files by name
- Sort by date, size, name
- Preview images inline
- Metadata: size, upload date, dimensions, product source

#### Trash Management

- Soft delete moves files to trash (sets `deleted_at`)
- 30-day retention before permanent deletion
- Restore from trash
- Empty trash to reclaim space immediately
- Cron job: daily at 3 AM UTC, deletes files where `deleted_at` > 30 days

#### Export

Already implemented in Engine. Amber surfaces it in the UI:

- Full data export as ZIP (posts as Markdown, media files, manifest)
- Export by type (posts only, media only)
- Async processing via ExportDO with progress polling
- Download links valid for 7 days
- Rate-limited per tenant via Threshold

### Phase B: Automated Backups (The Pipeline)

The foundation for data sovereignty. Grove automatically packages Wanderer data on a schedule.

#### Backup Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     Backup Pipeline                            │
│                                                                │
│  Trigger              Orchestrate          Package     Store   │
│  ┌─────────┐         ┌──────────┐        ┌────────┐  ┌─────┐   │
│  │ CF Cron │───────→ │ CF Queue │──────→ │BackupDO│─→│ R2  │   │
│  │ (daily) │         │ (buffer) │        │(stream)│  │     │   │
│  └─────────┘         └──────────┘        └────────┘  └──┬──┘   │
│                                                         │      │
│                                                         ▼      │
│                                                  Amber View    │
│                                               (Wanderer sees   │
│                                                backup files)   │
└────────────────────────────────────────────────────────────────┘
```

#### How It Works

1. **Cron trigger**: Daily (configurable). CF Cron enqueues a backup job per tenant.
2. **Queue processing**: CF Queue ensures reliable delivery. Jobs don't get lost.
3. **BackupDO**: A Durable Object (similar to ExportDO) packages the tenant's data.
   - Posts as Markdown with YAML frontmatter
   - Media files from R2
   - Settings and configuration as JSON
   - Manifest with checksums
4. **R2 storage**: Backup archive lands in the Wanderer's Amber storage under `backups/`.
5. **Retention**: Keep last N backups (configurable, default: 7 daily + 4 weekly).
6. **Visible in Amber**: The dashboard shows backup history, last backup time, and download links.

#### Backup Format

```
grove-backup-{username}-{date}/
├── manifest.json          # Checksums, file list, backup metadata
├── README.txt             # How to use this backup
├── posts/
│   ├── 2026-01-15-my-first-post.md
│   └── 2026-02-01-another-post.md
├── pages/
│   └── about.md
├── media/
│   ├── images/
│   │   └── sunset-1738000000-abc123.webp
│   └── avatars/
│       └── avatar.webp
└── settings/
    ├── site-settings.json
    └── theme-config.json
```

#### Backup Scheduling

| Tier      | Auto-Backup | Retention                       |
| --------- | ----------- | ------------------------------- |
| Wanderer  | —           | —                               |
| Seedling  | Weekly      | 4 backups                       |
| Sapling   | Daily       | 7 daily + 4 weekly              |
| Oak       | Daily       | 7 daily + 4 weekly + 2 monthly  |
| Evergreen | Daily       | 7 daily + 4 weekly + 12 monthly |

### Phase C: External Storage Sync (Data Sovereignty)

This is the feature that changes everything. Most platforms say "you can export your data." Grove says "your data is already in your Google Drive. You don't need to ask us for it."

#### How It Works

```
Amber R2 (backup archive)
    │
    │  one-way push
    ▼
┌─────────────────────────────────────────────────────┐
│              External Sync Worker                   │
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐        │
│  │  Google   │  │  Dropbox  │  │  WebDAV   │        │
│  │  Drive    │  │  API v2   │  │  (future) │        │
│  │  (OAuth2) │  │  (OAuth2) │  │           │        │
│  └───────────┘  └───────────┘  └───────────┘        │
└─────────────────────────────────────────────────────┘
```

#### Provider Priority

1. **Google Drive** (first). Best API, most users, OAuth2 well-understood.
2. **Dropbox** (second). Good API, straightforward OAuth2.
3. **WebDAV / generic** (future). Covers Nextcloud, Synology, self-hosted.
4. **iCloud** (unlikely). Apple provides no public API for iCloud Drive. May become possible through CloudKit web services, but don't design for it.

#### OAuth2 Flow

1. Wanderer clicks "Connect Google Drive" in Amber Settings
2. Redirect to Google OAuth2 consent screen (scope: `drive.file`)
3. Authorization code returned to Engine callback
4. Engine stores encrypted refresh token in D1
5. After each backup, sync worker uses refresh token to push to Drive

#### What Gets Pushed

Only backup archives. Not individual files in real-time. The external provider receives the same ZIP that appears in the Wanderer's Amber storage. Simple, predictable, auditable.

#### Why This Matters

This is a philosophical differentiator:

- If Grove goes down, Wanderers already have their data
- If Wanderers leave, they don't need to wait for an export
- Trust is built through continuous proof, not promises
- The data is warm and present, not locked behind a "Request Export" button

---

## API Routes

All routes live in Engine (`libs/engine/src/routes/api/`). Amber's frontend calls these. No separate Amber API.

### Storage Info

```
GET /api/storage
  → Returns: quota (tier + addons), used bytes, available, breakdown by product
  → Source: SUM(size_bytes) from cdn_files WHERE deleted_at IS NULL

GET /api/storage/files
  → Query: ?product=blog&category=images&sort=created_at&order=desc&limit=50&offset=0&search=sunset
  → Returns: paginated file list with metadata

GET /api/storage/files/:id
  → Returns: single file metadata

GET /api/storage/usage
  → Returns: usage breakdown by product and category
  → Source: GROUP BY product, category on cdn_files
```

### File Operations

```
DELETE /api/storage/files/:id
  → Sets deleted_at (soft delete, moves to trash)

POST /api/storage/files/:id/restore
  → Clears deleted_at (restores from trash)

GET /api/storage/trash
  → Returns: files where deleted_at IS NOT NULL, with days remaining

DELETE /api/storage/trash
  → Permanently deletes all trash (R2 + D1)

DELETE /api/storage/trash/:id
  → Permanently deletes single file from trash
```

### Export (Already Implemented)

```
POST /api/export
  → Starts async ZIP export job (ExportDO)

GET /api/export/:id/status
  → Returns: progress, status, file count

GET /api/export/:id/download
  → Streams completed ZIP from R2

POST /api/export/:id/cancel
  → Cancels in-progress export
```

### Add-ons (Future, via Plant)

```
GET /api/storage/addons
  → Returns: available tiers and current purchases

POST /api/storage/addons
  → Body: { addon_type: 'storage_10gb' | 'storage_50gb' | 'storage_100gb' }
  → Returns: Stripe checkout session URL (via Plant)

DELETE /api/storage/addons/:id
  → Cancels at end of billing period
```

### Backups (Phase B)

```
GET /api/storage/backups
  → Returns: backup history with dates, sizes, download URLs

POST /api/storage/backups/trigger
  → Manually triggers a backup (rate-limited: 1/day)

GET /api/storage/backups/:id/download
  → Streams backup archive from R2
```

### External Sync (Phase C)

```
GET /api/storage/providers
  → Returns: connected providers with last sync time

POST /api/storage/providers/connect
  → Body: { provider: 'google_drive' | 'dropbox' }
  → Returns: OAuth2 authorization URL

GET /api/storage/providers/callback
  → Handles OAuth2 callback, stores refresh token

DELETE /api/storage/providers/:id
  → Disconnects provider, revokes token
```

---

## Frontend

### Current State

The Amber frontend (`apps/amber/`) is 6,281 lines of polished SvelteKit. The components are well-built. The design system is thorough. The problem is connectivity: it talks to a standalone worker that has no data.

### What Exists (Preserve)

| Component       | Lines | Quality                             |
| --------------- | ----- | ----------------------------------- |
| Dashboard page  | 467   | Good structure, needs data wiring   |
| Files page      | 369   | Grid/list toggle, filter, sort      |
| Trash page      | 264   | Restore/delete, empty with confirm  |
| Settings page   | 324   | Account, theme, export, danger zone |
| App layout      | 482   | Sidebar, header, responsive         |
| StorageMeter    | 152   | Progress bar with warning levels    |
| UsageBreakdown  | 233   | Per-product bars with file counts   |
| FileGrid        | 265   | Card view with selection            |
| FileList        | 291   | Table view with sortable columns    |
| AddStorageModal | 242   | Tier cards for purchase             |
| TrashBin        | 148   | Trash container with confirm flow   |

### What Needs Rewiring

| Current                                | Target                                                     |
| -------------------------------------- | ---------------------------------------------------------- |
| `api.ts` calls `amber-api.grove.place` | Call Engine API routes via proxy or direct                 |
| Better Auth client (`auth.ts`)         | Heartwood session validation server-side                   |
| Custom `theme.css` (255 lines)         | Lattice Tailwind preset (`@autumnsgrove/lattice/tailwind`) |
| SSR disabled (`ssr = false`)           | Enable SSR with `+page.server.ts` files                    |
| Mock data fallback                     | Real data or real error states                             |
| No Lattice UI components               | Use GlassCard, GlassButton where they exist                |

### What to Add

- **Upload dropzone**: Drag-and-drop file upload (calls Engine's upload endpoints)
- **File preview modal**: Images inline, PDFs in iframe, others show metadata
- **Bulk selection toolbar**: Delete, download, move to trash
- **Backup dashboard**: Last backup time, backup history, manual trigger button
- **External provider settings**: Connect/disconnect Google Drive, sync status

### UI Wireframes

#### Storage Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Amber                                               Settings   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ████████████████████████░░░░░░░░░░░░  15.2 GB / 20 GB (76%)    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Usage by Product                                       │    │
│  │                                                         │    │
│  │  Blog Images     ████████████████  10.1 GB   [Browse]   │    │
│  │  Email Attach.   ██████            3.8 GB    [Browse]   │    │
│  │  Blog Content    ██                1.1 GB    [Browse]   │    │
│  │  Profile         ░                 0.2 GB    [Browse]   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────────────┐     │
│  │  Last Backup         │  │  External Sync               │     │
│  │  Today, 3:00 AM      │  │  Google Drive: synced 3h ago │     │
│  │  [View Backups]      │  │  [Manage Providers]          │     │
│  └──────────────────────┘  └──────────────────────────────┘     │
│                                                                 │
│  [Export All]    [Empty Trash (342 MB)]    [+ Add Storage]      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### File Browser

```
┌─────────────────────────────────────────────────────────────────┐
│  Blog Images                                    Search...       │
├─────────────────────────────────────────────────────────────────┤
│  Sort: [Date]    View: [Grid] [List]     [Select All]           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐     │
│  │        │  │        │  │        │  │        │  │        │     │
│  │  img   │  │  img   │  │  img   │  │  img   │  │  img   │     │
│  │        │  │        │  │        │  │        │  │        │     │
│  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘     │
│  sunset.jpg  header.png  author.jpg  post-1.webp  graph.svg     │
│  2.4 MB      1.1 MB      340 KB      890 KB       12 KB         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security

### Authentication

All Amber API routes require a valid Heartwood session. Session validation happens server-side (not client-side Better Auth). The frontend uses `+page.server.ts` to verify the session before rendering.

### Authorization

Multi-tenant isolation: every query includes `WHERE uploaded_by = ?` with the tenant ID. Wanderers can only see their own files. This is inherited from Engine's existing pattern.

### CSRF Protection

All mutating endpoints (POST, DELETE) must validate the request origin. Engine's existing CSRF configuration covers this via `svelte.config.js` trusted origins.

### Rate Limiting

| Operation        | Limit  | Window     |
| ---------------- | ------ | ---------- |
| File listing     | 60/min | Per tenant |
| File delete      | 20/min | Per tenant |
| Export start     | 3/day  | Per tenant |
| Backup trigger   | 1/day  | Per tenant |
| Provider connect | 5/day  | Per tenant |

Rate limits enforced via Engine's Threshold system.

### External Provider Tokens

OAuth2 refresh tokens for connected providers (Google Drive, Dropbox) are stored encrypted in D1. Encryption key stored in Workers secret. Tokens are revoked when a provider is disconnected. Tokens are scoped to minimum permissions (`drive.file` for Google, not full Drive access).

---

## Scheduled Tasks

### Cron Configuration

| Task              | Schedule       | Purpose                                           |
| ----------------- | -------------- | ------------------------------------------------- |
| Trash cleanup     | Daily 3 AM UTC | Delete files where `deleted_at` > 30 days         |
| Export cleanup    | Daily 3 AM UTC | Delete completed exports where `expires_at` < now |
| Backup processing | Daily 3 AM UTC | Enqueue backup jobs for eligible tenants          |
| External sync     | Hourly         | Push new backups to connected providers           |

All cron jobs run in Engine's worker and emit structured JSON logs for monitoring:

```typescript
interface CronLogEntry {
	job: string;
	status: "started" | "completed" | "failed";
	timestamp: string;
	duration_ms?: number;
	items_processed?: number;
	bytes_freed?: number;
	errors?: string[];
}
```

---

## Implementation Checklist

### Phase A: Make Amber Real (Foundation)

Engine backend work:

- [ ] Migration: add `product`, `category`, `deleted_at` columns to `cdn_files`
- [ ] Update `storage.ts` `uploadFile()` to accept `product` and `category` parameters
- [ ] Tag existing upload endpoints: `/api/images/upload` → `product='blog'`, `/api/settings/avatar` → `product='profile'`
- [ ] Add quota enforcement to upload endpoints (check `TIERS[tier].limits.storage`)
- [ ] Add `GET /api/storage` route (quota info + usage breakdown)
- [ ] Add `GET /api/storage/files` route (paginated file list with product filter)
- [ ] Add soft delete: `DELETE /api/storage/files/:id` sets `deleted_at`
- [ ] Add restore: `POST /api/storage/files/:id/restore` clears `deleted_at`
- [ ] Add trash listing: `GET /api/storage/trash`
- [ ] Add trash cleanup: `DELETE /api/storage/trash`
- [ ] Add cron job: delete expired trash (30 days)
- [ ] Backfill: run `syncFromBucket()` to populate `cdn_files` for existing R2 objects
- [ ] Add usage aggregation: `GET /api/storage/usage` (GROUP BY product, category)

Frontend rewiring:

- [ ] Replace `api.ts` to call Engine routes
- [ ] Add `+page.server.ts` for each route (SSR data loading)
- [ ] Enable SSR (remove `ssr = false`)
- [ ] Replace `theme.css` with Lattice Tailwind preset (keep amber accent color)
- [ ] Replace Better Auth with Heartwood session validation
- [ ] Remove mock data fallback
- [ ] Wire StorageMeter to real quota data
- [ ] Wire UsageBreakdown to real product aggregation
- [ ] Wire FileGrid/FileList to real file listing
- [ ] Wire TrashBin to real trash operations
- [ ] Add upload dropzone component
- [ ] Add file preview modal

### Phase B: Automated Backups

- [ ] Research CF Queues + Workflows for reliable async processing
- [ ] Implement BackupDO (similar pattern to ExportDO)
- [ ] Backup format: Markdown posts + media + settings + manifest
- [ ] Cron trigger: enqueue backup jobs for eligible tenants
- [ ] Backup retention policy (per-tier, as defined above)
- [ ] `GET /api/storage/backups` route
- [ ] `POST /api/storage/backups/trigger` route (manual trigger)
- [ ] Backup history visible in Amber dashboard
- [ ] Backup download from Amber

### Phase C: External Storage Sync

- [ ] OAuth2 flow for Google Drive (`drive.file` scope)
- [ ] Encrypted token storage in D1
- [ ] Sync worker: after backup completes, push to connected providers
- [ ] Provider settings UI in Amber (connect, disconnect, last sync time)
- [ ] Dropbox integration (second provider)
- [ ] Sync status and error reporting in dashboard
- [ ] Token refresh and revocation handling

### Phase D: Polish

- [ ] Bulk file selection and actions (delete, download)
- [ ] Sort dropdown with multiple options
- [ ] Filter by product and category in file browser
- [ ] Mobile optimization (responsive file grid)
- [ ] Storage usage over time chart
- [ ] Cleanup suggestions ("These files are large and unused")
- [ ] Notification when backup completes

---

## Decisions

### Resolved

| Question                                         | Decision                      | Rationale                                                                 |
| ------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------- |
| Standalone worker vs Engine?                     | **Engine**                    | Export system already proved this pattern. One source of truth.           |
| New `storage_files` table vs evolve `cdn_files`? | **Evolve `cdn_files`**        | Already has real data. Adding 3 columns is simpler than dual tracking.    |
| Deduplication?                                   | **Already solved**            | Engine's `image_hashes` table handles hash-based dedup for images.        |
| Image variants?                                  | **Not now**                   | Generate on demand via CF Image Resizing if needed. Don't store variants. |
| Trash retention?                                 | **30 days, not configurable** | Simple, predictable. Same for all tiers.                                  |
| Backup format?                                   | **Same as export**            | Markdown + media + manifest ZIP. Consistent, already proven.              |
| External sync model?                             | **One-way push after backup** | Simple, auditable. Not real-time sync.                                    |

### Open

| Question            | Options                              | Notes                                                                    |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| Folder support?     | Flat (product-based) vs user-created | `cdn_files` already has `folder`. Could expose it.                       |
| Encryption at rest? | R2 default vs per-file encryption    | R2 provides server-side encryption by default. Per-file adds complexity. |
| Sharing?            | Temporary signed URLs                | Useful but adds security surface. Defer to Phase D.                      |
| iCloud integration? | Probably never                       | No public API. Monitor CloudKit web services.                            |

---

## Success Metrics

1. **Adoption**: % of paid Wanderers who visit Amber within first month
2. **Backup coverage**: % of tenants with successful backup in last 7 days
3. **External sync**: % of tenants with connected external provider
4. **Export usage**: Healthy if occasional (means Wanderers trust the system)
5. **Quota management**: Wanderers staying under quota via self-service
6. **Add-on revenue**: Storage add-on purchases
7. **Support reduction**: Fewer "where is my file" tickets

---

## Risks & Mitigations

| Risk                                       | Impact                        | Mitigation                                               |
| ------------------------------------------ | ----------------------------- | -------------------------------------------------------- |
| R2 outage                                  | Files temporarily unavailable | Status page, graceful degradation in UI                  |
| Schema migration breaks existing uploads   | Data loss                     | Test migration on staging D1 first                       |
| OAuth2 token expiry for external providers | Sync silently fails           | Token refresh on every sync, alert on failure            |
| Backup storage costs for large tenants     | Margin erosion                | Retention limits, backup archives count toward quota     |
| Feature creep toward file manager          | Scope bloat                   | Amber surfaces files. Products manage them.              |
| Google Drive API changes                   | Sync breaks                   | Abstract provider interface, monitor deprecation notices |

---

## References

### Internal

| Document                                               | Purpose                                      |
| ------------------------------------------------------ | -------------------------------------------- |
| `docs/specs/amber-sync-spec.md`                        | Future cross-device sync (separate product)  |
| `docs/plans/active/amber-storage-safari.md`            | Comprehensive codebase audit (February 2026) |
| `docs/plans/completed/amber-zip-export-integration.md` | How the export system was ported to Engine   |
| `libs/engine/src/lib/config/tiers.ts`                  | Source of truth for storage limits           |
| `libs/engine/src/lib/server/services/storage.ts`       | Engine's R2 storage abstraction              |

### Cloudflare

| Resource   | URL                                                   |
| ---------- | ----------------------------------------------------- |
| R2 Pricing | https://developers.cloudflare.com/r2/pricing/         |
| R2 API     | https://developers.cloudflare.com/r2/api/             |
| D1 Limits  | https://developers.cloudflare.com/d1/platform/limits/ |
| Queues     | https://developers.cloudflare.com/queues/             |
| Workflows  | https://developers.cloudflare.com/workflows/          |

---

_Amber is warm. Translucent. Honest. You can see what's inside. Nothing hidden, nothing held hostage. Your files, your backups, your sovereignty. Preserved in time, yours to carry forward._
