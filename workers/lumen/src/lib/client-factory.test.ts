/**
 * Client Factory Tests
 *
 * Tests LumenClient creation and credential resolution priority:
 * 1. tenantApiKey (BYOK)
 * 2. env.OPENROUTER_API_KEY (worker fallback)
 * 3. Empty string (no key available)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted runs before vi.mock hoisting, so the mock fn is available
// when the factory function executes.
const mockCreateLumenClient = vi.hoisted(() =>
	vi.fn().mockReturnValue({
		run: vi.fn(),
		embed: vi.fn(),
		moderate: vi.fn(),
		transcribe: vi.fn(),
		isEnabled: vi.fn().mockReturnValue(true),
	}),
);

vi.mock("@autumnsgrove/lattice/lumen", () => ({
	createLumenClient: mockCreateLumenClient,
}));

import { createLumenClientForWorker } from "./client-factory";
import type { Env } from "../types";

function createMockEnv(overrides: Partial<Env> = {}): Env {
	return {
		DB: {} as D1Database,
		AI: {} as Ai,
		WARDEN: { fetch: vi.fn() },
		RATE_LIMITS: {} as KVNamespace,
		LUMEN_API_KEY: "test-key",
		...overrides,
	};
}

describe("createLumenClientForWorker", () => {
	beforeEach(() => {
		mockCreateLumenClient.mockClear();
	});

	it("should use tenant API key when provided (BYOK)", () => {
		const env = createMockEnv({ OPENROUTER_API_KEY: "env-key" });
		createLumenClientForWorker(env, "tenant-byok-key");

		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({
				openrouterApiKey: "tenant-byok-key",
			}),
		);
	});

	it("should fall back to env.OPENROUTER_API_KEY when no tenant key", () => {
		const env = createMockEnv({ OPENROUTER_API_KEY: "env-key" });
		createLumenClientForWorker(env);

		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({
				openrouterApiKey: "env-key",
			}),
		);
	});

	it("should use empty string when no keys available", () => {
		const env = createMockEnv();
		createLumenClientForWorker(env);

		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({
				openrouterApiKey: "",
			}),
		);
	});

	it("should pass AI binding to client config", () => {
		const mockAI = { run: vi.fn() } as unknown as Ai;
		const env = createMockEnv({ AI: mockAI });
		createLumenClientForWorker(env);

		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({
				ai: mockAI,
			}),
		);
	});

	it("should pass DB binding to client config", () => {
		const mockDB = { prepare: vi.fn() } as unknown as D1Database;
		const env = createMockEnv({ DB: mockDB });
		createLumenClientForWorker(env);

		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({
				db: mockDB,
			}),
		);
	});

	it("should set enabled to true", () => {
		const env = createMockEnv();
		createLumenClientForWorker(env);

		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({
				enabled: true,
			}),
		);
	});

	it("should prefer tenant key over env key", () => {
		const env = createMockEnv({ OPENROUTER_API_KEY: "env-fallback" });
		createLumenClientForWorker(env, "tenant-preferred");

		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({
				openrouterApiKey: "tenant-preferred",
			}),
		);
	});
});
