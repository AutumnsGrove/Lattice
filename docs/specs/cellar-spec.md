# Cellar — Grove Storage Management Specification

*Internal planning document*

*Created: December 2025*

---

## Overview

**Cellar** is Grove's unified storage management system. Every file you upload—blog images, email attachments, profile pictures—lives in the same root cellar, organized and accessible from one place.

### Why "Cellar"?

A root cellar is where you store what matters for the long term. Cool, secure, carefully organized. Your digital cellar holds your files, keeps them safe, and lets you manage your space as it grows.

| | |
|---|---|
| **Public name** | Cellar |
| **Internal codename** | GroveStorage |
| **Domain** | cellar.grove.place (or integrated into dashboard) |

### Philosophy

Cellar isn't trying to be Dropbox or Google Drive. It's the storage layer that already exists in Grove—made visible and manageable. Every paid user already has storage; Cellar is how they understand and control it.

- See what's using your space
- Download and export your data
- Clean up what you don't need
- Buy more when you need it

---

## Tier Access

Storage is shared across all Grove products. Cellar provides visibility into this unified pool.

| Tier | Base Storage | Email Access | Storage Add-ons |
|------|:------------:|:------------:|:---------------:|
| Free | — | — | — |
| Seedling ($8) | 1 GB | — | ✓ |
| Sapling ($12) | 5 GB | Read-only | ✓ |
| Oak ($25) | 20 GB | Full | ✓ |
| Evergreen ($35) | 100 GB | Full | ✓ |

### Storage Breakdown by Product

The same storage pool is used by:

| Product | What Uses Storage |
|---------|-------------------|
| **Blog** | Images, markdown content, custom fonts |
| **Ivy** | Email bodies, attachments |
| **Profile** | Avatar, banner images |
| **Themes** | Custom CSS, uploaded assets |
| **Exports** | Generated zip files (temporary) |

---

## Features

### Day One (MVP)

#### Storage Dashboard
- **Visual breakdown** — Pie/bar chart showing usage by category
- **Storage meter** — Current usage vs. quota with percentage
- **Quota warnings** — Clear indicators at 80%, 95%, 100%
- **Usage trends** — Simple graph showing storage over time

#### File Browser
- **Category views** — Browse by type (images, attachments, documents)
- **Source views** — Browse by product (Blog files, Ivy attachments)
- **Search** — Find files by name
- **Preview** — View images and documents inline
- **Metadata** — Size, upload date, dimensions (for images)

#### Export & Download
- **Single file download** — Download any file directly
- **Bulk download** — Select multiple files, download as zip
- **Full export** — Download everything (GDPR compliance)
- **Export by category** — Download all blog images, all email attachments, etc.

#### Storage Management
- **Delete files** — Remove individual files
- **Bulk delete** — Select and delete multiple files
- **Trash** — 30-day retention before permanent deletion
- **Empty trash** — Immediately reclaim space

### Later Features

#### Organization (Phase 2)
- **Folders** — User-created organization (especially for blog assets)
- **Tags** — Label files for easier finding
- **Favorites** — Quick access to frequently used files
- **Sort options** — By date, size, name, type

#### Optimization (Phase 2)
- **Image compression** — Automatically optimize uploaded images
- **Attachment compression** — Compress large email attachments
- **Duplicate detection** — Identify and merge duplicate files
- **Cleanup suggestions** — "These files are large and unused"

#### Advanced (Phase 3)
- **Version history** — For blog content (track changes)
- **Sharing** — Generate temporary download links
- **API access** — Programmatic file management

---

## Storage Add-ons

Users who need more space can purchase additional storage:

| Add-on | Price | Storage |
|--------|-------|---------|
| +10 GB | $1/mo | 10 GB |
| +50 GB | $4/mo | 50 GB |
| +100 GB | $7/mo | 100 GB |

**Cost basis:** R2 costs ~$0.015/GB/month. These prices provide healthy margin while remaining affordable.

### Implementation (Stripe)

```typescript
// Storage add-on products
const STORAGE_PRODUCTS = {
  'storage_10gb': {
    id: 'prod_storage_10gb',
    name: '+10 GB Storage',
    gb: 10,
    price_cents: 100,
  },
  'storage_50gb': {
    id: 'prod_storage_50gb',
    name: '+50 GB Storage',
    gb: 50,
    price_cents: 400,
  },
  'storage_100gb': {
    id: 'prod_storage_100gb',
    name: '+100 GB Storage',
    gb: 100,
    price_cents: 700,
  },
};

// Add to subscription
async function addStorageAddon(userId: string, addon: keyof typeof STORAGE_PRODUCTS) {
  const subscription = await getUserSubscription(userId);
  const product = STORAGE_PRODUCTS[addon];

  await stripe.subscriptions.update(subscription.stripe_id, {
    items: [
      { id: subscription.item_id },
      { price: product.price_id },
    ],
  });

  // Update user's quota in D1
  await db.run(`
    UPDATE user_storage
    SET additional_gb = additional_gb + ?
    WHERE user_id = ?
  `, [product.gb, userId]);
}
```

### Multiple Add-ons

Users can stack multiple add-ons:
- Oak (20 GB) + 50 GB add-on + 50 GB add-on = 120 GB total
- Shown as line items on invoice:
  - Oak Plan: $25/mo
  - +50 GB Storage: $4/mo
  - +50 GB Storage: $4/mo
  - Total: $33/mo

---

## Quota Enforcement

### Warning Thresholds

| Usage | Action |
|-------|--------|
| 80% | Email notification, dashboard warning |
| 95% | Prominent warning, upload limits for large files |
| 100% | Block new uploads, prompt for cleanup or upgrade |

### What Gets Blocked at 100%

**Blocked:**
- New blog image uploads
- New email attachments (outgoing)
- Profile image changes
- Theme asset uploads

**Never Blocked:**
- Incoming email (Ivy receives, even if over quota)
- Reading existing content
- Downloading/exporting
- Deleting files

### User Experience at Quota

When a user hits 100%:

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️  Storage Full                                       │
│                                                         │
│  You've used all 20 GB of your storage.                │
│                                                         │
│  To continue uploading, you can:                        │
│                                                         │
│  [Download & Clean Up]  - Export files, then delete    │
│  [Add Storage]          - Starting at $1/mo for 10 GB  │
│  [Upgrade Plan]         - Get more storage + features  │
│                                                         │
│  Your existing content is safe. You can still          │
│  receive emails and access everything.                  │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | SvelteKit | UI, matches Grove stack |
| Backend | Cloudflare Workers | API endpoints |
| Storage | Cloudflare R2 | File storage |
| Metadata DB | Cloudflare D1 | File records, quotas |
| Auth | Heartwood | SSO with Grove account |

### R2 Storage Structure

```
grove-storage/
├── {user_id}/
│   ├── blog/
│   │   ├── images/
│   │   │   └── {image_id}.webp
│   │   ├── content/
│   │   │   └── {post_id}.md
│   │   └── fonts/
│   │       └── {font_id}.woff2
│   ├── ivy/
│   │   ├── emails/
│   │   │   └── {email_id}.enc
│   │   └── attachments/
│   │       └── {attachment_id}/
│   │           └── {filename}
│   ├── profile/
│   │   ├── avatar.webp
│   │   └── banner.webp
│   ├── themes/
│   │   └── {theme_id}/
│   │       └── {asset}
│   └── exports/
│       └── {export_id}.zip    # Temporary, auto-deleted after 7 days
```

### File References

Files are referenced by their R2 key. The key structure encodes:
- Owner (user_id)
- Product (blog, ivy, profile, themes)
- Type (images, attachments, etc.)
- Unique ID

This structure enables:
- Efficient listing by category
- Easy calculation of per-product storage usage
- Simple access control (user can only access their prefix)

---

## Database Schema (D1)

### Core Tables

```sql
-- User storage quotas and usage
CREATE TABLE user_storage (
  user_id TEXT PRIMARY KEY,
  tier_gb INTEGER NOT NULL,              -- Storage from subscription tier
  additional_gb INTEGER DEFAULT 0,       -- Purchased add-ons
  used_bytes INTEGER DEFAULT 0,          -- Current usage in bytes
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- File metadata
CREATE TABLE storage_files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,           -- Full R2 object key
  filename TEXT NOT NULL,                -- Original filename
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  product TEXT NOT NULL,                 -- blog, ivy, profile, themes
  category TEXT NOT NULL,                -- images, attachments, content, etc.
  parent_id TEXT,                        -- Optional: linked blog post, email, etc.
  metadata TEXT,                         -- JSON: dimensions, duration, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,                  -- Soft delete (trash)
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Storage add-on purchases
CREATE TABLE storage_addons (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  addon_type TEXT NOT NULL,              -- storage_10gb, storage_50gb, storage_100gb
  gb_amount INTEGER NOT NULL,
  stripe_subscription_item_id TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Export jobs
CREATE TABLE storage_exports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',         -- pending, processing, completed, failed
  export_type TEXT NOT NULL,             -- full, blog, ivy, category
  filter_params TEXT,                    -- JSON: category filters, date range, etc.
  r2_key TEXT,                           -- Location of generated zip
  size_bytes INTEGER,
  file_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,                  -- Auto-delete after 7 days
  error_message TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Indexes

```sql
CREATE INDEX idx_files_user ON storage_files(user_id, deleted_at);
CREATE INDEX idx_files_product ON storage_files(user_id, product, category);
CREATE INDEX idx_files_created ON storage_files(user_id, created_at DESC);
CREATE INDEX idx_files_size ON storage_files(user_id, size_bytes DESC);
CREATE INDEX idx_addons_user ON storage_addons(user_id, active);
CREATE INDEX idx_exports_user ON storage_exports(user_id, status);
CREATE INDEX idx_exports_expiry ON storage_exports(status, expires_at);
```

### Usage Tracking

Storage usage is updated in real-time:

```typescript
// On file upload
async function trackUpload(userId: string, sizeBytes: number) {
  await db.run(`
    UPDATE user_storage
    SET used_bytes = used_bytes + ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `, [sizeBytes, userId]);
}

// On file delete (from trash)
async function trackDelete(userId: string, sizeBytes: number) {
  await db.run(`
    UPDATE user_storage
    SET used_bytes = used_bytes - ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `, [sizeBytes, userId]);
}

// Calculate per-product usage
async function getUsageBreakdown(userId: string) {
  return await db.all(`
    SELECT product, category,
           SUM(size_bytes) as bytes,
           COUNT(*) as file_count
    FROM storage_files
    WHERE user_id = ? AND deleted_at IS NULL
    GROUP BY product, category
  `, [userId]);
}
```

---

## API Endpoints

### Storage Info

```
GET /api/storage
→ Returns: quota, used, available, breakdown by product

GET /api/storage/files
→ Query params: product, category, sort, limit, offset
→ Returns: paginated file list with metadata

GET /api/storage/files/:id
→ Returns: single file metadata

GET /api/storage/usage
→ Returns: usage over time (for charts)
```

### File Operations

```
DELETE /api/storage/files/:id
→ Moves file to trash

POST /api/storage/files/:id/restore
→ Restores from trash

DELETE /api/storage/trash
→ Empties trash (permanent delete)

DELETE /api/storage/trash/:id
→ Permanently deletes single file from trash
```

### Export

```
POST /api/storage/export
→ Body: { type: 'full' | 'blog' | 'ivy' | 'category', filters?: {...} }
→ Returns: { export_id, status: 'pending' }

GET /api/storage/export/:id
→ Returns: export status, download URL when ready

GET /api/storage/export/:id/download
→ Returns: redirect to signed R2 URL
```

### Add-ons

```
GET /api/storage/addons
→ Returns: available add-ons and current purchases

POST /api/storage/addons
→ Body: { addon_type: 'storage_10gb' | 'storage_50gb' | 'storage_100gb' }
→ Returns: Stripe checkout session URL

DELETE /api/storage/addons/:id
→ Cancels add-on at end of billing period
```

---

## UI/UX Considerations

### Storage Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Storage                                           ⚙️ Settings  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ████████████████████████░░░░░░░░░░░░  15.2 GB / 20 GB (76%)   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📊 Usage by Category                                    │   │
│  │                                                          │   │
│  │  Blog Images     ████████████████  10.1 GB   [Browse]   │   │
│  │  Email Attach.   ██████            3.8 GB    [Browse]   │   │
│  │  Blog Content    ██                1.1 GB    [Browse]   │   │
│  │  Profile         ░                 0.2 GB    [Browse]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Download All]    [Empty Trash (342 MB)]    [+ Add Storage]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### File Browser

```
┌─────────────────────────────────────────────────────────────────┐
│  Blog Images                                    🔍 Search...    │
├─────────────────────────────────────────────────────────────────┤
│  Sort by: [Date ▼]    View: [Grid] [List]     [Select All]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐   │
│  │ 🖼️    │  │ 🖼️    │  │ 🖼️    │  │ 🖼️    │  │ 🖼️    │   │
│  │        │  │        │  │        │  │        │  │        │   │
│  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘   │
│  sunset.jpg  header.png  author.jpg  post-1.webp graph.svg     │
│  2.4 MB      1.1 MB      340 KB      890 KB      12 KB         │
│                                                                 │
│  ┌────────┐  ┌────────┐  ┌────────┐                            │
│  │ 🖼️    │  │ 🖼️    │  │ 🖼️    │                            │
│  │        │  │        │  │        │                            │
│  └────────┘  └────────┘  └────────┘                            │
│  banner.jpg  code.png    diagram.svg                           │
│  3.2 MB      456 KB      28 KB                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile

- Responsive grid layout
- Bottom sheet for file actions
- Swipe to delete/select
- Pull to refresh

---

## Integrations

### 1. Blog (Existing)

Blog already uploads images to R2. Cellar provides:
- Visibility into blog storage usage
- Ability to delete unused images
- Bulk download of blog assets

**Migration:** Existing blog files need metadata entries in `storage_files` table.

### 2. Ivy (Email)

Ivy attachments are stored in R2. Cellar provides:
- View email attachments separately from emails
- Download attachments without opening email
- See which attachments use the most space

### 3. Profile

Profile images (avatar, banner) are visible in Cellar.

### 4. Themes

Custom theme assets appear in Cellar for Oak+ users with custom themes.

---

## Data Portability

Cellar is central to Grove's GDPR compliance:

### Full Export

Users can request a complete export of all their data:

1. Click "Download All" in Cellar
2. System generates zip file in background
3. Zip includes:
   - All files (organized by product/category)
   - Metadata JSON (file info, upload dates)
   - Blog content (markdown)
   - Ivy emails (if user provides decryption)
4. User receives email when ready
5. Download link valid for 7 days
6. Zip auto-deleted after expiry

### Export Contents

```
grove-export-{username}-{date}/
├── manifest.json              # Export metadata
├── blog/
│   ├── images/
│   ├── content/
│   └── metadata.json
├── email/
│   ├── inbox/
│   ├── sent/
│   ├── attachments/
│   └── metadata.json
├── profile/
│   ├── avatar.webp
│   ├── banner.webp
│   └── metadata.json
└── README.md                  # Explanation of contents
```

---

## Open Questions

### Technical

1. **Deduplication** — Should we detect and dedupe identical uploads? (Same hash = same R2 object, shared reference)
2. **Image variants** — Do we store original + resized, or generate on demand?
3. **Encryption** — Blog files are unencrypted. Should Cellar offer encrypted storage option?
4. **Trash retention** — 30 days standard. Make configurable?

### Product

1. **Folder support** — Users will ask for folders. Worth the complexity?
2. **Sharing** — Temporary public links for files?
3. **Collaboration** — Future multi-user Grove accounts?
4. **Versioning** — Keep old versions of blog content?

### Business

1. **Free tier storage** — Should Free users get any storage for profile images?
2. **Storage limits** — Are the add-on prices right?
3. **Enterprise** — Custom storage tiers for business customers?

---

## Implementation Phases

### Phase 1: Foundation (MVP)

- [ ] D1 schema and migrations
- [ ] Storage usage tracking
- [ ] Basic dashboard view
- [ ] Usage breakdown by product
- [ ] Quota warnings

### Phase 2: File Management

- [ ] File browser (list view)
- [ ] Single file download
- [ ] Delete to trash
- [ ] Empty trash
- [ ] Search

### Phase 3: Export & Add-ons

- [ ] Full export generation
- [ ] Export by category
- [ ] Storage add-on purchase flow
- [ ] Stripe integration for add-ons

### Phase 4: Polish

- [ ] Grid view with thumbnails
- [ ] Bulk operations
- [ ] Usage charts over time
- [ ] Mobile optimization
- [ ] Cleanup suggestions

---

## Success Metrics

1. **Adoption** — % of users who visit Cellar
2. **Exports** — How many users export their data (healthy if occasional)
3. **Add-on revenue** — Storage add-on purchases
4. **Support reduction** — Fewer "where is my file" tickets
5. **Quota management** — Users staying under quota via self-service

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| R2 outage | Files temporarily unavailable | Clear status page, graceful degradation |
| Quota confusion | Users surprised by limits | Clear UI, proactive warnings |
| Export abuse | Large exports strain system | Rate limit exports, queue processing |
| Feature creep | Becomes full file manager | Strict scope, defer non-essential |
| Migration complexity | Existing files lack metadata | Careful migration script, gradual rollout |

---

## References

### Cloudflare
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare R2 API](https://developers.cloudflare.com/r2/api/)
- [Cloudflare D1 Limits](https://developers.cloudflare.com/d1/platform/limits/)

### Grove Internal
- Grove Pricing: `/docs/grove-pricing.md`
- Grove Naming: `/docs/grove-naming.md`
- Ivy Spec: `/docs/specs/ivy-mail-spec.md`

---

*This is a living document. Update as decisions are made and implementation progresses.*
