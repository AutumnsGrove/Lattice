---
title: "Reverie Expansion Safari"
description: "Mapping all possible Reverie domain schemas and configuration levers"
category: safari
lastUpdated: "2026-03-02"
tags:
  - reverie
  - ai
  - configuration
---

# Reverie Expansion Safari — Every Lever in the Grove

> *The jeep idles at the edge of the grove. Binoculars around your neck, journal open on the dashboard. The territory stretches in every direction — themes, curios, content, community, identity. 32 stops. 100+ levers. One mission: map everything a Wanderer should be able to touch with their voice.*

> **Aesthetic principle**: Dreams, not specifications. A Wanderer says "make my site feel cozy" and Reverie knows which 8 levers to pull.
> **Architecture principle**: Batch tool-calling API, not MCP. Progressive discovery. Router is tiny, domains load on demand.
> **Scope**: Every configuration surface in Grove that Reverie could sensibly act on.

**Safari Date:** 2026-03-01
**Territory:** All Grove configuration domains
**Stops:** 32 domains across 6 territory groups
**Terrain:** Database tables, API endpoints, type definitions, admin pages

---

## Ecosystem Overview

**3 databases**, **~123 tables**, **32 configuration domains**, **100+ individually configurable fields**

Grove's configuration surfaces span from simple boolean toggles (comments on/off) to deep JSON structures (custom color palettes) to creative composition (arranging clipart on a page). Reverie needs to bridge all of these through natural language.

### Territory Groups

**Group 1 — Grove Identity** (3 stops): Profile, Activity Status, Badges
**Group 2 — Appearance** (6 stops): Foliage Theme, Accent Color, Typography, Custom CSS, Custom Layout, Cursor
**Group 3 — Content Organization** (3 stops): Posts/Blooms, Pages, Blazes
**Group 4 — Social & Community** (6 stops): Comments, Meadow, Canopy, Webring, Blogroll, Guestbook
**Group 5 — Curio Widgets** (11 stops): Timeline, Journey, Gallery, Pulse, Now Playing, Mood Ring, Hit Counter, Link Garden, Polls, Ambient, Shrines/Bookmark Shelf
**Group 6 — Infrastructure** (3 stops): Billing, Feature Flags, Storage/Media

---

## The Route Map

| # | Stop | Group | Complexity | Priority | Time Saved |
|---|------|-------|-----------|----------|------------|
| 1 | **Foliage Theme** | Appearance | Deep | Critical | High |
| 2 | **Accent Color** | Appearance | Simple | Critical | Medium |
| 3 | **Typography & Fonts** | Appearance | Medium | Critical | High |
| 4 | **Profile & Identity** | Identity | Simple | High | Medium |
| 5 | **Blazes** | Content | Medium | High | High |
| 6 | **Comment Settings** | Social | Simple | High | Medium |
| 7 | **Meadow Settings** | Social | Simple | High | Low |
| 8 | **Canopy Directory** | Social | Medium | High | Medium |
| 9 | **Posts/Blooms** | Content | Deep | Critical | Very High |
| 10 | **Pages** | Content | Medium | Medium | High |
| 11 | **Custom CSS** | Appearance | Deep | Medium | High |
| 12 | **Custom Layout** | Appearance | Deep | Medium | Medium |
| 13 | **Cursor** | Appearance | Simple | Low | Low |
| 14 | **Activity Status** | Identity | Simple | Medium | Low |
| 15 | **Mood Ring** | Curio | Medium | Medium | Medium |
| 16 | **Gallery** | Curio | Deep | Medium | High |
| 17 | **Now Playing** | Curio | Medium | Medium | Medium |
| 18 | **Guestbook** | Social | Medium | Medium | Medium |
| 19 | **Timeline** | Curio | Deep | Low | Medium |
| 20 | **Journey** | Curio | Deep | Low | Medium |
| 21 | **Pulse** | Curio | Medium | Low | Medium |
| 22 | **Hit Counter** | Curio | Simple | Low | Low |
| 23 | **Link Garden** | Curio | Medium | Medium | Medium |
| 24 | **Polls** | Curio | Medium | Low | Low |
| 25 | **Webring** | Social | Simple | Low | Low |
| 26 | **Blogroll** | Social | Medium | Medium | Medium |
| 27 | **Ambient** | Curio | Simple | Low | Low |
| 28 | **Bookmark Shelf** | Curio | Medium | Low | Medium |
| 29 | **Shrines** | Curio | Medium | Low | Low |
| 30 | **Badges** | Identity | Medium | Low | Low |
| 31 | **Billing & Plan** | Infra | Read-Only | Medium | Low |
| 32 | **Feature Flags** | Infra | Admin-Only | Low | Low |

---

## Group 1: Grove Identity

*The jeep rolls to a stop at the first clearing. Dust settles. Through the binoculars: a Wanderer's name, their color, what they care about. The very first things you set up when you enter the grove.*

---

### 1. Profile & Identity

**Character**: The foundation of who you are in the grove. Your name, your corner of the sky, your favorite color.

**What a Wanderer might say:**
- "Change my display name to Autumn"
- "I want my grove to be at moonlight.grove.place"
- "Set my favorite color to lavender"
- "I'm into writing, photography, and queer stuff"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `displayName` | string | Required | `user_onboarding`, `tenants` |
| `username` | string | 3-30 chars, unique, alnum+hyphens | `user_onboarding`, `tenants.subdomain` |
| `favoriteColor` | hex color | Any valid hex | `user_onboarding` |
| `interests` | JSON array | From predefined list | `user_onboarding` |

**Interests options**: Writing/Blogging, Photography, Art/Design, Cooking/Food, Technology, Travel, Personal/Journal, Business/Professional, Other

**Implementation:**
- API: `POST /api/save-profile`
- Schema: `libs/engine/src/lib/server/db/schema/engine.ts:229-281`
- Admin: Arbor settings page

**Reverie domain complexity**: Simple — direct field mapping, no cross-effects.

---

### 2. Activity Status

**Character**: Your "what I'm doing right now" beacon. Like an AIM away message for the indie web.

**What a Wanderer might say:**
- "Set my status to 'writing in the garden'"
- "Put a little leaf emoji on my status"
- "Clear my status"
- "Set my status to auto-detect from GitHub"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `statusText` | string | Free text | `activity_status` |
| `statusEmoji` | string | Single emoji | `activity_status` |
| `statusType` | enum | `manual` / `auto` | `activity_status` |
| `preset` | string | Pre-defined options | `activity_status` |
| `autoSource` | string | e.g., GitHub API | `activity_status` |
| `expiresAt` | timestamp | Auto-clear time | `activity_status` |

**Implementation:**
- Schema: `libs/engine/src/lib/server/db/schema/curios.ts:421-430`
- Admin: `/arbor/curios/activitystatus/`

**Reverie domain complexity**: Simple — direct field mapping with optional expiry.

---

### 3. Badges & Achievements

**Character**: Your trophy case. Earned through milestones, showcased with pride.

**What a Wanderer might say:**
- "Show my early adopter badge on my profile"
- "Create a custom badge called 'Tea Enthusiast'"
- "Showcase my top 3 badges"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `isShowcased` | boolean | Per badge | `tenant_badges` |
| `displayOrder` | integer | Ordering | `tenant_badges` |
| Custom badges | name, desc, icon | Per tenant | `custom_badges` |

**Implementation:**
- Schema: `libs/engine/src/lib/server/db/schema/curios.ts:612-642`
- Admin: `/arbor/curios/badges/`

**Reverie domain complexity**: Medium — CRUD operations plus ordering.

---

## Group 2: Appearance

*The terrain changes. The jeep climbs a ridge and suddenly the whole grove is visible below — themes, colors, fonts, the visual identity of every site. This is the BIG territory. The one Wanderers care about most and struggle with the hardest.*

---

### 4. Foliage Theme

**Character**: The soul of your site's look. Not just a color — a complete feeling.

**What a Wanderer might say:**
- "Make my site feel like a midnight library"
- "Switch to a dark theme"
- "I want something warm and earthy"
- "Use the grove theme but make it more purple"
- "Apply that community theme I saw called 'Dusk Garden'"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `themeId` | string | From theme catalog | `theme_settings` |
| `communityThemeId` | string | FK to community_themes | `theme_settings` |
| `customizerEnabled` | boolean | Unlock custom overrides | `theme_settings` |

**Implementation:**
- Schema: `libs/engine/src/lib/server/db/schema/engine.ts:1196-1209`
- Community themes: `engine.ts:1225-1257` (full marketplace with status, ratings, thumbnails)
- Package: `@autumnsgrove/foliage`

**Reverie domain complexity**: Deep — theme selection has cascading effects. A "vibe" request like "midnight library" needs to resolve to themeId + accent + font + custom colors together. This is where Reverie's **cross-domain composition** shines.

**Cross-domain interactions:**
- Theme choice influences ideal accent color, font, and layout
- "Cozy" → warm amber accent + Calistoga display font + foliage decorations
- "Professional" → Ocean Blue accent + Plus Jakarta Sans + minimal layout

---

### 5. Accent Color

**Character**: The single most impactful visual choice. One hex value that colors everything.

**What a Wanderer might say:**
- "Make my accent color lavender"
- "I want something warmer, like sunset"
- "Use deep plum"
- "Match my favorite color"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `accentColor` | hex color | Valid hex | `theme_settings` |
| `accent_color` | hex color | Via site_settings KV | `site_settings` |

**Preset palette** (12 curated colors):
- Grove Green `#16a34a`, Meadow Green `#22c55e`
- Ocean Blue `#0284c7`
- Deep Plum `#581c87`, Violet Purple `#8b5cf6`, Lavender `#a78bfa`
- Cherry Blossom `#ec4899`, Tulip Pink `#f9a8d4`
- Sunset Ember `#c2410c`, Golden Amber `#d97706`, Autumn Gold `#eab308`
- Cardinal Red `#dc2626`

**Implementation:**
- Presets: `libs/engine/src/lib/config/presets.ts:23-47`
- API: `PUT /api/admin/settings` with key `accent_color`
- Validation: hex regex `/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/`

**Reverie domain complexity**: Simple — direct mapping from name or description to hex value. Reverie should know the palette AND accept custom colors.

---

### 6. Typography & Fonts

**Character**: How your words feel on the page. The difference between a journal and a newspaper.

**What a Wanderer might say:**
- "I want a handwritten font for my blog"
- "Use something more readable, I have dyslexic readers"
- "Make my headlines feel medieval"
- "Use a monospace font for that hacker vibe"
- "Set this specific post to use Merriweather"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `font_family` | font ID | From catalog (11 fonts) | `site_settings` |
| `customTypography` | JSON | Font rules override | `theme_settings` |
| Per-post `font` | font ID | 21 options | `posts.font` |
| Per-page `font` | font ID | 21 options | `pages.font` |
| Custom font upload | WOFF2 file | Evergreen tier only | `custom_fonts` |

**Font catalog** (11 built-in):

| ID | Name | Category | Vibe |
|----|------|----------|------|
| `lexend` | Lexend | Default | Modern, readable (Grove default) |
| `atkinson` | Atkinson Hyperlegible | Accessibility | Maximum character distinction |
| `opendyslexic` | OpenDyslexic | Accessibility | Weighted bottoms for dyslexic readers |
| `quicksand` | Quicksand | Sans-serif | Light, rounded, modern |
| `plus-jakarta-sans` | Plus Jakarta Sans | Sans-serif | Contemporary, balanced |
| `ibm-plex-mono` | IBM Plex Mono | Monospace | Corporate warmth, great for code |
| `cozette` | Cozette | Monospace | Retro terminal bitmap aesthetic |
| `alagard` | Alagard | Display | Pixel art medieval fantasy |
| `calistoga` | Calistoga | Display | Casual brush serif, friendly |
| `caveat` | Caveat | Display | Handwritten script, personal |

**Implementation:**
- Catalog: `libs/engine/src/lib/ui/tokens/fonts.ts:46-188`
- API: `PUT /api/admin/settings` key `font_family`
- Per-post: `PUT /api/blooms/:slug` with `font` field
- Upload: `libs/foliage/src/lib/server/font-uploader.ts`

**Reverie domain complexity**: Medium — needs to map vibes ("handwritten", "accessible", "hacker") to font IDs. Cross-domain with theme (some themes pair better with certain fonts).

---

### 7. Custom Colors

**Character**: Beyond the accent — a full color vocabulary for your grove.

**What a Wanderer might say:**
- "I want a warm color palette, ambers and golds"
- "Make the background slightly pink-tinted"
- "Use forest greens throughout"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `customColors` | JSON | Color palette object | `theme_settings` |

**Implementation:**
- Schema: `libs/engine/src/lib/server/db/schema/engine.ts:1203`
- Requires `customizerEnabled = true`

**Reverie domain complexity**: Deep — freeform JSON structure. Reverie needs to generate valid color palettes from vibes. Strong candidate for composition (generate palette from mood words).

---

### 8. Custom CSS

**Character**: The escape hatch. Raw power for those who want pixel-perfect control.

**What a Wanderer might say:**
- "Add a subtle glow to my post titles"
- "Make the sidebar slightly transparent"
- "Round all my image corners"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `customCss` | JSON/string | CSP-validated | `theme_settings` |

**Implementation:**
- Schema: `libs/engine/src/lib/server/db/schema/engine.ts:1206`
- Gallery also has: `gallery_curio_config.customCss` (max 10,000 chars, sanitized)
- Sanitization: blocks `url()`, `@import`, `expression()`, `-moz-binding`, `behavior()`, `javascript:`

**Reverie domain complexity**: Deep — Reverie could generate CSS snippets from natural language. "Add a glow to post titles" → `.post-title { text-shadow: 0 0 10px rgba(255,200,100,0.3); }`. High value but needs careful sanitization.

---

### 9. Custom Layout

**Character**: How the pieces of your grove arrange themselves on the page.

**What a Wanderer might say:**
- "Put my sidebar on the left"
- "Make my blog a single column"
- "I want a wider content area"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `customLayout` | JSON | Layout overrides | `theme_settings` |

**Implementation:**
- Schema: `libs/engine/src/lib/server/db/schema/engine.ts:1205`

**Reverie domain complexity**: Medium — structured JSON with known fields.

---

### 10. Cursor

**Character**: The tiniest personal touch. Your mouse cursor, your trail of sparkles.

**What a Wanderer might say:**
- "Give me a leaf cursor"
- "I want sparkle trails when I move my mouse"
- "Use a custom cursor from this image"
- "Turn off cursor effects"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `cursorType` | enum | `preset` / `custom` | `cursor_config` |
| `preset` | string | `leaf`, `star`, `sparkle` etc. | `cursor_config` |
| `customUrl` | URL | Image URL | `cursor_config` |
| `trailEnabled` | boolean | On/off | `cursor_config` |
| `trailEffect` | enum | `sparkle`, `stardust`, `glow` | `cursor_config` |
| `trailLength` | integer | 1-20, default 8 | `cursor_config` |

**Implementation:**
- Schema: `libs/engine/src/lib/server/db/schema/curios.ts:552-561`
- Admin: `/arbor/curios/cursors/`

**Reverie domain complexity**: Simple — enum selection + toggles.

---

## Group 3: Content Organization

*The jeep descends into the valley where all the content lives. Posts, pages, categories — the things people actually WRITE.*

---

### 11. Posts / Blooms

**Character**: The beating heart of every grove. Creating, publishing, organizing your writing.

**What a Wanderer might say:**
- "Create a new draft post called 'Morning Thoughts'"
- "Publish my draft about tea ceremonies"
- "Use the Caveat font for my latest post"
- "Tag my post with 'food-review' blaze"
- "Hide this post from the community feed"
- "Set a featured image for my latest post"
- "Archive all posts older than 6 months"

**Levers (per post):**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `title` | string | Max 200 chars | `posts` |
| `slug` | string | Auto-generated or custom | `posts` |
| `description` | string | Max 500 chars | `posts` |
| `markdownContent` | string | Max 1MB | `posts` |
| `tags` | JSON array | String array | `posts` |
| `status` | enum | `draft`/`published`/`archived` | `posts` |
| `font` | font ID | 21 options | `posts` |
| `featuredImage` | URL | HTTP/HTTPS validated | `posts` |
| `meadowExclude` | boolean | 0/1 | `posts` |
| `blaze` | string | Blaze slug | `posts` |
| `storageLocation` | enum | `hot`/`warm`/`cold` | `posts` |
| `gutterContent` | JSON | Sidebar annotations | `posts` |

**Implementation:**
- API: `POST /api/blooms`, `PUT /api/blooms/:slug`, `DELETE /api/blooms/:slug`
- Schema: `libs/engine/src/lib/server/db/schema/engine.ts:79-119`
- Rate limit: 20 posts/hour

**Tier limits**: Free=0, Seedling=5, Sapling=20, Oak=∞, Evergreen=∞

**Reverie domain complexity**: Deep — CRUD + configuration + cross-references (blazes, fonts, meadow). This domain does the MOST for Wanderers. High-priority.

---

### 12. Pages

**Character**: The permanent landmarks of your grove. About, contact, custom pages that don't flow like posts.

**What a Wanderer might say:**
- "Create an 'About Me' page"
- "Add a hero image to my about page"
- "Change my contact page font to something friendlier"

**Levers (per page):**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `title` | string | Max 200 chars | `pages` |
| `slug` | string | Max 100 chars | `pages` |
| `description` | string | Max 500 chars | `pages` |
| `markdownContent` | string | Max 1MB | `pages` |
| `hero` | JSON | Hero section config | `pages` |
| `font` | font ID | 21 options | `pages` |
| `type` | string | Default "page" | `pages` |

**Implementation:**
- API: `POST /api/pages`, `PUT /api/pages/:slug`
- Schema: `libs/engine/src/lib/server/db/schema/engine.ts:125-149`
- Protected slugs: "home", "about" cannot be deleted

**Reverie domain complexity**: Medium — CRUD + hero config.

---

### 13. Blazes (Content Categories)

**Character**: Your custom content taxonomy. Little flame icons that categorize your posts with personality.

**What a Wanderer might say:**
- "Create a blaze called 'Tea Reviews' with a cup icon in amber"
- "I want a 'Code Notes' category with a terminal icon"
- "Delete the 'announcement' blaze"
- "Show me all my custom blazes"
- "Reorder my blazes so 'personal' is first"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `slug` | string | 2-40 chars, lowercase alnum+hyphens | `blaze_definitions` |
| `label` | string | Max 30 chars | `blaze_definitions` |
| `icon` | string | Lucide icon name | `blaze_definitions` |
| `color` | string | Palette key OR hex | `blaze_definitions` |
| `sortOrder` | integer | Display ordering | `blaze_definitions` |

**8 global defaults**: update, food-review, personal, tutorial, project, review, thought, announcement

**Color palette keys**: sky, rose, pink, violet, amber, yellow, slate, grove

**Implementation:**
- API: `GET /api/blazes`, `POST /api/blazes`, `DELETE /api/blazes/:slug`
- Schema: `libs/engine/src/lib/server/db/schema/engine.ts:507-525`
- Rate limit: 10/hour, soft cap 20 per tenant
- Spec: `docs/specs/blazes-spec.md`

**Reverie domain complexity**: Medium — CRUD with constrained options. Natural language maps well ("amber cup icon" → color:amber, icon:UtensilsCrossed).

---

## Group 4: Social & Community

*The jeep fords a stream and enters the social meadow. Other Wanderers are visible in the distance. This is where your grove connects to the wider world.*

---

### 14. Comment Settings (Reeds)

**Character**: How visitors speak to you. Open conversation or quiet garden.

**What a Wanderer might say:**
- "Turn off comments on my blog"
- "Only let registered users comment"
- "Notify me when someone replies to a thread"
- "Turn on comment counts"
- "Block that user from commenting"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `commentsEnabled` | boolean | On/off | `comment_settings` |
| `publicCommentsEnabled` | boolean | Allow anonymous | `comment_settings` |
| `whoCanComment` | enum | `anyone`/`registered`/`rooted` | `comment_settings` |
| `showCommentCount` | boolean | Display count | `comment_settings` |
| `notifyOnReply` | boolean | Email on reply | `comment_settings` |
| `notifyOnPending` | boolean | Email on pending | `comment_settings` |
| `notifyOnThreadReply` | boolean | Email on thread | `comment_settings` |

**Implementation:**
- Schema: `libs/engine/src/lib/server/db/schema/engine.ts:701-713`
- Related: `blocked_commenters`, `comment_rate_limits`

**Reverie domain complexity**: Simple — all boolean toggles + one enum. Perfect for natural language.

---

### 15. Meadow (Community Feed)

**Character**: The shared clearing where all groves meet. Opt in, and your posts join the community river.

**What a Wanderer might say:**
- "Join the community feed"
- "Leave the meadow"
- "Hide my latest post from the community feed"
- "Show all my posts in the meadow again"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `meadowOptIn` | boolean | 0/1 | `tenants` |
| `meadowExclude` (per post) | boolean | 0/1 | `posts` |

**Implementation:**
- API: `PUT /api/admin/meadow` with `{ meadow_opt_in: boolean }`
- Per-post: via `PUT /api/blooms/:slug` with `meadow_exclude` field

**Reverie domain complexity**: Simple — two toggles (one global, one per-post).

---

### 16. Canopy Directory

**Character**: Your listing in the Grove directory. How other Wanderers discover you.

**What a Wanderer might say:**
- "List me in the Canopy directory"
- "Set my tagline to 'queer writer building a cozy corner of the web'"
- "Add 'writing' and 'queer' to my directory categories"
- "Hide me from the directory"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `canopy_visible` | boolean | "true"/"false" | `site_settings` |
| `canopy_banner` | string | Max 160 chars | `site_settings` |
| `canopy_categories` | JSON array | From predefined list | `site_settings` |
| `canopy_show_forests` | boolean | Future feature | `site_settings` |

**Categories**: writing, photography, art, code, music, poetry, gaming, food, travel, science, queer, journal, other

**Implementation:**
- API: `PUT /api/admin/settings` with respective keys
- Validation: strict whitelist, categories from `CANOPY_CATEGORIES`
- Source: `libs/engine/src/lib/config/canopy-categories.ts`

**Reverie domain complexity**: Simple — direct mapping.

---

### 17. Guestbook

**Character**: Your visitor book. A warm, nostalgic invitation for strangers to leave their mark.

**What a Wanderer might say:**
- "Enable my guestbook"
- "Use the pixel art style for my guestbook"
- "Require approval before entries show up"
- "Allow emoji reactions in my guestbook"
- "Set the prompt to 'Leave a note for a fellow wanderer...'"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `enabled` | boolean | On/off | `guestbook_config` |
| `style` | enum | `classic`/`modern`/`pixel`/`cozy` | `guestbook_config` |
| `entriesPerPage` | integer | Default 20 | `guestbook_config` |
| `requireApproval` | boolean | Default true | `guestbook_config` |
| `allowEmoji` | boolean | Default true | `guestbook_config` |
| `maxMessageLength` | integer | Default 500 | `guestbook_config` |
| `customPrompt` | string | Placeholder text | `guestbook_config` |

**Additional display config** (from type definitions):
- `wallBacking`: `glass`/`cork`/`paper`/`none`
- `ctaStyle`: `button`/`floating`
- `colorPalette`: custom accent colors
- `inlineMode`: `compact`/`styled`

**Entry styles**: sticky, note, line, letter, postcard, doodle

**Implementation:**
- Schema: `libs/engine/src/lib/server/db/schema/curios.ts:346-369`
- Admin: `/arbor/curios/guestbook/`
- API: `GET/POST /api/curios/guestbook`, `PATCH /:id` (approve/reject)

**Reverie domain complexity**: Medium — mix of enums, booleans, and creative options.

---

### 18. Webring

**Character**: The old web. Linking groves in a circle, navigating the neighborhood.

**What a Wanderer might say:**
- "Join a webring called 'Queer Creators'"
- "Put the webring badge in my footer"
- "Use the classic badge style"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `ringName` | string | Ring title | `webring_memberships` |
| `ringUrl` | URL | Ring homepage | `webring_memberships` |
| `prevUrl` | URL | Previous site | `webring_memberships` |
| `nextUrl` | URL | Next site | `webring_memberships` |
| `homeUrl` | URL | Ring center | `webring_memberships` |
| `badgeStyle` | enum | `classic`/`minimal`/`colorful` | `webring_memberships` |
| `position` | enum | `footer`/`sidebar`/`floating` | `webring_memberships` |

**Reverie domain complexity**: Simple — CRUD with URLs and enums.

---

### 19. Blogroll

**Character**: Your reading list, displayed publicly. The blogs you love, checked for freshness.

**What a Wanderer might say:**
- "Add this blog to my blogroll"
- "Remove the tech blogs from my list"
- "Reorder my blogroll alphabetically"

**Levers (per item):**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `url` | URL | Blog homepage | `blogroll_items` |
| `title` | string | Blog name | `blogroll_items` |
| `description` | string | Tagline | `blogroll_items` |
| `feedUrl` | URL | RSS feed | `blogroll_items` |
| `sortOrder` | integer | Display order | `blogroll_items` |

**Implementation:**
- Schema: `libs/engine/src/lib/server/db/schema/curios.ts:591-606`
- Admin: `/arbor/curios/blogroll/`
- Auto-fetches: favicon, latest post title/URL/date

**Reverie domain complexity**: Medium — CRUD with URL validation and auto-enrichment.

---

## Group 5: Curio Widgets

*The terrain gets wild. Every clearing has a different creature — music players, mood rings, hit counters, ambient soundscapes. Each one small, each one deeply configurable. This is the indie web playground.*

---

### 20. Mood Ring

**Character**: A mystical artifact that shifts color with your mood, the time of day, or the season.

**What a Wanderer might say:**
- "Set my mood ring to show the time of day"
- "I'm feeling contemplative — set it to deep blue"
- "Use the forest color scheme"
- "Show it as a crystal, not a ring"
- "Turn on the mood log"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `mode` | enum | `time`/`manual`/`seasonal`/`random` | `mood_ring_config` |
| `manualMood` | string | Mood label | `mood_ring_config` |
| `manualColor` | hex color | Custom color | `mood_ring_config` |
| `colorScheme` | enum | `default`/`warm`/`cool`/`forest`/`sunset` | `mood_ring_config` |
| `displayStyle` | enum | `ring`/`gem`/`orb`/`crystal`/`flame`/`leaf`/`moon` | `mood_ring_config` |
| `showMoodLog` | boolean | Show history | `mood_ring_config` |

**Time-of-day colors**: Deep Night → Dawn → Morning → Midday → Afternoon → Evening → Night
**Seasonal mapping**: spring=#6abf69, summer=#e8b84b, autumn=#d4853b, winter=#7ba3c9, midnight=#6b5eb0

**Reverie domain complexity**: Medium — enum selection + manual mood entry. "Contemplative" → needs mood-to-color mapping.

---

### 21. Gallery

**Character**: Your visual portfolio. Images organized, tagged, and displayed beautifully.

**What a Wanderer might say:**
- "Enable my gallery"
- "Use a masonry grid layout"
- "Show 50 images per page"
- "Hide dates on gallery images"
- "Create a collection called 'Nature Walks'"
- "Enable the lightbox viewer"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `enabled` | boolean | On/off | `gallery_curio_config` |
| `galleryTitle` | string | Heading | `gallery_curio_config` |
| `galleryDescription` | string | Intro text | `gallery_curio_config` |
| `itemsPerPage` | integer | 10-100, default 30 | `gallery_curio_config` |
| `sortOrder` | enum | `date-desc`/`date-asc`/`title-asc`/`title-desc` | `gallery_curio_config` |
| `showDescriptions` | boolean | Per-image descriptions | `gallery_curio_config` |
| `showDates` | boolean | Upload dates | `gallery_curio_config` |
| `showTags` | boolean | Tag filters | `gallery_curio_config` |
| `enableLightbox` | boolean | Modal viewing | `gallery_curio_config` |
| `enableSearch` | boolean | Search bar | `gallery_curio_config` |
| `enableFilters` | boolean | Filter UI | `gallery_curio_config` |
| `gridStyle` | enum | `masonry`/`uniform`/`mood-board` | `gallery_curio_config` |
| `thumbnailSize` | enum | `small`/`medium`/`large` | `gallery_curio_config` |
| `customCss` | string | Max 10,000 chars | `gallery_curio_config` |

**Implementation:**
- Schema: `libs/engine/src/lib/server/db/schema/curios.ts:175-265`
- Admin: `/arbor/curios/gallery/`
- API: `POST /api/curios/gallery`, `/api/curios/gallery/tags`, `/api/curios/gallery/sync`
- Related: `gallery_images`, `gallery_tags`, `gallery_collections`, `gallery_collection_images`

**Reverie domain complexity**: Deep — many toggles + CRUD for images/tags/collections.

---

### 22. Now Playing

**Character**: What you're listening to right now. Spotify, Last.fm, or manual entry.

**What a Wanderer might say:**
- "Connect my Spotify to Now Playing"
- "Show album art but hide the progress bar"
- "Set my fallback text to 'Silence is golden'"
- "Use the expanded display style"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `provider` | enum | `manual`/`spotify`/`lastfm` | `nowplaying_config` |
| `displayStyle` | enum | `compact`/`expanded` | `nowplaying_config` |
| `showAlbumArt` | boolean | Default true | `nowplaying_config` |
| `showProgress` | boolean | Default false | `nowplaying_config` |
| `fallbackText` | string | When not playing | `nowplaying_config` |
| `lastFmUsername` | string | Last.fm integration | `nowplaying_config` |

**Implementation:**
- Schema: `libs/engine/src/lib/server/db/schema/curios.ts:464-485`
- Admin: `/arbor/curios/nowplaying/`

**Reverie domain complexity**: Medium — enums + provider setup. OAuth flow for Spotify is separate.

---

### 23. Timeline

**Character**: AI-powered daily summaries of your GitHub activity. Your development journal, automated.

**What a Wanderer might say:**
- "Enable my timeline"
- "Use the poetic voice for summaries"
- "Exclude my private repos"
- "Set my timezone to Pacific"
- "Generate today's summary"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `enabled` | boolean | On/off | `timeline_curio_config` |
| `githubUsername` | string | GitHub account | `timeline_curio_config` |
| `voicePreset` | enum | `professional`/`quest`/`casual`/`poetic`/`minimal` | `timeline_curio_config` |
| `customSystemPrompt` | string | AI instructions | `timeline_curio_config` |
| `customSummaryInstructions` | string | Summary directives | `timeline_curio_config` |
| `reposInclude` | string | Comma-separated patterns | `timeline_curio_config` |
| `reposExclude` | string | Comma-separated patterns | `timeline_curio_config` |
| `timezone` | string | IANA timezone | `timeline_curio_config` |
| `ownerName` | string | Display name | `timeline_curio_config` |
| `openrouterModel` | string | AI model | `timeline_curio_config` |

**Implementation:**
- Schema: `libs/engine/src/lib/server/db/schema/curios.ts:21-38`
- Admin: `/arbor/curios/timeline/`
- API: `/api/curios/timeline/generate`, `/api/curios/timeline/config`
- Requires: GitHub token + OpenRouter key (encrypted, stored via Warden)

**Reverie domain complexity**: Deep — requires secret management for tokens, AI model selection, complex include/exclude patterns.

---

### 24. Journey

**Character**: The evolution of your codebase, tracked over time. Snapshots, milestones, growth charts.

**What a Wanderer might say:**
- "Enable Journey for my main repo"
- "Take snapshots on every release"
- "Show the language breakdown chart"
- "Hide milestones"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `enabled` | boolean | On/off | `journey_curio_config` |
| `githubRepoUrl` | URL | Single repo | `journey_curio_config` |
| `snapshotFrequency` | enum | `release`/`monthly`/`weekly`/`daily` | `journey_curio_config` |
| `showLanguageChart` | boolean | Default true | `journey_curio_config` |
| `showGrowthChart` | boolean | Default true | `journey_curio_config` |
| `showMilestones` | boolean | Default true | `journey_curio_config` |
| `timezone` | string | IANA timezone | `journey_curio_config` |

**Implementation:**
- Schema: `libs/engine/src/lib/server/db/schema/curios.ts:98-112`
- Admin: `/arbor/curios/journey/`

**Reverie domain complexity**: Medium — enums + booleans + URL.

---

### 25. Pulse

**Character**: Live GitHub activity dashboard. Heatmaps, feeds, trends, CI status.

**What a Wanderer might say:**
- "Show my activity heatmap"
- "Hide the CI status section"
- "Only show activity from my main repos"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `enabled` | boolean | On/off | `pulse_curio_config` |
| `showHeatmap` | boolean | Activity calendar | `pulse_curio_config` |
| `showFeed` | boolean | Event feed | `pulse_curio_config` |
| `showStats` | boolean | Statistics | `pulse_curio_config` |
| `showTrends` | boolean | Trend analysis | `pulse_curio_config` |
| `showCi` | boolean | CI/CD status | `pulse_curio_config` |
| `reposInclude` | string | Repo patterns | `pulse_curio_config` |
| `reposExclude` | string | Repo patterns | `pulse_curio_config` |
| `feedMaxItems` | integer | Default 100 | `pulse_curio_config` |

**Reverie domain complexity**: Medium — mostly boolean toggles.

---

### 26. Hit Counter

**Character**: The retro web classic. "You are visitor #1,337."

**What a Wanderer might say:**
- "Add a hit counter to my homepage"
- "Change the label to 'Fellow wanderers'"
- "Use the classic style"
- "Count unique visitors only"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `pagePath` | string | Which page | `hit_counters` |
| `style` | enum | `classic` (more coming) | `hit_counters` |
| `label` | string | "You are visitor" | `hit_counters` |
| `showSinceDate` | boolean | Show start date | `hit_counters` |
| `countMode` | enum | `every` / unique | `hit_counters` |
| `sinceDateStyle` | enum | `footnote` | `hit_counters` |

**Reverie domain complexity**: Simple.

---

### 27. Link Garden

**Character**: A curated collection of links, like a digital garden of bookmarks.

**What a Wanderer might say:**
- "Add this link to my garden"
- "Create a 'Dev Tools' category"
- "Switch to grid view"
- "Reorder my links"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `title` | string | Garden name | `link_gardens` |
| `description` | string | Intro text | `link_gardens` |
| `style` | enum | `list`/`grid`/`cards` | `link_gardens` |
| Per-item: `url`, `title`, `description`, `category`, `sortOrder` | various | | `link_garden_items` |

**Reverie domain complexity**: Medium — CRUD with categories.

---

### 28. Polls

**Character**: Ask your visitors a question. Democracy in the grove.

**What a Wanderer might say:**
- "Create a poll: 'What should I write about next?'"
- "Add options: 'TypeScript tips', 'Garden updates', 'Book reviews'"
- "Show results only after voting"
- "Pin this poll to the top"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `question` | string | Poll question | `polls` |
| `description` | string | Optional context | `polls` |
| `pollType` | enum | `single`/`multiple` | `polls` |
| `options` | JSON array | Choices | `polls` |
| `resultsVisibility` | enum | `before-vote`/`after-vote`/`never` | `polls` |
| `isPinned` | boolean | Feature at top | `polls` |
| `closeDate` | timestamp | Auto-lock | `polls` |

**Reverie domain complexity**: Medium — CRUD with options array.

---

### 29. Ambient

**Character**: Background sounds. Rain on leaves. Night crickets. Ocean waves.

**What a Wanderer might say:**
- "Play forest rain sounds on my site"
- "Set the volume to 20%"
- "Turn off ambient sounds"
- "Use a custom audio file"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `soundSet` | enum | `forest-rain`, `night-crickets`, `ocean-waves` etc. | `ambient_config` |
| `volume` | integer | 0-100, default 30 | `ambient_config` |
| `enabled` | boolean | On/off | `ambient_config` |
| `customUrl` | URL | Custom audio source | `ambient_config` |

**Reverie domain complexity**: Simple — one enum, one number, two booleans.

---

### 30. Bookmark Shelf

**Character**: Your public reading list. Books, articles, media you're consuming.

**What a Wanderer might say:**
- "Create a shelf called 'Currently Reading'"
- "Add 'The Dispossessed' to my reading list"
- "Mark this book as a favorite"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| Shelves: `name`, `description`, `sortOrder` | | | `bookmark_shelves` |
| Bookmarks: `url`, `title`, `author`, `description`, `coverUrl`, `category` | | | `bookmarks` |
| `isCurrentlyReading` | boolean | | `bookmarks` |
| `isFavorite` | boolean | | `bookmarks` |

**Reverie domain complexity**: Medium — CRUD with nested shelves/bookmarks.

---

### 31. Shrines

**Character**: A decorative display case. Dedicate a little altar to something you love.

**What a Wanderer might say:**
- "Create a shrine for Studio Ghibli"
- "Use the ornate frame"
- "Make it large size"

**Levers:**

| Field | Type | Constraints | Table |
|-------|------|------------|-------|
| `title` | string | Shrine name | `shrines` |
| `shrineType` | enum | `blank` + more | `shrines` |
| `description` | string | What it's for | `shrines` |
| `size` | enum | `small`/`medium`/`large` | `shrines` |
| `frameStyle` | enum | `minimal`/`ornate`/`wood` | `shrines` |
| `contents` | JSON array | Items in the shrine | `shrines` |
| `isPublished` | boolean | Visible | `shrines` |

**Reverie domain complexity**: Medium — enums + CRUD.

---

## Group 6: Infrastructure

*The jeep reaches the far edge of the territory. Power lines, billing counters, the machinery that keeps everything running. Wanderers don't come here often, but Reverie should know what's behind the curtain.*

---

### 32. Billing & Plan (Read-Only for Reverie)

**Character**: Your subscription, your limits, your financial relationship with Grove.

**What a Wanderer might say:**
- "What plan am I on?"
- "What are the limits of my current plan?"
- "How much storage have I used?"
- "When does my billing period end?"

**Levers** (READ-ONLY — Reverie should never modify billing):

| Field | Type | Table |
|-------|------|-------|
| `plan` | enum | `platform_billing` |
| `status` | enum | `platform_billing` |
| `currentPeriodEnd` | timestamp | `platform_billing` |
| `cancelAtPeriodEnd` | boolean | `platform_billing` |
| `storageUsed` | integer (bytes) | `tenants` |

**Plans**: free, seedling, sapling, oak, evergreen
**Statuses**: trialing, active, past_due, paused, canceled, unpaid

**Reverie domain complexity**: Read-only queries. Reverie can REPORT billing status but should NEVER modify it (changes go through Stripe checkout flows).

---

### 33. Feature Flags (Greenhouse)

**Character**: Experimental features for the curious. Opt in to see what's growing.

**What a Wanderer might say:**
- "Am I in the Greenhouse program?"
- "What experimental features are available?"

**This domain is admin/Wayfinder-controlled.** Wanderers can ask about their status but can't self-enroll. Reverie should be able to READ flag status but not WRITE.

---

## Expedition Summary

*The fire crackles. Orange light on the journal pages. Every stop documented. Every lever mapped.*

### By the Numbers

| Metric | Count |
|--------|-------|
| Total domains | 32 |
| Configurable fields | 150+ |
| Database tables involved | ~45 |
| API endpoints | 53+ |
| Simple domains (toggles/enums) | 14 |
| Medium domains (CRUD + options) | 12 |
| Deep domains (composition + cross-domain) | 6 |
| Read-only domains | 2 |

### Terrain Condition

| Condition | Domains | Notes |
|-----------|---------|-------|
| **Critical Priority** 🔴 | 4 | Theme, Accent, Typography, Posts — highest Wanderer value |
| **High Priority** 🟠 | 5 | Blazes, Comments, Meadow, Canopy, Profile |
| **Medium Priority** 🟡 | 12 | Gallery, Now Playing, Mood Ring, Guestbook, Pages, Blogroll, etc. |
| **Low Priority** 🟢 | 9 | Webring, Ambient, Badges, Shrines, etc. |
| **Read-Only** ⚪ | 2 | Billing, Feature Flags |

### Cross-Cutting: The "Vibe" Problem

The most powerful thing Reverie can do is handle **cross-domain vibe requests**:

> "Make my site feel cozy and warm"

This single sentence should touch:
1. **Theme**: Switch to a warm base theme
2. **Accent Color**: Golden Amber or Sunset Ember
3. **Font**: Calistoga (friendly display) or Caveat (handwritten)
4. **Cursor**: Leaf preset with sparkle trail
5. **Ambient**: Forest rain sounds at 20%
6. **Guestbook**: Cozy style with cork wall backing
7. **Mood Ring**: Warm color scheme

No single domain handles this. Reverie's router must detect "vibe" intents and fan out to multiple domains simultaneously. **This is the killer feature.**

### Recommended Implementation Order

**Phase 1: Foundation (the levers people touch daily)**
1. Posts/Blooms — create, publish, configure (highest daily value)
2. Foliage Theme + Accent Color + Typography (appearance trifecta)
3. Profile & Identity (first-time setup)
4. Blazes (content organization)

**Phase 2: Social Layer (connecting to the community)**
5. Comment Settings
6. Meadow
7. Canopy Directory
8. Blogroll

**Phase 3: Personality (making the grove feel like home)**
9. Mood Ring
10. Guestbook
11. Now Playing
12. Gallery
13. Cursor + Ambient

**Phase 4: Power Features (deep configuration)**
14. Custom CSS
15. Custom Colors
16. Custom Layout
17. Timeline + Journey + Pulse (developer curios)

**Phase 5: Everything Else**
18-32. Remaining curios, read-only domains

### The Router Architecture

Based on this safari, Reverie's router needs:

```
WANDERER INPUT
      │
      ▼
┌─────────────┐
│   ROUTER    │  ~80 lines of keyword/intent matching
│             │  Detects: domain keywords, vibe words, CRUD verbs
│  Keywords:  │
│  theme →    │──→ appearance.foliage
│  color →    │──→ appearance.accent
│  font →     │──→ appearance.typography
│  post →     │──→ content.posts
│  cozy →     │──→ MULTI-DOMAIN (vibe composition)
│  comment →  │──→ social.comments
│  ...        │
└─────────────┘
      │
      ▼ (batch tool call — up to 10 domains at once)
┌────────────────────────────────────────────┐
│         DOMAIN SCHEMA LOADER               │
│                                            │
│  Only loads schemas for matched domains.   │
│  Each domain schema: ~20-50 lines JSON     │
│  describing fields, types, constraints,    │
│  API endpoint, and examples.               │
│                                            │
│  Total catalog: 32 domains × ~35 lines     │
│  = ~1,120 lines, but only 1-5 loaded       │
│  per request = ~35-175 lines context.       │
└────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────┐
│         ACTION EXECUTOR                    │
│                                            │
│  Maps intent → API calls.                  │
│  Validates against constraints.            │
│  Returns preview of changes.               │
│  Asks for confirmation on destructive ops. │
└────────────────────────────────────────────┘
```

### Vibe Composition Manifold

For cross-domain "vibe" requests, the router loads a **vibe manifold** — a pre-computed mapping of mood words to multi-domain configurations:

| Vibe Word | Theme | Accent | Font | Cursor | Ambient | Guestbook | Mood Ring |
|-----------|-------|--------|------|--------|---------|-----------|-----------|
| cozy | warm | Golden Amber | Calistoga | leaf+sparkle | forest-rain | cozy+cork | warm |
| midnight | dark | Deep Plum | IBM Plex Mono | star+stardust | night-crickets | modern+glass | cool |
| garden | green | Grove Green | Quicksand | leaf | — | classic | forest |
| retro | pixel | Cardinal Red | Cozette | — | — | pixel | default |
| elegant | minimal | Lavender | Cormorant | — | — | modern | cool |
| dreamy | purple | Violet Purple | Caveat | sparkle+glow | ocean-waves | cozy+paper | sunset |

This manifold is ~50 lines of config and handles the most common "make my site feel X" requests without loading 7 separate domain schemas.

---

## Files Referenced

### Core Schema
- `libs/engine/src/lib/server/db/schema/engine.ts` — 60 tables (tenants, posts, pages, billing, blazes, themes, comments, meadow, moderation)
- `libs/engine/src/lib/server/db/schema/curios.ts` — 45 tables (22 curio types)

### Configuration
- `libs/engine/src/lib/config/presets.ts` — Color palette + font presets
- `libs/engine/src/lib/ui/tokens/fonts.ts` — Full font catalog (11 fonts)
- `libs/engine/src/lib/config/canopy-categories.ts` — Directory categories
- `libs/engine/src/lib/config/tiers.ts` — Plan feature gates

### APIs
- `libs/engine/src/routes/api/blooms/` — Post CRUD
- `libs/engine/src/routes/api/pages/` — Page CRUD
- `libs/engine/src/routes/api/blazes/` — Blaze CRUD
- `libs/engine/src/routes/api/settings/` — Site settings
- `libs/engine/src/routes/api/admin/settings/` — Admin settings
- `libs/engine/src/routes/api/admin/meadow/` — Meadow toggle
- `libs/engine/src/routes/api/curios/` — All curio APIs (22 types)

### Existing Spec
- `docs/specs/reverie-spec.md` — Current Reverie spec (Terrarium-focused)
- `docs/specs/blazes-spec.md` — Blaze system spec
- `docs/specs/foliage-project-spec.md` — Theme system spec

---

*The fire dies to embers. The journal is full — 32 stops, 150+ levers, 6 territory groups, the whole landscape mapped. The vibe manifold. The progressive discovery router. The batch tool-calling architecture. Tomorrow, the animals go to work. But tonight? Tonight was the drive. And it was glorious.* 🚙
