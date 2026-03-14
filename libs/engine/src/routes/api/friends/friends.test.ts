/**
 * Friends API Tests
 *
 * Tests the friends list (GET), add (POST), and delete (DELETE) endpoints.
 * Mocks D1 at the prepare() boundary since the queries use INSERT OR IGNORE
 * and other features the in-memory mock D1 doesn't support.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./+server";
import { DELETE } from "./[tenantId]/+server";

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

vi.mock("$lib/server/services/friends.js", async (importOriginal) => {
	const original = (await importOriginal()) as Record<string, unknown>;
	return {
		...original,
		listFriends: vi.fn(),
		addFriend: vi.fn(),
		removeFriend: vi.fn(),
	};
});

import { getUserHomeGrove } from "$lib/server/services/users.js";
import { listFriends, addFriend, removeFriend } from "$lib/server/services/friends.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

const TEST_USER = { id: "user-1", email: "test@example.com" };
const HOME_GROVE = { tenantId: "home-tenant", subdomain: "autumn", name: "Autumn's Grove" };

function createMockDB() {
	return {
		prepare: vi.fn(() => ({
			bind: vi.fn().mockReturnThis(),
			all: vi.fn().mockResolvedValue({ results: [] }),
			first: vi.fn().mockResolvedValue(null),
			run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
		})),
	};
}

function createGETEvent(db: ReturnType<typeof createMockDB>, user = TEST_USER) {
	return {
		platform: { env: { DB: db } },
		locals: { user },
	} as unknown as Parameters<typeof GET>[0];
}

function createPOSTEvent(
	body: Record<string, unknown>,
	db: ReturnType<typeof createMockDB>,
	user = TEST_USER,
) {
	return {
		request: new Request("https://example.com/api/friends", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}),
		platform: { env: { DB: db } },
		locals: { user },
	} as unknown as Parameters<typeof POST>[0];
}

function createDELETEEvent(
	friendTenantId: string,
	db: ReturnType<typeof createMockDB>,
	user = TEST_USER,
) {
	return {
		params: { tenantId: friendTenantId },
		platform: { env: { DB: db } },
		locals: { user },
	} as unknown as Parameters<typeof DELETE>[0];
}

// ── GET /api/friends ────────────────────────────────────────────────────────

describe("GET /api/friends", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getUserHomeGrove).mockResolvedValue(HOME_GROVE);
	});

	it("should return the user's friends list", async () => {
		vi.mocked(listFriends).mockResolvedValue([
			{
				tenantId: "friend-1",
				name: "Art's Grove",
				subdomain: "a2a0",
				source: "manual",
			},
			{
				tenantId: "friend-2",
				name: "River's Place",
				subdomain: "river",
				source: "manual",
			},
		]);

		const db = createMockDB();
		const response = await GET(createGETEvent(db));
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.friends).toHaveLength(2);
		expect(data.friends[0]).toEqual({
			tenantId: "friend-1",
			name: "Art's Grove",
			subdomain: "a2a0",
			source: "manual",
		});
	});

	it("should return empty array when user has no grove", async () => {
		vi.mocked(getUserHomeGrove).mockResolvedValue(null);
		const db = createMockDB();

		const response = await GET(createGETEvent(db));
		const data = (await response.json()) as any;

		expect(data.friends).toEqual([]);
	});

	it("should reject unauthenticated requests", async () => {
		const db = createMockDB();
		const event = createGETEvent(db, null as any);

		await expect(GET(event)).rejects.toThrow();
	});

	it("should call listFriends with home tenant ID", async () => {
		vi.mocked(listFriends).mockResolvedValue([]);
		const db = createMockDB();
		await GET(createGETEvent(db));

		expect(listFriends).toHaveBeenCalledWith(db, "home-tenant");
	});
});

// ── POST /api/friends ───────────────────────────────────────────────────────

describe("POST /api/friends", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getUserHomeGrove).mockResolvedValue(HOME_GROVE);
	});

	it("should add a friend by subdomain", async () => {
		vi.mocked(addFriend).mockResolvedValue({
			friend: {
				tenantId: "friend-tenant",
				name: "Art's Grove",
				subdomain: "a2a0",
				source: "manual",
			},
		});

		const db = createMockDB();
		const event = createPOSTEvent({ friendSubdomain: "a2a0" }, db);
		const response = await POST(event);
		const data = (await response.json()) as any;

		expect(response.status).toBe(201);
		expect(data.success).toBe(true);
		expect(data.friend).toEqual({
			tenantId: "friend-tenant",
			name: "Art's Grove",
			subdomain: "a2a0",
			source: "manual",
		});
	});

	it("should reject invalid subdomain format", async () => {
		const db = createMockDB();

		// Subdomain with spaces
		await expect(POST(createPOSTEvent({ friendSubdomain: "has spaces" }, db))).rejects.toThrow();

		// Subdomain too short
		await expect(POST(createPOSTEvent({ friendSubdomain: "a" }, db))).rejects.toThrow();

		// Subdomain with special characters
		await expect(POST(createPOSTEvent({ friendSubdomain: "test@user" }, db))).rejects.toThrow();
	});

	it("should reject empty or missing subdomain", async () => {
		const db = createMockDB();

		await expect(POST(createPOSTEvent({ friendSubdomain: "" }, db))).rejects.toThrow();

		await expect(POST(createPOSTEvent({}, db))).rejects.toThrow();
	});

	it("should prevent adding yourself as a friend", async () => {
		vi.mocked(addFriend).mockResolvedValue({ error: "self_add" });

		const db = createMockDB();
		const event = createPOSTEvent({ friendSubdomain: "autumn" }, db);
		await expect(POST(event)).rejects.toThrow();
	});

	it("should return 404 when friend's grove doesn't exist", async () => {
		vi.mocked(addFriend).mockResolvedValue({ error: "not_found" });

		const db = createMockDB();
		const event = createPOSTEvent({ friendSubdomain: "nonexistent" }, db);
		await expect(POST(event)).rejects.toThrow();
	});

	it("should normalize subdomain to lowercase", async () => {
		vi.mocked(addFriend).mockResolvedValue({
			friend: {
				tenantId: "friend-tenant",
				name: "Art's Grove",
				subdomain: "a2a0",
				source: "manual",
			},
		});

		const db = createMockDB();
		const event = createPOSTEvent({ friendSubdomain: "A2A0" }, db);
		await POST(event);

		// The service should be called with the lowercased subdomain
		expect(addFriend).toHaveBeenCalledWith(db, "home-tenant", "a2a0");
	});

	it("should reject unauthenticated requests", async () => {
		const db = createMockDB();
		const event = createPOSTEvent({ friendSubdomain: "a2a0" }, db, null as any);

		await expect(POST(event)).rejects.toThrow();
	});

	it("should reject malformed JSON body", async () => {
		const event = {
			request: new Request("https://example.com/api/friends", {
				method: "POST",
				body: "not json",
			}),
			platform: { env: { DB: createMockDB() } },
			locals: { user: TEST_USER },
		} as unknown as Parameters<typeof POST>[0];

		await expect(POST(event)).rejects.toThrow();
	});

	it("should accept valid subdomain formats", async () => {
		const validSubdomains = ["ab", "test-grove", "a2a0", "my-cool-site123"];

		for (const subdomain of validSubdomains) {
			vi.mocked(addFriend).mockResolvedValue({
				friend: {
					tenantId: `tenant-${subdomain}`,
					name: "Test",
					subdomain,
					source: "manual",
				},
			});
			vi.mocked(getUserHomeGrove).mockResolvedValue(HOME_GROVE);

			const db = createMockDB();
			const event = createPOSTEvent({ friendSubdomain: subdomain }, db);
			const response = await POST(event);
			expect(response.status).toBe(201);
		}
	});
});

// ── DELETE /api/friends/:tenantId ───────────────────────────────────────────

describe("DELETE /api/friends/:tenantId", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getUserHomeGrove).mockResolvedValue(HOME_GROVE);
	});

	it("should delete an existing friend connection", async () => {
		vi.mocked(removeFriend).mockResolvedValue(true);

		const db = createMockDB();
		const event = createDELETEEvent("friend-tenant", db);
		const response = await DELETE(event);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});

	it("should return 404 when friend connection doesn't exist", async () => {
		vi.mocked(removeFriend).mockResolvedValue(false);

		const db = createMockDB();
		const event = createDELETEEvent("nonexistent", db);
		await expect(DELETE(event)).rejects.toThrow();
	});

	it("should reject unauthenticated requests", async () => {
		const db = createMockDB();
		const event = createDELETEEvent("friend-tenant", db, null as any);

		await expect(DELETE(event)).rejects.toThrow();
	});

	it("should require the user to have a grove", async () => {
		vi.mocked(getUserHomeGrove).mockResolvedValue(null);
		const db = createMockDB();

		const event = createDELETEEvent("friend-tenant", db);
		await expect(DELETE(event)).rejects.toThrow();
	});

	it("should call removeFriend with home tenant and friend tenant", async () => {
		vi.mocked(removeFriend).mockResolvedValue(true);

		const db = createMockDB();
		await DELETE(createDELETEEvent("friend-tenant", db));

		expect(removeFriend).toHaveBeenCalledWith(db, "home-tenant", "friend-tenant");
	});
});
