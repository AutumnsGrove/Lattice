/**
 * Loom — Worker Adapter
 *
 * Helpers for accessing Durable Objects from Cloudflare Workers
 * (non-SvelteKit context). Used by Heartwood, standalone workers, etc.
 *
 * @example
 * ```typescript
 * import { getWorkerDO, workerFetchJson } from '@autumnsgrove/lattice/loom/worker';
 *
 * // In a Hono route handler:
 * const data = await workerFetchJson<PostContent>(
 *   env.POST_CONTENT, `content:${tenantId}:${slug}`, "/content"
 * );
 * ```
 */

import {
  getLoomStub,
  getLoomStubById,
  loomFetch,
  loomFetchJson,
} from "../factory.js";

/**
 * Get a DO stub directly from an env binding.
 * Wrapper around getLoomStub for Worker contexts.
 */
export function getWorkerDO<T extends Rpc.DurableObjectBranded>(
  namespace: DurableObjectNamespace<T>,
  name: string,
): DurableObjectStub<T> {
  return getLoomStub(namespace, name);
}

/**
 * Fetch JSON from a DO in a Worker context.
 * Combines stub creation + fetch + JSON parse.
 */
export async function workerFetchJson<T>(
  namespace: DurableObjectNamespace<Rpc.DurableObjectBranded>,
  name: string,
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const stub = getLoomStub(namespace, name);
  return loomFetchJson<T>(stub, path, method, body);
}

// Re-export factory helpers for convenience
export {
  getLoomStub,
  getLoomStubById,
  loomFetch,
  loomFetchJson,
} from "../factory.js";
