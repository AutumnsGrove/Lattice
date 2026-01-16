# Grove Icon Standards

> Standards for icon usage across all Grove properties. Single source of truth for semantic icon selection and implementation patterns.

## Overview

Grove uses **Lucide icons exclusively**. No emojis in UI components. Icons enhance accessibility, visual hierarchy, and consistency across the entire platform.

---

## Icon Registry

### Navigation Icons

| Concept | Icon | Usage | Example |
|---------|------|-------|---------|
| Home | `Home` | Landing page, return home | Header, breadcrumbs |
| About | `Info` | Information, learn more | Sidebar, help links |
| Vision | `Telescope` | Looking forward, future plans | Main nav |
| Roadmap | `MapPin` | Journey, development phases | Main nav, progress |
| Pricing | `HandCoins` | Costs, subscription tiers | Main nav, pricing pages |
| Knowledge | `BookOpen` | Learning, documentation | Main nav, help |
| Forest/Community | `Trees` | Grove blogs, user content | Main nav, forest page |
| Blog | `PenLine` | Writing, personal blog | Main nav, external links |

### Feature Icons

| Concept | Icon | Usage | Example |
|---------|------|-------|---------|
| Email/Messages | `Mail` | Email contact, inbox | Contact page, headers |
| Storage | `HardDrive` | File storage, data | Pricing, feature cards |
| Theming | `Palette` | Color customization, design | Features, tier badges |
| Authentication | `ShieldCheck` | Security, identity | Features, security |
| Cloud | `Cloud` | Remote, serverless, sync | Features, deployment |
| Search | `SearchCode` | Advanced search, discovery | Search input, filters |
| Archives | `Archive` | Backups, history, storage | Data management |
| Upload | `Upload` | File upload, content creation | Forms, drag-drop |
| Comments | `MessagesSquare` | User discussions, feedback | Posts, community |
| External Link | `ExternalLink` | Opens new tab/window | Blog links, resources |
| GitHub | `Github` | GitHub repository links | Specs, source code |

### Content & Growth Icons

| Concept | Icon | Usage | Example |
|---------|------|-------|---------|
| Posts/Blog | `FileText` | Blog posts, articles | Pricing table, features |
| Tags | `Tag` | Categorization, taxonomy | Filter, organization |
| Growth/Seedling | `Sprout` | New beginnings, progress | Tier names, phases |
| Trees | `Trees` | Grove ecosystem, community | Navigation, themes |
| Leaf | `Leaf` | Nature, organic | Decorative, accents |
| Flower | `Flower2` | Beauty, aesthetics, care | Features, refinement |
| Heart | `Heart` | Love, care, favorites | Built with care, reaction |
| Location | `MapPin` | Current position, "You are here" | Progress tracking |

### State & Feedback Icons

| Concept | Icon | Usage | Example |
|---------|------|-------|---------|
| Success/Complete | `Check` | Verified, done, success | Checkmarks, status |
| Checked/Selected | `CheckCircle` | Selected, active state | Pricing, feature tables |
| Error/Close | `X` | Error, dismiss, close | Error messages, modals |
| Loading | `Loader2` | In progress, loading | Loading states (animate-spin) |
| Info | `Info` | Information, help | Tooltips, hints |
| Warning | `AlertTriangle` | Warning, caution | Alert messages |
| Help | `HelpCircle` | Help, support | Help center, questions |

### Phase & Dream Icons

| Concept | Icon | Usage | Example |
|---------|------|-------|---------|
| Coming Soon | `Sprout` | Future growth | Phase badges |
| Refinement/Polish | `Gem` | Quality, polish | Golden Hour phase |
| The Dream/Mystical | `Sparkles` | Far future, dreams | Midnight Bloom section |
| Night/Star | `Star` | Night themes, hopes | Midnight Bloom, dreams |
| Moon | `Moon` | Night, sleeping, resting | Decorative, night theme |

### Action & Process Icons

| Concept | Icon | Usage | Example |
|---------|------|-------|---------|
| Getting Started | `Compass` | Guidance, direction | Onboarding, help |
| What's New | `Megaphone` | Announcements | Updates, releases |
| Next Steps | `Lightbulb` | Ideas, suggestions | Guidance, next actions |
| Download | `Download` | Export, get data | Data export, downloads |
| Settings | `Settings` | Configuration | Admin, preferences |
| Menu | `Menu` | Navigation menu | Mobile menu |

---

## Seasonal Icon Coloring

Icons should use seasonal colors based on the current page phase or section:

### By Season

```typescript
// winter/first-frost
icon class: text-blue-500 or text-slate-500

// thaw/spring
icon class: text-green-500 or text-teal-500

// first-buds (early spring)
icon class: text-pink-500 or text-emerald-500

// full-bloom (summer)
icon class: text-green-500 or text-emerald-500

// golden-hour (autumn)
icon class: text-amber-500 or text-orange-500

// midnight-bloom (mystical)
icon class: text-purple-300 or text-amber-400
```

### By Status

```typescript
// success/complete
icon class: text-green-500 or text-emerald-600

// pending/in-progress
icon class: text-amber-500 or text-yellow-500

// planned/future
icon class: text-slate-400 or text-slate-500

// internal/hidden
icon class: text-slate-400 dark:text-slate-600

// error
icon class: text-red-500
```

### By Importance

```typescript
// Primary action
icon class: text-accent or text-accent-muted (from design system)

// Secondary
icon class: text-foreground-subtle

// Tertiary/disabled
icon class: text-foreground-faint
```

---

## Implementation Pattern

All icons should be used via the centralized icon utility. **Never** import icons directly in components.

### Directory Structure

```
landing/
└── src/
    └── lib/
        └── utils/
            └── icons.ts          # Central icon registry (ONE FILE)
```

### The Icon Utility (`landing/src/lib/utils/icons.ts`)

```typescript
/**
 * Centralized icon registry for Grove landing.
 * Single source of truth for all icon usage.
 *
 * Import this, never import lucide-svelte directly in components.
 */

import {
  // Navigation
  Home, Info, Telescope, MapPin, HandCoins, BookOpen, Trees, PenLine,
  // Features
  Mail, HardDrive, Palette, ShieldCheck, Cloud, SearchCode, Archive, Upload,
  MessagesSquare, ExternalLink, Github,
  // Content
  FileText, Tag, Sprout, Heart, Leaf, Flower2,
  // States
  Check, CheckCircle, X, Loader2, AlertTriangle, HelpCircle, Info as InfoIcon,
  // Phases
  Gem, Sparkles, Star, Moon,
  // Actions
  Compass, Megaphone, Lightbulb, Download, Settings, Menu,
  // Additional
  Clock, TrendingUp, TrendingDown, ArrowRight, Activity, Users, Shield,
  BarChart3, MessagesSquare as MessageSquare,
} from 'lucide-svelte';

// Navigation icon map
export const navIcons = {
  home: Home,
  about: Info,
  vision: Telescope,
  roadmap: MapPin,
  pricing: HandCoins,
  knowledge: BookOpen,
  forest: Trees,
  blog: PenLine,
} as const;

// Feature icon map
export const featureIcons = {
  mail: Mail,
  harddrive: HardDrive,
  palette: Palette,
  shieldcheck: ShieldCheck,
  cloud: Cloud,
  searchcode: SearchCode,
  archive: Archive,
  upload: Upload,
  messagessquare: MessagesSquare,
  externallink: ExternalLink,
  github: Github,
} as const;

// Content icon map
export const contentIcons = {
  filetext: FileText,
  tag: Tag,
  sprout: Sprout,
  heart: Heart,
  leaf: Leaf,
  flower2: Flower2,
  trees: Trees,
  clock: Clock,
  trending: TrendingUp,
  users: Users,
  shield: Shield,
  barchart: BarChart3,
} as const;

// State icon map
export const stateIcons = {
  check: Check,
  checkcircle: CheckCircle,
  x: X,
  loader: Loader2,
  warning: AlertTriangle,
  help: HelpCircle,
  info: InfoIcon,
} as const;

// Phase/dream icon map
export const phaseIcons = {
  gem: Gem,
  sparkles: Sparkles,
  star: Star,
  moon: Moon,
  sprout: Sprout,
} as const;

// Action icon map
export const actionIcons = {
  compass: Compass,
  megaphone: Megaphone,
  lightbulb: Lightbulb,
  download: Download,
  settings: Settings,
  menu: Menu,
  trend: TrendingUp,
  trenddown: TrendingDown,
  arrow: ArrowRight,
} as const;

// Utility function to get icon by key and category
export function getIcon<T extends Record<string, any>>(
  map: T,
  key: keyof T | string
) {
  return map[key as keyof T];
}

// Export all as single object for convenience
export const allIcons = {
  ...navIcons,
  ...featureIcons,
  ...contentIcons,
  ...stateIcons,
  ...phaseIcons,
  ...actionIcons,
} as const;

export type IconKey = keyof typeof allIcons;
```

---

## Usage in Components

### Example 1: Pricing Page (Feature Icons)

```svelte
<script lang="ts">
  import { featureIcons } from '$lib/utils/icons';

  interface Feature {
    name: string;
    icon: keyof typeof featureIcons;
  }

  const features: Feature[] = [
    { name: 'Blog', icon: 'filetext' },
    { name: 'Storage', icon: 'harddrive' },
    { name: 'Themes', icon: 'palette' },
  ];
</script>

{#each features as feature}
  <div class="flex items-center gap-2">
    <svelte:component
      this={featureIcons[feature.icon]}
      class="w-5 h-5 text-accent-muted"
    />
    <span>{feature.name}</span>
  </div>
{/each}
```

### Example 2: Roadmap Page (Multiple Icon Maps)

```svelte
<script lang="ts">
  import { featureIcons, phaseIcons, contentIcons } from '$lib/utils/icons';
  import { season } from '$lib/stores/season';

  const phases = {
    'first-frost': { icon: 'star', color: 'text-blue-500' },
    'thaw': { icon: 'sprout', color: 'text-teal-500' },
    'golden-hour': { icon: 'gem', color: 'text-amber-500' },
    'midnight-bloom': { icon: 'sparkles', color: 'text-purple-300' },
  };
</script>

{#each Object.entries(phases) as [phaseKey, phaseData]}
  <div class="flex items-center gap-2">
    <svelte:component
      this={phaseIcons[phaseData.icon]}
      class="w-6 h-6 {phaseData.color}"
    />
    <span>{phaseKey}</span>
  </div>
{/each}
```

### Example 3: Status Indicators

```svelte
<script lang="ts">
  import { stateIcons } from '$lib/utils/icons';

  const status = 'complete'; // 'complete' | 'pending' | 'error'
  const statusConfig = {
    complete: { icon: 'checkcircle', color: 'text-green-500' },
    pending: { icon: 'loader', color: 'text-amber-500' },
    error: { icon: 'x', color: 'text-red-500' },
  };
</script>

<svelte:component
  this={stateIcons[statusConfig[status].icon]}
  class="w-5 h-5 {statusConfig[status].color}"
/>
```

---

## Icon Sizing Standards

Use these sizes consistently across the project:

```typescript
// Inline with text
'w-4 h-4'        // Status badges, small text

// Standard UI elements
'w-5 h-5'        // Buttons, nav items, list items

// Large featured
'w-6 h-6'        // Card headers, prominent sections

// Extra large
'w-8 h-8'        // Hero sections, decorative
'w-10 h-10'      // Large feature cards, phase badges

// Mobile/touch
'w-12 h-12'      // Mobile buttons (minimum 44x44px touch target)
```

---

## Icon Naming Convention

When creating icon keys in data:

```typescript
// ✅ Good: lowercase, no spaces, descriptive
'filetext'
'messagessquare'
'searchcode'
'externallink'

// ❌ Bad: camelCase, spaces, unclear
'FileText'
'messages square'
'search_code'
'ExternalLinks'

// For multi-word icons, keep lowercase
'checkCircle' → 'checkcircle'
'HelpCircle' → 'helpcircle'
```

---

## Seasonal Color Mapping

Colors should respect the seasonal/phase context:

### Feature Cards in Roadmap

```typescript
// Thaw (Winter/Early Spring)
phaseIconColor: 'text-teal-500'
featureIconColor: 'text-accent'  // Warm accent over cool background

// First Buds (Spring)
phaseIconColor: 'text-pink-500'
featureIconColor: 'text-green-500'

// Full Bloom (Summer)
phaseIconColor: 'text-green-500'
featureIconColor: 'text-emerald-600'

// Golden Hour (Autumn)
phaseIconColor: 'text-amber-500'
featureIconColor: 'text-orange-600'

// Midnight Bloom (Mystical)
phaseIconColor: 'text-purple-300'
featureIconColor: 'text-amber-400'
```

---

## Common Patterns

### With Text Label

```svelte
<span class="inline-flex items-center gap-1.5">
  <svelte:component this={featureIcons.mail} class="w-4 h-4 flex-shrink-0" />
  <span>Email us</span>
</span>
```

### In Circle Background (for contrast)

```svelte
<div class="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
  <svelte:component this={featureIcons.mail} class="w-5 h-5 text-accent" />
</div>
```

### As Navigation Icon

```svelte
<a href="/pricing" class="flex items-center gap-2 p-2 rounded-lg">
  <svelte:component this={navIcons.pricing} class="w-5 h-5" />
  <span class="hidden md:inline">Pricing</span>
</a>
```

### In Status Badge

```svelte
<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700">
  <svelte:component this={stateIcons.check} class="w-4 h-4" />
  Complete
</span>
```

---

## Migration Checklist

When updating a component to use centralized icons:

- [ ] Remove all direct lucide-svelte imports
- [ ] Import from `$lib/utils/icons` instead
- [ ] Update data structure to use string keys (lowercase)
- [ ] Use `svelte:component` with icon map lookup
- [ ] Add seasonal color classes if applicable
- [ ] Test on mobile and dark mode
- [ ] Verify all icon keys exist in the utility
- [ ] Remove any undefined icon fallbacks (no longer needed)

---

## Reference

- **Lucide Icons:** https://lucide.dev
- **Grove Design System:** See `AGENT.md` and `.claude/skills/grove-ui-design/`
- **Icon Utility:** `landing/src/lib/utils/icons.ts`
- **Affected Pages:**
  - `landing/src/routes/roadmap/+page.svelte`
  - `landing/src/routes/roadmap/workshop/+page.svelte`
  - `landing/src/routes/pricing/+page.svelte`
  - `landing/src/routes/header/+page.svelte`
  - All other Grove properties

---

*Last updated: 2025-01-05*
*Related: grove-ui-design skill, design system documentation*
