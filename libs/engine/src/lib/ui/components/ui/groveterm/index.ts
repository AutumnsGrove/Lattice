/**
 * GroveTerm - Interactive Grove terminology component
 *
 * Displays clickable terms with popup definitions, styled by category.
 *
 * Usage:
 *   import { GroveTerm } from '@autumnsgrove/lattice/ui';
 *   import groveTermManifest from '$lib/data/grove-term-manifest.json';
 *
 *   <GroveTerm term="grove" manifest={groveTermManifest} />
 *   <GroveTerm term="wanderer" manifest={groveTermManifest}>wanderers</GroveTerm>
 */

export { default as GroveTerm } from "./GroveTerm.svelte";
export { default as GroveSwap } from "./GroveSwap.svelte";
export { default as GroveText } from "./GroveText.svelte";
export { default as GroveSwapText } from "./GroveSwapText.svelte";
export { default as GroveTermPopup } from "./GroveTermPopup.svelte";
export { default as GroveIntro } from "./GroveIntro.svelte";
export * from "./types";
