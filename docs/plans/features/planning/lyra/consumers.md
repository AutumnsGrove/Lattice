---
title: "Lyra consumers: who would actually use it"
status: planning
category: features
---

# Consumers

Last updated: 2026-11-15. Built from issues #1605 and #1684 and the decisions so far (49 to 55). Anything about other possible users is a guess, and says so.

## A correction

An earlier version of this document leaned on `libs/grove-agent` and the plan in `docs/plans/infra/planned/grove-agent-consumers.md`, and treated `GroveAgent` as the likely home for Lyra. Both are out of date (decision 55). `libs/grove-agent` pins `agents ^0.6.0` and was last touched in early September, and Cloudflare's own package has moved a long way since. Lyra is built from scratch, and that plan is not a source of truth for what will use it.

What is left here is what the live issues actually say, and what each one asks of the design.

## Who would use Lyra

| Consumer | What it would do | Source |
|---|---|---|
| **Timeline** | The daily development summary, built from tools (see `timeline-first-job.md`) | Decisions 4 and 49. The first job. |
| **HawkAgent** | Judge a new tenant's content at +24h and +7d, and propose a verdict with evidence | #1684. Second. |
| **Others** | Not known. A chat-style writing mode and the domain search have both come up over time, but nothing current says so. | Not decided. |

The old plan listed about 25 workers. Most of them (email sequences, metric collection, retries) never talk to a model in a loop, so they were never Lyra's. The list of real consumers will come from current issues, not from that plan.

## HawkAgent, and what it adds to the design

HawkAgent (#1684) scores each new tenant a day and a week after signup and flags likely link farms. The issue splits it into two layers. Layer 1 is plain SQL signals that ship first, with no agent. Layer 2 is a judgement of the content ("does this post exist to rank, or to say something?"), and that is the part that needs Lyra.

The issue is written in the vocabulary of the old plan: a `GroveAgent` class, `schedule()`, `this.sql`, `setState()`. Those names are stale. What it needs underneath is still real, and is listed here without them.

### What it adds to the design

1. **A session that lives for days.** One session per tenant, run at +24h and again at +7d, with its record carried between. Decision 44 (a session holds many runs) already fits this. The core needs nothing new: the host schedules the wake-ups, and each wake starts a new run in the same session.
2. **A different kind of "waiting for a person."** Approvals (decisions 34 to 37) pause a run before an action until someone says yes. HawkAgent works the other way: the run finishes, and its output is a proposal that a person dispositions later. The issue notes that several planned consumers work this way. This became the proposal type (decisions 50, 52, 53).
3. **A structured final result.** A proposal needs something typed (a verdict, a score, evidence), not only text.
4. **Tools over several databases.** HawkAgent reads two D1 databases and calls a service. That needs no new slot: tools are ordinary code written by the host, so they can use whatever bindings the host has. The Secrets slot is for keys, not bindings.
5. **Evidence that outlives the tenant.** The issue says removing a tenant deletes the evidence on purpose, and that a verdict record must survive, keyed on the normalized email identity. A run record holds real data (decision 29), including post content, so it belongs to the tenant and goes with it (decision 51). The lasting verdict is written by the app into its own table.

### Honest concerns

- **Layer 2 is thin as a test of the loop.** Reading a handful of posts and judging them could be one model call. A loop adds something only if it needs to dig (read more posts, check sibling accounts). The answer key tests the prompt and the judgement, and the harness around the call (the record, limits, parking), which has real value, but it is a different test from the timeline's.
- **The answer key may be smaller than it looks.** The issue says the evidence for three of the six abuse tenants was deleted, so their rows are gone and the figures come from another table. If their post text is gone too, layer 2 can only be replayed against three positives. Which three, and what survives of them, is worth checking.
- **The deterministic layer does most of the work.** The issue says layer 1 catches five of the six incidents. Lyra's contribution is cutting false positives and catching the patient operator. That is useful, and it is smaller than "the spike".

## Decided (2026-11-15)

- **First job (decision 49).** The timeline first, HawkAgent second. HawkAgent's needs shape the design now.
- **Retention (decision 51).** A run's record belongs to the tenant and is deleted with it. Anything that must outlive the tenant is written by the app into its own table.
- **Proposals (decisions 50, 52, 53).** The core has a proposal type: a typed payload, evidence references, and a state of open, accepted, or rejected. A person decides through a protocol command. The decision is saved as a new entry in the record and emitted as an event, and the app copies out whatever must last, such as HawkAgent's reviewer label. A proposal is not an approval: an approval pauses a run before an action, and a proposal is a finished run's result.
- **GroveAgent (decision 55).** Out of date, and not a basis for Lyra.

## Still open

- The exact command and event names for proposals (see `protocol.md`).
- The foundation of the Cloudflare adapter, now between Cloudflare's current agent tooling and plain Durable Objects. See `decisions.md`.
