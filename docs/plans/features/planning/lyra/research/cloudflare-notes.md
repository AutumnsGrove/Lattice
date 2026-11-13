# Cloudflare agent stack: research notes (Track 3)

Researched 2026-11-11. Sources: shallow clone of `cloudflare/agents` at /tmp/claude-0/refs/agents (HEAD dated 2026-11-11), Cloudflare docs, Pi repo.
Versions seen: `agents` 0.33.0, `@cloudflare/think` 0.23.0, Pi packages pinned `~1.5.0`.

## 1. Headline: the user's memory is right. Cloudflare has a Pi-based harness.

Pi has moved: canonical repo is now `github.com/earendil-works/pi` (MIT, ~7.8k commits, created 2025-08), npm scope `@earendil-works/*`. Not `badlogic/pi-mono` any more.
Pi monorepo packages: `pi-ai` (unified multi-provider LLM API), `pi-agent-core` (agent loop + tools + state), `pi-coding-agent` (CLI), `pi-tui`, `chord` (object runtime), `pi-telemetry`, and **`pi-durable`** (durable conversation/task/document runtime; EXPERIMENTAL, "API changes without notice between releases").

Cloudflare ships **three** harness options in the `agents` package (`agents/harness/*`):
| Harness | Engine | Status (per docs) |
|---|---|---|
| `PiHarness` (`agents/harness/pi`) | Pi's `pi-durable` Harness opened over DO SQLite | "Beta". Depends on pi-durable (experimental); `agents` supports ONE Pi minor at a time; a new Pi minor may store conversations in formats the old one can't read (rollback = unreadable; roll forward only). |
| `ThinkHarness` (`agents/harness/think`) | Vercel AI SDK loop as a Lifecycle capability | Experimental |
| `ContainerHarness` / `OpenCodeHarness` | Loop runs in a container (opencode etc.), DO supervises | Present in repo |

Separately **`@cloudflare/think`** (v0.23, "Experimental"): opinionated chat-agent base class (`class MyAgent extends Think<Env>`): agentic loop, WebSocket chat protocol, message persistence in DO SQLite, stream resumption, client tools, workspace file tools (`@cloudflare/computer`), codemode tool, fetch tool, skills, extensions, sub-agents/"agent tools", messengers (Telegram via Chat SDK), scheduled prompts, context-overflow recovery. Its README ends: "Think's design is inspired by pi." Think is AI-SDK-v7 based, NOT built on Pi code. (So: Think = Pi-inspired; PiHarness = actual Pi running in a DO.)

Also `agent-think/` in the repo: a real production-ish Think agent (GitHub issue repro/fix bot in a container workspace). Useful as a reference app.

PiHarness details (docs/agents/harnesses/pi.md, src/harness/pi/harness.ts):
- Pi owns transcript, inbox (steer/follow-up), generation, tool calls, retries, crash recovery. PiHarness only supplies storage (`openDurableObjectSqliteStorage(ctx.storage)`) + the *wake* (Lifecycle job -> DO alarm).
- API: `harness.prompt()`, `harness.sessions.create()`, `session.submit(input,{operationId, whenBusy:"followUp"|"steer"|"reject", whenIdle, entry})`, `wait(operationId)`, `steer`, `continue`, `abort`, `pending`. Idempotent operationIds. `maxTurns` -> `turn_limit`.
- Tools: `ToolRegistration` with schema (pi-schema `obj/str`), `replay: "safe"|"unsafe"` (unsafe default: after eviction model gets an `interrupted` result rather than a rerun), `api.memo()` for values that survive eviction, `abortSignal`.
- Wake constants: WAIT_BUDGET 10 min inside an alarm (15 min wall limit), HEARTBEAT 30 s, max backoff 10 min.
- Pi extension system: `defineExtension`, hooks (`beforeTool` can `{block: "Needs approval"}`), prompt `section`s, durable tasks, subagents (foreground/background examples), compaction, plan-mode example, codemode (QuickJS sandbox) that survives restart.
- Cloudflare layers on top: `agents/models/pi-ai` (`createAI({binding: env.AI})` routes Workers AI + AI Gateway catalog; "No provider keys. AI Gateway holds the credential"), `agents/skills`, `agents/browser/pi` (browser tool), web search/fetch tools for pi.
- There is a Gardener automation in repo that auto-PRs to keep `agents` on the latest Pi release (so Cloudflare tracks Pi closely).

## 2. What the `agents` SDK provides (v0.33)

Architecture is now composition: `Lifecycle.install(this).use(capability)` on a plain `DurableObject` OR use the batteries-included `Agent` class. Lifecycle owns startup, the single physical alarm, and a durable job queue; capabilities share it.
Capabilities: `PiHarness` (beta), `MCPClientManager` (stable), `Scheduler` (stable), `State` (stable), `WebSockets` (stable), `Queue`, `RoutedAgents`, `Browser`, `Sessions`, `Streams`, `Tasks`, `Context` (experimental).
`Agent` class gives: `this.state`/`setState` (persisted + synced to connected WebSocket clients, hibernation-aware), `this.sql` (DO SQLite), `schedule()/scheduleEvery()` (delay, Date, cron; idempotent option), `@callable()` RPC over WS, WebSocket + HTTP routing (`/agents/:binding/:name`, `routeAgentRequest`), email (`onEmail`, send), MCP client (connect to servers) and MCP server (`McpAgent`, elicitation), voice, workflows integration (`runWorkflow`, `AgentWorkflow`, `waitForApproval`), HITL patterns (`needsApproval`, workflow approval, MCP elicitation), `keepAlive/keepAliveWhile`, `runFiber/startFiber` durable execution, sub-agents ("dynamic agents" via DO **facets**: child in own isolate + own SQLite, colocated under the parent), "agent tools" (parent dispatches a chat-capable child with event replay), observability (OTel).
`AIChatAgent` (`@cloudflare/ai-chat`): older chat base class on AI SDK `UIMessage`; React hook `useAgentChat`; resumable streams. Think supersedes it for new work.

## 3. Long-running loops: how the SDK handles it and real limits

Platform numbers (CF docs, fetched 2026-11-11):
- Worker/DO CPU time per invocation: Paid default 30 s, configurable to 5 min (`limits.cpu_ms = 300000`). CPU = active CPU only; waiting on LLM/network/storage does NOT count. Each incoming request or WS message resets the 30 s budget.
- Wall time: incoming HTTP request/DO RPC = unlimited while caller stays connected (a streaming response keeps the Worker active); `waitUntil` extends up to 30 s post-response. **DO alarm handler = 15 min wall**. Cron triggers 15 min. Queue consumer 15 min. Workflow step wall time = unlimited (CPU-limited).
- DO idle eviction ~70-140 s with no requests/open sockets (per Agents docs); code deploys/runtime restarts evict 1-2x/day nondeterministically; alarm >15 min is killed. Open outbound fetches are severed on eviction.
- Subrequests: Paid 10,000/invocation default (up to 10M configurable); 6 simultaneous outbound connections per request.
- DO alarms: one alarm per DO; at-least-once; retried on throw with exp backoff from 2 s, up to 6 retries (then dead until next `setAlarm`, so catch exceptions).
- DO storage (SQLite-backed): 10 GB/object; key+value <= 8 MB; WS received message <= 32 MiB. Soft ~1,000 req/s per object.
- Workflows (Paid): 10,000 steps/instance default, configurable to 25,000 (raised Mar 2026); per-step CPU 30 s default / 5 min; step wall unlimited; step retries up to 10,000; `step.sleep` up to 365 days; instance state 1 GB; 50,000 concurrent instances/account; 300 creations/s/account; state/log retention 7 or 30 days depending on page (docs conflict between two fetched revisions; verify before relying).
- Dynamic Workers (Worker Loader): $0.002 per unique Worker/day beyond 1,000/month, plus normal CPU + request pricing; Paid only; sandbox with no network by default, bindings you choose, supports DO facets and (since May 2026) Workflows via `@cloudflare/dynamic-workflows`.

How Agents SDK keeps loops alive:
1. `keepAlive()/keepAliveWhile()`: 30 s alarm heartbeat resets idle timer. "Minutes, not hours."
2. `runFiber(name, fn)` / `startFiber()`: row in SQLite, `ctx.stash(checkpoint)`, `onFiberRecovered()` called on next activation if evicted (via alarm even with no clients). `startFiber` adds idempotency key + retained status + inspect/cancel. Recovery is NOT automatic replay; you decide.
3. Tasks (`agents/tasks`): journaled `step.do` / sleeps with persisted deadlines, replay after eviction, runs inside the DO via the Lifecycle job queue (DO-native "mini-Workflows").
4. Workflows for minutes-to-hours, external-event waits, approvals.
5. Guidance for hours-to-days: start job, persist ID, hibernate, wake on callback/schedule.
PiHarness/pi-durable approach: commit every model turn, tool intent, and result to SQLite before showing it; on reopen `resume()` continues; model request in flight at death counts as a failed attempt and is retried (crash-loop guard); tool calls rerun only if `replay: "safe"`.

## 4. Integrations
- **Vercel AI SDK**: Think/AIChatAgent/ThinkHarness are AI SDK v7 (`ai@^7`, `@ai-sdk/*@^4`). `agents/models/ai-sdk` = `createAI` returning a full `ProviderV4` (text, embeddings, images, speech, transcription, rerank). Strings: `@cf/...` Workers AI, `vendor/model` AI Gateway catalog, `dynamic/<route>` gateway dynamic routes; vendor model objects go via gateway provider-native path.
- **AI Gateway**: caching/logging/metadata/timeouts/retries as options; unified billing or BYOK stored on gateway (no keys in Worker). Relevant to Lumen: Lumen already is Grove's gateway; CF's `createAI` could be a Lumen competitor or just a backend Lumen routes to.
- **Workflows**: `AgentWorkflow` class with typed access back to the originating Agent; `waitForApproval`.
- **Containers/Sandbox**: `ContainerHarness`, `@cloudflare/computer` (replaces deprecated `@cloudflare/shell`/`workspace`): Workspace = SQLite + R2 VFS, shell, containers for real Linux.
- **Codemode / Dynamic Workers**: model writes TS against typed APIs in an isolate; `@cloudflare/codemode` runtime with connectors (MCP, OpenAPI, AI SDK tools), durable approval log; sandbox has no network.
- **Browser Rendering**: `agents/browser` persistent CDP browser, `browserTool` for Pi.
- **Observability**: OTel in `agents`; `pi-telemetry` in Pi.

## 5. Adopt vs build (honest advisor notes)

The user has decided to build their own; this is advice on what to borrow.

Could they adopt directly? Technically yes: `PiHarness` over a DO + `createAI` + their own tools would give durable agent loops tomorrow. Reasons it may still be wrong for Grove:
- Lock-in vector 1: pi-durable is experimental, one-Pi-minor-at-a-time, storage format not backwards compatible across minors. Your session data format is owned by upstream.
- Lock-in vector 2: Think is AI-SDK-v7 + `@cloudflare/computer` + codemode vite plugin + `agents` peers; large dependency surface, rapid churn (0.x versions, many "experimental"). Repo is 0.x everywhere.
- Lock-in vector 3: Cloudflare's `createAI` wants AI Gateway as the model path; Grove's rule is "inference goes through Lumen". A Lumen-as-provider adapter is needed either way (Pi's `pi-ai` Models/provider interface and AI SDK ProviderV4 are both feasible targets).
- Nova protocol compatibility (JSONL frames) would be a translation layer on top of any of these.
- It is Workers-only by design; the issue wants Node adapter too. Pi-durable itself is storage-portable (memory, IndexedDB, Node SQLite, JSONL, DO SQLite), which is the closest match to the issue's "same interface, DO or file adapter".

Worth borrowing (ideas, not necessarily code):
1. **Submission model**: `submit()` returns a durable receipt immediately; `operationId` idempotency; `wait(opId)`; `whenBusy: followUp|steer|reject`. This maps neatly onto Nova's `command` frames and onto background pipelines.
2. **Commit-before-show persistence + replay-safety flag on tools** (`replay: safe|unsafe`, interrupted result otherwise). This is the single most important durability design for tool-calling loops with side effects. Add it to the tool registry from day one.
3. **Wake = alarm job**: Lifecycle single-alarm multiplexing (schedules, fibers, tasks, keepAlive heartbeat through one alarm). DO has exactly one alarm; build a small job queue over it.
4. **Fiber/checkpoint recovery with idempotency key** and retention ledger.
5. **Per-conversation DO + facets for sub-agents** (own isolate + own SQLite).
6. **Codemode**: one tool that runs sandboxed TS against typed connectors; keeps tool-description tokens flat and avoids round trips. Strong fit for Mycelium-as-tool-provider.
7. **Approvals as first-class durable state** (Workflow `waitForApproval`, Pi `beforeTool` block). For no-UI background pipelines: park the run, emit an event/notification, resume on approve.
8. **Compaction, context-overflow recovery** as built-ins.
9. Pi `defineDoc` documents (typed, versioned state next to the transcript).

Primitives to build on regardless of what is adopted: DO SQLite (transcript, jobs, ledger), single-alarm job queue with self-heartbeat < 140 s idle window, hibernatable WebSockets (`ctx.acceptWebSocket`) for the transport, `setAlarm` for wake after eviction, Workflows for hours-long/external-wait work and approvals, Dynamic Workers (Worker Loader) for sandboxed code mode, service bindings to Lumen (not AI Gateway directly).

Design implications for the Grove spike (#1605 open questions):
- "Durability / real numbers": a Lumen call that streams for minutes is fine in a DO as long as a request, WS, or `keepAlive` holds it. CPU is NOT the constraint (waiting is free); eviction is. Per-turn checkpoint to SQLite + alarm wake gives crash safety. An alarm-driven loop gets 15 min wall per invocation, 6 retries on throw. Use Workflows if a pipeline needs >15 min of waiting on external events or per-step retry with 25k step cap.
- 10k default subrequests per invocation is ample for tool loops. 6 concurrent outbound connections limit matters for parallel tool calls and parallel sub-agents.
- Eviction ~1-2x/day during deploys: every in-flight Lumen stream dies; the model request in flight must be treated as a failed attempt and retried (Pi does exactly this), so billing/idempotency for Lumen calls matters.

## 6. Sources
- https://github.com/cloudflare/agents (docs/agents/*, docs/think/*, packages/agents/src/harness/*, packages/think/README.md) cloned 2026-11-11
- https://github.com/earendil-works/pi and /tree/main/packages/durable
- https://developers.cloudflare.com/durable-objects/platform/limits/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workflows/reference/limits/
- https://developers.cloudflare.com/durable-objects/api/alarms/
- https://developers.cloudflare.com/dynamic-workers/ and /pricing/
- https://blog.cloudflare.com/dynamic-workers
- https://developers.cloudflare.com/changelog/product/workflows

## 7. Unverified / caveats
- Did not read pi-durable `docs/spec.md` or its source directly (only README via fetch); did not run any code.
- Workflows retention (7 vs 30 days) differs across two fetched doc revisions.
- "Beta"/"Experimental" labels are from the repo docs as of today and move fast.
- Did not verify Think/PiHarness performance or cost in production; no benchmarks read.
