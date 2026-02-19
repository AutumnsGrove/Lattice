/**
 * Grove Term Resolution Utilities
 *
 * For non-component contexts (toasts, aria-labels, data strings) where
 * GroveSwap/GroveTerm Svelte components can't be used.
 *
 * Usage:
 *   import { resolveTerm, resolveTermString } from '@autumnsgrove/lattice/ui/utils';
 *
 *   toast.success(`${resolveTerm('blooms')} saved!`);
 *   // Grove Mode ON: "Blooms saved!" / OFF: "Posts saved!"
 *
 *   const label = resolveTermString('Bloom', 'Post');
 *   // Grove Mode ON: "Bloom" / OFF: "Post"
 */

import { groveModeStore } from "../stores/grove-mode.svelte.js";
import manifestData from "../../data/grove-term-manifest.json";
import type { GroveTermManifest } from "../components/ui/groveterm/types.js";

const manifest = manifestData as GroveTermManifest;

/**
 * Try common slug variations (matches GroveSwap logic).
 */
function findInManifest(slug: string) {
  if (slug in manifest) return manifest[slug];
  if (`your-${slug}` in manifest) return manifest[`your-${slug}`];
  if (`${slug}s` in manifest) return manifest[`${slug}s`];
  if (slug.endsWith("s") && slug.slice(0, -1) in manifest)
    return manifest[slug.slice(0, -1)];
  return null;
}

/**
 * Resolve a term slug to its display string based on current Grove Mode.
 * For use in non-component contexts (toasts, aria-labels, data strings).
 *
 * @param slug - Term slug from the manifest (e.g., "blooms", "arbor", "wanderer")
 * @returns The resolved display string
 */
export function resolveTerm(slug: string): string {
  const normalized = slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const entry = findInManifest(normalized);
  if (!entry) return slug;
  // Brand terms (alwaysGrove) always show the Grove name regardless of mode —
  // this runs after the null check so unknown slugs fall through safely above.
  if (entry.alwaysGrove) return entry.term;
  return groveModeStore.current ? entry.term : entry.standardTerm || entry.term;
}

/**
 * Resolve between explicit Grove/standard string pairs.
 * For inline use where you already know both terms.
 *
 * @param groveTerm - Text to show when Grove Mode is ON
 * @param standardTerm - Text to show when Grove Mode is OFF
 * @returns The appropriate string for the current mode
 */
export function resolveTermString(
  groveTerm: string,
  standardTerm: string,
): string {
  return groveModeStore.current ? groveTerm : standardTerm;
}
