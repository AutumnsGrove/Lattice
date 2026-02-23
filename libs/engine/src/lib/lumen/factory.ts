/**
 * Lumen Client Factory — Tri-Mode Auto-Detection
 *
 * Creates a Lumen client from environment variables, auto-detecting
 * the best available mode. Follows the Warden factory pattern.
 *
 * Modes (checked in order):
 * 1. Service binding (LUMEN fetcher) — worker-to-worker, zero-latency internal
 * 2. HTTP remote (LUMEN_URL + LUMEN_API_KEY) — external callers, CLI, agents
 * 3. In-process (OPENROUTER_API_KEY + AI + DB) — engine routes, same-process
 *
 * @example
 * ```typescript
 * import { createLumenClientAuto } from '@autumnsgrove/lattice/lumen';
 *
 * // SvelteKit callers pass platform.env.*; standalone workers pass env.*
 * const lumen = createLumenClientAuto(platform.env);
 *
 * // Automatically picks: service binding → HTTP → in-process
 * const result = await lumen.run({
 *   task: 'generation',
 *   input: 'Write a haiku about trees',
 *   tenant: 'tenant_123',
 * }, 'seedling');
 * ```
 */

import { LumenClient, createLumenClient } from "./client.js";
import { RemoteLumenClient } from "./remote.js";

const DEFAULT_LUMEN_URL = "https://lumen.grove.place";

export type LumenClientUnion = LumenClient | RemoteLumenClient;

/**
 * Create a Lumen client from environment, auto-detecting the best mode.
 *
 * Detection priority:
 * 1. LUMEN (service binding fetcher) → RemoteLumenClient via internal networking
 * 2. LUMEN_URL + LUMEN_API_KEY → RemoteLumenClient via HTTPS
 * 3. OPENROUTER_API_KEY → LumenClient in-process (current behavior)
 */
export function createLumenClientAuto(env: {
	/** Service binding to the Lumen worker */
	LUMEN?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
	/** Lumen worker URL for HTTP mode */
	LUMEN_URL?: string;
	/** API key for authenticating with the Lumen worker */
	LUMEN_API_KEY?: string;
	/** OpenRouter API key for in-process mode */
	OPENROUTER_API_KEY?: string;
	/** Cloudflare Workers AI binding for in-process mode */
	AI?: Ai;
	/** D1 database for in-process mode quota tracking */
	DB?: D1Database;
}): LumenClientUnion {
	// Mode 1: Service binding (worker-to-worker)
	if (env.LUMEN) {
		return new RemoteLumenClient({
			baseUrl: DEFAULT_LUMEN_URL,
			fetcher: env.LUMEN,
		});
	}

	// Mode 2: HTTP remote
	if (env.LUMEN_URL || env.LUMEN_API_KEY) {
		return new RemoteLumenClient({
			baseUrl: env.LUMEN_URL || DEFAULT_LUMEN_URL,
			apiKey: env.LUMEN_API_KEY,
		});
	}

	// Mode 3: In-process (current behavior)
	return createLumenClient({
		openrouterApiKey: env.OPENROUTER_API_KEY || "",
		ai: env.AI,
		db: env.DB,
	});
}
