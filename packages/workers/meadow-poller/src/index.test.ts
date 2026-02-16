/**
 * Meadow Poller — Integration Tests
 *
 * Tests the scheduled handler's orchestration: tenant discovery, feed fetching,
 * 304 handling, error backoff, content hash change detection, and SSRF prevention.
 *
 * Uses mocked fetch, D1, and KV to isolate the logic.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the fetch global
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// We'll import the default export after mocking
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
// Mock factories
// ---------------------------------------------------------------------------

function createMockD1(
  tenants: Array<{
    id: string;
    subdomain: string;
    display_name: string | null;
  }> = [],
) {
  const batchResults: unknown[] = [];
  return {
    prepare: vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: tenants }),
      bind: vi.fn().mockReturnThis(),
    }),
    batch: vi.fn().mockResolvedValue(batchResults),
  };
}

function createMockKV() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    _store: store,
  };
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
      const env = { DB: createMockD1(), POLL_STATE: createMockKV() };
      const response = await worker.default.fetch(
        new Request("https://example.com/"),
        env,
      );
      const json = await response.json();

      expect(json.service).toBe("grove-meadow-poller");
      expect(json.status).toBe("running");
    });

    it("triggers poll on GET /trigger", async () => {
      const env = {
        DB: createMockD1(), // 0 tenants
        POLL_STATE: createMockKV(),
      };
      const response = await worker.default.fetch(
        new Request("https://example.com/trigger"),
        env,
      );
      const json = await response.json();

      expect(json.ok).toBe(true);
    });
  });

  describe("poll cycle", () => {
    it("does nothing when no tenants are opted in", async () => {
      const env = {
        DB: createMockD1([]),
        POLL_STATE: createMockKV(),
      };

      const response = await worker.default.fetch(
        new Request("https://example.com/trigger"),
        env,
      );
      const json = await response.json();

      expect(json.ok).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("fetches feed for opted-in tenants", async () => {
      const tenants = [{ id: "t1", subdomain: "alice", display_name: "Alice" }];
      const db = createMockD1(tenants);
      const kv = createMockKV();

      mockFetch.mockResolvedValueOnce(
        new Response(VALID_RSS, {
          status: 200,
          headers: { "Content-Type": "application/rss+xml", ETag: 'W/"abc"' },
        }),
      );

      const env = { DB: db, POLL_STATE: kv };
      await worker.default.fetch(
        new Request("https://example.com/trigger"),
        env,
      );

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
      expect(db.batch).toHaveBeenCalled();
    });

    it("handles 304 Not Modified gracefully", async () => {
      const tenants = [{ id: "t1", subdomain: "alice", display_name: "Alice" }];
      const db = createMockD1(tenants);
      const kv = createMockKV();

      // Pre-seed poll state with an ETag
      kv._store.set(
        "poll:t1",
        JSON.stringify({
          lastEtag: 'W/"abc"',
          lastPollAt: 0,
          consecutiveErrors: 0,
          lastErrorMessage: null,
        }),
      );

      mockFetch.mockResolvedValueOnce(new Response(null, { status: 304 }));

      const env = { DB: db, POLL_STATE: kv };
      await worker.default.fetch(
        new Request("https://example.com/trigger"),
        env,
      );

      // Should NOT have called batch (no new data)
      expect(db.batch).not.toHaveBeenCalled();

      // Should have saved updated poll state (errors reset)
      const state = JSON.parse(kv._store.get("poll:t1")!);
      expect(state.consecutiveErrors).toBe(0);
    });

    it("increments error count on fetch failure", async () => {
      const tenants = [{ id: "t1", subdomain: "alice", display_name: "Alice" }];
      const db = createMockD1(tenants);
      const kv = createMockKV();

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const env = { DB: db, POLL_STATE: kv };
      await worker.default.fetch(
        new Request("https://example.com/trigger"),
        env,
      );

      const state = JSON.parse(kv._store.get("poll:t1")!);
      expect(state.consecutiveErrors).toBe(1);
      expect(state.lastErrorMessage).toBe("Network error");
    });

    it("skips tenants with invalid subdomains (SSRF prevention)", async () => {
      const tenants = [
        { id: "t1", subdomain: "evil..host", display_name: "Evil" },
      ];
      const db = createMockD1(tenants);
      const kv = createMockKV();

      const env = { DB: db, POLL_STATE: kv };
      await worker.default.fetch(
        new Request("https://example.com/trigger"),
        env,
      );

      // Should NOT have fetched anything
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("rejects feeds exceeding size limit", async () => {
      const tenants = [{ id: "t1", subdomain: "alice", display_name: "Alice" }];
      const db = createMockD1(tenants);
      const kv = createMockKV();

      // Simulate a large Content-Length header
      mockFetch.mockResolvedValueOnce(
        new Response("", {
          status: 200,
          headers: { "Content-Length": "10000000" }, // 10MB
        }),
      );

      const env = { DB: db, POLL_STATE: kv };
      await worker.default.fetch(
        new Request("https://example.com/trigger"),
        env,
      );

      // Should have recorded an error
      const state = JSON.parse(kv._store.get("poll:t1")!);
      expect(state.consecutiveErrors).toBe(1);
      expect(state.lastErrorMessage).toContain("too large");
    });
  });
});
