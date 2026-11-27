/**
 * The model catalog: what a model actually is, as opposed to what we decided
 * about it.
 *
 * `src/data/models.json` carries both, which is why it went wrong: prices and
 * context windows change under us, and hand-typing them meant every timeline
 * run's reported cost was wrong in both directions (#1822).
 *
 * So there are two files now:
 *
 * - `src/data/catalog.json` — facts, pinned from OpenRouter by `pnpm
 *   models:refresh`. Committed, so a deploy is reproducible and a check needs no
 *   network.
 * - `src/data/models.json` — the Grove overlay. Still hand-written, because it
 *   is the part that is a decision: which model a task uses, which providers are
 *   approved, what quality label a picker shows. Its `cost`, `contextWindow` and
 *   `maxOutputTokens` are filled in from the catalog by `pnpm models:sync`.
 *
 * `pnpm models:check` fails when the two disagree, and the engine's own test
 * suite asserts the same thing, so CI notices when only the data file changes.
 */

/** OpenRouter's model API. One model's facts live under `/{id}/endpoints`. */
export const CATALOG_URL = "https://openrouter.ai/api/v1/models";

/** One model's prices, per million tokens, in USD. */
export interface ModelPricing {
	input: number;
	output: number;
}

/** A model as the catalog knows it. */
export interface ModelFacts {
	id: string;
	name: string;
	/** Null when no provider publishes one (transcription models). */
	contextWindow: number | null;
	/**
	 * The longest completion any provider will return, null when none says. A
	 * request whose `max_tokens` is over a provider's limit is refused rather
	 * than clamped, which is why the router reads this before sending (#1707).
	 */
	maxOutputTokens: number | null;
	pricing: ModelPricing;
	/**
	 * True when a provider prices by input length or by time of day, so the base
	 * price above is only the first tier. Recorded rather than modelled: a single
	 * number cannot express a tier, and pretending it can is how a reported cost
	 * goes wrong.
	 */
	tiered: boolean;
}

/** The pinned snapshot, and the shape of what `models:refresh` writes. */
export interface Catalog {
	source: string;
	fetchedAt: string;
	models: Record<string, ModelFacts>;
}

/** The subset of the registry this module needs. */
export interface RegistryModel {
	id: string;
	name: string;
	provider: string;
	category?: string;
	cost: ModelPricing;
	contextWindow?: number | null;
	maxOutputTokens?: number | null;
}

export interface Registry {
	models: Record<string, RegistryModel>;
}

/** One disagreement between the overlay and the catalog. */
export interface Drift {
	name: string;
	id: string;
	field: string;
	registry: string;
	catalog: string;
}

interface OpenRouterEndpoint {
	provider_name?: string;
	context_length?: number | null;
	max_completion_tokens?: number | null;
	pricing?: {
		prompt?: string;
		completion?: string;
		/** Present when a provider prices by input length or time of day. */
		overrides?: unknown[];
	};
}

/** Prices arrive per token as strings; Grove reports per million tokens. */
function perMillion(perToken: string | undefined): number {
	const value = Number(perToken ?? "");
	if (!Number.isFinite(value)) {
		return 0;
	}
	// Six places keeps sub-cent accuracy without leaving float tails behind.
	return Math.round(value * 1_000_000 * 1e6) / 1e6;
}

/**
 * Whether OpenRouter can price this model.
 *
 * Every model Grove routes through OpenRouter, embeddings included — they are
 * carried by OpenRouter, just absent from the model *list*.
 */
function catalogCovers(model: RegistryModel): boolean {
	return model.provider === "openrouter";
}

/** The models the overlay routes through OpenRouter, which is what the catalog covers. */
export function openRouterIds(registry: Registry): string[] {
	return Object.values(registry.models)
		.filter(catalogCovers)
		.map((model) => model.id);
}

/** Where one model's own pricing and limits live. */
export function endpointsUrl(id: string): string {
	return `${CATALOG_URL}/${id}/endpoints`;
}

function money(value: number): string {
	return `$${value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}/M`;
}

/**
 * A model's facts, from its own `/models/{id}/endpoints` response.
 *
 * Not from `/api/v1/models`: that list carries one price per model — usually the
 * model owner's — while OpenRouter may route the same id to dozens of providers
 * at very different prices. `deepseek-v4.1-flash-1017` is listed at $0.15/$0.60
 * and served from $0.04/$0.10, so the list made every run look several times
 * more expensive than it was.
 *
 * The choices, and why:
 *
 * - **Price**: the cheapest published pair, output compared first because output
 *   is the expensive axis, and both numbers from the *same* provider — mixing
 *   one provider's lowest input with another's lowest output would describe a
 *   price nobody offers.
 * - **Context window and completion ceiling**: the largest any provider offers.
 *   OpenRouter filters providers by what the request needs, so the number to
 *   compare against is the model's, not the weakest provider's.
 * - **Tiered**: true if any provider prices by input length or time of day. One
 *   number cannot express a tier; the flag says so rather than pretending.
 *
 * A model with no endpoints is one OpenRouter has dropped, which is worth
 * stopping for.
 */
export function parseModelFacts(id: string, payload: unknown): ModelFacts {
	const data = (
		payload as {
			data?: { id?: string; name?: string; endpoints?: OpenRouterEndpoint[] };
		}
	)?.data;
	const endpoints = data?.endpoints;

	if (!Array.isArray(endpoints) || endpoints.length === 0) {
		throw new Error(`OpenRouter no longer lists ${id}: its endpoints response is empty`);
	}

	const priced = endpoints
		.filter((endpoint) => typeof endpoint.pricing?.completion === "string")
		.map((endpoint) => ({
			input: perMillion(endpoint.pricing?.prompt),
			output: perMillion(endpoint.pricing?.completion),
		}))
		.sort((a, b) => a.output - b.output || a.input - b.input);

	const windows = endpoints
		.map((endpoint) => endpoint.context_length)
		.filter((value): value is number => typeof value === "number");
	const ceilings = endpoints
		.map((endpoint) => endpoint.max_completion_tokens)
		.filter((value): value is number => typeof value === "number");

	return {
		id,
		name: data?.name ?? id,
		contextWindow: windows.length > 0 ? Math.max(...windows) : null,
		maxOutputTokens: ceilings.length > 0 ? Math.max(...ceilings) : null,
		pricing: priced[0] ?? { input: 0, output: 0 },
		tiered: endpoints.some((endpoint) => (endpoint.pricing?.overrides?.length ?? 0) > 0),
	};
}

/**
 * Every place the overlay disagrees with the catalog.
 *
 * A model with no catalog entry is drift too: it cannot be priced from facts,
 * which is how the wrong numbers got in.
 */
export function findDrift(registry: Registry, catalog: Catalog): Drift[] {
	const drift: Drift[] = [];

	for (const [name, model] of Object.entries(registry.models)) {
		if (!catalogCovers(model)) {
			continue;
		}

		const facts = catalog.models[model.id];
		if (facts === undefined) {
			drift.push({
				name,
				id: model.id,
				field: "catalog entry",
				registry: "missing",
				catalog: "—",
			});
			continue;
		}

		const pairs: Array<[string, number, number]> = [
			["cost.input", model.cost.input, facts.pricing.input],
			["cost.output", model.cost.output, facts.pricing.output],
		];

		for (const [field, ours, theirs] of pairs) {
			if (Math.abs(ours - theirs) > 1e-9) {
				drift.push({
					name,
					id: model.id,
					field,
					registry: money(ours),
					catalog: money(theirs),
				});
			}
		}

		if (facts.contextWindow !== null && model.contextWindow !== facts.contextWindow) {
			drift.push({
				name,
				id: model.id,
				field: "contextWindow",
				registry: String(model.contextWindow ?? "unset"),
				catalog: String(facts.contextWindow),
			});
		}

		if (facts.maxOutputTokens !== null && model.maxOutputTokens !== facts.maxOutputTokens) {
			drift.push({
				name,
				id: model.id,
				field: "maxOutputTokens",
				registry: String(model.maxOutputTokens ?? "unset"),
				catalog: String(facts.maxOutputTokens),
			});
		}
	}

	return drift;
}

/** The overlay with its catalog-backed fields filled in from `catalog`. */
export function applyCatalog(registry: Registry, catalog: Catalog): Registry {
	const models: Record<string, RegistryModel> = {};

	for (const [name, model] of Object.entries(registry.models)) {
		const facts = catalogCovers(model) ? catalog.models[model.id] : undefined;

		models[name] =
			facts === undefined
				? model
				: {
						...model,
						cost: { ...facts.pricing },
						...(facts.contextWindow !== null && { contextWindow: facts.contextWindow }),
						...(facts.maxOutputTokens !== null && { maxOutputTokens: facts.maxOutputTokens }),
					};
	}

	return { ...registry, models };
}

/**
 * The overlay, in the style a person wrote it in: two-space indent, with `cost`
 * and `toolChoice` kept on one line.
 *
 * `models:sync` changes a few numbers per model. Re-serializing the whole file
 * would reformat every line and bury those numbers in the diff, which is the
 * opposite of what a reviewer needs when the change is "this price is wrong".
 */
export function formatRegistryJson(registry: Registry): string {
	const text = JSON.stringify(registry, null, 2)
		.replace(
			/("cost": )\{\n\s+"input": ([0-9.e+-]+),\n\s+"output": ([0-9.e+-]+)\n\s+\}/g,
			'$1{ "input": $2, "output": $3 }',
		)
		.replace(
			/("toolChoice": )\[\n((?:\s+"[^"]*",?\n)+)\s+\]/g,
			(_match, key: string, body: string) => {
				const values = body
					.split("\n")
					.map((line) => line.trim().replace(/,$/, ""))
					.filter((line) => line !== "");
				return `${key}[${values.join(", ")}]`;
			},
		);

	return `${text}\n`;
}

/** A drift report a person can read in a failing job or an issue body. */
export function describeDrift(drift: Drift[]): string {
	const lines = drift.map(
		(item) =>
			`- ${item.name} (${item.id}) ${item.field}: registry ${item.registry}, catalog ${item.catalog}`,
	);
	return [
		`${drift.length} model ${drift.length === 1 ? "fact disagrees" : "facts disagree"} with the catalog:`,
		"",
		...lines,
		"",
		"Run `pnpm models:sync` to take the catalog's numbers, then review the diff.",
	].join("\n");
}
