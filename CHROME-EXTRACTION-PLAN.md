# Plan: Extract Shared Chrome Components to Engine

## Overview

Extract duplicated Header, Footer, MobileMenu, Logo, ThemeToggle components from Landing/Meadow apps into the engine package as shared "Chrome" assets. All Grove properties will share a consistent glassy navigation frame.

## User Decisions

- **Nav config**: Default Grove nav with optional override props
- **Variants**: Full + Minimal variants (for Clearing status page)
- **Season store**: Include in engine package

---

## Directory Structure

```
packages/engine/src/lib/ui/
├── components/chrome/           # NEW: Chrome components
│   ├── index.ts                 # Exports
│   ├── types.ts                 # NavItem, FooterLink interfaces
│   ├── defaults.ts              # Default nav items, footer links
│   ├── Header.svelte            # Full header (from Landing)
│   ├── HeaderMinimal.svelte     # Minimal header (from Clearing)
│   ├── Footer.svelte            # Full footer (from Landing)
│   ├── FooterMinimal.svelte     # Minimal footer (from Clearing)
│   ├── MobileMenu.svelte        # Mobile nav overlay
│   └── ThemeToggle.svelte       # Sun/Moon toggle
└── stores/                      # NEW: Shared stores
    ├── index.ts                 # Store exports
    └── season.ts                # Season cycling store
```

---

## Implementation Steps

### Phase 1: Create Engine Infrastructure

#### 1.1 Create types.ts
**File:** `packages/engine/src/lib/ui/components/chrome/types.ts`

```typescript
export interface NavItem {
  href: string;
  label: string;
  icon?: Component;
  external?: boolean;
}

export interface FooterLink {
  href: string;
  label: string;
  icon?: Component;
  external?: boolean;
}

export type MaxWidth = 'narrow' | 'default' | 'wide';
```

#### 1.2 Create defaults.ts
**File:** `packages/engine/src/lib/ui/components/chrome/defaults.ts`

Define default nav items (Manifesto, Vision, Roadmap, Pricing, Knowledge, Forest, Blog) and footer links (Resources, Connect, Legal).

#### 1.3 Create season.ts store
**File:** `packages/engine/src/lib/ui/stores/season.ts`

Port from `landing/src/lib/stores/season.ts` with:
- `subscribe`, `cycle()`, `setSeason()`, `getCurrent()`
- localStorage persistence with `grove-season` key
- Default to autumn

#### 1.4 Create stores/index.ts
**File:** `packages/engine/src/lib/ui/stores/index.ts`

Export `seasonStore` (and existing `themeStore` if applicable).

### Phase 2: Create Chrome Components

#### 2.1 ThemeToggle.svelte
**File:** `packages/engine/src/lib/ui/components/chrome/ThemeToggle.svelte`

Simple toggle with Sun/Moon icons, uses engine's theme store.

#### 2.2 MobileMenu.svelte
**File:** `packages/engine/src/lib/ui/components/chrome/MobileMenu.svelte`

Port from `landing/src/lib/components/MobileMenu.svelte`:
- Props: `open`, `onClose`, `navItems?` (defaults to DEFAULT_MOBILE_NAV_ITEMS)
- Slots: `header`, `footer` for customization
- Focus trap, escape key handling

#### 2.3 Header.svelte (Full)
**File:** `packages/engine/src/lib/ui/components/chrome/Header.svelte`

Port from `landing/src/lib/components/Header.svelte`:
- Props: `navItems?`, `maxWidth?`, `brandTitle?`, `season?`, `onSeasonChange?`
- Slots: `navigation`, `actions`, `beforeNav`, `afterNav`
- Uses DEFAULT_NAV_ITEMS as default
- Integrates MobileMenu internally
- Glassmorphism: `sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-default`

#### 2.4 HeaderMinimal.svelte
**File:** `packages/engine/src/lib/ui/components/chrome/HeaderMinimal.svelte`

Port from `clearing/src/lib/components/Header.svelte`:
- Props: `brandTitle?`, `subtitle?`, `maxWidth?`
- Slots: `actions` for custom buttons (RSS, etc.)
- Simpler structure: logo + text left, actions right

#### 2.5 Footer.svelte (Full)
**File:** `packages/engine/src/lib/ui/components/chrome/Footer.svelte`

Port from `landing/src/lib/components/Footer.svelte`:
- 3-column grid: Brand, Resources, Connect
- Props: `resourceLinks?`, `connectLinks?`, `legalLinks?`, `season?`
- Slots: `brandSection`, `bottomBar`
- Includes ThemeToggle in bottom bar

#### 2.6 FooterMinimal.svelte
**File:** `packages/engine/src/lib/ui/components/chrome/FooterMinimal.svelte`

Port from `clearing/src/lib/components/Footer.svelte`:
- Props: `links?`, `tagline?`, `maxWidth?`
- Centered simple layout

#### 2.7 Create chrome/index.ts
**File:** `packages/engine/src/lib/ui/components/chrome/index.ts`

Export all components, types, defaults, and re-export Logo from nature.

### Phase 3: Update Package Exports

**File:** `packages/engine/package.json`

Add exports:
```json
"./ui/chrome": {
  "types": "./dist/ui/components/chrome/index.d.ts",
  "svelte": "./dist/ui/components/chrome/index.js",
  "default": "./dist/ui/components/chrome/index.js"
},
"./ui/stores": {
  "types": "./dist/ui/stores/index.d.ts",
  "default": "./dist/ui/stores/index.js"
}
```

### Phase 4: Migrate Apps

#### 4.1 Migrate Landing
- Update `landing/src/routes/+layout.svelte` to import from `@autumnsgrove/groveengine/ui/chrome`
- Delete local components: Header, Footer, MobileMenu, ThemeToggle, Logo
- Update `landing/src/lib/stores/season.ts` to re-export from engine or delete

#### 4.2 Migrate Meadow
Same as Landing (components are identical).

#### 4.3 Migrate Clearing
- Import HeaderMinimal, FooterMinimal from engine
- Keep custom actions (RSS button) via snippet slot
- Delete local Header.svelte, Footer.svelte

### Phase 5: Build & Test
- Run `pnpm run package` in engine
- Test each app locally with `pnpm dev`
- Verify all navigation, theme toggle, season cycling works

---

## Critical Files to Modify

**Create (new files):**
- `packages/engine/src/lib/ui/components/chrome/types.ts`
- `packages/engine/src/lib/ui/components/chrome/defaults.ts`
- `packages/engine/src/lib/ui/components/chrome/Header.svelte`
- `packages/engine/src/lib/ui/components/chrome/HeaderMinimal.svelte`
- `packages/engine/src/lib/ui/components/chrome/Footer.svelte`
- `packages/engine/src/lib/ui/components/chrome/FooterMinimal.svelte`
- `packages/engine/src/lib/ui/components/chrome/MobileMenu.svelte`
- `packages/engine/src/lib/ui/components/chrome/ThemeToggle.svelte`
- `packages/engine/src/lib/ui/components/chrome/index.ts`
- `packages/engine/src/lib/ui/stores/season.ts`
- `packages/engine/src/lib/ui/stores/index.ts`

**Modify:**
- `packages/engine/package.json` - add exports

**Source templates (copy from):**
- `landing/src/lib/components/Header.svelte` (111 lines)
- `landing/src/lib/components/Footer.svelte` (167 lines)
- `landing/src/lib/components/MobileMenu.svelte`
- `landing/src/lib/components/ThemeToggle.svelte`
- `landing/src/lib/stores/season.ts` (80 lines)
- `clearing/src/lib/components/Header.svelte` (65 lines - minimal variant)
- `clearing/src/lib/components/Footer.svelte` (60 lines - minimal variant)

**Delete after migration:**
- `landing/src/lib/components/Header.svelte`
- `landing/src/lib/components/Footer.svelte`
- `landing/src/lib/components/MobileMenu.svelte`
- `landing/src/lib/components/ThemeToggle.svelte`
- `meadow/src/lib/components/Header.svelte`
- `meadow/src/lib/components/Footer.svelte`
- `meadow/src/lib/components/MobileMenu.svelte`
- `meadow/src/lib/components/ThemeToggle.svelte`
- `clearing/src/lib/components/Header.svelte`
- `clearing/src/lib/components/Footer.svelte`

---

## Component API Summary

### Header
```svelte
<Header
  navItems={customItems}       <!-- optional, defaults to Grove nav -->
  maxWidth="default"
  season={$seasonStore}
  onSeasonChange={() => seasonStore.cycle()}
>
  {#snippet actions()}
    <CustomButton />
  {/snippet}
</Header>
```

### Footer
```svelte
<Footer
  season={$seasonStore}
  resourceLinks={customLinks}  <!-- optional override -->
/>
```

### Consumer Usage (after migration)
```svelte
<script>
  import { Header, Footer, seasonStore } from '@autumnsgrove/groveengine/ui/chrome';
</script>

<Header season={$seasonStore} onSeasonChange={() => seasonStore.cycle()} />
<slot />
<Footer season={$seasonStore} />
```
