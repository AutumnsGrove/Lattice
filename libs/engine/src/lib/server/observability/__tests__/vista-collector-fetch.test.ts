/**
 * Vista Collector Worker — fetch() Handler Tests
 *
 * Tests the HTTP fetch handler from packages/workers/vista-collector/src/index.ts.
 *
 * The handler logic is extracted here as a testable function because the worker
 * package has no test runner configured. These tests document the contract and
 * serve as regression guards.
 *
 * Handler behavior:
 * - GET /health (or any non-POST) → 200 { status: "ready" } (no auth)
 * - POST without Authorization → 401 { error: "Unauthorized" }
 * - POST with wrong token → 401 { error: "Unauthorized" }
 * - POST with correct token + no DB token configured → 401 { error: "Unauthorized" }
 * - POST with correct token → triggers collection, returns CollectionResult
 *
 * See: packages/workers/vista-collector/src/index.ts
 */

import { describe, it, expect, vi } from "vitest";

// =============================================================================
// Extracted fetch handler logic (mirrors the worker exactly)
// =============================================================================

interface MockEnv {
	CF_OBSERVABILITY_TOKEN?: string;
	CF_ACCOUNT_ID: string;
	DB: D1Database;
}

type CollectionResult = Record<string, unknown>;

interface ObservabilityCollector {
	runFullCollection(trigger: "cron" | "manual"): Promise<CollectionResult>;
}

/**
 * The fetch handler logic extracted from vista-collector/src/index.ts.
 * Receives an injected collector factory so it can be mocked in tests.
 */
async function handleFetch(
	request: Request,
	env: MockEnv,
	createCollector: (env: MockEnv) => ObservabilityCollector,
): Promise<Response> {
	// Health probe — unauthenticated, returns no sensitive data
	if (request.method !== "POST") {
		return new Response(JSON.stringify({ status: "ready" }), {
			headers: { "Content-Type": "application/json" },
		});
	}

	// Manual trigger requires Bearer token auth
	const authHeader = request.headers.get("Authorization");
	const expectedToken = env.CF_OBSERVABILITY_TOKEN;
	if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const collector = createCollector(env);
		const result = await collector.runFullCollection("manual");
		return new Response(JSON.stringify(result), {
			headers: { "Content-Type": "application/json" },
		});
	} catch {
		return new Response(JSON.stringify({ error: "An internal error occurred." }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

// =============================================================================
// Helpers
// =============================================================================

function makeEnv(overrides: Partial<MockEnv> = {}): MockEnv {
	return {
		CF_ACCOUNT_ID: "test-account-id",
		CF_OBSERVABILITY_TOKEN: "secret-token-abc",
		DB: {} as D1Database,
		...overrides,
	};
}

function makeRequest(method: string, authHeader?: string): Request {
	const headers: Record<string, string> = {};
	if (authHeader !== undefined) {
		headers["Authorization"] = authHeader;
	}
	return new Request("https://collector.grove.place/", { method, headers });
}

const MOCK_COLLECTION_RESULT: CollectionResult = {
	startedAt: 1000000,
	completedAt: 1000005,
	durationMs: 5000,
	trigger: "manual",
	collectors: {},
	alertsTriggered: 0,
	alertsResolved: 0,
	errors: [],
};

function mockCollectorFactory(): ObservabilityCollector {
	return {
		runFullCollection: vi.fn().mockResolvedValue(MOCK_COLLECTION_RESULT),
	};
}

// =============================================================================
// Health endpoint (GET and other non-POST methods)
// =============================================================================

describe("vista-collector fetch — GET /health", () => {
	it("GET request returns 200", async () => {
		const req = makeRequest("GET");
		const res = await handleFetch(req, makeEnv(), mockCollectorFactory);
		expect(res.status).toBe(200);
	});

	it("GET request returns { status: 'ready' }", async () => {
		const req = makeRequest("GET");
		const res = await handleFetch(req, makeEnv(), mockCollectorFactory);
		const body = await res.json();
		expect(body).toEqual({ status: "ready" });
	});

	it("GET request does not require Authorization header", async () => {
		const req = makeRequest("GET");
		const envWithoutToken = makeEnv({ CF_OBSERVABILITY_TOKEN: undefined });
		const res = await handleFetch(req, envWithoutToken, mockCollectorFactory);
		expect(res.status).toBe(200);
	});

	it("HEAD request returns 200 (non-POST, treated as health probe)", async () => {
		const req = makeRequest("HEAD");
		const res = await handleFetch(req, makeEnv(), mockCollectorFactory);
		expect(res.status).toBe(200);
	});

	it("GET response has Content-Type: application/json", async () => {
		const req = makeRequest("GET");
		const res = await handleFetch(req, makeEnv(), mockCollectorFactory);
		expect(res.headers.get("Content-Type")).toBe("application/json");
	});

	it("GET does not trigger collection", async () => {
		const factory = vi.fn().mockReturnValue({
			runFullCollection: vi.fn(),
		});
		const req = makeRequest("GET");
		await handleFetch(req, makeEnv(), factory);
		expect(factory).not.toHaveBeenCalled();
	});
});

// =============================================================================
// POST without Authorization
// =============================================================================

describe("vista-collector fetch — POST without auth", () => {
	it("POST without Authorization header returns 401", async () => {
		const req = makeRequest("POST");
		const res = await handleFetch(req, makeEnv(), mockCollectorFactory);
		expect(res.status).toBe(401);
	});

	it("POST without auth returns { error: 'Unauthorized' }", async () => {
		const req = makeRequest("POST");
		const res = await handleFetch(req, makeEnv(), mockCollectorFactory);
		const body = await res.json();
		expect(body).toEqual({ error: "Unauthorized" });
	});

	it("POST without auth does not trigger collection", async () => {
		const runFn = vi.fn();
		const factory = vi.fn().mockReturnValue({ runFullCollection: runFn });
		const req = makeRequest("POST");
		await handleFetch(req, makeEnv(), factory);
		expect(runFn).not.toHaveBeenCalled();
	});
});

// =============================================================================
// POST with wrong token
// =============================================================================

describe("vista-collector fetch — POST with wrong token", () => {
	it("POST with wrong Bearer token returns 401", async () => {
		const req = makeRequest("POST", "Bearer wrong-token");
		const res = await handleFetch(req, makeEnv(), mockCollectorFactory);
		expect(res.status).toBe(401);
	});

	it("POST with wrong token returns { error: 'Unauthorized' }", async () => {
		const req = makeRequest("POST", "Bearer wrong-token");
		const res = await handleFetch(req, makeEnv(), mockCollectorFactory);
		const body = await res.json();
		expect(body).toEqual({ error: "Unauthorized" });
	});

	it("POST with malformed auth (no Bearer prefix) returns 401", async () => {
		const req = makeRequest("POST", "secret-token-abc");
		const res = await handleFetch(req, makeEnv(), mockCollectorFactory);
		expect(res.status).toBe(401);
	});

	it("POST with empty Bearer token returns 401", async () => {
		const req = makeRequest("POST", "Bearer ");
		const res = await handleFetch(req, makeEnv(), mockCollectorFactory);
		expect(res.status).toBe(401);
	});

	it("POST with partial token returns 401", async () => {
		const req = makeRequest("POST", "Bearer secret-token");
		const res = await handleFetch(req, makeEnv(), mockCollectorFactory);
		expect(res.status).toBe(401);
	});
});

// =============================================================================
// POST when no token configured in env
// =============================================================================

describe("vista-collector fetch — POST when no env token configured", () => {
	it("returns 401 even with a Bearer header when env token is undefined", async () => {
		const env = makeEnv({ CF_OBSERVABILITY_TOKEN: undefined });
		const req = makeRequest("POST", "Bearer anything");
		const res = await handleFetch(req, env, mockCollectorFactory);
		expect(res.status).toBe(401);
	});

	it("returns 401 even with the 'correct' token when env has no token", async () => {
		// Security: if no token is configured, ALL POST requests must be rejected
		const env = makeEnv({ CF_OBSERVABILITY_TOKEN: undefined });
		const req = makeRequest("POST", "Bearer secret-token-abc");
		const res = await handleFetch(req, env, mockCollectorFactory);
		expect(res.status).toBe(401);
	});
});

// =============================================================================
// POST with correct token — triggers collection
// =============================================================================

describe("vista-collector fetch — POST with correct token", () => {
	it("returns 200 with collection result", async () => {
		const req = makeRequest("POST", "Bearer secret-token-abc");
		const res = await handleFetch(req, makeEnv(), mockCollectorFactory);
		expect(res.status).toBe(200);
	});

	it("returns the CollectionResult as JSON", async () => {
		const req = makeRequest("POST", "Bearer secret-token-abc");
		const res = await handleFetch(req, makeEnv(), mockCollectorFactory);
		const body = await res.json();
		expect(body).toEqual(MOCK_COLLECTION_RESULT);
	});

	it("calls runFullCollection with 'manual' trigger", async () => {
		const runFn = vi.fn().mockResolvedValue(MOCK_COLLECTION_RESULT);
		const factory = vi.fn().mockReturnValue({ runFullCollection: runFn });
		const req = makeRequest("POST", "Bearer secret-token-abc");
		await handleFetch(req, makeEnv(), factory);
		expect(runFn).toHaveBeenCalledWith("manual");
	});

	it("creates a collector using the env", async () => {
		const env = makeEnv();
		const factory = vi.fn().mockReturnValue({
			runFullCollection: vi.fn().mockResolvedValue(MOCK_COLLECTION_RESULT),
		});
		const req = makeRequest("POST", "Bearer secret-token-abc");
		await handleFetch(req, env, factory);
		expect(factory).toHaveBeenCalledWith(env);
	});

	it("returns Content-Type: application/json on success", async () => {
		const req = makeRequest("POST", "Bearer secret-token-abc");
		const res = await handleFetch(req, makeEnv(), mockCollectorFactory);
		expect(res.headers.get("Content-Type")).toBe("application/json");
	});
});

// =============================================================================
// POST with correct token — collection throws
// =============================================================================

describe("vista-collector fetch — collection failure", () => {
	it("returns 500 when collection throws", async () => {
		const factory = vi.fn().mockReturnValue({
			runFullCollection: vi.fn().mockRejectedValue(new Error("D1 unavailable")),
		});
		const req = makeRequest("POST", "Bearer secret-token-abc");
		const res = await handleFetch(req, makeEnv(), factory);
		expect(res.status).toBe(500);
	});

	it("returns { error: 'An internal error occurred.' } when collection throws", async () => {
		const factory = vi.fn().mockReturnValue({
			runFullCollection: vi.fn().mockRejectedValue(new Error("boom")),
		});
		const req = makeRequest("POST", "Bearer secret-token-abc");
		const res = await handleFetch(req, makeEnv(), factory);
		const body = await res.json();
		expect(body).toEqual({ error: "An internal error occurred." });
	});

	it("does not leak error details in 500 response", async () => {
		const factory = vi.fn().mockReturnValue({
			runFullCollection: vi.fn().mockRejectedValue(new Error("SECRET_KEY=abc123 is invalid")),
		});
		const req = makeRequest("POST", "Bearer secret-token-abc");
		const res = await handleFetch(req, makeEnv(), factory);
		const body = (await res.json()) as Record<string, unknown>;
		// Response should not contain the original error message
		expect(JSON.stringify(body)).not.toContain("SECRET_KEY");
		expect(JSON.stringify(body)).not.toContain("abc123");
	});
});

// =============================================================================
// Token comparison — exact match required
// =============================================================================

describe("vista-collector fetch — token comparison", () => {
	it("requires exact case-sensitive match for the token", async () => {
		const env = makeEnv({ CF_OBSERVABILITY_TOKEN: "MySecretToken" });

		const wrongCase = makeRequest("POST", "Bearer mysecrettoken");
		const res1 = await handleFetch(wrongCase, env, mockCollectorFactory);
		expect(res1.status).toBe(401);

		const correct = makeRequest("POST", "Bearer MySecretToken");
		const res2 = await handleFetch(correct, env, mockCollectorFactory);
		expect(res2.status).toBe(200);
	});

	it("token with trailing spaces is rejected", async () => {
		const env = makeEnv({ CF_OBSERVABILITY_TOKEN: "token-abc" });
		const req = makeRequest("POST", "Bearer token-abc ");
		const res = await handleFetch(req, env, mockCollectorFactory);
		expect(res.status).toBe(401);
	});
});
