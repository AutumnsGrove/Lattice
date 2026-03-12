/**
 * Meadow Test Helpers
 *
 * D1Database mock that mirrors Cloudflare's fluent API:
 *   db.prepare(sql).bind(...args).run() / .first() / .all()
 *   db.batch([stmt1, stmt2])
 */

import { vi } from "vitest";

// ── Types ────────────────────────────────────────────────────────────

export interface MockD1Result<T = unknown> {
	results: T[];
	meta: { changes: number };
	success: boolean;
}

interface MockStatement {
	_sql: string;
	_bindings: unknown[];
	bind: (...args: unknown[]) => MockStatement;
	run: () => Promise<MockD1Result>;
	first: <T = unknown>(col?: string) => Promise<T | null>;
	all: <T = unknown>() => Promise<MockD1Result<T>>;
}

// ── Configurable result queue ────────────────────────────────────────

/**
 * Create a mock D1Database with a configurable result queue.
 *
 * Usage:
 *   const db = createMockD1();
 *   db._pushResult({ results: [...], meta: { changes: 1 } });
 *   await votes.castVote(db as unknown as D1Database, "u1", "p1");
 *   expect(db._calls[0].sql).toContain("INSERT");
 */
export function createMockD1() {
	const calls: Array<{ sql: string; bindings: unknown[] }> = [];
	const resultQueue: MockD1Result[] = [];
	const errorQueue: Error[] = [];

	function nextResult(): MockD1Result {
		if (errorQueue.length > 0) {
			throw errorQueue.shift()!;
		}
		return resultQueue.shift() ?? { results: [], meta: { changes: 0 }, success: true };
	}

	function createStatement(sql: string): MockStatement {
		let bindings: unknown[] = [];

		const stmt: MockStatement = {
			_sql: sql,
			_bindings: bindings,
			bind(...args: unknown[]) {
				bindings = args;
				stmt._bindings = args;
				return stmt;
			},
			async run() {
				calls.push({ sql, bindings });
				return nextResult();
			},
			async first<T = unknown>(_col?: string) {
				calls.push({ sql, bindings });
				const result = nextResult();
				return (result.results[0] as T) ?? null;
			},
			async all<T = unknown>() {
				calls.push({ sql, bindings });
				return nextResult() as MockD1Result<T>;
			},
		};

		return stmt;
	}

	return {
		/** Recorded calls — inspect sql and bindings */
		_calls: calls,

		/** Push a result that the next query will return */
		_pushResult(result: Partial<MockD1Result>) {
			resultQueue.push({
				results: result.results ?? [],
				meta: result.meta ?? { changes: 0 },
				success: result.success ?? true,
			});
		},

		/** Push an error that the next query will throw */
		_pushError(error: Error) {
			errorQueue.push(error);
		},

		/** Clear recorded calls */
		_reset() {
			calls.length = 0;
			resultQueue.length = 0;
			errorQueue.length = 0;
		},

		prepare: vi.fn((sql: string) => createStatement(sql)),

		batch: vi.fn(async (stmts: MockStatement[]) => {
			const results: MockD1Result[] = [];
			for (const stmt of stmts) {
				calls.push({ sql: stmt._sql, bindings: stmt._bindings });
				results.push(nextResult());
			}
			return results;
		}),
	};
}

export type MockD1 = ReturnType<typeof createMockD1>;
