---
title: "Curio: Blogroll"
status: planned
category: features
---

# Curio: Blogroll

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 6

---

**Character**: A declaration of taste. Your blogroll is your neighborhood — the corners of the internet you vouch for, the voices you return to, the people whose words changed how you think. Not a link list. A recommendation wall. A map of where you live online.

**Indie web heritage**: Blogrolls were THE original content discovery mechanism, the social graph before social media existed. They're making a massive comeback. XFN (XHTML Friends Network) microformats, 88×31 buttons, OPML interchange — this curio speaks the language of the indie web natively.

### Safari findings: What exists today

**Public component** (`CurioBlogroll.svelte`, 193 lines):

- [x] Fetches from `/api/curios/blogroll`, renders vertical list
- [x] Favicon fetch via Google S2 API (16x16)
- [x] Hover arrow reveal animation
- [x] Dark mode support (`:global(.dark)`)
- [x] Accessible link list with `role="region"` and `aria-label`
- [x] Loading skeleton (4 placeholder items)
- [x] Error state handling
- [ ] **Hardcoded `rgba(0,0,0,0.04)` backgrounds** — the familiar gray nothingness
- [ ] **Only ONE display style** — flat vertical list, no personality
- [ ] **Doesn't render `lastPostTitle`** — API sends it, component ignores it
- [ ] **Doesn't render `lastPostUrl`/`lastPostDate`** — same, ignored
- [ ] **Descriptions truncated to 80 chars** but rendered — decent
- [ ] **Favicon fallback is an empty gray square** — no warmth when S2 fails
- [ ] **No personal notes** — just title + description + arrow
- [ ] **No categories/grouping** — flat list only
- [ ] **Duplicated `.sr-only`** — defines its own instead of shared utility

**Shared lib** (`src/lib/curios/blogroll/index.ts`, 183 lines):

- Types: `BlogrollItemRecord`, `BlogrollItemDisplay`
- Fields per item: url, title, description, feedUrl, faviconUrl, lastPostTitle/Url/Date, lastFeedCheck, sortOrder
- Constants: 100 char titles, 300 char descriptions, 2048 char URLs, 500 items/tenant
- Utilities: ID generation (`br_` prefix), URL validation, HTML stripping, favicon URL builder (Google S2), relative date formatting
- Public transform: strips tenantId, feedUrl, lastFeedCheck, sortOrder

**Admin** (`/arbor/curios/blogroll/`, ~197 lines):

- [x] Add blog form: title (required), URL (required), description (optional), feed URL (optional)
- [x] Blog list with favicon, title, description, latest post display
- [x] Delete per blog with toast feedback
- [x] GlassCard/GlassButton engine components
- [x] Empty state with RSS icon
- [x] Warm subtitle: "The blogs you love, the voices you return to."
- [ ] **No edit form** — PATCH endpoint exists but no UI
- [ ] **No reorder UI** — sort_order exists but no drag-and-drop
- [ ] **No display style picker** — only one style exists
- [ ] **No category management**
- [ ] **No personal note field**
- [ ] **Uses lucide-svelte directly** (Rss, Plus, Trash2, ExternalLink)

**API** (2 route files):

- `GET /api/curios/blogroll` — public, 120s cache + 240s stale-while-revalidate
- `POST /api/curios/blogroll` — add blog (admin), auto-favicon, sort_order increment
- `PATCH/DELETE /api/curios/blogroll/[id]` — update/delete (admin)

**Database** (migration 068):

- `blogroll_items` table with full RSS field set (feed_url, last_post_title/url/date, last_feed_check)
- Cascade delete from tenants
- Index on tenant_id

---

### Design spec (safari-approved, Anyon-consulted)

#### Philosophy: Your neighborhood, your way

A blogroll is a declaration of taste. The way you present your recommendations says as much as the recommendations themselves. Each display style attracts a different kind of person — the cozy reader, the indie web purist, the nature lover, the minimalist. The owner picks the style that matches their relationship with recommendations.

#### 7 display styles (each a fully realized personality)

| Style              | Visual                                                                               | Feel                                                                                                 | Key detail                                                        |
| ------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Reading Nook**   | Warm cards with soft shadows, serif titles, cream backgrounds                        | A shelf of favorite books. Cozy, personal, intimate. "Come sit, here's what I've been reading."      | Subtle book-spine left border on each card                        |
| **Bulletin Board** | Cork texture backing, cards pinned at slight random angles, thumbtack visuals        | Retro web1.0 craft energy. Messy-on-purpose. Each blog is a card you tacked up because it mattered.  | Cards have slightly varied rotation (-2° to +2°), pin at top      |
| **Neighborhood**   | Clean directory rows with grove-green accents, directional arrows, address-book feel | Your corner of the internet. "These are my people, my streets." Community-forward.                   | Subtle house/door icon per entry, warm green address-line styling |
| **Garden Row**     | Each blog as a small organic plot shape, nature-forward layout                       | Blogs as plants in your garden. Organic, seasonal. Fresh posts "bloom" brighter (future RSS tie-in). | Organic card shapes, leaf/vine separators, warm earth tones       |
| **Marquee Ticker** | Scrolling horizontal strip of blog names and favicons                                | News ticker / stock ticker energy. Retro, playful, eye-catching. Great for footers/headers.          | CSS scroll animation, `prefers-reduced-motion` → static strip     |
| **88×31 Buttons**  | Tiny rectangular buttons in a wrapped grid, classic web badge wall                   | THE indie web format. Each blog gets a tiny visual stamp. Nostalgic, collectible, badge-wall energy. | Auto-generated buttons from metadata, with custom upload override |
| **Minimal List**   | Just names as links in a clean column. No cards, no icons, no fuss.                  | For people who find beauty in restraint. The words speak for themselves.                             | Grove-green on hover, subtle underline animation                  |

#### 88×31 button generation

The 88×31 style needs actual button images. Two sources, layered:

- **Auto-generated (default)**: Grove generates a tiny 88×31 canvas image from blog metadata — title text, favicon (if available), a color derived from the blog's URL hash. Rendered server-side or via client canvas. Instant, zero-effort.
- **Custom override**: Owner can upload a custom 88×31 image per blog via Custom Uploads picker, replacing the auto-generated one. Classic web people often make their own buttons — this honors that tradition.

When no custom image exists, auto-generation kicks in. The button wall looks alive immediately without requiring owner effort, but rewards those who invest in custom art.

#### Marquee ticker: Animation + a11y

- CSS `@keyframes` scroll, not JS — performant, composable
- `prefers-reduced-motion: reduce` → static horizontal strip (no scroll, wraps naturally)
- Ticker speed configurable by owner (slow drift vs. active scroll)
- Pause on hover — blog name expands to show description tooltip
- Respects touch: on mobile, swipeable horizontal scroll instead of auto-scroll

#### Texture layer: Personal notes (why I read this)

Same pattern as Now Playing and Shelves. Each blog entry can have an optional personal note — not just what the blog is, but why it matters to you.

**Fields per blog entry:**

- **Note** (free text, max ~280 chars) — "her essays changed how I think about food" / "we met at a conference in Portland" / "the best debugging blog on the internet"
- **Note visibility** (owner's choice per blog):
  - **Show**: Note visible alongside the blog entry. The texture IS the recommendation.
  - **Tuck underneath**: Clean surface with blog info. Hover/tap reveals the personal note. Discovery moment.
  - **Hidden**: Just the blog. The note is a private reminder for the owner.

#### Description visibility (per-entry toggle)

The description field exists in the data model but isn't always wanted. Owner controls per blog:

- **Show description**: Description renders as subtitle text below the title
- **Hide description**: Only title (and optional note) shown. Clean.

This lets the same blogroll have some entries with full context and others that are just a name — because some recommendations need explaining and others speak for themselves.

#### Favicon system (upgraded)

Current: Google S2 API with an empty gray square fallback. Upgraded:

- **Auto-fetch (default)**: Google S2 as today, but with proper error handling
- **Warm fallback**: When S2 fails, render the blog title's **first letter** as an initial in a colored circle (color derived from URL hash). Personal, varied, warm — not a gray void.
- **Custom override**: Owner can upload a custom icon per blog via Custom Uploads picker. Maximum control for blogs whose favicons don't represent them well, or for blogs that don't have favicons at all.

Three layers: custom (if uploaded) → S2 favicon (if available) → generated initial (always works).

#### Categories: Optional grouping

Owner can create categories to organize their blogroll into sections:

**Category fields:**

- **Name** (text, max 50 chars) — "Friends", "Tech", "Art", "Cooking", "Queer Creators"
- **Emoji** (optional) — 🌿, 💻, 🎨, 🍳, 🏳️‍🌈
- **Color accent** (optional hex) — tints the section header/divider
- **Description** (optional, max ~200 chars) — "The people I actually know and love"
- **Sort order** — categories are ordered, blogs within categories are ordered

**Display:**

- Categories render as warm section headers with emoji + name + optional description
- Blogs not assigned to any category appear in an "Uncategorized" section (or at the top, owner's choice)
- Categories are optional — a blogroll with zero categories is just a flat list
- In Bulletin Board style, categories become different "zones" on the cork board
- In 88×31 style, categories become labeled rows of buttons
- In Marquee style, categories are ignored (one continuous ticker)
- In Minimal style, categories become simple text dividers

#### XFN relationship attributes

Deep indie web integration. Each blog entry can have optional XFN `rel` values that describe the owner's relationship to the blog author:

**Supported XFN values:**

- **Friendship**: `friend`, `acquaintance`, `contact`
- **Physical**: `met` (have you met in person?)
- **Professional**: `colleague`, `co-worker`
- **Geographical**: `neighbor`
- **Family**: `child`, `parent`, `sibling`, `spouse`, `kin`
- **Romantic**: `sweetheart`, `crush`, `date`
- **Identity**: `me` (your own other sites)

**How it works:**

- Owner selects applicable rel values per blog entry (multi-select checkboxes in admin)
- Values render as `rel="friend met"` attributes on the `<a>` tag — machine-readable for indie web crawlers and social graph tools
- Optionally visible to visitors as subtle tags/badges (owner toggle): tiny pills showing "friend", "met", "mutual"
- XFN tags are **never required** — they're enrichment for indie web enthusiasts, invisible complexity for everyone else

**Why this matters:** XFN lets other tools and crawlers build a social graph from your blogroll without any API. Your blogroll becomes a machine-readable declaration of your community. This is one of the oldest and most respected indie web standards.

#### Color + theme

- Replace all hardcoded `rgba(0,0,0,0.04)` with theme-aware CSS custom properties
- Reading Nook: warm cream cards, serif headings, bark-brown accents
- Bulletin Board: cork background via CSS texture/pattern, cream cards, warm shadow
- Neighborhood: clean white/cream with grove-green directory lines
- Garden Row: earth tones, organic borders, leaf-green accents
- Marquee: transparent background, grove-green text, subtle glow on hover
- 88×31: neutral grid background, buttons provide their own color
- Minimal: just text colors from the theme, grove-green hover
- Dark mode: each style has its own night character (bulletin board gets warmer cork, reading nook gets lamplight, garden glows softly, etc.)

### Public component fixes

- [ ] **Implement all 7 display styles** with full visual character
- [ ] **Render `lastPostTitle`/`lastPostUrl`/`lastPostDate`** from API data (already sent, currently ignored)
- [ ] **Personal notes**: note field with show/tuck/hide visibility per entry
- [ ] **Description visibility**: per-entry toggle (show/hide)
- [ ] **Upgraded favicon system**: S2 → colored initial fallback → custom upload override
- [ ] **Category sections**: optional grouping with emoji, color accent, description
- [ ] **XFN rel attributes**: render on `<a>` tags, optional visible tags
- [ ] **88×31 auto-generation**: canvas-based button image from blog metadata
- [ ] **88×31 custom upload**: per-blog override via Custom Uploads picker
- [ ] **Marquee animation**: CSS scroll with `prefers-reduced-motion` fallback, pause on hover
- [ ] **Replace hardcoded rgba colors** with theme-aware CSS vars
- [ ] **Dark mode character** per style (warm, not just inverted)
- [ ] **Warm empty state**: not just "no blogs" — something inviting ("Your blogroll awaits its first recommendation...")
- [ ] **Respect `prefers-reduced-motion`**: marquee stops, bulletin board angles flatten, no hover animations
- [ ] **Remove duplicated `.sr-only`** — use shared utility

### API fixes

- [ ] **Display style field**: Add `display_style` to a new `blogroll_config` table ("reading-nook" | "bulletin-board" | "neighborhood" | "garden-row" | "marquee" | "88x31" | "minimal")
- [ ] **Note field**: Add `note` (TEXT, max 280 chars) to `blogroll_items`
- [ ] **Note visibility field**: Add `note_visibility` (TEXT, "show" | "tuck" | "hidden", default "hidden") to `blogroll_items`
- [ ] **Description visibility field**: Add `show_description` (INTEGER, default 1) to `blogroll_items`
- [ ] **Custom icon field**: Add `custom_icon_url` (TEXT, nullable) to `blogroll_items` — for uploaded favicons
- [ ] **XFN rel field**: Add `xfn_rel` (TEXT, nullable) to `blogroll_items` — space-separated rel values
- [ ] **Show XFN toggle**: Add `show_xfn_tags` (INTEGER, default 0) to `blogroll_config`
- [ ] **88×31 custom image**: Add `button_image_url` (TEXT, nullable) to `blogroll_items` — custom 88×31 override
- [ ] **Category support**: New `blogroll_categories` table (id, tenant_id, name, emoji, color, description, sort_order)
- [ ] **Category assignment**: Add `category_id` (TEXT, nullable, FK) to `blogroll_items`
- [ ] **Public API enhancement**: Include note (respecting visibility), category info, XFN rel, custom icon URL, button image URL in display response

### Admin fixes

- [ ] **Display style picker** with visual previews of all 7 styles
- [ ] **Edit blog form** — wire up existing PATCH endpoint to actual UI
- [ ] **Drag-and-drop reorder** for blogs (and categories)
- [ ] **Personal note textarea** per blog entry with visibility selector (show/tuck/hidden)
- [ ] **Description show/hide toggle** per blog entry
- [ ] **Custom icon upload** per blog via Custom Uploads picker
- [ ] **88×31 image upload** per blog via Custom Uploads picker (with auto-generated preview)
- [ ] **XFN relationship checkboxes** per blog (multi-select from XFN categories)
- [ ] **Show XFN tags toggle** (global, controls whether visitors see relationship badges)
- [ ] **Category management**: create/edit/delete/reorder categories with emoji + color + description
- [ ] **Category assignment**: dropdown per blog to assign to a category
- [ ] **Live preview** that switches between display styles
- [ ] **Migrate from lucide-svelte** to engine icons (Rss, Plus, Trash2, ExternalLink)

### Migration needs

- [ ] New table `blogroll_config`:
  - `tenant_id TEXT PRIMARY KEY` — FK to tenants
  - `display_style TEXT DEFAULT 'reading-nook'` — one of 7 styles
  - `show_xfn_tags INTEGER DEFAULT 0` — whether XFN rel tags are visible to visitors
- [ ] New table `blogroll_categories`:
  - `id TEXT PRIMARY KEY`
  - `tenant_id TEXT NOT NULL` — FK to tenants
  - `name TEXT NOT NULL` — max 50 chars
  - `emoji TEXT DEFAULT NULL` — single emoji
  - `color TEXT DEFAULT NULL` — hex color accent
  - `description TEXT DEFAULT NULL` — max 200 chars
  - `sort_order INTEGER NOT NULL DEFAULT 0`
  - Cascade delete from tenants
- [ ] New columns on `blogroll_items`:
  - `note TEXT DEFAULT NULL` — personal note, max 280 chars
  - `note_visibility TEXT DEFAULT 'hidden'` — show, tuck, hidden
  - `show_description INTEGER DEFAULT 1` — per-entry description toggle
  - `custom_icon_url TEXT DEFAULT NULL` — uploaded favicon override
  - `xfn_rel TEXT DEFAULT NULL` — space-separated XFN values
  - `button_image_url TEXT DEFAULT NULL` — custom 88×31 image URL
  - `category_id TEXT DEFAULT NULL` — FK to blogroll_categories

### RSS feed tracking (future expedition)

Noted but NOT designed around in this spec. The data model already has `feed_url`, `last_post_title`, `last_post_url`, `last_post_date`, `last_feed_check`. When RSS feed fetching lands (Worker cron, hourly):

- Garden Row style: blogs with recent posts "bloom" brighter
- Reading Nook: "Latest:" subtitle appears under blogs with fresh posts
- All styles: optional "last updated" indicator per blog
- Tier-gated: Seedling (no RSS), Sapling (latest post), Oak+ (full + OPML)

### OPML import/export (future expedition)

The standard blogroll interchange format. Oak+ tier feature. When it lands:

- **Export**: Generate OPML XML from blogroll data (straightforward transform)
- **Import**: Parse OPML XML, create blogroll entries, handle duplicates
- Noted in the planning doc (`12-blogroll.md`) — not specced here

---
