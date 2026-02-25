/**
 * Tests for unavailable service proxies.
 *
 * Validates that omitted bindings produce proxies that reject with
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
		it("should reject SRV-001 on execute", async () => {
			const db = createUnavailableDatabase();
			await expect(db.execute("SELECT 1")).rejects.toThrow("SRV-001");
		});

		it("should reject SRV-001 on batch", async () => {
			const db = createUnavailableDatabase();
			await expect(db.batch([])).rejects.toThrow("SRV-001");
		});

		it("should throw SRV-001 on prepare (sync)", () => {
			const db = createUnavailableDatabase();
			expect(() => db.prepare("SELECT 1")).toThrow("SRV-001");
		});

		it("should reject SRV-001 on transaction", async () => {
			const db = createUnavailableDatabase();
			await expect(db.transaction(async () => {})).rejects.toThrow("SRV-001");
		});

		it("should return unavailable info without throwing", () => {
			const db = createUnavailableDatabase();
			expect(db.info().provider).toBe("unavailable");
		});

		it("should be catchable with .catch() (not just await)", async () => {
			const db = createUnavailableDatabase();
			const error = await db.execute("SELECT 1").catch((e: Error) => e);
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).toContain("SRV-001");
		});
	});

	describe("createUnavailableStorage", () => {
		it("should reject SRV-002 on put", async () => {
			const storage = createUnavailableStorage();
			await expect(storage.put("key", "data")).rejects.toThrow("SRV-002");
		});

		it("should reject SRV-002 on get", async () => {
			const storage = createUnavailableStorage();
			await expect(storage.get("key")).rejects.toThrow("SRV-002");
		});

		it("should reject SRV-002 on delete", async () => {
			const storage = createUnavailableStorage();
			await expect(storage.delete("key")).rejects.toThrow("SRV-002");
		});

		it("should return unavailable info without throwing", () => {
			const storage = createUnavailableStorage();
			expect(storage.info().provider).toBe("unavailable");
		});
	});

	describe("createUnavailableKV", () => {
		it("should reject SRV-003 on get", async () => {
			const kv = createUnavailableKV();
			await expect(kv.get("key")).rejects.toThrow("SRV-003");
		});

		it("should reject SRV-003 on put", async () => {
			const kv = createUnavailableKV();
			await expect(kv.put("key", "value")).rejects.toThrow("SRV-003");
		});

		it("should reject SRV-003 on delete", async () => {
			const kv = createUnavailableKV();
			await expect(kv.delete("key")).rejects.toThrow("SRV-003");
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

	it("should create context with only db", async () => {
		const ctx = createCloudflareContext({
			db: createMockD1() as unknown as D1Database,
			env: baseEnv,
		});

		expect(ctx.db.info().provider).toBe("cloudflare-d1");
		await expect(ctx.kv.get("key")).rejects.toThrow("SRV-003");
		await expect(ctx.storage.get("key")).rejects.toThrow("SRV-002");
	});

	it("should create context with only storage", async () => {
		const ctx = createCloudflareContext({
			storage: createMockR2() as unknown as R2Bucket,
			env: baseEnv,
		});

		expect(ctx.storage.info().provider).toBe("cloudflare-r2");
		await expect(ctx.db.execute("SELECT 1")).rejects.toThrow("SRV-001");
		await expect(ctx.kv.get("key")).rejects.toThrow("SRV-003");
	});

	it("should create context with only kv", async () => {
		const ctx = createCloudflareContext({
			kv: createMockKVNamespace() as unknown as KVNamespace,
			env: baseEnv,
		});

		expect(ctx.kv.info().provider).toBe("cloudflare-kv");
		await expect(ctx.db.execute("SELECT 1")).rejects.toThrow("SRV-001");
		await expect(ctx.storage.get("key")).rejects.toThrow("SRV-002");
	});

	it("should create context with no bindings", async () => {
		const ctx = createCloudflareContext({ env: baseEnv });

		await expect(ctx.db.execute("SELECT 1")).rejects.toThrow("SRV-001");
		await expect(ctx.storage.get("key")).rejects.toThrow("SRV-002");
		await expect(ctx.kv.get("key")).rejects.toThrow("SRV-003");
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
