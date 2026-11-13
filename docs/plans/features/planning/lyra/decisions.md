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

## Proposed, waiting for a yes

### 14. Model connections: OpenRouter first, OpenCode Go second, chat-completions only at first
Autumn's two model providers are OpenRouter (primary) and OpenCode Go (an OpenAI-style endpoint with a shared subscription quota, used for example for a GitHub Action runner). Nova found that OpenCode Go is not one dialect: it needed three (chat completions, OpenAI Responses, and Anthropic Messages), because different models on that gateway speak different ones. Proposal: the first model adapter speaks chat completions only, which serves OpenRouter and OpenCode Go with different settings, and only models that speak it are used. Other dialects can come later. See `adapters.md`.

### 15. Usage always carries tokens, and cost carries its source
OpenCode Go bills against a shared subscription allowance, not per-call dollars, and some models cost more at certain hours. So the model slot reports tokens every time, and reports cost only when the adapter knows it, labeled with where it came from (provider, allowance, or catalog estimate). Limits on tokens, steps, and time always work. A limit on cost works only when the adapter reports real cost. Nova already does this. See `adapters.md`.

## Not discussed yet

These came out of the research and are waiting for their turn, one at a time:

- **Limits and interruptions.** What stops a run (steps, tokens, time, cost), and what happens when a run is cut off partway.
- **The record of a run.** How Autumn sees what Lyra did and why.
- **Approvals.** How a background run asks for a yes and waits at no cost.
- **The Cloudflare adapter's foundation.** Whether it builds on Cloudflare's agent tooling or on plain Durable Objects. A smaller question once decision 12 is settled.
- **The wire protocol.** Which subset of Nova's frames Lyra speaks.
- **The new repository.** Name, layout, release process, and test setup.
