---
title: "Curio: Status Badge"
status: planned
category: features
---

# Curio: Status Badge

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 10

---

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
- [ ] **Uses @lucide/svelte directly** (ArrowLeft, Shield, Plus, Trash2, Eye)

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
- [ ] **Migrate from @lucide/svelte** to engine icons

### Migration needs

- [ ] New table `statusbadge_config`:
  - `tenant_id TEXT PRIMARY KEY` — FK to tenants
  - `display_style TEXT DEFAULT 'garden-signs'` — one of 5 styles
- [ ] New columns on `status_badges`:
  - `color TEXT DEFAULT NULL` — hex color override
  - `custom_emoji TEXT DEFAULT NULL` — emoji for custom badges
- [ ] Expand `badge_type` CHECK constraint to include 14 new preset types + "custom"
- [ ] Deprecate `position` column (keep, stop using — no destructive migration)
