# Icon Standards

> *Icons enhance accessibility, visual hierarchy, and consistency across the entire platform.*

Grove uses **Lucide icons exclusively**. No emojis in UI components.

---

## The Rules

1. **Never use emojis** in UI components
2. **Always use the centralized icon registry** (`landing/src/lib/utils/icons.ts`)
3. **Never import lucide-svelte directly** in components
4. **Be consistent** — use the same icon for the same concept everywhere

---

## Icon Registry

### Navigation

| Concept | Icon | Usage |
|---------|------|-------|
| Home | `Home` | Landing page, return home |
| About | `Info` | Information, learn more |
| Vision | `Telescope` | Looking forward, future plans |
| Roadmap | `MapPin` | Journey, development phases |
| Pricing | `HandCoins` | Costs, subscription tiers |
| Knowledge | `BookOpen` | Learning, documentation |
| Forest | `Trees` | Grove blogs, community content |
| Blog | `PenLine` | Writing, personal blog |

### Features

| Concept | Icon | Usage |
|---------|------|-------|
| Email | `Mail` | Email contact, inbox |
| Storage | `HardDrive` | File storage, data |
| Theming | `Palette` | Color customization, design |
| Authentication | `ShieldCheck` | Security, identity |
| Cloud | `Cloud` | Remote, serverless, sync |
| Search | `SearchCode` | Advanced search, discovery |
| Archives | `Archive` | Backups, history |
| Upload | `Upload` | File upload, content creation |
| Comments | `MessagesSquare` | User discussions, feedback |
| External | `ExternalLink` | Opens new tab |
| GitHub | `Github` | Repository links |

### Content & Growth

| Concept | Icon | Usage |
|---------|------|-------|
| Posts | `FileText` | Blog posts, articles |
| Tags | `Tag` | Categorization, taxonomy |
| Growth | `Sprout` | New beginnings, progress |
| Heart | `Heart` | Love, care, favorites |
| Location | `MapPin` | Current position |

### States

| Concept | Icon | Usage |
|---------|------|-------|
| Success | `Check` | Verified, done |
| Error | `X` | Error, dismiss, close |
| Loading | `Loader2` | In progress (with animate-spin) |
| Info | `Info` | Information, help |
| Warning | `AlertTriangle` | Caution |
| Help | `HelpCircle` | Support, questions |

### Phases & Dreams

| Concept | Icon | Usage |
|---------|------|-------|
| Coming Soon | `Sprout` | Future growth |
| Refinement | `Gem` | Quality, polish |
| Mystical | `Sparkles` | Far future, dreams (use sparingly!) |
| Night | `Star` | Night themes, hopes |
| Moon | `Moon` | Night, resting |

### Actions

| Concept | Icon | Usage |
|---------|------|-------|
| Getting Started | `Compass` | Guidance, direction |
| What's New | `Megaphone` | Announcements |
| Next Steps | `Lightbulb` | Ideas, suggestions |
| Download | `Download` | Export, get data |
| Settings | `Settings` | Configuration |
| Menu | `Menu` | Navigation menu |

---

## Seasonal Colors

Icons should use seasonal colors based on context:

| Season | Color Class |
|--------|-------------|
| Winter | `text-blue-500` or `text-slate-500` |
| Spring | `text-teal-500` or `text-pink-500` |
| Summer | `text-green-500` or `text-emerald-500` |
| Autumn | `text-amber-500` or `text-orange-500` |
| Midnight Bloom | `text-purple-300` or `text-amber-400` |

### Status Colors

| Status | Color Class |
|--------|-------------|
| Success | `text-green-500` |
| Pending | `text-amber-500` |
| Planned | `text-slate-400` |
| Error | `text-red-500` |

---

## Implementation

### The Icon Utility

All icons are centralized in `landing/src/lib/utils/icons.ts`:

```typescript
import { featureIcons, navIcons, stateIcons } from '$lib/utils/icons';

// Use in components
{#each features as feature}
  <svelte:component this={featureIcons[feature.icon]} class="w-5 h-5" />
{/each}
```

### Sizing

```svelte
<!-- Inline with text -->
<span class="inline-flex items-center gap-1.5">
  <Leaf class="w-4 h-4" /> Feature name
</span>

<!-- Button icon -->
<button class="p-2">
  <Menu class="w-5 h-5" />
</button>

<!-- Large decorative -->
<Gem class="w-8 h-8 text-amber-400" />
```

---

## Icon Composition

For custom logos and illustrations, compose existing Lucide icons rather than drawing custom SVG.

### Why

- **Consistency** — Icons match Lucide aesthetic (24x24 grid, 2px strokes, round caps)
- **Maintainable** — Updating Lucide updates your compositions
- **MIT licensed** — All paths come from open-source icons

### Key Lucide Paths

```typescript
// TreePine - conifer silhouette
const treePine = {
  canopy: 'm17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14...',
  trunk: 'M12 22v-3'
};

// Moon - crescent
const moon = 'M20.985 12.486a9 9 0 1 1-9.473-9.472...';
```

### Creating Depth

Use transforms to position, scale, and create depth:

- Larger = foreground (opacity 0.9)
- Smaller = background (opacity 0.5-0.7)

```svelte
<g transform="translate(2, 4) scale(0.85)"
   stroke={color} stroke-width="2" opacity="0.9">
  <path d={treePine.canopy} />
</g>
```

---

## Quick Reference

| Do | Don't |
|----|-------|
| Use centralized icon registry | Import lucide-svelte directly |
| Use Lucide icons | Use emojis |
| Match icon to semantic meaning | Pick icons for decoration only |
| Use consistent icons for concepts | Use different icons for same concept |
| Apply seasonal/status colors | Use random colors |

---

*The full icon registry is at `landing/src/lib/utils/icons.ts`.*
