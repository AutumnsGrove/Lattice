---
title: "Amber Developer Guide"
description: "How to use the Amber SDK for file uploads, quota management, exports, and storage add-ons in Grove services."
category: guides
guideCategory: infrastructure
lastUpdated: "2026-03-12"
aliases: []
tags:
  - amber
  - storage
  - r2
  - quota
  - uploads
  - infra-sdk
---

# Amber Developer Guide

Amber is Grove's unified storage layer. It wraps R2 (object storage) and D1 (metadata) behind a single TypeScript client that any Grove service can import. Instead of each service writing its own R2 key generation, quota arithmetic, and export polling, you call `amber.files.upload()` and the SDK handles all of it.

The name comes from tree resin that hardens over time, preserving what it encloses. Amber does the same for Wanderer data.

## How Amber Works

The SDK has four managers, each responsible for one domain:

| Manager | What it does |
|---------|-------------|
| `QuotaManager` | Checks storage limits, returns usage breakdowns |
| `FileManager` | Uploads, downloads, lists, trashes, restores, and deletes files |
| `ExportManager` | Creates export jobs, polls status, generates download URLs |
| `AddonManager` | Lists purchasable storage packages and calculates total capacity |

All four managers talk to two backends through the Infra SDK:

- **D1** (via `GroveDatabase` / Drizzle ORM) for file metadata, quota tracking, export records, and add-on records
- **R2** (via `GroveStorage`) for the actual file bytes and export archives

The SDK never imports Cloudflare types directly. If the Infra SDK gains a PostgreSQL or S3 adapter someday, Amber will work with those too, with zero code changes.

## Creating a Client

```typescript
import { createAmberClient } from "@autumnsgrove/lattice/amber";

const amber = createAmberClient({
  db: ctx.db,             // EngineDb (Drizzle instance)
  storage: ctx.storage,   // GroveStorage (R2 adapter)
  services: ctx.services, // GroveServiceBus (optional, needed for exports)
});
```

`services` is optional. Without it, export creation still inserts a D1 record, but the ExportJobV2 Durable Object won't be triggered automatically.

Once you have the client, everything hangs off `amber.quota`, `amber.files`, `amber.exports`, and `amber.addons`.

## The Upload Flow

Uploading a file is the most common operation, and it follows a strict sequence designed to prevent orphaned data.

```
1. Validate inputs (filename, contentType, product)
2. Check quota BEFORE uploading
3. Generate a file ID (UUID) and R2 key
4. Upload bytes to R2
5. Insert the file record into D1
6. Increment the user's quota usage
```

If step 5 fails after step 4 succeeds, the SDK deletes the orphaned R2 object. No dangling files.

Here's what this looks like in practice:

```typescript
const file = await amber.files.upload({
  userId: "usr_01JM",
  product: "blog",
  category: "images",
  filename: "hero.webp",
  data: fileArrayBuffer,       // ArrayBuffer, Uint8Array, or ReadableStream
  contentType: "image/webp",
  metadata: { alt: "A forest clearing at dawn" },
});

// file.id       → "a1b2c3d4-..."
// file.r2Key    → "grove-storage/usr_01JM/blog/images/a1b2c3d4-....webp"
// file.sizeBytes → 245760
```

When `data` is a `ReadableStream`, the SDK can't measure its size upfront. You must pass `sizeBytes` explicitly so the quota check works:

```typescript
const file = await amber.files.upload({
  userId,
  product: "blog",
  category: "images",
  filename: "photo.webp",
  data: readableStream,
  contentType: "image/webp",
  sizeBytes: 524288,  // required for streams
});
```

Omitting `sizeBytes` with a stream throws `AMB-040` (invalid upload).

## R2 Key Structure

Every file gets a deterministic R2 key:

```
grove-storage/{userId}/{product}/{category}/{fileId}.{extension}
```

Some examples:

```
grove-storage/usr_01JM/blog/images/a1b2c3d4.webp
grove-storage/usr_01JM/blog/fonts/e5f6a7b8.woff2
grove-storage/usr_01JM/ivy/emails/c9d0e1f2.html
grove-storage/usr_01JM/profile/avatar/a3b4c5d6.webp
```

The `parseR2Key()` utility goes the other direction, splitting a key back into its parts:

```typescript
import { parseR2Key } from "@autumnsgrove/lattice/amber";

const parsed = parseR2Key("grove-storage/usr_01JM/blog/images/a1b2c3d4.webp");
// { userId: "usr_01JM", product: "blog", category: "images", filename: "a1b2c3d4.webp" }
```

## Quota System

Every user has a `user_storage` row in D1 tracking three numbers: `tierGb` (base allocation from their subscription tier), `additionalGb` (purchased add-ons), and `usedBytes` (current usage).

### Checking Quota Status

```typescript
const quota = await amber.quota.status(userId);

// quota.tierGb        → 5         (from subscription)
// quota.additionalGb  → 10        (from add-ons)
// quota.totalGb       → 15
// quota.totalBytes    → 16106127360
// quota.usedBytes     → 3221225472
// quota.availableBytes→ 12884901888
// quota.percentage    → 20        (percent used)
// quota.warningLevel  → "none"
```

Warning levels escalate at fixed thresholds:

| Level | Threshold |
|-------|-----------|
| `"none"` | Below 80% |
| `"warning"` | 80% or above |
| `"critical"` | 95% or above |
| `"full"` | 100% |

### Pre-Upload Check

`canUpload()` answers a simple question: will this file fit?

```typescript
const fits = await amber.quota.canUpload(userId, fileSizeBytes);
if (!fits) {
  // Show the user a "storage full" message
}
```

If the user has no `user_storage` record at all, `canUpload()` throws `AMB-051` rather than silently returning false. That error means the user's storage was never provisioned.

### Usage Breakdown

```typescript
const breakdown = await amber.quota.breakdown(userId);
// [
//   { product: "blog", category: "images", bytes: 2048000, fileCount: 14 },
//   { product: "blog", category: "fonts",  bytes: 128000,  fileCount: 2 },
//   { product: "ivy",  category: "emails", bytes: 64000,   fileCount: 8 },
// ]
```

This is useful for building storage dashboards. It groups by product and category, counting files and summing bytes. Soft-deleted (trashed) files are excluded from the breakdown.

### Initializing Storage

For new users who don't have a `user_storage` row yet:

```typescript
const quota = await amber.quota.getOrCreateStorage(userId, 5); // 5 GB tier
```

This uses `onConflictDoNothing` to handle concurrent creation races safely.

## File Operations

Beyond uploading, the FileManager covers the full lifecycle of a file.

### Get a File

```typescript
const file = await amber.files.get(fileId, userId);
```

Both `fileId` and `userId` are required. If the file doesn't exist or belongs to a different user, you get the same `AMB-043` (file not found). This prevents IDOR attacks by design.

### List Files

```typescript
const result = await amber.files.list({
  userId: "usr_01JM",
  product: "blog",           // optional filter
  category: "images",        // optional filter
  includeDeleted: false,     // default: false
  limit: 20,                 // default: 50
  offset: 0,
  sortBy: "created_at",      // or "size_bytes" or "filename"
  sortOrder: "desc",         // or "asc"
});

// result.files → AmberFile[]
// result.total → 47 (total matching, not just this page)
```

### Trash (Soft Delete)

```typescript
const trashed = await amber.files.trash(fileId, userId);
// trashed.deletedAt is now set
```

Trashing sets a `deletedAt` timestamp. The file stays in R2. Calling trash on an already-trashed file throws `AMB-048`.

### Restore from Trash

```typescript
const restored = await amber.files.restore(fileId, userId);
// restored.deletedAt is now undefined
```

Restoring clears the `deletedAt` timestamp. Calling restore on a non-trashed file throws `AMB-049`.

### Permanent Delete

```typescript
const deleted = await amber.files.delete(fileId, userId);
```

This removes the file from both R2 and D1, then decrements the user's quota. The quota decrement uses `MAX(0, usedBytes - fileSize)` to prevent negative values.

### Download

```typescript
const result = await amber.files.download(fileId, userId);
// result.body        → ReadableStream
// result.contentType → "image/webp"
// result.size        → 245760
```

If the file record exists in D1 but the R2 object is missing, you get `AMB-050`.

## Export Pipeline

Exports are asynchronous. The SDK inserts a job record, triggers a Durable Object to do the actual work, and gives you a way to check on progress.

### Creating an Export

```typescript
const exportJob = await amber.exports.create({
  userId: "usr_01JM",
  type: "full",                          // or "blog", "ivy", "category"
  filter: { product: "blog" },           // optional scope
});

// exportJob.id     → "e1f2a3b4-..."
// exportJob.status → "pending"
```

The `type` parameter controls what gets exported. `"full"` grabs everything. `"blog"` and `"ivy"` scope to those products. `"category"` uses the `filter` parameter to target a specific category.

### Checking Status

```typescript
const status = await amber.exports.status(exportId, userId);
// status.status    → "pending" | "processing" | "completed" | "failed"
// status.fileCount → 47    (once completed)
// status.sizeBytes → 12345 (once completed)
```

The `poll()` method is an alias for `status()`. Callers implement their own polling loop:

```typescript
let exportStatus = await amber.exports.poll(exportId, userId);
while (exportStatus.status === "pending" || exportStatus.status === "processing") {
  await new Promise((r) => setTimeout(r, 2000));
  exportStatus = await amber.exports.poll(exportId, userId);
}
```

### Getting the Download URL

Once an export completes, you can generate a presigned URL:

```typescript
const url = await amber.exports.downloadUrl(exportId, userId);
// url → "https://r2.example.com/grove-exports/...?X-Amz-Signature=..."
```

The URL expires after 1 hour. If the export hasn't completed yet, you get `AMB-044`. If it has expired, `AMB-045`.

### Listing Exports

```typescript
const exports = await amber.exports.list(userId);
// Returns all exports for this user, newest first
```

## Storage Add-ons

Add-ons let Wanderers purchase extra storage beyond their tier allocation. Three packages exist:

| Add-on Type | GB | Price (cents) |
|------------|-----|--------------|
| `storage_10gb` | 10 | 100 |
| `storage_50gb` | 50 | 400 |
| `storage_100gb` | 100 | 700 |

### Listing Available Add-ons

```typescript
const packages = amber.addons.available();
// [
//   { type: "storage_10gb",  gb: 10,  priceCents: 100 },
//   { type: "storage_50gb",  gb: 50,  priceCents: 400 },
//   { type: "storage_100gb", gb: 100, priceCents: 700 },
// ]
```

Note: `available()` is synchronous. The catalog is hardcoded, not fetched from a database.

### User's Active Add-ons

```typescript
const active = await amber.addons.list(userId);
// Returns only add-ons where active = true
```

### Total Storage Capacity

```typescript
const totalGb = await amber.addons.totalStorage(userId);
// 15 (5 GB tier + 10 GB add-on)

const totalBytes = await amber.addons.totalStorageBytes(userId);
// 16106127360
```

## Error Handling

Every Amber error is an `AmberError` with a structured error code, a category indicating who can fix it, a user-safe message, and a detailed admin message for logs.

```typescript
import { AmberError, AMB_ERRORS } from "@autumnsgrove/lattice/amber";

try {
  await amber.files.upload(request);
} catch (err) {
  if (err instanceof AmberError) {
    console.log(err.code);        // "AMB-041"
    console.log(err.category);    // "user"
    console.log(err.userMessage); // "You've reached your storage limit..."
    console.log(err.message);     // "Upload would exceed user's storage quota."
  }
}
```

### Error Catalog

Errors are organized into three ranges:

**Infrastructure (001-019)** -- problems with bindings and services:

| Code | Key | Category | What happened |
|------|-----|----------|--------------|
| AMB-001 | `DB_NOT_AVAILABLE` | admin | D1 database binding missing |
| AMB-002 | `STORAGE_NOT_AVAILABLE` | admin | R2 bucket binding missing |
| AMB-003 | `EXPORT_SERVICE_UNAVAILABLE` | admin | ExportJobV2 DO binding missing |

**Business Logic (040-059)** -- validation failures and expected conditions:

| Code | Key | Category | What happened |
|------|-----|----------|--------------|
| AMB-040 | `INVALID_UPLOAD` | user | Bad filename, content type, or missing stream size |
| AMB-041 | `QUOTA_EXCEEDED` | user | Upload would exceed quota |
| AMB-042 | `UPLOAD_FAILED` | bug | R2 put operation failed |
| AMB-043 | `FILE_NOT_FOUND` | user | File ID not in DB (or wrong user) |
| AMB-044 | `EXPORT_NOT_READY` | user | Export hasn't completed yet |
| AMB-045 | `EXPORT_EXPIRED` | user | Export download link expired |
| AMB-046 | `EXPORT_FAILED` | bug | ExportJobV2 processing failed |
| AMB-047 | `EXPORT_NOT_FOUND` | user | Export ID not in DB (or wrong user) |
| AMB-048 | `FILE_ALREADY_TRASHED` | user | Tried to trash an already-trashed file |
| AMB-049 | `FILE_NOT_TRASHED` | user | Tried to restore a non-trashed file |
| AMB-050 | `DOWNLOAD_FAILED` | bug | R2 get returned null for an existing record |
| AMB-051 | `USER_STORAGE_NOT_FOUND` | admin | No user_storage row; storage never provisioned |

**Internal (080-099)** -- things that shouldn't happen:

| Code | Key | Category | What happened |
|------|-----|----------|--------------|
| AMB-080 | `ORPHAN_CLEANUP_FAILED` | bug | D1 insert failed after R2 upload |
| AMB-081 | `QUOTA_SYNC_ERROR` | bug | Quota tracking update failed |

The `category` field tells you who can fix it: `"user"` means the Wanderer can take action (upgrade storage, wait for export), `"admin"` means something is misconfigured in the deployment, and `"bug"` means there's a code-level problem to investigate.

## Key Files

```
libs/engine/src/lib/amber/
  index.ts        createAmberClient() factory + barrel re-exports
  client.ts       AmberClient class composing all four managers
  types.ts        All type definitions (AmberFile, AmberQuota, etc.)
  errors.ts       AMB_ERRORS catalog and AmberError class
  files.ts        FileManager (upload, download, trash, restore, delete)
  quota.ts        QuotaManager (status, canUpload, breakdown)
  exports.ts      ExportManager (create, status, poll, downloadUrl)
  addons.ts       AddonManager (available, list, totalStorage)
  utils.ts        R2 key generation, MIME detection, formatBytes
```

Import path: `@autumnsgrove/lattice/amber`

Dependencies: `@autumnsgrove/infra` (GroveStorage, GroveServiceBus), Drizzle ORM, Zod (for metadata parsing).

## Quick Checklist

When adding Amber to a new service:

1. Add `@autumnsgrove/lattice` as a workspace dependency (if not already present)
2. Get `GroveStorage` and `EngineDb` from your middleware context
3. Call `createAmberClient({ db, storage })` at request time
4. Use `amber.quota.canUpload()` before accepting file uploads from users
5. Always pass `userId` to file and export operations (the SDK scopes every query by user)
6. For `ReadableStream` uploads, pass `sizeBytes` explicitly
7. Catch `AmberError` and use `err.userMessage` for responses, `err.message` for logs
8. If you need exports, pass `services` (GroveServiceBus) in the client config to trigger the Durable Object
