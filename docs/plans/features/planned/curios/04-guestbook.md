---
title: "Curio: Guestbook"
status: planned
category: features
---

# Curio: Guestbook

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 4

---

**Character**: A living room wall where visitors leave their mark. Mountain lodge book meets coffee shop sticky wall meets trail register meets letter jar — all at once, owner's choice. The most _interactive_ curio in the system: visitors don't just look, they CREATE.

**Design principle**: Two layers, two choices. The **Room** belongs to the owner — they choose the surface, the welcome mat, the vibe. The **Pen** belongs to the visitor — they pick up a pen and make their mark their own way. These layers combine into a living collage where every entry is a tiny self-portrait.

### Safari findings: What exists today

**This curio is more complete than the old safari plan suggested.** It has a full public page, signing form, 4 display styles, moderation, spam detection, and tests. The gap is character, not functionality.

**Public page** (`/(site)/guestbook/+page.svelte`, 705 lines):

- [x] Full signing form: name (50 char, autocomplete), emoji picker (30 nature-themed), message textarea (configurable limit, live counter)
- [x] Cmd+Enter / Ctrl+Enter to submit
- [x] Rate limit handling (429 → friendly "Please wait" message)
- [x] Approval workflow feedback ("Awaiting approval" vs. "Posted!")
- [x] Infinite scroll with "Load more signatures" button
- [x] 4 display styles fully implemented as CSS variants (cozy, classic, modern, pixel)
- [x] Empty state: "No signatures yet — be the first!"
- [x] Dark mode, light mode
- [ ] **All entries look identical** — same gray boxes stacked. Zero sense of individual voices.
- [ ] **No signing styles** — visitors can't choose HOW their entry looks (sticky note, letter, etc.)
- [ ] **No color expression** — entries are all the same neutral background
- [ ] **No wall backing** — no surface texture, just flat container
- [ ] **`rgba(0,0,0,0.04)` backgrounds** on entries — the familiar gray nothingness

**Inline widget** (`CurioGuestbook.svelte`, compact):

- [x] Fetches 5 most recent entries from API
- [x] Shows emoji, name, message, relative timestamp
- [x] Loading skeleton, error state
- [x] Footer with total entry count
- [ ] **No styled entries** — same flat list regardless of future signing styles
- [ ] **Duplicated `.sr-only`**

**Shared lib** (`src/lib/curios/guestbook/index.ts`):

- Types: `GuestbookStyle` (4 styles), `GuestbookConfig`, `GuestbookEntry`, `GuestbookDisplayEntry`, `GuestbookPagination`
- Curated emoji set: 30 nature-themed emojis (🌿🌱🍃🌸🌻🌺🍂🍁❄️🌙⭐✨🦋🐝🐞🌈☀️🌊🔥💜💚💛🤍🖤🫶👋🎵📖🫧🕯️)
- Spam detection: `isSpam()` catches URLs, repeated chars, common spam phrases
- Rate limiting: 10-minute IP-hash cooldown
- **Well-tested**: 30+ test cases (335 lines)

**Admin** (`/arbor/curios/guestbook/`, ~800 lines):

- [x] Stats cards: approved, pending, total
- [x] Tab interface: Settings + Moderation
- [x] Style picker (2×2 grid with radio buttons)
- [x] Moderation: require-approval toggle, pending queue, approve/delete per entry
- [x] Features: emoji toggle, entries-per-page, max message length, custom prompt
- [x] Toast feedback, GlassCard layout
- [ ] **No wall backing selector**
- [ ] **No signing styles config** (which styles visitors can use)
- [ ] **No color palette config**
- [ ] **No CTA style selector**
- [ ] **Uses lucide-svelte directly** (BookOpen, Shield)

**API** (5 endpoints):

- `GET /api/curios/guestbook` — public, 30s cache, paginated approved entries
- `POST /api/curios/guestbook` — submit entry (rate-limited, spam-checked)
- `GET /api/curios/guestbook/pending` — admin, unapproved entries
- `PATCH /api/curios/guestbook/[id]` — admin, approve/reject
- `DELETE /api/curios/guestbook/[id]` — admin, delete

**Database** (migration 057):

- `guestbook_config`: tenant_id (PK), enabled, style, entries_per_page, require_approval, allow_emoji, max_message_length, custom_prompt
- `guestbook_entries`: id, tenant_id, name, message, emoji, approved, ip_hash, created_at, updated_at
- Proper indexes on tenant_id, approved status, ip_hash

---

### Design spec (safari-approved, Oyibo-consulted)

#### Philosophy: Room + Pen — two layers, two choosers

A guestbook is an interaction between two people: the host and the guest. The host sets the room — the surface, the vibe, the welcome mat. The guest picks up a pen and makes their mark their own way. These two layers combine independently:

- **Room** (owner chooses): Display style × Wall backing = the space entries live in
- **Pen** (visitor chooses): Signing style + emoji + color = how their entry looks

A sticky note on a cork board feels different than a sticky note on frosted glass. A letter in a pixel guestbook feels different than a letter in a cozy one. The combinations are the magic.

#### Room layer: Display style × Wall backing (owner picks both)

**Display styles** (4 existing, kept and enhanced):

| Style       | Character                                        | Enhancement needed                                    |
| ----------- | ------------------------------------------------ | ----------------------------------------------------- |
| **Cozy**    | Warm, rounded, italic messages, soft backgrounds | Add handwriting-font option, warmer color tints       |
| **Classic** | Bordered, underlined names, old-web feel         | Add faint ruled-line texture to entry backgrounds     |
| **Modern**  | Clean cards, subtle shadows, contemporary        | Already solid — warm up the shadow color slightly     |
| **Pixel**   | Chunky borders, monospace, retro offset shadows  | Add scanline overlay option, more retro color options |

**Wall backings** (4 new, combine with any display style):

| Backing           | Visual                                                                        | Feel                                               |
| ----------------- | ----------------------------------------------------------------------------- | -------------------------------------------------- |
| **Frosted Glass** | Grove glassmorphic surface. Entries pinned to glass with subtle blur beneath. | Very Grove. Ties into the glass system. Modern.    |
| **Cork Board**    | Warm cork texture (CSS pattern). Entries attached with thumbtack visuals.     | Physical, tactile, craft energy. Messy-warm.       |
| **Cream Paper**   | Soft cream/parchment texture. Entries written/stuck onto paper surface.       | Journal page. Intimate, personal, quiet.           |
| **None / Clean**  | No backing texture. Entries float in the page's own background.               | Minimal. For groves where the content IS the wall. |

**Combinations**: 4 styles × 4 backings = 16 possible rooms. Each feels distinct. Owner picks one of each.

#### Pen layer: 6 signing styles (visitor picks)

When signing, visitors choose how their entry looks. The owner configures which styles are available (can enable/disable any of the 6). Default: all enabled.

| Style            | Visual                                                             | Feel                                                     | Key detail                                              |
| ---------------- | ------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------- |
| **Sticky Note**  | Colored square, slight random angle (-3° to +3°), handwriting font | Coffee shop wall. Messy, alive, colorful.                | Color IS the sticky note background                     |
| **Written Note** | Lined paper card, handwriting font, personal and deliberate        | Mountain lodge book. Warm, traveled, careful penmanship. | Faint ruled lines behind text, ink-colored text         |
| **Quick Line**   | Minimal text inline, just name + thought, no card                  | Trail register. Honest, simple, passing through.         | Dash separator, compact, single line when short         |
| **Letter**       | Folded paper icon, click/tap to unfold and read                    | Letter jar. Intimate, precious, a gift to the host.      | Unfold animation, wax-seal-ish closure, longer messages |
| **Postcard**     | Landscape card, colored/patterned top half, message below          | "Wish you were here." Travel guestbook, vacation energy. | Top half tinted with visitor's chosen color             |
| **Doodle Card**  | White card with sketchy border, emoji BIG and central              | Art-forward, playful. The emoji is the illustration.     | Emoji renders at 2-3× size as the card's hero element   |

#### Signer customization: Progressive disclosure

The signing form respects everyone's time while rewarding craft:

**Always visible (core):**

- **Name** (text input, 50 char max, defaults to "Anonymous Wanderer")
- **Message** (textarea, configurable max length, live char counter)
- **Emoji picker** (existing 30 nature-themed curated set, optional)

**"Personalize your entry" expandable section:**

- **Signing style picker** (visual thumbnails of available styles, owner controls which are enabled)
- **Color picker** (curated palette — see below)

**Defaults are beautiful**: If a visitor just types a name and message and hits submit, they get a random signing style from the enabled set and a random color from the palette. Zero friction, still personal — every entry looks different even without customization.

#### Color system: Curated palettes with style-dependent defaults

The owner configures a **color palette** — 6-8 warm colors that work together. Visitors pick from this palette (not a free hex picker). Cohesive, intentional, never clashing.

**Default palette** (owner can customize):

- Soft rose, warm amber, sage green, sky blue, lavender, cream gold, coral, muted teal

**How color manifests per signing style:**

- **Sticky Note** → background color of the square
- **Written Note** → ink/text color on the lined paper
- **Quick Line** → accent dash/dot color
- **Letter** → wax seal color on the fold
- **Postcard** → top-half pattern tint
- **Doodle Card** → border color

**Style-dependent defaults**: When a visitor picks a signing style but doesn't pick a color, a random color from the palette is assigned. Every entry is unique without effort.

#### Display: Living collage

The guestbook page becomes a beautiful mix of different signing styles. Sticky notes at angles next to neatly written notes next to folded letters next to postcards. Each entry is visually distinct — you can FEEL the different people.

**Layout behavior per style:**

- Sticky notes and doodle cards: may scatter slightly (random rotation, random offset within bounds)
- Written notes and postcards: neatly stacked with consistent spacing
- Quick lines: compact, tight spacing, list-like
- Letters: folded icons in a row or grid, expand on click

**Wall backing interaction:**

- Cork board + sticky notes = thumbtacks visible
- Glass + any style = subtle pin/attachment visual
- Cream paper + written notes = entries feel written directly onto the page
- Each combination has its own attachment metaphor

#### Sign CTA (owner-configurable)

| Style                     | Visual                                                       | Feel                                               |
| ------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| **Warm button at bottom** | "Leave your mark" button, discovered after scrolling entries | Inviting, patient. You read first, then sign.      |
| **Floating pen/quill**    | Persistent FAB in corner with subtle quill/pen icon          | Always visible, gentle invitation. "Sign anytime." |

#### Inline widget: Owner's choice

The `CurioGuestbook.svelte` inline widget (for `::guestbook::` markdown embeds) has two modes:

- **Compact** (current behavior, enhanced): Clean list of 5 recent entries with emoji + name + message. Fast, minimal footprint. Good for homepage sidebars.
- **Styled mini-collage**: Renders entries with their signing styles — a tiny living wall. Sticky notes at angles, folded letters, postcards. More visual, more personality. Good for dedicated sections.

Owner toggles which mode the inline widget uses.

#### Dark mode character

- **Cork board**: Deepens to dark cork, warm brown, lamplit feel
- **Frosted glass**: Glass darkens, entries glow slightly against it
- **Cream paper**: Warms to aged parchment, text brightens
- **Sticky notes**: Colors deepen and saturate slightly
- **Letters**: Wax seal catches warm light
- Each combination has its own night personality — not just inverted colors

### Public component fixes (both page and inline widget)

- [ ] **Implement 6 signing styles** with full visual character in the `/guestbook/` page
- [ ] **Implement 4 wall backings** as CSS surface textures/treatments
- [ ] **Style × backing combinations**: Ensure all 16 combos render correctly (key attachment metaphors)
- [ ] **Signing form progressive disclosure**: Core fields always visible, "Personalize" section expandable
- [ ] **Color palette picker** in signing form (curated set from owner's config)
- [ ] **Beautiful defaults**: Random style + random color when visitor doesn't customize
- [ ] **Living collage layout**: Mixed signing styles with style-appropriate spacing and rotation
- [ ] **Letter unfold animation**: Click to open, with a brief paper-unfold transition
- [ ] **Inline widget two modes**: Compact list OR styled mini-collage (owner toggle)
- [ ] **Replace hardcoded rgba colors** throughout with theme-aware vars
- [ ] **Dark mode character** per wall backing and signing style
- [ ] **CTA style support**: Warm button OR floating quill (owner config)
- [ ] **Respect `prefers-reduced-motion`**: No rotation on sticky notes, no unfold animation on letters, instant states
- [ ] **Remove duplicated `.sr-only`** — use shared utility

### API fixes

- [ ] **Signing style field**: Add `entry_style` (TEXT, "sticky" | "note" | "line" | "letter" | "postcard" | "doodle", nullable — null = random assignment) to `guestbook_entries`
- [ ] **Color field**: Add `entry_color` (TEXT, nullable hex) to `guestbook_entries`
- [ ] **Wall backing config**: Add `wall_backing` (TEXT, "glass" | "cork" | "paper" | "none", default "none") to `guestbook_config`
- [ ] **CTA style config**: Add `cta_style` (TEXT, "button" | "floating", default "button") to `guestbook_config`
- [ ] **Allowed styles config**: Add `allowed_styles` (TEXT, JSON array of enabled signing styles, default all 6) to `guestbook_config`
- [ ] **Color palette config**: Add `color_palette` (TEXT, JSON array of hex colors, default curated set) to `guestbook_config`
- [ ] **Inline widget mode config**: Add `inline_mode` (TEXT, "compact" | "styled", default "compact") to `guestbook_config`
- [ ] **Public API enhancement**: Include entry_style and entry_color in display response
- [ ] **Signing endpoint**: Accept `style` and `color` in POST body (optional, validated against allowed set + palette)

### Admin fixes

- [ ] **Wall backing selector** with visual previews of all 4 backings
- [ ] **Allowed signing styles** multi-select (which of the 6 styles visitors can use)
- [ ] **Color palette editor**: Add/remove/reorder hex colors in the palette. Visual swatches.
- [ ] **CTA style selector** (button / floating quill) with preview
- [ ] **Inline widget mode toggle** (compact / styled mini-collage)
- [ ] **Entry preview**: Show sample entries in each signing style within the admin
- [ ] **Moderation enhancement**: Show entry style + color in the pending queue (so moderator sees what it'll look like)
- [ ] **Migrate from lucide-svelte** to engine icons (BookOpen, Shield)

### Migration needs

- [ ] New columns on `guestbook_config`:
  - `wall_backing TEXT DEFAULT 'none'` — glass, cork, paper, none
  - `cta_style TEXT DEFAULT 'button'` — button, floating
  - `allowed_styles TEXT DEFAULT NULL` — JSON array, null = all enabled
  - `color_palette TEXT DEFAULT NULL` — JSON array of hex colors, null = default palette
  - `inline_mode TEXT DEFAULT 'compact'` — compact, styled
- [ ] New columns on `guestbook_entries`:
  - `entry_style TEXT DEFAULT NULL` — sticky, note, line, letter, postcard, doodle (null = randomly assigned on render)
  - `entry_color TEXT DEFAULT NULL` — hex color from palette (null = randomly assigned on render)
