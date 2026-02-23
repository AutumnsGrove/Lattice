/**
 * In-memory GroveDatabase mock for testing.
 *
 * Stores query calls for assertion. Supports pre-configured responses.
 */

import type {
	GroveDatabase,
	PreparedStatement,
	BoundStatement,
	QueryResult,
	QueryMeta,
	GroveTransaction,
	DatabaseInfo,
} from "../types.js";

const EMPTY_META: QueryMeta = {
	changes: 0,
	duration: 0,
	last_row_id: 0,
	rows_read: 0,
	rows_written: 0,
};

export interface MockQueryCall {
	sql: string;
	params?: unknown[];
}

export class MockDatabase implements GroveDatabase {
	/** All queries executed against this mock */
	readonly calls: MockQueryCall[] = [];

	private responses = new Map<string, Record<string, unknown>[]>();

	/** Pre-configure a response for a SQL pattern */
	whenQuery(sqlPattern: string, results: Record<string, unknown>[]): this {
		this.responses.set(sqlPattern, results);
		return this;
	}

	async execute(sql: string, params?: unknown[]): Promise<QueryResult> {
		this.calls.push({ sql, params });

		// Find a matching response
		for (const [pattern, results] of this.responses) {
			if (sql.includes(pattern)) {
				return { results, meta: { ...EMPTY_META, rows_read: results.length } };
			}
		}

		return { results: [], meta: EMPTY_META };
	}

	async batch(statements: BoundStatement[]): Promise<QueryResult[]> {
		return statements.map(() => ({
			results: [],
			meta: EMPTY_META,
		}));
	}

	prepare(sql: string): PreparedStatement {
		const self = this;
		return {
			bind(...params: unknown[]): BoundStatement {
				return {
					async first<T = Record<string, unknown>>(_column?: string): Promise<T | null> {
						const result = await self.execute(sql, params);
						return (result.results[0] as T) ?? null;
					},
					async all<T = Record<string, unknown>>(): Promise<QueryResult<T>> {
						const result = await self.execute(sql, params);
						return result as QueryResult<T>;
					},
					async run(): Promise<QueryMeta> {
						const result = await self.execute(sql, params);
						return result.meta;
					},
					async raw<T = unknown[]>(): Promise<T[]> {
						const result = await self.execute(sql, params);
						return result.results.map((r) => Object.values(r) as unknown as T);
					},
				};
			},
		};
	}

	async transaction<T>(fn: (tx: GroveTransaction) => Promise<T>): Promise<T> {
		// Mock transactions just run the function directly
		const tx: GroveTransaction = {
			execute: (sql, params) => this.execute(sql, params),
			prepare: (sql) => this.prepare(sql),
		};
		return fn(tx);
	}

	info(): DatabaseInfo {
		return {
			provider: "mock",
			database: "test",
			readonly: false,
		};
	}

	/** Reset all recorded calls and responses */
	reset(): void {
		this.calls.length = 0;
		this.responses.clear();
	}
}
