# Track 5: Landscape notes (research date 2026-11-11)

Confidence: Pi / Cloudflare Agents / Vercel / MCP / OTel / Mastra claims are from fetched docs (URLs inline).
Not independently verified: bundle sizes, Workers compat of OpenAI Agents JS, VoltAgent, LangGraph.js, tsdown specifics (search came back thin; marked [unverified]).

## 1. Framework survey

### Pi 1.0 (earendil-works/pi, formerly badlogic/pi-mono) — THE most relevant reference
- Pi 1.0 shipped 2026-10-01. Packages split: `pi-ai` (provider layer), `pi-agent-core` (ONLY Agent, the loop, proxy stream, types — the experimental harness was removed in 1.0), `pi-durable` (new durable harness), `coding-agent`.
  - https://github.com/earendil-works/pi/blob/main/packages/agent/CHANGELOG.md
- pi-agent-core loop: `beforeToolCall` (preflight block) and `afterToolCall` (mutate result) hooks; `steer(msg)` = interrupt after current tool, skip remaining tools; `followUp(msg)` = deliver only when agent would otherwise stop; `prepareArguments` hook before schema validation (compat shim for resumed sessions with old tool schemas); `durationMs` on tool results (1.1.0).
- pi-durable (experimental, API changes between releases): https://earendil.com/posts/pi-durable/ , spec: https://github.com/earendil-works/pi/blob/main/packages/durable/docs/spec.md (6.5k lines, normative)
  - Everything committed to storage before shown; "one line of atomic commits". Storage: SQLite (node), JSONL, memory; DO SQLite via Cloudflare adapter.
  - Restart point model: after every durable transition, replace `operationState(operationId)` with the complete total current state; recovery reads it, never replays a journal. (https://github.com/earendil-works/pi/blob/main/packages/agent/docs/harness.md)
  - Provider calls and real tool calls wrapped in two commits: INTENT ("about to do X, output will use ids R, U") then SETTLEMENT. Tools declare `replay: "safe" | "unsafe"` (default unsafe). Unsafe tool interrupted mid-run => recorded as failed/orphaned ("could not resume"), not re-run. Replay-safe tools with external effects still need own idempotency.
  - Hooks: `beforeTool` (rewrite args / `{block: reason}`), `afterTool`; chain across extensions; hook results durable in the tx that consumes them.
  - Approval is just an extension: `beforeTool` hook awaits approval, returns `{block: "Nobody approved the deploy."}` or undefined. Worth copying exactly.
  - Busy conversation input: `whenBusy: "steer" | "followUp" | "reject"`. Multi-client: late joiners get current view then deltas.
  - Compaction, forks, subagents (child tasks), task graph, usage & cost tracking, code mode (deterministic sandbox script with journaled tool results) all in the package.
- Cloudflare integration (2026-10-02): `PiHarness` in Agents SDK (`agents/harness/pi`), runs Pi Durable inside a DO, stores state in DO SQLite, resumes after eviction via Lifecycle job queue. Pi packages are optional peer deps at ~1.5; each agents release supports one Pi minor.
  - https://developers.cloudflare.com/changelog/post/2026-10-02-pi-harness/
  - Cloudflare Agents also has `agents/models/pi-ai` (Workers AI + AI Gateway) and a "Pi AI" doc page.
- Takeaway: user's instinct to build their own is fine, but the *design* of pi-durable (intent/settle commits, replay: safe|unsafe, total-state restart point) is the best-documented prior art for exactly the durability question in issue #1605. Read spec sections on tool tasks + recovery before designing. Don't depend on it (experimental, API churn).

### Cloudflare Agents SDK (cloudflare/agents)
- Agent class on DO: SQLite state, `schedule()` (multiplexes one alarm slot), queue (`cf_agents_queues`), retries (default 3 attempts, 100ms–3s), `keepAlive()` (30s alarm heartbeat), `runFiber(name, fn)` (registers in SQLite before fn, deletes after; `stash()` checkpoints; `onFiberRecovered` after eviction; alarm path recovers background agents with no clients), `startFiber()` for durable acceptance. Sub-agents are DO facets sharing parent alarm.
  - https://developers.cloudflare.com/agents/runtime/execution/durable-execution/
  - https://developers.cloudflare.com/agents/concepts/long-running-agents
- Harness options: Pi, OpenCode, Think (their own), Flue (blog 2026-?: https://blog.cloudflare.com/agents-platform-flue-sdk). "Code Mode" (`@cloudflare/codemode`, Dynamic Workers isolates) = one tool that runs model-written TS against bound APIs. Worth considering as the answer to tool-list bloat.
- Limits (https://developers.cloudflare.com/durable-objects/platform/limits, updated 2026-10-29): DO CPU 30s per invocation default, configurable up to 5 min (`limits.cpu_ms`); alarm handlers 15 min wall; DO RPC/HTTP wall unlimited while connected; Workflows per-step wall unlimited (CPU-limited); 10 GB SQLite per DO. Idle eviction ~70–140s w/o requests/alarms. "Agent-internal: minutes per activation w/ keepAlive; Workflows: unlimited steps".
  - This largely answers the issue's "need real numbers" question: LLM waits don't count as CPU, so a loop of many model calls is fine; the risk is eviction (deploys/platform), which fibers/alarms address. Still must spike to measure.

### Vercel AI SDK (v6 → v7 now) 
- `ToolLoopAgent` (in `ai`): in-memory loop; default `stopWhen` = 20 steps (`isStepCount(n)` helper in v7); returns when model stops calling executable tools, approval needed, external tool handling, or stop condition. Durability lost on crash.
- `WorkflowAgent` (`@ai-sdk/workflow`, runs on Vercel Workflow DevKit, `workflow@5`): each tool `execute` marked `'use step'` => durable step w/ 3 auto-retries; `needsApproval` suspends workflow (hours/days).  https://vercel.com/kb/guide/what-is-workflowagent
- v7 approvals: `toolApproval` option (per-tool map `'user-approval'`, or function of input; `@ai-sdk/policy-opa` for policy-as-code, Rego); signed approvals (`experimental_toolApprovalSecret`, HMAC, fail-closed) to stop clients forging approvals; subagent tools cannot use toolApproval. MCP tool annotations (`readOnlyHint`, `destructiveHint`) copied to `toolMetadata.annotations` for use in policy.
  - https://ai-sdk.dev/docs/agents/tool-approvals
- Workers: AI SDK works on Workers (Cloudflare ships `workers-ai-provider`, `ai-gateway-provider`; Agents SDK `AIChatAgent` is built on it). Heavy-ish (many providers, UI types). Zod peer dep.
- Borrow: stop-condition vocabulary (step count / token / custom predicates), approval-as-policy-function over (tool, input, metadata), signed approval tokens. Don't borrow: UIMessage-centric data model.

### Mastra
- Runs on Node/Bun/Deno/Cloudflare (`@mastra/deployer-cloudflare`, bundles Hono server; needs external storage e.g. `@mastra/cloudflare` CloudflareDOStorage, D1). Durable agents (`createDurableAgent`) = agentic loop inside durable workflow, memoized steps, PubSub streaming, suspend/resume approvals. Goals w/ run budgets; AgentController for coding-style UX. Big framework (workspaces, evals, memory, observability) — opposite of "small core".
  - https://mastra.ai/docs/harness/durable-agents  — NOTE their own warning: recovery "re-runs the agentic loop from last persisted snapshot, which can reissue LLM calls (with real cost) and re-execute tool calls" — i.e. the problem pi-durable's intent/settle commits solve more carefully.

### OpenAI Agents SDK (JS) https://openai.github.io/openai-agents-js
- Primitives: Agent, run(), tools, handoffs, guardrails (input validation in parallel with run, fail fast), sessions, HITL, tracing, sandbox agents, realtime/voice. Small API surface. Workers compat: [unverified] — docs list it as runtime-agnostic-ish, tracing exporter is OpenAI-specific; Grove would use custom provider anyway. Borrow: guardrails-in-parallel idea, handoffs vs agent-as-tool distinction.

### LangGraph.js
- Graph/state-machine model with checkpointers per super-step; LangSmith docs have a Workers deploy guide (Hono + per-thread DO for SSE event log; MemorySaver default is NOT durable on Workers — need durable checkpointer). D1 checkpointer exists for Python Workers (cloudflare/langchain-cloudflare). Heavy dependency graph [unverified size]. Borrow: checkpoint-per-step + interrupt/resume vocabulary. Skip as dependency.

### Claude Agent SDK
- Wraps the Claude Code binary as a long-running process w/ shell + filesystem; docs say run in container sandbox (1 GiB RAM, 5 GiB disk, 1 CPU recommended); sandbox providers incl. Cloudflare Sandboxes. Cannot run in a Worker/DO. Not a candidate for the core; possibly a *tool target* (spawn into Cloudflare Sandbox for code-heavy jobs). Hooks/permissions/subagent vocabulary is good reference. https://code.claude.com/docs/en/agent-sdk/hosting

### TanStack AI
- `@tanstack/ai` core: `chat()` agent loop with loop strategies; `toolDefinition()` isomorphic (`.server()`/`.client()`), `needsApproval` + `approvalSchema`, interrupts/resume via `parentRunId`+`resume` params; `decide()` typed choice/score/boolean questions (very close to Nova's decide package); `@tanstack/ai-cloudflare` (Workers AI chat/embeddings/image/speech/transcription + AI Gateway); memory + sandbox "run journal"/durable-runs docs exist. Interesting direct analogue to Nova's gateway-ish scope (embeddings, STT, TTS, decisions) in TS. https://tanstack.com/ai/latest/docs/getting-started/overview
- Borrow: tool definition shape; `decide()` surface; approval w/ typed payload.

### VoltAgent — [unverified; no useful results]. Skip unless time.

## 2. Design topics

### (1) Durable loops on Cloudflare — options
A. DO + alarms + SQLite, hand-rolled: loop runs inside DO; after every model response and every tool settle, commit state to SQLite; set alarm as dead-man's switch; on `alarm()`/`onStart` find non-terminal runs and resume. Matches Agents SDK `runFiber`+`stash` (could use Agents SDK Agent class purely as runtime, bring own loop: "build your own loop directly on the Agents SDK runtime").
B. Workflows: each model call and tool call = `step.do` (exactly-once settle, retries/backoff, `waitForEvent` up to 1yr, `waitForApproval` via Agents integration). Unlimited steps, per-step wall unlimited, 1 step = 1 persisted result (size limits apply — check). Cost: persisted state per step, separate class/wrangler config, harder to stream tokens to clients, loop shape forced into step graph (dynamic loop => `while` with step.do names unique per iteration).
C. Hybrid (recommended to spike): DO owns session transcript + streaming + approvals inbox; heavy/long autonomous runs executed as a Workflow whose steps call the DO. Cloudflare's own guidance: agent-internal for agent-centric work, Workflows for independent multi-step pipelines with retries.
Pattern to copy from pi-durable: two commits per effect (intent -> settle), tool `replay: safe|unsafe`, restart point = full current state not a journal, idempotency key = toolCallId (derive deterministically from run id + step index), unsafe interrupted tool => synthetic "interrupted, outcome unknown" tool_result so the model can decide, never silently re-run.
Cost trap: crash between model response and checkpoint re-bills the model call; checkpoint immediately after streaming completes; keep Lumen request ids so Lumen can dedupe/return cached completions [idea, not verified].

### (2) HITL for headless pipelines
- Treat approval as data: policy = f(tool risk class, args, tenant, run context) -> allow | deny | ask. Vercel v7 `toolApproval` + `@ai-sdk/policy-opa`; Pi `beforeTool` hook. Tool risk classes: read / write-reversible / write-irreversible / external-spend / publish. Use MCP annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) as inputs but not trust (server-declared hints).
- Headless: `ask` => persist pending approval row + suspend run (no compute) + notify (email/Zephyr, Arbor inbox, webhook). Resume via signed token (HMAC over run id, call id, args hash, expiry) — Vercel's signed-approval design; prevents forged approvals. Timeout => policy default (deny, or skip tool & tell the model), never silent allow.
- Pre-authorized scopes for background: a pipeline declares allowed tools + budgets up front ("capability grant") so the vast majority never hit `ask`. Escalation ladder: auto-allow -> allow w/ audit -> ask human -> deny.
- Cloudflare: Workflows `waitForApproval(step,{timeout:"7 days"})` + `approveWorkflow/rejectWorkflow`; MCP elicitation for in-call input. https://developers.cloudflare.com/agents/guides/human-in-the-loop

### (3) Billing / budgets
- Budgets are first-class loop inputs: maxSteps, maxToolCalls, maxTokens(in/out), maxCostUsd, maxWallMs, per-tool call caps. Check *before* each model call and each tool call (pre-flight, using worst-case estimate: max_tokens * price) and *after* (actual). Terminal reason enumerated (`budget_exhausted:cost`) and surfaced to the model for a graceful wrap-up turn when possible (Anthropic doc shows pause_after_compaction + counter pattern for total token budgets).
- Accounting: one append-only usage ledger per run (model usage from Lumen, tool cost from tool), rolled up per tenant; quota enforcement stays in Lumen/Threshold (SDK Boundaries) — core only *propagates* a run-scoped budget + tenant id, Lumen enforces and returns remaining. Pi Durable already has "Usage and Cost" tracking; Nova has `usage/` and ivy's `llm.Gate` (provider decorator enforcing policy/caps/ledger) — same pattern: budget guard = provider decorator.
- Tool billing question from issue: recommend tool declares `cost` metadata (static or computed) and reports actuals; core debits the run budget; platform-level billing stays outside core.

### (4) Transcripts / trace
- OTel GenAI semconv: spans `invoke_agent` (CLIENT for remote agent / INTERNAL for in-process), `chat`/inference, `execute_tool` (`gen_ai.tool.name`, `gen_ai.tool.call.id`, `gen_ai.tool.type`); attrs `gen_ai.conversation.id`, `gen_ai.usage.*`; messages are opt-in. Status: Development; moved in June 2026 (v1.42.0) to repo open-telemetry/semantic-conventions-genai; churn => keep an internal versioned event model and map to OTel at export (advice in https://john-hodge.com/blog/opentelemetry-genai-semantic-conventions/). MCP 2026-07-28 spec documents `traceparent/tracestate/baggage` in `_meta` (SEP-414) so trace context can flow through MCP tool calls.
- JSONL transcript (Nova frame families) stays the source of truth; OTel is a projection. Pi's `durationMs` on tool results is a cheap useful field.

### (5) Context / compaction for small cores
- Layered, cheapest first: (a) truncate/limit tool output at the tool boundary (pi-durable has per-tool output limits + truncation records); (b) tool-result clearing of old results keeping last N (Anthropic `clear_tool_uses` context editing; Mastra `ToolCallFilter.filterAfterToolSteps`); (c) summarization compaction at threshold with recent turns kept; (d) memory-file offload before clearing. Anthropic now offers server-side compaction (on-demand + threshold, beta) — but core talks via Lumen to many providers, so implement compaction as a core hook with a pluggable summarizer (Nova has `compaction/` — port its algorithm). Keep compaction entries in the transcript (pi-durable `ContextEdit` targets entry ids; replaying yields effective prompt) so it's auditable/replayable.
- Tool search / deferred tool loading for big registries; Cloudflare Code Mode as the extreme version.
- For Grove's pipelines (short, bounded runs) compaction may be unnecessary in v1 — budget the steps instead; design the hook, ship later.

### (6) MCP / A2A
- MCP latest spec: 2026-07-28. Stateless per-request model (per-request capability negotiation + protocol version in `_meta` and `MCP-Protocol-Version` header), Streamable HTTP requires `Mcp-Method`/`Mcp-Name` headers, `ttlMs`/`cacheScope` on list results, deterministic tool ordering (helps prompt caching), Tasks (async long-running with polling/durable handles), extensions field, Skills over MCP, MCP Apps, SEP-414 trace context. Stateless is great for Workers. https://modelcontextprotocol.io/specification/2026-07-28/changelog
- Client patterns: Vercel `@ai-sdk/mcp` `createMCPClient` (HTTP/SSE; stdio dev only; create+close client inside the step that calls tool — serializable-step rule; `maxRetries` off by default, only enable for safe-to-repeat tools). Cloudflare Agents has MCP client + McpAgent server + elicitation.
- Relation to #1605 Mycelium question: Mycelium = MCP server exposing Grove tools; core should treat "MCP server" as just one tool *provider* behind the registry interface (adapter converts MCP tool -> core Tool w/ annotations->risk class). Cheap, no extra core.
- A2A: OTel mentions A2A endpoint spans; I did not research the A2A spec itself — low priority; treat agents-as-tools as the primitive (Cloudflare `agentTool`, Mastra subagents, OpenAI agents-as-tools).

### (7) Schemas
- Standard Schema (`@standard-schema/spec`; Zod, Valibot, ArkType, TypeBox adapters implement it) now includes a JSON Schema interface (`Props.jsonSchema` input/output with `target` option) — so a core can accept any Standard-Schema-compliant validator for tool input AND get JSON Schema for the model without depending on Zod. https://github.com/standard-schema/standard-schema
- Options: accept Standard Schema (+ raw JSON Schema w/ own validator e.g. via `@cfworker/json-schema` [unverified for 2026] for MCP-sourced tools). TypeBox emits JSON Schema natively and is tiny; Pi uses TypeBox-ish (`pi-schema` package) [unverified]. Zod is a peer dep for Vercel/TanStack. Workers note: avoid libraries using `eval`/`new Function` (Ajv in default mode) — Workers disallow dynamic code eval; use precompiled or cfworker.
- Recommendation: core types depend only on `@standard-schema/spec` types (zero runtime); ship helper for JSON Schema tools.

### (8) Packaging
- Structure: pnpm workspace: `core` (zero deps, only Web APIs: fetch, ReadableStream, crypto, AbortSignal, TextEncoder; no `node:*`), `adapter-workers` (DO storage, Workflows), `adapter-node` (sqlite/jsonl, stdio), `provider-lumen`. `exports` map w/ `types` first, ESM only, conditions `workerd`/`worker`/`node` only where adapters differ; `sideEffects:false`.
- Bundler: tsdown (Rolldown-based tsup successor) or tsup; [unverified in this pass]. Keep the bundle unbundled-ish (preserve modules) so Workers apps tree-shake.
- Tests: `@cloudflare/vitest-plugin` is now the recommended integration (docs updated 2026-08-20; `@cloudflare/vitest-pool-workers` still published, 0.15.0, with a migration guide to the plugin) — runs tests in workerd via Miniflare, supports DO. Use it for the Workers adapter + a plain Vitest project for core; add a conformance test-suite shared by both storage adapters (Nova's "matrix rule" analog). Fault-injection test: kill DO mid-run in miniflare, assert resume doesn't double-fire an unsafe tool.
  - https://developers.cloudflare.com/workers/testing/vitest-integration

## 3. Cross-cutting recommendations (also in final reply)
1. Core = loop + Tool/Provider/Store/Policy/Budget interfaces, Web-API only, zero runtime deps except standard-schema types.
2. Steal pi-durable's effect model (intent -> settle, replay safe|unsafe, total restart state) and pi-agent-core's hook set (beforeTool/afterTool/prepareArguments/steer/followUp).
3. Approval = policy function + signed resume tokens + suspend-without-compute; not a UI concept.
4. Budget = provider/tool decorator + run-scoped ledger; quota truth stays in Lumen.
5. Spike path: DO+alarm hand-rolled loop first (simplest; measures eviction/recovery), Workflows as step-executor option for long runs. Do NOT adopt Vercel WorkflowAgent (needs Vercel Workflow runtime) or Claude Agent SDK (needs a process/sandbox).
6. Decide early whether to build ON the Cloudflare Agents SDK runtime (schedule/fibers/sub-agents/state for free; build own loop on top — they explicitly support this) vs raw DO. Trade-off: dependency on fast-moving beta (agents SDK, "Lifecycle" capabilities) vs less code.
7. Open verification items: VoltAgent; OpenAI Agents JS on workerd; tsdown details; A2A; Workflow step result size limit; whether Lumen can accept idempotency keys.
