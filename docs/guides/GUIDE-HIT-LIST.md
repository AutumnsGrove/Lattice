---
title: "Developer Guide Hit List"
description: "Rolling inventory of what has dev docs and what doesn't in the Grove ecosystem."
lastUpdated: "2026-03-12"
type: "reference"
---

# Developer Guide Hit List

A rolling inventory of what has dev docs and what doesn't. Specs describe *what* something is. Guides describe *how to work with it*: how to add things, how it breaks, how to debug it.

The waystone guide (`waystone-developer-guide.md`) is the template. Every guide should answer: "How do I add/modify X?", "How does X work under the hood?", and "What breaks and why?"

Last updated: 2026-03-12 (Priority 1 complete)

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
| Passage | router/wildcard system | yes | **NEEDS GUIDE** | Subdomain routing, how tenant resolution works, DNS/CF config |
| Foliage | `libs/foliage/` | yes | **NEEDS GUIDE** | Theme structure, adding a new theme, tier validation, Prism integration |
| Flow | `libs/engine/.../flow/` | yes | **NEEDS GUIDE** | Editor modes, Fireside integration, localStorage drafts, zen mode |
| Arbor | engine routes | yes | **NEEDS GUIDE** | Route structure, GlassCard patterns, page layout conventions |
| Lantern | `libs/engine/.../lantern/` | yes | **NEEDS GUIDE** | Chrome component lifecycle, cross-grove nav, how it loads on tenant sites |
| Blazes | `libs/engine/src/lib/blazes/` | yes | **NEEDS GUIDE** | Adding a new blaze type, palette system, Lucide icon bridging |
| Shade | engine middleware | yes | **NEEDS GUIDE** | Seven-layer defense, how each layer works, adding new bot rules |
| Reeds | comments system | yes | **NEEDS GUIDE** | Reply vs comment, moderation hooks, notification flow |
| Curios | `libs/engine/src/lib/curios/` | yes | **NEEDS GUIDE** | Adding a new curio type, directive system, curio rendering pipeline |
| Amber | `libs/engine/src/lib/amber/` | yes | **NEEDS GUIDE** | FileManager/QuotaManager/ExportManager, storage quota system |
| Plant | `apps/plant/` | yes | **NEEDS GUIDE** | Onboarding flow steps, Loam name validation, payment handoff |
| Canopy | directory system | yes | **NEEDS GUIDE** | Opt-in visibility, directory categories, search |
| Reverie | `workers/reverie/` | yes | **NEEDS GUIDE** | 5-layer pipeline, adding domains/schemas, auth pattern, Lumen tool-calling |
| Warden | `workers/warden/` | yes | **NEEDS GUIDE** | Adding new external API integrations, permission model, credential vault |

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

What we already have in `docs/guides/`:

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
| `adding-grafts-and-flags.md` | Graft/feature flag system |
| `local-auth-testing.md` | Local Heartwood auth setup |
| `rate-limiting-guide.md` | Threshold rate limiting |
| `zephyr-migration-guide.md` | Zephyr email migration |
| `grove-mcp-guide.md` | Mycelium MCP setup |
| `load-testing-guide.md` | Sentinel load testing |
| `tenant-setup-guide.md` | New tenant provisioning |
| `customer-setup.md` | Customer onboarding |
| `agent-guide-new-grove-sites.md` | Agent workflow for new sites |
| `broadcast-guide.md` | Broadcast email system |
| `error-code-diagnostic-guide.md` | Signpost error codes |
| `aquifer-drizzle-guide.md` | Drizzle ORM setup |
| `wildcard-consolidation-guide.md` | Wildcard DNS/routing |
| `woodpecker-codeberg-setup.md` | Codeberg CI setup |

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
