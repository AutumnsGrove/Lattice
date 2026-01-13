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

| Aspect | WebP | JPEG XL |
|--------|------|---------|
| Compression ratio | Good | 20-60% smaller at same quality |
| Lossless support | Yes | Yes (better) |
| Progressive decode | Limited | Excellent |
| HDR support | No | Yes |
| Animation | Yes | Yes |
| Browser support | Universal | Chrome, Safari 17+, Edge (Firefox pending) |

### Grove's Image Pipeline Goals

1. **Quality preservation** - Grove's selling point is aggressive-yet-quality-preserving compression
2. **Storage efficiency** - Smaller files = lower R2 costs, faster loads
3. **Universal compatibility** - Images must work in all browsers
4. **Privacy protection** - EXIF/GPS stripping must continue

---

## Current Implementation Analysis

### Client-Side Processing

**File:** `packages/engine/src/lib/utils/imageProcessor.ts`

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

**File:** `packages/engine/src/routes/api/images/upload/+server.ts`

- Accepts: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Magic byte validation for each type
- No server-side transcoding (trusts client-processed blob)
- Stores directly to R2 with 1-year cache headers

### Storage Service

**File:** `packages/engine/src/lib/server/services/storage.ts`

- `ALLOWED_CONTENT_TYPES` includes: jpeg, png, gif, webp, avif
- Cache control: `public, max-age=31536000, immutable` for images
- No JXL support currently

### Admin UI

**File:** `packages/engine/src/routes/admin/images/+page.svelte`

- "Convert to WebP" toggle (default: on)
- Quality slider (10-100%, default: 80%)
- "Full Resolution" toggle (default: off)
- Shows compression ratio after upload

---

## Browser Support Reality

### Native JXL Decode Support (January 2026)

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome/Chromium 124+ | Merging to mainline | Was behind flag, now default |
| Safari 17+ | Full support | macOS Sonoma, iOS 17+ |
| Edge | Follows Chromium | Same timeline as Chrome |
| Firefox | Pending | Waiting on Rust decoder |

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
pnpm add @jsquash/jxl -w --filter @autumnsgrove/groveengine
```

**Package details:**
- NPM: `@jsquash/jxl`
- License: Apache-2.0
- Size: ~800KB WASM encoder
- Cloudflare Workers compatible (no dynamic code execution)

### Phase 2: Update imageProcessor.ts

```typescript
// New imports
import { encode as encodeJxl } from '@jsquash/jxl';

export interface ProcessImageOptions {
  quality?: number;
  convertToWebP?: boolean;      // Deprecated, kept for backward compat
  convertToJxl?: boolean;       // New default
  fullResolution?: boolean;
  format?: 'auto' | 'jxl' | 'webp' | 'original';  // New
}

/**
 * Detect if browser supports WASM-based JXL encoding
 */
export async function supportsJxlEncoding(): Promise<boolean> {
  try {
    // Check for WASM support
    if (typeof WebAssembly !== 'object') return false;

    // Try to load the JXL encoder
    await import('@jsquash/jxl');
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
  options: ProcessImageOptions = {}
): Promise<ProcessedImageResult> {
  const {
    quality = 80,
    format = 'auto',
    fullResolution = false
  } = options;

  // GIFs preserved for animation
  if (file.type === 'image/gif') {
    return { /* existing GIF handling */ };
  }

  // Determine target format
  let targetFormat: 'jxl' | 'webp' = 'webp';

  if (format === 'jxl' || format === 'auto') {
    const canUseJxl = await supportsJxlEncoding();
    if (canUseJxl) targetFormat = 'jxl';
  }

  // Load and resize image via canvas (strips EXIF)
  const img = await loadImage(file);
  const { width, height } = calculateTargetDimensions(img, quality, fullResolution);
  const imageData = getImageData(img, width, height);

  // Encode to target format
  let blob: Blob;

  if (targetFormat === 'jxl') {
    const encoded = await encodeJxl(imageData, {
      quality,
      effort: 7,        // Balanced speed/compression
      lossless: false,
      progressive: true // Better loading UX
    });
    blob = new Blob([encoded], { type: 'image/jxl' });
  } else {
    // WebP fallback via Canvas API
    blob = await canvasToWebP(imageData, quality);
  }

  return {
    blob,
    width,
    height,
    originalSize: file.size,
    processedSize: blob.size,
    format: targetFormat
  };
}
```

### Phase 3: Update Upload Endpoint

**File:** `packages/engine/src/routes/api/images/upload/+server.ts`

```typescript
// Add JXL to allowed types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/jxl'  // New
];

// Add JXL magic bytes
const FILE_SIGNATURES: Record<string, number[][]> = {
  // ... existing ...
  'image/jxl': [
    [0x00, 0x00, 0x00, 0x0C, 0x4A, 0x58, 0x4C, 0x20], // Container format
    [0xFF, 0x0A]  // Codestream format
  ]
};

// Add extension mapping
const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  // ... existing ...
  'image/jxl': ['jxl']
};
```

### Phase 4: Update Storage Service

**File:** `packages/engine/src/lib/server/services/storage.ts`

```typescript
const ALLOWED_CONTENT_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/jxl',  // New
  // ... rest unchanged
]);

const CACHE_CONTROL: Record<string, string> = {
  // ... existing ...
  'image/jxl': 'public, max-age=31536000, immutable'  // New
};
```

### Phase 5: Update Admin UI

**File:** `packages/engine/src/routes/admin/images/+page.svelte`

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

### Phase 6: Content Negotiation for Serving

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
  const accept = request.headers.get('Accept') || '';

  // Check if client accepts JXL
  const acceptsJxl = accept.includes('image/jxl');

  // Try JXL version first if supported
  if (acceptsJxl) {
    const jxlKey = url.pathname.replace(/\.(webp|jpg|png)$/, '.jxl');
    const jxlObject = await env.IMAGES.get(jxlKey);
    if (jxlObject) {
      return new Response(jxlObject.body, {
        headers: {
          'Content-Type': 'image/jxl',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Vary': 'Accept'  // Important for CDN caching
        }
      });
    }
  }

  // Fall back to WebP/original
  const object = await env.IMAGES.get(url.pathname);
  if (object) {
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept'
      }
    });
  }

  return new Response('Not found', { status: 404 });
}
```

### Phase 7: Gallery Utilities Update

**File:** `packages/engine/src/lib/utils/gallery.ts`

```typescript
// Add .jxl to supported extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.jxl'];
```

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

| Scenario | WebP | JXL | Savings |
|----------|------|-----|---------|
| Photo (2MB orig) | 400KB | 280KB | 30% |
| Screenshot (1MB) | 200KB | 100KB | 50% |
| Graphic (500KB) | 80KB | 60KB | 25% |

### Dual Storage Cost

- **R2 pricing:** $0.015/GB/month
- **Typical image:** ~200KB WebP + ~150KB JXL = 350KB
- **Without dual:** ~200KB WebP
- **Overhead:** 75% more storage, but JXL alone would be 25% less

**Net result:** Dual storage costs ~25-50% more than WebP-only, but provides universal compatibility. Once Firefox adopts JXL, can phase out WebP.

---

## Code Changes Summary

### Files to Modify

| File | Change |
|------|--------|
| `packages/engine/package.json` | Add `@jsquash/jxl` dependency |
| `packages/engine/src/lib/utils/imageProcessor.ts` | Add JXL encoding, format detection |
| `packages/engine/src/routes/api/images/upload/+server.ts` | Add JXL MIME type, magic bytes |
| `packages/engine/src/lib/server/services/storage.ts` | Add JXL to allowed types |
| `packages/engine/src/routes/admin/images/+page.svelte` | Format selector UI |
| `packages/engine/src/lib/utils/gallery.ts` | Add `.jxl` extension |

### Files to Create

| File | Purpose |
|------|---------|
| `packages/engine/src/lib/utils/jxl.ts` | JXL-specific utilities (optional) |

### Documentation to Update

| Document | Update |
|----------|--------|
| `docs/specs/amber-spec.md` | Update image format references |
| Knowledge base article | "How Grove saves storage with modern compression" |

---

## Testing Plan

### Unit Tests

```typescript
describe('imageProcessor', () => {
  it('encodes to JXL when WASM available', async () => {
    const file = createTestImage('test.jpg', 1000, 1000);
    const result = await processImage(file, { format: 'jxl' });
    expect(result.blob.type).toBe('image/jxl');
  });

  it('falls back to WebP when JXL unavailable', async () => {
    // Mock WASM unavailable
    const file = createTestImage('test.jpg', 1000, 1000);
    const result = await processImage(file, { format: 'auto' });
    expect(result.blob.type).toBe('image/webp');
  });

  it('preserves GIFs regardless of format setting', async () => {
    const file = createTestGif('animation.gif');
    const result = await processImage(file, { format: 'jxl' });
    expect(result.blob.type).toBe('image/gif');
    expect(result.skipped).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('image upload', () => {
  it('accepts JXL uploads', async () => {
    const jxlBlob = await createJxlBlob();
    const response = await uploadImage(jxlBlob);
    expect(response.status).toBe(200);
    expect(response.body.type).toBe('image/jxl');
  });

  it('validates JXL magic bytes', async () => {
    const fakeJxl = new Blob(['not a jxl'], { type: 'image/jxl' });
    const response = await uploadImage(fakeJxl);
    expect(response.status).toBe(400);
  });
});
```

### E2E Tests

1. Upload image in Chrome (should use JXL)
2. Upload same image in Firefox (should use WebP)
3. View image in Chrome (should serve JXL)
4. View image in Firefox (should serve WebP fallback)

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
      jxlVsWebp: (1 - jxl.size / webp.size) * 100
    });
  }

  // Log aggregate stats
  console.log('Average JXL vs WebP savings:', avg(results.map(r => r.jxlVsWebp)));
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

| Metric | Target |
|--------|--------|
| Average file size reduction (JXL vs WebP) | >20% |
| JXL encoding success rate | >95% |
| Client-side encoding time | <2s for typical images |
| Browser fallback rate | <25% (Firefox users) |
| User-visible errors | 0 |

---

*Document version: 1.0*
*Created: 2026-01-13*
*Author: Claude (AI-assisted research and planning)*
