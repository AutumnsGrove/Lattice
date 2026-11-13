---
title: "Lyra adapters: running without Lumen or Warden"
status: planning
category: features
---

# Lyra adapters

Last updated: 2026-11-13. Status: proposed (decision 12), waiting on a yes.

## The goal

Lyra should run in any TypeScript project, including ones that have no Lumen and no Warden, and including ones that run on Cloudflare. Grove's pieces become adapters. Lyra's core does not know they exist.

This is more work than hard-wiring Grove in. It also makes Lyra easier to test and keeps it from being shaped around one platform.

## The idea: four slots

Lyra's core defines four small slots. Each is a short interface, a few functions. Each has a simple version for general use and a Grove version.

| Slot | What Lyra needs from it | Grove's version | Elsewhere |
|---|---|---|---|
| **Model** | Send a conversation and a list of tools. Get back text, tool requests, token usage and cost, and the reason the model stopped. | Lumen | Any OpenAI-style endpoint, OpenRouter, or a Cloudflare Workers AI binding |
| **Storage** | Save and load a run's record and its progress. Append-only. | Durable Object storage | Memory (for tests), SQLite or a file (Node) |
| **Secrets** | Let a tool ask for a key or token by name. | Warden, or the tenant's encrypted secrets | Environment variables |
| **Waking** | Wake a run later, after a wait or an interruption. | A Durable Object alarm | A timer (Node), or nothing for a simple script |

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

- Which adapters ship first. Suggested: Lumen, Durable Object storage and alarm, in-memory storage, and a plain OpenAI-style model adapter for other projects.
- Packaging inside the new repository (one package with separate entry points, or several). Decided with the repository layout.
- Whether the Cloudflare adapter builds on Cloudflare's agent tooling or on plain Durable Objects. A smaller question, decided later.
