/**
 * Lumen AI Gateway — Configuration
 *
 * The models, their prices, their capabilities and which task uses which model
 * live in `@autumnsgrove/lumen-registry`, which a worker can import without the
 * whole engine (#1602). Everything there is re-exported here, because this is
 * where Lumen's own code and its tests have always read it from.
 *
 * What stays in this file is what is Lumen's: the transport settings per
 * provider, and the refusals that need Lumen's own error type.
 */

import { LumenError } from "./errors.js";
import type {
	LumenProviderName,
	LumenTask,
	LumenToolChoice,
	LumenProviderConfig,
} from "./types.js";
import { getModelCapabilities } from "@autumnsgrove/lumen-registry";

export {
	DEFAULT_OPENROUTER_MODEL,
	getModel,
	getModelCost,
	getModelCapabilities,
	getModelsForProvider,
	getTaskConfig,
	listPickableModels,
	MODEL_COSTS,
	MODEL_REGISTRY,
	MODELS,
	TASK_REGISTRY,
	calculateCost,
} from "@autumnsgrove/lumen-registry";

export type {
	ModelCapabilities,
	ModelEntry,
	ModelToolChoice,
	PickableModel,
	TaskConfig,
} from "@autumnsgrove/lumen-registry";

/** The old name for the registry's `toolChoice` union. */
export type { ModelToolChoice as LumenToolChoiceMode } from "@autumnsgrove/lumen-registry";

// =============================================================================
// PROVIDER CONFIGURATIONS
// =============================================================================

export const PROVIDERS: Record<LumenProviderName, LumenProviderConfig> = {
	openrouter: {
		name: "OpenRouter",
		baseUrl: "https://openrouter.ai/api/v1",
		zdr: true, // OpenRouter partners have ZDR agreements
		timeoutMs: 120000, // 120 seconds for long generations
	},
	"cloudflare-ai": {
		name: "Cloudflare Workers AI",
		baseUrl: "", // Uses binding, not HTTP
		zdr: true, // Data stays in CF network
		timeoutMs: 30000, // 30 seconds
	},
};

// =============================================================================
// TOOL SUPPORT
// =============================================================================

/**
 * Refuse a tool-using call that the chosen model cannot serve.
 *
 * The failure this exists for is quiet: a model that cannot call tools simply
 * returns prose, the loop reads no calls, and the run ends having done nothing.
 * Nothing errors, nothing logs, and the caller believes the model declined.
 *
 * @throws LumenError INVALID_INPUT when the model cannot take the tools at all,
 *         or cannot accept the requested `tool_choice`
 */
export function assertToolSupport(
	task: LumenTask,
	model: string,
	toolChoice?: LumenToolChoice,
): void {
	const capabilities = getModelCapabilities(model);

	if (!capabilities) {
		throw new LumenError(
			`Model "${model}" is not in the registry, so its tool support is unknown. Add it to libs/lumen-registry/src/data/models.json before using it for task "${task}".`,
			"INVALID_INPUT",
			{ task },
		);
	}

	if (!capabilities.supportsTools) {
		throw new LumenError(
			`Model "${model}" cannot call tools, so it cannot serve task "${task}". Pick a model with supportsTools in models.json.`,
			"INVALID_INPUT",
			{ task },
		);
	}

	if (toolChoice === undefined) return;

	const mode = typeof toolChoice === "string" ? toolChoice : "function";

	if (!capabilities.acceptedToolChoices.includes(mode)) {
		throw new LumenError(
			`Model "${model}" does not accept tool_choice "${mode}". It accepts: ${capabilities.acceptedToolChoices.join(", ")}.`,
			"INVALID_INPUT",
			{ task },
		);
	}
}
