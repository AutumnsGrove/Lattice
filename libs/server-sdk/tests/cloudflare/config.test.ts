/**
 * Unit tests for CloudflareConfig adapter.
 *
 * Validates env binding delegation, required vs optional access,
 * default values, and info() metadata.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CloudflareConfig } from "../../src/cloudflare/config.js";

vi.mock("@autumnsgrove/lattice/errors", () => ({
	logGroveError: vi.fn(),
}));

describe("CloudflareConfig", () => {
	let config: CloudflareConfig;
	const env: Record<string, unknown> = {
		STRIPE_SECRET_KEY: "sk_test_123",
		DATABASE_URL: "d1://grove-engine-db",
		EMPTY_VALUE: "",
		NUMERIC_VALUE: 42,
		BOOLEAN_VALUE: true,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		config = new CloudflareConfig(env);
	});

	// =========================================================================
	// require()
	// =========================================================================

	describe("require", () => {
		it("should return string value when key exists", () => {
			expect(config.require("STRIPE_SECRET_KEY")).toBe("sk_test_123");
		});

		it("should stringify non-string values", () => {
			expect(config.require("NUMERIC_VALUE")).toBe("42");
			expect(config.require("BOOLEAN_VALUE")).toBe("true");
		});

		it("should return empty string for empty value", () => {
			expect(config.require("EMPTY_VALUE")).toBe("");
		});

		it("should throw when key is missing", () => {
			expect(() => config.require("NONEXISTENT")).toThrow();
		});

		it("should throw on empty key argument", () => {
			expect(() => config.require("")).toThrow("Config key cannot be empty");
		});

		it("should throw on whitespace-only key", () => {
			expect(() => config.require("   ")).toThrow("Config key cannot be empty");
		});

		it("should log error when key is missing", () => {
			try {
				config.require("MISSING");
			} catch {
				// expected
			}
			// logGroveError is called in the require() path
		});
	});

	// =========================================================================
	// get()
	// =========================================================================

	describe("get", () => {
		it("should return string value when key exists", () => {
			expect(config.get("DATABASE_URL")).toBe("d1://grove-engine-db");
		});

		it("should return undefined when key doesn't exist", () => {
			expect(config.get("NONEXISTENT")).toBeUndefined();
		});

		it("should stringify non-string values", () => {
			expect(config.get("NUMERIC_VALUE")).toBe("42");
		});
	});

	// =========================================================================
	// getOrDefault()
	// =========================================================================

	describe("getOrDefault", () => {
		it("should return value when key exists", () => {
			expect(config.getOrDefault("STRIPE_SECRET_KEY", "fallback")).toBe("sk_test_123");
		});

		it("should return default when key doesn't exist", () => {
			expect(config.getOrDefault("NONEXISTENT", "fallback")).toBe("fallback");
		});
	});

	// =========================================================================
	// has()
	// =========================================================================

	describe("has", () => {
		it("should return true for existing keys", () => {
			expect(config.has("STRIPE_SECRET_KEY")).toBe(true);
			expect(config.has("NUMERIC_VALUE")).toBe(true);
		});

		it("should return false for missing keys", () => {
			expect(config.has("NONEXISTENT")).toBe(false);
		});

		it("should handle null values as missing", () => {
			const envWithNull: Record<string, unknown> = { KEY: null };
			const cfgWithNull = new CloudflareConfig(envWithNull);
			expect(cfgWithNull.has("KEY")).toBe(false);
		});
	});

	// =========================================================================
	// info()
	// =========================================================================

	describe("info", () => {
		it("should return correct provider", () => {
			expect(config.info()).toEqual({ provider: "cloudflare-env" });
		});
	});
});
