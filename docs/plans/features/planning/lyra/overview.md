---
title: "Lyra: the overview"
status: planning
category: features
---

# Lyra, in one place

Last updated: 2026-11-15. This is the front door. It says what Lyra is and how the pieces fit, in plain words, and points to the document that holds each detail. It adds no decisions. The 94 decisions are in [`decisions.md`](decisions.md), and every number below refers to one.

## What Lyra is

Lyra does a job for you by asking an AI model what to do, using tools to do it, and repeating until the job is finished. That cycle is called a loop. Lyra is the one good copy of it, so nothing else in Grove has to build its own.

It is a tool-calling agent and nothing more. It is not a coding agent and never will be. It has no subagents and no skills. It is also the name of the agent itself, the way Nova is both the harness and the thing you run, so features are "powered by Lyra".

> A small constellation that does the work while the grove sleeps.

Lyra lives in its own repository, `AutumnsGrove/lyra`, under the MIT license, published to npm as `@autumnsgrove/lyra` (decisions 68, 71, 73). The name is claimed in Grove: it has an entry in the naming doc, `GroveLyra` as its internal name, and `lyra` is reserved as a username (decision 94).

## How a run works

A **run** is one job from start to finish.

1. A task starts, with its inputs.
2. Lyra asks the model what to do next.
3. The model asks for a tool, for example "get the issues from this day".
4. Lyra runs the tool and hands the result back.
5. Steps 2 to 4 repeat until the model calls `finish` and the task's own check says the job is really done (decision 25).

Three things make this safe to leave running:

- **A leash.** A run can have limits on steps, tokens, time, and cost. All are optional, and none is set by default. Hitting one parks the run, and it can be resumed (decisions 18, 22).
- **A record.** After every step, Lyra saves what happened to an append-only record. The record is both the history of what Lyra did and why, and the progress, so an interrupted run resumes where it stopped and does not start over (decisions 20, 28 to 33, 51). Each entry is capped at 1 MiB, below Cloudflare's 2 MB row limit, and oversized content is truncated with a marker, so a save never fails midway (decision 90).
- **A way to be stopped.** A person can stop any run, steer it with a new message, or add a follow-up (decisions 19, 27).

## The words

| Word | Meaning |
|---|---|
| **Run** | One job, from start to finish. |
| **Session** | A conversation that can hold many runs (decision 44). |
| **Recipe** | A task's instructions, its tools, its limits, and what counts as done (decision 5). |
| **Tool** | Something a run can do: read a diff, add a line to a page. A tool owns anything that must be exact, like a repo name or a link, and rejects a bad request so the model corrects itself (decision 21). |
| **Handle** | A short name like `c1` or `pr12` the model uses for a real commit or pull request, so it never copies a long exact string (decision 8). |
| **Record** | The saved history of a run (see above). |
| **Park** | Pause a run, with a reason, at no cost while it waits (decision 22). |
| **Slot** | A small interface to the outside world: model, storage, secrets, waking, and an optional shell (decision 12). |
| **Adapter** | A piece that fills a slot, such as Lumen, a Durable Object, or an OpenAI-style endpoint. |
| **Proposal** | A finished run's result that a person decides on later (decision 50). |
| **Scenario** | A small file that scripts a fake model and says what should happen, run at two levels (decision 63). |

## The slots and adapters

Lyra's core imports nothing from Lumen, Warden, Cloudflare, or Node. It asks for four things and an optional fifth, and each has a simple version for general use and a Grove version.

| Slot | What Lyra needs | In Grove | Elsewhere |
|---|---|---|---|
| Model | Send a conversation and tools, get back text, tool requests, usage, and why it stopped | Lumen | OpenRouter, OpenCode Go, any OpenAI-style endpoint |
| Storage | Save and load a run's record | Durable Object storage | Memory, SQLite, or a file |
| Secrets | A tool asks for a key by name | Warden or the tenant's secrets | Environment variables |
| Waking | Wake a run after a wait or an interruption | A Durable Object alarm | A timer |
| Shell (optional) | Run a command, return its output | none at first | A real shell on Node |

Cloudflare Workers is the main target and the hardest place to run, so the core is developed against it and also runs on Node (decisions 12, 13, 72). Generic adapters live in the Lyra repository. Anything specific to Grove, such as the Lumen adapter and the timeline task, lives in Lattice, so the Lyra repository never imports from Lattice (decision 60). Details are in [`adapters.md`](adapters.md).

## When things go wrong

- **A tool fails:** the error goes back to the model as the tool's result and it fixes the call. Bad output from a model is a fact of life, and Lyra does not try to design it away (decision 21).
- **A model call fails:** up to 3 retries with growing delays, then, if the recipe names one, a fallback model, then the run parks as "model unavailable" (decisions 26, 58). Lumen does no model fallback when tools are present, so this is the only protection.
- **A run gets stuck:** if a tool fails the same way several times, or the model stops without finishing, the run parks as stuck. This is the one default-on safeguard, and it is configurable (decision 25).
- **The host is evicted mid-run:** the record is saved before each step, so the run resumes. A tool declares whether it is safe to repeat. One that is not, and was cut off, is never run twice, and the model is told the outcome is unknown (decisions 23, 24).
- **A deploy changes the tools mid-run:** a run pins its recipe. The same tools mean it continues. A tool added, removed, or changed parks it as stuck until a person resumes it (decision 91).

Details are in [`limits-and-interruptions.md`](limits-and-interruptions.md).

## Asking a person

A run that needs a yes parks, costs nothing while it waits, and resumes when answered. Each tool is allow, ask, or deny in the recipe. If something needs an answer and nothing can deliver the question, it is denied. A waiting run shows as a soft glow in the viewer, with no email and no push (decisions 34 to 37).

A run that finishes with a result a person decides on later, like the HawkAgent verdict, ends with a **proposal**: a typed payload, evidence, and a state of open, accepted, or rejected. The decision is saved in the record and sent to the app as an event, and the app keeps whatever must last (decisions 50, 52, 53). Details are in [`approvals.md`](approvals.md).

## Keeping a long run small

When a run no longer fits in the model's memory, a compactor summarizes the older part. It differs from a coding agent's: the task's instructions are pinned, tools can supply their exact "current state", and big tool results are capped on arrival. The full record is never rewritten, so replay still works. It will rarely fire, because tasks are small and most models have very large windows, but it is in version one (decisions 39 to 42). Details are in [`context-size.md`](context-size.md).

## Talking to Lyra

Lyra speaks a subset of Nova's frames (`hello`, commands, `response`, `event`, and `ui_request` / `ui_response`), so one client could drive either. Commands include `start` (with an idempotency key, so a retried call does not start a second run), `prompt`, `steer`, `follow_up`, `abort`, `resume`, and `decide_proposal`. HTTP with server-sent events and WebSocket are both built from the start. Events that come from the record carry its position, so a client that reconnects catches up by reading the record. Approval ids are unguessable and single use. A run ends with `done`, `parked`, or `failed` (decisions 43 to 48, 83 to 88). Details are in [`protocol.md`](protocol.md).

## The shell (a later slice)

On a host with a real shell, such as a GitHub Action runner doing a review, a `bash` tool is available. A command still running at 120 seconds moves to the background and notifies once when it exits. The policy is strict by default (an allow rule never matches a chained command) and open only when a recipe declares the host disposable. Lyra's own secrets are always hidden from a command. Lost with the host, a running command is reported as lost and is not reattached (decisions 16, 17, 38, 78 to 82, 89). Details are in [`shell-tool.md`](shell-tool.md).

## Who uses it

| Consumer | What it does | Order |
|---|---|---|
| **The development timeline** | Turns a day of GitHub activity into a readable summary, using tools that own repo names, links, and a coverage check so nothing that happened is skipped | First |
| **HawkAgent** (#1684) | Judges a new tenant's content at +24h and +7d and proposes a verdict with evidence | Second |
| **Wisp, Fireside, Reverie** | Interactive: a writing assistant, a conversational writing mode, and a chatbot-style theme engine | Named, later |

Details are in [`consumers.md`](consumers.md) and [`timeline-first-job.md`](timeline-first-job.md).

## How it is built

- **Test-first,** with a happy, sad, and bad test for every behavior, a failure-mode catalog worked through before code, and a script that fails the build if a spec row has no test (decision 62).
- **End to end from the first commit.** The same scenario files run in-process first and over the real protocol later (decision 63).
- **Property tests and fuzzing** where a rule can be stated or bytes are untrusted, and a fake model that misbehaves at random (decision 64).
- **Local testing** with the real runtime, a small dev client, a live suite that uses OpenCode Go for bulk and OpenRouter for fidelity, and cassettes recorded from live runs and replayed free in CI. Two mock Lumens, kept honest by contract tests, cover the Lumen adapter (decisions 65, 67).
- **One gate.** `pnpm ci` runs format, typecheck, build, tests, fuzz, import checks, the matrix check, size budgets, and an 85% coverage floor on the core (decision 66).

Details are in [`engineering-practices.md`](engineering-practices.md).

## The repository and releases

One package with subpath exports (`core`, `memory`, `cloudflare`, `openai`, `testkit`, and `node` later), each with its own allowed imports, enforced by a check. Semver at 0.x, published to npm from the start. A release is a changelog edit, a PR, and a tag. On the tag, CI runs the gate, builds, publishes, and a Pi agent writes the GitHub release body from the changelog and the commit log, with a fallback so a release never waits on the model. `pi-review` reviews pull requests, installed by Autumn as PR #1 (decisions 69 to 77). Details are in [`repository.md`](repository.md).

## The first slice

Version one is built whole, then the timeline runs on it (decision 59).

| Step | What |
|---|---|
| 0 | Lumen: tool turns in messages, and a finish reason (blocks everything). Issue #1693. |
| 1 | The core with fakes: types, slots, record, loop, scenarios, `pnpm ci` |
| 2 | Limits, retries, resume, with a test that kills a run at every point |
| 3 | Recipes and tools: validation errors back to the model, handles, the coverage check |
| 4 | The Cloudflare adapter: Durable Object storage and alarms, tested in workerd |
| 5 | Models: the Lumen adapter and an OpenAI-style adapter for OpenRouter and OpenCode Go |
| 6 | The protocol over HTTP, with a small test task run through the whole stack |
| 7 | Compaction |
| 8 | WebSocket |
| 9 | The timeline task, from both entry points together (decision 61) |

Approvals and proposals, the shell and Node, and the interactive consumers come after. Details are in [`first-slice.md`](first-slice.md).

## What it depends on

- **Lumen changes (#1693).** One issue, to be split when scoping starts. The first two steps block everything. Details are in [`lumen-changes.md`](lumen-changes.md).
- **The vine page change (#1687).** Not part of Lyra. The timeline task attaches vines to headings until it lands.

## What is not confirmed

Everything here comes from reading code and docs. Nothing has been run. These were flagged along the way as needing a check when the work starts:

- The Workers testing package name and config (one page copy says `@cloudflare/vitest-plugin`, the official guide says `@cloudflare/vitest-pool-workers`).
- Whether fast-check runs inside Workers, and how mature Vitiate is for coverage-guided fuzzing.
- Durable Object hibernation details. The 2 MB row limit (decision 90) comes from Cloudflare's limits page and secondary sources, and should be checked against the live page.
- Whether GitHub access for pull requests and issues goes through Warden.
- How Lumen gets its provider key in the local dev stack.
- Whether the HawkAgent answer key is large enough, because the evidence for three of its six cases was deleted.
- npm provenance for releases, and the Node version floor.
- `just-bash` on Workers, if a virtual shell is ever wanted there.

## Where everything is

| Document | What it holds |
|---|---|
| [`decisions.md`](decisions.md) | All 94 decisions with their reasons. The source of truth. |
| [`adapters.md`](adapters.md) | The slots and adapters. |
| [`limits-and-interruptions.md`](limits-and-interruptions.md) | Limits, stop and steer, resume, failures. |
| [`run-record.md`](run-record.md) | The saved record. |
| [`approvals.md`](approvals.md) | Approvals, questions, and proposals. |
| [`context-size.md`](context-size.md) | Compaction. |
| [`protocol.md`](protocol.md) | The wire, with spec rows. |
| [`shell-tool.md`](shell-tool.md) | The shell. |
| [`consumers.md`](consumers.md) | Who uses Lyra. |
| [`timeline-first-job.md`](timeline-first-job.md) | The first job and what is wrong with it today. |
| [`lumen-changes.md`](lumen-changes.md) | What Lumen has to change. |
| [`engineering-practices.md`](engineering-practices.md) | How it is built and tested. |
| [`first-slice.md`](first-slice.md) | The build order. |
| [`repository.md`](repository.md) | The repository, releases, and moving over. |
| [`agents-guide-draft.md`](agents-guide-draft.md) | A draft of the new repository's `AGENTS.md` (decision 93). |
| [`research/`](research/) | Raw research notes, written fast. Useful as source material, not as settled fact. |
