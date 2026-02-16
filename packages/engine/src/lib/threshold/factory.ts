/**
 * Threshold — Factory Helper
 *
 * Centralizes the common pattern of creating a Threshold instance
 * from a platform env object. Returns null when KV is unavailable
 * (e.g., during local dev or prerendering).
 *
 * @example
 * ```typescript
 * import { createThreshold } from "$lib/threshold/factory.js";
 *
 * const threshold = createThreshold(platform?.env);
 * if (threshold) {
 *   const denied = await thresholdCheck(threshold, { ... });
 *   if (denied) return denied;
 * }
 * ```
 */

import { Threshold } from "./threshold.js";
import { ThresholdKVStore } from "./stores/kv.js";

/**
 * Create a Threshold instance from a platform env object.
 * Returns null if CACHE_KV is not available.
 */
export function createThreshold(
  env: { CACHE_KV?: KVNamespace } | undefined,
): Threshold | null {
  const kv = env?.CACHE_KV;
  if (!kv) return null;
  return new Threshold({ store: new ThresholdKVStore(kv) });
}
