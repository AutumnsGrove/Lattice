---
title: "Vineyard Developer Guide"
description: "Shared Svelte 5 component library for building /vineyard showcase pages across Grove properties."
category: guides
guideCategory: design
lastUpdated: "2026-03-12"
aliases: []
tags:
  - vineyard
  - showcase
  - component-library
  - svelte
  - design
---

# Vineyard Developer Guide

Vineyard is the component library that powers Grove's `/vineyard` routes. Every Grove tool gets a showcase page at its own subdomain (`amber.grove.place/vineyard`, `ivy.grove.place/vineyard`, and so on), and they all share the same building blocks. The library lives at `libs/vineyard/` as `@autumnsgrove/vineyard`, a standalone Svelte 5 package with zero dependencies on the engine.

This guide covers the components, the auth integration, build conventions, and the patterns for assembling a showcase page.

## How It Works

Vineyard is a pure component library. It ships through `svelte-package` (not `vite build`) and exports two subpaths:

| Export path | What it contains |
|---|---|
| `@autumnsgrove/vineyard` | All components, types, and auth utilities |
| `@autumnsgrove/vineyard/vineyard` | Components and types only (narrower import) |

The root export re-exports everything: components from `src/lib/components/vineyard/index.ts`, types from `src/lib/types/index.ts`, and auth utilities from `src/lib/auth/index.ts`.

### The Component Set

Nine components make up the library. Seven are display components, two handle authentication.

| Component | Purpose |
|---|---|
| `VineyardLayout` | Full-page wrapper with hero, content area, and "related tools" footer |
| `FeatureCard` | Glassmorphic card for showcasing a single feature with optional demo slot |
| `StatusBadge` | Pill badge indicating maturity: ready, preview, demo, coming-soon, in-development |
| `DemoContainer` | Bordered container for interactive demos, with optional "Mock Data" indicator |
| `CodeExample` | Dark-themed code block with copy-to-clipboard and language label |
| `TierGate` | Conditionally renders content based on the Wanderer's tier level |
| `RoadmapSection` | Three-column display of built, in-progress, and planned features |
| `AuthButton` | OAuth sign-in/sign-out button wired to Better Auth |
| `UserMenu` | Avatar dropdown with session info and sign-out action |

### Types

All prop interfaces and union types live in `src/lib/types/index.ts`. The key types:

- `VineyardStatus` = `"ready" | "preview" | "demo" | "coming-soon" | "in-development"`
- `GroveTool` = `"amber" | "ivy" | "foliage" | "meadow" | "rings" | "trails" | "heartwood" | "forage"`
- `GroveTier` = `"seedling" | "sapling" | "oak" | "grove"`

Each component has a matching props interface (`VineyardLayoutProps`, `FeatureCardProps`, etc.), plus the auth types: `BetterAuthUser`, `BetterAuthSession`, `BetterAuthSessionResponse`, `BetterAuthProvider`.

## Building a Showcase Page

A typical `/vineyard` page follows this structure:

```svelte
<script lang="ts">
  import {
    VineyardLayout,
    FeatureCard,
    DemoContainer,
    CodeExample,
    RoadmapSection,
    AuthButton
  } from '@autumnsgrove/vineyard';
</script>

<VineyardLayout tool="amber" tagline="Your files, preserved" status="preview">
  <section>
    <FeatureCard
      title="Storage Overview"
      description="See usage across posts and media"
      status="ready"
      icon="HardDrive"
    />

    <DemoContainer title="Upload Demo" mockData={true}>
      <p>Interactive demo goes here</p>
    </DemoContainer>

    <CodeExample language="typescript" filename="src/routes/+page.ts">
      {`const files = await amber.listFiles();`}
    </CodeExample>
  </section>

  <RoadmapSection
    built={['Core storage view', 'Usage breakdown']}
    inProgress={['Export functionality']}
    planned={['Bulk delete', 'Storage alerts']}
  />
</VineyardLayout>
```

### VineyardLayout

The layout component structures the entire page into three zones:

1. **Hero** at the top, with the tool name (auto-capitalized from the `tool` prop), the tagline, a `StatusBadge`, and a philosophy quote pulled from an internal `toolPhilosophies` map.
2. **Content area** in the middle, capped at `72rem` wide, where your page content renders via the `children` snippet.
3. **Footer** with a "Works well with" section. Related tools are determined by an internal `relatedTools` map (e.g., Amber links to Ivy and Meadow). Each link points to `https://{tool}.grove.place/vineyard`.

The layout sets `font-family: "Lexend"` and uses CSS custom properties throughout (`--color-background`, `--color-surface`, `--color-primary`, etc.). If your app provides these properties through Prism or Foliage, the layout picks them up automatically. If not, it falls back to sensible defaults.

### FeatureCard

Cards accept `title`, `description`, `status`, and an optional `icon` string. The icon string maps to a pre-imported set of Lucide icons:

```
HardDrive, Layout, CreditCard, Sparkles, Code,
Lock, Map, FolderOpen, Download, Palette, Search
```

This explicit icon map is intentional. Importing all of `@lucide/svelte` dynamically would bundle 1000+ icons (~300KB). If you need an icon that is not in the map, add it to the `iconMap` in `FeatureCard.svelte` and import it from `@lucide/svelte`.

Cards also accept an optional `demo` snippet. When provided, it renders below the description with a divider:

```svelte
<FeatureCard title="Theme Picker" description="Try themes" status="demo" icon="Palette">
  {#snippet demo()}
    <ThemePicker themes={sampleThemes} />
  {/snippet}
</FeatureCard>
```

### StatusBadge

A standalone pill badge. Each status has distinct styling:

| Status | Visual |
|---|---|
| `ready` | Solid green, white text, subtle shadow |
| `preview` | Transparent with dashed yellow/amber border |
| `demo` | Solid blue, white text |
| `coming-soon` | Gray background, muted text, thin border |
| `in-development` | Solid orange, white text, pulsing animation |

The pulsing animation on `in-development` respects `prefers-reduced-motion`.

### DemoContainer

Wraps interactive demo content with a header bar. Set `mockData={true}` to show a blinking "Mock Data" indicator in blue and add a dashed border overlay to the content area. The header displays a flask icon and the demo title.

### CodeExample

A dark-themed code block (`#1c1917` background) with a header showing the filename, a language badge, and a copy button. The copy button uses `navigator.clipboard.writeText()` and shows a "Copied!" confirmation for 2 seconds. If clipboard access fails, it shows "Copy failed" for 3 seconds.

The component maps common language keys to display labels (e.g., `"ts"` becomes `"TypeScript"`, `"bash"` becomes `"Bash"`). Unknown languages render as-is.

Code content goes in as children. There is no built-in syntax highlighting beyond CSS class hooks (`.keyword`, `.string`, `.comment`, `.function`). If you need richer highlighting, wrap your code in spans with those classes, or integrate a highlighter upstream.

### TierGate

Compares `required` and `current` tier values using a numeric mapping: seedling=0, sapling=1, oak=2, grove=3. If `current >= required`, the children render normally. Otherwise, it shows either a custom `fallback` snippet or a default lock screen with an "Upgrade to {tier}" link pointing to `/upgrade`.

The `showPreview` prop (boolean, defaults to `false`) is notable. When true, TierGate still renders the gated content but applies `filter: blur(4px)`, `opacity: 0.5`, and `pointer-events: none`, with the fallback overlay positioned on top. This lets Wanderers see a blurred preview of what they would unlock.

```svelte
<TierGate required="oak" current="sapling" showPreview={true}>
  <AdvancedFeatureDemo />
  {#snippet fallback()}
    <p>Upgrade to Oak for advanced analytics</p>
  {/snippet}
</TierGate>
```

### RoadmapSection

Takes three string arrays: `built`, `inProgress`, and `planned`. Each group renders as a card with a colored header icon (green check, orange arrow, gray circle) and a count badge. Empty groups are hidden automatically.

On viewports 768px and wider, the three groups display side-by-side in a row. On mobile, they stack vertically.

## Auth Integration

Vineyard includes a lightweight Better Auth client. The auth utilities live in `src/lib/auth/index.ts` and talk to `https://login.grove.place`, the canonical auth hub.

### Four exported functions

**`signIn(provider?, callbackURL?)`** redirects the browser to the Better Auth OAuth flow. Defaults to Google. Validates the provider at runtime and throws on invalid values (defense against open-redirect attacks). Browser-only.

**`signOut(redirectTo?)`** POSTs to the sign-out endpoint, then redirects regardless of whether the server responded. This is intentional: if the auth server is down, the Wanderer still gets logged out locally. Defaults to redirecting to `/`.

**`getSession()`** fetches the current session via `credentials: "include"` for cross-origin cookies. Returns `{ user, session }` on success, or `{ user: null, session: null }` on any failure. Never throws.

**`isAuthenticated()`** is a convenience wrapper around `getSession()`. Returns a boolean.

### AuthButton

Fetches session state on mount (via `$effect` with a `sessionFetched` guard to run once), then renders as either a sign-in button (amber gradient) or sign-out button (red gradient). Disabled with a spinner while loading.

### UserMenu

Similar mount-time session fetch. Renders nothing if unauthenticated. When authenticated, shows a pill-shaped trigger with avatar, name, and email, plus a dropdown with sign-out. Closes on outside click via a window-level event listener that checks `closest('.user-menu-container')`.

## Adding or Modifying

### Adding a new component

1. Create the `.svelte` file in `src/lib/components/vineyard/`.
2. Add its props interface to `src/lib/types/index.ts`.
3. Export the component and types from `src/lib/components/vineyard/index.ts`.
4. The root `src/lib/index.ts` re-exports everything, so no changes needed there.
5. Run the build: `svelte-kit sync && svelte-package`.

### Adding a new Lucide icon to FeatureCard

Add the import to the `import { ... } from '@lucide/svelte'` block in `FeatureCard.svelte` and add the entry to the `iconMap` Record. That is all.

### Adding a new OAuth provider

1. Add the provider name to the `BetterAuthProvider` union in `src/lib/types/index.ts`.
2. Add it to the `validProviders` array in `src/lib/auth/index.ts`.
3. The auth server at `login.grove.place` must also support the provider, or the redirect will fail.

### Adding a new Grove tool

Add the tool name to the `GroveTool` union in `src/lib/types/index.ts`. Then add entries to both the `toolPhilosophies` and `relatedTools` maps in `VineyardLayout.svelte`. TypeScript will flag missing entries if you forget.

## Why It Breaks

**"Cannot find module @autumnsgrove/vineyard"** after changing components. You need to rebuild. Run `svelte-kit sync && svelte-package`. The `dist/` directory is what consumers resolve against. Source changes do not propagate until you rebuild.

**Prettier fails in CI.** The `.prettierignore` must exclude `dist`, `.svelte-kit`, and `node_modules`. Generated files in those directories will fail formatting checks. If a new generated directory appears, add it to `.prettierignore`.

**Icon renders as nothing.** The `icon` prop on `FeatureCard` maps to an explicit `iconMap`. If the string you pass does not match a key in that map, `IconComponent` resolves to `null` and no icon renders. Check the map in `FeatureCard.svelte` for valid keys.

**TierGate always shows content.** The tier comparison uses a numeric hierarchy. If `current` is equal to or higher than `required`, children render unconditionally. Double-check that you are passing the correct `current` tier, not a hardcoded value.

**Auth calls throw "can only be called in the browser."** `signIn()` and `signOut()` check for `typeof window === "undefined"` and throw if called during SSR. Call them only from event handlers or `$effect` blocks, never from module-level or server-side code.

**Copy button does nothing.** `navigator.clipboard.writeText()` requires a secure context (HTTPS or localhost). On HTTP, the call silently fails and the button shows "Copy failed" for 3 seconds.

## Architecture Notes

Vineyard is deliberately standalone. It depends only on `svelte` (peer dependency, ^5.0.0) and `@lucide/svelte` (direct dependency). It does not depend on the engine, Prism, Foliage, or any other Grove package. This means any Grove app can use it without pulling in the full monorepo dependency graph.

The spec originally proposed housing these components inside the engine at `libs/engine/src/lib/ui/components/vineyard/`. The actual implementation chose a separate `libs/vineyard/` package instead. This was the right call: it keeps the engine's bundle size down and lets vineyard pages work in apps that do not use the engine at all.

CSS custom properties provide theming. The components reference variables like `--color-surface`, `--color-primary`, `--color-border-subtle`, and fall back to hardcoded values (warm stone tones, green accents). Any consuming app that sets these properties through Prism or its own theme system gets consistent styling for free.

All components respect `prefers-reduced-motion: reduce` by disabling CSS transitions and animations. The StatusBadge pulse, FeatureCard hover lift, DemoContainer mock-dot blink, RoadmapSection progress-dot pulse, and AuthButton/UserMenu transforms all turn off under reduced motion.

The build uses `svelte-package` specifically because Vineyard is a library, not an application. Running `vite build` would produce an app bundle. `svelte-package` processes `src/lib/` and outputs to `dist/` with proper Svelte component resolution and TypeScript declarations.

## Key Files

| Path | Purpose |
|---|---|
| `libs/vineyard/package.json` | Exports map, build scripts, dependencies |
| `libs/vineyard/src/lib/index.ts` | Root barrel re-exporting components and types |
| `libs/vineyard/src/lib/components/vineyard/index.ts` | Component barrel with auth re-exports |
| `libs/vineyard/src/lib/types/index.ts` | All prop interfaces, status/tool/tier unions, auth types |
| `libs/vineyard/src/lib/auth/index.ts` | Better Auth client (signIn, signOut, getSession, isAuthenticated) |
| `libs/vineyard/src/lib/auth/index.test.ts` | Auth tests (provider validation, error resilience, logout completion) |
| `libs/vineyard/src/lib/components/vineyard/VineyardLayout.svelte` | Page layout with hero, content, and related-tools footer |
| `libs/vineyard/src/lib/components/vineyard/FeatureCard.svelte` | Feature showcase card with icon map and demo snippet |
| `libs/vineyard/src/lib/components/vineyard/TierGate.svelte` | Tier-based access control with optional blurred preview |
| `libs/vineyard/src/lib/components/vineyard/CodeExample.svelte` | Code block with clipboard copy |
| `libs/vineyard/.prettierignore` | Excludes dist, .svelte-kit, node_modules from formatting |
| `docs/specs/vineyard-spec.md` | Original spec (URL patterns, content strategy, design guidelines) |

## Checklist

When building a new `/vineyard` route for a Grove tool:

- [ ] Install `@autumnsgrove/vineyard` as a workspace dependency
- [ ] Create `src/routes/vineyard/+page.svelte` in your app
- [ ] Wrap content in `VineyardLayout` with the correct `tool`, `tagline`, and `status`
- [ ] Use `FeatureCard` for each feature, with honest status badges
- [ ] Wrap interactive demos in `DemoContainer` (set `mockData` when using fake data)
- [ ] Add `CodeExample` blocks for integration snippets
- [ ] Include a `RoadmapSection` with current progress
- [ ] Add `AuthButton` or `UserMenu` if the page has authenticated content
- [ ] Gate tier-restricted features with `TierGate`, passing the real Wanderer tier
- [ ] If you added new icons, update the `iconMap` in `FeatureCard.svelte` and rebuild
- [ ] Run `svelte-kit sync && svelte-package` in `libs/vineyard/` after any component changes
- [ ] Confirm `.prettierignore` covers generated directories before running `prettier --check`
