/**
 * GroveTerm - Unified Grove terminology component
 *
 * Non-interactive by default (silent text swap). Add `interactive` for popup.
 *
 * Usage:
 *   import { GroveTerm } from '@autumnsgrove/lattice/ui';
 *
 *   <GroveTerm term="bloom" />                  <!-- silent swap -->
 *   <GroveTerm term="bloom" interactive />       <!-- popup + underline -->
 *   <GroveTerm term="bloom" icon />              <!-- with leaf icon -->
 */

export { default as GroveTerm } from "./GroveTerm.svelte";
export { default as GroveText } from "./GroveText.svelte";
export { default as GroveTermPopup } from "./GroveTermPopup.svelte";
export * from "./types";
