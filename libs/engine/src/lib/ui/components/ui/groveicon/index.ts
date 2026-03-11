/**
 * GroveIcon - Manifest-driven service icon swap system
 *
 * Renders canonical icons for Grove services with swappable icon suites.
 * Mirrors GroveTerm's manifest pattern but for icons instead of text.
 *
 * Usage:
 *   import { GroveIcon } from '@autumnsgrove/lattice/ui';
 *
 *   <GroveIcon service="arbor" class="w-5 h-5" />
 *   <GroveIcon service="lumen" size={24} />
 */

export { default as GroveIcon } from "./GroveIcon.svelte";
export { defaultSuite, groveIconManifest, getSuite } from "./manifest";
export { resolveIcon, hasIcon } from "./resolver";
export type {
	IconComponent,
	GroveIconEntry,
	GroveIconSuite,
	GroveIconManifest,
	ResolvedIcon,
} from "./types";
