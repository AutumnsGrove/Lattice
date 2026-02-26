---
aliases: []
date created: Thursday, February 26th 2026
date modified: Thursday, February 26th 2026
tags:
  - infrastructure
  - cloudflare-agents
  - durable-objects
  - lattice
type: tech-spec
---

```
              ╭─── · ───╮
           ╭──┤  ╭───╮  ├──╮
        ╭──┤  │  │ ♦ │  │  ├──╮
       │   │  │  ╰─┬─╯  │  │   │
       │   │  ╰────┼────╯  │   │
       │   ╰───────┼───────╯   │
       ╰───────────┼───────────╯
                   │
            ╭──────┴──────╮
            │  ░░░░░░░░░  │
            │  ░ GROVE ░  │
            │  ░ AGENT ░  │
            │  ░░░░░░░░░  │
            ╰─────────────╯
          ╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱
         ───────────────────
        ~~~ roots go deep ~~~

    A tree with a heartbeat.
    Loom gave it structure. Agents give it life.
```

> *Roots go deep. The canopy reaches.*

# GroveAgent: Autonomous Agent Framework

The bridge between Grove's Durable Object patterns and Cloudflare's Agents SDK. GroveAgent wraps the SDK's `Agent` and `AIChatAgent` base classes with Grove conventions: Signpost error codes, structured logging, observability events, and the patterns that make Grove code feel like Grove code.

Loom gave our Durable Objects structure. GroveAgent gives them autonomy. They schedule their own work. They wake themselves up. They talk to each other through MCP. They remember conversations. They persist state that syncs to connected clients in real time.

**Public Name:** GroveAgent
**Internal Name:** GroveAgent
**Package:** `@autumnsgrove/grove-agent`
**Location:** `libs/grove-agent/`
**Last Updated:** February 2026

A Loom DO waits for requests. A GroveAgent acts on its own. The same forest, a new kind of creature.

---

## Overview

### What This Is

A separate npm package (`@autumnsgrove/grove-agent`) providing two base classes for building autonomous agents on Cloudflare's Agents SDK. It layers Grove conventions on top of the SDK without hiding the SDK's power. Any Grove worker that needs scheduling, persistent state sync, chat, MCP, or durable workflows extends one of these classes instead of the raw SDK.

### Goals

- Provide `GroveAgent` (extends `Agent`) for task agents: scheduling, queues, state, MCP
- Provide `GroveChatAgent` (extends `AIChatAgent`) for conversational agents: persistent chat, streaming, tools
- Share Grove conventions (logging, errors, observability) via `groveInit()`
- Keep the SDK's full API surface accessible. No hiding, no wrapping, no re-inventing
- Stay separate from the engine. Only workers that ARE agents pull in this dependency

### Non-Goals (Out of Scope)

- Replacing Loom. Existing LoomDO subclasses stay on Loom until they need agent features
- Wrapping every SDK method. GroveAgent extends, it does not encapsulate
- Client-side code. React hooks (`useAgent`, `useAgentChat`) come from the SDK directly
- AI model selection. That stays in Lumen. GroveAgent provides the plumbing, Lumen provides the brains

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   @autumnsgrove/grove-agent                      │
│                                                                  │
│  ┌──────────────────────┐     ┌──────────────────────┐          │
│  │     GroveAgent        │     │   GroveChatAgent      │          │
│  │  extends Agent<E,S>   │     │  extends AIChatAgent  │          │
│  │                       │     │                       │          │
│  │  + this.log           │     │  + this.log           │          │
│  │  + this.observe()     │     │  + this.observe()     │          │
│  │  + groveConfig()      │     │  + groveConfig()      │          │
│  └───────────┬───────────┘     └───────────┬───────────┘          │
│              └───────────┬─────────────────┘                      │
│                          │                                        │
│                   groveInit()                                     │
│              (shared convention layer)                             │
└──────────────────────────┬────────────────────────────────────────┘
                           │ extends
              ┌────────────┴────────────┐
              │                         │
    ┌─────────┴──────────┐   ┌─────────┴──────────┐
    │   Agent (CF SDK)    │   │ AIChatAgent (CF SDK)│
    │   from "agents"     │   │ from "@cf/ai-chat"  │
    └─────────┬──────────┘   └─────────┬──────────┘
              └────────────┬────────────┘
                  ┌────────┴────────┐
                  │  Server          │
                  │  (PartyServer)   │
                  └────────┬────────┘
                  ┌────────┴────────┐
                  │ DurableObject    │
                  │ (Cloudflare)     │
                  └─────────────────┘
```

### Coexistence with Loom

```
QUESTION: Does this DO need to act on its own?
    │
    ├── NO → Use LoomDO (existing pattern)
    │        Examples: PostContentDO, PostMetaDO
    │        "It waits for requests and responds."
    │
    └── YES → Use GroveAgent or GroveChatAgent
             Examples: OnboardingAgent, FiresideAgent, VistaAgent
             "It wakes itself up, schedules work, syncs state."

QUESTION: Does it need persistent conversations?
    │
    ├── YES → GroveChatAgent
    │        Examples: FiresideAgent, WispAgent
    │
    └── NO → GroveAgent
             Examples: OnboardingAgent, VistaAgent, MeadowPollerAgent
```

### Dependency Flow

```
Workers / Services that ARE agents
         │
         ├──▶ @autumnsgrove/grove-agent    (this package)
         │         │
         │         ├──▶ agents             (Cloudflare Agents SDK)
         │         │      ├──▶ partyserver
         │         │      ├──▶ @modelcontextprotocol/sdk
         │         │      ├──▶ cron-schedule
         │         │      └──▶ nanoid
         │         │
         │         ├──▶ @cloudflare/ai-chat (AIChatAgent)
         │         │
         │         └──▶ @autumnsgrove/lattice (Grove conventions only)
         │                  └──▶ Signpost errors, GroveErrorDef type
         │
         └──▶ @autumnsgrove/infra          (optional, for D1/R2/KV)
```

SvelteKit apps (plant, meadow, landing) never import this package. Only workers and services that need agent capabilities.

### Tech Stack

| Component | Technology | Why |
|---|---|---|
| Base classes | Cloudflare Agents SDK v0.6+ | Scheduling, state sync, MCP, queues, workflows |
| Chat | @cloudflare/ai-chat | Persistent conversations, resumable streams, tools |
| Logging | AgentLogger (adapted from LoomLogger) | Structured, DO-aware logging |
| Errors | Signpost pattern (from engine) | GROVE-AGENT-XXX error codes |
| Runtime | Cloudflare Workers | Durable Objects with SQLite, WebSocket, hibernation |

---

## Package Structure

```
libs/grove-agent/
├── src/
│   ├── index.ts              # Barrel exports
│   ├── grove-agent.ts        # GroveAgent class
│   ├── grove-chat-agent.ts   # GroveChatAgent class
│   ├── init.ts               # groveInit() shared convention layer
│   ├── logger.ts             # AgentLogger
│   ├── errors.ts             # GROVE_AGENT_ERRORS catalog
│   ├── observability.ts      # GroveObservability bridge
│   └── types.ts              # Shared type definitions
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Exports

```json
{
  "name": "@autumnsgrove/grove-agent",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  }
}
```

Single entry point. Both classes, the error catalog, types, and the `callable` re-export all come from `"."`.

---

## API Reference

### GroveAgent

The base class for non-chat agents. Scheduling, queues, state sync, MCP.

```typescript
import { Agent } from "agents";
import type { AgentContext, Connection, ConnectionContext } from "agents";
import { groveInit } from "./init.js";
import { AgentLogger } from "./logger.js";
import type { GroveAgentConfig, GroveObservabilityEvent } from "./types.js";

export abstract class GroveAgent<
  Env extends Record<string, unknown> = Record<string, unknown>,
  State = unknown,
> extends Agent<Env, State> {
  readonly log: AgentLogger;

  /** Override to configure the agent. */
  abstract groveConfig(): GroveAgentConfig;

  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
    const config = this.groveConfig();
    this.log = new AgentLogger(config.name, this.name);
    groveInit(this, config);
  }

  /** Emit a structured observability event. */
  protected observe(event: GroveObservabilityEvent): void {
    this.log.info(event.type, event.data);
    this.observability?.emit({
      id: crypto.randomUUID(),
      type: event.type,
      displayMessage: event.message,
      timestamp: Date.now(),
      payload: event.data ?? {},
    });
  }

  /** Signpost-patterned error logging. */
  onError(error: unknown): unknown {
    this.log.errorWithCause("Agent error", error);
    return error;
  }

  /** Lifecycle logging. Override in subclass, call super if you want logs. */
  async onStart(): Promise<void> {
    this.log.info("Agent started");
  }

  onConnect(connection: Connection, ctx: ConnectionContext): void {
    this.log.debug("Client connected", { connectionId: connection.id });
  }

  onClose(connection: Connection, code: number, reason: string, wasClean: boolean): void {
    this.log.debug("Client disconnected", { connectionId: connection.id, code, wasClean });
  }
}
```

**What you inherit from the SDK's `Agent` (nothing hidden):**

| SDK Feature | Method | Description |
|---|---|---|
| State | `this.state`, `setState()` | Persistent state with auto WebSocket sync |
| SQL | `` this.sql`...` `` | Tagged template SQLite queries |
| Scheduling | `schedule()`, `scheduleEvery()` | Cron, delay, interval, one-shot |
| Schedule mgmt | `getSchedule()`, `getSchedules()`, `cancelSchedule()` | Inspect and cancel |
| Task queue | `queue()`, `dequeue()`, `dequeueAll()` | Async tasks with retry |
| MCP client | `addMcpServer()`, `removeMcpServer()` | Connect to external MCP servers |
| RPC | `@callable()` decorator | Type-safe client invocation over WebSocket |
| WebSocket | `broadcast()`, `getConnections()` | Real-time client communication |
| Email | `onEmail()`, `replyToEmail()` | Native email handling |
| Destroy | `this.destroy()` | Clean up all tables and alarms |

**What GroveAgent adds:**

| Grove Feature | Description |
|---|---|
| `this.log` | Structured logging with agent name and instance ID |
| `this.observe()` | Emit typed observability events |
| `groveConfig()` | Agent configuration (name, description) |
| `onError()` override | Signpost-patterned error logging |
| Lifecycle logging | Auto debug logs for onStart, onConnect, onClose |

### GroveChatAgent

The base class for conversational agents. Persistent chat, resumable streams, tools.

```typescript
import { AIChatAgent } from "@cloudflare/ai-chat";
import type { AgentContext, Connection, ConnectionContext } from "agents";
import { groveInit } from "./init.js";
import { AgentLogger } from "./logger.js";
import type { GroveAgentConfig, GroveObservabilityEvent } from "./types.js";

export abstract class GroveChatAgent<
  Env extends Record<string, unknown> = Record<string, unknown>,
  State = unknown,
> extends AIChatAgent<Env, State> {
  readonly log: AgentLogger;

  abstract groveConfig(): GroveAgentConfig;

  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
    const config = this.groveConfig();
    this.log = new AgentLogger(config.name, this.name);
    groveInit(this, config);
  }

  protected observe(event: GroveObservabilityEvent): void {
    this.log.info(event.type, event.data);
    this.observability?.emit({
      id: crypto.randomUUID(),
      type: event.type,
      displayMessage: event.message,
      timestamp: Date.now(),
      payload: event.data ?? {},
    });
  }

  onError(error: unknown): unknown {
    this.log.errorWithCause("Chat agent error", error);
    return error;
  }
}
```

**What `AIChatAgent` adds on top of `Agent`:**

| SDK Feature | Method | Description |
|---|---|---|
| Chat messages | `this.messages` | Full conversation history (UIMessage[]) |
| Chat handler | `onChatMessage(onFinish?, options?)` | Override to handle chat requests |
| Persistence | `persistMessages()`, `saveMessages()` | Store and trigger chat |
| Resumable streams | Automatic | Reconnect picks up mid-stream |
| Tool support | Server, client, approval-gated | Full tool framework |
| Data parts | Writer API | Stream structured data alongside text |
| Multi-client | Automatic | All clients see the same conversation |

### groveInit()

Shared convention initializer. Called in both constructors.

```typescript
export function groveInit(
  agent: { log: AgentLogger },
  config: GroveAgentConfig,
): void {
  agent.log.debug("Grove agent initializing", {
    name: config.name,
    description: config.description,
  });
}
```

Intentionally thin today. This is the seam where future conventions plug in: metrics collection, feature flag checks, tenant context injection. One function, both classes, zero duplication.

### AgentLogger

Adapted from LoomLogger for the agent context. Same structured JSON output, same API surface.

```typescript
export class AgentLogger {
  constructor(
    private readonly agentName: string,
    private readonly instanceName: string,
  ) {}

  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  errorWithCause(message: string, cause: unknown, data?: Record<string, unknown>): void;
}
```

Emits JSON with auto-included fields:

```json
{
  "agent": "OnboardingAgent",
  "instance": "user_abc123",
  "level": "info",
  "message": "Day 7 email sent",
  "timestamp": "2026-02-26T..."
}
```

Maps log levels to `console.debug`, `console.log`, `console.warn`, `console.error`.

### Error Catalog

```
Format: GROVE-AGENT-XXX
Ranges:
  001-019  Initialization & lifecycle
  020-039  Scheduling & queues
  040-059  State & storage
  060-079  Communication (WebSocket, MCP, email)
  080-099  Internal / catch-all
```

| Code | Name | Category | Admin Message |
|---|---|---|---|
| GROVE-AGENT-001 | INIT_FAILED | bug | Agent initialization failed in onStart() |
| GROVE-AGENT-002 | CONFIG_INVALID | bug | groveConfig() returned invalid configuration |
| GROVE-AGENT-020 | SCHEDULE_FAILED | bug | schedule() or scheduleEvery() call failed |
| GROVE-AGENT-021 | QUEUE_FAILED | bug | queue() call failed |
| GROVE-AGENT-022 | CALLBACK_FAILED | bug | Scheduled or queued callback threw an error |
| GROVE-AGENT-040 | STATE_INVALID | bug | State validation rejected an update |
| GROVE-AGENT-041 | SQL_FAILED | bug | SQL query failed in agent storage |
| GROVE-AGENT-060 | MCP_CONNECTION_FAILED | bug | addMcpServer() failed to establish connection |
| GROVE-AGENT-061 | EMAIL_SEND_FAILED | bug | Email send or reply failed |
| GROVE-AGENT-080 | INTERNAL_ERROR | bug | Unhandled error in agent execution |

All errors use the `GroveErrorDef` type from `@autumnsgrove/lattice/errors`.

---

## Types

```typescript
/** Configuration returned by groveConfig(). */
export interface GroveAgentConfig {
  /** Human-readable agent name, used in logs and error context. */
  name: string;
  /** Brief description of what this agent does. */
  description?: string;
}

/** A structured observability event. */
export interface GroveObservabilityEvent {
  /** Event type identifier (e.g. "email.sent", "schedule.fired"). */
  type: string;
  /** Human-readable message for dashboards. */
  message: string;
  /** Arbitrary event data. */
  data?: Record<string, unknown>;
}
```

---

## Loom vs GroveAgent — Feature Comparison

| Feature | LoomDO | GroveAgent | GroveChatAgent |
|---|---|---|---|
| SQL storage | `this.sql.exec()` | `` this.sql`...` `` | `` this.sql`...` `` |
| KV store | `this.store.get/set()` | `this.state` + `setState()` | `this.state` + `setState()` |
| WebSocket | `this.sockets.accept()` | Built-in + auto sync | Built-in + auto sync |
| Scheduling | `this.alarms.ensureScheduled()` | `schedule()`, `scheduleEvery()`, cron | `schedule()`, `scheduleEvery()`, cron |
| Task queue | `this.emit()` to CF Queue | `queue()` with retry | `queue()` with retry |
| Routing | `routes()` declarative | `onRequest()` + `@callable()` RPC | `onChatMessage()` + `@callable()` |
| Logging | `this.log` (LoomLogger) | `this.log` (AgentLogger) | `this.log` (AgentLogger) |
| Errors | GROVE-LOOM-XXX | GROVE-AGENT-XXX | GROVE-AGENT-XXX |
| State sync | Manual broadcast | `setState()` auto-broadcasts | `setState()` auto-broadcasts |
| Workflows | `this.workflow()` | SDK `AgentWorkflow` class | SDK `AgentWorkflow` class |
| MCP | N/A | `addMcpServer()` client + server | `addMcpServer()` client + server |
| Chat | N/A | N/A | `this.messages`, resumable streams |
| Email | N/A | `onEmail()`, `replyToEmail()` | `onEmail()`, `replyToEmail()` |
| Browser | N/A | Puppeteer binding | Puppeteer binding |
| Client hooks | N/A | `useAgent()` | `useAgentChat()` |
| Dirty tracking | `markDirty()` + `persistIfDirty()` | N/A (state auto-persists) | N/A (state auto-persists) |
| Lock dedup | `this.locks.withLock()` | N/A (use `queue()`) | N/A (use `queue()`) |
| Hibernation | Opt-in via config | On by default | On by default |

### What Loom Has That We Intentionally Do Not Port

| Loom Feature | Why Not Ported | SDK Alternative |
|---|---|---|
| `markDirty()` / `persistIfDirty()` | SDK auto-persists via `setState()` | State writes are immediate |
| `PromiseLockMap` | SDK queues are FIFO and sequential | Use `queue()` for serialized work |
| `JsonStore` | SDK has `this.state` with auto-sync | State is the primary KV mechanism |
| `matchRoute()` declarative router | SDK uses `onRequest()` + `@callable()` | RPC replaces most HTTP routes |
| `LoomResponse` helpers | SDK handles responses internally | Return from `@callable()` methods |
| `blockConcurrencyWhile` init | SDK creates tables in constructor | Tables created automatically |

---

## Usage Examples

### OnboardingAgent (GroveAgent) — First Consumer

```typescript
import { callable } from "agents";
import { GroveAgent } from "@autumnsgrove/grove-agent";
import type { GroveAgentConfig } from "@autumnsgrove/grove-agent";

interface OnboardingState {
  userId: string | null;
  audience: "wanderer" | "promo" | "rooted" | null;
  emailsSent: Array<{ day: number; sentAt: number }>;
  unsubscribed: boolean;
}

export class OnboardingAgent extends GroveAgent<Env, OnboardingState> {
  initialState: OnboardingState = {
    userId: null, audience: null, emailsSent: [], unsubscribed: false,
  };

  groveConfig(): GroveAgentConfig {
    return { name: "OnboardingAgent", description: "Email onboarding sequences" };
  }

  @callable({ description: "Start the onboarding email sequence" })
  async startSequence(userId: string, audience: OnboardingState["audience"]) {
    this.setState({ ...this.state, userId, audience });
    this.observe({ type: "onboarding.started", message: "Sequence started", data: { userId, audience } });

    // Schedule the entire sequence upfront
    await this.schedule(0, "sendEmail", { day: 0 });
    if (audience === "rooted") await this.schedule(86400, "sendEmail", { day: 1 });
    await this.schedule(604800, "sendEmail", { day: 7 });
    if (audience === "wanderer") {
      await this.schedule(1209600, "sendEmail", { day: 14 });
      await this.schedule(2592000, "sendEmail", { day: 30 });
    }
  }

  async sendEmail(payload: { day: number }) {
    if (this.state.unsubscribed) return;
    await this.env.ZEPHYR.fetch(new Request("https://zephyr/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "sequence", template: `day${payload.day}`,
        audience: this.state.audience, userId: this.state.userId,
      }),
    }));
    this.setState({
      ...this.state,
      emailsSent: [...this.state.emailsSent, { day: payload.day, sentAt: Date.now() }],
    });
    this.observe({ type: "email.sent", message: `Day ${payload.day} email sent` });
  }

  @callable({ description: "Unsubscribe from onboarding emails" })
  async unsubscribe() {
    this.setState({ ...this.state, unsubscribed: true });
    for (const s of this.getSchedules()) await this.cancelSchedule(s.id);
    this.observe({ type: "onboarding.unsubscribed", message: "User unsubscribed" });
  }

  @callable({ description: "Get current onboarding status" })
  getStatus() {
    return {
      audience: this.state.audience,
      emailsSent: this.state.emailsSent,
      unsubscribed: this.state.unsubscribed,
      pendingSchedules: this.getSchedules().length,
    };
  }
}
```

### FiresideAgent (GroveChatAgent) — First Chat Agent

```typescript
import { streamText } from "ai";
import { GroveChatAgent } from "@autumnsgrove/grove-agent";
import type { GroveAgentConfig } from "@autumnsgrove/grove-agent";

interface FiresideState {
  phase: "warming-up" | "conversing" | "drafting" | "complete";
  messageCount: number;
  draftReady: boolean;
}

export class FiresideAgent extends GroveChatAgent<Env, FiresideState> {
  initialState: FiresideState = {
    phase: "warming-up", messageCount: 0, draftReady: false,
  };

  groveConfig(): GroveAgentConfig {
    return { name: "FiresideAgent", description: "Conversational writing mode" };
  }

  async onChatMessage(onFinish) {
    const messageCount = this.messages.length;
    this.setState({
      ...this.state,
      phase: messageCount >= 6 ? "conversing" : "warming-up",
      messageCount,
      draftReady: messageCount >= 6,
    });

    const response = streamText({
      model: this.env.AI, // Or route through Lumen
      messages: this.messages,
      system: FIRESIDE_SYSTEM_PROMPT,
    });
    return response.toDataStreamResponse();
  }
}
```

---

## Wrangler Configuration

Every agent worker needs a Durable Object migration in its `wrangler.toml`:

```toml
name = "grove-onboarding"
main = "src/index.ts"
compatibility_date = "2025-12-01"

[durable_objects]
bindings = [
  { name = "ONBOARDING_AGENT", class_name = "OnboardingAgent" }
]

[[migrations]]
tag = "v1"
new_sqlite_classes = ["OnboardingAgent"]

# Service bindings
[services]
ZEPHYR = { service = "grove-zephyr" }
```

The worker entry point routes requests to the agent:

```typescript
import { routeAgentRequest } from "agents";
import { OnboardingAgent } from "./agent.js";

export { OnboardingAgent };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routeAgentRequest(request, env)) ??
      new Response("Not found", { status: 404 })
    );
  },
};
```

---

## Security Considerations

- **Agent isolation.** Each instance is a separate Durable Object. Data does not leak between instances. OnboardingAgent for user A cannot see user B's state.
- **No raw API keys in agents.** AI credentials route through Lumen or Warden. Agents never hold raw provider keys.
- **State validation.** Use the SDK's `validateStateChange()` to reject invalid state updates from clients. Never trust client-initiated state changes without validation.
- **WebSocket auth.** Override `onConnect()` to validate tokens. Reject unauthorized connections with `connection.close(4001, "Unauthorized")`.
- **Email safety.** Agents with `onEmail()` must validate sender and content. Do not auto-reply to untrusted senders.
- **MCP server trust.** Only connect to MCP servers you control. External MCP tools execute in the agent's context.

---

## Implementation Checklist

### Phase 1: Package Scaffolding

- [ ] Create `libs/grove-agent/` directory structure
- [ ] Write `package.json` with deps: `agents`, `@cloudflare/ai-chat`, `@autumnsgrove/lattice`
- [ ] Write `tsconfig.json` extending base config
- [ ] Add to `pnpm-workspace.yaml`
- [ ] Implement `AgentLogger` (adapted from LoomLogger)
- [ ] Implement `GROVE_AGENT_ERRORS` catalog
- [ ] Implement `groveInit()` shared convention layer
- [ ] Implement `GroveAgent` base class
- [ ] Implement `GroveChatAgent` base class
- [ ] Implement `types.ts` with config and event types
- [ ] Write barrel exports in `index.ts`
- [ ] Run `pnpm install` and verify workspace resolution
- [ ] Type-check passes (`tsc --noEmit`)

### Phase 2: First Consumer (OnboardingAgent)

- [ ] Create `workers/onboarding/` with `wrangler.toml`
- [ ] Implement `OnboardingAgent` extending `GroveAgent`
- [ ] Wire up Zephyr service binding for email sends
- [ ] Implement `startSequence()` with `schedule()` calls
- [ ] Implement `sendEmail()` callback
- [ ] Implement `unsubscribe()` with `cancelSchedule()`
- [ ] Implement `getStatus()` for admin queries
- [ ] Worker entry point with `routeAgentRequest()`
- [ ] Local dev test with `wrangler dev`
- [ ] Deploy to staging

### Phase 3: Email Migration

- [ ] Update signup flow to create OnboardingAgent instance per user
- [ ] Verify Day 0 email sends immediately
- [ ] Verify scheduled emails fire on time
- [ ] Implement unsubscribe endpoint that calls agent
- [ ] Disable deprecated `onboarding-emails` worker cron
- [ ] Disable `email-catchup` worker cron
- [ ] Monitor for 1 week
- [ ] Archive both deprecated workers

---

*Loom taught the trees to stand. GroveAgent teaches them to breathe.*
