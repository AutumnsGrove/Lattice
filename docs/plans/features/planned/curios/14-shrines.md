---
title: "Curio: Shrines"
status: planned
category: features
---

# Curio: Shrines

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 14

---

**Character**: Sacred spaces for things you love — never performative, always sincere. A spatial canvas inside a beautiful frame where you arrange what matters most. The most emotionally powerful curio in the system.

> **Note**: The shrine's spatial canvas engine will be reused for a future Scrapbook curio. Build the engine once, skin it twice.

### Major gap: No public component, no content editor

- [ ] **CurioShrines.svelte does NOT exist** — visitors can't see shrines
- [ ] **No content editor in admin** — admin creates the container (title, type, size, frame) but there's NO way to place items at x/y coordinates
- [ ] Admin supports: 6 shrine types, 6 frame styles, 3 sizes, publish/draft toggle
- [ ] Data model has `ShrineContentItem` with `type`, `x`, `y`, `data` — the spatial bones exist

---

### Shrine Design Spec

#### Editing experience: Both modes

- **Simple mode**: Pick a shrine type → get a starting TEMPLATE with pre-placed items. Memory shrine starts with candle icon + photo slot + date. Fandom starts with poster-sized image + quote. Rearrange, replace, customize from there. Approachable.
- **Advanced mode**: Full drag-and-drop canvas. Place items freely, move/resize/rotate. Mini spatial editor. For people who want to spend an hour making it perfect.

#### Content items: What goes on the altar

| Item type      | What it is          | How it works                                                            |
| -------------- | ------------------- | ----------------------------------------------------------------------- |
| **Image**      | Photos, artwork     | Upload via Custom Uploads. Positioned freely. Click to zoom.            |
| **Text**       | Words, poems, names | Typed inline. Font choice (serif for formal, handwriting for personal). |
| **Date**       | Meaningful dates    | Rendered as a styled date badge. "March 12, 2019"                       |
| **Icon**       | Symbolic icons      | Pick from Lucide set. Hearts, stars, candles, flowers, etc.             |
| **Decoration** | Visual flair        | Hearts, sparkles, flowers, ribbons. The craft energy.                   |
| **Embed link** | External reference  | URL → preview card with title/image. A window to something else.        |
| **Music**      | A meaningful song   | Audio player that plays when viewing the shrine. Optional, mutable.     |
| **Quote**      | Words from others   | Styled quote block with attribution. "Words that changed me."           |

#### Frame richness tiers (implemented in order, all remain as options)

**Tier 1 — Subtle themed borders** (first, fastest):

- Wood: warm brown, slightly rounded, `bark.warmBark` tones
- Stone: cool gray, slightly rough edge-radius, `earth.stone`
- Crystal: prismatic border, subtle rainbow shimmer
- Floral: soft pink/green with delicate vine pattern (CSS)
- Cosmic: dark purple border with tiny star sparkles
- Minimal: thin cream/white, almost invisible

**Tier 2 — Textured frames** (second):

- Wood gains visible grain (SVG pattern or CSS noise)
- Stone gets rough/chipped edges
- Crystal sparkles on hover
- Floral gets painted flower accents at corners
- Cosmic gets animated star field in border

**Tier 3 — Full illustration** (future):

- Ornate illustrated borders like antique picture frames
- Custom SVG or AI-generated frame art
- Each frame is a work of art

#### Shrine type templates

Each type starts with a pre-arranged template:

| Type            | Starting template                                                         |
| --------------- | ------------------------------------------------------------------------- |
| **Memory**      | Candle icon (center-top), photo slot (center), date (bottom), soft glow   |
| **Fandom**      | Poster-sized image (center), quote (bottom), star decorations             |
| **Achievement** | Medal/star icon (top), title text (center), date (bottom), sparkles       |
| **Gratitude**   | Heart icon (top), text area (center), flower decorations                  |
| **Inspiration** | Quote block (center), mood board grid (2-3 small images), sparkle accents |
| **Blank**       | Empty canvas. Your sacred space.                                          |

#### Visitor experience: Gentle interaction

- Subtle **parallax/depth effect** on mouse movement — items shift slightly, creating depth
- **Click items** to see them closer (image lightbox, text enlargement, link follows)
- **Music plays** softly if the shrine has an audio item (mutable, never autoplays)
- Can NOT modify the shrine — this is someone's sacred space, you're a respectful visitor
- `prefers-reduced-motion`: parallax disabled, items static

### Admin

- [ ] (Good foundation — create/manage shrines, type/size/frame pickers, publish toggle)
- [ ] **Build content editor** — the BIG missing piece. Both simple (template-based) and advanced (drag-and-drop canvas) modes
- [ ] Add frame preview in admin (show all 3 tiers as they become available)
- [ ] Image placement via Custom Uploads picker
- [ ] Music item: audio URL or upload
- [ ] Template preview when selecting shrine type

---
