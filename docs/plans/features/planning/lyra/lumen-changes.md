---
title: "Lumen changes needed for Lyra"
status: planning
category: features
---

# Lumen changes needed for Lyra

Last updated: 2026-11-13. Based on reading the code, not on running it. Line numbers are from that reading and will drift.

## The principle

Lumen stays a transport layer. It carries messages, tool results, and usage in and out faithfully, and it keeps doing its own jobs: routing, privacy scrubbing, quota, and logging. It never runs the loop and never runs tools. Lyra does that.

Every change below is additive. Reverie's single-turn tool use keeps working.

## What works today

- `POST /inference` accepts `tools` (up to 64) and `tool_choice`, and returns `tool_calls` (`workers/lumen/src/routes/inference.ts`).
- Every response reports usage: input tokens, output tokens, and an estimated cost in USD (`LumenUsage`, `libs/engine/src/lib/ai/lumen/types.ts`). That is enough for Lyra to keep a running total against a budget.
- A Wanderer's own provider key can be passed per request (`tenant_api_key`).
- `RemoteLumenClient` already forwards `tools` and returns tool calls (`remote.ts`).
- Limits: 100 messages per request. No length limit on message text. Only the plain-string form of `input` is capped, at 100 KB.

## Must change (blocks Lyra)

### 1. Messages must be able to carry tool turns
Today a message role is `system`, `user`, or `assistant` (`types.ts`, line 32; the worker's `MessageSchema` in `workers/lumen/src/types.ts`, line 58). A loop needs the model's tool request and the tool's result in the conversation for the next step, and neither can be sent.

Needed:
- A `tool` role with a `tool_call_id`.
- Assistant messages that carry their own `tool_calls`.

This touches the engine types, the worker's input schema, the OpenRouter adapter (`providers/openrouter.ts`, `formatMessages`, line 672, which today only maps role and content), and `RemoteLumenClient`. Without it, step two cannot be sent.

### 2. Report why the model stopped
OpenRouter returns a `finish_reason` and Lumen drops it (it appears only in the provider's raw response types, `providers/openrouter.ts`, lines 35 and 57). Lyra needs it, because a reply cut off by the token limit can contain half-written tool arguments, and running those would be wrong.

The timeline has already hit this. Its own comment (`workers/timeline-sync/src/generator.ts`, lines 230 to 236) records replies being "cut off mid-object" at 2048 tokens, then silently swapped for fallback text, so the limit was raised twice. With a finish reason, that failure is visible.

Needed: `finishReason` on `LumenResponse` and `finish_reason` in the worker's response.

## Decisions needed (small, but they should be made on purpose)

### 3. The privacy scrubber and tool results
`scrubPii` runs over every message and replaces emails, phone numbers, IP addresses, and card and SSN patterns (`pipeline/preprocessor.ts`, called at `client.ts` step 1). Applied to tool results, it could change facts the model needs, or it could be wanted. A per-request `skipPiiScrub` option already exists.

Options: skip scrubbing for Lyra runs; scrub only text a Wanderer wrote; or scrub tool results too.

### 4. Songbird and tool results
Songbird, the injection check, inspects only the user's content (`extractUserContent`, `client.ts`, around line 118). Tool results carry text written by other people (issue comments and PR descriptions on public repos), which is the usual way an injection arrives.

Options: leave it alone for now (the timeline has one user), or check tool results later.

### 5. Quota
Quota counts requests per day, per tier, per task (`quota/limits.ts`). A ten-step run costs ten requests. A `skipQuota` option exists.

For the timeline, skipping is fine. The real rule (count a run as one request, or count steps, or budget by cost) should be settled before anyone else uses Lyra.

### 6. Which task Lyra's calls use
Lumen's tasks today are moderation, generation, summary, embedding, chat, image, code, and transcription. The task controls the default model, the quota line, and the Songbird context.

Options: reuse `summary` or `chat`, or add an `agent` task.

## Small and worth doing

### 7. A tool-support flag per model
`lumen-models.json` has no field saying whether a model can call tools. A model that cannot returns no calls, and nothing says why. Add a `supportsTools` field per model (model facts live in that file), have agent calls pick from models that have it, and check the timeline's default model.

### 8. The message cap
Lumen caps a request at 100 messages. That is fine for the timeline. Lyra's step limit should stay under it, or the cap should be raised.

## Not needed for the timeline

- Streaming from the worker (`stream` exists only in the in-process client). The timeline is a background job.
- A decision-model task or text-to-speech.
- Idempotency keys. A resend after an interruption costs one duplicate call, which is harmless here.
- `mcp.ts`. It is a stub, dead since #471 was closed as not planned. Leave it until Autumn says to remove it.

## Notes for the design

- Only OpenRouter-routed models are in scope at first. The Workers AI provider has not been checked for tool messages.
- Never put the Wanderer's provider key in Lyra's saved state or in a run's transcript. It is sent in the body of every request.
- `docs/specs/lumen-tool-calling-spec.md` says single-turn only and is marked Planning. It needs updating when this work is scoped.
