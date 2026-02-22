---
title: "Grove x Cloudflare Infrastructure — The Deep Dive"
description: "Technical reference for Durable Objects, Queues, Workflows, and their application patterns in the Grove ecosystem"
category: infra
status: planning
created: 2026-02-21
---

# Grove × Cloudflare Infrastructure — The Deep Dive

> *A knowledge document for Grove's internal forest. Synthesized from research & exploration — February 2026.*

-----

## Table of Contents

- [Durable Objects — The Unique Primitive](#durable-objects)
  - [What They Are](#what-they-are)
  - [The Actor Model Lineage](#the-actor-model-lineage)
  - [Alternatives (and why none fully compare)](#alternatives)
  - [Timeline](#timeline)
  - [Who Uses Them in the Wild](#who-uses-them-in-the-wild)
- [Cloudflare Queues](#cloudflare-queues)
  - [How They Work](#how-queues-work)
  - [Grove Use Cases](#grove-queue-use-cases)
- [Cloudflare Workflows](#cloudflare-workflows)
  - [How They Work](#how-workflows-work)
  - [Grove Use Cases](#grove-workflow-use-cases)
- [Grove Service Integration Map](#grove-service-integration-map)
  - [Amber — File Storage](#amber)
  - [Ivy — Email](#ivy)
  - [Meadow — Social Feed](#meadow)
  - [Wander — Discovery](#wander)
  - [Thorn & Petal — Content Moderation](#thorn--petal)
  - [Loom SDK — DO Orchestration](#loom-sdk)
  - [Firefly SDK — Server Provisioning](#firefly-sdk)
- [Agentic Patterns — The Forage Model](#agentic-patterns)

-----

## Durable Objects

### What They Are

A Durable Object (DO) is a globally unique, single-threaded, stateful compute unit that lives on Cloudflare's edge network. Each instance:

- Has its **own identity** — addressable by name or ID
- Has its **own storage** — including a full SQLite database as of 2024
- **Serializes all operations** — no race conditions, no distributed locking needed
- **Hibernates when idle** — wakes instantly on demand, persists indefinitely
- **Scales infinitely** — you define the class once; every user/tenant/session/document gets their own instance

The mental model: *a tiny, hibernating, multiplying microprocess with its own database, co-located with the user who needs it.*

The property that makes them irreplaceable for multi-tenant platforms: `idFromName("user-123")` gives you a globally consistent, isolated compute+storage unit for that user. Every Grove blog, every tenant, every session — its own DO. Zero infrastructure management.

```typescript
// One class definition...
export class TenantDO extends DurableObject {
  async getConfig() { /* ... */ }
  async updateSettings(data) { /* ... */ }
}

// ...infinitely many isolated instances
const tenantDO = env.TENANT.idFromName(`tenant-${blogSlug}`);
const stub = env.TENANT.get(tenantDO);
await stub.updateSettings({ theme: "midnight" });
```

### The Actor Model Lineage

DOs are an implementation of the **virtual actor pattern** — a concept with deep roots:

|Technology                    |Type            |Notes                                                                                                                                            |
|------------------------------|----------------|-------------------------------------------------------------------------------------------------------------------------------------------------|
|**Microsoft Orleans**         |Self-hosted .NET|The academic ancestor. "Grains" = virtual actors. Same pattern, requires your own servers.                                                       |
|**Akka Cluster Sharding**     |Self-hosted JVM |Used in finance/gaming. Powerful but heavy infrastructure burden.                                                                                |
|**Azure Durable Entities**    |Managed cloud   |Closest managed equivalent. Not edge-deployed, heavier DX.                                                                                       |
|**Temporal.io**               |Managed         |Durable *execution* (workflow-oriented), not stateful actors. Different problem, related space.                                                  |
|**Cloudflare Durable Objects**|Managed edge    |The only option combining: actor model + edge deployment + hibernation + zero infra + WebSocket support + co-located SQLite. **Category of one.**|

The thing no alternative replicates: the **tight integration** between a Worker and its DO — same data center, near-zero latency, storage co-located with compute co-located with the user.

### Alternatives

For every other Cloudflare product there's a reasonable swap:

|CF Product         |Alternative                             |
|-------------------|----------------------------------------|
|R2                 |S3, Backblaze B2, any object store      |
|D1                 |Any SQLite-compatible DB, Turso         |
|KV                 |Redis, Upstash, DynamoDB                |
|Workers            |Lambda@Edge, Fastly Compute, Deno Deploy|
|DNS                |Route53, anything                       |
|**Durable Objects**|**Nothing. Not really.**                |

The VPS instinct isn't wrong conceptually — a DO *is* kind of like a VPS — but you'd be rebuilding the scheduler, hibernation logic, geographic distribution, and activation/deactivation lifecycle. That's what Cloudflare's platform team spent years building.

### Timeline

|Date          |Milestone                                           |
|--------------|----------------------------------------------------|
|September 2019|Announced at Birthday Week — concept/preview        |
|2020          |Limited beta opens                                  |
|2021          |Open beta                                           |
|2022          |**General Availability** — production-ready         |
|2024          |**SQLite storage in every DO** — the game-changer   |
|April 2024    |Cloudflare acquires PartyKit                        |
|October 2024  |Cloudflare Workflows enters open beta (built on DOs)|
|April 2025    |DOs added to free plan                              |


> The version of DOs that makes them truly compelling for multi-tenant platforms — a stateful actor with its own relational storage — is only about a year old. You're genuinely early.

### Who Uses Them in the Wild

Companies rarely advertise their infrastructure stack, but confirmed production users:

**Liveblocks** — Real-time collaboration platform. Their entire "rooms" architecture is DOs. Every collaborative session is a DO instance with WebSocket connections attached. They also replaced Redis entirely. If you've ever used an app with Liveblocks collaboration inside it, you touched a DO.

**Ninetailed** — Edge personalization/A/B testing. Replaced an *entire network of 10 Redis clusters* with DOs. One DO per user, data lives at the edge closest to them. Quote from their engineer: *"I personally don't know another service that can provide that."*

**Kaizen Gaming** — Online sports betting. Used DOs as WebSocket fan-out hubs. Result: 600,000 simultaneous user connections collapsed to ~1,000 connections to their origin. **1000x reduction.** 200% bandwidth reduction. 20% latency improvement.

**Fortune 500 Retailer (unnamed)** — Built the PS5 launch waiting room on DOs. The fairness guarantee was critical — a single-datacenter DO means two people literally cannot be told they're next in line simultaneously.

**PartyKit (now Cloudflare)** — Entire product built as a DO abstraction layer for multiplayer apps. Acquired by Cloudflare April 2024.

**Azule AI** — Used DOs to ship their MVP faster than any other platform. Used R2 for vector storage instead of a dedicated vector DB.

**Cloudflare Workflows** — Meta: Cloudflare's own Workflows product is internally built on top of DOs. Using Workflows means using DOs under the hood.

-----

## Cloudflare Queues

### How Queues Work

Queues is Cloudflare's managed message queue — conceptually similar to AWS SQS. Two sides:

**Producer side** — anything can push a message. One line from a Worker or DO:

```typescript
await env.MY_QUEUE.send({ type: "image.compress", key: "uploads/photo.jpg" });
```

**Consumer side** — a Worker with a `queue` handler. Cloudflare wakes it automatically when messages are waiting:

```typescript
export default {
  async queue(batch: MessageBatch, env: Env) {
    for (const message of batch.messages) {
      await processImage(message.body);
      message.ack(); // confirm handled — if you don't ack, CF retries automatically
    }
  }
}
```

Key properties:

- **At-least-once delivery** — messages won't be lost
- **Automatic retry** — unacknowledged messages are retried
- **Batching** — consumer receives multiple messages at once for efficiency
- **Dead letter queues** — failed messages after max retries go somewhere safe
- **Natural rate limiting** — consumers process at their own pace, protecting downstream services from traffic spikes
- **Producer/consumer decoupled** — they don't know about each other

The result: your write path (the user-facing request) becomes instantaneous. All heavy lifting happens in the background, reliably, with retries.

### Grove Queue Use Cases

See [Grove Service Integration Map](#grove-service-integration-map) for per-service detail. The universal pattern:

```
User action (fast) → push to queue → Worker consumer (slow, reliable, retried)
```

-----

## Cloudflare Workflows

### How Workflows Work

Workflows (open beta October 2024, built on DOs) provides **durable execution** — multi-step code that survives crashes, auto-retries failed steps, can sleep/wait for arbitrary durations, and runs for hours or days. You write sequential code; the runtime guarantees it actually finishes.

```typescript
export class OnboardingWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    // Step 1 — runs immediately
    await step.do("send-welcome-email", async () => {
      await ivy.send({ to: event.payload.email, template: "welcome" });
    });

    // Step 2 — literally waits 24 hours, survives any restarts
    await step.sleep("wait-day-1", "24 hours");

    // Step 3 — checks state, branches
    await step.do("day-1-nudge", async () => {
      const hasPosted = await checkFirstPost(event.payload.userId);
      if (!hasPosted) {
        await ivy.send({ to: event.payload.email, template: "nudge-first-post" });
      }
    });

    await step.sleep("wait-week-1", "6 days");

    await step.do("week-1-tips", async () => {
      await ivy.send({ to: event.payload.email, template: "getting-started-tips" });
    });
  }
}
```

If the Worker running step 3 crashes mid-execution, Workflows resumes from step 3 — not from the beginning. Each `step.do()` is a durable checkpoint.

Key differences from Queues:

|                       |Queues                               |Workflows                                  |
|-----------------------|-------------------------------------|-------------------------------------------|
|**State between steps**|None                                 |Full — each step knows what happened before|
|**Duration**           |Single Worker execution (up to 15min)|Hours, days, indefinitely                  |
|**Retries**            |Per-message                          |Per-step, with backoff                     |
|**Use case**           |Fire-and-forget background tasks     |Multi-step processes that must complete    |
|**Coordination**       |None                                 |Branching, sleeping, waiting for events    |

### Grove Workflow Use Cases

See [Grove Service Integration Map](#grove-service-integration-map) for per-service detail. The universal pattern:

```
Multi-step process that must complete reliably over time → Workflow
```

-----

## Grove Service Integration Map

### Amber

*File storage hub — currently handling uploads, compression, R2 management.*

**Current issue:** File processing likely happens synchronously or optimistically via Workers — no guaranteed retry if processing fails.

**With Queues:**

- Every upload pushes a message to `amber-processing-queue`
- Consumer Worker handles: compression, WebP conversion, thumbnail generation (multiple sizes), optional NSFW pre-scan before Petal
- User gets instant response on upload; processing happens reliably in background
- Multiple consumers can process the same message for different output artifacts in parallel

**With Workflows:**

- For complex media pipelines: `upload → scan (Petal) → compress → generate thumbnails → update metadata → notify publisher`
- Each step is a durable checkpoint — if thumbnail generation fails, it retries from there, not from the beginning
- Could gate post publishing on media processing completion without blocking the user

```typescript
// Amber upload handler
await env.AMBER_QUEUE.send({
  type: "media.process",
  key: uploadKey,
  tenantId,
  outputs: ["webp-full", "webp-thumb-400", "webp-thumb-100"]
});
return Response.json({ status: "processing", key: uploadKey });
```

-----

### Ivy

*Email service — transactional and notification emails.*

**Current issue:** Email sending inline with request handlers means one slow/failed Resend API call affects the user-facing response.

**With Queues:**

- Every email is a queue message — fire from anywhere in Grove, consumer handles the actual Resend/Postmark call
- Natural rate limiting — if a viral post triggers 10,000 notification emails, the queue absorbs the spike; Ivy's consumer processes at a safe rate
- Automatic retry on provider failures
- Separate queues for different priority tiers: `ivy-transactional` (high priority, small batch) vs `ivy-digest` (lower priority, large batch)

**With Workflows:**

- **Drip onboarding sequences** — the canonical Workflow use case:
  - Day 0: welcome
  - Day 1: nudge if no first post
  - Day 7: getting started tips
  - Day 30: monthly recap
- **Subscription lifecycle** — trial start → wait 14 days → check conversion → conditional email → wait 7 more → downgrade if needed
- **Re-engagement sequences** — user inactive 30 days → check last activity → personalized "we miss you" → wait 7 → final email
- All of these are single Workflow definitions. No cron jobs. No polling. No scheduled DB queries.

-----

### Meadow

*Social feed — follows, post propagation, activity.*

**Current issue:** Publishing a post likely triggers synchronous feed updates — a fan-out problem that gets expensive as follower counts grow.

**With Queues:**

- Post published → push to `meadow-fanout-queue` with post ID + author ID
- Consumer Worker fetches follower list, batches feed entry writes to D1/KV
- Publisher gets instant "post published" response; feed propagation is eventual (seconds, not blocking)
- Separate queue for notification emails (→ Ivy): "someone you follow just posted"
- Milestone events (100 views, first comment) → queue → notification pipeline

**With Workflows:**

- Scheduled posts: Workflow sleeps until publish time, then triggers the full publish pipeline (Meadow fan-out queue, Ivy notification, RSS update, search index update)
- "Post series" publishing schedules — Workflow coordinates releasing a multi-part series on schedule

-----

### Wander

*Exploration and discovery mode.*

**With Queues:**

- User interaction signals (views, hovers, tag follows, engagement) → queue → preference update pipeline
- Keeps the UX snappy; recommendation model updates asynchronously in background
- Batch processing of signals for efficiency — process 50 signals at once rather than one at a time

**With Workflows (+ agentic):**

- Periodic per-user discovery refresh: Workflow triggers on schedule, spins up a Forage-style swarm (see [Agentic Patterns](#agentic-patterns)), LLM synthesizes personalized recommendations from Meadow signals, writes back to user's Wander DO
- Fully automated, personalized, durable — runs for each user on their own schedule

-----

### Thorn & Petal

*Content moderation — Thorn for text, Petal for images.*

**Current state:** Both are **library implementations** inside the engine, not standalone Workers or Worker chains.

**Thorn** (`libs/engine/src/lib/thorn/`) — Text moderation, called via `waitUntil()` hooks after post publish/edit. Uses Lumen AI client with a 3-model cascade (GPT-oss Safeguard 20B → LlamaGuard 4 12B → DeepSeek V3.2). Has D1 tables for audit trail (`thorn_moderation_log`) and review queue (`thorn_flagged_content`). Graduated enforcement: allow → warn → flag_review → block, with content-type sensitivity (blog posts most permissive, comments stricter). 22 test cases. Privacy-first: logs decisions with content reference, never stores content. 90-day retention with automatic cleanup.

**Petal** (`libs/engine/src/lib/server/petal/`) — 4-layer image moderation pipeline. Layer 1: CSAM detection via PhotoDNA (awaiting Microsoft approval, falls back to vision model). Layer 2: content classification via Workers AI (Llama 4 Scout primary, Llama 3.2 Vision fallback, Together.ai tertiary). Layer 3: context-aware sanity checks (face detection, screenshot detection, quality scoring). Layer 4: AI-generated output verification. Full config with rate limits, confidence thresholds, circuit breaker for provider failover, and per-context requirements (tryon/profile/blog/general). Has D1 migrations and security logging.

**What works well:** Both libraries are functional, tested, and integrated into the publishing pipeline. Thorn fires on `on_publish` and `on_edit`; Petal scans on image upload. They never block the user-facing response — moderation runs asynchronously.

**What's missing:** No guaranteed retry if an AI provider call fails mid-scan. No durable state between moderation and human review. No queue-based decoupling. If `waitUntil()` fails silently, moderation is skipped entirely with no record. No standalone Workers — everything runs inside the main app Worker's lifecycle.

**This is where Queues + Workflows fill the gap — not replacing a broken system, but adding reliability and durability to a working one.**

**With Queues:**

```
Post submitted
  → push to thorn-scan-queue (text content)
  → push to petal-scan-queue (images, if any)

thorn-scan-queue consumer:
  → run text through Lumen (existing Thorn library)
  → ack if clean, push to moderation-review-queue if flagged
  → automatic retry if AI provider call fails

petal-scan-queue consumer:
  → run images through Petal's 4-layer pipeline (existing library)
  → ack if clean, push to moderation-review-queue if flagged
```

Benefits over current `waitUntil()` pattern:

- **Retries** — if a Lumen or Workers AI call times out, the message retries automatically. Currently a `waitUntil()` failure is silent — no retry, no record.
- **Decoupled** — Thorn and Petal already run independently; queues formalize this and add backpressure.
- **Observable** — queue depth, processing time, and dead letter counts give visibility into moderation health.
- **Dead letter queues** — content that fails moderation after max retries goes somewhere inspectable, not into a void.
- **Scales independently** — the moderation consumer can scale separately from the main app Worker.

**With Workflows:**

- For borderline/flagged content requiring human review:

```typescript
export class ModerationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const thornResult = await step.do("thorn-scan", () => thornScan(event.payload));
    const petalResult = await step.do("petal-scan", () => petalScan(event.payload));

    if (thornResult.flagged || petalResult.flagged) {
      // Hold post, notify moderator
      await step.do("flag-for-review", () => flagPost(event.payload.postId));
      await step.do("notify-moderator", () => ivy.send({ template: "mod-review-needed" }));

      // Wait up to 48 hours for manual review decision
      const decision = await step.waitForEvent("mod-decision", { timeout: "48 hours" });

      if (decision.payload.approved) {
        await step.do("approve-post", () => publishPost(event.payload.postId));
      } else {
        await step.do("reject-post", () => rejectPost(event.payload.postId));
        await step.do("notify-author", () => ivy.send({ template: "post-rejected" }));
      }
    } else {
      await step.do("publish-post", () => publishPost(event.payload.postId));
    }
  }
}
```

This wraps the existing Thorn and Petal libraries in a durable, auditable, human-in-the-loop moderation pipeline — with retry guarantees and state persistence that `waitUntil()` cannot provide.

-----

### Loom SDK

*DO orchestration layer — coordinates DOs, D1, and Workers.*

Loom already abstracts the hard parts of the DO pattern. The natural evolution:

**Queue integration in Loom:**

- Loom's session/tenant DOs become natural queue producers — any state change that has side effects pushes to the appropriate queue rather than calling downstream services directly
- Loom could expose a `loom.emit(event, payload)` abstraction that internally routes to the right queue
- Keeps DO logic clean — DO handles state, queue handles side effects

**Workflow integration in Loom:**

- Multi-step tenant provisioning (new Grove blog) becomes a Loom-triggered Workflow: create tenant DO → provision subdomain → seed defaults → send confirmation → update DNS
- All or nothing, durable, no partial provisioning states

**Threshold SDK alignment:**

- If Threshold handles rate limiting / access control, Workflows could enforce time-based limits (trial periods, feature gates with expiry) as durable sleeping Workflows rather than cron-based checks

-----

### Firefly SDK

*Server provisioning — handles spinning up hourly compute (Heather et al.) for Minecraft servers, agent code runners, CI environments.*

**Current state:** A Worker-based sequence that provisions and manages servers. Not a proper Workflow — no durability guarantees across the multi-step provisioning lifecycle.

**This is the most natural Workflow candidate in the entire Grove ecosystem.**

A server provisioning job is:

1. Request compute (Heather API call) — could fail, needs retry
1. Wait for server to boot — unknown duration, need to poll or receive webhook
1. Configure server (install deps, set up env) — multiple steps, any can fail
1. Register in Grove's service registry
1. Notify requester (Ivy)
1. Monitor health — periodic, long-running
1. Handle teardown when time expires or user requests it

Every one of these is a step that can fail independently and needs to resume from where it left off, not restart from scratch.

```typescript
export class FireflyProvisionWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const server = await step.do("request-compute", () =>
      heather.provision(event.payload.spec)
    );

    // Wait for boot — polls with retries, survives Worker restarts
    await step.do("wait-for-boot", async () => {
      let ready = false;
      while (!ready) {
        ready = await heather.isReady(server.id);
        if (!ready) await new Promise(r => setTimeout(r, 5000));
      }
    });

    await step.do("configure-server", () =>
      heather.configure(server.id, event.payload.config)
    );

    await step.do("register-service", () =>
      grove.registry.register(server)
    );

    await step.do("notify-requester", () =>
      ivy.send({ to: event.payload.userId, template: "server-ready", data: server })
    );

    // Sleep until expiry
    await step.sleep("server-lifetime", event.payload.durationHours + " hours");

    await step.do("teardown", () =>
      heather.deprovision(server.id)
    );
  }
}
```

**With Queues for Firefly:**

- CI job queue — submit jobs, Worker pool picks them up, scales naturally
- Agentic code runner tasks (from code editing agent) fan out across available Firefly servers via queue

-----

## Agentic Patterns

### The Forage Model

The pattern discovered building Forage (domain searching tool) is the canonical agentic queue pattern:

```
Request → Worker → LLM generates task list → push N tasks to queue →
N consumer Workers execute in parallel → aggregate results
```

This is powerful because:

- LLM handles the "what to do" (strategy)
- Queue handles the parallelism and retry (execution)
- No coordination code needed — queue is the coordinator
- Scales to arbitrary task counts automatically

```typescript
// Forage-style agentic fan-out
export default {
  async fetch(request, env) {
    const query = await request.json();

    // LLM generates search strategy
    const strategy = await llm.complete(`Generate 10 search queries for: ${query.topic}`);
    const searches = parseSearchList(strategy);

    // Fan out to queue — all run in parallel
    await Promise.all(searches.map(search =>
      env.FORAGE_QUEUE.send({ search, correlationId: query.id })
    ));

    return Response.json({ status: "searching", correlationId: query.id });
  }
}
```

### DOs as Agent Memory

The combination of Loom SDK + DOs gives agents persistent, isolated, consistent memory per entity:

- **Per-user agent context** — user's DO holds their entire interaction history, preferences, current task state
- **Per-session agent state** — long-running agent sessions survive Worker restarts because state lives in DO, not Worker memory
- **Coordination without locks** — multiple Workers can interact with the same agent DO; the DO serializes all operations

### Wander as an Agentic Discovery Engine

The natural evolution of Wander using the full stack:

```
Scheduled Workflow (per user, periodic)
  → Fetch user's Meadow signals from their DO (Loom)
  → Push to Forage-style discovery queue
  → N Workers query different content sources in parallel
  → Aggregate results → LLM synthesizes personalized feed
  → Write recommendations back to user's Wander DO
  → Workflow completes, sleeps until next cycle
```

Fully automated, personalized, durable, scales to every Grove user independently.

### Ivy as an Intelligent Email Agent

Instead of template emails, Workflow triggers → agent reads user's post analytics from their DO → LLM drafts personalized weekly digest → pushes to Ivy queue → sends. Not "here are your stats." Actual thoughtful, personal recaps.

-----

## Key Takeaways

1. **Durable Objects are genuinely unique.** No 1:1 alternative exists. The combination of actor model + edge + hibernation + co-located SQLite + zero infra is a category of one. You're building on this in its relative infancy (GA 2022, SQLite 2024).
1. **Queues add reliability to `waitUntil()` patterns.** Thorn and Petal already work as libraries — queues add guaranteed retry, backpressure, and dead letter handling. Amber processing, Ivy sending, and Meadow fan-out all benefit from the same decoupling.
1. **Workflows fix multi-step processes that need durability.** Firefly provisioning, Ivy drip sequences, Thorn+Petal moderation with human review, tenant provisioning — all become durable, resumable, auditable.
1. **The stack compounds.** DO (state) + Queue (async side effects) + Workflow (durable multi-step) + Worker (stateless compute) + Loom SDK (orchestration) = a full agentic application runtime. Grove already has most of this built. Queues and Workflows are the missing layer.
1. **The Forage pattern generalizes.** LLM-generated task list → queue fan-out → parallel Workers → aggregate is the pattern for any agentic Grove feature: Wander discovery, Ivy personalization, content analysis, CI orchestration via Firefly.

-----

*Document generated February 2026. For the forest.*
