---
title: Moderation Queues + Workflows — Thorn & Petal Reliability Layer
description: CF Queue and Workflow wrappers for text and image moderation
category: specs
specCategory: platform-services
icon: shield
lastUpdated: '2026-02-22'
aliases: []
date created: Sunday, February 22nd 2026
date modified: Sunday, February 22nd 2026
tags:
  - moderation
  - cloudflare-queues
  - cloudflare-workflows
  - thorn
  - petal
  - safety
type: tech-spec
---

# Moderation Queues + Workflows: Thorn & Petal Reliability Layer

```
              content arrives
                    │
                    ▼
            ┌──────────────┐
            │   publish /   │
            │   upload      │
            │   (respond    │
            │    instantly) │
            └──────┬───────┘
                   │
                   │ emit()
                   ▼
          ╔════════════════════╗
          ║   MODERATION       ║
          ║   QUEUE            ║
          ║                    ║
          ║  text ····· image  ║
          ║  scan       scan   ║
          ╚════════╤═══════════╝
                   │
           ┌───────┼───────┐
           ▼               ▼
     ┌──────────┐   ┌──────────┐
     │  Thorn   │   │  Petal   │
     │  (text)  │   │  (image) │
     │  3-model │   │  4-layer │
     │  cascade │   │  pipeline│
     └────┬─────┘   └────┬─────┘
          │               │
          ▼               ▼
     ┌─────────────────────────┐
     │   allow? → done         │
     │   flag?  → ReviewWorkflow│
     │   block? → enforce + log │
     └─────────────────────────┘

       Every scan retried. Every flag reviewed.
```

> _Every scan retried. Every flag reviewed._

Thorn (text moderation) and Petal (image moderation) are production-ready moderation libraries. The AI cascade works. The pipeline layers work. What doesn't work: the `waitUntil()` delivery mechanism. If the Worker isolate dies, moderation silently skips. There's no retry, no backpressure, and no durable pipeline from flag to human review.

This spec wraps both systems in CF Queues for guaranteed delivery and adds a CF Workflow for flagged content that needs human review.

**Public Name:** Content Safety
**Internal Name:** GroveModerationQueue / GroveModerationWorkflow
**Domain:** Runs within engine Workers
**Last Updated:** February 2026

A forest needs both sunlight and shade. Thorn and Petal protect the grove's Wanderers from harmful content while respecting creative expression. This spec doesn't change the moderation logic. It makes the delivery reliable.

---

## Overview

### What This Is

A reliability layer for Grove's existing moderation systems. CF Queues guarantee every piece of content gets scanned. CF Workflows provide a durable path from "flagged" to "human reviewed." The moderation logic itself (Thorn's 3-model AI cascade, Petal's 4-layer pipeline) stays exactly as-is.

### The Problem

Both Thorn and Petal integrate via `platform.context.waitUntil()`. This works until it doesn't.

| Problem | Impact |
|---------|--------|
| `waitUntil()` runs after response, not guaranteed to complete | If the isolate dies or hits CPU limit, moderation silently skips |
| No retry on failure | A transient Lumen/Together.ai failure means the content goes unscanned |
| No backpressure | A burst of 100 publishes queues 100 simultaneous AI calls |
| No durable flag-to-review pipeline | Flagged content sits in D1 forever. No workflow to notify Wayfinders. |
| Petal blocks uploads synchronously (correct), but Thorn is fire-and-forget | Inconsistent enforcement model |

### What Stays the Same

- Thorn's 3-model cascade: GPT-oss Safeguard 20B, LlamaGuard 4 12B, DeepSeek V3.2
- Petal's 4-layer pipeline: CSAM, Classify, Sanity, Output
- All threshold configs in `libs/engine/src/lib/thorn/config.ts` and `libs/engine/src/lib/config/petal.ts`
- D1 tables: `thorn_moderation_log`, `thorn_flagged_content`, `petal_security_log`, `petal_account_flags`
- Graduated enforcement: allow, warn, flag_review, block

### What Changes

- **Delivery:** `waitUntil()` replaced by `this.emit()` to a CF Queue
- **Retry:** Queue consumer retries failed scans (3 attempts, exponential backoff)
- **Backpressure:** Queue processes messages at a controlled rate (batch size 10, concurrency 1)
- **Review pipeline:** New `ModerationReviewWorkflow` for flagged content
- **NCMEC reporting:** Petal's CSAM detection triggers a durable workflow for mandatory reporting

### Goals

- **Guaranteed scan.** Every published post and every uploaded image gets moderated. No silent skips.
- **Retry on failure.** Transient AI provider failures don't mean unscanned content.
- **Controlled throughput.** Queue batching prevents burst overload on AI providers.
- **Durable review pipeline.** Flagged content enters a Workflow that tracks it through human review.
- **NCMEC compliance.** CSAM detection triggers a Workflow with a 24-hour deadline (18 U.S.C. 2258A).
- **No logic changes.** Thorn and Petal code stays as-is. This spec only changes how they're invoked.

### Non-Goals (Out of Scope)

- **Changing moderation thresholds or categories.** That's Thorn/Petal config, not this spec.
- **Building the admin review UI.** This spec provides the backend workflow. The UI is a separate task.
- **Real-time moderation chat/escalation.** Flags are reviewed asynchronously.
- **Comment or profile bio moderation.** Thorn has hooks for these but they're not wired yet. Queue integration for those comes when the hooks are connected.

---

## Architecture

### Before (waitUntil)

```
User publishes post → API responds 200 → waitUntil(moderatePublishedContent())
                                                │
                                          (hope it works)
                                                │
                                          if isolate dies → skipped silently
```

### After (Queue + Workflow)

```
User publishes post → API responds 200 → emit("MODERATION_QUEUE", "thorn.scan", {...})
                                                │
                                                ▼
                                     ┌──────────────────────┐
                                     │   CF Queue            │
                                     │   grove-moderation    │
                                     │                       │
                                     │   retry: 3 attempts   │
                                     │   backoff: exponential │
                                     │   DLQ: after 3 fails  │
                                     └──────────┬────────────┘
                                                │
                                                ▼
                                     ┌──────────────────────┐
                                     │   Queue Consumer      │
                                     │                       │
                                     │   switch(msg.type):   │
                                     │     "thorn.scan" →    │
                                     │       moderateContent()│
                                     │     "petal.scan" →    │
                                     │       scanImage()      │
                                     └──────────┬────────────┘
                                                │
                                    ┌───────────┼───────────┐
                                    ▼           ▼           ▼
                               allow         warn      flag/block
                               (log)       (log+warn)     │
                                                          ▼
                                              ┌────────────────────┐
                                              │ ModerationReview   │
                                              │ Workflow           │
                                              │                    │
                                              │ 1. Log flag        │
                                              │ 2. Notify Wayfinder│
                                              │ 3. Wait for review │
                                              │ 4. Apply decision  │
                                              └────────────────────┘
```

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Message delivery | CF Queue (`grove-moderation`) | Guaranteed delivery with retry and dead-letter |
| Text moderation | Thorn library (existing) | 3-model AI cascade, already production-ready |
| Image moderation | Petal library (existing) | 4-layer pipeline, already production-ready |
| Review pipeline | CF Workflow (`ModerationReviewWorkflow`) | Durable multi-step from flag to human decision |
| NCMEC reporting | CF Workflow (`NCMECReportWorkflow`) | Durable 24-hour deadline compliance |
| Logging | D1 existing tables | `thorn_moderation_log`, `petal_security_log` |
| Review queue | D1 existing tables | `thorn_flagged_content`, `petal_account_flags` |

---

## Queue Design

### Single Queue, Multiple Event Types

One CF Queue handles all moderation events. The consumer routes by `type`.

```toml
# wrangler.toml (engine worker)

[[queues.producers]]
binding = "MODERATION_QUEUE"
queue = "grove-moderation"

[[queues.consumers]]
queue = "grove-moderation"
max_batch_size = 10
max_retries = 3
dead_letter_queue = "grove-moderation-dlq"
max_batch_timeout = 30
max_concurrency = 1
retry_delay = "exponential"
```

### Event Types

| Type | Source | Payload | Handler |
|------|--------|---------|---------|
| `thorn.scan` | Blog publish/edit | `{ tenantId, userId, contentRef, contentType, hookPoint, text }` | `moderatePublishedContent()` |
| `thorn.scan_comment` | Comment submit | `{ tenantId, userId, contentRef, text }` | `moderatePublishedContent()` (future) |
| `petal.scan` | Image upload | `{ tenantId, userId, imageR2Key, mimeType, context, contentHash }` | `scanImage()` |
| `petal.rescan` | Manual re-scan | `{ tenantId, userId, imageR2Key, requestedBy }` | `scanImage()` |

### Queue Consumer

```typescript
export default {
  async queue(
    batch: MessageBatch<LoomQueueMessage>,
    env: Env,
  ): Promise<void> {
    for (const msg of batch.messages) {
      try {
        switch (msg.body.type) {
          case "thorn.scan":
            await handleThornScan(msg.body.payload, env);
            break;
          case "petal.scan":
          case "petal.rescan":
            await handlePetalScan(msg.body.payload, env);
            break;
          default:
            console.warn("Unknown moderation event type:", msg.body.type);
        }
        msg.ack();
      } catch (err) {
        console.error(`Moderation failed for ${msg.body.type}:`, err);
        msg.retry();
      }
    }
  },
};
```

### Dead Letter Queue

After 3 failed attempts, messages go to `grove-moderation-dlq`. A daily cron checks the DLQ and alerts via Vista (observability).

Messages in the DLQ indicate a persistent failure: AI provider down, D1 unreachable, or a bug. These should be investigated, not silently dropped.

---

## Integration: Replacing waitUntil

### Thorn (Text Moderation)

**Before** (`libs/engine/src/routes/api/blooms/+server.ts`):
```typescript
platform.context.waitUntil(
  moderatePublishedContent({
    content: `${title}\n\n${markdownContent}`,
    ai: platform.env.AI,
    db: platform.env.DB,
    // ...
  }),
);
```

**After:**
```typescript
await platform.env.MODERATION_QUEUE.send({
  type: "thorn.scan",
  payload: {
    tenantId,
    userId: locals.user.id,
    contentRef: slug,
    contentType: "blog_post",
    hookPoint: "on_publish",
    text: `${title}\n\n${markdownContent}`,
  },
  source: { do: "engine", id: "api" },
  timestamp: new Date().toISOString(),
});
```

Or, if called from a DO, use the Loom SDK:
```typescript
await this.emit("MODERATION_QUEUE", "thorn.scan", {
  tenantId, userId, contentRef: slug,
  contentType: "blog_post", hookPoint: "on_publish",
  text: `${title}\n\n${markdownContent}`,
});
```

### Petal (Image Moderation)

Petal currently blocks the upload synchronously (correct behavior for images). The queue integration is for a secondary async pass or manual re-scan, not for gating uploads.

For the synchronous upload gate, Petal stays inline:
```typescript
// Still inline — image must be checked before R2 upload
const petalResult = await scanImage(imageData, petalEnv);
if (!petalResult.allowed) return json({ error: petalResult.message }, { status: 400 });
```

The queue is used for:
1. **Async re-scan** when Petal thresholds change (re-evaluate existing images)
2. **CSAM follow-up** after the synchronous gate passes but flags "review" level confidence
3. **Bulk scan** for admin-triggered content audits

---

## Workflows

### ModerationReviewWorkflow

When Thorn or Petal flags content for review (`action = 'flag_review'`), the queue consumer triggers this Workflow. It tracks the content through human review.

```
  ┌──────────────┐
  │  1. LOG FLAG  │  Insert/update thorn_flagged_content or petal_account_flags
  │  (checkpoint) │  Status: 'pending'
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  2. NOTIFY   │  Email Wayfinder admin via Zephyr
  │  (checkpoint) │  "Content flagged for review"
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  3. WAIT     │  Sleep until review_status != 'pending'
  │  (poll D1    │  Check every 15 minutes (up to 7 days)
  │   with sleep)│
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  4. ENFORCE  │  If 'removed': hide content, notify author
  │  (checkpoint) │  If 'cleared': no action, log resolution
  └──────────────┘
```

```typescript
export class ModerationReviewWorkflow extends WorkflowEntrypoint<Env, ReviewParams> {
  async run(event: WorkflowEvent<ReviewParams>, step: WorkflowStep) {
    const { flagId, contentType, contentRef, tenantId, userId, action, categories } = event.payload;

    // Step 1: Ensure flag record exists
    await step.do('log-flag', async () => {
      await this.ensureFlagRecord(flagId, event.payload);
    });

    // Step 2: Notify Wayfinder admin
    await step.do('notify-admin', async () => {
      await this.notifyWayfinder(event.payload);
    });

    // Step 3: Wait for human review (poll D1 every 15 min, max 7 days)
    const decision = await step.do('await-review', async () => {
      return await this.pollForReview(flagId, {
        pollInterval: 15 * 60 * 1000,  // 15 minutes
        maxWait: 7 * 24 * 60 * 60 * 1000,  // 7 days
      });
    });

    // Step 4: Enforce decision
    await step.do('enforce', async () => {
      if (decision.status === 'removed') {
        await this.hideContent(contentType, contentRef, tenantId);
        await this.notifyAuthor(userId, contentRef, decision.review_notes);
      }
      // 'cleared' = no enforcement action needed, just log
      await this.logResolution(flagId, decision);
    });
  }
}
```

**If no review happens in 7 days:** The Workflow logs a timeout and escalates (adds to a "stale reviews" dashboard counter). Content remains in its current state. This prevents auto-enforcement without human judgment.

### NCMECReportWorkflow

Federal law (18 U.S.C. 2258A) requires reporting CSAM within 24 hours. This Workflow makes that deadline durable.

```
  ┌──────────────┐
  │  1. BLOCK    │  Immediately block account (petal_account_flags)
  │  (checkpoint) │  Set block_uploads = 1, requires_manual_review = 1
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  2. PRESERVE │  Preserve evidence metadata (hashes only, never content)
  │  (checkpoint) │  Insert into petal_ncmec_queue with 24h deadline
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  3. REPORT   │  Submit to NCMEC CyberTipline API
  │  (checkpoint  │  Retry up to 5 times over 12 hours
  │   with retry) │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  4. CONFIRM  │  Update petal_ncmec_queue with report_id
  │  (checkpoint) │  Alert Wayfinder admin of the report
  └──────────────┘
```

**Deadline enforcement:** If step 3 fails all retries, the Workflow alerts Wayfinders with "URGENT: NCMEC report deadline approaching" and logs to Vista with severity "critical". Manual intervention is required.

**Evidence handling:** This Workflow NEVER stores image content. Only content hashes (SHA-256), user IDs, tenant IDs, and timestamps are preserved in the report.

### Workflow Bindings

```toml
[[workflows]]
name = "moderation-review"
binding = "MODERATION_REVIEW_WORKFLOW"
class_name = "ModerationReviewWorkflow"

[[workflows]]
name = "ncmec-report"
binding = "NCMEC_REPORT_WORKFLOW"
class_name = "NCMECReportWorkflow"
```

---

## Security Considerations

- **Content never enters the queue.** Blog post text and image data are NOT included in queue messages. The consumer fetches content from D1/R2 using the reference key. Queue messages contain only IDs and metadata.
- **CSAM evidence handling.** NCMEC Workflow only stores content hashes. Image bytes are never logged, queued, or stored in Workflow state. Federal compliance requires preserving metadata, not images.
- **Queue message encryption.** CF Queues encrypt messages at rest. Messages are only readable by the bound consumer Worker.
- **Tenant isolation.** Every queue message includes `tenantId`. The consumer validates that content belongs to the claimed tenant before scanning.
- **Rate limiting preserved.** Petal's existing rate limits (5/session, 20/day, 3 retries/image) remain enforced at the upload endpoint. The queue adds retry for the moderation step, not the upload.
- **Admin review access.** Only Wayfinder-role users can review flagged content. The review endpoint validates `role = 'wayfinder'`.
- **No auto-removal.** Only `block` level (confidence > 0.95) results in automatic enforcement. `flag_review` always requires human judgment.

---

## Requirements

| ID | Pattern | Requirement | Priority |
|----|---------|-------------|----------|
| REQ-001 | Ubiquitous | The system shall deliver every moderation scan request via CF Queue | Must Have |
| REQ-002 | Unwanted | If a moderation scan fails, the queue shall retry up to 3 times with exponential backoff | Must Have |
| REQ-003 | Event-Driven | When content is flagged for review, the system shall create a ModerationReviewWorkflow | Must Have |
| REQ-004 | Event-Driven | When CSAM is detected, the system shall create a NCMECReportWorkflow within 1 second | Must Have |
| REQ-005 | Event-Driven | When a Wayfinder reviews flagged content, the Workflow shall enforce the decision | Must Have |
| REQ-006 | Unwanted | If a queue message fails 3 times, the system shall route it to a dead-letter queue | Must Have |
| REQ-007 | State-Driven | While flagged content is pending review, the system shall not auto-remove it | Must Have |
| REQ-008 | Event-Driven | When the NCMEC report deadline approaches (< 6 hours), the system shall alert Wayfinders | Must Have |
| REQ-009 | Ubiquitous | The system shall never include raw content (text or images) in queue messages | Must Have |
| REQ-010 | Optional | Where bulk re-scan is triggered, the system shall queue re-scans at 10/second rate | Could Have |

---

## Implementation Checklist

### Queue Infrastructure

- [ ] Create CF Queue `grove-moderation` and DLQ `grove-moderation-dlq`
- [ ] Add producer binding `MODERATION_QUEUE` to engine wrangler.toml
- [ ] Add consumer binding to engine wrangler.toml (same Worker)
- [ ] Implement queue consumer with type-based routing

### Thorn Integration

- [ ] Replace `waitUntil(moderatePublishedContent())` with queue emit in `/api/blooms` POST
- [ ] Replace `waitUntil(moderatePublishedContent())` with queue emit in `/api/blooms/[slug]` PUT
- [ ] Implement `handleThornScan()` consumer handler
- [ ] Test: publish post, verify queue message arrives, verify scan executes

### Petal Integration

- [ ] Add `petal.scan` and `petal.rescan` event types
- [ ] Implement `handlePetalScan()` consumer handler
- [ ] Wire async re-scan for threshold changes

### Workflows

- [ ] Implement `ModerationReviewWorkflow` (log, notify, wait, enforce)
- [ ] Implement `NCMECReportWorkflow` (block, preserve, report, confirm)
- [ ] Add workflow bindings to wrangler.toml
- [ ] Wire queue consumer to trigger review workflow on `flag_review` results
- [ ] Wire Petal CSAM detection to trigger NCMEC workflow

### Monitoring

- [ ] DLQ check cron (daily, alerts on non-empty DLQ)
- [ ] Vista dashboard: moderation queue depth, scan rate, flag rate, DLQ count
- [ ] NCMEC deadline alerting (< 6 hours remaining)

### Admin API (for future review UI)

- [ ] `GET /api/admin/moderation/queue` — pending reviews
- [ ] `POST /api/admin/moderation/review/:flagId` — submit review decision
- [ ] `GET /api/admin/moderation/stats` — scan counts, flag rates, review times

---

## Related Specs

- [Thorn — Text Moderation](./thorn-spec.md)
- [Petal — Image Moderation](./petal-spec.md)
- [Export V3 — Workflow Export](./export-v3-workflow-spec.md) (first Workflow, establishes the pattern)

---

*Sunlight and shade. Both are needed for the forest to grow.*
