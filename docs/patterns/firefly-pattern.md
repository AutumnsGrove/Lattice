# Firefly — Ephemeral Server Pattern

> *A brief light in the darkness. It appears, does its work, and fades away.*

**Public Name:** Firefly
**Internal Name:** GroveFirefly
**Pattern Type:** Infrastructure Architecture
**Used By:** Bloom, Outpost
**Last Updated:** January 2026

In the forest at dusk, fireflies blink into existence—brief, purposeful flashes of light. They don't stay lit all night. They appear when conditions call for them, do what they need to do, and vanish. No wasted energy. No lingering presence.

Firefly is Grove's pattern for ephemeral infrastructure. Servers that spin up on demand, complete their work, and tear down automatically. Infrastructure that exists only when needed—costing almost nothing when idle, scaling instantly when called upon.

---

## Overview

The Firefly pattern defines a three-phase lifecycle for ephemeral server infrastructure:

1. **Ignite** — Spin up a server in response to demand
2. **Illuminate** — Execute the work (coding, gaming, processing)
3. **Fade** — Tear down gracefully when complete or idle

This pattern is ideal for workloads that are:
- **Bursty** — High activity followed by long periods of nothing
- **Session-based** — Discrete units of work with clear start/end
- **Cost-sensitive** — Can't justify 24/7 hosting for occasional use
- **Stateful but portable** — State can be synced to persistent storage

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FIREFLY LIFECYCLE                                │
└─────────────────────────────────────────────────────────────────────────┘

     DORMANT                    ACTIVE                      DORMANT
  (no server)              (server running)               (no server)
       │                         │                              │
       │    ┌──────────────┐     │                              │
       │    │   TRIGGER    │     │                              │
       │    │  (request,   │     │                              │
       │    │   webhook,   │     │                              │
       │    │   schedule)  │     │                              │
       │    └──────┬───────┘     │                              │
       │           │             │                              │
       │           ▼             │                              │
       │    ┌──────────────┐     │                              │
       │    │    IGNITE    │     │                              │
       │    │              │     │                              │
       │    │ • Provision  │     │                              │
       │    │ • Configure  │     │                              │
       │    │ • Sync state │     │                              │
       │    └──────┬───────┘     │                              │
       │           │             │                              │
       │           ▼             │                              │
       │    ┌──────────────────────────────────────────────┐    │
       │    │                 ILLUMINATE                    │    │
       │    │                                               │    │
       │    │  • Execute primary work (coding, gaming, etc) │    │
       │    │  • Monitor health and activity                │    │
       │    │  • Periodic state sync to persistent storage  │    │
       │    │  • Idle detection running in background       │    │
       │    │                                               │    │
       │    └──────────────────────┬───────────────────────┘    │
       │                           │                            │
       │                           ▼                            │
       │    ┌──────────────┐  ┌──────────────┐                  │
       │    │    FADE      │  │   TIMEOUT    │                  │
       │    │  (graceful)  │  │  (idle or    │                  │
       │    │              │  │   max time)  │                  │
       │    │ • Final sync │  └──────┬───────┘                  │
       │    │ • Cleanup    │         │                          │
       │    │ • Terminate  │◄────────┘                          │
       │    └──────┬───────┘                                    │
       │           │                                            │
       │           ▼                                            │
       └───────────────────────────────────────────────────────►│
                                                          Back to dormant
```

---

## Why Firefly?

### The Problem

Traditional server hosting presents a dilemma:

| Approach | Cost | Availability | Waste |
|----------|------|--------------|-------|
| **Always-on VPS** | $5-50/mo | Instant | 95%+ idle time |
| **Serverless** | Per-request | Instant | Low, but limited capabilities |
| **Manual spin-up** | Minimal | Minutes of delay | None, but friction-heavy |

For workloads like AI coding agents or gaming servers, you need full VM capabilities (not serverless) but can't justify 24/7 costs for occasional use.

### The Solution

Firefly provides:
- **Near-zero idle cost** — Pay only when actively used
- **Sub-minute availability** — Modern cloud APIs provision in 30-60 seconds
- **Full VM capabilities** — Run anything you'd run on a VPS
- **Automatic cleanup** — No orphaned resources, no forgotten bills

---

## Core Components

### 1. Trigger System

The mechanism that detects demand and initiates the Ignite phase.

```typescript
interface FireflyTrigger {
  type: 'webhook' | 'schedule' | 'queue' | 'manual';
  source: string;           // Where the trigger originated
  metadata: Record<string, unknown>;  // Trigger-specific data
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;         // Max session duration (ms)
}
```

**Trigger Types:**

| Type | Example | Use Case |
|------|---------|----------|
| **Webhook** | GitHub push event | Bloom: code task received |
| **Queue** | Message in task queue | Bloom: async job processing |
| **Manual** | User clicks "Start" | Outpost: player requests server |
| **Schedule** | Cron expression | Pre-warming for expected demand |

### 2. Server Provisioner

The component that spins up infrastructure on demand.

```typescript
interface ServerProvisioner {
  // Create a new server instance
  provision(config: ServerConfig): Promise<ServerInstance>;

  // Check if server is ready
  waitForReady(instance: ServerInstance, timeout: number): Promise<boolean>;

  // Terminate a server
  terminate(instance: ServerInstance): Promise<void>;

  // List active instances
  listActive(): Promise<ServerInstance[]>;
}

interface ServerConfig {
  provider: 'hetzner' | 'digitalocean' | 'aws' | 'vultr';
  size: string;             // e.g., 'cx22', 's-1vcpu-1gb'
  region: string;           // e.g., 'fsn1', 'nyc1'
  image: string;            // OS image or snapshot
  userData?: string;        // Cloud-init script
  sshKeys?: string[];       // SSH key IDs
  tags?: string[];          // For organization and cleanup
  maxLifetime?: number;     // Hard cap on session duration (ms)
}

interface ServerInstance {
  id: string;
  provider: string;
  publicIp: string;
  privateIp?: string;
  status: 'provisioning' | 'ready' | 'running' | 'terminating' | 'terminated';
  createdAt: number;
  metadata: Record<string, unknown>;
}
```

### 3. State Synchronizer

The component that persists work to durable storage.

```typescript
interface StateSynchronizer {
  // Pull state from storage to server
  hydrate(instance: ServerInstance, stateKey: string): Promise<void>;

  // Push state from server to storage
  persist(instance: ServerInstance, stateKey: string): Promise<void>;

  // Check for state conflicts
  checkConflicts(stateKey: string): Promise<ConflictResult>;
}

interface ConflictResult {
  hasConflict: boolean;
  localVersion?: string;
  remoteVersion?: string;
  resolution?: 'use_local' | 'use_remote' | 'manual';
}
```

### 4. Idle Detector

The component that determines when to initiate the Fade phase.

```typescript
interface IdleDetector {
  // Start monitoring for idle state
  startMonitoring(instance: ServerInstance, config: IdleConfig): void;

  // Manually report activity (resets idle timer)
  reportActivity(instance: ServerInstance): void;

  // Check current idle duration
  getIdleDuration(instance: ServerInstance): number;

  // Event emitter for idle threshold reached
  onIdleThreshold(callback: (instance: ServerInstance) => void): void;
}

interface IdleConfig {
  checkInterval: number;    // How often to check (ms)
  idleThreshold: number;    // How long before considered idle (ms)
  activitySignals: ActivitySignal[];  // What counts as activity
}

type ActivitySignal =
  | 'ssh_session_active'
  | 'process_cpu_above_threshold'
  | 'network_traffic'
  | 'player_connected'      // Outpost
  | 'agent_task_running';   // Bloom
```

---

## Implementation: Bloom

Bloom uses Firefly for ephemeral AI coding agents.

### Bloom-Specific Configuration

```typescript
const bloomFireflyConfig: FireflyConfig = {
  trigger: {
    type: 'queue',
    source: 'bloom-task-queue',
  },

  provisioner: {
    provider: 'hetzner',
    size: 'cx22',           // 2 vCPU, 4GB RAM
    region: 'fsn1',         // Falkenstein, Germany
    image: 'bloom-agent-v1', // Pre-configured with Claude CLI
    maxLifetime: 4 * 60 * 60 * 1000,  // 4 hours max
  },

  stateSync: {
    storage: 'r2',           // Cloudflare R2
    bucket: 'bloom-workspaces',
    syncOnActivity: true,    // Sync after each task completion
    syncInterval: 5 * 60 * 1000,  // Also sync every 5 minutes
  },

  idle: {
    threshold: 15 * 60 * 1000,  // 15 minutes idle
    signals: ['agent_task_running', 'ssh_session_active'],
    warningAt: 10 * 60 * 1000,  // Warn user at 10 minutes
  },
};
```

### Bloom Lifecycle Example

```
1. User sends task via Mycelium MCP: "Add dark mode to the app"
2. Task enters bloom-task-queue
3. Firefly TRIGGER: Queue message received
   └── Check: Any idle Bloom instance? (reuse if available)
   └── No → Proceed to IGNITE

4. Firefly IGNITE:
   └── Provision cx22 in fsn1 (~45 seconds)
   └── Run cloud-init: install dependencies, configure Claude CLI
   └── STATE SYNC: Pull latest code from R2 (bloom-workspaces/user-123/project-abc)
   └── Server ready, notify user

5. Firefly ILLUMINATE:
   └── Claude agent begins work
   └── Periodic state sync every 5 minutes
   └── Agent completes task, pushes final commit
   └── Task marked complete

6. User doesn't send new task for 15 minutes

7. Firefly FADE:
   └── Idle threshold reached
   └── Final state sync to R2
   └── Cleanup: remove sensitive data
   └── Terminate instance
   └── Log session to D1 for billing/analytics
```

---

## Implementation: Outpost

Outpost uses Firefly for on-demand Minecraft servers.

### Outpost-Specific Configuration

```typescript
const outpostFireflyConfig: FireflyConfig = {
  trigger: {
    type: 'manual',
    source: 'outpost-dashboard',
    // Also supports: webhook from Discord bot
  },

  provisioner: {
    provider: 'hetzner',
    size: 'cx32',            // 4 vCPU, 8GB RAM (Minecraft needs more)
    region: 'ash',           // Ashburn for US players
    image: 'outpost-mc-v2',  // Pre-configured with Paper, plugins
    maxLifetime: 12 * 60 * 60 * 1000,  // 12 hours max
  },

  stateSync: {
    storage: 'r2',
    bucket: 'outpost-worlds',
    syncOnActivity: false,   // Sync only on shutdown (world files are large)
    syncInterval: 30 * 60 * 1000,  // Backup every 30 minutes
  },

  idle: {
    threshold: 30 * 60 * 1000,  // 30 minutes with no players
    signals: ['player_connected'],
    warningAt: 25 * 60 * 1000,  // Discord notification at 25 minutes
  },
};
```

### Outpost Lifecycle Example

```
1. Friend clicks "Start Server" on mc.grove.place
2. Firefly TRIGGER: Manual request received

3. Firefly IGNITE:
   └── Provision cx32 in ash (~50 seconds)
   └── Run cloud-init: start Minecraft, configure whitelist
   └── STATE SYNC: Pull world save from R2 (outpost-worlds/grove-friends)
   └── Server ready, show IP address

4. Firefly ILLUMINATE:
   └── Friends join and play
   └── Periodic world backup every 30 minutes
   └── Players chat, build, explore

5. Last player disconnects

6. Firefly IDLE DETECTION:
   └── 25 minutes: Discord message "Server shutting down in 5 minutes"
   └── 30 minutes: No one rejoined

7. Firefly FADE:
   └── Save world state
   └── STATE SYNC: Push world to R2
   └── Terminate instance
   └── Discord message: "Server stopped. Start again anytime!"
```

---

## Cost Analysis

### Bloom (AI Coding)

| Scenario | Traditional VPS | Firefly |
|----------|-----------------|---------|
| 4 hours/day coding | $5/mo (always on) | ~$0.50/mo |
| 20 hours/week heavy use | $5/mo | ~$2/mo |
| Occasional weekend projects | $5/mo | ~$0.20/mo |

**Calculation:** Hetzner cx22 = €0.0076/hr ≈ $0.008/hr

### Outpost (Gaming)

| Scenario | Traditional VPS | Firefly |
|----------|-----------------|---------|
| Weekend sessions (8hr/week) | $10/mo | ~$1.50/mo |
| Occasional gaming (4hr/week) | $10/mo | ~$0.75/mo |
| One-off game night | $10/mo | ~$0.10 |

**Calculation:** Hetzner cx32 = €0.0152/hr ≈ $0.016/hr

### Break-Even Analysis

Firefly is more cost-effective when usage is below:
- **cx22 (Bloom):** ~650 hours/month (27 hours/day — always use Firefly)
- **cx32 (Outpost):** ~650 hours/month (27 hours/day — always use Firefly)

For nearly all use cases, Firefly wins dramatically.

---

## Technical Considerations

### Cold Start Optimization

Minimize time from trigger to ready:

1. **Pre-baked images** — Include all dependencies in the snapshot
2. **Region proximity** — Deploy near expected users
3. **Parallel initialization** — Start server and sync state concurrently
4. **Connection pooling** — Pre-warm SSH connections

### State Conflict Resolution

When multiple sessions might modify the same state:

```typescript
interface ConflictStrategy {
  // Bloom: Last-write-wins with version history
  bloom: 'lww_with_history';

  // Outpost: Single-server lock (only one instance per world)
  outpost: 'exclusive_lock';
}

// Bloom implementation
async function handleBloomConflict(conflict: ConflictResult): Promise<void> {
  // Store both versions
  await storeVersion(conflict.localVersion, 'local');
  await storeVersion(conflict.remoteVersion, 'remote');

  // Use local (more recent work), but preserve history
  await persist(conflict.localVersion);

  // Notify user of potential conflict
  await notifyUser('State conflict resolved. Check history if needed.');
}

// Outpost implementation
async function acquireWorldLock(worldId: string): Promise<boolean> {
  const lock = await kv.get(`world-lock:${worldId}`);
  if (lock && Date.now() - lock.timestamp < 60000) {
    return false; // Another server has the lock
  }

  await kv.put(`world-lock:${worldId}`, {
    timestamp: Date.now(),
    instanceId: currentInstance.id,
  });
  return true;
}
```

### Graceful Shutdown

Ensure clean termination:

```typescript
async function gracefulFade(instance: ServerInstance): Promise<void> {
  // 1. Stop accepting new work
  await instance.exec('systemctl stop bloom-agent || true');
  await instance.exec('minecraft-server stop || true');

  // 2. Wait for in-progress work to complete (with timeout)
  await waitForQuiet(instance, 60000);

  // 3. Final state sync
  await stateSynchronizer.persist(instance, getStateKey(instance));

  // 4. Cleanup sensitive data
  await instance.exec('shred -u /root/.claude-credentials || true');

  // 5. Terminate
  await provisioner.terminate(instance);

  // 6. Log session
  await logSession(instance);
}
```

### Security

- **Ephemeral credentials** — Generate per-session, revoke on fade
- **Network isolation** — Firewall rules limit exposure
- **No persistent secrets** — Inject at ignite, destroy at fade
- **Audit logging** — Track all sessions for accountability

---

## Monitoring and Observability

### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `firefly.ignite.duration` | Time to provision and ready | > 120s |
| `firefly.session.duration` | Total session time | > maxLifetime |
| `firefly.idle.duration` | Time in idle state | Informational |
| `firefly.sync.failures` | State sync errors | > 0 |
| `firefly.orphaned.instances` | Running but untracked | > 0 |
| `firefly.cost.daily` | Daily infrastructure cost | > budget |

### Orphan Detection

Prevent runaway costs from forgotten instances:

```typescript
async function orphanSweep(): Promise<void> {
  const cloudInstances = await provisioner.listActive();
  const trackedInstances = await db.getActiveFireflySessions();

  for (const cloud of cloudInstances) {
    const tracked = trackedInstances.find(t => t.id === cloud.id);

    if (!tracked) {
      console.warn(`Orphaned instance detected: ${cloud.id}`);
      await provisioner.terminate(cloud);
      await alertOps('Orphaned instance terminated', cloud);
    }

    if (tracked && Date.now() - tracked.createdAt > tracked.maxLifetime) {
      console.warn(`Instance exceeded max lifetime: ${cloud.id}`);
      await gracefulFade(cloud);
    }
  }
}

// Run every 5 minutes
schedule('*/5 * * * *', orphanSweep);
```

---

## Integration with Grove Ecosystem

### Mycelium (MCP)

Firefly exposes controls through Mycelium:

```typescript
// MCP tools for Firefly control
const fireflyTools = {
  'firefly.ignite': {
    description: 'Start a Bloom coding session',
    parameters: { project: 'string', task: 'string' },
  },
  'firefly.status': {
    description: 'Check if a Firefly session is active',
    parameters: { sessionId: 'string' },
  },
  'firefly.fade': {
    description: 'Gracefully end a Firefly session',
    parameters: { sessionId: 'string' },
  },
};
```

### Amber (Storage)

State sync uses Amber/R2 for persistence:

```
amber.grove.place/
├── bloom-workspaces/
│   ├── user-123/
│   │   ├── project-abc/
│   │   │   ├── latest.tar.gz      # Current state
│   │   │   └── history/           # Version history
│   │   └── project-def/
│   └── user-456/
└── outpost-worlds/
    ├── grove-friends/
    │   ├── world.tar.gz           # Current world
    │   └── backups/               # Periodic backups
    └── grove-creative/
```

### Vista (Monitoring)

Firefly reports metrics to Vista:

```typescript
await vista.record({
  metric: 'firefly.session.completed',
  tags: {
    product: 'bloom',
    provider: 'hetzner',
    region: 'fsn1',
    size: 'cx22',
  },
  fields: {
    duration: sessionDurationMs,
    cost: calculateCost(sessionDurationMs, 'cx22'),
    syncCount: stateSyncCount,
    idleDuration: totalIdleMs,
  },
});
```

---

## Implementation Checklist

### Shared Infrastructure
- [ ] Create `packages/firefly/` shared library
- [ ] Implement generic `ServerProvisioner` interface
- [ ] Implement `StateSynchronizer` with R2 backend
- [ ] Implement `IdleDetector` with configurable signals
- [ ] Add orphan detection cron job
- [ ] Integrate with Vista for metrics

### Bloom Integration
- [ ] Create Bloom-specific Firefly configuration
- [ ] Build Bloom agent image (Hetzner snapshot)
- [ ] Implement task queue trigger
- [ ] Add workspace sync to R2
- [ ] Integrate with Mycelium MCP tools

### Outpost Integration
- [ ] Create Outpost-specific Firefly configuration
- [ ] Build Minecraft server image (Hetzner snapshot)
- [ ] Implement manual start trigger (dashboard)
- [ ] Implement Discord bot trigger
- [ ] Add world save sync to R2
- [ ] Build player presence detection

---

## Future Considerations

- **Multi-cloud** — Support for AWS, GCP, DigitalOcean for redundancy/latency
- **Warm pools** — Pre-provision instances during expected demand windows
- **Spot instances** — Use spot/preemptible for even lower costs (with graceful preemption handling)
- **Container-based** — Fly.io/Railway for faster cold starts (sub-10s)
- **Edge coordination** — Use Cloudflare Workers to route to nearest Firefly region
- **Session handoff** — Transfer active sessions between instances for maintenance

---

*Pattern created: January 2026*
*For use by: Bloom, Outpost, future ephemeral infrastructure*
