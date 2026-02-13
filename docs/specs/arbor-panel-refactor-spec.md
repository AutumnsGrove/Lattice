---
title: Arbor Panel Refactor — Architecture & Planning Spec
description: Extract the engine's 787-line Arbor sidebar layout into a first-class ArborPanel component family
category: specs
specCategory: ui-components
icon: layout
lastUpdated: "2026-02-13"
aliases: []
tags:
  - arbor
  - ui
  - components
  - admin-panel
---

# Arbor Panel Refactor — Architecture & Planning Spec

> **Status:** Implemented (Phases 1-3)
> **Implementation Branch:** `claude/arbor-gathering-feature-cnInA`
> **Original Planning Branch:** `claude/arbor-panel-refactor-fCa2i`
> **Goal:** Elevate the Arbor panel from a route-level layout into a first-class engine component that any consumer can call as `<ArborPanel>`, with composable sections, a configurable utility bar, and consistent navigation — so building an admin experience feels like snapping Legos together instead of rebuilding from primitives every time.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [The Gap: Engine vs Landing](#2-the-gap-engine-vs-landing)
3. [Vision: What Arbor Should Become](#3-vision-what-arbor-should-become)
4. [Component Architecture](#4-component-architecture)
5. [Utility Bar Design](#5-utility-bar-design)
6. [ArborSection Pattern](#6-arborsection-pattern)
7. [Navigation Unification](#7-navigation-unification)
8. [Relationship to Chrome & Lattice](#8-relationship-to-chrome--lattice)
9. [Export Structure & Consumer API](#9-export-structure--consumer-api)
10. [Migration Path](#10-migration-path)
11. [What Copies Over Perfectly](#11-what-copies-over-perfectly)
12. [Open Questions](#12-open-questions)

---

## 1. Current State Analysis

### Engine Arbor (the good one)

**Location:** `packages/engine/src/routes/arbor/+layout.svelte` (787 lines)

The engine's Arbor is a full sidebar-based admin panel with rich behavior:

- **Sidebar navigation** — Fixed left sidebar, 250px expanded / 72px collapsed
- **Desktop collapse** — Click chevron to collapse to icon-only mode; hover to temporarily expand
- **Mobile slide-in** — Full-height overlay from left with backdrop dismiss
- **Glass morphism** — Frosted glass sidebar with `backdrop-filter: blur(16px)`
- **Sidebar sections:**
  - Header (Logo + title + collapse toggle)
  - Nav items (Dashboard, Garden, Pages, Images, Comments, Account, Settings)
  - Footer expanded (user email, Help Center link, Support link, Logout)
  - Footer collapsed (icon-only versions of the same)
- **State management** — `sidebarStore` (Svelte 5 runes) with `open` (mobile) and `collapsed` (desktop)
- **Chrome Header integration** — Root layout provides `showSidebarToggle={true}` on the Header, which calls `sidebarStore.toggle()` / `sidebarStore.toggleCollapse()`
- **Feature gating** — Nav items conditionally shown based on grafts (e.g., `reeds_comments`)
- **Activity indicators** — Breathing dot animation on Comments when pending count > 0
- **Grove Mode** — Labels resolve through `GroveSwap` for nature-themed terminology
- **Accessibility** — `aria-label`, `aria-current="page"`, `prefers-reduced-motion` respected
- **Dark mode** — Full dark mode support with warm Grove palette (not just inverted)

**Key strength:** It _feels_ like a real product. The sidebar is alive, responsive, accessible. Navigation is spatial — you always know where you are.

### Landing Arbor (the disconnected one)

**Location:** `packages/landing/src/routes/arbor/+layout.svelte` (109 lines)

The landing's Arbor uses `AdminHeader` — a completely different navigation paradigm:

- **Horizontal tab bar** — Sticky header with scrollable tabs, no sidebar at all
- **Navigation model** — Flat tab list, all tabs visible, scrollable on mobile
- **No sidebar** — No left-side navigation, no collapse behavior, no utility bar
- **No spatial awareness** — Tab underline is the only "you are here" signal
- **Lightweight layout** — Just `<AdminHeader tabs={...} />` + `<main>` content area
- **Role-based tabs** — Base tabs (Dashboard, Feedback, Subscribers, CDN) + Wayfinder-only tabs (10+ additional)
- **Different footer** — No footer at all; logout is in the header
- **Different auth flow** — Logout uses `GlassConfirmDialog` + fetch POST, not a direct link

**Key issues:**

1. **Totally different navigation paradigm** — Tabs (horizontal) vs Sidebar (vertical). The experiences feel unrelated.
2. **No utility bar** — No icon rail, no collapse/expand, no spatial navigation
3. **Mobile experience is inferior** — Horizontally scrolling tabs vs. a proper slide-in panel
4. **Disconnected from the landing site itself** — Arbor feels like an isolated island, not part of Grove
5. **Tab overflow at scale** — With 14 Wayfinder tabs, horizontal scroll becomes unwieldy
6. **No grove personality** — Missing the glass sidebar, leaf patterns, breathing dots, Logo brand

### AdminHeader (the current landing component)

**Location:** `packages/engine/src/lib/ui/components/chrome/AdminHeader.svelte` (161 lines)

This was designed for "simple admin tools with 4-6 pages" — it says so in its own docstring. The landing outgrew it with 14+ tabs but kept using it anyway. It provides:

- Two-row sticky header (branding row + tab row)
- Horizontal tab list with `overflow-x: auto`
- Active tab underline
- User email display (hidden on mobile)
- Theme toggle and logout button

It's a fine component for what it is, but it's not Arbor. It's a tab bar pretending to be an admin shell.

---

## 2. The Gap: Engine vs Landing

| Aspect                  | Engine Arbor                           | Landing Arbor                | Gap                            |
| ----------------------- | -------------------------------------- | ---------------------------- | ------------------------------ |
| **Navigation**          | Vertical sidebar                       | Horizontal tab bar           | Completely different paradigms |
| **Utility bar**         | Icon rail (collapsed sidebar)          | None                         | Missing entirely               |
| **Mobile**              | Slide-in overlay from left             | Horizontal scroll tabs       | Different interaction          |
| **Collapse behavior**   | Expand/collapse with hover             | N/A                          | Missing entirely               |
| **Spatial awareness**   | Sidebar active state + position        | Tab underline only           | Weak in landing                |
| **Glass morphism**      | Full glass sidebar                     | No glass (plain header)      | Missing personality            |
| **Footer**              | User info + Help + Support + Logout    | No footer (logout in header) | Different placement            |
| **Activity indicators** | Breathing dot (e.g., pending comments) | None                         | Missing                        |
| **Grove Mode**          | GroveSwap on labels                    | None                         | Missing                        |
| **Leaf pattern**        | `.leaf-pattern` class on layout        | None                         | Missing warmth                 |
| **Dark mode**           | Full warm dark mode                    | Basic dark mode              | Less polished                  |
| **Feature gating**      | Grafts system controls nav             | Role check only              | Different mechanism            |
| **Logo/Brand**          | Logo in sidebar header                 | Logo in AdminHeader          | Different treatment            |
| **Scale**               | 7 nav items (focused)                  | 14+ tabs (sprawling)         | Landing needs sidebar more     |

**The irony:** The landing site — which has _more_ sections and _more_ navigation complexity — uses the _simpler_ navigation component. It's the one that actually needs the sidebar.

---

## 3. Vision: What Arbor Should Become

Arbor becomes a **first-class engine component** — like Chrome, but for admin panels. Consumers call `<ArborPanel>` and get the full sidebar-based admin experience. They configure it with data, not by rebuilding UI.

### The consumer experience should be:

```svelte
<script>
  import { ArborPanel, ArborSection } from '@autumnsgrove/groveengine/ui/arbor';

  const navItems = [
    { href: '/arbor', label: 'Dashboard', icon: Home },
    { href: '/arbor/feedback', label: 'Feedback', icon: MessageCircle },
    { href: '/arbor/subscribers', label: 'Subscribers', icon: AtSign },
  ];

  const footerLinks = [
    { href: 'https://grove.place/knowledge/help', label: 'Help Center', icon: HelpCircle, external: true },
  ];
</script>

<ArborPanel
  {navItems}
  {footerLinks}
  user={data.user}
  brandTitle="Admin"
  logoutHref="/api/auth/signout"
>
  <main>
    {@render children()}
  </main>
</ArborPanel>
```

And inside individual pages:

```svelte
<ArborSection title="Feedback" description="Manage visitor feedback">
  <!-- page content -->
</ArborSection>
```

### What this unlocks:

1. **Consistency** — Every Arbor panel (engine, landing, future consumers) looks and feels the same
2. **Speed** — Adding a new admin section is "add a nav item + create a page" — no layout work
3. **Utility bar for free** — The icon rail, collapse, hover-expand all come with the component
4. **Mobile slide-in for free** — No per-consumer mobile implementation
5. **Future consumers** — Tenant admin panels, tool panels, any sidebar-based layout
6. **Separation of engine vs Grove** — Lattice (engine) provides the panel primitive; Grove provides the content

---

## 4. Component Architecture

### Component Tree

```
<ArborPanel>                    ← The shell (exported from engine)
  ├─ <ArborSidebar>             ← Internal: glass sidebar with all behavior
  │   ├─ <ArborSidebarHeader>   ← Internal: logo + title + collapse toggle
  │   ├─ <ArborNav>             ← Internal: nav item list with active states
  │   │   └─ <ArborNavItem>     ← Internal: single nav item (icon + label + badge)
  │   └─ <ArborSidebarFooter>   ← Internal: user info + links + logout
  ├─ <ArborOverlay>             ← Internal: mobile backdrop overlay
  └─ <slot />                   ← Consumer's content area
```

### Component Breakdown

#### `ArborPanel` (the main export)

The top-level shell. This is what consumers call. It:

- Renders the sidebar
- Manages the content area with proper margin offsets
- Wires up the `sidebarStore` for Header integration
- Provides the glass background / leaf pattern
- Handles the mobile overlay

**Props:**

```typescript
interface ArborPanelProps {
  /** Navigation entries for the sidebar (items and optional dividers) */
  navItems: ArborNavEntry[];
  /** Footer links (Help, Support, etc.) — used by default footer only */
  footerLinks?: ArborFooterLink[];
  /** User info for footer display — used by default footer only */
  user?: { email?: string; name?: string } | null;
  /** Brand title in sidebar header */
  brandTitle?: string;
  /** Whether to show the Grove logo in sidebar header */
  showLogo?: boolean;
  /** Logout href or callback — used by default footer only */
  logoutHref?: string;
  onLogout?: () => void;
  /** Messages to show above content (auto-renders GroveMessages) */
  messages?: ChannelMessage[];
  /** Whether this is demo mode (shows floating banner) */
  isDemoMode?: boolean;
  /** Whether to show the leaf pattern background (default: true) */
  showLeafPattern?: boolean;
  /** Custom snippet for sidebar header (replaces default logo+title) */
  sidebarHeader?: Snippet;
  /** Custom snippet for sidebar footer (replaces default user+logout) */
  sidebarFooter?: Snippet;
  /** Content slot */
  children: Snippet;
}
```

#### `ArborNavEntry` (union type)

```typescript
/** Nav entries can be a link item or a section divider */
type ArborNavEntry = ArborNavItem | ArborNavDivider;

interface ArborNavDivider {
  kind: "divider";
  /** Optional group label (e.g., "Wayfinder Tools") */
  label?: string;
  /** Divider style: 'line' (default), 'grove' (GroveDivider logos), or any unicode char */
  style?: ArborDividerStyle;
}

/**
 * Divider rendering style:
 * - 'line'    — Simple horizontal rule (default)
 * - 'grove'   — GroveDivider component (alternating Grove logos, xs size)
 * - string    — Any unicode character repeated as the separator (e.g., '·', '✦', '🌿')
 */
type ArborDividerStyle = "line" | "grove" | string;

interface ArborNavItem {
  kind?: "item"; // Default, can be omitted
  href: string;
  label: string;
  icon?: IconComponent;
  /** Badge count (e.g., pending comments) — shows activity dot */
  badge?: number;
  /** Whether to show a breathing activity dot even without a count */
  showActivity?: boolean;
  /** Grove Mode term slug for label resolution */
  termSlug?: string;
  /** Condition: only show when true (for feature gating) */
  visible?: boolean;
}
```

#### `ArborFooterLink` (type)

```typescript
interface ArborFooterLink {
  href: string;
  label: string;
  icon?: IconComponent;
  external?: boolean;
}
```

### Internal Components (not exported)

These are implementation details of `ArborPanel`. Consumers don't import them — they exist for code organization:

- `ArborSidebar.svelte` — The `<aside>` element with all glass/collapse/mobile behavior
- `ArborSidebarHeader.svelte` — Logo + title + collapse button + mobile close button
- `ArborSidebarFooter.svelte` — User info, footer links, logout (with collapsed variants)
- `ArborNav.svelte` — The `<nav>` element rendering `ArborNavItem` entries
- `ArborOverlay.svelte` — The mobile backdrop button

---

## 5. Utility Bar Design

The "utility bar" is the collapsed sidebar state — the left-side icon rail. It's not a separate component; it's a mode of the sidebar.

### Desktop States

```
┌─────────── EXPANDED (250px) ──────────┐    ┌── COLLAPSED (72px) ──┐
│ [Logo] Arbor (admin panel) [<]        │    │ [Logo]               │
│────────────────────────────────────── │    │ [v]                  │
│ [icon] Dashboard                      │    │──────────────────── │
│ [icon] Garden                         │    │ [icon]               │
│ [icon] Pages                          │    │ [icon]               │
│ [icon] Images                         │    │ [icon]               │
│ [icon]● Comments                      │    │ [icon]●              │
│ [icon] Account                        │    │ [icon]               │
│ [icon] Settings                       │    │ [icon]               │
│────────────────────────────────────── │    │──────────────────── │
│ user@email.com                        │    │ [?]                  │
│ [?] Help Center                       │    │ [💬]                 │
│ [💬] Get Support                      │    │ [→]                  │
│ [→] Logout                            │    └──────────────────── ┘
└───────────────────────────────────── ┘

       HOVERED (collapsed → 250px, overlaid)
       Same as expanded but with z-index: 100 + shadow
```

### Mobile State

```
┌─────── CLOSED ──────────┐    ┌─────── OPEN ──────────────────────────┐
│ [☰] Chrome Header       │    │ Overlay (dismissible)                 │
│                          │    │ ┌── Sidebar (250px) ──────┐          │
│  Content fills full      │    │ │ [Logo] Arbor       [X]  │          │
│  viewport width          │    │ │──────────────────────── │          │
│                          │    │ │ [icon] Dashboard        │          │
│                          │    │ │ [icon] Garden           │          │
│                          │    │ │ ...                     │          │
│                          │    │ │──────────────────────── │          │
│                          │    │ │ [→] Logout              │          │
│                          │    │ └────────────────────────  │          │
└──────────────────────── ┘    └───────────────────────────────────── ┘
```

### State Management

The existing `sidebarStore` already handles this perfectly:

```typescript
// Mobile: slide-in overlay
sidebarStore.open; // boolean
sidebarStore.toggle(); // Toggle open/closed
sidebarStore.close(); // Close

// Desktop: collapse to icons
sidebarStore.collapsed; // boolean
sidebarStore.toggleCollapse(); // Toggle collapsed/expanded
```

The Chrome Header already has the toggle button wired up. No changes needed there.

### What the consumer controls:

Consumers define _what_ goes in the utility bar by providing `navItems`. The component handles _how_ those items render in expanded, collapsed, and mobile states automatically. No per-state configuration needed.

---

## 6. ArborSection Pattern

Inside each Arbor page, consumers currently rebuild section headings, descriptions, and card layouts manually. `ArborSection` standardizes this:

```svelte
<script>
  import { ArborSection } from '@autumnsgrove/groveengine/ui/arbor';
</script>

<ArborSection
  title="Garden"
  description="Manage your blog posts"
  icon={FileText}
>
  <!-- Page content here -->
</ArborSection>
```

### What ArborSection provides:

```
┌────────────────────────────────────────────────┐
│ [icon] Title                          [actions] │
│ Description text in muted color                 │
│─────────────────────────────────────────────── │
│                                                 │
│  Content area (slot)                            │
│                                                 │
└────────────────────────────────────────────────┘
```

**Props:**

```typescript
interface ArborSectionProps {
  /** Section title */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Icon to show next to title */
  icon?: IconComponent;
  /** Grove Mode term slug */
  termSlug?: string;
  /** Actions snippet (buttons, etc.) rendered in the header row */
  actions?: Snippet;
  /** Main content */
  children: Snippet;
}
```

This is optional — consumers can skip it and just render their content directly. But it standardizes the "section page" pattern that every Arbor page uses.

---

## 7. Navigation Unification

### The goal:

Landing Arbor should navigate exactly like engine Arbor — vertical sidebar, icon rail, slide-in on mobile — but with different content:

| Aspect             | Engine Arbor                                                  | Landing Arbor (after refactor)                          |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------------- |
| **Nav items**      | Dashboard, Garden, Pages, Images, Comments, Account, Settings | Dashboard, Feedback, Subscribers, CDN + Wayfinder items |
| **Footer links**   | Help Center, Get Support                                      | Same (or customized)                                    |
| **Logout**         | Direct link `/auth/logout`                                    | Callback → `GlassConfirmDialog` → POST fetch            |
| **Brand**          | "Arbor (admin panel)"                                         | "Admin" or custom                                       |
| **Logo**           | Grove Logo                                                    | Grove Logo                                              |
| **Feature gating** | `data.grafts?.reeds_comments`                                 | `data.isWayfinder`                                      |
| **Messages**       | `GroveMessages`                                               | `GroveMessages`                                         |

### What changes in the landing:

The landing's `+layout.svelte` shrinks from building UI to configuring data:

```svelte
<!-- BEFORE: Landing builds its own header-based layout -->
<AdminHeader tabs={tabs} brandTitle="Admin" user={data.user} ... />
<main>...</main>

<!-- AFTER: Landing calls ArborPanel with configuration -->
<ArborPanel
  navItems={navItems}
  footerLinks={footerLinks}
  user={data.user}
  brandTitle="Admin"
  onLogout={handleLogoutClick}
>
  {@render children()}
</ArborPanel>
```

### What stays the same:

- Auth logic in `+layout.server.ts` — unchanged
- Individual page components (`+page.svelte`) — unchanged
- API endpoints — unchanged
- The `GlassConfirmDialog` for logout — still used, just triggered via `onLogout` prop

---

## 8. Relationship to Chrome & Lattice

### Current architecture:

```
Lattice (GroveEngine)
  └─ Chrome (Header, Footer, MobileMenu, ThemeToggle, AdminHeader)
      ├─ Used by: Landing public pages
      ├─ Used by: Engine tenant sites
      └─ Used by: Landing Arbor (via AdminHeader)

  └─ Arbor (hardcoded in engine routes)
      └─ Used by: Engine only (sidebar layout lives in route files)
```

### Target architecture:

```
Lattice (GroveEngine)
  └─ Chrome (Header, Footer, MobileMenu, ThemeToggle, AdminHeader)
  │   ├─ Used by: Landing public pages
  │   └─ Used by: Engine tenant sites
  │
  └─ Arbor (new first-class component family)
      ├─ ArborPanel — The full sidebar-based admin shell
      ├─ ArborSection — Standardized section page wrapper
      ├─ Types & defaults — ArborNavItem, ArborFooterLink, etc.
      ├─ Used by: Engine routes (replaces inline sidebar layout)
      ├─ Used by: Landing routes (replaces AdminHeader-based layout)
      └─ Used by: Future consumers (any admin panel)
```

### How Arbor relates to Chrome:

- **Chrome provides the top-level shell** — Header (with sidebar toggle), Footer
- **Arbor provides the admin-level shell** — Sidebar, utility bar, section layout
- **They work together:** Chrome Header's sidebar toggle calls `sidebarStore`, Arbor reads it
- **They don't replace each other:** A page can have Chrome Header _and_ Arbor sidebar

### The "two Lattice" vision:

You mentioned wanting "Lattice as the engine" and "another version for tenant consumers." This refactor moves us closer:

- **Lattice core** = Chrome + Arbor + Glass components + stores + utilities (what the engine provides)
- **Grove-specific** = The actual nav items, footer links, page content, auth logic, grafts system (what each consumer provides)

The engine route files (`/arbor/+layout.svelte`) become thin wrappers that import `ArborPanel` and pass Grove-specific configuration. The 787-line layout becomes ~50 lines of configuration.

---

## 9. Export Structure & Consumer API

### New export path:

```json
// packages/engine/package.json
{
  "exports": {
    "./ui/arbor": {
      "types": "./src/lib/ui/components/arbor/index.ts",
      "svelte": "./src/lib/ui/components/arbor/index.ts"
    }
  }
}
```

### File structure:

```
packages/engine/src/lib/ui/components/arbor/
  ├── index.ts               # Barrel exports
  ├── types.ts               # ArborNavEntry, ArborNavItem, ArborNavDivider, ArborFooterLink, etc.
  ├── defaults.ts            # Default footer links, default config
  ├── ArborPanel.svelte      # The main shell component
  ├── ArborSection.svelte    # Section page wrapper (exported)
  ├── ArborToggle.svelte     # Standalone sidebar toggle button (exported)
  ├── ArborSidebar.svelte    # Internal: sidebar element
  ├── ArborSidebarHeader.svelte   # Internal: header area
  ├── ArborSidebarFooter.svelte   # Internal: footer area
  ├── ArborNav.svelte        # Internal: nav list (renders items + dividers)
  └── ArborOverlay.svelte    # Internal: mobile overlay
```

### Consumer imports:

```typescript
// Components
import {
  ArborPanel,
  ArborSection,
  ArborToggle,
} from "@autumnsgrove/groveengine/ui/arbor";

// Types (for TypeScript consumers)
import type {
  ArborNavEntry,
  ArborNavItem,
  ArborNavDivider,
  ArborFooterLink,
  ArborPanelProps,
} from "@autumnsgrove/groveengine/ui/arbor";

// Defaults (optional)
import { DEFAULT_ARBOR_FOOTER_LINKS } from "@autumnsgrove/groveengine/ui/arbor";

// Store (already exists, re-exported for convenience)
import { sidebarStore } from "@autumnsgrove/groveengine/ui/arbor";
```

---

## 10. Migration Path

### Phase 1: Extract engine sidebar into ArborPanel component

1. Create `packages/engine/src/lib/ui/components/arbor/` directory
2. Define types in `types.ts` (ArborNavItem, ArborFooterLink, etc.)
3. Extract the sidebar markup+styles from engine's `+layout.svelte` into `ArborPanel.svelte`
4. Include all states: expanded, collapsed, hovered, mobile open, mobile closed
5. Include all styles: glass morphism, dark mode, animations, responsive
6. Move the overlay into the component
7. Wire up `sidebarStore` integration
8. Create `ArborSection.svelte` wrapper
9. Create `index.ts` barrel file with exports
10. Add `"./ui/arbor"` export to `package.json`

### Phase 2: Refactor engine routes to use ArborPanel

1. Replace the 787-line `+layout.svelte` with a ~50-line file that:
   - Defines nav items array (Dashboard, Garden, Pages, etc.)
   - Defines footer links array (Help, Support)
   - Calls `<ArborPanel navItems={...} footerLinks={...} user={...}>`
2. Verify all behavior preserved: collapse, hover, mobile, feature gating, activity dots
3. Verify Chrome Header toggle still works through sidebarStore

### Phase 3: Migrate landing to ArborPanel

1. Replace landing's `AdminHeader`-based layout with `<ArborPanel>`
2. Convert the tab array to an ArborNavItem array (same data, different type)
3. Wire up the `onLogout` → `GlassConfirmDialog` flow
4. Handle Wayfinder-only items via `visible` prop on nav items
5. Remove `AdminHeader` import (it stays in engine for other uses, just not needed here)
6. Verify all 14+ landing Arbor pages still work with sidebar navigation

### Phase 4: Polish & consistency

1. Ensure leaf pattern background works in both contexts
2. Verify dark mode warmth in both
3. Test mobile behavior end-to-end
4. Add Grove Mode support to landing Arbor labels if desired
5. Consider if landing Arbor should have its own footer (not the public Footer, but sidebar footer links)

---

## 11. What Copies Over Perfectly

These pieces from the engine Arbor can be extracted into the component with zero or near-zero modification:

### Copies perfectly (direct extraction):

| Element                       | Source location                            | Notes                             |
| ----------------------------- | ------------------------------------------ | --------------------------------- |
| **Sidebar HTML structure**    | `+layout.svelte:77-192`                    | The entire `<aside>` block        |
| **Sidebar CSS**               | `+layout.svelte:212-786`                   | All styles including responsive   |
| **sidebarStore**              | `stores/sidebar.svelte.ts`                 | Already in engine, just re-export |
| **Glass morphism styles**     | `.glass-sidebar` CSS                       | Exact same treatment              |
| **Collapse/expand behavior**  | Hover handlers + CSS transitions           | All self-contained                |
| **Mobile slide-in**           | `transform: translateX()` + overlay        | All self-contained                |
| **Active nav highlighting**   | `currentPath.startsWith(href)`             | Move into component               |
| **Activity dot animation**    | `.activity-dot` + `@keyframes dot-breathe` | Copy directly                     |
| **Reduced motion support**    | `@media (prefers-reduced-motion)`          | Copy directly                     |
| **Dark mode styles**          | All `:global(.dark)` rules                 | Copy directly                     |
| **Content margin logic**      | `.content` + `.content.expanded` CSS       | Copy directly                     |
| **Chrome Header integration** | `showSidebarToggle` prop on Header         | Already works via sidebarStore    |

### Needs parameterization:

| Element            | What changes                      | How                                    |
| ------------------ | --------------------------------- | -------------------------------------- |
| **Nav items**      | Hardcoded → prop                  | `navItems: ArborNavItem[]`             |
| **Footer links**   | Hardcoded Help/Support → prop     | `footerLinks: ArborFooterLink[]`       |
| **Logout**         | Hardcoded `/auth/logout` → prop   | `logoutHref` or `onLogout` callback    |
| **Brand title**    | Hardcoded "Arbor" → prop          | `brandTitle` string                    |
| **User email**     | From `data.user` → prop           | `user` object                          |
| **Feature gating** | Inline `{#if data.grafts}` → prop | `visible` on ArborNavItem              |
| **Messages**       | Inline `GroveMessages` → prop     | `messages` array (or consumer renders) |
| **Demo banner**    | Hardcoded → prop                  | `isDemoMode` boolean                   |

### Doesn't copy (stays in routes):

| Element            | Why                       | Where it stays       |
| ------------------ | ------------------------- | -------------------- |
| **Auth checks**    | Business logic, not UI    | `+layout.server.ts`  |
| **Data loading**   | Server-side, per-consumer | `+layout.server.ts`  |
| **Page content**   | Consumer-specific         | `+page.svelte` files |
| **Grafts loading** | Business logic            | Server load function |

---

## 12. Design Decisions (Resolved)

All design questions have been answered. These are locked in for implementation.

### D1: Built-ins — GroveMessages auto, Toast manual

ArborPanel renders `<GroveMessages>` automatically when a `messages` prop is provided (consistent placement above content in every Arbor panel). `<Toast />` is **not** included — consumers place it themselves since it's a global singleton that may already exist in a parent layout.

**Impact on props:** `messages?: ChannelMessage[]` stays. No `toast` prop needed.

### D2: Leaf pattern — baked in with opt-out

ArborPanel applies the `.leaf-pattern` background by default. Consumers can pass `showLeafPattern={false}` to disable it. The leaf pattern is part of what makes Arbor feel like Arbor, but some contexts (e.g., a future minimal tool) might want a clean background.

**Impact on props:** `showLeafPattern?: boolean` (default `true`).

### D3: Header integration — ArborPanel exports a toggle component

ArborPanel does **not** include its own header. Instead, it exports an `<ArborToggle>` component (or action) that consumers can place inside any existing header. This is the most flexible approach — the landing can drop the toggle into its existing header without replacing it entirely.

The toggle component calls `sidebarStore.toggle()` on mobile and `sidebarStore.toggleCollapse()` on desktop, same as the engine's Chrome Header does today. It renders as a hamburger/menu icon button.

**Impact on exports:**

```typescript
// New export
export { default as ArborToggle } from "./ArborToggle.svelte";
```

**Impact on component tree:**

```
packages/engine/src/lib/ui/components/arbor/
  ├── ArborToggle.svelte    ← NEW: standalone toggle button for any header
  └── ... (rest of components)
```

### D4: Nav depth — flat with section dividers

Navigation stays flat (no nested/expandable items). But nav items support optional **section dividers** — group labels like "Content", "Settings", "Admin" that visually separate nav items into categories.

This keeps navigation simple while handling the landing's 14+ Wayfinder tabs gracefully. Sub-pages (e.g., Status > Incidents > New Incident) are navigated within the content area; the sidebar highlights the parent section.

**Impact on types:**

```typescript
// Nav items can be a link OR a divider
type ArborNavEntry = ArborNavItem | ArborNavDivider;

interface ArborNavDivider {
  kind: "divider";
  /** Optional group label (e.g., "Wayfinder Tools") */
  label?: string;
  /** Divider style — controls what renders between sections */
  style?: ArborDividerStyle;
}

/**
 * Divider rendering style:
 * - 'line'         — Simple horizontal rule (default)
 * - 'grove'        — GroveDivider component (alternating Grove logos)
 * - string         — Any unicode character repeated as the divider (e.g., '·', '✦', '🌿', '─')
 */
type ArborDividerStyle = "line" | "grove" | string;

interface ArborNavItem {
  kind?: "item"; // Default, can be omitted
  href: string;
  label: string;
  icon?: IconComponent;
  badge?: number;
  showActivity?: boolean;
  termSlug?: string;
  visible?: boolean;
}
```

The divider `style` prop lets consumers choose how sections are visually separated:

```typescript
// Examples:
{ kind: 'divider', label: 'Wayfinder Tools', style: 'grove' }     // GroveDivider logos
{ kind: 'divider', label: 'Settings', style: '✦' }                // Repeated unicode
{ kind: 'divider', style: '·' }                                   // Dots, no label
{ kind: 'divider', label: 'Admin' }                               // Default: plain line
```

When `style` is `'grove'`, the component renders `<GroveDivider>` (already exported from `@autumnsgrove/groveengine/ui/nature`) with sidebar-appropriate sizing (`size="xs"`, `count={3}`). When `style` is any other string, it repeats that character 3-5 times as a decorative separator. When `style` is `'line'` or omitted, it renders a simple `<hr>`.

**Impact on props:** `navItems` becomes `navItems: ArborNavEntry[]`.

### D5: AdminHeader — deprecate

`AdminHeader` is marked as **deprecated**. Everything should use `ArborPanel` going forward. The component stays in the codebase for now (no breaking removal) but gets a `@deprecated` JSDoc annotation pointing consumers to `ArborPanel`.

If a truly simple 3-tab admin tool comes along, `ArborPanel` with a short nav list is still the right answer — the sidebar collapses gracefully at any scale.

**Impact:** Add `@deprecated` to `AdminHeader.svelte`. No removal in this refactor.

### D6: Sidebar footer — fully customizable via snippet slot

The sidebar footer is a **snippet slot**. Engine and landing each provide their own footer content. ArborPanel provides a `sidebarFooter` snippet prop — if omitted, it renders a sensible default (user email + logout).

This means:

- Engine Arbor provides: user email, Help Center, Get Support, Logout
- Landing Arbor provides: whatever makes sense for the landing admin (maybe just Logout, maybe links to docs)
- Future consumers: whatever they need

**Impact on props:**

```typescript
interface ArborPanelProps {
  // ...existing props...

  /** Custom sidebar footer content. If omitted, renders default (user email + logout). */
  sidebarFooter?: Snippet;

  /** Custom sidebar header content. If omitted, renders default (logo + title). */
  sidebarHeader?: Snippet;
}
```

Both `sidebarHeader` and `sidebarFooter` are snippet slots with sensible defaults. The default footer uses `user`, `logoutHref`/`onLogout`, and `footerLinks` props. Custom snippets override the entire section.

### D7: Demo mode banner — built in

ArborPanel renders the demo mode banner when `isDemoMode={true}` is passed. This is engine-specific behavior today, but it's lightweight enough to include in the shared component. Non-demo consumers simply don't pass the prop.

**Impact on props:** `isDemoMode?: boolean` (default `false`). Renders the floating "Demo Mode — Screenshots enabled" banner.

---

## Summary

The Arbor panel refactor extracts ~787 lines of battle-tested sidebar UI from the engine's route files into a composable `<ArborPanel>` component. Consumers provide configuration (nav items, footer links, user info) and get the full sidebar experience — glass morphism, collapse/expand, mobile slide-in, activity indicators, dark mode, accessibility — for free.

The landing's Arbor stops being an "isolated island" and starts feeling like part of the Grove. Same spatial navigation, same warm personality, same responsiveness. Different content, same shell.

This follows the Chrome pattern exactly: Chrome provides `<Header>` and consumers configure it with props. Arbor provides `<ArborPanel>` and consumers configure it with props. Legos, not primitives.
