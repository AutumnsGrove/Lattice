# Tenant Mobile Sidebar Unification Plan

## Overview

Unify the mobile sidebar experience across Grove properties by removing the inline mobile menu from the tenant layout and having it use the existing chrome `Header` + `MobileMenu` components that landing already uses.

---

## Problem Statement

### Current State

**Landing (grove.place)** uses chrome components:
- Imports `Header` from `@autumnsgrove/groveengine/ui/chrome`
- Header renders `MobileMenu.svelte` internally
- Result: Beautiful glassmorphism slide-out panel with Lucide icons, organized sections (Resources, Connect), GroveDivider nature elements

**Tenant sites (*.grove.place)** use inline implementation:
- `packages/engine/src/routes/+layout.svelte` has ~100 lines of inline mobile menu code (lines 324-358)
- Basic dropdown animation instead of slide-out
- Plain text links, no icons, no sections, no glassmorphism
- ~200 lines of supporting inline CSS

### The Desync

The chrome components exist and work beautifully. Tenants simply don't use them. The tenant `+layout.svelte` predates the chrome extraction and was never refactored.

### Visual Comparison

| Aspect | Landing (Chrome) | Tenant (Inline) |
|--------|------------------|-----------------|
| Animation | Slide-out from right | Dropdown from header |
| Backdrop | Glassmorphism blur | Solid dark background |
| Icons | Lucide icons per item | No icons |
| Sections | Resources, Connect groups | Flat list |
| Dividers | GroveDivider with nature elements | None |
| Close button | Explicit X with label | Click outside only |

---

## Architectural Decision: Extend Chrome vs New Graft

### Option A: Create MobileMenuGraft
- New abstraction layer in `src/lib/grafts/navigation/`
- Variants for landing, tenant, minimal contexts
- More flexibility, more code

### Option B: Extend Chrome (Recommended)
- Add search support to existing Header component
- Create tenant nav builder utility
- Refactor tenant layout to use chrome
- Less abstraction, maximum reuse

**Decision: Option B** - The chrome components are already the right abstraction. A graft would add unnecessary indirection for something that's fundamentally layout chrome.

---

## Implementation Plan

### Phase 1: Extend Header Component

**File: `packages/engine/src/lib/ui/components/chrome/Header.svelte`**

Add optional search functionality that tenants need:

```typescript
interface Props {
  // Existing props...
  navItems?: NavItem[];
  resourceLinks?: FooterLink[];
  connectLinks?: FooterLink[];
  brandTitle?: string;
  maxWidth?: 'default' | 'wide' | 'full';

  // NEW: Search support for tenant sites
  searchEnabled?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}
```

Implementation notes:
- Search is opt-in (disabled by default for landing)
- Search input appears in desktop nav and mobile menu
- `onSearch` callback allows tenant to handle navigation

---

### Phase 2: Create Tenant Nav Builder Utility

**New file: `packages/engine/src/lib/ui/components/chrome/tenant-nav.ts`**

Utility to transform tenant database data into `NavItem[]` format:

```typescript
import type { NavItem } from './types';
import { Home, BookOpen, Image, Clock, User } from 'lucide-svelte';

interface TenantNavPage {
  slug: string;
  title: string;
}

interface TenantNavOptions {
  siteName: string;
  navPages?: TenantNavPage[];
  showTimeline?: boolean;
  showGallery?: boolean;
}

const PAGE_ICONS: Record<string, typeof Home> = {
  home: Home,
  blog: BookOpen,
  gallery: Image,
  timeline: Clock,
  about: User,
};

export function buildTenantNavItems(options: TenantNavOptions): NavItem[] {
  const items: NavItem[] = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/blog', label: 'Blog', icon: BookOpen },
  ];

  // Add optional sections based on tenant config
  if (options.showTimeline) {
    items.push({ href: '/timeline', label: 'Timeline', icon: Clock });
  }
  if (options.showGallery) {
    items.push({ href: '/gallery', label: 'Gallery', icon: Image });
  }

  // Add custom nav pages from database
  for (const page of options.navPages ?? []) {
    items.push({
      href: `/${page.slug}`,
      label: page.title,
      icon: PAGE_ICONS[page.slug.toLowerCase()] ?? undefined,
    });
  }

  // About always last
  items.push({ href: '/about', label: 'About', icon: User });

  return items;
}
```

---

### Phase 3: Update Chrome Exports

**File: `packages/engine/src/lib/ui/components/chrome/index.ts`**

Add new exports:

```typescript
// Existing exports...
export { default as Header } from './Header.svelte';
export { default as Footer } from './Footer.svelte';
export { default as MobileMenu } from './MobileMenu.svelte';

// NEW: Tenant nav utility
export { buildTenantNavItems } from './tenant-nav';
export type { TenantNavOptions, TenantNavPage } from './tenant-nav';
```

---

### Phase 4: Refactor Tenant Layout

**File: `packages/engine/src/routes/+layout.svelte`**

This is the main change. Replace the inline header/mobile-menu implementation with chrome components.

#### Before (current ~765 lines with inline mobile menu):

```svelte
<header class="site-header">
  <nav class="nav-container">
    <a href="/" class="logo">{siteName}</a>
    <div class="nav-links desktop-nav">
      <a href="/">Home</a>
      <a href="/blog">Blog</a>
      <!-- ... more inline links ... -->
    </div>
    <Button class="hamburger-btn" onclick={() => mobileMenuOpen = !mobileMenuOpen}>
      <!-- hamburger icon -->
    </Button>
  </nav>

  <!-- 50+ lines of inline mobile menu -->
  <div class="mobile-menu" class:open={mobileMenuOpen}>
    <div class="mobile-nav-links">
      <a href="/">Home</a>
      <!-- ... -->
    </div>
  </div>
</header>

<!-- 200+ lines of inline CSS for header/mobile-menu -->
<style>
  .site-header { ... }
  .mobile-menu { ... }
  /* etc */
</style>
```

#### After (using chrome):

```svelte
<script lang="ts">
  import { Header, Footer, buildTenantNavItems } from '@autumnsgrove/groveengine/ui/chrome';
  import { goto } from '$app/navigation';

  // ... existing data/props ...

  // Build nav items from tenant config
  const navItems = $derived(buildTenantNavItems({
    siteName: siteName,
    navPages: data.navPages,
    showTimeline: data.tenant?.showTimeline,
    showGallery: data.tenant?.showGallery,
  }));

  function handleSearch(query: string) {
    goto(`/blog?search=${encodeURIComponent(query)}`);
  }
</script>

<Header
  {navItems}
  brandTitle={siteName}
  searchEnabled={true}
  searchPlaceholder="Search posts..."
  onSearch={handleSearch}
  resourceLinks={[]}
  connectLinks={[]}
/>

<!-- Rest of layout content -->

<!-- Keep tenant-specific footer with admin link, login indicator -->
```

#### What Gets Removed

From `+layout.svelte`:
- Lines 324-358: Inline mobile menu HTML (~35 lines)
- Lines 280-323: Inline desktop nav HTML (~45 lines)
- Lines 600-765: Inline header/nav CSS (~165 lines)
- Lines 200-250: Mobile menu state/toggle logic (~50 lines)

**Total removal: ~295 lines**

#### What Stays

- Tenant-specific footer (admin link, login indicator)
- Theme initialization logic
- Layout structure for main content area
- Seasonal/nature background components

---

### Phase 5: Handle Empty Sections

The chrome MobileMenu shows "Resources" and "Connect" sections. For tenants, pass empty arrays to hide them:

```svelte
<Header
  {navItems}
  resourceLinks={[]}  <!-- Hides Resources section -->
  connectLinks={[]}   <!-- Hides Connect section -->
/>
```

Alternatively, we could add boolean props to Header:
```typescript
showResourcesSection?: boolean;  // default: true
showConnectSection?: boolean;    // default: true
```

This makes the intent clearer than passing empty arrays.

---

## Files Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `engine/.../chrome/Header.svelte` | MODIFY | +30 (search props) |
| `engine/.../chrome/tenant-nav.ts` | CREATE | +45 |
| `engine/.../chrome/index.ts` | MODIFY | +5 (exports) |
| `engine/src/routes/+layout.svelte` | MODIFY | -295, +20 |

**Net change: ~245 fewer lines**

---

## Migration Checklist

### Pre-Implementation
- [ ] Read current `+layout.svelte` thoroughly
- [ ] Identify all tenant-specific nav variations
- [ ] Check if any tenants have custom nav pages in DB

### Phase 1: Chrome Extensions
- [ ] Add `searchEnabled`, `searchPlaceholder`, `onSearch` props to Header
- [ ] Add search input to Header (desktop and mobile)
- [ ] Test search callback fires correctly

### Phase 2: Tenant Nav Utility
- [ ] Create `tenant-nav.ts` with `buildTenantNavItems`
- [ ] Add icon mapping for common page types
- [ ] Export from chrome/index.ts

### Phase 3: Tenant Layout Refactor
- [ ] Import Header from chrome
- [ ] Replace inline header HTML with `<Header>`
- [ ] Wire up search handler
- [ ] Pass empty arrays for resource/connect links
- [ ] Remove inline mobile menu HTML
- [ ] Remove inline CSS for header/nav/mobile-menu

### Phase 4: Testing
- [ ] Test on tenant site (autumn.grove.place)
- [ ] Verify mobile menu slides out (not drops down)
- [ ] Verify icons appear on nav items
- [ ] Verify search works
- [ ] Verify theme toggle works
- [ ] Verify glassmorphism backdrop appears
- [ ] Test on multiple screen sizes
- [ ] Verify Resources/Connect sections are hidden

### Phase 5: Write Tests

> **Important:** Before writing tests, invoke skill: `beaver-build` for Grove's testing patterns and conventions.

- [ ] Write unit tests for `buildTenantNavItems()` utility
  - Default nav items (Home, Blog, About)
  - Custom nav pages from DB
  - Optional timeline/gallery flags
  - Icon mapping
- [ ] Write component tests for Header search functionality
  - Search input renders when `searchEnabled={true}`
  - `onSearch` callback fires on submit
  - Search hidden when `searchEnabled={false}` (default)

**Test file locations:**
- `packages/engine/src/lib/ui/components/chrome/tenant-nav.test.ts`
- `packages/engine/src/lib/ui/components/chrome/Header.test.ts` (extend existing or create)

### Phase 6: Cleanup
- [ ] Remove any orphaned CSS classes
- [ ] Verify no console errors
- [ ] Check accessibility (focus states, ARIA)

---

## Verification Scenarios

1. **Desktop nav** - Links display horizontally with proper spacing
2. **Mobile hamburger** - Tapping opens slide-out menu from right
3. **Mobile menu close** - X button and backdrop click both close
4. **Search** - Input appears, typing + enter navigates to search results
5. **Theme toggle** - Works in both desktop and mobile views
6. **Custom pages** - Tenant nav pages from DB appear in menu
7. **No sections** - Resources/Connect sections don't appear for tenants
8. **Glassmorphism** - Backdrop blur visible behind mobile menu
9. **Icons** - Home, Blog, About have appropriate Lucide icons

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Theme toggle breaks | Ensure themeStore is properly imported/used |
| Search routing differs | Make onSearch callback flexible |
| Tenant nav order changes | Match current order in buildTenantNavItems |
| CSS specificity conflicts | Remove all inline CSS, rely on chrome |
| Mobile menu z-index issues | Chrome uses `z-grove-mobile-menu` from preset |

---

## Future Considerations

After this unification:
- All Grove properties use the same mobile navigation
- Changes to MobileMenu.svelte benefit everyone
- Tenant-specific features can be added via props
- Could add `MobileMenuGraft` later if we need Greenhouse control over navigation features

---

## Related Files Reference

### Chrome Components (the good ones)
- `packages/engine/src/lib/ui/components/chrome/Header.svelte`
- `packages/engine/src/lib/ui/components/chrome/MobileMenu.svelte`
- `packages/engine/src/lib/ui/components/chrome/types.ts`
- `packages/engine/src/lib/ui/components/chrome/defaults.ts`

### Tenant Layout (needs refactor)
- `packages/engine/src/routes/+layout.svelte`

### Landing Usage (reference for how chrome is used)
- `packages/landing/src/routes/+page.svelte`
- `packages/landing/src/routes/manifesto/+page.svelte`
