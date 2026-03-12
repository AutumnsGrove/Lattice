---
title: "Developer Guide Hit List"
description: "Rolling inventory of what has dev docs and what doesn't in the Grove ecosystem."
category: guides
guideCategory: reference
lastUpdated: "2026-03-12"
aliases: []
tags:
  - documentation
  - inventory
  - meta
---

# Developer Guide Hit List

A rolling inventory of what has dev docs and what doesn't. Specs describe *what* something is. Guides describe *how to work with it*: how to add things, how it breaks, how to debug it.

The waystone guide (`waystone-developer-guide.md`) is the template. Every guide should answer: "How do I add/modify X?", "How does X work under the hood?", and "What breaks and why?"

Last updated: 2026-03-12 (Priority 1 + Priority 2 complete)

---

## Status Key

- **HAS GUIDE** — dev guide exists in `docs/guides/`
- **HAS SPEC ONLY** — spec exists but no practical dev guide
- **NO DOCS** — neither spec nor guide
- **N/A** — planned/not-yet-built, guide would be premature

Priority is based on: how live it is, how many moving parts it has, and how likely someone is to need to modify it without tribal knowledge.

---

## Priority 1 — Live systems with hidden gotchas

These are live, actively modified, and have non-obvious registration steps or failure modes. The kind of thing where you'll waste an hour if you don't know the trick.

| System | Location | Spec | Guide | What a guide would cover |
|--------|----------|:----:|:-----:|--------------------------|
| Waystone | `libs/engine/.../waystone/` | yes | **HAS GUIDE** | Allowlist, CORS, prerender architecture |
| Grafts | `libs/engine/src/lib/grafts/` | yes | **HAS GUIDE** (`adding-grafts-and-flags.md`) | Feature flags, greenhouse, migrations |
| Heartwood | `apps/login/`, GroveAuth repo | yes | **HAS GUIDE** (`heartwood-developer-guide.md`) | PKCE flow, session validation, adding auth to new apps |
| Loom | `libs/engine/src/lib/loom/` | yes | **HAS GUIDE** (`loom-developer-guide.md`) | Adding a new DO, LoomDO base class, worker bindings, deploy pipeline |
| Thorn | `libs/engine/src/lib/thorn/` | yes | **HAS GUIDE** (`thorn-developer-guide.md`) | Two-layer architecture, adding behavioral rules, entity labels, feature flags |
| Lumen | `libs/engine/src/lib/lumen/` | yes | **HAS GUIDE** (`lumen-developer-guide.md`) | Adding a new AI task, provider routing, tool-calling, fallback chain |
| Threshold | `libs/engine/src/lib/threshold/` | yes | **HAS GUIDE** (`threshold-developer-guide.md`) | Adding rate limits to new endpoints, tier-based limits, KV keys |
| Prism | `libs/prism/` | yes | **HAS GUIDE** (`prism-developer-guide.md`) | Adding tokens, CSS layer system, Tailwind preset, how all 8 apps consume it |
| Zephyr | `libs/engine/src/lib/zephyr/` | yes | **HAS GUIDE** (`zephyr-developer-guide.md`) | Adding email templates, send pipeline, retry logic |

## Priority 2 — Live systems that are complex but less frequently modified

| System | Location | Spec | Guide | What a guide would cover |
|--------|----------|:----:|:-----:|--------------------------|
| Passage | `services/grove-router/` | yes | **HAS GUIDE** | Subdomain routing, tenant resolution, adding service routes |
| Foliage | `libs/foliage/` | yes | **HAS GUIDE** | Theme structure, adding themes, tier validation, Prism integration |
| Flow | `libs/engine/.../admin/` | yes | **HAS GUIDE** | Editor modes, Fireside integration, localStorage drafts, zen mode |
| Arbor | engine routes | yes | **HAS GUIDE** | ArborPanel shell, GlassCard patterns, adding sections, nav config |
| Lantern | `libs/engine/.../lantern/` | yes | **HAS GUIDE** | Chrome lifecycle, cross-grove nav, friends system, FAB behavior |
| Blazes | `libs/engine/src/lib/blazes/` | yes | **HAS GUIDE** | Two-slot model, palette system, Lucide icon bridging, adding types |
| Shade | engine middleware | yes | **HAS GUIDE** | Nine-layer defense, Turnstile verification, cookie signing, bot rules |
| Reeds | comments system | yes | **HAS GUIDE** | Reply vs comment, moderation hooks, threading, rate limiting |
| Curios | `libs/engine/src/lib/curios/` | yes | **HAS GUIDE** | Module anatomy, config pattern, adding curios, import safety |
| Amber | `libs/engine/src/lib/amber/` | yes | **HAS GUIDE** | Four managers, upload flow, quota system, error catalog |
| Plant | `apps/plant/` | yes | **HAS GUIDE** | Onboarding state machine, Loam validation, payment handoff |
| Canopy | directory system | yes | **HAS GUIDE** | Opt-in visibility, categories, daily shuffle, client filtering |
| Reverie | `workers/reverie/` | yes | **HAS GUIDE** | Five-layer pipeline, domain schemas, atmospheres, Lumen tool-calling |
| Warden | `workers/warden/` | yes | **HAS GUIDE** | Dual auth, credential vault, scopes, adding services, audit logging |

## Priority 3 — Libraries and infrastructure

| System | Location | Spec | Guide | What a guide would cover |
|--------|----------|:----:|:-----:|--------------------------|
| Gossamer | `libs/gossamer/` | yes | **NEEDS GUIDE** | Adding presets, dual render paths, performance tuning |
| Vineyard | `libs/vineyard/` | yes | **NEEDS GUIDE** | Building showcase pages, component library conventions |
| Forage | separate repo | yes | **NEEDS GUIDE** | DeepSeek integration, search pipeline, domain validation |
| Vista | `apps/vista/` | yes | **NEEDS GUIDE** | Adding monitoring targets, collector setup, alert rules |
| Patina | separate repo | yes | **NEEDS GUIDE** | Backup scheduling, cold storage structure, recovery procedures |
| Press | separate repo | yes | **NEEDS GUIDE** | Image pipeline, WebP conversion, R2 upload, content hashing |
| Clearing | `apps/clearing/` | yes | **NEEDS GUIDE** | Incident creation, status page structure, component health |
| Infra SDK | `libs/infra/` | no | **NEEDS GUIDE** | GroveContext, middleware patterns, partial bindings, testing mocks |
| GroveAgent SDK | `libs/grove-agent/` | yes | **NEEDS GUIDE** | Base classes, groveConfig, callable decorator, error catalog |
| Porch | `apps/porch/` | yes | **NEEDS GUIDE** | Conversation model, support flow, tracking |
| Trace | inline feedback | yes | **NEEDS GUIDE** | Feedback collection, where to embed, analytics |

## Priority 4 — Greenhouse / Building (guide when they stabilize)

| System | Location | Spec | Guide | Status |
|--------|----------|:----:|:-----:|--------|
| Trails | engine routes | yes | N/A | greenhouse |
| Meadow | `apps/meadow/` | yes | N/A | greenhouse |
| Wisp | engine/wisp | yes | N/A | greenhouse |
| Scribe | engine/scribe | yes | N/A | greenhouse |
| Terrarium | planned app | yes | N/A | greenhouse |
| Ivy | `apps/ivy/` | yes | N/A | building |
| Chirp | chat DO | yes | N/A | building |
| Mycelium | MCP server | yes | partial (`grove-mcp-guide.md`) | building |
| Verge | separate repo | yes | N/A | building |
| Petal | image moderation | yes | N/A | greenhouse |
| Songbird | prompt injection | no | N/A | greenhouse |
| Firefly | ephemeral pattern | yes | N/A | greenhouse |
| Centennial | domain preservation | yes | N/A | building |
| Burrow | cross-property access | yes | N/A | planned |

## Priority 5 — Planned (no guide needed yet)

Forests, Wander, Nook, Etch, Moss, Weave, Rings (full version)

---

## Existing Guides

Developer guides in `docs/guides/`:

| Guide | Covers |
|-------|--------|
| `waystone-developer-guide.md` | Waystone system end-to-end |
| `loom-developer-guide.md` | Durable Objects SDK and deploy pipeline |
| `thorn-developer-guide.md` | Content moderation two-layer architecture |
| `lumen-developer-guide.md` | AI gateway, task routing, tool-calling |
| `prism-developer-guide.md` | Design tokens, CSS layers, Tailwind preset |
| `heartwood-developer-guide.md` | Auth system, PKCE flow, session validation |
| `zephyr-developer-guide.md` | Email gateway, templates, retry logic |
| `threshold-developer-guide.md` | Rate limiting, tier-based limits, KV tracking |
| `passage-developer-guide.md` | Subdomain routing, tenant resolution, service bindings |
| `foliage-developer-guide.md` | Theme system, tier gating, Prism integration |
| `flow-developer-guide.md` | Markdown editor, modes, drafts, Fireside AI |
| `arbor-developer-guide.md` | Admin panel shell, GlassCard, nav configuration |
| `lantern-developer-guide.md` | Cross-grove navigation, friends, chrome lifecycle |
| `blazes-developer-guide.md` | Content markers, two-slot model, icon resolution |
| `shade-developer-guide.md` | Content protection, nine layers, Turnstile |
| `reeds-developer-guide.md` | Comments, moderation, threading, rate limiting |
| `curios-developer-guide.md` | Widget modules, config pattern, adding curios |
| `amber-developer-guide.md` | Storage SDK, four managers, quota system |
| `plant-developer-guide.md` | Onboarding app, Loam validation, Stripe flow |
| `canopy-developer-guide.md` | Directory system, categories, daily shuffle |
| `reverie-developer-guide.md` | AI config pipeline, domains, atmospheres |
| `warden-developer-guide.md` | Credential gateway, auth paths, service abstraction |
| `adding-grafts-and-flags.md` | Graft/feature flag system |
| `grove-mcp-guide.md` | Mycelium MCP setup |
| `error-code-diagnostic-guide.md` | Signpost error codes |
| `aquifer-drizzle-guide.md` | Drizzle ORM setup |

Related docs that live elsewhere:

| Doc | Location | Covers |
|-----|----------|--------|
| `broadcast-guide.md` | `docs/playbooks/` | Broadcast email ops |
| `load-testing-guide.md` | `docs/playbooks/` | Sentinel load testing ops |
| `rate-limiting-guide.md` | `docs/playbooks/` | Threshold ops procedures |
| `customer-setup.md` | `docs/setup/` | Customer onboarding |
| `tenant-setup-guide.md` | `docs/setup/` | New tenant provisioning |
| `local-auth-testing.md` | `docs/setup/` | Local Heartwood auth setup |
| `agent-guide-new-grove-sites.md` | `AgentUsage/` | Agent workflow for new sites |
| `woodpecker-codeberg-setup.md` | `docs/plans/infra/` | Codeberg CI (future work) |
| `zephyr-migration-guide.md` | `docs/archive/` | Zephyr email migration (done) |

---

## What "done" looks like

A system has good dev docs when a developer who has never touched it can:

1. Understand the architecture in 5 minutes (not from the spec, from a practical overview)
2. Add a new [thing] without missing a hidden registration step
3. Debug a failure without reading source code first
4. Know which files to touch and which to leave alone

The waystone guide is the bar. Not every system needs one right now, but everything in Priority 1 and 2 does.

---

## How to use this list

1. Pick something from Priority 1 or 2
2. Read the spec and the code
3. Write the guide using the waystone guide as a template
4. Check it off here
5. Commit both the guide and this updated list
