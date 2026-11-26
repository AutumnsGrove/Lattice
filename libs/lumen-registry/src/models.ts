/**
 * Grove's model registry: which models exist, what they cost, and what a given
 * task should use.
 *
 * This is its own package because more than one runtime needs the answer and
 * none of them should carry the engine to get it: Lumen routes with it, the
 * timeline offers pickers from it, Forage and Shutter name models out of it.
 * Before this, seven call sites each held their own model string or price
 * table, and they drifted (#1602).
 *
 * The data is in `src/data/models.json`. Prices and context windows there are
 * facts and are kept true by `src/catalog.ts` against a pinned OpenRouter
 * snapshot; everything else — which model serves which task, quality labels,
 * tool support — is a decision, and lives there as a decision.
 */

import modelData from "./data/models.json";

/** The `tool_choice` shapes a model may accept. `"function"` is a forced call. */
export type ModelToolChoice = "auto" | "required" | "none" | "function";

/** One model as the registry records it. */
export interface ModelEntry {
	id: string;
	name: string;
	category: "generation" | "vision" | "moderation" | "embedding" | "transcription";
	provider: "openrouter" | "cloudflare-ai";
	/** USD per million tokens. */
	cost: { input: number; output: number };
	quality?: "highest" | "high" | "medium";
	speed?: "fast" | "medium" | "slow";
	supportsTools?: boolean;
	toolChoice?: ModelToolChoice[];
	contextWindow?: number;
	/**
	 * Whether a person may pick this model in a settings page.
	 *
	 * A decision, so it lives here rather than being inferred from price or
	 * category: the timeline offers six of them, and a research or code model
	 * being in the registry does not mean it belongs in that list.
	 */
	picker?: boolean;
}

/** The registry keyed by its friendly name. */
export const MODEL_REGISTRY = modelData.models as Record<string, ModelEntry>;

/** Friently key → provider model ID. */
export type ModelKey = keyof typeof modelData.models;

/**
 * Every model, by the name Grove calls it.
 *
 * Derived from the data rather than listed again, so a model added to the file
 * is immediately addressable and one removed from it stops compiling where it
 * was used.
 */
export const MODELS = Object.fromEntries(
	Object.entries(MODEL_REGISTRY).map(([key, model]) => [key, model.id]),
) as Record<ModelKey, string>;

/** One model by its provider ID, or undefined when it is not in the registry. */
export function getModel(model: string): ModelEntry | undefined {
	return Object.values(MODEL_REGISTRY).find((entry) => entry.id === model);
}

/** Cost per million tokens for each model ID. */
export const MODEL_COSTS: Record<string, { input: number; output: number }> = Object.fromEntries(
	Object.values(MODEL_REGISTRY).map((model) => [model.id, model.cost]),
);

/**
 * Cost per million tokens.
 *
 * An unregistered model is priced at $1/$1 rather than zero: a model nobody
 * priced should read as "unknown and expensive", not as free.
 */
export function getModelCost(model: string): { input: number; output: number } {
	return MODEL_COSTS[model] ?? { input: 1.0, output: 1.0 };
}

/**
 * Cost for one request, rounded to six decimals so sub-cent figures do not carry
 * float tails into a ledger.
 */
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
	const costs = getModelCost(model);
	const inputCost = (inputTokens / 1_000_000) * costs.input;
	const outputCost = (outputTokens / 1_000_000) * costs.output;
	return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

/** What a model can do, as the routing layer needs to know it. */
export interface ModelCapabilities {
	id: string;
	/**
	 * Whether the model can call tools at all. Defaults to **false** when the
	 * registry does not say — a model nobody has checked should not be handed a
	 * tool schema and expected to understand it.
	 */
	supportsTools: boolean;
	/**
	 * The `tool_choice` values this model accepts. Absent means `["auto"]`: many
	 * models can decide for themselves but refuse to be forced.
	 */
	acceptedToolChoices: ModelToolChoice[];
	/** Context window in tokens. Null when the concept does not apply (speech). */
	contextWindow: number | null;
}

const CAPABILITIES_BY_ID = new Map<string, ModelCapabilities>(
	Object.values(MODEL_REGISTRY).map((model) => [
		model.id,
		{
			id: model.id,
			supportsTools: model.supportsTools ?? false,
			acceptedToolChoices: model.toolChoice ?? ["auto"],
			contextWindow: model.contextWindow ?? null,
		},
	]),
);

/**
 * What a model can do, or null if it is not in the registry.
 *
 * Null is meaningful: an unregistered model ID is either a typo or a model added
 * to a task without being added to the file, and both should be visible rather
 * than silently treated as tool-capable.
 */
export function getModelCapabilities(model: string): ModelCapabilities | null {
	return CAPABILITIES_BY_ID.get(model) ?? null;
}

/** A model offered in a picker: what a person needs to choose one. */
export interface PickableModel {
	id: string;
	name: string;
	quality: string;
	speed: string;
	inputCostPer1M: number;
	outputCostPer1M: number;
	isDefault: boolean;
}

/**
 * The model a picker starts on: the timeline's default, and the one the
 * "recommended" badge marks.
 */
export const DEFAULT_OPENROUTER_MODEL = MODELS.DEEPSEEK_V4_FLASH_0731;

/**
 * Models a person may choose between: OpenRouter's generative ones, cheapest
 * first so the cost of a choice is visible.
 */
export function listPickableModels(): PickableModel[] {
	return Object.values(MODEL_REGISTRY)
		.filter((model) => model.provider === "openrouter" && model.picker === true)
		.sort((a, b) => a.cost.input - b.cost.input)
		.map((model) => ({
			id: model.id,
			name: model.name,
			quality: model.quality ?? "medium",
			speed: model.speed ?? "medium",
			inputCostPer1M: model.cost.input,
			outputCostPer1M: model.cost.output,
			isDefault: model.id === DEFAULT_OPENROUTER_MODEL,
		}));
}
