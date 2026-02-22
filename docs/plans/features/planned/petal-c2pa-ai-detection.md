---
title: "Plan: AI-Generated Image Detection via C2PA Content Credentials"
status: planned
category: features
---

# Plan: AI-Generated Image Detection via C2PA Content Credentials

**Issue:** #695 - Add AI-generated image detection via metadata watermarks
**Status:** Ready for implementation
**Created:** 2026-01-27

---

## Executive Summary

Add C2PA Content Credentials detection as a new "Layer 0" in Petal's content moderation pipeline. This provides a boolean `isAiGenerated` flag for images containing provenance metadata from compliant AI generators (DALL-E 3, Adobe Firefly, etc.).

**Critical discovery:** SynthID image detection is NOT publicly available - Google only open-sourced text watermarking. C2PA is the only viable approach today.

---

## What's Detectable

| Source | Detectable? | Method |
|--------|-------------|--------|
| OpenAI DALL-E 3 | ✅ Yes | C2PA manifest |
| Adobe Firefly | ✅ Yes | C2PA manifest |
| Sony Cameras (2026+) | ✅ Yes | C2PA manifest |
| Google Gemini/Imagen | ❌ No | SynthID (no public API) |
| Midjourney | ❌ No | Proprietary watermark |
| Stable Diffusion | ❌ No | Optional/fragile |
| Grok | ❌ No | No watermarking |

This is a **partial solution by design** - coverage will grow as more generators adopt C2PA.

---

## Architecture

### New Layer 0: C2PA Metadata Extraction

```
┌─────────────────────────────────────────────────────────────────┐
│  Image Upload                                                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────▼─────────────────────┐
        │  Layer 0: C2PA Extraction (NEW)           │  ← Fast, non-blocking
        │  - Parse JUMBF box structure              │     ~5ms typical
        │  - Extract AI generation assertions       │
        │  - Set isAiGenerated flag                 │
        └─────────────────────┬─────────────────────┘
                              │
        ┌─────────────────────▼─────────────────────┐
        │  Layer 1: CSAM Detection (MANDATORY)      │
        └─────────────────────┬─────────────────────┘
                              │
        ┌─────────────────────▼─────────────────────┐
        │  Layer 2: Content Classification          │
        └─────────────────────┬─────────────────────┘
                              │
        ┌─────────────────────▼─────────────────────┐
        │  Layer 3: Sanity Checks                   │
        └─────────────────────┬─────────────────────┘
                              │
        ┌─────────────────────▼─────────────────────┐
        │  PetalResult                              │
        │  {                                        │
        │    allowed: true,                         │
        │    isAiGenerated: true,          ← NEW    │
        │    aiProvenance: {               ← NEW    │
        │      generator: "DALL-E 3",               │
        │      source: "c2pa"                       │
        │    },                                     │
        │    ...existing fields                     │
        │  }                                        │
        └───────────────────────────────────────────┘
```

### Why Layer 0?

1. **Fast** - Metadata parsing takes ~5ms, runs before expensive vision inference
2. **Non-blocking** - Failures don't stop uploads (just return `isAiGenerated: null`)
3. **Privacy-first** - Only reads C2PA boxes, ignores EXIF location/camera data
4. **Clean separation** - Provenance ≠ content safety

---

## Implementation

### Library Choice: Pure TypeScript (MVP)

**Recommended:** `@trustnxt/c2pa-ts` - Pure TypeScript, no WASM complexity

```typescript
import { C2paManifestReader } from '@trustnxt/c2pa-ts';
```

**Why not WASM?**
- Simpler build pipeline
- No bundle size concerns (Workers have 25MB limit, but simpler is better)
- Can migrate to `c2pa-rs` WASM later if performance demands it

**Trade-off:** No cryptographic signature validation in MVP. This is acceptable because:
- Legitimate AI tools embed C2PA; bad actors strip it anyway
- Validation doesn't change the threat model
- Can add validation in Phase 2 if needed

### Files to Create/Modify

| File | Change |
|------|--------|
| `libs/engine/src/lib/server/petal/layer0-c2pa.ts` | **NEW** - C2PA extraction |
| `libs/engine/src/lib/server/petal/types.ts` | Add `C2PAResult`, extend `PetalResult` |
| `libs/engine/src/lib/server/petal/index.ts` | Call Layer 0 in `scanImage()` |
| `libs/engine/package.json` | Add `@trustnxt/c2pa-ts` dependency |

### Type Definitions

```typescript
// types.ts additions

/** Layer 0: C2PA Content Credentials Result */
export interface C2PAResult {
  /** Whether C2PA parsing succeeded */
  parsed: boolean;
  /** Whether image claims AI generation (null if no manifest or parse failure) */
  isAiGenerated: boolean | null;
  /** Human-readable generator name */
  generator?: string;
  /** Raw digitalSourceType URI (for debugging) */
  digitalSourceType?: string;
  /** Processing time */
  processingTimeMs?: number;
  /** Error if parsing failed (internal only) */
  error?: string;
}

// Extend PetalResult
export interface PetalResult {
  // ...existing fields

  /** C2PA AI generation detection */
  isAiGenerated?: boolean | null;
  /** AI provenance details (if detected) */
  aiProvenance?: {
    generator?: string;
    source: 'c2pa' | 'synthid' | 'unknown';  // Future-proof
  };
  layers: {
    c2pa?: C2PAResult;  // NEW
    csam?: CSAMResult;
    classification?: ClassificationResult;
    sanity?: SanityResult;
    output?: OutputVerificationResult;
  };
}
```

### Core Detection Logic

```typescript
// layer0-c2pa.ts

const AI_SOURCE_TYPES = [
  'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
  'http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia',
  'http://cv.iptc.org/newscodes/digitalsourcetype/algorithmicallyEnhanced',
];

export async function runLayer0(
  imageData: Uint8Array,
  mimeType: string,
): Promise<C2PAResult> {
  const startTime = Date.now();

  try {
    // Parse with timeout protection
    const manifest = await withTimeout(
      parseC2PAManifest(imageData, mimeType),
      500 // 500ms max
    );

    if (!manifest) {
      return {
        parsed: true,
        isAiGenerated: null, // No C2PA present
        processingTimeMs: Date.now() - startTime,
      };
    }

    const digitalSourceType = extractDigitalSourceType(manifest);
    const isAiGenerated = AI_SOURCE_TYPES.some(
      type => digitalSourceType?.includes(type)
    );

    return {
      parsed: true,
      isAiGenerated: isAiGenerated || null,
      generator: extractGeneratorName(manifest),
      digitalSourceType,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    // Non-blocking - log and continue
    console.warn('[Petal] C2PA parsing failed:', err);
    return {
      parsed: false,
      isAiGenerated: null,
      error: err instanceof Error ? err.message : 'Unknown error',
      processingTimeMs: Date.now() - startTime,
    };
  }
}
```

### Integration in scanImage()

```typescript
// index.ts - add after hash computation, before Layer 1

// Layer 0: C2PA Extraction (non-blocking)
const c2paResult = await runLayer0(imageData, mimeType);

// ... existing layers ...

// Include in final result
return {
  allowed: true,
  decision: "allow",
  isAiGenerated: c2paResult.isAiGenerated,  // NEW
  aiProvenance: c2paResult.isAiGenerated ? {  // NEW
    generator: c2paResult.generator,
    source: 'c2pa',
  } : undefined,
  layers: {
    c2pa: c2paResult,  // NEW
    csam: csamResult,
    classification: classificationResult,
    sanity: sanityResult,
  },
  // ...
};
```

---

## Failure Handling

| Scenario | Behavior | Reason |
|----------|----------|--------|
| No C2PA manifest | `isAiGenerated: null` | Most images don't have C2PA |
| Malformed manifest | `isAiGenerated: null`, log error | Don't block uploads |
| Timeout (>500ms) | `isAiGenerated: null`, log | Prevent blocking |
| Library exception | `isAiGenerated: null`, log | Graceful degradation |

**Principle:** C2PA failures NEVER block uploads. This is informational metadata, not safety-critical.

---

## Testing Strategy

### Unit Tests
```typescript
describe('Layer 0: C2PA', () => {
  it('detects DALL-E 3 generated images', async () => {
    const result = await runLayer0(dalleTestImage, 'image/jpeg');
    expect(result.isAiGenerated).toBe(true);
    expect(result.generator).toContain('DALL-E');
  });

  it('returns null for images without C2PA', async () => {
    const result = await runLayer0(regularPhoto, 'image/jpeg');
    expect(result.isAiGenerated).toBeNull();
  });

  it('handles malformed manifests gracefully', async () => {
    const result = await runLayer0(corruptedImage, 'image/jpeg');
    expect(result.parsed).toBe(false);
    expect(result.isAiGenerated).toBeNull();
  });

  it('respects 500ms timeout', async () => {
    const start = Date.now();
    const result = await runLayer0(slowImage, 'image/jpeg');
    expect(Date.now() - start).toBeLessThan(600);
  });
});
```

### Test Fixtures
- Download real C2PA images from contentcredentials.org
- Generate DALL-E images via API for integration tests
- Create mock manifests for edge cases

---

## Verification Checklist

1. [ ] `pnpm install` succeeds with new dependency
2. [ ] Unit tests pass for all C2PA scenarios
3. [ ] Upload a known DALL-E 3 image → `isAiGenerated: true`
4. [ ] Upload a regular photo → `isAiGenerated: null`
5. [ ] Upload a corrupted image → no crash, `isAiGenerated: null`
6. [ ] Response includes `aiProvenance` when detected
7. [ ] Processing time stays under 500ms for Layer 0

---

## Future Enhancements (Not This PR)

1. **UI Flag** - Show "AI Generated" badge in Wayfinder admin
2. **Analytics** - Track AI-generated upload volume
3. **Signature Validation** - Verify C2PA manifests aren't spoofed
4. **SynthID Support** - If Google releases public API
