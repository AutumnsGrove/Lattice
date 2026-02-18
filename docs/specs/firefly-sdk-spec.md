---
aliases: []
date created: Tuesday, February 17th 2026
date modified: Tuesday, February 17th 2026
tags:
  - infrastructure
  - ephemeral-compute
  - sdk
  - cloudflare-workers
type: tech-spec
lastUpdated: "2026-02-18"
---

# Firefly SDK: Ephemeral Server Provisioning

```

                              ·  ✨  ·
                         ·         ·         ·
                    ·       ╭───────────╮         ·
               ·            │  DORMANT  │            ·
                            ╰─────┬─────╯
                     trigger      │
                                  ▼
                            ╭───────────╮
                            │  IGNITE   │
                            ╰─────┬─────╯
                         provision│configure│sync
                                  ▼
                      ╭─────────────────────────╮
                      │       ILLUMINATE        │
                      │   work · monitor · sync │
                      ╰───────────┬─────────────╯
                          idle or │ complete
                                  ▼
                            ╭───────────╮
                            │   FADE    │
                            ╰─────┬─────╯
                           sync│clean│terminate
                                  ▼
                            ╭───────────╮
                            │  DORMANT  │
               ·            ╰───────────╯            ·
                    ·                            ·
                         ·    ·    ·    ·    ·
                    ╱────────────────────────────╲
                   ╱   hetzner  fly  railway  do  ╲
                  ╱────────────────────────────────╲

              A brief light in the darkness. Any cloud.
```

> _A brief light in the darkness. It appears, does its work, and fades away._

The Firefly SDK is a TypeScript library for provisioning ephemeral servers across any cloud provider. It implements the three-phase lifecycle (ignite, illuminate, fade) as composable building blocks that any Grove consumer can import and configure.

**Public Name:** Firefly SDK
**Internal Name:** GroveFirefly
**Package:** `@autumnsgrove/lattice/firefly`
**Pattern Reference:** [[firefly-pattern|Firefly: Ephemeral Server Pattern]]
**Consumers:** Queen (CI), Bloom, Outpost, Journey, Verge

Fireflies blink into existence at dusk. Brief, purposeful flashes. They don't stay lit. They appear when conditions call for them, do what they need to do, and vanish. The Firefly SDK gives every Grove service that same pattern: provision compute on demand, execute work, tear down when finished. The provider underneath is interchangeable. The lifecycle stays the same.

---

## Overview

The SDK is an import, not a service. There's no Durable Object here, no Worker endpoint. Consumers pull in the interfaces and wire them to their own coordination layer. The Queen DO uses the SDK to manage CI runner pools. Verge uses it for autonomous coding agents. Outpost uses it for Minecraft servers. Each consumer configures its own trigger, provider, sync strategy, and idle rules.

```typescript
import { Firefly, HetznerProvider } from "@autumnsgrove/lattice/firefly";

const firefly = new Firefly({
	provider: new HetznerProvider({ token: env.HETZNER_TOKEN }),
	sync: new R2StateSynchronizer({ bucket: env.R2_BUCKET }),
	idle: { threshold: 15 * 60_000, signals: ["agent_task_running"] },
});

// Ignite
const instance = await firefly.ignite({
	size: "cx22",
	region: "fsn1",
	image: "bloom-agent-v1",
});

// ... work happens ...

// Fade
await firefly.fade(instance);
```

The SDK handles:

- Provider abstraction (provision, wait, terminate, list)
- State synchronization (hydrate from R2, persist to R2)
- Idle detection (configurable signals and thresholds)
- Orphan sweeping (find and terminate untracked instances)
- Metrics reporting (Vista integration points)

---

## The Three-Phase Lifecycle

Every Firefly server follows this path. No exceptions.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FIREFLY LIFECYCLE                               │
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
       │    │                 ILLUMINATE                   │    │
       │    │                                              │    │
       │    │  • Execute primary work (coding, gaming, CI) │    │
       │    │  • Monitor health and activity               │    │
       │    │  • Periodic state sync to persistent storage │    │
       │    │  • Idle detection running in background      │    │
       │    │                                              │    │
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

**Phase 1: Ignite.** A trigger fires. The SDK calls the configured provider's `provision()` method, waits for the server to respond, then runs state hydration from R2. The server is ready.

**Phase 2: Illuminate.** The consumer's workload runs. The SDK monitors for activity signals and runs periodic state syncs in the background. This phase can last minutes (CI job) or hours (gaming session).

**Phase 3: Fade.** Triggered by idle detection, max lifetime, or explicit request. The SDK runs a final state sync, cleans up sensitive data, calls the provider's `terminate()` method, and logs the session.

---

## Core Interfaces

### FireflyTrigger

What initiates the lifecycle. Consumers define their own trigger logic; the SDK provides the type.

```typescript
interface FireflyTrigger {
	type: "webhook" | "schedule" | "queue" | "manual";
	source: string; // Where the trigger originated
	metadata: Record<string, unknown>; // Trigger-specific data
	priority?: "low" | "normal" | "high";
	timeout?: number; // Max session duration (ms)
}
```

| Type         | Example               | Consumer |
| ------------ | --------------------- | -------- |
| **Webhook**  | Codeberg push event   | Queen CI |
| **Queue**    | Message in task queue | Bloom    |
| **Manual**   | Player clicks "Start" | Outpost  |
| **Schedule** | Cron for warm pool    | Queen CI |

### FireflyProvider

The abstraction layer over cloud APIs. Each provider implements this interface.

```typescript
interface FireflyProvider {
	/** The provider identifier. */
	readonly name: "hetzner" | "fly" | "railway" | "digitalocean";

	/** Create a new server instance. */
	provision(config: ServerConfig): Promise<ServerInstance>;

	/** Wait for a provisioned server to become ready. */
	waitForReady(instance: ServerInstance, timeoutMs: number): Promise<boolean>;

	/** Terminate a server and release all resources. */
	terminate(instance: ServerInstance): Promise<void>;

	/** List all active instances managed by this provider. */
	listActive(tags?: string[]): Promise<ServerInstance[]>;
}
```

Previous specs called this `ServerProvisioner`. The rename to `FireflyProvider` makes the relationship to the SDK clearer and avoids confusion with Cloudflare's "provisioner" terminology.

### ServerConfig

What to provision. Provider-agnostic fields plus a `providerOptions` escape hatch for provider-specific tuning.

```typescript
interface ServerConfig {
	provider: "hetzner" | "fly" | "railway" | "digitalocean";
	size: string; // e.g., 'cx22', 'shared-cpu-1x'
	region: string; // e.g., 'fsn1', 'iad'
	image: string; // OS image, snapshot, or container
	userData?: string; // Cloud-init or startup script
	sshKeys?: string[]; // SSH key IDs or fingerprints
	tags?: string[]; // For organization and orphan cleanup
	maxLifetime?: number; // Hard cap on session duration (ms)
	providerOptions?: Record<string, unknown>; // Provider-specific config
}
```

### ServerInstance

The running server. Provider-agnostic representation.

```typescript
interface ServerInstance {
	id: string; // SDK-assigned UUID
	providerServerId: string; // Provider's native ID (Hetzner server ID, Fly machine ID)
	provider: string; // Which provider created this
	publicIp: string;
	privateIp?: string;
	status: "provisioning" | "ready" | "running" | "terminating" | "terminated";
	createdAt: number; // Unix ms
	metadata: Record<string, unknown>;
}
```

Note: previous specs used `hetznerId: number`. The new `providerServerId: string` field works across all providers. Hetzner IDs are numeric strings, Fly machine IDs are alphanumeric, Railway and DigitalOcean use their own formats.

### FireflyConfig

Top-level configuration object tying the pieces together.

```typescript
interface FireflyConfig {
	provider: FireflyProvider;
	sync?: StateSyncConfig;
	idle?: IdleConfig;
	maxLifetime?: number; // Default max session (ms), overridable per-ignite
	tags?: string[]; // Default tags applied to all instances
	onIgnite?: (instance: ServerInstance) => Promise<void>;
	onFade?: (instance: ServerInstance) => Promise<void>;
	onOrphanFound?: (instance: ServerInstance) => Promise<void>;
}

interface StateSyncConfig {
	synchronizer: StateSynchronizer;
	syncOnActivity?: boolean; // Sync after each activity report
	syncInterval?: number; // Periodic sync interval (ms)
}
```

### StateSynchronizer

Handles persisting server state to durable storage and restoring it on next ignite.

```typescript
interface StateSynchronizer {
	/** Pull state from storage to server. */
	hydrate(instance: ServerInstance, stateKey: string): Promise<void>;

	/** Push state from server to storage. */
	persist(instance: ServerInstance, stateKey: string): Promise<void>;

	/** Check for state conflicts before hydration. */
	checkConflicts(stateKey: string): Promise<ConflictResult>;
}

interface ConflictResult {
	hasConflict: boolean;
	localVersion?: string;
	remoteVersion?: string;
	resolution?: "use_local" | "use_remote" | "manual";
}
```

### IdleDetector

Determines when to initiate the Fade phase.

```typescript
interface IdleDetector {
	/** Start monitoring for idle state. */
	startMonitoring(instance: ServerInstance, config: IdleConfig): void;

	/** Manually report activity (resets idle timer). */
	reportActivity(instance: ServerInstance): void;

	/** Check current idle duration. */
	getIdleDuration(instance: ServerInstance): number;

	/** Register callback for idle threshold reached. */
	onIdleThreshold(callback: (instance: ServerInstance) => void): void;
}

interface IdleConfig {
	checkInterval: number; // How often to check (ms)
	idleThreshold: number; // How long before considered idle (ms)
	activitySignals: ActivitySignal[];
	warningAt?: number; // Warn before fade (ms before threshold)
}

type ActivitySignal =
	| "ssh_session_active"
	| "process_cpu_above_threshold"
	| "network_traffic"
	| "player_connected" // Outpost
	| "agent_task_running" // Bloom, Verge
	| "ci_job_running"; // Queen CI
```

---

## Provider Catalog

The SDK ships with a Hetzner provider. Additional providers have defined interfaces for future implementation.

| Provider         | Cold Start | US Regions               | EU Regions         | Approx. Cost/hr        | Strengths                         |
| ---------------- | ---------- | ------------------------ | ------------------ | ---------------------- | --------------------------------- |
| **Hetzner**      | 30-60s     | ash (Ashburn)            | fsn1, nbg1, hel1   | ~$0.008 (cx22)         | Cheapest bare metal VPS           |
| **Fly.io**       | ~5s        | 10+ (iad, ord, sjc, ...) | ams, cdg, lhr, ... | ~$0.02 (shared-cpu-1x) | Fast cold start, container-native |
| **Railway**      | ~10s       | us-west1                 | eu-west1           | ~$0.015                | Simplest deploy model             |
| **DigitalOcean** | 45-90s     | nyc1, nyc3, sfo3         | ams3, fra1         | ~$0.01 (s-1vcpu-1gb)   | Familiar API, good docs           |

### Provider Selection Guide

**Choose Hetzner when:** Cost is the priority. EU latency is acceptable. Full VM access is needed.

**Choose Fly.io when:** Cold start speed matters most. US regions with good coverage are needed. Container-based workloads.

**Choose Railway when:** Simplicity is the priority. Deploy-from-Docker with zero ops overhead.

**Choose DigitalOcean when:** US and EU coverage both matter. Team is already familiar with DO's API.

### Provider Configuration Examples

Every provider follows the same interface. Swapping providers requires changing only the provider instantiation.

**Hetzner (current default):**

```typescript
import { HetznerProvider } from "@autumnsgrove/lattice/firefly";

const provider = new HetznerProvider({
	token: env.HETZNER_TOKEN,
	defaultRegion: "fsn1",
	defaultSize: "cx22",
	sshKeyIds: ["grove-firefly"],
});
```

**Fly.io (future):**

```typescript
import { FlyProvider } from "@autumnsgrove/lattice/firefly";

const provider = new FlyProvider({
	token: env.FLY_TOKEN,
	org: "autumnsgrove",
	defaultRegion: "iad",
	defaultSize: "shared-cpu-1x",
});
```

**DigitalOcean (future):**

```typescript
import { DigitalOceanProvider } from "@autumnsgrove/lattice/firefly";

const provider = new DigitalOceanProvider({
	token: env.DO_TOKEN,
	defaultRegion: "nyc1",
	defaultSize: "s-1vcpu-1gb",
	sshKeyFingerprints: ["grove-firefly"],
});
```

The consumer code that calls `firefly.ignite()` and `firefly.fade()` stays identical regardless of which provider is wired in.

---

## Consumer Gallery

Each Grove service configures Firefly for its specific workload. The trigger, provider settings, sync strategy, and idle rules all vary. The lifecycle stays the same.

### Queen CI

CI runners for Codeberg webhooks. Managed by the Queen Durable Object.

```typescript
const queenCiConfig: FireflyConfig = {
	provider: new HetznerProvider({ token: env.HETZNER_TOKEN }),
	sync: {
		synchronizer: new R2StateSynchronizer({ bucket: env.CI_CACHE_BUCKET }),
		syncOnActivity: false, // No incremental sync for CI
	},
	idle: {
		checkInterval: 30_000,
		idleThreshold: 5 * 60_000, // 5 min idle = fade
		activitySignals: ["ci_job_running"],
	},
	maxLifetime: 30 * 60_000, // 30 min hard cap per runner
	tags: ["queen-ci", "ephemeral"],
};
```

See [[queen-firefly-coordinator-spec|Queen Firefly Coordinator Spec]] for the full coordination layer.

### Bloom (AI Coding)

Ephemeral coding agents triggered by task queue messages.

```typescript
const bloomConfig: FireflyConfig = {
	provider: new HetznerProvider({ token: env.HETZNER_TOKEN }),
	sync: {
		synchronizer: new R2StateSynchronizer({ bucket: env.BLOOM_WORKSPACES }),
		syncOnActivity: true,
		syncInterval: 5 * 60_000, // Sync every 5 minutes
	},
	idle: {
		checkInterval: 60_000,
		idleThreshold: 15 * 60_000, // 15 min idle
		activitySignals: ["agent_task_running", "ssh_session_active"],
		warningAt: 10 * 60_000,
	},
	maxLifetime: 4 * 60 * 60_000, // 4 hour hard cap
	tags: ["bloom", "coding-agent"],
};
```

**Bloom lifecycle:** User sends task via Mycelium MCP. Task enters queue. Firefly ignites a cx22. Agent works. Periodic sync every 5 minutes. Agent finishes, pushes commit. 15 minutes idle. Fade. Session logged.

### Outpost (Gaming)

On-demand Minecraft servers for friends.

```typescript
const outpostConfig: FireflyConfig = {
	provider: new HetznerProvider({ token: env.HETZNER_TOKEN }),
	sync: {
		synchronizer: new R2StateSynchronizer({ bucket: env.OUTPOST_WORLDS }),
		syncOnActivity: false,
		syncInterval: 30 * 60_000, // World backup every 30 min
	},
	idle: {
		checkInterval: 60_000,
		idleThreshold: 30 * 60_000, // 30 min with no players
		activitySignals: ["player_connected"],
		warningAt: 25 * 60_000, // Discord warning at 25 min
	},
	maxLifetime: 12 * 60 * 60_000, // 12 hour hard cap
	tags: ["outpost", "minecraft"],
};
```

**Outpost lifecycle:** Friend clicks "Start Server." Firefly ignites a cx32 in Ashburn. World state hydrates from R2. Friends play. Last player leaves. 25 min: Discord warning. 30 min: world saves, server fades.

### Journey (Content Processing)

Batch content processing for migration and transformation tasks.

```typescript
const journeyConfig: FireflyConfig = {
	provider: new FlyProvider({ token: env.FLY_TOKEN, org: "autumnsgrove" }),
	sync: {
		synchronizer: new R2StateSynchronizer({ bucket: env.JOURNEY_WORKDIR }),
		syncOnActivity: true,
	},
	idle: {
		checkInterval: 30_000,
		idleThreshold: 2 * 60_000, // 2 min idle = done processing
		activitySignals: ["process_cpu_above_threshold"],
	},
	maxLifetime: 60 * 60_000, // 1 hour hard cap
	tags: ["journey", "batch-processing"],
};
```

### Verge (Remote Coding)

Autonomous coding agents with full VPS access. See [[verge-spec|Verge Spec]] for the complete system design.

---

## State Synchronization

State sync uses Cloudflare R2 as the durable store. Each consumer organizes its own key hierarchy.

### R2 Key Hierarchy

```
amber.grove.place/
├── bloom-workspaces/
│   ├── user-123/
│   │   ├── project-abc/
│   │   │   ├── latest.tar.gz      # Current workspace state
│   │   │   └── history/           # Version history
│   │   └── project-def/
│   └── user-456/
├── outpost-worlds/
│   ├── grove-friends/
│   │   ├── world.tar.gz           # Current world save
│   │   └── backups/               # Periodic backups
│   └── grove-creative/
├── queen-ci-cache/
│   ├── node-modules/              # Shared dependency cache
│   └── build-cache/               # Build artifact cache
└── journey-workdir/
    └── batch-123/
```

### Conflict Strategies

Different consumers need different conflict resolution approaches.

```typescript
interface ConflictStrategy {
	// Bloom: Last-write-wins with version history
	bloom: "lww_with_history";

	// Outpost: Single-server lock (only one instance per world)
	outpost: "exclusive_lock";

	// Queen CI: No conflict possible (each job is independent)
	queen: "none";

	// Journey: Append-only processing log
	journey: "append_only";
}
```

**Bloom conflict handling:** Store both versions. Use the local (more recent work) as canonical. Preserve the remote version in history. Notify the user of the potential conflict.

**Outpost world locking:** Only one server per world at a time. Before igniting, check for an active lock in KV. If locked, reject the request and show who's playing.

```typescript
async function acquireWorldLock(worldId: string): Promise<boolean> {
	const lock = await kv.get(`world-lock:${worldId}`);
	if (lock && Date.now() - lock.timestamp < 60_000) {
		return false; // Another server has the lock
	}

	await kv.put(`world-lock:${worldId}`, {
		timestamp: Date.now(),
		instanceId: currentInstance.id,
	});
	return true;
}
```

---

## Orphan Detection

Orphaned instances are running servers with no corresponding tracker entry. Cloud API glitches, crashed coordinators, or failed fade sequences can all leave orphans behind. They cost money every hour they run unnoticed.

```typescript
async function orphanSweep(
	provider: FireflyProvider,
	trackedInstances: ServerInstance[],
): Promise<void> {
	const cloudInstances = await provider.listActive();
	const trackedIds = new Set(trackedInstances.map((t) => t.providerServerId));

	for (const cloud of cloudInstances) {
		if (!trackedIds.has(cloud.providerServerId)) {
			console.warn(`Orphaned instance detected: ${cloud.providerServerId}`);
			await provider.terminate(cloud);
			// Alert ops via Vista
		}

		// Also check max lifetime enforcement
		const tracked = trackedInstances.find((t) => t.providerServerId === cloud.providerServerId);
		if (tracked?.maxLifetime && Date.now() - tracked.createdAt > tracked.maxLifetime) {
			console.warn(`Instance exceeded max lifetime: ${cloud.providerServerId}`);
			// Trigger graceful fade
		}
	}
}
```

The Queen runs orphan sweeps on its alarm cycle. Standalone consumers should schedule their own sweeps (every 5 minutes is a good default).

---

## Graceful Shutdown

The fade sequence follows a strict order. Skipping steps risks data loss or orphaned resources.

```typescript
async function gracefulFade(
	instance: ServerInstance,
	provider: FireflyProvider,
	sync?: StateSynchronizer,
): Promise<void> {
	// 1. Stop accepting new work
	await instance.exec("systemctl stop workload || true");

	// 2. Wait for in-progress work (with timeout)
	await waitForQuiet(instance, 60_000);

	// 3. Final state sync
	if (sync) {
		await sync.persist(instance, getStateKey(instance));
	}

	// 4. Cleanup sensitive data
	await instance.exec("shred -u /root/.credentials || true");

	// 5. Terminate via provider
	await provider.terminate(instance);

	// 6. Log session for billing and analytics
	await logSession(instance);
}
```

---

## Security

**Ephemeral credentials.** Generate per-session API tokens. Inject at ignite via cloud-init or SSH. Revoke on fade. Never store long-lived credentials on instances.

**Network isolation.** Firewall rules restrict inbound access to only the ports each workload needs. SSH access gated behind known keys.

**Provider credentials.** Stored as Worker environment bindings (Cloudflare Secrets). The SDK reads them from the `env` object passed by the consumer. Never hardcoded. Never logged.

**Audit trail.** Every ignite, fade, and orphan termination gets logged to D1 with timestamps, provider IDs, consumer tags, and session duration. Costs are calculated and stored per-session.

---

## Monitoring

Firefly reports metrics through Vista integration points. Each consumer wires these to their preferred observability pipeline.

| Metric                       | Description                           | Alert Threshold    |
| ---------------------------- | ------------------------------------- | ------------------ |
| `firefly.ignite.duration`    | Time from trigger to server ready     | > 120s             |
| `firefly.session.duration`   | Total session time                    | > maxLifetime      |
| `firefly.idle.duration`      | Cumulative idle time in session       | Informational      |
| `firefly.sync.failures`      | State sync error count                | > 0                |
| `firefly.orphaned.instances` | Running but untracked instances       | > 0                |
| `firefly.cost.daily`         | Daily infrastructure spend            | > budget threshold |
| `firefly.fade.duration`      | Time from fade trigger to termination | > 60s              |

```typescript
await vista.record({
	metric: "firefly.session.completed",
	tags: {
		consumer: "bloom",
		provider: "hetzner",
		region: "fsn1",
		size: "cx22",
	},
	fields: {
		duration: sessionDurationMs,
		cost: calculateCost(sessionDurationMs, "cx22"),
		syncCount: stateSyncCount,
		idleDuration: totalIdleMs,
	},
});
```

---

## Cost Analysis

### Per-Provider Pricing

| Provider                 | Size   | vCPU | RAM    | Hourly Cost | Monthly (always-on) |
| ------------------------ | ------ | ---- | ------ | ----------- | ------------------- |
| Hetzner cx22             | Small  | 2    | 4 GB   | ~$0.008     | ~$5.50              |
| Hetzner cx32             | Medium | 4    | 8 GB   | ~$0.016     | ~$11.50             |
| Fly shared-cpu-1x        | Small  | 1    | 256 MB | ~$0.02      | ~$14.40             |
| Fly shared-cpu-2x        | Medium | 2    | 512 MB | ~$0.04      | ~$28.80             |
| DigitalOcean s-1vcpu-1gb | Small  | 1    | 1 GB   | ~$0.01      | ~$7.00              |
| DigitalOcean s-2vcpu-2gb | Medium | 2    | 2 GB   | ~$0.02      | ~$14.00             |

### Consumer Cost Estimates (Hetzner)

**Bloom (AI Coding) on cx22:**

| Usage Pattern         | Always-On VPS | Firefly   |
| --------------------- | ------------- | --------- |
| 4 hours/day           | $5.50/mo      | ~$0.96/mo |
| 20 hours/week         | $5.50/mo      | ~$2.56/mo |
| Weekend projects only | $5.50/mo      | ~$0.26/mo |

**Outpost (Gaming) on cx32:**

| Usage Pattern               | Always-On VPS | Firefly   |
| --------------------------- | ------------- | --------- |
| Weekend sessions (8hr/week) | $11.50/mo     | ~$1.54/mo |
| Occasional (4hr/week)       | $11.50/mo     | ~$0.77/mo |
| One-off game night          | $11.50/mo     | ~$0.10    |

**Queen CI on cx22:**

| Usage Pattern              | Always-On Runner | Firefly   |
| -------------------------- | ---------------- | --------- |
| 10 jobs/day, 5 min each    | $5.50/mo         | ~$0.40/mo |
| 50 jobs/day, 10 min each   | $5.50/mo         | ~$3.32/mo |
| Warm pool (business hours) | $5.50/mo         | ~$3.00/mo |

For nearly all Grove use cases, Firefly costs dramatically less than always-on hosting.

---

## File Structure

```
packages/engine/src/lib/firefly/
├── index.ts              # Barrel exports
├── types.ts              # All interfaces (FireflyProvider, ServerConfig, etc.)
├── firefly.ts            # Core Firefly orchestrator class
├── providers/
│   ├── base.ts           # FireflyProvider abstract class with shared logic
│   ├── hetzner.ts        # HetznerProvider implementation
│   ├── fly.ts            # FlyProvider (future, interface-only stub)
│   ├── railway.ts        # RailwayProvider (future, interface-only stub)
│   └── digitalocean.ts   # DigitalOceanProvider (future, interface-only stub)
├── sync/
│   └── r2-sync.ts        # R2StateSynchronizer implementation
└── idle/
    └── detector.ts       # IdleDetector implementation
```

The SDK lives in the engine package. Published as `@autumnsgrove/lattice/firefly` through the standard export chain. Consumers import types and classes directly.

---

## Implementation Checklist

### Phase 1: Core SDK

- [ ] Create `packages/engine/src/lib/firefly/` directory structure
- [ ] Define all interfaces in `types.ts`
- [ ] Implement `Firefly` orchestrator class (ignite/fade lifecycle)
- [ ] Implement `FireflyProvider` abstract base class
- [ ] Implement `HetznerProvider` (port from Verge's Hetzner integration)
- [ ] Implement `R2StateSynchronizer`
- [ ] Implement `IdleDetector`
- [ ] Add orphan sweep utility function
- [ ] Add barrel exports to `index.ts`
- [ ] Add `firefly` to engine `package.json` exports map
- [ ] Build and verify TypeScript compilation

### Phase 2: Queen Integration

- [ ] Wire Queen DO to use Firefly SDK for runner provisioning
- [ ] Replace `hetznerId` fields with `providerServerId` in Queen schema
- [ ] Integrate orphan sweep into Queen's alarm cycle
- [ ] Add Vista metrics reporting

### Phase 3: Additional Providers

- [ ] Implement `FlyProvider` (container-based, fast cold start)
- [ ] Implement `DigitalOceanProvider` (US region coverage)
- [ ] Add provider selection logic to `FireflyConfig`
- [ ] Update cost tracking for multi-provider environments

### Phase 4: Consumer Rollout

- [ ] Integrate Bloom with Firefly SDK
- [ ] Integrate Outpost with Firefly SDK
- [ ] Wire Journey batch processing
- [ ] Update Verge to use shared SDK (optional, Verge may stay standalone)

---

_A brief light in the darkness. Any cloud. Same lifecycle._
