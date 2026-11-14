/**
 * Vista Observability — Petal Aggregator Test Suite
 *
 * Regression coverage for issue #1608: the NCMEC queue-depth query referenced
 * a `submitted_at` column that does not exist, threw, and was swallowed by
 * `.catch(() => null)` — so the dashboard silently reported depth 0.
 *
 * @module server/observability/aggregators/petal-aggregator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { aggregatePetal } from "./petal-aggregator.js";

type Row = Record<string, unknown>;

interface CapturedQuery {
	sql: string;
	params: unknown[];
}

/**
 * Minimal D1 stand-in. `respond` decides the answer for a given statement, and
 * every statement the code under test builds is recorded for SQL assertions.
 */
function createFakeD1(respond: (sql: string, params: unknown[]) => Row | Row[] | null) {
	const queries: CapturedQuery[] = [];

	const makeStatement = (sql: string) => {
		let params: unknown[] = [];

		const statement = {
			bind: (...bound: unknown[]) => {
				params = bound;
				return statement;
			},
			first: async () => {
				queries.push({ sql, params });
				const out = respond(sql, params);
				return Array.isArray(out) ? (out[0] ?? null) : out;
			},
			all: async () => {
				queries.push({ sql, params });
				const out = respond(sql, params);
				return {
					results: Array.isArray(out) ? out : out ? [out] : [],
					success: true,
					meta: {},
				};
			},
			run: async () => {
				const out = respond(sql, params);
				queries.push({ sql, params });
				return { success: true, meta: { changes: Array.isArray(out) ? out.length : 1 } };
			},
		};

		return statement;
	};

	const db = {
		prepare: (sql: string) => makeStatement(sql),
		batch: async () => [],
		exec: async () => undefined,
		dump: async () => new ArrayBuffer(0),
	};

	return { db: db as unknown as D1Database, queries };
}

/** Answers every petal query as if the tables were populated and healthy. */
function healthyResponse(sql: string): Row | Row[] {
	if (sql.includes("petal_ncmec_queue")) return { depth: 3 };
	if (sql.includes("review_status")) return { pending: 2 };
	if (sql.includes("GROUP BY category")) {
		return [
			{ category: "csam", count: 2 },
			{ category: "nudity", count: 1 },
		];
	}
	return { total: 10, blocked: 3 };
}

function findQuery(queries: CapturedQuery[], needle: string): CapturedQuery | undefined {
	return queries.find((q) => q.sql.includes(needle));
}

describe("aggregatePetal", () => {
	let consoleError: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleError.mockRestore();
	});

	describe("NCMEC queue depth", () => {
		it("counts unreported rows from the real schema columns", async () => {
			const { db, queries } = createFakeD1(healthyResponse);

			const result = await aggregatePetal(db);

			expect(result.status).toBe("success");
			expect(result.data?.ncmecQueueDepth).toBe(3);

			const depthQuery = findQuery(queries, "petal_ncmec_queue");
			expect(depthQuery).toBeDefined();
			expect(depthQuery?.sql).toContain("reported = 0");
			// The bug: this column does not exist on petal_ncmec_queue.
			expect(depthQuery?.sql).not.toContain("submitted_at");
		});

		it("reports depth 0 only when there are no unreported rows", async () => {
			const { db } = createFakeD1((sql) =>
				sql.includes("petal_ncmec_queue") ? { depth: 0 } : healthyResponse(sql),
			);

			const result = await aggregatePetal(db);

			expect(result.data?.ncmecQueueDepth).toBe(0);
		});
	});

	describe("failure surfacing", () => {
		it("flags the run as partial when the NCMEC query fails instead of silently zeroing", async () => {
			const { db } = createFakeD1((sql) => {
				if (sql.includes("petal_ncmec_queue")) throw new Error("no such column: submitted_at");
				return healthyResponse(sql);
			});

			const result = await aggregatePetal(db);

			expect(result.status).toBe("partial");
			expect(result.error).toContain("ncmec-queue-depth");
			expect(result.error).toContain("no such column");
			expect(consoleError).toHaveBeenCalled();
			// Other metrics still collected — one broken query never cascades.
			expect(result.data?.pendingFlagReviews).toBe(2);
		});

		it("surfaces a failure in the sibling pending-flags query the same way", async () => {
			const { db } = createFakeD1((sql) => {
				if (sql.includes("review_status")) throw new Error("no such table: petal_account_flags");
				return healthyResponse(sql);
			});

			const result = await aggregatePetal(db);

			expect(result.status).toBe("partial");
			expect(result.error).toContain("pending-flag-reviews");
			expect(result.data?.ncmecQueueDepth).toBe(3);
		});

		it("keeps block metrics working when the activity query fails", async () => {
			const { db } = createFakeD1((sql) => {
				if (sql.includes("SUM(CASE WHEN result = 'block'")) throw new Error("boom");
				return healthyResponse(sql);
			});

			const result = await aggregatePetal(db);

			expect(result.status).toBe("partial");
			expect(result.data?.totalChecks24h).toBe(0);
			expect(result.data?.blockRate24h).toBe(0);
		});
	});

	describe("happy path", () => {
		it("computes the 24h block rate and category breakdown", async () => {
			const { db } = createFakeD1(healthyResponse);

			const result = await aggregatePetal(db);

			expect(result.status).toBe("success");
			expect(result.error).toBeUndefined();
			expect(result.data?.totalChecks24h).toBe(10);
			expect(result.data?.totalBlocked24h).toBe(3);
			expect(result.data?.blockRate24h).toBeCloseTo(30);
			expect(result.data?.recentBlocks).toEqual([
				{ category: "csam", count: 2 },
				{ category: "nudity", count: 1 },
			]);
		});

		it("returns zero block rate when no checks ran in the window", async () => {
			const { db } = createFakeD1((sql) =>
				sql.includes("SUM(CASE WHEN result = 'block'")
					? { total: 0, blocked: 0 }
					: healthyResponse(sql),
			);

			const result = await aggregatePetal(db);

			expect(result.data?.blockRate24h).toBe(0);
		});
	});
});
