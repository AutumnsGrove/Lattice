/**
 * Admin settings API — the `font_scale` setting (#1369).
 *
 * Covers the whitelist and validation for the grove-wide text size, and checks
 * that the keys that were already here still behave. The handler itself runs for
 * real; the mocks are the request machinery, auth and the database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockGetVerifiedTenantId = vi.fn();

vi.mock("@sveltejs/kit", () => ({
	json: (data: unknown) => ({ status: 200, body: data }),
	error: (status: number, message: string) => {
		throw Object.assign(new Error(message), { status });
	},
}));

vi.mock("@autumnsgrove/lattice/auth/session", () => ({
	getVerifiedTenantId: (...args: unknown[]) => mockGetVerifiedTenantId(...args),
}));

vi.mock("@autumnsgrove/lattice/errors", async () => {
	const actual = await vi.importActual<typeof import("@autumnsgrove/lattice/errors")>(
		"@autumnsgrove/lattice/errors",
	);
	return {
		...actual,
		throwGroveError: (status: number, groveError: { userMessage: string; code: string }) => {
			throw Object.assign(new Error(groveError.userMessage), {
				status,
				code: groveError.code,
			});
		},
	};
});

// Import after mocks
import { PUT } from "./+server.js";
import { FONT_SCALE } from "@autumnsgrove/lattice/platform/config/presets";

// =============================================================================
// HELPERS
// =============================================================================

/** A D1 stand-in that records every statement and the values bound to it. */
function createDb() {
	const writes: Array<{ sql: string; args: unknown[] }> = [];
	const db = {
		prepare: (sql: string) => ({
			bind: (...args: unknown[]) => ({
				run: async () => {
					writes.push({ sql, args });
					return { success: true };
				},
			}),
		}),
	};
	return { db, writes };
}

function put(db: unknown, body: unknown, user: unknown = { id: "u1", email: "a@b.c" }) {
	return PUT({
		request: new Request("https://autumn.grove.place/api/admin/settings", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}),
		platform: { env: { DB: db } },
		locals: { user, tenantId: "tenant-1" },
	} as unknown as Parameters<typeof PUT>[0]);
}

const fontScale = (setting_value: unknown) => ({
	setting_key: FONT_SCALE.settingKey,
	setting_value,
});

beforeEach(() => {
	vi.clearAllMocks();
	mockGetVerifiedTenantId.mockResolvedValue("tenant-1");
});

// =============================================================================
// font_scale
// =============================================================================

describe("PUT font_scale", () => {
	it("is stored under the key the rest of the app reads", () => {
		expect(FONT_SCALE.settingKey).toBe("font_scale");
	});

	it.each(["80", "90", "100", "110", "120", "130", "140", "150"])(
		"stores %s percent for the tenant",
		async (value) => {
			const { db, writes } = createDb();

			const response = (await put(db, fontScale(value))) as unknown as {
				body: Record<string, unknown>;
			};

			expect(response.body).toMatchObject({
				success: true,
				setting_key: "font_scale",
				setting_value: value,
			});
			expect(writes).toHaveLength(1);
			expect(writes[0].sql).toContain("INSERT INTO site_settings");
			expect(writes[0].args.slice(0, 3)).toEqual(["tenant-1", "font_scale", value]);
		},
	);

	it("replaces an earlier value rather than adding a second row", async () => {
		const { db, writes } = createDb();
		await put(db, fontScale("120"));
		expect(writes[0].sql).toContain("ON CONFLICT(tenant_id, setting_key) DO UPDATE");
	});

	it.each([
		["below the range", "70"],
		["above the range", "160"],
		["between steps", "105"],
		["decimal", "1.1"],
		["empty", ""],
		["padded", " 110"],
		["signed", "+110"],
		["exponent", "1e2"],
		["not a number", "large"],
		["a number, not a string", 110],
		["null", null],
	])("rejects a value that is %s and writes nothing", async (_label, value) => {
		const { db, writes } = createDb();

		await expect(put(db, fontScale(value))).rejects.toMatchObject({ status: 400 });
		expect(writes).toHaveLength(0);
	});

	it("rejects a missing value", async () => {
		const { db, writes } = createDb();

		await expect(put(db, { setting_key: "font_scale" })).rejects.toMatchObject({ status: 400 });
		expect(writes).toHaveLength(0);
	});

	it("needs a signed-in user", async () => {
		const { db, writes } = createDb();

		await expect(put(db, fontScale("110"), null)).rejects.toMatchObject({ status: 401 });
		expect(writes).toHaveLength(0);
	});

	it("only lets the verified owner write", async () => {
		const { db, writes } = createDb();
		mockGetVerifiedTenantId.mockRejectedValueOnce(
			Object.assign(new Error("Forbidden"), { status: 403 }),
		);

		await expect(put(db, fontScale("110"))).rejects.toMatchObject({ status: 403 });
		expect(writes).toHaveLength(0);
	});
});

// =============================================================================
// Keys that were already here still behave
// =============================================================================

describe("PUT existing settings", () => {
	it("still stores a valid font family", async () => {
		const { db, writes } = createDb();

		await put(db, { setting_key: "font_family", setting_value: "lexend" });

		expect(writes[0].args.slice(0, 3)).toEqual(["tenant-1", "font_family", "lexend"]);
	});

	it("still rejects an unknown font family", async () => {
		const { db, writes } = createDb();

		await expect(
			put(db, { setting_key: "font_family", setting_value: "comic-sans-9000" }),
		).rejects.toMatchObject({ status: 400 });
		expect(writes).toHaveLength(0);
	});

	it("still rejects a key that is not whitelisted", async () => {
		const { db, writes } = createDb();

		await expect(
			put(db, { setting_key: "font_scale_extra", setting_value: "110" }),
		).rejects.toMatchObject({ status: 400 });
		expect(writes).toHaveLength(0);
	});

	it("still treats an empty vine_color as a delete", async () => {
		const { db, writes } = createDb();

		await put(db, { setting_key: "vine_color", setting_value: "" });

		expect(writes[0].sql).toContain("DELETE FROM site_settings");
	});
});
