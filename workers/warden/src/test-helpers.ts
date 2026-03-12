/**
 * Warden Test Helpers
 *
 * Mock factories for GroveDatabase, KV, Env, and test agents.
 * Follows the pattern used across Grove workers (see Lumen tests).
 */

import { vi } from "vitest";
import type { Env, WardenAgent } from "./types";

// =============================================================================
// MOCK GROVE DATABASE
// =============================================================================

export interface MockBoundStatement {
	first: ReturnType<typeof vi.fn>;
	all: ReturnType<typeof vi.fn>;
	run: ReturnType<typeof vi.fn>;
	raw: ReturnType<typeof vi.fn>;
}

export interface MockPreparedStatement {
	bind: (...params: unknown[]) => MockBoundStatement;
	_bound: MockBoundStatement;
}

export interface MockGroveDatabase {
	execute: ReturnType<typeof vi.fn>;
	batch: ReturnType<typeof vi.fn>;
	prepare: (sql: string) => MockPreparedStatement;
	transaction: ReturnType<typeof vi.fn>;
	info: ReturnType<typeof vi.fn>;
	_prepared: MockPreparedStatement;
}

/**
 * Create a mock GroveDatabase.
 *
 * Usage:
 *   const db = createMockGroveDB();
 *   db._prepared._bound.first.mockResolvedValue(someAgent);
 *   // Now db.prepare("...").bind(...).first() will return someAgent
 */
export function createMockGroveDB(): MockGroveDatabase {
	const bound: MockBoundStatement = {
		first: vi.fn().mockResolvedValue(null),
		all: vi.fn().mockResolvedValue({ results: [], meta: { changes: 0 } }),
		run: vi.fn().mockResolvedValue({ changes: 0 }),
		raw: vi.fn().mockResolvedValue([]),
	};

	const prepared: MockPreparedStatement = {
		bind: vi.fn().mockReturnValue(bound),
		_bound: bound,
	};

	return {
		execute: vi.fn().mockResolvedValue({
			results: [],
			meta: { changes: 0, duration: 0, last_row_id: 0, rows_read: 0, rows_written: 0 },
		}),
		batch: vi.fn().mockResolvedValue([]),
		prepare: vi.fn().mockReturnValue(prepared),
		transaction: vi.fn(),
		info: vi.fn().mockReturnValue({ provider: "test", database: "grove-warden", readOnly: false }),
		_prepared: prepared,
	};
}

// =============================================================================
// MOCK KV NAMESPACE
// =============================================================================

export interface MockKV {
	get: ReturnType<typeof vi.fn>;
	put: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	list: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock KVNamespace with stateful get/put/delete.
 * Optionally pass initial data as a Record.
 */
export function createMockKV(initialData: Record<string, string> = {}): MockKV {
	const store = new Map<string, string>(Object.entries(initialData));

	return {
		get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
		put: vi.fn((key: string, value: string) => {
			store.set(key, value);
			return Promise.resolve();
		}),
		delete: vi.fn((key: string) => {
			store.delete(key);
			return Promise.resolve();
		}),
		list: vi.fn().mockResolvedValue({ keys: [], list_complete: true }),
	};
}

// =============================================================================
// MOCK ENV
// =============================================================================

/** Create a full mock Env with all bindings */
export function createMockEnv(overrides: Partial<Env> = {}): Env {
	return {
		DB: {} as D1Database,
		TENANT_DB: {} as D1Database,
		NONCES: createMockKV() as unknown as KVNamespace,
		RATE_LIMITS: createMockKV() as unknown as KVNamespace,
		WARDEN_SIGNING_KEY: "test-signing-key",
		GROVE_KEK: "test-grove-kek",
		GITHUB_TOKEN: "ghp_testGlobalGitHubToken1234567890abcdef",
		TAVILY_API_KEY: "tvly-testGlobalTavilyKey12345",
		CLOUDFLARE_API_TOKEN: "v1.testGlobalCloudflareToken1234567890abcdefgh",
		EXA_API_KEY: "exa-testGlobalExaKey1234567890",
		RESEND_API_KEY: "re_testGlobalResendKey12345678",
		STRIPE_SECRET_KEY: "sk_test_testGlobalStripeKey1234567890",
		OPENROUTER_API_KEY: "test-global-openrouter-key",
		HETZNER_API_TOKEN: "test-global-hetzner-token",
		FLY_API_TOKEN: "test-global-fly-token",
		WARDEN_ADMIN_KEY: "test-admin-key",
		...overrides,
	};
}

// =============================================================================
// TEST AGENT FACTORY
// =============================================================================

let agentCounter = 0;

/** Reset the agent counter (call in beforeEach) */
export function resetTestCounters(): void {
	agentCounter = 0;
}

/** Create a test WardenAgent with sensible defaults */
export function createTestAgent(overrides: Partial<WardenAgent> = {}): WardenAgent {
	agentCounter++;
	return {
		id: `wdn_testagent${String(agentCounter).padStart(3, "0")}`,
		name: `test-agent-${agentCounter}`,
		owner: "test-owner",
		secret_hash: "abc123hash",
		scopes: JSON.stringify(["github:read", "tavily:read"]),
		rate_limit_rpm: 60,
		rate_limit_daily: 1000,
		enabled: 1,
		created_at: "2026-01-01T00:00:00Z",
		last_used_at: null,
		request_count: 0,
		...overrides,
	};
}

// =============================================================================
// MOCK GROVE CONTEXT
// =============================================================================

/** Create a mock GroveContext (only db is needed for Warden) */
export function createMockGroveContext(db?: MockGroveDatabase) {
	const mockDb = db ?? createMockGroveDB();
	return {
		db: mockDb,
		storage: {} as never,
		kv: {} as never,
		services: {} as never,
		scheduler: {} as never,
		config: {} as never,
	};
}

// =============================================================================
// REQUEST HELPERS
// =============================================================================

/** Create a POST request with JSON body */
export function jsonRequest(
	path: string,
	body: unknown,
	headers: Record<string, string> = {},
): Request {
	return new Request(`http://localhost${path}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
		body: JSON.stringify(body),
	});
}

/** Create a GET request */
export function getRequest(path: string, headers: Record<string, string> = {}): Request {
	return new Request(`http://localhost${path}`, {
		method: "GET",
		headers,
	});
}

/** Create a DELETE request */
export function deleteRequest(path: string, headers: Record<string, string> = {}): Request {
	return new Request(`http://localhost${path}`, {
		method: "DELETE",
		headers,
	});
}
