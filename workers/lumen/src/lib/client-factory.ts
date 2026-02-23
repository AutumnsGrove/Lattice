/**
 * LumenClient Factory for Worker Context
 *
 * Creates a LumenClient from the worker's environment bindings.
 * Uses the Warden service binding for credential-injected OpenRouter access
 * when a tenant-specific key isn't provided.
 *
 * Credential resolution priority:
 * 1. tenantApiKey (BYOK — caller provides their own key)
 * 2. env.OPENROUTER_API_KEY (direct fallback on the worker)
 *
 * TODO: Add Warden credential injection as step 2 (env.WARDEN service
 * binding is wired but not yet exercised). See workers/warden/src/services/openrouter.ts
 *
 * The worker has its own AI binding for Cloudflare Workers AI (embeddings,
 * transcription, local moderation) — no Warden needed for CF-native services.
 */

import { createLumenClient } from "@autumnsgrove/lattice/lumen";
import type { Env } from "../types";

/**
 * Create a LumenClient configured for the worker environment.
 *
 * @param env - Worker environment bindings
 * @param tenantApiKey - Optional per-tenant API key override (BYOK)
 */
export function createLumenClientForWorker(env: Env, tenantApiKey?: string) {
	// Resolve the OpenRouter API key: tenant BYOK → worker env fallback
	const openrouterApiKey = tenantApiKey || env.OPENROUTER_API_KEY || "";

	return createLumenClient({
		openrouterApiKey,
		ai: env.AI,
		db: env.DB,
		enabled: true,
	});
}
