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

### 3. Models are reached through Lumen, as a plain transport
Lyra never calls a model provider directly. In Grove, every model call goes through Lumen. Lyra itself only needs "something that answers a model request", so Lumen is Grove's setting, not part of Lyra's identity. Lumen has to be upgraded first (see `lumen-changes.md`). Lumen stays a transport: it carries messages and results faithfully and keeps routing, scrubbing, quota, and logging. It never runs the loop or the tools.

### 4. The first job is the timeline summary
The model writes the words. Tools own anything that has to be exact: repo names, links, and where each vine attaches. A `finish` tool refuses to end the job until everything that happened that day is covered. Full scope in `timeline-first-job.md`.

### 5. Each task is a recipe, with shared tools
A task defines four things: its instructions, its tools, its limits, and what counts as done. Common tools (finish, search past runs, ask a human) live in a shared pile any task can pick from. Task-specific tools belong to the task. There is no tool search for now. Each task's tool list is a plain list we control, so a "find a tool" step can be added later. Lumen currently accepts up to 64 tools per request, which is plenty.

### 6. Timeline data is passed up front, in full
The day's repos, commits, pull requests, issue activity, and line counts all go to the model at the start. Tools are for digging deeper (a diff, an issue thread, earlier days) and for building the page. A very large day (hundreds of commits and PRs) is a known limit. It is accepted for now, because the timeline has one user. A step limit and a clear "too big" failure are enough.

### 7. Scope first, build later
Everything is written down before anything is built. The work moves to a new repository once the scope is complete and understood.

## Not discussed yet

These came out of the research and are waiting for their turn, one at a time:

- **Limits and interruptions.** What stops a run (steps, tokens, time, cost), and what happens when a run is cut off partway.
- **The record of a run.** How Autumn sees what Lyra did and why.
- **Approvals.** How a background run asks for a yes and waits at no cost.
- **Where Lyra runs.** On Cloudflare's own agent tooling, or on plain Durable Objects behind a small interface. The research leans toward plain and portable, with an optional Grove host.
- **Billing.** How agent runs count against Lumen's quota (see `lumen-changes.md`).
- **The wire protocol.** Which subset of Nova's frames Lyra speaks.
- **The new repository.** Name, layout, release process, and test setup.
