/**
 * Zephyr Client Factory
 *
 * Creates ZephyrClient instances from SvelteKit platform.env context.
 * Use this in server routes where environment variables come from the platform.
 *
 * @example
 * ```typescript
 * import { createZephyrClient } from '@autumnsgrove/groveengine/zephyr';
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
 * @param env - Environment object with ZEPHYR_URL and ZEPHYR_API_KEY
 * @returns Configured ZephyrClient instance
 */
export function createZephyrClient(env: {
  ZEPHYR_URL?: string;
  ZEPHYR_API_KEY?: string;
}): ZephyrClient {
  return new ZephyrClient({
    baseUrl: env.ZEPHYR_URL || DEFAULT_ZEPHYR_URL,
    apiKey: env.ZEPHYR_API_KEY || "",
  });
}
