---
title: "Lyra decisions"
status: planning
category: features
---

# Lyra decisions

A running log. Newest decisions go at the bottom of the decided list. Each entry says what was decided, why, and what it rules out.

Last updated: 2026-11-13.

## Decided

### 1. The name is Lyra
Lyra names both the core and the agent, the way Nova does. A slight personhood is intended: "Lyra parked the run and is waiting on approval" is a sentence it should be able to say. Features are "powered by Lyra". Chosen 2026-11-12 after the naming journey (see the link in the README).

### 2. What Lyra is, and is not
Lyra is a tool-calling loop. It is not a coding agent, now or later. It has no subagents, because a single loop with the right tools covers what Forage's pseudo-subagents do (to be confirmed when Forage is ported). It has no skills system. MCP can arrive later as an adapter and stays out of the core. A bash-like scratchpad can arrive later as one more tool (just-bash is the candidate; its core runs in browsers, and it has not been tested on Workers).

### 3. In Grove, models are reached through Lumen, as a plain transport
Inside Grove, every model call goes through Lumen. Lyra itself only needs "something that answers a model request", so Lumen is Grove's adapter, not part of Lyra's core (see decision 12 and `adapters.md`). Lumen has to be upgraded first (see `lumen-changes.md`). Lumen stays a transport: it carries messages and results faithfully and keeps routing, scrubbing, quota, and logging. It never runs the loop or the tools.

### 4. The first job is the timeline summary
The model writes the words. Tools own anything that has to be exact: repo names, links, and where each vine attaches. A `finish` tool refuses to end the job until everything that happened that day is covered. Full scope in `timeline-first-job.md`.

### 5. Each task is a recipe, with shared tools
A task defines four things: its instructions, its tools, its limits, and what counts as done. Common tools (finish, search past runs, ask a human) live in a shared pile any task can pick from. Task-specific tools belong to the task. There is no tool search for now. Each task's tool list is a plain list we control, so a "find a tool" step can be added later. Lumen currently accepts up to 64 tools per request, which is plenty.

### 6. Timeline data is passed up front, in full
The day's repos, commits, pull requests, issue activity, and line counts all go to the model at the start. Tools are for digging deeper (a diff, an issue thread, earlier days) and for building the page. A very large day (hundreds of commits and PRs) is a known limit. It is accepted for now, because the timeline has one user. A step limit and a clear "too big" failure are enough.

### 7. Scope first, build later
Everything is written down before anything is built. Open questions are settled now, before implementation starts. The work moves to a new repository once the scope is complete and understood.

### 8. Tool results are scrubbed like everything else
Lumen's privacy scrubber (emails, phone numbers, IP addresses, card and SSN patterns) applies to tool results as well. The data is private, and scrubbing it is the point of that system. Consequence: the scrubber can change text the model needs, so tools should hand the model short handles (for example `c1`, `pr12`, `i34`) that Lyra maps back to real commit hashes, links, and numbers, and the model should never have to copy a long exact string. See the design note in `timeline-first-job.md`.

### 9. Songbird stays as it is
Songbird checks only what a Wanderer types, for prompt injection. It does not inspect tool results or judge tool calls. That would be extra overhead for something not needed, and it is not what Songbird is for. The defense for tool results is that each task only has the tools it needs, so a poisoned issue comment can at worst mislead a summary.

### 10. Quota and step limits
The timeline skips Lumen's request quota for now (Lumen has a `skipQuota` option). Lyra's maximum number of steps is an option, and the default in the core is no limit. A task can set its own limit in its recipe. (Suggested, not decided: the timeline recipe sets one, because a confused loop on a Wanderer's own provider key spends their money. Cloudflare's own limits still apply either way.)

### 11. Lumen gets its own `agent` task
Agent calls use a new task type in Lumen, with its own default model, its own quota line, and its own settings. It does not reuse `summary` or `chat`.

### 12. Lyra runs anywhere, with Grove's pieces as adapters
Lyra's core defines small slots (model, storage, secrets, waking) and imports nothing from Lumen, Warden, Cloudflare, or Node. Grove supplies adapters (Lumen, Warden, Durable Objects). Other projects supply simpler ones. The list of slots is expected to grow as more places Lyra runs are discussed. Confirmed 2026-11-13. Full description in `adapters.md`.

The first adapters: Lumen, Durable Object storage and alarm, in-memory storage, and a plain OpenAI-style model adapter for other projects. Also expected to grow.

### 13. Cloudflare is the main development target, and Lyra also runs without it
Cloudflare Workers is the hardest environment (no filesystem, no subprocesses, limits on time and memory), so it is the one to develop against. The core must also run on Node with the same code. Developing against the stricter environment is what keeps the core portable.

### 14. Model connections: OpenRouter first, OpenCode Go second, chat-completions only at first
Autumn's two model providers are OpenRouter (primary) and OpenCode Go (an OpenAI-style endpoint with a shared subscription quota, used for example on a GitHub Action runner). Nova found that OpenCode Go is not one dialect: it needed three (chat completions, OpenAI Responses, and Anthropic Messages), because different models on that gateway speak different ones. The first model adapter speaks chat completions only, which serves OpenRouter and OpenCode Go with different settings, and only models that speak it are used. Other dialects are added when a model that needs one is tested. Confirmed 2026-11-13. See `adapters.md`.

### 15. Usage always carries tokens, and cost carries its source
OpenCode Go bills against a shared subscription allowance, not per-call dollars, and some models cost more at certain hours. So the model slot reports tokens every time, and reports cost only when the adapter knows it, labeled with where it came from (provider, allowance, or catalog estimate). Limits on tokens, steps, and time always work. A limit on cost works only when the adapter reports real cost. Nova already does this. Confirmed 2026-11-13.

### 16. File and shell tools are allowed, as task-level tools that depend on the host
Tools belong to tasks, and some tools only make sense on some hosts. A task running on a Node host, such as a GitHub Action runner doing a review, can have file and shell tools. A Cloudflare Worker has no filesystem and no subprocesses, so it does not. None of this enters the core. No dedicated write tool is planned, because tools are shaped to what each task needs.

For a runner task, Autumn wants a real bash tool. It needs to run tests, and models are trained on `grep`, `find`, and `glob`, so they use those more readily than custom search tools when the shell is allowed. Confirmed 2026-11-13.

Two consequences to carry forward. First, bash is free-form, so it is the one tool that cannot be validated the way the timeline's tools are. The working rule: validated tools for tasks where exactness matters (the timeline), a shell for exploratory tasks (a review). Second, a shell can write and run anything the host allows, so it needs a permission policy. That belongs to the approvals discussion, and Nova's permission model is the reference.

### 17. A shell slot, optional
A fifth slot: run a command and return its output. A task that needs a shell says so, and fails clearly on a host that has none. The tool is called `bash` everywhere, so a task's recipe does not change between hosts. On Node the slot runs a real shell. On Workers there is none at first (a virtual shell such as just-bash could fill it later, untested). This keeps subprocess code out of the core. Confirmed 2026-11-14.

### 18. Limits are optional, and there are none by default
A run can be limited by steps, tokens, time, or cost. Each is optional, and the core's default is no limit on any of them. A task can set any in its recipe. A cost limit works only when the adapter reports real cost (decision 15). Extends decision 10. Decided 2026-11-14. See `limits-and-interruptions.md`.

### 19. A run can always be stopped and steered
Any run can be stopped partway by a person, and steered with a new message that redirects it. A stop cancels the model request in flight. A steer message is read by the model at the next gap between steps. Always available, whatever the task. Decided 2026-11-14.

### 20. Interrupted runs resume where they stopped
After every model reply and tool result, the record is saved before the loop goes on. Resuming reloads the record and continues. A run does not start over. Decided 2026-11-14.

### 21. Tool failures go back to the model
A failed tool call, or one with invalid arguments, returns an error as the tool's result, and the model corrects it in the next call. Bad model output is a fact of working with AI, and Lyra does not try to design it away. Decided 2026-11-14.

### 22. Hitting a limit parks the run
A run that reaches a limit is parked, not killed. Everything done so far is kept, and the run can be resumed with a larger limit or left alone. Decided 2026-11-14.

### 23. Accidents resume on their own, and a stop waits for a person
If the host crashes or evicts a run, the Waking slot resumes it with nobody asking. A run a person stopped stays stopped until told to resume. Decided 2026-11-14.

### 24. Each tool declares whether it is safe to repeat
The default is no. A tool that was cut off partway and is not safe to repeat is reported to the model as "outcome unknown, check before repeating", not run again. Tools that change things can be made safe with a call id built from the run and the step. Decided 2026-11-14.

### 25. Done is decided by the task's done-check, with a configurable stuck safeguard
A run is done when the task's done-check passes (for the timeline, `finish` was accepted), not when the model says so. If the model stops without finishing, Lyra reminds it a small number of times, then parks the run as stuck. If a tool fails the same way several times in a row, the run also parks as stuck. This is the one default-on safeguard, and it is configurable per task (whether it is on, and the counts). A reply cut off by the token limit never runs its half-written tool arguments. Decided 2026-11-14.

### 26. A failing model call is retried 3 times, with staggered backoff
Up to 3 retries, with increasing delays between attempts. The exact delays are configuration, chosen when building. After the third failure the run parks with the reason "model unavailable". Correction (2026-11-15): Lumen's router does not fall back between models when tools are present, so these retries are the only protection for agent calls, and a recipe may name a fallback model (decision 58). Decided 2026-11-14.

### 27. A follow-up message is supported
A message can be queued during a run and is read after the work would otherwise end, in the same conversation. It sits next to stop and steer (decision 19). Nova and Pi both have it. Decided 2026-11-14. Open detail: what a follow-up does when nothing is running.

### 28. The core only produces the record
The core makes a clean, readable record of every run. A viewer (an Arbor page, a file, or anything else) is built separately later, on top of it. Decided 2026-11-14. See `run-record.md`.

### 29. The record holds the real data
Scrubbing happens only on the way to the model. The saved record is private to the tenant, is never published, and never contains a provider key. Decided 2026-11-14.

### 30. A straight line now, with branches possible later
Nothing branches today. Every entry carries its own id and the id of the entry before it, so branches can be added later without changing the format. Decided 2026-11-14.

### 31. The record is shaped like Nova's session file
A header line, then one entry per line. Each entry has `type`, `id`, `parent`, and `ts`. Entries: header, message from the user, message from the assistant (with model, usage, finish reason), message from a tool, and status. Unknown kinds are skipped by readers. Confirmed 2026-11-14.

### 32. The record is the only place progress lives
Working state that tools build (the half-built timeline page, the handle map) is rebuilt on resume by replaying the saved tool results. No second copy. Tools are written so that replaying their saved results rebuilds their state. Confirmed 2026-11-14, with the aim of full observability.

### 33. The model's reasoning text is stored when the adapter provides it
Marked as reasoning, so a viewer can show or hide it. Confirmed 2026-11-14.

### 34. One mechanism for approvals and questions
A pending request is saved in the record and the run parks as "waiting for a person". The answer is approve, deny (with a note the model reads), or the answer to a question. The shared "ask a human" tool and the approval check on risky tools are the same thing. Confirmed 2026-11-14. See `approvals.md`.

### 35. A policy per tool, set in the task's recipe
Each tool is allow, ask, or deny. A risk label (reads, changes things, dangerous) sets the default. If a call needs an answer and nothing can deliver the question, it is denied. Confirmed 2026-11-14.

### 36. A waiting run shows as a simple indicator, not a message
No email and no push. A waiting run is shown as a soft glow, a quiet indicator. The core only makes waiting runs easy to see (a list of pending requests and what each asks). The glow itself is part of the viewer, built later (decision 28). Because of that, no separate notify slot is needed for now. Replaces the notify slot first proposed. Decided 2026-11-14.

### 37. An optional timeout per task, with no timeout by default
After the timeout, an unanswered request is denied. Useful for tasks that run in the background. Confirmed 2026-11-14.

### 38. The shell tool moves long commands to the background
A command still running at a deadline keeps running instead of being killed. The model gets an id and carries on, and is told when the command exits. It can look at the output so far, wait for it, or stop it. This follows Autumn's `pi-background` extension. While a request is pending, the exit notice queues (see the design note in `approvals.md`). Decided 2026-11-15. Open details: the default deadline, how long finished jobs are remembered, and what happens to a running command when the host process is lost.

### 39. The record keeps everything, and the model sees a built view
Compaction adds a `compaction` entry with a summary and a pointer to the first entry kept. It never deletes from the record. The cut never falls between a tool call and its result, and recent steps stay verbatim. Confirmed 2026-11-15. See `context-size.md`.

### 40. What survives compaction is decided by the task
The task's instructions are pinned and never summarized. Tools can supply a "current state" shown after a compaction (for the timeline, the page so far), which is exact and replaces prose wherever a tool can provide it. The task supplies the summarizer's instructions, with a generic default. Bulky tool results are capped when they arrive. Confirmed 2026-11-15.

### 41. Compaction triggers from the tokens Lumen reports
When the last request's input tokens pass the model's context window minus a reserve. Reserve and amount kept are configurable per task. Needs a `contextWindow` field per model in `lumen-models.json`. If the first message alone is too large, the run fails clearly with "input too large". Confirmed 2026-11-15.

### 42. Compaction is part of the first version
It will rarely fire, because tasks are small and most models have very large windows. Autumn wants it from the start anyway, so a long run never has to stop at the limit. This overrides a proposal to build it last. Decided 2026-11-15. See `context-size.md`.

### 43. Lyra speaks Nova's frames
A subset of Nova's frames (`hello`, commands, `response`, `event`, `ui_request`, `ui_response`), plus a few new ones for starting a task, resuming a parked run, and listing pending requests. One client could drive either Nova or Lyra. Decided 2026-11-15. See `protocol.md`.

### 44. A session holds many runs, like Nova
A client talks to a session, which is a conversation that can hold many runs. Each timeline day would be a session with one run. A chat-style use later fits the same shape. A follow-up sent after a run has ended starts the next run in the same session, which settles the open detail in decision 27. Decided 2026-11-15. See `protocol.md`.

### 45. HTTP with server-sent events and WebSocket, both from the start
Both transports are built together. HTTP: a command is a normal request, and events arrive on a stream (as in Nova's serve mode). WebSocket: one connection both ways, which suits live stop, steer, and approvals. Other Grove workers reach Lyra through a service binding. Decided 2026-11-15. This is more to build first, and the cost is accepted. Neither transport is part of the core, because the core only speaks frames (see decision 12).

### 46. A `start` command begins a task
A new command, `start`, names a task and passes its inputs, for example the timeline for a given date. Nova's `prompt` stays for chat-style use, where the task is a general conversation. Decided 2026-11-15. See `protocol.md`.

### 47. Access: service bindings plus a token, one owner for now
Other Grove workers reach Lyra through a service binding. Anything from outside needs a bearer token. Every session is owned by a tenant id, stored on its record, so per-tenant checks can be added later without changing the format. No Heartwood sign-in per call for now, because the only task is Autumn's. Decided 2026-11-15.

### 48. The stateless calls stay out of Lyra
Decision models, embeddings, speech, and transcription are single calls, not runs. They stay in Lumen, where they live or are planned, and Lyra does not expose them. This keeps the core small, and they can be added later without changing anything else. Decided 2026-11-15.

### 49. The timeline is the first job, and HawkAgent is second
Keeps decision 4. HawkAgent (#1684) layer 2 follows once the core works. Its needs shape the design now: a session that lives for days (decision 44 covers it, with the host doing the scheduling), results that a person dispositions later, and records that go with the tenant. Decided 2026-11-15. See `consumers.md`.

### 50. The core has a proposal type
A run can end with a proposal: a typed result with its evidence and a review state (open, accepted, or rejected). This is for work where a person decides later whether to act, which is how HawkAgent and several other planned consumers work. It is different from an approval, which pauses a run before an action (decisions 34 to 37). This was chosen over keeping proposals in the app and having the core know only a structured final result. Decided 2026-11-15. Open details (fields, how a decision is made, and how it reaches the app) are in `consumers.md`.

### 51. Records belong to the tenant
A run's record is deleted when its tenant is removed, and otherwise kept until the app prunes it. The core does not prune on its own. Anything that must outlive the tenant is written by the app into its own table, like HawkAgent's verdict. Decided 2026-11-15. This answers record retention.

### 52. A proposal has a typed payload, evidence references, and a state
The task defines the shape of the payload (for HawkAgent, a score and a verdict). Evidence is a list of references to what supports it. The state is open, accepted, or rejected. A viewer can show any proposal without knowing the task. Decided 2026-11-15. Completes decision 50.

### 53. A decision is saved in the record and emitted as an event the app copies out
When a person accepts or rejects a proposal (with an optional note), the core saves the decision as a new entry in the record and emits a decision event. The app listens and writes whatever must last, such as HawkAgent's label, into its own table. The core never keeps anything past the tenant (decision 51). Decided 2026-11-15.

### 54. The vine placement fix is a separate GitHub issue, not Lyra's work
Letting the timeline page attach a vine to a specific line is a change to the page (`libs/curios/src/timeline/Timeline.svelte` and its parser), and it improves the timeline whether or not Lyra exists. It is tracked in its own issue, #1687. Lyra's timeline task does not wait for it: until it lands, the task attaches vines to headings, as the page does today. The two approaches and the recommendation are written up in `timeline-first-job.md` and go into the issue. Decided 2026-11-15.

### 55. GroveAgent is out of date and is not a basis for Lyra
`libs/grove-agent` and the consumers plan (`docs/plans/infra/planned/grove-agent-consumers.md`) are stale: the library pins `agents ^0.6.0` and was last touched in early September, and Cloudflare's own package has moved on. Lyra is built from scratch. The old plan is not a source of truth for what will use Lyra, and the Cloudflare adapter does not assume `GroveAgent`. Decided 2026-11-15. This removes `GroveAgent` as an option for the adapter's foundation.

### 56. Lyra serves interactive uses as well as background jobs
Autumn named further consumers: Wisp (a writing assistant, currently parked in the junk drawer), Fireside (a conversational writing mode of Wisp), and Reverie (a chatbot-style theme engine that tweaks a grove). All three are interactive, with a Wanderer in the conversation, unlike the timeline and HawkAgent. Nothing in the existing decisions has to change, because sessions with many runs, steering, follow-ups, live approvals, and WebSocket were already decided. It does affect Lumen: streaming is not needed for the first job but is needed for these. Decided 2026-11-15. See `consumers.md`.

### 57. The Lumen build order is L1 to L6
L1: messages carry tool turns. L2: the response reports why the model stopped. L3: a new `agent` task, with quotas set to zero in every tier so agent calls must skip quota until a real rule exists. L4: model flags (supports tools, accepted `tool_choice` values, context window). L5: usage carries a cost source, `catalog` for now. L6: update the tool-calling spec. A worker streaming route comes later, for the interactive consumers. L1 and L2 are the only steps that block the first job. Decided 2026-11-15. See `lumen-changes.md`.

### 58. A task's recipe can name a fallback model
Lumen's router does no model fallback when tools are present, so the fallback lives in Lyra. A recipe can name a second model, used if the first fails after its 3 retries. A recipe with none just retries and parks the run as "model unavailable". Lumen's router is left untouched. Decided 2026-11-15. Open detail: how many retries the fallback model gets, and whether a run that switched models says so in the record (it should, as an entry).

### 59. Version one is built whole, then the timeline runs on it
Version one includes compaction (42) and both transports (45), and all of it is built before the timeline runs on Lyra. There is one checkpoint at the end, not two. I had recommended a middle checkpoint, and this overrides it. The late first end-to-end run is covered by a small two-tool test task that runs the whole stack at step 6, and by building the timeline's non-Lyra parts (GitHub fetching, the tool functions, the shared function) at any time. Decided 2026-11-15. See `first-slice.md`.

### 60. Generic adapters live in the Lyra repo, Grove-specific pieces in Lattice
The Lyra repo holds the core, the in-memory and Cloudflare adapters, the OpenAI-style model adapter, and the protocol. Lattice holds the Lumen adapter (it needs Lumen's own types and contract), the secrets adapter for tenant tokens, and the tasks, like the timeline recipe and its tools. The Lyra repo never imports from Lattice, and a check enforces it. Decided 2026-11-15.

### 61. The timeline runs on Lyra from both entry points together
The nightly worker and the Arbor generate and backfill routes both call one shared function, which runs the Lyra task. They switch over together, not one first. Decided 2026-11-15. This also means the GitHub fetching, which is duplicated between the two today, is written once.

### 62. Test-first, with happy, sad, and bad paths and the matrix rule
Every behavior gets a test for the expected flow, for expected failures, and for malformed or hostile input. A failure-mode catalog is worked through before code is written, and a script fails the build if a spec row has no test. Tests are written first and watched failing. Requested by Autumn, 2026-11-15. See `engineering-practices.md`.

### 63. The same scenario files run in-process first and over the real protocol later
So end-to-end tests exist from the first commit. The layers are unit, component, scenario, cassette, workerd, and live. Decided 2026-11-15.

### 64. Property tests, coverage-guided fuzzing, and a randomly misbehaving fake model
Property tests wherever a rule can be stated. Fuzzing for the code that takes untrusted bytes (the stream parser, frame reader, tool arguments, record loader). Requested by Autumn, 2026-11-15. The tooling is partly unconfirmed and is checked when the repository is set up (see the doc).

### 65. Local testing, with OpenCode Go for bulk and OpenRouter for fidelity
The real runtime locally, a small dev client, a live suite that uses OpenCode Go (allowance, not free) for bulk testing and OpenRouter for a small production-fidelity set, and a budget cap on every live run. Live runs record real exchanges, with keys and auth headers removed, as cassettes that CI replays free, and a test fails if a cassette holds a key-shaped string. Decided 2026-11-15.

### 66. The coding practices and one gate, with an 85% coverage floor on the core
Strict TypeScript, validated boundaries, errors as data, web-standard APIs only in the core, import and size checks, and `pnpm ci` as the definition of done. CI enforces an 85% coverage floor on the core, as a smoke alarm. The matrix rule is the real check. Decided 2026-11-15.

### 67. Two mock Lumens, kept honest by contract tests
Both options are built. **The real Lumen over a fake model:** the actual Lumen worker routes run in-process and only the network call underneath is faked, with the scripted fake model speaking OpenRouter's shape. **A standalone fake Lumen:** a small server that imitates Lumen's HTTP shape, fast and independent. One shared set of contract tests runs against both, and any difference between them fails the build, so the standalone fake cannot drift unnoticed. Both live in Lattice, next to the Lumen adapter (decision 60). The scenario files run through them as a third level. Decided 2026-11-15, with the extra work accepted. See `engineering-practices.md`.

### 69. One package with subpath exports
The core, `memory`, `cloudflare`, `openai`, and `testkit` are entry points of one package, each with its own allowed imports, enforced by a check. The testkit is public so Lattice and other projects can use it. A part can become its own package later if it needs a heavy dependency. Decided 2026-11-15. See `repository.md`.

### 71. Releases publish to npm from the start
Semver at 0.x with breaking changes allowed in minors, one CI workflow running `pnpm ci`, and a tag that gates and publishes to npm as public with built output. Publishing starts early, so the release process is exercised early. Decided 2026-11-15. The changelog and the release notes are covered by proposals 74 and 75.

### 72. The Cloudflare adapter is built on plain Durable Objects
Behind Lyra's slots, using SQLite storage, an alarm, and hibernation, which are stable core features. Cloudflare's agent tooling can be used by a consumer, and a separate adapter for it can come later. Decided 2026-11-15. This settles the question left open in decision 12.

### 73. Lyra is MIT licensed
Like Nova and Pi. Decided 2026-11-15. Lattice's own packages stay AGPL-3.0.

### 68. Name and home
`AutumnsGrove/lyra`, public, with the package `@autumnsgrove/lyra` (free on npm). Decided 2026-11-15. See `repository.md`.

### 70. The repository layout
A pnpm workspace with `packages/lyra`, `scenarios`, `examples/workers-minimal`, `scripts`, `docs`, and the CI workflows. Decided 2026-11-15.

### 74. Release notes are written by an agent in CI, adapted from Nova
On a tag push, after the gate, a script runs the Pi agent and writes the GitHub release body from the changelog section and the commit log, as equal evidence. It never blocks a release: any failure falls back to the changelog section, and then to no body. A manual dry run shows the body in the job summary without publishing. It is a TypeScript script, since Lyra has no Go, written test-first with a fake agent. It writes the release body only. `CHANGELOG.md` is still edited by hand, or by a coding agent, in a release PR, as in Nova. Decided 2026-11-15.

### 75. The release procedure follows Nova's
A version is a git tag on `main`. A release is a changelog edit, a PR titled `release: vX.Y.Z`, and a tag, in that order, with upgrade notes for anything that changes behavior for an existing caller. The tag runs the gate, builds, publishes to npm, and writes the release body. Decided 2026-11-15.

### 76. The release-notes agent keeps `bash`, like Nova's
I had recommended read-only tools (`read`, `grep`, `find`, `ls`), because the step has an API key in its environment and reads commit messages as evidence. Autumn chose to keep `bash`, as Nova does, so the agent can check a claim against the tree. Decided 2026-11-15. Cheap mitigations that keep the choice: only the owner can push tags; the key is given to the notes step and no other; the runner is thrown away after the job; and the key is one with a spend limit, which OpenCode Go's allowance already provides. This risk is accepted, not removed.

### 77. Pull requests are reviewed by the same Pi agent, set up as PR #1
Autumn will install `pi-review` from the Pi harness at the very start of development, and it will be PR #1 in the repository. It provisions the credential and identity and commits a workflow generated from `.github/pi-review.json`. Decided 2026-11-15. Note for the first steps: the repository needs an initial commit (license, README, docs) so PR #1 has something to branch from. In Nova, the review workflow and the release step share one secret (`PI_REVIEW_API_KEY`, mapped to `OPENCODE_API_KEY`), so the credential the extension provisions is also what the release step needs.

### 79. Background jobs
A `jobs` tool to list, read, wait for, and kill. Each job notifies once on exit, and the notice queues behind a pending approval. Finished jobs are remembered for the life of the run, with a capped log tail of 4 MiB, because a run can park for hours. Decided 2026-11-15. See `shell-tool.md`.

### 80. If the host is lost, a running command is not reattached in version one
On resume the tool call has no result and `bash` is not safe to repeat, so the model is told the outcome is unknown. A background job from before the loss is reported as lost. Decided 2026-11-15.

### 81. Command policy: strict by default, open by recipe
Strict is Nova's rules: allow, ask, deny, the most restrictive match wins, headless ask is deny, and an allow rule never matches a command with a shell control operator. Open is for a host declared disposable, and allows commands with a deny list for the destructive ones. A recipe picks one. A task that reads untrusted text stays strict unless the host also guards who can trigger the run, as `pi-review` does by running only same-repository pull requests. Decided 2026-11-15.

### 82. The credential scrub
Lyra's own secrets (the model keys and any token Lyra holds) are always removed from a command's environment and cannot be switched off. A recipe can hide more names, such as `GITHUB_TOKEN` for a review that does not need to push. No scrubbing by pattern, because Nova found that breaks builds. Decided 2026-11-15.

## Proposed, waiting for a yes

### 78. The `bash` tool and its defaults
One tool with `command`, an optional `timeout`, and an optional `run_in_background`. A 120 second deadline at which the command moves to the background, a 600 second ceiling for waiting, an output tail capped at 51,200 bytes, null stdin, a fixed working directory, and the whole process group killed when a foreground call ends. All configuration, with these as defaults. These are the defaults Nova and `pi-background` agree on. Not yet asked about directly.

### 83. The command set, with an idempotency key on `start`
`start`, `prompt`, `steer`, `follow_up`, `abort`, `resume`, `get_state`, `get_messages`, `compact`, `list_sessions`, `list_pending`, and `decide_proposal`. A `start` carries an optional idempotency key, so a retried cron call does not start a second run. Nova's model, thinking, tool, session-fork, login, extension, and stateless-call commands are dropped. A new `conflict` error code is added to Nova's eight.

### 84. `run_end` reasons are `done`, `parked`, and `failed`
A limit and a stop both park a run, so Nova's `exhausted` and `aborted` become `parked` with a `parked_reason` (`waiting_for_person`, `limit`, `stopped`, `stuck`, `model_unavailable`). `failed` is for a run that cannot continue. New events: `parked`, `resumed`, `fallback`, `ui_resolved`, `proposal`, and `proposal_decided`.

### 85. Requests are durable, with unguessable single-use ids
Nova's `ui_request` and `ui_response` shapes, saved in the record before they are sent. The id is a 128-bit random identifier assigned by the server. A second answer to it is `conflict`, and an unknown or expired id is `not_found`. The default on timeout is deny. This is how answers cannot be forged, with no separate code.

### 86. Events replay from the record
Events that come from a record entry carry its position as `seq`, so a reconnecting client gets every missed event from the record. Live deltas are not replayed. HTTP with server-sent events and WebSocket both use it.

### 87. Access: a trusted caller names the tenant, a token carries it, and another tenant's session is `not_found`
Extends decision 47. Every session stores its tenant id and every command is checked against it.

## Not discussed yet

These came out of the research and are waiting for their turn, one at a time:

- **The shell tool's remaining details.** The exact deny list for open mode, whether a recipe names allow patterns or a named set, and the interactive 'allow for this session' answer. See `shell-tool.md`.
- **Who may approve** once more than one person uses Lyra, and approving with edited arguments (see `approvals.md`).
