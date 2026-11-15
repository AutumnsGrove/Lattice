---
title: "Lyra protocol"
status: planning
category: features
---

# The protocol

Last updated: 2026-11-15. Decisions 43 to 48 are decided. Everything else is a draft for discussion, marked proposed.

## What it is

The protocol is how anything outside Lyra talks to it: an Arbor page, a script, another worker, a terminal. It answers four things. How do I start a run? How do I stop it, steer it, or add a follow-up? How do I answer an approval? How do I watch what is happening and read the record?

## Decided

**43. Lyra speaks Nova's frames.** A subset of them, plus a few new ones. One client could drive either. This was a goal of the original issue. Nova's protocol (`docs/PROTOCOL.md` in the Nova repository) is JSON, one object per line, and every connection starts with a `hello` exchange that names the version. Unknown fields are ignored.

**44. A session holds many runs.** A client talks to a session, like in Nova. A follow-up sent after a run has ended starts the next run in the same session.

**45. HTTP with server-sent events, and WebSocket, both from the start.** The core only speaks frames. The two transports are thin layers over it.

**46. A `start` command begins a task.** It names the task and passes its inputs. `prompt` stays for chat-style use.

**47. Access.** Service bindings for other Grove workers, a bearer token for anything outside, and a tenant id stored on every session. Per-tenant sign-in is added later if someone else uses Lyra.

**48. The stateless calls stay out of Lyra.** Decision models, embeddings, speech, and transcription are single calls, not runs. They stay in Lumen.

## What Nova's protocol looks like

| Frame | Direction | What it is |
|---|---|---|
| `hello` | both | Names the version. The client lists which UI requests it can answer. |
| command | client to server | Do something. The frame's `type` is the command name (`prompt`, `steer`, `abort`). It may carry an `id`. |
| `response` | server to client | The outcome of one command, `ok` or an error. A successful `prompt` means "accepted", not "finished". |
| `event` | server to client | Something happened. Events carry a counter and a time. |
| `ui_request` / `ui_response` | both | The server needs a person (confirm, select, input, form) and waits for the answer. |

Error codes are stable strings: `bad_request`, `busy`, `not_found`, `permission_denied`, `unsupported`, `timeout`, `provider_error`, `internal`.

A run always ends with exactly one `run_end`, even on error or abort. A client treats the first `run_end` as the end of its request.

## Proposed: what Lyra keeps, drops, and adds

**Kept (Lyra's subset).**
- Frames: `hello`, command, `response`, `event`, `ui_request`, `ui_response`.
- Commands: `prompt`, `steer`, `follow_up`, `abort`, `get_state`, `get_messages`, `compact`.
- Events: `run_start`, `run_end`, `turn_start`, `turn_end`, `message_end`, `tool_call`, `tool_start`, `tool_update`, `tool_end`, `permission`, `usage`, `retry`, `compaction`, `error`, `queue_update`, `state_changed`.

**Dropped** (coding, terminal, and sign-in commands): `login`, `bash` as a user command, `reload`, `set_tools`, `get_extensions`, and the other terminal-interface and extension commands. Thinking events stay optional.

**Added** (Nova has no equivalent, because a Nova session is attended):
- **`start`**, a command that begins a task by name with its inputs, for example the timeline for a given date (decision 46).
- **`resume`** for a parked run.
- A way to **list pending requests**, so a viewer can show the glow (decision 36).
- A **parked** and **resumed** event.
- **Proposals** (decisions 50 to 53): a command to accept or reject one, and an event when one is decided.
- **Who is asking**: a tenant id and a credential in `hello` (decision 47). Nova assumes one trusted agent per server.

## The main difference: approvals are durable

In Nova, a `ui_request` is live. The server asks and waits while the connection stays open. In Lyra, a run parks and the pending request is saved in the record (decisions 34 to 37). So the answer may arrive hours later, from a different client, after the run's host was evicted.

Proposal: reuse Nova's `ui_request` and `ui_response` shapes for the content of a request and its answer, and make them durable.
- If a client is connected, the request is sent live as a `ui_request`.
- If not, it is saved, and any client can list it later and answer it with a `ui_response` that echoes the request id.
- Nova's optional `timeout_ms` and `default` map onto decision 37, with the default being deny.

## Proposed: a parked run and `run_end`

To keep a Nova client working, a parked run emits `run_end` with the reason `parked`. A `resume` then starts a new `run_start` that names the run it continues. The rule "the first `run_end` ends the request" still holds.

## Open questions

- The exact fields of `start`, and how a task declares its inputs.
- The exact names of the command that decides a proposal (accept or reject, with an optional note) and of the event emitted when one is decided (decisions 50 to 53).
- The one-time codes on approval requests.
