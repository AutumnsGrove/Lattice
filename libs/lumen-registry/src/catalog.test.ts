import { describe, expect, it } from "vitest";
import catalogData from "./data/catalog.json";
import registryData from "./data/models.json";
import { applyCatalog, findDrift, formatRegistryJson, parseModelFacts } from "./catalog.js";
import type { Catalog, Registry } from "./catalog.js";

/**
 * A slice of `/models/{id}/endpoints`: one model, several providers, each with
 * its own price and limits. That spread is the whole point — the model *list*
 * publishes one price, and it is usually the model owner's.
 */
function payload(overrides: Record<string, unknown> = {}): unknown {
	return {
		data: {
			id: "deepseek/deepseek-v4.1-flash-1017",
			name: "DeepSeek: DeepSeek V4.1 Flash 1017",
			endpoints: [
				{
					provider_name: "Expensive",
					context_length: 1_048_576,
					max_completion_tokens: 393_216,
					pricing: { prompt: "0.00000015", completion: "0.0000006" },
				},
				{
					provider_name: "Cheap",
					context_length: 1_048_576,
					max_completion_tokens: 393_216,
					pricing: { prompt: "0.00000004", completion: "0.0000001" },
				},
				{
					provider_name: "Small window",
					context_length: 262_144,
					max_completion_tokens: 32_768,
					pricing: { prompt: "0.00000005", completion: "0.0000002" },
				},
			],
			...overrides,
		},
	};
}

function registry(overrides: Partial<Registry["models"][string]> = {}): Registry {
	return {
		models: {
			FLASH: {
				id: "deepseek/deepseek-v4.1-flash-1017",
				name: "DeepSeek V4.1 Flash 1017",
				category: "generation",
				provider: "openrouter",
				cost: { input: 0.04, output: 0.1 },
				contextWindow: 1_048_576,
				maxOutputTokens: 393_216,
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
		},
	};
}

const id = "deepseek/deepseek-v4.1-flash-1017";

/** One model's facts, wrapped as the catalog `findDrift` and `applyCatalog` read. */
function catalogOf(facts = parseModelFacts(id, payload())): Catalog {
	return { source: "test", fetchedAt: "2026-11-26T00:00:00.000Z", models: { [id]: facts } };
}

describe("parseModelFacts", () => {
	it("takes the cheapest provider's pair, not the model owner's price", () => {
		// $0.15/$0.60 is what the list advertises; $0.04/$0.10 is what OpenRouter
		// serves it from.
		const facts = parseModelFacts(id, payload());

		expect(facts.pricing).toEqual({ input: 0.04, output: 0.1 });
	});

	it("keeps both numbers from the same provider", () => {
		// The cheapest *output* wins, and its input comes along: mixing the lowest
		// input with a different provider's lowest output would describe a price
		// nobody offers.
		const facts = parseModelFacts(
			id,
			payload({
				endpoints: [
					{ pricing: { prompt: "0.00000001", completion: "0.0000009" } },
					{ pricing: { prompt: "0.00000006", completion: "0.0000002" } },
				],
			}),
		);

		expect(facts.pricing).toEqual({ input: 0.06, output: 0.2 });
	});

	it("takes the largest window and ceiling any provider offers", () => {
		// Routing filters providers by what the request needs, so the number to
		// compare against is the model's, not the weakest provider's.
		const facts = parseModelFacts(id, payload());

		expect(facts.contextWindow).toBe(1_048_576);
		expect(facts.maxOutputTokens).toBe(393_216);
	});

	it("records tiered pricing instead of flattening it silently", () => {
		const facts = parseModelFacts(
			id,
			payload({
				endpoints: [
					{
						pricing: {
							prompt: "0.0000001",
							completion: "0.0000005",
							overrides: [{ min_prompt_tokens: 100_000 }],
						},
					},
				],
			}),
		);

		expect(facts.tiered).toBe(true);
	});

	it("has no window for a model that does not publish one", () => {
		const facts = parseModelFacts(
			"@cf/openai/whisper",
			payload({ endpoints: [{ pricing: { prompt: "0", completion: "0" } }] }),
		);

		expect(facts.contextWindow).toBeNull();
		expect(facts.maxOutputTokens).toBeNull();
	});

	it("refuses a model OpenRouter has dropped", () => {
		expect(() => parseModelFacts(id, { data: { endpoints: [] } })).toThrow(
			/OpenRouter no longer lists deepseek\/deepseek-v4.1-flash-1017/,
		);
	});
});

describe("findDrift", () => {
	const catalog = catalogOf();

	it("says nothing when the overlay agrees", () => {
		expect(findDrift({ models: { FLASH: registry().models.FLASH } }, catalog)).toEqual([]);
	});

	it("reports a model priced from the list instead of the providers", () => {
		const drift = findDrift(
			{ models: { FLASH: { ...registry().models.FLASH, cost: { input: 0.15, output: 0.6 } } } },
			catalog,
		);

		expect(drift).toEqual([
			{
				name: "FLASH",
				id,
				field: "cost.input",
				registry: "$0.15/M",
				catalog: "$0.04/M",
			},
			{
				name: "FLASH",
				id,
				field: "cost.output",
				registry: "$0.6/M",
				catalog: "$0.1/M",
			},
		]);
	});

	it("reports a context window the registry understates", () => {
		const drift = findDrift(
			{ models: { FLASH: { ...registry().models.FLASH, contextWindow: 128_000 } } },
			catalog,
		);

		expect(drift).toHaveLength(1);
		expect(drift[0]).toMatchObject({
			field: "contextWindow",
			registry: "128000",
			catalog: "1048576",
		});
	});

	it("reports a completion ceiling the registry does not have", () => {
		const drift = findDrift(
			{ models: { FLASH: { ...registry().models.FLASH, maxOutputTokens: undefined } } },
			catalog,
		);

		expect(drift).toHaveLength(1);
		expect(drift[0]).toMatchObject({ field: "maxOutputTokens", registry: "unset" });
	});

	it("reports a model with no catalog entry rather than pricing it from nothing", () => {
		const drift = findDrift(
			{ models: { FLASH: { ...registry().models.FLASH, id: "deepseek/unknown" } } },
			catalog,
		);

		expect(drift).toEqual([
			{
				name: "FLASH",
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
});

describe("applyCatalog", () => {
	const catalog = catalogOf();

	it("fills price, window and ceiling, and changes nothing else", () => {
		const before = {
			models: {
				FLASH: {
					...registry().models.FLASH,
					cost: { input: 0.15, output: 0.6 },
					contextWindow: 128_000,
					maxOutputTokens: undefined,
				},
			},
		};
		const after = applyCatalog(before, catalog);

		expect(after.models.FLASH.cost).toEqual({ input: 0.04, output: 0.1 });
		expect(after.models.FLASH.contextWindow).toBe(1_048_576);
		expect(after.models.FLASH.maxOutputTokens).toBe(393_216);
		// The decision stays hand-written.
		expect(after.models.FLASH.provider).toBe("openrouter");
		expect(after.models.FLASH.name).toBe("DeepSeek V4.1 Flash 1017");
	});

	it("does not touch a provider the catalog lacks", () => {
		const before = registry().models.LOCAL;
		const after = applyCatalog({ models: { LOCAL: before } }, catalog);

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
					cost: { input: 0.04, output: 0.1 },
					toolChoice: ["auto", "none"],
					contextWindow: 131_072,
				},
			},
		} as Registry);

		// Two-space indent, with cost and toolChoice on one line, so `models:sync`
		// shows the numbers it changed and nothing else.
		expect(text).toContain('  "models": {\n    "ONE": {');
		expect(text).toContain('"cost": { "input": 0.04, "output": 0.1 }');
		expect(text).toContain('"toolChoice": ["auto", "none"]');
		expect(text.endsWith("}\n")).toBe(true);
	});
});

describe("the committed files", () => {
	it("agree: every price, window and ceiling in the registry came from the catalog", () => {
		// This is the guard, and it runs where the data lives: a change to
		// models.json alone is an engine change, so CI runs this even when no script
		// moved (#1822). `pnpm models:check` is the same check by hand.
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

	it("prices a model from its providers, not from the list's one number", () => {
		// The regression this pins: recording the model owner's price made the
		// timeline's agent runs look several times more expensive than they were.
		const catalog = catalogData as Catalog;
		const flash = catalog.models["deepseek/deepseek-v4.1-flash-1017"];

		expect(flash.pricing.input).toBeLessThan(0.1);
		expect(flash.pricing.output).toBeLessThan(0.3);
	});
});
