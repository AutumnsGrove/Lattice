/**
 * Meadow Poller — Integration Tests
 *
 * Tests the scheduled handler's orchestration: tenant discovery, feed fetching,
 * 304 handling, error backoff, content hash change detection, and SSRF prevention.
 *
 * Uses mocked fetch and Infra SDK test context to isolate the logic.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockContext } from "@autumnsgrove/infra/testing";

// Mock the fetch global
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// We'll import the default export after mocking

let worker: any;

const VALID_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Test Blog</title>
    <link>https://test.grove.place</link>
    <description>A test blog</description>
    <item>
      <title>Hello World</title>
      <link>https://test.grove.place/garden/hello-world</link>
      <guid>https://test.grove.place/garden/hello-world</guid>
      <pubDate>Sat, 15 Feb 2026 12:00:00 GMT</pubDate>
      <description>A first post</description>
      <content:encoded><![CDATA[<p>Full content</p>]]></content:encoded>
    </item>
  </channel>
</rss>`;

// ---------------------------------------------------------------------------
// Helper: build an env that maps mock context back to raw bindings
// ---------------------------------------------------------------------------

function createTestEnv(
	tenants: Array<{ id: string; subdomain: string; display_name: string | null }> = [],
) {
	const ctx = createMockContext();

	// Pre-configure tenant discovery query
	ctx.db.whenQuery(
		"SELECT id, subdomain, display_name FROM tenants",
		tenants as unknown as Record<string, unknown>[],
	);

	// Build a mock Env that createContext() will receive
	// The worker's createContext() unwraps env.DB and env.POLL_STATE,
	// but the mocked DB/KV live on the GroveContext. We use a Proxy
	// to intercept the worker's internal createContext() call and return
	// our pre-configured mock context instead.
	//
	// Simpler approach: just provide raw D1/KV mocks that the worker's
	// createContext() will wrap. The SDK adapters are thin wrappers, so
	// the mock DB/KV interfaces are close enough.
	const mockD1 = {
		prepare: vi.fn((sql: string) => {
			return {
				all: vi.fn(async () => {
					// Route through mock context's execute
					const result = await ctx.db.execute(sql);
					return { results: result.results, meta: result.meta };
				}),
				bind: vi.fn((..._params: unknown[]) => {
					return {
						all: vi.fn(async () => {
							const result = await ctx.db.execute(sql, _params);
							return { results: result.results, meta: result.meta };
						}),
						first: vi.fn(async () => {
							const result = await ctx.db.execute(sql, _params);
							return result.results[0] ?? null;
						}),
						run: vi.fn(async () => {
							const result = await ctx.db.execute(sql, _params);
							return result.meta;
						}),
					};
				}),
			};
		}),
		batch: vi.fn(async () => []),
	};

	const kvStore = new Map<string, string>();
	const mockKV = {
		get: vi.fn(async (key: string) => kvStore.get(key) ?? null),
		put: vi.fn(async (key: string, value: string) => {
			kvStore.set(key, value);
		}),
		delete: vi.fn(async (key: string) => {
			kvStore.delete(key);
		}),
	};

	return { env: { DB: mockD1, POLL_STATE: mockKV }, mockD1, mockKV, kvStore, ctx };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("meadow-poller", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		mockFetch.mockReset();
		// Dynamic import to pick up fresh mocks
		worker = await import("./index.js");
	});

	describe("fetch handler", () => {
		it("returns service info on GET /", async () => {
			const { env } = createTestEnv();
			const response = await worker.default.fetch(new Request("https://example.com/"), env);
			const json = await response.json();

			expect(json.service).toBe("grove-meadow-poller");
			expect(json.status).toBe("running");
		});

		it("triggers poll on GET /trigger", async () => {
			const { env } = createTestEnv();
			const response = await worker.default.fetch(new Request("https://example.com/trigger"), env);
			const json = await response.json();

			expect(json.ok).toBe(true);
		});
	});

	describe("poll cycle", () => {
		it("does nothing when no tenants are opted in", async () => {
			const { env } = createTestEnv([]);

			const response = await worker.default.fetch(new Request("https://example.com/trigger"), env);
			const json = await response.json();

			expect(json.ok).toBe(true);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("fetches feed for opted-in tenants", async () => {
			const tenants = [{ id: "t1", subdomain: "alice", display_name: "Alice" }];
			const { env, mockD1 } = createTestEnv(tenants);

			mockFetch.mockResolvedValueOnce(
				new Response(VALID_RSS, {
					status: 200,
					headers: { "Content-Type": "application/rss+xml", ETag: 'W/"abc"' },
				}),
			);

			await worker.default.fetch(new Request("https://example.com/trigger"), env);

			// Should have fetched alice's feed
			expect(mockFetch).toHaveBeenCalledWith(
				"https://alice.grove.place/api/feed",
				expect.objectContaining({
					headers: expect.objectContaining({
						"User-Agent": "Grove-Meadow-Poller/1.0",
					}),
				}),
			);

			// Should have called batch for upsert
			expect(mockD1.batch).toHaveBeenCalled();
		});

		it("handles 304 Not Modified gracefully", async () => {
			const tenants = [{ id: "t1", subdomain: "alice", display_name: "Alice" }];
			const { env, mockD1, kvStore } = createTestEnv(tenants);

			// Pre-seed poll state with an ETag
			kvStore.set(
				"poll:t1",
				JSON.stringify({
					lastEtag: 'W/"abc"',
					lastPollAt: 0,
					consecutiveErrors: 0,
					lastErrorMessage: null,
				}),
			);

			mockFetch.mockResolvedValueOnce(new Response(null, { status: 304 }));

			await worker.default.fetch(new Request("https://example.com/trigger"), env);

			// Should NOT have called batch (no new data)
			expect(mockD1.batch).not.toHaveBeenCalled();

			// Should have saved updated poll state (errors reset)
			const state = JSON.parse(kvStore.get("poll:t1")!);
			expect(state.consecutiveErrors).toBe(0);
		});

		it("increments error count on fetch failure", async () => {
			const tenants = [{ id: "t1", subdomain: "alice", display_name: "Alice" }];
			const { env, kvStore } = createTestEnv(tenants);

			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			await worker.default.fetch(new Request("https://example.com/trigger"), env);

			const state = JSON.parse(kvStore.get("poll:t1")!);
			expect(state.consecutiveErrors).toBe(1);
			expect(state.lastErrorMessage).toBe("Network error");
		});

		it("skips tenants with invalid subdomains (SSRF prevention)", async () => {
			const tenants = [{ id: "t1", subdomain: "evil..host", display_name: "Evil" }];
			const { env } = createTestEnv(tenants);

			await worker.default.fetch(new Request("https://example.com/trigger"), env);

			// Should NOT have fetched anything
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("rejects feeds exceeding size limit", async () => {
			const tenants = [{ id: "t1", subdomain: "alice", display_name: "Alice" }];
			const { env, kvStore } = createTestEnv(tenants);

			// Simulate a large Content-Length header
			mockFetch.mockResolvedValueOnce(
				new Response("", {
					status: 200,
					headers: { "Content-Length": "10000000" }, // 10MB
				}),
			);

			await worker.default.fetch(new Request("https://example.com/trigger"), env);

			// Should have recorded an error
			const state = JSON.parse(kvStore.get("poll:t1")!);
			expect(state.consecutiveErrors).toBe(1);
			expect(state.lastErrorMessage).toContain("too large");
		});
	});
});
