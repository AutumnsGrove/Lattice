---
title: Component Reference
description: Complete catalog of Grove's 204 UI components
category: design
lastUpdated: '2026-01-25'
---
# Component Reference

> 204 components organized by category, ready to help you build something beautiful.
> Import from `@autumnsgrove/groveengine/ui` and its subpaths.

This is your field guide to Grove's component library. Each component is designed to feel warm, organic, and genuinely helpful—like a good friend who happens to know exactly what you need.

---

## Quick Links

- [Import Patterns](#import-patterns)
- [ui/ - Core UI Components](#ui---core-ui-components-42)
- [primitives/ - Headless Primitives](#primitives---headless-primitives-45)
- [nature/ - Decorative Nature](#nature---decorative-nature-65)
- [typography/ - Font Providers](#typography---font-providers-11)
- [chrome/ - Layout Shell](#chrome---layout-shell-7)
- [terrarium/ - Canvas Editor](#terrarium---canvas-editor-7)
- [charts/ - Data Visualization](#charts---data-visualization-4)
- [content/ - Content Display](#content---content-display-6)
- [gallery/ - Image Galleries](#gallery---image-galleries-4)
- [states/ - Loading & Empty States](#states---loading--empty-states-4)
- [forms/ - Search & Input](#forms---search--input-3)
- [indicators/ - Status & Progress](#indicators---status--progress-3)
- [icons/ - Icon Components](#icons---icon-components-2)

---

## Import Patterns

Grove components can be imported in two ways—choose what feels natural for your use case.

### Category Import (Recommended)

Import from specific subpaths when you need several components from the same family:

```svelte
<script>
  // Glass UI components
  import { GlassCard, GlassButton, Dialog } from '@autumnsgrove/groveengine/ui';

  // Nature elements for forest scenes
  import { TreePine, Cardinal, Cloud } from '@autumnsgrove/groveengine/ui/nature';

  // Layout chrome
  import { Header, Footer, ThemeToggle } from '@autumnsgrove/groveengine/ui/chrome';

  // Wrapper components (simplified APIs over primitives)
  import { Accordion, Select, Tabs, Sheet } from '@autumnsgrove/groveengine/ui';
</script>
```

### Available Import Paths

| Path | What's Inside |
|------|---------------|
| `@autumnsgrove/groveengine/ui` | Core UI: Glass components, Button, Card, Dialog, etc. |
| `@autumnsgrove/groveengine/ui/nature` | Trees, creatures, sky, weather, botanical elements |
| `@autumnsgrove/groveengine/ui/chrome` | Header, Footer, MobileMenu, ThemeToggle |
| `@autumnsgrove/groveengine/ui/typography` | Font provider components |
| `@autumnsgrove/groveengine/ui/states` | Loading, EmptyState, skeletons |
| `@autumnsgrove/groveengine/ui/forms` | SearchInput, ContentSearch, filter utilities |
| `@autumnsgrove/groveengine/ui/charts` | Data visualization components |
| `@autumnsgrove/groveengine/ui/content` | ProductCard, SearchCard, PlanCard |
| `@autumnsgrove/groveengine/ui/gallery` | ImageGallery, Lightbox, ZoomableImage |
| `@autumnsgrove/groveengine/ui/indicators` | StatusBadge, ScoreBar, CreditBalance |
| `@autumnsgrove/groveengine/ui/icons` | Icon components and Lucide icon registries |
| `@autumnsgrove/groveengine/ui/terrarium` | Canvas editor for nature scene composition |
| `@autumnsgrove/groveengine/ui/utils` | Utilities like `cn()` for class merging |
| `@autumnsgrove/groveengine/ui/stores` | `seasonStore`, `themeStore` for reactive state |

---

## ui/ - Core UI Components (42)

The heart of Grove's visual language. These components implement our glassmorphism design system—translucent surfaces with gentle blur that let the forest peek through.

### Glass Suite

The Glass components are Grove's signature. They create that frosted-glass effect you see throughout the platform, with warmth maintained even in dark mode (think "nature at night," not harsh inverting).

#### GlassCard

Beautiful translucent cards with backdrop blur. Your go-to for content containers.

```svelte
<script>
  import { GlassCard } from '@autumnsgrove/groveengine/ui';
</script>

<!-- Basic card with title and description -->
<GlassCard title="Welcome Home" description="You've found your space on the web.">
  <p>Your content lives here, cozy and warm.</p>
</GlassCard>

<!-- Hoverable card with footer action -->
<GlassCard variant="accent" hoverable>
  {#snippet header()}
    <h3>Custom Header</h3>
  {/snippet}

  <p>Main content area</p>

  {#snippet footer()}
    <button>Take Action</button>
  {/snippet}
</GlassCard>

<!-- With animated ASCII background (Gossamer) -->
<GlassCard title="Enchanted" gossamer="grove-mist" gossamerColor="#34d399">
  <p>Subtle ASCII clouds drift beneath the glass</p>
</GlassCard>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'accent' \| 'dark' \| 'muted' \| 'frosted'` | `'default'` | Visual style |
| `title` | `string` | - | Card title |
| `description` | `string` | - | Subtitle text |
| `hoverable` | `boolean` | `false` | Add hover effects |
| `border` | `boolean` | `true` | Show border |
| `gossamer` | `string \| GossamerConfig \| false` | `false` | ASCII background preset |
| `gossamerColor` | `string` | - | Override Gossamer color |

**Gossamer Presets:** `grove-mist`, `grove-fireflies`, `grove-rain`, `grove-dew`, `winter-snow`, `autumn-leaves`, `spring-petals`, `summer-heat`, `ambient-static`, `ambient-waves`, `ambient-clouds`

#### GlassButton

Translucent buttons that feel substantial yet light.

```svelte
<script>
  import { GlassButton } from '@autumnsgrove/groveengine/ui';
  import { X } from 'lucide-svelte';
</script>

<!-- Basic button -->
<GlassButton>Click me</GlassButton>

<!-- Accent button (CTAs, primary actions) -->
<GlassButton variant="accent">Subscribe</GlassButton>

<!-- Link styled as button -->
<GlassButton href="/about" variant="outline">Learn More</GlassButton>

<!-- Icon button -->
<GlassButton variant="ghost" size="icon">
  <X class="w-4 h-4" />
</GlassButton>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'accent' \| 'dark' \| 'ghost' \| 'outline'` | `'default'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg' \| 'icon'` | `'md'` | Button size |
| `href` | `string` | - | Renders as anchor tag |
| `disabled` | `boolean` | `false` | Disable interaction |

#### GlassConfirmDialog

For moments that need a pause—destructive actions, important decisions.

```svelte
<script>
  import { GlassConfirmDialog } from '@autumnsgrove/groveengine/ui';

  let showDeleteDialog = $state(false);

  async function handleDelete() {
    await deletePost();
  }
</script>

<GlassConfirmDialog
  bind:open={showDeleteDialog}
  title="Delete Post"
  message="This cannot be undone. Your words will be gone."
  confirmLabel="Delete"
  variant="danger"
  onconfirm={handleDelete}
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Bindable open state |
| `title` | `string` | required | Dialog title |
| `message` | `string` | - | Body message |
| `variant` | `'default' \| 'danger' \| 'warning'` | `'default'` | Affects icon and styling |
| `confirmLabel` | `string` | `'Confirm'` | Confirm button text |
| `cancelLabel` | `string` | `'Cancel'` | Cancel button text |
| `loading` | `boolean` | `false` | Show loading state |
| `onconfirm` | `() => void \| Promise<void>` | - | Confirm callback |
| `oncancel` | `() => void` | - | Cancel callback |

### Other Glass Components

| Component | Description |
|-----------|-------------|
| `Glass` | Base glassmorphism container—use for custom glass effects |
| `GlassNavbar` | Navigation bar with glass styling |
| `GlassOverlay` | Full-screen glass overlay for modals |
| `GlassCarousel` | Image carousel with glass controls |
| `GlassLegend` | Legend/key component with glass background |
| `GlassLogo` | Logo with glass container |
| `GlassLogoArchive` | Archived logo variant |
| `GlassStatusWidget` | Real-time status widget with auto-refresh—displays system health from The Clearing |

### Beta Program Components

Components for beta tester onboarding, status display, and program enrollment. Reusable for any future beta programs.

| Component | Description |
|-----------|-------------|
| `BetaBadge` | Inline pill badge with flask icon indicating beta program membership |
| `BetaWelcomeDialog` | One-time welcome dialog for beta users with feedback link and warm messaging |

### Standard Components

These wrap the primitives with Grove styling, ready to use out of the box.

| Component | Description |
|-----------|-------------|
| `Button` | Standard button with variants |
| `Card` | Content card container |
| `Badge` | Small status indicators |
| `FeatureStar` | Inline star indicator for key/featured items |
| `Dialog` | Modal dialog wrapper |
| `Input` | Text input field |
| `Textarea` | Multi-line text input |
| `Select` | Dropdown select |
| `Tabs` | Tabbed interface |
| `Accordion` | Collapsible content sections |
| `Sheet` | Slide-out panel |
| `Toast` | Notification toasts |
| `Table` | Data tables (with sub-components) |
| `Skeleton` | Loading placeholder |
| `Spinner` | Loading spinner |
| `CollapsibleSection` | Expandable section |
| `Logo` | Grove tree logo (new design) |
| `LogoLoader` | Logo with loading animation |
| `LogoArchive` | Original asterisk logo |

---

## primitives/ - Headless Primitives (45)

Built on [bits-ui](https://bits-ui.com), primitives are unstyled, accessible building blocks that power Grove's wrapper components. The primitives themselves are internal—you'll use the simplified wrapper components exported from `@autumnsgrove/groveengine/ui`.

### Wrapper Components

Grove provides wrapper components with sensible defaults and Grove styling. Import these from the main UI path:

```svelte
<script>
  import { Accordion, Dialog, Select, Sheet, Tabs, Table } from '@autumnsgrove/groveengine/ui';
</script>
```

### Accordion

```svelte
<script>
  import { Accordion } from '@autumnsgrove/groveengine/ui';
</script>

<Accordion items={[
  { value: 'intro', title: 'What is Grove?', content: 'A cozy corner of the web.' },
  { value: 'features', title: 'Features', content: 'Markdown editing, themes, and more.' }
]} />
```

### Select

```svelte
<script>
  import { Select } from '@autumnsgrove/groveengine/ui';

  let season = $state('autumn');
</script>

<Select
  bind:value={season}
  options={[
    { value: 'spring', label: 'Spring' },
    { value: 'summer', label: 'Summer' },
    { value: 'autumn', label: 'Autumn' },
    { value: 'winter', label: 'Winter' }
  ]}
  placeholder="Choose a season"
/>
```

### Dialog

```svelte
<script>
  import { Dialog } from '@autumnsgrove/groveengine/ui';

  let open = $state(false);
</script>

<Dialog bind:open title="Settings" description="Make this space yours.">
  <!-- form content -->
  <button onclick={() => open = false}>Save</button>
</Dialog>
```

### Sheet

Slide-out panels from any edge.

```svelte
<script>
  import { Sheet } from '@autumnsgrove/groveengine/ui';

  let open = $state(false);
</script>

<Sheet bind:open side="left" title="Navigation">
  <!-- menu items -->
</Sheet>
```

### Tabs

```svelte
<script>
  import { Tabs } from '@autumnsgrove/groveengine/ui';
</script>

<Tabs
  defaultValue="posts"
  tabs={[
    { value: 'posts', label: 'Posts', content: 'Published content' },
    { value: 'drafts', label: 'Drafts', content: 'Work in progress' }
  ]}
/>
```

### Table

Table subcomponents are exported for flexible table composition:

```svelte
<script>
  import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell
  } from '@autumnsgrove/groveengine/ui';
</script>

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Title</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>My First Post</TableCell>
      <TableCell>Published</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Available Wrapper Components

| Component | What It Wraps | Exported From |
|-----------|---------------|---------------|
| `Accordion` | Collapsible content panels | `@autumnsgrove/groveengine/ui` |
| `Dialog` | Modal dialogs | `@autumnsgrove/groveengine/ui` |
| `Select` | Dropdown selection | `@autumnsgrove/groveengine/ui` |
| `Sheet` | Slide-out panels | `@autumnsgrove/groveengine/ui` |
| `Tabs` | Tabbed content | `@autumnsgrove/groveengine/ui` |
| `Table` + subcomponents | Data tables | `@autumnsgrove/groveengine/ui` |
| `Input` | Text input | `@autumnsgrove/groveengine/ui` |
| `Textarea` | Multi-line input | `@autumnsgrove/groveengine/ui` |
| `Badge` | Labels and tags | `@autumnsgrove/groveengine/ui` |
| `Skeleton` | Loading placeholders | `@autumnsgrove/groveengine/ui` |

---

## nature/ - Decorative Nature (65)

This is where Grove comes alive. These SVG components create atmospheric forest scenes that respond to seasons and bring warmth to every page.

### Season Support

Most nature components accept a `season` prop that adapts their appearance:
- **spring** - Fresh yellow-greens, cherry blossoms at peak bloom
- **summer** - Lush greens, full foliage
- **autumn** - Warm oranges, golds, and russet tones (default)
- **winter** - Frosted evergreens, snow accents, bare deciduous trees
- **midnight** - Special deep plum and amber palette

**Season prop vs seasonStore:** Components automatically subscribe to `seasonStore` for their default season. The `season` prop is an *override*—use it when you want a component to stay fixed regardless of the global season. Internally, components use: `const activeSeason = $derived(season ?? $seasonStore)`.

```svelte
<script>
  import { TreePine } from '@autumnsgrove/groveengine/ui/nature';
  import { seasonStore } from '@autumnsgrove/groveengine/ui/stores';
</script>

<!-- This tree follows the global season -->
<TreePine />

<!-- This tree is always wintery, even in summer -->
<TreePine season="winter" />

<!-- Change the global season for all components -->
<button onclick={() => seasonStore.set('spring')}>
  Switch to Spring
</button>
```

### Trees (4)

```svelte
<script>
  import { TreePine, TreeAspen, TreeBirch, TreeCherry } from '@autumnsgrove/groveengine/ui/nature';
</script>

<!-- Evergreen pine with snow in winter -->
<TreePine season="winter" class="w-16 h-20" animate />

<!-- Golden aspen in autumn -->
<TreeAspen season="autumn" class="w-12 h-16" />

<!-- White-barked birch -->
<TreeBirch season="summer" class="w-14 h-18" />

<!-- Cherry with pink blossoms (or red in autumn) -->
<TreeCherry season="spring" class="w-16 h-20" animate />
```

**Common Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `class` | `string` | `'w-6 h-6'` | Size classes |
| `season` | `Season` | `'summer'` | Seasonal appearance |
| `animate` | `boolean` | `false` | Enable gentle sway animation |
| `color` | `string` | - | Override foliage color |
| `trunkColor` | `string` | - | Override trunk color |

### Creatures (13)

Forest friends that bring your scenes to life.

```svelte
<script>
  import { Cardinal, Robin, Owl, Deer, Firefly, Butterfly } from '@autumnsgrove/groveengine/ui/nature';
</script>

<!-- Northern Cardinal (perfect for winter scenes) -->
<Cardinal class="w-8 h-10" facing="right" animate />

<!-- American Robin (herald of spring!) -->
<Robin class="w-6 h-8" />

<!-- Wise owl for midnight modes -->
<Owl class="w-10 h-12" />

<!-- Graceful deer -->
<Deer class="w-12 h-14" />

<!-- Summer fireflies with glowing effect -->
<Firefly class="w-4 h-4" animate />

<!-- Fluttering butterfly -->
<Butterfly class="w-6 h-6" animate />
```

**All Creatures:** `Bee`, `Bird`, `BirdFlying`, `Bluebird`, `Butterfly`, `Cardinal`, `Chickadee`, `Deer`, `Firefly`, `Owl`, `Rabbit`, `Robin`, `Squirrel`

### Sky Elements (8)

```svelte
<script>
  import { Sun, Moon, Cloud, Star, Rainbow } from '@autumnsgrove/groveengine/ui/nature';
</script>

<Sun class="w-12 h-12" />
<Moon phase="crescent" class="w-8 h-8" />
<Cloud class="w-16 h-8" />
<Star class="w-4 h-4" twinkle />
<Rainbow class="w-24 h-12" />
```

**All Sky:** `Cloud`, `CloudWispy`, `Moon`, `Rainbow`, `Star`, `StarCluster`, `StarShooting`, `Sun`

### Ground Elements (12)

Forest floor details.

```svelte
<script>
  import { Mushroom, Fern, Rock, Bush, GrassTuft } from '@autumnsgrove/groveengine/ui/nature';
</script>

<Mushroom class="w-6 h-8" variant="red" />
<Fern class="w-8 h-10" />
<Rock class="w-10 h-6" />
<Bush class="w-12 h-10" season="autumn" />
<GrassTuft class="w-6 h-4" />
```

**All Ground:** `Bush`, `Crocus`, `Daffodil`, `Fern`, `FlowerWild`, `GrassTuft`, `Log`, `Mushroom`, `MushroomCluster`, `Rock`, `Stump`, `Tulip`

### Botanical Elements (10)

Leaves, petals, and organic details.

```svelte
<script>
  import { Leaf, FallingLeavesLayer, FallingPetalsLayer, Acorn } from '@autumnsgrove/groveengine/ui/nature';
</script>

<!-- Single leaf -->
<Leaf variant="maple" season="autumn" class="w-6 h-6" />

<!-- Animated falling leaves layer (requires tree data) -->
<FallingLeavesLayer
  {trees}
  season="autumn"
  minLeavesPerTree={2}
  maxLeavesPerTree={5}
/>

<!-- Cherry blossom petals -->
<FallingPetalsLayer {trees} season="spring" />

<!-- Acorn detail -->
<Acorn class="w-4 h-5" />
```

**All Botanical:** `Acorn`, `Berry`, `DandelionPuff`, `FallingLeavesLayer`, `FallingPetalsLayer`, `Leaf`, `LeafFalling`, `PetalFalling`, `PineCone`, `Vine`

### Water Elements (4)

```svelte
<script>
  import { Pond, LilyPad, Stream, Reeds } from '@autumnsgrove/groveengine/ui/nature';
</script>

<Pond class="w-24 h-16" />
<LilyPad class="w-6 h-4" />
<Stream class="w-full h-8" />
<Reeds class="w-8 h-12" />
```

### Weather Effects (3)

```svelte
<script>
  import { SnowfallLayer, Snowflake } from '@autumnsgrove/groveengine/ui/nature';
</script>

<!-- Full snowfall effect -->
<SnowfallLayer density="medium" />

<!-- Individual snowflake -->
<Snowflake class="w-4 h-4" />
```

**All Weather:** `SnowfallLayer`, `Snowflake`, `SnowflakeFalling`

### Structural Elements (8)

Garden structures and paths.

```svelte
<script>
  import { Birdhouse, Bridge, Lantern, Lattice, StonePath } from '@autumnsgrove/groveengine/ui/nature';
</script>

<Birdhouse class="w-8 h-10" />
<Bridge class="w-24 h-8" />
<Lantern class="w-6 h-10" lit />
<Lattice class="w-12 h-16" />
<StonePath class="w-20 h-6" />
```

**All Structural:** `Birdhouse`, `Bridge`, `FencePost`, `GardenGate`, `Lantern`, `Lattice`, `LatticeWithVine`, `StonePath`

### Color Palette

The nature module exports a comprehensive seasonal color system:

```typescript
import {
  greens,        // Forest greens from dark to pale
  bark,          // Tree trunk browns
  earth,         // Soil and stone tones
  autumn,        // Fall foliage colors
  winter,        // Snow, frost, and frosted greens
  flowers,       // Wildflower and cherry blossom colors
  accents,       // Creature colors, mushrooms, berries
  getSeasonalGreens,  // Helper for seasonal foliage
  getCherryColors,    // Helper for cherry tree colors
  type Season
} from '@autumnsgrove/groveengine/ui/nature';
```

### Other Nature Components

| Component | Description |
|-----------|-------------|
| `Logo` | The Grove tree logo (re-exported from ui/) |
| `LogoArchive` | Original asterisk logo with nature animations |
| `GroveDivider` | Decorative divider with alternating logos |

---

## typography/ - Font Providers (11)

Scoped font components that automatically load fonts and apply them to their children.

```svelte
<script>
  import { Lexend, Alagard, Caveat, IBMPlexMono } from '@autumnsgrove/groveengine/ui/typography';
</script>

<!-- Default font (used across all Grove) -->
<Lexend as="p">Clean, readable body text.</Lexend>

<!-- Fantasy headers -->
<Alagard as="h1" class="text-4xl">Once Upon a Time</Alagard>

<!-- Handwritten notes -->
<Caveat as="p" class="text-xl">A personal touch</Caveat>

<!-- Code and technical text -->
<IBMPlexMono as="code">const grove = 'home';</IBMPlexMono>
```

**All Fonts:**
| Component | Style | Use Case |
|-----------|-------|----------|
| `Lexend` | Sans-serif | Default body text |
| `Atkinson` | Sans-serif | Accessibility (high legibility) |
| `OpenDyslexic` | Sans-serif | Accessibility (dyslexia-friendly) |
| `Quicksand` | Sans-serif | Friendly, rounded headings |
| `PlusJakartaSans` | Sans-serif | Modern, professional |
| `IBMPlexMono` | Monospace | Code, technical content |
| `Cozette` | Monospace (pixel) | Retro terminal aesthetic |
| `Alagard` | Display | Fantasy, game-like headers |
| `Calistoga` | Display | Bold, warm headlines |
| `Caveat` | Handwritten | Personal notes, signatures |
| `FontProvider` | Dynamic | Programmatic font selection |

**Font Utilities:**
```typescript
import {
  fonts,           // Array of all font definitions
  fontById,        // Get font by ID
  getFontUrl,      // Get CDN URL for a font
  getFontsByCategory  // Filter fonts by category
} from '@autumnsgrove/groveengine/ui/typography';
```

---

## chrome/ - Layout Shell (7)

The scaffolding that holds every Grove page together.

```svelte
<script>
  import { Header, Footer, ThemeToggle, MobileMenu } from '@autumnsgrove/groveengine/ui/chrome';
  import { seasonStore, themeStore } from '@autumnsgrove/groveengine/ui/chrome';
</script>

<Header
  navItems={[
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog' },
    { label: 'About', href: '/about' }
  ]}
  maxWidth="default"
/>

<main>
  <!-- Page content -->
</main>

<Footer />
```

### Components

| Component | Description |
|-----------|-------------|
| `Header` | Sticky navigation with logo, nav links, theme toggle, mobile menu |
| `HeaderMinimal` | Simplified header for focused pages |
| `Footer` | Site footer with links |
| `FooterMinimal` | Compact footer |
| `MobileMenu` | Slide-out menu for mobile navigation |
| `ThemeToggle` | Light/dark mode toggle button |

### Stores

```typescript
import { seasonStore, themeStore } from '@autumnsgrove/groveengine/ui/stores';

// Season store
$seasonStore // Current season: 'spring' | 'summer' | 'autumn' | 'winter' | 'midnight'
seasonStore.cycle() // Advance to next season
seasonStore.set('autumn') // Set specific season

// Theme store
$themeStore // Current theme: 'light' | 'dark'
```

---

## terrarium/ - Canvas Editor (7)

A creative playground where users compose nature scenes by dragging and dropping components onto a canvas. These scenes become blog decorations.

```svelte
<script>
  import { Terrarium } from '@autumnsgrove/groveengine/ui/terrarium';
</script>

<Terrarium />
```

### Components

| Component | Description |
|-----------|-------------|
| `Terrarium` | Main canvas editor (all-in-one) |
| `Canvas` | The drawing surface |
| `AssetPalette` | Draggable asset picker |
| `PaletteItem` | Individual asset in palette |
| `PlacedAssetComponent` | Rendered asset on canvas |
| `Toolbar` | Canvas tools (select, pan, delete) |
| `ExportDialog` | Export scene as PNG |

### State & Utilities

```typescript
import {
  createTerrariumState,
  type TerrariumState,
  type TerrariumScene,
  type PlacedAsset,
  CANVAS_BACKGROUNDS,
  DEFAULT_SCENE,
  exportSceneAsPNG
} from '@autumnsgrove/groveengine/ui/terrarium';
```

---

## charts/ - Data Visualization (4)

Simple, warm charts for displaying data without overwhelming.

```svelte
<script>
  import { Sparkline, LOCBar, ActivityOverview, RepoBreakdown } from '@autumnsgrove/groveengine/ui/charts';
</script>

<!-- Mini trend line -->
<Sparkline data={[10, 15, 8, 22, 18]} />

<!-- Lines of code bar -->
<LOCBar languages={[
  { name: 'TypeScript', lines: 5000, color: '#3178c6' },
  { name: 'Svelte', lines: 3000, color: '#ff3e00' }
]} />

<!-- Activity heatmap -->
<ActivityOverview data={activityData} />

<!-- Repository breakdown -->
<RepoBreakdown repos={repoStats} />
```

---

## content/ - Content Display (6)

Cards for displaying structured content like products, plans, and search results.

```svelte
<script>
  import { ProductCard, PlanCard, SearchCard, RoadmapPreview } from '@autumnsgrove/groveengine/ui/content';
</script>

<ProductCard
  title="Grove Pro"
  description="Everything you need to grow"
  price="$9/month"
  features={['Custom domain', 'Advanced analytics', 'Priority support']}
/>

<PlanCard
  name="Seedling"
  price="Free"
  features={['Basic blog', 'Grove subdomain', 'Community support']}
  current
/>

<SearchCard
  title="Getting Started with Grove"
  excerpt="A gentle introduction to your new home..."
  href="/docs/getting-started"
/>

<RoadmapPreview items={roadmapItems} />
```

---

## gallery/ - Image Galleries (4)

Beautiful ways to display images.

```svelte
<script>
  import { ImageGallery, Lightbox, ZoomableImage } from '@autumnsgrove/groveengine/ui/gallery';
</script>

<!-- Grid gallery with lightbox -->
<ImageGallery
  images={[
    { src: '/photo1.jpg', alt: 'Forest morning' },
    { src: '/photo2.jpg', alt: 'Mountain stream' }
  ]}
/>

<!-- Standalone lightbox -->
<Lightbox bind:open={lightboxOpen} images={images} startIndex={0} />

<!-- Single zoomable image -->
<ZoomableImage src="/detailed-map.png" alt="Detailed trail map" />
```

| Component | Description |
|-----------|-------------|
| `ImageGallery` | Grid layout with optional lightbox |
| `Lightbox` | Full-screen image viewer with navigation |
| `LightboxCaption` | Caption component for lightbox |
| `ZoomableImage` | Single image with zoom capability |

---

## states/ - Loading & Empty States (4)

For those in-between moments.

```svelte
<script>
  import { Loading, LoadingSkeleton, EmptyState, ThemeToggle } from '@autumnsgrove/groveengine/ui/states';
</script>

<!-- Full loading state -->
<Loading message="Finding your posts..." />

<!-- Skeleton placeholder -->
<LoadingSkeleton lines={3} />

<!-- Empty state with action -->
<EmptyState
  icon="sparkles"
  title="No posts yet"
  description="Your story starts with a single word."
>
  {#snippet action()}
    <button>Write your first post</button>
  {/snippet}
</EmptyState>
```

| Component | Description |
|-----------|-------------|
| `Loading` | Full loading indicator with message |
| `LoadingSkeleton` | Animated placeholder lines |
| `EmptyState` | Friendly empty state with icon, title, description, action |
| `ThemeToggle` | (Also exported here for convenience) |

---

## forms/ - Search & Input (3)

Specialized form components.

```svelte
<script>
  import { SearchInput, ContentSearch, createTextFilter } from '@autumnsgrove/groveengine/ui/forms';
</script>

<!-- Simple search input -->
<SearchInput placeholder="Search posts..." bind:value={query} />

<!-- Full content search with filtering -->
<ContentSearch
  items={posts}
  filterFn={createTextFilter('title')}
  placeholder="Search your writing..."
>
  {#snippet item(post)}
    <a href={post.href}>{post.title}</a>
  {/snippet}
</ContentSearch>
```

### Filter Utilities

```typescript
import {
  createTextFilter,       // Simple text match on one field
  createMultiFieldFilter, // Match across multiple fields
  createFuzzyFilter,      // Fuzzy/approximate matching
  createDateFilter,       // Filter by date range
  combineFilters          // Combine multiple filters
} from '@autumnsgrove/groveengine/ui/forms';

// Example: Search title and content
const filter = createMultiFieldFilter(['title', 'content', 'tags']);
```

---

## indicators/ - Status & Progress (3)

Visual indicators for status and progress.

```svelte
<script>
  import { StatusBadge, ScoreBar, CreditBalance } from '@autumnsgrove/groveengine/ui/indicators';
</script>

<!-- Status indicator -->
<StatusBadge status="published" />
<StatusBadge status="draft" />

<!-- Progress/score bar -->
<ScoreBar value={75} max={100} label="Profile completion" />

<!-- Credit/usage balance -->
<CreditBalance used={50} total={100} label="AI Credits" />
```

---

## icons/ - Icon Components (2)

Grove uses [Lucide icons](https://lucide.dev) with semantic groupings and custom SVG components.

```svelte
<script>
  import { Icons, IconLegend } from '@autumnsgrove/groveengine/ui/icons';
  import { Check, ArrowRight, Sprout, Heart } from '@autumnsgrove/groveengine/ui/icons';
</script>

<!-- Custom multi-icon component -->
<Icons name="search" size="md" />

<!-- Direct Lucide imports -->
<Check class="w-4 h-4 text-green-500" />
<Sprout class="w-5 h-5" />

<!-- Icon legend for documentation -->
<IconLegend icons={featureIcons} />
```

### Icon Registries

Semantic groupings for consistent icon usage:

```typescript
import {
  navIcons,      // Navigation: home, menu, settings
  stateIcons,    // States: loading, success, error
  pricingIcons,  // Pricing: check, crown, sprout
  featureIcons,  // Features: shield, download, rss
  seasonIcons,   // Seasons: sun, leaf, snowflake, flower
  actionIcons,   // Actions: plus, copy, trash, refresh
  authIcons,     // Auth: fingerprint, key, link
  getIcon,       // Get icon by semantic key
  allIcons       // All icons in one map
} from '@autumnsgrove/groveengine/ui/icons';
```

---

## Utilities

### Class Merging

```typescript
import { cn } from '@autumnsgrove/groveengine/ui/utils';

// Merge classes with Tailwind conflict resolution
const className = cn(
  'base-styles px-4 py-2',
  isActive && 'bg-accent',
  className // User-provided classes win
);
```

---

## Design Philosophy

Every component in this library is built with these principles:

1. **Content-first** — Nature elements enhance, never obstruct
2. **Alive but not distracting** — Subtle animations respect `prefers-reduced-motion`
3. **Accessible by design** — WCAG AA minimum, screen reader excellence
4. **Organic over rigid** — Soft corners, natural progressions, never corporate
5. **Warm in dark mode** — "Nature at night," not harsh inversion

When you're building with Grove components, you're creating spaces where people can feel at home. These aren't just UI elements—they're the walls, windows, and warmth of someone's corner of the web.

---

*Last updated: 2026-02-06*
