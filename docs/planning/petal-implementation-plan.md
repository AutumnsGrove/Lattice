# Petal Implementation Plan — Image Content Moderation

**Status:** ✅ Implementation Complete
**Priority:** BLOCKING for launch (CSAM monitoring legally required)
**Spec:** `/docs/specs/petal-spec.md`
**Implementation Date:** January 2026

---

## Executive Summary

Petal is Grove's 4-layer image content moderation system. This implementation leverages **Cloudflare Workers AI** (Llama 4 Scout) as the primary vision model for content classification, with **Cloudflare's CSAM Scanning Tool** for CDN-level defense. The architecture follows the existing inference-client pattern with multi-provider fallback.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  USER UPLOADS IMAGE                                               │
│  POST /api/images/upload                                          │
└──────────────────────────────────────────────────────────────────┘
                              │
            [Existing validation: auth, CSRF, magic bytes, size]
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  PETAL LAYER 1: CSAM Detection                                   │
│  ─────────────────────────────────────────────────────────────   │
│  Cloudflare CSAM Tool (CDN-level, fuzzy hashing)                 │
│  + Vision model classification for minor_present detection       │
│  Cost: FREE | Latency: ~100ms                                    │
└──────────────────────────────────────────────────────────────────┘
                              │
                  Match? ───Yes──→ BLOCK + Flag Account + Queue NCMEC Report
                              │
                             No
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  PETAL LAYER 2: Content Classification                           │
│  ─────────────────────────────────────────────────────────────   │
│  Cloudflare Workers AI - Llama 4 Scout                           │
│  Model: @cf/meta/llama-4-scout-17b-16e-instruct                  │
│  Categories: nudity, violence, minors, hate symbols, etc.        │
│  Cost: FREE (10k neurons/day) | Latency: ~100-300ms              │
└──────────────────────────────────────────────────────────────────┘
                              │
                      Violation? ───Yes──→ REJECT + User-friendly message
                              │
                             No
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  PETAL LAYER 3: Sanity Check (context-dependent)                 │
│  ─────────────────────────────────────────────────────────────   │
│  Context-specific: face detection, quality, screenshot detection │
│  For: try-on (strict), profile (medium), blog (loose)            │
│  Cost: Included in Layer 2 | Latency: ~50ms additional           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  R2 STORAGE (existing)                                           │
│  + Cloudflare CSAM Scanning (automatic defense-in-depth)         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Files Created

### Core Petal Module (`libs/engine/src/lib/server/petal/`)

| File                 | Purpose                                 |
| -------------------- | --------------------------------------- |
| `index.ts`           | Main exports, `scanImage()` entry point |
| `types.ts`           | TypeScript interfaces and types         |
| `vision-client.ts`   | Vision inference with provider fallback |
| `layer1-csam.ts`     | CSAM detection and NCMEC reporting      |
| `layer2-classify.ts` | Content classification                  |
| `layer3-sanity.ts`   | Context-specific validation             |
| `layer4-output.ts`   | AI output verification                  |
| `logging.ts`         | Security event logging (hashes only)    |

### Configuration (`libs/engine/src/lib/config/`)

| File       | Purpose                                          |
| ---------- | ------------------------------------------------ |
| `petal.ts` | Provider config, categories, thresholds, prompts |

### Database Migration

| File                       | Purpose                                          |
| -------------------------- | ------------------------------------------------ |
| `migrations/030_petal.sql` | Account flags, security logs, NCMEC queue tables |

### Modified Files

| File                                      | Change                                         |
| ----------------------------------------- | ---------------------------------------------- |
| `wrangler.toml`                           | Added `[ai]` binding for Workers AI            |
| `src/lib/server/env-validation.ts`        | Added `AI` and `TOGETHER_API_KEY` to interface |
| `src/routes/api/images/upload/+server.ts` | Integrated Petal scan before R2 storage        |

---

## Pre-Deployment Steps

### 1. Enable Cloudflare CSAM Scanning Tool (Manual)

- Cloudflare Dashboard → Caching → Configuration
- Enable for `grove.place` and `cdn.autumnsgrove.com`
- Set notification email: `safety@grove.place`

### 2. Run Database Migration

```bash
npx wrangler d1 execute grove-engine-db --file=migrations/030_petal.sql --remote
```

### 3. (Optional) Set Together.ai API Key for Fallback

```bash
npx wrangler secret put TOGETHER_API_KEY
```

---

## Provider Configuration

### Primary: Cloudflare Workers AI

- **Model:** `@cf/meta/llama-4-scout-17b-16e-instruct`
- **Free tier:** 10,000 neurons/day
- **Paid:** $0.27/M input, $0.85/M output
- **ZDR:** Inherent (data never leaves Cloudflare)

### Fallback: Llama 3.2 Vision (Workers AI)

- **Model:** `@cf/meta/llama-3.2-11b-vision-instruct`
- **Cheaper:** $0.049/M input

### External Fallback: Together.ai

- Only if Workers AI unavailable
- Requires `TOGETHER_API_KEY` secret

---

## Content Categories

### Blocked (Immediate Rejection)

- `nudity` - Full/partial nudity
- `sexual` - Sexually explicit content
- `violence` - Gore, weapons
- `minor_present` - Minors in photos
- `drugs` - Drug paraphernalia
- `self_harm` - Self-harm imagery
- `hate_symbols` - Hate symbols

### Review (Context-Dependent)

- `swimwear` - Blocked for try-on
- `underwear` - Blocked for try-on
- `revealing` - Blocked for try-on

### Allowed

- `appropriate` - Safe content

---

## Confidence Thresholds

| Confidence | Action                  |
| ---------- | ----------------------- |
| ≥ 0.9      | Block with certainty    |
| 0.8-0.89   | Block, log for review   |
| 0.7-0.79   | Context check required  |
| < 0.7      | Allow, monitor patterns |

---

## Account Flagging

### CSAM Detection

- Immediate upload block
- Requires Wayfinder manual review
- Never reveals reason to user
- NCMEC report queued (24-hour deadline)

### Content Violations

- After 3 blocked uploads in 30 days
- Account flagged for review
- Can still browse, cannot upload

---

## Cost Projections

| Volume         | Workers AI Cost | Notes                |
| -------------- | --------------- | -------------------- |
| ~300/day       | **FREE**        | Covered by free tier |
| 1,000 images   | ~$1.40          | After free tier      |
| 10,000 images  | ~$14.00         |                      |
| 100,000 images | ~$140.00        |                      |

---

## Testing Checklist

- [ ] Unit tests for each layer
- [ ] Integration test with mock images
- [ ] Verify CSAM detection blocks uploads
- [ ] Verify account flagging works
- [ ] Verify user-friendly rejection messages
- [ ] Verify no image content in logs
- [ ] Test provider fallback cascade
- [ ] Load test with concurrent uploads

---

## Security Reminders

1. **Never log image content** - Only SHA-256 hashes
2. **Never reveal CSAM detection** - Use generic message
3. **NCMEC reports required within 24 hours** - Federal law
4. **ZDR enabled** - No data retention at providers
5. **Account flags permanent** - Until Wayfinder review

---

## Related Documentation

- [Petal Spec](/docs/specs/petal-spec.md)
- [Thorn Text Moderation](/docs/specs/thorn-spec.md)
- [Songbird Pattern](/docs/patterns/songbird-pattern.md)

---

_Implementation completed January 2026_
