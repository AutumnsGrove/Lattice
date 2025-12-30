/**
 * Nature Components - Grove's organic visual library
 *
 * A collection of SVG components for creating atmospheric forest scenes.
 * These components are seasonally-aware and support Grove's four seasons.
 *
 * @example
 * ```svelte
 * <script>
 *   import { Logo, TreePine, Cardinal } from '@autumnsgrove/groveengine/ui/nature';
 *   import { autumn } from '@autumnsgrove/groveengine/ui/nature';
 * </script>
 *
 * <Logo season="autumn" animate />
 * <TreePine season="winter" />
 * <Cardinal />
 * ```
 */

// Logo - Grove's tree-star logo
export { default as Logo } from './Logo.svelte';

// Palette - Seasonal color system
export * from './palette';

// Trees
export * from './trees';

// Botanical elements
export * from './botanical';

// Creatures
export * from './creatures';

// Ground elements
export * from './ground';

// Sky elements
export * from './sky';

// Structural elements
export * from './structural';

// Water elements
export * from './water';

// Weather effects
export * from './weather';
