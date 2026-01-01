# Amber — Grove Storage Management Specification

*Internal planning document*

*Created: December 2025*

---

## Overview

**Amber** is Grove's unified storage management system. Every file you upload—blog images, email attachments, profile pictures—is preserved in Amber, organized and accessible from one place.

### Why "Amber"?

Amber is fossilized tree resin—preserving moments in time, capturing life in suspended animation. Your digital Amber holds your files, keeps them safe, and lets you manage your space as it grows.

| | |
|---|---|
| **Public name** | Amber |
| **Internal codename** | GroveStorage |
| **Domain** | amber.grove.place (or integrated into dashboard) |

### Philosophy

Amber isn't trying to be Dropbox or Google Drive. It's the storage layer that already exists in Grove—made visible and manageable. Every paid user already has storage; Amber is how they understand and control it.

- See what's using your space
- Download and export your data
- Clean up what you don't need
- Buy more when you need it

---

## Tier Access

Storage is shared across all Grove products. Amber provides visibility into this unified pool.

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

Blog already uploads images to R2. Amber provides:
- Visibility into blog storage usage
- Ability to delete unused images
- Bulk download of blog assets

**Migration:** Existing blog files need metadata entries in `storage_files` table.

### 2. Ivy (Email)

Ivy attachments are stored in R2. Amber provides:
- View email attachments separately from emails
- Download attachments without opening email
- See which attachments use the most space

### 3. Profile

Profile images (avatar, banner) are visible in Amber.

### 4. Themes

Custom theme assets appear in Amber for Oak+ users with custom themes.

---

## Data Portability

Amber is central to Grove's GDPR compliance. Following the **Google Takeout model**.

### Full Export

Users can request a complete export of all their data:

1. Click "Download All" in Amber
2. **Choose format:**
   - Zip (default, 1GB chunks)
   - Zip (5GB chunks)
   - 7z (better compression, 1GB or 5GB chunks)
3. System generates archives in background (streamed, not buffered)
4. **Download links emailed** to user's external email address
5. Download links valid for 7 days
6. Archives auto-deleted from R2 after expiry

### Export Delivery

**Why email instead of browser download?**
- Large exports (10GB+) can timeout in browser
- User doesn't have to wait—they get notified
- Works even if they close the tab
- Provides audit trail for GDPR requests

```
Export Flow:
1. User clicks "Download All"
2. Selects format (zip/7z) and chunk size (1GB/5GB)
3. Job queued → status shows "Preparing..."
4. Worker streams files into chunks (never loads all in memory)
5. When complete: email sent with signed download URLs
6. User downloads from email links at their convenience
```

### Export File Structure

```
grove-export-{username}-{date}/
├── part-1.zip (or .7z)        # Up to 1GB or 5GB
│   ├── blog/
│   │   ├── images/
│   │   ├── content/
│   │   └── metadata.json
│   └── profile/
│       ├── avatar.webp
│       └── banner.webp
├── part-2.zip                 # If needed
│   └── email/
│       ├── inbox/
│       ├── sent/
│       └── attachments/
├── manifest.json              # Export metadata (always separate)
└── README.md                  # Explanation of contents
```

### Export Rate Limits

- **1 concurrent export** per user
- **3 exports per day** maximum
- Large exports (>10GB) may take hours—user notified of estimated time

### Export Streaming Implementation

Workers have 128MB memory limit. Large exports (50GB+) must stream directly to R2:

```typescript
// Stream zip directly to R2 without buffering entire export
import { ZipWriter } from '@aspect-build/rules_js'; // or similar streaming zip library

// Configuration constants
const EXPORT_CONFIG = {
  batchSize: 10,                  // Fetch 10 files concurrently
  chunkSizes: {
    small: 1 * 1024 * 1024 * 1024,   // 1 GB
    large: 5 * 1024 * 1024 * 1024,   // 5 GB
  },
  maxConcurrentExports: 1,        // Per user
  expiryDays: 7,
};

// Batch R2 reads to avoid N+1 queries
async function batchGetFiles(
  bucket: R2Bucket,
  keys: string[]
): Promise<Map<string, R2ObjectBody | null>> {
  const results = new Map<string, R2ObjectBody | null>();

  // R2 doesn't have native batch get, but we can parallelize
  const batches: string[][] = [];
  for (let i = 0; i < keys.length; i += EXPORT_CONFIG.batchSize) {
    batches.push(keys.slice(i, i + EXPORT_CONFIG.batchSize));
  }

  for (const batch of batches) {
    const promises = batch.map(async (key) => {
      const obj = await bucket.get(key);
      results.set(key, obj);
    });
    await Promise.all(promises);
  }

  return results;
}

async function generateExportChunk(
  env: Env,
  userId: string,
  files: StorageFile[],
  chunkNumber: number,
  chunkSizeBytes: number
): Promise<string> {
  const r2Key = `exports/${userId}/${Date.now()}/part-${chunkNumber}.zip`;

  // Create a TransformStream for streaming to R2
  const { readable, writable } = new TransformStream();

  // Start R2 upload with streaming body
  const uploadPromise = env.R2_BUCKET.put(r2Key, readable, {
    httpMetadata: { contentType: 'application/zip' },
  });

  // Create zip writer that streams to the writable side
  const zipWriter = new ZipWriter(writable);

  // Pre-filter files for this chunk
  let currentSize = 0;
  const chunkFiles: StorageFile[] = [];
  for (const file of files) {
    if (currentSize >= chunkSizeBytes) break;
    chunkFiles.push(file);
    currentSize += file.size_bytes;
  }

  // Batch fetch file data (avoids N+1 queries)
  const fileKeys = chunkFiles.map(f => f.r2_key);
  const fileDataMap = await batchGetFiles(env.R2_BUCKET, fileKeys);

  // Stream each file into the zip
  for (const file of chunkFiles) {
    const fileData = fileDataMap.get(file.r2_key);
    if (fileData) {
      await zipWriter.add(file.filename, fileData.body);
    }
  }

  await zipWriter.close();
  await uploadPromise;

  return r2Key;
}

// Durable Object for long-running exports (survives Worker timeout)
export class ExportJob {
  state: DurableObjectState;

  async processExport(userId: string, format: 'zip' | '7z', chunkSize: number) {
    // Durable Objects can run for up to 30 seconds per alarm
    // Schedule sequential alarms to process large exports
    const files = await this.getFilesForUser(userId);
    const chunks = this.chunkFiles(files, chunkSize);

    for (let i = 0; i < chunks.length; i++) {
      await this.state.storage.put('currentChunk', i);
      await generateExportChunk(this.env, userId, chunks[i], i + 1, chunkSize);
      // Update progress
      await this.updateExportProgress(userId, (i + 1) / chunks.length);
    }

    // Send email with download links
    await this.sendExportReadyEmail(userId);
  }
}
```

**Key points:**
- TransformStream pipes data directly from source R2 → zip → destination R2
- Durable Objects handle exports >30 seconds via alarm chaining
- Progress tracked in D1 for UI updates
- Memory usage stays constant regardless of export size

### Migration Script (Existing Files)

Existing blog files need `storage_files` entries:

```typescript
// Migration: populate storage_files from existing R2 objects
async function migrateExistingFiles() {
  const bucket = env.R2_BUCKET;
  let cursor: string | undefined;

  do {
    const listed = await bucket.list({ cursor, limit: 1000 });

    for (const object of listed.objects) {
      // Parse R2 key: {user_id}/blog/images/{filename}
      const [userId, product, category, ...rest] = object.key.split('/');
      const filename = rest.join('/');

      await db.run(`
        INSERT OR IGNORE INTO storage_files
        (id, user_id, r2_key, filename, mime_type, size_bytes, product, category, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        crypto.randomUUID(),
        userId,
        object.key,
        filename,
        object.httpMetadata?.contentType || 'application/octet-stream',
        object.size,
        product,
        category,
        object.uploaded.toISOString()
      ]);
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  // Update user_storage totals
  await db.run(`
    INSERT INTO user_storage (user_id, tier_gb, used_bytes)
    SELECT user_id, 0, SUM(size_bytes)
    FROM storage_files
    GROUP BY user_id
    ON CONFLICT (user_id) DO UPDATE SET used_bytes = excluded.used_bytes
  `);
}
```

---

## Testing Strategy

### Unit Tests

**Quota Calculation:**
- Tier + add-ons computed correctly
- Used bytes tracked accurately
- Threshold warnings triggered at 80%, 95%, 100%

**File Operations:**
- Upload creates storage_files entry
- Delete moves to trash (soft delete)
- Permanent delete removes from R2 and D1

**Export Generation:**
- Files chunked at correct boundaries
- 7z compression works
- Manifest generated correctly

### Integration Tests

**Upload → Storage → Download Flow:**
- File uploaded → R2 + D1 entry
- Quota updated atomically
- Download returns correct file

**Export Flow:**
- Job queued → processed → email sent
- Chunked correctly for large exports
- Signed URLs work and expire

**Add-on Purchase:**
- Stripe checkout flow
- Quota increased after payment
- Cancellation at period end

### End-to-End Tests

- Full export of 10GB+ mailbox
- Quota enforcement blocks upload
- Migration script populates existing files

### Load Tests

- 100 concurrent uploads
- 100GB export streaming
- File browser with 10k files

---

## Open Questions

### Technical

1. **Deduplication** — Should we detect and dedupe identical uploads? (Same hash = same R2 object, shared reference)
2. **Image variants** — Do we store original + resized, or generate on demand?
3. **Encryption** — Blog files are unencrypted. Should Amber offer encrypted storage option?
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
- [ ] Trash auto-deletion cron (see Scheduled Tasks)

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
- [ ] Export cleanup cron (see Scheduled Tasks)

### Phase 4: Polish

- [ ] Grid view with thumbnails
- [ ] Bulk operations
- [ ] Usage charts over time
- [ ] Mobile optimization
- [ ] Cleanup suggestions

---

## Scheduled Tasks (Worker Cron)

Amber requires scheduled tasks for automated cleanup:

### Cron Configuration

```typescript
// Cron job configuration constants
const CRON_CONFIG = {
  trashRetentionDays: 30,
  exportRetentionDays: 7,
  batchSize: {
    trash: 100,
    exports: 50,
  },
};
```

### Structured Logging

All cron jobs use structured JSON logging for monitoring and alerting:

```typescript
// Structured log entry for cron operations
interface CronLogEntry {
  job: string;
  status: 'started' | 'completed' | 'failed';
  timestamp: string;
  duration_ms?: number;
  items_processed?: number;
  bytes_freed?: number;
  errors?: string[];
  metadata?: Record<string, unknown>;
}

function logCronEvent(entry: CronLogEntry): void {
  // Structured JSON for log aggregation (Cloudflare Logpush, Datadog, etc.)
  console.log(JSON.stringify({
    ...entry,
    service: 'amber',
    environment: process.env.ENVIRONMENT || 'production',
  }));
}
```

### Trash Auto-Deletion

**Schedule:** Daily at 3:00 AM UTC

```typescript
// wrangler.toml
[triggers]
crons = ["0 3 * * *"]  # Daily at 3 AM UTC

// Worker cron handler
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    if (event.cron === "0 3 * * *") {
      await deleteExpiredTrash(env);
      await deleteExpiredExports(env);
    }
  }
};

async function deleteExpiredTrash(env: Env) {
  const startTime = Date.now();
  const errors: string[] = [];
  let itemsDeleted = 0;
  let bytesFreed = 0;

  logCronEvent({
    job: 'trash_cleanup',
    status: 'started',
    timestamp: new Date().toISOString(),
  });

  try {
    const cutoffDate = new Date(Date.now() - CRON_CONFIG.trashRetentionDays * 24 * 60 * 60 * 1000).toISOString();

    // Get expired trash items (batch of 100 at a time)
    const expired = await env.DB.prepare(`
      SELECT id, user_id, r2_key, size_bytes
      FROM storage_files
      WHERE deleted_at IS NOT NULL AND deleted_at < ?
      LIMIT ?
    `).bind(cutoffDate, CRON_CONFIG.batchSize.trash).all();

    for (const file of expired.results) {
      try {
        // Delete from R2
        await env.R2_BUCKET.delete(file.r2_key);

        // Delete from D1
        await env.DB.prepare('DELETE FROM storage_files WHERE id = ?').bind(file.id).run();

        // Update user's used_bytes
        await env.DB.prepare(`
          UPDATE user_storage
          SET used_bytes = used_bytes - ?
          WHERE user_id = ?
        `).bind(file.size_bytes, file.user_id).run();

        itemsDeleted++;
        bytesFreed += file.size_bytes;
      } catch (err) {
        errors.push(`Failed to delete file ${file.id}: ${err.message}`);
      }
    }

    logCronEvent({
      job: 'trash_cleanup',
      status: errors.length > 0 ? 'completed' : 'completed',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      items_processed: itemsDeleted,
      bytes_freed: bytesFreed,
      errors: errors.length > 0 ? errors : undefined,
      metadata: { batch_size: expired.results.length },
    });
  } catch (err) {
    logCronEvent({
      job: 'trash_cleanup',
      status: 'failed',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      errors: [err.message],
    });
    throw err;
  }
}

async function deleteExpiredExports(env: Env) {
  const startTime = Date.now();
  const errors: string[] = [];
  let itemsDeleted = 0;

  logCronEvent({
    job: 'export_cleanup',
    status: 'started',
    timestamp: new Date().toISOString(),
  });

  try {
    const cutoffDate = new Date(Date.now() - CRON_CONFIG.exportRetentionDays * 24 * 60 * 60 * 1000).toISOString();

    const expired = await env.DB.prepare(`
      SELECT id, r2_key
      FROM storage_exports
      WHERE status = 'completed' AND expires_at < ?
      LIMIT ?
    `).bind(cutoffDate, CRON_CONFIG.batchSize.exports).all();

    for (const exp of expired.results) {
      try {
        if (exp.r2_key) {
          // Delete all export files (could be multiple chunks)
          const prefix = exp.r2_key.replace(/\/[^/]+$/, '/'); // Get directory
          const list = await env.R2_BUCKET.list({ prefix });
          for (const obj of list.objects) {
            await env.R2_BUCKET.delete(obj.key);
          }
        }

        await env.DB.prepare('DELETE FROM storage_exports WHERE id = ?').bind(exp.id).run();
        itemsDeleted++;
      } catch (err) {
        errors.push(`Failed to delete export ${exp.id}: ${err.message}`);
      }
    }

    logCronEvent({
      job: 'export_cleanup',
      status: 'completed',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      items_processed: itemsDeleted,
      errors: errors.length > 0 ? errors : undefined,
      metadata: { batch_size: expired.results.length },
    });
  } catch (err) {
    logCronEvent({
      job: 'export_cleanup',
      status: 'failed',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      errors: [err.message],
    });
    throw err;
  }
}
```

### Cron Schedule Summary

| Task | Schedule | Purpose |
|------|----------|---------|
| Trash cleanup | Daily 3 AM UTC | Delete files in trash >30 days |
| Export cleanup | Daily 3 AM UTC | Delete completed exports >7 days |

---

## Success Metrics

1. **Adoption** — % of users who visit Amber
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
