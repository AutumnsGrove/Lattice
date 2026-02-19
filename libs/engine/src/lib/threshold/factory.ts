/**
 * Threshold — Factory Helper
 *
 * Creates a Threshold instance with the best available storage backend.
 * Priority chain: DO (preferred) → KV (fallback) → null (disabled).
 *
 * Backwards-compatible: `createThreshold(platform?.env)` without options
 * still works via KV. Pass `{ identifier }` to opt into DO-backed storage.
 *
 * @example
 * ```typescript
 * // KV fallback (existing pattern, unchanged)
 * const threshold = createThreshold(platform?.env);
 *
 * // DO-first (new pattern, per-user isolation)
 * const threshold = createThreshold(platform?.env, {
 *   identifier: locals.user?.id,
 * });
 * ```
 */

import { Threshold } from "./threshold.js";
import { ThresholdKVStore } from "./stores/kv.js";
import { ThresholdDOStore } from "./stores/do.js";

/**
 * Create a Threshold instance from a platform env object.
 * Returns null if no suitable storage backend is available.
 */
export function createThreshold(
  env:
    | {
        THRESHOLD?: DurableObjectNamespace;
        CACHE_KV?: KVNamespace;
      }
    | undefined,
  options?: { identifier?: string },
): Threshold | null {
  // DO-first: per-identifier isolation, zero contention, free at scale
  if (env?.THRESHOLD && options?.identifier) {
    return new Threshold({
      store: new ThresholdDOStore(env.THRESHOLD, options.identifier),
    });
  }

  // KV fallback: global, eventually consistent
  if (env?.CACHE_KV) {
    return new Threshold({ store: new ThresholdKVStore(env.CACHE_KV) });
  }

  return null;
}
