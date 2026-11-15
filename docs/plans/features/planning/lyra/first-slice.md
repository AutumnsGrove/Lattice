---
title: "Lyra first slice and build order"
status: planning
category: features
---

# The first slice

Last updated: 2026-11-15. Everything here is proposed and waits for a yes. It is built from decisions 1 to 58 and from reading the code, not from running anything.

## The goal

The smallest version of Lyra that runs the timeline job end to end on Cloudflare Workers, through Lumen, with a saved record, and that survives being interrupted. Then the rest of version one, in an order that lets you see the timeline working before the parts it does not need.

## Two checkpoints

Two of the decisions put more into version one than the timeline uses: compaction (decision 42) and both transports (decision 45). Both stay in version one. The plan puts them last, behind a checkpoint.

- **Checkpoint 1: the timeline runs.** A real day goes through Lyra on Workers, with tools, a record, limits, retries, and resume.
- **Checkpoint 2: version one is complete.** Compaction and the WebSocket transport are in.

## What is in, and what is later

| In the first slice | Later |
|---|---|
| The loop, the tool registry and recipes, the `finish` done-check, tool errors back to the model, handles (decisions 5, 8, 21, 25) | Approvals and proposals (34 to 37, 50, 52, 53), for HawkAgent |
| The record: append-only entries with ids and parents, and replay (28 to 33) | The shell slot and background commands (17, 38), for the runner case |
| Limits, stop, steering, follow-ups, retries, a fallback model, the stuck safeguard, safe-to-repeat tools, resume (18 to 27, 58) | A Node host and file tools (16) |
| Slots: Model, Storage, Secrets, Waking (12) | Streaming and the interactive consumers (56), for Wisp, Fireside, Reverie |
| Adapters: in-memory, Cloudflare Durable Object, OpenAI-style model, and Lumen | The `GroveAgent`-style hosts (out of date, decision 55) |
| The protocol: frames, `start`, `abort`, `steer`, `follow_up`, `get_state`, `get_messages`, HTTP with server-sent events (43, 44, 46, 47) | Who may approve, once others use Lyra |
| Compaction (42), after checkpoint 1 | |
| WebSocket (45), after checkpoint 1 | |

## The order

| Step | What | Where | Done when |
|---|---|---|---|
| **0. Lumen** | L1 (tool turns) and L2 (finish reason) block everything. L3 to L5 follow alongside (decision 57). | Lattice | A two-step tool loop round-trips through Lumen in tests, and a reply cut off by the token limit reports `length`. |
| **1. Core with fakes** | The types, the four slots, the record entries, and the loop. Tested against a scripted fake model and in-memory storage. Port Pi's loop tests as the conformance suite (the research found them to be about 2,200 lines of edge cases). | Lyra repo | A scripted multi-step run produces a record and exactly one `run_end`, even on error and abort. |
| **2. Limits, retries, resume** | Optional limits, stop and steer, 3 retries with backoff, the recipe fallback, the stuck safeguard, safe-to-repeat tools, resume by replaying the record. | Lyra repo | A fault-injection test kills a run partway and checks that resume continues and that a tool not safe to repeat is never run twice. |
| **3. Recipes and tools** | The task recipe, tool validation errors going back to the model, handles, and the `finish` coverage check. | Lyra repo | A fake-model test where a bad repo name is rejected by a tool, corrected, and the run finishes. |
| **4. Cloudflare adapter** | Durable Object storage (one row per entry in SQLite) and alarm waking. | Lyra repo | In a workerd test, a Durable Object is killed mid-run and the run resumes. |
| **5. Models** | The Lumen adapter, and a plain OpenAI-style adapter for OpenRouter and OpenCode Go. | Lumen adapter in Lattice. OpenAI-style in Lyra repo. | One real call with a tool goes through each. |
| **6. Protocol, HTTP** | Frames, the commands above, and server-sent events. | Lyra repo | A client can `start` a task, watch events, `abort` it, and `get_messages`. |
| **7. The timeline task** | GitHub fetching for pull requests and issues, the tools from `timeline-first-job.md`, the recipe, and one function that both entry points call. | Lattice | A real day runs on Workers with a record. You compare the output with the current one for a few days. |
| **Checkpoint 1** | | | The timeline works through Lyra. |
| **8. Compaction** | The generic summarizer, tools' "current state", and capped tool results. | Lyra repo | A long scripted run compacts, and replay still rebuilds tool state from the full record. |
| **9. WebSocket** | The second transport. | Lyra repo | The same client works over both. |
| **Checkpoint 2** | | | Version one is complete. |

### Where things live

A rule that falls out of decision 12: **generic adapters go in the Lyra repository, and anything specific to Grove goes in Lattice.**

- Lyra repository: the core, the in-memory and Cloudflare adapters, the OpenAI-style model adapter, and the protocol.
- Lattice: the Lumen adapter (it needs Lumen's own types and contract), the secrets adapter for tenant tokens, and the tasks (the timeline recipe and its tools).

So the Lyra repository never imports anything from Lattice, and the check for that is easy to write.

## What this does not need

- **The vine page change (#1687).** The timeline task attaches vines to headings until it lands.
- **Approvals, proposals, the shell, Node, streaming.** All later, and none of them changes what is built here, because the record and the protocol were designed to take them.

## Open questions

- Whether the checkpoints are right, or compaction and WebSocket should come before the timeline runs.
- Whether the rule above (generic in Lyra, Grove-specific in Lattice) is right.
- Which entry point runs the timeline through Lyra first: the manual Arbor generate route, or the nightly worker.
- The new repository's name, layout, and release process.
