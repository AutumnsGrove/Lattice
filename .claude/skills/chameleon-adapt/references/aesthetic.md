# Chameleon Adapt: The Grove Aesthetic

> Loaded by chameleon-adapt during Phase 1 (READ). See SKILL.md for the full workflow.


Grove is a **place**. It's nature-themed, warm, and inviting—like a midnight tea shop with good documentation.

### Core Principles

```
Warm, introspective, queer, unapologetically building something meaningful.
Write with the warmth of a midnight tea shop and the clarity of good documentation.
```

**Every design choice should feel:**

- **Welcoming** — like entering a cozy space
- **Organic** — natural, not rigid or corporate
- **Readable** — content-first, decorations enhance, never obstruct
- **Alive** — subtle animations, seasonal changes, randomization

### Grove Mode & Terminology (GroveTerm V2)

Grove has a terminology system that automatically switches between Grove-themed terms and standard terms based on the user's **Grove Mode** setting. **Always use GroveTerm components instead of hardcoding Grove terminology in UI.**

By default, Grove Mode is OFF for new visitors. They see familiar terms: "Posts" instead of "Blooms", "Dashboard" instead of "Arbor", "Support" instead of "Porch". When users opt in via the footer toggle, they see the full nature-themed vocabulary with interactive definitions.

**The Component Suite:**

```svelte
import {(GroveTerm, GroveSwap, GroveText, GroveSwapText, GroveIntro)} from '@autumnsgrove/lattice/ui';
import groveTermManifest from '$lib/data/grove-term-manifest.json';
```

| Component       | Use Case                                 | Behavior                                                                  |
| --------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| `GroveTerm`     | Interactive terms with popup definitions | Colored underline when ON, click for popup. Shows standard term when OFF. |
| `GroveSwap`     | Silent text replacement                  | Reactively swaps text. No underline, no interaction.                      |
| `GroveText`     | Parse `[[term]]` syntax in data strings  | Renders `[[bloom\|posts]]` as interactive GroveTerm components.           |
| `GroveSwapText` | Parse `[[term]]` syntax silently         | Same parsing, silent swaps (no popups).                                   |
| `GroveIntro`    | "We call it X" page banners              | Standardized intro below page titles.                                     |

**Usage:**

```svelte
<!-- Interactive term with popup -->
<GroveTerm term="bloom" manifest={groveTermManifest} />

<!-- Custom display text -->
<GroveTerm term="wanderer" manifest={groveTermManifest}>wanderers</GroveTerm>

<!-- Silent swap (no popup, no underline) -->
<GroveSwap term="arbor" manifest={groveTermManifest} />

<!-- Parse [[term]] syntax in data strings (ideal for FAQ items, pricing, etc.) -->
<GroveText
	content="Your [[bloom|posts]] live in your [[garden|blog]]."
	manifest={groveTermManifest}
/>

<!-- Silent text swap (non-interactive, default behavior) -->
<GroveTerm term="meadow" />

<!-- With leaf icon for Grove Mode hint -->
<GroveTerm term="meadow" icon />
```

**Key Rules:**

- **Never hardcode Grove terms** in user-facing UI. Always use GroveTerm components.
- **Default is OFF** for new visitors. Standard, familiar terminology first.
- **URLs stay as Grove terms** (`/porch`, `/garden`) regardless of display mode.
- **Brand terms** (Grove) and **subscription tiers** (Seedling/Sapling/Oak/Evergreen) always show as-is.
- **Use `[[term]]` syntax** for data-driven content (FAQ items, pricing fineprint, feature lists).
- **Grove Mode store**: `groveModeStore` from `@autumnsgrove/lattice/ui/stores`. Toggle lives in the footer.

See `docs/grove-user-identity.md` for the full identity language documentation and `libs/engine/src/lib/ui/components/ui/groveterm/` for component source.

---

## Glassmorphism Pattern

---


For **dreamy**, **far-future**, **mystical** content. The tea shop that exists at the edge of tomorrow.

```typescript
import { midnightBloom } from "$lib/components/nature/palette";

// Available colors:
midnightBloom.deepPlum; // #581c87 - Night sky depth
midnightBloom.purple; // #7c3aed - Soft purple glow
midnightBloom.violet; // #8b5cf6 - Lighter accent
midnightBloom.amber; // #f59e0b - Lantern warmth
midnightBloom.warmCream; // #fef3c7 - Tea steam, page glow
midnightBloom.softGold; // #fcd34d - Fairy lights
```

### Midnight Bloom Styling

```svelte
<section class="bg-gradient-to-b from-orange-950/50 via-purple-950 to-slate-950">
	<!-- Stars -->
	<StarCluster count={12} class="absolute top-12 left-[10%]" />

	<!-- Moon -->
	<Moon phase="waning-crescent" class="absolute top-20 right-[15%] w-16 h-16 opacity-60" />

	<!-- Fireflies -->
	<Firefly count={8} class="absolute inset-0" />

	<!-- Content with purple glass -->
	<blockquote class="bg-purple-900/30 backdrop-blur-sm border border-purple-700/30 rounded-lg p-6">
		<p class="text-purple-200 italic">Dreamy quote here...</p>
	</blockquote>
</section>
```

---

## Icons: Lucide Only

---


### Overflow Menu Pattern

Desktop navigation items that don't fit should go to a mobile sheet menu:

```svelte
<!-- Mobile menu button (visible md:hidden) -->
<button onclick={() => (mobileMenuOpen = true)} class="md:hidden p-2">
	<Menu class="w-5 h-5" />
</button>

<!-- Sheet menu -->
<MobileMenu bind:open={mobileMenuOpen} onClose={() => (mobileMenuOpen = false)} />
```

### Decorative Elements on Mobile

| Element            | Mobile Treatment                                |
| ------------------ | ----------------------------------------------- |
| Trees              | Reduce count, simplify (density multiplier = 1) |
| Particles          | Reduce count (40→20 snowflakes)                 |
| Clouds             | Hide some, keep 2-3                             |
| Complex animations | Reduce or disable                               |
| Touch targets      | Minimum 44x44px                                 |

### Performance Guidelines

```svelte
<!-- Reduce particle counts on mobile -->
<SnowfallLayer count={isLargeScreen ? 100 : 40} ... />

<!-- Skip complex effects for reduced-motion -->
{#if !prefersReducedMotion}
	<FallingLeavesLayer ... />
{/if}
```

---

## When to Use

---


Grove uses dynamic OG images for social media previews (Discord, Twitter, iMessage, etc.).

### Architecture

OG images are generated by a separate Cloudflare Worker at `og.grove.place` due to WASM bundling limitations with SvelteKit + Cloudflare Pages.

```
grove.place/api/og?title=X
       ↓ 302 redirect
og.grove.place/?title=X
       ↓ workers-og
PNG image (1200×630)
```

### API

```
GET https://og.grove.place/?title=X&subtitle=Y&accent=HEX
```

| Param      | Default          | Description                        |
| ---------- | ---------------- | ---------------------------------- |
| `title`    | "Grove"          | Main title (max 100 chars)         |
| `subtitle` | "A place to Be." | Subtitle (max 200 chars)           |
| `accent`   | "16a34a"         | Hex color without # (forest green) |

### Adding OG to New Pages

Use the SEO component which handles OG meta tags:

```svelte
<script>
	import SEO from "$lib/components/SEO.svelte";
</script>

<SEO
	title="Page Title"
	description="Page description for search engines"
	ogImage="/api/og?title=Page%20Title&subtitle=Custom%20subtitle"
/>
```

### Files

- `services/og-worker/` — Standalone Worker (uses `workers-og`)
- `landing/src/routes/api/og/+server.ts` — Proxy to og.grove.place
- `landing/src/lib/components/SEO.svelte` — Meta tag management

---

## Integration with Other Skills
