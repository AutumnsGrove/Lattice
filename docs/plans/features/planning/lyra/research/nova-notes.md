# Nova → Workers-first TS agent core: design extraction

Source: `/home/user/autumnsgrove/nova` @ a627d38 (public, `AutumnsGrove/nova`). ~55.6k lines Go total; core budget ≈11k (README, ARCHITECTURE §2); agent loop ≈1.4k, `agent/*.go` non-test ≈2.3k with hooks/queue/retry. Pi's agent core ≈2.5k (ARCHITECTURE:~100).
File refs are repo-relative to nova. "Issue" = Lattice #1605.

---
## 0. Headline findings (read first)

1. **Issue #1605 mis-describes the wire protocol.** It says frame families are `hello, command, event, error`. Actual (`proto/codes.go:9-14`, `docs/PROTOCOL.md` "Frame families"): `hello`, **command** (the frame `type` IS the command name, e.g. `{"type":"prompt"}` — `proto/frame.go` `Command.Type`), **response** (`ok`/`error` for one command), **event** (no id, has `seq`/`ts`), **ui_request**, **ui_response**. `error` is an *event* type and a field on `response`, not a frame family. Extension connections add `init/register/hook/hook_result/tool_call/tool_result/command_result/append_entry/complete(_result)/decide/embed/speak/transcribe/log/shutdown`. Fix the issue text before the spike.
2. **Nova's loop has NO token/cost/time budgets.** Only `MaxTurns` (+ optional `WrapUp` final no-tools request) and `RequestTimeout` per provider attempt (`agent/agent.go` Config; `agent/run.go:140-165`). `grep` for cost/token caps in `agent/ tool/ usage/` finds nothing. The issue's "step, token, time, and cost budgets" is NEW work in the TS core, not a port. Good news: `usage` is accumulated per run (`r.usage.Add`) and emitted as `usage`/`turn_end`, so cost cap is a natural post-turn check (`runTurn` after `r.usage.Add(usage)`), mirroring how `MaxTurns` is checked at turn start. Wall-clock matters far more on Workers (see §9).
3. **Nova's three "gateway" primitives (decide, embed, voice) are provider-agnostic contracts + a `roles` table**, but every shipped adapter targets **OpenRouter** (`decide/openrouter`, `embed/openrouter|openai|ollama`, `voice/openrouter`). In Grove, **Lumen already is that gateway** — the TS core should consume Lumen for `complete/embed/decide/transcribe/speak` the same way Nova consumes the OpenRouter adapters, keeping the *role table* in the core and the *wire* in Lumen. (Cross-check with Lumen track.)
4. **The shape that matters for porting is small**: `Provider` (1 method), `Tool` (2 methods), `Registry`, `Policy.Decide` (pure fn), `Hooks` (12 named hook points), `Agent.Run/Start/Abort/Steer/FollowUp`, event union, session = append-only entry tree. Everything else (TUI, extensions-as-subprocess, bash/fs tools, auth/login, config trust, updater, doctor) is host-specific and should not port.
5. **Nova is deliberately "one trusted agent per server"** (PROTOCOL "HTTP transport": multi-user session management out of scope). Multi-tenant Grove needs the opposite: DO-per-session, tenant-scoped everything. That's the biggest design delta, not a detail.

---
## 1. Layering and size discipline (copy verbatim as *process*)

- Layer DAG enforced by a script (`scripts/importcheck`): `message ← provider ← roles ← decide/embed/voice ← tool ← proto ← agent ← mode ← cmd`; `message` imports nothing; core never imports UI (ARCHITECTURE §2 "Layer rules").
- **Line budgets per package are CI-enforced** (`scripts/linecount`, D37): message ≤250, provider ≤600, roles ≤200, decide ≤400, embed ≤260, voice ≤540, tool ≤660, permission ≤340, proto ≤600, agent ≤1440, session ≤900, compaction ≤600, usage ≤200, testkit ≤1260. "If a package outgrows its budget, split it or cut scope." This is the single best anti-bloat mechanism; TS equivalent = a tiny script counting non-test LOC per package dir + `dependency-cruiser`/`eslint-plugin-boundaries` for the DAG.
- `examples/embed/` is a compiled+tested consumer that may import only the harness layer; importcheck fails if it reaches into the app shell. It proves the library is embeddable and can't rot. TS analog: `examples/workers-minimal/` built in CI.
- Dependency allow-list per package (D46). Pin versions. Core uses 1 dep (yaml). **For TS-on-Workers this is even more important** (bundle size, cold start).
- AGENTS.md says docs must let an agent read all it needs "in under 40,000 tokens" (PLAN §2 goals).

## 2. Core types (port nearly 1:1)

### message (`message/message.go`)
```
Message { role, content, reasoning?, tool_calls?[{id,type?,function:{name,arguments(raw JSON string)}}],
          tool_call_id?, name?, parts?[ContentPart], synthetic? }
ContentPart { type:"image", mime_type?, data? (base64), url?, name? (display only) }
```
- OpenAI-shaped on purpose so provider layer is thin. Media only on *user* messages; tool-produced images are re-injected as a **synthetic user message after the tool batch** (agent/run.go `dispatchTools` → `toolImageMessage`). `synthetic:true` lets clients render it in the tool card instead of as a typed message; compaction's `nearestUser` skips synthetic (compaction/cut.go).
- Reasoning is stored/displayed but not re-sent unless provider needs it.

### provider (`provider/provider.go`)
```
Provider { Name(); Stream(ctx, Request, onEvent) -> Response|error }
Request { model (wire slug), model_id (catalog id), messages, tools[ToolDef], toolChoice, parallelToolCalls?,
          temperature?, maxTokens, stop[], reasoningEffort, providerOptions{} (merged into wire body), extraHeaders, promptCache? }
StreamEvent { text_delta | reasoning_delta | tool_call (fully assembled) | usage (mid-stream) | error }
Response { message, finishReason (stop|length|tool_calls|content_filter|error), usage, model, provider }
Usage { prompt, completion, reasoning, total, cached, cache_write, cost_usd, cost_source(provider|allowance|catalog), allowance_usd, list_cost_usd, billing_source }
```
- `prompt_tokens` = whole prompt incl. cached. `Usage.Add` + `combineCostSource` (provider > allowance > catalog) so mixed totals read honestly.
- **Tool calls are emitted only once fully assembled** (not partial-JSON deltas) — simplifies the loop. `Collector` (`provider/collector.go`) assembles deltas per dialect; dialects: openaicompat chat, Responses API, Anthropic Messages, all on `ssestream`.
- **Spend is never lost**: provider failure returns usage accrued so far with the error (ARCHITECTURE §4).

### tool (`tool/tool.go`)
```
Tool { Info(); Run(ctx, rawJSONargs, *Context) -> Result|error }   // error => IsError result to the model, loop continues
Info { name, description, parameters(JSON schema), parallel, readOnly, destructive, openWorld }  // MCP-style annotations
Result { content, is_error, truncated, details(raw JSON, for renderers, NOT sent to model), parts[] }
Context { workDir, roots, data(any: app deps), sessionID, callID, emit(progress), complete, decide, embed, speak, transcribe, inject(msg), addUsage(usage) }
```
- **`Context.Data` is the DI seam**: app dependency bundle rides on it; Nova never imports consumer types (INTEGRATION "The application owns its dependencies"). In TS/Workers: `ctx.env`/bindings + tenant context.
- **Nested model calls are first-class**: `Complete/Decide/Embed/Speak/Transcribe` on the tool context, with `AddUsage` to fold cost into the run total. This is exactly how a Grove tool would call Lumen.
- `Registry` (`tool/registry.go`): Register (dup is error), MustRegister, Replace, Unregister, **`View(names...)`** = scoped sub-registry sharing tool values with own state (per-run/per-child tool subsets without races), `Defs()` in registration order (stable order = cache-friendly), `Execute` validates schema first (tool/schema.go) → unknown tool / bad JSON are error results before dispatch.
- Empty tool result is normalised to `"(empty result)"` because providers reject empty tool messages (agent/tools.go:~18).

## 3. The loop (`agent/run.go`, `agent/turn.go`, `agent/tools.go`, `agent/queue.go`, `agent/retry.go`)

```
Run(history, prompt) → run_start → [turn_start → request → (retry*) → record assistant → dispatch tools → turn_end → TurnEnd hook → drain steering → follow-up?] → run_end
```
- **Exactly one `run_end` always** (even error/abort/panic); `reason ∈ done|exhausted|aborted|error`. `finish()` emits `error` event, runs `AgentEnd` hook with `WithoutCancel(ctx)`, then `run_end` (agent/run.go `finish`).
- `Start()` registers the run synchronously then goroutines it, so `Abort` right after the "accepted" response always cancels (PROTOCOL `prompt` note). Port: DO method that sets run state before returning ack.
- `ErrBusy` for concurrent run unless `queue`. `ErrNotRunning` once the loop made its final decision (`closing` flag) — **no accepted-then-lost messages** (`closeQueues()`/`closeAndDrop()` in finish; leftover queued msgs returned in `run_end.dropped_queue`).
- **Two queues (from Pi)**: *steering* (injected after current assistant turn finishes its tool calls) and *follow-up* (run after all pending work). Abort returns queued messages. A cancelled run does NOT drain queues into transcript (checked *before* drain).
- **Turn budget**: `MaxTurns` → `exhausted` (never an error). `WrapUp` = synthetic user instruction + one final request **with no tools**; tool call/empty → honest fallback text `"I wasn't able to finish in time."` marked synthetic. Hooks can't extend a budget (`runTurnEndForWrapUp` ignores decision).
- **Tool dispatch**: parallel-capable consecutive calls run as a group (cap `MaxParallel`=8); a non-parallel tool is a barrier; results appended **in call order** regardless of completion; every call of the recorded assistant message ALWAYS gets a result (even "cancelled") so history never has dangling tool_calls. Panics → error result (both modes).
- **Order inside a call** (`runCall`): cancelled? → permission policy (emit `permission` event for EVERY decision incl. allow) → `ToolCall` hook (block/rewrite args) → `tool_start` → Execute with progress → `ToolResult` hook → empty-normalise → `tool_end`.
- **Progress** (`tool_update`) is non-blocking: full 32-slot buffer drops updates; closed before `tool_end` so ordering holds.
- **Retry** (agent/retry.go): default 3 retries, base 1s, cap 30s, jitter 0.2, honour `Retry-After` (capped 5 min — hostile header can't park a run), emits `retry{attempt,max,delay_ms,error}` ("discard the in-progress message of the current turn"). Network timeouts retryable on every dialect and partial response kept. `RequestTimeout` per attempt: NOT retried (stalled whole budget unlikely to recover) and ends run as `error`, not `aborted`.
- **Hooks** (agent/hooks.go; 12 names shared by Go callbacks, bundled ext, protocol): `input, before_agent_start, transform_context, before_provider_request, stream_delta, message_end, tool_call, tool_result, turn_end, agent_end, session_start/shutdown, compaction_before`. Every hook runs under `HookTimeout` (5s) with panic recovery; failure = skipped + `extension_error` event. **Hooks never crash the loop.** `TurnEnd` returns `{End, Continue, Inject[]}` — this is how app control (Polaris "research nudges", ending on a pending question) is done without touching the loop.
- **Stream filtering**: `TextFilter`/`ReasoningFilter` build a fresh stateful filter per attempt; live-only — stored message keeps original.
- **Cache discipline** (ARCHITECTURE §6 + D134): request is append-only prefix; top-level `cache_control` marker; **never prune tool output mid-history at request time** (changes prefix → cache miss every turn); compaction is the one deliberate rewrite. Never re-marshal a prefix with different key order. Guard test `LPW02`.
- **`OnMessage` callback = caller owns history option**: fires once per produced message; lets app persist to its own store (D1/DO) instead of using Nova's session store.
- `Reconfigure(fn)` between runs only (ErrBusy during run); a run works from a config copy taken at begin.
- `Clock` interface (`Now`, `Sleep(ctx,d)`) injected everywhere time matters (retry, timeouts, thinking duration) — **tests never sleep**.
- Go-specific, don't port: goroutine+semaphore dispatch, `sync.Mutex`, `context.Context` (→ `AbortSignal`), `diag.Catch` crash reports, `recover()`.

### Not present in Nova loop (decide for TS)
- token budget, cost budget, wall-clock budget (see §0.2). Suggest: `Budget {maxTurns, maxCostUsd, maxTokens, maxWallMs}` checked at turn boundary; reason `exhausted` with `exhausted_by` detail; WrapUp reused.
- no persistence of a *paused* run (Nova's process is the run). On Workers a run must be resumable across DO eviction/alarms (see §9).

## 4. Protocol (`docs/PROTOCOL.md`, `proto/`)

Version 1, JSONL (UTF-8, `\n` only — NOT U+2028/9 aware readers), 64 MiB line cap (because base64 audio), unknown fields ignored, malformed line → failed response `bad_request` (non-fatal), unknown command → `unsupported`.

**Frames**: `hello` (both directions; client declares `capabilities:["ui.confirm","ui.select","ui.form","ui.widget"]`; server declares `modes`, `capabilities:["steer","fork","compact"]`, `session`). Server **never sends a ui_request the client didn't declare**.

**Commands (35)** (proto/codes.go:29-65): `prompt{text,attachments,queue}, steer, follow_up, abort, get_state, set_model, set_thinking, set_context_limit, set_tools, compact, session.new/resume/fork/tree/navigate/name/list, reload, get_messages, get_commands, list_models, get_extensions, get_usage, run_command, bash, shutdown, list_providers, decide, embed, speak, transcribe, login, login_submit, login_cancel, logout`.
- Response: `{type:"response", id, command, ok, data | error:{code,message}}`. `prompt` success = *accepted*, not finished.
- Errors codes (stable): `bad_request, busy, not_found, permission_denied, unsupported, timeout, provider_error, internal`.
- **decide/embed/speak/transcribe are blocking request/response commands, not runs — emit no run events.** (clean precedent for exposing Lumen primitives through the same wire.)

**Events (25)**: run_start, turn_start, message_start, text_delta, thinking_start/delta/end{ms,tokens}, tool_call{call:{id,name,arguments}}, tool_start, tool_update, tool_end{result:{content,is_error,truncated,details,parts}}, permission{decision,reason}, message_end{message,usage}, turn_end{usage}, usage{usage,total}, retry, compaction{entry,tokens_before,tokens_after}, queue_update{steering,follow_up}, run_end{reason,turn,usage,dropped_queue}, error{error}, extension_error, ui_expired, session_changed, state_changed, login_end. Every event: `seq` (per-connection counter) + `ts`; HTTP SSE ring buffer (1000) + `Last-Event-ID` resume, `state_changed{reason:"resync"}` when replay impossible (mode/serve/serve.go:~330-360; client dropped if 1024 events behind on stdio).

**Child (sub-agent) events**: carry `run:"c1"…`; run-level events (`run_start/run_end/turn_*/message_*/usage/error/queue_update/session_changed/state_changed`) NEVER cross from child to parent stream — a client treats the first `run_end` as end of request and a child `usage` would clobber the parent total. Child cost folded into parent usage once.

**HTTP**: `POST /v1/commands`, `GET /v1/events` (SSE), `POST /v1/ui_response`, `GET /v1/state`, `POST /v1/attachments`. Bearer token; refuses non-loopback without one; DNS-rebinding defences, CORS single exact origin, 10s header timeout.

### Minimum subset for a NON-coding background agent (my recommendation)
- Frames: `hello`, `command`, `response`, `event`. Skip `ui_request/ui_response` initially (approval is policy-resolved headless; see §6) — but keep the frame family reserved.
- Commands: `prompt, steer, follow_up, abort, get_state, get_messages, session.new/resume/fork/tree, compact` + the four primitive calls `decide, embed, transcribe, speak` (they are already stateless req/resp). Skip login*, bash, reload, get_extensions, run_command, list_providers, set_tools (maybe keep), get_usage.
- Events: run_start/run_end, turn_start/turn_end, message_end, text_delta, tool_call/tool_start/tool_update/tool_end, permission, usage, retry, compaction, error, session_changed, queue_update. Thinking_* optional. Keep `seq`+`ts`.
- Keep error codes verbatim. Keep `run`/`turn` ids and child-run tagging semantics.
- New frames likely needed that Nova lacks: **`run_paused`/`approval_requested` persisted-state events** (background runs with no UI), idempotency keys on `prompt`, tenant/auth in `hello`.

## 5. Sessions & compaction (`session/`, `compaction/`)

- **Session = append-only JSONL file; each line an Entry `{type,id,parent,ts,…}`; the active *leaf* selects the branch that supplies model context**; continuing from an older entry creates a branch, never deleting (session/entry.go; ARCHITECTURE §5). Entry types: `message, model_change, compaction, branch_summary, custom, custom_message, label, session_info`. Unknown types preserved verbatim (forward compat). `custom{keep:true}` survives compaction. `label`/`session_info` are display-only and never become the leaf.
- `Store.Messages(leaf)` rebuilds model-facing context: find last compaction on branch → emit `<summary>…</summary>` as user message → resume from `first_kept` entry → skip compaction entries. **Result always passes `message.Validate`; repair (e.g. orphan tool results) reported as warning** (`repairMessages`). Corrupt line → skipped, reported, rest loads.
- `Store` is the only authority for model context; assigning an in-memory slice never replaces it.
- **Compaction** (compaction/): estimate tokens = provider `prompt_tokens` of last response + heuristic (4 runes/token, +4/msg overhead, images flat 1000 tokens) for messages after it. Trigger when est > `limit - reserve` (reserve default 16,384 or 10% of limit, ≤ half). Defaults: keepRecent 20k tokens, summary ≤4k tokens, summariser input ≤100k. `context_limit` is per-session, not per-model (D25). **Cut at a user-message boundary, never inside a tool call+result; skip synthetic user msgs; fallback = assistant that begins a tool-call group** (`CutPoint`). Failed compaction never loses entries; run continues, event reports. Property tests: cut never splits a tool pair; active branch always a root→leaf path.
- Go/host-specific: file locking (`lock_unix.go/lock_windows.go`), path/dir scoping by cwd. → On Workers: DO SQLite table `entries(id PK, parent, type, ts, json)` + `meta(leaf)`; same tree semantics; single-writer guaranteed by DO. JSONL export/import for the "Nova-compatible transcript" goal.
- Forking: `session.fork{entry?}` copies the branch ending at entry into a new session.

## 6. Permissions & approvals (`permission/policy.go`, `agent/tools.go checkPermission`, PROTOCOL ui_request)

- `Policy{default, headless, rules[{tool(glob), match{arg:glob}, paths[globs], action}]}`; **most restrictive matching rule wins regardless of order** (rank allow<ask<deny); `Decide(call, interactive)` is **pure**. No rule + no default → **tool annotations decide: readOnly&&!destructive&&!openWorld ⇒ allow, else ask**.
- `ask` + no client attached → resolves to `headless` action (default **deny**; `headless: ask` is invalid). Decision reason string includes rule index/"headless -> deny". `permission` event emitted for every decision.
- Allow rules with `match` reject shell control operators (`permission/shell.go` `HasShellControlOperator`) so `git status*` can't be `git status; rm -rf`. Path rules resolve path-like args (`path,file,file_path,dir,cwd,paths[]`) against workDir; escaping paths only offered in absolute form (no `../` masquerade).
- Interactive ask: `ui_request{method:"confirm", title,message,default,timeout_ms,remember,tool,args}` → `ui_response{ok, remember:"session"}`; `remember:"session"` adds a session-scoped allow rule for exactly that tool name (never for deny). `timeout_ms` + `default` resolves unanswered requests; `ui_expired` event closes dialogs. `Ask` func must be concurrency-safe (parallel tools can ask simultaneously).
- **D41: a decision model may make a permission call stricter, never grant approval.** (Nice rule for Grove: Lumen "decide" can escalate to ask/deny, never auto-allow.)
- Issue's open question "approvals for a background pipeline with no UI": Nova's answer is only `headless: deny`. For Workers you need a **durable approval primitive** (persist pending ask in DO, notify via queue/webhook, resume on `ui_response`/HTTP callback) — NOT in Nova. Conservative default: headless deny + allow-list of readOnly Grove tools.

## 7. Provider layer, routing, usage

- **Route** (`provider/route/route.go`): library-consumer router built from values. `ProviderDecl{name,kind,baseURL,apiKeyFunc,httpClient}`, `Route{attempts[{provider, model(wire slug)}], fallbackOn, onFallback}` keyed by catalog id; `DefaultProvider` for unknown ids (request unrewritten); `Unknown(catalogID)` dynamic resolver; `ForceProvider` = kill switch; `SessionID` func read fresh per call. Returns a `Provider`, so it drops into the loop.
- **Fallback policy**: `OnLimitOrRefusal` (default) spills on 429/402/401/403/408/500/502/503/504 and in-band stream errors that are limit/overload; **never on 400/404/422, caller cancel, or unclassified errors**. `OnAnyError` exists but discouraged. Chain walked once, N attempts = ≤N calls, never loops. `OnFallback(from,to,err)` fires per spill; `Response.Provider` names who answered → **paid retries are always visible/attributable**.
- **Model vs ModelID**: `model` = wire slug onto the wire verbatim; `model_id` = stable catalog id for routing/ledger. A wire slug in the catalog slot once routed subagents to the wrong backend — translate at the boundary (INTEGRATION). Catalog is code-defined (id, slug, context window, pricing) so stored choices survive provider renames and cost has a fallback.
- **Error classification** (`provider/error.go`): `provider.Error{status,code,message,body(scrubbed of credentials, bounded),retryable,retryAfter}`; retryable statuses 408,409,425,429,500,502,503,504; Retry-After parsed as delta-seconds or HTTP date, capped 5 min, overflow-safe.
- **ssestream** (`provider/ssestream/ssestream.go`, ~393 lines): shared POST+SSE, connect timeout 30s, idle timeout 120s, header precedence, credential-per-request (key saved mid-run takes effect), `Classify`. In-band stream errors carry status 200 → `StreamErrorRetryable(code,msg)`.
- **Usage/ledger** (`usage/`): per-model + total, **`covered` (subscription allowance) vs `real` (provider-billed) split so allowance never reads as spend**; cost = provider-reported else catalog price (cached tokens at 0.1× input; cache-write 1.25×). `cost_source` provenance. Totals are `Usage.Add`.
- Provider-as-chokepoint (from ivy): policy/caps/ledger as a *provider decorator*, loop stays ignorant. → Natural place for Grove tenant quota (Threshold) + Lumen quota.
- `chat.Complete` one-shot seam (`provider/chat`, ≤160 lines): same router, no agent, for titles/extraction.

## 8. Primitives: decide / embed / voice + roles (the "gateway" pattern)

### roles (`roles/roles.go`, ≤200 lines) — the shared resolver
```
Role{model, fallback, timeout}   Table.Resolve(name) -> Chain{models[primary, fallback?], timeout}
Table.Do(ctx,name,attempt) / Attempt(ctx,model,timeout,fn)   // one attempt per model, per-attempt timeout, stop on caller cancel
```
- **Name containing "/" = direct model id passthrough; bare unknown name = config error naming the role (never a wire error).**
- **Alias refusal**: ids starting `~` or ending `-latest` refused unless `allow_aliases` — "an alias moves without notice so a recorded model id would no longer name a build." `Response.Model` records the resolved build.
- Table copies the config (later change can't move a call in flight). Timeout driven by injected Clock; role timeout surfaces as retryable `provider.Error{code:"timeout"}` (distinguished from caller cancel via `context.Cause`). **Usage from failed attempts is summed and returned with the error** (spend never lost).
- Fallback model per role, tried only while caller ctx live.

### decide (`decide/decide.go`)
- `Decider.Decide(ctx, Request{model, state(string | []Source), questions map[name]Question}) → Response{answers, usage, model}`. Question kinds: `choice` (criteria map = options), `noul` (probability yes/no), `score` (ordered `levels`, lowest first). Unknown kinds carried through. Questions are evaluated **in parallel and in isolation against shared state** → fan out N questions in ONE request. One cost per call, not per question. Role decorator `decide.Roles`. `Catalog.List` = live roster.
- It's OpenRouter's "Decisions API" (+ legacy Jev `/systemone`). Not a Cloudflare/Lumen concept today — check whether Lumen has an equivalent before porting (likely maps to a small-model "classify" task).

### embed (`embed/`)
- `Embedder.Embed(ctx, Request{model, input[], truncate?}) → {vectors, model, dims, usage}`. `MaxBatch`=128, response mapped by `index`, **missing/duplicate/out-of-range index refused**. Truncation is explicit opt-in. **`Role.Dims` check: a fallback returning different dimensions stops the chain with `DimsError` — mixing vector spaces corrupts a stored index.** No store/index/chunking in Nova ("caller owns its data plane") — maps well to Vectorize in Grove.

### voice (`voice/`, `docs/VOICE.md` 631 lines)
- `Speaker.Speak(SpeechRequest{model,input,voice,format(mp3|pcm),speed,instructions,provider{}}) → Clip{audio(b64),format,mime,sample_rate,channels,bits_per_sample,model,voice,generation_id,usage}`; `Transcriber.Transcribe(TranscribeRequest{model,audio(b64),format(wav|mp3|flac|m4a|ogg|webm|aac),language,temperature,timestamps,verbose}) → {text,language,duration,segments,words,model,generation_id,usage}`.
- **Speech role bundles model AND voice; a fallback restates its own model+voice** (voice names belong to a model: `alloy` 400s on Voxtral/Kokoro) — analogous to embed's dims check: *the thing that can't survive a fallback must be declared by the fallback*. Transcribe role = plain model/fallback/timeout.
- `Chunks`/`Join`: sentence-boundary chunking for long input; MP3 frames concatenate, PCM gets one WAV header at end; 32,000-rune guard. Speech returns no usage → cost is catalog estimate (`cost_source:"catalog"`), off in library mode. Clip crosses protocol as base64 (hence 64 MiB line).
- Exposed identically through: `tool.Context.*`, `agent.Config.*`, protocol commands, extension frames (capabilities `model:decide|embed|speech|transcribe`, per-run caps default 20/ext).

### Pattern to copy
Contract interface + wire adapter(s) + `Roles` decorator + same 4 seams (tool ctx, agent config, protocol command, extension frame) + cost via `AddUsage`. **Applications name roles ("oracle", "verify"), never vendors; changing the best model is a config edit.** Perfect fit for Data Primacy (`lumen-models.json`).

## 9. What does NOT port to Workers (host-specific) and what's new

Doesn't port: `bash/fs/search` tools, `proc/` process groups, `auth/` loopback OAuth PKCE & `~/.config` key store, trust-the-project config, TUI (`tui/` 10k lines), `update/`, `doctor/`, subprocess extension host (`ext/proc.go` ~570, `ext/host.go` ~996 — spawns processes), file locking, stdio RPC (keep HTTP/WS), GitHub Action mode, clipboard/media decode (`media/` uses image libs; Workers needs Images binding or skip), YAML config (use TS config modules per Data Primacy), crash reports.

New/hard on Workers (Nova gives no answer):
1. **Long runs vs limits**: Nova's `Run` is one synchronous process. A Worker request/DO invocation has wall-clock/CPU/subrequest limits; a loop must be **resumable at turn boundaries** (persist entries after each message via `OnMessage` analog; DO alarm to continue; or Workflows/Queues for orchestration). Needs real numbers (issue's own open question). Streaming SSE from a DO keeps the invocation alive while the client is connected; headless background runs need alarms/Workflows.
2. **Per-turn persistence is already the design** (`OnMessage` fires synchronously per message and a non-nil error aborts the run) → port as `await store.append(entry)` before proceeding.
3. **Concurrency**: replace goroutines with `Promise.all` + semaphore; abort via `AbortSignal`; DO input gates give single-writer for free.
4. **Bundle size**: keep zero heavy deps; Zod/Valibot or hand-rolled JSON Schema validation for tool args (Nova validates before dispatch).
5. **Subrequest limits** make `MaxParallel` and nested model calls (`Complete/Decide/Embed`) count; budget them.
6. Service bindings (Lumen, Warden) replace HTTP clients; tool "calls a Grove service" via binding.
7. Tenancy: `tool.Context.Data` → `{tenantId, userId, env, scopedDb}`; permission rules per tenant; Warden for credentials (no raw keys).

## 10. Extensions (docs/EXTENSIONS.md, `ext/`)

- Two tiers: **bundled** (in-process Go; `bundled/{tasks,ask,plan,subagent,webfetch,skills}`) and **third-party** (subprocess speaking the same JSONL; manifest `extension.yaml`; declared+user-approved **capabilities**: `ui:*, session:append_entry, model:complete|decide|embed|speech|transcribe`, plus tools, commands, hooks, flags, providers, mcp). Rule: "Anything a bundled extension does through the in-process API but a subprocess cannot do is a gap in the protocol, to be filed and closed, not a permanent privilege."
- Host guarantees: **deadline on every hook and tool_call** (timeout = error result + `extension_error`, never a hang); `register` validated (name `[A-Za-z0-9_-]{1,64}`, object schema, ≤128 tools/commands); ≤8 in-flight requests per ext; per-run caps on model calls (default 20); crash → unregister tools, emit event, restart ≤3 then disabled until `/reload`; `append_entry` data replayed on re-init so an extension rebuilds state.
- Declarative tools / command hooks in YAML (EXTENSIONS 101-140) — tool as manifest entry without code.
- **For the TS core**: skip subprocess extensions entirely (no processes on Workers). The *in-process hook API + registry + capability caps + deadlines* is what ports. Remote "extensions" = HTTP/service-binding tools with a manifest (name, schema, annotations, deadline) — aligns with issue's "HTTP/DO-backed tool registry" and Mycelium-as-tool-provider.
- `bundled/ask` = the human-in-the-loop `form` primitive (single/multi/text questions, notes, allow_other, skip) — tool the model calls to ask the user; relevant for interactive Grove agents, not background.
- `agent/sub` (`sub.Spawner`, ≤340 lines): child run with scoped tool `View`, fresh `Data` per child with `Depth+1`, **MaxDepth 3 / MaxConcurrent 4**, event tagging, usage folded into parent once, cancellation follows parent. In DO terms: child = another DO or in-process nested loop; depth/concurrency caps essential given subrequest limits.

## 11. Testing philosophy (docs/TESTING.md, AGENTS.md)

- **TDD is the rule**: no behaviour change without a test that failed first, "for the right reason"; bug fix = reproducing test commit first; a test that cannot fail proves nothing (assert the positive case before scanning for the negative); fixtures that share the code's typo pass against themselves — check against independent source.
- Layers: L0 unit, L1 component (fake provider, fake clock), **L2 scenario = real binary driven over the protocol** (the protocol is the only front door ⇒ one path tested ⇒ replaces Playwright), L3 cassettes (record/replay HTTP), L4 golden TUI views, L5 PTY smoke, L6 live (never in CI).
- **`testkit`** (≤1260 lines): `testkit.Provider` scripted fake (each `Stream` pops next scripted turn: text, reasoning, tool calls whole/split, usage, finish reason, delay, error at a chosen point; records requests); `testkit.Server` same scripts over real SSE + misbehaviours (cut mid-event, malformed JSON, stall, 429+Retry-After, 500, giant chunk); fake `Clock`; `NoLeaks`; `Golden` with `-update`; **fake servers for the decision/embed/voice APIs** (`decision_server.go`, `embed_server.go`, `voice_server.go`).
- **YAML scenario files** (`files:`, `provider:` script, `steps:` send/expect_events as *subsequence* so unrelated new events don't break tests, `expect_files`, `expect_requests`). Easy for agents to extend. TS analog: `vitest` + `@cloudflare/vitest-pool-workers` + a scripted fake provider + a scenario runner over the HTTP/DO transport.
- **Matrix rule** (TESTING §4): archived specs hold tables of rows with IDs (e.g. `RDF08`); tests are named with the row ID (`TestRead_RDF08_...`); `scripts/matrixcheck` fails CI if any row lacks a test or a test cites a non-existent row; rows may be added never deleted/weakened. Turns "did you test edge cases" into a check. Agent tests named `LPx##` (loop), e.g. `LPW02` cache-prefix guard.
- Fuzz every untrusted-bytes parser (SSE, JSONL framer, tool-args, session loader, manifests); property tests (cut points never split tool pair; branch is root→leaf path); determinism (no wall clock, map order, network, locale; printed seeds); coverage floors 85% core as a smoke alarm only.
- Definition of done = `make ci` (fmt, vet, build, build-notui, race, importcheck, matrixcheck-all, linecount-all) + docs updated (PROTOCOL for any command/event, DECISIONS row for anything a future reader would ask about, CHANGELOG) + you ran the real thing + you state what you did NOT do ("a silent gap is not allowed").
- Commit discipline: one concern per commit, tests/impl/docs separate, commit green, cite issue.

## 12. Decision records worth stealing (docs/DECISIONS.md; D-numbers)

D1 own core modelled on Pi (rejected: adopt `fantasy`, `sausheong/harness`, fork Crush); D13 protocol is the only front door; D25 context_limit per session; D37 line budgets; D41 decision model can only make permission stricter; D46 dependency allow-list; D134 never prune history at request time (cache); D146 stream filters live-only. Entries marked **Superseded** keep history ("add a row; do not rewrite history"). Doc set to emulate: PLAN, DECISIONS, ARCHITECTURE, PROTOCOL, EXTENSIONS, TESTING, INTEGRATION, `examples/embed`.

## 13. "Elegant, copy nearly verbatim" shortlist

1. Event union incl. `run_end` always-once + `dropped_queue`; child-event isolation rules.
2. `Policy.Decide` pure fn: most-restrictive-wins, annotation defaults, headless resolution, shell-operator guard on allow rules.
3. `roles.Table` (alias refusal, `/`=direct id, per-attempt timeout, usage-from-failures, fallback only while ctx live) + `embed` dims check + `voice` model-bound voice.
4. `route` router: `OnLimitOrRefusal` predicate, `OnFallback` visibility, `Response.Provider` attribution, `ForceProvider` kill switch.
5. `Usage` with `cost_source` provenance and covered-vs-real split; spend-never-lost.
6. Session entry tree with leaf pointer, `keep` custom entries, repair-on-load, compaction cut never inside tool pair.
7. Steering vs follow-up queues + no-accepted-then-lost closing handshake.
8. `Registry.View` scoped tool sets; stable registration order; `Tool.Context` nested-model seams with `AddUsage`.
9. Hooks-with-deadlines-never-crash-loop; `TurnEnd{End,Continue,Inject}` for app control.
10. Process: line budgets, import-DAG check, matrixcheck, scenario YAML over the real transport, `examples/embed`.
