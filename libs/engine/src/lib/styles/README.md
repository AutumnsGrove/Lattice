# Shared Styles

This directory contains CSS styles that are shared across all Grove sites to maintain visual consistency.

## vine-pattern.css

The `.leaf-pattern` class provides the signature Grove vine background pattern used across the platform.

### Features

- **450x450px repeating SVG pattern** with:
  - 5 flowing organic vine paths
  - 8 spiral tendrils
  - Multiple leaf varieties (ivy, round, slender, fern)
  - Botanical details (seeds, spores)
- **Grove green (#22c55e)** from the design system
- **Automatic dark mode support** with adjusted opacity
- **Performance-optimized** inline SVG data URI (no HTTP requests)

### Usage

Import in your site's `app.css`:

```css
@import "@autumnsgrove/lattice/lib/styles/vine-pattern.css";
```

Or copy the `.leaf-pattern` class definition directly into your app's CSS.

Then apply the class to your layout:

```svelte
<div class="min-h-screen leaf-pattern">
  <!-- Your content -->
</div>
```

### Current Sites Using This Pattern

- **landing** - Applied globally via `routes/+layout.svelte`
- **plant** - Applied globally via `routes/+layout.svelte`

### Customization

To adjust the pattern's appearance, you can modify:

- **Opacity values** in the SVG (currently 0.04-0.14)
- **Stroke widths** for vines (currently 0.5-1.5)
- **Color** (currently #22c55e, Grove green)

Any changes should be synchronized across all sites for consistency.
