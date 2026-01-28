# Workshop "What Is" Articles Plan

**Created**: January 28, 2026
**Status**: Planning
**Priority**: Medium — completes documentation coverage for workshop tools
**Estimated Effort**: 15-20 focused writing sessions
**Prerequisites**: None
**Related**: `docs/plans/planned/help-center-article-roadmap.md`

---

## Overview

The Workshop showcases **47 tools** across 8 categories. Currently, only **8 tools** have dedicated "What Is" articles. This plan outlines the creation of introductory articles for the remaining **39 tools** that lack them.

**Goal**: Every tool in the Workshop should have a corresponding "What Is" article that explains what it does, why it exists, and how Wanderers interact with it.

---

## Current Coverage

### Tools WITH "What Is" Articles (8 tools)

| Tool | Article | Category |
|------|---------|----------|
| Lattice | `what-is-lattice.md` | Core Infrastructure |
| Passage | `what-is-passage.md` | Core Infrastructure |
| Meadow | `what-is-meadow.md` | Content & Community |
| Scribe | `what-is-scribe.md` | Content & Community |
| Loom | `what-is-loom.md` | Patterns |
| Firefly | `what-is-firefly.md` | Patterns |
| Songbird | `what-is-songbird.md` | Patterns |
| Sentinel | `what-is-sentinel.md` | Patterns |

### Existing Concept Articles (not tools, but relevant)

| Article | Purpose |
|---------|---------|
| `what-is-grove.md` | General Grove introduction |
| `what-is-solarpunk.md` | Solarpunk philosophy explanation |
| `what-is-swarm.md` | Agentic swarm concept |
| `what-is-zdr.md` | Zero Data Retention policy |
| `what-are-vines.md` | Margin notes system |

---

## Tools WITHOUT "What Is" Articles (39 tools)

### Priority 1: Core Infrastructure & Services (9 articles)

These are the foundational tools Wanderers interact with most. Write first.

| Tool | Category | Status | Why Priority 1 |
|------|----------|--------|----------------|
| **Heartwood** | Core Infrastructure | Live | Central auth — users will ask "how do I sign in?" |
| **Clearing** | Core Services | Live | Status page — users check during outages |
| **Arbor** | Core Services | Live | Admin panel — every user interacts with this |
| **Flow** | Core Services | Live | The editor — users write here daily |
| **Plant** | Core Services | Live | Onboarding — first impression for new Wanderers |
| **Grafts** | Core Services | Live | Feature flags — explains why some features appear |
| **Waystone** | Support & Insights | Live | Help center — meta (help for the help system) |
| **Foliage** | Creative Studio | Complete | Theming — users want to customize immediately |
| **Shade** | Operations | Live | AI protection — users care about their content safety |

### Priority 2: Building Features (12 articles)

Features actively in development. Articles help build anticipation and explain what's coming.

| Tool | Category | Status | Notes |
|------|----------|--------|-------|
| **Amber** | Core Services | Building | Storage dashboard — users will need to understand quotas |
| **Centennial** | Core Services | Building | 100-year guarantee — unique, needs clear explanation |
| **Curios** | Creative Studio | Building | Cabinet of wonders — exciting feature, explain early |
| **Trails** | Content & Community | Building | Public roadmaps — popular concept |
| **Thorn** | Content & Community | Building | Content moderation — sensitive topic, transparency helps |
| **Petal** | Content & Community | Building | Image moderation — same as above |
| **Wisp** | Content & Community | Building | AI writing assistant — users need to know it's opt-in |
| **Ivy** | Standalone Tools | Building | Email client — explain zero-knowledge approach |
| **Bloom** | Standalone Tools | Building | Remote AI coding — novel concept needs explanation |
| **Gossamer** | Standalone Tools | Building | ASCII effects — technical, explain what it enables |
| **Mycelium** | Operations | Building | MCP server — explain AI integration possibilities |
| **Rings** | Support & Insights | Planned | Analytics — explain privacy-first approach early |

### Priority 3: Planned Features (11 articles)

Not yet built, but articles establish vision and generate interest.

| Tool | Category | Status | Notes |
|------|----------|--------|-------|
| **Burrow** | Core Services | Planned | Cross-property access — complex concept |
| **Terrarium** | Creative Studio | Planned | Creative canvas — explain the vision |
| **Weave** | Creative Studio | Planned | Node-graph editor — explain Breeze/Trace modes |
| **Porch** | Support & Insights | Planned | Support system — explain conversation approach |
| **Reeds** | Content & Community | Planned | Comments — explain private vs public replies |
| **Forests** | Content & Community | Planned | Community groves — explain aggregator concept |
| **Wander** | Content & Community | Planned | Immersive discovery — ambitious, explain vision |
| **Nook** | Standalone Tools | Planned | Private video — explain intimate sharing concept |
| **Etch** | Standalone Tools | Planned | Link saving — explain plates/grooves/scoring |
| **Vista** | Operations | Planned | Observability — operator-focused, lower priority |

### Priority 4: Patterns & Internal Tools (7 articles)

Technical patterns and internal tools. Useful for curious Wanderers and developers.

| Tool | Category | Status | Notes |
|------|----------|--------|-------|
| **Prism** | Patterns | Live | Design system — explain glassmorphism, seasons |
| **Threshold** | Patterns | Live | Rate limiting — explain protection approach |
| **Vineyard** | Patterns | Being implemented | Tool showcase pattern — explain /vineyard URLs |
| **Patina** | Operations | Live | Backups — explain data safety |
| **Press** | Operations | Live | Image processing — developer-focused |
| **Lumen** | Operations | Live | AI gateway — explain unified AI routing |
| **Forage** | Standalone Tools | Live | Domain discovery — explain AI-powered search |
| **Outpost** | Standalone Tools | Live | Minecraft server — explain Firefly pattern usage |

---

## Article Template

Each "What Is" article should follow this structure:

```markdown
---
title: "What is [Tool Name]?"
description: "[One-sentence description for SEO]"
section: "how-it-works"
order: [number]
---

# What is [Tool Name]?

[Opening paragraph: warm introduction explaining what the tool does in plain language. Use Grove voice — like explaining to a friend over tea.]

## Why [Tool Name] exists

[1-2 paragraphs explaining the problem it solves and why Grove built it this way.]

## How it works

[2-3 paragraphs explaining the mechanics. Be concrete but not overly technical. Use analogies where helpful.]

## What this means for you

[1-2 paragraphs from the Wanderer's perspective. What do they get? What do they need to do (or not do)?]

## Related

- [Link to spec if exists]
- [Link to related articles]
- [Link to workshop page section]
```

### Voice Guidelines

- **Warm, not corporate** — "Your words are yours" not "Content ownership is guaranteed"
- **Concrete, not abstract** — "Press a button and your theme changes" not "Seamless customization flows"
- **Honest about status** — If it's planned, say so. Don't oversell.
- **Grove terminology** — Wanderers (not users), Rooted (not subscribers), etc.

---

## Implementation Approach

### Phase 1: Priority 1 Articles (9 articles)

Write the core infrastructure and services articles first. These cover the tools Wanderers use daily.

**Suggested order:**
1. `what-is-arbor.md` — Admin panel, entry point for all actions
2. `what-is-flow.md` — Editor, where writing happens
3. `what-is-heartwood.md` — Auth, explains sign-in
4. `what-is-foliage.md` — Theming, immediate customization need
5. `what-is-clearing.md` — Status page, reference during issues
6. `what-is-plant.md` — Onboarding, new user reference
7. `what-is-waystone.md` — Help system, meta documentation
8. `what-is-shade.md` — AI protection, content safety
9. `what-is-grafts.md` — Feature flags, explains feature availability

### Phase 2: Priority 2 Articles (12 articles)

Write building features to establish expectations and build anticipation.

**Suggested order:**
1. `what-is-wisp.md` — AI assistant (high interest topic)
2. `what-is-curios.md` — Cabinet of wonders (unique, exciting)
3. `what-is-amber.md` — Storage (practical need)
4. `what-is-ivy.md` — Email (unique privacy approach)
5. `what-is-centennial.md` — 100-year guarantee (unique to Grove)
6. `what-is-thorn.md` — Content moderation (transparency)
7. `what-is-petal.md` — Image moderation (transparency)
8. `what-is-trails.md` — Roadmaps (build-in-public feature)
9. `what-is-bloom.md` — Remote coding (novel concept)
10. `what-is-rings.md` — Analytics (privacy-first)
11. `what-is-gossamer.md` — ASCII effects (creative tool)
12. `what-is-mycelium.md` — MCP server (AI integration)

### Phase 3: Priority 3 & 4 Articles (18 articles)

Fill in planned features and technical patterns as bandwidth allows.

---

## File Locations

All articles go in: `docs/help-center/articles/`

After creating each article:
1. Article is auto-discovered by `docs-scanner.ts` via frontmatter
2. Appears in knowledge base under the `how-it-works` section
3. Link from Workshop page using `whatIsLink` property

---

## Workshop Integration

When an article is created, update the corresponding tool in `packages/landing/src/routes/workshop/+page.svelte`:

```typescript
{
  name: 'ToolName',
  // ... other properties
  whatIsLink: '/knowledge/help/what-is-toolname'  // ADD THIS
}
```

---

## Success Metrics

- **Phase 1 complete**: 9 core articles written, linked from Workshop
- **Phase 2 complete**: 21 total articles (all live/building tools covered)
- **Full coverage**: 47 tools, 47 "What Is" articles
- **Workshop links**: Every tool card shows "Read more" link

---

## Dependencies & Blockers

- **None** — Articles can be written independently
- **Optional**: Wait for spec completion on planned features for accuracy
- **Coordination**: Some articles may overlap with `help-center-article-roadmap.md` priorities

---

## Notes for the Agent

When writing these articles:

1. **Read the spec first** — Most tools have specs at `/knowledge/specs/[toolname]-spec`. Pull accurate details from there.

2. **Check the Workshop description** — The `description` field in `workshop/+page.svelte` has the canonical one-liner for each tool.

3. **Use Grove voice** — Invoke skill: `grove-documentation` before writing user-facing text.

4. **Keep it short** — Target 400-600 words. These are introductory explainers, not comprehensive guides.

5. **Link back** — Always include a link to the Workshop section and spec (if it exists).

6. **Update Workshop** — After writing each article, add the `whatIsLink` property to the tool in the Workshop page.

---

## Estimated Completion

- **Phase 1 (9 articles)**: 3-4 writing sessions
- **Phase 2 (12 articles)**: 4-5 writing sessions
- **Phase 3 (18 articles)**: 6-8 writing sessions

**Total**: 15-20 focused writing sessions for complete coverage

---

## Related Documents

- `docs/plans/planned/help-center-article-roadmap.md` — General help article priorities
- `docs/help-center/articles/` — Existing articles (use as templates)
- `packages/landing/src/routes/workshop/+page.svelte` — Workshop tool definitions
- `packages/landing/src/lib/server/docs-scanner.ts` — Auto-discovery system
