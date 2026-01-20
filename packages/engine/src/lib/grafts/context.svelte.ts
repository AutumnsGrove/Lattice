/**
 * Graft Context (Svelte 5)
 *
 * Provides context for grafts using Svelte's context API.
 * This allows parent components to set graft context once,
 * and child graft components to read it.
 */

import { getContext, setContext } from "svelte";
import type { GraftContext } from "./types.js";

// Context key symbol for type safety
const GRAFT_CONTEXT_KEY = Symbol("graft-context");

/**
 * Set the graft context for child components.
 * Call this in a parent component to provide context to all nested grafts.
 *
 * @param context - The graft context to provide
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { setGraftContext } from '@autumnsgrove/groveengine/grafts';
 *
 *   setGraftContext({
 *     productId: 'grove',
 *     tenantId: data.tenantId,
 *     tier: data.tier
 *   });
 * </script>
 * ```
 */
export function setGraftContext(context: GraftContext): void {
  setContext(GRAFT_CONTEXT_KEY, context);
}

/**
 * Get the graft context from a parent component.
 * Returns undefined if no context has been set.
 *
 * @returns The graft context, or undefined
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { getGraftContext } from '@autumnsgrove/groveengine/grafts';
 *
 *   const context = getGraftContext();
 *   const productId = context?.productId ?? 'grove';
 * </script>
 * ```
 */
export function getGraftContext(): GraftContext | undefined {
  return getContext<GraftContext | undefined>(GRAFT_CONTEXT_KEY);
}

/**
 * Get the graft context, throwing if not available.
 * Use this when context is required.
 *
 * @returns The graft context
 * @throws Error if no context is set
 */
export function requireGraftContext(): GraftContext {
  const context = getGraftContext();
  if (!context) {
    throw new Error(
      "Graft context not found. Wrap your graft in a parent that calls setGraftContext().",
    );
  }
  return context;
}
