---
title: "Doc Server Safari — Mapping the Knowledge Continent"
description: "Expedition through the entire Lattice documentation landscape to design a local dev doc server"
category: safari
lastUpdated: "2026-02-23"
tags:
  - tooling
  - documentation
  - developer-experience
  - safari
---

# Doc Server Safari — Mapping the Knowledge Continent

> _The fire crackles. The map covered the entire hood of the jeep. 897 markdown files. 3,275 Claude session artifacts. A 28MB Crush database with 4,110 messages. This isn't a documentation problem — it's a civilization that needs a library._

**Territory:** All written knowledge across the Lattice project
**Goal:** Design a local `bun run` dev server that makes all of this searchable, browseable, and alive
**Date:** 2026-02-23

---

## Ecosystem Overview

**897 markdown files** across the project (excluding node_modules, dist, _archived)
**3,275 Claude session files** (JSONL logs, subagent transcripts, tool results)
**28MB Crush SQLite database** (45 sessions, 4,110 messages, 377 tracked files)
**54 Claude skills** with 123 markdown files
**5 custom subagent definitions**
**31 versioned snapshots** (v0.6.0 through present)

### Content by Biome

| Biome | Count | Condition | Frontmatter Quality |
|---|---|---|---|
| **docs/specs/** | 82 | 🟢 Thriving | Excellent — title, description, category, specCategory, icon, tags, aliases, lastUpdated |
| **docs/help-center/articles/** | 98 | 🟢 Thriving | Excellent — title, description, category, section, order, keywords, lastUpdated |
| **docs/plans/** (all states) | 165 | 🟡 Growing | Good — title, description, category but status tracking via directory path not frontmatter |
| **docs/safaris/** | 17 | 🟡 Growing | Good — title, description, category, tags |
| **docs/museum/** | 37 | 🟡 Growing | Moderate — varies by exhibit |
| **docs/security/** | 21 | 🟢 Thriving | Good — title, description, category, tags |
| **docs/philosophy/** | 69 (58 naming) | 🟠 Wild | Minimal — naming-research files may lack frontmatter |
| **docs/ (misc)** | ~120 | 🟡 Mixed | Varies — design-system, guides, patterns, marketing, templates, legal, developer, internal, scratch |
| **AgentUsage/** | 27 | 🟢 Thriving | Project-specific agent workflow docs |
| **.claude/skills/** | 123 files | 🟢 Thriving | Skill definitions with SKILL.md + references/ |
| **.claude/agents/** | 5 | 🟢 Thriving | Subagent definitions (grove-coder, grove-scout, grove-runner, grove-git, grove-verifier) |
| **snapshots/** | 31 | 🟡 Growing | Timestamped version snapshots |
| **Agent artifacts** | ~3,400+ | 🔴 Untamed | JSONL (Claude), SQLite (Crush), minimal (OpenCode) |

### Frontmatter Field Census

The most common frontmatter fields across all docs:

```
179  lastUpdated     — Nearly universal date tracking
174  title           — Document title
174  description     — Brief summary
168  category        — Primary category (specs, help, safari, etc.)
 99  section         — Help center sections (account-billing, etc.)
 99  order           — Help center ordering
 97  keywords        — Search keywords (help center)
 84  tags            — Array-based tags
 82  aliases         — Alternative names / cross-references
 71  icon            — Lucide icon name
 68  specCategory    — Spec sub-type (platform-services, ui-components, etc.)
 34  type            — Content type (tech-spec, etc.)
  9  slug            — URL-friendly identifier
```

### Agent Artifact Inventory

| Agent | Location | Format | Volume | Schema |
|---|---|---|---|---|
| **Claude Code** | `~/.claude/projects/` | JSONL | 2,825 files (sessions + subagents + tool-results) | Session logs with role, content, tool calls, timestamps |
| **Crush** | `.crush/crush.db` | SQLite (28MB) | 45 sessions, 4,110 messages, 377 files, 274 read_files | `sessions` → `messages` → `files` with tokens, cost, timestamps |
| **OpenCode** | `.git/opencode/` | Unknown | Minimal presence | TBD |

Crush's schema is particularly rich:
- `sessions`: id, title, message_count, prompt_tokens, completion_tokens, cost, timestamps, todos
- `messages`: id, session_id, role, parts (JSON), model, provider, timestamps
- `files`: id, session_id, path, content, version, timestamps
- `read_files`: session_id, path, read_at

### Existing Tooling

- **Package manager:** pnpm (workspace), bun available (v1.3.0)
- **Build tools:** Vite, SvelteKit (the engine is already a SvelteKit app)
- **No existing doc server tooling** — no vitepress, docusaurus, mdsvex, or similar
- **gf / gw:** Go binaries for codebase search and git operations
- **tools/glimpse:** Screenshot tool (Python/Playwright)

---

## Stop-by-Stop Observations

### Stop 1: docs/specs/ (82 files) 🟢

**Character:** The engineering heart. Every major Grove feature has a spec here with beautiful ASCII art headers, rich frontmatter, and detailed technical writing.

**Frontmatter:** Consistent — title, description, category, specCategory, icon, tags, aliases, lastUpdated. The `specCategory` field groups them: platform-services, ui-components, content-community, reference.

**For the doc server:** These are the crown jewels. Every spec should be browseable by specCategory, searchable by tags, and rendered with full markdown (including ASCII art preserved in code blocks).

### Stop 2: docs/help-center/articles/ (98 files) 🟢

**Character:** User-facing knowledge base. Already organized with `section` and `order` fields — this is basically a help center CMS in markdown.

**Frontmatter:** title, description, category, section, order, keywords, lastUpdated. The `keywords` arrays are rich — good for full-text search.

**For the doc server:** These have the most search-friendly metadata. The section/order system means they can be rendered as a proper help center sidebar.

### Stop 3: docs/plans/ (165 files) 🟡

**Character:** The project's living roadmap. Plans flow through a lifecycle: planning → active → completed (and sometimes planned as a holding state).

**Structure:** Status is encoded in directory path (features/completed/, infra/planned/) rather than frontmatter. Some have title/description frontmatter, others are lighter.

**For the doc server:** The lifecycle/status should be derived from path. A kanban-like view showing plans by status would be powerful.

### Stop 4: docs/safaris/ (17 files) 🟡

**Character:** Meta-documentation! Safari expedition journals documenting systematic reviews. Active safaris are in-progress, planned ones are queued.

**For the doc server:** These are narrative documents — render them beautifully with their checklists and tables.

### Stop 5: docs/museum/ (37 files) 🟡

**Character:** The Grove Museum — narrative-driven documentation organized by exhibit hall (architecture, community, data, nature, naming, personalization, trust). Has a MUSEUM.md layout plan and glossary.

**For the doc server:** These deserve their own "wing" with exhibit-hall navigation.

### Stop 6: docs/security/ (21 files) 🟢

**Character:** Security audits, threat models, policies. Critical reference material.

**For the doc server:** Needs to be easy to find but perhaps with access context (these are internal docs).

### Stop 7: docs/philosophy/ (69 files) 🟠

**Character:** 58 of these are naming-research files — the process behind naming every Grove feature. The remaining 11 are foundational philosophy docs.

**For the doc server:** The naming research could be fascinating to browse — a gallery of "how things got their names."

### Stop 8: docs/ (misc — ~120 files across 10+ subdirs)

- **design-system/** (9): Color palettes, component standards
- **guides/** (13): Developer setup, workflow guides
- **patterns/** (9): Code patterns and conventions
- **marketing/** (20): Copy, concepts, brand voice
- **templates/** (9): Email templates, etc.
- **internal/** (17): Business docs, internal notes
- **legal/** (6): Terms, privacy, compliance
- **developer/** (19): API docs, architecture decisions, database guides
- **scratch/** (21): Work-in-progress notes, drafts

**For the doc server:** Each of these is a section. Scratch docs could be flagged as "drafts."

### Stop 9: AgentUsage/ (27 files) 🟢

**Character:** The instruction manual for AI agents working on this project. Design context, workflow guides, pre-commit hook docs.

**For the doc server:** Critical for understanding how agents interact with the project.

### Stop 10: .claude/skills/ (54 skills, 123 files) 🟢

**Character:** The animal ecosystem! Each skill has a SKILL.md and optional references/ directory. Skills range from single-file to 6-file bundles.

**For the doc server:** A skill browser with the animal names, descriptions, and when-to-use guidance. The references/ docs add depth.

### Stop 11: .claude/agents/ (5 files) 🟢

**Character:** Custom subagent definitions — grove-coder, grove-scout, grove-runner, grove-git, grove-verifier.

**For the doc server:** Small but important — shows the agent architecture.

### Stop 12: snapshots/ (31 files) 🟡

**Character:** Point-in-time codebase snapshots with version numbers and timestamps.

**For the doc server:** A timeline view showing project evolution.

### Stop 13: Agent Artifacts (~3,400+ files) 🔴

**Character:** The wild frontier. Claude Code session logs in JSONL, Crush conversations in SQLite, traces of OpenCode. This is the raw activity log of every AI agent that has ever worked on this project.

**For the doc server:** THIS is the differentiator. No existing doc tool does this. Parsing Crush's SQLite for session summaries, token usage, file touchpoints. Parsing Claude's JSONL for conversation flow, tool calls, agent delegation patterns. A "mission control" view.

---

## Expedition Summary

### By the numbers

| Metric | Count |
|---|---|
| Total markdown files | 897 |
| Agent artifact files | ~3,400 |
| Crush sessions | 45 |
| Crush messages | 4,110 |
| Claude JSONL logs | 2,825 |
| Claude skills | 54 |
| Frontmatter coverage | ~60-70% of all .md files |
| Unique frontmatter fields | 15+ |

### Cross-cutting themes

1. **Frontmatter is strong but inconsistent.** Specs and help articles have excellent metadata. Plans and philosophy docs are lighter. A doc server should handle both gracefully.

2. **Status lives in directory paths.** Plans use `completed/`, `planned/`, `active/`, `planning/` directories. This is a first-class concept to surface.

3. **Three content eras exist:**
   - **Structured docs** (specs, help, design-system) — rich frontmatter, consistent format
   - **Narrative docs** (museum, safaris, philosophy) — story-driven, less structured
   - **Agent artifacts** (Claude, Crush) — machine-generated, needs parsing/aggregation

4. **The agent activity layer is unprecedented.** No existing doc tool handles this. Crush's SQLite is queryable. Claude's JSONL is parseable. This is the unique value proposition.

5. **No existing doc tooling.** Clean slate — we can build exactly what's needed.

6. **Bun is available** and the project already uses it for some scripts. A `bun run docs` command would feel natural.

### The Vision (for the spec)

A local dev server — `bun run docs` — that:

1. **Indexes all markdown** with frontmatter parsing, full-text search, category/tag filtering
2. **Renders docs beautifully** — code blocks, ASCII art, tables, checklists all preserved
3. **Surfaces agent activity** — Crush session browser, Claude conversation traces, file touchpoint maps
4. **Shows the roadmap** — plans by status, timeline view from snapshots
5. **Browses the skill ecosystem** — every animal, every reference doc
6. **Feels like Grove** — warm, nature-themed, glassmorphism, midnight tea shop energy
7. **Future: RAG search** — hook into Lumen for vector-backed semantic search

---

_The fire dies to embers. The journal is full — 13 biomes mapped, 897 documents catalogued, 3,400 agent artifacts discovered, the whole knowledge continent charted. Tomorrow, the Swan draws the spec. But tonight? Tonight was the drive. And it was glorious._ 🚙
