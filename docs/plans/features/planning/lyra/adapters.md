---
title: "Lyra adapters: running without Lumen or Warden"
status: planning
category: features
---

# Lyra adapters

Last updated: 2026-11-13. Status: slots confirmed (decision 12). The model details (decisions 14 and 15) are proposed.

## The goal

Lyra should run in any TypeScript project, including ones that have no Lumen and no Warden, and including ones that run on Cloudflare. Grove's pieces become adapters. Lyra's core does not know they exist.

This is more work than hard-wiring Grove in. It also makes Lyra easier to test and keeps it from being shaped around one platform.

## The idea: four slots

Lyra's core defines four small slots. Each is a short interface, a few functions. Each has a simple version for general use and a Grove version.

| Slot | What Lyra needs from it | Grove's version | Elsewhere |
|---|---|---|---|
| **Model** | Send a conversation and a list of tools. Get back text, tool requests, token usage and cost, and the reason the model stopped. | Lumen | OpenRouter (primary), OpenCode Go, or any OpenAI-style endpoint |
| **Storage** | Save and load a run's record and its progress. Append-only. | Durable Object storage | Memory (for tests), SQLite or a file (Node) |
| **Secrets** | Let a tool ask for a key or token by name. | Warden, or the tenant's encrypted secrets | Environment variables |
| **Waking** | Wake a run later, after a wait or an interruption. | A Durable Object alarm | A timer (Node), or nothing for a simple script |

The list is expected to grow as more places Lyra runs are discussed.

## Where Lyra runs

Cloudflare Workers is the main development target, because it is the hardest environment: no filesystem, no subprocesses, and limits on time and memory. The same core also runs on Node. Developing against the stricter environment keeps the core portable.

One example of the second case is a GitHub Action runner doing a review job with OpenCode Go, which Autumn already pays for. A runner has a real filesystem, so tools that read files make sense there and not on Workers. Tools belong to tasks (decision 5), so a task can use host-specific tools without the core knowing. Nova already has a pull request review action (`nova action review`), so the runner case is mainly a useful test of the Node side.

## Model connections (proposed, decisions 14 and 15)

Autumn's two providers are OpenRouter (primary) and OpenCode Go. Nova has already worked through both, and three lessons carry over. The code does not (Nova is Go), only the shape.

- **OpenCode Go is not one dialect.** Nova needed three streaming dialects for it (chat completions, OpenAI Responses, Anthropic Messages), because different models on the gateway speak different ones. Proposal: Lyra's first model adapter speaks chat completions only. That serves OpenRouter and OpenCode Go with different settings (address, key, model ids), and only models that speak chat completions are used at first.
- **Cost is not always dollars per call.** OpenCode Go draws on a shared subscription allowance, has a monthly limit per model, and some models cost more at certain hours. Nova's usage record carries tokens, a cost, and the cost's source (`provider`, `allowance`, or `catalog`). Proposal: the same shape. Tokens are always reported. Cost is reported only when known, with its source. Limits on tokens, steps, and time always work, and a cost limit works only when real cost is reported.
- **Models differ in small ways the adapter must know.** Which `tool_choice` values a model accepts varies (some accept only `auto`). Whether a repeated prompt prefix is cached automatically or needs a marker varies. The adapter holds this per model. The core never sends options a model might reject.

## Where Warden sits

Warden is not part of Lyra's loop. The loop never touches a key except the model's, and the Model adapter handles that. Keys matter to tools: a GitHub reader needs a GitHub token.

So tools ask the Secrets slot for what they need by name. A tool written once then works in Grove and in another project. In Grove the answer may come from Warden or from the tenant's encrypted secrets (the timeline's GitHub token already comes from the tenant's secrets, not Warden, in `workers/timeline-sync/src/generator.ts`). Elsewhere it comes from an environment variable. The tool does not need to know which.

## What stays in the adapters

Lumen's concepts live in the Lumen adapter and nowhere else: task types (including the new `agent` task), the privacy scrubber, quota, Songbird, and the tenant's provider key. The Cloudflare adapter holds the bindings. The Warden client lives in Grove's tools.

## The rules that keep it honest

- The core imports nothing from the adapters, and nothing specific to Cloudflare or Node. It uses web-standard APIs only.
- A check in the repository's CI enforces that. Nova does the same with its core and UI ("the core never imports the UI; a check enforces it").
- The model slot's request and response stay generic: messages, tools, and a result with text, tool requests, usage, and a finish reason. No `task`, no `tier`, no tenant.

## What this buys

- **Other projects.** Lyra works in the TypeScript projects that have no Lumen or Warden.
- **Tests with no network.** A fake model plus in-memory storage lets the whole loop be tested without calling anything. Pi and Nova both test this way.
- **A clean answer to "where does Lyra run?"** The core runs anywhere. Cloudflare is the first adapter and Node comes second, which matches the original issue.

## What it costs

Four small interfaces, and one real risk: Lumen-shaped ideas leaking into the core (a `task` field, a quota concept). The rules above are the guard. The two blocking Lumen changes in `lumen-changes.md` (tool turns in the conversation, and a finish reason) are exactly what the model slot needs from any provider, so they are not Lumen-specific.

## Left out on purpose

- **The wire protocol and transport** (HTTP, JSONL frames) is a thin layer on top of Lyra. Discussed later.
- **How a human is told that an approval is waiting.** That is a fifth slot in the making, discussed with approvals.

## Open

- Whether file-reading tools are allowed on the Node side, as task-specific tools that never enter the core.
- Packaging inside the new repository (one package with separate entry points, or several). Decided with the repository layout.
- Whether the Cloudflare adapter builds on Cloudflare's agent tooling or on plain Durable Objects. A smaller question, decided later.
