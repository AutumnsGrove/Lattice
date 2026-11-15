---
title: "Lyra protocol"
status: planning
category: features
---

# The protocol

Last updated: 2026-11-15. Decisions 43 to 48 are decided. The wire draft at the end (decisions 83 to 87) is proposed and waits for a yes.

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

## Wire draft (proposed, decisions 83 to 87)

This is the concrete shape, written so spec rows can have IDs (decision 62). Only the parts that **differ from Nova** get rows here. For everything Nova specifies and Lyra keeps unchanged (framing, error handling of bad lines, unknown fields), Lyra's rule is "as in Nova's `docs/PROTOCOL.md`", and the tests port with it.

### Framing and hello

- UTF-8, one JSON object per line, split on `\n` only, `\r\n` accepted, empty lines skipped, unknown fields ignored. A bad line gets a failed `response` with `bad_request`, an unknown frame type or command gets `unsupported`, and neither is fatal.
- The line cap is **8 MiB**, configurable. Nova's 64 MiB exists because a speech response carries audio, and Lyra carries none (decision 48).
- Client `hello`: `{type, version: 1, client, capabilities, tenant?}`. `capabilities` lists the request kinds the client can answer: `ui.confirm`, `ui.select`, `ui.input`, `ui.form`. `tenant` is only for trusted callers (see Access below).
- Server `hello`: `{type, version: 1, server, capabilities}`, with `capabilities` drawn from `steer`, `follow_up`, `compact`, `resume`, `proposals`.
- Over HTTP, the version travels in a header and there is no hello frame.

### Commands (decision 83)

| Command | Fields | Notes |
|---|---|---|
| `start` | `task`, `input`, `session?`, `key?` | Begins a task. Creates a session unless `session` is given. Answers `{session, run}`. `key` is an idempotency key: a repeat with the same key, task, and input returns the existing run, and the same key with different input is `conflict`. A cron retry must not start a second timeline run. |
| `prompt` | `session`, `text` | Chat-style: a user message that starts a run in an existing session. `busy` if a run is active, unless `queue` is set (as in Nova). |
| `steer` | `session`, `text` | Read by the model at the next gap between steps (decision 19). |
| `follow_up` | `session`, `text` | Read after the work would otherwise end. When nothing is running, it starts the next run in the same session (decisions 27 and 44). |
| `abort` | `session` | Stops the active run. The run is **parked** with the reason `stopped`, and can be resumed (decision 23). |
| `resume` | `session` | Resumes a parked run. `busy`, naming the pending request ids, if the run is waiting for a person. |
| `get_state` | `session?` | Run state, parked reason, pending request count, usage so far, queue sizes. |
| `get_messages` | `session`, `entry?` | The record's entries, or the branch ending at `entry`. |
| `compact` | `session`, `instructions?` | Compacts now (decision 42). |
| `list_sessions` | `task?`, `state?`, `limit?`, `cursor?` | Sessions for the caller's tenant. |
| `list_pending` | `session?` | Pending approvals and questions, and open proposals, so a viewer can show the glow (decision 36). |
| `decide_proposal` | `proposal`, `decision: accept \| reject`, `note?` | Decides a proposal (decisions 50 and 53). A second decision is `conflict`. |

Dropped from Nova: `set_model`, `set_thinking`, `set_context_limit`, `set_tools`, `reload`, `get_commands`, `list_models`, `get_usage`, `run_command`, `bash` as a user command, the session commands that fork and navigate (decision 30), the login commands, the extension commands, and `decide`, `embed`, `speak`, `transcribe` (decision 48). Image attachments are not supported in version one.

Responses are Nova's: `{type: "response", id, command, ok, data}` or `{..., ok: false, error: {code, message}}`. The error codes are Nova's eight (`bad_request`, `busy`, `not_found`, `permission_denied`, `unsupported`, `timeout`, `provider_error`, `internal`) plus **`conflict`**, for a reused idempotency key with different input and for a second decision on the same proposal or request.

### Events (decision 84)

Every event carries `seq`, `ts`, `session`, and `run`. Kept from Nova unchanged: `run_start`, `turn_start`, `turn_end`, `message_start`, `text_delta`, `message_end`, `thinking_*` (optional), `tool_call`, `tool_start`, `tool_update`, `tool_end`, `permission`, `usage`, `retry`, `compaction`, `queue_update`, `error`, and the `ui_expired` notice.

New:
- **`parked`** `{run, reason, detail?}`, with `reason` one of `waiting_for_person`, `limit`, `stopped`, `stuck`, `model_unavailable`.
- **`resumed`** `{run}`.
- **`fallback`** `{run, from, to, reason}`, when the recipe's fallback model takes over (decision 58).
- **`ui_resolved`** `{id, by}`, so other clients close a dialog that was answered elsewhere.
- **`proposal`** `{run, proposal: {id, payload, evidence, state}}` and **`proposal_decided`** `{proposal, decision, note?, by}`.

**`run_end`** `{run, reason, turn, usage, parked_reason?}`, with `reason` one of **`done`, `parked`, `failed`**. This differs from Nova's `done`, `exhausted`, `aborted`, `error`. In Lyra a limit and a stop both park a run so it can be resumed (decisions 22 and 23), so `exhausted` and `aborted` become `parked` with a `parked_reason`, and `error` becomes `failed`, which is reserved for a run that cannot continue (for example an unreadable record). A run still always ends with exactly one `run_end`, and a client still treats the first one as the end of its request.

### Requests: durable approvals and questions (decision 85)

Nova's `ui_request` and `ui_response` shapes, made durable. A request is saved in the record before it is sent, then sent live as a `ui_request` to any connected client that declared the kind, and otherwise listed by `list_pending`.

| Field | Meaning |
|---|---|
| `id` | An unguessable random identifier (128 bits), assigned by the server. |
| `run`, `kind` | The run, and `confirm`, `select`, `input`, or `form` (decision 34's approval, choice, and question). |
| `title`, `message` | What is being asked. |
| `preview?` | The thing to look at before answering. For Reverie, the whole set of changes. |
| `tool?`, `args?`, `risk?` | For an approval of a tool call: which tool, a summary of its arguments, and its risk label. |
| `timeout_ms?` | After this, the request resolves to its default, which is **deny** (decision 37). |

- **Answers cannot be forged, and need no extra code.** The id is unguessable and single use. A second answer to the same id is `conflict`, and an answer to an unknown or expired id is `not_found`. This answers the "one-time codes" open question.
- A `ui_response` is `{id, ok?, note?, text?, ids?, answers?, cancelled?}`, as in Nova, with `note` read by the model on a deny (decision 34).
- Over HTTP, `POST /v1/ui_response`. A client that is not connected simply answers later, possibly from a different client and after the run's host was evicted.

### Replay from the record (decision 86)

Events that come from a record entry (everything except live deltas) carry the entry's position as `seq`. So a client that reconnects with `Last-Event-ID` gets every missed event by reading the record, with no separate buffer. Live-only events (`text_delta`, `thinking_delta`, `tool_update`) are not replayed. This also fixes Nova's weakest point: a client that stops reading is dropped after 1024 events, and in Lyra it can come back and catch up.

- **HTTP:** `POST /v1/commands` takes one command and returns its response. `GET /v1/events` is a server-sent-event stream, with a session filter. `POST /v1/ui_response` answers a request. `GET /v1/state` is `get_state`.
- **WebSocket:** `GET /v1/ws`, the same frames in both directions, with the same replay on reconnect.
- On Cloudflare, a Durable Object holds each session, so a WebSocket can hibernate while a run is parked (to confirm against the current hibernation API).

### Access (decision 87)

Decision 47 stays: other Grove workers use a service binding, and anything outside needs a bearer token. A trusted binding caller names the tenant in `hello` (or a header over HTTP). A token caller's tenant comes from the token. Every session stores its tenant id, and every command is checked against it. A command naming another tenant's session is `not_found`, not `permission_denied`, so session ids do not leak.

### Spec rows

IDs use these prefixes: `FRM` framing and hello, `CMD` commands, `EVT` events, `REQ` requests, `HTP` HTTP, `WSK` WebSocket, `ACC` access. Rows for behavior the same as Nova's are not repeated.

| ID | Case | Expected |
|---|---|---|
| CMD01 | `start` with a new key | Creates a session and a run, answers `{session, run}` |
| CMD02 | `start` repeated with the same key, task, and input | Returns the same run, starts nothing |
| CMD03 | `start` with the same key and different input | `conflict` |
| CMD04 | `follow_up` while a run is active | Queued, read after the work would otherwise end |
| CMD05 | `follow_up` when no run is active | Starts the next run in the same session |
| CMD06 | `abort` on an active run | Run parked with reason `stopped`, resumable |
| CMD07 | `resume` on a run parked for a stop or a limit | New `run_start` that names the run it continues |
| CMD08 | `resume` on a run waiting for a person | `busy`, naming the pending request ids |
| CMD09 | `list_pending` with an approval and an open proposal | Both listed with enough content to answer |
| CMD10 | `decide_proposal` twice | Second is `conflict` |
| CMD11 | `get_messages` with an `entry` | The branch ending at that entry |
| EVT01 | Any run | Exactly one `run_end` with reason `done`, `parked`, or `failed`, and none after it |
| EVT02 | A limit is hit | `parked` with reason `limit`, then `run_end` `parked` |
| EVT03 | The fallback model takes over | A `fallback` event, and a record entry |
| EVT04 | A request is answered by one of two clients | The other receives `ui_resolved` |
| EVT05 | A client reconnects with `Last-Event-ID` | Receives every missed record-derived event in order, and no live deltas |
| REQ01 | A request is created | Saved in the record before it is sent |
| REQ02 | A request with no connected client | Listed by `list_pending`, answerable later |
| REQ03 | An answer to the same id twice | Second is `conflict` |
| REQ04 | An answer to an unknown id | `not_found` |
| REQ05 | A request with `timeout_ms` that passes | Resolves to deny, and emits `ui_expired` |
| REQ06 | Another wake-up arrives while a request is pending | Queued, not delivered, until it is answered |
| ACC01 | A command naming another tenant's session | `not_found` |
| ACC02 | No token from outside a service binding | Refused |

The remaining rows (framing edge cases, the HTTP and WebSocket mappings, access) are written when each is built.

## Open questions

- The shell-related frames, if any. A `bash` tool call is an ordinary `tool_call` and needs none.
