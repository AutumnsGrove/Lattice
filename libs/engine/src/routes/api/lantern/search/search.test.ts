/**
 * Lantern Search API Tests
 *
 * Tests the grove search endpoint used in the "Add Friends" flow.
 * Mocks D1 at the prepare() boundary since the queries use LIKE/OR
 * which the in-memory mock D1 doesn't support.
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

import { getUserHomeGrove } from "$lib/server/services/users.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockDB(results: unknown[] = []) {
	return {
		prepare: vi.fn(() => ({
			bind: vi.fn().mockReturnThis(),
			all: vi.fn().mockResolvedValue({ results }),
			first: vi.fn().mockResolvedValue(results[0] ?? null),
			run: vi.fn().mockResolvedValue({ success: true }),
		})),
	};
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
		url: new URL(`https://example.com/api/lantern/search?q=${encodeURIComponent(query)}`),
		platform: { env: { DB: db } },
		locals: { user },
	} as unknown as Parameters<typeof GET>[0];
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/lantern/search", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getUserHomeGrove).mockResolvedValue({
			tenantId: "my-tenant",
			subdomain: "autumn",
			name: "Autumn's Grove",
		});
	});

	it("should return matching tenants for a valid query", async () => {
		const db = createMockDB([{ id: "friend-1", subdomain: "a2a0", display_name: "Art's Grove" }]);

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

	it("should allow single-character queries", async () => {
		const db = createMockDB([{ id: "friend-1", subdomain: "a2a0", display_name: "Art's Grove" }]);
		const event = createRequestEvent("a", { db });
		const response = await GET(event);
		const data = await response.json();

		expect(data.results).toHaveLength(1);
		expect(db.prepare).toHaveBeenCalled();
	});

	it("should return empty array for empty query", async () => {
		const db = createMockDB();
		const event = createRequestEvent("", { db });
		const response = await GET(event);
		const data = await response.json();

		expect(data.results).toEqual([]);
	});

	it("should exclude the user's own tenant from results", async () => {
		const db = createMockDB([]);
		const event = createRequestEvent("autumn", { db });
		await GET(event);

		// The third bind parameter should be the user's own tenant ID
		const prepareCall = db.prepare.mock.calls[0][0] as string;
		expect(prepareCall).toContain("id != ?");

		const bindCall = db.prepare.mock.results[0].value.bind;
		expect(bindCall).toHaveBeenCalledWith("%autumn%", "%autumn%", "my-tenant");
	});

	it("should escape LIKE wildcards in user input", async () => {
		const db = createMockDB([]);
		const event = createRequestEvent("test%name", { db });
		await GET(event);

		const bindCall = db.prepare.mock.results[0].value.bind;
		// The % in user input should be escaped to \%
		expect(bindCall).toHaveBeenCalledWith("%test\\%name%", "%test\\%name%", "my-tenant");
	});

	it("should reject unauthenticated requests", async () => {
		const db = createMockDB();
		const event = createRequestEvent("test", { db, user: null });

		await expect(GET(event)).rejects.toThrow();
	});

	it("should handle user with no grove gracefully", async () => {
		vi.mocked(getUserHomeGrove).mockResolvedValue(null);

		const db = createMockDB([{ id: "friend-1", subdomain: "a2a0", display_name: "Art's Grove" }]);
		const event = createRequestEvent("a2a0", { db });
		const response = await GET(event);
		const data = await response.json();

		// Should still work — excludeTenantId will be empty string
		expect(response.status).toBe(200);
		expect(data.results).toHaveLength(1);
	});

	it("should truncate query to 64 characters", async () => {
		const db = createMockDB([]);
		const longQuery = "a".repeat(100);
		const event = createRequestEvent(longQuery, { db });
		await GET(event);

		const bindCall = db.prepare.mock.results[0].value.bind;
		const pattern = bindCall.mock.calls[0][0] as string;
		// Pattern is %<query>%, so length should be 64 + 2 = 66
		expect(pattern.length).toBe(66);
	});

	it("should return multiple results up to limit", async () => {
		const tenants = Array.from({ length: 10 }, (_, i) => ({
			id: `tenant-${i}`,
			subdomain: `grove-${i}`,
			display_name: `Grove ${i}`,
		}));
		const db = createMockDB(tenants);
		const event = createRequestEvent("grove", { db });
		const response = await GET(event);
		const data = await response.json();

		expect(data.results).toHaveLength(10);
	});
});
