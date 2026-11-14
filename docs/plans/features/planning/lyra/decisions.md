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
Up to 3 retries, with increasing delays between attempts. The exact delays are configuration, chosen when building. After the third failure the run parks with the reason "model unavailable". Lumen already falls back between models inside its router, so the core only retries and parks. Decided 2026-11-14.

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

## Proposed, waiting for a yes

These are from `approvals.md`, where each is explained.

### 34. One mechanism for approvals and questions
A pending request is saved in the record and the run parks as "waiting for a person". The answer is approve, deny (with a note the model reads), or the answer to a question. The shared "ask a human" tool and the approval check on risky tools are the same thing.

### 35. A policy per tool, set in the task's recipe
Each tool is allow, ask, or deny. A risk label (reads, changes things, dangerous) sets the default. If a call needs an answer and nothing can deliver the question, it is denied.

### 36. A notify slot
How a person is told a run is waiting. Grove: email or an Arbor inbox. Node: terminal or a pull request comment.

### 37. An optional timeout per task, with no timeout by default
After the timeout, an unanswered request is denied.

## Not discussed yet

These came out of the research and are waiting for their turn, one at a time:

- **Context size.** What is sent to the model when a long run no longer fits in its memory (trimming or summarizing).
- **Record retention.** How long a record is kept, and who can delete one.
- **Follow-up when nothing is running.** Whether it starts the next turn of the same conversation or is refused.
- **Approvals.** How a background run asks for a yes and waits at no cost.
- **The Cloudflare adapter's foundation.** Whether it builds on Cloudflare's agent tooling or on plain Durable Objects. A smaller question once decision 12 is settled.
- **The wire protocol.** Which subset of Nova's frames Lyra speaks.
- **The new repository.** Name, layout, release process, and test setup.
