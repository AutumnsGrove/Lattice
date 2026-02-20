---
aliases: []
date created: Monday, January 13th 2026
date modified: Monday, January 13th 2026
tags:
  - image-compression
  - jpeg-xl
  - jxl
  - optimization
  - amber
type: tech-spec
---

# JPEG XL Migration Specification

```
                     ┌─────────────────────┐
                     │   WebP  →  JXL     │
                     │                     │
                     │  ████░░░░  ████████ │
                     │  8KB       3KB      │
                     │                     │
                     │   Better quality    │
                     │   Smaller files     │
                     └─────────────────────┘

           Modernizing Grove's image compression
```

Grove's image compression pipeline currently uses WebP format. With JPEG XL (JXL) support now in Chrome/Chromium mainline and Safari 17+, this spec outlines migration to JXL for superior compression while maintaining backward compatibility.

---

## Overview

### Why JPEG XL?

| Aspect             | WebP      | JPEG XL                                    |
| ------------------ | --------- | ------------------------------------------ |
| Compression ratio  | Good      | 20-60% smaller at same quality             |
| Lossless support   | Yes       | Yes (better)                               |
| Progressive decode | Limited   | Excellent                                  |
| HDR support        | No        | Yes                                        |
| Animation          | Yes       | Yes                                        |
| Browser support    | Universal | Chrome, Safari 17+, Edge (Firefox pending) |

### Grove's Image Pipeline Goals

1. **Quality preservation** - Grove's selling point is aggressive-yet-quality-preserving compression
2. **Storage efficiency** - Smaller files = lower R2 costs, faster loads
3. **Universal compatibility** - Images must work in all browsers
4. **Privacy protection** - EXIF/GPS stripping must continue

---

## Current Implementation Analysis

### Client-Side Processing

**File:** `libs/engine/src/lib/utils/imageProcessor.ts`

Current flow:

```
User selects image
    ↓
Calculate SHA-256 hash (duplicate detection)
    ↓
Canvas API: resize + quality adjust + convert to WebP
    ↓
EXIF stripped automatically (canvas redraw)
    ↓
Upload processed blob to R2
```

**Key functions:**

- `processImage()` - Main conversion, uses `canvas.toBlob()` with `image/webp`
- `sanitizeImageFilename()` - Adds `.webp` extension
- Quality mapping: 10-100% → dimension limits (960-4096px max)

### Server-Side Upload

**File:** `libs/engine/src/routes/api/images/upload/+server.ts`

- Accepts: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Magic byte validation for each type
- No server-side transcoding (trusts client-processed blob)
- Stores directly to R2 with 1-year cache headers

### Storage Service

**File:** `libs/engine/src/lib/server/services/storage.ts`

- `ALLOWED_CONTENT_TYPES` includes: jpeg, png, gif, webp, avif
- Cache control: `public, max-age=31536000, immutable` for images
- No JXL support currently

### Admin UI

**File:** `libs/engine/src/routes/admin/images/+page.svelte`

- "Convert to WebP" toggle (default: on)
- Quality slider (10-100%, default: 80%)
- "Full Resolution" toggle (default: off)
- Shows compression ratio after upload

---

## Browser Support Reality

### Native JXL Decode Support (January 2026)

| Browser              | Status              | Notes                        |
| -------------------- | ------------------- | ---------------------------- |
| Chrome/Chromium 124+ | Merging to mainline | Was behind flag, now default |
| Safari 17+           | Full support        | macOS Sonoma, iOS 17+        |
| Edge                 | Follows Chromium    | Same timeline as Chrome      |
| Firefox              | Pending             | Waiting on Rust decoder      |

### Implication

~75-80% of users have native JXL support. For the remaining ~20%:

- Firefox users: Need WebP fallback
- Older Safari/Chrome: Need WebP fallback

---

## Recommended Architecture

### Option C: Hybrid Approach (Recommended)

```
┌─────────────────────────────────────────────────────────┐
│                    Upload Flow                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Browser with WASM support:                             │
│  ┌─────────┐    ┌───────────┐    ┌─────────┐           │
│  │ Select  │ → │ @jsquash/ │ → │ Upload  │           │
│  │ Image   │    │  jxl      │    │  .jxl   │           │
│  └─────────┘    └───────────┘    └─────────┘           │
│                                                         │
│  Browser without WASM:                                  │
│  ┌─────────┐    ┌───────────┐    ┌─────────┐           │
│  │ Select  │ → │ Canvas    │ → │ Upload  │           │
│  │ Image   │    │ API       │    │  .webp  │           │
│  └─────────┘    └───────────┘    └─────────┘           │
│                                                         │
│  Server fallback (if client fails):                     │
│  ┌─────────┐    ┌───────────┐    ┌─────────┐           │
│  │ Upload  │ → │ Worker +  │ → │ Store   │           │
│  │ Original│    │ @jsquash  │    │  .jxl   │           │
│  └─────────┘    └───────────┘    └─────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Serving Flow                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Request:                                               │
│  Accept: image/jxl, image/webp, */*                     │
│              ↓                                          │
│  ┌────────────────────────────┐                         │
│  │   Content Negotiation      │                         │
│  │   (CDN or Worker)          │                         │
│  └────────────────────────────┘                         │
│              ↓                                          │
│  ┌─────────────┬──────────────┐                         │
│  │ JXL exists  │ WebP exists  │                         │
│  │ & accepted  │ (fallback)   │                         │
│  └─────────────┴──────────────┘                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Why Hybrid?

1. **Browser-side JXL encoding** - Zero server CPU cost, uses @jsquash/jxl WASM
2. **Graceful degradation** - Falls back to Canvas WebP if WASM fails
3. **Server backup** - If client can't encode, server does it
4. **Dual-format storage** - Both JXL and WebP stored, serve based on Accept header

---

## Technical Implementation

### Phase 1: Add @jsquash/jxl Dependency

```bash
pnpm add @jsquash/jxl -w --filter @autumnsgrove/lattice
```

**Package details:**

- NPM: `@jsquash/jxl`
- License: Apache-2.0
- Size: ~800KB WASM encoder
- Cloudflare Workers compatible (no dynamic code execution)

#### WASM Bundle Size Consideration

The @jsquash/jxl encoder is ~800KB. **Do not import statically** - use lazy loading:

```typescript
// ❌ BAD - adds 800KB to main bundle
import { encode as encodeJxl } from "@jsquash/jxl";

// ✅ GOOD - lazy load only when needed
let jxlEncoder: typeof import("@jsquash/jxl") | null = null;

async function getJxlEncoder() {
  if (!jxlEncoder) {
    jxlEncoder = await import("@jsquash/jxl");
  }
  return jxlEncoder;
}

// Usage in processImage()
if (targetFormat === "jxl") {
  const { encode } = await getJxlEncoder();
  const encoded = await encode(imageData, options);
  // ...
}
```

This ensures the WASM module only loads when a user actually uploads an image, not on page load.

### Phase 2: Update imageProcessor.ts

```typescript
// Type-safe result interface
export interface ProcessedImageResult {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  processedSize: number;
  format: "jxl" | "webp" | "gif" | "original"; // Explicit format tracking
  skipped?: boolean; // True for GIFs and originals
}

export interface ProcessImageOptions {
  quality?: number;
  convertToWebP?: boolean; // Deprecated, kept for backward compat
  convertToJxl?: boolean; // New default
  fullResolution?: boolean;
  format?: "auto" | "jxl" | "webp" | "original"; // New
}

/**
 * Detect if browser supports WASM-based JXL encoding
 */
export async function supportsJxlEncoding(): Promise<boolean> {
  try {
    // Check for WASM support
    if (typeof WebAssembly !== "object") return false;

    // Try to load the JXL encoder
    await import("@jsquash/jxl");
    return true;
  } catch {
    return false;
  }
}

/**
 * Process image with JXL or WebP fallback
 */
export async function processImage(
  file: File,
  options: ProcessImageOptions = {},
): Promise<ProcessedImageResult> {
  const { quality = 80, format = "auto", fullResolution = false } = options;

  // GIFs preserved for animation
  if (file.type === "image/gif") {
    return {
      /* existing GIF handling */
    };
  }

  // Determine target format
  let targetFormat: "jxl" | "webp" = "webp";

  if (format === "jxl" || format === "auto") {
    const canUseJxl = await supportsJxlEncoding();
    if (canUseJxl) targetFormat = "jxl";
  }

  // Load and resize image via canvas (strips EXIF)
  // IMPORTANT: Drawing to canvas then extracting ImageData strips all metadata
  // including EXIF, GPS, and camera info - this is intentional for privacy
  const img = await loadImage(file);
  const { width, height } = calculateTargetDimensions(
    img,
    quality,
    fullResolution,
  );
  const imageData = getImageData(img, width, height);

  // VERIFY: @jsquash/jxl encode() receives ImageData (pixel array), NOT the
  // original file buffer, so EXIF metadata is NOT passed to the encoder.
  // Add test in Phase 2 to verify output JXL contains no EXIF (see Testing Plan)

  // Encode to target format
  let blob: Blob;

  if (targetFormat === "jxl") {
    // Adaptive effort: lower on mobile for battery/performance
    const effort = getAdaptiveEffort();

    const { encode } = await getJxlEncoder(); // Lazy load
    const encoded = await encode(imageData, {
      quality,
      effort,
      lossless: false,
      progressive: true, // Better loading UX
    });
    blob = new Blob([encoded], { type: "image/jxl" });
  } else {
    // WebP fallback via Canvas API
    blob = await canvasToWebP(imageData, quality);
  }
}

/**
 * Adaptive effort level based on device capabilities
 * Higher effort = better compression but slower encoding
 *
 * Mobile devices: effort 5 (faster, preserves battery)
 * Desktop/High-end: effort 7 (balanced, stays under 3s target)
 */
function getAdaptiveEffort(): number {
  // Detect mobile via user agent or screen size
  const isMobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.innerWidth < 768;

  // Mobile gets lower effort for battery/performance
  if (isMobile) return 5;

  // Cap at 7 to stay under 3s encoding target
  // High-end users can override via advanced settings if desired
  return 7;
}
```

**Effort levels explained:**

| Device   | Effort | Encoding Time | Compression |
| -------- | ------ | ------------- | ----------- |
| Mobile   | 5      | ~1s           | Good        |
| Desktop  | 7      | ~2s           | Better      |
| High-end | 7      | ~2s           | Better      |

> **Note**: Originally proposed effort 9 for high-end devices (~4s), but this exceeds the <3s performance target. Cap at effort 7 for all devices to ensure consistent UX. Users can override via advanced settings if desired.

### Phase 3: Update Upload Endpoint (with Enhanced Validation)

**File:** `libs/engine/src/routes/api/images/upload/+server.ts`

```typescript
// Add JXL to allowed types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/jxl", // New
];

// JXL has two valid formats with different signatures
// Pattern structure: { bytes: magic bytes, minLength: minimum file size }
interface SignaturePattern {
  bytes: number[];
  minLength: number;
}

const FILE_SIGNATURES: Record<string, SignaturePattern[]> = {
  // ... existing types (update structure) ...
  "image/jxl": [
    {
      bytes: [0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20],
      minLength: 12, // Container format (ISO BMFF) needs 12+ bytes
    },
    {
      bytes: [0xff, 0x0a],
      minLength: 2, // Codestream format (naked) only needs 2 bytes
    },
  ],
};

/**
 * Validate file signature with per-pattern length check
 * Fixes bug where global minLength rejected valid codestream files
 */
function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer);
  const patterns = FILE_SIGNATURES[mimeType];

  if (!patterns) return false;

  // Check each pattern - file must match at least one
  return patterns.some((pattern) => {
    // Check minimum length for THIS pattern
    if (bytes.length < pattern.minLength) return false;

    // Check if pattern matches
    return pattern.bytes.every((byte, i) => bytes[i] === byte);
  });
}

// Add extension mapping
const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  // ... existing ...
  "image/jxl": ["jxl"],
};
```

**Note**: The original validation had a bug where `minLength: 12` was global, which would reject valid 2-byte JXL codestream files. The fix uses per-pattern minimum lengths.

### Phase 4: Update Storage Service (with Security Headers)

**File:** `libs/engine/src/lib/server/services/storage.ts`

```typescript
const ALLOWED_CONTENT_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/jxl", // New
  // ... rest unchanged
]);

/**
 * Get response headers for serving images
 * Includes security headers to prevent content sniffing
 */
function getImageHeaders(contentType: string): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff", // Prevent MIME sniffing
    Vary: "Accept", // For content negotiation caching
  };
}
```

### Phase 5: Update Admin UI

**File:** `libs/engine/src/routes/admin/images/+page.svelte`

Replace the "Convert to WebP" toggle with a format selector:

```svelte
<script>
  import { supportsJxlEncoding } from '$lib/utils/imageProcessor';

  // Replace convertToWebP with format selector
  let imageFormat = $state('auto');  // 'auto' | 'jxl' | 'webp' | 'original'
  let jxlSupported = $state(false);

  onMount(async () => {
    jxlSupported = await supportsJxlEncoding();
    loadGallery();
  });
</script>

<!-- In advanced options -->
<div class="format-selector">
  <label for="imageFormat">Output format:</label>
  <select id="imageFormat" bind:value={imageFormat}>
    <option value="auto">Auto (JXL if supported)</option>
    <option value="jxl" disabled={!jxlSupported}>
      JPEG XL {jxlSupported ? '' : '(not supported)'}
    </option>
    <option value="webp">WebP</option>
    <option value="original">Keep original</option>
  </select>
  <small class="format-hint">
    {#if jxlSupported}
      Your browser supports JPEG XL encoding
    {:else}
      JXL encoding requires WebAssembly support
    {/if}
  </small>
</div>
```

### Phase 6: Database Schema Update

**File:** D1 migration for `storage_files` table

Track image format for analytics, future cleanup, and migration progress:

```sql
-- Add format column to track image encoding
ALTER TABLE storage_files ADD COLUMN image_format TEXT;

-- Create index for format queries
CREATE INDEX idx_files_format ON storage_files(image_format);

-- Update existing records (all currently WebP or original)
UPDATE storage_files
SET image_format = CASE
  WHEN mime_type = 'image/webp' THEN 'webp'
  WHEN mime_type = 'image/jpeg' THEN 'jpeg'
  WHEN mime_type = 'image/png' THEN 'png'
  WHEN mime_type = 'image/gif' THEN 'gif'
  ELSE 'unknown'
END
WHERE image_format IS NULL;
```

**Usage in upload handler:**

```typescript
// When inserting new file record
await db.prepare(`
  INSERT INTO storage_files (id, user_id, r2_key, filename, mime_type, size_bytes, image_format, ...)
  VALUES (?, ?, ?, ?, ?, ?, ?, ...)
`).bind(id, userId, r2Key, filename, mimeType, sizeBytes, result.format, ...);
```

**Analytics queries:**

```sql
-- JXL adoption rate
SELECT
  image_format,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM storage_files
WHERE mime_type LIKE 'image/%'
GROUP BY image_format;

-- Ready for WebP deprecation?
SELECT COUNT(*) as webp_only_images
FROM storage_files
WHERE image_format = 'webp'
  AND NOT EXISTS (
    SELECT 1 FROM storage_files jxl
    WHERE jxl.image_format = 'jxl'
      AND jxl.filename = storage_files.filename
  );
```

### Phase 7: Content Negotiation for Serving

Two approaches:

#### Option A: Cloudflare Transform Rules (Simpler)

Configure in Cloudflare Dashboard:

```
When: Request Header "Accept" contains "image/jxl"
Transform: Rewrite URL from /photos/... to /photos-jxl/...
```

#### Option B: Worker-Based Negotiation (More Control)

```typescript
// In CDN serving worker
export async function fetch(request: Request, env: Env) {
  const url = new URL(request.url);
  const accept = request.headers.get("Accept") || "";

  // Check if client accepts JXL
  const acceptsJxl = accept.includes("image/jxl");

  // Try JXL version first if supported
  if (acceptsJxl) {
    const jxlKey = url.pathname.replace(/\.(webp|jpg|png)$/, ".jxl");
    const jxlObject = await env.IMAGES.get(jxlKey);
    if (jxlObject) {
      return new Response(jxlObject.body, {
        headers: {
          "Content-Type": "image/jxl",
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
          Vary: "Accept", // Critical for CDN caching
        },
      });
    }
  }

  // Fall back to WebP/original
  const object = await env.IMAGES.get(url.pathname);
  if (object) {
    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        Vary: "Accept",
      },
    });
  }

  return new Response("Not found", { status: 404 });
}
```

#### CDN Cache Behavior with Vary: Accept

The `Vary: Accept` header is **critical** for correct CDN caching:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CDN Cache Keys                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Without Vary: Accept (WRONG):                                  │
│  Cache key: /photos/2026/01/sunset.webp                         │
│  → First request (Chrome) caches JXL                            │
│  → Firefox gets JXL (can't decode!)                             │
│                                                                 │
│  With Vary: Accept (CORRECT):                                   │
│  Cache key: /photos/2026/01/sunset.webp + Accept header         │
│  → Chrome request: cached as JXL variant                        │
│  → Firefox request: cached as WebP variant                      │
│  → Both browsers get correct format                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Cache hit rate impact:**

- Without negotiation: 100% cache hits (single variant)
- With negotiation: ~90-95% hits (2 variants per image)
- Minor tradeoff for universal compatibility

### Phase 8: Gallery Utilities Update

**File:** `libs/engine/src/lib/utils/gallery.ts`

```typescript
// Add .jxl to supported extensions
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".jxl"];
```

---

## Error Handling & Monitoring

### JXL-Specific Error Tracking

Track JXL encoding failures separately from general upload errors:

```typescript
interface JxlMetrics {
  total_attempts: number;
  successful_encodes: number;
  fallback_to_webp: number;
  encoding_errors: number;
  avg_encoding_time_ms: number;
  avg_compression_ratio: number;
}

// Log encoding result for monitoring
function logJxlEncoding(result: {
  success: boolean;
  fallback: boolean;
  encodingTimeMs: number;
  originalSize: number;
  encodedSize: number;
  error?: string;
}) {
  // Send to analytics (Rings, or external service)
  console.log(
    JSON.stringify({
      event: "jxl_encoding",
      ...result,
      timestamp: new Date().toISOString(),
    }),
  );
}

// In processImage():
const startTime = performance.now();
try {
  const encoded = await encode(imageData, options);
  logJxlEncoding({
    success: true,
    fallback: false,
    encodingTimeMs: performance.now() - startTime,
    originalSize: file.size,
    encodedSize: encoded.byteLength,
  });
} catch (error) {
  logJxlEncoding({
    success: false,
    fallback: true,
    encodingTimeMs: performance.now() - startTime,
    originalSize: file.size,
    encodedSize: 0,
    error: error.message,
  });
  // Fall back to WebP
  return processImageAsWebP(file, options);
}
```

### Alert Thresholds

| Metric            | Warning  | Critical  |
| ----------------- | -------- | --------- |
| JXL fallback rate | >30%     | >50%      |
| Encoding errors   | >5%/hour | >15%/hour |
| Avg encoding time | >5s      | >10s      |

---

## Batch Transcoding Strategy

### When to Transcode Existing Images

**Recommendation:** Start with dual-format for new uploads. Transcode existing images only when:

1. JXL adoption reaches >90% of uploads
2. Storage savings justify R2 egress costs
3. Firefox ships JXL support (reduces need for WebP fallback)

### Cost-Benefit Analysis

| Factor          | Transcode Now             | Transcode Later |
| --------------- | ------------------------- | --------------- |
| Storage savings | Immediate 20-30%          | Delayed         |
| R2 egress       | $0.36/GB to read existing | None            |
| CPU (Workers)   | High (batch processing)   | Amortized       |
| Complexity      | High (queue, progress)    | Low             |
| Risk            | Medium (bulk changes)     | Low             |

**Break-even calculation:**

```
Storage cost: $0.015/GB/month
Egress cost: $0.36/GB (one-time)

If JXL saves 25% storage:
- 1GB WebP → 0.75GB JXL
- Monthly savings: $0.00375/GB

Break-even: $0.36 / $0.00375 = 96 months

Conclusion: NOT worth transcoding existing unless:
- Storage is constrained
- Firefox adopts JXL (can drop WebP)
- User requests export in JXL
```

### Batch Job Implementation (If Needed)

```typescript
// Durable Object for batch transcoding
export class BatchTranscoder {
  async transcode(batchSize: number = 100) {
    const images = await this.getWebpOnlyImages(batchSize);

    for (const image of images) {
      // Read from R2
      const webpData = await env.IMAGES.get(image.r2_key);
      if (!webpData) continue;

      // Decode WebP, encode JXL
      const imageData = await decodeWebP(webpData);
      const jxlData = await encodeJxl(imageData, { quality: 80, effort: 7 });

      // Store JXL variant
      const jxlKey = image.r2_key.replace(".webp", ".jxl");
      await env.IMAGES.put(jxlKey, jxlData);

      // Update database
      await this.markTranscoded(image.id, jxlKey, jxlData.byteLength);

      // Rate limit to avoid Worker CPU limits
      await sleep(100);
    }
  }
}
```

---

## Rollback Plan

### Feature Flag Prerequisite

> **NOTE**: Grove does not currently have a feature flag system implemented. Before implementing JXL rollout, a feature flag system should be designed and built.
>
> **Tracking**: See TODOS.md → "Feature Flags System (Infrastructure)" for planning task.
>
> **Interim solution**: Use environment variable (`JXL_ENCODING_ENABLED=true/false`) in `wrangler.toml` for basic toggle until proper feature flags exist.

### Feature Flag Disable (Future)

Once feature flags are implemented, JXL can be disabled via flag:

```typescript
// Example feature flag check (implementation TBD)
// In imageProcessor
if (!isFeatureEnabled("jxl_encoding")) {
  return processImageAsWebP(file, options);
}

// Interim: environment variable approach
const JXL_ENABLED = env.JXL_ENCODING_ENABLED === "true";
if (!JXL_ENABLED) {
  return processImageAsWebP(file, options);
}
```

### Handling Existing JXL Images After Rollback

If JXL is disabled, existing JXL images still need to be served:

```
┌─────────────────────────────────────────────────────────────────┐
│                 Rollback Scenarios                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Scenario A: Browser supports JXL (Chrome, Safari)              │
│  → Continue serving JXL images normally                         │
│  → New uploads fall back to WebP                                │
│                                                                 │
│  Scenario B: Browser doesn't support JXL (Firefox)              │
│  → If dual-format stored: serve WebP fallback                   │
│  → If JXL-only: on-demand transcode to WebP                     │
│                                                                 │
│  Scenario C: Complete JXL deprecation                           │
│  → Batch transcode all JXL → WebP                               │
│  → Delete JXL variants                                          │
│  → Update database records                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Emergency On-Demand Transcoding

If JXL images exist but need to be served as WebP:

```typescript
// Worker middleware for emergency fallback
async function handleImageRequest(request: Request, env: Env) {
  const url = new URL(request.url);
  const accept = request.headers.get("Accept") || "";

  // Client wants JXL and we have it? Serve it.
  if (accept.includes("image/jxl")) {
    const jxlObject = await env.IMAGES.get(url.pathname);
    if (jxlObject) return serveImage(jxlObject, "image/jxl");
  }

  // Client doesn't support JXL, check for WebP fallback
  const webpKey = url.pathname.replace(".jxl", ".webp");
  const webpObject = await env.IMAGES.get(webpKey);
  if (webpObject) return serveImage(webpObject, "image/webp");

  // No WebP fallback exists - transcode on demand (expensive!)
  const jxlObject = await env.IMAGES.get(url.pathname);
  if (jxlObject && url.pathname.endsWith(".jxl")) {
    const webpBlob = await transcodeJxlToWebp(jxlObject);
    // Cache the transcoded version for future requests
    await env.IMAGES.put(webpKey, webpBlob);
    return serveImage(webpBlob, "image/webp");
  }

  return new Response("Not found", { status: 404 });
}
```

### Rollback Checklist

- [ ] Disable `jxl_encoding` feature flag
- [ ] Monitor error rates (should decrease)
- [ ] Verify WebP fallback serving works
- [ ] Check CDN cache invalidation if needed
- [ ] Communicate to users if visible impact
- [ ] Schedule post-mortem to identify root cause

---

## Migration Strategy

### Stage 1: New Uploads Only

1. Deploy JXL encoding support
2. New uploads get JXL (if browser supports) OR WebP
3. Existing images remain WebP
4. No content negotiation needed yet

### Stage 2: Dual Format Storage

1. Upload stores both JXL and WebP versions
2. JXL as primary, WebP as fallback
3. Implement content negotiation

### Stage 3: Batch Transcoding (Optional)

1. Background job to transcode existing WebP → JXL
2. Keep WebP versions for fallback
3. Gradual migration, no user impact

### Stage 4: WebP Deprecation (Future)

1. Monitor Firefox JXL adoption
2. When coverage >95%, consider dropping WebP fallback
3. Transcode remaining WebP-only images

---

## Storage Implications

### Size Comparison Estimates

| Scenario         | WebP  | JXL   | Savings |
| ---------------- | ----- | ----- | ------- |
| Photo (2MB orig) | 400KB | 280KB | 30%     |
| Screenshot (1MB) | 200KB | 100KB | 50%     |
| Graphic (500KB)  | 80KB  | 60KB  | 25%     |

### Dual Storage Cost

- **R2 pricing:** $0.015/GB/month
- **Typical image:** ~200KB WebP + ~150KB JXL = 350KB
- **Without dual:** ~200KB WebP
- **Overhead:** 75% more storage, but JXL alone would be 25% less

**Net result:** Dual storage costs ~25-50% more than WebP-only, but provides universal compatibility. Once Firefox adopts JXL, can phase out WebP.

---

## Code Changes Summary

### Files to Modify

| File                                                      | Change                             |
| --------------------------------------------------------- | ---------------------------------- |
| `libs/engine/package.json`                            | Add `@jsquash/jxl` dependency      |
| `libs/engine/src/lib/utils/imageProcessor.ts`         | Add JXL encoding, format detection |
| `libs/engine/src/routes/api/images/upload/+server.ts` | Add JXL MIME type, magic bytes     |
| `libs/engine/src/lib/server/services/storage.ts`      | Add JXL to allowed types           |
| `libs/engine/src/routes/admin/images/+page.svelte`    | Format selector UI                 |
| `libs/engine/src/lib/utils/gallery.ts`                | Add `.jxl` extension               |

### Files to Create

| File                                   | Purpose                           |
| -------------------------------------- | --------------------------------- |
| `libs/engine/src/lib/utils/jxl.ts` | JXL-specific utilities (optional) |

### Documentation to Update

| Document                   | Update                                            |
| -------------------------- | ------------------------------------------------- |
| `docs/specs/amber-spec.md` | Update image format references                    |
| Knowledge base article     | "How Grove saves storage with modern compression" |

---

## Testing Plan

### Unit Tests

```typescript
describe("imageProcessor", () => {
  it("encodes to JXL when WASM available", async () => {
    const file = createTestImage("test.jpg", 1000, 1000);
    const result = await processImage(file, { format: "jxl" });
    expect(result.blob.type).toBe("image/jxl");
  });

  it("falls back to WebP when JXL unavailable", async () => {
    // Mock WASM unavailable
    const file = createTestImage("test.jpg", 1000, 1000);
    const result = await processImage(file, { format: "auto" });
    expect(result.blob.type).toBe("image/webp");
  });

  it("preserves GIFs regardless of format setting", async () => {
    const file = createTestGif("animation.gif");
    const result = await processImage(file, { format: "jxl" });
    expect(result.blob.type).toBe("image/gif");
    expect(result.skipped).toBe(true);
  });

  // CRITICAL: Privacy test - verify EXIF stripping works with JXL
  it("strips EXIF/GPS metadata from JXL output", async () => {
    // Create test image WITH EXIF data (GPS coordinates, camera info)
    const fileWithExif = await createImageWithExif("test-with-gps.jpg", {
      GPSLatitude: 37.7749,
      GPSLongitude: -122.4194,
      Make: "TestCamera",
      Model: "TestModel",
    });

    const result = await processImage(fileWithExif, { format: "jxl" });

    // Parse output JXL and verify no EXIF present
    const exifData = await extractExifFromBlob(result.blob);
    expect(exifData).toBeNull();
    // Or more specifically:
    expect(exifData?.GPSLatitude).toBeUndefined();
    expect(exifData?.Make).toBeUndefined();
  });
});
```

> **IMPORTANT**: The EXIF stripping test is critical for privacy. Grove strips location data as a selling point. If this test fails, the JXL encoding path must be fixed or disabled.

### Integration Tests

```typescript
describe("image upload", () => {
  it("accepts JXL uploads", async () => {
    const jxlBlob = await createJxlBlob();
    const response = await uploadImage(jxlBlob);
    expect(response.status).toBe(200);
    expect(response.body.type).toBe("image/jxl");
  });

  it("validates JXL magic bytes", async () => {
    const fakeJxl = new Blob(["not a jxl"], { type: "image/jxl" });
    const response = await uploadImage(fakeJxl);
    expect(response.status).toBe(400);
  });
});
```

### E2E Tests

**Upload Tests:**

1. Upload image in Chrome (should use JXL)
2. Upload same image in Firefox (should use WebP)

**Content Negotiation Tests:** 3. Request image with `Accept: image/jxl, image/webp, */*` → should serve JXL 4. Request image with `Accept: image/webp, */*` → should serve WebP 5. Verify `Vary: Accept` header present in all image responses 6. Verify `X-Content-Type-Options: nosniff` header present

**CDN Cache Tests:**

```typescript
describe("content negotiation", () => {
  it("serves JXL to Chrome with correct headers", async () => {
    const response = await fetch("/photos/2026/01/test.jxl", {
      headers: { Accept: "image/jxl, image/webp, */*" },
    });

    expect(response.headers.get("Content-Type")).toBe("image/jxl");
    expect(response.headers.get("Vary")).toBe("Accept");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("serves WebP fallback to Firefox", async () => {
    const response = await fetch("/photos/2026/01/test.jxl", {
      headers: { Accept: "image/webp, image/png, */*" }, // No JXL
    });

    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Vary")).toBe("Accept");
  });
});
```

---

## Benchmarking Plan

Before full rollout, benchmark on real Grove images:

```typescript
async function benchmarkCompression() {
  const testImages = await getRecentUploads(100);

  for (const image of testImages) {
    const original = await fetchImage(image.url);

    // Encode to both formats
    const webp = await encodeWebP(original, { quality: 80 });
    const jxl = await encodeJxl(original, { quality: 80, effort: 7 });

    // Compare
    results.push({
      original: original.size,
      webp: webp.size,
      jxl: jxl.size,
      webpSavings: (1 - webp.size / original.size) * 100,
      jxlSavings: (1 - jxl.size / original.size) * 100,
      jxlVsWebp: (1 - jxl.size / webp.size) * 100,
    });
  }

  // Log aggregate stats
  console.log(
    "Average JXL vs WebP savings:",
    avg(results.map((r) => r.jxlVsWebp)),
  );
}
```

---

## Rollout Plan

### Week 1: Foundation

- [ ] Add `@jsquash/jxl` dependency
- [ ] Update `imageProcessor.ts` with JXL encoding
- [ ] Add JXL to upload endpoint allowed types
- [ ] Run benchmarks on sample images

### Week 2: UI & Testing

- [ ] Update admin UI with format selector
- [ ] Write unit and integration tests
- [ ] Test across browsers (Chrome, Safari, Firefox, Edge)

### Week 3: Feature Flag Rollout

- [ ] Deploy behind feature flag
- [ ] Enable for internal testing
- [ ] Monitor compression ratios and error rates

### Week 4: Gradual Rollout

- [ ] Enable for 10% of users
- [ ] Monitor storage metrics
- [ ] Check CDN cache hit rates
- [ ] Enable for 50%, then 100%

### Week 5+: Content Negotiation

- [ ] Implement serving-side content negotiation
- [ ] Consider dual-format storage
- [ ] Create batch transcoding job for existing images

---

## Open Questions

### Technical

1. **Server-side fallback:** If client-side JXL encoding fails, should we:
   - Upload original and transcode on server?
   - Fall back to WebP on client?
   - Both?

2. **Dual storage:** Store both JXL + WebP, or transcode on-demand?
   - Dual: More storage, simpler serving
   - On-demand: Less storage, higher CPU

3. **Effort level:** @jsquash/jxl `effort` parameter (1-9):
   - Higher = better compression, slower encoding
   - Suggested: 7 (balanced)

### Product

1. Should users be able to force WebP output even when JXL is available?
2. Show compression savings comparison (JXL vs WebP)?
3. Badge/indicator for JXL images in gallery?

### Operations

1. Monitor JXL encoding errors separately from WebP?
2. Alert threshold for JXL fallback rate?

---

## Resources

### Libraries

- **@jsquash/jxl:** https://www.npmjs.com/package/@jsquash/jxl
- **jSquash examples:** https://github.com/jamsinclair/jSquash/tree/main/examples
- **libjxl reference:** https://github.com/libjxl/libjxl

### Browser Support

- **Chrome JXL status:** https://chromestatus.com/feature/5188299478007808
- **Safari JXL:** Supported since Safari 17 (macOS Sonoma, iOS 17)
- **Firefox:** Bug 1539075 (still open)

### Cloudflare

- **Image Resizing limits:** Does not output JXL (only WebP, AVIF, JPEG, PNG)
- **Workers WASM:** Fully supported, no dynamic code restrictions with @jsquash

---

## Success Metrics

| Metric                                    | Target                 |
| ----------------------------------------- | ---------------------- |
| Average file size reduction (JXL vs WebP) | >20%                   |
| JXL encoding success rate                 | >95%                   |
| Client-side encoding time                 | <3s for typical images |
| Browser fallback rate                     | <25% (Firefox users)   |
| User-visible errors                       | 0                      |

---

_Document version: 1.2_
_Created: 2026-01-13_
_Updated: 2026-01-13_
_Author: Claude (AI-assisted research and planning)_

### Changelog

**v1.2** (2026-01-13):

- **BUGFIX**: Fixed magic byte validation to use per-pattern minLength (codestream: 2 bytes, container: 12 bytes)
- Added EXIF stripping verification test requirement (privacy critical)
- Capped effort level at 7 for all devices (was 9 for high-end, exceeded 3s target)
- Added detailed E2E tests for content negotiation headers
- Noted feature flags system as prerequisite (Grove doesn't have one yet)
- Added interim environment variable solution for JXL toggle
- Adjusted encoding time target from <2s to <3s

**v1.1** (2026-01-13):

- Added WASM lazy loading guidance to avoid bundle bloat
- Added adaptive effort levels for mobile/desktop/high-end devices
- Added ProcessedImageResult interface with explicit format field
- Added database schema update with image_format column
- Added JXL-specific error tracking and monitoring
- Added CDN cache behavior documentation (Vary: Accept)
- Added comprehensive rollback plan with feature flags
- Added batch transcoding cost-benefit analysis
- Enhanced magic byte validation with length checks
- Added X-Content-Type-Options security header

**v1.0** (2026-01-13):

- Initial spec with architecture, implementation plan, and testing strategy
