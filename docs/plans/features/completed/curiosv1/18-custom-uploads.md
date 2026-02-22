# Curio: Custom Uploads

> *Make it truly yours.*

**Priority:** Tier 4 — Build As Needed By Dependents
**Complexity:** Medium
**Category:** Media
**Placement:** N/A (infrastructure curio — provides images to other curios)

---

## What

Upload your own images to use as cursor art, shrine contents, clip art, badge icons, etc. This is the infrastructure curio — it enables customization in every other curio that supports user-provided images.

## Why

Several curios support custom images (cursors, shrines, clip art, badges). Rather than each one implementing its own upload flow, Custom Uploads provides a shared image management system. Build this when the first curio that needs custom images is ready.

---

## Database Schema

### Migration: `{next}_customupload_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS custom_uploads (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  cdn_url TEXT NOT NULL,
  thumbnail_url TEXT DEFAULT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER DEFAULT NULL,
  height INTEGER DEFAULT NULL,
  content_type TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_custom_uploads_tenant ON custom_uploads(tenant_id);
```

---

## Components

| Component | Purpose |
|-----------|---------|
| `UploadManager.svelte` | Admin: upload, browse, delete images |
| `UploadDropzone.svelte` | Drag-and-drop upload area |
| `ImagePicker.svelte` | Select from uploads (used by other curios) |
| `QuotaBar.svelte` | Visual storage quota indicator |

---

## API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `POST` | `/api/curios/uploads` | Upload file (multipart) | Admin |
| `GET` | `/api/curios/uploads` | List uploads (paginated) | Admin |
| `DELETE` | `/api/curios/uploads/[id]` | Delete upload | Admin |
| `GET` | `/api/curios/uploads/quota` | Check storage usage | Admin |

---

## Key Implementation Details

- **R2 storage:** `curios/{tenant_id}/uploads/{id}.{ext}`
- **Auto-resize:** Max 512x512 on upload (Workers image processing)
- **Auto-convert:** WebP for storage efficiency
- **Thumbnails:** 128x128 auto-generated
- **Formats:** PNG, GIF, WEBP, SVG (SVG sanitized server-side)
- **Quota enforcement:** Checked BEFORE upload, not after
- **Usage tracking:** `usage_count` incremented when other curios reference an upload
- **Orphan cleanup:** Warn about unused uploads in admin

---

## Tier Logic

| Tier | Uploads | Total Storage |
|------|---------|--------------|
| Seedling | 10 | 50MB |
| Sapling | 25 | 500MB |
| Oak+ | Unlimited | 5GB |

---

## Implementation Steps

1. Migration + types in `index.ts`
2. R2 upload/delete utilities
3. Image resize/convert pipeline (Workers)
4. `UploadDropzone.svelte` — upload UI
5. `UploadManager.svelte` — browse/delete
6. `ImagePicker.svelte` — reusable picker for other curios
7. `QuotaBar.svelte` — storage visualization
8. API routes with quota enforcement
9. Register in curio registry
10. Tests

---

*Your images, your space. Upload what matters.*
