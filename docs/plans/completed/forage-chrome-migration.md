# Forage Chrome Migration Plan

## Overview

Migrate Forage (Domain Finder) from custom local chrome to unified engine Chrome components, establishing consistent navigation patterns across all Grove properties.

---

## Current State

### Public Pages

- **Landing page** (`/`) - No header/footer, just Gossamer background + content
- **Login page** (`/admin/login`) - Uses LoginGraft, no chrome

### Admin Pages

- **Custom horizontal tab layout** with:
  - Glass header (logo, user email, logout)
  - Horizontal tab nav (Dashboard, Searcher, History, Config)
  - Uses `glass-surface`, `glass-tabs` local CSS classes

### Engine Chrome Available

- **Header.svelte** - Public nav with logo, nav items, theme toggle, mobile menu
- **Footer.svelte** - Resources, connect, legal sections
- **Arbor admin layout** - Collapsible sidebar, 9+ nav items (for CMS-like apps)

---

## Architectural Decision: Admin Layout Style

Forage has only 4 admin pages vs Arbor's 9+. Two approaches:

### Option A: Adopt Arbor Sidebar

- Use engine's existing sidebar admin layout
- Consistent with engine/Plant/blog admin
- Feels heavy for 4 pages

### Option B: Create AdminHeader Component ✓ (Recommended)

- New engine component: `AdminHeader` with:
  - Logo + brand title (customizable)
  - Horizontal tab navigation
  - User info + logout
  - Theme toggle
- Better fit for simple admin tools
- Reusable for Meadow, future simple tools

---

## Implementation Plan

### Phase 1: Create AdminHeader Component in Engine

**New file: `libs/engine/src/lib/ui/components/chrome/AdminHeader.svelte`**

A new horizontal admin header component with:

- Sticky header with glass effect
- Logo + brand title (customizable via prop)
- Tab navigation (passed as prop array)
- User info display (email)
- Logout action (function or href)
- Theme toggle integration
- Mobile-responsive with horizontal scroll on tabs

**Props interface:**

```typescript
interface AdminTab {
	href: string;
	label: string;
	icon?: IconComponent;
}

interface Props {
	tabs: AdminTab[];
	brandTitle?: string;
	brandLogo?: Snippet; // Custom logo support
	user?: { email: string } | null;
	logoutHref?: string;
	onLogout?: () => void;
	maxWidth?: "default" | "wide" | "full";
	accentColor?: string; // For tab underline color
}
```

---

### Phase 2: Update Engine Chrome Exports

**File: `libs/engine/src/lib/ui/components/chrome/index.ts`**

Add AdminHeader to exports:

```ts
export { default as AdminHeader } from "./AdminHeader.svelte";
```

---

### Phase 3: Add Engine Chrome to Root Layout

**File: `apps/domains/src/routes/+layout.svelte`**

Add Header and Footer for public pages:

```svelte
<script>
	import "../app.css";
	import { browser } from "$app/environment";
	import { page } from "$app/state";
	import { GossamerClouds } from "@autumnsgrove/gossamer/svelte";
	import "@autumnsgrove/gossamer/svelte/style.css";
	import { Header, Footer } from "@autumnsgrove/lattice/chrome";
	import { Search } from "lucide-svelte";

	let { children } = $props();

	// Check if we're in admin section (admin has its own chrome)
	const isAdmin = $derived(page.url.pathname.startsWith("/admin"));

	// Forage nav items for public pages
	const navItems = [{ href: "/admin", label: "Admin", icon: Search }];

	// Dark mode setup...
</script>

<div class="min-h-screen relative overflow-hidden domain-gradient">
	<GossamerClouds preset="ambient-clouds" color="#a78bfa" opacity={0.25} animated />

	<div class="relative z-10 flex flex-col min-h-screen">
		{#if !isAdmin}
			<Header {navItems} brandTitle="Forage" />
		{/if}

		<main class="flex-1">
			{@render children()}
		</main>

		{#if !isAdmin}
			<Footer />
		{/if}
	</div>
</div>
```

---

### Phase 4: Migrate Admin Layout to AdminHeader

**File: `apps/domains/src/routes/admin/+layout.svelte`**

Replace custom header/tabs with AdminHeader:

```svelte
<script lang="ts">
	import type { LayoutData } from "./$types";
	import { page } from "$app/state";
	import { AdminHeader } from "@autumnsgrove/lattice/chrome";
	import { LayoutDashboard, Search, Clock, Settings } from "lucide-svelte";

	let { data, children }: { data: LayoutData; children: any } = $props();

	const isLoginPage = $derived(page.url.pathname === "/admin/login");

	const tabs = [
		{ href: "/admin", label: "Dashboard", icon: LayoutDashboard },
		{ href: "/admin/searcher", label: "Searcher", icon: Search },
		{ href: "/admin/history", label: "History", icon: Clock },
		{ href: "/admin/config", label: "Config", icon: Settings },
	];

	async function logout() {
		await fetch("/api/auth/logout", { method: "POST" });
		window.location.href = "/";
	}
</script>

{#if isLoginPage}
	{@render children()}
{:else}
	<div class="min-h-screen flex flex-col">
		<AdminHeader {tabs} brandTitle="Domain Finder" user={data.user} onLogout={logout}>
			{#snippet brandLogo()}
				<svg class="w-8 h-8 text-domain-600 dark:text-domain-400" viewBox="0 0 100 100" fill="none">
					<circle
						cx="50"
						cy="50"
						r="35"
						stroke="currentColor"
						stroke-width="3"
						fill="none"
						opacity="0.2"
					/>
					<circle cx="50" cy="50" r="10" fill="currentColor" />
					<circle
						cx="68"
						cy="68"
						r="12"
						stroke="currentColor"
						stroke-width="3"
						fill="white"
						class="dark:fill-neutral-900"
					/>
					<line
						x1="77"
						y1="77"
						x2="88"
						y2="88"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
					/>
				</svg>
			{/snippet}
		</AdminHeader>

		<main class="flex-1 py-8">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{@render children()}
			</div>
		</main>
	</div>
{/if}
```

---

### Phase 5: Clean Up CSS

**File: `apps/domains/src/app.css`**

After migration, audit and potentially remove:

- `glass-surface` - Only if no longer used
- `glass-tabs` - Only if no longer used

Note: Keep if used elsewhere in the codebase.

---

## Files to Create/Modify

| File                                   | Action     | Description                 |
| -------------------------------------- | ---------- | --------------------------- |
| `engine/.../chrome/AdminHeader.svelte` | **CREATE** | New horizontal admin header |
| `engine/.../chrome/index.ts`           | MODIFY     | Export AdminHeader          |
| `engine/.../chrome/types.ts`           | MODIFY     | Add AdminTab type           |
| `domains/.../+layout.svelte`           | MODIFY     | Add Header/Footer           |
| `domains/.../admin/+layout.svelte`     | MODIFY     | Use AdminHeader             |
| `domains/src/app.css`                  | MODIFY     | Remove unused classes       |

---

## AdminHeader Design Spec

### Visual Structure

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Brand Title                    user@email  [🌙] [→]  │
├─────────────────────────────────────────────────────────────┤
│  Dashboard   Searcher   History   Config                    │
│  ═════════                                                  │
└─────────────────────────────────────────────────────────────┘
```

### Styling

- Uses engine semantic tokens (`text-foreground`, `bg-surface`, etc.)
- Active tab: underline with `--accent-muted` or custom `accentColor` prop
- Glass effect: `bg-surface/95 backdrop-blur-md`
- Sticky positioning with proper z-index
- Mobile: horizontal scroll on tabs, hide email

### Accessibility

- Tab navigation with proper ARIA
- Focus states on all interactive elements
- Keyboard navigation support

---

## Color Token Notes

The AdminHeader uses engine tokens internally:

- `text-foreground` - Main text
- `text-foreground-muted` - Secondary text (user email, inactive tabs)
- `bg-surface` - Background with glass effect
- `border-default` - Divider lines
- `accent-muted` - Active tab indicator (green by default)

Forage can customize the active tab color via `accentColor` prop to use purple:

```svelte
<AdminHeader {tabs} accentColor="var(--domain-600)" />
```

Or we can add a `variant` prop to switch between grove green and property-specific accents.

---

## Verification Checklist

1. [ ] **Landing page** - Shows Header with "Forage" brand + Footer
2. [ ] **Login page** - NO chrome (uses LoginGraft fullpage)
3. [ ] **Admin pages** - Shows AdminHeader with 4 tabs
4. [ ] **Tab navigation** - Active tab highlighted, all links work
5. [ ] **User info** - Email displayed, hidden on mobile
6. [ ] **Logout** - Works via button click
7. [ ] **Theme toggle** - Works on all pages
8. [ ] **Mobile** - Responsive header, scrollable tabs
9. [ ] **Dark mode** - All chrome elements properly themed

---

## Copy Plan to docs/plans/planned

After approval, copy this file to:

```
docs/plans/planned/forage-chrome-migration.md
```
