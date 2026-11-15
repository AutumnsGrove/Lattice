---
title: "Lyra consumers: who would actually use it"
status: planning
category: features
---

# Consumers

Last updated: 2026-11-15. Written from reading the plan in `docs/plans/infra/planned/grove-agent-consumers.md` and issues #1605 and #1684. The decisions this led to (49 to 51) are recorded below. The table of consumers is still a reading of mine, not a decision.

## Two different things

The existing consumers plan lists about 25 planned workers built on `GroveAgent` (the Cloudflare Agents SDK wrapper in `libs/grove-agent/`). `GroveAgent` is a Durable Object host: it gives a worker state, a SQL store, `schedule()`, `queue()`, and live updates.

Lyra is the loop that could run inside one. The two are different layers:

- **GroveAgent** says where a worker lives and when it wakes.
- **Lyra** says how a worker asks a model what to do, uses tools, and stops.

Most of the 25 never need Lyra. OnboardingAgent sends emails on a schedule, VistaAgent collects metrics, ZephyrAgent retries mail. None of those talk to a model in a loop.

## Which ones would use Lyra

My reading of the plan's own descriptions. A short guess, not a decision.

| Consumer | What it would do with Lyra | Fit |
|---|---|---|
| **TimelineAgent** (3.3) | The daily summary, built from tools (see `timeline-first-job.md`) | Strong. The first job. |
| **HawkAgent** (#1684, new) | Judge a new tenant's content at +24h and +7d, and propose a verdict with evidence | Strong, with caveats below |
| **FiresideAgent** (1.2) | A conversational writing mode that survives closing the tab, with an approval-gated draft tool | Good. This is the chat-style use, and needs sessions with many runs (decision 44) |
| **ForageWorkflow** (5.3) | The domain search | Possible. Today it is a fixed pipeline with parallel provider calls, so it may not need a loop (decision 2 left this to confirm) |
| **WispAgent** (6.2), **IvyAgent** (4.4) | Writing analysis, email triage | Unclear. These look like single classification calls |
| **PetalWorkflow** (4.2), **ThornAgent** (4.1) | Moderation pipelines | Probably not. Fixed steps, and a cascade of small models (#1601, #1624) is a different shape from a loop |

## HawkAgent, and what it changes

HawkAgent (#1684) scores each new tenant a day and a week after signup and flags likely link farms. The issue splits it into two layers. Layer 1 is plain SQL signals that ship first, with no agent. Layer 2 is a judgement of the content ("does this post exist to rank, or to say something?"), and that is the part that needs Lyra.

Its comment on #1605 proposes it as a possibly better first spike, because it has an answer key: six confirmed abuse tenants and fourteen legitimate ones.

### What it adds to the design

These are real new needs that the timeline does not have.

1. **A session that lives for days.** One session per tenant, run at +24h and again at +7d, with its record carried between. Decision 44 (a session holds many runs) already fits this. Nothing new is needed in the core for it: the host schedules the wake-ups (`GroveAgent.schedule()`), and each wake starts a new run in the same session. The core does not need to know about calendars.
2. **A different kind of "waiting for a person."** Approvals (decisions 34 to 37) pause a run before an action until someone says yes. HawkAgent works the other way: the run finishes, and its only output is a proposal with evidence, which a person dispositions later. The issue says this pattern is worth naming once, because several consumers work this way (Vista, Meadow, Pulse, Clearing). Both exist and they differ: an approval pauses a run, and a proposal is a finished run's result.
3. **A structured final result.** For a proposal, the run needs to end with something typed (a verdict, a score, evidence), rather than only text. The `finish` tool already ends a run, so it can carry a structured result that goes into the record.
4. **Tools over several databases.** HawkAgent reads two D1 databases and calls a service. That is fine without a new slot: tools are ordinary code written by the host, so they can use whatever bindings the host has. The Secrets slot is for keys, not for bindings.
5. **Evidence that outlives the tenant.** The issue says removing a tenant deletes the evidence, deliberately, and that a verdict record must survive, keyed on the normalized email identity. That meets our record retention question directly. A run record holds real data (decision 29), including post content, so it belongs to the tenant and goes when the tenant goes. The durable verdict (scores, signals, reviewer decision, no post content) is written by the app into its own table, not kept as the run's record.

### Honest concerns

- **Layer 2 is thin as a test of the loop.** Reading a handful of posts and judging them could be one model call. A loop adds something only if it needs to dig (read more posts, check sibling accounts). The answer key tests the prompt and the judgement, not the loop. It is a good test of the harness around the call (the record, limits, parking), which is real value, but it is a different test from the timeline's.
- **The answer key may be smaller than it looks.** The issue says the evidence for three of the six abuse tenants was deleted, so their rows are gone and the figures come from another table. If their post text is gone too, layer 2 can only be replayed against three positives. Which three, and what survives of them, is worth checking.
- **The deterministic layer does most of the work.** The issue says layer 1 catches five of the six incidents. Lyra's contribution is cutting false positives and catching the patient operator. That is useful, and it is smaller than "the spike".

## Cloudflare host: GroveAgent

The consumers plan makes `GroveAgent` the home of every consumer, so a Grove Cloudflare adapter built on it would give Lyra a SQL store (the Storage slot), `schedule()` (the Waking slot), `queue()`, and state for free. That would also answer the smaller question left open in `decisions.md` ("Cloudflare's agent tooling or plain Durable Objects"): use GroveAgent for the Grove adapter, and keep the core independent of it, as decision 12 already requires. A project outside Grove would use a different adapter.

## Decided (2026-11-15)

- **First job (decision 49).** The timeline first, HawkAgent second. HawkAgent's needs shape the design now.
- **Retention (decision 51).** A run's record belongs to the tenant and is deleted with it. Anything that must outlive the tenant is written by the app into its own table.
- **Proposals (decision 50).** The core has a proposal type. This goes further than the point above about a structured final result: the core itself knows a run can end with a proposal that has a review state. I had suggested keeping that in the app. The reasoning for the core is that several planned consumers work this way, so it is shared.
- **Cloudflare host.** Left open on purpose, until the repository is scoped.

## Open details for the proposal type

1. **What a proposal holds.** A typed payload (for HawkAgent, a score and a verdict) and its evidence (references to what supports it). Free text alone would not be enough to review quickly.
2. **How a person decides.** A command in the protocol (accept or reject, with an optional note), which is saved as a new entry in the record, since the record is append-only.
3. **How the decision reaches the app.** This is the tension with decision 51. HawkAgent wants the reviewer's decision to outlive the tenant, as a label that grows its answer key. But the decision is saved in a record that is deleted with the tenant. So the core has to tell the app when a decision is made (an event or a hook), and the app copies it into its own table. The core cannot make the decision outlive the record itself.
4. **What it is not.** It is not an approval. An approval pauses a run before an action. A proposal is a finished run's result.
