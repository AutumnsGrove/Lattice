import { describe, expect, it } from "vitest";
import catalogData from "./data/catalog.json";
import registryData from "./data/models.json";
import {
	applyCatalog,
	findDrift,
	formatRegistryJson,
	missingFromList,
	parseCatalog,
	parseEndpointFacts,
} from "./catalog.js";
import type { Catalog, Registry } from "./catalog.js";

/** A slice of OpenRouter's response shape, prices as per-token strings. */
function payload(): unknown {
	return {
		data: [
			{
				id: "deepseek/deepseek-v4.1-flash",
				name: "DeepSeek V4.1 Flash",
				context_length: 1_048_576,
				pricing: { prompt: "0.0000000507", completion: "0.0000002028" },
			},
			{
				id: "anthropic/claude-haiku-5.5",
				name: "Claude Haiku 5.5",
				context_length: 1_000_000,
				pricing: {
					prompt: "0.0000001",
					completion: "0.0000005",
					overrides: [{ min_prompt_tokens: 100_000, prompt: "0.0000005" }],
				},
			},
			{
				id: "unused/other-model",
				name: "Not ours",
				context_length: 10,
				pricing: { prompt: "1", completion: "1" },
			},
		],
	};
}

function registry(overrides: Partial<Registry["models"][string]> = {}): Registry {
	return {
		models: {
			DEEPSEEK: {
				id: "deepseek/deepseek-v4.1-flash",
				name: "DeepSeek V4.1 Flash",
				category: "generation",
				provider: "openrouter",
				cost: { input: 0.0507, output: 0.2028 },
				contextWindow: 1_048_576,
				...overrides,
			},
			LOCAL: {
				id: "@cf/meta/llama-4-scout-17b-16e-instruct",
				name: "Llama 4 Scout",
				category: "vision",
				provider: "cloudflare-ai",
				cost: { input: 0, output: 0 },
				contextWindow: 131_072,
			},
			EMBED: {
				id: "baai/bge-m3",
				name: "BGE M3",
				category: "embedding",
				provider: "openrouter",
				cost: { input: 0.01, output: 0 },
				contextWindow: 8192,
			},
		},
	};
}

const fetchedAt = "2026-11-26T00:00:00.000Z";

describe("parseCatalog", () => {
	it("keeps only the models the registry routes", () => {
		const catalog = parseCatalog(payload(), ["deepseek/deepseek-v4.1-flash"], fetchedAt);

		expect(Object.keys(catalog.models)).toEqual(["deepseek/deepseek-v4.1-flash"]);
		expect(catalog.fetchedAt).toBe(fetchedAt);
	});

	it("turns per-token strings into prices per million tokens", () => {
		const catalog = parseCatalog(payload(), ["deepseek/deepseek-v4.1-flash"], fetchedAt);

		// $0.0000000507 per token is $0.0507 per million — the number a run's cost
		// is reported from.
		expect(catalog.models["deepseek/deepseek-v4.1-flash"].pricing).toEqual({
			input: 0.0507,
			output: 0.2028,
		});
	});

	it("records tiered pricing instead of flattening it silently", () => {
		const catalog = parseCatalog(payload(), ["anthropic/claude-haiku-5.5"], fetchedAt);

		expect(catalog.models["anthropic/claude-haiku-5.5"].tiered).toBe(true);
	});

	it("can skip the ids the list does not carry", () => {
		const catalog = parseCatalog(
			payload(),
			["deepseek/deepseek-v4.1-flash", "baai/bge-m3"],
			fetchedAt,
			{
				missing: "skip",
			},
		);

		expect(Object.keys(catalog.models)).toEqual(["deepseek/deepseek-v4.1-flash"]);
	});

	it("refuses a model OpenRouter no longer lists", () => {
		expect(() => parseCatalog(payload(), ["deepseek/removed-model"], fetchedAt)).toThrow(
			/OpenRouter no longer lists deepseek\/removed-model/,
		);
	});

	it("refuses a response that is not the catalog", () => {
		expect(() => parseCatalog({ nope: true }, [], fetchedAt)).toThrow(/no data array/);
	});
});

describe("findDrift", () => {
	const catalog = parseCatalog(payload(), ["deepseek/deepseek-v4.1-flash"], fetchedAt);

	it("says nothing when the overlay agrees", () => {
		expect(findDrift({ models: { DEEPSEEK: registry().models.DEEPSEEK } }, catalog)).toEqual([]);
	});

	it("reports a wrong price in the direction it is wrong", () => {
		const drift = findDrift(
			{
				models: { DEEPSEEK: { ...registry().models.DEEPSEEK, cost: { input: 0.03, output: 0.2 } } },
			},
			catalog,
		);

		expect(drift).toEqual([
			{
				name: "DEEPSEEK",
				id: "deepseek/deepseek-v4.1-flash",
				field: "cost.input",
				registry: "$0.03/M",
				catalog: "$0.0507/M",
			},
			{
				name: "DEEPSEEK",
				id: "deepseek/deepseek-v4.1-flash",
				field: "cost.output",
				registry: "$0.2/M",
				catalog: "$0.2028/M",
			},
		]);
	});

	it("reports a context window the registry understates", () => {
		const drift = findDrift(
			{ models: { DEEPSEEK: { ...registry().models.DEEPSEEK, contextWindow: 128_000 } } },
			catalog,
		);

		expect(drift).toHaveLength(1);
		expect(drift[0]).toMatchObject({
			field: "contextWindow",
			registry: "128000",
			catalog: "1048576",
		});
	});

	it("reports a model with no catalog entry rather than pricing it from nothing", () => {
		const drift = findDrift(
			{ models: { DEEPSEEK: { ...registry().models.DEEPSEEK, id: "deepseek/unknown" } } },
			catalog,
		);

		expect(drift).toEqual([
			{
				name: "DEEPSEEK",
				id: "deepseek/unknown",
				field: "catalog entry",
				registry: "missing",
				catalog: "—",
			},
		]);
	});

	it("leaves a provider the catalog does not cover alone", () => {
		// Cloudflare models are priced by the provider's own allowance, so there is
		// nothing to compare them against.
		expect(findDrift({ models: { LOCAL: registry().models.LOCAL } }, catalog)).toEqual([]);
	});

	it("reports an embedding with no catalog entry too", () => {
		// Embeddings are covered now — from each model's own endpoints response — so a
		// missing entry is drift, not an exemption.
		const drift = findDrift({ models: { EMBED: registry().models.EMBED } }, catalog);

		expect(drift).toEqual([
			{
				name: "EMBED",
				id: "baai/bge-m3",
				field: "catalog entry",
				registry: "missing",
				catalog: "—",
			},
		]);
	});
});

describe("applyCatalog", () => {
	const catalog = parseCatalog(payload(), ["deepseek/deepseek-v4.1-flash"], fetchedAt);

	it("fills cost and context window, and changes nothing else", () => {
		const before = {
			models: { DEEPSEEK: { ...registry().models.DEEPSEEK, contextWindow: 128_000 } },
		};
		const after = applyCatalog(before, catalog);

		expect(after.models.DEEPSEEK.cost).toEqual({ input: 0.0507, output: 0.2028 });
		expect(after.models.DEEPSEEK.contextWindow).toBe(1_048_576);
		// The decision stays hand-written.
		expect(after.models.DEEPSEEK.provider).toBe("openrouter");
		expect(after.models.DEEPSEEK.name).toBe("DeepSeek V4.1 Flash");
	});

	it("does not touch a provider the catalog lacks", () => {
		const before = registry().models.LOCAL;
		const after = applyCatalog(
			{ models: { LOCAL: before } },
			parseCatalog(payload(), [], fetchedAt),
		);

		expect(after.models.LOCAL).toEqual(before);
	});
});

describe("formatRegistryJson", () => {
	it("keeps the file in the style it was written in", () => {
		const text = formatRegistryJson({
			models: {
				ONE: {
					id: "one/model",
					name: "One",
					category: "generation",
					provider: "openrouter",
					cost: { input: 0.15, output: 0.6 },
					toolChoice: ["auto", "none"],
					contextWindow: 131_072,
				},
			},
		} as Registry);

		// Two-space indent, with cost and toolChoice on one line, so `models:sync`
		// shows the numbers it changed and nothing else.
		expect(text).toContain('  "models": {\n    "ONE": {');
		expect(text).toContain('"cost": { "input": 0.15, "output": 0.6 }');
		expect(text).toContain('"toolChoice": ["auto", "none"]');
		expect(text.endsWith("}\n")).toBe(true);
	});
});

describe("the committed files", () => {
	it("agree: every price and window in the registry came from the catalog", () => {
		// This is the guard, and it runs where the data lives: a change to
		// models.json alone is an engine change, so CI runs this even when no
		// script moved (#1822). `pnpm models:check` is the same check by hand.
		expect(findDrift(registryData as Registry, catalogData as Catalog)).toEqual([]);
	});

	it("cover every OpenRouter model the registry routes, and nothing else", () => {
		const registry2 = registryData as Registry;
		const routed = Object.values(registry2.models)
			.filter((model) => model.provider === "openrouter")
			.map((model) => model.id)
			.sort();

		expect(Object.keys((catalogData as Catalog).models).sort()).toEqual(routed);
	});
});

describe("models the list endpoint does not carry", () => {
	/** A slice of `/models/{id}/endpoints`: one id, several providers. */
	function endpointsPayload(): unknown {
		return {
			data: {
				id: "baai/bge-m3",
				name: "BAAI: bge-m3",
				endpoints: [
					{
						provider_name: "Parasail",
						context_length: 8194,
						max_completion_tokens: 7374,
						pricing: { prompt: "0.00000001", completion: "0" },
					},
					{
						provider_name: "DeepInfra",
						context_length: 8192,
						max_completion_tokens: 7372,
						pricing: { prompt: "0.00000002", completion: "0" },
					},
				],
			},
		};
	}

	it("finds the ids the list omits", () => {
		const missing = missingFromList(payload(), ["deepseek/deepseek-v4.1-flash", "baai/bge-m3"]);

		expect(missing).toEqual(["baai/bge-m3"]);
	});

	it("takes the smallest window and the highest price across providers", () => {
		// Never claim more context than every provider offers, never under-report what
		// a run cost: both wrong directions are invisible afterwards.
		const facts = parseEndpointFacts("baai/bge-m3", endpointsPayload());

		expect(facts.contextWindow).toBe(8192);
		expect(facts.pricing).toEqual({ input: 0.02, output: 0 });
		// An embedding has no completion to limit.
		expect(facts.maxOutputTokens).toBeNull();
	});

	it("refuses a model OpenRouter has dropped", () => {
		expect(() => parseEndpointFacts("baai/bge-m3", { data: { endpoints: [] } })).toThrow(
			/no longer lists baai\/bge-m3/,
		);
	});
});
