# Pi deep-dive notes (for the Grove agent-core plan)

Source: shallow clone of `badlogic/pi-mono` at /tmp/claude-0/refs/pi-mono (HEAD ec566e6, committed 2026-11-11; 1 commit visible because shallow).
All paths below are relative to that clone. I read selectively (READMEs, types.ts, the top of agent-loop.ts, docs); I did NOT read every provider or the full coding-agent.

## 0. Repo identity / "did it move?"

- The clone's remote is badlogic/pi-mono, but every package.json says `@earendil-works/*`, `repository: github.com/earendil-works/pi`, and the root README links pi.dev + `github:earendil-works/pi`. WebFetch of github.com/earendil-works/pi shows the same package list. So: same project, renamed/moved from `badlogic/pi-mono` (npm `@mariozechner/pi-*`) to `earendil-works/pi` (npm `@earendil-works/pi-*`). I did not find an explicit "we moved" notice; this is inference from identical contents. (A stale doc comment in agent/src/types.ts still says `declare module "@mariozechner/agent"`.)
- License: MIT (c) Mario Zechner. Node >=22.19. Version 1.5.2 across all packages (lockstep).
- **Pi has grown a LOT beyond "pi-ai + pi-agent-core + coding-agent".** Monorepo now has 12 packages: agent, ai, chord, codemode, coding-agent, durable, env, evals, mcp, schema, telemetry, tui; plus apps/p2, p2-mac, p3. `pi-durable` (experimental) is a durable agent harness with an explicit Cloudflare Durable Object storage adapter and a workerd test suite. That is very close to what issue #1605 wants.

## 1. Layering (dependency graph)

```
pi-schema (0 deps, 8.5 KB gz, eval-free JSON Schema builders+validator, passes 2222/2223 JSON-Schema-Test-Suite)
pi-telemetry (contracts only, no exporter)
   ↑
pi-ai   (unified LLM API; deps: anthropic sdk, openai sdk, google genai, aws bedrock sdk, smithy node-http-handler, proxy agents, partial-json, pi-schema, pi-telemetry)
   ↑
pi-agent-core  (only deps: pi-ai + pi-schema; ~2.5k LOC src: agent-loop.ts 959, agent.ts 623, types.ts 551, proxy.ts 397)
   ↑
pi-coding-agent (SDK/CLI/RPC/TUI; ~78k LOC src; AgentSession 4.6k LOC, session-manager 2k, extensions/types 2.3k)

pi-durable (experimental; ~12k LOC in harness/; deps pi-ai, chord)  — separate from agent-core! It does NOT use pi-agent-core's Agent class; it has its own task-based generation/tool tasks.
chord (object runtime across processes/hosts; Node-focused; ~84k LOC) — heavy, Node-only for most entry points.
```
LOC numbers: non-test .ts, my `wc -l`; ai/ ≈34k includes generated model tables.

## 2. pi-ai (provider layer)

- `createModels()` + `models.setProvider(xProvider())`; `builtinModels()` from `@earendil-works/pi-ai/providers/all`. Provider factories + lazy API modules (`api/openai-completions.lazy`) for tree-shaking. Explicit "Bundling and Tree Shaking" and "Browser Usage" sections; "not a browser or Cloudflare Workers workaround" caveat appears only for a Node-bundle-specific item (README ~L1751).
- Key API: `stream / complete / streamSimple / completeSimple`, `classify()` (decision models!), image generation, `getModel`, `getModelOfType('classifier', ...)`.
- **Streaming event protocol** (ai/src/types.ts ~L831): `start`, `text_start/delta/end`, `thinking_start/delta/end`, `toolcall_start/delta/end`, `done{reason: stop|length|toolUse|deferred}`, `error{reason: aborted|error}`. Every event carries the `partial` AssistantMessage. Streaming tool-call args parsed with `partial-json`.
- **Errors are data, not exceptions:** `StreamFn` contract (agent/src/types.ts ~L22): must never throw/reject; failures come as a final AssistantMessage with `stopReason: "error"|"aborted"` + `errorMessage`. Same for `classify()`/image gen. This is a good rule to copy.
- Messages are plain JSON: `user | assistant | toolResult | system`. Models are plain serializable data (no functions). Context is `JSON.stringify`-able. Cross-provider handoff rules: same provider/api/model assistant msgs preserved; different model → thinking blocks dropped; signatures opaque.
- `Usage` includes cost computed from catalog prices; `cacheRead/cacheWrite` tracked; prompt-cache `sessionId`; `cache-warming.ts`.
- `ClientIdentity`/attribution headers (OpenRouter app attribution) — defaults to naming pi, must override.
- **Cloudflare is first-class**: providers `cloudflare-workers-ai`, `cloudflare-ai-gateway`; `api/cloudflare-ai-binding.ts` (90 LOC) lets a Worker route gateway calls through `env.AI.fetch()` (no API token) via `createAiBindingFetch(env.AI)`; request options accept a custom `fetch`. This is the pattern for "Lumen as the transport": a provider whose baseUrl/fetch is a service binding.
- Classifier ("Decisions") API: `{state, questions:{name:{type:'choice'|'score'|'bool', instructions, criteria}}}` → answers with probabilities. Same concept as Nova `decide/` (kinds choice/noul/score). Pi's public name is `bool`, adapters translate to wire `noul`. Providers: TypeSafe Jev, Cloudflare Clef, OpenAI GPT-6 Luna, Microsoft-Decision-1.
- Node-only bits are isolated: only oauth callback-server, openai-codex, bedrock, cli.ts, utils/provider-env.ts import `node:`. Core stream path has no node imports. BUT package.json hard-deps `@smithy/node-http-handler`, `http-proxy-agent`, `https-proxy-agent`, aws sdk (install weight; fine with lazy imports).
- `createProvider({id, auth, models, api})` for custom/OpenAI-compatible endpoints; `faux.ts` provider for deterministic tests (scripted responses) — worth copying, our Lumen mock should do the same.

## 3. pi-agent-core (the loop)

Files: agent/src/{types.ts, agent-loop.ts, agent.ts, proxy.ts, stream-fn.ts}. ZERO `node:` imports. Deps only pi-ai + pi-schema. => runs in Workers as-is (modulo pi-ai provider choice).

**Two layers:** low-level `agentLoop()/agentLoopContinue()` (pure function, returns an `EventStream<AgentEvent, AgentMessage[]>`, takes `signal`, `streamFn`) and stateful `Agent` class (state, subscribe, prompt/continue, steer/followUp queues, abort/waitForIdle). The loop is `runLoop()` (agent-loop.ts L170-): outer loop for follow-ups, inner loop for tool calls + steering.

**Event model** (flat, UI-oriented): `agent_start, turn_start, message_start, message_update (assistant only; has assistantMessageEvent delta), message_end, tool_execution_start/update/end, turn_end{message,toolResults}, agent_end{messages}`. Subscribers are awaited in registration order and count toward run settlement (agent_end barrier) — good for "flush session to storage before settling".

**AgentMessage vs LLM Message:** `AgentMessage = Message | CustomAgentMessages[keyof ...]` — apps add custom message types via TS declaration merging. Pipeline per request: `AgentMessage[] → transformContext(messages, signal)? → AgentMessage[] → convertToLlm() → Message[] → LLM`. Both hooks must not throw (contract). transformContext = pruning/injection; convertToLlm = filter UI-only / map custom roles.

**Hooks / knobs on AgentLoopConfig (all optional except model, convertToLlm):**
- `transformContext`, `convertToLlm`, `getApiKey(provider)` (per-call dynamic key; they cite expiring OAuth), 
- `beforeToolCall({assistantMessage, toolCall, args(validated), context}, signal)` → `{block, reason, terminate}`; `afterToolCall(...)` → partial override of `{content, details, structuredContent, isError, usage, terminate}` (field-wise replace, no deep merge). This is the approval/permission seam, and it's tiny.
- `prepareRequest` (runs before every provider request; used to reload canonical persisted context from the session store — i.e. the loop is designed so *storage is the source of truth*), `prepareNextTurn` (compaction happens here), `finishTurn` → `{action:'continue'|'end'}`.
- `getSteeringMessages` (polled after tool batch; injected before next LLM call; remaining tool calls NOT skipped) and `getFollowUpMessages` (polled when agent would otherwise stop). `QueueMode: all | one-at-a-time`.
- `toolExecution: parallel(default)|sequential`, per-tool `executionMode` override; parallel = preflight sequential, execute concurrently, tool_execution_end in completion order, toolResult messages persisted in source order.
- `terminate: true` on a tool result: if EVERY result in the batch sets it, skip the follow-up LLM call (nice for "final answer" / "notify_done" tools; how to build structured-output pipelines).
- Truncation guard: stopReason `length` + tool calls → all calls failed rather than executed with truncated args (agent-loop.ts ~L265). Copy this.
- **Budgets are NOT in the core.** There is no maxSteps/maxTokens/cost/wall-clock budget in agent-core types. Issue #1605's budgets would be our addition, implementable via `finishTurn` (`{action:'end'}`) + usage on messages, or `beforeToolCall`. (durable has `settings.restartLimit`, `retry`, usage docs — separate.)

**Tool type:** `AgentTool<TParams, TDetails> extends Tool` = `{name, description, parameters (JSON Schema object), label, prepareArguments?, outputSchema?, executionMode?, replay?:'never'|'safe', execute(toolCallId, params, signal, onUpdate) → {content:(text|image)[], details, structuredContent?, usage?, isError?, terminate?}}`. Args validated with `validateToolArguments` against JSON Schema (pi-schema or TypeBox; TypeBox migrating out in favor of pi-schema). Three result channels: content (model), details (UI), structuredContent (programmatic callers). Tool usage can be reported separately (so tool cost ≠ LLM cost) — relevant to the "how do tool calls bill" open question.

**Abort:** a single `AbortSignal` threaded everywhere: loop → streamFn → transformContext/prepareRequest/hooks → each tool's `execute(…, signal)`. Aborted runs end with an assistant message `stopReason:'aborted'` (errors/aborts are hard exits, hooks like finishTurn still run). `Agent.abort()` aborts the active AbortController; `handleRunFailure` (agent.ts ~L542) converts a thrown error into an assistant message with stopReason error/aborted so the event sequence is always well-formed.

**System prompt/tools as transcript entries:** newer design: the system prompt and tool declarations are *messages in the transcript* (`role:"system"` with `sections` named replacements + `toolsAdded/toolsRemoved`); loop diffs `agent.state.tools` against declared tools and announces changes before each request. Keeps transcript replayable & cache-friendly. Interesting but optional for us.

**proxy.ts (397 LOC):** a `streamProxy`-style stream function that talks to a remote server over SSE (so a browser UI can use the agent core with the model call made server-side). Worth reading before designing the Worker HTTP transport. (Did not read it in detail.)

**Embedding:** `new Agent({initialState, streamFn: models.streamSimple.bind(models), convertToLlm, transformContext, ...}); agent.subscribe(fn); await agent.prompt("..")`. Simple.

## 4. pi-coding-agent (the product on top)

- Node-bound: bash, fs read/write/edit, TUI, settings files, project trust, package manager (npm/git), extension loader (loads TS modules at runtime), OAuth flows. ~79k LOC. Do not port.
- **Sessions = append-only JSONL tree**: every entry `{type,id,parentId,timestamp,...}`; header line `{type:'session',version:3,id,cwd,parentSession?}`; branching = move the "leaf" pointer, nothing deleted; fork/clone copy to a new file. Entry types include message, compaction (summary + `firstKeptEntryId`), branch_summary, custom entries (`pi.appendEntry`), model changes. Context rebuilt from active branch + compaction. Version field with auto-migration. (docs/session-format.md.) SessionManager (2k LOC) is authoritative; assigning agent.state.messages doesn't persist.
- **Compaction** (docs/compaction.md): trigger `contextTokens > contextWindow - reserveTokens(16384)`; cut point keeps ~`keepRecentTokens` (20k) recent; LLM summarizes older part with structured format + previous summary iteratively; tracks file ops cumulatively; runs inside `prepareNextTurn` between turns; also overflow-error recovery (compact-and-retry once). Summaries disable prompt-cache writes.
- **Extensions**: TS modules in-process with `pi.on(event)`, `registerTool`, commands, UI. Events cover session/agent/model/tool/input. Explicitly *no sandbox* (docs/security.md: "not a security boundary"; use containers). => Not suitable as-is for multi-tenant Workers; Nova's out-of-process extension model is stronger.
- **RPC mode** (docs/rpc.md): strict JSONL over stdin/stdout. Four record families: command (stdin, optional `id`), `response` (`{id,type:'response',command,success,data}`), session events (no id), extension-UI request/response. Strict LF framing (don't use readline: U+2028). Very similar in spirit to Nova's hello/command/event/error frames. `prompt` response = accepted, not completed.
- SDK: `createAgentSession({sessionManager: SessionManager.inMemory()})`; `session.prompt()`, `.dispose()`; `AgentSessionRuntime` for new/switch/fork.
- Philosophy (README): "skips sub-agents and plan mode… ask Pi to build what you want". Minimal core, extension-based growth. Same as Nova.
- Skills (on-demand instruction files), prompt templates, themes, "pi packages" via npm/git — all Node/file-system based.
- MCP: `packages/mcp` is a standalone MCP client (own implementation, no official SDK, transport-neutral core + Streamable HTTP + stdio). The HTTP transport + core is plausibly Workers-safe (stdio is not) — relevant to the Mycelium question and the "supersedes MCP-client portion of #471".
- Codemode: `pi-codemode` runs model-written JS in QuickJS/WASM where only injected tools are callable; has a **Cloudflare variant** (`RemoteCodemodeSandbox` via a DO in a separate Worker, import `/portable`). Nested tool calls never hit LLM context. Possible later feature ("programmatic tool calling").

## 5. pi-durable (most relevant to #1605) — experimental

- "A durable agent harness": conversations, model turns, tool calls committed to storage before shown; crash mid-turn → resume; a model request in flight at death counts as a failed attempt and is retried (bounded).
- Model: Harness → Conversations (transcript of immutable entries) → Commits (atomic) → Documents (typed JSON state) → Tasks (durable state machines w/ checkpoints: pending/running/waiting/sleeping/completing/terminal) → Submissions. Generation and each tool call run as tasks. Tool intent is committed *before* `execute()`; non-`replay:'safe'` tools return `interrupted` after a crash instead of rerunning (exactly-once-ish semantics for side effects).
- **Storage backends**: Memory, IndexedDB, Node SQLite, JSONL, and **`openDurableObjectSqliteStorage(ctx.storage)`** (`@earendil-works/pi-durable/storage/sqlite/cloudflare`, src/storage/sqlite/cloudflare.ts) — commits are DO storage transactions; table prefix option (`{prefix:'pi_'}`) so it can share a DO's SQLite with host tables. Portable SQLite/JSONL cores run without Node APIs given a DB facade.
- **Workers-aware design**: `test-workers/` has a real workerd/vitest-pool-workers suite (`worker.ts`: a `TestSession extends DurableObject`, opens Harness in `blockConcurrencyWhile`, `onWake` callback arms a DO alarm; heartbeat alarm every 60s while work is active; `wake()` reports `{active, at}`; default `setTimer` declines memory-only timers in Workers so the DO can hibernate; eviction mid-request = failed attempt + retry). compatibility_flags: nodejs_compat. Image processing (Photon WASM) warned as memory-heavy on Workers.
- **Suspendable work (draft, "nothing here is built", fifth revision dated 2026-11-09, docs/suspendable/)**: signals (`harness.signal(taskId, token, key, value)`), tools that park (`execute()` returns `{sleep}`/`{wait}`), `beforeTool` gates that sleep until a human approval signal arrives, abort ends a park. This is precisely the answer to our "human-in-the-loop for a background pipeline with no UI" open question, in design form.
- Extensions: `defineExtension({name, tools, hooks, tasks, prompt sections})`, `hook(ToolTask,{beforeTool,afterTool})`, `hook(GenerationTask,{beforeRequest,afterResponse,onYield,afterTools,afterRun})`. Tools via `defineTool` with pi-schema; 3 result channels; `control:{terminate:true}`; per-call `usage`. Built-in read/write/edit/bash tools go through an `ExecutionEnv` abstraction (Node env or remote env over SSH `pi-env` Rust daemon).
- Telemetry: explicit-context spans/metrics via pi-telemetry (no globals).
- Compaction, forks, usage/cost accounting, child tasks/subagents, task graph all implemented in durable (not via coding-agent).
- Caveat: marked EXPERIMENTAL "API changes without notice"; depends on `chord` (heavy, Node-first) for `Context` (cancellation + span) — every async call takes a Chord `Context`. Coupling to chord is a real adoption cost.

## 6. Workers-compat summary

| Piece | Workers? | Notes |
|---|---|---|
| pi-schema | yes | no eval, CSP-safe, tiny |
| pi-agent-core | yes (no node: imports) | pulls pi-ai; tree-shake providers |
| pi-ai core stream + openai-completions/anthropic/google | likely yes (fetch-based SDKs) | I did not run it in workerd. Bedrock/codex/OAuth/proxy agents are Node-only; lazy-import boundaries exist |
| pi-ai Cloudflare AI binding/gateway | yes, purpose-built | `env.AI.fetch()` passthrough |
| pi-mcp (HTTP transport) | probably | stdio no |
| pi-codemode | yes via RemoteCodemodeSandbox (DO in separate Worker) | QuickJS WASM |
| pi-durable core + DO SQLite storage | yes, tested in workerd | experimental; needs chord Context |
| chord | mostly Node | avoid |
| coding-agent | no | fs/bash/TUI/package-manager |

I did NOT verify any of this by running workerd myself. Claims come from docs, package exports and the repo's own test-workers suite.

## 7. What to COPY for a minimal portable core

1. Two-layer split: pure `agentLoop(prompts, context, config, signal, streamFn)` returning an event stream + thin stateful wrapper. Loop does no I/O except via injected `streamFn` and tool `execute`.
2. `StreamFn` "never throws; failures are encoded as a final message with stopReason error/aborted" contract; same for tool hooks (hooks must not throw). Guarantees well-formed event sequence for transports/transcripts.
3. One `AbortSignal` threaded through everything (loop, provider, hooks, tools).
4. AgentMessage → transformContext → convertToLlm pipeline (custom app messages that never reach the model, e.g. UI/progress/audit entries) — and storage as source of truth via `prepareRequest`.
5. `beforeToolCall` (block/terminate) and `afterToolCall` (field-level override) as THE permission/approval/quota seam; `terminate` batch rule; `executionMode` per tool; parallel-execute / source-order persist.
6. Truncated-output (`length`) guard that fails tool calls rather than executing truncated JSON.
7. Tool result with 3 channels (model content / UI details / structuredContent) + per-tool `usage` for billing attribution.
8. JSON Schema tool params with a tiny eval-free validator (pi-schema) — eval is forbidden in Workers (`new Function` blocked), so TypeBox+Ajv-compile paths are risky; pi-schema avoids it. Consider depending on pi-schema directly or copying its approach.
9. Session as append-only entry log with `id/parentId`, version field + migrations, compaction entry `{summary, firstKeptEntryId}`; raw history never mutated. Maps 1:1 onto a DO SQLite table (or Nova JSONL). Note Nova already has this shape (session/store.go) — the TS port should share the format.
10. Faux/scripted provider for tests; deterministic loop tests (agent-loop.test.ts is 2.2k lines — good spec of edge cases to port as a conformance suite).
11. durable's lessons for DOs: `onWake({active, at})` → single DO alarm + heartbeat; commit intent before side-effecting tool; `replay: 'safe'|'never'`; decline in-memory timers so DO can hibernate; table prefix to share DO SQLite.
12. Steering/follow-up queues (probably useful for HTTP transport: user sends a message to a running DO session).

## 8. What to AVOID

- Taking pi-coding-agent/AgentSession (4.6k-LOC god object; Node, fs, settings, TUI, extension loader).
- In-process TS extensions with full privileges (their own security doc says no boundary). For multi-tenant Grove, tools should be capability-scoped service bindings.
- Depending on `chord` or the whole durable runtime today (experimental, heavy, API churn). Either adopt `pi-durable` wholesale as a dependency (pin exact; it moves fast), or just copy the *ideas* (intent-before-execute, wake/alarm contract).
- pi-ai's full provider catalog/generated model tables (34k LOC) — Lumen already owns routing/pricing; write a single `LumenProvider` as `streamFn`.
- Declaration-merging for custom messages if the plan includes a cross-language wire format; use an explicit discriminated union + `ext:`/custom entry type instead (Nova's extension model).
- Global/ambient state (they explicitly avoid it too; telemetry passed explicitly).
- Per-iteration heavy rebuilds of the transcript on a hot path inside a DO (durable keeps a "contextRetentionMs" cache for this reason).
- Dev-process dependence on their fast churn: version 1.5.2 on all 12 packages in lockstep; AGENTS.md says "Do not preserve backward compatibility unless the user asks".

## 9. Gaps in Pi relevant to issue #1605

- No budgets (steps/tokens/time/cost) in agent-core — we must add.
- No multi-tenant identity/quota concept; `getApiKey(provider)` and `ClientIdentity` are closest.
- Wire protocol: Pi's RPC JSONL (command/response/event/extension_ui) differs from Nova's `hello/command/event/error` families; Nova's is the one to be compatible with. Pi's events are the in-process `AgentEvent` union; Nova's are protocol frames — need a mapping table (to be done against Nova docs/PROTOCOL.md by the other track).
- Decision models: Pi has `classify()` in pi-ai; Nova has `decide/`; both converge on choice/score/bool(noul) — a shared shape.
- Embeddings and speech-to-text: not seen in pi-ai README TOC (it has image generation and classification, no embeddings/STT/TTS). Pi does not cover Nova's gateway breadth (embed/voice).

## 10. Pointers

- agent/README.md — best single doc for the loop.
- agent/src/agent-loop.ts L170-300 (runLoop), L393-420 (streamAssistantResponse + transformContext), L520-650 (tool execution seq/parallel).
- agent/src/types.ts — AgentLoopConfig, AgentTool, AgentEvent, CustomAgentMessages.
- ai/src/types.ts L779-870 (Tool, AssistantMessageEvent, Model).
- ai/src/api/cloudflare-ai-binding.ts — Worker→AI Gateway via binding fetch.
- durable/README.md "Storage", "Hooks", "Signals"; durable/test-workers/worker.ts; durable/docs/suspendable/spec.md; durable/src/storage/sqlite/cloudflare.ts.
- coding-agent/docs/{session-format,compaction,rpc,extensions,security}.md.
- codemode/README.md "Usage on Cloudflare Workers".
