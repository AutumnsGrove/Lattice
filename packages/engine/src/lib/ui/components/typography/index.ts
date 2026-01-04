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
export { default as Luciole } from './Luciole.svelte';

// Modern sans-serif fonts
export { default as Nunito } from './Nunito.svelte';
export { default as Quicksand } from './Quicksand.svelte';
export { default as Manrope } from './Manrope.svelte';
export { default as InstrumentSans } from './InstrumentSans.svelte';
export { default as PlusJakartaSans } from './PlusJakartaSans.svelte';

// Serif fonts
export { default as Cormorant } from './Cormorant.svelte';
export { default as BodoniModa } from './BodoniModa.svelte';
export { default as Lora } from './Lora.svelte';
export { default as EBGaramond } from './EBGaramond.svelte';
export { default as Merriweather } from './Merriweather.svelte';
export { default as Fraunces } from './Fraunces.svelte';

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
