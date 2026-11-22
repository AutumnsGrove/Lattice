/**
 * Vista Observability — 90-day Retention Cleanup Test Suite
 *
 * Regression coverage for issue #1608:
 *   - petal_security_log must actually be pruned (it previously grew unbounded)
 *   - its `datetime('now')` TEXT timestamp needs a different cutoff comparison
 *     than the epoch-based observability_* tables
 *   - petal_ncmec_queue must never be pruned (permanent, legal requirement)
 *   - the petal table lives in the main engine DB, not OBS_DB
 *
 * @module server/observability/scheduler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runRetentionCleanup, RETENTION_DAYS } from "./scheduler.js";

type Row = Record<string, unknown>;

interface CapturedQuery {
	sql: string;
	params: unknown[];
}

function createFakeD1(label: string) {
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
				return null as Row | null;
			},
			all: async () => {
				queries.push({ sql, params });
				return { results: [] as Row[], success: true, meta: {} };
			},
			run: async () => {
				queries.push({ sql, params });
				return { success: true, meta: { changes: 1 } };
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

	return { label, db: db as unknown as D1Database, queries };
}

function deletes(queries: CapturedQuery[]): CapturedQuery[] {
	return queries.filter((q) => q.sql.trim().startsWith("DELETE"));
}

describe("runRetentionCleanup", () => {
	let consoleLog: ReturnType<typeof vi.spyOn>;
	let consoleError: ReturnType<typeof vi.spyOn>;
	const nowSeconds = 1_800_000_000;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(nowSeconds * 1000));
		consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
		consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.useRealTimers();
		consoleLog.mockRestore();
		consoleError.mockRestore();
	});

	const expectedCutoff = () => nowSeconds - RETENTION_DAYS * 24 * 60 * 60;

	it("uses a 90-day window", () => {
		expect(RETENTION_DAYS).toBe(90);
	});

	describe("petal_security_log", () => {
		it("prunes it from the main engine DB, not OBS_DB", async () => {
			const obs = createFakeD1("obs");
			const main = createFakeD1("main");

			await runRetentionCleanup(obs.db, main.db);

			const petalDeletes = deletes(main.queries).filter((q) =>
				q.sql.includes("petal_security_log"),
			);
			expect(petalDeletes).toHaveLength(1);
			expect(deletes(obs.queries).some((q) => q.sql.includes("petal_security_log"))).toBe(false);
		});

		it("compares the TEXT timestamp against a datetime cutoff", async () => {
			const obs = createFakeD1("obs");
			const main = createFakeD1("main");

			await runRetentionCleanup(obs.db, main.db);

			const [petalDelete] = deletes(main.queries).filter((q) =>
				q.sql.includes("petal_security_log"),
			);
			// `timestamp` holds `datetime('now')` text — a bare integer comparison
			// would be nonsense, so the cutoff is rendered into the same shape.
			expect(petalDelete.sql).toBe(
				"DELETE FROM petal_security_log WHERE timestamp < datetime(?, 'unixepoch')",
			);
			expect(petalDelete.params).toEqual([expectedCutoff()]);
		});

		it("skips the petal table when no main DB is supplied", async () => {
			const obs = createFakeD1("obs");

			await runRetentionCleanup(obs.db);

			const obsDeletes = deletes(obs.queries);
			expect(obsDeletes).toHaveLength(7);
			expect(obsDeletes.some((q) => q.sql.includes("petal_security_log"))).toBe(false);
		});
	});

	describe("observability tables", () => {
		it("still prunes them from OBS_DB with the epoch cutoff", async () => {
			const obs = createFakeD1("obs");
			const main = createFakeD1("main");

			await runRetentionCleanup(obs.db, main.db);

			const obsDeletes = deletes(obs.queries);
			const tables = obsDeletes.map((q) => q.sql.replace("DELETE FROM ", "").split(" ")[0]);
			expect(tables).toEqual([
				"observability_metrics",
				"observability_health_checks",
				"observability_d1_stats",
				"observability_r2_stats",
				"observability_kv_stats",
				"observability_do_stats",
				"observability_collection_log",
			]);

			for (const q of obsDeletes) {
				expect(q.sql).not.toContain("datetime(");
				expect(q.params).toEqual([expectedCutoff()]);
			}
		});
	});

	describe("legal hold", () => {
		it("never deletes from petal_ncmec_queue", async () => {
			const obs = createFakeD1("obs");
			const main = createFakeD1("main");

			await runRetentionCleanup(obs.db, main.db);

			const allQueries = [...obs.queries, ...main.queries];
			const touchers = allQueries.filter((q) => q.sql.includes("petal_ncmec_queue"));

			expect(touchers).toHaveLength(0);
			// Belt and braces: migration 030_petal.sql marks the table permanent.
			for (const q of deletes(allQueries)) {
				expect(q.sql).not.toContain("DELETE FROM petal_ncmec_queue");
			}
		});
	});

	describe("failure handling", () => {
		it("keeps cleaning other tables when one delete fails", async () => {
			const obs = createFakeD1("obs");
			const failing = {
				prepare: (sql: string) => ({
					bind: () => ({
						run: async () => {
							if (sql.includes("petal_security_log")) throw new Error("no such table");
							return { success: true, meta: { changes: 0 } };
						},
					}),
					first: async () => null,
					all: async () => ({ results: [] }),
					run: async () => ({ success: true, meta: { changes: 0 } }),
				}),
				batch: async () => [],
				exec: async () => undefined,
				dump: async () => new ArrayBuffer(0),
			} as unknown as D1Database;

			await expect(runRetentionCleanup(obs.db, failing)).resolves.toBeUndefined();

			expect(consoleError).toHaveBeenCalled();
			expect(deletes(obs.queries).length).toBe(7);
		});
	});
});
