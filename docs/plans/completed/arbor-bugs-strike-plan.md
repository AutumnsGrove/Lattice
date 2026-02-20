# Arbor Bug Strike Plan

## Overview

Four bugs in the Arbor admin panel. Strike in order of dependency.

---

## Strike 1: Gallery/Timeline Not Showing (CRITICAL)

**Issue:** Not yet filed (discovered #852 fix was incomplete)
**File:** `libs/engine/src/routes/+layout.server.ts`

### Problem

Variables `timelineResult` and `galleryResult` are declared INSIDE the `if (tenantId)` block (line 37) but the return statement tries to use them OUTSIDE that block (lines 163-164). They're out of scope.

### Fix

Add hoisted boolean variables before the `if (tenantId)` block:

```typescript
// Line ~23 (before the if block)
let timelineEnabled = false;
let galleryEnabled = false;

// Inside the if (tenantId) block, after the queries:
if (timelineResult?.enabled) {
	navPages.push({ slug: "timeline", title: "Timeline" });
	timelineEnabled = true; // Track state
}
if (galleryResult?.enabled) {
	navPages.push({ slug: "gallery", title: "Gallery" });
	galleryEnabled = true; // Track state
}

// In the return statement:
return {
	// ... other props
	showTimeline: timelineEnabled,
	showGallery: galleryEnabled,
};
```

### Verification

1. Enable timeline curio in admin settings
2. Check that Timeline appears in nav on public site
3. Same for gallery

---

## Strike 2: Double Nav Bar on Mobile (#858)

**File:** `libs/engine/src/routes/+layout.svelte`

### Problem

On mobile admin pages, TWO headers render:

1. Root layout's `<Header>` component (z-index: 20)
2. Admin layout's `mobile-header` (z-index: 1000)

Both are fixed at `top: 0`, both are 56px tall.

### Fix

Conditionally hide the root Header on admin pages (mobile only).

In `+layout.svelte`, change lines 91-103 from:

```svelte
<Header navItems={tenantNavItems} ... />
```

To:

```svelte
{#if !isAdminPage}
	<Header navItems={tenantNavItems} ... />
{/if}
```

This hides the tenant nav Header entirely on `/admin/*` pages since the admin layout has its own navigation.

### Verification

1. Go to `/admin` on mobile
2. Should see ONLY the Arbor mobile header (with hamburger)
3. No double header stack

---

## Strike 3: Sidebar Clutter (#856)

**File:** `libs/engine/src/routes/admin/+layout.svelte`

### Problem

Sidebar has Curios, Rings, and Trail links that are redundant (already in Settings).

### Fix

Delete these nav items (lines 120-135):

```svelte
<!-- DELETE: lines 120-123 -->
<a href="/admin/curios" class="nav-item" onclick={closeSidebar} title="Curios">
	<Sparkles class="nav-icon" />
	<span class="nav-label" class:hidden={!showExpanded}>Curios</span>
</a>

<!-- DELETE: lines 128-131 -->
<a href="/admin/analytics" class="nav-item" onclick={closeSidebar} title="Rings">
	<BarChart3 class="nav-icon" />
	<span class="nav-label" class:hidden={!showExpanded}>Rings</span>
</a>

<!-- DELETE: lines 132-135 -->
<a href="/admin/timeline" class="nav-item" onclick={closeSidebar} title="Trail">
	<Calendar class="nav-icon" />
	<span class="nav-label" class:hidden={!showExpanded}>Trail</span>
</a>
```

Also remove unused imports from the `<script>` section:

- `Sparkles` (line 13)
- `BarChart3` (line 8)
- `Calendar` (line 9)

### Verification

1. Open Arbor sidebar on mobile
2. Should NOT need to scroll to reach Settings/Account
3. Verify Curios/Rings/Trail still accessible via Settings page

---

## Strike 4: Accent Color Not Applied (#857)

**Files:**

- `libs/engine/src/routes/admin/+layout.svelte` (sidebar header)
- `libs/engine/src/routes/+layout.svelte` (root layout)
- `libs/engine/src/lib/styles/tokens.css` (CSS variable bridge)

### Problem

User sets accent color (e.g., purple) but everything stays Grove Green. The accent color only applies to blog tags.

### Current Flow (Working)

```
Database (accent_color) → +layout.server.ts → data.siteSettings.accent_color
                                                        ↓
                                      +page.svelte sets --accent-color CSS var
                                                        ↓
                                              Tags use var(--accent-color)
```

### What's Missing

The `--accent-color` CSS variable needs to be:

1. Set at a higher level (root layout, not just blog pages)
2. Used by more UI elements (buttons, sidebar name, interactive elements)

### Fix Part A: Set accent color at root level

In `+layout.svelte`, add to the `<div class="layout">`:

```svelte
<div
  class="layout leaf-pattern"
  style:--user-accent={data.siteSettings?.accent_color || null}
>
```

### Fix Part B: Use accent color in admin sidebar

In `admin/+layout.svelte`, the sidebar header name (line 357) uses `color: var(--color-primary)`.

Change to use accent with fallback:

```css
.sidebar-header h2 {
	color: var(--user-accent, var(--color-primary));
}
```

### Fix Part C: Wire accent to interactive elements

In `tokens.css`, add a bridge:

```css
:root {
	--color-accent-user: var(--user-accent, var(--color-primary));
}
```

Then update button hover states, nav item active states, etc. to use `--color-accent-user`.

### Scope Decision

**Quick fix (recommended for now):** Just wire the sidebar header name and maybe buttons
**Full fix (future Foliage work):** Systematic audit and accent color throughout

### Verification

1. Set accent color to purple in Settings
2. Arbor sidebar should show name in purple
3. Interactive elements should use purple accent

---

## Strike Order

1. **Gallery/Timeline** — Critical bug, blocks feature
2. **Double Nav Bar** — High visibility bug
3. **Sidebar Clutter** — Quick win, improves mobile UX
4. **Accent Color** — Design enhancement

---

## Files Modified

| File                                              | Strikes |
| ------------------------------------------------- | ------- |
| `libs/engine/src/routes/+layout.server.ts`    | #1      |
| `libs/engine/src/routes/+layout.svelte`       | #2, #4  |
| `libs/engine/src/routes/admin/+layout.svelte` | #3, #4  |
| `libs/engine/src/lib/styles/tokens.css`       | #4      |
