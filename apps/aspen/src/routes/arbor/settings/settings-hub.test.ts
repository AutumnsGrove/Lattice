/**
 * Tests for Settings Hub Page Server Load
 *
 * The hub page fetches blaze count and curio config counts from DB.
 * All other settings come from parent layout data (siteSettings, tenant).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertLoaded } from "../../../test-utils";

// ============================================================================
// MOCK D1
// ============================================================================

const TENANT_ID = "tenant-test-123";

interface MockStatement {
	_sql: string;
	_bindings: unknown[];
	bind: (...values: unknown[]) => MockStatement;
	first: <T>() => Promise<T | null>;
	all: <T>() => Promise<{ results: T[] }>;
}

function createMockDB(
	options: {
		blazeCount?: number;
	} = {},
) {
	const { blazeCount = 0 } = options;

	const mockStatement: MockStatement = {
		_sql: "",
		_bindings: [],
		bind(...values: unknown[]) {
			this._bindings = values;
			return this;
		},
		async first<T>(): Promise<T | null> {
			if (this._sql.includes("COUNT(*)")) {
				return { count: blazeCount } as T;
			}
			// curio config tables — return null (not enabled) by default
			if (
				this._sql.includes("timeline_curio_config") ||
				this._sql.includes("gallery_curio_config")
			) {
				return null;
			}
			return null;
		},
		async all<T>(): Promise<{ results: T[] }> {
			return { results: [] };
		},
	};

	return {
		prepare(sql: string) {
			const stmt = { ...mockStatement, _sql: sql, _bindings: [] as unknown[] };
			stmt.bind = (...values: unknown[]) => {
				stmt._bindings = values;
				return stmt;
			};
			return stmt;
		},
	};
}

function createLoadEvent(
	overrides: {
		tenantId?: string;
		db?: ReturnType<typeof createMockDB> | undefined;
	} = {},
) {
	const { tenantId = TENANT_ID, db = createMockDB() } = overrides;

	return {
		locals: {
			tenantId,
		},
		platform: {
			env: {
				DB: db,
			},
		},
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("Settings Hub — load()", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return defaults when no env bindings", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({ db: undefined });
		event.platform.env.DB = undefined as unknown as ReturnType<typeof createMockDB>;

		const result = await load(event as any);
		assertLoaded(result);

		expect(result.customBlazeCount).toBe(0);
		expect(result.curiosCount).toBe(0);
	});

	it("should return custom blaze count", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({
			db: createMockDB({ blazeCount: 7 }),
		});

		const result = await load(event as any);
		assertLoaded(result);

		expect(result.customBlazeCount).toBe(7);
	});

	it("should handle DB errors gracefully with per-query catch", async () => {
		const { load } = await import("./+page.server.js");
		const failingDB = {
			prepare() {
				return {
					bind() {
						return this;
					},
					async first() {
						throw new Error("D1 unavailable");
					},
					async all() {
						throw new Error("D1 unavailable");
					},
				};
			},
		};
		const event = createLoadEvent({ db: failingDB as any });

		// Should not throw — per-query catch returns defaults
		const result = await load(event as any);
		assertLoaded(result);

		expect(result.customBlazeCount).toBe(0);
		expect(result.curiosCount).toBe(0);
	});

	it("should return defaults when no tenant ID", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent();
		event.locals.tenantId = "" as any;

		const result = await load(event as any);
		assertLoaded(result);

		expect(result.customBlazeCount).toBe(0);
		expect(result.curiosCount).toBe(0);
	});

	it("should count enabled curios", async () => {
		const { load } = await import("./+page.server.js");

		// Mock DB that returns enabled for timeline and gallery
		const db = {
			prepare(sql: string) {
				return {
					_sql: sql,
					bind(..._values: unknown[]) {
						return this;
					},
					async first<T>(): Promise<T | null> {
						if (sql.includes("COUNT(*)")) return { count: 0 } as T;
						if (sql.includes("timeline_curio_config")) return { enabled: 1 } as T;
						if (sql.includes("gallery_curio_config")) return { enabled: 1 } as T;
						return null;
					},
					async all<T>(): Promise<{ results: T[] }> {
						return { results: [] };
					},
				};
			},
		};

		const event = createLoadEvent({ db: db as any });
		const result = await load(event as any);
		assertLoaded(result);

		expect(result.curiosCount).toBe(2);
	});
});
