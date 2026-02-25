/**
 * Tests for the GroveObserver callback pattern.
 *
 * Validates that all Cloudflare adapters emit events with correct
 * service, operation, timing, and error information.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { GroveEvent, GroveObserver } from "../../src/types.js";
import { CloudflareDatabase } from "../../src/cloudflare/database.js";
import { CloudflareStorage } from "../../src/cloudflare/storage.js";
import { CloudflareKV } from "../../src/cloudflare/kv.js";
import { CloudflareServiceBus } from "../../src/cloudflare/service-bus.js";
import { CloudflareScheduler } from "../../src/cloudflare/scheduler.js";
import { createCloudflareContext } from "../../src/cloudflare/index.js";
import {
	createMockD1,
	createMockD1Statement,
	createMockR2,
	createMockR2Object,
	createMockKVNamespace,
	createMockFetcher,
} from "./helpers.js";

vi.mock("@autumnsgrove/lattice/errors", () => ({
	logGroveError: vi.fn(),
}));

describe("GroveObserver", () => {
	let events: GroveEvent[];
	let observer: GroveObserver;

	beforeEach(() => {
		vi.clearAllMocks();
		events = [];
		observer = (event) => events.push(event);
	});

	// =========================================================================
	// Database Observer
	// =========================================================================

	describe("CloudflareDatabase", () => {
		it("should emit event on successful execute", async () => {
			const mockD1 = createMockD1();
			const db = new CloudflareDatabase(mockD1 as unknown as D1Database, "test-db", observer);

			await db.execute("SELECT * FROM posts");

			expect(events).toHaveLength(1);
			expect(events[0].service).toBe("db");
			expect(events[0].operation).toBe("execute");
			expect(events[0].ok).toBe(true);
			expect(events[0].detail).toBe("SELECT * FROM posts");
			expect(events[0].durationMs).toBeGreaterThanOrEqual(0);
			expect(events[0].error).toBeUndefined();
		});

		it("should emit event on failed execute", async () => {
			const stmt = createMockD1Statement();
			stmt.all.mockRejectedValue(new Error("D1 error"));
			const mockD1 = createMockD1(stmt);
			const db = new CloudflareDatabase(mockD1 as unknown as D1Database, "test-db", observer);

			await expect(db.execute("BAD SQL")).rejects.toThrow("D1 error");

			expect(events).toHaveLength(1);
			expect(events[0].ok).toBe(false);
			expect(events[0].error).toBe("D1 error");
			expect(events[0].detail).toBe("BAD SQL");
		});

		it("should emit event on successful batch", async () => {
			const stmt = createMockD1Statement();
			const mockD1 = createMockD1(stmt);
			mockD1.batch.mockResolvedValue([{ results: [], meta: { changes: 0, duration: 1, last_row_id: 0, rows_read: 0, rows_written: 0 } }]);
			const db = new CloudflareDatabase(mockD1 as unknown as D1Database, "test-db", observer);

			await db.batch([stmt as unknown as Parameters<typeof db.batch>[0][0]]);

			expect(events).toHaveLength(1);
			expect(events[0].service).toBe("db");
			expect(events[0].operation).toBe("batch");
			expect(events[0].ok).toBe(true);
			expect(events[0].detail).toBe("1 statements");
		});

		it("should truncate SQL detail to 100 chars", async () => {
			const longSql = "SELECT " + "a".repeat(200) + " FROM posts";
			const mockD1 = createMockD1();
			const db = new CloudflareDatabase(mockD1 as unknown as D1Database, "test-db", observer);

			await db.execute(longSql);

			expect(events[0].detail!.length).toBe(100);
		});
	});

	// =========================================================================
	// Storage Observer
	// =========================================================================

	describe("CloudflareStorage", () => {
		it("should emit event on successful put", async () => {
			const mockR2 = createMockR2();
			const storage = new CloudflareStorage(mockR2 as unknown as R2Bucket, "test-bucket", observer);

			await storage.put("uploads/test.txt", "hello");

			expect(events).toHaveLength(1);
			expect(events[0].service).toBe("storage");
			expect(events[0].operation).toBe("put");
			expect(events[0].ok).toBe(true);
			expect(events[0].detail).toBe("uploads/test.txt");
		});

		it("should emit event on successful get (miss)", async () => {
			const mockR2 = createMockR2();
			const storage = new CloudflareStorage(mockR2 as unknown as R2Bucket, "test-bucket", observer);

			await storage.get("missing-key");

			expect(events).toHaveLength(1);
			expect(events[0].operation).toBe("get");
			expect(events[0].ok).toBe(true);
		});

		it("should emit event on successful get (hit)", async () => {
			const mockR2 = createMockR2();
			const obj = createMockR2Object({ key: "found" });
			(obj as unknown as Record<string, ReadableStream>).body = new ReadableStream();
			mockR2.get.mockResolvedValue(obj);
			const storage = new CloudflareStorage(mockR2 as unknown as R2Bucket, "test-bucket", observer);

			await storage.get("found");

			expect(events).toHaveLength(1);
			expect(events[0].ok).toBe(true);
			expect(events[0].detail).toBe("found");
		});

		it("should emit event on failed delete", async () => {
			const mockR2 = createMockR2();
			mockR2.delete.mockRejectedValue(new Error("R2 error"));
			const storage = new CloudflareStorage(mockR2 as unknown as R2Bucket, "test-bucket", observer);

			await expect(storage.delete("bad-key")).rejects.toThrow("R2 error");

			expect(events).toHaveLength(1);
			expect(events[0].ok).toBe(false);
			expect(events[0].error).toBe("R2 error");
		});

		it("should emit event on list", async () => {
			const mockR2 = createMockR2();
			const storage = new CloudflareStorage(mockR2 as unknown as R2Bucket, "test-bucket", observer);

			await storage.list({ prefix: "uploads/" });

			expect(events).toHaveLength(1);
			expect(events[0].operation).toBe("list");
			expect(events[0].detail).toBe("prefix=uploads/");
		});

		it("should emit event on deleteMany", async () => {
			const mockR2 = createMockR2();
			const storage = new CloudflareStorage(mockR2 as unknown as R2Bucket, "test-bucket", observer);

			await storage.deleteMany(["a.txt", "b.txt"]);

			expect(events).toHaveLength(1);
			expect(events[0].operation).toBe("deleteMany");
			expect(events[0].detail).toBe("2 keys");
		});

		it("should emit event on head", async () => {
			const mockR2 = createMockR2();
			const storage = new CloudflareStorage(mockR2 as unknown as R2Bucket, "test-bucket", observer);

			await storage.head("test-key");

			expect(events).toHaveLength(1);
			expect(events[0].operation).toBe("head");
			expect(events[0].ok).toBe(true);
		});
	});

	// =========================================================================
	// KV Observer
	// =========================================================================

	describe("CloudflareKV", () => {
		it("should emit event on get", async () => {
			const mockKV = createMockKVNamespace();
			mockKV.get.mockResolvedValue("hello");
			const kv = new CloudflareKV(mockKV as unknown as KVNamespace, "test-ns", observer);

			await kv.get("greeting");

			expect(events).toHaveLength(1);
			expect(events[0].service).toBe("kv");
			expect(events[0].operation).toBe("get");
			expect(events[0].ok).toBe(true);
			expect(events[0].detail).toBe("greeting");
		});

		it("should emit event on put", async () => {
			const mockKV = createMockKVNamespace();
			const kv = new CloudflareKV(mockKV as unknown as KVNamespace, "test-ns", observer);

			await kv.put("session:123", "data");

			expect(events).toHaveLength(1);
			expect(events[0].operation).toBe("put");
			expect(events[0].ok).toBe(true);
			expect(events[0].detail).toBe("session:123");
		});

		it("should emit event on delete", async () => {
			const mockKV = createMockKVNamespace();
			const kv = new CloudflareKV(mockKV as unknown as KVNamespace, "test-ns", observer);

			await kv.delete("old-key");

			expect(events).toHaveLength(1);
			expect(events[0].operation).toBe("delete");
			expect(events[0].detail).toBe("old-key");
		});

		it("should emit event on list", async () => {
			const mockKV = createMockKVNamespace();
			const kv = new CloudflareKV(mockKV as unknown as KVNamespace, "test-ns", observer);

			await kv.list({ prefix: "cache:" });

			expect(events).toHaveLength(1);
			expect(events[0].operation).toBe("list");
			expect(events[0].detail).toBe("prefix=cache:");
		});

		it("should emit event on getWithMetadata", async () => {
			const mockKV = createMockKVNamespace();
			const kv = new CloudflareKV(mockKV as unknown as KVNamespace, "test-ns", observer);

			await kv.getWithMetadata("key-with-meta");

			expect(events).toHaveLength(1);
			expect(events[0].operation).toBe("getWithMetadata");
		});

		it("should emit error event on KV failure", async () => {
			const mockKV = createMockKVNamespace();
			mockKV.get.mockRejectedValue(new Error("KV timeout"));
			const kv = new CloudflareKV(mockKV as unknown as KVNamespace, "test-ns", observer);

			await expect(kv.get("broken")).rejects.toThrow("KV timeout");

			expect(events).toHaveLength(1);
			expect(events[0].ok).toBe(false);
			expect(events[0].error).toBe("KV timeout");
		});
	});

	// =========================================================================
	// ServiceBus Observer
	// =========================================================================

	describe("CloudflareServiceBus", () => {
		it("should emit event on successful call", async () => {
			const mockFetcher = createMockFetcher({ body: { ok: true } });
			const bus = new CloudflareServiceBus(
				{ auth: mockFetcher as unknown as Fetcher },
				observer,
			);

			await bus.call("auth", { method: "GET", path: "/session" });

			expect(events).toHaveLength(1);
			expect(events[0].service).toBe("services");
			expect(events[0].operation).toBe("call");
			expect(events[0].ok).toBe(true);
			expect(events[0].detail).toBe("GET auth/session");
		});

		it("should emit event on ping", async () => {
			const mockFetcher = createMockFetcher({ status: 200 });
			const bus = new CloudflareServiceBus(
				{ auth: mockFetcher as unknown as Fetcher },
				observer,
			);

			await bus.ping("auth");

			expect(events).toHaveLength(1);
			expect(events[0].operation).toBe("ping");
			expect(events[0].ok).toBe(true);
			expect(events[0].detail).toBe("auth");
		});

		it("should emit error event on failed call", async () => {
			const mockFetcher = { fetch: vi.fn().mockRejectedValue(new Error("network error")) };
			const bus = new CloudflareServiceBus(
				{ auth: mockFetcher as unknown as Fetcher },
				observer,
			);

			await expect(
				bus.call("auth", { method: "GET", path: "/session" }),
			).rejects.toThrow();

			expect(events).toHaveLength(1);
			expect(events[0].ok).toBe(false);
		});

		it("should emit ok=false on failed ping", async () => {
			const mockFetcher = { fetch: vi.fn().mockRejectedValue(new Error("down")) };
			const bus = new CloudflareServiceBus(
				{ auth: mockFetcher as unknown as Fetcher },
				observer,
			);

			const result = await bus.ping("auth");

			expect(result).toBe(false);
			expect(events).toHaveLength(1);
			expect(events[0].ok).toBe(false);
		});
	});

	// =========================================================================
	// Scheduler Observer
	// =========================================================================

	describe("CloudflareScheduler", () => {
		it("should emit event on successful dispatch", async () => {
			const scheduler = new CloudflareScheduler(observer);
			scheduler.register("cleanup", "0 3 * * *", async () => {
				// noop
			});

			await scheduler.dispatch("0 3 * * *", new Date());

			expect(events).toHaveLength(1);
			expect(events[0].service).toBe("scheduler");
			expect(events[0].operation).toBe("dispatch");
			expect(events[0].ok).toBe(true);
			expect(events[0].detail).toBe("cleanup (0 3 * * *)");
		});

		it("should emit error event on failed dispatch", async () => {
			const scheduler = new CloudflareScheduler(observer);
			scheduler.register("broken", "0 * * * *", async () => {
				throw new Error("handler crashed");
			});

			await expect(scheduler.dispatch("0 * * * *", new Date())).rejects.toThrow(
				"handler crashed",
			);

			expect(events).toHaveLength(1);
			expect(events[0].ok).toBe(false);
			expect(events[0].error).toBe("handler crashed");
		});

		it("should emit event for fallback name-match dispatch", async () => {
			const scheduler = new CloudflareScheduler(observer);
			scheduler.on("my-cron", async () => {
				// noop
			});

			await scheduler.dispatch("my-cron", new Date());

			expect(events).toHaveLength(1);
			expect(events[0].ok).toBe(true);
			expect(events[0].detail).toBe("my-cron");
		});
	});

	// =========================================================================
	// Context Integration
	// =========================================================================

	describe("createCloudflareContext", () => {
		it("should pass observer to all adapters", async () => {
			const ctx = createCloudflareContext({
				db: createMockD1() as unknown as D1Database,
				storage: createMockR2() as unknown as R2Bucket,
				kv: createMockKVNamespace() as unknown as KVNamespace,
				env: {},
				observer,
			});

			// Exercise each adapter
			await ctx.db.execute("SELECT 1");
			await ctx.kv.get("test");
			await ctx.storage.list();

			expect(events).toHaveLength(3);
			expect(events.map((e) => e.service)).toEqual(["db", "kv", "storage"]);
		});

		it("should expose observer on context", () => {
			const ctx = createCloudflareContext({
				db: createMockD1() as unknown as D1Database,
				storage: createMockR2() as unknown as R2Bucket,
				kv: createMockKVNamespace() as unknown as KVNamespace,
				env: {},
				observer,
			});

			expect(ctx.observer).toBe(observer);
		});

		it("should work without observer (no events emitted)", async () => {
			const ctx = createCloudflareContext({
				db: createMockD1() as unknown as D1Database,
				storage: createMockR2() as unknown as R2Bucket,
				kv: createMockKVNamespace() as unknown as KVNamespace,
				env: {},
			});

			// Should not throw
			await ctx.db.execute("SELECT 1");
			expect(events).toHaveLength(0);
		});
	});

	// =========================================================================
	// Event Shape
	// =========================================================================

	describe("event shape", () => {
		it("should always include durationMs >= 0", async () => {
			const mockD1 = createMockD1();
			const db = new CloudflareDatabase(mockD1 as unknown as D1Database, "test", observer);

			await db.execute("SELECT 1");

			expect(typeof events[0].durationMs).toBe("number");
			expect(events[0].durationMs).toBeGreaterThanOrEqual(0);
		});

		it("should include error string on failure", async () => {
			const mockKV = createMockKVNamespace();
			mockKV.get.mockRejectedValue(new Error("custom error message"));
			const kv = new CloudflareKV(mockKV as unknown as KVNamespace, "test", observer);

			await expect(kv.get("key")).rejects.toThrow();

			expect(events[0].error).toBe("custom error message");
		});

		it("should handle non-Error throws", async () => {
			const mockKV = createMockKVNamespace();
			mockKV.get.mockRejectedValue("string error");
			const kv = new CloudflareKV(mockKV as unknown as KVNamespace, "test", observer);

			await expect(kv.get("key")).rejects.toBe("string error");

			expect(events[0].error).toBe("string error");
		});
	});
});
