# Firefly Integration Plan: Wake-on-HTTP, Named Instances, Pause/Resume

```
                         From this height, the patterns emerge.

                    ╭──────────────────────────────────────────╮
                    │          WORKER (thin dispatcher)        │
                    │   "Is there a Firefly for this task?"    │
                    ╰──────────────┬───────────────────────────╯
                                   │
                      ┌────────────┼────────────────┐
                      ▼            ▼                ▼
                 ┌─────────┐ ┌─────────┐     ┌──────────┐
                 │ RUNNING │ │ PAUSED  │     │ DORMANT  │
                 │ proxy → │ │ resume→ │     │ ignite → │
                 │ forward │ │ warm up │     │ cold     │
                 └─────────┘ └─────────┘     └──────────┘
                      │            │                │
                      └────────────┼────────────────┘
                                   ▼
                         ╭─────────────────╮
                         │  name: "queen-3"│
                         │  not a UUID     │
                         ╰─────────────────╯

                    Three patterns stolen from the wild,
                    shaped for a machine orchestrator.
```

> _The eagle sees three gaps in the canopy where light should fall._
> _Each one small. Together, they change the shape of the forest._

**Date:** 2026-03-05
**Status:** Planned
**Safari Reference:** `docs/safaris/active/shellbox-vs-firefly-safari.md`
**SDK Reference:** `docs/specs/firefly-sdk-spec.md`
**Affects:** `libs/engine/src/lib/firefly/`

---

## Context

Firefly is a **machine orchestrator**. It spins up VMs for heavy tasks — CI builds, AI inference, media processing, long-running jobs — then tears them down. The SDK is the primary interface. Most consumers are other Grove services, not humans.

But there are exceptions. Loft is a personal dev box where the user IS the consumer. And even for machine consumers, there are moments where human-readable names and on-demand wake patterns make orchestration dramatically simpler.

The Shellbox safari identified 19 improvement opportunities. Three of them fit Firefly's identity as an orchestrator without turning it into a developer product:

1. **Wake-on-HTTP** — Workers as thin dispatchers that ignite Fireflies on demand
2. **Named instances** — Human-readable names instead of UUID-only tracking
3. **Pause/resume** — For Loft specifically, machine stop/start instead of full terminate

Everything else from the safari (SSH gateway, CLI, auto-HTTPS, box duplication) is either unnecessary for a machine orchestrator or can be built later on top of these three primitives.

---

## Feature 1: Named Instances

### Why this matters

Every Firefly instance today is a UUID. When Queen spins up `queen-runner-3`, it's tracked as `a7f2c3b1-...`. When you're debugging why a CI job failed at 2am, you're grepping logs for UUIDs. Named instances let you say `firefly.ignite({ name: "queen-runner-3" })` and later `firefly.getInstanceByName("queen-runner-3")`.

This is the simplest change and unlocks the other two features. Wake-on-HTTP needs a stable name to route to. Pause/resume needs a name to reconnect to.

### What changes

**Types** (`libs/engine/src/lib/firefly/types.ts`):

```typescript
export interface IgniteOptions {
  // ... existing fields ...

  /** Human-readable instance name. Must be unique among active instances.
   *  If omitted, a name is auto-generated from consumer + short ID. */
  name?: string;
}

export interface ServerInstance {
  // ... existing fields ...

  /** Human-readable name. Unique among active instances for this consumer. */
  name: string;
}
```

**State store** (`FireflyStateStore` interface):

```typescript
export interface FireflyStateStore {
  // ... existing methods ...

  /** Look up an active instance by name. */
  getInstanceByName(name: string): ServerInstance | null | Promise<ServerInstance | null>;
}
```

**Core orchestrator** (`Firefly` class):

```typescript
async ignite(options: IgniteOptions = {}): Promise<ServerInstance> {
  // Generate name if not provided
  const name = options.name ?? `${this.consumer}-${id.slice(0, 8)}`;

  // Check uniqueness among active instances
  const existing = await this.store.getInstanceByName(name);
  if (existing && existing.status !== "terminated") {
    throw new FireflyError(FLY_ERRORS.NAME_CONFLICT, `Instance "${name}" already active`);
  }

  // ... rest of ignite, with name on the ServerInstance ...
}

/** Get an active instance by name. */
async getInstanceByName(name: string): Promise<ServerInstance | null> {
  return this.store.getInstanceByName(name);
}
```

**Provider layer** — names flow through to cloud providers:
- **Fly.io**: Already uses `name: \`firefly-${id.slice(0, 8)}\`` in machine creation. Change to use the SDK name directly: `name: instanceName`.
- **Hetzner**: Server name field maps directly. Currently uses `firefly-${id}`. Change to use SDK name.

**Error codes** (`errors.ts`):

```typescript
export const FLY_ERRORS = {
  // ... existing ...
  NAME_CONFLICT: "FLY_010",
};
```

### What doesn't change

- UUIDs remain the primary internal identifier. Names are a convenience layer.
- Provider-level IDs (`providerServerId`) are unchanged.
- R2 state keys, orphan sweeping, session logging — all still use UUID.
- The `name` field is always populated (auto-generated if not specified), so downstream code doesn't need null checks.

### Naming rules

- Must match `/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/` (DNS-safe, cloud-provider-safe)
- Unique among **active** instances for a given consumer. Terminated instances release their names.
- Auto-generated format: `{consumer}-{shortId}` (e.g., `queen-ci-a7f2c3b1`, `loft-3e8f1a2b`)

---

## Feature 2: Wake-on-HTTP

### Why this matters

The "serverless that isn't serverless" pattern. A Cloudflare Worker receives a request that needs real compute — a build to run, an image to process, an AI inference job. Instead of struggling within Worker limits (CPU time, memory, no filesystem), the Worker ignites a Firefly, proxies the work, and fades when done.

This turns Workers into thin dispatchers and Fireflies into the actual compute layer. You get the always-on responsiveness of serverless with the power of a real VM.

### Architecture

```
                    ┌─────────────────────────────────┐
                    │     Cloudflare Worker            │
                    │     (thin dispatcher)            │
                    │                                  │
                    │  1. Receive HTTP request          │
                    │  2. Look up instance by name      │
                    │  3. Route based on state:         │
                    │     ├─ running  → proxy request   │
                    │     ├─ paused   → resume, proxy   │
                    │     └─ dormant  → ignite, proxy   │
                    │  4. Return response               │
                    └──────────────┬───────────────────┘
                                   │
                    ┌──────────────┼──────────────────┐
                    │              │                   │
              ┌─────▼──────┐ ┌────▼───────┐   ┌──────▼───────┐
              │  Instance   │ │  Instance   │   │  New ignite  │
              │  running    │ │  paused     │   │  cold start  │
              │             │ │  (resume    │   │  30-60s      │
              │  ~0ms       │ │   ~5s fly)  │   │              │
              └─────────────┘ └─────────────┘   └──────────────┘
```

### The dispatch pattern

This is NOT a general-purpose HTTP proxy. It's a pattern that consumers implement in their own Workers. The SDK provides the building blocks; the consumer decides the routing logic.

**New SDK export** — `FireflyDispatcher`:

```typescript
/**
 * Wake-on-HTTP dispatch helper.
 *
 * Consumers use this in their Workers to route requests to Firefly instances.
 * The dispatcher handles lookup, ignition, waiting, and forwarding.
 */
export class FireflyDispatcher {
  constructor(
    private readonly firefly: Firefly,
    private readonly options: DispatcherOptions,
  ) {}

  /**
   * Dispatch a request to a named Firefly instance.
   *
   * - If the instance is running, forward immediately.
   * - If the instance is paused, resume it, then forward.
   * - If no instance exists, ignite one, then forward.
   *
   * Returns the proxied response from the Firefly instance.
   */
  async dispatch(
    name: string,
    request: Request,
    igniteOptions?: IgniteOptions,
  ): Promise<Response> { /* ... */ }
}

export interface DispatcherOptions {
  /** How long to wait for a cold instance to become ready before returning 503 (ms).
   *  Default: 120_000 (2 min). */
  coldStartTimeout?: number;

  /** Response to return while waiting for ignition.
   *  If not set, the dispatcher blocks until ready or timeout. */
  waitingResponse?: (name: string) => Response;

  /** Port on the Firefly instance to forward requests to. Default: 8080. */
  targetPort?: number;

  /** Headers to add to forwarded requests (e.g., auth tokens). */
  forwardHeaders?: Record<string, string>;
}
```

**Consumer usage example** (Queen Worker):

```typescript
// workers/queen/src/index.ts
const dispatcher = new FireflyDispatcher(firefly, {
  coldStartTimeout: 90_000,
  targetPort: 8080,
  waitingResponse: (name) =>
    new Response(JSON.stringify({ status: "igniting", instance: name }), {
      status: 202,
      headers: { "Retry-After": "10" },
    }),
});

// Route: POST /api/build
async function handleBuild(request: Request): Promise<Response> {
  const { project, branch } = await request.json();
  const runnerName = `queen-${project}-${branch}`.replace(/[^a-z0-9-]/g, "-");

  return dispatcher.dispatch(runnerName, request, {
    size: "cx22",
    region: "fsn1",
    image: "queen-runner-v3",
    tags: ["queen-ci", project],
  });
}
```

### How the dispatcher works internally

```
dispatch("queen-build-main", request)
  │
  ├── store.getInstanceByName("queen-build-main")
  │     │
  │     ├── Found, status: "running"
  │     │     └── Forward request to instance.publicIp:targetPort
  │     │
  │     ├── Found, status: "paused"    (Feature 3)
  │     │     ├── firefly.resume("queen-build-main")
  │     │     ├── Wait for ready
  │     │     └── Forward request
  │     │
  │     └── Not found (or terminated)
  │           ├── options.waitingResponse? → return 202 immediately
  │           │     (caller polls or uses webhook callback)
  │           ├── firefly.ignite({ name: "queen-build-main", ...igniteOptions })
  │           ├── Wait for ready (up to coldStartTimeout)
  │           └── Forward request
  │
  └── Return proxied Response (or 503 on timeout)
```

### What this is NOT

- **Not a reverse proxy service.** There's no standing proxy infrastructure. Each Worker that needs compute dispatches its own Fireflies.
- **Not auto-scaling.** The dispatcher handles one instance per name. Pool management (multiple runners for the same project) stays in consumer code (Queen's job queue).
- **Not a load balancer.** One name = one instance. If you need multiple instances, use different names (`queen-build-main-1`, `queen-build-main-2`).

### Blocking vs non-blocking dispatch

Two modes, chosen by whether `waitingResponse` is set:

1. **Blocking** (default): `dispatch()` awaits ignition, then proxies the request. Good for synchronous API calls where the caller can wait.
2. **Non-blocking**: Returns `waitingResponse` immediately while igniting in the background. Good for webhooks and async job submission. The caller polls or receives a callback.

For non-blocking mode, the dispatcher needs a way to signal completion. This integrates with Firefly's existing event system:

```typescript
firefly.onEvent((event) => {
  if (event.type === "ignite" && event.metadata?.name) {
    // Instance is ready — any queued work can proceed
  }
});
```

---

## Feature 3: Pause/Resume (Loft-Specific)

### Why this matters

When you're coding on Loft and close your laptop, the current behavior is: idle detection fires after 30 minutes, the VM is terminated, state is synced to R2. When you come back, a brand new VM is provisioned and state is rehydrated from R2. This works, but:

- Cold start (even Fly's ~5s) plus R2 rehydration means a noticeable wait
- Any in-memory state (running processes, open files, shell history) is lost
- It feels wasteful to destroy and recreate for a "close the lid, open the lid" workflow

Fly.io's machine stop/start preserves the entire machine state. The filesystem, running processes, everything. Resume is near-instant (~1-2s). This is perfect for Loft.

### Scope: Fly.io only, Loft only

Pause/resume is a Fly.io-native feature. Hetzner doesn't have an equivalent (their "rescue mode" is not the same thing). Rather than abstracting pause/resume across all providers (which would require snapshot-based simulation on Hetzner), this feature is:

- **Provider-specific**: Only `FlyProvider` implements `stop()` and `start()`
- **Consumer-specific**: Only Loft uses it. Queen CI and Outpost continue with full terminate/rehydrate

This avoids over-engineering. If pause/resume is needed on Hetzner later, it can be added as a provider-specific implementation behind the same interface.

### What changes

**New lifecycle status** (`types.ts`):

```typescript
export type ServerStatus =
  | "provisioning"
  | "ready"
  | "running"
  | "paused"        // NEW — machine stopped but preserving state
  | "resuming"      // NEW — machine starting from paused
  | "terminating"
  | "terminated";
```

**New provider methods** (optional, on `FireflyProvider`):

```typescript
export interface FireflyProvider {
  // ... existing methods ...

  /** Whether this provider supports pause/resume. */
  readonly supportsPause: boolean;

  /** Pause (stop) an instance, preserving state. Only available if supportsPause is true. */
  pause?(instance: ServerInstance): Promise<void>;

  /** Resume a paused instance. Only available if supportsPause is true. */
  resume?(instance: ServerInstance): Promise<void>;
}
```

**Fly.io provider** (`providers/fly.ts`):

```typescript
export class FlyProvider extends FireflyProviderBase {
  readonly supportsPause = true;

  async pause(instance: ServerInstance): Promise<void> {
    await this.request(
      FLY_API,
      "POST",
      `/apps/${this.app}/machines/${instance.providerServerId}/stop`,
    );
  }

  async resume(instance: ServerInstance): Promise<void> {
    await this.request(
      FLY_API,
      "POST",
      `/apps/${this.app}/machines/${instance.providerServerId}/start`,
    );
  }

  // Update mapStatus to handle paused state:
  private mapStatus(flyState: string): ServerStatus {
    switch (flyState) {
      case "stopped": return "paused";  // Changed from "terminated"
      // ... rest unchanged ...
    }
  }
}
```

**Hetzner provider**: `supportsPause = false`. No `pause()` or `resume()` methods.

**Core orchestrator** — new `pause()` and `resume()` methods:

```typescript
export class Firefly {
  /**
   * Pause — Suspend an instance, preserving its state.
   *
   * Only available on providers that support pause (Fly.io).
   * On unsupported providers, throws PAUSE_NOT_SUPPORTED.
   *
   * 1. Stop idle monitoring
   * 2. provider.pause(instance)
   * 3. store.updateStatus("paused")
   * 4. emit("pause")
   *
   * Unlike fade(), this does NOT sync state to R2 (state lives on the machine).
   * Unlike fade(), this does NOT terminate the machine.
   */
  async pause(instanceId: string): Promise<void> { /* ... */ }

  /**
   * Resume — Wake a paused instance.
   *
   * 1. provider.resume(instance)
   * 2. provider.waitForReady(instance, timeout)
   * 3. store.updateStatus("running")
   * 4. idle.startMonitoring() (reset timer)
   * 5. emit("resume")
   */
  async resume(instanceId: string): Promise<void> { /* ... */ }
}
```

**New events**:

```typescript
export interface FireflyEvent {
  type:
    | "ignite" | "ready" | "fade"
    | "pause" | "resume"              // NEW
    | "orphan_detected" | "orphan_terminated"
    | "idle_warning" | "idle_triggered"
    | "sync_started" | "sync_completed" | "sync_failed"
    | "error";
  // ...
}
```

**New error codes**:

```typescript
export const FLY_ERRORS = {
  // ... existing ...
  PAUSE_NOT_SUPPORTED: "FLY_011",
  RESUME_FAILED: "FLY_012",
  INSTANCE_NOT_PAUSED: "FLY_013",
};
```

### Loft integration

The Loft consumer preset changes its idle behavior:

```typescript
export const LOFT_DEFAULTS: ConsumerPreset = {
  name: "loft",
  // ... existing ...
  idle: {
    checkInterval: 60_000,
    idleThreshold: 30 * 60_000,      // 30 min idle
    activitySignals: ["ssh_session_active", "network_traffic"],
    warningAt: 25 * 60_000,
    onIdle: "pause",                 // NEW — pause instead of fade
  },
};
```

The idle detection callback in the Firefly class routes through the new behavior:

```typescript
private handleIdleThreshold(instanceId: string): void {
  this.emit({ type: "idle_triggered", /* ... */ });

  // Check if consumer prefers pause over fade
  if (this.idleConfig?.onIdle === "pause" && this.provider.supportsPause) {
    this.pause(instanceId).catch(() => {});
  } else {
    this.fade(instanceId).catch(() => {});
  }
}
```

**New idle config field** (`types.ts`):

```typescript
export interface IdleConfig {
  // ... existing ...

  /** What to do when idle threshold is reached.
   *  "fade" (default) — full terminate. "pause" — suspend if provider supports it. */
  onIdle?: "fade" | "pause";
}
```

### Cost implications

Fly.io charges for stopped machines' **persistent storage only** (not CPU/RAM). For Loft:
- Running: ~$0.004/hr (shared-cpu-2x)
- Paused: ~$0.00015/hr (storage only)
- Full terminate: $0/hr (but cold start + R2 rehydrate cost on resume)

Pausing is nearly free and dramatically faster to resume. The orphan sweeper should still catch machines paused for too long (configurable max pause duration, default 24h).

### Orphan sweeper update

The orphan sweeper needs to handle paused instances:

```typescript
async sweepOrphans(tags?: string[]): Promise<ServerInstance[]> {
  const cloudInstances = await this.provider.listActive(tags);
  // listActive should now include paused instances
  // ...

  // Also sweep instances paused too long
  for (const instance of tracked) {
    if (instance.status === "paused") {
      const pauseDuration = Date.now() - (instance.metadata.pausedAt as number);
      if (pauseDuration > this.maxPauseDuration) {
        await this.fade(instance.id);  // Full terminate after max pause
      }
    }
  }
}
```

---

## Implementation Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION ORDER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: Named Instances                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  1. Add `name` to ServerInstance + IgniteOptions          │  │
│  │  2. Add getInstanceByName() to FireflyStateStore          │  │
│  │  3. Implement in all three stores (Memory, D1, Loom)      │  │
│  │  4. Update Firefly.ignite() with name generation + check  │  │
│  │  5. Update FlyProvider + HetznerProvider to use name      │  │
│  │  6. Add NAME_CONFLICT error code                          │  │
│  │  7. Update consumer presets (no breaking changes)         │  │
│  └───────────────────────────────────────────────────────────┘  │
│       ▼                                                         │
│  Phase 2: Pause/Resume                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  1. Add "paused" + "resuming" to ServerStatus             │  │
│  │  2. Add supportsPause, pause(), resume() to provider      │  │
│  │  3. Implement in FlyProvider (stop/start API calls)       │  │
│  │  4. Add Firefly.pause() + Firefly.resume()                │  │
│  │  5. Add onIdle: "pause" to IdleConfig                     │  │
│  │  6. Update idle handler to route pause vs fade            │  │
│  │  7. Update Loft consumer preset                           │  │
│  │  8. Update orphan sweeper for paused instances            │  │
│  │  9. Update FlyProvider.mapStatus (stopped → paused)       │  │
│  └───────────────────────────────────────────────────────────┘  │
│       ▼                                                         │
│  Phase 3: Wake-on-HTTP Dispatcher                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  1. Create FireflyDispatcher class                        │  │
│  │  2. Implement dispatch() with three-way routing           │  │
│  │  3. Add blocking + non-blocking modes                     │  │
│  │  4. Export from firefly barrel                             │  │
│  │  5. Wire into first consumer (Queen or Loft)              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Dependencies: Phase 2 needs Phase 1 (names for reconnection)  │
│                Phase 3 needs Phase 1 + 2 (dispatch routes by   │
│                name, resumes paused instances)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why this order

1. **Named instances first** because the other two features depend on it. You can't dispatch to "queen-runner-3" or resume "my-loft-box" without names.
2. **Pause/resume second** because the dispatcher needs to know about paused instances to offer three-way routing (running/paused/dormant).
3. **Wake-on-HTTP last** because it's a composition of the first two features plus HTTP proxying logic.

---

## Files Changed

### Phase 1 (Named Instances)

| File | Change |
|------|--------|
| `libs/engine/src/lib/firefly/types.ts` | Add `name` to `ServerInstance`, `IgniteOptions` |
| `libs/engine/src/lib/firefly/firefly.ts` | Name generation, uniqueness check, `getInstanceByName()` |
| `libs/engine/src/lib/firefly/errors.ts` | Add `NAME_CONFLICT` error |
| `libs/engine/src/lib/firefly/stores/memory.ts` | Implement `getInstanceByName()` |
| `libs/engine/src/lib/firefly/stores/d1.ts` | Implement `getInstanceByName()` (SQL WHERE name = ?) |
| `libs/engine/src/lib/firefly/stores/loom.ts` | Implement `getInstanceByName()` |
| `libs/engine/src/lib/firefly/providers/fly.ts` | Use SDK name for machine name |
| `libs/engine/src/lib/firefly/providers/hetzner.ts` | Use SDK name for server name |

### Phase 2 (Pause/Resume)

| File | Change |
|------|--------|
| `libs/engine/src/lib/firefly/types.ts` | Add `"paused"`, `"resuming"` status; `supportsPause`, `pause()`, `resume()` on provider; `onIdle` on IdleConfig |
| `libs/engine/src/lib/firefly/firefly.ts` | Add `pause()`, `resume()` methods; update idle handler |
| `libs/engine/src/lib/firefly/errors.ts` | Add `PAUSE_NOT_SUPPORTED`, `RESUME_FAILED`, `INSTANCE_NOT_PAUSED` |
| `libs/engine/src/lib/firefly/providers/fly.ts` | Implement `pause()`, `resume()`; update `mapStatus()` |
| `libs/engine/src/lib/firefly/providers/hetzner.ts` | Add `supportsPause = false` |
| `libs/engine/src/lib/firefly/providers/base.ts` | Default `supportsPause = false` |
| `libs/engine/src/lib/firefly/idle/detector.ts` | Pass through `onIdle` preference |
| `libs/engine/src/lib/firefly/consumers/loft.ts` | Add `onIdle: "pause"` to preset |

### Phase 3 (Wake-on-HTTP)

| File | Change |
|------|--------|
| `libs/engine/src/lib/firefly/dispatcher.ts` | New file — `FireflyDispatcher` class |
| `libs/engine/src/lib/firefly/types.ts` | Add `DispatcherOptions` interface |
| `libs/engine/src/lib/firefly/index.ts` | Export dispatcher |

---

## What This Plan Explicitly Skips

These are architectural decisions, not oversights:

| Skipped | Why |
|---------|-----|
| SSH gateway / proxy | Firefly is a machine orchestrator. Machines don't SSH through a gateway. Loft uses raw IP SSH for one person. |
| `gw firefly` CLI | The SDK is the interface. Machines don't use CLIs. |
| Auto-HTTPS per instance | Machines communicate over internal IPs or Fly's private networking. No vanity URLs needed. |
| Box duplication | Machines start from images. State is in R2. If you need a copy, copy the R2 key. |
| Hetzner pause/resume | Would require snapshot-based simulation. Unnecessary complexity for a provider that's used for long-running compute, not dev boxes. |
| Per-tenant billing | Firefly runs on your infrastructure. Billing is between you and Hetzner/Fly. |
| IDE integration | One person uses Loft. Standard `ssh root@ip` works. |

---

## Open Questions

1. **Max pause duration for orphan sweeping.** Proposed: 24h default, configurable per consumer. A Loft box paused for 3 days is probably forgotten. A CI runner paused for 2 hours might be intentional.

2. **Name collision across consumers.** Should names be globally unique or scoped per consumer? Proposed: per-consumer (Queen's "runner-3" doesn't collide with Loft's "runner-3"). The store query filters by consumer.

3. **Dispatcher retry semantics.** If a Firefly crashes mid-request, should the dispatcher retry on a new instance? Proposed: no. The dispatcher is a forwarder, not a retry layer. Consumers handle their own retry logic.

4. **Paused instance visibility in listActive().** Should paused instances appear in `getActiveInstances()`? Proposed: yes, with status filter option. Paused is "active but sleeping," not terminated.

---

_From this height, the three changes are small but structural. Names give identity. Pause gives continuity. Dispatch gives purpose. The machine orchestrator becomes smarter without pretending to be something it's not._

---

_Architecture plan drafted: March 5, 2026_
_Reference: Shellbox vs Firefly Safari (March 2, 2026)_
_Architect: Eagle, circling above the canopy_
