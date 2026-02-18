---
aliases: []
date created: Wednesday, February 5th 2026
date modified: Tuesday, February 17th 2026
tags:
  - infrastructure
  - ci-cd
  - durable-objects
  - cloudflare-workers
type: tech-spec
lastUpdated: "2026-02-18"
---

# Queen Firefly: Pool Coordinator

```
                                  ┌───────────┐
                                  │  Codeberg │
                                  │  webhook  │
                                  └─────┬─────┘
                                        │
                     ┌──────────────────▼──────────────────┐
                     │          CF Worker (router)         │
                     └──────────────────┬──────────────────┘
                                        │
                     ╔══════════════════▼══════════════════╗
                     ║                                     ║
                     ║           👑 Queen DO               ║
                     ║           extends LoomDO            ║
                     ║                                     ║
                     ║   jobs ─── runners ─── consumers    ║
                     ║   queue    pool        profiles     ║
                     ║                                     ║
                     ╚═══════════╤═══════════╤═════════════╝
                                 │           │
                     ┌───────────▼───┐ ┌─────▼───────────┐
                     │  Warm Pool    │ │  Ephemeral Pool │
                     │  ┌──┐ ┌──┐    │ │  ┌──┐ ┌──┐ ┌──┐ │
                     │  │🔥│ │🔥 │    │ │  │✨│ │✨│ │ ✨│ │
                     │  └──┘ └──┘    │ │  └──┘ └──┘ └──┘ │
                     └───────────────┘ └─────────────────┘
                                 │           │
                     ┌───────────▼───────────▼───────────┐
                     │    Firefly SDK (any provider)     │
                     │    hetzner · fly · railway · do   │
                     └───────────────────────────────────┘

              She commands the swarm. The SDK provisions it.
```

> _She commands the swarm. Jobs arrive, runners ignite, work completes, and the swarm fades. All at her bidding._

The Queen is a Cloudflare Durable Object that coordinates pools of Firefly instances. She receives triggers from consumers, maintains job queues, manages runner pools, and orchestrates the ignite/illuminate/fade lifecycle. The Queen decides _what_ to provision and _when_. The Firefly SDK handles _how_.

**Public Name:** Queen Firefly
**Internal Name:** GroveQueenFirefly
**Extends:** `LoomDO` (from `@autumnsgrove/lattice/loom`)
**Uses:** [[firefly-sdk-spec|Firefly SDK]] (from `@autumnsgrove/lattice/firefly`)
**Primary Consumer:** CI (Codeberg webhooks)
**Future Consumers:** Bloom pool management, Outpost coordination

Unlike traditional CI servers that run around the clock, the Queen only wakes when needed. She hibernates between jobs, consuming zero compute. Yet she never forgets. Her state persists in the Durable Object's SQLite storage. When a webhook arrives, she wakes, evaluates the swarm, and acts.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Queen Firefly System                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│           TRIGGER LAYER                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │  Codeberg   │  │  Schedule   │  │  Manual     │                      │
│  │  webhook    │  │  (cron)     │  │  (gw CLI)   │                      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                      │
│         └────────────────┼────────────────┘                             │
│                          ▼                                              │
│           COORDINATION LAYER                                            │
│  ╔═══════════════════════════════════════════════════════════════╗      │
│  ║                    Queen DO (LoomDO)                          ║      │
│  ║  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐     ║      │
│  ║  │ Job Queue  │  │ Runner     │  │ Consumer Profiles    │     ║      │
│  ║  │ (SQLite)   │  │ Pool       │  │ ci · bloom · outpost │     ║      │
│  ║  │            │  │ (SQLite)   │  │                      │     ║      │
│  ║  └────────────┘  └────────────┘  └──────────────────────┘     ║      │
│  ║                                                               ║      │
│  ║  Loom Features:                                               ║      │
│  ║  • this.sql      SQLite queries                               ║      │
│  ║  • this.sockets  WebSocket (hibernation)                      ║      │
│  ║  • this.alarms   60s alarm cycle                              ║      │
│  ║  • this.locks    Double-ignition prevention                   ║      │
│  ║  • this.log      Structured logging                           ║      │
│  ╚════════════════════════════════════╤══════════════════════════╝      │
│                                       │                                 │
│           PROVISIONING LAYER          │                                 │
│  ┌────────────────────────────────────▼────────────────────────────┐    │
│  │                   Firefly SDK                                   │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │    │
│  │  │ Hetzner  │  │ Fly.io   │  │ Railway  │  │ DO       │         │    │
│  │  │ Provider │  │ Provider │  │ Provider │  │ Provider │         │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

Three distinct layers. The trigger layer sends signals. The coordination layer (Queen DO) makes decisions. The provisioning layer (Firefly SDK) talks to cloud APIs. This separation means the Queen never calls Hetzner directly. She asks the SDK. Swapping providers requires zero changes to the Queen.

---

## Extends LoomDO

The Queen is built on the Loom SDK, the same framework running 7 production DOs across Grove. Here's the complete scaffold.

### config()

```typescript
config(): LoomConfig {
  return {
    name: 'QueenDO',
    hibernation: true,     // Sleep between WebSocket messages
    blockOnInit: true,     // Schema runs before first request
  };
}
```

Hibernation mode means the Queen consumes zero compute between events. When a webhook arrives or a runner sends a heartbeat, she wakes, processes, and sleeps again.

### schema()

```typescript
schema(): string {
  return `
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      consumer TEXT NOT NULL DEFAULT 'ci',
      commit_sha TEXT,
      branch TEXT,
      repository TEXT,
      author TEXT,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      runner_id TEXT,
      started_at INTEGER,
      completed_at INTEGER,
      exit_code INTEGER,
      metadata TEXT DEFAULT '{}',
      priority INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS runners (
      id TEXT PRIMARY KEY,
      provider_server_id TEXT,
      provider TEXT NOT NULL DEFAULT 'hetzner',
      consumer TEXT NOT NULL DEFAULT 'ci',
      status TEXT NOT NULL DEFAULT 'igniting',
      type TEXT NOT NULL DEFAULT 'ephemeral',
      ip TEXT,
      current_job_id TEXT,
      last_activity_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      hourly_cost REAL,
      labels TEXT DEFAULT '[]',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS consumer_profiles (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'hetzner',
      size TEXT NOT NULL,
      region TEXT NOT NULL,
      image TEXT NOT NULL,
      min_warm INTEGER NOT NULL DEFAULT 0,
      max_warm INTEGER NOT NULL DEFAULT 2,
      max_total INTEGER NOT NULL DEFAULT 5,
      fade_after_idle_minutes INTEGER NOT NULL DEFAULT 10,
      ephemeral_fade_after_minutes INTEGER NOT NULL DEFAULT 5,
      scale_up_threshold INTEGER NOT NULL DEFAULT 1,
      config_json TEXT DEFAULT '{}',
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_consumer ON jobs(consumer);
    CREATE INDEX IF NOT EXISTS idx_runners_status ON runners(status);
    CREATE INDEX IF NOT EXISTS idx_runners_consumer ON runners(consumer);
  `;
}
```

Key change from the previous spec: `provider_server_id TEXT` replaces `hetznerId INTEGER`. The `provider` column tracks which cloud created the runner. The `consumer` column tracks who requested it.

### routes()

```typescript
routes(): LoomRoute[] {
  return [
    // Webhook endpoints (Worker -> Queen)
    { method: 'POST', path: '/webhook/codeberg/push',         handler: (ctx) => this.handlePush(ctx) },
    { method: 'POST', path: '/webhook/codeberg/pull_request',  handler: (ctx) => this.handlePR(ctx) },

    // Runner endpoints (Runner -> Queen via WebSocket)
    { method: 'GET',  path: '/ws/runner',                      handler: (ctx) => this.handleRunnerWS(ctx) },

    // Client API (gw CLI -> Queen)
    { method: 'GET',  path: '/api/status',                     handler: (ctx) => this.getStatus(ctx) },
    { method: 'GET',  path: '/api/jobs',                       handler: (ctx) => this.listJobs(ctx) },
    { method: 'GET',  path: '/api/jobs/:id',                   handler: (ctx) => this.getJob(ctx) },
    { method: 'POST', path: '/api/jobs/:id/cancel',            handler: (ctx) => this.cancelJob(ctx) },
    { method: 'POST', path: '/api/jobs/:id/rerun',             handler: (ctx) => this.rerunJob(ctx) },
    { method: 'GET',  path: '/api/runners',                    handler: (ctx) => this.listRunners(ctx) },
    { method: 'POST', path: '/api/runners/warm',               handler: (ctx) => this.warmPool(ctx) },
    { method: 'POST', path: '/api/runners/freeze',             handler: (ctx) => this.freezePool(ctx) },
    { method: 'GET',  path: '/api/costs',                      handler: (ctx) => this.getCosts(ctx) },
    { method: 'GET',  path: '/api/costs/:jobId',               handler: (ctx) => this.getJobCost(ctx) },

    // Consumer profile management
    { method: 'GET',  path: '/api/consumers',                  handler: (ctx) => this.listConsumers(ctx) },
    { method: 'PUT',  path: '/api/consumers/:id',              handler: (ctx) => this.updateConsumer(ctx) },

    // Log streaming
    { method: 'GET',  path: '/ws/logs',                        handler: (ctx) => this.handleLogWS(ctx) },
  ];
}
```

### onAlarm()

The Queen's heartbeat. Fires every 60 seconds while there's work to do.

```typescript
async onAlarm(): Promise<void> {
  // 1. Check for idle warm runners that should fade
  await this.fadeIdleRunners();

  // 2. Check queue depth, ignite if needed
  await this.scalePool();

  // 3. Orphan sweep (via Firefly SDK)
  await this.sweepOrphans();

  // 4. Re-arm alarm if there are active runners or pending jobs
  const hasWork = await this.hasActiveWork();
  if (hasWork) {
    await this.alarms.schedule(60_000);
  }
}
```

### Double-Ignition Prevention

When two webhooks arrive simultaneously, the Queen must not ignite two runners for the same demand spike. The Loom `PromiseLockMap` handles this.

```typescript
async igniteRunner(consumer: string): Promise<Runner | null> {
  return this.locks.withLock(`ignite:${consumer}`, async () => {
    // Re-check pool state inside the lock
    const profile = await this.getConsumerProfile(consumer);
    const activeCount = await this.countActiveRunners(consumer);

    if (activeCount >= profile.maxTotal) {
      this.log.info('At max capacity, queuing', { consumer, activeCount });
      return null;
    }

    // Provision via Firefly SDK
    const instance = await this.firefly.ignite({
      size: profile.size,
      region: profile.region,
      image: profile.image,
      tags: [`queen-${consumer}`, 'managed'],
    });

    // Track in SQLite
    this.sql.exec(`
      INSERT INTO runners (id, provider_server_id, provider, consumer, status, ip, hourly_cost)
      VALUES (?, ?, ?, ?, 'igniting', ?, ?)
    `, [instance.id, instance.providerServerId, instance.provider, consumer, instance.publicIp, profile.hourlyCost]);

    return instance;
  });
}
```

### WebSocket Handling (Hibernation Mode)

Runners connect via WebSocket to report status, claim jobs, and stream logs. The Queen uses hibernation-aware WebSockets, so she sleeps between messages.

```typescript
async onWebSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
  const { json } = this.sockets.parseMessage(raw);
  if (!json || typeof json !== 'object') return;

  const msg = json as RunnerMessage;

  switch (msg.type) {
    case 'register':
      await this.handleRunnerRegister(ws, msg);
      break;
    case 'heartbeat':
      await this.handleHeartbeat(ws, msg);
      break;
    case 'claim':
      await this.handleClaim(ws, msg);
      break;
    case 'log':
      await this.relayLog(msg);
      break;
    case 'complete':
      await this.handleJobComplete(ws, msg);
      break;
  }
}

async onWebSocketClose(ws: WebSocket): Promise<void> {
  // Mark runner as disconnected, start grace period before fade
  const runnerId = this.getRunnerIdFromSocket(ws);
  if (runnerId) {
    this.log.info('Runner disconnected', { runnerId });
    // Don't fade immediately; runner might reconnect
    await this.alarms.ensureScheduled(60_000);
  }
}
```

---

## Consumer Profiles

Each consumer registers a profile that tells the Queen how to manage its pool. CI runners have different needs than Bloom agents or Outpost servers.

```typescript
interface ConsumerProfile {
	id: string; // 'ci' | 'bloom' | 'outpost'
	provider: string; // Which FireflyProvider to use
	size: string; // Server size
	region: string; // Preferred region
	image: string; // OS image or snapshot
	pool: PoolConfig;
	idle: IdleConfig;
}

interface PoolConfig {
	minWarm: number; // Always keep N warm
	maxWarm: number; // Don't exceed N warm runners
	maxTotal: number; // Hard limit (warm + ephemeral)
	fadeAfterIdleMinutes: number; // Fade warm runners after N min idle
	ephemeralFadeAfterMinutes: number; // Fade ephemeral after job
	scaleUpThreshold: number; // Queue depth that triggers ignition
}
```

### Profile Comparison

| Setting             | CI                     | Bloom                | Outpost              |
| ------------------- | ---------------------- | -------------------- | -------------------- |
| **Provider**        | hetzner                | hetzner              | hetzner              |
| **Size**            | cx22 (2 vCPU, 4 GB)    | cx22 (2 vCPU, 4 GB)  | cx32 (4 vCPU, 8 GB)  |
| **Region**          | fsn1                   | fsn1                 | ash (US)             |
| **Image**           | ci-runner-v1           | bloom-agent-v1       | outpost-mc-v2        |
| **Min Warm**        | 0 (quiet) / 1 (active) | 0                    | 0                    |
| **Max Warm**        | 2                      | 1                    | 1                    |
| **Max Total**       | 5                      | 3                    | 2                    |
| **Idle Fade**       | 10 min                 | 15 min               | 30 min               |
| **Ephemeral Fade**  | Immediate after job    | After idle threshold | After idle threshold |
| **Scale Threshold** | 1 pending job          | 1 pending task       | Manual only          |

Profiles are stored in the `consumer_profiles` table and editable via the API. The Queen reads them on each alarm cycle, so changes take effect within 60 seconds.

---

## Job Queue

Jobs track work requests from any consumer. CI jobs come from Codeberg webhooks. Bloom jobs come from task queues. The shape is the same.

```typescript
interface Job {
	id: string; // UUID
	consumer: string; // 'ci' | 'bloom' | 'outpost'
	commit?: string; // Git commit SHA (CI)
	branch?: string; // Git branch (CI)
	repository?: string; // Repository identifier
	author?: string; // Who triggered it
	message?: string; // Commit message or task description
	status: "pending" | "claimed" | "running" | "success" | "failure" | "cancelled";
	runnerId?: string; // Assigned runner
	startedAt?: number; // Unix ms
	completedAt?: number; // Unix ms
	exitCode?: number;
	metadata: Record<string, unknown>; // Consumer-specific data
	priority: number; // 0 = normal, 1 = high (main branch)
	createdAt: number; // Unix ms
}
```

The previous spec used `pipeline: PipelineConfig` for CI-specific pipeline data. The new `metadata: Record<string, unknown>` field is consumer-agnostic. CI stores its parsed pipeline config there. Bloom stores task details. The Queen doesn't care about the contents.

---

## Runner Pool Management

### Warm Pool Strategy

**Active Development Hours (9am-6pm or manual trigger):**

- Keep 1-2 runners warm for instant job pickup
- Scale up to max based on queue depth
- Fade warm runners after idle timeout

**Quiet Hours:**

- Zero warm runners
- Ignite on demand (30-60s cold start)
- Immediate fade after job completion

**Manual Overrides:**

```bash
gw queen swarm warm --count 3 --duration 4h   # Pre-warm for a big push
gw queen swarm freeze                          # Zero everything (vacation mode)
```

### Pool Scaling Flow

```
Every 60 seconds (Queen alarm):
   │
   ├─ Check warm runners
   │  └─ For each 'ready' runner:
   │     ├─ idle > fadeAfterIdleMinutes AND count > minWarm?
   │     │  └─ Yes: trigger fade
   │     └─ No: keep warm
   │
   ├─ Check queue depth
   │  └─ pendingJobs >= scaleUpThreshold AND totalRunners < maxTotal?
   │     └─ Yes: ignite new runner (with lock)
   │
   └─ Orphan sweep
      └─ For each cloud instance with no matching runner row:
         └─ Terminate via Firefly SDK
```

### Job Execution Flow

```
1. Trigger arrives (webhook, queue message, manual)
   │
2. Queen creates Job record (status: pending)
   │
3. Queen checks pool for ready runner
   ├─ Found? Assign job, notify runner via WebSocket
   └─ None?  Check capacity
      ├─ Below max? Ignite new runner (via Firefly SDK)
      └─ At max?    Job stays queued
   │
4. Runner boots, connects via WebSocket, registers
   │
5. Runner claims pending job
   │
6. Runner executes (streams logs via WebSocket)
   │
7. Job completes
   ├─ Runner sends 'complete' with exit code
   ├─ Queen updates job status
   └─ Runner fate:
      ├─ Ephemeral? Trigger fade
      └─ Warm?      Return to pool
```

---

## WebSocket Protocol

### Runner Messages (Runner -> Queen)

```typescript
interface RunnerRegister {
	type: "register";
	runnerId: string;
	providerServerId: string; // Was: hetznerId
	labels: string[];
	ip: string;
}

interface RunnerClaim {
	type: "claim";
	runnerId: string;
}

interface RunnerHeartbeat {
	type: "heartbeat";
	runnerId: string;
	status: "ready" | "working";
	currentJobId?: string;
	cpuPercent?: number;
	memPercent?: number;
}

interface RunnerLog {
	type: "log";
	runnerId: string;
	jobId: string;
	line: string;
	timestamp: number;
}

interface JobComplete {
	type: "complete";
	runnerId: string;
	jobId: string;
	exitCode: number;
	durationMs: number;
}
```

### Queen Messages (Queen -> Runner)

```typescript
interface AssignJob {
	type: "assign";
	job: {
		id: string;
		repository: string;
		commit: string;
		branch: string;
		metadata: Record<string, unknown>;
	};
}

interface FadeCommand {
	type: "fade";
	reason: "idle" | "manual" | "max_lifetime" | "orphan";
	gracePeriodMs: number;
}
```

---

## API Surface

### Status Endpoint

```typescript
// GET /api/status
interface StatusResponse {
	queue: {
		pending: number;
		running: number;
		completed: number; // Last 24 hours
	};
	runners: {
		warm: { ready: number; working: number };
		ephemeral: { igniting: number; working: number; fading: number };
	};
	costs: {
		today: number; // USD
		thisMonth: number;
	};
	consumers: string[]; // Active consumer profiles
}
```

### Jobs Endpoints

```typescript
// GET /api/jobs?consumer=ci&status=pending&limit=50
interface JobsResponse {
	jobs: Job[];
	total: number;
}

// GET /api/jobs/:id
interface JobDetailResponse {
	job: Job;
	logs: string[]; // Truncated log lines
	runner?: Runner;
}

// POST /api/jobs/:id/cancel
interface CancelResponse {
	success: boolean;
	message?: string;
}

// POST /api/jobs/:id/rerun
interface RerunResponse {
	success: boolean;
	newJobId: string;
}
```

### Runner Management

```typescript
// POST /api/runners/warm
interface WarmRequest {
	consumer: string; // Which consumer profile to use
	count: number;
	durationMinutes?: number; // Auto-fade after N minutes
}

// POST /api/runners/freeze
interface FreezeRequest {
	consumer?: string; // Freeze specific consumer, or all if omitted
}

interface FreezeResponse {
	faded: string[]; // Runner IDs that were faded
}
```

### Cost Tracking

```typescript
// GET /api/costs?period=month&consumer=ci
interface CostResponse {
	period: "day" | "week" | "month";
	consumer?: string;
	total: number; // USD
	breakdown: {
		provider: string;
		hours: number;
		cost: number;
	}[];
	jobCount: number;
	avgCostPerJob: number;
}
```

---

## CI Consumer: Codeberg Integration

The Queen's primary consumer. Codeberg sends webhooks on push and PR events.

### Webhook Interfaces

```typescript
// POST /webhook/codeberg/push
interface PushWebhook {
	ref: string; // "refs/heads/main"
	before: string; // Previous commit SHA
	after: string; // New commit SHA
	repository: {
		full_name: string; // "AutumnsGrove/GroveEngine"
		clone_url: string;
	};
	pusher: {
		login: string;
	};
	commits: Array<{
		id: string;
		message: string;
		timestamp: string;
	}>;
}

// POST /webhook/codeberg/pull_request
interface PRWebhook {
	action: "opened" | "synchronize" | "closed";
	number: number;
	pull_request: {
		head: { ref: string; sha: string };
		base: { ref: string };
	};
	repository: {
		full_name: string;
	};
}
```

### Pipeline Configuration

CI jobs parse a `.woodpecker.yml` from the repository. The pipeline config goes into the job's `metadata` field.

```yaml
# .woodpecker.yml
workspace:
  base: /app
  path: .

steps:
  install:
    image: node:20
    commands:
      - pnpm install --frozen-lockfile

  typecheck:
    image: node:20
    commands:
      - pnpm run typecheck --filter='./packages/*'

  test:
    image: node:20
    commands:
      - pnpm test --filter='./packages/*'

  deploy:
    image: node:20
    commands:
      - npx wrangler deploy
    secrets:
      - CLOUDFLARE_API_TOKEN
    when:
      branch: main
      event: push
```

### CI Open Questions

These remain from the original planning. Each needs its own investigation before Phase 2.

1. **Artifacts:** Where do build artifacts live? R2 bucket with per-job prefixes? Ephemeral runner disk with upload step?
   R2 bucket.
2. **Caching:** How to cache `node_modules` and build outputs between jobs? Shared R2 bucket with content-addressed keys?
   YES. shared R2 bucket.
3. **Secrets:** Woodpecker secrets vs. Worker env bindings vs. dedicated secrets store? How do secrets reach the runner securely?
   Accessed via the upcoming Warden SDK.
4. **Networking:** Private registry access for Docker images? Docker Hub rate limit mitigation?
5. **Debugging:** SSH access to a failed ephemeral runner before it fades? Configurable grace period on failure?
   Yes, we need a way in, to check status of things or execute commands. Access for 5 mins is available.

---

## Implementation Phases

### Phase 0: The Queen Wakes

**Goal:** Webhook -> job creation -> manual runner assignment. Provider-agnostic skeleton.

- Cloudflare Worker (webhook receiver, routes to Queen DO)
- Queen DO extending LoomDO (schema, routes, basic job queue)
- Manual ignition via `gw queen ignite`
- Hetzner provider via Firefly SDK

```bash
# Webhook creates job automatically
curl -X POST https://queen.grove.place/webhook/codeberg/push \
  -H "Content-Type: application/json" \
  -d '{...}'

# Check status
gw queen status
# Jobs: 1 pending, 0 running

# Manually ignite
gw queen ignite --consumer ci
# Igniting runner via Hetzner... ready at 168.119.XXX.XXX

# Runner connects, claims job, executes, completes
gw queen logs --follow
```

### Phase 1: The Swarm Stirs

**Goal:** Warm pool, auto-ignition, auto-fade. Self-managing pool.

- Pool configuration per consumer profile
- Auto-ignition on queue depth (with double-ignition prevention via locks)
- Auto-fade after idle timeout
- Runner bootstrap script (cloud-init)
- 60-second alarm cycle for pool management

```bash
gw queen config --consumer ci --min-warm 1 --max-total 5 --fade-after 10

gw queen swarm status
# Warm: 1 ready, 0 working
# Ephemeral: 0 igniting, 2 working, 1 fading
# Queue: 3 pending

gw queen swarm warm --count 2 --duration 4h
gw queen swarm freeze
```

### Phase 2: The Hive Mind

**Goal:** Pipeline parsing, secrets injection, CI consumer complete.

- Parse `.woodpecker.yml` from repository
- Secrets injection from Worker env bindings
- Step dependencies and matrix builds
- Artifact upload to R2
- Pipeline validation (`gw ci pipeline validate`)

### Phase 3: The Sovereign's Court

**Goal:** Multi-consumer support, additional providers, full gw integration.

- Consumer profile management via API
- Bloom pool management (second consumer)
- Fly.io provider integration (fast US cold starts)
- Cost tracking and budget alerts
- Web dashboard for job and runner visibility

---

## gw CLI Integration

Three command tiers, each at a different abstraction level.

### `gw firefly` (SDK-level)

Cross-consumer, provider-focused commands.

```bash
gw firefly providers           # List configured providers
gw firefly status              # All Firefly instances across consumers
gw firefly orphans             # Check for orphaned instances
gw firefly costs --breakdown   # Cost by provider and consumer
```

### `gw queen` (Pool management)

Queen DO coordination commands.

```bash
gw queen status                # Queue depth, runner counts, costs
gw queen swarm status          # Detailed pool breakdown
gw queen swarm warm --count N  # Pre-warm runners
gw queen swarm freeze          # Fade all runners
gw queen config --show         # Current pool configuration
gw queen config --consumer ci --min-warm 1 --max-total 5
gw queen consumers             # List consumer profiles
```

### `gw ci` (Job management)

CI-specific commands with a familiar interface.

```bash
gw ci list                     # Recent CI jobs
gw ci view 127                 # Job #127 details and logs
gw ci run                      # Manually trigger CI for current branch
gw ci rerun 127                # Re-run failed job
gw ci cancel 127               # Cancel running job
gw ci logs 127 --follow        # Stream job logs
gw ci costs                    # CI cost breakdown
gw ci costs --this-month
gw ci costs --job 127          # Cost of specific job
gw ci pipeline validate        # Dry-run parse of .woodpecker.yml
```

---

## Cost Model

### Cloudflare (The Queen)

| Component              | Cost                             |
| ---------------------- | -------------------------------- |
| Worker requests        | $0.50/million (mostly free tier) |
| Durable Object compute | $12.50/million GB-seconds        |
| Durable Object storage | $1/GB-month                      |
| WebSocket messages     | Included in DO compute           |

**Estimated:** $0-5/month for typical usage. The Queen hibernates between events, so GB-seconds stay minimal.

### Cloud Runners (The Swarm)

| Provider          | Size           | Hourly  | Monthly (always-on) |
| ----------------- | -------------- | ------- | ------------------- |
| Hetzner cx22      | 2 vCPU, 4 GB   | ~$0.008 | ~$5.50              |
| Hetzner cx32      | 4 vCPU, 8 GB   | ~$0.016 | ~$11.50             |
| Fly shared-cpu-1x | 1 vCPU, 256 MB | ~$0.02  | ~$14.40             |

### Usage Scenarios

| Pattern                                  | Monthly Cost |
| ---------------------------------------- | ------------ |
| Pure ephemeral (10 jobs/day, 5 min each) | ~$1.20       |
| Warm pool (1 runner, business hours)     | ~$3.00       |
| Medium load (50 jobs/day, 10 min each)   | ~$6.60       |
| Heavy load (100+ jobs/day, parallel)     | ~$15-25      |
| Always-on equivalent (1 VPS 24/7)        | ~$5.50       |

Firefly CI breaks even with always-on at roughly 23 hours/day of continuous usage. For any realistic development pattern, Firefly wins.

---

## Files to Create

```
workers/queen-firefly/
├── src/
│   ├── index.ts              # Worker entry point (routes to DO)
│   ├── queen.ts              # QueenDO extends LoomDO
│   ├── handlers/
│   │   ├── webhooks.ts       # Codeberg push/PR handlers
│   │   ├── runners.ts        # Runner WebSocket + lifecycle
│   │   ├── jobs.ts           # Job queue management
│   │   ├── pool.ts           # Pool scaling logic
│   │   └── costs.ts          # Cost tracking queries
│   ├── consumers/
│   │   ├── ci.ts             # CI-specific job creation + pipeline parsing
│   │   ├── bloom.ts          # Bloom task queue integration (future)
│   │   └── outpost.ts        # Outpost manual trigger (future)
│   ├── types.ts              # TypeScript interfaces
│   └── runner/
│       └── bootstrap.sh      # Cloud-init script for runner VPS
├── wrangler.toml
└── README.md

tools/gw/src/gw/commands/
├── queen/
│   ├── __init__.py
│   ├── status.py             # gw queen status
│   ├── swarm.py              # gw queen swarm *
│   ├── config.py             # gw queen config
│   └── ignite.py             # gw queen ignite
├── ci/
│   ├── __init__.py
│   ├── list.py               # gw ci list
│   ├── view.py               # gw ci view
│   ├── run.py                # gw ci run / rerun
│   ├── cancel.py             # gw ci cancel
│   ├── logs.py               # gw ci logs
│   ├── costs.py              # gw ci costs
│   └── pipeline.py           # gw ci pipeline validate
└── firefly/
    ├── __init__.py
    ├── status.py              # gw firefly status
    ├── providers.py           # gw firefly providers
    ├── orphans.py             # gw firefly orphans
    └── costs.py               # gw firefly costs
```

---

## Implementation Checklist

### Phase 0: The Queen Wakes

- [ ] Create `workers/queen-firefly/` project structure
- [ ] Implement QueenDO extending LoomDO (schema, routes, config)
- [ ] Build webhook receiver (push, PR parsing)
- [ ] Implement basic job queue (create, claim, complete)
- [ ] Wire Firefly SDK with HetznerProvider
- [ ] Manual ignition endpoint
- [ ] Runner bootstrap script (cloud-init)
- [ ] Basic `gw queen status` command

### Phase 1: The Swarm Stirs

- [ ] Consumer profiles (SQLite storage, API endpoints)
- [ ] Warm pool management (min/max, fade timers)
- [ ] Auto-ignition on queue depth (with PromiseLockMap)
- [ ] 60-second alarm cycle
- [ ] Runner WebSocket protocol (register, heartbeat, claim, complete)
- [ ] Log streaming via WebSocket relay
- [ ] `gw queen swarm` commands

### Phase 2: The Hive Mind

- [ ] Pipeline parsing (`.woodpecker.yml`)
- [ ] Secrets injection from Worker env
- [ ] Artifact upload to R2
- [ ] `gw ci` command suite
- [ ] Pipeline validation dry-run

### Phase 3: The Sovereign's Court

- [ ] Multi-consumer profile management
- [ ] Fly.io provider integration
- [ ] Cost tracking and budget alerts
- [ ] Web dashboard (read-only job/runner view)
- [ ] `gw firefly` cross-consumer commands

---

_Long live the Queen._
