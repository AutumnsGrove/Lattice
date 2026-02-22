---
title: "Curio Safari — Polish Plan"
status: planned
category: safari
---

> **Note**: Individual agent-handoff files have been extracted to [`planned/curios/`](curios/). This file remains as the full source reference.

# Curio Safari — Polish Plan

> Comprehensive review of all 22 curios. Each curio gets its own character.
> **Aesthetic principle**: Mix — curio-dependent. Retro curios lean web1.0, organic curios lean nature. Grove palette throughout.
> **Scope**: Both admin + public components, reviewed holistically.

---

## Ecosystem Overview

**22 admin pages** in `/arbor/curios/`
**15 hydration components** in `src/lib/ui/components/content/curios/`
**22 shared libs** in `src/lib/curios/*/index.ts`

### Curios by category

**Retro/Web1.0 vibe**: hitcounter, badges, guestbook, webring, blogroll
**Organic/Nature vibe**: moodring, nowplaying, ambient, cursors, shrines
**Functional/Utility**: polls, activitystatus, statusbadge, hitcounter, bookmarkshelf, linkgarden, artifacts
**Creative/Personal**: clipart, customuploads, gallery, journey, timeline, pulse

---

## 1. Hit Counter

**Character**: Grove-ified retro. Retro SHAPES, nature PALETTE. Each style is a _personality_ — its own entrance, its own daylight feel, its own night-mode glow.

### Design spec (safari-approved)

**4 styles, each fully realized:**

#### Classic — Frosted glass digit cells

- Each digit in its own frosted glass cell (not opaque black)
- Grove-green text with subtle glow bleeding through glass
- Entrance animation: Fade in with green glow pulse
- Night mode: Glass cells glow warmer, green becomes more luminous against dark. Like a display case lit from within.

#### Odometer — Warm mechanical flip counter

- Cream/parchment digit cards in brass/gold bezels
- Glass-fronted — like looking through a display case at a brass instrument
- Entrance animation: CSS flip animation, digits roll into place (~1.5s)
- Night mode: Warm lamplight feel. Brass catches amber light, cream darkens to warm tan.
- Respects prefers-reduced-motion (instant position, no flip)

#### LCD — Full seven-segment display

- Actual CSS seven-segment characters with GHOSTED inactive segments visible behind active ones
- Leaf-green tint on the "screen" panel
- Entrance animation: LCD flicker-on, like powering up a calculator
- Night mode: "Clock on the nightstand" vibe. Screen glow becomes the primary light source. Deeper black surround.

#### Minimal — Subtle accent text

- Number in grove-green, rest in muted text
- Tiny leaf or dot separator between label and number
- Entrance animation: None — just appears. Minimal means minimal.
- Night mode: Green brightens slightly, muted text warms.

### Label system

- **Presets + free text**: Offer warm presets with custom option
  - "You are visitor" (default)
  - "Wanderer #"
  - "Welcome, traveler #"
  - "Soul #"
  - Custom (free text, max 100 chars)
- **Toggle to hide label entirely** — some people want just the number

### Since-date display

- **Owner's choice** between two presentations:
  - **Footnote**: Small muted italic below digits — "counting since Jan 2026"
  - **Integrated**: Etched/engraved into the counter frame — like a plaque date on a brass instrument
- Toggle to hide entirely (existing `showSinceDate` field)

### Dedup strategy

- **Owner-configurable**: "every visit" or "unique daily"
- Unique daily: `SHA-256(ip + userAgent + date + pagePath)` checked against `hit_counter_visitors` table
- Privacy-preserving — no PII stored, hash is one-way
- New field on config: `countMode: "every" | "unique"`

### Public component fixes

- [ ] Implement all 4 styles (currently only classic renders)
- [ ] Use `style` field from API to select renderer
- [ ] Render label from API data
- [ ] Render since-date with owner's chosen presentation
- [ ] Replace hardcoded colors with CSS custom properties / grove palette
- [ ] Add dark mode / night-mode character per style
- [ ] Add style-dependent entrance animations
- [ ] Respect `prefers-reduced-motion` (instant states, no animation)

### API fixes

- [ ] Add `countMode` field to config (`"every" | "unique"`)
- [ ] Create `hit_counter_visitors` table for dedup hashes
- [ ] Implement daily hash dedup when `countMode === "unique"`
- [ ] Add since-date display style field (`"footnote" | "integrated"`)

### Admin fixes

- [ ] Add label presets dropdown + custom input
- [ ] Add count mode toggle (every visit vs unique daily)
- [ ] Add since-date display style picker
- [ ] Update live preview to match all 4 grove-ified styles

---

## 2. Mood Ring

**Character**: Mystical artifact. Glass surface with color swirling beneath, like liquid aurora trapped in crystal. The most visually enchanting curio in the system. Never static — always shifting, always alive.

### Critical finding: Public component ignores displayStyle

The admin has 3 display styles with distinct CSS (ring=glowing circle, gem=rotated diamond with light, orb=radial gradient with double shadow). The public component ignores `displayStyle` entirely and always renders a plain 2rem circle with a 3px border and crude `{color}22` fill. No glow, no animation, no life. Also: color schemes are single static hex values, time mode snaps between 7 discrete colors, random mode changes every ~10 seconds (jarring), and the component uses its own season logic instead of Grove's.

### Design spec (safari-approved)

**7 display shapes (expanded from 3):**

1. **Ring** — Hollow circle with glowing, shifting border. Aurora gradient rotates around the ring.
2. **Gem** — Rotated diamond with faceted light refraction. Light plays across facets.
3. **Orb** — Sphere with radial gradient + depth. Color swirls in the center.
4. **Crystal** — Elongated hexagon with prismatic color shift.
5. **Flame** — Teardrop pointing up with warm flicker animation.
6. **Leaf** — Organic grove-native shape. Color flows through it like sap.
7. **Moon** — Crescent that could fill/empty with mood intensity.

**Aurora effect: Animated gradient**

- CSS conic-gradient or radial-gradient that slowly rotates/shifts
- Two colors from the active palette blending into each other, always moving
- Each shape inherits the gradient animation but it manifests naturally per shape
- Respects `prefers-reduced-motion` (static gradient, no animation)

**Time-based mode: Smooth interpolation**

- CSS color interpolation between time periods
- Ring gradually shifts from dawn-gold to morning-green over 2 hours
- Never snaps, never static — living, breathing color
- Replace discrete 7-period lookup with continuous interpolation function

**Color schemes: Palette + mood mapping**

- Each scheme becomes a language mapping moods to colors:
  - **Default**: happy=grove-green, calm=soft-teal, tired=warm-amber, sad=muted-blue, energetic=bright-lime
  - **Warm**: happy=gold, calm=amber, tired=rust, sad=warm-clay, energetic=coral
  - **Cool**: happy=sky-blue, calm=teal, tired=slate, sad=deep-blue, energetic=bright-cyan
  - **Forest**: happy=bright-moss, calm=deep-evergreen, tired=bark-brown, sad=rain-gray, energetic=spring-lime
  - **Sunset**: happy=amber, calm=coral, tired=violet, sad=deep-plum, energetic=hot-orange
- In manual mode, owner picks a mood from the scheme's vocabulary (not raw hex)
- Scheme defines the visual dialect — same mood, different color language

**Mood log: Optional public dot constellation**

- Owner can toggle public visibility of the mood log
- Displays as scattered dots in a small field (not a strict line) — like stars
- Recent moods are brighter and more vivid, older ones fade and dim
- Hover a dot to see mood name + note + date
- Organic and irregular, not mechanical or chart-like

**Random mode fix:**

- Current: changes every ~10 seconds (jarring)
- New: slow continuous drift between palette colors. Seeded per-visit for consistency during a session, but different each visit.

**Seasonal mode fix:**

- Use Grove's existing season system instead of separate month-based logic
- Tie into the nature palette system (`getSeasonalGreens()`, etc.)

### Public component fixes

- [ ] Implement all 7 display shapes with proper CSS
- [ ] Add aurora animated gradient effect per shape
- [ ] Implement smooth color interpolation for time-based mode
- [ ] Replace static color schemes with mood-mapped palettes
- [ ] Add optional dot constellation mood log display
- [ ] Fix random mode to use slow continuous drift
- [ ] Fix seasonal mode to use Grove's season system
- [ ] Replace crude `{color}22` fill with proper glass/translucency
- [ ] Add proper glow/shadow effects per shape
- [ ] Respect `prefers-reduced-motion` (static colors, no animation)
- [ ] Dark mode: artifact should glow more prominently against dark backgrounds

### Admin fixes

- [ ] Update shape picker to include all 7 shapes with visual previews
- [ ] Add mood vocabulary picker when scheme is selected (map moods to colors visually)
- [ ] Add mood log public visibility toggle
- [ ] Update preview to match aurora gradient effect
- [ ] Consider: emoji picker for mood log entries (supplement color with emotion)

---

## 3. Now Playing

**Character**: Your music, your way, your story. Not just "what's playing" — it's _why_ you're listening, where you found it, what it means to you right now. A deeply personal curio where the track is the seed but the texture is the soul. Every style is a different room in the same house: a record shop, a late-night radio booth, a living room stereo, a boombox on a stoop.

**Connected species**: Now Playing is cousins with **Hum**, the engine's markdown music link preview system. Hum already speaks the language of 7+ music providers (Spotify, Apple Music, SoundCloud, Tidal, Deezer, Bandcamp, Amazon Music), resolves metadata, renders glassmorphic cards with album art and platform trays. Now Playing builds on that shared vocabulary rather than reinventing it. Hum provides the data layer; Now Playing provides the personality.

### Safari findings: What exists today

**Public component** (`CurioNowplaying.svelte`) — actually decent bones:

- [x] Animated equalizer bars (3-bar bounce) with `prefers-reduced-motion` fallback
- [x] Album art display (48x48) with fallback music note SVG
- [x] Italic fallback text ("the forest rests") — genuinely warm
- [x] Accessible `role="status"` and `aria-label`
- [x] Skeleton loader during fetch, error state handling
- [ ] **Only renders compact style** — 4 styles in data model, 1 in reality
- [ ] Equalizer bars hardcode `#4ade80` instead of grove-green CSS var
- [ ] Fallback music note SVG is plain gray — no warmth
- [ ] No display style switching at all — `style` field from API is ignored

**Admin** (`/arbor/curios/nowplaying/`) — solid foundation:

- [x] Current track display with album art
- [x] Manual track entry form (song, artist, album, art URL)
- [x] Provider radio buttons (Manual, Spotify, Last.fm)
- [x] Display style selector (Compact, Card, Vinyl, Minimal) — 4 options with descriptions
- [x] Toggle album art, toggle progress bar (Spotify-only)
- [x] Customizable fallback text
- [x] Last.fm username field (conditional)
- [x] Recent listens history (last 20) with relative timestamps
- [x] Clear history with confirmation modal
- [x] GlassCard/GlassButton engine components, toast feedback
- [ ] Spotify/Last.fm are stubs — provider infrastructure exists but no actual API integration
- [ ] Warm subtitle: "Share what you're listening to — music fills the grove."

**Shared lib** (`src/lib/curios/nowplaying/index.ts`) — well-structured:

- Types: `NowPlayingProvider`, `NowPlayingStyle`, `NowPlayingConfig`, `NowPlayingTrack`, `NowPlayingHistoryEntry`
- Sanitization: HTML stripping, length limits, username validation
- History formatting: "just now", "5m ago", "Dec 1"
- Constants: max 200 char track/artist, 50 history entries, default fallback text
- Tests: comprehensive Vitest suite

**API** — complete CRUD:

- `GET /api/curios/nowplaying` — public track data, 30s cache + 60s stale-while-revalidate
- `POST /api/curios/nowplaying` — set manual track (admin), auto-prunes to 50 entries
- `DELETE /api/curios/nowplaying` — clear history (admin)
- `GET/POST /api/curios/nowplaying/config` — config CRUD (admin)

**Hum system** (engine, not curio — but relevant):

- 9 files in `src/lib/ui/components/content/hum/`
- `HumCard.svelte` — glassmorphic card with album art, track info, provider badge, platform tray
- `HumPlatformTray.svelte` — expandable "listen on other platforms" links
- `HumProviderBadge.svelte` — colored provider icons
- `HumCardSkeleton.svelte` / `HumCardFallback.svelte` — loading/error states
- `providers.ts` — URL pattern detection for 7 providers with brand colors
- `types.ts` — `HumMetadata`, `HumProvider`, `HumProviderInfo`
- Markdown-it plugin: detects bare music URLs in posts, replaces with hydrating `<div class="hum-card">` placeholders
- `/api/hum/resolve` — server-side metadata resolution (~13KB)
- `ContentBody.svelte` — DOMPurify allowlists `data-hum-url` and `data-hum-provider` attrs

**Database** (migration 062):

- `nowplaying_config` — tenant settings (provider, style, flags, tokens, fallback text)
- `nowplaying_history` — listening records (track, artist, album, art URL, played_at)

### Design spec (safari-approved)

#### Philosophy: Your music, your room

Now Playing is the curio with the most _personal expression_. The owner picks a style that matches their personality — not just how the music looks, but how their relationship with music _feels_. A vinyl person and a boombox person are making fundamentally different statements about who they are.

#### 8 display styles (expanded from 4)

Each style is a fully realized room. Not a CSS variant — a personality.

| Style        | Visual                                                                 | Feel                                                                                                 | Key animation                                                      |
| ------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Compact**  | Tight horizontal bar. Album art thumb + text + tiny equalizer          | Sidebar widget. Efficient, unobtrusive. Music is present but not center stage.                       | Subtle equalizer pulse                                             |
| **Card**     | Larger card with prominent album art, text below                       | Blog card energy. The album is the hero. Clean, editorial.                                           | Gentle hover lift                                                  |
| **Vinyl**    | Spinning record with album art as the label. Tonearm rests on the edge | Audiophile warmth. The act of _playing_ is visible. Analog soul.                                     | Record spins slowly when playing, tonearm drops                    |
| **Minimal**  | Just text. Track — Artist. Maybe a tiny dot indicator                  | The music speaks for itself. No decoration. For people who find beauty in restraint.                 | Dot pulses when playing                                            |
| **Cassette** | Cassette tape with visible reels. Hand-written label with track name   | Mixtape energy. "I made this for you." Lo-fi, personal, nostalgic. Reels turn when playing.          | Reels rotate, tape label in handwriting font                       |
| **Radio**    | Glowing radio tuner dial. Frequency numbers, warm amber backlight      | Late night DJ booth at 2am. The music IS the light source. Intimate, quiet, glowing in the dark.     | Dial glows warmer when playing, subtle static crackle              |
| **Boombox**  | Chunky retro boombox with speaker grills, VU meters                    | Street corner meets living room. Bold, fun, unapologetic. Bass-forward energy.                       | VU meters bounce with implied audio, speaker grills vibrate subtly |
| **Hum Card** | Full HumCard embed — glassmorphic, platform tray, provider badge       | Maximum information. Album art, track, artist, album, "listen on" links. Uses actual Hum components. | Inherits Hum's hover lift + tray expand                            |

#### Hum Card integration (connected species)

The "Hum Card" style is special — instead of rendering its own UI, Now Playing renders an actual `HumCard` component from the engine, passing the current track's URL/metadata. This means:

- Full platform tray ("Listen on Spotify, Apple Music, YouTube Music...")
- Provider badge with brand colors
- Glassmorphic styling consistent with Hum cards in blog posts
- Album art at 80x80 (larger than compact's 48x48)
- If the owner has a URL for the track, Hum resolves full metadata
- If manual-only (no URL), falls back to a simplified card with the entered data

This creates a beautiful bridge: music links in blog posts (Hum) and the "currently listening" curio (Now Playing) share a visual language. Your site speaks music consistently.

#### Texture layer: Why you're listening

The track is just the beginning. The owner can optionally add _context_ — personal notes that give the music meaning:

**Fields:**

- **Note** (free text, max ~280 chars) — "this one hits different at 3am" / "on repeat all week" / "makes me think of Portland"
- **Source** (free text, max ~140 chars) — "found this on the subway" / "from a friend's playlist" / "Discover Weekly gem" / "the barista was playing this"
- **Mood tag** (optional, connects to Mood Ring curio vocabulary if enabled) — happy, melancholy, energetic, cozy, wistful

**Display (owner's choice per track):**

- **Show note**: Note/source visible alongside track info. The texture IS the curio. For tracks that need the story told.
- **Tuck underneath**: Clean surface with music info. Hover/tap reveals the personal layer in a warm tooltip/expandable. Discovery moment. For tracks where the music should speak first.
- **Hidden**: Just the track. Some songs don't need explaining.

Each track entry in the history can have its own visibility setting — one track shows the note proudly, the next keeps it tucked.

#### Listening history: Previously on...

The existing history system (max 50 entries) gets a public face:

- **Recent tracks** as a small scrollable list or fading stack below the current track
- Each entry shows: track name, artist, relative timestamp ("5m ago", "yesterday")
- Entries with texture notes show a subtle indicator (small quote icon or warm dot)
- Clicking a history entry could expand it to show the full note/source
- History display is toggleable by the owner (some people want the feed, others just want "now")
- **History style inherits from the main display style** — vinyl history feels different from boombox history

#### Fallback states

When nothing is playing, the curio doesn't die — it breathes:

- **Default**: "the forest rests" in italic, warm muted text (existing, keep this)
- **Owner-customizable fallback text** (existing, keep this)
- **Style-appropriate rest states**:
  - Vinyl: record still, tonearm lifted
  - Cassette: tape paused, reels still
  - Radio: dial glows dimmer, "off air" energy
  - Boombox: VU meters flat, speakers quiet
  - Compact/Card/Minimal: just the fallback text

#### Color + theme

- Replace all hardcoded `#4ade80` with `rgb(var(--grove-500))` or CSS custom properties
- Equalizer bars: grove-green with subtle glow
- Fallback music note SVG: warm grove-green instead of gray
- Dark mode: styles should glow more — the vinyl record catches light, the radio dial is the brightest thing, the cassette label reads under lamplight
- Each style has its own dark mode character, not just inverted colors

### Provider integration (future trek, not this stop)

Manual-only for now. Provider integration is a separate expedition, but the plan is:

- **Last.fm** (simplest): Public API, polling-based. Fetch recent tracks on a timer. No OAuth needed.
- **Spotify**: OAuth PKCE flow → access token → "currently playing" endpoint. Needs token refresh, scrobble detection.
- **Generic URL**: Owner pastes a track URL → Hum's `/api/hum/resolve` resolves metadata. Not "live" but bridges to Hum's provider detection.

When providers land, the existing `nowplaying_config.provider` field and encrypted token columns in the DB are ready. The admin already has provider radio buttons. The plumbing exists — it just needs water.

### Public component fixes

- [ ] **Implement all 8 display styles** with full visual character
- [ ] **Hum Card style**: render actual `HumCard` component with current track data
- [ ] **Texture layer**: note, source, mood tag display with owner's visibility choice per track
- [ ] **Listening history**: recent tracks list below current track (toggleable)
- [ ] **History entries with notes**: show indicator, expandable on click
- [ ] **Style-appropriate fallback states** (vinyl still, radio dim, cassette paused, etc.)
- [ ] **Replace hardcoded `#4ade80`** with grove-green CSS vars
- [ ] **Warm up fallback SVG** — grove-green instead of gray
- [ ] **Dark mode character** per style (glow, warmth, not just inversion)
- [ ] **Respect `prefers-reduced-motion`**: no spinning vinyl, no rotating reels, no bouncing VU meters — but keep color and layout

### API fixes

- [ ] Add `note` field to history entries (free text, max 280 chars)
- [ ] Add `source` field to history entries (free text, max 140 chars)
- [ ] Add `mood` field to history entries (optional, ties to mood ring vocabulary)
- [ ] Add `noteVisibility` field to history entries ("show" | "tuck" | "hidden")
- [ ] Add `trackUrl` field to history entries (optional, for Hum Card integration)
- [ ] Add `showHistory` boolean to config (public history toggle)
- [ ] Expand display style enum to include new styles: "cassette" | "radio" | "boombox" | "humcard"

### Admin fixes

- [ ] Update style picker to show all 8 styles with visual previews
- [ ] Add note/source/mood fields to manual track entry form
- [ ] Add note visibility selector per track ("show note" / "tuck underneath" / "hidden")
- [ ] Add track URL field (optional, for Hum Card resolution)
- [ ] Add "Show listening history publicly" toggle
- [ ] Add live preview that switches between styles
- [ ] Keep the warm subtitle: "Share what you're listening to — music fills the grove."

### Migration needs

- [ ] New columns on `nowplaying_history`: `note TEXT`, `source TEXT`, `mood TEXT`, `note_visibility TEXT DEFAULT 'hidden'`, `track_url TEXT`
- [ ] New column on `nowplaying_config`: `show_history INTEGER DEFAULT 0`
- [ ] Expand `display_style` CHECK constraint to include new style values

---

## 4. Guestbook

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

---

## 5. Badges

**Character**: Glass ornaments. Translucent, precious, catches the light. Collectible treasures displayed in your personal cabinet of wonders.

### Current state

- 12 system badges (auto-awarded milestones), 4 community badges (Wayfinder-awarded), custom badges (Oak+ only, max 10)
- Rarity: common (gray), uncommon (green), rare (blue) — also epic (purple) and legendary (amber) defined but unused
- Public component renders pill-shaped items with icon + name + rarity border glow on showcased badges
- Admin has showcase toggle (max 5), custom badge creation (URL-based icons), system badge catalog

### Public component issues

- [ ] **Tiny and flat**: 24px icons in pill shapes — no character, no weight, no collectible feel
- [ ] **No showcase vs. collection distinction**: Showcased badges look the same as non-showcased (just a border color)
- [ ] **Rarity colors are generic**: Gray/green/blue don't feel Grove. Should use grove palette (bark/leaf/gold)
- [ ] **No hover detail**: Title attribute only — could show a proper tooltip/popover with description + earned date
- [ ] **No empty state personality**: "No badges earned yet" is flat. Could tease what's available.

---

### Badge Design Spec

#### Physical metaphor: Glass ornament

Each badge is a **frosted glass pane** — content floating behind translucent glass with blurred edges and cream/white tint. Like holding sea glass up to the light. Gossamer-ready for enhanced depth when available.

#### Badge content: Icon + label

- Icon/illustration centered, label below/etched into glass bottom edge
- **Icon registry pattern**: Badge icon registry maps IDs → Lucide (now) → AI-generated (next) → custom SVG (goal). One swap in registry, all badges update. Same pattern as engine's `lucide.ts` chain.

#### Category shapes

| Category              | Shape          | Why                                  |
| --------------------- | -------------- | ------------------------------------ |
| **Retro web**         | Rectangle      | Nod to classic web button, but glass |
| **Pride & identity**  | Shield / heart | Protection, love                     |
| **Seasonal & nature** | Leaf / circle  | Organic, cyclical                    |
| **Achievement**       | Star / medal   | Earned, proud                        |

#### Size: User-selectable

- **Small** (48-64px) — compact, dense collection, details on hover
- **Medium** (80-96px) — balanced, readable at a glance
- **Large** (120-160px) — statement pieces, glass effect shines

#### Rarity: Clarity + glow + depth (felt through the glass)

| Rarity        | Glass clarity       | Glow                             | Depth                   |
| ------------- | ------------------- | -------------------------------- | ----------------------- |
| **Common**    | Cloudy/frosted      | None                             | Simple flat pane        |
| **Uncommon**  | Clearer             | Soft warm edge glow              | Slight depth            |
| **Rare**      | Crystal clear       | Visible aura, rainbow refraction | Noticeable depth        |
| **Epic**      | Deep, gemstone-like | Gentle pulse                     | Visible internal layers |
| **Legendary** | Prismatic, alive    | Inner light, radiance            | Multiple depth layers   |

#### Pride badges: Glass IS the flag

Frosted glass pane tinted with flag colors — like stained glass segments. Trans pride = pink→white→blue glass. The flag isn't behind glass — it IS the glass.

#### Wall layouts (user-selectable)

- **Pinboard** — organic scatter, cork warmth, slightly rotated badges
- **Shadow box** — neat grid, glass case. Museum-like but cozy.
- **Journal page** — cream background, scattered like diary stickers

#### Showcase styles (user-selectable)

- **Glowing shelf** — glass shelf above wall, badges float with soft glow
- **Pinned to header** — badges near site name/bio, like lapel pins
- **Larger + centered** — inline with wall but emphasized with shimmer

#### Micro-interactions

- **Hover**: Warm glow + slight lift (glass catching light)
- **Click**: Expand to detail card (description, earned date, rarity)
- **Sound**: Subtle glass clink on hover (mutable, respects preferences)
- **Page load**: Badges wobble/settle into place (respects `prefers-reduced-motion`)

---

### Pre-built Badge Library

**Icon source strategy** (layered, swap-friendly via central registry):

1. **Now**: Lucide icons — fastest, consistent
2. **Next**: AI-generated for gaps Lucide can't fill — refined/vectorized
3. **Goal**: Custom SVG illustrations — most unique, most Grove

**Categories** (all four):

#### Retro Web Badges

- [ ] "Made with Grove" / "Powered by Grove"
- [ ] "Powered by Svelte" / "Built with SvelteKit"
- [ ] "Best viewed in Firefox" / "Best viewed in Arc"
- [ ] "This site is handmade"
- [ ] "No algorithms here"
- [ ] "Indie web citizen"
- [ ] "Webmaster" / "Webgardener"
- [ ] "HTML was my first language"
- [ ] "RSS is not dead"
- [ ] "No cookies (just vibes)"
- [ ] "Under construction" (retro aesthetic)

#### Pride & Identity Badges

- [ ] Full pride flag set (rainbow, trans, bi, pan, ace, aro, nonbinary, lesbian, gay, genderqueer, genderfluid, intersex, polyamorous, agender, demisexual, progress flag)
- [ ] Pronoun badges (he/him, she/her, they/them, he/they, she/they, any pronouns, ask me)
- [ ] "This site is queer"
- [ ] "Safe space"
- [ ] "Allies welcome"

#### Seasonal & Nature Badges

- [ ] Spring blossom, Summer sun, Autumn leaf, Winter frost
- [ ] Mushroom collector
- [ ] Night owl / Early bird
- [ ] Stargazer
- [ ] Rain lover
- [ ] Firefly catcher
- [ ] Forest dweller
- [ ] Moonchild

#### Achievement Badges (visual upgrade of existing 12)

- [ ] Redesign all 12 system badges with Grove character (not generic icons)
- [ ] Early Adopter → special seedling-to-tree badge
- [ ] First Post → quill/ink badge
- [ ] Centurion → golden oak
- [ ] Night Owl / Early Bird → actual owl/bird illustrations
- [ ] Seasonal → four-season ring

### Other badge improvements

- [ ] **Badge wall display**: Configurable layout (pinboard / shadow box / journal page)
- [ ] **Showcase**: Configurable style (glowing shelf / pinned to header / larger+centered)
- [ ] **Badge builder** (future): Pick shape, colors, icon, text
- [ ] **Image upload**: Wire into Custom Uploads curio (R2-backed, 100-image quota)
- [ ] **Trading/gifting** (future): Let tenants gift custom badges to each other

### Admin

- [ ] (Good foundation — showcase toggle, custom creation, system catalog)
- [ ] Add badge preview at all 3 sizes (small/medium/large)
- [ ] Add wall layout + showcase style selectors
- [ ] Add image upload via Custom Uploads picker
- [ ] Badge icon registry for swappable artwork sources

---

## 6. Blogroll

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

## 7. Webring

**Character**: Retro web solidarity. The original social network — linking to your neighbors. Circular navigation between a group of sites that chose each other.

### Public component issues

- [ ] **Only renders "classic" style**: Data model has 4 styles (classic bar, 88x31 badge, compact, floating) — public ignores `badgeStyle`, always renders classic bar
- [ ] **Hardcoded `#4ade80` everywhere**: Nav buttons, borders, hover states — all raw green hex
- [ ] **No ring identity**: Just text. No ring icon, no member count, no "you are site 7 of 42"
- [ ] **Position field ignored**: Model has footer/header/sidebar/floating positions — component doesn't use them

---

### Webring Design Spec

#### Render all 4 display styles

| Style           | Look                            | Feel                                                                   |
| --------------- | ------------------------------- | ---------------------------------------------------------------------- |
| **Classic bar** | `← Prev \| Ring Name \| Next →` | The standard. Warm it up with grove colors, subtle glass backing.      |
| **88x31 badge** | Tiny rectangular button         | THE indie web format. Already in the data model! Just needs rendering. |
| **Compact**     | Text-only inline links          | Minimal footprint. For footers or sidebars where space is tight.       |
| **Floating**    | Fixed-position corner widget    | Always visible. A gentle "this site is part of something."             |

#### Ring identity

- Show ring icon/avatar if available
- Member count: "1 of 42 sites"
- Ring description on hover/expand
- Color theming per ring (owner can pick accent color per ring membership)

#### Grove palette

Replace all `#4ade80` with `rgb(var(--grove-500))`. Borders, hover states, text — everything through theme vars.

#### Position support

Actually USE the position field: footer (default), header, right-vine sidebar, floating corner. The component already has the data — just needs to render differently based on it.

### Admin

- [ ] (Good foundation — create/join rings, manage membership, ring settings)
- [ ] Add ring accent color picker
- [ ] Show position preview in admin
- [ ] Display style preview for all 4 options

---

### SAFARI DISCOVERY: Address Book & @Mentions

> **Not a webring feature — a NEW system.** Emerged from exploring webrings. Webrings = circular ring navigation. @mentions = direct person-to-person links. Separate but related.

#### The Address Book

A personal directory of your people. Not a social graph — an address book. Like the one by the phone, names written in pen.

**Data model:**

```
AddressBookEntry:
  handle: "autumn"              — what you type after @
  name: "Autumn"                — display name
  url: "https://autumn.grove.place"  — where it links
  groveUser: true/false         — auto-resolved or manually added
  avatar: url | null            — from Grove profile or manual
  publicBlurb: "my partner in crime"  — visible to visitors (optional)
  privateNote: "met in Portland, loves matcha"  — only owner sees
  tags: ["friend", "creator"]   — for filtering/display
```

**Key decisions:**

- **Visibility**: Optional — owner chooses to show address book as a curio ("My People") or keep it private (just powers @mentions)
- **Separate from blogroll**: Address book = people you KNOW. Blogroll = sites you RECOMMEND. Different relationships, different intent.
- **Dual resolution**: Grove usernames auto-resolve. Non-Grove friends added manually with name + URL.
- **Per-entry notes**: Public blurb (how you introduce someone to visitors) + private note (just for you). Owner chooses per entry.

#### @Mentions in Markdown

New markdown directive: `@autumn` → parsed by markdown-it → looks up handle in address book → renders warm link.

- Works in blog posts, pages, anywhere markdown is rendered
- If handle not in address book, renders as plain text (no broken links)
- Warm link styling — not a cold hyperlink, a MENTION. Maybe grove-green underline, subtle glow on hover.

#### Notifications

When a Grove user is @mentioned by another Grove user:

- Quiet internal notification: "Someone mentioned you warmly"
- Not pushy, not anxiety-inducing — a gentle tap on the shoulder
- No notification for non-Grove manual entries (they're external links)

#### Relationship to other curios

- **Blogroll**: Separate. Blogroll = recommendations. Address book = relationships. They can coexist.
- **Webring**: Separate. Webring = ring membership. Address book = personal connections. Different structures.
- **Badges**: Could earn "Connected" badge for having 10+ address book entries. Social butterfly of the grove.

---

## 8. Link Garden → Shelves Absorption

**Status**: MERGED INTO SHELVES (Section 11)

**Character**: Link Garden was a curated link collection — personal directories of the internet's best spots. After consultation with Hailu (Arusha village, link curation expert with 10,000+ hand-selected links), we determined that Link Garden and Shelves are fundamentally the same furniture: _containers of items with URLs, titles, descriptions, and categories_. The difference is richness, not kind.

**Decision**: Link Garden merges into Shelves as a **Links preset**. All unique Link Garden features (88×31 buttons, marquee scroll, auto-favicon, lightweight items) are absorbed into the Shelves system. Some features (88×31, marquee, auto-favicon, smart fetch) become universally available to all shelf presets.

### What existed (2,468 lines, 9 files)

- **Migration 061**: `link_gardens` + `link_garden_items` tables
- **Shared lib**: 273 lines — types, 4 styles (list/grid/buttons/marquee), validation, sanitization
- **Public component**: 291 lines — fetches from `/api/curios/linkgarden`, renders list/grid layouts
- **Admin**: 672 lines — full CRUD for gardens and links
- **API**: 571 lines — public GET, admin CRUD across 3 route files
- **Tests**: 274 lines — 42 tests covering all utilities

### What carries over to Shelves

#### New preset: Links

| Field                 | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| **Creator label**     | Source                                                                 |
| **Category defaults** | Owner-defined (no presets)                                             |
| **Status 1**          | Featured                                                               |
| **Status 2**          | Favorite                                                               |
| **Default display**   | Grid                                                                   |
| **Category grouping** | Optional, off by default — owner toggles "group by category" per shelf |

#### New display modes (available to ALL presets)

| Mode                | Visual                                                                                                                                                                             | Best for                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Buttons (88×31)** | Classic web button wall. Items display as 88×31 pixel images in a tight grid. Items without a thumbnail show a auto-generated text button.                                         | Links with retro web energy. But also: any shelf where the owner wants that aesthetic. |
| **Marquee**         | Horizontally scrolling strip of items. Smooth CSS animation. Pauses on hover/focus. Becomes static horizontal list with `prefers-reduced-motion`. Screen readers see a plain list. | Links, album names, short collections. Nostalgia mode for any shelf.                   |

**Marquee controls (owner-configurable):**

- Speed: slow (default) / medium / fast
- Direction: left-to-right (default) / right-to-left
- Pauses on hover/focus (always)
- Static fallback for `prefers-reduced-motion` (always)

#### New field: Thumbnail (all presets)

A general-purpose small secondary image field on all shelf items. Replaces Link Garden's `button_image_url`. Uses:

- **Buttons display mode**: The 88×31 button image
- **List/grid modes**: Optional small icon alongside the item (like a favicon)
- **Cover image takes precedence** in modes that use covers — thumbnail is the _small_ image

Auto-favicon (Google favicon service) is available as a fallback for any shelf item with a URL and no thumbnail. On by default for Links preset, off by default for others.

#### Smart fetch via Lumen/Shutter (universal, opt-in)

**Any shelf item** with a URL can use "Fetch from URL" — a button next to the URL field that auto-populates:

- Title (from `<title>` or OG title)
- Description (from meta description or OG description)
- Cover image (from OG image)
- Thumbnail/favicon (from favicon)
- Creator/source (from site name or OG site_name)

**How it works**: Calls Lumen's Shutter service to scrape metadata. Owner clicks the button explicitly — it's never automatic. Fetched data pre-fills the form but owner can edit before saving. Prevents unwanted overwrites.

**Links preset UX**: The add-item form shows URL only by default. After pasting a URL, the owner can either:

1. Click "Fetch details" to auto-fill everything, or
2. Expand progressive disclosure to manually enter title, description, category, etc.

This makes adding links feel as lightweight as Link Garden was — paste, fetch, done.

#### Category grouping (all presets, optional)

Category field already exists on shelf items. New per-shelf toggle: **"Group by category"**.

- **Off (default)**: Items display in sort order, categories shown as labels but no grouping.
- **On**: Items grouped under category headers within the shelf. Empty-category items appear in an "Uncategorized" group at the end.

### What gets removed

- [ ] **Delete `/arbor/curios/linkgarden/` admin route** — Shelves admin handles everything
- [ ] **Delete `/api/curios/linkgarden/` API routes** — Shelves API handles everything
- [ ] **Delete `CurioLinkgarden.svelte`** — Shelves component renders Links preset
- [ ] **Delete `src/lib/curios/linkgarden/` shared lib** — types/validation absorbed into bookmarkshelf lib
- [ ] **Remove `linkgarden` from curio-status registry** and markdown directives
- [ ] **Drop `link_gardens` and `link_garden_items` tables** — fresh start, no data migration (curio is new enough that no production data exists worth preserving)
- [ ] **Update `:::linkgarden` directive** to render as `:::bookmarkshelf` (or just remove it)

### Updated Shelves display mode table (complete)

With the absorption, Shelves now has **6 display modes**:

| Mode                | Visual                                                                    | Best for                 |
| ------------------- | ------------------------------------------------------------------------- | ------------------------ |
| **Spines**          | Colored spines in a row on a shelf. Title text vertical. Click to expand. | Books, zines, comics     |
| **Cover grid**      | Grid of cover images, title on hover. Pinterest energy.                   | Albums, movies, games    |
| **Card list**       | Vertical cards with cover, title, creator side by side.                   | Recipes, tools, articles |
| **Poster wall**     | Large covers in masonry layout. Statement pieces.                         | Movies, art prints       |
| **Buttons (88×31)** | Classic web button wall. Tight grid of small images.                      | Links, retro collections |
| **Marquee**         | Horizontally scrolling strip. Pauses on hover. Speed configurable.        | Links, short collections |

### Updated Shelves preset table (complete)

| Preset             | Creator label      | Category defaults                                                            | Status 1          | Status 2      | Default display |
| ------------------ | ------------------ | ---------------------------------------------------------------------------- | ----------------- | ------------- | --------------- |
| **Books**          | Author             | Fiction, Non-Fiction, Technical, Poetry, Zines, Comics, Essays, Memoir       | Currently Reading | Favorite      | Spines          |
| **Music / Albums** | Artist             | Rock, Electronic, Jazz, Hip-Hop, Folk, Classical, Ambient, Soundtrack        | Now Playing       | Favorite      | Cover grid      |
| **Movies & Shows** | Director / Creator | Drama, Comedy, Horror, Sci-Fi, Documentary, Animation, Thriller              | Watching          | Favorite      | Poster grid     |
| **Games**          | Studio             | RPG, Platformer, Puzzle, Strategy, Simulation, Adventure, Indie, Multiplayer | Playing           | Favorite      | Cover grid      |
| **Recipes**        | Creator / Source   | Breakfast, Lunch, Dinner, Dessert, Snack, Drink, Baking, Comfort Food        | Want to Make      | Favorite      | Card list       |
| **Links**          | Source             | (owner-defined)                                                              | Featured          | Favorite      | Grid            |
| **Custom**         | (you name it)      | (you define them)                                                            | (you name it)     | (you name it) | (you pick)      |

---

## 9. Activity Status

**Character**: A living indicator — a tiny candle in the window. Changes energy based on what kind of status it is. The fresher the status, the warmer the glow.

### Design spec (safari-approved)

**Living indicator system:**
The status pill's visual character shifts based on the status category:

- **Doing** statuses feel active (subtle shimmer/pulse)
- **Away** statuses feel quieter (muted, dimmer, slower)
- **Vibes** statuses feel warm (soft, dreamy, gentle)

**Color**: Owner-configurable per-status. Default colors assigned per category that owners can override. The pill background tints with the chosen color.

**Freshness system (dual-layer):**

- **Visual freshness**: Status glow/opacity subtly fades over time. Fresh = bright and warm, stale (24h+) = slightly muted. The candle dims.
- **Timestamp on hover**: Hovering/tapping reveals "set 5m ago" or "set 2d ago" in a tiny tooltip. Clean surface, detail on demand.
- Both layers work together — visitors intuitively sense freshness, curious ones can check.

**Icons:**

- Presets use Lucide icons for consistent rendering across platforms
- Custom statuses let the owner type any emoji they want
- Replaces the current Unicode text symbols (✎, ⌨, ☰) that render inconsistently

### Expanded preset library

**Existing categories (refreshed):**

- **Doing**: Writing, Coding, Reading, Gaming, Cooking, Creating
- **Away**: Away, Sleeping, On Vacation, Touching grass, Out for a walk
- **Vibes**: Listening to music, Watching something, Having tea, Night owl mode

**New: Creative subcategories:**

- Drawing, Painting, Streaming, Recording, Photographing, Crafting

**New: Social category:**

- Chatting, In a call, Hanging out, At an event, With friends

**New: Cozy category:**

- Napping, Candle lit, Rainy day in, Blanket mode, Hot chocolate

### Auto-status: "Just published"

- When owner publishes a new post, status auto-sets to "✎ Just published: [title]" for 24h
- **Smart default**: On by default for new accounts. Skipped if owner has manually set a status in the last 24h (don't overwrite their intention).
- Owner can clear it or set something else anytime
- Admin toggle: "Auto-set status when I publish a post"
- Uses existing `autoSource` field (set to `"publish"`)

### Public component fixes

- [ ] Replace `rgba(0,0,0,0.04)` gray pill with grove-styled glass chip
- [ ] Add category-dependent visual character (shimmer/muted/warm)
- [ ] Add owner-configurable color tinting on the pill
- [ ] Add visual freshness (glow fades over time since `updatedAt`)
- [ ] Add hover/tap tooltip showing relative time ("set 5m ago")
- [ ] Replace Unicode text symbols with Lucide icons for presets
- [ ] Keep emoji rendering for custom statuses
- [ ] Add warm fallback when no status is set (optional "Wandering the grove..." or just hide)
- [ ] Respect `prefers-reduced-motion` (disable shimmer/pulse, keep color)

### API fixes

- [ ] Add `color` field to ActivityStatusRecord (owner-chosen hex color)
- [ ] Add auto-publish status hook (trigger on post publish)
- [ ] Add `autoPublishStatus` boolean to curio config
- [ ] Ensure `updatedAt` is always populated (needed for freshness calc)

### Admin fixes

- [ ] Add color picker for custom statuses
- [ ] Add default color per category (overridable)
- [ ] Add new preset categories (Creative, Social, Cozy)
- [ ] Replace Unicode symbols with Lucide icon previews in preset buttons
- [ ] Add "Auto-set on publish" toggle
- [ ] Fix duplicate emoji: "Having tea" and "Touching grass" both use ⌇

---

## 10. Status Badge

**Character**: Garden signs. Little wooden or slate signs on stakes, planted in the soil of your grove to tell visitors the state of things before they read a word. "Under Construction 🚧" on a hand-painted plank. "Fresh Post ✏️" on a chalkboard wedged between the ferns. Not dashboard indicators — living, breathing markers that belong in the landscape.

**Design principle**: Status badges are the _weather flags_ of the indie web. You fly them so visitors know the climate. The preset library is a vocabulary, not a cage — owners can always create custom badges with any emoji, any text, any color.

### Safari findings: What exists today

**Public component** (`CurioStatusbadges.svelte`, ~130 lines):

- [x] Fetches from `/api/curios/statusbadge`, renders horizontal flex row
- [x] Emoji + text pill badges with pulse animation
- [x] `prefers-reduced-motion` respected (animation disabled)
- [x] Dark mode support (`:global(.dark)`)
- [x] Loading skeleton (3 placeholder pills)
- [x] Error state handling
- [ ] **Hardcoded `rgba(0,0,0,0.05)` backgrounds** — gray pills, no character
- [ ] **Only ONE visual style** — plain pills. No garden signs, no enamel pins, no personality
- [ ] **No color system** — all badges look identical regardless of type
- [ ] **No category grouping** — flat row of pills
- [ ] **Position field ignored** — data model has 4 positions (floating, header, right-vine, footer-vine), component renders inline-only
- [ ] **No custom text rendering differentiation** — custom text and default label look the same
- [ ] **Duplicated `.sr-only`** — defines its own instead of shared utility
- [ ] **`color-coded by status type` noted in old safari plan is WRONG** — all badges are the same gray

**Shared lib** (`src/lib/curios/statusbadge/index.ts`, ~170 lines):

- Types: `StatusBadgeType` (9 types), `BadgePosition` (4 positions), `BadgeTrigger` ("manual" | "auto"), `BadgeDefinition`, `StatusBadgeRecord`, `StatusBadgeDisplay`
- 9 preset definitions with name, description, emoji, trigger type
- Constants: 80 char custom text, 50 badges/tenant max
- Utilities: ID generation (`sb_` prefix), type/position validation, HTML stripping, display transform with date formatting
- **Well-tested**: 27 test cases covering all public functions

**Admin** (`/arbor/curios/statusbadge/`, ~490 lines total):

- [x] Badge type picker grid (9 types with emoji, name, description, "Auto" label)
- [x] Position selector (4 radio buttons)
- [x] Animation toggle, show-date toggle
- [x] Custom text input (80 char limit with live counter)
- [x] Live preview of selected badge
- [x] Active badges list with remove button
- [x] GlassCard layout, toast feedback
- [ ] **No edit form** — PATCH endpoint exists but no edit UI
- [ ] **No color picker** — all badges are the same gray
- [ ] **No display style picker** — only one style exists
- [ ] **No custom badge creation** — limited to 9 presets
- [ ] **Uses lucide-svelte directly** (ArrowLeft, Shield, Plus, Trash2, Eye)

**API** (2 route files):

- `GET /api/curios/statusbadge` — public, 60s cache + 120s stale-while-revalidate
- `POST /api/curios/statusbadge` — add badge (admin)
- `PATCH/DELETE /api/curios/statusbadge/[id]` — update/delete (admin)

**Database** (migration 059):

- `status_badges` table: id, tenant_id, badge_type, position, animated, custom_text, show_date, created_at
- Cascade delete from tenants, index on tenant_id

---

### Design spec (safari-approved, Bontu-consulted)

#### Philosophy: Weather flags for your garden

Status badges declare the state of your grove to anyone passing through. A visitor sees "🌱 Just Planted" and immediately understands: this place is new, be gentle, come back soon. They see "🚧 Under Construction" and know: things are changing, don't judge the scaffolding. They see "🕯️ Cozy Mode" and feel: this person is nesting, the tea is warm.

The 23-preset library covers the major site states, but owners can always plant a custom sign with any emoji and any words. The presets are a vocabulary. Custom is the freedom to say what only you would say.

#### 5 display styles (each a different material for the sign)

| Style              | Visual                                                                                 | Feel                                                                                              | Key detail                                                          |
| ------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Garden Signs**   | Wooden or slate sign shapes with hand-painted text. Slight wood-grain or stone texture | The grove default. Warm, earthy, hand-lettered. Like the signs in a botanical garden.             | Varied plank shapes, subtle grain, emoji as painted-on illustration |
| **Enamel Pins**    | Shiny collectible pin shapes with metal sheen, raised edges, drop shadow               | Jacket-on-a-bag energy. Each badge is a tiny treasure you collected. Proud, declarative.          | Metal rim, glossy fill, subtle shadow suggesting pin-back depth     |
| **Ribbon Banners** | Fabric ribbon shapes like conference badges. Slight drape/fold texture                 | Event energy. "I am THIS." Each ribbon a proud declaration pinned to your grove's lapel.          | Slight fold/wave in the ribbon shape, fabric texture hint           |
| **Glowing Chips**  | Clean rounded rectangles with colored glow, status-LED energy                          | Dashboard-meets-nature. Minimal, modern, each pulsing with its own light. Tech-cozy.              | Per-badge color glow, subtle pulse animation, clean typography      |
| **Wax Seals**      | Pressed wax stamp circles with embossed emoji in the center                            | Parchment-adjacent, medieval, precious. Each badge is an official decree sealed in wax. 📜 energy | Wax texture, stamp impression, slightly raised emboss effect        |

#### Color system: Owner-controlled with smart defaults

Every badge has a color. Default colors are assigned per badge type (warm and intentional), but the owner can override any badge's color.

**Default color families by category:**

| Category             | Default color family                  | Feeling                      |
| -------------------- | ------------------------------------- | ---------------------------- |
| **Site State**       | Amber / warm gold                     | Cautionary, transitional     |
| **Freshness**        | Grove green                           | Growth, life, new things     |
| **Personality**      | Soft purple / indigo                  | Quirky, personal, night-sky  |
| **Seasonal**         | Season-appropriate (ice blue, pink…)  | Time-aware, cyclical         |
| **Mood / Vibe**      | Warm earth tones (candle, clay, rust) | Emotional, cozy, atmospheric |
| **Community/Social** | Teal / sky blue                       | Open, welcoming, connected   |

**Per-badge override**: Owner picks a hex color. The badge's background, glow, border, and text accent all derive from this single color — light mode gets a tinted surface, dark mode gets a glow. One color input, multiple derived values.

**Style interaction**: The color manifests differently per display style:

- Garden Signs → tints the wood/slate stain
- Enamel Pins → fills the pin face
- Ribbons → dyes the fabric
- Glowing Chips → sets the glow color
- Wax Seals → tints the wax

#### Expanded preset library (23 badges, 7 categories)

**Site State** (manual — owner activates/deactivates):

| Badge               | Emoji | Description                     | Default Color |
| ------------------- | ----- | ------------------------------- | ------------- |
| Under Construction  | 🚧    | This site is a work in progress | Amber         |
| Coming Soon         | 🔮    | Something new is on the way     | Soft purple   |
| On Hiatus           | 🌙    | Taking a break — be back soon   | Muted blue    |
| Grand Opening       | 🎉    | Celebrate your launch!          | Bright gold   |
| Moved / New Address | 📦    | Site has moved to a new home    | Warm brown    |

**Freshness** (auto-detect — appear/disappear based on site activity):

| Badge        | Emoji | Trigger                  | Default Color |
| ------------ | ----- | ------------------------ | ------------- |
| Just Planted | 🌱    | Site < 7 days old        | Fresh green   |
| New & Shiny  | ✨    | Site < 30 days old       | Bright lime   |
| Fresh Post   | ✏️    | New post within 48 hours | Grove green   |
| Last Updated | 📅    | Shows last post date     | Sage green    |

**Personality** (auto-detect or manual):

| Badge      | Emoji | Trigger / Description              | Default Color |
| ---------- | ----- | ---------------------------------- | ------------- |
| Night Owl  | 🦉    | >50% of posts published at night   | Deep indigo   |
| Early Bird | 🌅    | >50% of posts published in morning | Warm peach    |
| Bookworm   | 📚    | 10+ posts tagged as book reviews   | Rich brown    |

**Seasonal** (time-aware — suggested by season, owner confirms):

| Badge           | Emoji | When                   | Default Color    |
| --------------- | ----- | ---------------------- | ---------------- |
| Hibernating     | ❄️    | Winter rest            | Ice blue         |
| Spring Cleaning | 🌸    | Spring refresh         | Cherry pink      |
| Anniversary     | 🎂    | Site birthday (yearly) | Celebratory gold |

**Mood / Vibe** (manual — owner sets the emotional weather):

| Badge       | Emoji | Description             | Default Color  |
| ----------- | ----- | ----------------------- | -------------- |
| Cozy Mode   | 🕯️    | Nesting, warm, slow     | Candle amber   |
| Chaos Mode  | 🌀    | Everything is happening | Electric teal  |
| Quiet Hours | 🤫    | Shhh — soft mode        | Muted lavender |

**Community / Social** (manual — signals to the wider web):

| Badge                 | Emoji | Description                    | Default Color |
| --------------------- | ----- | ------------------------------ | ------------- |
| Open Guestbook        | 📖    | Come sign my guestbook!        | Warm teal     |
| Looking for Friends   | 👋    | I'd love to connect            | Sky blue      |
| Webrings Welcome      | 🔗    | Open to joining webrings       | Soft green    |
| RSS Available         | 📡    | This site has an RSS feed      | Orange        |
| Accepting Submissions | 💌    | Send me things — I'm listening | Soft pink     |

#### Custom badges: Open to everyone

Beyond the 23 presets, any owner can create custom status badges:

- **Emoji**: Any single emoji (required)
- **Text**: Free text label, max 80 chars (required)
- **Color**: Hex color picker with smart defaults
- **Animated**: Toggle pulse animation on/off

Custom badges appear alongside presets in the badge row. No tier gate — custom expression is available to all.

#### Auto-detection system (designed now, built later)

9 of the 23 presets have auto-detect triggers. The spec defines WHEN they fire, but the actual detection logic is a future expedition:

**How auto-detect would work visually:**

- Auto badges **appear on their own** when conditions are met (site age, post recency, posting patterns)
- They show a subtle "✦ auto" indicator in the admin to distinguish from manually-added badges
- Owner can **dismiss** any auto-badge (it won't reappear for that trigger cycle)
- Owner can also **manually add** an auto-type badge to force it on regardless of conditions
- Auto badges respect the owner's chosen display style and color overrides

**Detection triggers (spec only — not building the Worker cron yet):**

- Just Planted: `tenants.created_at` < 7 days ago
- New & Shiny: `tenants.created_at` < 30 days ago
- Fresh Post: most recent post `published_at` < 48 hours ago
- Last Updated: always present if enabled, displays most recent `published_at` as formatted date
- Night Owl: >50% of posts have `published_at` hour between 22:00–05:00
- Early Bird: >50% of posts have `published_at` hour between 05:00–09:00
- Bookworm: 10+ posts with category/tag matching "book review" (fuzzy)
- Anniversary: current date matches `tenants.created_at` month+day (yearly)
- Seasonal: Winter (Dec-Feb), Spring (Mar-May) — suggested to owner, not auto-shown

#### Position simplification

The current data model has 4 positions (floating, header-vine, right-vine, footer-vine) that the public component completely ignores. **Simplify to inline-only:**

- Status badges render wherever the `::statusbadges::` directive is placed
- No floating overlays, no position logic
- The `position` column in the DB can be deprecated (keep for backwards compat but ignore)
- This is simpler, more predictable, and consistent with how other curios work

#### Dark mode character

Each display style has its own night personality:

- **Garden Signs**: Wood darkens to walnut, text glows softly like lantern-lit signs on a night trail
- **Enamel Pins**: Metal shifts to brushed silver/gunmetal, enamel colors deepen and glow
- **Ribbons**: Fabric deepens, text brightens against the dark ribbon
- **Glowing Chips**: The star of dark mode — glow intensifies, badges become the light source
- **Wax Seals**: Wax darkens, emboss catches moonlight, parchment edges warm

### Public component fixes

- [ ] **Implement all 5 display styles** with full visual character (garden signs, enamel pins, ribbons, glowing chips, wax seals)
- [ ] **Per-badge color system**: each badge renders with its assigned color (default from category or owner override)
- [ ] **Color-to-style mapping**: single hex color derives background, border, glow, text accent per display style
- [ ] **Category grouping**: optional subtle dividers between badge categories in the row
- [ ] **Custom badge rendering**: custom badges look identical to presets (same style treatment)
- [ ] **Auto-detect indicator**: subtle "✦" mark on auto-detected badges (visible but not prominent)
- [ ] **Replace hardcoded `rgba(0,0,0,0.05)`** with theme-aware, color-tinted surfaces
- [ ] **Dark mode character** per style (not just inverted — each style has night personality)
- [ ] **Remove position logic** — always inline where the directive is placed
- [ ] **Respect `prefers-reduced-motion`**: no pulse, no glow animation — keep color and shape
- [ ] **Remove duplicated `.sr-only`** — use shared utility
- [ ] **Warm empty state**: not needed (if no badges, curio simply doesn't render)

### API fixes

- [ ] **Display style field**: Add `display_style` to a new `statusbadge_config` table ("garden-signs" | "enamel-pins" | "ribbons" | "glowing-chips" | "wax-seals")
- [ ] **Color field**: Add `color` (TEXT, nullable hex) to `status_badges` — owner override color per badge
- [ ] **Expand badge type enum**: Add 14 new preset types to `StatusBadgeType` union and `BADGE_DEFINITIONS`
- [ ] **Custom badge support**: Allow `badge_type = "custom"` with required `custom_text` and `custom_emoji` fields
- [ ] **Custom emoji field**: Add `custom_emoji` (TEXT, nullable) to `status_badges` — for custom badges
- [ ] **Deprecate position**: Keep column but stop using it. API can still accept it for backwards compat but public display ignores it.
- [ ] **Public API enhancement**: Include color, emoji (resolved), display style in response
- [ ] **Default color resolution**: When `color` is null, resolve from badge category's default palette

### Admin fixes

- [ ] **Display style picker** with visual previews of all 5 styles
- [ ] **Expanded badge type picker**: 23 presets across 7 categorized sections (not a flat grid)
- [ ] **Custom badge creation**: emoji picker + text input + color picker
- [ ] **Per-badge color picker** with category-default preview
- [ ] **Edit badge form** — wire up existing PATCH endpoint to actual UI
- [ ] **Auto-detect badges**: show "Auto" label with explanation of trigger
- [ ] **Live preview** that renders the selected style with chosen color
- [ ] **Remove position selector** — no longer relevant
- [ ] **Migrate from lucide-svelte** to engine icons

### Migration needs

- [ ] New table `statusbadge_config`:
  - `tenant_id TEXT PRIMARY KEY` — FK to tenants
  - `display_style TEXT DEFAULT 'garden-signs'` — one of 5 styles
- [ ] New columns on `status_badges`:
  - `color TEXT DEFAULT NULL` — hex color override
  - `custom_emoji TEXT DEFAULT NULL` — emoji for custom badges
- [ ] Expand `badge_type` CHECK constraint to include 14 new preset types + "custom"
- [ ] Deprecate `position` column (keep, stop using — no destructive migration)

---

## 11. Shelves (née Bookmark Shelf)

**Character**: Beautiful furniture for your favorite things. Books, albums, movies, games, recipes, tools — whatever you treasure enough to display. The artisan doesn't care what goes on the shelf. He cares that the shelf is _worthy_ of holding it. A shelf is a shelf. You put what you love on it.

**Emergent system**: When you have 3+ shelves, a **Library** page automatically appears — a dedicated `/library` route where all your shelves live together in one room. The profile shows a preview (1-2 featured shelves), the Library shows everything. The Library's vibe is owner-configurable: warm wood library, cabinet of curiosities, or something else entirely.

### Safari findings: What exists today

**1,593 lines across 9 files** — the bones are solid but book-locked.

**Public component** (`CurioBookmarkshelf.svelte`, 340 lines):

- [x] Fetches from `/api/curios/bookmarkshelf`, renders shelves with nested bookmarks
- [x] Grid layout with cover images (6rem tall), titles, author names
- [x] "Reading" (blue) and "Favorite" (pink) status badges
- [x] Loading skeleton, error state, empty state handling
- [x] Dark mode support, hover lift on cards
- [ ] **One display mode only** — everything is the same flat card grid
- [ ] **No shelf visual** — no shelf line, no wood grain, no sense of furniture
- [ ] **No spine view** — when cover is missing, just an empty placeholder div
- [ ] **Book-only field assumptions** — "Reading" badge only makes sense for books

**Shared lib** (`src/lib/curios/bookmarkshelf/index.ts`, 177 lines):

- Types: `ShelfRecord`, `BookmarkRecord`, `ShelfDisplay`, `BookmarkDisplay`
- Fields per item: url, title, author, description, coverUrl, category, isCurrentlyReading, isFavorite, sortOrder
- 8 hardcoded literary categories: Fiction, Non-Fiction, Technical, Poetry, Zines, Comics, Essays, Tutorials
- Limits: 50 shelves/tenant, 200 char titles, 100 char authors, 500 char descriptions, 2048 char URLs
- Sanitization: HTML stripping, length enforcement, URL validation (http/https only)
- ID format: `shelf_{timestamp36}_{random}` / `bm_{timestamp36}_{random}`

**Admin** (`/arbor/curios/bookmarkshelf/`, 243 + 321 lines):

- [x] Add/delete shelves with name + description
- [x] Add bookmarks with title, URL, author, description, category dropdown, reading/favorite toggles
- [x] Delete individual bookmarks
- [x] GlassCard layout, toast feedback
- [ ] **No edit UI** — PATCH endpoints exist but no forms to use them
- [ ] **No reordering UI** — sort_order fields exist but no drag-and-drop
- [ ] **No cover image auto-fetch** — coverUrl is manual URL entry only

**API** (3 route files, ~490 lines total):

- `GET /api/curios/bookmarkshelf` — public, 2-min cache + 4-min stale-while-revalidate
- `POST /api/curios/bookmarkshelf` — create shelf (admin)
- `PATCH/DELETE /api/curios/bookmarkshelf/shelves/[id]` — update/delete shelf (admin)
- `PATCH/DELETE /api/curios/bookmarkshelf/bookmarks/[id]` — update/delete bookmark (admin)

**Database** (migration 071, 2 tables):

- `bookmark_shelves`: id, tenant_id, name, description, sort_order, created_at
- `bookmarks`: id, tenant_id, shelf_id, url, title, author, description, cover_url, category, is_currently_reading, is_favorite, sort_order, added_at
- Cascade deletes: tenant → shelves → bookmarks

### Design spec (safari-approved)

#### Philosophy: The shelf serves the object

A book shelf and an album shelf shouldn't look the same, because books and albums aren't the same. But they should feel like they belong in the same room. The shelf _tells you something_ about what's on it before you even look.

The preset changes the _language_ — author becomes artist, category becomes genre, "currently reading" becomes "currently playing" — but the _structure_ stays the same. Every shelf has: items with titles, creators, images, statuses, notes. What those fields are _called_ and how they _display_ is what makes a book shelf different from a vinyl shelf.

#### Smart presets + fully custom

Each preset pre-configures field labels, categories, status badges, and default display mode. Custom shelves let you define everything yourself.

| Preset             | Creator label      | Category defaults                                                            | Status 1          | Status 2      | Default display |
| ------------------ | ------------------ | ---------------------------------------------------------------------------- | ----------------- | ------------- | --------------- |
| **Books**          | Author             | Fiction, Non-Fiction, Technical, Poetry, Zines, Comics, Essays, Memoir       | Currently Reading | Favorite      | Spines          |
| **Music / Albums** | Artist             | Rock, Electronic, Jazz, Hip-Hop, Folk, Classical, Ambient, Soundtrack        | Now Playing       | Favorite      | Cover grid      |
| **Movies & Shows** | Director / Creator | Drama, Comedy, Horror, Sci-Fi, Documentary, Animation, Thriller              | Watching          | Favorite      | Poster grid     |
| **Games**          | Studio             | RPG, Platformer, Puzzle, Strategy, Simulation, Adventure, Indie, Multiplayer | Playing           | Favorite      | Cover grid      |
| **Recipes**        | Creator / Source   | Breakfast, Lunch, Dinner, Dessert, Snack, Drink, Baking, Comfort Food        | Want to Make      | Favorite      | Card list       |
| **Links**          | Source             | (owner-defined)                                                              | Featured          | Favorite      | Grid            |
| **Custom**         | (you name it)      | (you define them)                                                            | (you name it)     | (you name it) | (you pick)      |

The preset is a _starting point_. After creating a shelf from a preset, the owner can rename any label, add/remove categories, change display mode. The preset doesn't lock you in.

#### Display modes (owner's choice per shelf)

Each shelf can be displayed differently. One shelf shows spines, another shows cards, another shows a poster grid. The content suggests its form.

| Mode                | Visual                                                                                                                                            | Best for                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Spines**          | Items displayed as colored spines in a row on a shelf. Title text runs vertically. Pull one out (click) to see details.                           | Books, zines, comics. The classic bookshelf.                    |
| **Cover grid**      | Grid of cover images with title overlay on hover. Pinterest/Letterboxd energy.                                                                    | Albums, movies, games. Visual-first content.                    |
| **Card list**       | Vertical stack of cards with cover image, title, creator, description side by side.                                                               | Recipes, tools, articles. Information-dense content.            |
| **Poster wall**     | Large cover images in a masonry-ish layout. Statement pieces.                                                                                     | Movies, art prints, hero images. Gallery energy.                |
| **Buttons (88×31)** | Classic web button wall. Items as 88×31 pixel images in a tight grid. Auto-generated text button if no thumbnail.                                 | Links, retro web collections. Any shelf wanting that aesthetic. |
| **Marquee**         | Horizontally scrolling strip. Pauses on hover/focus. Static with `prefers-reduced-motion`. Owner controls speed (slow/medium/fast) and direction. | Links, short collections, nostalgia mode.                       |

#### Shelf materials (owner picks per shelf)

The shelf itself is furniture. What it's made of says something.

| Material            | Visual                                                                                  | Feel                                                                     |
| ------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Warm wood**       | Visible grain texture, warm brown tones, subtle depth shadow. Bracket supports visible. | Classic bookshelf. Library warmth. The default.                          |
| **Frosted glass**   | Grove glassmorphism. Items float on a translucent surface. Blurred depth beneath.       | Modern, clean, ties into the glass system. For vinyl or art.             |
| **Dark metal**      | Sleek industrial shelf. Thin lines, cool tones, precise.                                | Tools, tech, games. Functional beauty.                                   |
| **Natural stone**   | Warm gray with subtle texture. Heavy, grounded, museum pedestal energy.                 | Artifacts, treasures, things with weight.                                |
| **None / floating** | Items just... are. No visible shelf surface. They exist in space.                       | Minimal. For people who want the content without the furniture metaphor. |

#### Item texture (rating + notes, both optional)

Same texture layer pattern as Now Playing. Some items get a star, some get a love letter, some just sit there and look pretty.

- **Rating**: 1-5 stars (or hearts, or leaves — owner picks the icon). Optional per item.
- **Personal note**: Free text, max ~500 chars. "This changed how I think about cooking" / "Read this in one sitting on a train to Portland" / "The soundtrack is better than the game." Expandable on click/tap.
- **Both are optional per item** — the default is neither. You add texture when you feel like it.

#### Spine view: When there's no cover image

In spine mode, items without cover images aren't blank — they show a colored "spine" with:

- Title text running vertically (or horizontally if short)
- Spine color auto-assigned from a warm palette (or chosen by owner per item)
- Slightly varied heights for organic feel (like real books on a real shelf)
- Pull a spine (click/tap) → expand to detail card showing all metadata

#### The Library (emergent at 3+ shelves)

When a tenant has 3+ shelves, a `/library` route auto-generates:

- **Profile curio**: Shows 1-2 "featured" shelves inline (owner picks which ones to feature). A warm "Visit my library" link appears below.
- **Library page** (`/library`): All shelves displayed in their chosen modes, organized by the owner's sort order.
- **Library atmosphere** (owner-configurable):

| Atmosphere                 | Feel                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------- |
| **Warm library**           | Wood paneling, warm light, organized sections. The library with leather chairs.       |
| **Cabinet of curiosities** | Eclectic, personal, surprising. Each shelf is a different world. Wunderkammer energy. |
| **Clean gallery**          | White walls, breathing room, each shelf as an exhibit. Museum meets home.             |

- **Shelf navigation**: If 5+ shelves, add a small table of contents / sidebar for jumping between shelves.
- **Library is optional**: Owner can disable the auto-generated page if they prefer shelves only as inline curios.

### Public component fixes

- [ ] **Generalize from books to "anything"** — field labels driven by shelf preset, not hardcoded
- [ ] **Implement all 6 display modes** (spines, cover grid, card list, poster wall, 88×31 buttons, marquee) — see Section 8 for absorption details
- [ ] **Implement shelf materials** (wood, glass, metal, stone, floating) with actual visual treatment
- [ ] **Spine view**: colored spines with vertical title text, varied heights, click-to-expand
- [ ] **Cover grid**: hover to reveal title/creator, click for detail card
- [ ] **Buttons (88×31) view**: tight grid of 88×31 pixel images. Auto-generated text button when no thumbnail. Absorbed from Link Garden.
- [ ] **Marquee view**: horizontal scroll strip, pauses on hover/focus, static with `prefers-reduced-motion`, owner speed control (slow/medium/fast), direction (LTR/RTL). Absorbed from Link Garden.
- [ ] **Item detail expansion**: click any item to see full metadata, notes, rating
- [ ] **Rating display**: stars/hearts/leaves with owner's chosen icon
- [ ] **Personal notes**: expandable on click, warm styling
- [ ] **Status badges**: dynamic labels from preset ("Reading" / "Playing" / "Watching" / "Featured" / custom)
- [ ] **Category grouping toggle**: per-shelf "Group by category" option. Off by default. When on, items grouped under category headers.
- [ ] **Thumbnail display**: show item thumbnails (favicon-sized) in list/grid modes when available. Auto-favicon from Google service for items with URLs (on by default for Links preset, off for others).
- [ ] **Warm empty state per shelf type**: "The shelf awaits..." with contextual illustration
- [ ] **Replace hardcoded rgba colors** with grove palette
- [ ] **Respect `prefers-reduced-motion`**: no hover lifts, instant transitions, marquee becomes static

### Library page fixes

- [ ] **Build `/library` route** — auto-generated when tenant has 3+ shelves
- [ ] **Featured shelf selection** in admin (which 1-2 shelves appear on profile curio)
- [ ] **Library atmosphere picker** (warm library / cabinet / clean gallery)
- [ ] **Shelf navigation** sidebar/TOC for 5+ shelves
- [ ] **"Visit my library" link** on profile curio when Library exists
- [ ] **Library disable toggle** — owner can opt out of the auto-generated page

### API fixes

- [ ] **Generalize field labels**: Add `preset` field to shelf (books/music/movies/games/recipes/links/custom)
- [ ] **Custom field labels**: Add `creatorLabel`, `status1Label`, `status2Label` to shelf config
- [ ] **Custom categories**: Allow owner-defined categories per shelf (not just the 8 literary defaults)
- [ ] **Category grouping**: Add `group_by_category INTEGER DEFAULT 0` to shelf config
- [ ] **Rating field**: Add `rating` (INTEGER 1-5, nullable) to bookmarks
- [ ] **Personal note field**: Add `note` (TEXT, max 500 chars) to bookmarks
- [ ] **Display mode field**: Add `display_mode` to shelf — expanded to 6 modes: "spines" | "cover-grid" | "card-list" | "poster-wall" | "buttons" | "marquee"
- [ ] **Marquee config**: Add `marquee_speed TEXT DEFAULT 'slow'` and `marquee_direction TEXT DEFAULT 'ltr'` to shelf config
- [ ] **Material field**: Add `material` to shelf ("wood" | "glass" | "metal" | "stone" | "floating")
- [ ] **Thumbnail field**: Add `thumbnail_url` to bookmarks — general small image (favicon, 88×31 button, icon). Separate from `cover_url`.
- [ ] **Auto-favicon toggle**: Add `auto_favicon INTEGER DEFAULT 0` to shelf config (default 1 for Links preset)
- [ ] **Featured flag**: Add `is_featured` to shelf (for Library preview on profile)
- [ ] **Smart fetch endpoint**: New API route that accepts a URL and returns scraped metadata (title, description, OG image, favicon, site name) via Lumen/Shutter. Used by "Fetch from URL" button in admin.
- [ ] **Track URL for Hum integration**: If an item has a music URL, could render a mini Hum card in detail view

### Admin fixes

- [ ] **Shelf creation wizard**: Pick preset → get smart defaults → customize from there
- [ ] **Per-shelf display mode picker** with visual previews
- [ ] **Per-shelf material picker** with visual previews
- [ ] **Edit bookmark form** — wire up existing PATCH endpoints to actual UI
- [ ] **Drag-and-drop reorder** for shelves and items within shelves
- [ ] **"Fetch from URL" button** — opt-in smart fetch via Lumen/Shutter. Paste URL, click fetch, auto-populate title/description/cover/thumbnail/creator. Universal across all presets.
- [ ] **Links preset lightweight form** — add-item shows URL only by default, progressive disclosure for title/description/category/notes. "Fetch details" button auto-fills from URL.
- [ ] **Cover image auto-fetch** from URL (Open Graph) or upload via Custom Uploads picker
- [ ] **Rating input** (clickable stars/hearts/leaves)
- [ ] **Personal note textarea** per item
- [ ] **Featured shelf toggle** (for Library profile preview)
- [ ] **Library atmosphere picker** in a new "Library Settings" section
- [ ] **Custom category management** per shelf (add/remove/rename)

### Migration needs

- [ ] New columns on `bookmark_shelves`:
  - `preset TEXT DEFAULT 'custom'` — books, music, movies, games, recipes, links, custom
  - `display_mode TEXT DEFAULT 'cover-grid'` — spines, cover-grid, card-list, poster-wall, buttons, marquee
  - `material TEXT DEFAULT 'wood'` — wood, glass, metal, stone, floating
  - `creator_label TEXT DEFAULT 'Author'` — custom label for the creator field
  - `status1_label TEXT DEFAULT 'In Progress'` — custom label for status 1
  - `status2_label TEXT DEFAULT 'Favorite'` — custom label for status 2
  - `is_featured INTEGER DEFAULT 0` — appears on profile Library preview
  - `group_by_category INTEGER DEFAULT 0` — group items under category headers
  - `auto_favicon INTEGER DEFAULT 0` — auto-generate favicon for items with URLs (default 1 for Links preset)
  - `marquee_speed TEXT DEFAULT 'slow'` — slow, medium, fast (only used in marquee mode)
  - `marquee_direction TEXT DEFAULT 'ltr'` — ltr, rtl (only used in marquee mode)
- [ ] New columns on `bookmarks`:
  - `rating INTEGER` — 1-5, nullable
  - `note TEXT` — personal note, max 500 chars
  - `thumbnail_url TEXT` — small secondary image (favicon, 88×31 button, icon). Separate from cover_url.
- [ ] Drop Link Garden tables (fresh start):
  - `DROP TABLE IF EXISTS link_garden_items`
  - `DROP TABLE IF EXISTS link_gardens`
- [ ] New table `library_config`:
  - `tenant_id TEXT PRIMARY KEY` — FK to tenants
  - `atmosphere TEXT DEFAULT 'warm-library'` — warm-library, cabinet, clean-gallery
  - `enabled INTEGER DEFAULT 1` — owner can disable auto-generated Library
  - `rating_icon TEXT DEFAULT 'star'` — star, heart, leaf

### Renaming consideration

The curio is currently called "bookmarkshelf" everywhere — file names, route paths, DB tables, API routes. A full rename to "shelves" would be a significant migration. Options:

- **Keep internal name as `bookmarkshelf`**, update display name to "Shelves" in UI only
- **Rename everything** — files, routes, tables — in a dedicated migration (high churn, clean result)
- **New system alongside** — build "Shelves" as a new curio, migrate data from bookmarkshelf, deprecate old

This is a decision for implementation time, not safari time. Noted for future.

---

## 12. Artifacts

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

---

## 13. Polls

**Character**: Community voice. The town square question box. Low friction, high delight. The moment after you vote and the results animate in — that's the magic.

### Critical finding: Public component is READ-ONLY

The `CurioPoll.svelte` component has **no voting UI**. No buttons, no radio inputs, no checkboxes, no submit. It fetches a poll and renders result bars — that's it. You cannot vote. Additionally:

- Type mismatch: component expects `resultsVisibility: 'public' | 'private'` but shared lib defines 4 states
- No `description` field rendered
- The `hasVoted` check works but only shows a "✓ You voted" footer — it never gates the results view
- Uses `rgba(0,0,0,0.02)` backgrounds — the familiar gray nothingness

### Design spec (safari-approved)

**Voting experience: Inline vote + reveal**

- Options appear as clickable glass chips/buttons (radio-style for single, toggle-style for multiple)
- Click to select, then confirm with a "Cast vote" button
- On submit: options animate into result bars with count-up effect. One smooth transition, no reload.
- Satisfying reveal moment — the bars grow from 0 to final width, numbers tick up

**Pre-vote state: Gentle hint**

- Before voting, show options with very faint ghost result bars behind them (~5% opacity)
- You can sense the trend but can't read exact numbers — creates intrigue
- Total votes shown: "47 votes so far" (social proof without revealing leader)
- After voting, ghost bars solidify into full results with animated transition

**Poll container: Owner's choice (3 styles)**

- **Glass card**: Frosted glass with grove-green accent on question. Consistent with Grove system.
- **Bulletin board pin**: Question pinned to cork/glass board, slight rotation, tack visual at top. Indie web energy.
- **Clean minimal**: Light border, subtle background. Content-first, decoration is a whisper.

**Result bars: Grove-tinted glass + nature fill + animated**

- Translucent grove-green bars with subtle depth (glass effect)
- Leading option's bar glows slightly brighter
- Subtle leaf/vine texture or organic gradient — not flat color but living surface
- Bars animate from 0% to final width on reveal, numbers tick up
- Percentages shown alongside vote counts

**Rich options: Emoji + color per option**

- Each option can have an optional emoji prefix AND a custom color
- Result bar tints to match the option's color: "🌸 Spring" gets pink bar, "❄️ Winter" gets ice-blue
- Emoji and color are optional — text-only options work fine

**Closed state: Archive with winner highlight**

- Winning option highlighted with subtle crown/accent glow
- Results remain visible, vote button gone
- "Final results" label with total vote count
- Clear winner, clear closure

### Admin fixes

- [ ] Add close date picker (field exists in data model, not in form)
- [ ] Add pin toggle (field exists, not in form)
- [ ] Add results dashboard — vote counts, percentages, maybe vote timeline
- [ ] Add duplicate poll action (run same question again)
- [ ] Add archive action (hide from public without deleting)
- [ ] Add per-option emoji + color fields in option editor
- [ ] Add poll container style picker (glass/bulletin/minimal)

### Public component fixes

- [ ] **BUILD THE VOTING UI** — this is the critical gap
  - Single choice: radio-style glass chips
  - Multiple choice: toggle-style glass chips
  - "Cast vote" confirmation button
  - IP-hash dedup (already in data model)
- [ ] Fix type mismatch: align component types with shared lib's 4 visibility states
- [ ] Implement all 4 results visibility modes (always/after-vote/after-close/admin-only)
- [ ] Add pre-vote ghost bars (5% opacity result hint)
- [ ] Add animated count-up reveal on vote submission
- [ ] Render `description` field
- [ ] Render emoji + custom color per option
- [ ] Implement 3 container styles
- [ ] Add closed/archived state with winner highlight
- [ ] Replace hardcoded rgba colors with grove palette
- [ ] Respect `prefers-reduced-motion` (instant bars, no tick-up)

---

## 14. Shrines

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

## 15. Cursors

**Character**: Enchanted forest meets cozy companion. The site whispers "you're in my world now." A leaf drifting after your mouse. A butterfly that settles when you stop. Not flashy — alive.

### Public component — hollow facade

- [x] Config fetching and body style application works
- [ ] **Only 3 of 13 presets have SVGs** (leaf, paw, star) — paw isn't even in the preset list! Other 10 presets silently fall back to default cursor.
- [ ] **Trail system is a comment**: `<!-- Trail canvas would go here in future -->`. Admin configures trails, visitors get nothing.
- [ ] **No `prefers-reduced-motion` check** despite docs claiming it
- [ ] **Hardcoded colors**: Existing SVGs use `#4ade80`, `#a78bfa`, `#fbbf24` instead of grove palette vars
- [ ] **Custom URL has no sanitization** beyond basic URL validation

---

### Cursor Design Spec

#### Preset categories (expanded)

| Category         | Cursors                                    | Feel                        |
| ---------------- | ------------------------------------------ | --------------------------- |
| **Nature**       | leaf, flower, butterfly, ladybug, raindrop | The grove around you        |
| **Whimsical**    | sparkle, wand, mushroom                    | Fairy tale energy           |
| **Classic**      | hourglass                                  | Timeless                    |
| **Seasonal**     | snowflake, pumpkin, blossom, falling-leaf  | The seasons made visible    |
| **Cozy** _(NEW)_ | candle, teacup, book, lantern, pen/quill   | Midnight tea shop companion |

#### All 13+ presets need SVGs built

Every preset needs a proper SVG data URI with grove palette colors. Current state: only 3 exist. Priority: build all nature + cozy first, then seasonal, then whimsical + classic.

#### Subtle animation (where natural)

Some cursors have gentle idle/movement animation:

- **Butterfly**: Wings gently flap
- **Candle**: Tiny flame flicker
- **Leaf/falling-leaf**: Sways softly
- **Sparkle**: Twinkles
- **Raindrop**: Subtle wobble

Static cursors (mushroom, book, hourglass, etc.) stay still — animation only where motion is _natural_. CSS animation or sprite-based, respects `prefers-reduced-motion`.

#### Seasonal mode (optional toggle per cursor)

Owner can enable "seasonal mode" — cursor adapts to site season:

- **Leaf**: spring green → summer deep → autumn orange → winter frost/bare
- **Flower**: spring cherry blossom → summer full bloom → autumn dried → winter none (falls back to snowflake?)
- Uses existing `getSeasonalGreens()` / palette functions — no new color infra needed

When seasonal mode is OFF, cursor stays exactly as configured.

#### Trail system: ACTUALLY BUILD IT

Canvas-based particle trail, layered over page (`pointer-events: none`, high z-index):

| Trail effect   | Particles            | Behavior                       |
| -------------- | -------------------- | ------------------------------ |
| **Sparkle**    | Tiny bright dots     | Twinkle and fade in place      |
| **Fairy dust** | Soft glowing circles | Drift downward slowly, fade    |
| **Leaves**     | Tiny leaf shapes     | Tumble and rotate as they fall |
| **Stars**      | Small star shapes    | Shrink as they fade            |

Each particle: position, velocity, opacity, lifetime, rotation (for leaves). Canvas clears and redraws each frame. Cap particle count for performance.

**Trails are seasonal if cursor is**: If owner enables seasonal mode, trail colors shift too:

- Winter sparkle → ice crystal blue
- Autumn leaves → warm reds/oranges
- Spring fairy dust → cherry blossom pink
- Summer → default green/gold

**Performance & a11y**:

- Skip trails entirely on `prefers-reduced-motion: reduce`
- Cap at ~30 active particles
- RequestAnimationFrame with frame skipping on low-end devices

### Admin

- [ ] (Good foundation — radio presets by category, trail toggle, length slider)
- [ ] Add **seasonal mode toggle** per cursor
- [ ] Add **cozy category** presets
- [ ] Show animated preview of selected cursor + trail in admin
- [ ] Custom cursor upload via Custom Uploads curio picker

---

## 16. Ambient

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

## 17. Clip Art

**Character**: Decorative flair. Little critters, borders, and sparkles scattered on your pages.

### Major gap: No public component

- [ ] **CurioClipArt.svelte does NOT exist** — admin page is complete
- [ ] Admin supports: asset selection, page targeting, x/y positioning (0-100%), scale, rotation, z-index
- [ ] Placements grouped by page path

### Implementation needed

- [ ] Build `CurioClipArt.svelte` — render positioned overlays on target pages
- [ ] Assets need to be created/curated — what clip art ships with Grove?
- [ ] Consider: absolute positioning over page content vs. margin decorations
- [ ] Animated clip art options? (butterflies, falling leaves)

### Admin

- [ ] (Functional — placement editor with position/scale/rotation controls)

---

## 18. Custom Uploads

**Character**: The shared media backbone powering all other curios. Infrastructure isn't glamorous, but everything beautiful sits on top of it. Custom Uploads is the pipe that badges, cursors, shrines, clip art, shelf covers, Cathedral panels, blogroll buttons, and every other image-needing curio flows through.

**Consultant**: Nafula (upload infrastructure specialist, Cape Town, South Africa). Works from a cliff-top workshop overlooking where the Indian and Atlantic oceans meet. Calibrates antennas and designs data flow diagrams for a living.

### Safari findings: What exists today

**763 lines across 6 implementation files** — the DB side works, but the actual upload flow has a gap in the middle.

**Shared lib** (`src/lib/curios/customuploads/index.ts`, 138 lines):

- [x] Types: `UploadRecord`, `UploadDisplay`, `AllowedMimeType` (PNG/GIF/WebP)
- [x] Constants: 100 uploads/tenant, 5MB max, 512px max dimension, 128px thumbnails
- [x] Utilities: ID generation (`upl_` prefix), filename sanitization, R2 key builders, MIME validation
- [x] R2 paths: `curios/{tenantId}/uploads/{id}.{ext}` + `{id}_thumb.webp`

**Database** (migration 074): `custom_uploads` table with id, tenant_id, filename, original_filename, mime_type, file_size, width, height, r2_key, thumbnail_r2_key, usage_count, uploaded_at

**Admin** (208 lines total): Shows uploads with metadata, quota display, delete button. **No upload dropzone** — management only.

**API** (225 lines total): GET list (cached 30s), POST register (creates DB record + returns R2 keys but **doesn't actually upload to R2**), DELETE record (returns R2 keys but **doesn't delete R2 objects**).

**Tests** (190 lines): All utility functions covered.

**Image processor** (`src/lib/utils/imageProcessor.ts`, 669 lines): **EXISTS BUT NOT WIRED IN.** Full pipeline: JXL encoding, HEIC decoding, auto-resize, EXIF stripping, adaptive effort. Completely unused by Custom Uploads.

**Upload validation** (`src/lib/utils/upload-validation.ts`, 584 lines): Deep validation with magic byte checking, strategy detection, actionable error messages. Also not wired into Custom Uploads.

### Design spec (safari-approved)

#### Philosophy: The invisible backbone

Custom Uploads has no public component — by design. It's infrastructure. Its job is to make every other curio's image handling effortless. The owner shouldn't think about "uploading to the uploads system." They should think about "adding an image to my badge / shrine / shelf / Cathedral" and the upload system handles the rest invisibly.

#### Upload flow: Match existing media pipeline

Use the same upload pattern as blog post media uploads (whatever that pipeline is). Consistency over novelty. The flow:

1. Owner interacts with a Smart Field (see below) — drops a file, pastes a URL, or browses existing uploads
2. Client-side: image runs through `imageProcessor.ts` — auto-resize, EXIF strip, thumbnail generation, optional JXL conversion
3. Upload to R2 via the same mechanism blog media uses
4. DB record created with full metadata (dimensions, size, format, R2 keys)
5. Smart Field shows thumbnail preview, curio saves the CDN URL

#### The Smart Field component

A reusable `SmartImageField.svelte` that replaces raw URL inputs across all curio admin pages. One field, three input methods.

**At rest (empty):** Looks like a normal text input with a small image-browse icon button on the right side. Placeholder text: "Paste URL or browse uploads..."

**Three input methods:**

| Method          | How                                           | What happens                                                                                                                                         |
| --------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Paste URL**   | Type/paste a URL directly into the text field | Validates URL, shows thumbnail preview. Works with external URLs (no upload needed).                                                                 |
| **Browse**      | Click the icon button                         | Opens a modal gallery of existing uploads. Thumbnail grid, search by filename, filter by auto-category. Click to select. "Upload new" button at top. |
| **Drag & drop** | Drag a file onto the field                    | File runs through image processor → uploads to R2 → auto-fills the field with CDN URL.                                                               |

**At rest (image selected):** The text field shows the URL. A small thumbnail appears to the left of the field. "Change" and "Remove" (×) buttons replace the browse icon.

**Props for consumer curios:**

- `value: string` — bound URL
- `maxDimension?: number` — override max resize dimension for this context
- `accept?: string[]` — override accepted formats
- `label?: string` — field label ("Badge icon", "Cursor image", etc.)

#### Expanded format support

Accept all formats the image processor can handle. The processor is the gatekeeper — if it can process it, accept it.

| Format        | Support          | Notes                                                             |
| ------------- | ---------------- | ----------------------------------------------------------------- |
| **JPEG**      | Accept           | Most common format people have. Processed as-is or converted.     |
| **PNG**       | Accept           | Lossless, great for icons and pixel art.                          |
| **GIF**       | Accept           | Preserved as-is to maintain animation. Skips processing pipeline. |
| **WebP**      | Accept           | Modern, efficient. Good default output format.                    |
| **JXL**       | Accept           | Cutting-edge compression. Encoded via WASM.                       |
| **AVIF**      | Accept           | Modern format, good compression.                                  |
| **HEIC/HEIF** | Accept + convert | Auto-converted via heic2any WASM decoder. Common from iPhones.    |
| **SVG**       | Reject           | XSS vector. Security decision — not changing this.                |

#### Full processing pipeline

Every upload (except GIF) runs through `imageProcessor.ts`:

1. **Validate**: Magic byte checking via `upload-validation.ts`
2. **Decode**: HEIC → canvas, others → native browser decode
3. **Resize**: Auto-resize to max dimension for tier (see limits below)
4. **Strip EXIF**: Drawing to canvas removes all metadata including GPS
5. **Encode**: Output as WebP (default) or JXL (if supported + owner opts in)
6. **Thumbnail**: Generate 128px WebP thumbnail for picker/admin grid
7. **Upload**: Send processed file + thumbnail to R2
8. **Record**: Create D1 record with dimensions, processed size, format

GIF bypasses steps 2-6 to preserve animation. Stored as-is with a static WebP thumbnail.

#### Tiered limits

| Tier         | Max uploads | Max file size | Max dimension | Max total storage |
| ------------ | ----------- | ------------- | ------------- | ----------------- |
| **Seedling** | 50          | 5 MB          | 512px         | 50 MB             |
| **Sapling**  | 150         | 5 MB          | 1024px        | 250 MB            |
| **Oak+**     | 500         | 10 MB         | 2048px        | 1 GB              |

Quota enforcement happens BEFORE upload (check count + projected size against limits). The admin page shows quota usage with a progress bar.

#### Auto-categorization via periodic scan

No manual tagging or folders. The system figures it out.

**How it works:** A periodic background job (hourly or daily) scans all curio tables for upload URLs matching the tenant's R2 path pattern. For each upload, it records which curios reference it:

| If referenced by...                 | Auto-category |
| ----------------------------------- | ------------- |
| `badges` table                      | badge         |
| `cursors` table                     | cursor        |
| `shrines` table                     | shrine        |
| `bookmarks` cover_url/thumbnail_url | shelf         |
| `cathedral_panels` table            | cathedral     |
| `blogroll_items` table              | blogroll      |
| No references found                 | uncategorized |

An upload can have multiple categories (a single image used as both a badge icon and a shrine decoration).

**In the picker modal:** Filter buttons across the top: All / Badges / Cursors / Shrines / Shelves / Uncategorized. Powered by the auto-categories. Owner never has to think about organizing.

**Usage count:** Updated during the same periodic scan. Count = number of distinct references across all curio tables. Replaces the dead `usage_count` field that was never incremented.

#### R2 cleanup: Inline with fallback queue

When the admin deletes an upload:

1. **D1 record** deleted immediately
2. **R2 objects** (main file + thumbnail) deleted inline in the same request
3. **If R2 delete fails** (timeout, network error): keys are written to a `r2_cleanup_queue` table for background retry
4. **Background sweep** (daily cron): processes queued R2 deletions, retries up to 3 times, then logs permanent failures

This eliminates orphaned R2 objects while handling the reality that R2 operations sometimes fail.

#### Orphan warnings in admin

The admin page shows a section at the bottom: **"Possibly unused uploads"** — uploads where the periodic scan found `usage_count = 0` and the upload is older than 30 days. Not auto-deleted — just surfaced for the owner to review. A "Delete unused" bulk action is available but requires confirmation.

### Component fixes

- [ ] **Build `SmartImageField.svelte`** — reusable across all curio admin pages. Three input methods: paste URL, browse gallery, drag-and-drop. Thumbnail preview when selected.
- [ ] **Build picker modal** — thumbnail grid of existing uploads, search by filename, filter by auto-category, "Upload new" button
- [ ] **Wire imageProcessor.ts** into upload flow — auto-resize, EXIF strip, thumbnail generation, format conversion
- [ ] **Wire upload-validation.ts** — magic byte checking, actionable error messages via `getActionableUploadError()`
- [ ] **Add upload dropzone to admin page** — the admin page currently has no way to upload. Add a dropzone at the top.

### API fixes

- [ ] **Complete the upload flow** — POST endpoint must actually upload to R2 (match existing blog media pipeline), not just create a DB record
- [ ] **R2 inline delete** — DELETE endpoint must delete R2 objects, not just return keys
- [ ] **Fallback cleanup queue** — new `r2_cleanup_queue` table, background sweep job
- [ ] **Periodic scan endpoint** — cron job that scans curio tables, updates auto-categories and usage counts
- [ ] **Tier-aware quota check** — validate against tier limits, not hardcoded 100
- [ ] **Dimension extraction** — populate width/height fields during upload (currently nullable and often null)
- [ ] **Expand MIME types** — add JPEG, JXL, AVIF, HEIC/HEIF to `AllowedMimeType` union

### Admin fixes

- [ ] **Quota display** — show tier-appropriate limits (not hardcoded "100")
- [ ] **Upload dropzone** — drag-and-drop zone at top of admin page
- [ ] **Auto-category filter tabs** — All / Badges / Cursors / Shrines / Shelves / Uncategorized
- [ ] **Orphan warnings section** — "Possibly unused" uploads (0 usage, 30+ days old) with bulk delete option
- [ ] **Thumbnail grid view** — replace the current list view with a visual grid of thumbnails
- [ ] **Storage usage display** — show total R2 storage used vs tier limit

### Migration needs

- [ ] Alter `custom_uploads` table:
  - Add `auto_categories TEXT DEFAULT '[]'` — JSON array of auto-detected categories
  - Add `processed_format TEXT` — output format after processing (webp, jxl, original)
  - Add `original_file_size INTEGER` — size before processing (to show compression savings)
- [ ] New table `r2_cleanup_queue`:
  - `id INTEGER PRIMARY KEY AUTOINCREMENT`
  - `r2_key TEXT NOT NULL`
  - `tenant_id TEXT NOT NULL`
  - `queued_at TEXT NOT NULL DEFAULT (datetime('now'))`
  - `attempts INTEGER DEFAULT 0`
  - `last_attempt_at TEXT`
  - `error TEXT` — last error message
- [ ] Update tier limits in shared lib constants (Seedling: 50, Sapling: 150, Oak+: 500)

### Consumer integration checklist

Every curio admin page that currently has a raw URL input for images needs to be migrated to `SmartImageField`:

- [ ] **Badges** — badge icon URL → SmartImageField
- [ ] **Cursors** — cursor image URL → SmartImageField
- [ ] **Shrines** — shrine images → SmartImageField
- [ ] **Shelves** — cover_url, thumbnail_url → SmartImageField
- [ ] **Blogroll** — favicon overrides, 88×31 button images → SmartImageField
- [ ] **Artifacts** — Cathedral panel backgrounds, custom artifact images → SmartImageField
- [ ] **Clip Art** — (when built) entire upload flow → SmartImageField

---

## 19. Gallery

**Character**: Your visual story. A beautiful image gallery backed by Amber storage.

### Major gap: No public component

- [ ] **CurioGallery.svelte does NOT exist** — admin is comprehensive
- [ ] Admin supports: grid styles, sort orders, thumbnail sizes, per-page counts, tags, collections, lightbox toggle, search, custom CSS
- [ ] R2-backed with Amber sync

### Implementation needed

- [ ] Build `CurioGallery.svelte` — masonry/grid image display
- [ ] Lightbox for full-size viewing
- [ ] Tag filtering and search
- [ ] Warm empty state
- [ ] Lazy loading with blur-up placeholders

### Admin

- [ ] (Comprehensive — stats dashboard, storage sync, display config, feature toggles, custom CSS)

---

## 20. Journey

**Character**: Your creative timeline. Milestones visualized as a path through the grove.

### Status: Placeholder

- [ ] Admin is "Coming Soon" (Full Bloom/Early Summer milestone)
- [ ] No public component, no data model implementation
- [ ] Concept: Visualize repo growth and blogging milestones as a journey map

### Future vision

- [ ] Winding path visualization with milestone markers
- [ ] Auto-populated from post history + manual milestone entries
- [ ] Seasonal theming along the path
- [ ] "You are here" current position marker

---

## 21. Timeline

**Character**: AI-powered developer diary. GitHub activity summarized in your voice.

### Major gap: No public component (despite massive admin)

- [ ] **CurioTimeline.svelte does NOT exist** — admin is 1622 lines of deeply-built config
- [ ] Admin supports: GitHub token, OpenRouter BYOK, 5+ voice presets (professional, quest, poetic, casual, minimal, custom), historical backfill, sequential generation with progress tracking, cost tracking
- [ ] Voice system is particularly cool — custom system prompts and summary instructions

### Implementation needed

- [ ] Build `CurioTimeline.svelte` — render AI-generated activity summaries
- [ ] Timeline layout with date markers
- [ ] Voice-appropriate styling (poetic voice → serif? quest voice → fantasy borders?)
- [ ] Loading states for freshly-generated entries
- [ ] Link to GitHub commits referenced in summaries

### Admin

- [ ] (Exhaustive — token management, model selection, voice personality system, backfill, generation with progress bars)

---

## 22. Pulse

**Character**: Live heartbeat. Real-time development activity from GitHub webhooks.

### Major gap: No public component

- [ ] **CurioPulse.svelte does NOT exist** — admin has webhook setup, health monitoring, display toggles
- [ ] Admin supports: webhook URL + secret, repo filtering, display options (heatmap, feed, stats, trends, CI health)
- [ ] Health indicator based on last event timestamp

### Implementation needed

- [ ] Build `CurioPulse.svelte` — live activity dashboard
- [ ] GitHub-style heatmap (contribution graph) — but grove-themed (greens, not github-green)
- [ ] Activity feed with recent events
- [ ] Stats cards (commits today, PRs merged, etc.)
- [ ] CI health indicators

### Admin

- [ ] (Complete — webhook setup with copy-to-clipboard, secret management, repo filtering, display toggles)

---

## Missing public components

These curios have admin pages and data models but **no public hydration component**:

| Curio        | Admin Complexity          | Status              |
| ------------ | ------------------------- | ------------------- |
| **Shrines**  | Complete (spatial layout) | Needs component     |
| **Clip Art** | Complete (positioning)    | Needs component     |
| **Gallery**  | Comprehensive (R2/Amber)  | **SKIPPED for now** |
| **Timeline** | Massive (1622 lines, AI)  | **SKIPPED for now** |
| **Pulse**    | Complete (webhooks)       | **SKIPPED for now** |
| **Journey**  | Placeholder only          | **SKIPPED for now** |

---

## Cross-cutting patterns to address

- [ ] **Duplicated `.sr-only`**: Every curio component defines its own `.sr-only` class. Should use a shared utility class.
- [ ] **Hardcoded rgba colors**: Many components use `rgba(0,0,0,0.04)` / `rgba(255,255,255,0.06)` instead of theme-aware vars.
- [ ] **Hardcoded `#4ade80`**: Hit counter, now playing, webring all use raw green hex instead of `rgb(var(--grove-500))`.
- [ ] **No shared skeleton animation**: Each component has static gray rectangles. Could pulse/shimmer.
- [ ] **lucide-svelte in admin pages**: Several admin pages import directly from lucide-svelte instead of engine icons.
- [ ] **No upload picker integration**: Badges, shrines, and cursors ask for external URLs — should have a "pick from Custom Uploads" button using the existing R2 infrastructure.
- [ ] **Trail canvas not implemented**: Cursors config has trail effects but the canvas rendering is a no-op.

---

## Implementation priority

> **SKIPPED entirely for now**: Journey, Timeline, Pulse, Gallery — admin pages exist but public components are deferred to a future phase.

### Wave 1 — Quick polish (existing components)

1. Hit Counter — render all 4 styles, grove palette, dedup
2. Mood Ring — render all 3 display styles, glow/pulse animation
3. Now Playing — swap hardcoded green, vinyl spin, warm fallback
4. Guestbook — warm palette, organic shapes, accent borders
5. Webring — grove colors, character
6. Cross-cutting — shared `.sr-only`, replace hardcoded `#4ade80` and `rgba()` colors

### Wave 2 — Badges expansion (HIGH PRIORITY)

7. Design custom Grove badge format (shape, sizes per category)
8. Pre-built badge library (retro web, pride & identity, seasonal & nature, achievements)
9. Badge wall/grid public display component (replace pill row)
10. Showcase shelf for featured badges
11. Custom badge image upload via Custom Uploads curio (not external URLs)
12. Upload Picker shared component for badge/shrine/cursor admin pages

### Wave 3 — Remaining polish + missing components

13. Blogroll — warm palette, favicon fallback, descriptions
14. Link Garden — glass cards, section icons
15. Polls — grove-green bars, animation, winner highlight
16. Activity Status — pulse animation, warm fallback text
17. Status Badges — grove palette alignment
18. Bookmark Shelf — physical shelf effect, book spines
19. Ambient — warmer button, sound label on hover
20. Custom Uploads — upload dropzone, category tags, wire usage_count
21. Shrines — build public component (spatial frame rendering)
22. Clip Art — build public component (positioned overlays)

### Wave 4 — Future

23. Artifacts — full collectible system
24. Badge builder tool
25. Badge trading/gifting
26. Cursor trail canvas rendering
