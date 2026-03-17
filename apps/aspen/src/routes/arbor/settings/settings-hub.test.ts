/**
 * Tests for Settings Hub Page Server Load
 *
 * The hub page fetches summary data for 5 setting cards:
 * tenant info, settings, blaze count, and meadow opt-in.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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
		tenantRow?: { subdomain: string; plan: string | null; meadow_opt_in: number | null } | null;
		settingsRows?: { setting_key: string; setting_value: string }[];
		blazeCount?: number;
	} = {},
) {
	const {
		tenantRow = { subdomain: "testuser", plan: "seedling", meadow_opt_in: 0 },
		settingsRows = [],
		blazeCount = 0,
	} = options;

	const mockStatement: MockStatement = {
		_sql: "",
		_bindings: [],
		bind(...values: unknown[]) {
			this._bindings = values;
			return this;
		},
		async first<T>(): Promise<T | null> {
			// Route by SQL content
			if (this._sql.includes("COUNT(*)")) {
				return { count: blazeCount } as T;
			}
			if (this._sql.includes("subdomain, plan")) {
				return tenantRow as T;
			}
			return null;
		},
		async all<T>(): Promise<{ results: T[] }> {
			if (this._sql.includes("setting_key, setting_value")) {
				return { results: settingsRows as T[] };
			}
			return { results: [] };
		},
	};

	return {
		prepare(sql: string) {
			const stmt = { ...mockStatement, _sql: sql, _bindings: [] };
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
		userEmail?: string;
		userPicture?: string | null;
	} = {},
) {
	const {
		tenantId = TENANT_ID,
		db = createMockDB(),
		userEmail = "test@grove.place",
		userPicture = null,
	} = overrides;

	return {
		locals: {
			user: { email: userEmail, picture: userPicture },
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

	it("should return default summary when no env bindings", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({ db: undefined });
		event.platform.env.DB = undefined;

		const result = await load(event as any);

		expect(result.currentSubdomain).toBe("");
		expect(result.groveTitle).toBe("");
		expect(result.avatarUrl).toBeNull();
		expect(result.fontFamily).toBe("");
		expect(result.accentColor).toBe("");
		expect(result.preferredSeason).toBe("");
		expect(result.canopyVisible).toBe(false);
		expect(result.meadowOptIn).toBe(false);
		expect(result.humanJsonEnabled).toBe(false);
		expect(result.customBlazeCount).toBe(0);
	});

	it("should return tenant subdomain from DB", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({
			db: createMockDB({ tenantRow: { subdomain: "autumn", plan: "sapling" } }),
		});

		const result = await load(event as any);

		expect(result.currentSubdomain).toBe("autumn");
	});

	it("should parse settings rows into summary fields", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({
			db: createMockDB({
				settingsRows: [
					{ setting_key: "grove_title", setting_value: "My Cozy Grove" },
					{ setting_key: "avatar_url", setting_value: "https://cdn.grove.place/avatar.jpg" },
					{ setting_key: "font_family", setting_value: "caveat" },
					{ setting_key: "accent_color", setting_value: "#8b5e3c" },
					{ setting_key: "preferred_season", setting_value: "autumn" },
					{ setting_key: "canopy_visible", setting_value: "true" },
					{ setting_key: "human_json_enabled", setting_value: "true" },
				],
			}),
		});

		const result = await load(event as any);

		expect(result.groveTitle).toBe("My Cozy Grove");
		expect(result.avatarUrl).toBe("https://cdn.grove.place/avatar.jpg");
		expect(result.fontFamily).toBe("caveat");
		expect(result.accentColor).toBe("#8b5e3c");
		expect(result.preferredSeason).toBe("autumn");
		expect(result.canopyVisible).toBe(true);
		expect(result.humanJsonEnabled).toBe(true);
	});

	it("should return custom blaze count", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({
			db: createMockDB({ blazeCount: 7 }),
		});

		const result = await load(event as any);

		expect(result.customBlazeCount).toBe(7);
	});

	it("should return meadow opt-in status", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({
			db: createMockDB({
				tenantRow: { subdomain: "testuser", plan: "seedling", meadow_opt_in: 1 },
			}),
		});

		const result = await load(event as any);

		expect(result.meadowOptIn).toBe(true);
	});

	it("should return false for meadow when not opted in", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({
			db: createMockDB({
				tenantRow: { subdomain: "testuser", plan: "seedling", meadow_opt_in: 0 },
			}),
		});

		const result = await load(event as any);

		expect(result.meadowOptIn).toBe(false);
	});

	it("should handle missing settings gracefully", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({
			db: createMockDB({ settingsRows: [] }),
		});

		const result = await load(event as any);

		expect(result.groveTitle).toBe("");
		expect(result.avatarUrl).toBeNull();
		expect(result.fontFamily).toBe("");
		expect(result.accentColor).toBe("");
		expect(result.preferredSeason).toBe("");
		expect(result.canopyVisible).toBe(false);
		expect(result.humanJsonEnabled).toBe(false);
	});

	it("should pass through OAuth avatar URL from locals", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({
			userPicture: "https://avatars.github.com/u/12345",
		});

		const result = await load(event as any);

		expect(result.oauthAvatarUrl).toBe("https://avatars.github.com/u/12345");
	});

	it("should return null oauthAvatarUrl when user has no picture", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({ userPicture: null });

		const result = await load(event as any);

		expect(result.oauthAvatarUrl).toBeNull();
	});

	it("should handle DB errors gracefully", async () => {
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

		// Should not throw — returns defaults
		const result = await load(event as any);

		expect(result.currentSubdomain).toBe("");
		expect(result.customBlazeCount).toBe(0);
	});
});
