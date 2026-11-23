/**
 * LumenClient Factory for Worker Context
 *
 * Creates a LumenClient from the worker's environment bindings.
 * Resolves OpenRouter credentials through Warden's /resolve endpoint
 * via the internal service binding.
 *
 * Credential resolution priority:
 * 1. tenantApiKey (BYOK — caller provides their own key)
 * 2. DEV_OPENROUTER_API_KEY (the local dev stack only — see below)
 * 3. Warden /resolve (per-tenant → global, via service binding)
 * 4. Empty string (will fail downstream with clear error)
 *
 * Fail-closed: if Warden resolution fails, no fallback to a direct key.
 * The whole point is that no worker except Warden touches raw API keys.
 * The one exception is `DEV_OPENROUTER_API_KEY`, which exists because the dev
 * stack runs no Warden: without it a local Lumen cannot answer a single call,
 * and a stack that fails closed on every request teaches nobody anything. It
 * has its own name so production can never satisfy it by accident — nothing
 * sets it in a deployed environment, and `gw secret apply` has no such secret.
 *
 * The worker has its own AI binding for Cloudflare Workers AI (embeddings,
 * transcription, local moderation) — no Warden needed for CF-native services.
 */

import { createLumenClient } from "@autumnsgrove/lattice/ai/lumen";
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

	// 2. Local dev only: `.dev.vars` on a developer's machine (see the file header).
	if (!openrouterApiKey && env.DEV_OPENROUTER_API_KEY) {
		openrouterApiKey = env.DEV_OPENROUTER_API_KEY;
	}

	// 3. Warden resolution (per-tenant → global)
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

	// 4. Empty string — will fail downstream with a clear provider error
	return createLumenClient({
		openrouterApiKey,
		ai: env.AI,
		db: env.DB,
		enabled: true,
	});
}
