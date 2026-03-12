/**
 * Credential Resolution Tests
 *
 * Tests the tenant → global fallthrough chain, alias resolution,
 * and error handling for missing credentials.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveCredential } from "./credentials";
import { createMockEnv } from "../test-helpers";

// Mock the SecretsManager import to avoid pulling engine deps
vi.mock("@autumnsgrove/lattice/server/secrets-manager", () => {
	const mockSafeGetSecret = vi.fn().mockResolvedValue(null);
	return {
		SecretsManager: vi.fn().mockImplementation(() => ({
			safeGetSecret: mockSafeGetSecret,
		})),
		_mockSafeGetSecret: mockSafeGetSecret,
	};
});

async function getMockSafeGetSecret() {
	const mod = await import("@autumnsgrove/lattice/server/secrets-manager" as string);
	return (mod as any)._mockSafeGetSecret as ReturnType<typeof vi.fn>;
}

describe("resolveCredential", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ── Global fallback ──────────────────────────────────────────────

	it("should resolve global credential when no tenant_id provided", async () => {
		const env = createMockEnv();

		const result = await resolveCredential(env, "github");

		expect(result).toEqual({
			value: env.GITHUB_TOKEN,
			source: "global",
		});
	});

	it("should resolve each service to its correct env binding", async () => {
		const env = createMockEnv();

		expect((await resolveCredential(env, "github"))?.value).toBe(env.GITHUB_TOKEN);
		expect((await resolveCredential(env, "tavily"))?.value).toBe(env.TAVILY_API_KEY);
		expect((await resolveCredential(env, "cloudflare"))?.value).toBe(env.CLOUDFLARE_API_TOKEN);
		expect((await resolveCredential(env, "exa"))?.value).toBe(env.EXA_API_KEY);
		expect((await resolveCredential(env, "resend"))?.value).toBe(env.RESEND_API_KEY);
		expect((await resolveCredential(env, "stripe"))?.value).toBe(env.STRIPE_SECRET_KEY);
		expect((await resolveCredential(env, "openrouter"))?.value).toBe(env.OPENROUTER_API_KEY);
		expect((await resolveCredential(env, "hetzner"))?.value).toBe(env.HETZNER_API_TOKEN);
		expect((await resolveCredential(env, "fly"))?.value).toBe(env.FLY_API_TOKEN);
	});

	it("should return null when global credential is missing", async () => {
		const env = createMockEnv({ GITHUB_TOKEN: "" as any });

		const result = await resolveCredential(env, "github");

		expect(result).toBeNull();
	});

	// ── Tenant credential resolution ────────────────────────────────

	it("should prefer tenant credential over global", async () => {
		const env = createMockEnv();
		const mockGet = await getMockSafeGetSecret();
		mockGet.mockResolvedValueOnce("tenant-github-token");

		const result = await resolveCredential(env, "github", "tenant-123");

		expect(result).toEqual({
			value: "tenant-github-token",
			source: "tenant",
		});
	});

	it("should fall through to global when tenant credential not found", async () => {
		const env = createMockEnv();
		const mockGet = await getMockSafeGetSecret();
		// All aliases return null
		mockGet.mockResolvedValue(null);

		const result = await resolveCredential(env, "github", "tenant-123");

		expect(result).toEqual({
			value: env.GITHUB_TOKEN,
			source: "global",
		});
	});

	it("should try alias chain in order (canonical first)", async () => {
		const env = createMockEnv();
		const mockGet = await getMockSafeGetSecret();

		// First alias (canonical) returns null, second (legacy) returns value
		mockGet.mockResolvedValueOnce(null);
		mockGet.mockResolvedValueOnce("legacy-github-token");

		const result = await resolveCredential(env, "github", "tenant-123");

		expect(result).toEqual({
			value: "legacy-github-token",
			source: "tenant",
		});

		// Should have tried both aliases
		expect(mockGet).toHaveBeenCalledWith("tenant-123", "github_token");
		expect(mockGet).toHaveBeenCalledWith("tenant-123", "timeline_github_token");
	});

	// ── Error handling ──────────────────────────────────────────────

	it("should fall through to global when SecretsManager throws", async () => {
		const env = createMockEnv();
		const mockGet = await getMockSafeGetSecret();
		mockGet.mockRejectedValue(new Error("Decryption failed"));

		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const result = await resolveCredential(env, "github", "tenant-123");

		// Should fall back to global
		expect(result).toEqual({
			value: env.GITHUB_TOKEN,
			source: "global",
		});

		consoleSpy.mockRestore();
	});

	it("should skip tenant resolution when GROVE_KEK is missing", async () => {
		const env = createMockEnv({ GROVE_KEK: "" as any });

		const result = await resolveCredential(env, "github", "tenant-123");

		// Should go straight to global
		expect(result).toEqual({
			value: env.GITHUB_TOKEN,
			source: "global",
		});
	});

	it("should skip tenant resolution when TENANT_DB is missing", async () => {
		const env = createMockEnv({ TENANT_DB: undefined as any });

		const result = await resolveCredential(env, "github", "tenant-123");

		expect(result).toEqual({
			value: env.GITHUB_TOKEN,
			source: "global",
		});
	});
});
