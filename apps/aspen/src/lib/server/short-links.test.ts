import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@autumnsgrove/lattice/auth/session", () => ({ getVerifiedTenantId: vi.fn() }));
vi.mock("@autumnsgrove/lattice/services/short-links", () => ({ getGroveOwner: vi.fn() }));

import { getVerifiedTenantId } from "@autumnsgrove/lattice/auth/session";
import { getGroveOwner } from "@autumnsgrove/lattice/services/short-links";
import { LINK_ERRORS } from "@autumnsgrove/lattice/errors";
import { requireGroveLinkAccess } from "./short-links";

const verify = vi.mocked(getVerifiedTenantId);
const loadOwner = vi.mocked(getGroveOwner);

const DB = {} as D1Database;
const platform = { env: { DB } } as unknown as App.Platform;
const locals = { user: { id: "u-1", email: "autumn@example.com" }, tenantId: "t-1" } as App.Locals;
const owner = { type: "grove", tenantId: "t-1", subdomain: "autumn", customDomain: null } as const;

beforeEach(() => {
	vi.resetAllMocks();
	verify.mockResolvedValue("t-1");
	loadOwner.mockResolvedValue(owner);
});

describe("requireGroveLinkAccess", () => {
	it("hands back the database, the grove, and who is acting", async () => {
		expect(await requireGroveLinkAccess(platform, locals)).toEqual({
			ok: true,
			db: DB,
			owner,
			userId: "u-1",
		});
		expect(verify).toHaveBeenCalledWith(DB, "t-1", locals.user);
		expect(loadOwner).toHaveBeenCalledWith(DB, "t-1");
	});

	it("reports a missing database before anything else", async () => {
		expect(await requireGroveLinkAccess({ env: {} } as App.Platform, locals)).toEqual({
			ok: false,
			status: 500,
			error: LINK_ERRORS.DB_NOT_AVAILABLE,
		});
		expect(await requireGroveLinkAccess(undefined, locals)).toMatchObject({ status: 500 });
	});

	it("needs both a signed-in user and a grove", async () => {
		const unauthorized = { ok: false, status: 401, error: LINK_ERRORS.UNAUTHORIZED };
		expect(await requireGroveLinkAccess(platform, { ...locals, user: null })).toEqual(unauthorized);
		expect(await requireGroveLinkAccess(platform, { ...locals, tenantId: undefined })).toEqual(
			unauthorized,
		);
		expect(verify).not.toHaveBeenCalled();
	});

	it("refuses someone who is signed in but doesn't own this grove", async () => {
		verify.mockRejectedValue(Object.assign(new Error("Access denied"), { status: 403 }));
		expect(await requireGroveLinkAccess(platform, locals)).toEqual({
			ok: false,
			status: 403,
			error: LINK_ERRORS.UNAUTHORIZED,
		});
		expect(loadOwner).not.toHaveBeenCalled();
	});

	it("keeps whatever status the ownership check reports, and defaults to 403", async () => {
		verify.mockRejectedValue(Object.assign(new Error("Unauthorized"), { status: 401 }));
		expect(await requireGroveLinkAccess(platform, locals)).toMatchObject({ status: 401 });

		verify.mockRejectedValue(new Error("boom"));
		expect(await requireGroveLinkAccess(platform, locals)).toMatchObject({ status: 403 });
	});

	it("refuses when the grove is missing or inactive", async () => {
		loadOwner.mockResolvedValue(null);
		expect(await requireGroveLinkAccess(platform, locals)).toEqual({
			ok: false,
			status: 403,
			error: LINK_ERRORS.UNAUTHORIZED,
		});
	});
});
