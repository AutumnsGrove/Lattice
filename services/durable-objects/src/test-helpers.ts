/**
 * DO Test Helpers
 *
 * Enhanced mock factories for testing LoomDO subclasses.
 * Uses a result-queue pattern: push expected results before calling DO methods,
 * and the mock SQL returns them in order.
 *
 * @example
 * ```typescript
 * const { state, sql } = createTestDOState("test-id");
 * sql._pushResult({ count: 5 }); // For a SELECT COUNT(*) query
 * const doInstance = new ThresholdDO(state, mockEnv);
 * const response = await doInstance.fetch(new Request("http://do/health"));
 * ```
 */

import { vi } from "vitest";

// ============================================================================
// Mock SqlStorage (Result Queue Pattern)
// ============================================================================

export interface SqlCall {
	query: string;
	bindings: unknown[];
}

export interface MockSqlStorage {
	/** Track all SQL calls */
	_calls: SqlCall[];
	/** Push a result row for the next exec() call */
	_pushResult: (row: Record<string, unknown> | null) => void;
	/** Push multiple result rows for the next exec() call */
	_pushResults: (rows: Record<string, unknown>[]) => void;
	/** Reset all state */
	_reset: () => void;
	/** The underlying exec function */
	exec: (query: string, ...bindings: unknown[]) => SqlStorageCursorLike;
}

interface SqlStorageCursorLike {
	one: () => Record<string, unknown> | null;
	toArray: () => Record<string, unknown>[];
	columnNames: string[];
	raw: () => unknown[][];
	[Symbol.iterator]: () => Iterator<Record<string, unknown>>;
}

/**
 * Create a mock SqlStorage with configurable result queue.
 *
 * By default, DDL statements (CREATE TABLE) return empty results.
 * For all other statements, results come from the queue.
 * If the queue is empty, returns null/empty defaults.
 */
export function createMockSql(): MockSqlStorage {
	const calls: SqlCall[] = [];
	const resultQueue: Array<Record<string, unknown>[] | null> = [];

	function exec(query: string, ...bindings: unknown[]): SqlStorageCursorLike {
		calls.push({ query, bindings });

		// DDL statements get empty results (schema creation)
		const trimmed = query.trim().toUpperCase();
		if (trimmed.startsWith("CREATE TABLE") || trimmed.startsWith("CREATE INDEX")) {
			return makeCursor([]);
		}

		// Pop from result queue, or use default empty
		const nextResult = resultQueue.shift();
		if (nextResult === null || nextResult === undefined) {
			return makeCursor([]);
		}
		return makeCursor(nextResult);
	}

	return {
		_calls: calls,
		_pushResult: (row: Record<string, unknown> | null) => {
			resultQueue.push(row ? [row] : null);
		},
		_pushResults: (rows: Record<string, unknown>[]) => {
			resultQueue.push(rows);
		},
		_reset: () => {
			calls.length = 0;
			resultQueue.length = 0;
		},
		exec,
	};
}

function makeCursor(rows: Record<string, unknown>[]): SqlStorageCursorLike {
	return {
		one: () => rows[0] ?? null,
		toArray: () => rows,
		columnNames: rows.length > 0 ? Object.keys(rows[0]) : [],
		raw: () => rows.map((r) => Object.values(r)),
		[Symbol.iterator]: function* () {
			yield* rows;
		},
	};
}

// ============================================================================
// Mock DurableObjectStorage
// ============================================================================

export function createMockStorage(mockSql?: MockSqlStorage) {
	const kv = new Map<string, unknown>();
	let alarm: number | null = null;
	const sql = mockSql ?? createMockSql();

	return {
		get: vi.fn(async (key: string) => kv.get(key)),
		put: vi.fn(async (key: string | Record<string, unknown>, value?: unknown) => {
			if (typeof key === "string") {
				kv.set(key, value);
			}
		}),
		delete: vi.fn(async (key: string) => kv.delete(key)),
		list: vi.fn(async () => kv as unknown as Map<string, unknown>),
		getAlarm: vi.fn(async () => alarm),
		setAlarm: vi.fn(async (ms: number) => {
			alarm = ms;
		}),
		deleteAlarm: vi.fn(async () => {
			alarm = null;
		}),
		sql: sql as unknown as SqlStorage,
		deleteAll: vi.fn(async () => {}),
		transaction: vi.fn(async (fn: () => Promise<void>) => fn()),
		sync: vi.fn(async () => {}),
		transactionSync: vi.fn((fn: () => void) => fn()),
		getCurrentBookmark: vi.fn(async () => ""),
		getBookmarkForTime: vi.fn(async () => ""),
		onNextSessionRestart: vi.fn(async () => {}),
		/** Access the underlying KV map for assertions */
		_kv: kv,
		/** Access the mock SQL for result queue */
		_sql: sql,
	};
}

// ============================================================================
// Mock DurableObjectState
// ============================================================================

export function createTestDOState(idName = "test-do", mockSql?: MockSqlStorage) {
	const sql = mockSql ?? createMockSql();
	const storage = createMockStorage(sql);
	const webSockets: WebSocket[] = [];
	const tags = new Map<WebSocket, string[]>();

	const state = {
		id: {
			toString: () => idName,
			name: idName,
			equals: (other: { toString: () => string }) => other.toString() === idName,
		} as DurableObjectId,
		storage: storage as unknown as DurableObjectStorage,
		blockConcurrencyWhile: vi.fn(async <T>(fn: () => Promise<T>) => fn()),
		waitUntil: vi.fn((_promise: Promise<unknown>) => {}),
		acceptWebSocket: vi.fn((_ws: WebSocket, _tags?: string[]) => {
			webSockets.push(_ws);
			if (_tags) tags.set(_ws, _tags);
		}),
		getWebSockets: vi.fn((_tag?: string) => webSockets),
		setWebSocketAutoResponse: vi.fn(),
		getWebSocketAutoResponse: vi.fn(() => null),
		getTags: vi.fn((ws: WebSocket) => tags.get(ws) ?? []),
		abort: vi.fn(),
	} as unknown as DurableObjectState;

	return { state, storage, sql };
}

// ============================================================================
// Mock D1Database (Enhanced with Result Queue)
// ============================================================================

export interface MockD1 {
	_calls: Array<{ sql: string; bindings: unknown[] }>;
	_pushResult: (result: Partial<D1MockResult>) => void;
	_pushError: (error: Error) => void;
	_reset: () => void;
	prepare: (sql: string) => D1MockPrepared;
	batch: (stmts: unknown[]) => Promise<unknown[]>;
	exec: (sql: string) => Promise<{ count: number; duration: number }>;
}

interface D1MockResult {
	results: unknown[];
	success: boolean;
	meta: { changes?: number; [key: string]: unknown };
}

interface D1MockPrepared {
	bind: (...values: unknown[]) => D1MockPrepared;
	all: <T = unknown>() => Promise<{
		results: T[];
		success: boolean;
		meta: Record<string, unknown>;
	}>;
	first: <T = unknown>() => Promise<T | null>;
	run: () => Promise<{ success: boolean; meta: { changes: number } }>;
	raw: () => Promise<unknown[][]>;
}

export function createMockD1(): MockD1 {
	const calls: Array<{ sql: string; bindings: unknown[] }> = [];
	const resultQueue: Array<Partial<D1MockResult> | Error> = [];

	function getNext(sql: string, bindings: unknown[]): Partial<D1MockResult> {
		calls.push({ sql, bindings });
		const next = resultQueue.shift();
		if (next instanceof Error) throw next;
		return next ?? { results: [], success: true, meta: { changes: 0 } };
	}

	function makePrepared(sql: string): D1MockPrepared {
		let boundValues: unknown[] = [];

		const prepared: D1MockPrepared = {
			bind: (...values: unknown[]) => {
				boundValues = values;
				return prepared;
			},
			all: async <T>() => {
				const result = getNext(sql, boundValues);
				return {
					results: (result.results ?? []) as T[],
					success: result.success ?? true,
					meta: result.meta ?? {},
				};
			},
			first: async <T>() => {
				const result = getNext(sql, boundValues);
				return ((result.results ?? [])[0] as T) ?? null;
			},
			run: async () => {
				const result = getNext(sql, boundValues);
				return {
					success: result.success ?? true,
					meta: { changes: (result.meta?.changes as number) ?? 0, ...result.meta },
				};
			},
			raw: async () => {
				const result = getNext(sql, boundValues);
				return (result.results ?? []) as unknown[][];
			},
		};

		return prepared;
	}

	return {
		_calls: calls,
		_pushResult: (result: Partial<D1MockResult>) => {
			resultQueue.push(result);
		},
		_pushError: (error: Error) => {
			resultQueue.push(error);
		},
		_reset: () => {
			calls.length = 0;
			resultQueue.length = 0;
		},
		prepare: (sql: string) => makePrepared(sql),
		batch: vi.fn(async (stmts: unknown[]) => {
			// Execute each statement in the batch
			const results: unknown[] = [];
			for (const _stmt of stmts) {
				const next = resultQueue.shift();
				results.push(
					next instanceof Error ? null : (next ?? { results: [], success: true, meta: {} }),
				);
			}
			return results;
		}),
		exec: vi.fn(async () => ({ count: 0, duration: 0 })),
	};
}

// ============================================================================
// Mock R2Bucket
// ============================================================================

export function createMockR2() {
	const objects = new Map<string, { data: string; metadata?: Record<string, unknown> }>();

	return {
		put: vi.fn(async (key: string, value: unknown, options?: Record<string, unknown>) => {
			objects.set(key, {
				data: typeof value === "string" ? value : JSON.stringify(value),
				metadata: options,
			});
			return {} as R2Object;
		}),
		get: vi.fn(async (key: string) => {
			const val = objects.get(key);
			if (!val) return null;
			return {
				text: async () => val.data,
				json: async () => JSON.parse(val.data),
				arrayBuffer: async () => new TextEncoder().encode(val.data).buffer,
				body: new ReadableStream(),
				bodyUsed: false,
			} as unknown as R2ObjectBody;
		}),
		head: vi.fn(async (key: string) => {
			if (!objects.has(key)) return null;
			return {} as R2Object;
		}),
		delete: vi.fn(async (key: string) => {
			objects.delete(key);
		}),
		list: vi.fn(async () => ({
			objects: [],
			truncated: false,
			delimitedPrefixes: [],
		})),
		_objects: objects,
	};
}

// ============================================================================
// Mock KVNamespace
// ============================================================================

export function createMockKV() {
	const store = new Map<string, string>();

	return {
		get: vi.fn(async (key: string) => store.get(key) ?? null),
		put: vi.fn(async (key: string, value: string) => {
			store.set(key, value);
		}),
		delete: vi.fn(async (key: string) => {
			store.delete(key);
		}),
		list: vi.fn(async () => ({ keys: [], list_complete: true, caches: [] })),
		getWithMetadata: vi.fn(async (key: string) => ({
			value: store.get(key) ?? null,
			metadata: null,
		})),
		_store: store,
	};
}

// ============================================================================
// Async Init Helper
// ============================================================================

/**
 * Wait for blockOnInit async initialization to complete.
 *
 * DOs with blockOnInit:true start initialize() in the constructor via
 * blockConcurrencyWhile(), but since the constructor can't await, the init
 * is fire-and-forget. Calling this after `new SomeDO(state, env)` drains
 * the microtask queue so loadState() completes before any fetch() call.
 *
 * Without this, fetch() sees initialized===false, calls initialize() again,
 * and the second loadState() finds an empty result queue → overwrites
 * state_data to null.
 */
export async function waitForInit(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

// ============================================================================
// Request Helpers
// ============================================================================

/** Create a Request to a DO endpoint */
export function doRequest(
	path: string,
	options: {
		method?: string;
		body?: unknown;
		headers?: Record<string, string>;
	} = {},
): Request {
	const { method = "GET", body, headers = {} } = options;
	const init: RequestInit = { method, headers };
	if (body !== undefined) {
		init.body = JSON.stringify(body);
		(init.headers as Record<string, string>)["Content-Type"] = "application/json";
	}
	return new Request(`http://do${path}`, init);
}

/** Shorthand for POST requests */
export function doPost(path: string, body: unknown): Request {
	return doRequest(path, { method: "POST", body });
}

/** Shorthand for PUT requests */
export function doPut(path: string, body: unknown): Request {
	return doRequest(path, { method: "PUT", body });
}

/** Shorthand for PATCH requests */
export function doPatch(path: string, body: unknown): Request {
	return doRequest(path, { method: "PATCH", body });
}

/** Shorthand for DELETE requests */
export function doDelete(path: string, body?: unknown): Request {
	return doRequest(path, { method: "DELETE", body });
}
