---
title: Etch — Link Saving & Highlights
description: Externalized memory for the things that matter. Save links, highlight text, carve out what counts.
category: specs
specCategory: standalone-tools
icon: highlighter
lastUpdated: '2026-01-24'
aliases: []
tags:
  - link-saving
  - bookmarks
  - highlights
  - annotations
  - cloudflare-workers
  - externalized-memory
---

# Etch — Link Saving & Highlights

```
                    ·  ·  ·  ·  ·  ·  ·
                 ·                       ·
               /  ━━━━━━━━━━━━━━━━━━━━  \
              |   ░░▓▓░░░░░░▓▓▓░░░░░░   |
              |   ░░░░░░▓▓▓░░░░░▓▓░░░   |
              |   ░░▓▓▓▓░░░░░░░░░░░░░   |
               \  ━━━━━━━━━━━━━━━━━━━━  /
                 ·                       ·
                    ·  ·  ·  ·  ·  ·  ·
              ─────────────────────────────
                patient. permanent. yours.
```

> *Etch is where you carve out what matters.*

Your externalized memory. Save any link, highlight any text, take down your etchings.
The things you find on the internet that matter to you—articles, tools, videos,
thoughts, references—etched into your personal stone so they don't wash away.

**Domain:** `etch.grove.place`
**Internal name:** GroveEtch
**Type:** SvelteKit App / Cloudflare Workers / D1 / R2 / KV
**Status:** Spec only — not scheduled for development

---

> Water on stone. Patient, permanent, yours. You don't accidentally etch something.
> You press down. You carve. You mean it.

---

## The Metaphor

In nature, etching is how the forest remembers. Water drips on limestone for a
thousand years and carves a cave. A glacier scores parallel grooves into bedrock.
Frost traces delicate patterns on glass. Acid rain writes its history into marble.

Etching isn't violent. It's patient. It's intentional. And what it leaves behind
is permanent.

In printmaking, an etching is art made through deliberate marks. You score a
plate, ink fills the grooves, and what you carved becomes visible on paper.
Every mark was chosen. Nothing is accidental.

**Etch** is both of these things. The patience of water on stone. The
intentionality of a printmaker's hand. Your links and highlights are grooves
carved into your personal plate—permanent, findable, meaningful.

---

## The Etch Lexicon

| Term | Meaning |
|------|---------|
| **Etch** | The act of saving a link or highlighting text |
| **Etching** | A single saved item (link, highlight, annotation) |
| **Plate** | A collection of etchings, grouped by theme or project |
| **Groove** | A tag — the carved channel that gives an etching meaning |
| **Proof** | A shared/public view of a Plate (like pulling a print) |
| **Bite** | When the system processes a saved link — in printmaking, the acid "bites" the plate to form grooves |
| **Burnish** | To revisit and refine — editing tags, moving between Plates |
| **Impression** | The cached copy of a page — what remains when the original erodes |
| **Score** | To highlight text on a page — pressing the line into the surface |
| **Deep etch** | A permanent cached copy (Pro) — the full content preserved |

**Usage examples:**
- *"I etched that article from yesterday."*
- *"Check my DevTools plate — I scored some great highlights in there."*
- *"The original site is gone, but my impression still has everything."*
- *"I'll pull a proof of my reading list so you can see it."*

---

## Core Philosophy

### The Sweet Spot

Etch lives between two extremes:

| | MyMind | **Etch** | Raindrop |
|---|---|---|---|
| Saving | Fully automatic | Effortless | Manual |
| Tagging | AI does everything (50+ tags) | AI suggests, you confirm | You do it all |
| Organization | Hands-off | Intentional but assisted | Fully manual |
| Feel | "Where did I put that?" | "I etched that down." | "I filed that away." |

**Anything can go in. But YOU decide what it means.**

The system will suggest Grooves (tags) and Plates (collections) based on content.
But the Wanderer always has the final say. The intentionality is the point.
You're not dumping links into a void. You're etching them into stone.

### What Can Be Etched

Anything with a URL. Anything with text. The system doesn't care:
- Articles and blog posts
- Videos (YouTube, Vimeo, anything embeddable)
- Images and galleries
- PDFs and documents
- Tweets and social posts
- GitHub repos and issues
- Podcasts and audio
- Recipes, tools, references
- Plain text notes (no URL required)

If it matters to you, it belongs in your Etch.

---

## Features

### Core (All Wanderers)

#### Save Anything
- Browser extension: one click, one keyboard shortcut
- Mobile share sheet integration
- API endpoint for automation
- Manual entry (paste URL or write a note)
- Automatic metadata extraction: title, description, cover image, content type

#### Plates (Collections)
- Unlimited Plates
- Nested Plates (sub-collections)
- Custom icons per Plate
- An etching lives in one Plate (but can have many Grooves)
- Default Plates: **Unsorted** (inbox), **Starred** (favorites)

#### Grooves (Tags)
- Unlimited Grooves per etching
- Autocomplete from your existing Grooves
- Merge duplicate Grooves
- Grooves work across Plates (cross-cutting organization)

#### Views
- **List** — compact, scannable
- **Card** — thumbnails, descriptions
- **Board** — masonry/Pinterest-style for visual content
- **Timeline** — chronological, journal-like

#### Search
- Search by title, URL, description, Grooves
- Filter by Plate, content type, date range
- Recent searches remembered

#### Favorites
- Star any etching for quick access
- Starred items surface in a dedicated view

---

### Pro (Sapling+ Tier)

#### Scoring (Text Highlights)
The killer feature. When you save an article, you can **score** the text—
highlight the passages that matter, carve out the words you'll want to find again.

- Highlight text on any saved page
- Multiple highlight colors (mapped to meaning: important, question, follow-up, beautiful)
- Add margin notes to highlights
- Your scores are searchable
- Highlights persist even if the original page changes
- Export all highlights from an etching as markdown

*"I scored three passages from that essay. The one about memory is in yellow."*

#### Deep Etch (Permanent Cache)
The original site might die. The author might delete it. The paywall might go up.
But your deep etch remains — a complete cached copy of the content as it was
when you saved it.

- Full page content cached in R2
- Survives link rot, deletions, paywalls
- Rendered in a clean reader view
- Images and assets preserved
- Your scores persist on the cached copy

*"The blog shut down last year. But my impression still has every word."*

#### AI-Assisted Grooves
The system reads your etching and suggests Grooves. But gently:
- 2-4 suggestions, not 50
- Based on YOUR existing Groove vocabulary (learns your language)
- One-tap to accept or dismiss
- Never auto-applied — you always confirm
- Gets better over time as it learns your patterns

#### Reminders
- Set a reminder on any etching: "come back to this in 3 days"
- Notification via email (Ivy) or push
- Useful for read-later workflows, follow-ups, deadlines

*"Etch this into tomorrow."*

#### Smart Filters
- **Broken etchings** — detect dead links
- **Duplicates** — find etchings that point to the same content
- **Unread** — etchings you saved but never opened again
- **Fading** — etchings older than 6 months with no interaction

#### Full-Text Search
- Search the full content of every deep-etched page
- Not just metadata — the actual words on the page
- Works across all your etchings instantly

---

### Sharing & Collaboration

#### Proofs (Public Plates)
Make any Plate public. It becomes a **Proof** — a shareable collection
with its own URL. Useful for:
- Reading lists and resource collections
- Research bibliographies
- Curated link gardens
- "My favorite tools" pages

`etch.grove.place/@autumn/devtools` — Autumn's DevTools proof

**Copyright boundary:** Proofs display links, metadata, and your Scores
(highlighted text snippets) only. Deep Etch impressions (full cached pages)
are never served publicly — they're for personal reference only. If the
original URL is no longer accessible, the Proof shows the etching metadata
without the cached content.

#### Shared Plates (Collaborative)
Invite others to etch into a shared Plate:
- Permission levels: view / etch / manage
- Everyone's scores visible (with attribution)
- Great for research groups, book clubs, team resources

---

## Architecture

### Infrastructure

```
┌─────────────────────────────────────────────┐
│                  Wanderer                     │
│  (browser extension / mobile / web app)      │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│           etch.grove.place                   │
│         SvelteKit + Workers                  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌───────────┐   │
│  │   D1    │  │   R2    │  │    KV     │   │
│  │         │  │         │  │           │   │
│  │ etchings│  │ cached  │  │ URL dedup │   │
│  │ plates  │  │ pages   │  │ tag auto- │   │
│  │ grooves │  │ images  │  │ complete  │   │
│  │ scores  │  │ assets  │  │ metadata  │   │
│  │ users   │  │         │  │ cache     │   │
│  └─────────┘  └─────────┘  └───────────┘   │
│                                             │
└─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│          Grove Integrations                  │
│                                             │
│  Heartwood (auth) · Shutter (distillation)  │
│  Lumen (AI tags)  · Ivy (reminders)         │
│  Amber (storage)  · Rings (analytics)       │
└─────────────────────────────────────────────┘
```

### Data Model

```sql
-- Core tables
CREATE TABLE etchings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  plate_id TEXT REFERENCES plates(id) ON DELETE SET NULL,
  url TEXT,
  title TEXT,
  description TEXT,
  cover_image TEXT,
  content_type TEXT, -- article, video, image, document, note, audio
  starred INTEGER DEFAULT 0,
  read INTEGER DEFAULT 0,
  reminder_at DATETIME,
  deep_etched INTEGER DEFAULT 0,
  impression_key TEXT, -- R2 key for cached content
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  parent_id TEXT REFERENCES plates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  icon TEXT,
  is_public INTEGER DEFAULT 0, -- proof mode
  slug TEXT, -- for public URL
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE grooves (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE etching_grooves (
  etching_id TEXT NOT NULL REFERENCES etchings(id) ON DELETE CASCADE,
  groove_id TEXT NOT NULL REFERENCES grooves(id) ON DELETE CASCADE,
  PRIMARY KEY (etching_id, groove_id)
);

CREATE TABLE scores (
  id TEXT PRIMARY KEY,
  etching_id TEXT NOT NULL REFERENCES etchings(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  text TEXT NOT NULL, -- the highlighted text (canonical source of truth)
  note TEXT, -- margin annotation
  color TEXT DEFAULT 'yellow', -- yellow, blue, green, pink
  text_before TEXT, -- ~50 chars before highlight for text-anchor matching
  text_after TEXT, -- ~50 chars after highlight for text-anchor matching
  position_start INTEGER, -- character offset (fallback)
  position_end INTEGER,
  selector TEXT, -- CSS selector (sanitized, never trust raw input)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_etchings_tenant_plate ON etchings(tenant_id, plate_id);
CREATE INDEX idx_etchings_tenant_url ON etchings(tenant_id, url);
CREATE INDEX idx_etchings_starred ON etchings(tenant_id, starred) WHERE starred = 1;
CREATE INDEX idx_etchings_reminder ON etchings(reminder_at) WHERE reminder_at IS NOT NULL;
CREATE UNIQUE INDEX idx_grooves_tenant_name ON grooves(tenant_id, name);
CREATE INDEX idx_scores_etching ON scores(etching_id);
CREATE INDEX idx_plates_tenant ON plates(tenant_id);
```

### The Bite Process

When a Wanderer etches a link, the **bite** happens in the background:

1. **Fetch** — Shutter distills the page content (clean text, no noise)
2. **Extract** — Pull title, description, Open Graph image, content type
3. **Suggest** — Lumen analyzes content and suggests 2-4 Grooves
4. **Cache** — (Pro) Store full content + assets in R2 as a deep etch
5. **Index** — (Pro) Full-text index for search
6. **Detect** — Check for duplicates against existing etchings

The Wanderer sees the etching appear immediately with basic metadata.
The bite completes in the background, enriching it over the next few seconds.

---

## Integration with Grove Services

| Service | Integration |
|---------|-------------|
| **Heartwood** | Authentication — your etchings are tied to your Grove identity |
| **Shutter** | Content distillation — clean page extraction during the bite |
| **Lumen** | AI gateway — powers Groove suggestions and semantic search |
| **Ivy** | Email notifications for reminders |
| **Amber** | Storage accounting — deep etch cache counts toward storage quota |
| **Rings** | Private analytics — how your etch habits grow over time |
| **Meadow** | Share a Proof to your feed |
| **Mycelium** | MCP integration — AI agents can read/write your etchings |

---

## Pricing Alignment

Etch follows Grove's existing tier structure:

| Feature | Seedling | Sapling | Oak | Evergreen |
|---------|----------|---------|-----|-----------|
| Save links | Unlimited | Unlimited | Unlimited | Unlimited |
| Plates | Unlimited | Unlimited | Unlimited | Unlimited |
| Grooves | Unlimited | Unlimited | Unlimited | Unlimited |
| Views | All | All | All | All |
| Basic search | Yes | Yes | Yes | Yes |
| Scoring (highlights) | — | Yes | Yes | Yes |
| Deep etch (cache) | — | Yes | Yes | Yes |
| AI Groove suggestions | — | Yes | Yes | Yes |
| Full-text search | — | Yes | Yes | Yes |
| Reminders | — | Yes | Yes | Yes |
| Smart filters | — | Yes | Yes | Yes |
| Proofs (public plates) | — | Yes | Yes | Yes |
| Shared Plates | — | — | Yes | Yes |
| API access | — | — | Yes | Yes |
| Export (all formats) | — | — | Yes | Yes |
| Priority bite processing | — | — | — | Yes |

---

## Browser Extension

The extension is the primary entry point. It should feel instant and invisible:

1. **Quick etch** — Keyboard shortcut (Ctrl/Cmd+Shift+E) saves current page
   - Toast notification: "Etched." with Plate/Groove options
   - Dismisses in 3 seconds if you do nothing (goes to Unsorted)
   - Click to expand: choose Plate, add Grooves, star it

2. **Score mode** — Activate highlighting on any page
   - Select text → tooltip appears with color options
   - Add a margin note
   - All scores saved to the etching for this URL

3. **Right-click menu** — "Etch this link" / "Etch this image"

4. **Popup** — Quick access to recent etchings and search

---

## Mobile Experience

- Share sheet integration (iOS/Android): share any link to Etch
- Quick capture: "Etch it" button in share flow
- Full app for browsing, organizing, scoring
- Offline access to deep-etched content
- Push notifications for reminders

---

## Import & Export

### Import from:
- Raindrop.io (full collection/tag structure preserved)
- MyMind (tags mapped to Grooves)
- Pocket (RIP)
- Instapaper
- Browser bookmarks (Chrome, Firefox, Safari)
- Pinboard
- Notion databases
- CSV/JSON

### Export to:
- Markdown (with highlights/scores inline)
- HTML (bookmark file)
- JSON (full data)
- CSV
- Obsidian-compatible (highlights as block references)
- Notion

---

## Future Possibilities

Things that could grow from this foundation, but aren't part of v1:

- **Seasonal digest** — Weekly/monthly email of your etchings, surfacing forgotten gems
- **Groove graphs** — Visualize connections between your Grooves (knowledge graph)
- **Reading time** — Estimate and track reading progress
- **Etching chains** — Link related etchings together into a research trail
- **Collaborative scoring** — Book club mode where friends score the same article
- **RSS integration** — Auto-etch from feeds you follow
- **Etch from Meadow** — One-tap save posts from the community feed
- **Public profile** — Your etch.grove.place page showing your Proofs and stats

---

## Open Questions

Things to decide before building:

1. **Standalone app or integrated?** — Does Etch live at etch.grove.place as its own
   app, or is it a feature woven into every Grove blog's admin panel?

2. **Storage limits** — How many deep etch impressions before it counts against
   Amber storage? Or does Etch get its own R2 bucket and quota?

3. **Scoring re-anchoring strategy** — The schema stores three layers for
   relocating highlights on changed pages: (1) `text_before` + `text` +
   `text_after` for fuzzy text-anchor matching, (2) sanitized CSS `selector`
   for fast DOM lookup, (3) character offsets as last resort. The canonical
   `text` field is the source of truth — if the page changes beyond recognition,
   the Score survives as a standalone quote. Implementation must sanitize
   selectors (allowlist tag names, classes, IDs — never execute raw input).

4. **Mobile scoring** — Highlighting text on mobile is fiddly. Do we support it
   in v1 or focus on desktop for scoring?

5. **Shared Plate permissions** — Can collaborators see each other's scores?
   Or only their own? Is there a "discussion" mode?

6. **Offline-first?** — Should the extension/app work offline with sync?
   Adds complexity but matches the "yours forever" ethos.

---

## See Also

- **[Grove Naming System](/knowledge/philosophy/grove-naming)** — Etch's naming entry and ecosystem context
- **[Link-Saving Naming Journey](docs/scratch/link-saving-naming-journey.md)** — How we arrived at "Etch" (the walk documented)
- **[Shutter Spec](/knowledge/specs/shutter-spec)** — Web content distillation, powers the Bite process
- **[Lumen Spec](/knowledge/specs/lumen-spec)** — AI gateway, powers Groove suggestions
- **[Amber Spec](/knowledge/specs/amber-spec)** — Storage management, Deep Etch quota integration
- **[Ivy Mail Spec](/knowledge/specs/ivy-mail-spec)** — Email notifications for reminders

---

*Patient. Permanent. Yours.*
