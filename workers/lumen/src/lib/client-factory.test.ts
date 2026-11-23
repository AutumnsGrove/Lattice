/**
 * Client Factory Tests
 *
 * Tests LumenClient creation and credential resolution priority:
 * 1. tenantApiKey (BYOK)
 * 2. DEV_OPENROUTER_API_KEY (the local dev stack, which runs no Warden)
 * 3. Warden /resolve (per-tenant → global, via service binding)
 * 4. Empty string (no key available)
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

const mockResolveWardenCredential = vi.hoisted(() => vi.fn());

vi.mock("@autumnsgrove/lattice/ai/lumen", () => ({
	createLumenClient: mockCreateLumenClient,
}));

vi.mock("./warden-client", () => ({
	resolveWardenCredential: mockResolveWardenCredential,
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
		WARDEN_API_KEY: "test-warden-key",
		...overrides,
	};
}

describe("createLumenClientForWorker", () => {
	beforeEach(() => {
		mockCreateLumenClient.mockClear();
		mockResolveWardenCredential.mockReset();
	});

	it("should use tenant API key when provided (BYOK)", async () => {
		const env = createMockEnv();
		await createLumenClientForWorker(env, "tenant-byok-key");

		expect(mockResolveWardenCredential).not.toHaveBeenCalled();
		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({
				openrouterApiKey: "tenant-byok-key",
			}),
		);
	});

	it("should fall back to Warden resolution when no tenant key", async () => {
		mockResolveWardenCredential.mockResolvedValue({
			credential: "warden-resolved-key",
			source: "global",
		});
		const env = createMockEnv();
		await createLumenClientForWorker(env);

		expect(mockResolveWardenCredential).toHaveBeenCalledWith(
			env.WARDEN,
			"test-warden-key",
			"openrouter",
			undefined,
		);
		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({
				openrouterApiKey: "warden-resolved-key",
			}),
		);
	});

	it("should use empty string when Warden resolution returns null", async () => {
		mockResolveWardenCredential.mockResolvedValue(null);
		const env = createMockEnv();
		await createLumenClientForWorker(env);

		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({
				openrouterApiKey: "",
			}),
		);
	});

	it("should pass AI binding to client config", async () => {
		mockResolveWardenCredential.mockResolvedValue(null);
		const mockAI = { run: vi.fn() } as unknown as Ai;
		const env = createMockEnv({ AI: mockAI });
		await createLumenClientForWorker(env);

		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({
				ai: mockAI,
			}),
		);
	});

	it("should pass DB binding to client config", async () => {
		mockResolveWardenCredential.mockResolvedValue(null);
		const mockDB = { prepare: vi.fn() } as unknown as D1Database;
		const env = createMockEnv({ DB: mockDB });
		await createLumenClientForWorker(env);

		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({
				db: mockDB,
			}),
		);
	});

	it("should set enabled to true", async () => {
		mockResolveWardenCredential.mockResolvedValue(null);
		const env = createMockEnv();
		await createLumenClientForWorker(env);

		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({
				enabled: true,
			}),
		);
	});

	it("should use the local dev key when no tenant key is given", async () => {
		const env = createMockEnv({ DEV_OPENROUTER_API_KEY: "dev-local-key" });
		await createLumenClientForWorker(env);

		// The dev stack runs no Warden, so asking it would only fail slowly.
		expect(mockResolveWardenCredential).not.toHaveBeenCalled();
		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({ openrouterApiKey: "dev-local-key" }),
		);
	});

	it("should let a tenant key win over the local dev key", async () => {
		const env = createMockEnv({ DEV_OPENROUTER_API_KEY: "dev-local-key" });
		await createLumenClientForWorker(env, "tenant-byok-key");

		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({ openrouterApiKey: "tenant-byok-key" }),
		);
	});

	it("should prefer tenant key over Warden resolution", async () => {
		mockResolveWardenCredential.mockResolvedValue({
			credential: "warden-key",
			source: "global",
		});
		const env = createMockEnv();
		await createLumenClientForWorker(env, "tenant-preferred");

		expect(mockResolveWardenCredential).not.toHaveBeenCalled();
		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({
				openrouterApiKey: "tenant-preferred",
			}),
		);
	});

	it("should pass tenantId to Warden for per-tenant resolution", async () => {
		mockResolveWardenCredential.mockResolvedValue({
			credential: "tenant-specific-key",
			source: "tenant",
		});
		const env = createMockEnv();
		await createLumenClientForWorker(env, undefined, "tenant-123");

		expect(mockResolveWardenCredential).toHaveBeenCalledWith(
			env.WARDEN,
			"test-warden-key",
			"openrouter",
			"tenant-123",
		);
		expect(mockCreateLumenClient).toHaveBeenCalledWith(
			expect.objectContaining({
				openrouterApiKey: "tenant-specific-key",
			}),
		);
	});
});
