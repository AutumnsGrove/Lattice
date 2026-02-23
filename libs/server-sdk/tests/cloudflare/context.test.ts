/**
 * Unit tests for createCloudflareContext.
 *
 * Validates binding validation, adapter wiring,
 * and error handling during context initialization.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createCloudflareContext } from "../../src/cloudflare/index.js";
import { createMockD1, createMockR2, createMockKVNamespace, createMockFetcher } from "./helpers.js";

vi.mock("@autumnsgrove/lattice/errors", () => ({
	logGroveError: vi.fn(),
}));

describe("createCloudflareContext", () => {
	let validOptions: Parameters<typeof createCloudflareContext>[0];

	beforeEach(() => {
		vi.clearAllMocks();
		validOptions = {
			db: createMockD1() as unknown as D1Database,
			storage: createMockR2() as unknown as R2Bucket,
			kv: createMockKVNamespace() as unknown as KVNamespace,
			services: {
				auth: createMockFetcher() as unknown as Fetcher,
			},
			env: {
				STRIPE_SECRET_KEY: "sk_test_123",
				NODE_ENV: "development",
			},
			dbName: "grove-engine-db",
			bucketName: "grove-media",
			kvNamespace: "CACHE_KV",
		};
	});

	// =========================================================================
	// Happy Path
	// =========================================================================

	describe("context creation", () => {
		it("should create a context with all 6 services", () => {
			const ctx = createCloudflareContext(validOptions);

			expect(ctx.db).toBeDefined();
			expect(ctx.storage).toBeDefined();
			expect(ctx.kv).toBeDefined();
			expect(ctx.services).toBeDefined();
			expect(ctx.scheduler).toBeDefined();
			expect(ctx.config).toBeDefined();
		});

		it("should wire database adapter with correct name", () => {
			const ctx = createCloudflareContext(validOptions);
			expect(ctx.db.info().provider).toBe("cloudflare-d1");
			expect(ctx.db.info().database).toBe("grove-engine-db");
		});

		it("should wire storage adapter with correct bucket name", () => {
			const ctx = createCloudflareContext(validOptions);
			expect(ctx.storage.info().provider).toBe("cloudflare-r2");
			expect(ctx.storage.info().bucket).toBe("grove-media");
		});

		it("should wire KV adapter with correct namespace", () => {
			const ctx = createCloudflareContext(validOptions);
			expect(ctx.kv.info().provider).toBe("cloudflare-kv");
			expect(ctx.kv.info().namespace).toBe("CACHE_KV");
		});

		it("should wire service bus with bindings", () => {
			const ctx = createCloudflareContext(validOptions);
			expect(ctx.services.info().provider).toBe("cloudflare-bindings");
			expect(ctx.services.services()).toContain("auth");
		});

		it("should wire scheduler", () => {
			const ctx = createCloudflareContext(validOptions);
			expect(ctx.scheduler.info().provider).toBe("cloudflare-cron");
		});

		it("should wire config with env object", () => {
			const ctx = createCloudflareContext(validOptions);
			expect(ctx.config.info().provider).toBe("cloudflare-env");
			expect(ctx.config.require("STRIPE_SECRET_KEY")).toBe("sk_test_123");
		});
	});

	// =========================================================================
	// Optional Services
	// =========================================================================

	describe("optional bindings", () => {
		it("should create service bus with empty bindings when services omitted", () => {
			const { services: _, ...optionsWithoutServices } = validOptions;
			const ctx = createCloudflareContext(optionsWithoutServices as typeof validOptions);

			expect(ctx.services.services()).toEqual([]);
		});

		it("should use default names when optional names not provided", () => {
			const ctx = createCloudflareContext({
				db: validOptions.db,
				storage: validOptions.storage,
				kv: validOptions.kv,
				env: validOptions.env,
			});

			expect(ctx.db.info().database).toBe("default");
			expect(ctx.storage.info().bucket).toBe("default");
			expect(ctx.kv.info().namespace).toBe("default");
		});
	});

	// =========================================================================
	// Binding Validation
	// =========================================================================

	describe("binding validation", () => {
		it("should throw when db binding is missing", () => {
			expect(() =>
				createCloudflareContext({
					...validOptions,
					db: undefined as unknown as D1Database,
				}),
			).toThrow();
		});

		it("should throw when storage binding is missing", () => {
			expect(() =>
				createCloudflareContext({
					...validOptions,
					storage: undefined as unknown as R2Bucket,
				}),
			).toThrow();
		});

		it("should throw when kv binding is missing", () => {
			expect(() =>
				createCloudflareContext({
					...validOptions,
					kv: undefined as unknown as KVNamespace,
				}),
			).toThrow();
		});

		it("should log error before throwing on missing db", async () => {
			try {
				createCloudflareContext({
					...validOptions,
					db: null as unknown as D1Database,
				});
			} catch {
				// expected
			}

			const { logGroveError } = await import("@autumnsgrove/lattice/errors");
			expect(logGroveError).toHaveBeenCalled();
		});

		it("should log error before throwing on missing storage", async () => {
			try {
				createCloudflareContext({
					...validOptions,
					storage: null as unknown as R2Bucket,
				});
			} catch {
				// expected
			}

			const { logGroveError } = await import("@autumnsgrove/lattice/errors");
			expect(logGroveError).toHaveBeenCalled();
		});

		it("should log error before throwing on missing kv", async () => {
			try {
				createCloudflareContext({
					...validOptions,
					kv: null as unknown as KVNamespace,
				});
			} catch {
				// expected
			}

			const { logGroveError } = await import("@autumnsgrove/lattice/errors");
			expect(logGroveError).toHaveBeenCalled();
		});
	});
});
