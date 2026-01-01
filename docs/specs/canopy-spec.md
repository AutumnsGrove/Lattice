# Canopy — Theme System

> *No two canopies are quite the same.*

**Public Name:** Canopy
**Internal Name:** GroveCanopy
**Version:** 1.0 Draft
**Last Updated:** December 2025

The canopy is what you see when you look up at the forest—the leaves, the color, the personality that changes with the seasons. Each tree's canopy is unique, expressing itself through shape and shade.

Canopy is Grove's theme system—visual customization from simple accent colors to full theme control. Make it warm, make it bold, make it yours. Your canopy is how the world sees your corner of the grove.

---

## Implementation Status

| Field | Value |
|-------|-------|
| **Status** | Specification approved, development pending |
| **Target Phase** | Phase 4 (Theme System) |
| **Prerequisites** | Core blog engine, User settings system |

---

## Overview

Grove's theme system provides visual customization at multiple levels—from simple accent colors for all users to a full theme customizer for premium tiers. The goal is MySpace-level personalization with modern design sensibilities: make your blog feel like *yours*.

### Design Philosophy

- **Personal expression:** Your blog should reflect your personality
- **Guardrails:** Even with customization, blogs should remain readable
- **Progressive enhancement:** More customization unlocks at higher tiers
- **Community:** Eventually, users can share and discover themes

---

## 1. Theme Access by Tier

| Tier | Theme Access | Accent Color | Community Themes |
|------|--------------|--------------|------------------|
| **Free** | — | — | — |
| **Seedling** | 3 themes | ✓ Custom | — |
| **Sapling** | 10 themes | ✓ Custom | — |
| **Oak** | 10 themes + Customizer | ✓ Custom | ✓ Import |
| **Evergreen** | 10 themes + Customizer + Custom Fonts | ✓ Custom | ✓ Import |

---

## 2. Accent Color (All Paid Tiers)

### 2.1 What It Does

The accent color is a single color that tints interactive elements throughout the blog:

- Links
- Buttons
- Hover states
- Selection highlights
- Blockquote borders
- Code block accents

### 2.2 Collection Point

Accent color is optionally collected during signup (favorite color question) and can be changed anytime in Settings.

### 2.3 Implementation

```css
:root {
  --accent-color: #4f46e5; /* User's chosen color */
  --accent-color-light: color-mix(in srgb, var(--accent-color) 20%, white);
  --accent-color-dark: color-mix(in srgb, var(--accent-color) 80%, black);
}

a {
  color: var(--accent-color);
}

a:hover {
  color: var(--accent-color-dark);
}

::selection {
  background: var(--accent-color-light);
}
```

### 2.4 Color Picker UI

```
┌─────────────────────────────────────────────────────────────────┐
│ Accent Color                                                    │
│                                                                 │
│  ┌──────────────────────────────────────────────┐               │
│  │ [Color picker gradient]                      │               │
│  └──────────────────────────────────────────────┘               │
│                                                                 │
│  Presets:                                                       │
│  [🟣] [🔵] [🟢] [🟡] [🟠] [🔴] [⚫] [🟤]                           │
│                                                                 │
│  Custom: [#4f46e5]                                              │
│                                                                 │
│  Preview:                                                       │
│  This is a [link](#) and a [button].                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Curated Themes (10 Total)

### 3.1 Theme List

| # | Theme Name | Vibe | Layout | Available |
|---|------------|------|--------|-----------|
| 1 | **Grove** | Warm, earthy, cozy | Sidebar | Seedling+ |
| 2 | **Minimal** | Clean, typography-focused | No sidebar | Seedling+ |
| 3 | **Night Garden** | Dark mode, gentle greens | Sidebar | Seedling+ |
| 4 | **Zine** | Bold, magazine-style | Grid | Sapling+ |
| 5 | **Moodboard** | Pinterest-style, masonry | Masonry | Sapling+ |
| 6 | **Typewriter** | Retro, monospace, paper | Centered | Sapling+ |
| 7 | **Solarpunk** | Bright, optimistic | Full-width | Sapling+ |
| 8 | **Cozy Cabin** | Warm browns, intimate | Sidebar | Sapling+ |
| 9 | **Ocean** | Cool blues, calm | No sidebar | Sapling+ |
| 10 | **Wildflower** | Colorful, playful | Flexible | Sapling+ |

### 3.2 Seedling Access (3 Themes)

Seedlings can choose from:
1. Grove (default)
2. Minimal
3. Night Garden

These represent core archetypes: warm, clean, and dark mode.

### 3.3 Theme Preview

Users can preview themes before applying:

```
┌─────────────────────────────────────────────────────────────────┐
│ Choose Your Theme                                    [Sapling]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                │
│  │ [thumb] │ │ [thumb] │ │ [thumb] │ │ [thumb] │                │
│  │  Grove  │ │ Minimal │ │  Night  │ │  Zine   │                │
│  │    ✓    │ │         │ │ Garden  │ │   🔒    │                │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                │
│  │ [thumb] │ │ [thumb] │ │ [thumb] │ │ [thumb] │                │
│  │Moodboard│ │Typewritr│ │Solarpunk│ │  Cozy   │                │
│  │   🔒    │ │   🔒     │ │   🔒    │ │ Cabin 🔒│                │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                │
│                                                                 │
│  ┌─────────┐ ┌─────────┐                                        │
│  │ [thumb] │ │ [thumb] │  🔒 = Upgrade to Sapling               │
│  │  Ocean  │ │Wildflwr │                                        │
│  │   🔒    │ │   🔒     │  [Upgrade  →]                          │
│  └─────────┘ └─────────┘                                        │
│                                                                 │
│  [Preview Selected Theme]                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Theme Structure

Each theme is a collection of CSS variables and optional layout overrides:

```typescript
interface Theme {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  tier: 'seedling' | 'sapling'; // Minimum tier required

  // Colors
  colors: {
    background: string;
    surface: string;
    foreground: string;
    foregroundMuted: string;
    accent: string; // Can be overridden by user's accent color
    border: string;
  };

  // Typography
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };

  // Layout
  layout: {
    type: 'sidebar' | 'no-sidebar' | 'centered' | 'full-width' | 'grid' | 'masonry';
    maxWidth: string;
    spacing: 'compact' | 'comfortable' | 'spacious';
  };

  // Optional custom CSS
  customCSS?: string;
}
```

---

## 4. Theme Customizer (Oak+)

### 4.1 Overview

Oak and Evergreen users get access to a full theme customizer, allowing granular control over their blog's appearance.

### 4.2 Customizer Sections

| Section | What Can Be Changed |
|---------|---------------------|
| **Colors** | Background, text, accents, borders, surfaces |
| **Typography** | Heading font, body font, sizes, line height |
| **Layout** | Sidebar yes/no, max width, spacing |
| **Spacing** | Margins, padding, gap sizes |
| **Effects** | Border radius, shadows, transitions |
| **Custom CSS** | Raw CSS for advanced users |

### 4.3 Customizer UI

```
┌─────────────────────────────────────────────────────────────────┐
│ Theme Customizer                                        [Oak]   │
├───────────────┬─────────────────────────────────────────────────┤
│               │                                                 │
│  ▼ Colors     │  ┌─────────────────────────────────────────┐    │
│    Background │  │                                         │    │
│    Surface    │  │           LIVE PREVIEW                  │    │
│    Text       │  │                                         │    │
│    Accent     │  │   Your blog as you customize it         │    │
│    Border     │  │                                         │    │
│               │  │                                         │    │
│  ▼ Typography │  │                                         │    │
│    Headings   │  │                                         │    │
│    Body       │  │                                         │    │
│    Sizes      │  └─────────────────────────────────────────┘    │
│               │                                                 │
│  ▼ Layout     │  Base theme: [Grove ▼]                          │
│    Sidebar    │                                                 │
│    Max Width  │  [Reset to Default]  [Save Changes]             │
│    Spacing    │                                                 │
│               │                                                 │
│  ▼ Advanced   │                                                 │
│    Custom CSS │                                                 │
│               │                                                 │
└───────────────┴─────────────────────────────────────────────────┘
```

### 4.4 Color Customization

```
┌─────────────────────────────────────────────────────────────────┐
│ Colors                                                          │
│                                                                 │
│  Background      [████████] #faf9f7     [picker]              │
│  Surface         [████████] #ffffff     [picker]              │
│  Text            [████████] #1a1a1a     [picker]              │
│  Text (muted)    [████████] #6b6b6b     [picker]              │
│  Accent          [████████] #4f46e5     [picker]              │
│  Border          [████████] #e5e5e5     [picker]              │
│                                                                 │
│  Presets: [Light] [Dark] [Sepia] [High Contrast]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Typography Customization

```
┌─────────────────────────────────────────────────────────────────┐
│ Typography                                                      │
│                                                                 │
│  Heading Font    [Inter            ▼]                           │
│  Body Font       [Inter            ▼]                           │
│  Mono Font       [JetBrains Mono   ▼]                           │
│                                                                 │
│  Base Size       [16px ────●────── 20px]  18px                  │
│  Line Height     [1.4 ─────●────── 1.8]   1.6                   │
│  Heading Scale   [1.1 ─────●────── 1.4]   1.25                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.6 Available Fonts

Standard fonts available to all customizer users:

| Category | Fonts |
|----------|-------|
| **Sans-serif** | Inter, Open Sans, Lato, Nunito, Source Sans Pro |
| **Serif** | Merriweather, Lora, Crimson Text, Libre Baskerville |
| **Mono** | JetBrains Mono, Fira Code, Source Code Pro |
| **Display** | Playfair Display, Cormorant Garamond |

### 4.7 Custom CSS (Advanced)

Oak+ users can add custom CSS:

```
┌─────────────────────────────────────────────────────────────────┐
│ Custom CSS                                              [Oak]   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ /* Your custom styles */                                │    │
│  │                                                         │    │
│  │ .post-content {                                         │    │
│  │   font-variant-ligatures: common-ligatures;             │    │
│  │ }                                                       │    │
│  │                                                         │    │
│  │ blockquote {                                            │    │
│  │   border-left-width: 4px;                               │    │
│  │   font-style: italic;                                   │    │
│  │ }                                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ⚠️ Custom CSS is applied after theme styles and may break      │
│     layouts if used incorrectly.                                │
│                                                                 │
│  [Validate CSS]  [Apply]                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**CSS Restrictions:**
- No `@import` (security)
- No `url()` except for safe fonts (prevents external resources)
- Max 10KB
- Validated before save

---

## 5. Custom Fonts (Evergreen Only)

### 5.1 Overview

Evergreen users can upload their own fonts for use in their blog.

### 5.2 Requirements

- **Format:** WOFF2 (required), WOFF (optional fallback)
- **License:** Must be open source or user must have license
- **Size:** Max 500KB per font file
- **Limit:** Up to 4 custom fonts per blog

### 5.3 Upload Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Custom Fonts                                        [Evergreen] │
│                                                                 │
│  Your Fonts:                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. Recursive           Sans-serif    [Use] [Delete]      │   │
│  │ 2. Berkeley Mono       Monospace     [Use] [Delete]      │   │
│  │ 3. (empty)                           [Upload]            │   │
│  │ 4. (empty)                           [Upload]            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [+ Upload Font]                                                │
│                                                                 │
│  ⚠️ Only upload fonts you have the right to use.                │
│     Open source fonts (OFL, Apache 2.0) are recommended.        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Font Storage

Custom fonts are stored in R2 under the user's storage allocation.

```
r2://grove-assets-{username}/fonts/
├── recursive.woff2
├── recursive.woff
├── berkeley-mono.woff2
└── berkeley-mono.woff
```

### 5.5 Font Upload Security

#### Allowed File Formats

| Format | MIME Type | Required |
|--------|-----------|----------|
| WOFF2 | `font/woff2` | Yes (primary) |
| WOFF | `font/woff` | Optional (fallback) |

**NOT Allowed:** TTF, OTF, EOT, SVG fonts (security concerns, larger file sizes)

#### File Validation

```typescript
interface FontValidation {
  // Magic byte validation
  magicBytes: {
    woff2: [0x77, 0x4F, 0x46, 0x32], // 'wOF2'
    woff: [0x77, 0x4F, 0x46, 0x46],  // 'wOFF'
  };

  // Size limits
  maxFileSize: 500 * 1024; // 500KB per file
  maxTotalFonts: 4;

  // Name validation
  maxFamilyNameLength: 64;
  allowedFamilyNameChars: /^[a-zA-Z0-9\s\-]+$/;
}
```

#### Validation Steps

1. **MIME type check:** Reject if not `font/woff2` or `font/woff`
2. **Magic byte verification:** Read first 4 bytes, verify against known signatures
3. **File size check:** Reject if > 500KB
4. **Font parsing:** Attempt to parse font tables to ensure valid structure
5. **Family name extraction:** Extract and sanitize font-family name
6. **Sanitize filename:** Remove path traversal, limit to alphanumeric + hyphen

#### Security Considerations

| Risk | Mitigation |
|------|------------|
| **Malicious font files** | Magic byte + structural validation |
| **Path traversal** | Sanitize filenames, use UUID-based storage |
| **Font bombs (DoS)** | File size limits, parse timeout |
| **Cross-site scripting** | Serve fonts with `Content-Type: font/woff2`, no inline execution |
| **Storage abuse** | 500KB × 4 fonts = 2MB max per user, counts against storage quota |

#### License Compliance

Grove does not verify font licenses—this is the user's responsibility.

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Font License Agreement                                       │
│                                                                 │
│ By uploading a font, you confirm that you have the right to     │
│ use this font on your website. This includes:                   │
│                                                                 │
│ • Open source fonts (OFL, Apache 2.0, MIT)                      │
│ • Fonts you've purchased with web license                       │
│ • Fonts you've created yourself                                 │
│                                                                 │
│ Grove is not responsible for font license violations.           │
│                                                                 │
│ [  ] I confirm I have the right to use this font                │
│                                                                 │
│ [Cancel]  [Upload Font]                                         │
└─────────────────────────────────────────────────────────────────┘
```

#### Upload API

```typescript
POST /api/admin/fonts
Content-Type: multipart/form-data

Body: {
  file: File (WOFF2 or WOFF),
  family_name: string,
  category: 'sans-serif' | 'serif' | 'mono' | 'display',
  license_confirmed: boolean
}

Response: {
  success: boolean;
  font_id: string;
  family: string;
  path: string;
}
```

---

## 6. Community Themes (Oak+)

### 6.1 Overview

Users can share their theme customizations with the community. Oak+ users can browse and import community themes.

**Phase:** Future feature (post-launch)

### 6.2 Sharing a Theme

```
┌─────────────────────────────────────────────────────────────────┐
│ Share Your Theme                                                │
│                                                                 │
│  Theme Name:     [Midnight Prose                           ]    │
│  Description:    [A dark theme for late-night writers      ]    │
│  Tags:           [dark] [minimal] [writing]                     │
│                                                                 │
│  Preview thumbnail will be generated automatically.             │
│                                                                 │
│  [ ] Include my custom CSS                                      │
│  [ ] Allow others to modify and re-share                        │
│                                                                 │
│  [Share to Community]                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Browsing Community Themes

```
┌─────────────────────────────────────────────────────────────────┐
│ Community Themes                                        [Oak]   │
│                                                                 │
│  [Search themes...]              [Filter: All ▼]                │
│                                                                 │
│  Popular This Week                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                │
│  │ [thumb] │ │ [thumb] │ │ [thumb] │ │ [thumb] │                │
│  │Midnight │ │ Sunset  │ │ Nordic  │ │  Neon   │                │
│  │ Prose   │ │ Warmth  │ │  Calm   │ │  Dreams │                │
│  │ ★★★★☆   │ │ ★★★★★   │ │ ★★★★☆   │ │ ★★★☆☆   │                │
│  │ by @sam │ │ by @jo  │ │ by @max │ │ by @lee │                │
│  │[Preview]│ │[Preview]│ │[Preview]│ │[Preview]│                │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                │
│                                                                 │
│  [Load More]                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Community Theme Rules

- Free to share and use (no payment)
- Themes are reviewed for quality before featuring
- No custom CSS that breaks accessibility
- Attribution required (shows original creator)
- Users can fork and modify shared themes

---

## 7. Database Schema

### 7.1 Theme Settings Table

```sql
CREATE TABLE theme_settings (
  blog_id TEXT PRIMARY KEY,

  -- Selected theme
  theme_id TEXT NOT NULL DEFAULT 'grove',

  -- Accent color (all paid tiers)
  accent_color TEXT DEFAULT '#4f46e5',

  -- Customizer settings (Oak+)
  customizer_enabled INTEGER DEFAULT 0,
  custom_colors TEXT, -- JSON
  custom_typography TEXT, -- JSON
  custom_layout TEXT, -- JSON
  custom_css TEXT,

  -- Community theme (if imported)
  community_theme_id TEXT,

  updated_at INTEGER DEFAULT (unixepoch())
);
```

### 7.2 Custom Fonts Table

```sql
CREATE TABLE custom_fonts (
  id TEXT PRIMARY KEY,
  blog_id TEXT NOT NULL,

  name TEXT NOT NULL,
  family TEXT NOT NULL, -- CSS font-family name
  category TEXT NOT NULL, -- 'sans-serif', 'serif', 'mono', 'display'

  woff2_path TEXT NOT NULL, -- R2 path
  woff_path TEXT, -- R2 path (optional fallback)

  file_size INTEGER NOT NULL, -- bytes

  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE
);

CREATE INDEX idx_custom_fonts_blog ON custom_fonts(blog_id);
```

### 7.3 Community Themes Table (Future)

```sql
CREATE TABLE community_themes (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  tags TEXT, -- JSON array

  -- Theme data
  base_theme TEXT NOT NULL,
  custom_colors TEXT, -- JSON
  custom_typography TEXT, -- JSON
  custom_layout TEXT, -- JSON
  custom_css TEXT,

  -- Metadata
  thumbnail_path TEXT,
  downloads INTEGER DEFAULT 0,
  rating_sum INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,

  -- Moderation
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'featured', 'removed'
  reviewed_at INTEGER,

  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE INDEX idx_community_themes_status ON community_themes(status);
CREATE INDEX idx_community_themes_creator ON community_themes(creator_id);
```

### 7.4 Theme Submission & Moderation Workflow

#### Submission States

| Status | Description | Who Can See |
|--------|-------------|-------------|
| `draft` | User is still editing, not submitted | Creator only |
| `pending` | Submitted, awaiting review | Creator + Moderators |
| `in_review` | Currently being reviewed by moderator | Creator + Moderators |
| `approved` | Approved, visible in community browser | Everyone |
| `featured` | Approved + promoted in "Featured" section | Everyone |
| `changes_requested` | Needs changes before approval | Creator + Moderators |
| `rejected` | Does not meet guidelines | Creator + Moderators |
| `removed` | Removed after approval (policy violation) | Moderators only |

#### Submission Form Schema

```typescript
interface ThemeSubmission {
  // Required
  name: string;           // 3-50 characters
  description: string;    // 10-500 characters
  base_theme: string;     // Which curated theme it builds on

  // Optional
  tags: string[];         // Max 5 tags, from predefined list
  include_custom_css: boolean;
  allow_derivatives: boolean; // Can others fork and re-share?

  // Auto-generated
  thumbnail: string;      // Generated from live preview
  preview_url: string;    // Temporary preview link for moderators
}

// Tag options
const THEME_TAGS = [
  'dark', 'light', 'minimal', 'bold', 'playful', 'professional',
  'writing', 'portfolio', 'photography', 'colorful', 'monochrome',
  'cozy', 'modern', 'vintage', 'nature', 'tech'
];
```

#### Moderation Queue Table

```sql
CREATE TABLE theme_moderation_queue (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL,
  moderator_id TEXT,

  -- Review details
  action TEXT NOT NULL, -- 'approve', 'reject', 'request_changes', 'feature', 'remove'
  reason TEXT,          -- Required for reject/request_changes/remove
  internal_notes TEXT,  -- Moderator notes (not visible to creator)

  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (theme_id) REFERENCES community_themes(id),
  FOREIGN KEY (moderator_id) REFERENCES users(id)
);

CREATE INDEX idx_moderation_theme ON theme_moderation_queue(theme_id);
CREATE INDEX idx_moderation_action ON theme_moderation_queue(action);
```

#### Review Workflow

```
User submits theme
        │
        ▼
   ┌─────────────┐
   │   pending   │◄───────────────────────────────┐
   └──────┬──────┘                                │
          │ Moderator claims                      │
          ▼                                       │
   ┌─────────────┐                                │
   │  in_review  │                                │
   └──────┬──────┘                                │
          │                                       │
    ┌─────┼─────┬──────────┐                      │
    │     │     │          │                      │
    ▼     │     ▼          ▼                      │
┌────────┐│ ┌────────┐ ┌──────────────────┐       │
│approved││ │rejected│ │changes_requested │       │
└────┬───┘│ └────────┘ └────────┬─────────┘       │
     │    │                     │                 │
     │    │                     │ User fixes      │
     │    │                     │ and resubmits   │
     │    │                     └─────────────────┘
     │    │
     │    ▼
     │ ┌────────┐
     │ │featured│
     │ └────────┘
     │
     └──────────►  Can be changed to 'removed'
                   if policy violation found later
```

#### Moderator UI (Admin Panel)

```
┌─────────────────────────────────────────────────────────────────┐
│ Theme Moderation Queue                              [Moderator] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pending Review (3)                                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ "Midnight Prose" by @writer_sam                          │   │
│  │ Submitted: 2 hours ago | Base: Night Garden              │   │
│  │ Tags: dark, writing, minimal                             │   │
│  │ [Preview] [Claim for Review]                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ "Sunset Warmth" by @creative_jo                          │   │
│  │ Submitted: 5 hours ago | Base: Cozy Cabin                │   │
│  │ Tags: warm, cozy, photography                            │   │
│  │ [Preview] [Claim for Review]                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  In Review (1) - claimed by you                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ "Nordic Calm" by @designr                                │   │
│  │ [Full Preview]                                           │   │
│  │                                                          │   │
│  │ Checklist:                                               │   │
│  │ [✓] Meets contrast requirements (WCAG AA)                │   │
│  │ [✓] Works on mobile                                      │   │
│  │ [✓] Custom CSS is safe                                   │   │
│  │ [ ] No inappropriate content                             │   │
│  │                                                          │   │
│  │ [Approve] [Feature] [Request Changes] [Reject]           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Review Guidelines Checklist

Moderators verify:
1. **Accessibility:** Contrast ratios meet WCAG 2.1 AA
2. **Responsiveness:** Works on mobile, tablet, desktop
3. **Functionality:** Doesn't break Grove features (vines, galleries, etc.)
4. **Safety:** Custom CSS doesn't include malicious content
5. **Appropriateness:** No offensive names, descriptions, or visual content
6. **Originality:** Not a duplicate of existing community theme

#### User Notification Flow

| Event | Notification |
|-------|--------------|
| Submitted | "Your theme has been submitted for review. We'll notify you within 48 hours." |
| Approved | "Great news! Your theme '{name}' has been approved and is now available in the community browser." |
| Featured | "Congratulations! Your theme '{name}' has been featured! It will appear in the Featured section." |
| Changes Requested | "We'd love to feature your theme, but we need a few changes first: {reason}" |
| Rejected | "Unfortunately, your theme doesn't meet our guidelines: {reason}. You can submit a new theme anytime." |
| Removed | "Your theme '{name}' has been removed: {reason}. If you believe this is an error, contact support." |

---

## 8. Implementation

### 8.1 CSS Variable System

All themes use CSS variables for easy customization:

```css
:root {
  /* Colors */
  --color-background: #faf9f7;
  --color-surface: #ffffff;
  --color-foreground: #1a1a1a;
  --color-foreground-muted: #6b6b6b;
  --color-accent: var(--user-accent-color, #4f46e5);
  --color-border: #e5e5e5;

  /* Typography */
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-size-base: 18px;
  --line-height-base: 1.6;
  --heading-scale: 1.25;

  /* Layout */
  --max-width: 720px;
  --spacing-unit: 1rem;
  --border-radius: 4px;
}
```

### 8.2 Theme Loading

```typescript
// Load theme on page render
async function loadTheme(blogId: string): Promise<void> {
  const settings = await db.query(
    'SELECT * FROM theme_settings WHERE blog_id = ?',
    [blogId]
  );

  // Get base theme
  const baseTheme = THEMES[settings.theme_id];

  // Apply customizations (Oak+)
  if (settings.customizer_enabled) {
    applyCustomColors(settings.custom_colors);
    applyCustomTypography(settings.custom_typography);
    applyCustomLayout(settings.custom_layout);
    if (settings.custom_css) {
      injectCustomCSS(settings.custom_css);
    }
  }

  // Always apply accent color
  document.documentElement.style.setProperty(
    '--user-accent-color',
    settings.accent_color
  );
}
```

---

## 9. Implementation Checklist

### Phase 1: Core Themes
- [ ] Implement CSS variable system
- [ ] Create accent color picker component
- [ ] Build theme selector UI
- [ ] Design and implement Grove theme (default)
- [ ] Design and implement Minimal theme
- [ ] Design and implement Night Garden theme
- [ ] Add theme tier gating

### Phase 2: Full Theme Library
- [ ] Design and implement Zine theme
- [ ] Design and implement Moodboard theme
- [ ] Design and implement Typewriter theme
- [ ] Design and implement Solarpunk theme
- [ ] Design and implement Cozy Cabin theme
- [ ] Design and implement Ocean theme
- [ ] Design and implement Wildflower theme
- [ ] Build theme preview functionality

### Phase 3: Theme Customizer (Oak+)
- [ ] Build customizer sidebar UI
- [ ] Implement live preview
- [ ] Build color customization panel
- [ ] Build typography customization panel
- [ ] Build layout customization panel
- [ ] Implement custom CSS editor with validation
- [ ] Add reset to default functionality

### Phase 4: Custom Fonts (Evergreen)
- [ ] Build font upload UI
- [ ] Implement font storage in R2
- [ ] Add font validation (format, size, license check)
- [ ] Integrate custom fonts into typography selector

### Phase 5: Community Themes (Future)
- [ ] Build theme sharing flow
- [ ] Create community theme browser
- [ ] Implement theme import functionality
- [ ] Build moderation queue for submitted themes
- [ ] Add rating and download tracking

---

## 10. Design Guidelines

### 10.1 Theme Requirements

All themes must:
- Meet WCAG 2.1 AA contrast requirements
- Work on mobile, tablet, and desktop
- Support dark/light mode (or be explicitly one or the other)
- Not break with user's accent color applied
- Render markdown content correctly
- Support all Grove features (vines, galleries, etc.)

### 10.2 Accessibility

- Minimum contrast ratio: 4.5:1 for body text
- Focus states must be visible
- No reliance on color alone for information
- Respect `prefers-reduced-motion`

---

*This specification enables personal expression while maintaining the quality and accessibility that Grove promises. From simple accent colors to full custom themes, every user can make their space feel like home.*
