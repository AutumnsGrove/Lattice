---
title: "Lyra engineering practices and testing"
status: planning
category: features
---

# Engineering practices and testing

Last updated: 2026-11-15. Decided (decisions 62 to 66). It is built from Nova's `docs/TESTING.md` (read in full), a few web searches (sources at the end), and your instructions: test-driven, happy, sad and bad paths, good fuzzing, end-to-end tests from the start, good practices from the first commit, and a way to test locally before shipping, with OpenRouter and OpenCode Go.

Nothing here has been run. Tool claims marked "to confirm" must be checked when the repository is set up.

## Principles

1. **Tests first, watched failing.** For every behavior, write the test, see it fail for the right reason, then write the code. This is also how Lattice's own rules work (`AGENT.md`: "Fix the bug: write a test that reproduces it, then make it pass").
2. **Failure is written down before the code.** Nova's testing document begins with a lesson from an earlier project: an agent told only to test the happy path missed the edge cases that mattered, which a second review found later. So the cases get listed first, from a catalog, and each becomes a test.
3. **End-to-end from the first commit,** with no browser. Nothing in Lyra needs one, and a browser suite made the earlier project's machine crawl.
4. **Deterministic.** No test depends on the wall clock, the network, or random order. Time is injected. Seeds are fixed and printed when a test fails.
5. **The core stays small and checkable.** Rules that can be enforced by a script are enforced by a script (imports, size, tests per spec row), not by good intentions.

## Three kinds of path

Every behavior gets all three. This is how "happy, sad, and bad" maps onto Lyra:

| Path | Meaning | Examples |
|---|---|---|
| **Happy** | The expected flow works | A run finishes in three steps. A tool result goes back to the model. A parked run resumes. |
| **Sad** | Something expected goes wrong, and Lyra handles it | A tool returns an error. A model call fails and retries. A limit is hit. A person denies an approval. A host is evicted mid-run. A person stops a run. |
| **Bad** | The input is malformed or hostile | Tool arguments that are invalid JSON. A stream cut off mid-event. A tool result that tries to give the model new instructions. A damaged record line. A duplicate id. A frame with the wrong shape. An oversized payload. |

The catalog below lists the sad and bad cases to work through. The happy ones are the specs.

## Test layers

Adapted from Nova's seven layers. Names are mine.

| Layer | What it tests | How | Where it runs |
|---|---|---|---|
| **L0 unit** | One function or type | Plain tests, no I/O | Node, always |
| **L1 component** | A module with fakes at its edges | Scripted fake model, in-memory storage, fake clock | Node, always |
| **L2 scenario** | The whole core, then the real server, end to end | The same scenario files run in-process first, and over the protocol later | Node, then workerd |
| **L3 cassette** | Fidelity to a real provider | Replay recorded responses | Node, always |
| **L4 workerd** | The Cloudflare adapter in the real runtime | Vitest in the Workers pool: real Durable Objects, alarms, SQLite, eviction | workerd |
| **L5 live** | A real model | Opt-in, needs a key, never in CI | Local |

The fast loop (L0, L1, L2 in-process, L3) should finish in seconds. The full run adds L4. CI limits parallelism so it does not saturate a small runner.

### Scenario files: the same test at two levels

A scenario is a small file, readable by a person and easy for an agent to extend: what the fake model does on each turn, what the task is, what to send, and what to expect.

```yaml
name: a bad repo name is rejected, corrected, and the run finishes
task: timeline-test
model:
  - tool_calls: [{ id: c1, name: start_project, args: { repo: "not-a-repo" } }]
  - tool_calls: [{ id: c2, name: start_project, args: { repo: "lattice" } }]
  - tool_calls: [{ id: c3, name: finish, args: {} }]
steps:
  - send: { command: start, task: timeline-test }
  - expect_events:
      - { type: tool_end, call_id: c1, result: { is_error: true } }
      - { type: tool_end, call_id: c2, result: { is_error: false } }
      - { type: run_end, reason: done }
expect_record:
  - { type: status, state: done }
```

Event matching is by subsequence, so an unrelated new event does not break a test.

**The key idea is that the same scenario files run twice.** First they run in-process against the core (step 1), with no server. Later they run over the real protocol against the real server in workerd (step 6 on). So end-to-end tests exist from the first commit, and when the server arrives, a whole suite is already waiting for it.

### The test kit

A small package every test uses, with its own strict tests.

- **Scripted model:** a fake model slot driven by a script. A turn can emit text, tool calls (whole or split across chunks), usage, a finish reason, a delay, or an error at a chosen point. It records every request it received.
- **Fake model server:** the same scripts served over real HTTP as real server-sent events, so the actual OpenAI-style adapter and the actual server are exercised. It can misbehave on purpose: cut the connection mid-event, send malformed JSON, stall, return 429 with `Retry-After`, return 500, or send a huge chunk.
- **Fake clock:** injected wherever time matters (retry backoff, timeouts, the stuck safeguard). No test sleeps.
- **In-memory storage and a crashing wrapper:** storage that can fail on the Nth write, or kill the run after a chosen entry, for resume tests.
- **Scenario runner:** loads the files above, in-process or over the protocol.
- **Leak check:** fails a test that leaves a timer, a stream, or an open connection behind.

## Failure-mode catalog for Lyra

The checklist to work through when writing a change's test cases, before the code. Adapted from Nova's, keeping the parts that apply (Nova's file, shell, terminal, and extension sections do not).

### Model and streaming
- Stream ends without a final marker. Stream ends mid-event.
- A chunk with empty choices (usage only). A chunk with null content.
- A tool call split across many chunks: name first, arguments in fragments, id late.
- Two tool calls interleaved. A tool call with no id. Duplicate ids.
- Tool arguments that are invalid JSON, empty, or `null`. A tool call with an empty name, or a name no tool has.
- Usage in the last chunk, in a separate chunk, or missing.
- HTTP 401, 403, 404, 408, 429 with and without `Retry-After`, 500, 502, 503. A 200 response whose body is an error object. A non-JSON error body.
- Connection refused, reset mid-stream, a stall past the timeout.
- Cancelled before the request, during connect, mid-stream, after the last chunk.
- Finish reasons: `stop`, `length`, `tool_calls`, `content_filter`, unknown, missing. **A reply cut off by the token limit while holding tool calls must never run them** (decision 25).
- Unknown extra fields everywhere (must be ignored).

### The loop
- No tools registered. A tool the model invents. Arguments that fail validation.
- Zero, one, or many tool calls in a turn. The same tool many times. A tool call after a final answer.
- A tool that is slow, instant, throws, returns an error, returns nothing, returns an enormous result.
- Results appended in call order even if tools finish in a different order.
- Limits: a step limit exactly reached, one below, zero, negative. A token, time, or cost limit hit mid-run (the run parks, decision 22).
- Stop before the first request, during streaming, during a tool, between steps. Stop twice.
- Steering during a tool, during streaming, after the last step. A follow-up queued while a run is active, and after it ended.
- Retry: succeeds on attempt two, exhausts after 3, a non-retryable error is not retried, backoff uses the fake clock, a stop during backoff. The fallback model: used after the retries, and recorded.
- The stuck safeguard: a tool failing the same way N times, a run stopping without finishing, and the safeguard turned off.
- A reply the model gives that tries to end the run without the done-check passing.
- Events: exactly one `run_start` and one `run_end`, in exact order, none after `run_end`.

### The record and resume
- A new empty record. A record with a damaged line in the middle, a truncated last line, a line of the wrong shape, an unknown entry kind (preserved and skipped, not dropped).
- A duplicate id. A `parent` that does not exist. A cycle.
- **Killed at every point**: before the model request, after the model reply but before the tool, during the tool, after the tool but before its result is saved, during compaction. Resume must continue correctly each time.
- A tool that is not safe to repeat, interrupted mid-call: never run twice, and the model is told the outcome is unknown (decision 24).
- Replay rebuilds tool state exactly (the handle map, the half-built page).
- Compaction: the cut never falls between a tool call and its result. An empty history. A summary call that fails, or returns nothing. A second compaction over the first. Replay still works from the full record.

### Approvals and proposals
- An approval granted, denied with a note, never answered (no timeout by default), answered after the timeout, answered twice, answered by the wrong id, answered after the host was evicted.
- A request that needs an answer and nothing can deliver it: denied.
- While a request is pending, other wake-ups queue and do not wake the run.
- A proposal decided twice. A decision emitted to the app and the app not listening.

### Protocol
- Framing: a line with `\r\n`, a U+2028 inside a string, a line at the size limit and one over, two frames in one read, one frame across many reads, an empty line.
- Invalid JSON, valid JSON of the wrong type, a missing `type`, an unknown `type`.
- Two commands with the same `id`. A response for an unknown id.
- A client that disconnects mid-run. A client that stops reading (backpressure). A command while busy. `abort` while idle. A follow-up when nothing is running (starts the next run, decision 44).
- Access: no token from outside, a wrong token, a session owned by another tenant.

### Cloudflare
- A Durable Object evicted at each point above. An alarm that fires late, twice, or while a request is running.
- Storage write failure. A record at the size limit for a row.
- A tool that uses a binding that is missing.

### Lumen adapter
- A tool message in the conversation, the scrubber changing a handle-looking string, a finish reason missing, usage missing, a request over the message cap (100), the model without tool support, the `agent` task refused without `skipQuota`.

## The matrix rule

Taken from Nova, where it turned "did you test the edge cases?" from a judgement into a check.

- Every behavior in a spec gets a row with an ID, for example `LIM04`, in a table in the spec (the docs in this folder are the specs).
- A test's name contains its row ID as a whole component.
- A script reads the specs, finds every row ID, and **fails the build if a row has no test, or if a test cites an ID that is not in any spec.**
- A change may add rows but may not delete or weaken one. If a row is wrong because behavior changed on purpose, the row changes in the same commit, with the reason.

The decision documents in this folder do not yet have row tables. Each would get one when its step is built.

## Property tests and fuzzing

**Property tests (fast-check).** A property is a rule that must hold for every input of a kind, and the tool generates many. Use them where the rule is stronger than a few examples:
- The record loader: any sequence of valid entries replays to the same state, and an active path is always a path from the root.
- Compaction cut points: never between a tool call and its result, for any history.
- Resume: for any script and any kill point, the final record equals the record of an uninterrupted run (except for the recorded interruption).
- Limits: the usage summed over steps equals the total reported, even when a later call fails.
- Handles: replaying saved tool results rebuilds the same handle map.
- Frames: encode then decode returns the same frame.

**Coverage-guided fuzzing** for code that takes untrusted bytes. These are small pure functions, which suits it:
- The stream parser for model responses.
- The frame reader and the command validator.
- Tool-argument decoding and validation.
- The record loader (damaged and hostile files).

Each fuzz target has a seed set of the nasty cases from the catalog, and runs for a few seconds in CI. Longer runs happen on demand.

**A model whose output is random.** The fake model server can also be driven by a seeded generator that produces valid-looking but wrong replies (truncated JSON, wrong tool names, repeated calls). A run against it must always end in exactly one `run_end`, with a record that loads, no matter what.

### Tools, and what is unconfirmed

- **Vitest 4 with the Cloudflare Workers pool** for workerd tests. Cloudflare's [Durable Objects testing guide](https://developers.cloudflare.com/durable-objects/examples/testing-with-durable-objects) uses `vitest@^4.1.0` and `@cloudflare/vitest-pool-workers`, with direct access to Durable Objects, and the pool can run alarms immediately. A [changelog entry](https://developers.cloudflare.com/changelog/post/2026-06-25-durable-object-eviction-test-helpers/) says the package now has `evictDurableObject` and `evictAllDurableObjects` test helpers (version 0.16.20 and later), which are exactly what the resume tests need. **To confirm:** one official page copy calls the package `@cloudflare/vitest-plugin`, and older guides use a different config style, so check the current package name and config at install.
- **fast-check** for property tests. It has an [official Vitest connector](https://fast-check.dev/docs/tutorials/setting-up-your-test-environment/property-based-testing-with-vitest/) and is test-runner agnostic. **To confirm:** I found no statement that it runs on Workers, so the first test in the Workers pool should check it.
- **Coverage-guided fuzzing.** Jazzer.js is a coverage-guided fuzzer for Node, built around Jest. Its docs point Vitest users to [Vitiate](https://vitiate.js.org/guides/migrating-from-jazzerjs/), a Vitest plugin. **To confirm:** I did not verify Vitiate's maturity or how active it is. Because the fuzz targets are pure functions, they can run on Node only, and fast-check is the fallback if Vitiate does not hold up.

## Local testing, before it ships

You want to test locally with OpenRouter, and also with OpenCode Go, so testing can be thorough without paying per call.

### The ladder, from cheapest to most real

1. **Fakes** (L0 to L3): free, instant, run constantly. Most tests live here.
2. **The real runtime locally** (L4): workerd through the Vitest pool, and `wrangler dev` for a hand-driven server with real Durable Objects, alarms, and SQLite on your machine.
3. **A real model, locally** (L5): a small live suite against OpenCode Go for bulk testing, and against OpenRouter for production fidelity.
4. **Through Lumen, locally:** Lattice already has `./scripts/dev-stack.sh`, which runs the real workers locally on one Miniflare instance (`AGENT.md`). The Lumen adapter and the timeline task can be tried against the real Lumen worker there. How Lumen gets its provider key in that stack was not checked. One option is the per-request key option (`tenant_api_key`) that the timeline already uses.

### A small local client

A thin dev client in the Lyra repo: start a task, tail events, send a steer or follow-up, answer an approval, read the record. It is a developer tool and not a coding TUI. It is also the quickest way to try Lyra by hand, and it speaks the real protocol, so it tests it too.

### OpenCode Go for live testing

From Nova's provider code and docs (not from running anything): the base URL is `https://opencode.ai/zen/go/v1`, the key is read from `OPENCODE_GO_API_KEY`, a models list lives at `/models`, and a session header (`x-opencode-session`) is available. Models differ in which dialect they speak, so the first adapter (decision 14) only uses models that speak chat completions.

Things to be honest about:
- **It is not free, it is allowance.** It draws on a monthly subscription allowance, per model. Nova's catalog (captured 2026-11-05) lists a monthly limit per model and a 2x price multiplier on some models during certain UTC hours. Heavy live suites should avoid those windows, and every live run needs a budget cap (Lyra's own limits, decision 18) so one bad loop cannot burn the month.
- **Fidelity differs.** The model that runs in production through OpenRouter may behave differently with tools than the one used for bulk testing. So most live tests use OpenCode Go, and a small set of "production fidelity" tests runs against the production model through OpenRouter.
- **Keys come only from the environment,** are never written to a file, and are scrubbed from anything recorded.

### Recording real responses to replay free in CI

A live run can record the real HTTP exchange (with keys and auth headers removed) into a cassette. CI replays cassettes with no network and no cost. So a live run spends allowance once, and the result becomes a permanent, deterministic test. A test fails if a cassette contains a key-shaped string.

## Coding practices from the first commit

- **TypeScript strict,** with no `any` and no casts on outside data. Everything that crosses a boundary is validated where it enters: model output, tool arguments, record lines, protocol frames. This matches Lattice's rule (`AGENT.md`: no `as any` or `as SomeType` on external data). Which schema library the core uses (the research favored Standard Schema, so Zod, Valibot, or TypeBox all work) is not decided.
- **Errors are data.** Failures become results with stable codes, not exceptions crossing a boundary. Hooks and tools run under a deadline and can never crash the loop. Nova's error codes (`bad_request`, `busy`, `not_found`, `permission_denied`, `unsupported`, `timeout`, `provider_error`, `internal`) are the starting set.
- **Web-standard APIs only in the core.** No `node:*` imports, enforced by a check, so it runs on Workers and on Node.
- **The import rule from decision 60,** enforced by a script: the core imports nothing from the adapters, and the Lyra repo imports nothing from Lattice.
- **Few dependencies,** on an allow-list, with pinned versions. A bundle-size check for the Workers build, because cold start matters.
- **Small modules with a size budget per package,** as Nova does, enforced in CI. The budgets are set when each package is first built.
- **Docs travel with the code.** Each step's behavior is in a spec table with row IDs, and the docs it touches are updated in the same change.
- **Honest endings.** A change says what is unfinished, in its description. An empty list is fine. A silent gap is not.

### Definition of done

A change is done when one command passes, and the same command runs in CI:

```
pnpm ci
  format       # prettier check
  typecheck    # tsc --noEmit, strict
  build        # core, adapters, the Workers build
  test         # L0 to L3, then L4 in workerd, each with its own run
  fuzz         # short fuzz and property runs, seeds printed on failure
  importcheck  # the import rules above, and no node:* in the core
  matrixcheck  # every spec row has a test, every cited ID exists
  budget       # package size and bundle size within budget
  coverage     # 85% floor on the core (decision 66), a smoke alarm
```

The tests for the change were written first and watched failing. A fast loop (`pnpm test`) runs while working. It is not the gate.

## How this fits the build order

Every step in `first-slice.md` already ends with a "done when" test. This document adds how each is tested:

| Step | Added by this document |
|---|---|
| 1 Core with fakes | The test kit, the scenario format and runner, the first catalog cases, the import and `node:*` checks, `pnpm ci` itself |
| 2 Limits, retries, resume | Property tests for resume at every kill point, the crashing storage wrapper |
| 3 Recipes and tools | Fuzzing the tool-argument validator |
| 4 Cloudflare adapter | The Workers pool, the eviction helpers, the alarm tests |
| 5 Models | The fake model server, the live suite, and cassette recording against OpenCode Go and OpenRouter |
| 6 Protocol | The same scenario files, now over the real protocol, and the fuzz targets for frames and the command validator |
| 7 Compaction | The cut-point property test |
| 8 WebSocket | The same scenarios again, over WebSocket |
| 9 Timeline | A live comparison against the current output, and a scenario per catalog case that applies |

## Decisions

- **62.** Test-first, with a happy, sad, and bad test for every behavior, a failure-mode catalog, and the matrix rule from the first commit.
- **63.** The test layers above, with the same scenario files run in-process first and over the real protocol later, so end-to-end tests exist from the first commit.
- **64.** Property tests everywhere a rule can be stated, coverage-guided fuzzing for code that takes untrusted bytes, and a randomly misbehaving fake model.
- **65.** Local testing: the real runtime locally, a small dev client, a live suite that defaults to OpenCode Go for bulk testing with OpenRouter for production fidelity, a budget cap on every live run, and cassettes recorded from live runs and replayed free in CI.
- **66.** The coding practices and the `pnpm ci` gate above as the definition of done, with an 85% coverage floor on the core.

## Sources

- Nova's testing document, `docs/TESTING.md` in the Nova repository, read in full.
- [Cloudflare: testing with Durable Objects](https://developers.cloudflare.com/durable-objects/examples/testing-with-durable-objects)
- [Cloudflare changelog: Durable Object eviction test helpers](https://developers.cloudflare.com/changelog/post/2026-06-25-durable-object-eviction-test-helpers/)
- [fast-check with Vitest](https://fast-check.dev/docs/tutorials/setting-up-your-test-environment/property-based-testing-with-vitest/)
- [Jazzer.js to Vitiate migration guide](https://vitiate.js.org/guides/migrating-from-jazzerjs/)
