---
aliases: []
date created: Sunday, February 22nd 2026
date modified: Sunday, February 22nd 2026
tags:
  - infrastructure
  - sdk
  - storage
  - amber
type: tech-spec
lastUpdated: "2026-02-22"
---

```
              ╭──────────────────────────────────╮
              │     ┌────────────────────┐       │
              │     │  ┌──────────────┐  │       │
              │     │  │  ┌────────┐  │  │       │
              │     │  │  │ amber  │  │  │       │
              │     │  │  │  ···   │  │  │       │
              │     │  │  └────────┘  │  │       │
              │     │  │   SDK        │  │       │
              │     │  └──────────────┘  │       │
              │     │    Quota · Files   │       │
              │     └────────────────────┘       │
              │       Exports · Add-ons          │
              ╰──────────────────────────────────╯
                    ╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱
                 ─────────────────────────
                ~~~~ resin preserves ~~~~

         Time hardens resin into amber. Data endures.
```

> _Time hardens resin into amber. Data endures._

# Amber SDK: Unified Storage Management

> _Time hardens resin into amber. Data endures._

The Amber SDK is a TypeScript client library that gives any Grove service clean access to Amber's storage operations: quota checks, file management, exports, and add-ons. Instead of each service reimplementing R2 key generation, quota math, and export polling, they import the SDK and call methods.

**Public Name:** Amber SDK
**Internal Name:** GroveAmber
**Package:** `@autumnsgrove/lattice/amber`
**Location:** `libs/engine/src/lib/amber/`
**Depends On:** Infra SDK (`@autumnsgrove/infra`), Loom (Durable Objects)
**Last Updated:** February 2026

Amber is tree resin. It preserves things. It wraps around what matters and holds it through time. The Amber system does the same for Wanderer data: uploads, exports, backups, quotas. The SDK is how every other part of Grove reaches into that resin without knowing the chemistry underneath.

---

## Overview

### What This Is

A library that abstracts Amber's storage management into a clean API. Today, the Engine uploads files by talking to R2 directly and tracking metadata in its own D1. Amber (the service) manages quotas and exports separately. The SDK unifies these operations behind one interface that any Grove service can import.

### Goals

- Single interface for all storage operations across Grove services
- Quota validation before any upload, not after
- Export creation and polling without Durable Object boilerplate
- Consistent R2 key generation and file organization
- Built on Infra SDK's `GroveStorage` and `GroveDatabase` interfaces
- Signpost error codes (`AMB-*` prefix) for clear diagnostics

### Non-Goals (Out of Scope)

- Replacing the Amber service backend (the SDK is a client, not a reimplementation)
- CDN or edge caching logic (handled by Cloudflare)
- Billing integration (Stripe/LemonSqueezy stays in the Amber service)
- Media processing (image resizing, format conversion)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Consumer Services                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  Engine  │  │   Ivy    │  │  Wisp    │  │ Journey  │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
└───────┼──────────────┼──────────────┼──────────────┼────────────────┘
        │              │              │              │
        └──────────────┴──────┬───────┴──────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Amber SDK                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  Quota   │  │  Files   │  │ Exports  │  │ Add-ons  │           │
│  │ Manager  │  │ Manager  │  │ Manager  │  │ Manager  │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
└───────┼──────────────┼──────────────┼──────────────┼────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Server SDK Interfaces                            │
│  ┌──────────────┐  ┌──────────────────┐                             │
│  │ GroveDatabase│  │  GroveStorage    │                             │
│  │ (D1 adapter) │  │  (R2 adapter)    │                             │
│  └──────────────┘  └──────────────────┘                             │
└─────────────────────────────────────────────────────────────────────┘
        │              │
        ▼              ▼
┌──────────┐    ┌──────────┐
│    D1    │    │    R2    │
│ (quota,  │    │ (files,  │
│  files,  │    │  exports)│
│  exports)│    │          │
└──────────┘    └──────────┘
```

### Relationship to Existing Code

| What Exists | What the SDK Does |
|------------|-------------------|
| `StorageRepository` class in `apps/amber/` | SDK wraps this pattern, importable from any service |
| `ExportJobV2` Durable Object | SDK provides `exports.create()` and `exports.poll()` |
| Quota math functions in `storage.ts` | SDK provides `quota.check()` and `quota.canUpload()` |
| R2 key generation helpers | SDK provides `files.upload()` with auto-keying |
| Scattered file upload code in Engine | SDK provides one `files.upload()` method |

---

## Public API

### Creating an Amber Client

```typescript
import { createAmberClient } from "@autumnsgrove/lattice/amber";

const amber = createAmberClient({
  db: ctx.db,           // GroveDatabase from Server SDK
  storage: ctx.storage, // GroveStorage from Server SDK
  services: ctx.services, // GroveServiceBus for export DO calls
});
```

### Quota Operations

```typescript
// Get current quota status
const quota = await amber.quota.status(userId);
// Returns: { totalGb, usedBytes, availableBytes, percentage, warningLevel }

// Check if an upload would fit
const canFit = await amber.quota.canUpload(userId, fileSizeBytes);
// Returns: boolean

// Get usage breakdown by product/category
const breakdown = await amber.quota.breakdown(userId);
// Returns: [{ product: "blog", category: "images", bytes: 1234, fileCount: 12 }, ...]
```

### File Operations

```typescript
// Upload a file with automatic R2 key generation and quota tracking
const file = await amber.files.upload({
  userId,
  product: "blog",
  category: "images",
  filename: "hero.webp",
  data: fileStream,
  contentType: "image/webp",
});
// Returns: StorageFile with id, r2Key, url

// Get a file
const file = await amber.files.get(fileId);

// List files with filtering and pagination
const { files, total } = await amber.files.list({
  userId,
  product: "blog",
  category: "images",
  limit: 20,
  cursor: lastFileId,
});

// Move to trash (soft delete)
await amber.files.trash(fileId);

// Restore from trash
await amber.files.restore(fileId);

// Permanently delete (hard delete + R2 cleanup)
await amber.files.delete(fileId);

// Download a file
const { body, contentType, size } = await amber.files.download(fileId);
```

### Export Operations

```typescript
// Create an export job
const exportJob = await amber.exports.create({
  userId,
  type: "full",          // "full" | "blog" | "ivy" | "category"
  filter: { product: "blog" },
});
// Returns: { id, status: "pending" }

// Check export status
const status = await amber.exports.status(exportJob.id);
// Returns: { id, status, progress, fileCount, sizeBytes, downloadUrl? }

// Get download URL (only when status = "completed")
const url = await amber.exports.downloadUrl(exportJob.id);

// List user's exports
const exports = await amber.exports.list(userId);
```

### Add-on Operations

```typescript
// Get available add-ons with pricing
const available = await amber.addons.available();
// Returns: [{ type: "storage_10gb", gb: 10, priceCents: 100 }, ...]

// Get user's active add-ons
const active = await amber.addons.list(userId);

// Check total storage including add-ons
const totalGb = await amber.addons.totalStorage(userId);
```

---

## Core Types

```typescript
// Storage file record
interface AmberFile {
  id: string;
  userId: string;
  r2Key: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  product: AmberProduct;
  category: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  deletedAt?: string;
}

// Product types that organize files
type AmberProduct = "blog" | "ivy" | "profile" | "themes";

// Quota status
interface AmberQuota {
  tierGb: number;
  additionalGb: number;
  totalGb: number;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  percentage: number;
  warningLevel: "none" | "warning" | "critical" | "full";
}

// Upload request
interface AmberUploadRequest {
  userId: string;
  product: AmberProduct;
  category: string;
  filename: string;
  data: ReadableStream | ArrayBuffer | Uint8Array;
  contentType: string;
  metadata?: Record<string, unknown>;
}

// Export job
interface AmberExport {
  id: string;
  userId: string;
  status: "pending" | "processing" | "completed" | "failed";
  exportType: "full" | "blog" | "ivy" | "category";
  filterParams?: Record<string, unknown>;
  r2Key?: string;
  sizeBytes?: number;
  fileCount?: number;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  errorMessage?: string;
}

// Storage add-on
interface AmberAddon {
  id: string;
  userId: string;
  addonType: "storage_10gb" | "storage_50gb" | "storage_100gb";
  gbAmount: number;
  active: boolean;
  createdAt: string;
  cancelledAt?: string;
}

// Usage breakdown entry
interface AmberUsageEntry {
  product: string;
  category: string;
  bytes: number;
  fileCount: number;
}
```

---

## R2 Key Organization

The SDK generates R2 keys following the existing convention:

```
grove-storage/{user_id}/{product}/{category}/{file_id}.{ext}

Examples:
  grove-storage/usr_01JM/blog/images/fil_01JN.webp
  grove-storage/usr_01JM/blog/fonts/fil_01JP.woff2
  grove-storage/usr_01JM/ivy/emails/fil_01JQ.html
  grove-storage/usr_01JM/profile/avatar/fil_01JR.webp
  grove-storage/usr_01JM/themes/custom/fil_01JS.zip
```

Key generation is deterministic and collision-free (uses ULID for file IDs).

```typescript
function generateR2Key(
  userId: string,
  product: AmberProduct,
  category: string,
  fileId: string,
  extension: string,
): string {
  return `grove-storage/${userId}/${product}/${category}/${fileId}.${extension}`;
}
```

---

## Upload Flow

```
amber.files.upload(request)
    │
    ▼
Validate inputs (filename, contentType, product)
    │
    ├── Invalid? → throw AMB-040
    │
    ▼
Check quota: amber.quota.canUpload(userId, sizeBytes)
    │
    ├── Over quota? → throw AMB-041
    │
    ▼
Generate file ID (ULID) and R2 key
    │
    ▼
Upload to R2 via GroveStorage.put()
    │
    ├── Failed? → throw AMB-042
    │
    ▼
Insert file record in D1 via GroveDatabase
    │
    ├── Failed? → Clean up R2 object, throw AMB-080
    │
    ▼
Update quota usage: trackUpload(userId, sizeBytes)
    │
    ▼
Return AmberFile
```

The key design decision: **quota check before upload, cleanup on failure.** If the D1 insert fails after the R2 upload succeeds, the SDK deletes the orphaned R2 object. No orphans.

---

## Export Flow

Exports are long-running operations handled by the ExportJobV2 Durable Object. The SDK provides a clean client interface.

```
amber.exports.create(request)
    │
    ▼
Insert export record in D1 (status: "pending")
    │
    ▼
Trigger ExportJobV2 DO via service bus
    │
    ▼
Return export ID + status
    │
    │  (asynchronous processing)
    │
    ▼
amber.exports.status(exportId)  ← poll this
    │
    ├── "pending"    → DO hasn't started yet
    ├── "processing" → DO is zipping files
    ├── "completed"  → ZIP ready for download
    └── "failed"     → Check errorMessage

amber.exports.downloadUrl(exportId)
    │
    ├── Not completed? → throw AMB-044
    │
    ▼
Generate presigned R2 URL (1 hour expiry)
    │
    ▼
Return download URL
```

---

## Automated Backups

One of the key decentralization features: automated external backups. Amber can periodically export a Wanderer's content and deliver it to them (email, external storage) without manual intervention.

```typescript
// Future: Automated backup configuration
interface AmberBackupConfig {
  userId: string;
  enabled: boolean;
  frequency: "weekly" | "monthly";
  delivery: BackupDelivery;
  includeMedia: boolean;
  format: "grove" | "zip";
}

type BackupDelivery =
  | { type: "email"; address: string }         // Email download link
  | { type: "s3"; bucket: string; key: string } // Push to external S3
  | { type: "webdav"; url: string }             // Push to WebDAV
```

This integrates with the Dead Man's Switch concept from the decentralization strategy: if Grove ceases operation, automated exports ensure data survives.

---

## Signpost Error Catalog

Amber SDK uses the `AMB` prefix.

```typescript
export const AMB_ERRORS = {
  // Infrastructure (001-019)
  DB_NOT_AVAILABLE: {
    code: "AMB-001",
    category: "admin" as const,
    userMessage: "Storage service is temporarily unavailable.",
    adminMessage: "Amber D1 database binding not available.",
  },
  STORAGE_NOT_AVAILABLE: {
    code: "AMB-002",
    category: "admin" as const,
    userMessage: "Storage service is temporarily unavailable.",
    adminMessage: "Amber R2 bucket binding not available.",
  },
  EXPORT_SERVICE_UNAVAILABLE: {
    code: "AMB-003",
    category: "admin" as const,
    userMessage: "Export service is temporarily unavailable.",
    adminMessage: "ExportJobV2 Durable Object binding not available.",
  },

  // Business Logic (040-059)
  INVALID_UPLOAD: {
    code: "AMB-040",
    category: "user" as const,
    userMessage: "This file can't be uploaded. Please check the file type and size.",
    adminMessage: "Upload validation failed. Check filename, contentType, product.",
  },
  QUOTA_EXCEEDED: {
    code: "AMB-041",
    category: "user" as const,
    userMessage: "You've reached your storage limit. Consider upgrading or removing unused files.",
    adminMessage: "Upload would exceed user's storage quota.",
  },
  UPLOAD_FAILED: {
    code: "AMB-042",
    category: "bug" as const,
    userMessage: "Upload failed. Please try again.",
    adminMessage: "R2 put operation failed for file upload.",
  },
  FILE_NOT_FOUND: {
    code: "AMB-043",
    category: "user" as const,
    userMessage: "This file doesn't exist or has been deleted.",
    adminMessage: "File ID not found in storage_files table.",
  },
  EXPORT_NOT_READY: {
    code: "AMB-044",
    category: "user" as const,
    userMessage: "Your export isn't ready yet. Please wait a moment.",
    adminMessage: "Export download requested but status is not 'completed'.",
  },
  EXPORT_EXPIRED: {
    code: "AMB-045",
    category: "user" as const,
    userMessage: "This export has expired. Please create a new one.",
    adminMessage: "Export download link expired. R2 object may have been cleaned up.",
  },
  EXPORT_FAILED: {
    code: "AMB-046",
    category: "bug" as const,
    userMessage: "Your export failed. Please try again.",
    adminMessage: "ExportJobV2 processing failed. Check DO logs.",
  },

  // Internal (080-099)
  ORPHAN_CLEANUP_FAILED: {
    code: "AMB-080",
    category: "bug" as const,
    userMessage: "Something went wrong. Please try again.",
    adminMessage: "D1 insert failed after R2 upload. Orphan cleanup attempted.",
  },
  QUOTA_SYNC_ERROR: {
    code: "AMB-081",
    category: "bug" as const,
    userMessage: "Something went wrong updating your storage usage.",
    adminMessage: "Quota tracking update failed. Usage may be out of sync.",
  },
} satisfies Record<string, GroveErrorDef>;
```

---

## Integration with Server SDK

The Amber SDK is built on top of Server SDK interfaces. It doesn't import Cloudflare types directly.

```typescript
import type { GroveDatabase, GroveStorage, GroveServiceBus } from "@autumnsgrove/infra";

class AmberClient {
  constructor(
    private db: GroveDatabase,
    private storage: GroveStorage,
    private services: GroveServiceBus,
  ) {}

  // All operations use db, storage, and services
  // Never imports D1Database, R2Bucket, or Fetcher directly
}
```

This means the Amber SDK inherits Infra SDK's portability. If the Infra SDK gets a PostgreSQL adapter, Amber automatically works with PostgreSQL. If the Infra SDK gets an S3 adapter, Amber automatically works with S3.

---

## File Structure

```
libs/engine/src/lib/amber/
├── index.ts              # createAmberClient + barrel exports
├── types.ts              # AmberFile, AmberQuota, AmberExport, etc.
├── errors.ts             # AMB_ERRORS catalog
├── client.ts             # AmberClient class (main entry point)
├── quota.ts              # QuotaManager (quota checks, breakdown)
├── files.ts              # FileManager (upload, download, trash, delete)
├── exports.ts            # ExportManager (create, poll, download)
├── addons.ts             # AddonManager (list, check total storage)
└── utils.ts              # R2 key generation, MIME detection, formatBytes
```

---

## Security Considerations

- **Quota enforcement is server-side only.** Never trust client-reported file sizes. The SDK measures actual bytes uploaded.
- **R2 key isolation.** Every R2 key is scoped to a user ID. The SDK validates that a user can only access their own files.
- **Orphan prevention.** If D1 write fails after R2 upload, the SDK deletes the R2 object. No orphaned storage.
- **Export access control.** Export download URLs are presigned with short TTLs (1 hour). Only the requesting user gets the URL.
- **No credential exposure.** R2 keys and D1 connections flow through Server SDK adapters. The Amber SDK never handles raw credentials.

---

## Implementation Checklist

### Phase 1: Core Client (Week 1)

- [ ] Create `libs/engine/src/lib/amber/` directory structure
- [ ] Define all types in `types.ts`
- [ ] Create `AMB_ERRORS` catalog in `errors.ts`
- [ ] Implement `QuotaManager` with status, canUpload, breakdown
- [ ] Implement `createAmberClient()` factory

### Phase 2: File Operations (Week 2)

- [ ] Implement `FileManager.upload()` with quota check and orphan cleanup
- [ ] Implement `FileManager.get()`, `FileManager.list()`
- [ ] Implement `FileManager.trash()`, `FileManager.restore()`, `FileManager.delete()`
- [ ] Implement `FileManager.download()`
- [ ] Port R2 key generation and MIME detection utilities

### Phase 3: Export Operations (Week 2-3)

- [ ] Implement `ExportManager.create()` with DO trigger
- [ ] Implement `ExportManager.status()` and `ExportManager.poll()`
- [ ] Implement `ExportManager.downloadUrl()` with presigned URLs
- [ ] Implement `ExportManager.list()`

### Phase 4: Add-on Operations (Week 3)

- [ ] Implement `AddonManager.available()`, `AddonManager.list()`
- [ ] Implement `AddonManager.totalStorage()`
- [ ] Wire add-on storage into quota calculations

### Phase 5: Migration (Week 3-4)

- [ ] Migrate Engine's direct R2 uploads to use Amber SDK
- [ ] Migrate Ivy's file operations to use Amber SDK
- [ ] Verify quota tracking stays consistent
- [ ] Update Amber service backend to use SDK types

### Phase 6: Automated Backups (Future)

- [ ] Design backup configuration schema
- [ ] Implement periodic export scheduling
- [ ] Add email delivery for backup download links
- [ ] Add external storage push (S3, WebDAV)

---

*Time hardens resin into amber. Data endures.*
