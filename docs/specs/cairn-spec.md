---
aliases: []
date created: Sunday, February 23rd 2026
date modified: Sunday, February 23rd 2026
tags:
  - tooling
  - documentation
  - developer-experience
  - search
  - agent-activity
type: tech-spec
title: Cairn — Documentation Browser & Agent Activity Viewer
description: Local dev server for browsing, searching, and exploring all project documentation and AI agent activity
category: specs
specCategory: developer-tools
icon: mountain
lastUpdated: "2026-02-23"
---

```
                           · · ·
                        ·       ·
                     ·           ·
                  ·       ···       ·
               ·       ·     ·       ·
            ·       ·           ·       ·
         ·  ┌─────────────────────────┐  ·
            │                         │
            │  📄 specs  📋 plans      │
            │  🦢 skills 🤖 sessions   │
            │  🏛️ museum 🔍 search     │
            │                         │
            ·  ─ ─ ─ cairn ─ ─ ─     ·
         ·  └─────────────────────────┘  ·
            ·       ·           ·       ·
               ·       ·     ·       ·
                  ·       ···       ·
                     ·           ·
                        ·       ·
                           · · ·

              every stone: a session, a spec, a path taken
```

> *Follow the cairns. Find your way.*

# Cairn: Documentation Browser & Agent Activity Viewer

> *Follow the cairns. Find your way.*

A local dev server you start with `bun run cairn`. It indexes every markdown file, every spec, every plan, every safari journal, every skill definition, and every AI agent session across the project. It renders them beautifully, makes them searchable, and gives you a single place to browse the entire knowledge system of the Grove.

**Public Name:** Cairn
**Internal Name:** GroveCairn
**Package:** `tools/cairn/`
**CLI:** `bun run cairn` (monorepo script) or `bun run tools/cairn/server.ts`
**Last Updated:** February 2026

A cairn is a stack of stones built by travelers to mark a trail. Each person who passes through a place adds a stone — slowly, over time, the pile grows. When you're uncertain where to go next, you look for cairns. You follow the markers left by everyone who came before. The path becomes readable.

The project has 897 markdown files, 54 agent skills, and thousands of AI session artifacts spread across dozens of directories. Each one is a stone. A spec written, a session had, a plan made, a decision recorded. Cairn gathers them all into one place so you can follow the trail.

---

## Overview

### What This Is

A development-only local web server that aggregates, indexes, and renders the entire documentation and agent activity landscape of the Lattice project. It parses frontmatter, builds a search index, and provides a warm, browseable interface for exploring specs, plans, help articles, safari journals, museum exhibits, skill definitions, and AI agent session histories.

### Goals

- **One command to browse everything.** `bun run cairn` opens a local server with the full documentation landscape.
- **Full-text search with frontmatter awareness.** Search by title, tag, category, keyword, or free text across all 897+ documents.
- **Agent activity dashboard.** Browse Crush sessions, Claude Code conversations, and cross-agent file touchpoints.
- **Zero build step.** Markdown is read and rendered on the fly. No static site generation. No compilation. Just start and browse.
- **Grove-warm interface.** Glassmorphism, nature colors, midnight tea shop vibes. This is your reading room.

### Non-Goals (Out of Scope)

- Production deployment. This is a local dev tool only.
- Editing capabilities. Read-only. Use your editor to change files.
- Real-time file watching in v1. Restart the server to pick up changes. (File watching can come later.)
- Exporting or publishing docs. This browses what exists, it doesn't build a static site.

---

## Architecture

```
bun run cairn
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            Cairn Server                                 │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   Indexer         │  │   Renderer       │  │   Agent Parser       │  │
│  │                   │  │                   │  │                      │  │
│  │  Walks dirs       │  │  Markdown → HTML  │  │  Crush SQLite        │  │
│  │  Parses YAML FM   │  │  Code highlighting│  │  Claude JSONL        │  │
│  │  Builds search    │  │  ASCII art blocks │  │  Session aggregation │  │
│  │  Extracts tags    │  │  Table rendering  │  │  File touchpoints    │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│           │                     │                        │              │
│           ▼                     ▼                        ▼              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        In-Memory Index                           │   │
│  │  Documents[], Tags[], Categories[], AgentSessions[]              │   │
│  └──────────────────────────────────────┬───────────────────────────┘   │
│                                         │                               │
│  ┌──────────────────────────────────────▼───────────────────────────┐   │
│  │                     HTTP Server (Bun.serve)                      │   │
│  │                                                                   │   │
│  │  GET /                    → Dashboard                             │   │
│  │  GET /docs/:path          → Document viewer                      │   │
│  │  GET /search?q=           → Search results                       │   │
│  │  GET /browse/:category    → Category browser                     │   │
│  │  GET /skills              → Skill ecosystem browser               │   │
│  │  GET /agents              → Agent activity dashboard              │   │
│  │  GET /agents/crush        → Crush session browser                 │   │
│  │  GET /agents/claude       → Claude session browser                │   │
│  │  GET /timeline            → Snapshot timeline                     │   │
│  │  GET /api/search?q=       → JSON search API                      │   │
│  │  GET /api/docs/:path      → Raw document JSON                    │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
    http://localhost:4321
```

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Runtime | Bun | Already available (v1.3.0), fast startup, native TypeScript, built-in HTTP server |
| Markdown | marked + marked-highlight | Lightweight, fast, supports GFM, code highlighting |
| Syntax Highlighting | shiki | Beautiful code blocks, Grove-appropriate themes |
| Search Index | MiniSearch | Lightweight full-text search, runs in-process, no external dependencies |
| SQLite Access | bun:sqlite | Bun's built-in SQLite driver for reading Crush DB |
| CSS | Inline/embedded | Single-file CSS, no build step, glassmorphism variables |
| Templating | Tagged template literals | No framework dependency. HTML strings with syntax highlighting. |

### Data Sources

```
Cairn reads from (all read-only):

  Project Root
  ├── docs/                          897 markdown files
  │   ├── specs/                     82 technical specifications
  │   ├── help-center/articles/      98 help articles
  │   ├── plans/                     165 plans (completed/planned/active/planning)
  │   ├── safaris/                   17 safari journals
  │   ├── museum/                    37 museum exhibits
  │   ├── security/                  21 security docs
  │   ├── philosophy/                69 naming + philosophy
  │   ├── design-system/             9 design standards
  │   ├── guides/                    13 developer guides
  │   ├── patterns/                  9 code patterns
  │   ├── marketing/                 20 brand + copy
  │   ├── templates/                 9 email/content templates
  │   ├── internal/                  17 internal docs
  │   ├── legal/                     6 terms + compliance
  │   ├── developer/                 19 API + architecture docs
  │   └── scratch/                   21 drafts
  ├── AgentUsage/                    27 agent workflow guides
  ├── snapshots/                     31 version snapshots
  ├── .claude/
  │   ├── skills/                    54 skills (123 files)
  │   └── agents/                    5 subagent definitions
  ├── .crush/crush.db                SQLite: 45 sessions, 4110 messages
  ├── AGENT.md, CLAUDE.md            Root instruction files
  └── ~/.claude/projects/            3,275 Claude session artifacts (JSONL)
```

---

## Content Model

### Document

Every indexed markdown file becomes a Document:

```typescript
interface Document {
  // Identity
  path: string;             // Relative path from project root
  slug: string;             // URL-safe path segment

  // Frontmatter (all optional, parsed from YAML)
  title?: string;
  description?: string;
  category?: string;
  specCategory?: string;
  section?: string;
  order?: number;
  tags?: string[];
  keywords?: string[];
  icon?: string;
  aliases?: string[];
  type?: string;
  lastUpdated?: string;
  dateCreated?: string;
  dateModified?: string;

  // Derived
  biome: string;            // Top-level grouping (specs, plans, museum, etc.)
  status?: string;          // For plans: derived from directory path
  content: string;          // Raw markdown body (after frontmatter)
  wordCount: number;
  headings: Heading[];      // Extracted h1-h4 for table of contents
}

interface Heading {
  level: number;
  text: string;
  id: string;              // Slugified for anchor links
}
```

### Skill

Claude skills have their own shape:

```typescript
interface Skill {
  name: string;            // Directory name (e.g., "swan-design")
  displayName: string;     // Extracted from SKILL.md title
  description: string;     // First paragraph or extracted summary
  skillFile: string;       // Path to SKILL.md
  references: string[];    // Paths to reference docs
  phases?: string[];       // Extracted phase names if present
  pairsWith?: string[];    // "Pair with:" extracted skills
}
```

### AgentSession (Crush)

```typescript
interface CrushSession {
  id: string;
  title: string;
  messageCount: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  createdAt: Date;
  updatedAt: Date;
  messages?: CrushMessage[];     // Loaded on demand
  filesTracked?: CrushFile[];   // Loaded on demand
}

interface CrushMessage {
  id: string;
  sessionId: string;
  role: string;
  parts: any[];           // JSON parsed
  model?: string;
  provider?: string;
  createdAt: Date;
}
```

### AgentSession (Claude Code)

Claude sessions are JSONL files. Each line is a JSON object with a type field:

```typescript
interface ClaudeSession {
  sessionId: string;
  project: string;          // Derived from directory name
  slug?: string;            // From JSONL metadata
  messageCount: number;
  toolCallCount: number;
  subagentCount: number;
  createdAt: Date;
  // Messages loaded on demand from JSONL
}
```

---

## Pages & Views

### Dashboard (GET /)

The landing page. Your reading room.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ✧ Cairn                                            [🔍 Search...    ] │
│  Follow the cairns. Find your way.                                      │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ Documentation ──────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  📐 82 Specs    📋 165 Plans    📖 98 Help Articles               │  │
│  │  🏛️ 37 Museum   🗺️ 17 Safaris   🔒 21 Security                   │  │
│  │  🌿 69 Philosophy   📚 13 Guides   🎨 9 Design System            │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Agent Activity ─────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  🤖 54 Skills   🦊 5 Agents   💬 45 Crush Sessions               │  │
│  │  📜 2,825 Claude Logs   📊 $XX.XX total Crush spend              │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Recently Updated ───────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  Feb 23  cairn-spec.md                   specs                    │  │
│  │  Feb 22  amber-sdk-spec.md               specs                    │  │
│  │  Feb 22  amber-spec.md                   specs                    │  │
│  │  Feb 21  blazes-spec.md                  specs                    │  │
│  │  Feb 20  login-safari-2026-02-20.md      safaris                  │  │
│  │  ...                                                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Document Viewer (GET /docs/:path)

Renders a single markdown document with:
- Parsed frontmatter displayed as a metadata header (title, tags, category, dates)
- Table of contents generated from headings
- Full markdown rendering with syntax-highlighted code blocks
- ASCII art preserved in monospace code blocks
- Navigation breadcrumbs from the file path
- "Edit in editor" link (opens the file path, e.g., `vscode://file/...`)

### Category Browser (GET /browse/:category)

Lists all documents in a biome/category with:
- Filterable tag sidebar
- Sort by: last updated, title, created date
- Card view showing title, description, tags, last updated
- For plans: kanban-like columns (planning → active → planned → completed)

### Search (GET /search?q=)

Full-text search across all indexed content:
- Searches title, description, tags, keywords, and body text
- Results grouped by biome/category
- Highlighted search term matches in context
- Faceted filtering by category, tag, date range

### Skill Browser (GET /skills)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ✧ The Animal Ecosystem                              [🔍 Filter...  ] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ Security Pack ──────────────────────────────────────────────────┐  │
│  │  🕷️ spider-weave     Auth integration, OAuth, route security     │  │
│  │  🦝 raccoon-audit     Security rummaging, secret scanning         │  │
│  │  🐢 turtle-harden     Layered defense, secure by design           │  │
│  │  🦅 hawk-survey       Comprehensive security auditor              │  │
│  │  🐦‍⬛ raven-investigate Cross-codebase security detective           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Build Pack ─────────────────────────────────────────────────────┐  │
│  │  🐘 elephant-build    Multi-file feature construction             │  │
│  │  🦫 beaver-build      Test dam construction                       │  │
│  │  🐛 mole-debug        Hypothesis-driven debugging                 │  │
│  │  🦊 fox-optimize      Performance hunting                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  [Click any skill → full SKILL.md rendered + references]               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Agent Dashboard (GET /agents)

Overview of all AI agent activity across the project:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ✧ Agent Activity                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ Crush (45 sessions) ────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  Total tokens: XXX,XXX prompt / XXX,XXX completion               │  │
│  │  Total cost: $XX.XX                                               │  │
│  │  Files touched: 377                                               │  │
│  │                                                                   │  │
│  │  Recent Sessions:                                                 │  │
│  │  Feb 19  "Guestbook styling and wall backings"    42 msgs  $1.23 │  │
│  │  Feb 17  "Fix deployment pipeline"                28 msgs  $0.87 │  │
│  │  Feb 15  "Loom SDK refactor"                      65 msgs  $2.14 │  │
│  │  ...                                                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Claude Code (2,825 session files) ──────────────────────────────┐  │
│  │                                                                   │  │
│  │  Projects: Lattice, GroveEngine, Seedling, Solarium              │  │
│  │  Session files by project: [bar chart or counts]                  │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Cross-Agent File Heatmap ───────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  Most-touched files across all agents:                            │  │
│  │  ████████████  src/routes/(site)/+layout.svelte  (47 touches)    │  │
│  │  █████████     src/lib/server/db.ts              (38 touches)    │  │
│  │  ████████      AGENT.md                          (34 touches)    │  │
│  │  ...                                                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Crush Session Viewer (GET /agents/crush/:sessionId)

Renders a single Crush session as a conversation thread:
- Messages displayed in chat-bubble format
- Tool calls and file operations highlighted
- Token usage per message
- Session metadata (model, provider, cost) in sidebar

### Timeline (GET /timeline)

Snapshot history as a visual timeline:
- Each snapshot rendered as a point on a timeline
- Click to expand and see the snapshot content
- Shows project version progression from v0.6.0 to present

---

## Indexing Strategy

### Startup Flow

```
Server starts
    │
    ├─→ Walk docs/ directory tree
    │     Parse YAML frontmatter
    │     Extract headings
    │     Count words
    │     Derive biome from path
    │     Derive status from path (for plans)
    │
    ├─→ Walk AgentUsage/, snapshots/
    │     Same parsing as docs/
    │
    ├─→ Walk .claude/skills/
    │     Parse each SKILL.md
    │     Catalog references/
    │
    ├─→ Walk .claude/agents/
    │     Parse agent definitions
    │
    ├─→ Read .crush/crush.db (read-only)
    │     Load session summaries
    │     (Messages loaded on demand)
    │
    ├─→ Scan ~/.claude/projects/ for Claude session metadata
    │     Parse JSONL headers for session info
    │     (Full content loaded on demand)
    │
    └─→ Build MiniSearch index
          Index: title, description, tags, keywords, body text
          Store: path, title, description, category, biome

    Ready. http://localhost:4321
```

### Search Configuration

MiniSearch fields and weights:

```typescript
const searchIndex = new MiniSearch({
  fields: ['title', 'description', 'tags', 'keywords', 'content'],
  storeFields: ['path', 'title', 'description', 'category', 'biome', 'icon', 'lastUpdated'],
  searchOptions: {
    boost: { title: 3, tags: 2, keywords: 2, description: 1.5 },
    fuzzy: 0.2,
    prefix: true,
  }
});
```

---

## Rendering

### Markdown Pipeline

```
Raw .md file
    │
    ▼
Extract YAML frontmatter (gray-matter or manual split on ---)
    │
    ▼
Parse markdown body (marked)
    │
    ▼
Highlight code blocks (shiki, theme: vitesse-dark or similar warm theme)
    │
    ▼
Preserve ASCII art (code blocks without language get monospace + no highlight)
    │
    ▼
Render tables (GFM tables → HTML tables with Grove styling)
    │
    ▼
Render checkboxes ([ ] → unchecked, [x] → checked, styled)
    │
    ▼
Generate heading IDs for anchor links
    │
    ▼
Wrap in page template with nav, TOC, metadata header
```

### Styling

The interface should feel like the Grove. Warm, quiet, readable.

```css
:root {
  /* Forest floor palette */
  --bg-deep: #0f1117;
  --bg-surface: rgba(255, 255, 255, 0.03);
  --bg-glass: rgba(255, 255, 255, 0.06);
  --border-subtle: rgba(255, 255, 255, 0.08);
  --text-primary: #e8e4df;
  --text-secondary: #a09888;
  --text-muted: #6b6158;
  --accent-warm: #d4a574;
  --accent-green: #7ab88c;
  --accent-blue: #7a9ec4;

  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.04);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-blur: 12px;

  /* Typography */
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
  --font-display: 'Fraunces', Georgia, serif;
}
```

---

## Security Considerations

- **Read-only.** Cairn never writes to any file or database. All access is read-only.
- **Local only.** Binds to `localhost` exclusively. Not exposed to network.
- **No auth.** It's a dev tool running locally. No authentication needed.
- **Crush DB.** Opened with `SQLITE_OPEN_READONLY` flag via bun:sqlite.
- **Claude JSONL.** Read from `~/.claude/projects/`. Contains conversation history. Display but do not expose over network.
- **No sensitive data indexing.** Skip `.env`, `secrets.json`, credentials files. The indexer should have an explicit deny list.

---

## Future: Lumen RAG Integration

The search index starts with MiniSearch (in-process, keyword-based). A future enhancement connects to Lumen for vector-backed semantic search:

```
User query: "how does auth work across properties"
    │
    ├─→ MiniSearch: keyword matches for "auth", "properties"
    │
    └─→ Lumen RAG: semantic search over embedded doc chunks
         Returns: burrow-spec.md, heartwood-spec.md, spider-weave skill

Combined results, ranked by relevance
```

This requires:
- Embedding all document chunks via Lumen's AI gateway
- Storing vectors (likely in a local SQLite with vector extension, or Vectorize)
- Hybrid scoring: keyword relevance + semantic similarity

Out of scope for v1. The architecture supports it by exposing `/api/search` as the entry point.

---

## Project Structure

```
tools/cairn/
├── server.ts              Main entry point (Bun.serve)
├── index.ts               Document indexer and search builder
├── render.ts              Markdown → HTML renderer
├── agents.ts              Crush + Claude session parsers
├── pages/
│   ├── dashboard.ts       Dashboard page
│   ├── document.ts        Document viewer
│   ├── browse.ts          Category browser
│   ├── search.ts          Search results page
│   ├── skills.ts          Skill ecosystem browser
│   ├── agents.ts          Agent activity dashboard
│   └── timeline.ts        Snapshot timeline
├── style.css              Embedded stylesheet
├── package.json           Dependencies (marked, shiki, minisearch, gray-matter)
└── README.md              Setup instructions
```

---

## Implementation Checklist

### Phase 1: Foundation (Core Server + Indexing)

- [ ] Initialize `tools/cairn/` with `bun init`
- [ ] Install dependencies: marked, shiki, minisearch, gray-matter
- [ ] Implement directory walker that finds all .md files
- [ ] Implement YAML frontmatter parser
- [ ] Build document model with biome/status derivation from paths
- [ ] Build MiniSearch index at startup
- [ ] Create Bun.serve HTTP server with routing
- [ ] Add `"cairn": "bun run tools/cairn/server.ts"` to root package.json

### Phase 2: Rendering (Markdown → Beautiful HTML)

- [ ] Implement markdown rendering pipeline with marked
- [ ] Add shiki syntax highlighting for code blocks
- [ ] Handle ASCII art blocks (no language tag → monospace, no highlighting)
- [ ] Render GFM tables with Grove styling
- [ ] Render checkboxes with styling
- [ ] Generate heading IDs and table of contents
- [ ] Build page template with navigation, breadcrumbs, metadata header
- [ ] Implement Grove-warm CSS (glassmorphism, forest palette, typography)

### Phase 3: Pages (Dashboard + Browse + Search)

- [ ] Dashboard page with counts, category links, recently updated
- [ ] Document viewer page with TOC sidebar and metadata
- [ ] Category browser with tag filtering and sort options
- [ ] Search page with highlighted results and faceted filtering
- [ ] Skill ecosystem browser with pack grouping
- [ ] Timeline page from snapshots

### Phase 4: Agent Activity

- [ ] Crush SQLite reader (read-only, session summaries)
- [ ] Crush session viewer (load messages on demand)
- [ ] Claude JSONL scanner (parse session metadata from file headers)
- [ ] Claude session viewer (stream JSONL and render conversation)
- [ ] Agent dashboard with cross-agent file heatmap
- [ ] Cost/token aggregation from Crush data

### Phase 5: Polish

- [ ] Keyboard shortcuts (/ to focus search, j/k to navigate results)
- [ ] Responsive layout for different screen sizes
- [ ] Dark/light mode toggle (default dark)
- [ ] "Edit in editor" links on documents
- [ ] Favicon and tab title reflecting current page
- [ ] Performance: lazy-load agent sessions, paginate large result sets

### Future (Post-v1)

- [ ] File watching for automatic re-indexing on changes
- [ ] Lumen RAG integration for semantic search
- [ ] Document relationship graph (specs that reference each other)
- [ ] Agent activity timeline (overlay AI sessions on git commit history)
- [ ] Bookmark/favorites system (stored in local JSON)

---

*Every session, every spec, every decision — another stone on the pile. The trail is long. The cairns are clear. Follow them home.*
