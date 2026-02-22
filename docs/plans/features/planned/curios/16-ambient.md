---
title: "Curio: Ambient"
status: planned
category: features
---

# Curio: Ambient

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 16

---

**Character**: The atmosphere engine. Not a feature — a _place_. When a visitor clicks play, your grove stops being a website and starts being a room. The rain on the leaves, the fire in the corner, the distant hum of a coffee shop. Ambient sound is the invisible architecture that turns a page into a world.

**Unique in the system**: Ambient is the only curio that's a **global layer** — mounted once in the root layout, rendered site-wide, not placed via markdown directive. It's always there (when enabled), a quiet invitation in the corner of every page.

### Safari findings: What exists today

**Public component** (`CurioAmbientLayer.svelte`, 140 lines):

- [x] Fixed play/pause button (bottom-left, z-40, 36px circle)
- [x] Glassmorphic backdrop blur on the button
- [x] HTML Audio element with seamless looping
- [x] Volume control (from config, clamped 0-1)
- [x] No autoplay — requires explicit user click (respects browser policy)
- [x] Proper cleanup on unmount (pause, clear src, null ref)
- [x] Silent fail on fetch error (ambient is cosmetic, never blocks)
- [x] Dark mode support
- [ ] **Sound set mismatch**: Type system defines 7 sets (forest-rain, morning-birds, creek, night, lo-fi, fireplace, seasonal) but the component hardcodes only 4 (forest-rain, campfire, gentle-wind, night-crickets) — different names!
- [ ] **No actual audio files**: Paths point to `/audio/ambient/*.mp3` — these files don't exist
- [ ] **Button is characterless**: `rgba(255,255,255,0.8)` circle, generic play/pause SVGs. No Grove warmth.
- [ ] **No sound label**: No indication of WHICH sound is playing
- [ ] **No volume control for visitors**: Volume is owner-set only, visitors can't adjust
- [ ] **No visualization**: Static button whether playing or not (only the icon changes)
- [ ] **No crossfade**: Hard-cuts between sounds
- [ ] **No seasonal logic**: "seasonal" is a sound set option but no season→sound mapping exists
- [ ] **No localStorage persistence**: Visitor's play/pause state and volume preference not remembered

**Shared lib** (`src/lib/curios/ambient/index.ts`, 127 lines):

- Types: `SoundSet` (7 options), `AmbientConfigRecord`, `AmbientConfigDisplay`
- 7 sound set options with labels and descriptions
- Volume: 0-100 integer, default 30
- Utilities: validation for sound set, volume, URL; display transform
- Well-structured, clean

**Admin** (`/arbor/curios/ambient/`, ~118 + 108 lines):

- [x] Sound set dropdown (7 options with descriptions)
- [x] Volume slider (0-100) with live percentage display
- [x] Enable/disable toggle
- [x] Custom audio URL field (Oak+)
- [x] GlassCard layout, toast feedback
- [x] UPSERT save (INSERT ON CONFLICT UPDATE)
- [ ] **No preview/test play** — can't hear the sound before saving
- [ ] **No seasonal mapping UI** — "Seasonal" is a dropdown option but no way to configure which sound plays when
- [ ] **No custom upload integration** — just a raw URL field
- [ ] **Uses lucide-svelte directly** (Volume2)

**API** (1 route file):

- `GET /api/curios/ambient` — public, returns `{ config: AmbientConfigDisplay | null }`
- No explicit cache headers (should have them)

**Database** (ambient_config table):

- `tenant_id` (PK), `sound_set`, `volume`, `enabled`, `custom_url`, `updated_at`
- Single row per tenant (UPSERT pattern)

---

### Design spec (safari-approved, Nsia-consulted)

#### Philosophy: Atmosphere, identity, season

Ambient sound serves three roles simultaneously:

1. **Atmosphere setter** — The background texture of your space. Like a coffee shop's playlist, you don't listen TO it, you exist WITHIN it. Sets the emotional temperature before a single word is read.
2. **Signature experience** — Part of your grove's identity. "The one with the rain sounds." A deliberate, remembered sensory layer that makes your site feel like a _place_, not a page.
3. **Seasonal companion** — Tied to the grove's season system. Spring gets birdsong, winter gets crackling fire. The sounds change as the year turns, as alive as the visual season.

#### Curated sound library (8 sounds, R2-hosted)

Small and perfect. Each sound is a distinct atmosphere — a room you can step into. Quality over quantity.

**Nature:**

| Sound             | Emoji | Description                                      | Feel                            |
| ----------------- | ----- | ------------------------------------------------ | ------------------------------- |
| **Forest Rain**   | 🌧️    | Gentle rainfall on leaves, distant soft thunder  | Cozy shelter, reading weather   |
| **Morning Birds** | 🐦    | Dawn chorus, gentle chirping, early light energy | Fresh, hopeful, new-day energy  |
| **Creek**         | 🌊    | Flowing water over stones, gentle current        | Calm focus, natural white noise |
| **Night**         | 🦗    | Crickets, distant owl, soft wind through grass   | Late hours, quiet contemplation |

**Cozy:**

| Sound           | Emoji | Description                                           | Feel                           |
| --------------- | ----- | ----------------------------------------------------- | ------------------------------ |
| **Fireplace**   | 🔥    | Crackling wood, warm pops, settling embers            | Winter warmth, nesting energy  |
| **Coffee Shop** | ☕    | Quiet murmur, clinking cups, distant espresso machine | Productive calm, social warmth |

**Ambient:**

| Sound     | Emoji | Description                                       | Feel                       |
| --------- | ----- | ------------------------------------------------- | -------------------------- |
| **Lo-fi** | 🎵    | Gentle ambient beats, royalty-free, warm and soft | Creative flow, modern cozy |

**Meta:**

| Sound        | Emoji | Description                                                     | Feel                           |
| ------------ | ----- | --------------------------------------------------------------- | ------------------------------ |
| **Seasonal** | 🌌    | Auto-selects from the above based on Grove season + time of day | Living, cyclical, always right |

**Audio sourcing**: All 7 sound files are curated by Grove, royalty-free, and hosted on R2 CDN. High-quality, seamlessly loopable, consistent experience across all groves. Oak+ owners can additionally upload custom ambient audio via Custom Uploads.

#### Seasonal auto-selection (layered: season + time of day)

When "Seasonal" is selected, the sound auto-selects using a two-layer system:

**Layer 1 — Season sets the palette:**

| Season | Default sound | Feeling                        |
| ------ | ------------- | ------------------------------ |
| Spring | Morning Birds | Renewal, dawn, new growth      |
| Summer | Creek         | Warm flow, long lazy days      |
| Autumn | Forest Rain   | Harvest, cozy, shelter weather |
| Winter | Fireplace     | Rest, warmth, nesting          |

**Layer 2 — Time of day refines within the palette:**

| Time               | Override                                              |
| ------------------ | ----------------------------------------------------- |
| Night (10pm-5am)   | → Night (crickets/owl) regardless of season           |
| Morning (5am-10am) | → Morning Birds in spring/summer, Fireplace in winter |
| Day (10am-10pm)    | → Season default (no override)                        |

**Layer 3 — Owner overrides:**

The owner can remap any season→sound assignment. Default mappings are smart, but if someone wants Fireplace in summer, that's their grove.

#### Expanded mini-player (replaces the 36px button)

The current button is a mute witness. The new player breathes.

**Collapsed state (default):**

- 40px circle, fixed bottom-left (same position)
- Grove glassmorphic styling (not raw rgba — use `glass-grove` or themed vars)
- When NOT playing: subtle speaker icon with a soft glow, inviting click
- When playing: **sound-matched micro-visualization** replaces the icon (see below)
- Sound name appears as a small tooltip-label on hover ("🌧️ Forest Rain")

**Expanded state (on click/tap when already playing):**

- Mini-player panel expands upward from the button (200-240px wide)
- Shows: sound name with emoji, play/pause button, volume slider
- Current visualization plays larger in the expanded panel
- "Powered by Grove" tiny footer in the panel (optional, subtle)
- Click outside or press the collapse button → returns to circle
- Smooth expand/collapse animation (respects `prefers-reduced-motion`)

**Visitor controls:**

- **Play/pause**: Always available
- **Volume**: Slider in expanded panel, visitor's preference saved to `localStorage`
- **Play state**: Remembered in `localStorage` — if a visitor played the sound, it offers to resume on their next visit (still requires a click — never autoplay)

#### Sound-matched micro-visualizations

Each sound gets its own tiny CSS animation that plays inside the circle when active. The sound made visible.

| Sound            | Visualization                                     | CSS approach                                    |
| ---------------- | ------------------------------------------------- | ----------------------------------------------- |
| 🌧️ Forest Rain   | Tiny rain drops falling through the circle        | Animated dots translating downward, staggered   |
| 🐦 Morning Birds | Gentle note/musical dots drifting upward          | Small circles rising and fading, organic timing |
| 🌊 Creek         | Wavy sine-line flowing horizontally               | Animated SVG path or CSS wave                   |
| 🦗 Night         | Twinkling star dots fading in and out             | Opacity-cycling dots at random positions        |
| 🔥 Fireplace     | Small flame flicker (2-3 tongues of orange/amber) | Animated shapes with scale/opacity flicker      |
| ☕ Coffee Shop   | Rising steam curl                                 | Wavy line rising and fading, gentle S-curve     |
| 🎵 Lo-fi         | Classic mini EQ bars bouncing (3-4 bars)          | Animated height bars, staggered timing          |

**`prefers-reduced-motion`**: All visualizations freeze to a static representative frame — rain drops paused mid-fall, flame in a single pose, EQ bars at a natural height. The player still shows WHICH sound is active, just without movement.

#### Crossfade: Always smooth

When sounds transition (owner changes config, seasonal mode shifts, or future sound-switching):

- **2.5 second crossfade**: Current sound fades out while new sound fades in simultaneously
- Both Audio elements active during the crossfade, old one disposed after fade completes
- Volume ramp uses `linearRampToValueAtTime` on the Web Audio API (or simple setInterval fallback)
- Crossfade is the only transition — never a hard cut, never silence between sounds

#### Color + theme

- **Player button**: Grove glassmorphic styling — `backdrop-filter: blur(12px)`, themed border, warm tint. NOT raw `rgba(255,255,255,0.8)`.
- **Expanded panel**: Same glass treatment, warm cream in light mode, warm dark in dark mode
- **Visualization colors**: Matched to the sound's nature — rain drops in soft blue-gray, fire in amber, EQ bars in grove-green, etc.
- **Dark mode**: Player glows slightly — it becomes the warm light source in the corner. Visualization colors brighten against the dark.

### Public component fixes

- [ ] **Fix sound set mismatch**: Align component's `SOUND_PRESETS` map with shared lib's `SoundSet` type (7 sounds, consistent names)
- [ ] **Source audio from R2**: Replace `/audio/ambient/*.mp3` paths with R2 CDN URLs
- [ ] **Expanded mini-player**: Replace 36px button with collapsible player (circle → panel)
- [ ] **Sound name display**: Show active sound name on hover (collapsed) and in panel (expanded)
- [ ] **Visitor volume control**: Slider in expanded panel, persisted to `localStorage`
- [ ] **Play state persistence**: Remember play preference in `localStorage`, offer resume on return
- [ ] **Sound-matched visualizations**: 7 unique CSS micro-animations, one per sound
- [ ] **Crossfade engine**: 2.5s crossfade between sounds, Web Audio API gain ramps
- [ ] **Seasonal auto-selection**: Season + time-of-day logic with owner override support
- [ ] **Replace hardcoded rgba colors** with grove glassmorphic styling
- [ ] **Dark mode warmth**: Player glows, visualization colors brighten
- [ ] **Respect `prefers-reduced-motion`**: Static visualization frames, no animation, crossfade still works (audio)
- [ ] **Add cache headers to API response**: 60s max-age + 120s stale-while-revalidate (matches other curios)

### API fixes

- [ ] **Add seasonal mapping to config**: `seasonal_map` JSON field — `{ spring: "morning-birds", summer: "creek", autumn: "forest-rain", winter: "fireplace" }` (owner-overridable defaults)
- [ ] **Add time-of-day awareness field**: `time_aware` boolean (default true) — enables night/morning overrides
- [ ] **Add cache headers**: Public GET should set `Cache-Control: public, max-age=60, stale-while-revalidate=120`
- [ ] **Validate sound set against updated enum** (remove old mismatched names)

### Admin fixes

- [ ] **Preview/test play button**: Hear the sound before saving (uses R2 URLs directly)
- [ ] **Seasonal mapping editor**: When "Seasonal" is selected, show a 4-row form: Spring→[dropdown], Summer→[dropdown], etc. Pre-filled with defaults, owner can remap.
- [ ] **Time-of-day toggle**: "Also adjust for time of day" checkbox with explanation
- [ ] **Custom audio upload**: Replace raw URL field with Custom Uploads picker (Oak+)
- [ ] **Visualization preview**: Show the micro-animation for the selected sound in the admin
- [ ] **Migrate from lucide-svelte** to engine icons (Volume2)

### Migration needs

- [ ] New columns on `ambient_config`:
  - `seasonal_map TEXT DEFAULT NULL` — JSON mapping of season→soundSet (null = use defaults)
  - `time_aware INTEGER DEFAULT 1` — whether seasonal mode adjusts for time of day
- [ ] **Fix sound set enum**: Update `SoundSet` type to include `coffee-shop`, remove old mismatched names
- [ ] **Audio assets**: Source, license, and upload 7 royalty-free loopable audio files to R2 at a standard path (e.g., `static/audio/ambient/{sound-set}.mp3`)

### Audio sourcing expedition (required before this curio ships)

The 7 sound files need to be sourced. Requirements:

- **Royalty-free / CC0**: No licensing entanglements
- **Seamlessly loopable**: No audible loop point — the end crossfades into the beginning
- **High quality**: 128kbps+ MP3, clean recording, no artifacts
- **Duration**: 2-5 minutes per loop (long enough to not feel repetitive, short enough for reasonable file size)
- **File size target**: Under 3MB each (~20MB total for the library)
- **Sources to explore**: Freesound.org, BBC Sound Effects (remixable), Pixabay audio, or commission custom recordings

This is a creative sourcing task, not a coding task. Needs human curation.

---
