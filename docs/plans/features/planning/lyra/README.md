---
title: "Lyra: a tool-calling agent core"
status: planning
category: features
---

# Lyra

Lyra is a small, portable agent core for Grove. It runs a loop: ask the model what to do, run a tool, hand the result back, repeat until the job is done. It is a tool-calling agent. It is not a coding agent and never will be.

It is also the name of the agent itself, the way Nova is both the harness and the thing you run. Features are "powered by Lyra".

- **Issue:** [#1605](https://github.com/AutumnsGrove/Lattice/issues/1605)
- **Name journey:** [`docs/philosophy/naming-research/agent-core-naming-journey.md`](../../../../philosophy/naming-research/agent-core-naming-journey.md)
- **Status:** planning. Nothing is built.

## How we are working

Slowly, and scoped before anything is built. Every decision gets written down here as it is made. When the scope is clear and complete, this folder moves to a new repository.

## What is in this folder

| File | What it holds |
|---|---|
| [`decisions.md`](decisions.md) | Every decision so far, with the reason, plus what has not been discussed yet. Start here. |
| [`timeline-first-job.md`](timeline-first-job.md) | The first job Lyra will do: the development timeline summary. What is wrong today and the tools that fix it. |
| [`lumen-changes.md`](lumen-changes.md) | What Lumen has to change before Lyra can run a loop through it. |
| [`research/`](research/) | Raw research notes from 2026-11-11 (Nova, Pi, Cloudflare's agent tools, the Lattice codebase, the wider landscape). Written fast by research passes, and some claims are marked unverified inside. Useful as source material, not as settled fact. |

## Corrections to the issue

Research found two things in #1605 that should be fixed before the issue is used as a spec:

- Nova's wire protocol has these frame types: `hello`, the command frames (the frame's `type` is the command name), `response`, `event`, and `ui_request` / `ui_response`. The issue lists `hello, command, event, error`. `error` is an event type and a field on `response`, not its own family.
- Nova has no token, cost, or wall-clock budgets. Its only limits are a maximum turn count, an optional wrap-up request, and a per-attempt timeout. Budgets in Lyra are new work, not a port.
