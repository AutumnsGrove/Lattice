---
title: Export V3 — Durable Workflow Export System
description: Cloudflare Workflow-based data export replacing ExportDO and ExportJobV2
category: specs
specCategory: platform-services
icon: package
lastUpdated: '2026-02-22'
aliases: []
date created: Sunday, February 22nd 2026
date modified: Sunday, February 22nd 2026
tags:
  - export
  - cloudflare-workflows
  - data-portability
  - engine
  - amber
type: tech-spec
---

# Export V3: Durable Workflow Export System

```
                    ╭─────────────────────╮
                    │  ┌───┐ ┌───┐ ┌───┐  │
                    │  │ 📝│ │ 📄│ │ 🖼️│  │
                    │  └───┘ └───┘ └───┘  │
                    │    posts  pages  img │
                    ╰──────────┬──────────╯
                               │
                          ─────┼─────
                         ╱     │     ╲
                        ╱      │      ╲
                       ╱   ┌───┴───┐   ╲
                      ╱    │  ZIP  │    ╲
                     ╱     │ ░░░▓▓ │     ╲
                    ╱      └───────┘      ╲
                   ╱                       ╲
                  ·    gather · bundle · go  ·

         Your data, packed up and ready to travel.
```

> _Your data, packed up and ready to travel._

Grove's durable export system, built on Cloudflare Workflows. ExportV3 replaces both the broken ExportDO (engine) and the incomplete ExportJobV2 (Amber) with a single, checkpoint-backed workflow that streams content into ZIP archives, uploads to R2 via multipart, and emails the Wanderer when it's done.

**Public Name:** Export
**Internal Name:** GroveExportWorkflow
**Domain:** Runs within `engine.grove.place` and `amber.grove.place`
**Last Updated:** February 2026

Data portability is a promise. When a Wanderer asks for their data, they should get all of it, reliably, without timeouts or silent failures. ExportV3 treats each export as a durable workflow: every step checkpointed, every failure recoverable, every file streamed instead of buffered in memory.

---

## Overview

### What This Is

ExportV3 is a Cloudflare Workflow that packages a Wanderer's content (blog posts, pages, images, Amber storage files) into a ZIP archive, uploads it to R2, and sends an email when it's ready. It replaces two broken systems with one that actually works.

### What Went Wrong (Why V3 Exists)

Two previous export systems exist. Neither delivers.

**ExportDO (engine) — the Durable Object approach:**

| Problem | Impact |
|---------|--------|
| Route mismatch: arbor calls `/export/start`, DO registers `/start` | Exports never begin. 404 on trigger. |
| 128KB DO storage limit per key | Large images corrupt or silently drop |
| `zipSync()` buffers entire ZIP in memory | Hits 128MB Worker memory ceiling on any real export |
| 15-minute staleness timeout in status endpoint | Legitimate large exports get marked "failed" while still running |
| Cancel sets phase to "failed" but doesn't delete the alarm | DO keeps processing after "cancellation" |
| No cleanup of expired exports in R2 | Dead ZIPs accumulate forever |

**ExportJobV2 (Amber) — the streaming approach:**

| Problem | Impact |
|---------|--------|
| Better architecture (ZipStreamer + multipart R2) | Good bones, wrong execution |
| Main trigger uses `waitUntil()` | Times out on any export over 30 seconds |
| Cron fallback hits `/api/export/process` which doesn't exist on Amber | Cron silently fails, jobs stay "pending" forever |
| Never wired to email notification | Wanderers never know their export finished |

ExportJobV2 had the right idea. ZipStreamer streams files through fflate without buffering the whole ZIP. Multipart R2 upload handles large archives. But `waitUntil()` is not durable execution, and the cron never reaches the right endpoint.

### Goals

- **Durable execution.** Every step checkpointed. Workflow survives Worker restarts, DO evictions, and deploy cycles.
- **Streaming ZIP assembly.** Adopt Amber's ZipStreamer approach. Never buffer the full ZIP in memory.
- **No file limit.** Remove the 100-file cap. Stream files into the archive one at a time.
- **Multipart R2 upload.** Large archives upload in chunks, not a single PUT.
- **Email notification.** Wire up the existing `export-ready` email template through Zephyr.
- **Proper cancellation.** Workflow-level cancellation that actually stops processing.
- **Automatic cleanup.** Expired exports (7 days) get their R2 objects deleted.
- **Unified system.** One workflow handles both blog content exports (engine) and storage file exports (Amber).

### Non-Goals (Out of Scope)

- **Incremental/differential exports.** Every export is a full snapshot.
- **Import system.** Importing from ZIP is a separate feature (future spec).
- **Cross-tenant exports.** Admin bulk export tools are not part of this spec.
- **Real-time progress via WebSocket.** Polling the status endpoint is sufficient.
- **Export scheduling.** Wanderers trigger exports manually. No recurring exports.

---

## Architecture

```
  Wanderer clicks "Export"
         │
         ▼
┌─────────────────────┐         ┌──────────────────────────────────────────┐
│   Arbor Dashboard   │         │         Cloudflare Workflow              │
│   POST /api/export  │────────▶│                                          │
└─────────────────────┘  create │  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
         │                      │  │ Step 1:  │  │ Step 2:  │  │ Step 3:  │  │
         │  poll status         │  │ Query    │─▶│ Fetch    │─▶│ Stream   │  │
         │                      │  │ Content  │  │ Images   │  │ ZIP +    │  │
         ▼                      │  │          │  │ (batches)│  │ Upload   │  │
┌─────────────────────┐         │  └─────────┘  └─────────┘  └────┬────┘  │
│  GET /api/export/   │         │       checkpoint ▲    checkpoint ▲  │     │
│  status/:id         │         │                                    │     │
└─────────────────────┘         │  ┌─────────┐  ┌─────────┐         │     │
                                │  │ Step 5:  │  │ Step 4:  │        │     │
                                │  │ Cleanup  │◀─│ Notify   │◀───────┘     │
                                │  │ (cron)   │  │ (email)  │              │
                                │  └─────────┘  └─────────┘              │
                                └──────────────────────────────────────────┘
                                         │              │
                                         ▼              ▼
                                   ┌──────────┐  ┌──────────┐
                                   │    R2    │  │  Zephyr  │
                                   │ (export  │  │ (email   │
                                   │  bucket) │  │  service) │
                                   └──────────┘  └──────────┘
```

### How It Flows

1. Wanderer clicks "Export My Data" in Arbor. The dashboard POSTs to the engine API.
2. Engine creates a `storage_exports` row in D1 (status: "pending") and dispatches a Cloudflare Workflow.
3. The Workflow runs through durable steps. Each step checkpoints its result. If a Worker restart happens mid-step, the Workflow resumes from the last checkpoint.
4. When the ZIP is uploaded, Zephyr sends the "export ready" email.
5. A cleanup step (or cron-triggered workflow) deletes expired R2 objects after 7 days.

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Orchestration | Cloudflare Workflows | Durable multi-step execution with per-step checkpoints. Survives restarts. |
| ZIP Assembly | fflate `ZipDeflate` via `ZipStreamer` | Streaming compression. Never buffers the full archive. |
| Large Upload | R2 Multipart Upload API | Chunked upload for archives over 50MB. |
| Job Tracking | D1 `storage_exports` table | Existing schema with status, progress, item counts. |
| Email | Zephyr service binding | Existing `export-ready` template. Already built, never wired. |
| File Storage | R2 `EXPORTS_BUCKET` | Signed download URLs with 7-day expiry. |
| Cron Cleanup | Scheduled Worker or Workflow | Deletes expired R2 objects and marks rows as "expired". |

### Two Export Modes

ExportV3 handles two distinct content types through the same workflow:

| Mode | Source | Content | Triggered From |
|------|--------|---------|----------------|
| **Blog Export** | Engine D1 + IMAGES bucket | Posts (markdown), pages (markdown), media files | Arbor dashboard |
| **Storage Export** | Amber R2 bucket | All Amber-managed blobs (uploads, attachments) | Amber storage UI |

The workflow accepts a `mode` parameter ("blog" or "storage") and branches its query step accordingly. Everything after querying (ZIP streaming, upload, notification) is identical.

---

## Workflow Steps

```
  ┌──────────────┐
  │  1. CATALOG   │  Query D1 for content manifest
  │  (checkpoint) │  Output: file list with R2 keys + sizes
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  2. STREAM    │  For each file: fetch from R2 → pipe through
  │  (checkpoint  │  ZipStreamer → pipe to R2 multipart upload
  │   per batch)  │  Batches of 25 files. Checkpoint after each batch.
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  3. FINALIZE  │  Complete multipart upload
  │  (checkpoint) │  Update D1 with r2_key, file_size, item_counts
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  4. NOTIFY    │  Send "export ready" email via Zephyr
  │  (checkpoint) │  Mark D1 row as "complete"
  └──────┬───────┘
         │
         ▼
       done ✓
```

### Step 1: Catalog

Query D1 for all exportable content and build a manifest.

**Blog mode:**
```sql
-- Posts
SELECT id, slug, title, description, markdown_content, tags, status,
       featured_image, published_at, created_at, updated_at
FROM posts WHERE tenant_id = ? ORDER BY created_at DESC;

-- Pages
SELECT id, slug, title, description, markdown_content, type,
       created_at, updated_at
FROM pages WHERE tenant_id = ? ORDER BY display_order ASC;

-- Media (if includeImages = true)
SELECT id, filename, original_name, r2_key, url, size, mime_type,
       alt_text, uploaded_at
FROM media WHERE tenant_id = ? ORDER BY uploaded_at DESC;
```

**Storage mode:**
```sql
SELECT id, filename, original_name, r2_key, size, mime_type, category,
       product, uploaded_at
FROM amber_files WHERE tenant_id = ? ORDER BY uploaded_at DESC;
```

**Checkpoint output:** A manifest object listing every file to include, with R2 keys and declared sizes. Also includes the generated markdown content for posts/pages (already rendered to frontmatter + body strings).

**Why checkpoint here:** If the query succeeds but the Worker restarts before streaming begins, the Workflow skips re-querying and jumps straight to Step 2 with the saved manifest.

**D1 update:** `status = 'cataloging'`, `progress = 5`

### Step 2: Stream + Upload

This is the core step. It does three things simultaneously via piped streams:

1. **Fetch** each file from R2 (images bucket or Amber bucket)
2. **Pipe** through `ZipStreamer` (fflate streaming compression)
3. **Pipe** the ZIP output into an R2 multipart upload

```
R2.get(key) ──ReadableStream──▶ ZipStreamer ──WritableStream──▶ R2 Multipart Upload
                                    │
                                    │ (also adds text files:
                                    │  posts/*.md, pages/*.md,
                                    │  manifest.json, README.md)
```

**Batching:** Files are processed in batches of 25. After each batch, the workflow updates D1 progress and checkpoints the batch index. If the Worker restarts mid-export, the workflow resumes from the last completed batch.

**R2 Multipart Upload lifecycle:**
1. `createMultipartUpload()` at the start of Step 2
2. `uploadPart()` whenever the ZIP stream produces a 50MB chunk
3. Part ETags are collected for the final `completeMultipartUpload()` in Step 3

**Handling the 100-file limit:** The old `ZIP_CONFIG.CHUNK_FILE_LIMIT = 100` is removed. ZipStreamer processes files one at a time via streaming. Memory usage stays constant regardless of file count.

**Checkpoint per batch:** `{ batchIndex, uploadId, partETags[], totalBytesWritten }`

**D1 update:** `status = 'assembling'`, `progress = 10..85` (scaled by batch completion)

### Step 3: Finalize

Complete the multipart upload and record the result.

```typescript
await EXPORTS_BUCKET.completeMultipartUpload(r2Key, uploadId, parts);
```

**D1 update:**
```sql
UPDATE storage_exports
SET status = 'uploading', r2_key = ?, file_size_bytes = ?,
    item_counts = ?, progress = 90, updated_at = ?
WHERE id = ?;
```

**Checkpoint output:** `{ r2Key, fileSizeBytes, itemCounts }`

### Step 4: Notify

Send the "export ready" email through Zephyr using the existing template.

```typescript
const email = getExportReadyEmail({
  name: params.username,
  downloadUrl: `https://grove.place/arbor/export`,
  itemCounts: { posts, pages, images },
  fileSize: formatBytes(fileSizeBytes),
  expiresAt: formatDate(expiresAt),
});

await ZEPHYR.fetch('/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
  body: JSON.stringify({
    type: 'transactional',
    template: 'raw',
    to: userEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  }),
});
```

**D1 update:** `status = 'complete'`, `progress = 100`, `completed_at = now`

**If email fails:** Log the error, still mark export as complete. The Wanderer can download from the dashboard regardless. Email is a courtesy, not a gate.

---

## API Reference

### Endpoint: POST /api/export

Trigger a new export. Requires authentication.

**Request:**
```json
{
  "mode": "blog",
  "includeImages": true,
  "deliveryMethod": "email"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | `"blog" \| "storage"` | `"blog"` | What to export |
| `includeImages` | `boolean` | `true` | Include media files (blog mode only) |
| `deliveryMethod` | `"email" \| "download"` | `"email"` | How to notify when done |

**Response (201):**
```json
{
  "success": true,
  "exportId": "exp_abc123",
  "status": "pending",
  "message": "Export started. You'll receive an email when it's ready."
}
```

**Errors:**

| Code | Status | Meaning |
|------|--------|---------|
| `GROVE-EXPORT-001` | 401 | Not authenticated |
| `GROVE-EXPORT-002` | 409 | Export already in progress for this tenant |
| `GROVE-EXPORT-003` | 429 | Rate limited (max 1 export per hour) |

**Rate limiting:** One active export per tenant. One new export per hour. This prevents abuse and keeps R2 costs predictable.

### Endpoint: GET /api/export/status/:exportId

Poll export progress. Requires authentication. Tenant-scoped.

**Response (200):**
```json
{
  "exportId": "exp_abc123",
  "status": "assembling",
  "progress": 45,
  "itemCounts": { "posts": 12, "pages": 3, "images": 87 },
  "createdAt": "2026-02-22T10:30:00Z"
}
```

When complete:
```json
{
  "exportId": "exp_abc123",
  "status": "complete",
  "progress": 100,
  "downloadUrl": "https://exports.grove.place/signed-url...",
  "fileSize": "24.5 MB",
  "itemCounts": { "posts": 12, "pages": 3, "images": 87 },
  "expiresAt": "2026-03-01T10:30:00Z"
}
```

The `downloadUrl` is a time-limited signed R2 URL (valid for 1 hour, regenerated on each status poll while the export hasn't expired).

### Endpoint: POST /api/export/cancel/:exportId

Cancel a running export. Requires authentication. Tenant-scoped.

**Response (200):**
```json
{
  "success": true,
  "message": "Export cancelled."
}
```

**What happens:** The workflow is terminated via `workflow.abort()`. The D1 row is updated to `status = 'cancelled'`. Any partial multipart upload is aborted. No R2 garbage left behind.

### Endpoint: GET /api/export/history

List past exports for the tenant. Returns most recent 10.

**Response (200):**
```json
{
  "exports": [
    {
      "exportId": "exp_abc123",
      "status": "complete",
      "mode": "blog",
      "fileSize": "24.5 MB",
      "createdAt": "2026-02-22T10:30:00Z",
      "expiresAt": "2026-03-01T10:30:00Z"
    }
  ]
}
```

---

## Data Schema

### Existing: `storage_exports` (D1)

The existing table from migration 054 is reused with one new column (`mode`):

```sql
-- Migration: 0XX_export_v3_mode.sql
ALTER TABLE storage_exports ADD COLUMN mode TEXT NOT NULL DEFAULT 'blog';
ALTER TABLE storage_exports ADD COLUMN workflow_id TEXT;
```

Full schema after migration:

```sql
CREATE TABLE storage_exports (
  id TEXT PRIMARY KEY,              -- export ID (exp_xxx)
  tenant_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'blog', -- NEW: 'blog' or 'storage'
  include_images INTEGER NOT NULL DEFAULT 1,
  delivery_method TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  r2_key TEXT,
  file_size_bytes INTEGER,
  item_counts TEXT,                  -- JSON: { posts, pages, images } or { files }
  error_message TEXT,
  workflow_id TEXT,                  -- NEW: CF Workflow instance ID
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  completed_at INTEGER,
  expires_at INTEGER,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_exports_tenant ON storage_exports(tenant_id, status);
CREATE INDEX idx_exports_expiry ON storage_exports(status, expires_at);
```

### Status Values

```
pending → cataloging → assembling → uploading → complete
                                              → failed
                                              → cancelled
                                              → expired (set by cleanup)
```

### R2 Key Format

```
exports/{tenant_id}/{export_id}/grove-export-{username}-{YYYY-MM-DD}.zip
```

Example: `exports/tenant_abc/exp_123/grove-export-autumn-2026-02-22.zip`

### Workflow Parameters

The Cloudflare Workflow receives these parameters when created:

```typescript
interface ExportWorkflowParams {
  exportId: string;
  tenantId: string;
  userEmail: string;
  username: string;
  mode: 'blog' | 'storage';
  includeImages: boolean;   // blog mode only
  deliveryMethod: 'email' | 'download';
}
```

### Workflow Definition (wrangler.toml)

```toml
[[workflows]]
name = "export-workflow"
binding = "EXPORT_WORKFLOW"
class_name = "ExportWorkflow"
```

```typescript
// src/workflows/ExportWorkflow.ts
import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from 'cloudflare:workers';

export class ExportWorkflow extends WorkflowEntrypoint<Env, ExportWorkflowParams> {
  async run(event: WorkflowEvent<ExportWorkflowParams>, step: WorkflowStep) {
    const params = event.payload;

    // Step 1: Catalog content
    const manifest = await step.do('catalog', async () => {
      return await this.catalogContent(params);
    });

    // Step 2: Stream ZIP + multipart upload (batched)
    const uploadResult = await this.streamAndUpload(params, manifest, step);

    // Step 3: Finalize multipart upload
    const finalResult = await step.do('finalize', async () => {
      return await this.finalizeUpload(params, uploadResult);
    });

    // Step 4: Send notification email
    await step.do('notify', async () => {
      await this.sendNotification(params, finalResult);
    });
  }
}
```

The `streamAndUpload` method uses `step.do()` per batch:

```typescript
async streamAndUpload(
  params: ExportWorkflowParams,
  manifest: ExportManifest,
  step: WorkflowStep
): Promise<UploadResult> {
  // Initialize multipart upload
  const { uploadId } = await step.do('init-upload', async () => {
    const r2Key = buildR2Key(params);
    const upload = await this.env.EXPORTS_BUCKET.createMultipartUpload(r2Key);
    return { uploadId: upload.uploadId, r2Key };
  });

  // Process files in batches of 25
  const batches = chunk(manifest.files, 25);
  let parts: R2UploadedPart[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batchResult = await step.do(`batch-${i}`, async () => {
      return await this.processBatch(batches[i], uploadId);
    });
    parts.push(...batchResult.parts);

    // Update D1 progress
    await step.do(`progress-${i}`, async () => {
      const progress = Math.floor(10 + (i / batches.length) * 75);
      await this.updateProgress(params.exportId, 'assembling', progress);
    });
  }

  return { uploadId, parts, r2Key };
}
```

---

## Cancellation

When a Wanderer cancels, three things must happen:

1. **Abort the Workflow.** Call `workflow.abort()` via the Workflows API. This terminates the run and prevents any further `step.do()` from executing.
2. **Abort the multipart upload.** If a multipart upload is in progress, call `abortMultipartUpload()` to clean up partial parts in R2. The `uploadId` is stored in D1 (or retrieved from workflow state) so the cancel endpoint can find it.
3. **Update D1.** Set `status = 'cancelled'`, clear any stale progress.

```typescript
// In the API cancel handler:
const workflow = await env.EXPORT_WORKFLOW.get(workflowId);
await workflow.abort();

// Cleanup partial multipart upload if present
if (uploadId) {
  const upload = env.EXPORTS_BUCKET.resumeMultipartUpload(r2Key, uploadId);
  await upload.abort();
}

await db.prepare(
  'UPDATE storage_exports SET status = ?, updated_at = ? WHERE id = ?'
).bind('cancelled', now, exportId).run();
```

---

## Expired Export Cleanup

Exports expire after 7 days. A scheduled worker runs daily to clean up.

```
  Cron: 0 3 * * *  (3 AM UTC daily)
         │
         ▼
  Query D1 for exports where:
    status = 'complete' AND expires_at < now
         │
         ▼
  For each expired export:
    1. Delete R2 object (EXPORTS_BUCKET.delete(r2_key))
    2. Update D1: status = 'expired', r2_key = NULL
         │
         ▼
  Log cleanup summary
```

```sql
SELECT id, r2_key FROM storage_exports
WHERE status = 'complete' AND expires_at < ?
LIMIT 50;
```

Process in batches of 50. The cron has a 30-second CPU limit, so batching keeps each run fast.

---

## Security Considerations

- **Tenant isolation.** Every D1 query includes `WHERE tenant_id = ?`. The workflow receives `tenantId` from the authenticated API handler. The workflow itself never trusts client input for tenant identity.
- **Path traversal in ZIP.** Filenames in the ZIP are sanitized. Usernames in R2 keys are sanitized via `sanitizeForPath()` (alphanumeric, dash, underscore only).
- **Signed download URLs.** R2 presigned URLs expire after 1 hour. Regenerated on each status poll. The Wanderer must be authenticated to poll.
- **Rate limiting.** One active export per tenant. One new export per hour. Prevents storage abuse and runaway costs.
- **No secrets in workflow params.** API keys for Zephyr come from env bindings, not workflow parameters. Workflow params are logged and debuggable.
- **Email goes to authenticated user only.** The `userEmail` comes from the session, not from the request body. A Wanderer cannot trigger export emails to arbitrary addresses.
- **YAML injection in frontmatter.** Post titles and descriptions are escaped before embedding in YAML frontmatter (quotes, backslashes, newlines). Already handled by `escapeYamlString()`.

---

## Requirements

| ID | Pattern | Requirement | Priority |
|----|---------|-------------|----------|
| REQ-001 | Ubiquitous | The system shall stream ZIP content without buffering the full archive in memory | Must Have |
| REQ-002 | Event-Driven | When a Wanderer triggers an export, the system shall create a Workflow instance within 2 seconds | Must Have |
| REQ-003 | Event-Driven | When the ZIP upload completes, the system shall send an email notification via Zephyr | Should Have |
| REQ-004 | Unwanted | If a workflow step fails, the system shall retry up to 3 times before marking the export as failed | Must Have |
| REQ-005 | Unwanted | If the Worker restarts mid-export, the Workflow shall resume from the last checkpoint | Must Have |
| REQ-006 | State-Driven | While an export is in progress for a tenant, the system shall reject new export requests with 409 | Must Have |
| REQ-007 | Event-Driven | When a Wanderer cancels, the system shall abort the Workflow and clean up partial R2 uploads | Must Have |
| REQ-008 | Event-Driven | When an export reaches 7 days old, the cleanup cron shall delete its R2 object | Should Have |
| REQ-009 | Ubiquitous | The system shall support both blog content and Amber storage exports through one Workflow | Must Have |
| REQ-010 | Optional | Where images are excluded, the system shall skip media fetching and produce a text-only ZIP | Could Have |

---

## Migration Plan

### What Gets Replaced

| Old System | Location | Action |
|-----------|----------|--------|
| `ExportDO` | `services/durable-objects/src/ExportDO.ts` | Remove after V3 ships |
| `ExportJobV2` routes | `services/amber/src/routes/export.ts` | Remove after V3 ships |
| `exportJobV2` service | `services/amber/src/services/exportJobV2.ts` | Remove after V3 ships |
| Engine export routes | `apps/engine/src/routes/api/export/` | Replace with V3 endpoints |

### What Gets Kept

| Component | Location | Reason |
|-----------|----------|--------|
| `ZipStreamer` | `services/amber/src/services/zipStream.ts` | Core streaming logic. Move to shared lib. |
| `getExportReadyEmail` | `libs/engine/src/lib/email/templates/export-ready.ts` | Email template. Wire to V3 notify step. |
| `storage_exports` table | D1 migrations 054 + 056 | Reused with new `mode` + `workflow_id` columns. |
| Arbor export UI | `apps/arbor/src/routes/export/` | Update to call V3 endpoints. |

### Rollout Strategy

1. **Phase A:** Ship ExportWorkflow alongside old systems. Feature-flag `export_v3` in grafts table. New exports go through V3 when the flag is on.
2. **Phase B:** Monitor for 1 week. Compare completion rates, timing, error rates.
3. **Phase C:** Remove feature flag, delete ExportDO and ExportJobV2 code. Remove DO binding from wrangler.toml.

---

## Comparison: V1 vs V2 vs V3

| | ExportDO (V1) | ExportJobV2 (V2) | ExportWorkflow (V3) |
|---|---|---|---|
| **Execution** | DO alarms (fragile) | waitUntil (times out) | CF Workflow (durable) |
| **ZIP method** | zipSync (in-memory) | ZipStreamer (streaming) | ZipStreamer (streaming) |
| **Upload** | Single R2 PUT | R2 multipart | R2 multipart |
| **File limit** | ~50 (memory ceiling) | 100 (hardcoded) | Unlimited (streaming) |
| **Checkpointing** | DO storage (128KB limit) | None | Per-step workflow checkpoints |
| **Cancellation** | Broken (alarm continues) | Not implemented | workflow.abort() |
| **Email** | Inline HTML builder | Not wired | getExportReadyEmail via Zephyr |
| **Cleanup** | None | None | Cron deletes expired R2 objects |
| **Recovery** | Manual (staleness timeout) | None (stuck forever) | Automatic (workflow retry) |

---

## Implementation Checklist

### Infrastructure

- [ ] Add `[[workflows]]` binding to engine `wrangler.toml`
- [ ] D1 migration: add `mode` and `workflow_id` columns to `storage_exports`
- [ ] Move `ZipStreamer` from `services/amber/` to `libs/engine/` (shared)
- [ ] Add `EXPORT_WORKFLOW` binding to env types

### Workflow

- [ ] Create `ExportWorkflow` class extending `WorkflowEntrypoint`
- [ ] Implement Step 1: Catalog (blog mode D1 queries)
- [ ] Implement Step 1: Catalog (storage mode Amber queries)
- [ ] Implement Step 2: Stream + Upload with batched `step.do()` calls
- [ ] Implement Step 3: Finalize multipart upload
- [ ] Implement Step 4: Notify via Zephyr with existing email template
- [ ] Add retry configuration per step (max 3 retries)

### API Endpoints

- [ ] `POST /api/export` — create workflow, insert D1 row
- [ ] `GET /api/export/status/:id` — poll progress, generate signed URL
- [ ] `POST /api/export/cancel/:id` — abort workflow, cleanup R2
- [ ] `GET /api/export/history` — list tenant exports
- [ ] Rate limiting: 1 active per tenant, 1 new per hour

### Cleanup

- [ ] Cron handler: query expired exports, delete R2 objects, update D1
- [ ] Add cron trigger to `wrangler.toml`

### Frontend (Arbor)

- [ ] Update export page to call V3 endpoints
- [ ] Add mode selector (blog vs storage) if Amber is enabled for tenant
- [ ] Progress polling with status display
- [ ] Cancel button that calls cancel endpoint
- [ ] Export history list

### Migration

- [ ] Feature flag `export_v3` in grafts table
- [ ] Dual-path: old code behind `!export_v3`, new code behind `export_v3`
- [ ] After validation: remove ExportDO, ExportJobV2, feature flag

### Testing

- [ ] Unit tests for ZipStreamer with multipart upload piping
- [ ] Integration test: blog export end-to-end (miniflare)
- [ ] Integration test: storage export end-to-end
- [ ] Test cancellation mid-workflow
- [ ] Test cleanup cron with expired exports
- [ ] Load test: export with 500+ images

---

## Related Specs

- [Amber — Storage Management](./amber-spec.md)
- [Patina — Automated Backups](./patina-spec.md)
- [Ivy — Email Service](./ivy-mail-spec.md)

---

*This is your data. You own it. Always have, always will.*

