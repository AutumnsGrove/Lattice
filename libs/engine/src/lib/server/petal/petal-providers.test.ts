/**
 * Petal inference paths — Together.ai is retired (#1600).
 *
 * Grove's vision inference goes through OpenRouter and Cloudflare Workers AI and
 * nothing else. These tests pin that, so a second SDK, key and error path cannot
 * quietly come back: the cascade, the configs, the error catalog, the env type,
 * and what actually goes over the wire.
 *
 * Mock boundary: global `fetch` and the Workers AI binding.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PETAL_PROVIDERS, PETAL_PROVIDER_CASCADE } from "$lib/platform/config/petal.js";
import { PETAL_ERRORS } from "./errors.js";
import { PetalError, type PetalEnv } from "./types.js";
import { scanImage } from "./index.js";

const REQUEST = {
	image: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
	mimeType: "image/png",
	prompt: "classify this",
};

const OPENROUTER_HOST = "openrouter.ai";

// =============================================================================
// Configuration
// =============================================================================

describe("the provider cascade", () => {
	it("is OpenRouter, then Workers AI", () => {
		// Gemma was the middle entry and left with the model (#1707 follow-up): two
		// providers is the cascade now, and the registry no longer carries it.
		expect([...PETAL_PROVIDER_CASCADE]).toEqual(["openrouter_haiku", "workers_ai_llama4"]);
	});

	it("ends at Cloudflare Workers AI", () => {
		const last = PETAL_PROVIDER_CASCADE[PETAL_PROVIDER_CASCADE.length - 1];
		expect(PETAL_PROVIDERS[last].type).toBe("workers_ai");
	});

	it("only contains inference paths Grove runs: OpenRouter or Workers AI", () => {
		for (const key of PETAL_PROVIDER_CASCADE) {
			const config = PETAL_PROVIDERS[key];
			const isOpenRouter = config.type === "external_api" && key.startsWith("openrouter");
			const isWorkersAi = config.type === "workers_ai";
			expect(isOpenRouter || isWorkersAi, `${key} is neither OpenRouter nor Workers AI`).toBe(true);
		}
	});

	it("has no provider config for Together.ai", () => {
		expect(PETAL_PROVIDERS).not.toHaveProperty("together_ai");
		expect(JSON.stringify(PETAL_PROVIDERS).toLowerCase()).not.toContain("together");
	});

	it("keeps every provider in the cascade that is configured, and the reverse", () => {
		expect(Object.keys(PETAL_PROVIDERS).sort()).toEqual([...PETAL_PROVIDER_CASCADE].sort());
	});

	it("gives each provider a role the type still allows", () => {
		for (const config of Object.values(PETAL_PROVIDERS)) {
			expect(["primary", "fallback"]).toContain(config.role);
		}
	});
});

describe("the error catalog", () => {
	it("has no Together.ai errors", () => {
		expect(Object.keys(PETAL_ERRORS).filter((key) => /together/i.test(key))).toEqual([]);
		for (const error of Object.values(PETAL_ERRORS)) {
			expect(error.adminMessage).not.toMatch(/together/i);
		}
	});

	it("does not reuse the retired codes, so old log lines keep their meaning", () => {
		const codes = Object.values(PETAL_ERRORS).map((error) => error.code);
		expect(codes).not.toContain("PETAL-024");
		expect(codes).not.toContain("PETAL-025");
	});

	it("keeps every code unique", () => {
		const codes = Object.values(PETAL_ERRORS).map((error) => error.code);
		expect(new Set(codes).size).toBe(codes.length);
	});
});

describe("the Petal environment", () => {
	let fetchMock: ReturnType<typeof vi.fn>;
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		fetchMock = vi.fn().mockRejectedValue(new Error("the network must not be used"));
		globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	// Type-level checks cannot guard this: tsconfig excludes *.test.ts from type checking.
	// So prove it at runtime, through the real entry point.
	it("ignores a Together.ai key left behind in the environment", async () => {
		const env = {
			AI: { run: vi.fn().mockRejectedValue(new Error("Workers AI down")) },
			TOGETHER_API_KEY: "left-over-from-before-the-retirement",
		} as unknown as PetalEnv;

		const result = await scanImage(
			{
				imageData: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
				mimeType: "image/png",
				context: "general",
			},
			env,
		);

		// Fails closed, as it must when no provider can scan, and never reaches for the network.
		expect(result.allowed).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

// =============================================================================
// What goes over the wire
// =============================================================================

describe("calling the vision model", () => {
	let fetchMock: ReturnType<typeof vi.fn>;
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		fetchMock = vi.fn();
		globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
		// The circuit breaker is module-level state; start every test with a fresh one.
		vi.resetModules();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	const load = async () => (await import("./vision-client.js")).callVisionModel;
	const hosts = () => fetchMock.mock.calls.map(([url]) => new URL(String(url)).host);
	const failing = () => ({ ok: false, status: 500, text: async () => "boom" });

	it("only ever contacts OpenRouter, even when every provider fails", async () => {
		fetchMock.mockResolvedValue(failing());
		const ai = { run: vi.fn().mockRejectedValue(new Error("down")) } as unknown as Ai;
		const callVisionModel = await load();

		const error = await callVisionModel(REQUEST, { ai, openRouterApiKey: "or-key" }).catch(
			(e) => e,
		);

		// By name, not instanceof: resetModules gives the client its own copy of the class.
		expect((error as PetalError).name).toBe("PetalError");
		expect((error as PetalError).code).toBe("ALL_PROVIDERS_FAILED");
		expect(hosts().length).toBeGreaterThan(0);
		expect(new Set(hosts())).toEqual(new Set([OPENROUTER_HOST]));
	});

	it("names no Together.ai attempt when everything fails", async () => {
		fetchMock.mockResolvedValue(failing());
		const ai = { run: vi.fn().mockRejectedValue(new Error("down")) } as unknown as Ai;
		const callVisionModel = await load();

		const error = (await callVisionModel(REQUEST, { ai, openRouterApiKey: "or-key" }).catch(
			(e) => e,
		)) as PetalError;

		expect(error.message).toContain("openrouter_haiku");
		expect(error.message).toContain("workers_ai_llama4");
		expect(error.message.toLowerCase()).not.toContain("together");
	});

	it("ignores a stale Together.ai key from an old caller", async () => {
		fetchMock.mockResolvedValue(failing());
		const callVisionModel = await load();

		// A caller written before the retirement may still pass the old option.
		const options = { openRouterApiKey: "or-key", togetherApiKey: "stale" } as Parameters<
			typeof callVisionModel
		>[1];
		await callVisionModel(REQUEST, options).catch(() => {});

		expect(hosts().every((host) => host === OPENROUTER_HOST)).toBe(true);
	});

	it("falls through to Workers AI when OpenRouter fails, and stops there", async () => {
		fetchMock.mockResolvedValue(failing());
		const ai = {
			run: vi.fn().mockResolvedValue({ response: '{"category":"appropriate"}' }),
		} as unknown as Ai;
		const callVisionModel = await load();

		const result = await callVisionModel(REQUEST, { ai, openRouterApiKey: "or-key" });

		expect(result.provider).toBe("workers_ai");
		expect(ai.run).toHaveBeenCalledOnce();
	});

	it("does not call OpenRouter at all without a key, and goes straight to Workers AI", async () => {
		const ai = { run: vi.fn().mockResolvedValue({ response: "{}" }) } as unknown as Ai;
		const callVisionModel = await load();

		const result = await callVisionModel(REQUEST, { ai });

		expect(fetchMock).not.toHaveBeenCalled();
		expect(result.provider).toBe("workers_ai");
	});

	it("fails with every provider failed when there is no binding and no key", async () => {
		const callVisionModel = await load();

		const error = (await callVisionModel(REQUEST, {}).catch((e) => e)) as PetalError;

		expect(error.code).toBe("ALL_PROVIDERS_FAILED");
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
