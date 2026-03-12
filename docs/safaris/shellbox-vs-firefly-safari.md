---
title: "Shellbox vs Firefly Safari"
description: "Comparing ephemeral server provisioning approaches"
category: safari
lastUpdated: "2026-03-02"
tags:
  - firefly
  - infrastructure
---

# Shellbox vs Firefly Safari — What the Wild Can Teach the Grove

> _Two approaches to the same dream: servers that exist only when you need them._
> **Aesthetic principle**: Learn from the polished product; sharpen the homegrown pattern.
> **Scope**: Architecture, UX, features, pricing, developer experience, and gaps in both directions.

---

## Ecosystem Overview

**2 creatures** observed across **12 stops**

**Shellbox** (shellbox.dev) — A commercial service offering on-demand Linux VMs accessible exclusively through SSH. Pure SSH UX, prepaid billing, pause-on-disconnect, wakeup-on-HTTP, cron scheduling, HTTPS + email endpoints per box. Simple, focused, polished.

**Firefly** (Grove's `@autumnsgrove/lattice/firefly`) — A TypeScript SDK for ephemeral server provisioning across multiple cloud providers. Three-phase lifecycle (ignite/illuminate/fade), multi-consumer presets, R2 state sync, idle detection, orphan sweeping, Warden credential gateway. Flexible, composable, unfinished.

### Creatures by category

**They share:** Ephemeral compute, idle-based shutdown, state persistence, pay-for-use economics, SSH access
**Shellbox excels at:** UX simplicity, SSH-first management, wakeup-on-HTTP, cron scheduling, HTTPS/email endpoints, box duplication, developer-facing polish
**Firefly excels at:** Multi-cloud abstraction, programmatic orchestration, consumer presets, R2 state sync, idle detection granularity, observability integration, self-hosted sovereignty

---

## 1. Core Philosophy & Architecture

**Character**: _Two roads to the same forest — one paved, one winding through the trees._

### Shellbox: What exists today

Shellbox is a **managed service**. You SSH in, create a box, and use it. The infrastructure is invisible. There's no SDK, no API, no configuration files. Every operation happens through SSH commands to `shellbox.dev`. The entire UX is: `ssh shellbox.dev create mybox` → `ssh mybox@shellbox.dev` → work → disconnect → box pauses → reconnect later.

- [x] **Zero-config provisioning** — no API keys, no cloud accounts, no provider setup
- [x] **SSH as the universal interface** — every operation is an SSH command
- [x] **Implicit lifecycle** — connect = start, disconnect = pause (no explicit ignite/fade)
- [x] **Managed infrastructure** — they handle the servers, you just use them

### Firefly: What exists today

Firefly is a **composable SDK**. You import it, configure providers, wire up state sync, and call `firefly.ignite()`. The consumer owns the infrastructure. The SDK provides the lifecycle pattern.

- [x] **Multi-cloud provider abstraction** — Hetzner (full impl), Fly.io (full impl), Railway/DO (stubs)
- [x] **Composable architecture** — swap providers, stores, sync layers independently
- [x] **Explicit three-phase lifecycle** — ignite (provision + configure + sync), illuminate (work + monitor), fade (sync + cleanup + terminate)
- [x] **Consumer presets** — Queen CI, Bloom, Outpost, Loft, Journey each with tailored defaults
- [x] **Self-hosted sovereignty** — no vendor lock-in, you control the infrastructure
- [ ] **No SSH-first UX** — everything is programmatic, no human-facing CLI
- [ ] **No implicit pause/resume** — lifecycle is explicit, triggered by code

### Design spec (safari-approved)

**The takeaway:** Shellbox proves there's massive appeal in "just SSH in and it works." Firefly's programmatic power is valuable for automated consumers (CI, AI agents, game servers), but for **human developers** who want a dev box, Firefly has no equivalent to Shellbox's simplicity. These aren't competitors — they're complementary layers. Firefly could power a Shellbox-like UX while keeping its SDK flexibility for machine consumers.

---

## 2. User Experience & Access Model

**Character**: _The difference between driving an automatic and building your own engine._

### Shellbox observed

```bash
# Create a box — that's it
ssh shellbox.dev create dev1 x2

# Connect to it
ssh dev1@shellbox.dev

# Upload files
scp app.tar.gz dev1@shellbox.dev:/root/

# SFTP for IDE integration
sftp dev1@shellbox.dev
```

- [x] **One command to create** — `ssh shellbox.dev create <name> [size]`
- [x] **One command to connect** — `ssh <name>@shellbox.dev`
- [x] **File transfer built in** — SCP/SFTP via standard SSH
- [x] **IDE integration via SFTP** — VSCode Remote SSH, Zed
- [x] **SSH key management** — `ssh shellbox.dev key list|add|remove`
- [x] **Billing via SSH** — `ssh shellbox.dev billing`, `ssh shellbox.dev funds <amount>`

### Firefly observed

```typescript
// Programmatic only
const firefly = new Firefly({
  provider: new HetznerProvider({ token: env.HETZNER_TOKEN }),
  sync: { synchronizer: new R2StateSynchronizer({ storage }) },
  idle: { checkInterval: 30_000, idleThreshold: 300_000, activitySignals: ["ssh_session_active"] },
});
const instance = await firefly.ignite({ size: "cx22", region: "fsn1", image: "ubuntu-24.04" });
// Now manually SSH to instance.publicIp
```

- [x] **Full programmatic control** — every step is code
- [x] **Event system** for observability hooks
- [ ] **No human-facing CLI** — no `gw firefly create mybox`
- [ ] **No SSH proxy layer** — user must know the raw IP
- [ ] **No integrated file transfer** — SCP to raw IP only
- [ ] **No billing self-service** — cost tracking is internal only

### Design spec (safari-approved)

**What Firefly should learn:** Shellbox's SSH proxy (`ssh name@shellbox.dev` routing to the actual box) is brilliant UX. Firefly could add a **`gw firefly` CLI** that wraps the SDK:

```bash
# Proposed: human-facing Firefly CLI
gw firefly create mybox --size cx22 --region fsn1    # ignite
gw firefly ssh mybox                                  # connect via proxy
gw firefly list                                        # show active instances
gw firefly stop mybox                                  # explicit fade
gw firefly duplicate mybox mybox-copy                  # clone state
```

This wouldn't replace the SDK — it would wrap it. Machine consumers still import `@autumnsgrove/lattice/firefly`. Human developers get `gw firefly`. Both use the same lifecycle underneath.

---

## 3. State Persistence & Pause/Resume

**Character**: _Shellbox freezes time. Firefly saves your notebook and burns the desk._

### Shellbox observed

- [x] **Pause on disconnect** — box suspends in place, processes frozen, filesystem intact
- [x] **Resume on reconnect** — SSH in again, everything is exactly where you left it
- [x] **No explicit save step** — state persistence is automatic and invisible
- [x] **Box duplication** — `ssh shellbox.dev duplicate src dest` clones a stopped box

This is **VM-level hibernation**. The entire machine state (memory, processes, filesystem) persists. You disconnect at 3am mid-`vim` session and reconnect at noon — cursor is still there.

### Firefly observed

- [x] **R2StateSynchronizer** — hydrate (pull from R2) and persist (push to R2)
- [x] **Conflict detection** — etag-based version checking before hydration
- [x] **Consumer-configurable sync** — per-activity, periodic interval, or manual
- [x] **State key hierarchy** — each consumer organizes its own R2 key layout
- [ ] **No VM hibernation** — server is terminated on fade, not paused
- [ ] **Application-level only** — syncs files/data, not running processes
- [ ] **Manual persist required** — consumers must set `_pendingState` metadata
- [ ] **No box duplication** — no way to clone an instance's state to a new one

### Design spec (safari-approved)

**The gap is significant.** Shellbox's pause/resume is the killer feature. Firefly tears down the server entirely — state must be explicitly serialized, synced to R2, and rehydrated on the next ignite. This is fine for automated consumers (CI doesn't need pause), but terrible for human dev-box use.

**Two paths to close this gap:**

1. **VM Pause (like Shellbox):** Some providers support VM suspend/hibernate. Hetzner doesn't. Fly.io machines can be "stopped" (not destroyed) and resumed. Add a `pause()` / `resume()` pair to the Firefly lifecycle alongside `ignite()` / `fade()`:

```
DORMANT → IGNITE → ILLUMINATE → PAUSE ⟷ RESUME → ... → FADE → DORMANT
                                  ↑                         ↑
                          (disconnect)               (explicit or idle)
```

2. **Smart Snapshot (augmented R2 sync):** For providers without native pause, capture filesystem state as a tarball → R2, plus a process manifest. On re-ignite, restore from snapshot. Not as seamless as true hibernation, but gets closer.

**Priority:** High. This is the single biggest UX gap between Shellbox and a Firefly-powered dev experience.

---

## 4. Networking & Endpoints

**Character**: _Shellbox gives you a house with an address. Firefly gives you a tent with GPS coordinates._

### Shellbox observed

- [x] **Automatic HTTPS endpoint** — `https://<name>-<hash>.shellbox.dev` with auto TLS
- [x] **Email endpoint** — `<name>-<hash>@in.shellbox.dev`, POSTs to box at `/email`
- [x] **SSH port forwarding** — full SSH tunneling support
- [x] **Stable URL per box** — URL persists across pause/resume cycles

This is remarkable. Every box gets a public HTTPS URL with automatic TLS — no Nginx config, no Cloudflare setup, no certbot. You start a web server on port 80 in the box and it's immediately accessible at the HTTPS URL. The email endpoint is creative — incoming mail becomes a webhook POST to your box.

### Firefly observed

- [x] **Raw public IP** — Hetzner provides a public IPv4
- [x] **Fly.io app URL** — `<app>.fly.dev` for Fly-provisioned instances
- [ ] **No automatic TLS** — consumer must configure their own
- [ ] **No stable hostname** — IP changes on every ignite (Hetzner)
- [ ] **No email endpoints** — not part of the pattern
- [ ] **No built-in tunneling** — no SSH proxy layer

### Design spec (safari-approved)

**What Firefly should learn:**

#### Automatic HTTPS routing via Cloudflare

Firefly instances could be automatically reachable through a Grove subdomain using Cloudflare's infrastructure:

```
<instance-name>.firefly.grove.place → Cloudflare Worker → routes to server IP
```

The worker stores the mapping `instance-name → publicIp` in KV. On ignite, register the mapping. On fade, remove it. TLS is automatic via Cloudflare. This mirrors Shellbox's auto-HTTPS without any external certs.

#### Email endpoints (inspirational, low priority)

The email-to-webhook pattern is clever. Grove already has email infrastructure (Resend). Could wire incoming mail for `<instance>@firefly.grove.place` to POST to the instance. Cool feature, but not essential.

**Priority:** HTTPS routing is Medium-High (very useful for Loft/Bloom web previews). Email endpoints are Low (nice-to-have).

---

## 5. Idle Management & Wake-on-Demand

**Character**: _This is where Shellbox's product thinking really shines._

### Shellbox observed

**Three distinct modes:**

1. **Default (pause on disconnect):** SSH disconnect → box suspends → SSH reconnect → box resumes
2. **Keepalive mode:** `ssh shellbox.dev keepalive <name>` — box stays running after disconnect
3. **Wakeup mode:** `ssh shellbox.dev wakeup <name> [min]` — box starts on HTTP request, stops after idle timeout

- [x] **Wakeup-on-HTTP** — box sleeps until someone hits the HTTPS URL, then auto-starts
- [x] **Configurable idle timeout** — per-box, via SSH command
- [x] **Keepalive toggle** — for long-running services that shouldn't pause
- [x] **Three modes, simple mental model** — default, keepalive, wakeup

Wakeup mode is the standout. You deploy a web app to a box, enable wakeup mode, and the box only runs when someone visits the URL. For low-traffic personal projects, this is serverless-like economics with full VM capabilities.

### Firefly observed

- [x] **Configurable idle detection** — `IdleConfig` with checkInterval, idleThreshold, warningAt
- [x] **Multiple activity signals** — ssh, cpu, network, player, agent, ci
- [x] **Warning before fade** — optional warningAt threshold
- [x] **Auto-fade on idle** — detector triggers `fade()` automatically
- [ ] **No wake-on-demand** — once faded, only code can re-ignite
- [ ] **No keepalive toggle** — idle detection is always active if configured
- [ ] **No per-instance mode switching** — idle config is set at construction time
- [ ] **No HTTP-triggered wake** — no equivalent to Shellbox's wakeup mode

### Design spec (safari-approved)

**Wake-on-HTTP is the feature Firefly needs most after pause/resume.**

#### Proposed: Firefly Wakeup Mode

A Cloudflare Worker sits in front of the HTTPS routing layer. When a request arrives for a dormant Firefly instance:

```
HTTP request → Cloudflare Worker → Is instance running?
                                      ├── YES → proxy to server
                                      └── NO  → show "waking up..." page
                                                 → trigger firefly.ignite()
                                                 → poll until ready
                                                 → redirect to server
```

The "waking up" page could be a beautiful Grove-themed loading screen with firefly animations (the UI Firefly component — meta!). Idle timeout configurable per-instance.

#### Proposed: Keepalive flag

Simple addition to `IgniteOptions`:

```typescript
interface IgniteOptions {
  // ...existing...
  keepalive?: boolean; // If true, skip idle detection for this instance
}
```

When `keepalive: true`, the idle detector is not started for that instance. Clean, minimal.

#### Proposed: Per-instance mode switching

```typescript
// Runtime mode changes
firefly.setMode(instanceId, "wakeup", { idleTimeout: 10 * 60_000 });
firefly.setMode(instanceId, "keepalive");
firefly.setMode(instanceId, "default"); // original idle config
```

**Priority:** Critical. Wake-on-HTTP + keepalive would make Firefly viable for hosting personal projects with near-zero idle cost.

---

## 6. Scheduled Execution (Cron)

**Character**: _The rooster that crows at dawn, does its work, and goes back to sleep._

### Shellbox observed

- [x] **Cron mode** — `ssh shellbox.dev cron <name> <interval_minutes> [webhook_path]`
- [x] **Wake → execute → sleep cycle** — box starts, hits webhook, stops
- [x] **Configurable interval** — per-box scheduling via SSH
- [x] **Simple webhook pattern** — POST to a URL on the box when it wakes

### Firefly observed

- [x] **Schedule trigger type** defined in `FireflyTrigger` interface
- [x] **Queen CI uses alarm cycles** for pool management
- [ ] **No built-in cron scheduler** — consumers must implement their own
- [ ] **No scheduled ignite/fade** — the SDK has no time-based lifecycle triggers

### Design spec (safari-approved)

**Firefly already has the interface (`FireflyTrigger.type = "schedule"`) but no implementation.** The Queen coordinator uses Cloudflare Workers alarms, which is the right primitive.

#### Proposed: Firefly Cron via Cloudflare Workers

A lightweight Worker with cron triggers that calls `firefly.ignite()` → webhook → `firefly.fade()`:

```typescript
// wrangler.toml
[triggers]
crons = ["*/30 * * * *"]  # Every 30 minutes

// worker.ts
export default {
  async scheduled(event, env) {
    const firefly = createFirefly(env);
    const instance = await firefly.ignite({ image: "cron-runner" });
    await fetch(`http://${instance.publicIp}/cron-webhook`);
    // Instance will auto-fade on idle, or explicit fade after webhook completes
  }
};
```

This is straightforward and already natural in the Cloudflare ecosystem. No new SDK work needed — just a consumer pattern to document.

**Priority:** Low-Medium. Useful but achievable today with existing primitives.

---

## 7. Pricing & Cost Model

**Character**: _The ledger where both approaches show their true efficiency._

### Shellbox observed

| State | Cost |
|-------|------|
| Running | $0.02/hr per x1 slot (2 vCPU, 4GB, 50GB) |
| Running x2 | ~$0.04/hr (4 vCPU, 8GB, 100GB) |
| Running x4 | ~$0.08/hr (8 vCPU, 16GB, 200GB) |
| Running x8 | ~$0.16/hr (16 vCPU, 32GB, 400GB) |
| Stopped/paused | $0.50/month per x1 slot |
| Minimum top-up | $10 |
| Auto-stop | Balance < $5 |
| Auto-delete | Balance = $0 |

- [x] **Per-minute billing** — granular, no rounding to hours
- [x] **Stopped instance cost** — $0.50/month for persisted state (storage)
- [x] **Prepaid balance** — no surprise bills, you control spending
- [x] **Refund available** — unused funds within 3 months
- [x] **Automatic cost control** — boxes stop at low balance, delete at zero

### Firefly observed

| Provider | Size | vCPU | RAM | Hourly | Monthly (always-on) |
|----------|------|------|-----|--------|---------------------|
| Hetzner cx22 | Small | 2 | 4GB | ~$0.008 | ~$5.50 |
| Hetzner cx32 | Medium | 4 | 8GB | ~$0.016 | ~$11.50 |
| Fly shared-cpu-1x | Small | 1 | 256MB | ~$0.02 | ~$14.40 |
| Fly shared-cpu-2x | Medium | 2 | 512MB | ~$0.04 | ~$28.80 |

- [x] **Dramatically cheaper raw compute** — Hetzner cx22 at $0.008/hr vs Shellbox's $0.02/hr (2.5x cheaper)
- [x] **Zero stopped cost** — terminated instances cost nothing (state in R2 is pennies)
- [x] **R2 storage is near-free** — $0.015/GB/month for state persistence
- [x] **Multi-provider cost optimization** — pick cheapest provider per workload
- [x] **Session cost tracking** — `FireflySession.cost` field + Vista integration
- [ ] **No prepaid balance system** — you pay the cloud provider directly
- [ ] **No automatic spending caps** — orphan sweep is the safety net, not balance limits
- [ ] **No per-tenant billing** — no way to charge Grove Wanderers for their usage

### Design spec (safari-approved)

**Cost comparison for equivalent workloads:**

| Scenario | Shellbox | Firefly (Hetzner) | Savings |
|----------|----------|-------------------|---------|
| 4hr/day dev box | ~$2.40/mo + $0.50 stopped = ~$2.90/mo | ~$0.96/mo + ~$0.01 R2 = ~$0.97/mo | 67% cheaper |
| 8hr/week gaming | ~$1.60/mo + $0.50 = ~$2.10/mo | ~$0.51/mo + ~$0.01 = ~$0.52/mo | 75% cheaper |
| Paused 99% of time | $0.50/mo (just storage) | ~$0.01/mo (R2 only) | 98% cheaper |

**What Firefly should learn:**

1. **Prepaid balance + spending caps for multi-tenant.** If Grove offers Firefly-powered dev boxes to Wanderers, there needs to be a per-tenant balance system with auto-stop at low balance. Shellbox's model is elegant — prepaid, no surprises.

2. **Stopped-instance pricing transparency.** Shellbox charges $0.50/mo for paused state. Firefly's R2 storage is near-free, but that cost needs to be surfaced to users, not hidden.

**Priority:** Medium. Important for the multi-tenant use case (Wanderers running their own Firefly instances through Grove).

---

## 8. Box Management & Duplication

**Character**: _The simple operations that make or break daily use._

### Shellbox observed

```bash
ssh shellbox.dev list                    # List all boxes with status
ssh shellbox.dev create dev1 x2          # Create with size
ssh shellbox.dev rename dev1 my-project  # Rename
ssh shellbox.dev duplicate dev1 dev2     # Clone stopped box
ssh shellbox.dev stop dev1               # Force stop
ssh shellbox.dev delete dev1             # Permanent delete
```

- [x] **Named instances** — human-readable names, not UUIDs
- [x] **List with status** — see all boxes, their state, URLs
- [x] **Duplication** — clone a stopped box to create a second one
- [x] **Rename** — change box name without recreating
- [x] **Force stop** — immediate halt without fade sequence

### Firefly observed

- [x] **UUID-based instance tracking** — `instance.id` is a UUID
- [x] **Active instances query** — `firefly.getActiveInstances()`
- [x] **Session history** — `firefly.getRecentSessions(limit)`
- [ ] **No human-readable names** — instances are identified by UUID only
- [ ] **No duplication** — can't clone instance state
- [ ] **No rename** — metadata is mutable, but no first-class name field
- [ ] **No instance listing CLI** — programmatic only

### Design spec (safari-approved)

**What Firefly should learn:**

1. **Named instances.** Add an optional `name` field to `IgniteOptions` and `ServerInstance`. Use it in provider labels and state store lookups. Allow `firefly.getInstanceByName("dev1")`.

2. **Duplication via R2 snapshots.** For instances with R2 state sync, duplication = copy the state key to a new key, then ignite with the new key. The SDK has all the pieces — just needs a `duplicate()` method:

```typescript
async duplicate(sourceInstanceId: string, options?: IgniteOptions): Promise<ServerInstance> {
  // 1. Get source instance state key
  // 2. Copy R2 object to new key
  // 3. Ignite new instance with copied state key
}
```

3. **`gw firefly list`** — A table showing name, status, provider, region, uptime, cost-so-far. Human-readable.

**Priority:** Medium. Named instances are essential for any human-facing use.

---

## 9. IDE Integration

**Character**: _Where the rubber meets the road for developer adoption._

### Shellbox observed

- [x] **VSCode Remote SSH** — connect via SFTP to `<name>@shellbox.dev`
- [x] **Zed editor** — same SFTP path
- [x] **Standard SSH config** — add to `~/.ssh/config` and it just works
- [x] **File transfer** — SCP + SFTP natively

```ssh-config
# ~/.ssh/config
Host mybox
  HostName shellbox.dev
  User mybox
```

Then in VSCode: Remote-SSH → mybox → full editor on remote files.

### Firefly observed

- [ ] **No SSH proxy** — raw IP only, changes on every ignite
- [ ] **No stable hostname** — can't add to SSH config permanently
- [ ] **No IDE integration guidance** — no docs on connecting editors

### Design spec (safari-approved)

**What Firefly should learn:** The SSH proxy is the enabler for everything else. If Firefly instances were reachable via `<name>@firefly.grove.place`:

1. Stable hostname in SSH config
2. VSCode Remote SSH works immediately
3. SCP/SFTP with human-readable addresses
4. Zed, JetBrains Gateway, etc. all work

**Implementation:** A lightweight SSH proxy (could be a dedicated Firefly gateway worker or a small always-on service) that:
- Accepts SSH connections to `<name>@firefly.grove.place`
- Looks up the current IP for `<name>` in KV
- If instance is paused/dormant, triggers wake-on-connect (like Shellbox)
- Forwards the SSH connection to the actual server

This is the **highest-leverage feature** from Shellbox. It unlocks IDE integration, stable addresses, and wake-on-connect all at once.

**Priority:** Critical (if Firefly targets human developers, not just machine consumers).

---

## 10. Provider Flexibility & Multi-Cloud

**Character**: _Firefly's superpower. Shellbox can't touch this._

### Shellbox observed

- [x] **Single provider** — Shellbox's own infrastructure, opaque to users
- [ ] **No provider choice** — you get what they give you
- [ ] **No region selection** — no visible region control
- [ ] **No custom images** — stock Linux only
- [ ] **No cloud-init** — no startup scripts

### Firefly observed

- [x] **Hetzner provider** — full implementation (177 lines), EU + US-East regions, cheapest VPS
- [x] **Fly.io provider** — full implementation (197 lines), ~5s cold start, container-native
- [x] **Provider interface** — `FireflyProvider` with provision/waitForReady/terminate/listActive
- [x] **Abstract base class** — `FireflyProviderBase` with token caching, retry logic, shared HTTP
- [x] **Warden credential resolution** — tokens resolved at runtime, not hardcoded
- [x] **Custom images** — any OS image, snapshot, or container
- [x] **Cloud-init support** — `userData` field for startup scripts
- [x] **Region selection** — per-ignite region choice
- [x] **Provider options escape hatch** — `providerOptions` for provider-specific tuning
- [ ] **Railway provider** — stub only
- [ ] **DigitalOcean provider** — stub only
- [ ] **No auto-provider selection** — consumer must choose manually

### Design spec (safari-approved)

**This is Firefly's castle.** Shellbox locks you into their infrastructure. Firefly lets you pick Hetzner for cost, Fly.io for speed, or mix providers per workload. The abstract `FireflyProvider` interface is clean and well-implemented. Hetzner and Fly.io are both production-quality.

**What Firefly should build on:**

1. **Provider auto-selection.** A `SmartProviderSelector` that picks the best provider based on constraints:

```typescript
const provider = selectProvider({
  priority: "cost",        // or "speed", "region"
  region: "us-east",
  minCpu: 2,
  minRam: 4096,
});
```

2. **Complete the provider catalog.** Railway and DigitalOcean stubs should become real implementations. Not urgent, but good for resilience.

**Priority:** Low (Hetzner + Fly.io cover most needs). Auto-selection is a nice-to-have.

---

## 11. Observability & Monitoring

**Character**: _Firefly has the instruments. Shellbox has... billing history._

### Shellbox observed

- [x] **Billing history** — `ssh shellbox.dev payments`
- [x] **Balance checking** — `ssh shellbox.dev billing`
- [ ] **No metrics dashboard** — no CPU/memory/network visibility
- [ ] **No session history** — no way to see past sessions
- [ ] **No alerts** — only balance-based auto-stop

### Firefly observed

- [x] **Structured event system** — 11 event types (ignite, fade, orphan_detected, sync_failed, etc.)
- [x] **FireflySession logging** — id, consumer, provider, duration, cost, status per session
- [x] **Vista integration** — metrics reporting (session duration, cost, sync count, idle duration)
- [x] **Firefly aggregator** — `firefly-aggregator.ts` queries pool status, job queue, session costs
- [x] **Admin dashboard** — `/arbor/vista/firefly/` in landing app
- [x] **Orphan detection metrics** — `firefly.orphaned.instances` tracked
- [x] **Cost tracking** — daily cost aggregation with budget alerts

### Design spec (safari-approved)

**Firefly crushes Shellbox here.** The event system, Vista integration, session logging, and admin dashboard give full visibility into every lifecycle event. Shellbox gives you a billing statement.

**What's already great in Firefly:**
- The event handler pattern (`onEvent`) is clean and extensible
- Session logging captures everything needed for billing and debugging
- The Vista aggregator provides real-time operational visibility
- Orphan detection with alerts prevents cost runaway

**No changes needed.** This is a strength to maintain, not a gap to fill.

---

## 12. Security Model

**Character**: _Both take security seriously, but through different lenses._

### Shellbox observed

- [x] **SSH key authentication only** — no passwords
- [x] **Multi-device key management** — add/remove keys via SSH commands
- [x] **Key fingerprint tracking** — shows fingerprint + type + comment for each key
- [ ] **No network isolation details** — opaque infrastructure
- [ ] **No credential rotation** — keys persist until manually removed
- [ ] **No audit logging** — no visibility into access history

### Firefly observed

- [x] **Ephemeral credentials** — per-session tokens injected at ignite, destroyed at fade
- [x] **Warden credential gateway** — no raw API keys in worker environments
- [x] **Network isolation** — firewall rules configured per-workload via cloud-init
- [x] **Audit trail** — every ignite, fade, and orphan event logged to D1
- [x] **Sensitive data cleanup** — `shred -u /root/.credentials` in fade sequence
- [x] **Provider credential isolation** — tokens in Cloudflare Secrets, never logged
- [x] **Token caching with TTL** — Warden tokens cached briefly, not permanently
- [ ] **No SSH proxy auth** — no centralized access control layer (yet)

### Design spec (safari-approved)

**Firefly's ephemeral credential model is superior.** Every session starts fresh. Credentials are injected, used, and destroyed. The Warden gateway adds another layer — even the worker that provisions servers doesn't hold raw provider API keys.

**What Firefly should add:**

1. **SSH access audit.** When the SSH proxy exists, log every connection (who, when, duration, source IP). Store in OBS_DB alongside sentinel data.

2. **Time-bounded SSH keys.** Auto-expire SSH keys on instances after N hours. Fresh keys per session.

**Priority:** Low (security posture is already strong).

---

## Expedition Summary

### By the numbers

| Metric | Count |
|--------|-------|
| Total stops | 12 |
| Firefly strengths (ahead of Shellbox) 🟢 | 4 |
| Shellbox strengths (ahead of Firefly) 🟡 | 5 |
| Both strong 🟢🟢 | 2 |
| Neither strong 🔴 | 1 |
| Total lessons for Firefly | 19 |

### Condition assessment

| Area | Firefly Status | Shellbox Advantage |
|------|---------------|-------------------|
| Core architecture | 🟢 Thriving | Different philosophy, not better |
| User experience | 🔴 Barren (for humans) | Massive — SSH-first UX |
| State persistence | 🟠 Wilting | Pause/resume is magic |
| Networking | 🟠 Wilting | Auto-HTTPS + stable URLs |
| Idle/wake management | 🟡 Growing | Wake-on-HTTP is killer |
| Scheduled execution | 🟡 Growing | Cron mode is simple |
| Pricing model | 🟢 Thriving | Prepaid balance UX is nice |
| Box management | 🟠 Wilting | Named instances + duplication |
| IDE integration | 🔴 Barren | SSH proxy enables everything |
| Provider flexibility | 🟢 Thriving (Firefly wins) | Shellbox can't compete |
| Observability | 🟢 Thriving (Firefly wins) | Shellbox barely has this |
| Security | 🟢 Thriving (Firefly wins) | Ephemeral credentials > static keys |

### Recommended trek order (what to build)

**Phase 1 — The SSH Gateway (Critical)**
1. SSH proxy at `firefly.grove.place` — stable hostnames, wake-on-connect
2. Named instances — human-readable names instead of UUIDs
3. `gw firefly` CLI — create, list, ssh, stop, delete

**Phase 2 — Lifecycle Enrichment (High)**
4. Pause/resume (Fly.io native stop/start; Hetzner snapshot-based)
5. Wake-on-HTTP via Cloudflare Worker + loading page
6. Keepalive mode flag

**Phase 3 — Developer Polish (Medium)**
7. Auto-HTTPS routing via Cloudflare (`<name>.firefly.grove.place`)
8. Box duplication via R2 state copy
9. IDE integration docs (VSCode Remote SSH, Zed)

**Phase 4 — Multi-Tenant (Future)**
10. Per-tenant billing with prepaid balance
11. Spending caps and auto-stop
12. Tenant self-service dashboard

### Cross-cutting themes

1. **The SSH proxy is the keystone.** It unlocks stable hostnames, IDE integration, wake-on-connect, and human-friendly UX all at once. Without it, every other human-facing feature is awkward.

2. **Firefly's SDK model is its moat.** Shellbox is a product. Firefly is a toolkit. The SDK's composability (swap providers, stores, sync layers) is why it can serve CI runners, AI agents, game servers, AND dev boxes. Don't sacrifice this flexibility for convenience — add convenience layers on top.

3. **Pause/resume is the expectation.** Developers expect "disconnect and reconnect later." Firefly's terminate-and-rehydrate model is an abstraction that leaks badly for human users. Fly.io's machine stop/start gets closest to true pause — lean into that provider for dev box use.

4. **Shellbox is an excellent product with shallow infrastructure.** Single provider, no multi-cloud, no composability, no self-hosting. If Shellbox goes down or changes pricing, users have no recourse. Firefly's self-hosted sovereignty is a genuine advantage for anyone who cares about control.

5. **The two creatures complement each other.** Firefly could power a Shellbox-like experience while keeping its SDK backbone. The dream: `gw firefly create mybox` → SSH proxy → auto-HTTPS → wake-on-demand → pause on disconnect → all backed by the multi-cloud Firefly SDK running on your own Cloudflare infrastructure.

---

_The fire dies to embers. The journal is full — 12 stops, 19 lessons sketched, the whole landscape mapped. Shellbox showed us what polish looks like. Firefly has the bones to surpass it — with the SSH gateway as the keystone. Tomorrow, the animals go to work. But tonight? Tonight was the drive. And it was glorious._ 🚙

---

_Safari completed: March 2, 2026_
_Observed: Shellbox (shellbox.dev) vs Firefly (`@autumnsgrove/lattice/firefly`)_
_Journal by: Claude Opus 4.6_
