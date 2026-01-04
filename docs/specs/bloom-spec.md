---
aliases: []
date created: Monday, December 29th 2025
date modified: Friday, January 3rd 2026
tags:
  - remote-coding
  - infrastructure
  - ai-agents
  - hetzner
type: tech-spec
---

# Bloom — Remote Coding Infrastructure

> *Brief, brilliant, gone.*

Grove's serverless remote coding infrastructure that spins up temporary VPS instances on-demand. Runs AI coding agents autonomously to complete development tasks, syncs code to R2 storage, then self-destructs. Text it and forget it.

**Public Name:** Bloom
**Internal Name:** GroveBloom
**Domain:** `bloom.grove.place`
**Repository:** [AutumnsGrove/GroveBloom](https://github.com/AutumnsGrove/GroveBloom)

A bloom is the brief, brilliant moment when a flower opens: ephemeral, purposeful, then gone. It appears when conditions are right, does its work, and doesn't linger.

Bloom is Grove's serverless remote coding infrastructure. It spins up temporary VPS instances on-demand, runs AI coding agents autonomously to complete development tasks, syncs your code to storage, then vanishes. Text it and forget it. Bloom works through it, saves the results, and cleans up after itself.

---

## Overview

**Philosophy**: "Text it and forget it." Send a task from your phone, the agent works until done, commits code, and the infrastructure self-destructs. Work that happens in the quiet hours, blooming into results by morning.

**Target**: Personal development work across multiple interconnected Grove ecosystem projects.

**Cost Estimate**: <$1.00/month (assuming ~20 hours of coding/month + heavy DeepSeek usage).

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLOUDFLARE                                     │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │  R2: bloom-repos │    │ R2: bloom-state  │    │   D1: bloom-db   │       │
│  │  (cloned repos,  │    │   (workspaces,   │    │  (sessions, logs │       │
│  │   node_modules)  │    │    snapshots)    │    │   config, costs) │       │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘       │
│           │                       │                       │                 │
│           └───────────────────────┼───────────────────────┘                 │
│                                   │                                         │
│                    ┌──────────────▼──────────────┐                          │
│                    │    Worker: bloom-control    │                          │
│                    │  - Start/stop server        │                          │
│                    │  - Sync repos to/from R2    │                          │
│                    │  - Monitor agent state      │                          │
│                    │  - Hetzner API calls        │                          │
│                    │  - Cloudflare DNS updates   │                          │
│                    │  - Task completion handler  │                          │
│                    └──────────────┬──────────────┘                          │
│                                   │                                         │
│           ┌───────────────────────┼───────────────────────┐                 │
│           │                       │                       │                 │
│  ┌────────▼──────────┐   ┌────────▼─────────┐   ┌────────▼─────────┐        │
│  │ bloom.grove.place │   │  Heartwood Auth  │   │  WebSocket Proxy │        │
│  │  SvelteKit App    │   │  (login/session) │   │  (terminal stream)│       │
│  │  - Dashboard      │   │                  │   │                  │        │
│  │  - Terminal       │   │                  │   │                  │        │
│  │  - Project select │   │                  │   │                  │        │
│  └───────────────────┘   └──────────────────┘   └──────────────────┘        │
│                                                                             │
│                   [DNS: A record updated on boot]                           │
│                                   │                                         │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────────────────────────┐
                          │         Hetzner Cloud VPS           │
                          │     CX33 (EU) or CPX31 (US)         │
                          │  ┌─────────────────────────────┐    │
                          │  │     Kilo Code CLI Agent     │    │
                          │  │  - Architect/Code/Debug     │    │
                          │  │  - Autonomous mode          │    │
                          │  │  - Multi-project workspace  │    │
                          │  └─────────────────────────────┘    │
                          │  ┌─────────────────────────────┐    │
                          │  │     ttyd (Web Terminal)     │    │
                          │  │  - Exposed via HTTPS        │    │
                          │  │  - Mobile-friendly          │    │
                          │  └─────────────────────────────┘    │
                          │  ┌─────────────────────────────┐    │
                          │  │     Bloom Daemon            │    │
                          │  │  - Task completion detect   │    │
                          │  │  - Idle timeout (2hr)       │    │
                          │  │  - R2 sync on shutdown      │    │
                          │  │  - Graceful termination     │    │
                          │  └─────────────────────────────┘    │
                          │                                     │
                          │  /workspace/                        │
                          │  ├── GroveEngine/                   │
                          │  ├── GroveAuth/                     │
                          │  ├── ... (configured repos)         │
                          │  └── .bloom/ (agent state)          │
                          │                                     │
                          │  Specs: 4 vCPU, 8GB RAM             │
                          └─────────────────────────────────────┘
```

---

## Technology Stack

| Component | Choice | Reason |
|-----------|--------|--------|
| **Frontend** | SvelteKit (GroveEngine patterns) | Consistent with Grove ecosystem, mobile-first capable |
| **Orchestrator** | Cloudflare Workers | Zero cold-start, handles auth, Hetzner API, WebSocket proxy |
| **Auth** | Heartwood (GroveAuth) | Existing OAuth 2.0 + PKCE, admin-only access |
| **Compute** | Hetzner Cloud (CX33/CPX31) | Cheapest robust option (~€0.008/hr EU). Fast provisioning. |
| **Storage** | Cloudflare R2 | Repos, node_modules, workspace state. No Hetzner Volume. |
| **Database** | Cloudflare D1 | Session history, config, cost tracking |
| **Agent** | Kilo Code CLI | Open source, 500+ models, autonomous mode, multi-mode |
| **Inference** | OpenRouter | Single API key for DeepSeek V3.2 + GLM 4.6V (swappable) |
| **Terminal** | ttyd | Web terminal over HTTPS/WebSocket. Mobile-friendly. |

---

## The "Two-Model" Brain Configuration

Bloom uses a dual-model approach via OpenRouter for cost-efficiency:

| Mode | Model | Purpose | Pricing (per 1M tokens) |
|------|-------|---------|-------------------------|
| **Reasoning/Code** | `deepseek/deepseek-chat` (V3.2) | Planning, architecture, code generation | $0.28 input / $0.42 output |
| **Vision** | `z-ai/glm-4.6v` | Screenshot analysis, UI understanding | $0.30 input / $0.90 output |

### Kilo Code Configuration

Injected into `~/.kilocode/config.json` on boot:

```json
{
  "providers": {
    "openrouter": {
      "apiKey": "${OPENROUTER_API_KEY}",
      "defaultModel": "deepseek/deepseek-chat"
    }
  },
  "modes": {
    "architect": {
      "model": "deepseek/deepseek-chat",
      "temperature": 0.3
    },
    "code": {
      "model": "deepseek/deepseek-chat",
      "temperature": 0.2
    },
    "debug": {
      "model": "deepseek/deepseek-chat",
      "temperature": 0.2
    }
  },
  "vision": {
    "model": "z-ai/glm-4.6v",
    "enabled": true
  },
  "autoApproval": {
    "enabled": true,
    "read": { "enabled": true, "outside": true },
    "write": { "enabled": true, "outside": false, "protected": false },
    "execute": {
      "enabled": true,
      "allowed": ["npm", "pnpm", "git", "node", "npx", "wrangler"],
      "denied": ["rm -rf /", "sudo rm", "shutdown"]
    },
    "mcp": { "enabled": true },
    "subtasks": { "enabled": true }
  }
}
```

**Future**: Model selection will be configurable from the dashboard.

---

## Repository Manifest

Projects to clone and maintain in the workspace. Edit this section to add/remove repos.

&lt;!-- REPO_MANIFEST_START --&gt;

| Repository | Branch | Path | Notes |
|------------|--------|------|-------|
| `AutumnsGrove/GroveEngine` | `main` | `/workspace/GroveEngine` | Core blog engine, Lattice |
| `AutumnsGrove/GroveAuth` | `main` | `/workspace/GroveAuth` | Heartwood auth service |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |

&lt;!-- REPO_MANIFEST_END --&gt;

**Note**: All repos are cloned fresh on first boot, then synced to/from R2 on subsequent sessions. Node modules are cached in R2 to speed up boot times.

---

## R2 Storage Strategy

No Hetzner Volume; all persistence through Cloudflare R2.

### Bucket: `bloom-repos`

Pre-cloned repositories with dependencies installed:

```
bloom-repos/
├── GroveEngine/
│   ├── .git/
│   ├── node_modules.tar.gz      # Compressed for faster sync
│   ├── packages/
│   └── ...
├── GroveAuth/
│   ├── .git/
│   ├── node_modules.tar.gz
│   └── ...
└── manifest.json                 # Repo versions, last sync times
```

### Bucket: `bloom-state`

Agent state and workspace snapshots:

```
bloom-state/
├── current/
│   └── workspace-snapshot.tar.gz  # Latest workspace state
├── kilo/
│   └── context.json               # Kilo Code memory/context
├── history/
│   ├── snapshot-2025-01-15-1200.tar.gz
│   └── ... (keep last 5)
└── metadata.json
```

### Sync Strategy

**On Boot:**
1. Pull repos from `bloom-repos/`
2. Extract `node_modules.tar.gz` for each project
3. `git fetch && git pull` for latest changes
4. Restore Kilo context from `bloom-state/kilo/`

**On Shutdown:**
1. Commit and push any uncommitted changes (with user confirmation option)
2. Compress updated `node_modules` if changed
3. Snapshot workspace to `bloom-state/`
4. Upload to R2
5. Delete VPS

**Estimated Sync Times:**
- Cold boot (no cache): ~2-3 minutes
- Warm boot (cached): ~30-60 seconds

---

## Server Lifecycle State Machine

```
                    ┌──────────┐
                    │  OFFLINE │ ◄────────────────────────────────────────┐
                    └────┬─────┘                                          │
                         │                                                │
                    [Start Button]                                        │
                         │                                                │
                         ▼                                                │
                  ┌─────────────┐                                         │
                  │ PROVISIONING│                                         │
                  │  (1-3 min)  │                                         │
                  └──────┬──────┘                                         │
                         │                                                │
                  [Setup Complete]                                        │
                         │                                                │
                         ▼                                                │
                    ┌─────────┐                                           │
         ┌─────────►│ RUNNING │◄──────────┐                               │
         │          └────┬────┘           │                               │
         │               │                │                               │
         │        [No Activity]      [Activity]                           │
         │               │                │                               │
         │               ▼                │                               │
         │          ┌─────────┐           │                               │
         │          │  IDLE   ├───────────┘                               │
         │          │ (2 hour │                                           │
         │          │ timeout)│                                           │
         │          └────┬────┘                                           │
         │               │                                                │
         │        [Timeout OR Task Complete OR Manual Stop]               │
         │               │                                                │
         │               ▼                                                │
         │        ┌───────────┐                                           │
    [Resume]      │ SYNCING   │                                           │
         │        │ (save to  │                                           │
         │        │   R2)     │                                           │
         │        └─────┬─────┘                                           │
         │              │                                                 │
         │              ▼                                                 │
         │       ┌─────────────┐                                          │
         └───────┤ TERMINATING ├──────────────────────────────────────────┘
                 │ (delete VPS)│
                 └─────────────┘
```

### Shutdown Triggers

| Trigger | Behavior | Default |
|---------|----------|---------|
| **Manual Stop** | User clicks "Stop" in dashboard | Always available |
| **Idle Timeout** | No terminal activity for X minutes | 2 hours (configurable) |
| **Task Completion** | Kilo signals task done via exit code or webhook | Enabled |

### Shutdown Flow

1. **Sync Phase**: 
   - Save all work to R2
   - Optionally commit/push pending changes
   - Preserve Kilo context
2. **Cleanup Phase**:
   - Log session metrics (duration, cost, tokens)
   - Notify dashboard of completion
3. **Termination Phase**:
   - Delete Hetzner VPS
   - Update DNS (optional: point to "offline" page)

---

## Cost Comparison: EU vs US

| Location | Instance | Specs | Hourly | Monthly Cap | 100 hrs Est. | Latency to GA |
|----------|----------|-------|--------|-------------|--------------|---------------|
| **EU (Falkenstein)** | CX33 | 4 vCPU, 8GB, 80GB NVMe | €0.008 (~$0.0085) | €5.49 (~$5.80) | **~$0.85** | ~90-100ms |
| **US (Ashburn)** | CPX31 | 4 vCPU, 8GB, 160GB NVMe | €0.0211 (~$0.022) | €13.93 (~$14.70) | **~$2.20** | ~20-30ms |

### Region Toggle

The dashboard includes a **region selector** for cost vs latency tradeoffs:

- **Quick task, budget-conscious?** → EU (~$0.0085/hr)
- **Interactive session, want snappy terminal?** → US (~$0.022/hr)

---

## DNS Configuration

### Cloudflare DNS Records

| Type | Name | Content | Proxy | TTL | Notes |
|------|------|---------|-------|-----|-------|
| A | bloom | `&lt;VPS_IP&gt;` | ❌ DNS only | 60s | Updated by worker on boot |
| CNAME | bloom (offline) | bloom-offline.pages.dev | ✅ Proxied | Auto | When VPS is down |

**Connection**: `bloom.grove.place` for both dashboard and terminal.

---

## Worker API Endpoints

Base URL: `https://bloom.grove.place/api`

### `POST /start`

Start a new Bloom session.

```typescript
// Request
{ 
  "region": "eu" | "us",
  "task"?: string,           // Optional: initial task for autonomous mode
  "autoShutdown": boolean    // Default: true
}

// Response
{
  "status": "provisioning",
  "sessionId": "bloom-20250115-abc123",
  "region": "eu",
  "estimatedReadyTime": "2025-01-15T12:03:00Z",
  "serverId": "12345678"
}
```

### `POST /stop`

Stop the current session.

```typescript
// Request
{ 
  "force": boolean,          // Skip sync if true
  "commitPending": boolean   // Auto-commit uncommitted changes
}

// Response
{
  "status": "syncing",
  "message": "Saving workspace to R2..."
}
```

### `GET /status`

Get current session status.

```typescript
// Response
{
  "state": "RUNNING",  // OFFLINE | PROVISIONING | RUNNING | IDLE | SYNCING | TERMINATING
  "sessionId": "bloom-20250115-abc123",
  "region": "eu",
  "serverId": "12345678",
  "serverIp": "1.2.3.4",
  "uptime": 7200,
  "idleTime": 300,
  "idleTimeout": 7200,
  "terminalUrl": "wss://bloom.grove.place/terminal",
  "lastActivity": "2025-01-15T13:45:00Z",
  "currentTask": "Implementing feature X",
  "costs": {
    "currentSession": 0.03,
    "hourlyRate": 0.0085,
    "thisMonth": 0.45
  },
  "workspace": {
    "activeProject": "GroveEngine",
    "uncommittedChanges": 3,
    "lastSync": "2025-01-15T12:00:00Z"
  }
}
```

### `POST /task`

Send a task to the running agent (autonomous mode).

```typescript
// Request
{
  "task": "Implement the user settings page",
  "mode": "architect" | "code" | "debug",  // Optional
  "autoShutdownOnComplete": true
}

// Response
{
  "taskId": "task-xyz789",
  "status": "queued",
  "message": "Task sent to agent"
}
```

### `GET /projects`

List available projects in workspace.

```typescript
// Response
{
  "projects": [
    {
      "name": "GroveEngine",
      "path": "/workspace/GroveEngine",
      "branch": "main",
      "uncommittedChanges": 0,
      "lastCommit": "abc123"
    },
    // ...
  ]
}
```

### `POST /sync`

Manually trigger R2 sync.

```typescript
// Response
{
  "status": "syncing",
  "message": "Syncing workspace to R2..."
}
```

### `GET /history`

Get session history.

```typescript
// Request params
?limit=10&offset=0

// Response
{
  "sessions": [
    {
      "sessionId": "bloom-20250115-abc123",
      "startedAt": "2025-01-15T10:00:00Z",
      "endedAt": "2025-01-15T12:30:00Z",
      "duration": 9000,
      "durationFormatted": "2h 30m",
      "region": "eu",
      "costUsd": 0.02,
      "tasksCompleted": 3,
      "shutdownReason": "task_complete"
    }
  ],
  "thisMonth": {
    "totalHours": 12.5,
    "totalCost": 0.11,
    "sessionCount": 8
  }
}
```

### `POST /config`

Update Bloom configuration.

```typescript
// Request
{
  "idleTimeout": 7200,        // seconds (2 hours)
  "defaultRegion": "eu",
  "autoCommit": false,
  "models": {
    "reasoning": "deepseek/deepseek-chat",
    "vision": "z-ai/glm-4.6v"
  }
}
```

### Webhook Endpoints (Internal)

| Endpoint | Purpose |
|----------|---------|
| `POST /webhook/ready` | VPS signals boot complete |
| `POST /webhook/heartbeat` | Daemon reports status |
| `POST /webhook/task-complete` | Agent signals task done |
| `POST /webhook/idle-timeout` | Daemon triggers shutdown |

---

## Dashboard Design (Mobile-First)

### Main View

```
┌─────────────────────────────────────────────────────────────┐
│  🌸 Bloom                              [EU ▾] [US]  [☰]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │              Server is Offline                      │    │
│  │                                                     │    │
│  │         ┌─────────────────────────┐                 │    │
│  │         │     🌱 Start Bloom      │                 │    │
│  │         └─────────────────────────┘                 │    │
│  │                                                     │    │
│  │              EU · ~$0.0085/hr                       │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ── Quick Task ──────────────────────────────────────────   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Describe a task to run autonomously...              │    │
│  └─────────────────────────────────────────────────────┘    │
│  [Start with Task]                                          │
│                                                             │
│  ── Recent Sessions ─────────────────────────────────────   │
│                                                             │
│  Today · 2h 15m · $0.02 · 3 tasks                           │
│  Yesterday · 45m · $0.01 · 1 task                           │
│  Dec 13 · 1h 30m · $0.01 · 2 tasks                          │
│                                                             │
│  This month: 12.5 hrs · $0.11                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Running View (Terminal)

```
┌─────────────────────────────────────────────────────────────┐
│  🌸 Bloom                    🟢 Running    [Stop ▾]         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ EU · 45m uptime · $0.006 · Idle: 5m / 2h            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Project: GroveEngine ▾                    [Sync]    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ┌─────────────────────────────────────────────────┐ │    │
│  │ │ ~/workspace/GroveEngine $ kilocode              │ │    │
│  │ │                                                 │ │    │
│  │ │ 🤖 Kilo Code v2.1.0                             │ │    │
│  │ │ Model: deepseek/deepseek-chat                   │ │    │
│  │ │ Mode: code                                      │ │    │
│  │ │                                                 │ │    │
│  │ │ > What would you like to work on?               │ │    │
│  │ │ _                                               │ │    │
│  │ │                                                 │ │    │
│  │ │                                                 │ │    │
│  │ │                                                 │ │    │
│  │ └─────────────────────────────────────────────────┘ │    │
│  │              [ ttyd terminal iframe ]               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Quick: [Architect] [Code] [Debug] [Git Status]        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Settings View

```
┌─────────────────────────────────────────────────────────────┐
│  ← Settings                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ── Shutdown Behavior ───────────────────────────────────   │
│                                                             │
│  Idle Timeout           [2 hours     ▾]                     │
│  Auto-shutdown on task complete    [✓]                      │
│  Auto-commit on shutdown           [ ]                      │
│                                                             │
│  ── Default Region ──────────────────────────────────────   │
│                                                             │
│  ( ) EU (Falkenstein) · €0.008/hr                           │
│  (•) US (Ashburn) · €0.021/hr                               │
│                                                             │
│  ── Models (OpenRouter) ─────────────────────────────────   │
│                                                             │
│  Reasoning     [deepseek/deepseek-chat        ▾]            │
│  Vision        [z-ai/glm-4.6v                 ▾]            │
│                                                             │
│  ── Projects ────────────────────────────────────────────   │
│                                                             │
│  GroveEngine        main    [Edit] [Remove]                 │
│  GroveAuth          main    [Edit] [Remove]                 │
│  + Add Project                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## D1 Database Schema

```sql
-- Server state tracking
CREATE TABLE server_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    state TEXT NOT NULL DEFAULT 'OFFLINE',
    session_id TEXT,
    vps_id TEXT,
    vps_ip TEXT,
    region TEXT,
    started_at TEXT,
    last_heartbeat TEXT,
    last_activity TEXT,
    idle_since TEXT,
    current_task TEXT,
    dns_updated_at TEXT
);

-- Session history
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds INTEGER,
    cost_usd REAL,
    region TEXT,
    server_type TEXT,
    tasks_completed INTEGER DEFAULT 0,
    shutdown_reason TEXT,  -- 'manual' | 'idle_timeout' | 'task_complete'
    tokens_used INTEGER
);

-- Task history
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    task_id TEXT UNIQUE NOT NULL,
    description TEXT,
    mode TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT,  -- 'pending' | 'running' | 'completed' | 'failed'
    tokens_used INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- Configuration
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Repository manifest
CREATE TABLE repositories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    branch TEXT DEFAULT 'main',
    path TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    last_sync TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Monthly aggregates
CREATE TABLE monthly_summary (
    month TEXT PRIMARY KEY,  -- "2025-01"
    total_hours REAL,
    total_cost REAL,
    session_count INTEGER,
    tasks_completed INTEGER
);
```

---

## VPS Setup Script (cloud-init)

```yaml
#cloud-config

package_update: true
package_upgrade: false

packages:
  - git
  - tmux
  - jq
  - curl
  - unzip

write_files:
  # Bloom daemon script
  - path: /opt/bloom/daemon.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      # Bloom Daemon - monitors activity and handles shutdown triggers
      
      IDLE_TIMEOUT=${IDLE_TIMEOUT:-7200}  # 2 hours default
      WEBHOOK_URL="${WEBHOOK_URL}"
      WEBHOOK_SECRET="${WEBHOOK_SECRET}"
      
      last_activity=$(date +%s)
      
      check_terminal_activity() {
        # Check if there's been recent terminal input
        if [ -f /tmp/bloom-last-activity ]; then
          last_activity=$(cat /tmp/bloom-last-activity)
        fi
      }
      
      send_heartbeat() {
        local idle_seconds=$(($(date +%s) - last_activity))
        curl -s -X POST "${WEBHOOK_URL}/webhook/heartbeat" \
          -H "Authorization: Bearer ${WEBHOOK_SECRET}" \
          -H "Content-Type: application/json" \
          -d "{
            \"state\": \"running\",
            \"idleSeconds\": ${idle_seconds},
            \"timestamp\": \"$(date -Iseconds)\"
          }"
      }
      
      trigger_shutdown() {
        local reason=$1
        echo "$(date): Triggering shutdown - reason: ${reason}"
        
        # Notify worker
        curl -s -X POST "${WEBHOOK_URL}/webhook/${reason}" \
          -H "Authorization: Bearer ${WEBHOOK_SECRET}" \
          -H "Content-Type: application/json" \
          -d "{\"timestamp\": \"$(date -Iseconds)\"}"
      }
      
      # Main loop
      while true; do
        check_terminal_activity
        idle_seconds=$(($(date +%s) - last_activity))
        
        # Send heartbeat every 30 seconds
        send_heartbeat
        
        # Check idle timeout
        if [ "$idle_seconds" -ge "$IDLE_TIMEOUT" ]; then
          trigger_shutdown "idle-timeout"
          exit 0
        fi
        
        sleep 30
      done

  # Sync script
  - path: /opt/bloom/sync-to-r2.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      # Sync workspace to R2
      
      echo "$(date): Starting R2 sync..."
      
      cd /workspace
      
      # Compress and upload each project's node_modules
      for dir in */; do
        if [ -d "${dir}node_modules" ]; then
          echo "Compressing ${dir}node_modules..."
          tar -czf "/tmp/${dir%/}-node_modules.tar.gz" -C "$dir" node_modules
          rclone copy "/tmp/${dir%/}-node_modules.tar.gz" "r2:bloom-repos/${dir}"
        fi
      done
      
      # Sync Kilo context
      if [ -d ~/.kilocode ]; then
        rclone sync ~/.kilocode r2:bloom-state/kilo/
      fi
      
      # Create workspace snapshot
      tar -czf /tmp/workspace-snapshot.tar.gz \
        --exclude='node_modules' \
        --exclude='.git/objects' \
        -C /workspace .
      
      rclone copy /tmp/workspace-snapshot.tar.gz r2:bloom-state/current/
      
      echo "$(date): R2 sync complete"

  # Rclone config for R2
  - path: /root/.config/rclone/rclone.conf
    content: |
      [r2]
      type = s3
      provider = Cloudflare
      access_key_id = ${R2_ACCESS_KEY}
      secret_access_key = ${R2_SECRET_KEY}
      endpoint = https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com
      acl = private

  # Kilo Code config
  - path: /root/.kilocode/config.json
    content: |
      {
        "providers": {
          "openrouter": {
            "apiKey": "${OPENROUTER_API_KEY}",
            "defaultModel": "deepseek/deepseek-chat"
          }
        },
        "autoApproval": {
          "enabled": true,
          "read": { "enabled": true, "outside": true },
          "write": { "enabled": true, "outside": false },
          "execute": {
            "enabled": true,
            "allowed": ["npm", "pnpm", "git", "node", "npx", "wrangler", "uv"],
            "denied": ["rm -rf /", "sudo rm", "shutdown"]
          }
        }
      }

  # ttyd activity wrapper
  - path: /opt/bloom/ttyd-wrapper.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      # Wrapper that updates activity timestamp on input
      date +%s > /tmp/bloom-last-activity
      exec "$@"

  # Systemd service for ttyd
  - path: /etc/systemd/system/ttyd.service
    content: |
      [Unit]
      Description=ttyd Web Terminal
      After=network.target

      [Service]
      Type=simple
      ExecStart=/usr/local/bin/ttyd -p 7681 -W -t fontSize=14 -t theme={"background":"#1a1b26"} /bin/bash -c "cd /workspace && exec bash"
      Restart=always

      [Install]
      WantedBy=multi-user.target

  # Systemd service for Bloom daemon
  - path: /etc/systemd/system/bloom-daemon.service
    content: |
      [Unit]
      Description=Bloom Daemon
      After=network.target ttyd.service

      [Service]
      Type=simple
      EnvironmentFile=/etc/bloom/env
      ExecStart=/opt/bloom/daemon.sh
      Restart=always

      [Install]
      WantedBy=multi-user.target

runcmd:
  # Install Node.js 22
  - curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  - apt-get install -y nodejs

  # Install pnpm
  - npm install -g pnpm

  # Install Kilo Code CLI
  - npm install -g @kilocode/cli

  # Install rclone
  - curl https://rclone.org/install.sh | bash

  # Install ttyd
  - |
    TTYD_VERSION="1.7.7"
    curl -L "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd.x86_64" -o /usr/local/bin/ttyd
    chmod +x /usr/local/bin/ttyd

  # Create workspace directory
  - mkdir -p /workspace
  - mkdir -p /etc/bloom
  - mkdir -p /opt/bloom

  # Write environment file
  - |
    cat > /etc/bloom/env << 'EOF'
    WEBHOOK_URL=${WEBHOOK_URL}
    WEBHOOK_SECRET=${WEBHOOK_SECRET}
    IDLE_TIMEOUT=${IDLE_TIMEOUT}
    EOF

  # Sync repos from R2
  - rclone sync r2:bloom-repos/ /workspace/
  
  # Extract node_modules for each project
  - |
    cd /workspace
    for tarfile in */*-node_modules.tar.gz; do
      if [ -f "$tarfile" ]; then
        dir=$(dirname "$tarfile")
        tar -xzf "$tarfile" -C "$dir"
        rm "$tarfile"
      fi
    done

  # Git pull latest for each repo
  - |
    cd /workspace
    for dir in */; do
      if [ -d "${dir}.git" ]; then
        cd "$dir"
        git fetch origin
        git pull origin $(git branch --show-current)
        cd ..
      fi
    done

  # Restore Kilo context
  - rclone copy r2:bloom-state/kilo/ /root/.kilocode/

  # Start services
  - systemctl daemon-reload
  - systemctl enable ttyd bloom-daemon
  - systemctl start ttyd bloom-daemon

  # Notify ready
  - |
    VPS_IP=$(curl -s http://169.254.169.254/hetzner/v1/metadata/public-ipv4)
    curl -X POST "${WEBHOOK_URL}/webhook/ready" \
      -H "Authorization: Bearer ${WEBHOOK_SECRET}" \
      -H "Content-Type: application/json" \
      -d "{
        \"serverId\": \"$(curl -s http://169.254.169.254/hetzner/v1/metadata/instance-id)\",
        \"ip\": \"$VPS_IP\"
      }"
```

---

## Task Completion Detection

Kilo Code CLI supports autonomous mode with exit codes:

```bash
# Autonomous task execution
kilocode --auto "Implement feature X" --timeout 3600

# Exit codes:
# 0 - Task completed successfully
# 1 - Task failed
# 124 - Timeout
```

### Wrapper Script for Task Mode

```bash
#!/bin/bash
# /opt/bloom/run-task.sh

TASK="$1"
WEBHOOK_URL="${WEBHOOK_URL}"
WEBHOOK_SECRET="${WEBHOOK_SECRET}"

# Run Kilo in autonomous mode
kilocode --auto "$TASK" --timeout 3600

EXIT_CODE=$?

# Report completion
if [ $EXIT_CODE -eq 0 ]; then
  STATUS="completed"
elif [ $EXIT_CODE -eq 124 ]; then
  STATUS="timeout"
else
  STATUS="failed"
fi

curl -X POST "${WEBHOOK_URL}/webhook/task-complete" \
  -H "Authorization: Bearer ${WEBHOOK_SECRET}" \
  -H "Content-Type: application/json" \
  -d "{
    \"status\": \"${STATUS}\",
    \"exitCode\": ${EXIT_CODE},
    \"timestamp\": \"$(date -Iseconds)\"
  }"

# If auto-shutdown enabled and task complete, trigger shutdown
if [ "$AUTO_SHUTDOWN" = "true" ] && [ "$STATUS" = "completed" ]; then
  /opt/bloom/sync-to-r2.sh
  curl -X POST "${WEBHOOK_URL}/webhook/task-complete" \
    -H "Authorization: Bearer ${WEBHOOK_SECRET}" \
    -H "Content-Type: application/json" \
    -d '{"triggerShutdown": true}'
fi
```

---

## Implementation Checklist

### Phase 1: Cloudflare Setup
- [ ] Create R2 bucket: `bloom-repos`
- [ ] Create R2 bucket: `bloom-state`
- [ ] Create D1 database: `bloom-db`
- [ ] Generate R2 API credentials
- [ ] Create A record for `bloom.grove.place`
- [ ] Note Zone ID and create API token for DNS updates

### Phase 2: Prepare Initial Repos
- [ ] Clone configured repos locally
- [ ] Install node_modules for each
- [ ] Compress and upload to `bloom-repos`
- [ ] Create `manifest.json` with repo metadata
- [ ] Upload to R2

### Phase 3: Hetzner Setup
- [ ] Create Hetzner Cloud account (if not exists)
- [ ] Generate API token
- [ ] Add SSH key
- [ ] Test API with both regions

### Phase 4: Worker Development
- [ ] Create `bloom-control` worker
- [ ] `POST /start` — provision VPS
- [ ] `POST /stop` — graceful shutdown
- [ ] `GET /status` — session status
- [ ] `POST /task` — send autonomous task
- [ ] `GET /projects` — list projects
- [ ] `POST /sync` — manual R2 sync
- [ ] `GET /history` — session history
- [ ] `POST /config` — update settings
- [ ] Webhook handlers (ready, heartbeat, task-complete, idle-timeout)
- [ ] Cloudflare DNS update on ready
- [ ] WebSocket proxy for terminal

### Phase 5: Dashboard (SvelteKit)
- [ ] Initialize SvelteKit project with GroveEngine patterns
- [ ] Heartwood auth integration
- [ ] Main view (offline state)
- [ ] Running view (terminal embed)
- [ ] Settings view
- [ ] Region toggle
- [ ] Session history
- [ ] Project selector
- [ ] Quick task input
- [ ] Mobile-responsive design

### Phase 6: VPS Scripts
- [ ] Write cloud-init YAML
- [ ] Write `daemon.sh` (idle detection, heartbeat)
- [ ] Write `sync-to-r2.sh`
- [ ] Write `run-task.sh` (autonomous mode wrapper)
- [ ] Test on throwaway Hetzner server

### Phase 7: Testing
- [ ] Full boot cycle (EU)
- [ ] Full boot cycle (US)
- [ ] R2 sync (up and down)
- [ ] Idle timeout → shutdown
- [ ] Task completion → shutdown
- [ ] Manual stop → sync → shutdown
- [ ] Region toggle between sessions
- [ ] Multi-project workspace
- [ ] Terminal responsiveness on mobile
- [ ] Kilo Code autonomous mode

### Phase 8: Polish
- [ ] Error handling and retries
- [ ] Loading states
- [ ] Toast notifications
- [ ] Session cost tracking accuracy
- [ ] Documentation

---

## Monthly Cost Scenarios

### Compute (Hetzner)

| Usage | EU (CX33) | US (CPX31) |
|-------|-----------|------------|
| 10 hrs | ~$0.09 | ~$0.22 |
| 25 hrs | ~$0.21 | ~$0.55 |
| 50 hrs | ~$0.43 | ~$1.10 |
| 100 hrs | ~$0.85 | ~$2.20 |

### Storage (R2)

| Data | Monthly Cost |
|------|--------------|
| 5GB repos + modules | ~$0.08 |
| 2GB state/snapshots | ~$0.03 |
| **Total** | **~$0.11** |

### AI (OpenRouter)

| Usage | DeepSeek V3.2 | GLM 4.6V | Total |
|-------|---------------|----------|-------|
| Light (500K tokens) | ~$0.20 | ~$0.05 | ~$0.25 |
| Medium (2M tokens) | ~$0.80 | ~$0.20 | ~$1.00 |
| Heavy (5M tokens) | ~$2.00 | ~$0.50 | ~$2.50 |

### Total Estimates

| Scenario | Compute | Storage | AI | **Total** |
|----------|---------|---------|-----|-----------|
| Light (10hr, 500K tok) | $0.09 | $0.11 | $0.25 | **~$0.45** |
| Medium (25hr, 2M tok) | $0.21 | $0.11 | $1.00 | **~$1.32** |
| Heavy (50hr, 5M tok) | $0.43 | $0.11 | $2.50 | **~$3.04** |

---

## Quick Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| Start session | POST | `/api/start` |
| Stop session | POST | `/api/stop` |
| Get status | GET | `/api/status` |
| Send task | POST | `/api/task` |
| List projects | GET | `/api/projects` |
| Manual sync | POST | `/api/sync` |
| Session history | GET | `/api/history` |
| Update config | POST | `/api/config` |

| Shutdown Trigger | Default | Behavior |
|------------------|---------|----------|
| Manual | Always | User clicks Stop |
| Idle Timeout | 2 hours | No terminal activity |
| Task Complete | Enabled | Kilo exits with code 0 |

| State | VPS | Services | Billing |
|-------|-----|----------|---------|
| OFFLINE | ❌ | ❌ | ❌ |
| PROVISIONING | 🔄 | 🔄 | ✅ |
| RUNNING | ✅ | ✅ | ✅ |
| IDLE | ✅ | ✅ | ✅ |
| SYNCING | ✅ | 🔄 | ✅ |
| TERMINATING | 🔄 | ❌ | ✅ |

---

## Future Enhancements

- [ ] Svelte-native terminal (replace ttyd)
- [ ] Model selection in dashboard
- [ ] Cost alerts/budgets
- [ ] Scheduled tasks (cron-like)
- [ ] Multiple concurrent sessions
- [ ] Shared sessions (pair programming)
- [ ] Integration with Grove Review
- [ ] VS Code tunnel option

---

*Last updated: December 2025*
*Status: Specification complete, ready for implementation*
