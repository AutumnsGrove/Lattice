/**
 * LumenClient Factory for Worker Context
 *
 * Creates a LumenClient from the worker's environment bindings.
 * Resolves OpenRouter credentials through Warden's /resolve endpoint
 * via the internal service binding.
 *
 * Credential resolution priority:
 * 1. tenantApiKey (BYOK — caller provides their own key)
 * 2. Warden /resolve (per-tenant → global, via service binding)
 * 3. Empty string (will fail downstream with clear error)
 *
 * Fail-closed: if Warden resolution fails, no fallback to a direct key.
 * The whole point is that no worker except Warden touches raw API keys.
 *
 * The worker has its own AI binding for Cloudflare Workers AI (embeddings,
 * transcription, local moderation) — no Warden needed for CF-native services.
 */

import { createLumenClient } from "@autumnsgrove/lattice/lumen";
import type { Env } from "../types";
import { resolveWardenCredential } from "./warden-client";

/**
 * Create a LumenClient configured for the worker environment.
 *
 * @param env - Worker environment bindings
 * @param tenantApiKey - Optional per-tenant API key override (BYOK)
 * @param tenantId - Optional tenant ID for Warden per-tenant credential resolution
 */
export async function createLumenClientForWorker(
	env: Env,
	tenantApiKey?: string,
	tenantId?: string,
) {
	// 1. BYOK: caller provides their own key
	let openrouterApiKey = tenantApiKey || "";

	// 2. Warden resolution (per-tenant → global)
	if (!openrouterApiKey) {
		const resolved = await resolveWardenCredential(
			env.WARDEN,
			env.WARDEN_API_KEY,
			"openrouter",
			tenantId,
		);
		if (resolved) {
			openrouterApiKey = resolved.credential;
		}
	}

	// 3. Empty string — will fail downstream with a clear provider error
	return createLumenClient({
		openrouterApiKey,
		ai: env.AI,
		db: env.DB,
		enabled: true,
	});
}
