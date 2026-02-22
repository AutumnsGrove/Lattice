---
title: "Curio: Custom Uploads"
status: planned
category: features
---

# Curio: Custom Uploads

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 18

---

**Character**: The shared media backbone powering all other curios. Infrastructure isn't glamorous, but everything beautiful sits on top of it. Custom Uploads is the pipe that badges, cursors, shrines, clip art, shelf covers, Cathedral panels, blogroll buttons, and every other image-needing curio flows through.

**Consultant**: Nafula (upload infrastructure specialist, Cape Town, South Africa). Works from a cliff-top workshop overlooking where the Indian and Atlantic oceans meet. Calibrates antennas and designs data flow diagrams for a living.

### Safari findings: What exists today

**763 lines across 6 implementation files** — the DB side works, but the actual upload flow has a gap in the middle.

**Shared lib** (`src/lib/curios/customuploads/index.ts`, 138 lines):

- [x] Types: `UploadRecord`, `UploadDisplay`, `AllowedMimeType` (PNG/GIF/WebP)
- [x] Constants: 100 uploads/tenant, 5MB max, 512px max dimension, 128px thumbnails
- [x] Utilities: ID generation (`upl_` prefix), filename sanitization, R2 key builders, MIME validation
- [x] R2 paths: `curios/{tenantId}/uploads/{id}.{ext}` + `{id}_thumb.webp`

**Database** (migration 074): `custom_uploads` table with id, tenant_id, filename, original_filename, mime_type, file_size, width, height, r2_key, thumbnail_r2_key, usage_count, uploaded_at

**Admin** (208 lines total): Shows uploads with metadata, quota display, delete button. **No upload dropzone** — management only.

**API** (225 lines total): GET list (cached 30s), POST register (creates DB record + returns R2 keys but **doesn't actually upload to R2**), DELETE record (returns R2 keys but **doesn't delete R2 objects**).

**Tests** (190 lines): All utility functions covered.

**Image processor** (`src/lib/utils/imageProcessor.ts`, 669 lines): **EXISTS BUT NOT WIRED IN.** Full pipeline: JXL encoding, HEIC decoding, auto-resize, EXIF stripping, adaptive effort. Completely unused by Custom Uploads.

**Upload validation** (`src/lib/utils/upload-validation.ts`, 584 lines): Deep validation with magic byte checking, strategy detection, actionable error messages. Also not wired into Custom Uploads.

### Design spec (safari-approved)

#### Philosophy: The invisible backbone

Custom Uploads has no public component — by design. It's infrastructure. Its job is to make every other curio's image handling effortless. The owner shouldn't think about "uploading to the uploads system." They should think about "adding an image to my badge / shrine / shelf / Cathedral" and the upload system handles the rest invisibly.

#### Upload flow: Match existing media pipeline

Use the same upload pattern as blog post media uploads (whatever that pipeline is). Consistency over novelty. The flow:

1. Owner interacts with a Smart Field (see below) — drops a file, pastes a URL, or browses existing uploads
2. Client-side: image runs through `imageProcessor.ts` — auto-resize, EXIF strip, thumbnail generation, optional JXL conversion
3. Upload to R2 via the same mechanism blog media uses
4. DB record created with full metadata (dimensions, size, format, R2 keys)
5. Smart Field shows thumbnail preview, curio saves the CDN URL

#### The Smart Field component

A reusable `SmartImageField.svelte` that replaces raw URL inputs across all curio admin pages. One field, three input methods.

**At rest (empty):** Looks like a normal text input with a small image-browse icon button on the right side. Placeholder text: "Paste URL or browse uploads..."

**Three input methods:**

| Method          | How                                           | What happens                                                                                                                                         |
| --------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Paste URL**   | Type/paste a URL directly into the text field | Validates URL, shows thumbnail preview. Works with external URLs (no upload needed).                                                                 |
| **Browse**      | Click the icon button                         | Opens a modal gallery of existing uploads. Thumbnail grid, search by filename, filter by auto-category. Click to select. "Upload new" button at top. |
| **Drag & drop** | Drag a file onto the field                    | File runs through image processor → uploads to R2 → auto-fills the field with CDN URL.                                                               |

**At rest (image selected):** The text field shows the URL. A small thumbnail appears to the left of the field. "Change" and "Remove" (×) buttons replace the browse icon.

**Props for consumer curios:**

- `value: string` — bound URL
- `maxDimension?: number` — override max resize dimension for this context
- `accept?: string[]` — override accepted formats
- `label?: string` — field label ("Badge icon", "Cursor image", etc.)

#### Expanded format support

Accept all formats the image processor can handle. The processor is the gatekeeper — if it can process it, accept it.

| Format        | Support          | Notes                                                             |
| ------------- | ---------------- | ----------------------------------------------------------------- |
| **JPEG**      | Accept           | Most common format people have. Processed as-is or converted.     |
| **PNG**       | Accept           | Lossless, great for icons and pixel art.                          |
| **GIF**       | Accept           | Preserved as-is to maintain animation. Skips processing pipeline. |
| **WebP**      | Accept           | Modern, efficient. Good default output format.                    |
| **JXL**       | Accept           | Cutting-edge compression. Encoded via WASM.                       |
| **AVIF**      | Accept           | Modern format, good compression.                                  |
| **HEIC/HEIF** | Accept + convert | Auto-converted via heic2any WASM decoder. Common from iPhones.    |
| **SVG**       | Reject           | XSS vector. Security decision — not changing this.                |

#### Full processing pipeline

Every upload (except GIF) runs through `imageProcessor.ts`:

1. **Validate**: Magic byte checking via `upload-validation.ts`
2. **Decode**: HEIC → canvas, others → native browser decode
3. **Resize**: Auto-resize to max dimension for tier (see limits below)
4. **Strip EXIF**: Drawing to canvas removes all metadata including GPS
5. **Encode**: Output as WebP (default) or JXL (if supported + owner opts in)
6. **Thumbnail**: Generate 128px WebP thumbnail for picker/admin grid
7. **Upload**: Send processed file + thumbnail to R2
8. **Record**: Create D1 record with dimensions, processed size, format

GIF bypasses steps 2-6 to preserve animation. Stored as-is with a static WebP thumbnail.

#### Tiered limits

| Tier         | Max uploads | Max file size | Max dimension | Max total storage |
| ------------ | ----------- | ------------- | ------------- | ----------------- |
| **Seedling** | 50          | 5 MB          | 512px         | 50 MB             |
| **Sapling**  | 150         | 5 MB          | 1024px        | 250 MB            |
| **Oak+**     | 500         | 10 MB         | 2048px        | 1 GB              |

Quota enforcement happens BEFORE upload (check count + projected size against limits). The admin page shows quota usage with a progress bar.

#### Auto-categorization via periodic scan

No manual tagging or folders. The system figures it out.

**How it works:** A periodic background job (hourly or daily) scans all curio tables for upload URLs matching the tenant's R2 path pattern. For each upload, it records which curios reference it:

| If referenced by...                 | Auto-category |
| ----------------------------------- | ------------- |
| `badges` table                      | badge         |
| `cursors` table                     | cursor        |
| `shrines` table                     | shrine        |
| `bookmarks` cover_url/thumbnail_url | shelf         |
| `cathedral_panels` table            | cathedral     |
| `blogroll_items` table              | blogroll      |
| No references found                 | uncategorized |

An upload can have multiple categories (a single image used as both a badge icon and a shrine decoration).

**In the picker modal:** Filter buttons across the top: All / Badges / Cursors / Shrines / Shelves / Uncategorized. Powered by the auto-categories. Owner never has to think about organizing.

**Usage count:** Updated during the same periodic scan. Count = number of distinct references across all curio tables. Replaces the dead `usage_count` field that was never incremented.

#### R2 cleanup: Inline with fallback queue

When the admin deletes an upload:

1. **D1 record** deleted immediately
2. **R2 objects** (main file + thumbnail) deleted inline in the same request
3. **If R2 delete fails** (timeout, network error): keys are written to a `r2_cleanup_queue` table for background retry
4. **Background sweep** (daily cron): processes queued R2 deletions, retries up to 3 times, then logs permanent failures

This eliminates orphaned R2 objects while handling the reality that R2 operations sometimes fail.

#### Orphan warnings in admin

The admin page shows a section at the bottom: **"Possibly unused uploads"** — uploads where the periodic scan found `usage_count = 0` and the upload is older than 30 days. Not auto-deleted — just surfaced for the owner to review. A "Delete unused" bulk action is available but requires confirmation.

### Component fixes

- [ ] **Build `SmartImageField.svelte`** — reusable across all curio admin pages. Three input methods: paste URL, browse gallery, drag-and-drop. Thumbnail preview when selected.
- [ ] **Build picker modal** — thumbnail grid of existing uploads, search by filename, filter by auto-category, "Upload new" button
- [ ] **Wire imageProcessor.ts** into upload flow — auto-resize, EXIF strip, thumbnail generation, format conversion
- [ ] **Wire upload-validation.ts** — magic byte checking, actionable error messages via `getActionableUploadError()`
- [ ] **Add upload dropzone to admin page** — the admin page currently has no way to upload. Add a dropzone at the top.

### API fixes

- [ ] **Complete the upload flow** — POST endpoint must actually upload to R2 (match existing blog media pipeline), not just create a DB record
- [ ] **R2 inline delete** — DELETE endpoint must delete R2 objects, not just return keys
- [ ] **Fallback cleanup queue** — new `r2_cleanup_queue` table, background sweep job
- [ ] **Periodic scan endpoint** — cron job that scans curio tables, updates auto-categories and usage counts
- [ ] **Tier-aware quota check** — validate against tier limits, not hardcoded 100
- [ ] **Dimension extraction** — populate width/height fields during upload (currently nullable and often null)
- [ ] **Expand MIME types** — add JPEG, JXL, AVIF, HEIC/HEIF to `AllowedMimeType` union

### Admin fixes

- [ ] **Quota display** — show tier-appropriate limits (not hardcoded "100")
- [ ] **Upload dropzone** — drag-and-drop zone at top of admin page
- [ ] **Auto-category filter tabs** — All / Badges / Cursors / Shrines / Shelves / Uncategorized
- [ ] **Orphan warnings section** — "Possibly unused" uploads (0 usage, 30+ days old) with bulk delete option
- [ ] **Thumbnail grid view** — replace the current list view with a visual grid of thumbnails
- [ ] **Storage usage display** — show total R2 storage used vs tier limit

### Migration needs

- [ ] Alter `custom_uploads` table:
  - Add `auto_categories TEXT DEFAULT '[]'` — JSON array of auto-detected categories
  - Add `processed_format TEXT` — output format after processing (webp, jxl, original)
  - Add `original_file_size INTEGER` — size before processing (to show compression savings)
- [ ] New table `r2_cleanup_queue`:
  - `id INTEGER PRIMARY KEY AUTOINCREMENT`
  - `r2_key TEXT NOT NULL`
  - `tenant_id TEXT NOT NULL`
  - `queued_at TEXT NOT NULL DEFAULT (datetime('now'))`
  - `attempts INTEGER DEFAULT 0`
  - `last_attempt_at TEXT`
  - `error TEXT` — last error message
- [ ] Update tier limits in shared lib constants (Seedling: 50, Sapling: 150, Oak+: 500)

### Consumer integration checklist

Every curio admin page that currently has a raw URL input for images needs to be migrated to `SmartImageField`:

- [ ] **Badges** — badge icon URL → SmartImageField
- [ ] **Cursors** — cursor image URL → SmartImageField
- [ ] **Shrines** — shrine images → SmartImageField
- [ ] **Shelves** — cover_url, thumbnail_url → SmartImageField
- [ ] **Blogroll** — favicon overrides, 88×31 button images → SmartImageField
- [ ] **Artifacts** — Cathedral panel backgrounds, custom artifact images → SmartImageField
- [ ] **Clip Art** — (when built) entire upload flow → SmartImageField
