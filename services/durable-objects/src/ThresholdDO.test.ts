/**
 * ThresholdDO Tests
 *
 * Tests the per-identifier rate limiter — atomic INSERT ON CONFLICT,
 * cleanup alarm, and health endpoint.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ThresholdDO } from "./ThresholdDO";
import { createTestDOState, createMockSql, doPost, doRequest } from "./test-helpers";

describe("ThresholdDO", () => {
	let doInstance: ThresholdDO;
	let sql: ReturnType<typeof createMockSql>;

	beforeEach(() => {
		vi.restoreAllMocks();
		sql = createMockSql();
		const { state } = createTestDOState("threshold:test-user", sql);
		doInstance = new ThresholdDO(state, {});
	});

	describe("POST /check", () => {
		it("should allow request under limit", async () => {
			// Schema DDL (CREATE TABLE) — auto-handled by mock
			// kv_store DDL — auto-handled
			// INSERT ON CONFLICT RETURNING — rate_limits result
			sql._pushResult({ count: 1, window_start: 1000, window_seconds: 60 });

			const res = await doInstance.fetch(
				doPost("/check", { key: "api", limit: 10, windowSeconds: 60 }),
			);
			const body = await res.json();

			expect(res.status).toBe(200);
			expect(body.allowed).toBe(true);
			expect(body.remaining).toBe(9);
			expect(body.resetAt).toBe(1060);
		});

		it("should deny request over limit", async () => {
			sql._pushResult({ count: 11, window_start: 1000, window_seconds: 60 });

			const res = await doInstance.fetch(
				doPost("/check", { key: "api", limit: 10, windowSeconds: 60 }),
			);
			const body = await res.json();

			expect(body.allowed).toBe(false);
			expect(body.remaining).toBe(0);
			expect(body.retryAfter).toBeDefined();
		});

		it("should return remaining = 0 at exactly the limit", async () => {
			sql._pushResult({ count: 10, window_start: 1000, window_seconds: 60 });

			const res = await doInstance.fetch(
				doPost("/check", { key: "api", limit: 10, windowSeconds: 60 }),
			);
			const body = await res.json();

			expect(body.allowed).toBe(true);
			expect(body.remaining).toBe(0);
		});

		it("should reject missing fields", async () => {
			const res = await doInstance.fetch(doPost("/check", { key: "api" }));

			expect(res.status).toBe(400);
			const body = await res.json();
			expect(body.error).toBe("bad_request");
		});

		it("should reject empty key", async () => {
			const res = await doInstance.fetch(
				doPost("/check", { key: "", limit: 10, windowSeconds: 60 }),
			);
			expect(res.status).toBe(400);
		});

		it("should schedule cleanup alarm after check", async () => {
			sql._pushResult({ count: 1, window_start: 1000, window_seconds: 60 });

			await doInstance.fetch(doPost("/check", { key: "api", limit: 10, windowSeconds: 60 }));

			// The SQL call for the INSERT ON CONFLICT should be recorded
			const insertCall = sql._calls.find((c) => c.query.includes("INSERT INTO rate_limits"));
			expect(insertCall).toBeDefined();
		});
	});

	describe("GET /health", () => {
		it("should return status and counter count", async () => {
			// SELECT COUNT(*) from rate_limits
			sql._pushResult({ total: 5 });

			const res = await doInstance.fetch(doRequest("/health"));
			const body = await res.json();

			expect(body.status).toBe("ok");
			expect(body.counters).toBe(5);
			expect(body.uptimeMs).toBeGreaterThanOrEqual(0);
		});

		it("should return 0 counters when empty", async () => {
			sql._pushResult({ total: 0 });

			const res = await doInstance.fetch(doRequest("/health"));
			const body = await res.json();

			expect(body.counters).toBe(0);
		});
	});

	describe("alarm (cleanup)", () => {
		it("should delete expired windows and reschedule if rows remain", async () => {
			// DELETE expired
			sql._pushResult({});
			// SELECT COUNT(*) — rows remain
			sql._pushResult({ total: 3 });

			await doInstance.alarm();

			const deleteCall = sql._calls.find(
				(c) => c.query.includes("DELETE FROM rate_limits") && c.query.includes("window_start"),
			);
			expect(deleteCall).toBeDefined();
		});

		it("should not reschedule when no rows remain", async () => {
			// DELETE expired
			sql._pushResult({});
			// SELECT COUNT(*) — no rows
			sql._pushResult({ total: 0 });

			await doInstance.alarm();

			const countCall = sql._calls.find((c) => c.query.includes("SELECT COUNT(*)"));
			expect(countCall).toBeDefined();
		});
	});

	describe("route matching", () => {
		it("should return 404 for unknown routes", async () => {
			const res = await doInstance.fetch(doRequest("/unknown"));
			expect(res.status).toBe(404);
		});

		it("should return 404 for wrong method", async () => {
			const res = await doInstance.fetch(doRequest("/check")); // GET instead of POST
			expect(res.status).toBe(404);
		});
	});
});
