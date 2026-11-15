# Chameleon Adapt: Icons

> Loaded by chameleon-adapt during Phase 4 (TEXTURE). See SKILL.md for the full workflow.


**NEVER** use emojis. **ALWAYS** use Lucide icons.

```svelte
import {(MapPin, Check, Leaf, Trees, Mail)} from '@lucide/svelte';

<!-- Good -->
<MapPin class="w-4 h-4" />
<Check class="w-5 h-5 text-green-500" />

<!-- Bad - NEVER do this -->
<!-- ❌ 🌱 📧 ✅ -->
```

### Standardized Icon Mapping

Use these icons consistently across the project:

| Concept         | Icon             | Notes                       |
| --------------- | ---------------- | --------------------------- |
| **Navigation**  |                  |                             |
| Home            | `Home`           |                             |
| About           | `Info`           |                             |
| Vision          | `Telescope`      | Looking forward             |
| Roadmap         | `Map`            | Journey/direction           |
| Pricing         | `HandCoins`      | Money/currency              |
| Knowledge       | `BookOpen`       | Learning/docs               |
| Forest          | `Trees`          | Community blogs             |
| Blog            | `PenLine`        | Writing                     |
| **Features**    |                  |                             |
| Email           | `Mail`           |                             |
| Storage         | `HardDrive`      |                             |
| Theming         | `Palette`        | Customization               |
| Authentication  | `ShieldCheck`    | Security                    |
| Cloud           | `Cloud`          | Remote/serverless           |
| Search          | `SearchCode`     | Code/advanced search        |
| Archives        | `Archive`        | Backups                     |
| Upload          | `Upload`         |                             |
| Video           | `Video`          |                             |
| Comments        | `MessagesSquare` | User discussions            |
| GitHub          | `Github`         | External links to GitHub    |
| **States**      |                  |                             |
| Success         | `Check`          | Completed/valid             |
| Error           | `X`              | Failed/close                |
| Loading         | `Loader2`        | With animate-spin           |
| **Content**     |                  |                             |
| Posts           | `FileText`       | Blog posts                  |
| Tags            | `Tag`            | Categorization              |
| Growth          | `Sprout`         | Grove brand, new beginnings |
| Heart           | `Heart`          | Love, care                  |
| External        | `ExternalLink`   | Opens new tab               |
| Location        | `MapPin`         | Current position            |
| **Phases**      |                  |                             |
| Coming Soon     | `Seedling`       | Something growing           |
| Refinement      | `Gem`            | Polish, quality             |
| The Dream       | `Sparkles`       | Mystical (use sparingly!)   |
| Night           | `Star`           | Midnight themes             |
| **Actions**     |                  |                             |
| Getting Started | `Compass`        | Guidance                    |
| What's New      | `Megaphone`      | Announcements               |
| Next Steps      | `Lightbulb`      | Ideas                       |

### Icon Mapping Tables in Files

Create a consistent icon map at the top of each component/page that uses icons:

```typescript
// landing/src/lib/utils/icons.ts - Centralized icon registry
import {
	Mail,
	HardDrive,
	Palette,
	ShieldCheck,
	Cloud,
	SearchCode,
	Archive,
	Upload,
	MessagesSquare,
	Github,
	Check,
	X,
	Loader2,
	FileText,
	Tag,
	Sprout,
	Heart,
	ExternalLink,
	MapPin, // ... etc
} from "@lucide/svelte";

export const featureIcons = {
	mail: Mail,
	harddrive: HardDrive,
	palette: Palette,
	shieldcheck: ShieldCheck,
	cloud: Cloud,
	searchcode: SearchCode,
	// ... all mapped icons
} as const;

export const stateIcons = {
	success: Check,
	error: X,
	loading: Loader2,
} as const;
```

Then use in components:

```svelte
<script lang="ts">
	import { featureIcons } from "$lib/utils/icons";
</script>

{#each features as feature}
	<svelte:component this={featureIcons[feature.icon]} class="w-5 h-5" />
{/each}
```

**Benefits:**

- Single source of truth for all icons
- Prevents undefined icon errors
- Easy to maintain and extend
- Reusable across entire project

### Icon Usage Guidelines

1. **Always use icon maps** - Never hardcode icon imports in every component
2. **Avoid overusing Sparkles** - Reserve for truly mystical/magical contexts
3. **Be consistent** - Use the same icon for the same concept everywhere
4. **Semantic meaning** - Choose icons that convey meaning, not just decoration
5. **Export from central utility** - Use `landing/src/lib/utils/icons.ts` for all icon sets

### Icon Sizing

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

## Icon Composition (Building Block Pattern)

**Philosophy:** "The grove doesn't need to be drawn. It just needs to be arranged."

For creating custom logos, illustrations, or decorative elements, compose existing Lucide icons rather than drawing custom SVG from scratch. This ensures visual consistency with the icon system.

### Why This Pattern?

- **Consistency** — Icons match the Lucide aesthetic (24x24 grid, 2px strokes, round caps)
- **Minimal custom code** — Let Lucide do the heavy lifting
- **Maintainable** — Updating Lucide updates your compositions
- **MIT licensed** — All paths come from open-source icons

### How to Extract Lucide Paths

Lucide icons use a 24×24 viewBox with 2px strokes. Extract paths directly from source:

```bash
# Find icon paths in Lucide source
curl -s https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/tree-pine.svg
# Look for the <path d="..." /> elements
```

**Key Lucide icon paths for Grove compositions:**

```typescript
// TreePine - conifer silhouette
const treePine = {
	canopy:
		"m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z",
	trunk: "M12 22v-3",
};

// TreeDeciduous - deciduous/round tree
const treeDeciduous = {
	canopy:
		"M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19Z",
	trunk: "M12 19v3",
};

// Moon - crescent moon
const moon =
	"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401";

// Flame - campfire/hearth
const flame =
	"M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4";
```

### Composing with SVG Transforms

Use `<g transform="...">` to position, scale, and rotate icons:

```svelte
<svg viewBox="0 0 48 32" fill="none">
	<!-- Left tree (larger, foreground) -->
	<g
		transform="translate(2, 4) scale(0.85)"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Right tree (smaller, background, tilted) -->
	<g
		transform="translate(20, 8) scale(0.65) rotate(-5, 12, 12)"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.7"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Add simple custom elements sparingly -->
	<circle cx="30" cy="10" r="1.5" fill={glowColor} opacity="0.8" />
	<!-- firefly -->
	<path d="M2 28h44" stroke={color} stroke-width="1.5" opacity="0.3" />
	<!-- ground -->
</svg>
```

### Transform Cheatsheet

| Transform             | Effect                | Example                                           |
| --------------------- | --------------------- | ------------------------------------------------- |
| `translate(x, y)`     | Move origin           | `translate(20, 8)` moves icon right 20, down 8    |
| `scale(s)`            | Uniform size          | `scale(0.65)` makes icon 65% size                 |
| `rotate(deg, cx, cy)` | Rotation around point | `rotate(-5, 12, 12)` tilts 5° around center       |
| Combined              | Chain transforms      | `translate(20, 8) scale(0.65) rotate(-5, 12, 12)` |

### Example: Grove Logo Compositions

See `/landing/src/lib/components/logo-concepts/` for real implementations:

| Logo                  | Composition                                |
| --------------------- | ------------------------------------------ |
| `LogoFireflyForest`   | TreePine + TreeDeciduous + glowing circles |
| `LogoGatheringHearth` | Two trees angled toward center Flame       |
| `LogoStarlightPines`  | Two TreePines + Moon + star circles        |
| `LogoShelter`         | Two TreePines forming archway + Moon       |
| `LogoWinterGrove`     | TreePines + snow line accents              |

### Guidelines

1. **Use Lucide paths as primary structure** — Trees, moon, flame, etc.
2. **Custom SVG only for simple primitives** — circles (fireflies), lines (ground, snow)
3. **Maintain Lucide styling** — 2px strokes, round caps/joins, consistent opacity
4. **Create depth with opacity/scale** — Larger = foreground (opacity 0.9), smaller = background (0.5-0.7)
5. **Keep viewBox aspect ratios reasonable** — 40×32 or 48×32 for horizontal compositions

### When to Use

- **Logos & branding** — Compose icons into unique marks
- **Illustrations** — Scene building (forest, sky, etc.)
- **Custom icons** — When Lucide doesn't have exactly what you need
- **Seasonal variations** — Same composition, different elements (snow, blossoms)

---

## Mobile Considerations
