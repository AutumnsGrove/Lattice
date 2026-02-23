/**
 * Shared mock factories for Cloudflare adapter tests.
 *
 * Creates vi.fn() mocks that implement just enough of the Cloudflare
 * binding interfaces to test adapter delegation behavior.
 */

import { vi } from "vitest";

// =============================================================================
// D1Database Mock
// =============================================================================

export interface MockD1PreparedStatement {
	bind: ReturnType<typeof vi.fn>;
	first: ReturnType<typeof vi.fn>;
	all: ReturnType<typeof vi.fn>;
	run: ReturnType<typeof vi.fn>;
	raw: ReturnType<typeof vi.fn>;
}

export interface MockD1Database {
	prepare: ReturnType<typeof vi.fn>;
	batch: ReturnType<typeof vi.fn>;
	exec: ReturnType<typeof vi.fn>;
	dump: ReturnType<typeof vi.fn>;
}

const defaultMeta = {
	changes: 0,
	duration: 1.5,
	last_row_id: 0,
	rows_read: 1,
	rows_written: 0,
};

export function createMockD1Statement(overrides?: {
	allResult?: { results: unknown[]; meta?: Record<string, unknown> };
	firstResult?: unknown;
	runResult?: Record<string, unknown>;
	rawResult?: unknown[];
}): MockD1PreparedStatement {
	const stmt: MockD1PreparedStatement = {
		bind: vi.fn(),
		first: vi.fn().mockResolvedValue(overrides?.firstResult ?? null),
		all: vi.fn().mockResolvedValue(overrides?.allResult ?? { results: [], meta: defaultMeta }),
		run: vi.fn().mockResolvedValue(overrides?.runResult ?? { meta: defaultMeta }),
		raw: vi.fn().mockResolvedValue(overrides?.rawResult ?? []),
	};
	// bind() returns the same statement (chaining)
	stmt.bind.mockReturnValue(stmt);
	return stmt;
}

export function createMockD1(stmt?: MockD1PreparedStatement): MockD1Database {
	const mockStmt = stmt ?? createMockD1Statement();
	return {
		prepare: vi.fn().mockReturnValue(mockStmt),
		batch: vi.fn().mockResolvedValue([]),
		exec: vi.fn().mockResolvedValue(undefined),
		dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
	};
}

// =============================================================================
// R2Bucket Mock
// =============================================================================

export interface MockR2Object {
	key: string;
	size: number;
	etag: string;
	uploaded: Date;
	httpMetadata?: { contentType?: string };
	customMetadata?: Record<string, string>;
	body?: ReadableStream;
}

export interface MockR2Bucket {
	put: ReturnType<typeof vi.fn>;
	get: ReturnType<typeof vi.fn>;
	head: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	list: ReturnType<typeof vi.fn>;
}

export function createMockR2Object(overrides?: Partial<MockR2Object>): MockR2Object {
	return {
		key: overrides?.key ?? "test-key",
		size: overrides?.size ?? 100,
		etag: overrides?.etag ?? '"mock-etag"',
		uploaded: overrides?.uploaded ?? new Date("2026-01-01"),
		httpMetadata:
			overrides && "httpMetadata" in overrides
				? overrides.httpMetadata
				: { contentType: "text/plain" },
		customMetadata: overrides?.customMetadata ?? {},
		body: overrides?.body,
	};
}

export function createMockR2(): MockR2Bucket {
	return {
		put: vi.fn().mockResolvedValue(createMockR2Object()),
		get: vi.fn().mockResolvedValue(null),
		head: vi.fn().mockResolvedValue(null),
		delete: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue({
			objects: [],
			truncated: false,
			cursor: "",
		}),
	};
}

// =============================================================================
// KVNamespace Mock
// =============================================================================

export interface MockKVNamespace {
	get: ReturnType<typeof vi.fn>;
	put: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	list: ReturnType<typeof vi.fn>;
	getWithMetadata: ReturnType<typeof vi.fn>;
}

export function createMockKVNamespace(): MockKVNamespace {
	return {
		get: vi.fn().mockResolvedValue(null),
		put: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue({
			keys: [],
			cursor: "",
			list_complete: true,
		}),
		getWithMetadata: vi.fn().mockResolvedValue({ value: null, metadata: null }),
	};
}

// =============================================================================
// Fetcher Mock (Service Bindings)
// =============================================================================

export interface MockFetcher {
	fetch: ReturnType<typeof vi.fn>;
}

export function createMockFetcher(overrides?: {
	status?: number;
	body?: unknown;
	headers?: Record<string, string>;
}): MockFetcher {
	const status = overrides?.status ?? 200;
	const body = overrides?.body ?? {};
	const headers = new Map(
		Object.entries(overrides?.headers ?? { "content-type": "application/json" }),
	);

	return {
		fetch: vi.fn().mockResolvedValue({
			ok: status >= 200 && status < 300,
			status,
			headers: {
				get: (key: string) => headers.get(key.toLowerCase()) ?? null,
				entries: () => headers.entries(),
				[Symbol.iterator]: () => headers.entries(),
			},
			json: vi.fn().mockResolvedValue(body),
			text: vi.fn().mockResolvedValue(typeof body === "string" ? body : JSON.stringify(body)),
		}),
	};
}
