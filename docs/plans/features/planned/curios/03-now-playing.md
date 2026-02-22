---
title: "Curio: Now Playing"
status: planned
category: features
---

# Curio: Now Playing

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 3

---

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
