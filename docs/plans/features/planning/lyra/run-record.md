---
title: "Lyra run record"
status: planning
category: features
---

# The record of a run

Last updated: 2026-11-14. Everything here is decided.

## What the record is

After every step, Lyra saves what happened to the Storage slot. That saved list does two jobs. It is the progress, so a run can resume where it stopped (decision 20). It is also the readable history of what Lyra did and why. It is one thing, not two.

## Decided

**The core only produces the record (decision 28).** It makes a clean, readable record. A viewer (an Arbor page, a file, or anything else) is built separately later, on top of it. This keeps the core small.

**The record holds the real data (decision 29).** Scrubbing happens only on the way to the model (decision 8). The record is private to the tenant and is never published. It never contains a provider key.

**A straight line now, with branches possible later (decision 30).** Nothing branches today, because stop, steer, resume, and follow-up are all linear. Every entry still carries its own id and the id of the entry before it. That is a straight line in practice and a tree in shape, so branches can be added later without changing the format.

## Decided: the shape (decision 31)

The record follows the shape of Nova's session file, so a Lyra record and a Nova session can be read by similar tools where they overlap. It is a header line, then one entry per line.

Every entry has four fields: `type`, `id`, `parent`, and `ts` (the time). The header has the record's version, the run id, the task name, the start time, and the host.

| Entry | What it holds | Written when |
|---|---|---|
| header | Record version, run id, task name, start time, host | At the start |
| message from the user | The job, or a steer or a follow-up (labeled which) | When it arrives |
| message from the assistant | The model's text and its tool requests, plus the model, tokens, cost and its source, finish reason, time taken, and retries | Right after the model replies, before any tool runs |
| message from a tool | The result: ok or error, what the model sees, and optional details for people | Right after the tool finishes |
| status | running, parked (with its reason), resumed, done, or failed | On every change |

Other entry kinds are allowed. A reader skips kinds it does not know. A half-written or damaged last line is skipped and noted, never fatal (Nova does the same).

The model's tool request is saved before the tool runs, and the result after. That is the "write down what is about to happen, do it, write down what happened" rule from decision 20. No separate entry is needed for it.

### How it is stored

On Cloudflare, one row per entry in the Durable Object's SQLite. On Node, a JSONL file, or memory for tests. It is the Storage slot's job. In every case the same record can be exported as plain JSONL lines.

## Decided: where progress lives (decision 32)

Some tools build something as the run goes. The timeline's tools build a page, and they hand out short handles (`c1`, `pr12`) that map back to real hashes. If the host loses the run partway, that half-built page and that handle map have to come back.

The record is the only place progress lives. On resume, Lyra replays the saved tool results to rebuild the half-built page and the handle map. There is no second copy to get out of step. Tools are written so that replaying their saved results rebuilds their state.

## Decided: the model's own reasoning (decision 33)

Some models return their reasoning text along with the answer. It is stored when the adapter provides it, marked as reasoning, so a viewer can show or hide it. It is the closest thing to "why". It can be large, and it is only kept when the model offers it.

## Not discussed yet

- **How much of a long run's record is sent to the model** when the record gets too large for the model's memory (trimming or summarizing). Separate topic.
- **How long a record is kept.** Settled in decision 51: records belong to the tenant.
- **A proposal entry** and a decision entry (decision 50). The record already allows new entry kinds.
- **The viewer.** Built later, on top.
