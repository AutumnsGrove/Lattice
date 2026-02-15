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

**Character**: Grove-ified retro. Retro SHAPES, nature PALETTE.

### Public component issues

- [ ] **Style mismatch**: Admin has 4 styles (classic, odometer, minimal, LCD). Public only renders classic.
- [ ] **Missing label**: API sends `label` ("You are visitor"), public doesn't render it.
- [ ] **Missing since-date**: API sends `showSinceDate` + `startedAt`, public ignores both.
- [ ] **Hardcoded colors**: `#1a1a2e` bg + `#4ade80` green. No dark mode awareness.
- [ ] **Grove-ify palette**: Classic → grove-green on bark-brown. LCD → leaf-tinted screen. Odometer → cream/bark tones.

### API issue

- [ ] **No dedup**: Every page load increments. Bots, refreshes, everything counts. Implement daily IP+UA hash dedup — `SHA-256(ip + userAgent + date + pagePath)` checked against `hit_counter_visitors` table. Privacy-preserving, no PII stored.

### Admin

- [ ] Update preview palette to match Grove-ified public component.

---

## 2. Mood Ring

**Character**: Organic, dreamy, alive. Should feel like holding a real mood ring.

### Public component issues

- [ ] **displayStyle ignored**: Admin offers ring/gem/orb. Public always renders a flat circle with border.
- [ ] **No glow effect**: Admin preview has `box-shadow` glow. Public has none.
- [ ] **Minimal visual impact**: Just a colored circle + text label. No animation, no transition, no life.

### Polish ideas

- [ ] Render all 3 display styles (ring, gem, orb) in public
- [ ] Add subtle pulse/glow animation (respects prefers-reduced-motion)
- [ ] The orb style especially should feel magical — radial gradient with light refraction

### Admin

- [ ] (Already decent — has live preview with all 3 styles + mood log timeline)

---

## 3. Now Playing

**Character**: Cozy record shop. Music in the background of a warm space.

### Public component — actually pretty good!

- [x] Has animated equalizer bars (3-bar bounce) with reduced-motion fallback
- [x] Album art display with fallback icon
- [x] Italic fallback text ("the forest rests")
- [x] Accessible aria-label

### Polish ideas

- [ ] The equalizer bars use hardcoded `#4ade80` — should use grove-green CSS var
- [ ] Could add a very subtle vinyl-spin animation on the album art when playing (reduced-motion: none)
- [ ] The fallback icon (music note SVG) is just gray — could be warmer

### Admin

- [ ] (Good — has current track display, manual entry, provider settings, history)
- [ ] Subtitle already has warmth: "Share what you're listening to — music fills the grove."

---

## 4. Guestbook

**Character**: Warm, handwritten, cozy. Like a physical guestbook at a B&B.

### Public component issues

- [ ] **Cold styling**: `rgba(0,0,0,0.04)` backgrounds, no personality. Could be any app.
- [ ] **No warmth cues**: Missing hand-drawn borders, warm tones, notebook-paper feel
- [ ] **Footer is stark**: "42 entries total" in tiny italic. Could link to full guestbook page.

### Polish ideas

- [ ] Warm background tint (cream/paper) instead of transparent gray
- [ ] Entry cards with slightly rounded, organic shapes (not sharp rectangles)
- [ ] Add subtle left-border accent color per entry (rotating warm tones)
- [ ] "Sign the guestbook" link in footer to full guestbook page

### Admin

- [ ] (Good — has settings + moderation tabs, style options, toast feedback)
- [ ] Copy is warm: "Let visitors sign your guestbook. The classic personal web element."
- [ ] Uses lucide-svelte icons (BookOpen, Shield) — could migrate to engine icons eventually

---

## 5. Badges

**Character**: Collectible, playful, rewarding. Like enamel pins on a backpack or scout badges sewn onto a sash.

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

### Major expansion: Pre-built Badge Library

**Format**: Custom Grove format — not copying geocities 88x31, designing our own badge shape/size that feels uniquely Grove. Mix of shapes depending on category (but all cohesive).

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

- [ ] **Badge wall display**: Public component renders as a WALL/GRID, not pills
- [ ] **Showcase shelf**: Top 3-5 showcased badges get special treatment — larger, glowing, centered
- [ ] **Badge builder** (future): Simple generator — pick shape, colors, icon, text
- [ ] **Image upload**: Wire into Custom Uploads curio (not external URLs) — already has R2 storage, 100-image quota, thumbnail generation
- [ ] **Trading/gifting** (future): Let tenants gift custom badges to each other

### Admin

- [ ] (Good foundation — showcase toggle, custom creation, system catalog)
- [ ] Add badge preview at different sizes (pill, 88x31, pin)
- [ ] Add image upload for custom badge icons (not just URL)

---

## 6. Blogroll

**Character**: Cozy link exchange. Your favorite corners of the internet, shared warmly.

### Public component — decent foundation

- [x] Vertical list with favicon fetch via Google's favicon API
- [x] Hover arrow reveal animation
- [x] Dark mode support
- [x] Accessible link list

### Polish ideas

- [ ] **Hardcoded colors**: Uses `rgba(0,0,0,0.04)` backgrounds — should use theme vars
- [ ] **No personality**: Just a link list. Could add subtle warmth — soft separators, warm hover tint
- [ ] **Favicon fallback**: When Google favicon API fails, shows nothing. Should show a warm default icon (leaf? seedling?)
- [ ] **No descriptions**: Links are just titles. The API might send descriptions — render them as subtle subtext

### Admin

- [ ] (Functional — add/remove/reorder links, URL + title + description fields)

---

## 7. Webring

**Character**: Retro web solidarity. The original social network — linking to your neighbors.

### Public component issues

- [ ] **Hardcoded `#4ade80`**: Nav buttons use raw green hex instead of grove vars
- [ ] **Generic layout**: `← Prev | Ring Name | Next →` bar is functional but boring
- [ ] **No ring identity**: Could show ring icon/badge, member count, "1 of 42" position

### Polish ideas

- [ ] **Grove-ify colors**: Use `rgb(var(--grove-500))` instead of `#4ade80`
- [ ] **Add character**: Subtle border, ring icon, warm background tint
- [ ] **Ring info**: Show ring description on hover/expand
- [ ] **Retro option**: An 88x31-style webring banner option would be _chef's kiss_

### Admin

- [ ] (Good — create/join rings, manage membership, ring settings)

---

## 8. Link Garden

**Character**: Curated collection. A personal directory of the internet's best spots.

### Public component — actually solid

- [x] Organized sections with headers
- [x] List and grid layout modes
- [x] Button images support
- [x] Clean accessible markup

### Polish ideas

- [ ] **Hardcoded rgba colors**: Background/border use generic values
- [ ] **No section icons**: Headers are plain text — could have emoji or small icons
- [ ] **Grid cards are flat**: Could benefit from subtle glass effect or warm shadows
- [ ] **No "visit" animation**: Clicking a link could have a brief leaf/sparkle departure effect

### Admin

- [ ] (Comprehensive — sections, links, images, ordering, layout toggle)

---

## 9. Activity Status

**Character**: Quick pulse check. "Currently: writing in a coffee shop"

### Public component — clean and minimal

- [x] Inline `emoji + text` pill format
- [x] Silent fail on error (doesn't break page)
- [x] Dark mode aware

### Polish ideas

- [ ] **Could pulse/breathe**: A very subtle animation to show it's "live" (prefers-reduced-motion aware)
- [ ] **Timestamp**: "Updated 2h ago" would add context
- [ ] **No warm fallback**: When offline, shows nothing. Could show "Wandering the grove..." or similar

### Admin

- [ ] (Simple and effective — emoji picker, status text, clear button)

---

## 10. Status Badge

**Character**: Living indicators. Small badges that show real-time states.

### Public component — good animation work

- [x] Animated pill badges with pulse animation
- [x] Multiple badges in a row
- [x] Color-coded by status type

### Polish ideas

- [ ] **Hardcoded colors**: Status colors might not align with grove palette
- [ ] **Could be richer**: Badges could show trend arrows (up/down) or sparklines
- [ ] **No grouping**: All badges are flat. Could group by category with subtle dividers

### Admin

- [ ] (Good — badge creation, status types, color picker, ordering)

---

## 11. Bookmark Shelf

**Character**: A cozy reading nook. Books and articles displayed like a real shelf.

### Public component — charming concept

- [x] Shelf sections with cover images
- [x] "Reading" and "Favorite" status badges
- [x] Clean grid layout

### Polish ideas

- [ ] **Shelf visual**: Could have an actual shelf line/shadow beneath rows for physical bookshelf feel
- [ ] **Book spines**: When no cover image, show a colored "spine" with title text (like real books on a shelf)
- [ ] **Reading progress**: If API sends progress %, show a subtle progress bar on the cover
- [ ] **Warm empty state**: "The shelf is empty — time to start reading!" with a cozy illustration

### Admin

- [ ] (Good — add books/articles, cover upload, status toggle, sections)

---

## 12. Artifacts

**Character**: Digital treasures. Collectible items with lore and history.

### Public component — placeholder only

- [ ] **Not implemented**: Just shows "Coming soon" cards
- [ ] **Concept is strong**: Artifacts as discoverable items with lore text, rarity, visual effects

### Future vision

- [ ] Artifact cards with flip animation to reveal lore
- [ ] Rarity glow effects (common → legendary progression)
- [ ] Collectible counter ("3 of 12 artifacts discovered")
- [ ] Hidden artifacts that appear based on conditions (time, season, page visits)

### Admin

- [ ] (Placeholder — waiting for full design)

---

## 13. Polls

**Character**: Community voice. Quick, fun, low-pressure engagement.

### Public component — functional

- [x] Question + horizontal bar chart results
- [x] Vote indicator (shows which option you picked)
- [x] Percentage labels on bars

### Polish ideas

- [ ] **Bars are generic**: Could use grove-green gradient fill instead of flat color
- [ ] **No animation**: Results could animate in (bars growing from left)
- [ ] **Winner highlight**: Leading option could have subtle glow or crown icon
- [ ] **Closed state**: Expired polls could show "Voting closed" with final results styled differently

### Admin

- [ ] (Good — question editor, option management, results view, close/reopen)

---

## 14. Shrines

**Character**: Personal altars. Dedicated spaces for things you love — fandoms, memories, gratitude.

### Major gap: No public component

- [ ] **CurioShrines.svelte does NOT exist** — admin page and data model are complete, but visitors can't see shrines
- [ ] Admin supports: 6 shrine types (memory, fandom, achievement, gratitude, inspiration, blank), 6 frame styles (wood, stone, crystal, floral, cosmic, minimal), 3 sizes
- [ ] Content items positioned with x/y coordinates — it's a spatial layout system

### Implementation needed

- [ ] Build `CurioShrines.svelte` public component
- [ ] Render shrine frame with appropriate style (wood grain texture, crystal sparkle, etc.)
- [ ] Position content items within the frame at their x/y coords
- [ ] Each frame style should have REAL character — not just border color differences

### Admin

- [ ] (Well-built — create/manage shrines, type/size/frame pickers, publish toggle)

---

## 15. Cursors

**Character**: Whimsical, personal. Your cursor is your avatar in this space.

### Public component — functional

- [x] 13 preset cursors (leaf, flower, butterfly, ladybug, etc.)
- [x] SVG data URIs with color overrides
- [x] Trail effect config (sparkle, fairy-dust, leaves, stars)
- [x] Respects prefers-reduced-motion

### Polish ideas

- [ ] **Trail canvas not implemented**: Config exists but trails don't actually render yet
- [ ] **No preview on page**: Visitors don't know they have a custom cursor until they move
- [ ] **SVGs could be warmer**: Current presets are functional but could have more detail/charm

### Admin

- [ ] (Clean — radio preset selection grouped by category, trail toggle, length slider)

---

## 16. Ambient

**Character**: The soundtrack of your space. Forest rain, crackling fire, night crickets.

### Public component — production-ready

- [x] Fixed play/pause button (bottom-left, z-40)
- [x] Glassmorphic UI with backdrop blur
- [x] Volume control, seamless looping
- [x] No autoplay (respects user gesture)
- [x] Proper cleanup on unmount

### Polish ideas

- [ ] **Button could be warmer**: Currently `rgba(255,255,255,0.8)` — could use grove glass styling
- [ ] **Sound visualization**: Tiny waveform or equalizer bars on the button when playing
- [ ] **Sound label**: Show which sound is playing on hover ("Forest Rain")
- [ ] **Crossfade on sound change**: If sound set changes while playing, crossfade instead of hard cut

### Admin

- [ ] (Good — sound set dropdown, volume slider, enable toggle, custom URL for Oak+)

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

**Character**: The shared media backbone powering all other curios.

### Architecture (reviewed)

- **Storage**: R2 at `curios/{tenant_id}/uploads/{id}.{ext}` + thumbnail at `{id}_thumb.webp`
- **Formats**: PNG, GIF, WebP only (SVG excluded for XSS safety)
- **Limits**: 100 uploads/tenant, 5MB/file, 512px max dimension, 128px thumbnails
- **Data model**: `custom_uploads` D1 table with id, filename, mime_type, file_size, width, height, r2_key, usage_count
- **Consumer pattern**: Other curios store the CDN URL string (not an upload ID reference)

### Issues found

- [ ] **`usage_count` is dead**: Field exists but never incremented/decremented — always 0
- [ ] **No upload UI in the admin page**: Only shows management/deletion. Upload happens... somewhere else?
- [ ] **No picker for other curios**: Badges/cursors/shrines ask for a URL — should have a "pick from uploads" button
- [ ] **No category/tagging**: 100 images in a flat list gets unwieldy. Needs folders or tags (badge icons, shrine images, cursor art, etc.)

### Polish ideas

- [ ] Wire `usage_count` tracking when curios reference an upload
- [ ] Add inline upload dropzone to the admin page
- [ ] Build a shared "Upload Picker" component that other curio admin pages can embed
- [ ] Add category/tag support for organizing uploads by purpose

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

## Missing public components (5 curios)

These curios have admin pages and data models but **no public hydration component**:

| Curio        | Admin Complexity          | Priority                   |
| ------------ | ------------------------- | -------------------------- |
| **Gallery**  | Comprehensive (R2/Amber)  | High — most visible        |
| **Timeline** | Massive (1622 lines, AI)  | High — flagship feature    |
| **Pulse**    | Complete (webhooks)       | Medium — developer-focused |
| **Shrines**  | Complete (spatial layout) | Medium — unique concept    |
| **Clip Art** | Complete (positioning)    | Lower — decorative         |

**Journey** is still a placeholder ("Coming Soon") — no component needed yet.

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

## Implementation priority (suggested)

### Wave 1 — Quick polish (existing components)

1. Hit Counter — render all 4 styles, grove palette, dedup
2. Mood Ring — render all 3 display styles, glow/pulse animation
3. Now Playing — swap hardcoded green, vinyl spin, warm fallback
4. Guestbook — warm palette, organic shapes, accent borders
5. Webring — grove colors, character
6. Cross-cutting — shared `.sr-only`, replace hardcoded colors

### Wave 2 — Badges expansion

7. Badges — badge wall display, 88x31 format, pre-built library, badge builder, showcase shelf

### Wave 3 — Missing components

8. Gallery — masonry grid, lightbox, tags
9. Timeline — AI summary display, voice-styled rendering
10. Pulse — heatmap, activity feed, stats
11. Shrines — spatial frame rendering
12. Clip Art — positioned overlays

### Wave 4 — Future

13. Artifacts — full collectible system
14. Journey — path visualization (waiting on design)
15. Cursor trails — canvas rendering
