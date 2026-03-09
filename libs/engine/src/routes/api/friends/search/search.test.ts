/**
 * Friends Search API Tests
 *
 * Tests the grove search endpoint used in the "Add Friends" flow.
 * Mocks the friends service at the boundary — the service unit tests
 * cover the actual SQL logic separately.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./+server";

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("$lib/server/services/users.js", () => ({
	getUserHomeGrove: vi.fn(),
}));

vi.mock("$lib/threshold/factory.js", () => ({
	createThreshold: vi.fn(() => null),
}));

vi.mock("$lib/threshold/adapters/sveltekit.js", () => ({
	thresholdCheck: vi.fn(),
}));

vi.mock("$lib/server/services/friends.js", () => ({
	searchTenants: vi.fn(),
}));

import { getUserHomeGrove } from "$lib/server/services/users.js";
import { searchTenants } from "$lib/server/services/friends.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockDB() {
	return {} as unknown as D1Database;
}

function createRequestEvent(
	query: string,
	{
		db,
		user = { id: "user-1", email: "test@example.com" },
	}: {
		db: ReturnType<typeof createMockDB>;
		user?: { id: string; email: string } | null;
	},
) {
	return {
		url: new URL(`https://example.com/api/friends/search?q=${encodeURIComponent(query)}`),
		platform: { env: { DB: db } },
		locals: { user },
	} as unknown as Parameters<typeof GET>[0];
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/friends/search", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getUserHomeGrove).mockResolvedValue({
			tenantId: "my-tenant",
			subdomain: "autumn",
			name: "Autumn's Grove",
		});
	});

	it("should return matching tenants for a valid query", async () => {
		vi.mocked(searchTenants).mockResolvedValue([
			{ tenantId: "friend-1", name: "Art's Grove", subdomain: "a2a0" },
		]);

		const db = createMockDB();
		const event = createRequestEvent("a2a0", { db });
		const response = await GET(event);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.results).toHaveLength(1);
		expect(data.results[0]).toEqual({
			tenantId: "friend-1",
			name: "Art's Grove",
			subdomain: "a2a0",
		});
	});

	it("should call searchTenants with query and exclude tenant", async () => {
		vi.mocked(searchTenants).mockResolvedValue([]);

		const db = createMockDB();
		const event = createRequestEvent("a2a0", { db });
		await GET(event);

		expect(searchTenants).toHaveBeenCalledWith(db, "a2a0", "my-tenant");
	});

	it("should return empty array for empty query without calling service", async () => {
		const db = createMockDB();
		const event = createRequestEvent("", { db });
		const response = await GET(event);
		const data = await response.json();

		expect(data.results).toEqual([]);
		expect(searchTenants).not.toHaveBeenCalled();
	});

	it("should reject unauthenticated requests", async () => {
		const db = createMockDB();
		const event = createRequestEvent("test", { db, user: null });

		await expect(GET(event)).rejects.toThrow();
	});

	it("should handle user with no grove gracefully", async () => {
		vi.mocked(getUserHomeGrove).mockResolvedValue(null);
		vi.mocked(searchTenants).mockResolvedValue([
			{ tenantId: "friend-1", name: "Art's Grove", subdomain: "a2a0" },
		]);

		const db = createMockDB();
		const event = createRequestEvent("a2a0", { db });
		const response = await GET(event);
		const data = await response.json();

		// Should still work — excludeTenantId will be empty string
		expect(response.status).toBe(200);
		expect(searchTenants).toHaveBeenCalledWith(db, "a2a0", "");
	});

	it("should truncate query to 64 characters", async () => {
		vi.mocked(searchTenants).mockResolvedValue([]);

		const db = createMockDB();
		const longQuery = "a".repeat(100);
		const event = createRequestEvent(longQuery, { db });
		await GET(event);

		// searchTenants should receive only 64 chars
		const passedQuery = vi.mocked(searchTenants).mock.calls[0][1];
		expect(passedQuery.length).toBe(64);
	});

	it("should normalize query to lowercase before searching", async () => {
		vi.mocked(searchTenants).mockResolvedValue([]);

		const db = createMockDB();
		const event = createRequestEvent("A2A0", { db });
		await GET(event);

		// searchTenants should receive the lowercased query
		expect(searchTenants).toHaveBeenCalledWith(db, "a2a0", "my-tenant");
	});

	it("should normalize mixed-case query to lowercase", async () => {
		vi.mocked(searchTenants).mockResolvedValue([]);

		const db = createMockDB();
		const event = createRequestEvent("Autumn", { db });
		await GET(event);

		expect(searchTenants).toHaveBeenCalledWith(db, "autumn", "my-tenant");
	});

	it("should return multiple results from service", async () => {
		const tenants = Array.from({ length: 10 }, (_, i) => ({
			tenantId: `tenant-${i}`,
			name: `Grove ${i}`,
			subdomain: `grove-${i}`,
		}));
		vi.mocked(searchTenants).mockResolvedValue(tenants);

		const db = createMockDB();
		const event = createRequestEvent("grove", { db });
		const response = await GET(event);
		const data = await response.json();

		expect(data.results).toHaveLength(10);
	});
});
