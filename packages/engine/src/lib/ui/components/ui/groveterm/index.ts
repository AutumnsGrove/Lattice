/**
 * GroveTerm - Interactive Grove terminology component
 *
 * Displays clickable terms with popup definitions, styled by category.
 *
 * Usage:
 *   import { GroveTerm } from '@autumnsgrove/groveengine/ui';
 *   import groveTermManifest from '$lib/data/grove-term-manifest.json';
 *
 *   <GroveTerm term="grove" manifest={groveTermManifest} />
 *   <GroveTerm term="wanderer" manifest={groveTermManifest}>wanderers</GroveTerm>
 */

export { default as GroveTerm } from "./GroveTerm.svelte";
export { default as GroveTermPopup } from "./GroveTermPopup.svelte";
export { default as GroveIntro } from "./GroveIntro.svelte";
export * from "./types";
