/**
 * Reverie Composer — LLM Tool Calling via Lumen
 *
 * Calls the Lumen worker via service binding with tool definitions,
 * receives structured tool calls, and returns them for validation.
 */

import { RemoteLumenClient } from "@autumnsgrove/lattice/lumen/remote";
import type { LumenToolDefinition, LumenToolCall } from "@autumnsgrove/lattice/lumen";
import type { AtmosphereEntry } from "@autumnsgrove/lattice/reverie";
import type { Env } from "../types";
import { REVERIE_SYSTEM_PROMPT, REVERIE_COMPOSE_SYSTEM_PROMPT, buildUserPrompt } from "./prompts";

// =============================================================================
// Types
// =============================================================================

export interface ComposerResult {
	toolCalls: LumenToolCall[];
	model: string;
	latencyMs: number;
}

// =============================================================================
// Composer
// =============================================================================

/**
 * Call Lumen with tool definitions and return structured tool calls.
 *
 * Uses "reverie" task for simple requests (≤3 domains) and
 * "reverie-compose" for atmosphere/multi-domain requests (>3 domains).
 */
export async function compose(
	input: string,
	tools: LumenToolDefinition[],
	env: Env,
	options: {
		tenantId: string;
		tier: string;
		atmosphere?: AtmosphereEntry;
		domainCount: number;
	},
): Promise<ComposerResult> {
	const lumen = new RemoteLumenClient({
		baseUrl: "https://grove-lumen.workers.dev",
		apiKey: env.LUMEN_API_KEY,
		fetcher: env.LUMEN,
	});

	// Choose task based on complexity
	const isCompose = options.domainCount > 3 || !!options.atmosphere;
	const task = isCompose ? "reverie-compose" : "reverie";
	const systemPrompt = isCompose ? REVERIE_COMPOSE_SYSTEM_PROMPT : REVERIE_SYSTEM_PROMPT;

	const userPrompt = buildUserPrompt(input, options.atmosphere);

	const startTime = Date.now();

	const result = await lumen.run(
		{
			task: task as "reverie" | "reverie-compose",
			input: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			],
			tenant: options.tenantId,
			options: {
				tools,
				toolChoice: "required",
				// PII scrub stays enabled — user input is sent to the LLM
				// and may contain personal info even in config requests.
			},
		},
		options.tier,
	);

	return {
		toolCalls: result.toolCalls ?? [],
		model: result.model,
		latencyMs: Date.now() - startTime,
	};
}
