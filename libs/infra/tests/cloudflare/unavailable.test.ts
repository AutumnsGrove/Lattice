/**
 * Tests for unavailable service proxies.
 *
 * Validates that omitted bindings produce proxies that throw
 * descriptive SRV-00X errors on access, and that partial contexts
 * work correctly alongside real bindings.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCloudflareContext } from "../../src/cloudflare/index.js";
import {
	createUnavailableDatabase,
	createUnavailableStorage,
	createUnavailableKV,
} from "../../src/cloudflare/unavailable.js";
import { createMockD1, createMockR2, createMockKVNamespace } from "./helpers.js";

vi.mock("@autumnsgrove/lattice/errors", () => ({
	logGroveError: vi.fn(),
}));

describe("unavailable proxies", () => {
	describe("createUnavailableDatabase", () => {
		it("should throw SRV-001 on execute", () => {
			const db = createUnavailableDatabase();
			expect(() => db.execute("SELECT 1")).toThrow("SRV-001");
		});

		it("should throw SRV-001 on batch", () => {
			const db = createUnavailableDatabase();
			expect(() => db.batch([])).toThrow("SRV-001");
		});

		it("should throw SRV-001 on prepare", () => {
			const db = createUnavailableDatabase();
			expect(() => db.prepare("SELECT 1")).toThrow("SRV-001");
		});

		it("should throw SRV-001 on transaction", () => {
			const db = createUnavailableDatabase();
			expect(() => db.transaction(async () => {})).toThrow("SRV-001");
		});

		it("should return unavailable info without throwing", () => {
			const db = createUnavailableDatabase();
			expect(db.info().provider).toBe("unavailable");
		});
	});

	describe("createUnavailableStorage", () => {
		it("should throw SRV-002 on put", () => {
			const storage = createUnavailableStorage();
			expect(() => storage.put("key", "data")).toThrow("SRV-002");
		});

		it("should throw SRV-002 on get", () => {
			const storage = createUnavailableStorage();
			expect(() => storage.get("key")).toThrow("SRV-002");
		});

		it("should throw SRV-002 on delete", () => {
			const storage = createUnavailableStorage();
			expect(() => storage.delete("key")).toThrow("SRV-002");
		});

		it("should return unavailable info without throwing", () => {
			const storage = createUnavailableStorage();
			expect(storage.info().provider).toBe("unavailable");
		});
	});

	describe("createUnavailableKV", () => {
		it("should throw SRV-003 on get", () => {
			const kv = createUnavailableKV();
			expect(() => kv.get("key")).toThrow("SRV-003");
		});

		it("should throw SRV-003 on put", () => {
			const kv = createUnavailableKV();
			expect(() => kv.put("key", "value")).toThrow("SRV-003");
		});

		it("should throw SRV-003 on delete", () => {
			const kv = createUnavailableKV();
			expect(() => kv.delete("key")).toThrow("SRV-003");
		});

		it("should return unavailable info without throwing", () => {
			const kv = createUnavailableKV();
			expect(kv.info().provider).toBe("unavailable");
		});
	});
});

describe("partial context creation", () => {
	const baseEnv = { NODE_ENV: "test" };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create context with only db", () => {
		const ctx = createCloudflareContext({
			db: createMockD1() as unknown as D1Database,
			env: baseEnv,
		});

		expect(ctx.db.info().provider).toBe("cloudflare-d1");
		expect(() => ctx.kv.get("key")).toThrow("SRV-003");
		expect(() => ctx.storage.get("key")).toThrow("SRV-002");
	});

	it("should create context with only storage", () => {
		const ctx = createCloudflareContext({
			storage: createMockR2() as unknown as R2Bucket,
			env: baseEnv,
		});

		expect(ctx.storage.info().provider).toBe("cloudflare-r2");
		expect(() => ctx.db.execute("SELECT 1")).toThrow("SRV-001");
		expect(() => ctx.kv.get("key")).toThrow("SRV-003");
	});

	it("should create context with only kv", () => {
		const ctx = createCloudflareContext({
			kv: createMockKVNamespace() as unknown as KVNamespace,
			env: baseEnv,
		});

		expect(ctx.kv.info().provider).toBe("cloudflare-kv");
		expect(() => ctx.db.execute("SELECT 1")).toThrow("SRV-001");
		expect(() => ctx.storage.get("key")).toThrow("SRV-002");
	});

	it("should create context with no bindings", () => {
		const ctx = createCloudflareContext({ env: baseEnv });

		expect(() => ctx.db.execute("SELECT 1")).toThrow("SRV-001");
		expect(() => ctx.storage.get("key")).toThrow("SRV-002");
		expect(() => ctx.kv.get("key")).toThrow("SRV-003");
		// config and scheduler should still work
		expect(ctx.config.info().provider).toBe("cloudflare-env");
		expect(ctx.scheduler.info().provider).toBe("cloudflare-cron");
	});

	it("should create context with all bindings (regression)", () => {
		const ctx = createCloudflareContext({
			db: createMockD1() as unknown as D1Database,
			storage: createMockR2() as unknown as R2Bucket,
			kv: createMockKVNamespace() as unknown as KVNamespace,
			env: baseEnv,
		});

		expect(ctx.db.info().provider).toBe("cloudflare-d1");
		expect(ctx.storage.info().provider).toBe("cloudflare-r2");
		expect(ctx.kv.info().provider).toBe("cloudflare-kv");
	});
});
