---
title: Petal — Image Content Moderation
description: >-
  Privacy-first image moderation with four layers of protection and zero data
  retention
category: specs
specCategory: content-community
icon: fan
lastUpdated: '2026-01-20'
aliases: []
tags:
  - content-moderation
  - privacy
  - cloudflare-workers
  - ai
  - image-safety
---

# Petal — Image Content Moderation

```
                          🌸
                         ╱│╲
                        ╱ │ ╲
                      ╱   │   ╲
                    ╱     │     ╲
               🌸 ╱       │       ╲ 🌸
                 ╲       │       ╱
                   ╲     │     ╱
                     ╲   │   ╱
                       ╲ │ ╱
                         │
                       ──┴──
                      │     │
                      │ 🌿  │
                      │     │
                      └─────┘

        Petals close to protect what's precious.
        Layer by layer, gentle but vigilant.

              Protection without surveillance.
              Privacy by design, safety by default.
```

> *Petals close to protect what's precious.*

Grove's image content moderation system extends the privacy-first principles of Thorn to visual content. Designed for user-uploaded photos and AI-generated images across all Grove services. Four layers of protection, zero data retention, immediate deletion after review.

**Public Name:** Petal
**Internal Name:** GrovePetal
**Version:** 1.0 Draft
**Last Updated:** January 2026

Petals protect the flower's center. They close when danger comes, shield what's precious, then open again when it's safe. Petal is Grove's image moderation system: protective without being invasive, thorough without being surveillance.

---

## Implementation Status

| Field | Value |
|-------|-------|
| **Status** | Specification draft, pending review |
| **Target Phase** | Phase 5 (Scout Moodboard Mode) |
| **Prerequisites** | Thorn implementation, Songbird pattern, ZDR infrastructure |

---

## Overview

Grove uses automated image moderation to protect our community while maintaining strict privacy protections. This system handles:

- **User photo uploads** (Custom Model try-ons in Scout, future profile photos)
- **AI-generated outputs** (Try-on images, Model Farm fashion shots)
- **User-submitted images** (Future: blog post images with moderation)

Like Thorn, Petal follows a **privacy-first architecture**: no human eyes on user images, no retention of visual content, and fully encrypted processing.

---

## 1. Core Principles

### 1.1 Privacy First

- **Zero human surveillance** of user images during automated review
- **Immediate deletion** of all images after review completes
- **No training** on user images, ever
- **End-to-end encryption** for all image data in transit
- **ZDR (Zero Data Retention)** with inference providers

### 1.2 Legal Compliance

- **CSAM detection is mandatory** and cannot be bypassed
- **NCMEC reporting** within 24 hours as required by federal law
- **Metadata retention** for law enforcement (the ONE exception to ZDR)
- **No minors** in Custom Model features (age verification required)

### 1.3 Proportional Response

- Clear, friendly rejection messages (not scary legalese)
- Retry opportunities for innocent mistakes
- Escalation only for repeated violations

---

## 2. System Architecture

### 2.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        IMAGE RECEIVED                            │
│  (User upload, AI generation request, etc.)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               PETAL LAYER 1: CSAM Detection                      │
│  ─────────────────────────────────────────────────────────────   │
│  PhotoDNA hash-based detection (Microsoft)                       │
│  MANDATORY. No opt-out. No bypass. No exceptions.                │
│                                                                  │
│  Cost: Included in provider | Latency: ~20ms                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                  Match found? ───Yes──→ BLOCK + NCMEC REPORT
                              │          (federal law requires)
                              │
                             No
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            PETAL LAYER 2: Content Classification                 │
│  ─────────────────────────────────────────────────────────────   │
│  Vision model classification (LlamaGuard / provider moderation)  │
│  Categories: nudity, violence, minors, explicit, self-harm       │
│                                                                  │
│  Cost: ~$0.001 | Latency: ~100ms                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                        Violation? ───Yes──→ REJECT (user-friendly message)
                              │
                             No
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               PETAL LAYER 3: Sanity Check                        │
│  ─────────────────────────────────────────────────────────────   │
│  Application-specific validation                                 │
│  - Is this actually a photo of a person? (for try-on)            │
│  - Face detection, quality assessment                            │
│  - Screenshot/meme detection                                     │
│                                                                  │
│  Cost: ~$0.0005 | Latency: ~50ms                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                         Valid? ───No──→ REJECT (helpful guidance)
                              │
                             Yes
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ✅ PROCEED TO PROCESSING                      │
│                       (inference, storage, etc.)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                    [If AI generation]
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            PETAL LAYER 4: Output Verification                    │
│  ─────────────────────────────────────────────────────────────   │
│  Verify AI-generated output BEFORE showing to user               │
│  Re-run content classification on generated image                │
│  Catch AI hallucinations or inappropriate outputs                │
│                                                                  │
│  Cost: ~$0.001 | Latency: ~100ms                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                          Safe? ───No──→ RETRY or REJECT gracefully
                              │
                             Yes
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ✅ DELIVER TO USER                            │
│                                                                  │
│    All images immediately deleted after delivery                 │
│    Only text metadata retained (style profile, etc.)             │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Details

| Stage | Data Present | Retention |
|-------|--------------|-----------|
| Image Upload | Full image, encrypted | Until processing completes (seconds) |
| Layer 1 (CSAM) | Image hash only | Hash retained only if match found |
| Layer 2 (Classification) | Image in memory | Zero (ZDR enabled) |
| Layer 3 (Sanity) | Image in memory | Zero (ZDR enabled) |
| Layer 4 (Output) | Generated image | Zero (ZDR enabled) |
| Post-Review | Decision outcome only | Permanent (for enforcement) |
| CSAM Match | Hash + metadata | Permanent (legal requirement) |

### 2.3 Relationship to Songbird

Petal extends the Songbird pattern used by Thorn:

| Songbird Layer | Petal Equivalent | Purpose |
|----------------|------------------|---------|
| 🐤 Canary | Layer 1 (CSAM) | Tripwire for immediate threats |
| 🦅 Kestrel | Layer 2 (Classification) | Semantic validation |
| 🐦 Robin | Layer 3 (Sanity) + Layer 4 (Output) | Production safety |

**Key difference:** Petal has four layers because images require both input validation (user photos) AND output validation (AI-generated images). Text only needs input validation.

---

## 3. Layer 1: CSAM Detection

> *This layer is legally mandated and cannot be bypassed.*

### 3.1 Overview

CSAM (Child Sexual Abuse Material) detection runs FIRST on every image. This is not optional. Federal law requires it.

```
┌─────────────────────────────────────────────────────────────────┐
│  CSAM Detection Flow                                             │
│                                                                  │
│  Image ──→ PhotoDNA Hash ──→ Database Check                      │
│                                    │                             │
│                           ┌────────┴────────┐                    │
│                           │                 │                    │
│                        No Match          Match Found             │
│                           │                 │                    │
│                           ▼                 ▼                    │
│                       Continue          ┌───────────────────┐    │
│                       to Layer 2        │ 1. Block upload   │    │
│                                         │ 2. Report to NCMEC│    │
│                                         │ 3. Log metadata   │    │
│                                         │ 4. Flag account   │    │
│                                         └───────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Implementation

```typescript
interface CSAMResult {
  safe: boolean;
  reason?: 'CSAM_DETECTED';
  mustReport?: boolean;
  hash?: string;
}

const scanForCSAM = async (image: Buffer): Promise<CSAMResult> => {
  // PhotoDNA or equivalent hash-based detection
  // Most inference providers include this automatically
  const hash = await photoDNA.hash(image);
  const match = await photoDNA.checkAgainstDatabase(hash);

  if (match.found) {
    // MANDATORY: Report to NCMEC within 24 hours
    await reportToNCMEC({
      hash: hash,
      timestamp: new Date(),
      userIdentifier: anonymizedUserId,
      uploadContext: 'petal_layer1',
    });

    // Log for internal records (hash only, NEVER image)
    await logSecurityEvent('csam_detected', {
      timestamp: new Date().toISOString(),
      hash: hash,
      reported: true,
      layer: 'petal_layer1',
    });

    // Flag account with upload block (do not notify user why)
    // This is a BLOCKING flag - user cannot upload ANY photos until manual review
    await flagAccountForReview(userId, 'csam_detection', {
      blockUploads: true,  // Prevents ALL photo uploads
      requiresManualReview: true,  // Only Wayfinder can clear this
      notifyUser: false,  // Never reveal detection reason
    });

    return { safe: false, reason: 'CSAM_DETECTED', mustReport: true, hash };
  }

  return { safe: true };
};
```

### 3.3 Account Flagging Policy

When CSAM is detected, the account enters a **blocked state**:

| State | Description |
|-------|-------------|
| **Upload blocked** | User cannot upload ANY photos to ANY Grove feature |
| **Other features** | User can still use non-image features (browsing, text posts) |
| **Duration** | Until manual review is completed by Wayfinder |
| **User notification** | Generic "upload failed" message only, never reveals reason |

```typescript
interface CSAMAccountFlag {
  userId: string;
  flagType: 'csam_detection';
  createdAt: Date;

  // Blocking behavior
  blockUploads: true;           // Cannot upload photos anywhere
  requiresManualReview: true;   // Only Wayfinder can clear

  // Review tracking
  reviewStatus: 'pending' | 'reviewed' | 'cleared' | 'confirmed';
  reviewedBy?: string;          // Wayfinder ID
  reviewedAt?: Date;
  reviewNotes?: string;         // Internal notes only
}

// On any photo upload attempt
const canUploadPhoto = async (userId: string): Promise<boolean> => {
  const flag = await getActiveCSAMFlag(userId);
  if (flag && flag.blockUploads) {
    // Generic message - never reveal CSAM flag exists
    throw new UploadBlockedError('Unable to process uploads at this time.');
  }
  return true;
};
```

**Review outcomes:**
- **Cleared** (false positive): Flag removed, user can upload again
- **Confirmed** (true positive): Account permanently banned, law enforcement notified if required

### 3.5 Provider CSAM Policies

| Provider | CSAM Scanning | Auto-Report | Notes |
|----------|---------------|-------------|-------|
| **Together.ai** | ✅ Built-in | ✅ Automatic | Required on all image APIs |
| **Replicate** | ✅ Built-in | ✅ Automatic | Zero tolerance policy |
| **FAL.ai** | ✅ Built-in | ✅ Automatic | Enterprise agreement |
| **Cloudflare Images** | ✅ Built-in | ✅ Automatic | If using CF for storage |
| **RunPod** | ⚠️ Manual | ⚠️ Manual | MUST implement ourselves |

**If self-hosting or using RunPod:** Integrate PhotoDNA SDK or equivalent BEFORE processing ANY user images.

### 3.6 Legal Requirements

| Requirement | Details |
|-------------|---------|
| **Reporting deadline** | 24 hours to NCMEC |
| **What to report** | Hash, timestamp, anonymized user ID, upload context |
| **Metadata retention** | Required for law enforcement (exception to ZDR) |
| **Failure to report** | Federal crime under 18 U.S.C. § 2258A |

### 3.7 User Messaging

CSAM detection triggers a generic rejection. **Never reveal the specific reason.**

```typescript
// User sees this (generic)
{
  error: true,
  code: 'upload_rejected',
  message: 'This image could not be processed. Please try a different photo.'
}

// Internal log (no image, only hash)
{
  event: 'csam_detected',
  hash: 'sha256:abc123...',
  reported_to_ncmec: true,
  timestamp: '2026-01-20T12:00:00Z'
}
```

---

## 4. Layer 2: Content Classification

### 4.1 Categories

```typescript
const PETAL_CATEGORIES = {
  ALLOWED: [
    'appropriate_fashion',
    'selfie',
    'portrait',
    'casual_photo',
  ],

  BLOCKED: [
    'nudity',           // Full or partial nudity
    'sexual',           // Sexually explicit or suggestive
    'violence',         // Gore, injury, weapons
    'minor_present',    // Detected minor in photo
    'drugs',            // Drug paraphernalia
    'self_harm',        // Self-harm imagery
    'hate_symbols',     // Swastikas, confederate flags, etc.
  ],

  NEEDS_REVIEW: [
    'swimwear',         // Allowed for fashion context
    'underwear',        // Similar, verify context
    'revealing',        // Verify fashion-appropriate
    'artistic_nudity',  // May be allowed with context
  ],
};
```

### 4.2 Implementation

```typescript
interface PetalClassification {
  category: string;
  confidence: number;
  decision: 'allow' | 'block' | 'review';
  reason?: string;
}

const classifyImage = async (image: Buffer): Promise<PetalClassification> => {
  // Use provider's built-in moderation OR LlamaGuard Vision
  const moderation = await inferenceProvider.moderate({
    image: image,
    categories: Object.values(PETAL_CATEGORIES).flat(),
  });

  // Find highest-confidence blocked category
  const blockedMatch = moderation.results
    .filter(r => PETAL_CATEGORIES.BLOCKED.includes(r.category))
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (blockedMatch && blockedMatch.confidence > 0.8) {
    return {
      category: blockedMatch.category,
      confidence: blockedMatch.confidence,
      decision: 'block',
      reason: getCategoryReason(blockedMatch.category),
    };
  }

  // Check needs-review categories
  const reviewMatch = moderation.results
    .filter(r => PETAL_CATEGORIES.NEEDS_REVIEW.includes(r.category))
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (reviewMatch && reviewMatch.confidence > 0.7) {
    // For swimwear/underwear, check fashion context
    const fashionContext = await checkFashionContext(image, reviewMatch.category);
    if (!fashionContext.appropriate) {
      return {
        category: reviewMatch.category,
        confidence: reviewMatch.confidence,
        decision: 'block',
        reason: 'This image type is not supported for try-on.',
      };
    }
  }

  return {
    category: 'appropriate',
    confidence: moderation.results[0]?.confidence || 0.9,
    decision: 'allow',
  };
};
```

### 4.3 Category Rejection Messages

```typescript
const getCategoryReason = (category: string): string => {
  const reasons: Record<string, string> = {
    nudity: 'Please upload a photo where you are fully clothed.',
    sexual: 'This image is not appropriate for our platform.',
    violence: 'This image contains content we cannot process.',
    minor_present: 'Custom Model is only available for photos of adults (18+).',
    drugs: 'This image contains content we cannot process.',
    self_harm: 'This image contains content we cannot process.',
    hate_symbols: 'This image contains symbols that violate our community guidelines.',
  };
  return reasons[category] || 'This image cannot be processed.';
};
```

### 4.4 Confidence Thresholds

| Confidence | Action |
|------------|--------|
| ≥ 0.9 | Block with high certainty |
| 0.8 - 0.89 | Block, log for review |
| 0.7 - 0.79 | Context check required |
| < 0.7 | Allow, but monitor patterns |

---

## 5. Layer 3: Sanity Check

### 5.1 Purpose

Application-specific validation that ensures the image is suitable for its intended use. For try-on features, this means verifying it's actually a usable photo of a person.

### 5.2 Implementation

```typescript
interface SanityResult {
  valid: boolean;
  reason?: string;
  suggestion?: string;
}

const sanityCheckImage = async (
  image: Buffer,
  context: 'tryon' | 'profile' | 'blog'
): Promise<SanityResult> => {

  if (context === 'tryon') {
    return await sanityCheckForTryon(image);
  }

  if (context === 'profile') {
    return await sanityCheckForProfile(image);
  }

  // Blog images have looser requirements
  return { valid: true };
};

const sanityCheckForTryon = async (image: Buffer): Promise<SanityResult> => {
  // Detect faces
  const faces = await detectFaces(image);

  if (faces.length === 0) {
    return {
      valid: false,
      reason: 'Please upload a photo that shows your face and body.',
      suggestion: 'A full-body or half-body selfie works best!',
    };
  }

  if (faces.length > 1) {
    return {
      valid: false,
      reason: 'Please upload a photo with just you in it.',
      suggestion: 'Group photos don't work well for try-on.',
    };
  }

  // Check if screenshot or meme
  const imageType = await classifyImageType(image);
  if (imageType.isScreenshot || imageType.isMeme || imageType.isDrawing) {
    return {
      valid: false,
      reason: 'Please upload an actual photo of yourself.',
      suggestion: 'Screenshots and drawings don't work for try-on.',
    };
  }

  // Check minimum quality
  const quality = await assessImageQuality(image);
  if (quality.resolution < 256 || quality.blur > 0.7) {
    return {
      valid: false,
      reason: 'This image is too low quality for a good try-on.',
      suggestion: 'Try a clearer, higher-resolution photo.',
    };
  }

  return { valid: true };
};
```

### 5.3 Context-Specific Requirements

| Context | Requirements |
|---------|--------------|
| **Try-on** | Single face, actual photo, minimum resolution |
| **Profile** | Face present, appropriate (not meme/screenshot) |
| **Blog** | Not CSAM, not blocked categories (looser validation) |

---

## 6. Layer 4: Output Verification

### 6.1 Purpose

AI models can hallucinate. They might generate inappropriate content even from appropriate inputs. This layer catches those failures before the user sees them.

### 6.2 When It Runs

Layer 4 runs **only for AI-generated images**, not user uploads:

| Operation | Layer 4 Required |
|-----------|------------------|
| User uploads photo for try-on | ❌ No |
| AI generates try-on result | ✅ Yes |
| Model Farm image generation | ✅ Yes |
| User uploads blog image | ❌ No |

### 6.3 Implementation

```typescript
interface OutputVerification {
  safe: boolean;
  action?: 'retry' | 'reject';
  reason?: string;
}

const verifyGeneratedOutput = async (
  generatedImage: Buffer,
  intendedDescription?: OutfitDescription
): Promise<OutputVerification> => {

  // Re-run content classification on generated image
  const classification = await classifyImage(generatedImage);

  if (classification.decision !== 'allow') {
    // AI generated something inappropriate
    await logSecurityEvent('petal_output_blocked', {
      reason: classification.category,
      confidence: classification.confidence,
      layer: 'petal_layer4',
      // Never log images
    });

    return {
      safe: false,
      action: 'retry_or_reject',
      reason: 'Generated image did not meet safety standards.',
    };
  }

  // If we have an intended outfit, verify the output matches
  if (intendedDescription) {
    const outfitMatch = await verifyOutfitMatch(generatedImage, intendedDescription);

    if (outfitMatch.score < 0.5) {
      // AI hallucinated something unrelated
      return {
        safe: false,
        action: 'retry',
        reason: 'Generation did not match intended outfit.',
      };
    }
  }

  return { safe: true };
};
```

### 6.4 Retry Logic

```typescript
const generateWithRetry = async (
  input: Buffer,
  prompt: string,
  maxRetries: number = 3
): Promise<Buffer | null> => {

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const generated = await inferenceProvider.generate({
      image: input,
      prompt: prompt,
      seed: Date.now() + attempt, // Different seed each retry
    });

    const verification = await verifyGeneratedOutput(generated);

    if (verification.safe) {
      return generated;
    }

    if (verification.action === 'reject') {
      // Don't retry, this is a hard failure
      break;
    }

    // Log retry
    await logSecurityEvent('petal_layer4_retry', {
      attempt: attempt,
      reason: verification.reason,
    });
  }

  return null; // All retries failed
};
```

---

## 7. Inference Provider Requirements

### 7.1 Approved Providers

| Provider | ZDR Support | CSAM Scan | Moderation API | Status |
|----------|-------------|-----------|----------------|--------|
| **Together.ai** | ✅ Default for open models | ✅ Built-in | ✅ Yes | Primary |
| **FAL.ai** | ✅ Enterprise | ✅ Built-in | ✅ Yes | Backup |
| **Replicate** | ⚠️ 1hr auto-delete | ✅ Built-in | ⚠️ Limited | Tertiary |

### 7.2 Provider Requirements Checklist

Before using any provider for image processing:

- [ ] **Zero Data Retention** - Must support ZDR or equivalent
- [ ] **No training on inputs** - Provider must not use images for training
- [ ] **CSAM scanning** - Built-in or we must integrate it
- [ ] **Encryption in transit** - TLS 1.2+ required
- [ ] **US jurisdiction** - Data must not leave US during processing
- [ ] **SOC 2 compliance** - Provider must have SOC 2 certification

### 7.3 Excluded Providers

| Provider | Reason |
|----------|--------|
| Any without CSAM scanning | Legal requirement |
| Any training on user data | Privacy violation |
| Any without ZDR | Privacy requirement |
| Any non-US processing | Jurisdiction concerns |

### 7.4 Provider Failover Strategy

**Layer 1 (CSAM) is legally critical.** If CSAM scanning fails, we cannot process the image. Period.

```
┌─────────────────────────────────────────────────────────────────┐
│  PROVIDER FAILOVER: Layer 1 (CSAM) - CRITICAL PATH              │
│                                                                  │
│  Together.ai ──fail──→ FAL.ai ──fail──→ Replicate ──fail──→ BLOCK│
│      │                    │                 │                    │
│     ok                   ok                ok                    │
│      │                    │                 │                    │
│      └────────────────────┴─────────────────┘                    │
│                           │                                      │
│                           ▼                                      │
│                    Continue to Layer 2                           │
│                                                                  │
│  ⚠️  ALL PROVIDERS FAIL = BLOCK UPLOAD (cannot skip CSAM scan)  │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
interface ProviderHealth {
  provider: 'together' | 'fal' | 'replicate';
  healthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  circuitOpen: boolean;  // true = skip this provider
}

const FAILOVER_CONFIG = {
  // Circuit breaker settings
  failureThreshold: 3,      // Failures before circuit opens
  circuitResetMs: 60_000,   // Try again after 60s

  // Timeout settings
  csam: {
    timeout: 5_000,         // 5s timeout for CSAM scan
    maxRetries: 2,          // Retry twice per provider
  },
  classification: {
    timeout: 10_000,        // 10s timeout for classification
    maxRetries: 1,          // Retry once per provider
  },
};

// Provider priority order (Layer 1 - CSAM)
const CSAM_PROVIDERS = ['together', 'fal', 'replicate'] as const;

const scanCSAMWithFailover = async (image: Buffer): Promise<CSAMResult> => {
  for (const provider of CSAM_PROVIDERS) {
    const health = await getProviderHealth(provider);

    // Skip if circuit is open (provider recently failed)
    if (health.circuitOpen) {
      continue;
    }

    try {
      const result = await withTimeout(
        scanCSAM(image, provider),
        FAILOVER_CONFIG.csam.timeout
      );

      // Success - reset failure count
      await updateProviderHealth(provider, { consecutiveFailures: 0 });
      return result;

    } catch (error) {
      // Record failure
      await updateProviderHealth(provider, {
        consecutiveFailures: health.consecutiveFailures + 1,
        circuitOpen: health.consecutiveFailures + 1 >= FAILOVER_CONFIG.failureThreshold,
      });

      // Log but continue to next provider
      await logSecurityEvent('csam_provider_failure', {
        provider,
        error: error.message,
        failoverAttempt: CSAM_PROVIDERS.indexOf(provider) + 1,
      });
    }
  }

  // ALL providers failed - BLOCK the upload
  // We cannot process images without CSAM scanning
  await logSecurityEvent('csam_all_providers_failed', {
    providers: CSAM_PROVIDERS,
    action: 'upload_blocked',
  });

  throw new UploadBlockedError(
    'We're experiencing technical difficulties. Please try again in a few minutes.'
  );
};
```

**Failover behavior by layer:**

| Layer | On Provider Failure | On All Providers Fail |
|-------|--------------------|-----------------------|
| **Layer 1 (CSAM)** | Try next provider | **BLOCK upload** (cannot skip) |
| **Layer 2 (Classification)** | Try next provider | Block + queue for manual review |
| **Layer 3 (Sanity)** | Try next provider | Allow with warning flag |
| **Layer 4 (Output)** | Retry with different seed | Reject gracefully |

**Health check background job:**

```typescript
// Run every 30 seconds
const healthCheckJob = async () => {
  for (const provider of CSAM_PROVIDERS) {
    const health = await getProviderHealth(provider);

    // If circuit is open and reset time has passed, test it
    if (health.circuitOpen) {
      const timeSinceOpen = Date.now() - health.lastCheck.getTime();
      if (timeSinceOpen > FAILOVER_CONFIG.circuitResetMs) {
        // Try a health check ping
        const isHealthy = await pingProvider(provider);
        if (isHealthy) {
          await updateProviderHealth(provider, {
            circuitOpen: false,
            consecutiveFailures: 0,
          });
        }
      }
    }
  }
};
```

**Alerting thresholds:**

| Condition | Alert Level | Action |
|-----------|-------------|--------|
| 1 provider circuit open | Warning | Notify on-call |
| 2 providers circuit open | Critical | Page Wayfinder |
| All providers down >5min | Emergency | Consider maintenance mode |

---

## 8. Data Lifecycle

### 8.1 Image Journey

```
┌─────────────────────────────────────────────────────────────────┐
│  User uploads photo                                              │
│       │                                                          │
│       ▼                                                          │
│  Encrypted in transit (TLS 1.3)                                 │
│       │                                                          │
│       ▼                                                          │
│  Petal Layers 1-3 (~200ms)                                      │
│       │                                                          │
│       ▼                                                          │
│  ┌─ Pass ─┐           ┌─ Fail ─┐                                │
│  │        │           │        │                                │
│  ▼        │           ▼        │                                │
│  Inference │         Reject   │                                 │
│  (ZDR)    │         + Delete  │                                 │
│  │        │                   │                                 │
│  ▼        │                   │                                 │
│  Layer 4  │                   │                                 │
│  verify   │                   │                                 │
│  │        │                   │                                 │
│  ▼        │                   │                                 │
│  Deliver  │                   │                                 │
│  │        │                   │                                 │
│  ▼        ▼                   ▼                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │           ALL IMAGES DELETED                               │ │
│  │           Only text metadata retained                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 What Is Stored

| Data | Stored? | Duration | Notes |
|------|---------|----------|-------|
| User's uploaded photo | ❌ NO | N/A | Deleted immediately after processing |
| AI-generated images | ❌ NO | N/A | Deleted after session ends |
| CSAM hash (if match) | ✅ YES | Permanent | Legal requirement |
| Decision outcome | ✅ YES | 90 days | For enforcement |
| Confidence scores | ❌ NO | N/A | Used only for routing |
| Security event logs | ✅ YES | 90 days | Hash only, never content |

### 8.3 Deletion Guarantees

| Data Type | Deletion Timing |
|-----------|-----------------|
| User photo (pass) | Immediately after inference completes |
| User photo (fail) | Immediately after rejection |
| Generated image | When user leaves session |
| Failed generation | Immediately after retry cycle |
| API request/response | Zero retention (ZDR) |

---

## 9. Abuse Prevention

### 9.1 Rate Limiting

```typescript
const PETAL_RATE_LIMITS = {
  // Per-session limits
  maxUploadsPerSession: 5,
  maxRetriesPerImage: 3,

  // Per-user limits
  maxUploadsPerDay: 20,
  maxBlockedUploadsBeforeReview: 3,
  maxCSAMFlagsBeforeBan: 1, // Instant ban
};

const checkPetalRateLimits = async (userId: string): Promise<RateLimitResult> => {
  const recentUploads = await getRecentUploads(userId, '24h');
  const recentBlocks = await getRecentBlocks(userId, '7d');

  if (recentBlocks.length >= PETAL_RATE_LIMITS.maxBlockedUploadsBeforeReview) {
    await flagForReview(userId, 'repeated_petal_blocks');
    return { allowed: false, reason: 'Account under review.' };
  }

  if (recentUploads.length >= PETAL_RATE_LIMITS.maxUploadsPerDay) {
    return {
      allowed: false,
      reason: 'Daily upload limit reached. Try again tomorrow!',
    };
  }

  return { allowed: true };
};
```

### 9.2 Detection Patterns

| Pattern | Action |
|---------|--------|
| Same user uploading variations of blocked content | Auto-flag account |
| Rapid-fire uploads (>10 in 1 minute) | Temporary block |
| All uploads getting blocked | Review account |
| CSAM detection (any) | Permanent ban + NCMEC report |
| Attempting to bypass with minimal changes | Escalate for review |

### 9.3 Account Flagging

```typescript
const handleRepeatedViolations = async (
  userId: string,
  violationType: string
): Promise<void> => {
  const violations = await getRecentViolations(userId, '30d');

  if (violations.length >= 3) {
    // Suspend account pending review
    await suspendAccount(userId, 'petal_violations');

    await notifyUser(userId, {
      subject: 'Account Suspended',
      message: 'Your account has been suspended due to repeated policy violations. You may appeal this decision.',
    });
  }
};
```

---

## 10. User Communication

### 10.1 Rejection Messages

**Layer 2 rejection (content classification):**
```
We couldn't process this photo.

For the best try-on experience, please upload:
✓ A clear photo of yourself
✓ Fully clothed (we'll change the outfit!)
✓ Just you in the photo
✓ Good lighting and quality

[Try Another Photo]
```

**Layer 3 rejection (sanity check):**
```
This photo won't work for try-on.

Tips for a great result:
• Use a full-body or half-body photo
• Make sure your face is visible
• Use an actual photo (not a screenshot)
• Higher resolution = better results

[Try Another Photo]
```

**Layer 4 rejection (output verification failed):**
```
Something went wrong with this try-on.

We're trying again with a different approach...

[If retries exhausted:]
We couldn't generate this outfit. Try:
• A different base photo
• A simpler outfit style

[Try Again]  [Change Photo]
```

### 10.2 Consent Flow

```svelte
<!-- Before enabling features that use Petal -->
<dialog open={showConsentDialog}>
  <h2>Enable Custom Model?</h2>

  <p>
    Custom Model lets you see yourself wearing the clothes in your moodboard.
  </p>

  <h3>How your photo is handled:</h3>
  <ul>
    <li>✅ Your photo is sent to our AI service for processing</li>
    <li>✅ Generated images are shown to you</li>
    <li>✅ Your photo is deleted immediately after processing</li>
    <li>✅ Generated images are deleted when you leave</li>
    <li>❌ We NEVER store your photo</li>
    <li>❌ We NEVER use your photo for AI training</li>
    <li>❌ We NEVER share your photo with anyone</li>
  </ul>

  <p class="text-sm text-muted">
    We use providers with Zero Data Retention.
    <a href="/privacy/images">Read our full privacy policy →</a>
  </p>

  <div class="flex gap-4">
    <button onclick={decline}>No thanks</button>
    <button onclick={accept} class="primary">I understand, enable</button>
  </div>
</dialog>
```

### 10.3 Session End Confirmation

```svelte
<dialog open={showExitDialog}>
  <h2>Leaving</h2>

  <p>Your session data will be cleared:</p>

  <ul>
    <li>🗑️ Your uploaded photo: <strong>Deleting...</strong> ✓ Deleted</li>
    <li>🗑️ Generated images: <strong>Deleting...</strong> ✓ Deleted</li>
    <li>📝 Your style profile: <strong>Saved</strong> (text only)</li>
  </ul>

  <p class="text-grove-600">
    ✨ No trace of your photos remains on our servers.
  </p>

  <button onclick={confirmExit}>Done</button>
</dialog>
```

---

## 11. Cost Analysis

### 11.1 Per-Image Costs

| Layer | Cost | Notes |
|-------|------|-------|
| Layer 1 (CSAM) | ~$0.00 | Included in provider |
| Layer 2 (Classification) | ~$0.001 | Vision model inference |
| Layer 3 (Sanity) | ~$0.0005 | Face detection + quality |
| Layer 4 (Output) | ~$0.001 | Re-classification |
| **Total per image** | **~$0.0025** | Excluding generation cost |

### 11.2 Monthly Projections

| Images/Month | Petal Moderation Cost |
|--------------|----------------------|
| 1,000 | ~$2.50 |
| 10,000 | ~$25.00 |
| 100,000 | ~$250.00 |

**Note:** This is moderation overhead only. Image generation costs (FLUX Kontext at ~$0.04/image) are separate.

### 11.3 Cost Optimization

- **Batch Layer 1-3** for user uploads (one API call if provider supports)
- **Cache classification models** where possible
- **Skip Layer 4** for pre-generated Model Farm images (already verified)

---

## 12. Security Measures

### 12.1 Encryption

| Data State | Encryption |
|------------|------------|
| At rest (if any) | AES-256 |
| In transit (internal) | TLS 1.3 |
| In transit (to provider) | TLS 1.2+ |
| At provider | Provider's encryption (SOC 2) |

### 12.2 Access Controls

- Petal service runs in isolated Cloudflare Worker
- No admin access to image content
- API keys stored in Cloudflare secrets
- Audit logging for all system access (no images)

### 12.3 Security Logging

```typescript
interface PetalSecurityLog {
  timestamp: string;
  layer: 'layer1' | 'layer2' | 'layer3' | 'layer4';
  result: 'pass' | 'block' | 'retry';
  category?: string;         // Only for blocks
  confidence?: number;       // Only for blocks
  contentHash: string;       // SHA-256 of image, never image itself
  feature: 'scout_tryon' | 'model_farm' | 'blog_upload';
}
```

---

## 13. Integration Points

### 13.1 Scout Moodboard Mode

Primary use case. Petal handles:
- User photo uploads for Custom Model
- Generated try-on images (output verification)
- Model Farm image generation (output verification)

### 13.2 Future: Grove Blog Images

When Grove adds image uploads to blog posts:
- Layer 1 (CSAM) - Mandatory
- Layer 2 (Classification) - Apply AUP categories
- Layer 3 (Sanity) - Optional/minimal
- Layer 4 (Output) - N/A (no generation)

### 13.3 Future: Profile Photos

When Grove adds profile photos:
- Layer 1 (CSAM) - Mandatory
- Layer 2 (Classification) - Check for appropriateness
- Layer 3 (Sanity) - Face detection, quality check
- Layer 4 (Output) - N/A (no generation)

---

## 14. Related Specs

| Document | Relationship |
|----------|--------------|
| [`thorn-spec.md`](/knowledge/specs/thorn-spec) | Text content moderation (Petal is the image equivalent) |
| [`songbird-pattern.md`](/knowledge/patterns/songbird-pattern) | Three-bird protection pattern that Petal extends |
| [`acceptable-use-policy.md`](/knowledge/legal/acceptable-use-policy) | Policy that Petal helps enforce |
| Scout Moodboard Mode (GroveScout repo) | Feature that first implements Petal |

---

## 15. Implementation Checklist

### 15.1 Infrastructure Setup

- [ ] Verify CSAM scanning with primary provider (Together.ai)
- [ ] Configure ZDR settings with all providers
- [ ] Create isolated Cloudflare Worker for Petal
- [ ] Set up secure API key storage
- [ ] Implement provider failover with circuit breaker
- [ ] Set up health check background job (30s interval)
- [ ] Configure alerting thresholds for provider outages

### 15.2 Layer Implementation

- [ ] Implement Layer 1 (CSAM detection + NCMEC reporting)
- [ ] Implement Layer 2 (content classification)
- [ ] Implement Layer 3 (sanity checks) with context variants
- [ ] Implement Layer 4 (output verification) with retry logic

### 15.3 Integration

- [ ] Integrate with Scout Custom Model flow
- [ ] Integrate with Model Farm generation pipeline
- [ ] Build rate limiting system
- [ ] Implement abuse detection patterns

### 15.4 User Communication

- [ ] Design rejection UI components
- [ ] Write all user-facing messages
- [ ] Create consent flow components
- [ ] Build session end confirmation

### 15.5 Operations & Monitoring

- [ ] Set up security logging (no images)
- [ ] Create Petal dashboard for monitoring
- [ ] Write integration tests with mock images
- [ ] Document NCMEC reporting procedure
- [ ] Set up alerting for high block rates

---

*Petals protect what's precious. This specification prioritizes user privacy while maintaining community safety. Images are ephemeral. Trust is permanent.*
