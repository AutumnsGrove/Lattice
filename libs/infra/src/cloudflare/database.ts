/**
 * Cloudflare D1 adapter for GroveDatabase.
 *
 * Thin wrapper around D1Database. Zero overhead on the happy path —
 * the adapter simply delegates to D1's native API.
 */

import { logGroveError } from "@autumnsgrove/lattice/errors";
import { SRV_ERRORS } from "../errors.js";
import type {
	GroveDatabase,
	PreparedStatement,
	BoundStatement,
	QueryResult,
	QueryMeta,
	GroveTransaction,
	DatabaseInfo,
	GroveObserver,
} from "../types.js";

export class CloudflareDatabase implements GroveDatabase {
	constructor(
		private readonly d1: D1Database,
		private readonly databaseName: string = "default",
		private readonly observer?: GroveObserver,
	) {}

	async execute(sql: string, params?: unknown[]): Promise<QueryResult> {
		// Input validation: sql must be a non-empty string
		if (!sql || typeof sql !== "string" || sql.trim().length === 0) {
			logGroveError("InfraSDK", SRV_ERRORS.QUERY_FAILED, {
				detail: "execute() called with empty or invalid SQL",
			});
			throw new Error("SQL query cannot be empty");
		}

		const start = performance.now();
		try {
			const stmt = params?.length ? this.d1.prepare(sql).bind(...params) : this.d1.prepare(sql);
			const result = await stmt.all();
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "db",
				operation: "execute",
				durationMs,
				ok: true,
				detail: sql.slice(0, 100),
			});
			return {
				results: result.results as Record<string, unknown>[],
				meta: this.extractMeta(result.meta),
			};
		} catch (error) {
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "db",
				operation: "execute",
				durationMs,
				ok: false,
				detail: sql.slice(0, 100),
				error: error instanceof Error ? error.message : String(error),
			});
			logGroveError("InfraSDK", SRV_ERRORS.QUERY_FAILED, {
				detail: sql.slice(0, 100),
				cause: error,
			});
			throw error;
		}
	}

	async batch(statements: BoundStatement[]): Promise<QueryResult[]> {
		// Input validation: statements array must not be empty
		if (!Array.isArray(statements) || statements.length === 0) {
			logGroveError("InfraSDK", SRV_ERRORS.QUERY_FAILED, {
				detail: "batch() called with empty statements array",
			});
			throw new Error("Batch statements array cannot be empty");
		}

		const start = performance.now();
		try {
			// D1's batch expects D1PreparedStatement instances.
			// BoundStatements created via CloudflareDatabase.prepare().bind()
			// are D1PreparedStatements under the hood. Validate that each
			// statement has the expected .all() method before casting.
			for (const stmt of statements) {
				if (typeof stmt.all !== "function") {
					logGroveError("InfraSDK", SRV_ERRORS.QUERY_FAILED, {
						detail: "batch() received a statement not created by this adapter",
					});
					throw new Error(
						"Batch statements must be created via CloudflareDatabase.prepare().bind()",
					);
				}
			}
			const results = await this.d1.batch(statements as unknown as D1PreparedStatement[]);
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "db",
				operation: "batch",
				durationMs,
				ok: true,
				detail: `${statements.length} statements`,
			});
			return results.map((result) => ({
				results: result.results as Record<string, unknown>[],
				meta: this.extractMeta(result.meta),
			}));
		} catch (error) {
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "db",
				operation: "batch",
				durationMs,
				ok: false,
				detail: `${statements.length} statements`,
				error: error instanceof Error ? error.message : String(error),
			});
			logGroveError("InfraSDK", SRV_ERRORS.QUERY_FAILED, {
				detail: `batch of ${statements.length} statements`,
				cause: error,
			});
			throw error;
		}
	}

	prepare(sql: string): PreparedStatement {
		// Input validation: sql must be a non-empty string
		if (!sql || typeof sql !== "string" || sql.trim().length === 0) {
			logGroveError("InfraSDK", SRV_ERRORS.QUERY_FAILED, {
				detail: "prepare() called with empty or invalid SQL",
			});
			throw new Error("SQL query cannot be empty");
		}

		const d1Stmt = this.d1.prepare(sql);
		return {
			bind(...params: unknown[]): BoundStatement {
				return d1Stmt.bind(...params) as unknown as BoundStatement;
			},
		};
	}

	async transaction<T>(_fn: (tx: GroveTransaction) => Promise<T>): Promise<T> {
		// D1 doesn't support interactive transactions.
		// For true transaction support, consumers should use Loom DOs or batch().
		logGroveError("InfraSDK", SRV_ERRORS.TRANSACTIONS_NOT_SUPPORTED, {
			detail: "Use batch() for atomic operations or Loom DOs for interactive transactions.",
		});
		throw new Error(SRV_ERRORS.TRANSACTIONS_NOT_SUPPORTED.adminMessage);
	}

	info(): DatabaseInfo {
		return {
			provider: "cloudflare-d1",
			database: this.databaseName,
			readonly: false,
		};
	}

	private extractMeta(d1Meta: D1Meta): QueryMeta {
		return {
			changes: d1Meta.changes ?? 0,
			duration: d1Meta.duration ?? 0,
			last_row_id: d1Meta.last_row_id ?? 0,
			rows_read: d1Meta.rows_read ?? 0,
			rows_written: d1Meta.rows_written ?? 0,
		};
	}
}
