# Amber ZIP Export Integration Plan

> **Status:** Ready for Implementation
> **Priority:** Medium — Post-launch feature enhancement
> **Estimated Effort:** 8-12 hours
> **Prerequisites:** None (can be implemented independently)
> **Blocks:** Proper data export for GDPR compliance, user data portability

---

## Overview

Integrate Amber's ZIP export system into Lattice so Grove users get proper ZIP exports (with markdown files, media, and manifest) instead of the current JSON export.

### Current State

- `POST /api/export` returns immediate JSON download
- No async processing (times out on large exports)
- No media files included (just URLs)
- No markdown files (raw JSON data)

### Target State

- Async export with polling for status
- Streaming ZIP creation via Durable Objects
- Posts as `.md` files with YAML frontmatter
- Actual media files streamed from R2
- `manifest.json` with complete metadata
- `README.txt` with extraction instructions

---

## Architecture Decision

**Recommended: Option B — Port to Engine**

Copy Amber's export utilities directly into Lattice rather than using service bindings.

**Rationale:**

- Lattice already has its own R2 bucket and storage patterns
- Avoids cross-service complexity and additional wrangler configuration
- Amber's export system is self-contained (~400 lines of core code)
- No dependency on Amber being deployed or maintained
- Simpler for Grove's single-tenant-per-request architecture

**Files to port:**

- `ExportJobV2.ts` → `libs/engine/src/lib/server/services/export/ExportJob.ts`
- `zipStream.ts` → `libs/engine/src/lib/server/services/export/zipStream.ts`

---

## Database Schema

### Migration: `XXX_tenant_exports.sql`

```sql
-- Tenant export jobs tracking
CREATE TABLE IF NOT EXISTS tenant_exports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  export_type TEXT NOT NULL CHECK (export_type IN ('full', 'posts', 'media', 'pages')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  filter_params TEXT,                    -- JSON filters (e.g., {"tag": "recipes"})
  r2_key TEXT,                           -- Path to ZIP in R2 (set on completion)
  size_bytes INTEGER,                    -- Final ZIP file size
  file_count INTEGER,                    -- Number of files in ZIP
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  expires_at TEXT,                       -- Now + 7 days on completion
  error_message TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_tenant_exports_tenant ON tenant_exports(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_exports_expiry ON tenant_exports(status, expires_at);
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (3-4 hours)

#### 1.1 Create Export Service Module

**Location:** `libs/engine/src/lib/server/services/export/`

```
export/
├── index.ts           # Public exports
├── ExportJob.ts       # Durable Object (adapted from Amber)
├── zipStream.ts       # ZIP streaming utility (from Amber)
├── types.ts           # TypeScript interfaces
└── constants.ts       # Configuration constants
```

#### 1.2 Adapt ExportJob Durable Object

Key adaptations from Amber's `ExportJobV2.ts`:

1. **Query Lattice's schema** (not Amber's `storage_files`):

   ```typescript
   // Posts query
   SELECT id, slug, title, content, excerpt, published_at, tags, status
   FROM posts
   WHERE tenant_id = ? AND status = 'published' AND deleted_at IS NULL

   // Media query
   SELECT id, blob_key, filename, mime_type, size_bytes
   FROM image_hashes
   WHERE tenant_id = ?

   // Pages query
   SELECT id, slug, title, content, hero_title, hero_subtitle
   FROM pages
   WHERE tenant_id = ? AND deleted_at IS NULL
   ```

2. **Use Lattice's R2 bucket binding** (`R2_BUCKET` or `MEDIA_BUCKET`)

3. **Integrate with Lattice's auth pattern** (tenant from locals, not user session)

#### 1.3 Port zipStream.ts

Direct port with minimal changes:

- Add `fflate` dependency to engine package
- Keep `COMPRESSION_LEVEL: 0` for Worker CPU limits
- Keep 5MB multipart upload chunking

#### 1.4 Add Dependencies

```bash
cd packages/engine
pnpm add fflate
```

---

### Phase 2: API Routes (2-3 hours)

#### 2.1 Start Export

**Route:** `libs/engine/src/routes/api/export/+server.ts`

```typescript
// POST /api/export
// Body: { type: 'full' | 'posts' | 'media' | 'pages', filters?: { tag?: string } }
// Response: { export_id, status: 'pending', message: '...' } (202 Accepted)

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const tenantId = locals.tenantId;
	if (!tenantId) return error(401, "Unauthorized");

	const { type, filters } = await request.json();

	// Check for existing in-progress export
	const existing = await platform.env.DB.prepare(
		`
    SELECT id FROM tenant_exports
    WHERE tenant_id = ? AND status IN ('pending', 'processing')
  `,
	)
		.bind(tenantId)
		.first();

	if (existing) {
		return error(409, "An export is already in progress");
	}

	// Create export record
	const exportId = crypto.randomUUID();
	await platform.env.DB.prepare(
		`
    INSERT INTO tenant_exports (id, tenant_id, export_type, filter_params)
    VALUES (?, ?, ?, ?)
  `,
	)
		.bind(exportId, tenantId, type, JSON.stringify(filters || {}))
		.run();

	// Trigger Durable Object (fire-and-forget)
	const doId = platform.env.EXPORT_JOBS.idFromName(exportId);
	const doStub = platform.env.EXPORT_JOBS.get(doId);
	platform.context.waitUntil(
		doStub.fetch(
			new Request(`https://internal/?action=start&exportId=${exportId}&tenantId=${tenantId}`),
		),
	);

	return json({ export_id: exportId, status: "pending" }, { status: 202 });
};
```

#### 2.2 Poll Status

**Route:** `libs/engine/src/routes/api/export/[id]/+server.ts`

```typescript
// GET /api/export/:id
// Response: { id, status, r2_key?, size_bytes?, file_count?, error_message?, ... }

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	const tenantId = locals.tenantId;
	const exportId = params.id;

	const record = await platform.env.DB.prepare(
		`
    SELECT * FROM tenant_exports WHERE id = ? AND tenant_id = ?
  `,
	)
		.bind(exportId, tenantId)
		.first();

	if (!record) return error(404, "Export not found");

	return json(record);
};
```

#### 2.3 Get Download URL

**Route:** `libs/engine/src/routes/api/export/[id]/download/+server.ts`

```typescript
// GET /api/export/:id/download
// Response: { download_url, expires_at, size_bytes, file_count }

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	const record = await platform.env.DB.prepare(
		`
    SELECT * FROM tenant_exports WHERE id = ? AND tenant_id = ?
  `,
	)
		.bind(params.id, locals.tenantId)
		.first();

	if (!record) return error(404, "Export not found");
	if (record.status !== "completed") return error(400, "Export not ready");
	if (new Date(record.expires_at) < new Date()) return error(410, "Export expired");

	return json({
		download_url: `/api/export/download/${encodeURIComponent(record.r2_key)}`,
		expires_at: record.expires_at,
		size_bytes: record.size_bytes,
		file_count: record.file_count,
	});
};
```

#### 2.4 Stream Download

**Route:** `libs/engine/src/routes/api/export/download/[...key]/+server.ts`

```typescript
// GET /api/export/download/:key
// Response: Binary ZIP stream

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	const r2Key = decodeURIComponent(params.key);

	// Verify ownership via key pattern (exports/{tenantId}/...)
	if (!r2Key.startsWith(`exports/${locals.tenantId}/`)) {
		return error(403, "Forbidden");
	}

	const object = await platform.env.R2_BUCKET.get(r2Key);
	if (!object) return error(404, "File not found");

	const filename = r2Key.split("/").pop() || "export.zip";

	return new Response(object.body, {
		headers: {
			"Content-Type": "application/zip",
			"Content-Disposition": `attachment; filename="${filename}"`,
			"Content-Length": object.size.toString(),
		},
	});
};
```

---

### Phase 3: Content Formatting (2-3 hours)

#### 3.1 Post to Markdown Conversion

```typescript
function postToMarkdown(post: Post): string {
	const frontmatter = {
		title: post.title,
		slug: post.slug,
		date: post.published_at,
		tags: JSON.parse(post.tags || "[]"),
		status: post.status,
		excerpt: post.excerpt,
	};

	return `---
${Object.entries(frontmatter)
	.filter(([_, v]) => v != null)
	.map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : JSON.stringify(v)}`)
	.join("\n")}
---

${post.content}
`;
}
```

#### 3.2 ZIP Structure

```
grove-export-{username}-{date}.zip
├── manifest.json           # Complete file metadata
├── README.txt              # User-friendly instructions
├── posts/
│   ├── 2026-01-15-my-first-post.md
│   ├── 2026-01-10-another-post.md
│   └── ...
├── pages/
│   ├── about.md
│   ├── contact.md
│   └── ...
└── media/
    ├── sunset.jpg
    ├── profile.png
    └── ...
```

#### 3.3 Manifest Format

```json
{
	"version": "1.0",
	"exported_at": "2026-01-16T12:00:00.000Z",
	"tenant": {
		"id": "tenant-uuid",
		"subdomain": "username"
	},
	"summary": {
		"total_files": 42,
		"total_size_bytes": 15728640,
		"posts": 25,
		"pages": 5,
		"media": 12
	},
	"files": [
		{
			"path": "posts/2026-01-15-my-first-post.md",
			"type": "post",
			"size_bytes": 2048,
			"original_id": "post-uuid"
		}
	]
}
```

#### 3.4 README Content

```text
Grove Export - {subdomain}.grove.place
======================================

Exported: {date}
Total files: {count}
Total size: {size}

Contents
--------
- posts/     Your blog posts as Markdown files with YAML frontmatter
- pages/     Your custom pages as Markdown files
- media/     Your uploaded images and files
- manifest.json  Complete metadata for all exported content

Importing to Another Platform
-----------------------------
Most blogging platforms support Markdown import. The YAML frontmatter
contains metadata like title, date, and tags that many platforms can parse.

Questions?
----------
Visit https://grove.place/knowledge/exporting-your-content for help.
```

---

### Phase 4: Frontend Updates (1-2 hours)

#### 4.1 Update DataExportCard.svelte

**Location:** `libs/engine/src/routes/admin/account/DataExportCard.svelte`

Replace immediate download with async flow:

```svelte
<script lang="ts">
	let exportStatus: "idle" | "pending" | "processing" | "completed" | "failed" = "idle";
	let exportId: string | null = null;
	let pollInterval: number | null = null;
	let exportData: { size_bytes?: number; file_count?: number; download_url?: string } = {};

	async function startExport(type: string) {
		exportStatus = "pending";
		const res = await fetch("/api/export", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ type }),
		});
		const data = await res.json();
		exportId = data.export_id;
		pollInterval = setInterval(pollStatus, 3000);
	}

	async function pollStatus() {
		const res = await fetch(`/api/export/${exportId}`);
		const data = await res.json();
		exportStatus = data.status;

		if (data.status === "completed") {
			clearInterval(pollInterval!);
			const dlRes = await fetch(`/api/export/${exportId}/download`);
			exportData = await dlRes.json();
		} else if (data.status === "failed") {
			clearInterval(pollInterval!);
		}
	}
</script>

{#if exportStatus === "idle"}
	<GlassButton on:click={() => startExport("full")}>Export All Data</GlassButton>
{:else if exportStatus === "pending" || exportStatus === "processing"}
	<div class="flex items-center gap-2">
		<Loader2 class="animate-spin" />
		<span>Preparing your export...</span>
	</div>
{:else if exportStatus === "completed"}
	<div class="space-y-2">
		<p class="text-green-600">
			Export ready! {exportData.file_count} files, {formatBytes(exportData.size_bytes)}
		</p>
		<GlassButton href={exportData.download_url} download>Download ZIP</GlassButton>
	</div>
{:else if exportStatus === "failed"}
	<p class="text-red-600">Export failed. Please try again.</p>
{/if}
```

---

### Phase 5: Cron Jobs & Cleanup (1 hour)

#### 5.1 Add to wrangler.toml

```toml
[triggers]
crons = [
  "*/5 * * * *",  # Process pending exports every 5 minutes
  "0 3 * * *"     # Clean up expired exports daily at 3 AM UTC
]
```

#### 5.2 Cron Handlers

```typescript
// In worker entry point or scheduled handler

async function processPendingExports(env: Env) {
	const pending = await env.DB.prepare(
		`
    SELECT id, tenant_id FROM tenant_exports
    WHERE status = 'pending'
       OR (status = 'processing' AND r2_key IS NULL
           AND created_at < datetime('now', '-2 minutes'))
    LIMIT 5
  `,
	).all();

	for (const exp of pending.results) {
		const doId = env.EXPORT_JOBS.idFromName(exp.id);
		const doStub = env.EXPORT_JOBS.get(doId);
		await doStub.fetch(
			new Request(
				`https://internal/?action=process-sync&exportId=${exp.id}&tenantId=${exp.tenant_id}`,
			),
		);
	}
}

async function deleteExpiredExports(env: Env) {
	const expired = await env.DB.prepare(
		`
    SELECT id, r2_key FROM tenant_exports
    WHERE status = 'completed' AND expires_at < datetime('now')
    LIMIT 50
  `,
	).all();

	for (const exp of expired.results) {
		if (exp.r2_key) {
			await env.R2_BUCKET.delete(exp.r2_key);
		}
		await env.DB.prepare("DELETE FROM tenant_exports WHERE id = ?").bind(exp.id).run();
	}
}
```

---

### Phase 6: Testing (1-2 hours)

#### Test Cases

| Test                  | Description                    | Expected                             |
| --------------------- | ------------------------------ | ------------------------------------ |
| Small export          | Export with <10 posts, 0 media | Completes in <30s                    |
| Medium export         | 50 posts, 20 images            | Completes with chunking              |
| Large export          | 500 posts, 100 images          | Chunked processing, multipart upload |
| Concurrent prevention | Start export while one running | 409 Conflict                         |
| Missing media         | Post references deleted image  | Export continues, file skipped       |
| Expiration            | Download after 7 days          | 410 Gone                             |
| Cancel/retry          | Export fails, user retries     | New export starts                    |

#### Manual Testing Steps

1. Create test tenant with ~20 posts and ~10 images
2. Trigger export via admin panel
3. Verify polling shows progress
4. Download ZIP and inspect:
   - Posts are valid markdown with frontmatter
   - Images are actual files (not URLs)
   - manifest.json is accurate
   - README.txt is readable
5. Wait 7+ days (or manually expire), verify 410 response

---

### Phase 7: Documentation Updates (30 min)

#### Files to Update

1. **`docs/help-center/articles/exporting-your-content.md`**
   - Replace JSON export instructions with ZIP format
   - Add "What's in the export" section
   - Add import guides for other platforms

2. **`docs/help-center/articles/data-portability.md`**
   - Remove "What's coming" section
   - Document the actual ZIP structure
   - Add manifest.json documentation

3. **Knowledge base registration** in `landing/src/lib/data/knowledge-base.ts`

---

## Wrangler Configuration

Add to `libs/engine/wrangler.toml`:

```toml
# Durable Objects
[[durable_objects.bindings]]
name = "EXPORT_JOBS"
class_name = "ExportJobDO"

[[migrations]]
tag = "v1"
new_classes = ["ExportJobDO"]

# Cron triggers (if not already present)
[triggers]
crons = ["*/5 * * * *", "0 3 * * *"]
```

---

## Key Code Patterns from Amber

### Chunked Processing (avoids Worker timeout)

```typescript
const CHUNK_FILE_LIMIT = 100;
const CHUNK_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

async alarm() {
  const hasMore = await this.processChunk();
  if (hasMore) {
    // Schedule next chunk in 2 seconds
    await this.state.storage.setAlarm(Date.now() + 2000);
  } else {
    await this.finalizeExport();
  }
}
```

### Streaming ZIP (no memory buffering)

```typescript
const ZIP_CONFIG = {
	COMPRESSION_LEVEL: 0, // Store only, no compression (Worker CPU limits)
};

// Stream directly from R2 to ZIP output
await zipStreamer.addFile({
	filename: path,
	data: r2Object.body, // ReadableStream, not buffer
	size: file.size_bytes,
});
```

### Multipart Upload (for large ZIPs)

```typescript
const MIN_PART_SIZE = 5 * 1024 * 1024; // 5MB minimum for R2

// Buffer chunks until >= 5MB, then upload part
if (currentSize >= MIN_PART_SIZE) {
	const part = await multipartUpload.uploadPart(partNumber++, combined);
	uploadedParts.push({ partNumber, etag: part.etag });
}
```

---

## Success Criteria

- [ ] Users can export all data as ZIP from admin panel
- [ ] Posts exported as valid Markdown with YAML frontmatter
- [ ] Media files included (actual files, not URLs)
- [ ] Export completes within 5 minutes for typical blog (100 posts)
- [ ] Expired exports cleaned up automatically
- [ ] No data loss on large exports (500+ posts)
- [ ] Clear error messages on failure

---

## Dependencies

**npm packages:**

- `fflate` (^0.8.1) — ZIP compression library

**Cloudflare bindings:**

- `EXPORT_JOBS` — Durable Object namespace
- `R2_BUCKET` — Existing R2 bucket for media
- `DB` — Existing D1 database

---

## Rollback Plan

If issues arise post-deployment:

1. Keep existing JSON export endpoint as fallback (`/api/export/json`)
2. Feature flag to disable ZIP export: `FEATURE_ZIP_EXPORT=false`
3. Durable Object can be deleted/recreated without data loss (D1 is source of truth)

---

_Created: 2026-01-16_
_Based on: Amber export system analysis_
