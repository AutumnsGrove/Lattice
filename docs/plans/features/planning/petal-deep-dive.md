---
title: "Petal Image Moderation — Deep Dive Reference"
description: "Full architecture reference for Petal's 4-layer image moderation pipeline: CSAM detection, content classification, sanity checks, and output verification"
category: features
status: planning
created: 2026-02-21
---

# Petal Image Moderation — Deep Dive Reference

> *Four layers of protection, from CSAM detection to AI output verification. This document captures the full architecture for reference.*
>
> **Last updated**: February 2026
> **Location**: `libs/engine/src/lib/server/petal/` (13 files)
> **Config**: `libs/engine/src/lib/config/petal.ts` (375 lines)
> **Migrations**: `030_petal.sql`, `031_petal_upload_gate.sql`

-----

## File Map

| File | Purpose |
|------|---------|
| `index.ts` | Main entry: `scanImage`, `quickScan`, `tryonScan`, `verifyOutput` |
| `types.ts` | All type definitions |
| `layer1-csam.ts` | Layer 1: CSAM detection (PhotoDNA + vision fallback) |
| `layer2-classify.ts` | Layer 2: Content classification against 13 categories |
| `layer3-sanity.ts` | Layer 3: Context-specific validation (faces, quality, screenshots) |
| `layer4-output.ts` | Layer 4: AI-generated output verification with retry |
| `vision-client.ts` | Vision model inference with provider failover |
| `photodna-client.ts` | PhotoDNA hash-based CSAM client |
| `lumen-classify.ts` | Alternative classification via Lumen router |
| `logging.ts` | Security event logging, abuse pattern detection |
| `petal.test.ts` | Integration tests |
| `petal-integration.test.ts` | Full pipeline integration tests |
| `lumen-classify.test.ts` | Lumen classification tests |

-----

## The 4-Layer Pipeline

```
Image Upload
    │
    ▼
┌─────────────────────────────────────┐
│  Layer 1: CSAM Detection (MANDATORY)│
│  PhotoDNA → Vision Model fallback   │
│  FAILS CLOSED — blocks if uncertain │
│  NCMEC report queued if detected    │
│  Never reveals detection to user    │
└──────────────┬──────────────────────┘
               │ safe
               ▼
┌─────────────────────────────────────┐
│  Layer 2: Content Classification    │
│  13 categories, confidence 0-1     │
│  Block ≥0.9, Review ≥0.8          │
│  Context check ≥0.7, Monitor ≥0.5 │
└──────────────┬──────────────────────┘
               │ appropriate
               ▼
┌─────────────────────────────────────┐
│  Layer 3: Sanity Checks             │
│  Context-dependent requirements:    │
│  tryon: 1 face, no screenshots     │
│  profile: face required, ≤3 faces  │
│  blog/general: lenient             │
└──────────────┬──────────────────────┘
               │ valid
               ▼
           ✅ ALLOWED
```

For AI-generated images, Layer 4 re-runs classification on the output before delivery.

-----

## Layer 1: CSAM Detection

**Function**: `runLayer1(image, mimeType, contentHash, options)`

### Detection cascade (priority order)

1. **PhotoDNA** (primary) — perceptual hash matching against NCMEC database
   - Application submitted to Microsoft: 2025-01-30
   - Awaiting approval (~1 week via Tech Coalition)
   - Returns match confidence 0–100, tracking ID for audit

2. **Vision Model** (fallback) — checks for `minor_present` at ≥0.7 confidence
   - Catches novel content not in hash database
   - Used when PhotoDNA unavailable

3. **Cloudflare CSAM Tool** (CDN-level, async) — fuzzy hashing at serve time
   - Enabled in Cloudflare Dashboard

### Critical behaviors

- PhotoDNA match → `safe: false`, `mustReport: true`
- Detection → `flagAccountForCSAM()` + `queueNCMECReport()`
- **Never reveals CSAM detection to user** — returns generic "This image could not be processed"
- **FAILS CLOSED** — if all providers fail, upload blocked
- **Legal**: 18 U.S.C. § 2258A requires NCMEC report within 24 hours (placeholder impl, needs CyberTipline API)

-----

## Layer 2: Content Classification

**Function**: `runLayer2(image, mimeType, contentHash, context, options)`

### 13 categories

**Blocked** (always): nudity, sexual, violence, minor_present, drugs, self_harm, hate_symbols, csam_detected

**Review** (context-dependent): swimwear, underwear, revealing, artistic_nudity

**Allowed**: appropriate

### Confidence thresholds

| Threshold | Value | Action |
|-----------|-------|--------|
| Block | ≥0.9 | Block with certainty |
| Block with review | ≥0.8 | Block, log for review |
| Context check | ≥0.7 | Decision depends on context |
| Monitor | ≥0.5 | Allow but monitor |

### User-facing messages

| Category | Message |
|----------|---------|
| nudity | "Please upload a photo where you are fully clothed." |
| sexual | "This image is not appropriate for our platform." |
| violence | "This image contains content we cannot process." |
| minor_present | "Custom Model is only available for photos of adults (18+)." |
| hate_symbols | "This image contains symbols that violate our community guidelines." |
| csam_detected | "This image could not be processed. Please try a different photo." |
| swimwear/underwear | "This image type is not supported for try-on." |

-----

## Layer 3: Sanity Checks

**Function**: `runLayer3(image, mimeType, contentHash, context, options)`

### Per-context requirements

| Context | Require Face | Max Faces | Block Screenshots | Block Non-Photos | Min Quality | Min Resolution |
|---------|-------------|-----------|-------------------|-----------------|-------------|----------------|
| tryon | Yes | 1 | Yes | Yes | 0.3 | 256px |
| profile | Yes | 3 | Yes | No | 0.2 | 128px |
| blog | No | 99 | No | No | 0.1 | 64px |
| general | No | 99 | No | No | 0.1 | 64px |

### Quick checks (no API call)

- `quickDimensionCheck(width, height, context)` — aspect ratio validation
- `quickFileSizeCheck(sizeBytes, context)` — minimum 10KB for tryon

-----

## Layer 4: Output Verification

**Function**: `runLayer4(generatedImage, mimeType, contentHash, options)`

For AI-generated images only. Re-runs Layer 2 classification on output.

- If unsafe: retry (up to 3 times with different seeds) or reject
- `generateWithRetry(generateFn, options)` — handles retry loop
- `verifyOutfitMatch()` — placeholder for future outfit comparison

-----

## Vision Provider Cascade

### Providers

| Provider | Model | Timeout | Role | ZDR |
|----------|-------|---------|------|-----|
| `workers_ai_llama4` | `@cf/meta/llama-4-scout-17b-16e-instruct` | 15s | Primary | Yes |
| `workers_ai_llama3` | CF Llama 3.2 Vision | 10s | Fallback | Yes |
| `together_ai` | `meta-llama/Llama-4-Scout-17B-16E-Instruct` | 20s | Tertiary | Yes |

### Circuit breaker (in-memory, per-isolate)

- 3 failures → circuit opens for 60 seconds
- State not shared across Workers isolates (limitation)
- Lost on cold starts

### Lumen alternative path

`classifyWithLumen()` uses Lumen router instead of direct vision client:
- Model chain: Gemini Flash → Claude Haiku → CF Llama 4 Scout
- Unified quota tracking per tenant
- Layer 1 (CSAM) always uses direct path — legally mandated, cannot depend on gateway

-----

## Security Logging

### What gets logged

- Layer, result (pass/block/retry), category, confidence
- Content SHA-256 hash (never image content)
- User ID (may be anonymized), tenant ID
- Timestamp, processing time

### Query functions

| Function | Purpose |
|----------|---------|
| `getRecentUserEvents(db, userId)` | Pattern detection (7 days, limit 100) |
| `getUserBlockCount(db, userId)` | Abuse threshold check (7 days) |
| `getRecentBlocksByCategory(db)` | Top 10 blocked categories (24h) |
| `hasViolationPattern(db, userId)` | Auto-flag after 3 blocks in 30 days |
| `cleanupOldLogs(db)` | Retention enforcement (90 days) |

-----

## Rate Limits

| Limit | Value |
|-------|-------|
| Max uploads per session | 5 |
| Max retries per image | 3 |
| Max uploads per day | 20 |
| Max blocked before review | 3 |
| Max CSAM flags before ban | 1 (instant) |

-----

## Database Tables

### `petal_account_flags`
Account blocking after CSAM or repeated violations. Tracks review status (pending → reviewed → cleared/confirmed). Unique on `(user_id, flag_type)`.

### `petal_security_log`
Event audit trail. Never stores image content. Indexed by timestamp, layer, user_id, result. Composite index for user block history queries.

### `petal_ncmec_queue`
Federal reporting queue. Stores content_hash, detection time, report deadline. Tracks submission status. Indexed by reported status and deadline.

### Feature flags
- `petal_moderation` (enabled) — master switch
- `petal_tryon_strict` (enabled) — strict try-on validation
- `image_uploads_enabled` (default: false) — gated until PhotoDNA approved
- `petal_photodna_enabled` (default: false) — awaiting Microsoft vetting

-----

## Observability

The `petal-aggregator.ts` collects 24-hour metrics:
- Block rate, total checks, total blocked
- NCMEC queue depth (pending reports)
- Pending flag reviews (accounts needing Wayfinder review)
- Top 10 blocked categories

-----

## Infrastructure Gaps (Queue/Workflow Opportunities)

| Gap | Impact | Solution |
|-----|--------|----------|
| `waitUntil()` can fail silently | Moderation skipped, no record | CF Queue for guaranteed processing |
| No retry on provider timeout | Image passes without scanning | Queue retry + dead letter |
| No human review pipeline | Flagged content sits in D1 with no UI | CF Workflow: scan → flag → wait for review → decide |
| Per-isolate circuit breaker | No coordination across Workers | KV or Durable Object for shared state |
| PhotoDNA pending | Vision-only CSAM detection | Feature-flagged, uploads gated |

-----

## Pricing (Cost Tracking)

| Operation | Cost |
|-----------|------|
| Per classification | ~$0.0014 |
| Per sanity check | ~$0.0007 |
| Free tier limit | 10,000 neurons/day |

-----

*Four layers deep, privacy-first, legally compliant. The brambles protect the grove.*
