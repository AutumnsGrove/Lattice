---
title: "GroveAgent SDK Developer Guide"
description: "How to build, configure, and debug autonomous agents using the GroveAgent base classes."
category: guides
guideCategory: infrastructure
lastUpdated: "2026-03-12"
aliases: []
tags:
  - grove-agent
  - sdk
  - agents
  - ai
  - durable-objects
---

# GroveAgent SDK Developer Guide

How to build autonomous agents on Cloudflare's Agents SDK using the GroveAgent base classes. This guide covers `GroveAgent` (task agents) and `GroveChatAgent` (conversational agents), their shared convention layer, and the patterns that keep agent code feeling like Grove code.

## How It Works

The GroveAgent SDK lives at `libs/grove-agent/` and ships as `@autumnsgrove/grove-agent`. It provides two abstract base classes that extend the Cloudflare Agents SDK with Grove conventions: structured logging, Signpost error codes, and observability events.

The class hierarchy:

```
DurableObject (Cloudflare)
  └─ Server (PartyServer)
       ├─ Agent (agents SDK)
       │    └─ GroveAgent        ← task agents
       └─ AIChatAgent (@cloudflare/ai-chat)
            └─ GroveChatAgent    ← chat agents
```

**GroveAgent** extends `Agent` from the `agents` package. Use it when your Durable Object needs to schedule its own work, sync state to connected clients, handle queues, or expose MCP tools, but does not need persistent chat.

**GroveChatAgent** extends `AIChatAgent` from `@cloudflare/ai-chat`. Use it when your agent needs persistent conversations with resumable streams, tool calling, and multi-client message sync.

Both classes share the same constructor pattern:

1. Call `super(ctx, env)`
2. Call `this.groveConfig()` to get the agent's configuration
3. Create an `AgentLogger` with the config name and a lazy instance name getter
4. Run `groveInit(this, config)` for shared convention setup

Everything the SDK provides (scheduling, state, SQL, WebSockets, MCP, email, RPC) stays fully accessible. GroveAgent adds conventions on top, never hides what's underneath.

### When to Use GroveAgent vs Loom

A LoomDO waits for requests and responds. A GroveAgent acts on its own.

If your Durable Object receives requests and returns responses (like `PostContentDO` or `PostMetaDO`), keep it on Loom. If it needs to wake itself up, schedule future work, sync state to browsers in real time, or maintain persistent conversations, reach for GroveAgent.

### Single Entry Point

The package exports everything from `@autumnsgrove/grove-agent`. You never need to import from `"agents"` directly for the common symbols:

```typescript
import {
  GroveAgent,
  GroveChatAgent,
  callable,
  routeAgentRequest,
  getAgentByName,
  AgentLogger,
  GROVE_AGENT_ERRORS,
} from "@autumnsgrove/grove-agent";

import type {
  GroveAgentConfig,
  GroveObservabilityEvent,
  Connection,
  ConnectionContext,
  Schedule,
  AgentLogLevel,
  AgentLogEntry,
  AgentErrorKey,
} from "@autumnsgrove/grove-agent";
```

## Building a Task Agent

### 1. Define your state and config

```typescript
import { GroveAgent, callable } from "@autumnsgrove/grove-agent";
import type { GroveAgentConfig } from "@autumnsgrove/grove-agent";

interface OnboardingState {
  userId: string | null;
  audience: "wanderer" | "promo" | "rooted" | null;
  emailsSent: Array<{ day: number; sentAt: number }>;
  unsubscribed: boolean;
}

export class OnboardingAgent extends GroveAgent<Env, OnboardingState> {
  initialState: OnboardingState = {
    userId: null,
    audience: null,
    emailsSent: [],
    unsubscribed: false,
  };

  groveConfig(): GroveAgentConfig {
    return {
      name: "OnboardingAgent",
      description: "Email onboarding sequences",
    };
  }
}
```

The `Env` type parameter is your worker's environment bindings. The `State` type parameter defines the shape of `this.state`, which auto-syncs to connected WebSocket clients when you call `setState()`.

### 2. Add callable methods

The `@callable()` decorator marks methods that clients can invoke over WebSocket through the SDK's RPC system.

```typescript
@callable({ description: "Start the onboarding email sequence" })
async startSequence(userId: string, audience: OnboardingState["audience"]) {
  this.setState({ ...this.state, userId, audience });
  this.observe({
    type: "onboarding.started",
    message: "Sequence started",
    data: { userId, audience },
  });

  await this.schedule(0, "sendEmail", { day: 0 });
  await this.schedule(604800, "sendEmail", { day: 7 });
}
```

The `@callable()` decorator requires `experimentalDecorators: true` in your `tsconfig.json`. The GroveAgent package's own tsconfig already sets this, but consumer workers need it too.

### 3. Wire up the worker entry point

```typescript
import { routeAgentRequest } from "@autumnsgrove/grove-agent";
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

### 4. Configure wrangler.toml

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
```

Every agent needs a `new_sqlite_classes` migration entry. The SDK uses SQLite for internal state persistence, scheduling, and queue management.

## Building a Chat Agent

Chat agents get everything task agents have, plus persistent conversation history, resumable streams, and tool support.

```typescript
import { streamText } from "ai";
import { GroveChatAgent } from "@autumnsgrove/grove-agent";
import type { GroveAgentConfig } from "@autumnsgrove/grove-agent";

interface FiresideState {
  phase: "warming-up" | "conversing" | "drafting" | "complete";
  messageCount: number;
}

export class FiresideAgent extends GroveChatAgent<Env, FiresideState> {
  initialState: FiresideState = {
    phase: "warming-up",
    messageCount: 0,
  };

  groveConfig(): GroveAgentConfig {
    return {
      name: "FiresideAgent",
      description: "Conversational writing mode",
    };
  }

  async onChatMessage(onFinish) {
    const messageCount = this.messages.length;
    this.setState({
      ...this.state,
      phase: messageCount >= 6 ? "conversing" : "warming-up",
      messageCount,
    });

    const response = streamText({
      model: this.env.AI,
      messages: this.messages,
      system: FIRESIDE_SYSTEM_PROMPT,
    });
    return response.toDataStreamResponse();
  }
}
```

`GroveChatAgent` gives you `this.messages` (full conversation history as `UIMessage[]`), automatic message persistence, and resumable streaming. If a Wanderer's connection drops mid-stream, reconnecting picks up right where it left off. All clients connected to the same instance see the same conversation in real time.

## The groveConfig() Constraint

This is the single most important thing to understand about GroveAgent.

`groveConfig()` runs during `super()`, which means it executes before your subclass field initializers have completed. You cannot reference `this` inside `groveConfig()`. Return a plain object literal.

This works:

```typescript
groveConfig(): GroveAgentConfig {
  return { name: "OnboardingAgent", description: "Email sequences" };
}
```

This breaks:

```typescript
groveConfig(): GroveAgentConfig {
  // this.agentName is undefined here because field initializers
  // haven't run yet when the constructor calls groveConfig()
  return { name: this.agentName };
}
```

The config is intentionally minimal: `name` (required) and `description` (optional). The `name` flows into every log entry and error context for this agent.

## Observability

Both base classes expose a `protected observe()` method for emitting structured events:

```typescript
this.observe({
  type: "email.sent",
  message: "Day 7 email sent",
  data: { userId: "u_123", day: 7 },
});
```

Events are defined by the `GroveObservabilityEvent` interface:

- `type`: A dot-separated identifier like `"email.sent"` or `"schedule.fired"`
- `message`: Human-readable text for dashboards
- `data`: Optional key-value pairs

Today, `observe()` logs via `AgentLogger` at info level with an `[observe]` prefix. The implementation lives in `observability.ts` as the standalone `emitObservabilityEvent()` function, shared between both base classes. When the Cloudflare Agents SDK adds its own observability API, this method will also emit to the SDK's event system without changing any consumer code.

## Logging

`AgentLogger` is adapted from LoomLogger for the agent context. Every log entry is structured JSON with auto-included fields:

```json
{
  "agent": "OnboardingAgent",
  "instance": "user_abc123",
  "level": "info",
  "message": "Day 7 email sent",
  "timestamp": "2026-02-26T14:30:00.000Z"
}
```

The API:

```typescript
this.log.debug("Checking schedule", { nextDay: 7 });
this.log.info("Email sent", { day: 7, userId: "u_123" });
this.log.warn("Rate limit approaching", { remaining: 3 });
this.log.error("Send failed", { template: "day7" });
this.log.errorWithCause("Send failed", new Error("timeout"), { template: "day7" });
```

Each level maps to the corresponding `console` method: `debug` to `console.debug`, `info` to `console.log`, `warn` to `console.warn`, `error` to `console.error`. Cloudflare's log aggregation parses and filters these structured entries.

### Field ordering protection

The logger spreads user-provided `data` first, then sets structural fields (`agent`, `instance`, `level`, `message`, `timestamp`). This means your data cannot accidentally overwrite the structural fields. If you pass `{ agent: "HACKED" }` in the data object, the real agent name wins. The tests verify this behavior explicitly.

### Lazy instance name

The Agents SDK sets the `.name` property on the Durable Object lazily, after construction. If the logger tried to read `this.name` during the constructor, it would throw. The `AgentLogger` constructor accepts either a string or a `() => string` getter for the instance name. Both base classes pass `() => this.name` so the instance name resolves correctly at log time, not at construction time.

This is also why `groveInit()` does not log anything. The comment in `init.ts` references the specific workerd issue (#2240). The `onStart()` lifecycle hook is where the "Agent started" log fires, once the name is safely available.

## Error Handling

### The onError overload

The SDK's `onError` has two call signatures:

1. `onError(connection: Connection, error: unknown)` for connection-scoped errors
2. `onError(error: unknown)` for general errors

Both base classes implement a single method that discriminates between the two:

```typescript
onError(connectionOrError: Connection | unknown, error?: unknown): void {
  if (error !== undefined) {
    const connection = connectionOrError as Connection;
    this.log.errorWithCause("Agent error", error, {
      connectionId: connection.id,
    });
  } else {
    this.log.errorWithCause("Agent error", connectionOrError);
  }
}
```

When `error` is defined, the first argument is a connection and the log entry includes the connection ID. When `error` is undefined, the first argument is the error itself. `GroveChatAgent` uses the same pattern with "Chat agent error" as the message.

### Error catalog

The `GROVE_AGENT_ERRORS` catalog follows the Signpost pattern from `@autumnsgrove/lattice/errors`. Every entry is a `GroveErrorDef` with four fields:

| Field | Purpose |
|---|---|
| `code` | Machine-readable identifier, format `GROVE-AGENT-XXX` |
| `category` | One of `"user"`, `"admin"`, or `"bug"` |
| `userMessage` | Safe to show to Wanderers, never leaks internals |
| `adminMessage` | Detailed message for logs and admin dashboards |

The catalog is organized into numbered ranges:

| Range | Domain | Example Codes |
|---|---|---|
| 001-019 | Initialization and lifecycle | `INIT_FAILED`, `CONFIG_INVALID` |
| 020-039 | Scheduling and queues | `SCHEDULE_FAILED`, `QUEUE_FAILED`, `CALLBACK_FAILED` |
| 040-059 | State and storage | `STATE_INVALID`, `SQL_FAILED` |
| 060-079 | Communication | `MCP_CONNECTION_FAILED`, `EMAIL_SEND_FAILED` |
| 080-099 | Internal catch-all | `INTERNAL_ERROR` |

Use the catalog like this:

```typescript
import { GROVE_AGENT_ERRORS } from "@autumnsgrove/grove-agent";

const err = GROVE_AGENT_ERRORS.SCHEDULE_FAILED;
this.log.error(err.adminMessage, { code: err.code, scheduleId });
```

The `AgentErrorKey` type gives you a union of all valid error keys for type-safe lookups.

## Why It Breaks

### "Cannot read properties of undefined" in groveConfig()

You referenced `this.something` inside `groveConfig()`. This method runs during `super()`, before your subclass fields exist. Return a plain object literal.

### "@callable() decorator not working"

Your worker's `tsconfig.json` is missing `experimentalDecorators: true`. The GroveAgent package itself has this set, but each consumer worker needs it in its own tsconfig.

### "Agent started" log never appears

The `onStart()` lifecycle hook in `GroveAgent` logs "Agent started" by default. If you override `onStart()` without calling `super.onStart()`, you lose that log. This is intentional, you might want custom startup behavior.

### Log entries show "undefined" for instance name

If you construct `AgentLogger` with a direct string read of `this.name` instead of a getter function, the instance name resolves too early. Both base classes already handle this correctly by passing `() => this.name`, but if you create a logger manually, use the getter form.

### "Module not found" for agents SDK re-exports

Your worker's `package.json` needs `@autumnsgrove/grove-agent` as a dependency. The SDK re-exports (`callable`, `routeAgentRequest`, `Connection`, `Schedule`, `getAgentByName`) resolve through the grove-agent package, which depends on `agents` ^0.6.0 and `@cloudflare/ai-chat` ^0.1.5.

### State not syncing to connected clients

Call `this.setState(newState)` to trigger a WebSocket broadcast. Direct mutation of `this.state` does not trigger sync. Always spread and replace:

```typescript
// Correct
this.setState({ ...this.state, emailsSent: [...this.state.emailsSent, entry] });

// Wrong: direct mutation, clients never see the change
this.state.emailsSent.push(entry);
```

### onError only logging the first argument

The `onError` method discriminates by checking `error !== undefined`. If the SDK calls it with a single argument, that argument is treated as the error. If it calls with two arguments, the first is the connection and the second is the error. This matches the SDK's dual-signature pattern.

## Architecture Notes

### Source-only library

Like `libs/infra/` and `libs/prism/`, grove-agent is a source-only package. There is no build step. The `package.json` points `main`, `types`, and `exports` all at `./src/index.ts`. Consumer workers bundle it through their own build pipelines.

### groveInit() is intentionally empty

The `groveInit()` function in `init.ts` is a no-op right now. It exists as the designated seam for future conventions: metrics collection, feature flag checks, tenant context injection. One function, both classes, zero duplication. When new conventions arrive, they plug into `groveInit()` and every agent gets them automatically.

The function cannot log during construction due to the lazy `.name` constraint in workerd. The tests verify this explicitly.

### Observability is a separate module

`emitObservabilityEvent()` lives in `observability.ts` as a standalone function rather than being inlined in each base class. Both `GroveAgent.observe()` and `GroveChatAgent.observe()` delegate to it. This keeps the observability implementation in one place and makes it easy to add SDK event emission later without touching the base classes.

### Dependency chain

```
@autumnsgrove/grove-agent
  ├── agents ^0.6.0 (Cloudflare Agents SDK)
  ├── @cloudflare/ai-chat ^0.1.5 (AIChatAgent)
  └── @autumnsgrove/lattice workspace:* (GroveErrorDef type only)
```

SvelteKit apps (plant, meadow, landing) never import this package. Only workers and services that are agents depend on it.

### What the SDK gives you (nothing hidden)

GroveAgent extends, it does not encapsulate. All of these remain available on your agent:

| Feature | API |
|---|---|
| Persistent state | `this.state`, `setState()` |
| SQL storage | `` this.sql`...` `` |
| Scheduling | `schedule()`, `scheduleEvery()`, cron expressions |
| Schedule management | `getSchedule()`, `getSchedules()`, `cancelSchedule()` |
| Task queues | `queue()`, `dequeue()`, `dequeueAll()` |
| MCP | `addMcpServer()`, `removeMcpServer()` |
| RPC | `@callable()` decorator |
| WebSocket | `broadcast()`, `getConnections()` |
| Email | `onEmail()`, `replyToEmail()` |
| Destruction | `this.destroy()` |

`GroveChatAgent` adds: `this.messages`, `onChatMessage()`, `persistMessages()`, `saveMessages()`, resumable streaming, multi-client sync, and tool support (server-side, client-side, approval-gated).

## Key Files

| File | Purpose |
|---|---|
| `libs/grove-agent/src/index.ts` | Barrel exports and SDK re-exports |
| `libs/grove-agent/src/grove-agent.ts` | `GroveAgent` base class (extends `Agent`) |
| `libs/grove-agent/src/grove-chat-agent.ts` | `GroveChatAgent` base class (extends `AIChatAgent`) |
| `libs/grove-agent/src/init.ts` | `groveInit()` shared convention layer |
| `libs/grove-agent/src/logger.ts` | `AgentLogger` structured logging |
| `libs/grove-agent/src/errors.ts` | `GROVE_AGENT_ERRORS` catalog |
| `libs/grove-agent/src/observability.ts` | `emitObservabilityEvent()` helper |
| `libs/grove-agent/src/types.ts` | `GroveAgentConfig`, `GroveObservabilityEvent`, logger types |
| `libs/grove-agent/package.json` | Single `"."` export, source-only |
| `libs/grove-agent/tsconfig.json` | `experimentalDecorators: true` for `@callable()` |
| `docs/specs/grove-agent-spec.md` | Full specification with architecture and consumer plans |

## Checklist: Adding a New Agent

- [ ] Decide: does it need persistent chat? Yes = `GroveChatAgent`. No = `GroveAgent`.
- [ ] Create the worker directory under `workers/your-agent/`
- [ ] Add `@autumnsgrove/grove-agent` to the worker's `package.json`
- [ ] Set `experimentalDecorators: true` in the worker's `tsconfig.json`
- [ ] Define your `State` interface and `initialState`
- [ ] Implement `groveConfig()` returning a plain object literal (no `this` references)
- [ ] Add `@callable()` methods for RPC endpoints
- [ ] Use `this.observe()` for business events worth tracking
- [ ] Wire up `routeAgentRequest()` in the worker's fetch handler
- [ ] Configure `wrangler.toml` with DO bindings and `new_sqlite_classes` migration
- [ ] If overriding `onStart()`, decide whether to call `super.onStart()` for the startup log
- [ ] If overriding `onError()`, preserve the dual-signature pattern (connection + error vs error only)
- [ ] Run `pnpm install` and verify workspace resolution
- [ ] Type-check with `tsc --noEmit`
- [ ] Test locally with `wrangler dev`
