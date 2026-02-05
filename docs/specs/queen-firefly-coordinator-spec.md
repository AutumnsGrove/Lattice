---
title: Queen Firefly Coordinator Specification
description: The sovereign orchestrator of ephemeral CI runners
category: specs
status: draft
lastUpdated: '2026-02-05'
---

# Queen Firefly Coordinator Specification

> *She commands the swarm. Jobs arrive, runners ignite, work completes, and the swarm fades—all at her bidding.*

## Overview

The Queen is a Cloudflare Durable Object that coordinates Firefly CI. She receives webhooks from Codeberg, maintains the job queue, manages the runner pool, and orchestrates the ignite/fade lifecycle of ephemeral CI runners on Hetzner Cloud.

Unlike traditional CI servers that run 24/7, the Queen only wakes when needed. She hibernates between jobs, consuming zero compute. Yet she never forgets—her state persists in the Durable Object's SQLite storage.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Queen Firefly System                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐      │
│  │   Codeberg  │     │   CF Worker      │     │   Queen DO       │      │
│  │             │────▶│   (webhook       │────▶│   (Coordinator)  │      │
│  │             │     │    receiver)     │     │                  │      │
│  └─────────────┘     └──────────────────┘     └────────┬─────────┘      │
│                                                        │                │
│                                 ┌──────────────────────┼──────────┐     │
│                                 │                      │          │     │
│                                 ▼                      ▼          ▼     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        Job Queue (SQLite)                       │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                            │    │
│  │  │ pending │ │ running │ │ done    │                            │    │
│  │  │ #127  │ │ #125  │ │ #120-24 │                          │    │
│  │  │ #126  │ │         │ │         │                            │    │
│  │  └─────────┘ └─────────┘ └─────────┘                            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                 │                                       │
│                                 ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Runner Pool (SQLite)                       │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │ warm-1   │ │ warm-2   │ │ eph-abc  │ │ eph-def  │            │    │
│  │  │ ready    │ │ ready    │ │ working  │ │ working  │            │    │
│  │  │ 10m idle │ │ 2m idle  │ │ job #125 │ │ job #127 │          │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                 │                                       │
│                                 ▼                                       │
│                        Hetzner Cloud API                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Firefly Runners (VPS)                        │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │ Runner 1 │ │ Runner 2 │ │ Runner 3 │ │ Runner 4 │            │    │
│  │  │ (warm)   │ │ (warm)   │ │ (ephem)  │ │ (ephem)  │            │    │
│  │  │ CX21     │ │ CX21     │ │ CX21     │ │ CX21     │            │    │
│  │  │ €6/mo    │ │ €6/mo    │ │ €0.006/h │ │ €0.006/h │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## The Queen's Domain

### Responsibilities

1. **Webhook Reception** — Accept push/PR webhooks from Codeberg
2. **Job Queuing** — Parse webhooks into CI jobs, enqueue with priority
3. **Runner Management** — Track warm pool and ephemeral runners
4. **Ignition Control** — Trigger Hetzner API to create new runners
5. **Fade Control** — Destroy idle runners after timeout
6. **Log Streaming** — WebSocket relay from runners to clients
7. **State Persistence** — SQLite storage for jobs, runners, history

### State Schema

```typescript
// Durable Object SQLite Schema

interface Job {
  id: string;                    // UUID
  commit: string;                // Git commit SHA
  branch: string;                // Git branch
  repository: string;            // codeberg.org/owner/repo
  author: string;                // Codeberg username
  message: string;               // Commit message
  status: 'pending' | 'claimed' | 'running' | 'success' | 'failure' | 'cancelled';
  runnerId?: string;             // Assigned runner
  startedAt?: Date;
  completedAt?: Date;
  logs: string[];                // Log lines (truncated)
  pipeline: PipelineConfig;      // Parsed .woodpecker.yml
  priority: number;              // 0 = normal, 1 = high (main branch)
  createdAt: Date;
}

interface Runner {
  id: string;                    // Unique runner ID (uuid or hostname)
  hetznerId: number;             // Hetzner server ID
  status: 'igniting' | 'ready' | 'working' | 'fading' | 'faded';
  type: 'warm' | 'ephemeral';    // Pool type
  ip?: string;                   // Server IP
  websocket?: WebSocket;         // Active connection
  currentJobId?: string;         // Job being executed
  lastActivityAt: Date;
  igniteCost?: number;           // Hetzner hourly rate
  labels: string[];              // e.g., ['node:20', 'docker']
}

interface PoolConfig {
  minWarmRunners: number;        // Always keep N warm
  maxWarmRunners: number;        // Don't exceed N warm
  maxTotalRunners: number;       // Hard limit (including ephemeral)
  fadeAfterIdleMinutes: number;  // Fade warm runners after N min idle
  ephemeralFadeAfterMinutes: number; // Fade ephemeral immediately after job
  scaleUpThreshold: number;      // Queue depth to trigger new runner
}

interface UserSession {
  websocket: WebSocket;
  watchingJobs: string[];
  watchingRunners: string[];
}
```

## API Surface

### Webhook Endpoints (Worker → Queen)

```typescript
// POST /webhook/codeberg/push
interface PushWebhook {
  ref: string;                   // "refs/heads/main"
  before: string;                // Previous commit SHA
  after: string;                 // New commit SHA
  repository: {
    full_name: string;           // "AutumnsGrove/GroveEngine"
    clone_url: string;           // "https://codeberg.org/AutumnsGrove/GroveEngine.git"
  };
  pusher: {
    login: string;               // "AutumnsGrove"
  };
  commits: Array<{
    id: string;
    message: string;
    timestamp: string;
  }>;
}

// POST /webhook/codeberg/pull_request
interface PRWebhook {
  action: 'opened' | 'synchronize' | 'closed';
  number: number;
  pull_request: {
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
    };
  };
  repository: {
    full_name: string;
  };
}
```

### Runner Endpoints (Runner → Queen)

```typescript
// WebSocket /ws/runner
interface RunnerRegistration {
  type: 'register';
  runnerId: string;
  hetznerId: number;
  labels: string[];
  ip: string;
}

interface RunnerClaim {
  type: 'claim';
  runnerId: string;
}

interface RunnerHeartbeat {
  type: 'heartbeat';
  runnerId: string;
  status: 'ready' | 'working';
  currentJobId?: string;
}

interface RunnerLog {
  type: 'log';
  runnerId: string;
  jobId: string;
  line: string;
  timestamp: Date;
}

interface JobComplete {
  type: 'complete';
  runnerId: string;
  jobId: string;
  exitCode: number;
  duration: number;
}
```

### Client Endpoints (gw CLI → Queen)

```typescript
// GET /api/status
interface StatusResponse {
  queue: {
    pending: number;
    running: number;
    completed: number;
  };
  runners: {
    warm: { ready: number; working: number };
    ephemeral: { igniting: number; working: number; fading: number };
  };
  costs: {
    today: number;     // EUR
    thisMonth: number;
  };
}

// GET /api/jobs
interface JobsResponse {
  jobs: Job[];
}

// GET /api/jobs/:id
interface JobResponse {
  job: Job;
  logs: string[];
}

// POST /api/jobs/:id/cancel
interface CancelResponse {
  success: boolean;
}

// POST /api/runners/warm
interface WarmRequest {
  count: number;
  durationMinutes?: number;  // Auto-fade after N minutes
}

// POST /api/runners/freeze
interface FreezeResponse {
  faded: string[];  // Runner IDs that were faded
}

// WebSocket /ws/logs?job=:id
// Streams real-time log lines
```

## Lifecycle Flows

### Job Execution Flow

```
1. Codeberg Push
   ↓
2. CF Worker receives webhook
   ↓
3. Worker fetches Queen DO via idFromName('main')
   ↓
4. Queen parses webhook → creates Job
   ↓
5. Queen checks Pool for ready runner
   ├─ Found? → Assign job → Notify runner via WebSocket
   └─ None?  → Check if below maxTotalRunners
      ├─ Yes → Call Hetzner API (ignite) → Runner boots
      └─ No  → Job stays queued
   ↓
6. Runner (on Hetzner VPS) boots
   - Cloud-init runs setup script
   - Runner binary starts
   - Registers with Queen via WebSocket
   ↓
7. Runner claims job from Queen
   ↓
8. Runner executes job (docker run, npm test, etc.)
   - Streams logs to Queen via WebSocket
   - Queen relays to watching clients
   ↓
9. Job completes
   - Runner sends 'complete' message
   - Queen updates job status
   - Queen decides runner fate:
     ├─ Ephemeral? → Trigger fade (Hetzner destroy)
     └─ Warm?      → Return to pool
   ↓
10. If ephemeral, runner self-destructs after N minutes idle
```

### Warm Pool Management

```
Every 60 seconds (alarm in Durable Object):
   ↓
Check all warm runners
   ↓
For each runner with status 'ready':
   ├─ idleTime > fadeAfterIdleMinutes?
   │  ├─ Yes → Trigger fade (if above minWarmRunners)
   │  └─ No  → Keep warm
   ↓
Check queue depth
   ↓
If pendingJobs > 0 AND warmRunners < minWarmRunners:
   → Ignite new warm runner
```

## Implementation Phases

### Phase 0: The Queen's Birth (Week 1)

**Goal:** Basic webhook → job creation → manual runner assignment

**Components:**
1. Cloudflare Worker (webhook receiver)
2. Queen Durable Object (state machine)
3. Simple SQLite schema (jobs only)
4. Manual runner ignition (no auto-scale)

**API:**
```bash
# Webhook automatically creates job
curl -X POST https://queen.grove.place/webhook/codeberg/push \
  -H "Content-Type: application/json" \
  -d '{...push payload...}'

# Manually check status
gw queen status
# Jobs: 1 pending, 0 running

# Manually ignite runner
gw queen ignite --type ci-runner
# Igniting server on Hetzner...
# Server ready: 168.119.XXX.XXX

# Runner connects and claims job

# Watch logs
gw queen logs --follow
```

### Phase 1: The Swarm Awakens (Week 2-3)

**Goal:** Warm pool, auto-ignition, auto-fade

**Add:**
- Pool configuration (min/max runners)
- Auto-ignition on queue depth
- Auto-fade after idle timeout
- Hetzner API integration
- Runner bootstrap script

**Commands:**
```bash
# Configure pool
gw queen config --min-warm 1 --max-total 5 --fade-after 10

# Check swarm status
gw queen swarm status
# Warm: 1 ready, 0 working
# Ephemeral: 0 igniting, 2 working, 1 fading
# Queue: 3 pending

# Force warm pool
gw queen swarm warm --count 2 --duration 4h

# Freeze all (vacation mode)
gw queen swarm freeze
```

### Phase 2: The Hive Mind (Week 4)

**Goal:** Pipeline parsing, .woodpecker.yml support, secrets

**Add:**
- Parse `.woodpecker.yml` from repo
- Fetch secrets from CF Secrets store
- Matrix builds
- Step dependencies
- Artifact upload to R2

**Commands:**
```bash
# Pipeline now auto-parses .woodpecker.yml
gw queen pipeline validate  # Dry-run parse
```

### Phase 3: The Sovereign's Court (Month 2)

**Goal:** Full GW integration, cost tracking, observability

**Add:**
- `gw ci` commands (familiar GitHub Actions-like interface)
- Cost tracking per job/day/month
- Web dashboard (view jobs, logs, runners)
- Slack/Discord notifications
- Integration with existing `gw` workflows

**Commands:**
```bash
# Familiar CI commands
gw ci list                    # List recent jobs
gw ci view 127               # View job #127
gw ci rerun 127              # Re-run failed job
gw ci cancel 127             # Cancel running job

# Firefly-specific
gw ci costs                  # Show cost breakdown
gw ci costs --this-month
gw ci costs --job 127        # Cost of specific job
```

## Cost Model

### Cloudflare (The Queen)

| Component | Cost |
|-----------|------|
| Worker requests | $0.50/million (mostly free tier) |
| Durable Object compute | $12.50/million GB-seconds |
| Durable Object storage | $1/GB-month |
| WebSocket connections | Included |

**Estimated:** $0-5/month for typical usage

### Hetzner (The Swarm)

| Type | Specs | Cost |
|------|-------|------|
| CX21 | 2 vCPU, 4GB RAM | €0.006/hour (~€4.32/month if always-on) |
| CPX21 | 4 vCPU, 8GB RAM | €0.012/hour (~€8.64/month if always-on) |

**With Firefly pattern:**
- Warm pool (1 runner, business hours only): ~€2-3/month
- Ephemeral runners: €0.006/hour × actual runtime
- Typical usage: €3-8/month total

### Comparison

| Approach | Monthly Cost |
|----------|-------------|
| GitHub Actions (public repo) | $0 |
| Always-on VPS (1 runner) | €6-12 |
| Firefly CI (Queen + minimal warm) | €3-8 |
| Firefly CI (pure ephemeral) | €0.50-2 |

## Files to Create

```
workers/queen-firefly/
├── src/
│   ├── index.ts              # Worker entry point
│   ├── queen.ts              # Durable Object implementation
│   ├── hetzner.ts            # Hetzner API client
│   ├── schema.sql            # SQLite schema
│   ├── types.ts              # TypeScript interfaces
│   └── runner/
│       └── bootstrap.sh      # Cloud-init script for runners
├── wrangler.toml
└── README.md

tools/gw/src/gw/commands/queen/
├── __init__.py
├── status.py                 # gw queen status
├── swarm.py                  # gw queen swarm *
├── ignite.py                 # gw queen ignite
├── fade.py                   # gw queen fade
├── logs.py                   # gw queen logs
└── ci.py                     # gw ci * (high-level commands)
```

## Next Steps

1. [ ] Create Cloudflare Worker project
2. [ ] Implement basic webhook receiver
3. [ ] Design Queen Durable Object state machine
4. [ ] Create SQLite schema
5. [ ] Test webhook → job creation flow
6. [ ] Implement Hetzner ignition
7. [ ] Build runner bootstrap script
8. [ ] Integrate with `gw` CLI

## References

- [Firefly Pattern](/knowledge/patterns/firefly-pattern)
- [Loom Pattern](/knowledge/patterns/loom-durable-objects-pattern)
- [Firefly CI Spec](/knowledge/specs/firefly-ci-spec)
- [Woodpecker Codeberg Setup](/knowledge/guides/woodpecker-codeberg-setup)
- Outpost source (reference implementation)
- Verge source (Hetzner API patterns)

---

*Long live the Queen.*
