---
title: "Arbor Developer Guide"
description: "How to build, extend, and configure the Arbor admin panel system"
category: guides
guideCategory: reference
lastUpdated: "2026-03-12"
aliases: []
tags:
  - arbor
  - admin
  - svelte
  - navigation
  - glasscard
  - feature-gating
---

# Arbor Developer Guide

Arbor is the admin panel system that powers every Grove admin experience. An arbor is a garden structure that supports climbing plants. In Grove, it's the framework where you manage and cultivate your corner of the grove: content, settings, account, and whatever else your admin needs.

The system ships as a component family in the engine. You pass configuration (nav items, footer links, user info) and get a full sidebar admin experience: glass morphism, collapse/expand, mobile slide-in, activity indicators, dark mode, accessibility. All of it.

Two consumers use Arbor today:

- **Engine Arbor** at `libs/engine/src/routes/arbor/` serves tenant admin panels (Dashboard, Garden, Pages, Images, Comments, and more)
- **Landing Arbor** at `apps/landing/src/routes/arbor/` serves the Grove platform admin (Feedback, Subscribers, CDN, plus Wayfinder-only tools)

Both use the same `<ArborPanel>` component. They differ only in what nav items they pass and how they handle logout.

## How Arbor Works

Arbor has three layers:

1. **ArborPanel** is the shell. It renders the sidebar, manages the content area, wires up the sidebar store, and handles mobile overlay. Every Arbor admin wraps its content in `<ArborPanel>`.

2. **ArborSection** is the page wrapper. Individual pages use it for consistent headings, descriptions, icons, and action buttons. Optional but keeps things uniform.

3. **sidebarStore** bridges the Chrome Header and the sidebar. The Header's toggle button calls `sidebarStore.toggle()` on mobile and `sidebarStore.toggleCollapse()` on desktop. ArborPanel reads these values and responds.

### The layout flow

```
Chrome Header (with sidebar toggle)
  |
  v
ArborPanel (sidebar + content area)
  |
  +-- ArborSidebar (glass sidebar: header, nav, footer)
  |     +-- ArborSidebarHeader (logo + title + collapse toggle)
  |     +-- ArborNav (nav item list with active states)
  |     +-- ArborSidebarFooter (user info + links + logout)
  |
  +-- ArborOverlay (mobile backdrop)
  |
  +-- <main> (your page content goes here)
```

### Sidebar states

The sidebar operates in three desktop states:

- **Expanded** (250px): Full labels, icons, footer with user email
- **Collapsed** (72px): Icon-only rail, hover to temporarily expand
- **Hovered** (250px overlaid): When collapsed and the user hovers, the sidebar expands with a shadow and higher z-index

On mobile (under 768px), the sidebar slides in from the left as a full-height overlay. Tap the backdrop or press Escape to close it.

## Adding a New Section

This is the most common Arbor task. Here's the full process.

### 1. Create the route files

Add a directory under the Arbor routes with a `+page.svelte` and optionally a `+page.server.ts`:

```
libs/engine/src/routes/arbor/my-section/
  +page.svelte
  +page.server.ts   (if you need server data)
```

### 2. Build the page

Use `ArborSection` for consistent structure. Import `GlassCard` for content containers.

```svelte
<script>
  import { ArborSection } from "$lib/ui/components/arbor";
  import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";
  import { Leaf } from "@lucide/svelte";

  let { data } = $props();
</script>

<ArborSection
  title="My Section"
  description="What this section does"
  icon={Leaf}
>
  <GlassCard variant="frosted" class="mb-6">
    <div class="section-header">
      <h2>Card Title</h2>
    </div>
    <p>Card content here.</p>
  </GlassCard>
</ArborSection>
```

`ArborSection` gives you the page title row with icon, optional description text, and an `actions` snippet slot for buttons in the header.

### 3. Add the nav item

Open the layout file for your consumer (`+layout.svelte`) and add your item to the `navItems` array:

```typescript
// In libs/engine/src/routes/arbor/+layout.svelte
let navItems = $derived([
  // ...existing items...
  { href: "/arbor/my-section", label: "My Section", icon: Leaf },
]);
```

That's it. ArborPanel handles the active state highlighting, collapse behavior, mobile rendering, and dark mode styling automatically.

### 4. Add server data (if needed)

```typescript
// +page.server.ts
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, platform }) => {
  const db = platform?.env?.DB;
  // query your data
  return { items: [] };
};
```

The parent Arbor layout (`+layout.server.ts`) already handles auth, tenant verification, grafts, and demo mode. Your page inherits all of that through `data`.

## GlassCard Patterns

GlassCard is the primary content container in Arbor pages. Every section page in the codebase follows the same pattern.

### Basic card

```svelte
<GlassCard variant="frosted" class="mb-6">
  <div class="section-header">
    <h2>Section Title</h2>
  </div>
  <p>Content goes here.</p>
</GlassCard>
```

The `variant="frosted"` gives it the glass morphism look that matches the sidebar. The `class="mb-6"` adds bottom margin between cards.

### Card with form actions

Many settings cards use SvelteKit form actions with `enhance`:

```svelte
<GlassCard variant="frosted" class="mb-6">
  <form method="POST" action="?/updateSetting" use:enhance>
    <div class="section-header">
      <h2>Setting Name</h2>
    </div>
    <input name="value" bind:value={settingValue} />
    <Button type="submit" disabled={saving}>
      {saving ? "Saving..." : "Save"}
    </Button>
  </form>
</GlassCard>
```

### Stacking cards

Arbor pages typically stack multiple GlassCards vertically. The dashboard page (`libs/engine/src/routes/arbor/+page.svelte`) is a good reference. It uses cards for quick actions, stats, recent activity, and roadmap progress. The settings page (`libs/engine/src/routes/arbor/settings/+page.svelte`) stacks cards for profile photo, grove address, font, accent color, season preference, header branding, and more.

## Navigation Configuration

### Nav item types

The `navItems` array accepts two kinds of entries:

**Items** link to pages:

```typescript
{
  href: "/arbor/garden",
  label: "Garden",
  icon: gardenIcon,
  termSlug: "your-garden",    // Grove Mode label resolution
  badge: 3,                   // shows breathing activity dot
  visible: !!data.grafts?.reeds_comments,  // feature gating
}
```

All fields except `href` and `label` are optional. The `kind` field defaults to `"item"` and can be omitted.

**Dividers** separate groups:

```typescript
{ kind: "divider", label: "Wayfinder Tools", style: "grove" }
```

The `style` controls rendering:
- `"line"` (default): simple horizontal rule
- `"grove"`: `GroveDivider` component with small Grove logos
- Any unicode string (like `"·"` or `"✦"`): repeated as a decorative separator

### Active state

ArborNav determines active state by path matching. The dashboard (`/arbor`) uses exact match. Every other item uses `startsWith`, so `/arbor/garden` stays highlighted when you navigate to `/arbor/garden/edit/my-post`.

### Service icons

Engine Arbor resolves icons from the canonical service manifest:

```typescript
import { defaultSuite, resolveIcon } from "$lib/ui/components/ui/groveicon";

const gardenIcon = resolveIcon(defaultSuite.garden.icon);
const reedsIcon = resolveIcon(defaultSuite.reeds.icon);
```

This keeps nav icons consistent with the service identity system. You can also use Lucide icons directly:

```typescript
import { Settings } from "@lucide/svelte";
// ...
{ href: "/arbor/settings", label: "Settings", icon: Settings }
```

### Footer links

Footer links appear at the bottom of the sidebar, below the nav items:

```typescript
const footerLinks = [
  { href: "https://grove.place/knowledge/help", label: "Help Center", external: true },
  { href: "https://grove.place/porch", label: "Get Support", external: true },
];
```

The `external: true` flag opens links in a new tab. Known labels ("Help Center", "Get Support") get default icons automatically. You can override with a custom `icon` property.

### Logout

Two patterns:

- **Engine Arbor** uses `logoutHref="/auth/logout"` for a direct navigation link
- **Landing Arbor** uses `onLogout={handleLogoutClick}` to show a `GlassConfirmDialog` before signing out via a POST fetch

When both `logoutHref` and `onLogout` are provided, `logoutHref` wins.

## Feature Gating

Features in Arbor are gated through the **grafts** system. The layout server load function fetches enabled grafts for the tenant:

```typescript
// In +layout.server.ts
const grafts = await getEnabledGrafts({ tenantId, inGreenhouse }, flagsEnv);
```

This `grafts` object flows to the layout component via `data.grafts`. Nav items use the `visible` property to conditionally show:

```typescript
{
  href: "/arbor/reeds",
  label: "Comments",
  icon: reedsIcon,
  visible: !!data.grafts?.reeds_comments,
}
```

When `visible` is `false`, the nav item disappears from the sidebar entirely. When omitted or `true`, the item shows normally.

For the landing Arbor, gating is simpler. Wayfinder-only items appear based on `data.isWayfinder`:

```typescript
let navItems = $derived(
  data.isWayfinder ? [...baseItems, ...wayfinderItems] : baseItems
);
```

### Permission-based gating

Nav items also support `requiredPermissions`:

```typescript
{
  href: "/arbor/admin-tools",
  label: "Admin Tools",
  requiredPermissions: ["admin:manage"],
}
```

Pass `userPermissions` to `<ArborPanel>` and the component handles the rest. An item is hidden unless the user has every permission in its `requiredPermissions` array.

## ArborSection Deep Dive

`ArborSection` is the standardized page wrapper. It renders a title, optional description, optional icon, optional back navigation, and an actions slot.

### With action buttons

```svelte
<ArborSection title="Garden" description="Manage your blog posts" icon={FileText}>
  {#snippet actions()}
    <Button href="/arbor/garden/new">New Post</Button>
  {/snippet}

  <!-- page content -->
</ArborSection>
```

### With back navigation

For sub-pages (like editing a specific item), use `backHref` and `backLabel`:

```svelte
<ArborSection
  title="Edit Post"
  backHref="/arbor/garden"
  backLabel="Back to Garden"
>
  <!-- editor content -->
</ArborSection>
```

This renders a chevron-left link above the title that navigates back to the parent section.

### Grove Mode integration

Pass a `termSlug` to resolve the title through Grove Mode (nature-themed terminology):

```svelte
<ArborSection title="Comments" termSlug="reeds">
  <!-- "Comments" becomes "Reeds" when Grove Mode is on -->
</ArborSection>
```

## ArborToggle

`ArborToggle` is a standalone button component that controls the sidebar. Place it inside any header:

```svelte
<script>
  import { ArborToggle } from "@autumnsgrove/lattice/ui/arbor";
</script>

<header>
  <ArborToggle />
  <!-- rest of your header -->
</header>
```

On mobile, it calls `sidebarStore.toggle()` to open/close the slide-in sidebar. On desktop, it calls `sidebarStore.toggleCollapse()` to switch between expanded and collapsed states.

The Chrome Header already has sidebar toggle support built in. Pass `showSidebarToggle={true}` to the Header component and it handles the toggle internally.

## Customizing the Sidebar

### Custom header

Replace the default logo and title with a custom snippet:

```svelte
<ArborPanel {navItems} {footerLinks} user={data.user}>
  {#snippet sidebarHeader()}
    <div class="my-custom-header">
      <img src="/my-logo.svg" alt="My App" />
      <span>My Admin</span>
    </div>
  {/snippet}

  {@render children()}
</ArborPanel>
```

### Custom footer

Replace the default user info and logout:

```svelte
<ArborPanel {navItems} user={data.user}>
  {#snippet sidebarFooter()}
    <div class="my-footer">
      <span>{data.user?.email}</span>
      <button onclick={customLogout}>Sign Out</button>
    </div>
  {/snippet}

  {@render children()}
</ArborPanel>
```

When you provide a custom snippet, the default footer (user email, footer links, logout) is fully replaced.

### Other props

| Prop | Default | What it does |
|------|---------|-------------|
| `brandTitle` | `"Arbor"` | Text in the sidebar header next to the logo |
| `showLogo` | `true` | Whether to render the Grove logo in the sidebar header |
| `isDemoMode` | `false` | Shows a floating "Demo Mode" banner at the top |
| `showLeafPattern` | `true` | Applies the leaf-pattern background to the layout |
| `messages` | `undefined` | Array of `ChannelMessage` objects rendered via `GroveMessages` above content |

## Why Things Break

**Nav item doesn't appear.** Check `visible` on the item. If it's bound to a grafts flag, make sure the graft is enabled for the tenant. Items with `visible: false` are silently hidden.

**Sidebar toggle does nothing.** The Chrome Header and ArborPanel communicate through `sidebarStore`. If your header doesn't call `sidebarStore.toggle()` or `sidebarStore.toggleCollapse()`, the sidebar won't respond. Use `showSidebarToggle={true}` on the Header or place an `<ArborToggle>` in your header.

**Active state highlights the wrong item.** ArborNav uses `startsWith` matching for all items except the dashboard (exact match on `/arbor`). If your route prefix overlaps with another (like `/arbor/chat` and `/arbor/chat-settings`), the shorter one will match both. Put the more specific route first or restructure.

**Content area has wrong margin.** The content area offsets by 250px (expanded) or 72px (collapsed) on desktop. On mobile, margin is 0. If you add a footer outside ArborPanel, you need to apply matching margin offsets. The landing Arbor shows this pattern with `.arbor-footer-wrapper`.

**GlassCard looks wrong in dark mode.** Use `variant="frosted"` and let the component handle dark mode. Don't set manual background colors on GlassCards.

**Page doesn't inherit auth.** The Arbor layout server load runs auth checks, tenant verification, and grafts loading. Your page gets all of this through `data` from the parent layout. If you bypass the layout (rendering outside `/arbor/` routes), you lose this protection.

## Key Files

### Component family

| File | Purpose |
|------|---------|
| `libs/engine/src/lib/ui/components/arbor/ArborPanel.svelte` | The main shell component |
| `libs/engine/src/lib/ui/components/arbor/ArborSection.svelte` | Page wrapper with title, description, actions |
| `libs/engine/src/lib/ui/components/arbor/ArborToggle.svelte` | Standalone sidebar toggle button |
| `libs/engine/src/lib/ui/components/arbor/ArborNav.svelte` | Internal: nav item list with active states |
| `libs/engine/src/lib/ui/components/arbor/ArborSidebarHeader.svelte` | Internal: logo, title, collapse toggle |
| `libs/engine/src/lib/ui/components/arbor/ArborSidebarFooter.svelte` | Internal: user info, links, logout |
| `libs/engine/src/lib/ui/components/arbor/ArborOverlay.svelte` | Internal: mobile backdrop |
| `libs/engine/src/lib/ui/components/arbor/types.ts` | All type definitions |
| `libs/engine/src/lib/ui/components/arbor/index.ts` | Barrel exports |

### Route layouts

| File | Purpose |
|------|---------|
| `libs/engine/src/routes/arbor/+layout.svelte` | Engine tenant admin layout |
| `libs/engine/src/routes/arbor/+layout.server.ts` | Auth, tenant, grafts, messages loading |
| `apps/landing/src/routes/arbor/+layout.svelte` | Landing platform admin layout |

### Store

| File | Purpose |
|------|---------|
| `libs/engine/src/lib/ui/stores/sidebar.svelte.ts` | Sidebar open/collapsed state (Svelte 5 runes) |

### Import paths

```typescript
// Components and types
import { ArborPanel, ArborSection, ArborToggle } from "@autumnsgrove/lattice/ui/arbor";
import type { ArborNavEntry, ArborNavItem, ArborFooterLink } from "@autumnsgrove/lattice/ui/arbor";

// Sidebar store
import { sidebarStore } from "@autumnsgrove/lattice/ui/arbor";

// Within the engine (dollar-sign paths)
import { ArborPanel } from "$lib/ui/components/arbor";
```

## Quick Checklist

When adding a new Arbor section:

- [ ] Create `libs/engine/src/routes/arbor/my-section/+page.svelte`
- [ ] Use `ArborSection` for the page wrapper
- [ ] Use `GlassCard variant="frosted"` for content containers
- [ ] Add the nav item to `navItems` in `+layout.svelte`
- [ ] If feature-gated, add `visible: !!data.grafts?.my_flag` to the nav item
- [ ] If it needs a server load, create `+page.server.ts`
- [ ] Import icons from `@lucide/svelte` or the `groveicon` manifest
- [ ] Test collapsed sidebar state (labels should hide, icons should remain)
- [ ] Test mobile (sidebar should close on nav item click)
