---
title: "Curio: Artifacts"
status: planned
category: features
---

# Curio: Artifacts

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 12

---

**Character**: A personal cabinet of curiosities. Some artifacts are silly toys, some are personal talismans, and the collection itself tells a story about the person who chose them. The range IS the point — a Magic 8-Ball next to an hourglass counting down to your birthday next to a flickering candle the color of lavender. Every object has a story. The question is whether you know how to listen.

**Consultant**: Fatima (witch doctor, Toliara village, Madagascar). Specializes in objects imbued with meaning — each one in her house sits on its own pedestal, some hidden until the cabinet tilts just so.

### Safari findings: What exists today

**1,079 lines across 7 files** — backend is fully wired, frontend is a "Coming soon" placeholder.

**Shared lib** (`src/lib/curios/artifacts/index.ts`, 375 lines):

- [x] 8 artifact types defined: magic8ball, fortunecookie, diceroller, marqueetext, tarotcard, coinflip, blinkingnew, rainbowdivider
- [x] Config types per artifact (custom answers, dice type, marquee text/speed/direction)
- [x] Daily seeding via `sha256(date + tenantId)` for consistent daily draws
- [x] Utility functions: `get8BallAnswer()`, `getDailyFortune()`, `rollDice()`, `flipCoin()`
- [x] 20 default 8-ball answers, 15 Grove-themed fortunes
- [x] Limits: 100 artifacts/tenant, 4096 byte config
- [x] Full sanitization + validation

**Database** (migration 065): `artifacts` table with id, tenant_id, artifact_type, placement, config (JSON), sort_order, created_at

**Admin** (341 lines): Full CRUD — add artifacts with type + placement picker, remove, toast feedback

**API** (276 lines): Public GET (cached 60s), admin POST/PATCH/DELETE

**Public component** (`CurioArtifacts.svelte`, 167 lines): **PLACEHOLDER ONLY** — fetches artifacts but renders "Coming soon" cards. No actual artifact components exist.

**Tests** (220 lines): 42 tests covering all utility functions

### Design spec (safari-approved)

#### Philosophy: The cabinet rewards the curious

A grove's artifacts are a curated collection of small, weird, wonderful things. Some are interactive toys you click. Some are atmospheric objects that just _exist_. Some are hidden until the right moment. And one — the Glass Cathedral — is a doorway to somewhere else entirely.

No categories. Artifacts are just artifacts. A flat collection the owner arranges however they want. The _owner's choices_ create the personality, not a taxonomy.

#### The full catalog (21 artifacts)

Every artifact is a self-contained component. Each has its own built-in visual style — the 8-ball looks like an 8-ball, the candle looks like a candle. Optionally, the owner can place an artifact inside a **glass card container** for a unified feel, but the default is the artifact's own character.

**Oracular & Mystical:**

| Artifact            | Interaction                                                                                                                           | Config                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Magic 8-Ball**    | Click/shake to get an answer. Shake animation + reveal.                                                                               | Custom answer pool (string array). 20 Grove-themed defaults. |
| **Tarot Card**      | Daily draw, seeded by date. Same card all day. Flip animation to reveal.                                                              | Card art + meaning display. 22 Major Arcana.                 |
| **Fortune Cookie**  | Click to crack open. Daily fortune, seeded by date.                                                                                   | Custom fortunes (string array). 15 Grove-themed defaults.    |
| **Crystal Ball**    | Decorative — swirling animated mist inside a glass sphere. Hover to see mist react.                                                   | Mist color (purple default, owner picks).                    |
| **Glass Cathedral** | **Experience artifact.** Click the entrance → modal opens → immersive prismatic passage the owner built. See dedicated section below. | Owner-designed panels (images, text, colors in sequence).    |

**Interactive Toys:**

| Artifact         | Interaction                                                                              | Config                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Dice Roller**  | Click to roll. Tumbling animation → result.                                              | Dice type: d4, d6, d8, d12, d20.                                                         |
| **Coin Flip**    | Click to flip. Spinning animation → heads or tails.                                      | Custom coin face labels (default: Heads/Tails).                                          |
| **Wishing Well** | Click to toss a coin. Splash animation. Counter shows total wishes made by all visitors. | Counter is public, cumulative. No wish text stored — just the act.                       |
| **Snow Globe**   | Click/shake to send particles swirling in a glass dome. Settles slowly.                  | Seasonal particles: snow (winter), petals (spring), leaves (autumn), fireflies (summer). |

**Classic Web / Nostalgic:**

| Artifact            | Interaction                                                           | Config                                               |
| ------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| **Marquee Text**    | Scrolling CSS text animation.                                         | Text, speed (slow/medium/fast), direction (LTR/RTL). |
| **Blinking NEW!**   | The eternal blinker. CSS animation.                                   | Custom text (default: "NEW!").                       |
| **Rainbow Divider** | Colorful animated separator line.                                     | Style: gradient wave, discrete stripes, sparkle.     |
| **Email Button**    | Retro "Email Me!" button with mailbox icon. Links to owner's contact. | Email address or contact page URL.                   |

**Nature & Atmosphere:**

| Artifact        | Interaction                                                                           | Config                                                                       |
| --------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Mood Candle** | Flickering flame animation. Purely atmospheric. Brighter glow in dark mode.           | Flame color: warm amber (default), forest green, lavender, ocean blue, rose. |
| **Wind Chime**  | Soft swaying animation. Pairs with Ambient sounds if enabled — visual-only otherwise. | Chime material: glass, bamboo, metal. Affects visual style.                  |
| **Hourglass**   | Real-time sand timer counting down to an owner-set event. Sand flows continuously.    | Event name ("Next blog post", "My birthday", "Solstice") + target datetime.  |

**Personal & Whimsical:**

| Artifact            | Interaction                                                                                                                 | Config                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Potion Bottle**   | Bubbling liquid in a glass bottle. Click for a bubble burst animation.                                                      | Liquid color + label text ("Creativity Elixir", "Courage Draught", "Sleep Potion").         |
| **Music Box**       | Click to open — a short tinkling melody plays (5-10 seconds). Visual gears turn while playing.                              | Melody preset (5-6 options: lullaby, forest theme, music box classic, etc.).                |
| **Compass Rose**    | An ornate compass whose needle always points... somewhere.                                                                  | Points to: a URL, a page on the site, or a concept (owner types a label like "the garden"). |
| **Terrarium Globe** | A tiny sealed ecosystem in a glass sphere. Miniature plants gently sway. Season-aware — matches the grove's current season. | Purely decorative. Future: integrates with the Terrarium feature.                           |

#### The Glass Cathedral (experience artifact)

The Cathedral is not a trinket on a shelf. It's a doorway.

**How it works:**

1. **On the profile**: A glowing entrance — stained glass archway, light spilling out. Small enough to sit in any zone.
2. **Click to enter**: A large modal overlay opens. The grove dims behind it. The visitor is inside the Cathedral.
3. **The experience**: The owner builds it. Panels arranged in sequence — each panel is a full-width scene (image, text, color, or combination). Visitors scroll or click through the owner's creation. Stained glass aesthetic throughout — prismatic colors, light refractions, everything feels like walking through colored glass.
4. **The treasure**: Something waits at the end. A message, an image, a link, an embed. The owner decides what the passage leads to.
5. **Return**: Close the modal. Back to the grove.

**Owner builds panels:**

- Each panel: background color/image + optional text overlay + optional link
- 3-20 panels per Cathedral
- Panel transitions: fade (default), slide, dissolve
- Color palette: owner picks a base color → system generates prismatic variations
- Mobile: panels stack as a vertical scroll experience

**Future experience artifacts** (the system is designed to support more doorway-type artifacts):

- Enchanted Library — a room of floating books, click one to read a passage
- Stargazing Deck — a night sky where constellations reveal owner-written stories
- Underground River — a flowing passage with ambient water sounds and cavern art

These are future expeditions. The Cathedral ships first as the flagship experience artifact.

#### Discovery mechanics

Half the fun is finding them. The grove rewards curious visitors.

**Visibility modes (per artifact):**

| Mode                    | Behavior                                                     |
| ----------------------- | ------------------------------------------------------------ |
| **Always visible**      | Default. The artifact sits where placed, always accessible.  |
| **Hidden (rule-based)** | Invisible until conditions are met. Owner defines rules.     |
| **Easter egg**          | Hidden with no hint. Only discovered by exploration or luck. |

**Rule builder (owner-defined per hidden artifact):**

Simple IF/THEN logic. Owner picks conditions from a menu:

| Condition         | Examples                                      |
| ----------------- | --------------------------------------------- |
| **Time of day**   | "Show between 10pm-6am" (night owl artifacts) |
| **Day of week**   | "Show on Fridays only"                        |
| **Season**        | "Show in winter only"                         |
| **Specific date** | "Show on Oct 31" (Halloween artifact)         |
| **Dark mode**     | "Show when visitor is in dark mode"           |
| **Scroll depth**  | "Show after scrolling 80% down the page"      |
| **Pages visited** | "Show after visiting 3+ pages on this site"   |
| **Time on site**  | "Show after spending 2+ minutes on site"      |
| **Random chance** | "25% chance per visit" (rare sighting)        |

Rules can be combined with AND logic: "Show in winter AND after 10pm AND in dark mode" = a truly hidden treasure.

**Reveal animations (owner picks per artifact):**

| Style       | Visual                                                                           |
| ----------- | -------------------------------------------------------------------------------- |
| **Fade**    | Gentle fade-in where it was always meant to be. Subtle, no fanfare.              |
| **Sparkle** | Brief sparkle/glow animation. The artifact materializes with a tiny celebration. |
| **Slide**   | Slides in from the edge of its zone. Smooth, purposeful.                         |
| **Grow**    | Grows from a tiny seed to full size. Nature energy.                              |
| **Flicker** | Appears, disappears, appears again — like something phasing into existence.      |

#### Placement: Zone-based + free placement

**Zones (default system):**

| Zone         | Location                                                  | Best for                                           |
| ------------ | --------------------------------------------------------- | -------------------------------------------------- |
| **Sidebar**  | Right or left margin alongside content.                   | Persistent artifacts (candle, compass, terrarium). |
| **Header**   | Top of page, above or within the header area.             | Marquee, blinking NEW, small toys.                 |
| **Footer**   | Bottom of page, above or within the footer.               | Rainbow divider, email button, wishing well.       |
| **Inline**   | Within the content flow (via `:::artifacts` directive).   | Any artifact embedded in a post.                   |
| **Floating** | Fixed position, overlaying content. Draggable by visitor? | Snow globe, mood candle, crystal ball.             |
| **Hidden**   | No visible zone — appears via discovery rules.            | Easter eggs, seasonal reveals.                     |

**Free placement (additional option):**

For owners who want precise control, any artifact can be placed with X/Y coordinates (percentage-based) and z-index instead of a zone. This is the "pin it anywhere" mode. Responsive behavior: free-placed artifacts reflow to zones on mobile (owner picks fallback zone).

#### Visual containers (optional)

Each artifact has its own built-in visual style — the 8-ball is a black sphere, the candle is a flickering flame, the potion is a glass bottle. By default, artifacts render with **no container** — just the object itself.

Optionally, the owner can wrap any artifact in a **glass card** (the standard Grove GlassCard). This adds:

- Frosted glass background
- Subtle shadow and border
- Consistent padding
- Feels like the artifact is in a display case

The choice is per-artifact: bare (default) or glass card.

#### Tier gating

| Tier         | Artifacts   | Discovery          | Experiences                    | Free placement      |
| ------------ | ----------- | ------------------ | ------------------------------ | ------------------- |
| **Seedling** | 5 any type  | No                 | No                             | No                  |
| **Sapling**  | 12 any type | Yes — rule builder | No                             | No                  |
| **Oak+**     | Unlimited   | Yes — rule builder | Yes — Glass Cathedral + future | Yes — X/Y placement |

All tiers get real artifacts (not just decorative). The cabinet should feel full even on the free tier. Discovery and experiences are the premium unlocks.

### Public component fixes

- [ ] **Replace "Coming soon" placeholder** with actual `ArtifactRenderer.svelte`
- [ ] **Build ArtifactRenderer.svelte** — reads artifact type, renders correct component
- [ ] **Build all 21 artifact components** (ship incrementally — first batch: Magic 8-Ball, Fortune Cookie, Dice Roller, Marquee Text, Coin Flip, Snow Globe)
- [ ] **Glass Cathedral modal** — full-screen overlay with panel navigation, prismatic CSS, owner-built content
- [ ] **Discovery engine** — evaluate rules per artifact on page load, manage reveal timing
- [ ] **Reveal animations** — fade, sparkle, slide, grow, flicker (CSS/Svelte transitions)
- [ ] **Zone rendering** — sidebar, header, footer, inline, floating, hidden placement
- [ ] **Free placement** — percentage-based X/Y positioning with mobile fallback zones
- [ ] **Glass card container** — optional GlassCard wrapper per artifact
- [ ] **Keyboard accessibility** — Enter/Space to activate all interactive artifacts
- [ ] **`prefers-reduced-motion`** — static fallbacks for all animations (candle still, globe still, marquee static, no reveals)
- [ ] **Dark mode** — all artifacts respond to dark mode (candle brighter, crystal ball deeper mist, etc.)

### Admin fixes

- [ ] **Artifact picker** — visual grid of all 21 types with preview thumbnails, not just a dropdown
- [ ] **Zone picker** — visual representation of page zones, drag artifact to desired zone
- [ ] **Free placement UI** — drag-on-preview for X/Y positioning
- [ ] **Discovery rule builder** — condition selector with AND logic, visual preview of when artifact appears
- [ ] **Reveal animation picker** — preview each animation style
- [ ] **Glass Cathedral builder** — panel editor: add/remove/reorder panels, set backgrounds/text/colors, preview the full experience
- [ ] **Container toggle** — per-artifact "Display in glass case" checkbox
- [ ] **Config editors per type** — custom answers for 8-ball, melody picker for music box, color picker for candle/potion, event setter for hourglass, etc.
- [ ] **Artifact reordering** — drag-and-drop within zones

### API fixes

- [ ] **Expand `ArtifactType` union** — add all 21 types (currently 8)
- [ ] **Expand `ArtifactPlacement`** — replace 3 placements with zone system + free placement fields
- [ ] **Discovery config** — add `visibility` field (always/hidden/easter-egg) + `discovery_rules` (JSON array of conditions) + `reveal_animation` to artifact records
- [ ] **Glass Cathedral panel API** — CRUD for cathedral panels (separate table or JSON in config)
- [ ] **Container field** — add `container` (none/glass-card) to artifact records
- [ ] **Free placement fields** — add `position_x`, `position_y`, `z_index`, `fallback_zone` to artifact records
- [ ] **Wishing Well counter** — shared counter endpoint (POST to increment, GET to read). Stored in KV or D1.

### Migration needs

- [ ] Alter `artifacts` table:
  - `placement TEXT` → expand to zone values: sidebar, header, footer, inline, floating, hidden (keep backward compat with vine values as aliases)
  - Add `visibility TEXT DEFAULT 'always'` — always, hidden, easter-egg
  - Add `discovery_rules TEXT DEFAULT '[]'` — JSON array of rule objects
  - Add `reveal_animation TEXT DEFAULT 'fade'` — fade, sparkle, slide, grow, flicker
  - Add `container TEXT DEFAULT 'none'` — none, glass-card
  - Add `position_x REAL` — nullable, percentage (0-100) for free placement
  - Add `position_y REAL` — nullable, percentage (0-100) for free placement
  - Add `z_index INTEGER DEFAULT 10` — layering for free placement
  - Add `fallback_zone TEXT DEFAULT 'floating'` — zone to use on mobile when free-placed
- [ ] New table `cathedral_panels`:
  - `id TEXT PRIMARY KEY`
  - `artifact_id TEXT NOT NULL` — FK to artifacts
  - `tenant_id TEXT NOT NULL` — FK to tenants
  - `panel_order INTEGER NOT NULL`
  - `background_color TEXT` — hex color
  - `background_image_url TEXT` — optional image
  - `text_content TEXT` — optional overlay text (max 500 chars)
  - `text_color TEXT` — hex color for text
  - `link_url TEXT` — optional link (for final panel treasure)
  - Cascade delete from artifact
- [ ] New table or KV entry for `wishing_well_counts`:
  - `tenant_id TEXT PRIMARY KEY`
  - `wish_count INTEGER DEFAULT 0`

### Ship incrementally

**Batch 1** (core toys): Magic 8-Ball, Fortune Cookie, Dice Roller, Marquee Text, Coin Flip, Blinking NEW!, Rainbow Divider
**Batch 2** (atmosphere + interaction): Snow Globe, Mood Candle, Hourglass, Email Button, Wishing Well
**Batch 3** (whimsy + nature): Potion Bottle, Music Box, Compass Rose, Wind Chime, Crystal Ball, Terrarium Globe, Tarot Card
**Batch 4** (experiences): Glass Cathedral (+ Cathedral builder admin)

Discovery mechanics and zone placement ship with Batch 1. Free placement ships with Batch 2.

### Future expeditions

- **Enchanted Library** (experience artifact) — a room of floating books, click one to read a passage the owner wrote
- **Stargazing Deck** (experience artifact) — a night sky where constellations reveal owner-written stories connected by star lines
- **Underground River** (experience artifact) — a flowing passage with ambient water sounds and cavern art, owner places things along the banks
- **Terrarium Globe → Terrarium integration** — when the full Terrarium feature ships, the globe artifact becomes a live window into the owner's terrarium
