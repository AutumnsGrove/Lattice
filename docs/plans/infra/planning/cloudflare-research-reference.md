---
title: "Cloudflare Research — Consolidated Reference"
description: "Consolidated reference from three safaris and one deep dive covering the full Cloudflare adoption roadmap, deployment landscape, and moderation stack"
category: infra
status: planning
created: 2026-02-21
---

# Cloudflare Research — Consolidated Reference

> *The full map, drawn from three safaris and one deep dive. Everything in one place for quick reference.*
>
> **Last updated**: February 2026
> **Source documents**: `cloudflare-deep-dive-safari.md`, `cloudflare-infrastructure-deep-dive.md`, `cloudflare-deployment-safari.md`, Petal library deep-dive (session research)

-----

## The Big Opportunities Table

| Component | Status | What Exists Today | What's Missing | Opportunity |
|-----------|--------|-------------------|----------------|-------------|
| **Loom SDK** | 🟢 Thriving | Complete framework, 9 production DOs, full test suite | No event emission, no workflow triggers | Add `emit()` and `workflow()` to LoomDO base class — every DO becomes event-capable |
| **Forage** | 🟢 Thriving | SearchJobDO on Loom, alarm-based batch chaining, LLM agents | Sequential batching, no parallel fan-out | Migrate to queue-based parallel fan-out — DO coordinates, queue handles parallelism |
| **Ivy** | 🟡 Growing | Full email client, Zephyr gateway, TriageDO, AI triage | Queue handler is a STUB (`throw new Error`), no drip workflows | **#1 Queue candidate** — transactional + digest queues, drip onboarding Workflow |
| **Amber** | 🟡 Growing | SvelteKit UI, R2 storage, ExportJobV2 on Loom | No media processing pipeline, no thumbnails, export is fragile | Queue-first when building pipeline; **export needs CF Workflow** for durability |
| **Meadow** | 🟡 Growing | SvelteKit feed, RSS poller, timeline-sync, ThresholdDO | Cron polling, no queue between poller & D1 | Queue between poller and D1 writes; scheduled posts via Workflow |
| **Thorn** | 🟠 Wilting | Library: 3-model AI cascade, `waitUntil()` hooks, D1 logging | No retry on failure, no review UI, `waitUntil()` can fail silently | Wrap in queue for reliability; build admin review UI |
| **Petal** | 🟠 Wilting | Library: 4-layer pipeline, vision cascade, circuit breaker | Same `waitUntil()` fragility, no standalone Worker, PhotoDNA pending | Wrap in queue; moderation Workflow for human-in-the-loop review |
| **Firefly SDK** | 🟠 Wilting | Full spec (SDK + Queen coordinator), pattern doc | Zero production code | **#1 Workflow candidate** — build Workflow-first for multi-step provisioning |
| **Wander** | 🔴 Barren | Nothing ("Wanderer" = user identity term, not a service) | Everything | Greenfield Phase 6+ feature, not an infrastructure upgrade |
| **CF Queues** | ⚠️ Gap | Zero usage anywhere in the codebase | The primitive itself | Missing reliability layer across the entire stack |
| **CF Workflows** | ⚠️ Gap | Zero usage anywhere in the codebase | The primitive itself | Missing durability layer for multi-step processes |

-----

## Adoption Roadmap — Recommended Order

### Phase 1: Ivy transactional email queue
**Why first**: Most mature service with the clearest gap. Stub queue handler already exists — replace with real CF Queue consumer.
- `ivy-transactional-queue` (high priority): welcome, password reset, verification
- `ivy-digest-queue` (batch priority): weekly digests, notification rollups
- Immediate benefit: retry on Resend failure, spike absorption

### Phase 2: Loom SDK `emit()` integration
**Why second**: Small surface area, high leverage. One change makes every DO a queue producer.
- Add `this.emit(event, payload)` to LoomDO base class
- Add `this.workflow(name, params)` for triggering CF Workflows from DOs
- Backward compatible — existing DOs unchanged

### Phase 3: Meadow poller queue
**Why third**: Decouple RSS polling from D1 writes. Immediate throughput improvement.
- `meadow-poller` pushes per-tenant RSS results to queue
- Consumer batches D1 upserts efficiently

### Phase 4: Ivy onboarding Workflow (first CF Workflow)
**Why fourth**: First Workflow in production. Canonical use case.
- Day 0 welcome → sleep 24h → Day 1 nudge → sleep 6d → Week 1 tips
- Replaces need for scheduled DB polling

### Phase 5: Amber export Workflow
**Why fifth**: ExportJobV2 uses alarm-based chaining that's fragile. CF Workflow adds durability.
- Collect posts → generate markdown → build ZIP → upload R2 → notify user
- Each step is a durable checkpoint — failures resume, don't restart

### Phase 6: Thorn/Petal moderation queues + review UI
- Wrap existing libraries in CF Queues for guaranteed retry
- Build `ModerationWorkflow` for flagged content requiring human review
- Build admin review UI for `thorn_flagged_content` and Petal security logs

### Phase 7: Firefly provisioning (Workflow-first)
- Build using comprehensive specs already written
- Queen DO on Loom SDK, CF Workflow for lifecycle management
- Queue for CI job fan-out across runner pool

### Phase 8: Forage parallel fan-out migration
- Migrate from alarm-based sequential to queue-based parallel
- DO stays as coordinator/memory; queue handles parallelism

### Phase 9: Wander (greenfield, full stack)
- DO + Queue + Workflow from day one
- Building blocks ready: Loom SDK, Meadow signals, Forage pattern

-----

## Deployment Landscape — Quick Reference

### Current State: 23 Deployments

| Type | Count | Examples |
|------|-------|---------|
| Pages (SvelteKit) | 8 | Engine, Landing, Plant, Meadow, Clearing, Domains, Login, Terrarium |
| Workers — Services | 7 | Heartwood, Grove Router, Durable Objects, OG Worker, Zephyr, Pulse, Email Render |
| Workers — Cron | 8 | Email Catchup, Onboarding Emails, Meadow Poller, Timeline Sync, Vista Collector, etc. |

### After Pages → Workers Conversion: ~17 Deployments

6 cron workers get absorbed into their parent apps:

| Cron Worker | Absorbed Into | Schedule |
|-------------|---------------|----------|
| `webhook-cleanup` | Engine | `0 3 * * *` |
| `post-migrator` | Engine | `0 3 * * *` (disabled) |
| `timeline-sync` | Engine | `0 1 * * *` |
| `onboarding-emails` | Landing | `0 10 * * *` |
| `meadow-poller` | Meadow | `*/15 * * * *` |
| `clearing-monitor` | Clearing | `*/5 * * * *` |

### Conversion Priority

1. **Engine** — Highest value. Smart placement, absorb 3 crons, secrets store, full Vista observability
2. **Landing** — Hosts Vista, absorb onboarding-emails, self-observability
3. **Meadow** — Absorb poller, smart placement for D1 feeds
4. **Clearing** — Absorb monitor, simple conversion
5. **Plant** — Smart placement for payment latency, secrets store for Stripe
6. Domains → Login → Terrarium — low priority

### What Pages Can't Do (That Workers Can)

- Cron triggers (the #1 gap — forced creation of 8 standalone cron workers)
- Smart Placement (`[placement] mode = "smart"` for D1 latency)
- Secrets Store bindings (centralized secret rotation)
- `--var` flags on deploy (scriptable, version-controlled env vars)
- Route configuration in code (infrastructure-as-code)
- Tail Workers (real-time structured log streaming for Vista)

-----

## The Engine Identity Crisis

`packages/engine` is simultaneously:
- **A library** (`@autumnsgrove/lattice`) — 539 files, 253 export paths, consumed by 10 packages
- **A deployment** (`grove-lattice`) — 262 route files, 127 API handlers, serves `*.grove.place`

**Resolution**: Both are Lattice. Split structurally (`libs/engine/` for library, `apps/engine/` for deployment), not by renaming. This split is the prerequisite for the Pages → Workers conversion.

-----

## Content Moderation Stack — Thorn & Petal Reference

### Thorn (Text Moderation)

| Aspect | Detail |
|--------|--------|
| **Location** | `libs/engine/src/lib/thorn/` |
| **Integration** | Library, called via `waitUntil()` on post publish/edit |
| **AI cascade** | GPT-oss Safeguard 20B → LlamaGuard 4 12B → DeepSeek V3.2 |
| **Enforcement** | Graduated: allow → warn → flag_review → block |
| **Sensitivity** | Per content type: blog_post (permissive) → comment (strict) |
| **Thresholds** | 0.4 (allow below), 0.95 (block above) |
| **Storage** | `thorn_moderation_log` (90-day audit), `thorn_flagged_content` (review queue) |
| **Tests** | 22 test cases |
| **Name** | "Resin" was explored as alternative — never applied, all code is `thorn/` |

### Petal (Image Moderation)

| Layer | Purpose | Implementation |
|-------|---------|---------------|
| **Layer 1: CSAM** | Mandatory child safety | PhotoDNA primary (awaiting Microsoft approval), vision model fallback. FAILS CLOSED. NCMEC reporting required (placeholder impl). |
| **Layer 2: Classify** | Content categorization | Workers AI Llama 4 Scout → Llama 3.2 Vision → Together.ai. 13 categories, confidence thresholds (0.9 block, 0.8 review, 0.7 context). |
| **Layer 3: Sanity** | Context-specific validation | Face count, screenshot detection, quality scoring. Per-context: tryon (strict) → profile → blog → general (lenient). |
| **Layer 4: Output** | AI-generated image verification | Re-runs Layer 2 on generated images. Up to 3 retries with different seeds. |

| Aspect | Detail |
|--------|--------|
| **Location** | `libs/engine/src/lib/server/petal/` (13 files) |
| **Provider cascade** | CF Llama 4 Scout (primary) → CF Llama 3.2 Vision → Together.ai |
| **Circuit breaker** | In-memory, per-isolate: 3 failures → 60s cooldown |
| **Rate limits** | 5/session, 20/day, 3 retries/image, 1 CSAM flag = instant ban |
| **Upload gating** | `image_uploads_enabled` default false until PhotoDNA approved |
| **Config** | `libs/engine/src/lib/config/petal.ts` (375 lines) |
| **Migrations** | `030_petal.sql`, `031_petal_upload_gate.sql` |
| **Tests** | `petal.test.ts`, `petal-integration.test.ts`, `lumen-classify.test.ts` |
| **Lumen path** | Alternative classification via Lumen router (Gemini Flash → Claude Haiku → CF Llama 4 Scout) |

### What Both Are Missing (Infrastructure, Not Logic)

- No standalone moderation Workers — everything inside main app via `waitUntil()`
- No guaranteed retry — if `waitUntil()` fails, moderation silently skips
- No queue-based decoupling or backpressure
- No human review UI (tables exist, no admin interface)
- No durable pipeline between scan → review → decision

-----

## Cross-Cutting Themes

1. **Cron → Queue is the universal migration pattern.** Three services use cron as a poor substitute for event-driven queues. Replace cron polling with CF Queue consumers.

2. **Alarm chaining → Workflow for complex multi-step.** Forage, ExportDO, TriageDO all use DO alarm-based chaining. For processes that must survive failures (export, provisioning, moderation review), CF Workflows are more appropriate.

3. **Loom SDK is the linchpin.** Every queue and workflow integration should flow through Loom. Adding `emit()` and `workflow()` to LoomDO makes the entire DO fleet event-capable in one change.

4. **The research oversells the current problem.** Several services described as "needing migration" either don't exist (Wander) or don't have the problems described (Meadow isn't push-based). The real wins: add queues to Ivy/Meadow's cron patterns, and build new services queue/workflow-first.

5. **Build new services on the full stack from day one.** Firefly, Wander, and Thorn/Petal queue wrappers should all start with DOs + Queues + Workflows.

-----

## Source Documents

| Document | Location | Focus |
|----------|----------|-------|
| Deep Dive Safari | `docs/plans/planning/cloudflare-deep-dive-safari.md` | 9-stop research vs. reality audit |
| Infrastructure Deep Dive | `docs/plans/planning/cloudflare-infrastructure-deep-dive.md` | DOs, Queues, Workflows technical reference |
| Deployment Safari | `docs/plans/planned/cloudflare-deployment-safari.md` | 23-deployment Pages vs. Workers audit |
| Petal Deep Dive | Session research (February 2026) | 4-layer image moderation pipeline |

-----

*Everything in one place. For the forest.*
