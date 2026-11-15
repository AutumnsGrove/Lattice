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
| [`adapters.md`](adapters.md) | How Lyra runs without Lumen or Warden: four small slots and an optional shell, with Grove's pieces as adapters. |
| [`limits-and-interruptions.md`](limits-and-interruptions.md) | What stops a run, how it is stopped and steered, how it resumes, and what happens when something fails. |
| [`run-record.md`](run-record.md) | The saved record of a run: what it holds, how it is shaped, and how progress is rebuilt on resume. |
| [`approvals.md`](approvals.md) | How a run asks a person for a yes or an answer, waits at no cost, and carries on. |
| [`context-size.md`](context-size.md) | What happens when a run no longer fits in the model's memory, and how Lyra's compactor differs from a coding agent's. |
| [`protocol.md`](protocol.md) | How anything outside talks to Lyra: Nova's frames, what Lyra keeps and adds, and how durable approvals fit. |
| [`consumers.md`](consumers.md) | Who would use Lyra, from the live issues, and what HawkAgent (#1684) adds to the design. Corrects an earlier reliance on the out-of-date GroveAgent plan. |
| [`timeline-first-job.md`](timeline-first-job.md) | The first job Lyra will do: the development timeline summary. What is wrong today and the tools that fix it. |
| [`lumen-changes.md`](lumen-changes.md) | What Lumen has to change before Lyra can run a loop through it. |
| [`research/`](research/) | Raw research notes from 2026-11-11 (Nova, Pi, Cloudflare's agent tools, the Lattice codebase, the wider landscape). Written fast by research passes, and some claims are marked unverified inside. Useful as source material, not as settled fact. They treat `libs/grove-agent` as a starting point, which is out of date (decision 55). |

## Corrections to the issue

Research found two things in #1605 that should be fixed before the issue is used as a spec:

- Nova's wire protocol has these frame types: `hello`, the command frames (the frame's `type` is the command name), `response`, `event`, and `ui_request` / `ui_response`. The issue lists `hello, command, event, error`. `error` is an event type and a field on `response`, not its own family.
- Nova has no token, cost, or wall-clock budgets. Its only limits are a maximum turn count, an optional wrap-up request, and a per-attempt timeout. Budgets in Lyra are new work, not a port.
