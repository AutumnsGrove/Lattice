---
title: "GroveAgent Consumers — The Hit List"
status: planned
category: infra
depends-on: grove-agent-spec
safari: docs/safaris/active/cloudflare-agents-safari.md
spec: docs/specs/grove-agent-spec.md
---

# GroveAgent Consumers — The Hit List

> Every animal photographed on safari, organized for the hunt.
> This plan assumes `@autumnsgrove/grove-agent` exists at `libs/grove-agent/`.
> Build the SDK first (see `docs/specs/grove-agent-spec.md`), then work this list.

## How to Use This Plan

Each consumer is a standalone task. An agent (or human) can pick up any item
and work it independently. Items within a phase can be done in any order.
Later phases may depend on earlier ones where noted.

**For each consumer, the work is:**
1. Create or update the worker/service at the listed location
2. Extend `GroveAgent`, `GroveChatAgent`, or `AgentWorkflow` from `@autumnsgrove/grove-agent`
3. Implement `groveConfig()` with the agent name
4. Wire up the SDK features listed (scheduling, queue, MCP, etc.)
5. Add `wrangler.toml` with DO migration (`new_sqlite_classes`)
6. Test locally with `wrangler dev`
7. Retire any workers/crons listed under "Retires"

**Naming convention:** `{Name}Agent` for GroveAgent consumers, `{Name}Workflow`
for AgentWorkflow consumers. Worker directories at `workers/{name}/`.

---

## Phase 0: Foundation

> Build the SDK itself. Nothing else moves until this ships.

- [ ] **Build `@autumnsgrove/grove-agent`** — `libs/grove-agent/`
  - Spec: `docs/specs/grove-agent-spec.md`
  - Delivers: `GroveAgent`, `GroveChatAgent`, `groveInit()`, `AgentLogger`, error catalog
  - Depends on: `agents` (Cloudflare SDK), `@autumnsgrove/lattice` (Signpost errors)

---

## Phase 1: Quick Wins

> Fix broken things. Retire dead workers. Prove the pattern.

### 1.1 OnboardingAgent

- **Class:** `GroveAgent`
- **Location:** `workers/onboarding/`
- **SDK features:** `schedule()`, `@callable()`, `onEmail()`, `queue()`
- **What it does:** Per-user email onboarding sequences. Each signup gets its own
  agent that schedules Day 0/1/7/14/30 emails, handles unsubscribe, tracks
  delivery state.
- **Retires:** `workers/email-catchup/` (weekly cron), `apps/landing/workers/onboarding-emails/` (deprecated daily cron)
- **Bindings:** `ZEPHYR` (service binding to `grove-zephyr`)
- **Instance key:** `onboarding:{userId}`
- **Safari ref:** Section 3

### 1.2 FiresideAgent

- **Class:** `GroveChatAgent`
- **Location:** `workers/fireside/`
- **SDK features:** `onChatMessage()`, `this.messages`, resumable streams, `@callable()`, `setState()` → UI sync
- **What it does:** Persistent conversational writing mode. Conversation survives
  tab close and device switch. Resumable streams. Draft generation as an
  approval-gated tool.
- **Replaces:** `libs/engine/src/routes/api/grove/wisp/fireside/+server.ts` (API endpoint)
- **Bindings:** `LUMEN` (AI inference)
- **Instance key:** `fireside:{tenantId}:{sessionId}`
- **Client hook:** `useAgentChat()`
- **Safari ref:** Section 1

---

## Phase 2: Infrastructure Mesh

> Build the backbone. Once Lumen is an MCP server, every other agent gets smarter.

### 2.1 LumenAgent (MCP Server)

- **Class:** `GroveAgent`
- **Location:** `workers/lumen/` (evolve existing)
- **SDK features:** MCP server (`@callable()` methods as tools), `schedule()` (quota resets), `this.sql` (per-tenant usage tracking)
- **What it does:** Exposes AI inference as MCP tools. Any agent can call Lumen
  for generation, embedding, moderation, transcription. Per-tenant quota tracking
  in agent SQL.
- **Replaces:** Current Hono worker at `workers/lumen/`
- **MCP tools exposed:** `infer`, `embed`, `moderate`, `transcribe`
- **Instance key:** Singleton or `lumen:{tenantId}` for quota isolation
- **Safari ref:** Section 9

### 2.2 ShutterAgent (Browser)

- **Class:** `GroveAgent`
- **Location:** `workers/shutter/` (evolve existing CF worker)
- **SDK features:** Browser binding (Puppeteer), `@callable()` (MCP tool), `scheduleEvery()` (URL monitoring), `queue()` (batch scraping)
- **What it does:** Web content extraction with Puppeteer. Prompt injection
  defense. Exposed as MCP tool so any agent can fetch web content. Optional
  URL monitoring via scheduling.
- **Replaces:** Current Shutter Cloudflare worker
- **MCP tools exposed:** `fetch`, `screenshot`, `monitor`
- **Instance key:** `shutter:{urlHash}` for monitoring, singleton for on-demand
- **Safari ref:** Section 4

---

## Phase 3: Cron Worker Retirement

> Kill the cron workers. Each becomes an agent with self-scheduling.

### 3.1 VistaAgent

- **Class:** `GroveAgent`
- **Location:** `workers/vista/` (replaces `workers/vista-collector/`)
- **SDK features:** `scheduleEvery(300)`, `schedule('0 0 * * *')`, `setState()` → real-time dashboard, `queue()` (alert dispatch)
- **What it does:** Infrastructure monitoring. Collects metrics every 5 min,
  aggregates costs daily, checks alert thresholds. Dashboard gets live updates
  via WebSocket state sync instead of polling.
- **Retires:** `workers/vista-collector/` (5-min + daily cron)
- **Instance key:** Singleton
- **Safari ref:** Section 7

### 3.2 MeadowPollerAgent

- **Class:** `GroveAgent`
- **Location:** `workers/meadow-poller/` (evolve in-place)
- **SDK features:** `scheduleEvery(900)`, `queue()` (per-feed parallel polling)
- **What it does:** RSS feed polling for community timeline. Replaces 15-min
  cron with agent self-scheduling. Each feed polled independently via queue.
- **Retires:** `workers/meadow-poller/` cron trigger
- **Instance key:** Singleton
- **Safari ref:** Section 12

### 3.3 TimelineAgent

- **Class:** `GroveAgent`
- **Location:** `workers/timeline/` (replaces `workers/timeline-sync/`)
- **SDK features:** `schedule('0 1 * * *')`, `queue()` (per-tenant processing), MCP client (calls Lumen + Shutter)
- **What it does:** Nightly activity summary generation. Each tenant queued
  independently with auto-retry. Calls Lumen MCP for AI generation, Shutter
  MCP for web content.
- **Retires:** `workers/timeline-sync/` (daily cron)
- **Instance key:** Singleton or `timeline:{tenantId}`
- **Safari ref:** Section 13

### 3.4 ClearingAgent

- **Class:** `GroveAgent`
- **Location:** `apps/clearing/` (evolve existing)
- **SDK features:** `scheduleEvery(60)` (health checks), `schedule('0 0 * * *')` (daily report), `setState()` → live status page, `queue()` (incident handling)
- **What it does:** Autonomous health monitoring. Checks all services every minute.
  Auto-detects incidents from failure patterns. Recovery tracking with follow-up
  schedules. Live status page via state sync.
- **Retires:** Clearing's 5-min + daily crons
- **Instance key:** Singleton
- **Safari ref:** Section 18

### 3.5 PulseAgent

- **Class:** `GroveAgent`
- **Location:** `services/pulse/` (evolve existing)
- **SDK features:** `schedule('0 * * * *')` (hourly rollup), `schedule('0 0 * * *')` (daily), `@callable()` (webhook intake), `setState()` (streak tracking)
- **What it does:** GitHub webhook processing + activity tracking. Replaces
  hourly and daily cron rollups with agent scheduling. Tracks dev streaks.
- **Retires:** Pulse hourly + daily crons
- **Instance key:** Singleton or `pulse:{tenantId}`
- **Safari ref:** Section 19

### 3.6 LoftAgent

- **Class:** `GroveAgent`
- **Location:** `workers/loft/` (evolve in-place)
- **SDK features:** `scheduleEvery()` (per-machine idle checks), `@callable()` (provision), `setState()` (active machine tracking)
- **What it does:** Dev environment provisioning with per-machine idle detection.
  Instead of global 2-minute polling, each machine gets its own schedule.
  Machines tracked in agent state.
- **Retires:** Loft's 2-min + 6-hour crons
- **Instance key:** Singleton
- **Safari ref:** Section 23

---

## Phase 4: New Capabilities

> Things that don't exist yet, or exist poorly. Agent patterns unlock them.

### 4.1 ThornAgent

- **Class:** `GroveAgent`
- **Location:** `workers/thorn/` (new — extracts from engine lib)
- **SDK features:** `queue()` (async moderation), `@callable()` (MCP tool), `setState()` → admin review queue, `this.sql` (moderation log)
- **What it does:** Async content moderation. Content publishes immediately,
  moderation happens in background via queue. Escalation to human review
  with real-time admin dashboard via state sync.
- **Replaces:** Synchronous Thorn calls in `libs/engine/src/lib/thorn/`
- **MCP tools exposed:** `moderate`, `check`
- **Instance key:** Singleton or `thorn:{tenantId}`
- **Safari ref:** Section 5

### 4.2 PetalWorkflow

- **Class:** `AgentWorkflow`
- **Location:** `workers/petal/` (new — implements spec)
- **SDK features:** `step.do()` with retries and timeouts, human-in-the-loop approval
- **What it does:** Durable 4-layer image moderation pipeline. CSAM detection →
  content classification → application validation → output verification.
  Each step durable with independent retries. Human approval gate for AI output.
- **Implements:** `docs/specs/petal-spec.md`
- **Instance key:** Per-image: `petal:{imageHash}`
- **Safari ref:** Section 6

### 4.3 RingsAgent

- **Class:** `GroveAgent`
- **Location:** `workers/rings/` (new — implements spec)
- **SDK features:** `@callable()` (record views), `schedule()` (daily aggregation, weekly digest), `this.sql` (private analytics), `setState()` → analytics dashboard
- **What it does:** Per-user private analytics. Each writer gets their own Rings
  agent. Analytics never leave the user's DO. 24-hour delayed metrics, Focus
  Periods, weekly digest emails.
- **Implements:** `docs/specs/rings-spec.md`
- **Instance key:** `rings:{tenantId}`
- **Safari ref:** Section 15

### 4.4 IvyAgent

- **Class:** `GroveChatAgent`
- **Location:** `apps/ivy/` (evolve existing)
- **SDK features:** `onEmail()` (webhook intake), `@callable()` (corrections), `schedule()` (daily digest), `setState()` → inbox UI, `this.sql` (learned rules)
- **What it does:** Smart email triage. Real-time classification via `onEmail()`.
  Learns from user corrections. Per-user inbox agent. Daily digest scheduling.
- **Replaces:** Ivy's cron-based queue processing
- **Instance key:** `ivy:{userId}`
- **Safari ref:** Section 10

---

## Phase 5: Workflow Upgrades

> Existing multi-step systems that become crash-resistant with durable workflows.

### 5.1 PatinaWorkflow

- **Class:** `AgentWorkflow`
- **Location:** `workers/patina/` (evolve in-place)
- **SDK features:** `step.do()` with retries and timeouts, durable execution
- **What it does:** Durable backup pipeline. Dump → Upload → Verify → Cleanup,
  each step with independent retries and crash recovery. 90-day retention pruning.
- **Retires:** Patina's cron trigger
- **Instance key:** `patina:{backupId}`
- **Safari ref:** Section 14

### 5.2 AmberWorkflow

- **Class:** `AgentWorkflow`
- **Location:** `services/amber/` (evolve existing)
- **SDK features:** `step.do()` with retries and timeouts, progress streaming via state sync
- **What it does:** Durable data export pipeline. Gather posts → Gather media →
  Assemble archive → Upload to R2 → Notify user. Each step crash-resistant.
  Progress streams to UI via WebSocket.
- **Replaces:** `ExportJobV2` Durable Object
- **Instance key:** `amber:{tenantId}:{exportId}`
- **Safari ref:** Section 17

### 5.3 ForageWorkflow

- **Class:** `AgentWorkflow`
- **Location:** `services/forage/` (evolve existing)
- **SDK features:** `step.do()` with retries, parallel steps, durable execution
- **What it does:** Durable domain search pipeline. RDAP check → Fan out to AI
  providers (parallel) → Compile results → Notify user. Each provider retries
  independently. Results compile even if one provider fails.
- **Replaces:** `SearchJobDO` Durable Object
- **Instance key:** `forage:{searchId}`
- **Safari ref:** Section 11

---

## Phase 6: Deep Migration

> Existing Loom DOs and stable services that gain agent features.

### 6.1 SentinelAgent

- **Class:** `GroveAgent`
- **Location:** `services/durable-objects/src/sentinel/` (evolve from Loom)
- **SDK features:** `scheduleEvery(60)` (health checks), `@callable()` (load test API), `setState()` → live results, workflows for load test orchestration
- **What it does:** Distributed health checks + load testing. Migrates from
  LoomDO to GroveAgent. Gains self-scheduling, WebSocket state sync for live
  results, workflow-based load test orchestration.
- **Replaces:** `SentinelDO` (Loom-based)
- **Instance key:** Singleton
- **Safari ref:** Section 8

### 6.2 WispAgent

- **Class:** `GroveAgent`
- **Location:** `workers/wisp/` (new — extracts from engine)
- **SDK features:** `@callable()` (analysis methods), `this.sql` (analysis history), `setState()` → editor sidebar
- **What it does:** Session-aware writing analysis. Each editing session gets its
  own agent. Remembers what it already suggested. Streams analysis results.
  History persisted in agent SQL.
- **Replaces:** `libs/engine/src/routes/api/grove/wisp/+server.ts` (stateless API)
- **Instance key:** `wisp:{tenantId}:{postSlug}`
- **Safari ref:** Section 2

### 6.3 ZephyrAgent

- **Class:** `GroveAgent`
- **Location:** `services/zephyr/` (evolve existing)
- **SDK features:** `queue()` (delivery with auto-retry), `onEmail()` (bounce handling), `this.sql` (send log), circuit breaker as agent state
- **What it does:** Email gateway with native queue and bounce handling.
  Circuit breaker lives in agent state. Send log in agent SQL.
  Every email delivery gets automatic retry semantics.
- **Replaces:** Current Zephyr service
- **Instance key:** Singleton
- **Safari ref:** Section 20

### 6.4 HearthAgent (Heartwood Sessions)

- **Class:** `GroveAgent`
- **Location:** `services/heartwood/` (SessionDO evolution)
- **SDK features:** `schedule('0 0 * * *')` (session cleanup), `scheduleEvery(3600)` (anomaly scan), `this.sql` (session tracking)
- **What it does:** Session management with anomaly detection. Daily cleanup of
  expired sessions. Hourly scan for suspicious patterns (IP changes, device
  trust scoring). Cautious migration — auth is security-critical.
- **Replaces:** `SessionDO` in Heartwood
- **Instance key:** Singleton or `session:{userId}`
- **Safari ref:** Section 21

---

## Phase 7: Infrastructure Meta

> The glue that ties everything together.

### 7.1 Infra SDK Agent Adapter

- **Location:** `libs/infra/`
- **What it does:** Wrap GroveAgent primitives (`schedule()`, `queue()`, `setState()`)
  as Infra SDK adapters. Workers that already use `GroveDatabase`, `GroveStorage`
  can gradually adopt `GroveAgent` patterns through the same Ports & Adapters interface.

### 7.2 CuriosAgent

- **Class:** `GroveAgent`
- **Location:** `workers/curios/` (new)
- **SDK features:** `@callable()` (MCP tools for curio updates), `scheduleEvery()` (external data sync), `setState()` → live blog curios
- **What it does:** Curios as MCP tools. Other agents write to curios — Timeline
  updates the activity curio, Rings feeds the hit counter, Wisp updates
  "currently writing" status. Scheduled sync for external data (Spotify, etc.).
- **Instance key:** `curios:{tenantId}`
- **Safari ref:** Section 27

### 7.3 Loom → GroveAgent Migration Guide

- **Location:** `docs/guides/` (new)
- **What it does:** Step-by-step guide for migrating existing LoomDO subclasses
  to GroveAgent. Mapping table: `this.sql.exec()` → `` this.sql`...` ``,
  `this.store` → `this.state`, `this.alarms` → `schedule()`, etc.

---

## Phase 8: Future Consideration

> Low priority. Unlock when the need arises.

### 8.1 PostMigratorAgent

- **Class:** `GroveAgent`
- **Location:** `workers/post-migrator/` (re-enable + evolve)
- **SDK features:** `schedule('0 3 * * *')`, `queue()` (per-post migration)
- **What it does:** Intelligent hot/warm/cold storage tier placement. Currently
  disabled. Agent gives crash recovery and access-pattern awareness.
- **Instance key:** Singleton
- **Safari ref:** Section 26

### 8.2 WardenAgent

- **Class:** `GroveAgent`
- **Location:** `workers/warden/` (evolve existing)
- **SDK features:** `this.sql` (audit logs), `schedule()` (key rotation reminders)
- **What it does:** Credential gateway with audit trails and rotation scheduling.
  Security-critical — migrate last, migrate carefully.
- **Instance key:** Singleton
- **Safari ref:** Section 22

---

## Reference: SDK Feature → Consumer Matrix

| SDK Feature | Consumers |
|---|---|
| `schedule()` / cron | Onboarding, Vista, Timeline, Clearing, Pulse, Loft, Rings, Heartwood, PostMigrator, Warden |
| `scheduleEvery()` | Vista, Meadow, Loft, Clearing, Curios, Sentinel |
| `queue()` | Onboarding, Thorn, Vista, Meadow, Timeline, Pulse, Shutter, Zephyr |
| `@callable()` RPC | All agents (primary API surface) |
| `setState()` + sync | All agents (real-time UI updates) |
| `this.sql` | Ivy, Rings, Thorn, Wisp, Zephyr, Heartwood, Warden, Curios |
| `onEmail()` | Onboarding, Ivy, Zephyr |
| `onChatMessage()` | Fireside, Ivy |
| MCP server | Lumen, Shutter, Thorn, Curios |
| MCP client | Timeline (→Lumen, Shutter), Fireside (→Lumen) |
| Browser binding | Shutter |
| `AgentWorkflow` | Petal, Patina, Amber, Forage |
| `useAgent()` hook | Vista, Clearing, Rings, Sentinel, Loft |
| `useAgentChat()` hook | Fireside, Ivy |

---

## Reference: Worker Retirement Map

| Phase | Retired Worker/DO | Replacement |
|---|---|---|
| 1 | `workers/email-catchup/` | OnboardingAgent |
| 1 | `apps/landing/workers/onboarding-emails/` | OnboardingAgent |
| 1 | Fireside API endpoint | FiresideAgent |
| 3 | `workers/vista-collector/` | VistaAgent |
| 3 | `workers/meadow-poller/` cron | MeadowPollerAgent |
| 3 | `workers/timeline-sync/` | TimelineAgent |
| 3 | `apps/clearing/` crons | ClearingAgent |
| 3 | `services/pulse/` crons | PulseAgent |
| 3 | `workers/loft/` crons | LoftAgent |
| 5 | `workers/patina/` cron | PatinaWorkflow |
| 5 | `ExportJobV2` DO | AmberWorkflow |
| 5 | `SearchJobDO` DO | ForageWorkflow |
| 6 | `SentinelDO` (Loom) | SentinelAgent |
| 6 | Wisp API endpoint | WispAgent |
| 6 | `SessionDO` (Heartwood) | HearthAgent |

---

_Every animal photographed. Every trail marked. The field guide is ready._
_Now build the SDK, and let the forest come alive._
