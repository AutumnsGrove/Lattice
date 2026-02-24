---
title: Thorn Behavioral Layer
description: >-
  Deterministic behavioral defense that catches obvious abuse before AI inference,
  inspired by Discord's Osprey rules engine
category: specs
specCategory: content-community
icon: shield
lastUpdated: "2026-02-24"
aliases: []
tags:
  - thorn
  - content-moderation
  - behavioral
  - threshold-sdk
  - server-sdk
  - cloudflare-workers
---

# Thorn Behavioral Layer

```
               🌹  Protected by Pattern

          ╭─────────────────────────────────╮
          │   Outer Thorns   ╱ ╲            │
          │     ╱ ╲         ╱ B ╲           │
          │    ╱ B ╲       ╱─────╲          │
          │   ╱─────╲      │ rate │          │
          │   │label│      │limit │          │
          │   │check│      ╰──┬──╯          │
          │   ╰──┬──╯         │             │
          │      │    ╭───────┴───────╮     │
          │      ╰───→│  Inner Rose   │     │
          │           │   🌹 AI       │     │
          │           │  Inference    │     │
          │           ╰───────────────╯     │
          ╰─────────────────────────────────╯

      The outer thorns catch what's obvious.
      The inner rose reads what's nuanced.
```

> *The outer thorns catch what's obvious. The inner rose reads what's nuanced.*

Thorn's behavioral layer adds deterministic, sub-millisecond defense checks that run before AI inference. Inspired by Discord's Osprey rules engine, it introduces entity labels, rate limiting, and pattern matching to catch obvious spam and abuse without spending on AI calls. It's the fast outer ring of thorns that protects the slower, more thoughtful inner rose.

**Public Name:** Thorn (Behavioral Layer)
**Internal Name:** GroveThorn (extension, not separate system)
**Version:** 1.0 Draft
**Last Updated:** February 2026

Every rose has outer thorns and inner petals. The outer thorns are fast, sharp, and react to touch. The inner petals are soft, nuanced, and require closer inspection. Thorn's behavioral layer is the outer ring: it catches the hand reaching in before the rose ever needs to think about it.

---

## Overview

### What This Is

A deterministic behavioral defense layer that sits inside the existing Thorn moderation pipeline, before AI inference. It uses D1 queries (sub-millisecond) to check entity labels, rate limits, and behavioral patterns. When a behavioral rule matches, the action is taken immediately, saving the ~$0.001 cost and ~500ms latency of an AI inference call.

### Goals

- Catch obvious spam, bot activity, and repeat offenders before AI inference
- Give Thorn memory across events via persistent entity labels
- Reduce AI inference costs by filtering known-bad patterns early
- Add rate limiting to protect against flood attacks
- Maintain Thorn's privacy-first principles (no content stored)

### Non-Goals (Out of Scope)

- Replacing AI content classification (behavioral checks cannot read nuance)
- Building a full rules engine with custom DSL (TypeScript config is sufficient at Grove's scale)
- Real-time investigation dashboard (Vista already covers this)
- Cross-tenant correlation (each tenant is isolated)

---

## Architecture

### Where It Fits

The behavioral layer slots into the existing Thorn pipeline between the action trigger and AI inference:

```
User publishes content
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  THORN BEHAVIORAL LAYER (new)                         <1ms     │
│                                                                 │
│  1. Threshold rate check    "Too many actions too fast?"       │
│     (via @autumnsgrove/lattice/threshold)                      │
│  2. Check entity labels     "Is this user already flagged?"    │
│  3. Evaluate behavioral     "Does this match a known          │
│     rules                    spam pattern?"                    │
│                                                                 │
│  Result: pass │ warn │ block                                    │
└───────────────┬───────────────┬─────────────────────────────────┘
                │               │
           pass?          warn/block?
                │               │
                ▼               ▼
┌───────────────────────┐  Log decision,
│  THORN AI LAYER       │  skip AI inference,
│  (existing)           │  return immediately
│                       │
│  Songbird → Lumen     │
│  → Decision Engine    │
│  200-500ms, ~$0.001   │
└───────────────────────┘
```

### Cost Savings Model

```
Without behavioral layer:
  Every action → AI inference → ~$0.001, ~500ms

With behavioral layer:
  Every action → Behavioral check (<1ms, free)
       │
  Known bad? → Block immediately (no AI cost)
  Rate limited? → Block immediately (no AI cost)
  Unknown? → AI inference (~$0.001, ~500ms)

Savings = (% caught by behavioral) × $0.001 per check
```

Even catching 10% of actions behaviorally saves ~$0.32/month at 10,000 posts/month. The real value is catching flood attacks, where a spammer sending 1,000 posts gets rate-limited after 10, saving 990 AI calls (~$0.99 in a single attack).

---

## Entity Labels

Inspired by Osprey's `HasLabel` / `LabelAdd` / `LabelRemove` pattern. Labels are persistent tags on entities (users, IPs, email domains) that create memory across events.

### Schema

```sql
CREATE TABLE IF NOT EXISTS thorn_entity_labels (
  -- Composite key: what entity, which label
  entity_type TEXT NOT NULL,       -- 'user' | 'ip' | 'email_domain' | 'tenant'
  entity_id TEXT NOT NULL,
  label TEXT NOT NULL,

  -- Metadata
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,                  -- NULL = permanent, otherwise ISO datetime
  added_by TEXT NOT NULL,           -- rule name ('rapid_posting') or 'wayfinder'
  reason TEXT,                      -- Human-readable reason

  PRIMARY KEY (entity_type, entity_id, label)
);

-- Find all labels for an entity (the most common query)
CREATE INDEX IF NOT EXISTS idx_thorn_labels_entity
  ON thorn_entity_labels(entity_type, entity_id);

-- Find expired labels for cleanup
CREATE INDEX IF NOT EXISTS idx_thorn_labels_expires
  ON thorn_entity_labels(expires_at)
  WHERE expires_at IS NOT NULL;

-- Find labels added by a specific rule (for rule tuning)
CREATE INDEX IF NOT EXISTS idx_thorn_labels_added_by
  ON thorn_entity_labels(added_by);
```

### Label Operations

```typescript
// libs/engine/src/lib/thorn/behavioral/labels.ts

/** Read all active labels for an entity */
export async function getEntityLabels(
  db: D1Database,
  entityType: EntityType,
  entityId: string,
): Promise<string[]>;

/** Check if an entity has a specific label */
export async function hasLabel(
  db: D1Database,
  entityType: EntityType,
  entityId: string,
  label: string,
): Promise<boolean>;

/** Add a label to an entity (with optional TTL) */
export async function addLabel(
  db: D1Database,
  entityType: EntityType,
  entityId: string,
  label: string,
  options?: {
    expiresInHours?: number;
    addedBy: string;
    reason?: string;
  },
): Promise<void>;

/** Remove a label from an entity */
export async function removeLabel(
  db: D1Database,
  entityType: EntityType,
  entityId: string,
  label: string,
): Promise<void>;

/** Clean up expired labels (called periodically) */
export async function cleanupExpiredLabels(
  db: D1Database,
): Promise<number>;
```

### Built-in Labels

| Label | Entity Type | Meaning | Auto-Applied By |
|-------|-------------|---------|-----------------|
| `thorn:rapid_poster` | user | Posted too fast | Rate limit rule |
| `thorn:songbird_fail` | user | Failed Songbird injection check | Songbird layer |
| `thorn:blocked_content` | user | Had content blocked by AI | AI moderation |
| `thorn:repeat_offender` | user | Multiple blocks in 30 days | Escalation rule |
| `thorn:suspicious_ip` | ip | Associated with spam/abuse | Behavioral rules |
| `thorn:spam_domain` | email_domain | Domain associated with spam signups | Manual or rule |
| `thorn:trusted` | user | Consistently clean content | Manual (Wayfinder) |

Labels prefixed with `thorn:` are system labels. Wayfinders can also add custom labels via the admin panel.

### Label Lifecycle

```
Event occurs
    │
    ▼
Check labels ──→ "thorn:repeat_offender" found
    │                    │
    │               Block immediately
    │
No blocking labels
    │
    ▼
Process event (behavioral + AI)
    │
    ▼
Event outcome
    │
    ├── Blocked by AI? → addLabel("thorn:blocked_content", expires: 90d)
    │                     Count blocks in 30d → if ≥ 3, addLabel("thorn:repeat_offender")
    │
    ├── Songbird failed? → addLabel("thorn:songbird_fail", expires: 7d)
    │
    └── Clean pass → if hasLabel("thorn:trusted"), skip AI next time
```

---

## Rate Limiting (via Threshold SDK)

The behavioral layer uses the existing **Threshold SDK** (`@autumnsgrove/lattice/threshold`) for all rate limiting. No custom rate limit tables or counters needed. Threshold already provides:

- Atomic counters via `ThresholdD1Store` (uses existing `rate_limits` table)
- Graduated abuse tracking via `checkWithAbuse()` (warnings → 24h ban)
- Centralized config in `ENDPOINT_RATE_LIMITS`
- Framework adapters for SvelteKit, Hono, and Workers

### Existing Endpoint Limits (Already Configured)

The Threshold SDK already defines limits for content creation:

```typescript
// From @autumnsgrove/lattice/threshold config.ts (already exists)
"posts/create": { limit: 10, windowSeconds: 3600 },   // 10 posts/hour
"posts/update": { limit: 30, windowSeconds: 3600 },   // 30 edits/hour
"comments/create": { limit: 20, windowSeconds: 300 },  // 20 comments/5min
```

### Behavioral Integration with Threshold

The behavioral layer wraps Threshold checks and bridges them to entity labels:

```typescript
// libs/engine/src/lib/thorn/behavioral/rate-check.ts

import { Threshold, ThresholdD1Store } from "@autumnsgrove/lattice/threshold";
import { addLabel } from "./labels.js";

/**
 * Check Threshold rate limits and apply labels on violation.
 *
 * Bridges the Threshold SDK into Thorn's behavioral layer:
 * 1. Calls threshold.check() for the endpoint
 * 2. If exceeded, applies a thorn:rapid_poster label
 * 3. If abuse escalation triggers, applies thorn:repeat_offender
 */
export async function checkBehavioralRateLimit(
  threshold: Threshold,
  db: D1Database,
  userId: string,
  endpointKey: string,
): Promise<{ exceeded: boolean; action?: ThornAction }> {
  const result = await threshold.check({
    key: `thorn:${endpointKey}:${userId}`,
    limit: getEndpointLimitByKey(endpointKey).limit,
    windowSeconds: getEndpointLimitByKey(endpointKey).windowSeconds,
  });

  if (!result.allowed) {
    // Apply rapid_poster label (expires when window resets)
    await addLabel(db, "user", userId, "thorn:rapid_poster", {
      addedBy: `threshold:${endpointKey}`,
      expiresInHours: 1,
      reason: `Rate limit exceeded: ${endpointKey}`,
    });

    return { exceeded: true, action: "block" };
  }

  return { exceeded: false };
}
```

### Abuse Escalation Bridge

Threshold's existing abuse tracking (`recordViolation()`) handles graduated escalation. The behavioral layer bridges this into entity labels:

```typescript
/**
 * When Threshold records a violation, mirror it as a Thorn label.
 * Called after any rate limit violation in the behavioral pipeline.
 */
async function bridgeAbuseToLabels(
  abuseKV: KVNamespace,
  db: D1Database,
  userId: string,
): Promise<void> {
  const violation = await recordViolation(abuseKV, userId);

  if (violation.banned) {
    // Threshold escalated to ban (5+ violations in 24h)
    await addLabel(db, "user", userId, "thorn:repeat_offender", {
      addedBy: "threshold:abuse_escalation",
      expiresInHours: 24,
      reason: "Threshold abuse escalation: repeated rate limit violations",
    });
  }
}
```

### Thorn-Specific Rate Limits (New Endpoints)

For Thorn-specific signals not covered by existing Threshold config, add entries to `ENDPOINT_RATE_LIMITS`:

```typescript
// Added to @autumnsgrove/lattice/threshold config.ts
"thorn/songbird-fail": { limit: 3, windowSeconds: 86400 },   // 3 failures/day
"thorn/behavioral-block": { limit: 10, windowSeconds: 3600 }, // 10 blocks/hour
```

---

## Behavioral Rules

Simple, typed rule definitions. No custom DSL needed at Grove's scale.

### Rule Structure

```typescript
// libs/engine/src/lib/thorn/behavioral/rules.ts

export interface BehavioralRule {
  /** Unique rule identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** Content types this rule applies to */
  contentTypes: ThornContentType[];
  /** All conditions must be true for this rule to match */
  conditions: BehavioralCondition[];
  /** Action to take when rule matches */
  action: ThornAction;
  /** Label to apply when rule triggers (optional) */
  applyLabel?: {
    label: string;
    expiresInHours?: number;
  };
  /** Skip AI inference if this rule matches? */
  skipAI: boolean;
  /** Is this rule enabled? */
  enabled: boolean;
}

export type BehavioralCondition =
  | { type: "has_label"; label: string }
  | { type: "not_has_label"; label: string }
  | { type: "account_age_below"; hours: number }
  | { type: "content_has_links"; min: number }
  | { type: "content_length_below"; chars: number }
  | { type: "content_length_above"; chars: number };

// Note: rate limiting is NOT a condition type.
// Rate checks are handled by Threshold SDK (checkBehavioralRateLimit)
// and run as a separate step before rule evaluation.
```

### Default Rules

```typescript
export const BEHAVIORAL_RULES: BehavioralRule[] = [
  // ─────────────────────────────────────────────────────────────
  // Repeat offenders: skip straight to block
  // ─────────────────────────────────────────────────────────────
  {
    name: "repeat_offender_block",
    description: "Users with repeat_offender label are blocked immediately",
    contentTypes: ["blog_post", "comment", "profile_bio"],
    conditions: [
      { type: "has_label", label: "thorn:repeat_offender" },
    ],
    action: "block",
    skipAI: true,
    enabled: true,
  },

  // ─────────────────────────────────────────────────────────────
  // Trusted users: skip AI for clean track record
  // ─────────────────────────────────────────────────────────────
  {
    name: "trusted_user_pass",
    description: "Users with trusted label skip AI moderation",
    contentTypes: ["blog_post", "comment", "profile_bio"],
    conditions: [
      { type: "has_label", label: "thorn:trusted" },
    ],
    action: "allow",
    skipAI: true,
    enabled: true,
  },

  // ─────────────────────────────────────────────────────────────
  // New account spam pattern: first post with links
  // ─────────────────────────────────────────────────────────────
  {
    name: "new_account_link_spam",
    description: "New accounts posting content with many links get flagged",
    contentTypes: ["blog_post", "comment"],
    conditions: [
      { type: "account_age_below", hours: 24 },
      { type: "content_has_links", min: 3 },
    ],
    action: "flag_review",
    applyLabel: {
      label: "thorn:suspicious_new_account",
      expiresInHours: 72,
    },
    skipAI: false,  // Still run AI, but flag regardless
    enabled: true,
  },

  // ─────────────────────────────────────────────────────────────
  // Empty content: skip AI (nothing to classify)
  // ─────────────────────────────────────────────────────────────
  {
    name: "empty_content_pass",
    description: "Content under 10 characters skips AI (nothing meaningful to check)",
    contentTypes: ["blog_post", "comment"],
    conditions: [
      { type: "content_length_below", chars: 10 },
    ],
    action: "allow",
    skipAI: true,
    enabled: true,
  },
];
```

### Rule Evaluation

```typescript
// libs/engine/src/lib/thorn/behavioral/evaluate.ts

export interface BehavioralResult {
  /** Did any rule match? */
  matched: boolean;
  /** Which rule matched (first match wins) */
  matchedRule?: string;
  /** Action determined by the matched rule */
  action: ThornAction;
  /** Should AI inference be skipped? */
  skipAI: boolean;
  /** Labels applied as a result */
  labelsApplied: string[];
}

/**
 * Evaluate all behavioral rules against the current context.
 * Rules are checked in order. First match wins.
 *
 * Rate limiting runs BEFORE rule evaluation via Threshold SDK.
 * This function handles label checks and content signal matching.
 * Typical execution: 1-3ms (1-2 D1 queries).
 */
export async function evaluateBehavioralRules(
  db: D1Database,
  context: BehavioralContext,
): Promise<BehavioralResult>;

export interface BehavioralContext {
  /** Entity performing the action */
  userId?: string;
  tenantId?: string;
  /** Content metadata (not the content itself) */
  contentType: ThornContentType;
  hookPoint: ThornHookPoint;
  /** Lightweight content signals (extracted before this call) */
  contentLength: number;
  linkCount: number;
  /** Account metadata */
  accountCreatedAt?: string;
}
```

---

## Integration with Existing Thorn

### Updated Hook Flow

The existing `moderatePublishedContent()` in `hooks.ts` gains a behavioral pre-check. The hook receives a `Threshold` instance from the caller (already available in the request context):

```typescript
export async function moderatePublishedContent(
  options: ModeratePublishedContentOptions & { threshold: Threshold },
): Promise<void> {
  try {
    // ── NEW: Threshold rate check ───────────────────────────
    const rateResult = await checkBehavioralRateLimit(
      options.threshold,
      options.db,
      options.userId!,
      mapHookToEndpoint(options.hookPoint), // e.g. "on_publish" → "posts/create"
    );

    if (rateResult.exceeded) {
      await logModerationEvent(options.db, {
        userId: options.userId,
        tenantId: options.tenantId,
        contentType: options.contentType,
        hookPoint: options.hookPoint,
        action: rateResult.action!,
        categories: ["behavioral:rate_limit"],
        confidence: 1.0,
        model: "threshold-sdk",
        contentRef: options.contentRef,
      });
      return; // Rate limited, skip everything
    }

    // ── NEW: Behavioral rule pre-check ──────────────────────
    const behavioral = await evaluateBehavioralRules(options.db, {
      userId: options.userId,
      tenantId: options.tenantId,
      contentType: options.contentType,
      hookPoint: options.hookPoint,
      contentLength: options.content.length,
      linkCount: countLinks(options.content),
      accountCreatedAt: options.accountCreatedAt,
    });

    // Log behavioral decision
    await logModerationEvent(options.db, {
      userId: options.userId,
      tenantId: options.tenantId,
      contentType: options.contentType,
      hookPoint: options.hookPoint,
      action: behavioral.action,
      categories: behavioral.matched
        ? [`behavioral:${behavioral.matchedRule}`]
        : [],
      confidence: 1.0,  // Deterministic rules = full confidence
      model: "thorn-behavioral",
      contentRef: options.contentRef,
    });

    // If behavioral says block/warn and skipAI, we're done
    if (behavioral.matched && behavioral.skipAI) {
      if (behavioral.action === "block" || behavioral.action === "flag_review") {
        await flagContent(options.db, {
          userId: options.userId,
          tenantId: options.tenantId,
          contentType: options.contentType,
          contentRef: options.contentRef,
          action: behavioral.action,
          categories: [`behavioral:${behavioral.matchedRule}`],
          confidence: 1.0,
        });
      }
      return; // Skip AI inference
    }

    // ── Existing: AI moderation ────────────────────────────
    const lumen = createLumenClient({ /* ... */ });
    const result = await moderateContent(options.content, {
      lumen,
      tenant: options.tenantId,
      contentType: options.contentType,
    });

    // Log AI decision
    await logModerationEvent(options.db, { /* existing logging */ });

    // ── NEW: Post-AI label updates ─────────────────────────
    if (result.action === "block") {
      await addLabel(options.db, "user", options.userId!, "thorn:blocked_content", {
        addedBy: "ai_moderation",
        expiresInHours: 90 * 24,
        reason: `Blocked: ${result.categories.join(", ")}`,
      });
      // Check for repeat offender escalation
      await checkRepeatOffenderEscalation(options.db, options.userId!);
    }
  } catch (err) {
    console.error("[Thorn] Moderation failed:", err);
  }
}
```

### Repeat Offender Escalation

```typescript
async function checkRepeatOffenderEscalation(
  db: D1Database,
  userId: string,
): Promise<void> {
  // Count blocks in the last 30 days
  const result = await db
    .prepare(
      `SELECT COUNT(*) as block_count FROM thorn_moderation_log
       WHERE user_id = ? AND action = 'block'
       AND timestamp > datetime('now', '-30 days')`,
    )
    .bind(userId)
    .first<{ block_count: number }>();

  if (result && result.block_count >= 3) {
    await addLabel(db, "user", userId, "thorn:repeat_offender", {
      addedBy: "escalation_rule",
      reason: `${result.block_count} blocks in 30 days`,
    });
  }
}
```

---

## File Structure

All behavioral layer code lives within the existing Thorn module:

```
libs/engine/src/lib/thorn/
├── index.ts                    # Public API (add behavioral exports)
├── moderate.ts                 # Core AI moderation (unchanged)
├── config.ts                   # AI threshold config (unchanged)
├── hooks.ts                    # Publish hook (updated: behavioral pre-check)
├── logging.ts                  # D1 logging (unchanged)
├── types.ts                    # Types (extended with behavioral types)
├── thorn.test.ts               # Tests (extended)
│
└── behavioral/                 # ── NEW ──
    ├── index.ts                # Behavioral public API
    ├── labels.ts               # Entity label CRUD operations
    ├── rate-check.ts           # Threshold SDK bridge (not custom counters)
    ├── rules.ts                # Rule definitions and config
    ├── evaluate.ts             # Rule evaluation engine
    ├── types.ts                # Behavioral-specific types
    └── behavioral.test.ts      # Tests
```

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Labels storage | D1 via Server SDK (`GroveDatabase`) | Abstracts D1 behind portable interface, sub-ms queries |
| Rate limiting | Threshold SDK (`@autumnsgrove/lattice/threshold`) | Existing unified rate limiting with D1/KV/DO stores and abuse tracking |
| Abuse escalation | Threshold abuse module + KV (`GroveKV`) | Graduated violation tracking already built |
| Rule definitions | TypeScript config | Type-safe, no parser needed, lives in codebase |
| Rule evaluation | Pure TypeScript | Deterministic, testable, no external dependencies |
| Integration | Cloudflare Workers | Same runtime as existing Thorn |

### SDK Integration Map

The behavioral layer connects to three existing SDK packages:

```
@autumnsgrove/lattice/threshold     ← Rate limiting, abuse escalation
@autumnsgrove/lattice/thorn         ← Parent module (types, logging, config)
@autumnsgrove/server-sdk            ← GroveDatabase, GroveKV interfaces
```

**Why Server SDK?** The existing Thorn code uses raw `D1Database` types from `@cloudflare/workers-types`. The behavioral layer follows this pattern for consistency. When Thorn migrates to `GroveDatabase` (the Server SDK abstraction), the behavioral layer migrates with it. The `GroveDatabase` interface is a superset of the D1 API, so the migration is a type change, not a logic change.

---

## Security Considerations

- **No content storage.** Behavioral rules check metadata (length, link count, account age), never content text. The content text is only passed to the AI layer.
- **Label privacy.** Labels are internal state. They are never exposed to users or included in API responses. Users see only the moderation decision (allow/warn/flag/block).
- **Rate limit accuracy.** Delegated to Threshold SDK, which uses atomic `INSERT ON CONFLICT` in D1 and graduated abuse tracking in KV. No custom rate limit implementation to maintain.
- **Label TTL enforcement.** Expired labels are cleaned up periodically. The `hasLabel` check filters expired labels at query time, so stale data never affects decisions.
- **Trusted label governance.** The `thorn:trusted` label (which skips AI) can only be added by Wayfinders through the admin panel. It cannot be self-applied or auto-applied by rules.
- **Existing Thorn feature flag.** The behavioral layer respects the existing `thorn_moderation` feature flag. If Thorn is disabled, behavioral checks are also disabled.

---

## Observability

### Vista Aggregator Updates

The existing `thorn-aggregator.ts` gains behavioral metrics:

| Metric | Source | Dashboard |
|--------|--------|-----------|
| Behavioral block count (24h) | `thorn_moderation_log WHERE model = 'thorn-behavioral'` | Thorn dashboard |
| Behavioral skip rate | (behavioral blocks / total events) | Thorn dashboard |
| AI inference savings | behavioral blocks x $0.001 | Thorn dashboard |
| Active entity labels | `thorn_entity_labels` count | Thorn dashboard |
| Rate limit triggers (24h) | `thorn_moderation_log WHERE model = 'threshold-sdk'` | Thorn dashboard |
| Threshold abuse escalations | Labels with `added_by LIKE 'threshold:%'` | Thorn dashboard |
| Top triggered rules | Group by `categories` where `model = 'thorn-behavioral'` | Thorn dashboard |

### Admin Label Management

Wayfinders can view, add, and remove entity labels through the existing Arbor admin panel:

```
┌─────────────────────────────────────────────────────────────────┐
│  🌹 Thorn — Entity Labels                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Search ────────────────────────────────────────────────┐   │
│  │ Entity: [user ▾]  ID: [________________]  [ Search ]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Labels for user: autumn-grove                                  │
│  ─────────────────────────────────────────────────────         │
│                                                                 │
│  thorn:trusted          permanent    added by: wayfinder       │
│                                      2026-01-15                │
│                                      [ Remove ]                │
│                                                                 │
│  thorn:blocked_content  expires: 90d added by: ai_moderation  │
│                                      2026-02-20                │
│                                      reason: harassment        │
│                                      [ Remove ]                │
│                                                                 │
│  ─────────────────────────────────────────────────────         │
│  [ + Add Label ]                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Entity Labels (Foundation)

- [ ] Create migration `090_thorn_behavioral_labels.sql` with `thorn_entity_labels` table (no rate limit tables needed)
- [ ] Create `libs/engine/src/lib/thorn/behavioral/` directory
- [ ] Implement `labels.ts` with getEntityLabels, hasLabel, addLabel, removeLabel, cleanupExpiredLabels
- [ ] Implement `types.ts` with EntityType, BehavioralRule, BehavioralCondition, etc.
- [ ] Add feature flag `thorn_behavioral` for gradual rollout
- [ ] Write unit tests for label CRUD operations

### Phase 2: Threshold SDK Integration

- [ ] Add Thorn-specific endpoint keys to `ENDPOINT_RATE_LIMITS` in `@autumnsgrove/lattice/threshold`
- [ ] Implement `rate-check.ts` bridging Threshold checks to entity labels
- [ ] Implement `bridgeAbuseToLabels()` for Threshold → label escalation
- [ ] Wire Threshold instance through `moderatePublishedContent()` options
- [ ] Write unit tests for Threshold-to-label bridge logic

### Phase 3: Behavioral Rules Engine

- [ ] Implement `rules.ts` with default behavioral rule definitions
- [ ] Implement `evaluate.ts` with evaluateBehavioralRules
- [ ] Implement condition evaluators for each condition type
- [ ] Write unit tests for rule evaluation (match, no-match, multi-condition)

### Phase 4: Integration

- [ ] Update `hooks.ts` to call behavioral pre-check before AI
- [ ] Add post-AI label updates (blocked_content, repeat_offender escalation)
- [ ] Update `index.ts` exports with behavioral public API
- [ ] Update thorn-aggregator.ts for behavioral metrics
- [ ] Wire Songbird failures into label system

### Phase 5: Admin Panel

- [ ] Add entity label viewer to Arbor admin (Thorn section)
- [ ] Add label add/remove UI for Wayfinders
- [ ] Add behavioral stats cards to Thorn dashboard
- [ ] Add rate limit trigger log to dashboard

### Phase 6: Trusted User Path

- [ ] Implement trusted user skip-AI logic
- [ ] Add Wayfinder-only label management for `thorn:trusted`
- [ ] Monitor false negative rate for trusted-user skipped content
- [ ] Consider auto-trust after N clean passes (future enhancement)

---

## Related Specs

| Document | Relationship |
|----------|-------------|
| `thorn-spec.md` | Parent spec. Behavioral layer extends Thorn. |
| `threshold-spec.md` | Rate limiting SDK. Behavioral layer uses Threshold for all rate checks. |
| `songbird-pattern.md` | Songbird failures feed into behavioral labels. |
| `shade-spec.md` | Privacy policy governs what behavioral data we store. |
| Server SDK (`@autumnsgrove/server-sdk`) | `GroveDatabase` and `GroveKV` interfaces for infrastructure portability. |

---

## Inspiration

This spec was inspired by Discord's [Osprey](https://github.com/roostorg/osprey) rules engine, open-sourced through ROOST. Osprey's entity labeling system, deterministic rule evaluation, and separation of detection from action informed the design. The full analysis is documented in `docs/safaris/active/osprey-vs-thorn-safari.md`.

Key concepts harvested from Osprey:
- **Entity labels with TTL** (Osprey's HasLabel/LabelAdd/LabelRemove pattern)
- **Detection before action** (rules declare what to detect, effects declare what to do)
- **Graduated response** (allow, warn, flag, block)
- **State across events** (labels give memory, not just stateless checks)

Adapted for Grove: D1 instead of PostgreSQL, TypeScript config instead of SML, Cloudflare Workers instead of Python/gevent, and no Kafka/Druid/Bigtable.

---

*The outer thorns are fast. The inner rose is wise. Together, they protect the grove.*
