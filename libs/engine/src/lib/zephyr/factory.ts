/**
 * Zephyr Client Factory
 *
 * Creates ZephyrClient instances from SvelteKit platform.env context.
 * Use this in server routes where environment variables come from the platform.
 *
 * @example
 * ```typescript
 * import { createZephyrClient } from '@autumnsgrove/lattice/zephyr';
 *
 * export const POST: RequestHandler = async ({ platform }) => {
 *   const zephyr = createZephyrClient(platform.env);
 *   await zephyr.sendRaw({ ... });
 * };
 * ```
 */

import { ZephyrClient } from "./client";

const DEFAULT_ZEPHYR_URL = "https://grove-zephyr.m7jv4v7npb.workers.dev";

/**
 * Create a ZephyrClient from platform environment variables.
 *
 * When a ZEPHYR Service Binding is available (deployed on Cloudflare),
 * requests route directly through internal networking instead of the public internet.
 *
 * @param env - Environment object with ZEPHYR_URL, ZEPHYR_API_KEY, and optional ZEPHYR binding
 * @returns Configured ZephyrClient instance
 */
export function createZephyrClient(env: {
  ZEPHYR_URL?: string;
  ZEPHYR_API_KEY?: string;
  ZEPHYR?: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  };
}): ZephyrClient {
  return new ZephyrClient({
    baseUrl: env.ZEPHYR_URL || DEFAULT_ZEPHYR_URL,
    apiKey: env.ZEPHYR_API_KEY || "",
    fetcher: env.ZEPHYR,
  });
}
