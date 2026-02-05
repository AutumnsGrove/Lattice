---
title: Firefly CI Specification
description: Ephemeral CI/CD runners that ignite on demand and fade when done
category: specs
status: draft
lastUpdated: '2026-02-05'
---

# Firefly CI Specification

> *Brief, brilliant, gone — continuous integration that only exists when you need it.*

## Overview

Firefly CI brings the Firefly ephemeral server pattern to continuous integration. Instead of maintaining always-on CI runners, Firefly CI maintains a minimal warm pool during active development and spins up additional runners on demand. When jobs complete, runners save their state and fade away.

## Goals

- **Near-zero idle cost** — Pay only for compute time actually used
- **Fast job startup** — Warm pool eliminates spin-up latency for most jobs
- **Infinite scalability** — Queue deep? Ignite more runners automatically
- **Grove-native** — Integrates with Woodpecker, Codeberg, and `gw` CLI

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Firefly CI System                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Codeberg   │  │  Woodpecker  │  │   Firefly Controller │  │
│  │   (Source)   │  │   (Queue)    │  │   (Coordination)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                     │              │
│         │   Webhook       │   Job Request       │   Ignite     │
│         │────────────────>│────────────────────>│────────────> │
│         │                 │                     │              │
│         │                 │   Job Complete      │   Fade       │
│         │                 │<────────────────────│<──────────── │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────────┴───────────┐  │
│  │   Git Repo   │  │  Job Queue   │  │   Runner Pool DO     │  │
│  │              │  │              │  │   (Loom Pattern)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                             │                   │
│                    ┌────────────────────────┘                   │
│                    │                                           │
│         ┌──────────▼──────────┐    ┌──────────────┐            │
│         │   Warm Runners      │    │   Ephemeral  │            │
│         │   (Always-on pool)  │    │   Runners    │            │
│         │   €6-12/month       │    │   (Ignited)  │            │
│         └──────────┬──────────┘    └──────┬───────┘            │
│                    │                      │                     │
│                    └──────────┬───────────┘                     │
│                               │                                │
│                    ┌──────────▼──────────┐                     │
│                    │    Hetzner Cloud    │                     │
│                    │   (CX21, CPX31)     │                     │
│                    └─────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

### Runner States

Runners follow the Firefly lifecycle:

| State | Description | Transitions |
|-------|-------------|-------------|
| `hibernating` | Exists but idle, registered with Woodpecker | → `illuminating` when job assigned |
| `illuminating` | Booting up, installing dependencies | → `illuminating` when ready |
| `illuminating` | Executing CI job | → `fading` when complete |
| `fading` | Syncing logs, artifacts, unregistering | → destroyed |

### Warm Pool Strategy

**Active Development Mode (9am-6pm or manual trigger):**
- Keep 1-2 runners always warm
- Scale up to 5 runners based on queue depth
- Fade runners after 10 minutes idle

**Quiet Hours:**
- Zero warm runners
- Ignite on demand (30-60s cold start)
- Immediate fade after job completion

**Manual Override:**
```bash
gw firefly warm --count 3 --duration 4h  # Warm pool for big push
gw firefly freeze                       # Zero warm runners (vacation mode)
```

## Coordination Layer (Loom-Inspired)

The Runner Pool uses a Durable Object for coordination:

```typescript
// Conceptual interface
interface RunnerPool {
  // State management
  runners: Map<runnerId, RunnerState>
  jobQueue: Job[]
  
  // Pool configuration
  config: {
    minWarm: number      // Minimum warm runners
    maxTotal: number     // Maximum concurrent runners
    fadeAfterMinutes: number
    scaleThreshold: number  // Jobs queued before scaling
  }
  
  // Operations
  requestRunner(job: Job): Promise<Runner>
  releaseRunner(runnerId: string): Promise<void>
  scalePool(): Promise<void>
}
```

**Why Loom/Durable Objects?**
- Single source of truth for runner state
- WebSocket coordination with Woodpecker
- Survives server restarts
- Atomic operations prevent race conditions

## Implementation Phases

### Phase 1: Static Woodpecker (Immediate)

**Goal:** Prove Codeberg CI works

**Setup:**
1. Provision CX21 at Hetzner (€6/month)
2. Install Woodpecker server + agent
3. Connect to Codeberg via OAuth
4. Port existing GitHub Actions workflows

**Pipeline Example:**
```yaml
# .woodpecker.yml
workspace:
  base: /app
  path: .

steps:
  install:
    image: node:20
    commands:
      - npm ci

  typecheck:
    image: node:20
    commands:
      - npm run typecheck --all

  test:
    image: node:20
    commands:
      - npm test --all

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

### Phase 2: Firefly Ignition (Month 2)

**Goal:** Ephemeral runners with warm pool

**Components:**
1. **Firefly Controller** (Cloudflare Worker)
   - Receives webhooks from Woodpecker
   - Manages runner pool DO
   - Calls Hetzner API to create/destroy servers

2. **Runner Image** (Packer)
   - Pre-baked with Docker, Node, pnpm, Woodpecker agent
   - Auto-registers with Woodpecker on boot
   - Self-destructs after idle timeout

3. **Pool Manager** (Durable Object)
   - Tracks runner states
   - Queues jobs when capacity full
   - Scales up/down based on demand

**Ignition Flow:**
```
Job queued in Woodpecker
    ↓
Woodpecker webhook → Firefly Controller
    ↓
Controller checks Pool DO
    ↓
├─ Warm runner available? → Assign job
├─ Below max capacity? → Call Hetzner API (create server)
└─ At max capacity? → Queue job, wait
    ↓
Server boots (45-60s)
    ↓
Runner registers with Woodpecker
    ↓
Job executes
    ↓
Job complete → Runner fades → Hetzner destroy API
```

### Phase 3: GW Integration (Month 3)

**Goal:** `gw firefly` commands

**Commands:**
```bash
# Status
gw firefly status
# Pool: 2 warm, 1 illuminating, 0 fading
# Queue: 0 jobs
# Costs today: €0.04

# Manual pool management
gw firefly warm --count 3 --duration 2h
gw firefly freeze
gw firefly ignite --type ci-runner

# Debugging
gw firefly logs --runner ci-abc123
gw firefly ssh --runner ci-abc123  # Debug a running runner

# Cost analysis
gw firefly costs --breakdown
gw firefly costs --this-month

# Configuration
gw firefly config --min-warm 1 --max-runners 5 --fade-after 10
```

## Cost Estimates

**Static Woodpecker (Phase 1):**
- 1× CX21 (2 vCPU, 4GB): €6.72/month
- **Total: ~€7/month**

**Firefly CI with Warm Pool (Phase 2+):**
- Woodpecker server (1 vCPU, 2GB): €3.29/month
- Warm runners (1× CX21): €6.72/month (active hours only)
- Ephemeral runners: €0.006/hour each

**Usage scenarios:**
| Pattern | Monthly Cost |
|---------|-------------|
| Light (10 jobs/day, 5 min each) | €8-10 |
| Medium (50 jobs/day, 10 min each) | €12-18 |
| Heavy (100+ jobs/day, parallel builds) | €20-35 |
| Always-on equivalent | €35-50 |

**Savings:** 40-70% vs always-on runners

## Integration with Existing Work

**Reuses:**
- Outpost Firefly implementation (server lifecycle)
- Verge patterns (Hetzner API integration)
- Loom coordination (Durable Objects)
- GW CLI framework (commands, safety, UI)

**References:**
- [Firefly Pattern](/knowledge/patterns/firefly-pattern)
- [Loom Pattern](/knowledge/patterns/loom-durable-objects-pattern)
- Outpost source (existing 98% working implementation)
- Issues #554-570 (Firefly SDK plans)

## Open Questions

1. **Storage:** Where do build artifacts live? R2? Ephemeral runner disk?
2. **Caching:** How to cache `node_modules` between jobs? Shared R2 bucket?
3. **Secrets:** Woodpecker secrets vs Firefly controller vs Doppler?
4. **Networking:** Private registry access? Docker Hub rate limits?
5. **Debugging:** How to SSH into a failed ephemeral runner before it fades?

## Next Steps

1. [ ] Set up static Woodpecker on Codeberg
2. [ ] Port one GitHub Actions workflow
3. [ ] Document pain points and gaps
4. [ ] Design Firefly Controller API
5. [ ] Extract reusable patterns from Outpost
