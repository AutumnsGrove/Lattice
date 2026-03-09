# Cairn 🏔️

> *Follow the cairns. Find your way.*

Cairn is a local documentation browser for the Lattice/Grove project. It indexes every spec, plan, safari, skill, agent session, and snapshot, then serves them as a searchable, browsable web app at `http://localhost:4321`.

## Quick Start

```bash
# From the project root:
bun run cairn
```

Then open **http://localhost:4321**.

On first start, Cairn indexes all documents and initializes the syntax highlighter in parallel. Expect ~3s startup for ~700 docs.

## What It Indexes

| Source | Location | Count (approx) |
|--------|----------|-----------------|
| Markdown docs | `docs/**/*.md` | ~700 |
| Skills | `docs/skills/**/*.md` | ~67 |
| Crush sessions | `~/.crush/crush.db` (SQLite) | ~45 |
| Claude sessions | `~/.claude/projects/…/*.jsonl` | ~77 |

## Routes

| Path | Description |
|------|-------------|
| `/` | Dashboard — stats, recent docs, Crush activity |
| `/search?q=` | Full-text search across all documents |
| `/browse/:biome` | Browse by category (specs, plans, safaris, …) |
| `/docs/:slug` | Render a single document |
| `/skills` | Skill ecosystem browser |
| `/skills/:name` | Skill detail view |
| `/agents` | Agent activity dashboard |
| `/agents/crush` | All Crush AI sessions |
| `/agents/crush/:id` | Crush session transcript |
| `/agents/claude` | All Claude sessions |
| `/agents/claude/:id` | Claude session transcript |
| `/timeline` | Snapshot timeline |
| `/api/stats` | JSON — index statistics |
| `/api/search?q=` | JSON — search results |
| `/api/docs/:slug` | JSON — document metadata |

## Architecture

```
tools/cairn/
├── server.ts          — Bun.serve HTTP server + router
├── index.ts           — Document indexer (gray-matter + MiniSearch)
├── render.ts          — Markdown → HTML (marked + shiki)
├── types.ts           — TypeScript interfaces
├── style.css          — Grove glassmorphism CSS (inlined at build time)
├── package.json       — Dependencies (marked, shiki, minisearch, gray-matter)
├── cairn.test.ts      — 36-test suite (bun test)
└── pages/
    ├── layout.ts      — Shared HTML shell (topbar, sidebar, skip link)
    ├── dashboard.ts   — Home page
    ├── document.ts    — Document viewer with ToC
    ├── browse.ts      — Category browser with tag filtering
    ├── search.ts      — Search results page
    ├── skills.ts      — Skill browser + detail
    ├── agents.ts      — Crush + Claude session pages
    └── timeline.ts    — Snapshot timeline
```

### Key Design Decisions

**No build step.** Bun runs TypeScript natively. CSS is read from disk at startup and inlined into every response — zero static file serving needed.

**Slug = relative path without extension.** `docs/specs/cairn-spec.md` becomes slug `docs/specs/cairn-spec`, URL `/docs/docs/specs/cairn-spec`. Slashes are preserved.

**Biome = first path segment after `docs/`.** `docs/specs/…` → biome `specs`. Special case: `docs/skills/` files use biome `skills`.

**Plan status from directory.** `docs/plans/active/foo.md` → status `active`; `docs/plans/planned/…` → `planned`; others → `draft`.

**YAML dates normalized.** gray-matter parses unquoted ISO dates as JavaScript `Date` objects. Cairn normalizes all date fields to `YYYY-MM-DD` strings at index time via `toDateStr()`.

**Syntax highlighting is the bottleneck.** Shiki loads 13 language grammars at startup (~2.5s). Only languages that actually appear in Grove docs are loaded. Unlabeled code blocks skip highlighting (rendered as `<pre class="ascii-art">`).

## Running Tests

```bash
cd tools/cairn
bun test
```

36 tests covering: index building, page rendering, helpers, security/XSS.

## Security Notes

- All URL-path-derived parameters (biome, skill name, session ID) are sanitized to `[a-z0-9-_]` at the server boundary before use.
- All template output passes through `escHtml()` — raw user data never reaches HTML unescaped.
- Cairn is a **read-only** local tool. It reads docs and databases but never writes.
- The Crush DB is opened in read-only mode (`{ readonly: true }`).
- Sensitive file patterns (`.env`, `.crush`, `*.pem`, `*.key`, `*.cert`) are excluded from indexing.

## Biomes

The sidebar shows all biomes with document counts:

| Biome | Icon | Description |
|-------|------|-------------|
| `specs` | 📐 | Technical specifications |
| `plans` | 📋 | Active, planned, and draft plans |
| `museum` | 🏛️ | Historical decisions and changelogs |
| `safaris` | 🗺️ | Exploration journals |
| `help-center` | 📖 | User-facing documentation |
| `security` | 🔒 | Security policies and notes |
| `philosophy` | 🌿 | Project philosophy |
| `guides` | 📚 | Developer guides |
| `patterns` | 🧩 | Code and design patterns |
| `design-system` | 🎨 | Design tokens and components |
| `developer` | ⚙️ | Developer tooling docs |
| `scratch` | ✏️ | Work in progress |
| `agent-usage` | 🗝️ | Agent workflow guides |
| `snapshots` | 📸 | Project state snapshots |
