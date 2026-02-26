# Cloudflare Agents SDK Safari — The Forest Awakens

> Every tree in the Grove could have its own heartbeat. The Agents SDK gives them one.
> **Aesthetic principle**: Stateful, autonomous, self-scheduling — agents that wake, work, and sleep.
> **Scope**: Map every Grove system against Cloudflare Agents SDK capabilities.

---

## Ecosystem Overview

**Cloudflare Agents SDK** (`agents` v0.6.0) — a TypeScript framework for building
stateful AI agents on Cloudflare Durable Objects. Built on PartyServer, with
built-in SQL, WebSocket state sync, task scheduling, queues, MCP integration,
workflows, email handling, and web browsing.

**Grove/Lattice** — 9 apps, 9 services, 11 workers, 3 D1 databases, 6+ Durable
Objects, all running on Cloudflare. Currently uses plain Workers, Hono, and the
Loom DO framework.

**The question**: What happens when every Worker in the forest becomes an Agent?

### SDK Capabilities at a Glance

| Capability | What It Replaces | Grove Impact |
|---|---|---|
| `Agent` base class | Plain Worker + Hono | Stateful, hibernatable, self-scheduling |
| `AIChatAgent` | Manual chat endpoints | Persistent conversations, resumable streams |
| `schedule()` / `scheduleEvery()` | Worker cron triggers | Per-instance scheduling, no separate workers |
| `queue()` | Manual retry logic | Async task processing with auto-retry |
| `this.sql` | Raw D1 queries | Per-agent SQLite (DO storage), no D1 needed for local state |
| `setState()` + WebSocket sync | Manual state management | Real-time UI updates, automatic persistence |
| `@callable()` RPC | HTTP API endpoints | Type-safe method invocation over WebSocket |
| MCP Server/Client | Service bindings | Agent-to-agent tool sharing |
| Workflows (`AgentWorkflow`) | Multi-step cron jobs | Durable execution with retries, human-in-the-loop |
| `onEmail()` | Zephyr + cron workers | Native email handling per agent |
| Browser binding | External fetch/Tavily | Puppeteer on Cloudflare for web scraping |
| Observability events | Manual logging | Structured event emission |

---

## The Route

### Systems by Integration Priority

**Tier 1 — Natural Fit (These were BUILT for this)**

| # | Stop | Category | Current State | Agent Fit |
|---|---|---|---|---|
| 1 | Fireside | AIChatAgent | API endpoint + sessionStorage | Perfect |
| 2 | Wisp | AIChatAgent | API endpoints | Perfect |
| 3 | Email Onboarding | Scheduling + Workflows | Broken cron, deprecated worker | Solves a real problem |
| 4 | Shutter | Agent + Browser | Python + CF Worker hybrid | Browser binding is a game-changer |

**Tier 2 — Strong Upgrade (Significant architectural improvement)**

| # | Stop | Category | Current State | Agent Fit |
|---|---|---|---|---|
| 5 | Thorn | Agent + Queue | Engine library (sync) | Async moderation pipeline |
| 6 | Petal | Agent + Workflows | Spec only | 4-layer pipeline as workflow |
| 7 | Vista | Agent + Scheduling | Cron worker + dashboard | Self-scheduling with state sync |
| 8 | Sentinel | Agent + Scheduling | Durable Object | Natural evolution from Loom |
| 9 | Lumen | Agent + MCP | Hono worker | MCP server for AI tools mesh |

**Tier 3 — Good Fit (Clean migration, moderate gains)**

| # | Stop | Category | Current State | Agent Fit |
|---|---|---|---|---|
| 10 | Meadow Poller | Agent + Scheduling | Cron worker | `scheduleEvery(900)` replaces worker |
| 11 | Timeline Sync | Agent + Scheduling | Cron worker | Nightly schedule + per-tenant queues |
| 12 | Patina | Agent + Workflows | Cron worker | Durable backup pipeline |
| 13 | Rings | Agent + State | Planned | Per-user private analytics DO |
| 14 | Scribe | Sub-agent | Lumen task type | Could be autonomous transcription agent |

**Tier 4 — Meta / Infrastructure**

| # | Stop | Category | Current State | Agent Fit |
|---|---|---|---|---|
| 15 | Infra SDK | Agent Adapter | Ports & Adapters | Wrap agent primitives as infra |
| 16 | Loom | Migration Path | DO framework | Agents SDK is the next-gen Loom |
| 17 | Zephyr | Agent + Queue | Service worker | Native queue + retry |
| 18 | Warden | Agent + State | Hono worker | Audit logs, key rotation scheduling |

---

## 1. Fireside — The Campfire Becomes Permanent

**Character**: A warm conversation by the fire where words flow naturally and
stories emerge without pressure. Currently, the fire goes out when you close
the tab.

### What exists today

**Wisp Fireside endpoint** (`libs/engine/src/routes/api/grove/wisp/fireside/+server.ts`):
- [x] Conversational writing mode with rotating starter prompts
- [x] Minimum depth threshold (3+ messages, 150+ tokens)
- [x] Input/output ratio enforcement
- [x] Guardrails blocking generation requests
- [x] Transparency marker (`*~ written fireside with Wisp ~*`)
- [ ] **Session storage is client-side only** — lose the tab, lose the conversation
- [ ] **No message persistence** — every session starts from scratch
- [ ] **No resumable streams** — if connection drops, response is lost
- [ ] **15-min KV backup is fragile** — race conditions, no multi-device

### Design spec (safari-approved)

**Core transformation:** Fireside becomes an `AIChatAgent` — every conversation
is a Durable Object with persistent messages, resumable streams, and real-time
state sync.

```typescript
class FiresideAgent extends AIChatAgent<Env, FiresideState> {
  initialState = {
    phase: 'warming-up',        // warming-up | conversing | drafting | complete
    messageCount: 0,
    totalTokens: 0,
    draftReady: false,
    starterPrompt: null,
  };

  async onChatMessage(onFinish) {
    // Persistent conversation — survives tab close, device switch
    // Resumable stream — reconnect picks up where it left off
    // State syncs to UI in real-time (draft progress bar, phase indicator)

    const response = streamText({
      model: this.getLumenModel(),
      messages: this.messages,
      system: FIRESIDE_SYSTEM_PROMPT,
      tools: {
        generateDraft: tool({
          description: 'Generate a draft from the conversation',
          inputSchema: z.object({ style: z.enum(['raw', 'polished']) }),
          execute: async ({ style }) => {
            // Only available after depth threshold
            return this.compileDraft(style);
          },
          needsApproval: async () => true, // Human confirms before draft generation
        }),
      },
    });

    return response.toDataStreamResponse();
  }

  @callable()
  async getConversationSummary() {
    return { phase: this.state.phase, messages: this.messages.length };
  }
}
```

**What this gives us:**
- Close the tab, come back tomorrow — conversation is there
- Switch from phone to laptop — conversation syncs
- Connection drops mid-stream — reconnects and resumes
- Draft generation as a tool with human approval
- Real-time phase indicator in the UI

**Migration:** Replace `POST /api/grove/wisp/fireside` with WebSocket connection
to FiresideAgent. Client uses `useAgentChat()` hook.

---

## 2. Wisp — The Writing Assistant Gets a Memory

**Character**: A gentle presence that polishes your words without replacing them.
Currently stateless — analyzes, forgets, repeats.

### What exists today

**Wisp API** (`libs/engine/src/routes/api/grove/wisp/+server.ts`):
- [x] Grammar analysis with severity levels
- [x] Tone analysis with trait scoring
- [x] Readability analysis (Flesch-Kincaid)
- [x] Zero Data Retention from inference providers
- [ ] **No session continuity** — each analysis is independent
- [ ] **No learning from corrections** — same suggestions every time
- [ ] **No streaming** — wait for full analysis before showing results

### Design spec (safari-approved)

**Wisp as Agent:** Grammar/tone/readability become `@callable()` methods.
Analysis history persists in agent SQL. Streaming feedback via WebSocket.

```typescript
class WispAgent extends Agent<Env, WispState> {
  @callable({ description: 'Analyze grammar, tone, and readability' })
  async analyze(text: string, options: AnalysisOptions) {
    // Streams results as they complete
    const grammar = await this.analyzeGrammar(text);
    this.setState({ ...this.state, lastAnalysis: grammar });
    return grammar;
  }

  @callable({ description: 'Get analysis history for this session' })
  async getHistory() {
    return this.sql`SELECT * FROM analyses ORDER BY created_at DESC LIMIT 20`;
  }
}
```

**Key insight:** Each post-editing session gets its own Wisp agent instance
(`wisp:{tenantId}:{postSlug}`). The agent remembers what it already suggested
and avoids repeating itself.

---

## 3. Email Onboarding — The Broken Clock Gets Fixed

**Character**: A warm welcome sequence that guides new Wanderers through their
first days. Currently, the clock is stuck.

### What exists today

**Email infrastructure:**
- [x] Zephyr email gateway (working, with retry + circuit breaker)
- [x] React Email templates (warm, personalized)
- [x] 3 audience segments (Wanderer, Promo, Rooted)
- [x] 5-email sequences (Day 0, 1, 7, 14, 30)
- [ ] **Old onboarding worker still deployed** — duplicate email risk
- [ ] **Unsubscribe sync is stubbed** — requires Resend audience setup
- [ ] **Cron-based catch-up is fragile** — weekly sweep misses edge cases
- [ ] **No per-user tracking** — can't see where someone is in their journey

### Design spec (safari-approved)

**This is the killer use case for agent scheduling.**

Instead of cron workers sweeping for missed emails, each new signup gets their
own agent instance that manages their entire onboarding journey:

```typescript
class OnboardingAgent extends Agent<Env, OnboardingState> {
  initialState = {
    audience: null,        // 'wanderer' | 'promo' | 'rooted'
    emailsSent: [],
    unsubscribed: false,
    completedAt: null,
  };

  // Called once when user signs up
  @callable()
  async startSequence(userId: string, audience: AudienceType) {
    this.setState({ ...this.state, audience, userId });

    // Schedule the ENTIRE sequence upfront
    await this.schedule(0, 'sendEmail', { day: 0, template: 'welcome' });
    await this.schedule(86400, 'sendEmail', { day: 1, template: 'day1' });       // +1 day
    await this.schedule(604800, 'sendEmail', { day: 7, template: 'day7' });      // +7 days
    await this.schedule(1209600, 'sendEmail', { day: 14, template: 'day14' });   // +14 days
    await this.schedule(2592000, 'sendEmail', { day: 30, template: 'day30' });   // +30 days
  }

  async sendEmail(payload: EmailPayload) {
    if (this.state.unsubscribed) return; // Respect opt-out

    await this.env.ZEPHYR.fetch('/send', {
      method: 'POST',
      body: JSON.stringify({
        template: payload.template,
        audience: this.state.audience,
        userId: this.state.userId,
      }),
    });

    this.setState({
      ...this.state,
      emailsSent: [...this.state.emailsSent, { day: payload.day, sentAt: Date.now() }],
    });
  }

  @callable()
  async unsubscribe() {
    this.setState({ ...this.state, unsubscribed: true });
    // Cancel all pending scheduled emails
    const schedules = this.getSchedules();
    for (const s of schedules) {
      await this.cancelSchedule(s.id);
    }
  }

  // Handle bounce/reply emails
  async onEmail(email: AgentEmail) {
    if (email.subject?.includes('unsubscribe')) {
      await this.unsubscribe();
    }
  }
}
```

**What this solves:**
- No more cron workers sweeping for missed emails
- No more duplicate email risk from overlapping workers
- Each user's journey is independently tracked and interruptible
- Unsubscribe is instant (cancel all scheduled emails)
- Bounce handling is native (`onEmail()`)
- The old onboarding worker and email-catchup worker both get retired
- Admin can query any user's onboarding state via `@callable()`

**Workers retired:** `onboarding-emails` (deprecated), `email-catchup` (weekly cron)

---

## 4. Shutter — The Binoculars Get Upgraded

**Character**: A careful eye that reads the web for you, filtering out the
noise and the traps. Currently squinting through foggy glass.

### What exists today

**Shutter library** (`libs/shutter/cloudflare/src/`):
- [x] Two-phase prompt injection defense (Canary + Extraction)
- [x] Domain offenders list in D1
- [x] Four model tiers
- [x] CORS-enabled API
- [ ] **Uses external fetch/Tavily** — no native browser
- [ ] **No page interaction** — can't click, scroll, or fill forms
- [ ] **No screenshots** — text-only extraction
- [ ] **No scheduled re-scraping** — one-shot only
- [ ] **Python primary, CF port incomplete**

### Design spec (safari-approved)

**The browser binding changes everything.** Shutter gets Puppeteer on Cloudflare.

```typescript
class ShutterAgent extends Agent<Env, ShutterState> {
  async browse(url: string, query: string) {
    const browser = await puppeteer.launch(this.env.BROWSER);
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle0' });

    // Can now handle SPAs, JS-rendered content, paywalls
    const content = await page.evaluate(() => document.body.innerText);
    const screenshot = await page.screenshot({ type: 'png' });

    await browser.close();

    // Run through Canary check
    const injectionCheck = await this.canaryCheck(content);
    if (injectionCheck.detected) {
      this.flagDomain(url);
      return { error: 'injection_detected', ...injectionCheck };
    }

    // Extract relevant content via LLM
    return this.extract(content, query);
  }

  // MCP Server: expose Shutter as a tool for other agents
  // Lumen, Wisp, Timeline can all call Shutter to fetch web content
  @callable({ description: 'Fetch and extract web content with injection defense' })
  async fetch(url: string, query: string) {
    return this.browse(url, query);
  }

  // Schedule periodic re-scraping for monitored URLs
  @callable()
  async monitor(url: string, interval: number) {
    await this.scheduleEvery(interval, 'rescrape', { url });
  }
}
```

**New capabilities:**
- Full browser automation (SPAs, JS-rendered content)
- Screenshot capture for visual content
- Scheduled monitoring of URLs
- MCP tool exposure — any agent can fetch web content through Shutter
- Per-URL agent instances for monitoring (`shutter:{urlHash}`)

---

## 5. Thorn — The Thorns Grow Sharper

**Character**: Patient protection that judges context, not keywords. Currently
synchronous — blocks the request while moderating.

### What exists today

**Thorn library** (`libs/engine/src/lib/thorn/`):
- [x] Songbird three-bird defense (Canary, Kestrel, Robin)
- [x] Policy-based reasoning with confidence scoring
- [x] Zero human surveillance
- [x] Outcome-only retention
- [ ] **Synchronous execution** — blocks the request
- [ ] **No batch processing** — one piece of content at a time
- [ ] **No escalation workflow** — binary pass/fail

### Design spec (safari-approved)

```typescript
class ThornAgent extends Agent<Env, ModerationState> {
  // Async moderation — queue content, return immediately
  @callable()
  async moderate(content: string, contentId: string) {
    await this.queue('processModeration', { content, contentId });
    return { status: 'queued', contentId };
  }

  async processModeration(payload: ModerationPayload) {
    const result = await this.songbirdPipeline(payload.content);

    if (result.needsHumanReview) {
      // Human-in-the-loop: pause and wait for Pathfinder review
      this.setState({ ...this.state, pendingReview: payload.contentId });
      // Broadcast to admin dashboard via WebSocket state sync
    }

    this.sql`INSERT INTO moderation_log (content_id, decision, confidence)
             VALUES (${payload.contentId}, ${result.decision}, ${result.confidence})`;
  }

  // MCP Server: expose moderation as a tool
  // Meadow, Timeline, any content pipeline can call Thorn
  @callable({ description: 'Check content against Grove policies' })
  async check(content: string) {
    return this.songbirdPipeline(content);
  }
}
```

**Upgrade:** Synchronous → asynchronous. Content gets published immediately,
moderation happens in the background via queue. Escalation goes to human review
with state sync to admin dashboard.

---

## 6. Petal — The Four Layers Become a Workflow

**Character**: Petals close to protect what's precious. Four layers of image
defense, zero data retention.

### What exists today

**Spec only** (`docs/specs/petal-spec.md`):
- [x] Four-layer architecture designed
- [x] CSAM detection (PhotoDNA) planned
- [x] Provider cascade (Together.ai → FAL.ai → Replicate)
- [ ] **Not implemented** — spec is ready, code is not

### Design spec (safari-approved)

**Petal's 4-layer pipeline is a textbook workflow:**

```typescript
class PetalWorkflow extends AgentWorkflow {
  async run(step: Step, payload: ImagePayload) {
    // Layer 1: CSAM Detection (MANDATORY, no bypass)
    const csamResult = await step.do('csam-check', { timeout: '30s' }, async () => {
      return this.photoDNACheck(payload.imageHash);
    });
    if (csamResult.flagged) {
      await step.do('csam-report', async () => {
        await this.reportToNCMEC(payload);
        await this.flagAccount(payload.userId);
      });
      return { blocked: true, reason: 'policy_violation' };
    }

    // Layer 2: Content Classification
    const classification = await step.do('classify', { retries: { limit: 3 } }, async () => {
      return this.classifyImage(payload.imageUrl);
    });

    // Layer 3: Application Validation
    if (payload.useCase === 'try-on') {
      await step.do('validate-tryon', async () => {
        return this.validateTryOnImage(payload.imageUrl);
      });
    }

    // Layer 4: Output Verification (for AI-generated images)
    if (payload.isGenerated) {
      const approval = await this.waitForApproval(step, { timeout: '24h' });
      if (!approval) return { blocked: true, reason: 'approval_timeout' };
    }

    return { approved: true, classification };
  }
}
```

**Why workflows:** Each step is durable. If the classification provider fails,
it retries automatically. If CSAM is detected, the report step is guaranteed
to execute. Human-in-the-loop for AI output verification.

---

## 7. Vista — The Lookout Gets Real-Time Vision

**Character**: The high point where you can see the entire forest. Currently
updates every 5 minutes via cron.

### What exists today

**Vista collector** (`workers/vista-collector/`):
- [x] 5-minute metric collection (Workers, D1, R2, KV health)
- [x] Daily cost aggregation + 90-day retention
- [x] Alert thresholds with email delivery
- [ ] **Cron-based** — separate worker, no real-time
- [ ] **No live dashboard** — data is stale by definition
- [ ] **No state sync** — dashboard polls, doesn't subscribe

### Design spec (safari-approved)

```typescript
class VistaAgent extends Agent<Env, VistaState> {
  initialState = {
    lastCollection: null,
    healthStatus: {},
    alerts: [],
    costToday: 0,
  };

  async onStart() {
    // Replace cron with self-scheduling
    await this.scheduleEvery(300, 'collectMetrics', {});      // Every 5 min
    await this.schedule('0 0 * * *', 'aggregateCosts', {});    // Daily midnight
  }

  async collectMetrics() {
    const metrics = await this.fetchAllMetrics();
    this.sql`INSERT INTO metrics (timestamp, data) VALUES (${Date.now()}, ${JSON.stringify(metrics)})`;

    // State sync — dashboard updates in real-time
    this.setState({
      ...this.state,
      lastCollection: Date.now(),
      healthStatus: metrics.health,
    });

    // Check alert thresholds
    for (const alert of this.checkThresholds(metrics)) {
      await this.queue('sendAlert', alert);
    }
  }

  // Real-time dashboard via WebSocket state sync
  // Admin opens Vista → connects via useAgent() → sees live metrics
  @callable()
  async getHistoricalMetrics(hours: number) {
    return this.sql`SELECT * FROM metrics WHERE timestamp > ${Date.now() - hours * 3600000}`;
  }
}
```

**Workers retired:** `vista-collector` cron worker

---

## 8. Sentinel — The Watchdog Evolves

**Character**: Distributed monitoring and load testing. Currently a Durable
Object via Loom.

### What exists today

**Sentinel DO** (`services/durable-objects/src/sentinel/`):
- [x] Test execution state management
- [x] Profile-based test orchestration
- [x] Real-time metric collection in KV
- [ ] **Built on Loom** — functional but verbose
- [ ] **No native scheduling** — relies on external triggers
- [ ] **No state sync** — results polled, not pushed

### Design spec (safari-approved)

**Sentinel migrates from Loom to Agents SDK.** The Agent class IS the next-gen Loom.

```typescript
class SentinelAgent extends Agent<Env, SentinelState> {
  // Health check scheduling
  async onStart() {
    await this.scheduleEvery(60, 'healthCheck', {});   // Every minute
  }

  async healthCheck() {
    const results = await this.checkAllEndpoints();
    this.setState({ ...this.state, health: results });

    if (results.unhealthy.length > 0) {
      await this.queue('escalate', { unhealthy: results.unhealthy });
    }
  }

  // Load test orchestration as a workflow
  @callable()
  async startLoadTest(profile: TestProfile) {
    const instance = await this.runWorkflow('LoadTestWorkflow', profile);
    return { workflowId: instance.id };
  }
}
```

---

## 9. Lumen — The Gateway Becomes an Agent Mesh

**Character**: The void through which all intelligence flows. Currently a
single Hono worker routing requests.

### What exists today

**Lumen worker** (`workers/lumen/src/index.ts`) + **engine lib** (`libs/engine/src/lib/lumen/`):
- [x] Unified inference routing (8 task types)
- [x] Provider fallback chains (OpenRouter → Workers AI)
- [x] PII scrubbing pipeline
- [x] Songbird injection protection
- [x] Tier-based quota management
- [x] Streaming support
- [ ] **Stateless** — no conversation memory
- [ ] **No MCP** — tools not exposed to other agents
- [ ] **No per-tenant quotas in real-time** — checked per-request from D1

### Design spec (safari-approved)

**Lumen as MCP Server:** The biggest unlock. Every Grove agent gets AI
capabilities by consuming Lumen's MCP tools.

```typescript
class LumenAgent extends Agent<Env, LumenState> {
  // MCP Server: expose AI inference as tools
  // Any agent can call: await this.addMcpServer('lumen', env.LUMEN)
  @callable({ description: 'Run AI inference with task routing' })
  async infer(task: LumenTask, input: string, tenantId: string) {
    return this.pipeline.run({ task, input, tenant: tenantId });
  }

  @callable({ description: 'Generate text embeddings' })
  async embed(input: string) {
    return this.pipeline.embed(input);
  }

  @callable({ description: 'Moderate content against policies' })
  async moderate(content: string) {
    return this.pipeline.moderate(content);
  }

  // Per-tenant quota tracking as agent state
  async trackUsage(tenantId: string, tokens: number) {
    const key = `quota:${tenantId}:${today()}`;
    const current = this.sql`SELECT tokens FROM quotas WHERE key = ${key}`;
    this.sql`INSERT OR REPLACE INTO quotas (key, tokens) VALUES (${key}, ${(current?.[0]?.tokens || 0) + tokens})`;
  }

  // Schedule daily quota resets
  async onStart() {
    await this.schedule('0 0 * * *', 'resetQuotas', {});
  }
}
```

**The MCP Mesh vision:**

```
┌─────────────┐     MCP      ┌─────────────┐
│  Fireside    │─────────────▶│   Lumen     │◀──── MCP ────┐
│  Agent       │              │   Agent     │               │
└─────────────┘              └──────┬──────┘         ┌─────┴──────┐
                                    │ MCP            │  Timeline  │
┌─────────────┐     MCP            │                │  Agent     │
│  Wisp       │────────────────────┤                └────────────┘
│  Agent      │                    │
└─────────────┘              ┌─────┴──────┐
                             │  Shutter   │◀──── MCP ────┐
┌─────────────┐     MCP     │  Agent     │               │
│  Thorn      │─────────────▶│ (browser)  │         ┌─────┴──────┐
│  Agent      │              └────────────┘         │  Meadow    │
└─────────────┘                                     │  Poller    │
                                                    └────────────┘
```

Every agent can call every other agent's tools. Fireside calls Lumen for
inference. Timeline calls Shutter for web content. Thorn calls Lumen for
moderation. The mesh is self-organizing.

---

## 10. Meadow Poller — The Gatherer Wakes on Schedule

**Character**: Patient RSS gatherer that feeds the community timeline. Currently
a separate cron worker.

### What exists today

**Meadow poller** (`workers/meadow-poller/`):
- [x] 15-minute RSS polling
- [x] SSRF prevention
- [x] Content size limits
- [x] Uses Infra SDK
- [ ] **Separate worker** — another thing to deploy and monitor
- [ ] **No per-feed scheduling** — all feeds polled at same interval

### Design spec (safari-approved)

```typescript
class MeadowPollerAgent extends Agent<Env, PollerState> {
  async onStart() {
    await this.scheduleEvery(900, 'pollAllFeeds', {});  // Every 15 min
  }

  async pollAllFeeds() {
    const feeds = await this.getOptedInFeeds();
    for (const feed of feeds) {
      await this.queue('pollFeed', { feed });  // Parallel via queue
    }
  }

  async pollFeed(payload: { feed: FeedConfig }) {
    // Each feed processed independently with retry
    const rss = await this.fetchRSS(payload.feed.url);
    await this.ingestPosts(rss, payload.feed.tenantId);
  }
}
```

**Workers retired:** `meadow-poller` cron worker

---

## 11. Timeline Sync — The Storyteller Gets Smarter

**Character**: Nightly summaries of activity, told in the user's chosen voice.

### What exists today

**Timeline sync** (`workers/timeline-sync/`):
- [x] Daily cron at 1 AM UTC
- [x] Per-tenant GitHub/API integration
- [x] Multiple voice presets (poetic, professional, casual)
- [x] BYOK (per-tenant OpenRouter keys)
- [ ] **All tenants processed sequentially** — slow for many tenants
- [ ] **No retry per tenant** — one failure can stall the batch

### Design spec (safari-approved)

```typescript
class TimelineAgent extends Agent<Env, TimelineState> {
  async onStart() {
    await this.schedule('0 1 * * *', 'nightlySync', {});
  }

  async nightlySync() {
    const tenants = await this.getEnabledTenants();
    for (const tenant of tenants) {
      // Each tenant queued independently — parallel with auto-retry
      await this.queue('syncTenant', { tenantId: tenant.id });
    }
  }

  async syncTenant(payload: { tenantId: string }) {
    // Uses Lumen MCP for inference, Shutter MCP for web content
    const activity = await this.fetchActivity(payload.tenantId);
    const summary = await this.generateSummary(activity, payload.tenantId);
    await this.saveSummary(payload.tenantId, summary);
  }
}
```

**Workers retired:** `timeline-sync` cron worker

---

## 12. Patina — Backups Get Durable Workflows

**Character**: Careful preservation of everything that matters.

### What exists today

**Patina** (`workers/patina/`):
- [x] Scheduled backups
- [x] D1 + R2 integration
- [ ] **No durability guarantees** — if the worker crashes mid-backup, state is lost
- [ ] **No verification step** — backup created but never verified

### Design spec (safari-approved)

```typescript
class PatinaWorkflow extends AgentWorkflow {
  async run(step: Step) {
    const databases = ['grove-engine-db', 'grove-curios-db', 'grove-observability-db'];

    for (const db of databases) {
      // Each step is durable — survives crashes
      const dump = await step.do(`dump-${db}`, { timeout: '5m' }, async () => {
        return this.dumpDatabase(db);
      });

      await step.do(`upload-${db}`, { retries: { limit: 3 } }, async () => {
        return this.uploadToR2(dump, db);
      });

      await step.do(`verify-${db}`, async () => {
        return this.verifyBackup(db);
      });
    }

    // 90-day retention cleanup
    await step.do('cleanup', async () => {
      return this.pruneOldBackups(90);
    });
  }
}
```

---

## 13. Rings — Private Analytics Born as an Agent

**Character**: Count the rings of a tree and you learn its story. Rings are
internal. Private.

### What exists today

**Spec only** (`docs/specs/rings-spec.md`):
- [x] 24-hour delayed metrics designed
- [x] Focus Periods and Digest Mode planned
- [x] Privacy-first philosophy defined
- [ ] **Not implemented**

### Design spec (safari-approved)

**Per-user Durable Object is the PERFECT model for private analytics.**

Each writer gets their own Rings agent (`rings:{tenantId}`). Their analytics
never leave their DO. No central aggregation. True privacy.

```typescript
class RingsAgent extends Agent<Env, RingsState> {
  initialState = {
    focusPeriodActive: false,
    digestMode: false,
    lastDigestSent: null,
  };

  // Record a page view (called from site middleware)
  @callable()
  async recordView(postSlug: string, metadata: ViewMetadata) {
    // Privacy: strip identifying info, keep only aggregates
    this.sql`INSERT INTO views (post_slug, timestamp, referrer_domain)
             VALUES (${postSlug}, ${Date.now()}, ${metadata.referrerDomain})`;
  }

  // 24-hour delayed stats — schedule aggregation
  async onStart() {
    await this.schedule('0 6 * * *', 'aggregateYesterday', {});   // 6 AM daily
    await this.schedule('0 6 * * 1', 'sendWeeklyDigest', {});     // Monday 6 AM
  }

  async aggregateYesterday() {
    if (this.state.focusPeriodActive) return; // Respect focus periods
    // Aggregate yesterday's data into readable metrics
  }

  @callable()
  async enableFocusPeriod(days: number) {
    this.setState({ ...this.state, focusPeriodActive: true });
    await this.schedule(days * 86400, 'disableFocusPeriod', {});
  }
}
```

---

## 14. Scribe — Transcription Becomes Autonomous

**Character**: Your voice, captured faithfully.

### Design spec (safari-approved)

Scribe could be a lightweight sub-agent of Lumen, or remain a Lumen task type.
As an agent, it gains:
- `queue()` for async transcription (don't block the UI)
- State sync for transcription progress
- `schedule()` for batch processing

**Verdict:** Keep as Lumen task for now, consider extraction if Scribe gets
more complex (multi-language, speaker diarization, etc.)

---

## 15-16. Infra SDK + Loom — The Meta Layer

**Character**: The foundations that everything else stands on.

### The Migration Path

```
TODAY                           TOMORROW
─────                           ────────
Loom (DO framework)        →    Agents SDK (Agent base class)
  LoomDO base class        →    Agent<Env, State>
  AlarmScheduler           →    schedule() / scheduleEvery()
  SqlHelper                →    this.sql``
  JsonStore                →    this.state / setState()
  WebSocketManager         →    Built-in WS + broadcast()
  LoomLogger               →    observability events

Infra SDK                  →    Infra SDK + Agent Adapter
  GroveDatabase            →    (unchanged — D1 still needed for shared data)
  GroveStorage             →    (unchanged — R2 is R2)
  GroveKV                  →    (unchanged — KV is KV)
  GroveScheduler           →    + AgentScheduler adapter (wraps schedule())
  NEW: GroveAgent          →    Agent lifecycle, state, queues, MCP
```

**Key insight:** The Agents SDK doesn't REPLACE the Infra SDK — it extends it.
D1 is still needed for shared cross-agent data. R2 is still the storage layer.
KV is still the cache. But each agent ALSO gets its own SQLite and state.

**Loom migration is incremental.** Agents SDK is built on PartyServer, which is
conceptually similar to Loom. The migration path:
1. New agents use Agents SDK directly
2. Existing Loom DOs migrate when they need agent features
3. Loom stays available for simple DOs that don't need scheduling/state sync

---

## 17. Zephyr — Email Queue Gets Native

**Character**: The wind that carries messages.

### Design spec (safari-approved)

```typescript
class ZephyrAgent extends Agent<Env, ZephyrState> {
  @callable()
  async send(email: EmailRequest) {
    // Queue with automatic retry
    await this.queue('deliverEmail', email);
    return { status: 'queued' };
  }

  async deliverEmail(email: EmailRequest) {
    // Circuit breaker as agent state
    if (this.state.circuitOpen && Date.now() - this.state.circuitOpenedAt < 30000) {
      throw new Error('Circuit breaker open'); // Will retry via queue
    }

    const result = await this.resendClient.send(email);
    this.sql`INSERT INTO send_log (email_id, status, timestamp) VALUES (...)`;
  }

  // Handle bounces natively
  async onEmail(email: AgentEmail) {
    await this.processBounce(email);
  }
}
```

---

## 18. Warden — The Guardian Gets Audit Trails

**Character**: The silent guardian who holds all keys.

### Design spec (safari-approved)

Warden could benefit from agent SQL for audit logs and `schedule()` for key
rotation reminders, but is security-sensitive and low priority for migration.

**Verdict:** Last to migrate. Security infrastructure should be stable.

---

## Expedition Summary

### By the numbers

| Metric | Count |
|---|---|
| Total stops | 18 |
| Perfect fit (Tier 1) | 4 |
| Strong upgrade (Tier 2) | 5 |
| Good fit (Tier 3) | 5 |
| Meta/Infrastructure (Tier 4) | 4 |
| Workers that could be retired | 6 |
| New capabilities unlocked | 12+ |

### Workers That Get Retired

| Worker | Replaced By |
|---|---|
| `onboarding-emails` (deprecated) | OnboardingAgent scheduling |
| `email-catchup` (weekly cron) | OnboardingAgent scheduling |
| `meadow-poller` (15-min cron) | MeadowPollerAgent `scheduleEvery()` |
| `timeline-sync` (daily cron) | TimelineAgent `schedule()` |
| `vista-collector` (5-min cron) | VistaAgent `scheduleEvery()` |
| `patina` (backup cron) | PatinaWorkflow |

### New Capabilities Unlocked

1. **Persistent conversations** — Fireside survives tab close and device switch
2. **Resumable streams** — Connection drops don't lose AI responses
3. **Real-time dashboards** — Vista, Sentinel, Rings via WebSocket state sync
4. **Native browser automation** — Shutter gets Puppeteer on Cloudflare
5. **MCP agent mesh** — Every agent exposes and consumes tools
6. **Durable workflows** — Petal's 4-layer pipeline, Patina's backup pipeline
7. **Human-in-the-loop** — Thorn escalation, Petal approval, workflow gates
8. **Per-user scheduling** — Email onboarding, Rings analytics, Focus Periods
9. **Async moderation** — Thorn moves from blocking to background
10. **Self-healing email** — Bounce handling, unsubscribe, per-user journeys
11. **Agent-to-agent communication** — Replace service bindings with MCP
12. **Per-agent observability** — Structured events from every agent

### Recommended Trek Order

**Phase 1: Quick Wins (Solve real problems)**
1. **OnboardingAgent** — Fix the broken email system. Retire 2 workers.
2. **FiresideAgent** — Persistent conversations. The wow factor.

**Phase 2: Infrastructure Foundation**
3. **LumenAgent as MCP Server** — Unlock the mesh for everything else.
4. **ShutterAgent with Browser** — Web capabilities for the whole forest.

**Phase 3: Migrate Cron Workers**
5. **VistaAgent** — Real-time monitoring dashboard.
6. **MeadowPollerAgent** — RSS polling as agent schedule.
7. **TimelineAgent** — Nightly sync as agent schedule.

**Phase 4: New Capabilities**
8. **ThornAgent** — Async moderation pipeline.
9. **PetalWorkflow** — Durable 4-layer image moderation.
10. **RingsAgent** — Per-user private analytics.

**Phase 5: Deep Migration**
11. **SentinelAgent** — Evolve from Loom.
12. **PatinaWorkflow** — Durable backup pipeline.
13. **WispAgent** — Session-aware writing assistance.
14. **ZephyrAgent** — Native email queue.

**Phase 6: Meta**
15. **Infra SDK Agent Adapter** — Wrap agent primitives.
16. **Loom → Agents SDK migration guide** — For existing DOs.

### Cross-Cutting Themes

**1. The Cron Worker Pattern Is Dead**
Six separate cron workers with separate deployments, separate monitoring, and
separate failure modes. The Agents SDK replaces all of them with `schedule()`
and `scheduleEvery()` — self-contained, per-instance, hibernatable.

**2. The MCP Mesh Is the Architecture**
Instead of service bindings (which are point-to-point), MCP creates a
self-describing tool mesh. Any agent can discover and call any other agent's
capabilities. This is the evolution of Warden's credential gateway concept —
but for ALL capabilities, not just API keys.

**3. State Sync Replaces Polling**
Every admin dashboard currently polls for data. With agent state sync, dashboards
subscribe via WebSocket and get real-time updates. Vista, Rings, Sentinel,
Thorn moderation queue — all become live.

**4. Per-User Agents Are the Privacy Model**
Rings analytics as a per-user DO means analytics data never leaves the user's
agent. No central aggregation. No data warehouse. True privacy by architecture,
not just by policy.

**5. Workflows Solve the "What If It Crashes" Problem**
Patina backups, Petal moderation, email onboarding — all have multi-step
processes where a crash mid-way leaves broken state. Durable workflows guarantee
every step completes or retries.

**6. Loom Is the Bridge**
Loom (the existing DO framework) and the Agents SDK share DNA — both build on
Durable Objects with SQL, WebSocket, and scheduling. Migration is incremental.
New agents use the SDK directly; existing Loom DOs migrate when they need
agent-specific features.

---

_The fire dies to embers. The journal is full — 18 stops, every system mapped,
the whole landscape transformed. The Cloudflare Agents SDK isn't just a library.
It's the next architecture for Grove. Every tree in the forest gets its own
heartbeat. Every Worker becomes an Agent. The forest awakens._

_Tomorrow, the animals go to work. But tonight? Tonight was the drive._
_And it was glorious._ 🚙
