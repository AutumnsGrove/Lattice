// GroveUI - Typography Components
//
// Font wrapper components for scoped font application.
// Each component automatically loads the font from CDN and applies it to children.
//
// Usage:
//   import { Alagard, IBMPlexMono, Caveat } from '@autumnsgrove/groveengine/ui/typography';
//
//   <Alagard as="h1">Fantasy Header</Alagard>
//   <IBMPlexMono as="code">console.log('code')</IBMPlexMono>
//   <Caveat as="p" class="text-xl">Handwritten note</Caveat>

// Base provider (for dynamic font selection)
export { default as FontProvider } from './FontProvider.svelte';

// Default font
export { default as Lexend } from './Lexend.svelte';

// Accessibility fonts
export { default as Atkinson } from './Atkinson.svelte';
export { default as OpenDyslexic } from './OpenDyslexic.svelte';

// Sans-serif fonts
export { default as Quicksand } from './Quicksand.svelte';
export { default as PlusJakartaSans } from './PlusJakartaSans.svelte';

// Monospace fonts
export { default as IBMPlexMono } from './IBMPlexMono.svelte';
export { default as Cozette } from './Cozette.svelte';

// Display/special fonts
export { default as Alagard } from './Alagard.svelte';
export { default as Calistoga } from './Calistoga.svelte';
export { default as Caveat } from './Caveat.svelte';

// Re-export font tokens for convenience
export {
	fonts,
	fontById,
	fontMap,
	getFontUrl,
	getFontStack,
	getFontsByCategory,
	generateFontFace,
	generateAllFontFaces,
	FONT_CDN_BASE,
	DEFAULT_FONT,
	FONT_COUNT,
	fontCategoryLabels,
	type FontId,
	type FontCategory,
	type FontFormat,
	type FontDefinition,
} from '../../tokens/fonts.js';

export const TYPOGRAPHY_VERSION = '0.1.0';
