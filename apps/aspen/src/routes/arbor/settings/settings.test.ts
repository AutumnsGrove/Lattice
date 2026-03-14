import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@autumnsgrove/lattice/feature-flags", () => ({
	getGreenhouseTenant: vi.fn(async () => null),
	getTenantControllableGrafts: vi.fn(async () => []),
	setTenantGraftOverride: vi.fn(async () => true),
	resetTenantGraftOverrides: vi.fn(async () => 0),
	getGreenhouseTenants: vi.fn(async () => []),
	enrollInGreenhouse: vi.fn(async () => true),
	removeFromGreenhouse: vi.fn(async () => true),
	toggleGreenhouseStatus: vi.fn(async () => true),
	getFeatureFlags: vi.fn(async () => []),
	setFlagEnabled: vi.fn(async () => true),
}));

vi.mock("@autumnsgrove/lattice/config/wayfinder", () => ({
	isWayfinder: vi.fn(() => false),
}));

vi.mock("@autumnsgrove/lattice/config/tiers", () => ({
	isValidTier: vi.fn((tier: string) => ["seedling", "sapling"].includes(tier)),
	TierKey: {},
}));

vi.mock("@autumnsgrove/lattice/server/services/username.js", () => ({
	validateUsernameAvailability: vi.fn(async () => ({ available: true })),
	canChangeUsername: vi.fn(async () => ({
		allowed: true,
		nextAllowedAt: undefined,
		reason: undefined,
	})),
	changeUsername: vi.fn(async () => ({ success: true, newSubdomain: "newname" })),
	getUsernameHistory: vi.fn(async () => []),
}));

vi.mock("@autumnsgrove/lattice/errors", () => ({
	ARBOR_ERRORS: {
		DB_NOT_AVAILABLE: { code: "GROVE-ARBOR-001", category: "bug", userMessage: "DB unavailable" },
		UNAUTHORIZED: { code: "GROVE-ARBOR-020", category: "user", userMessage: "Please sign in" },
		ACCESS_DENIED: { code: "GROVE-ARBOR-021", category: "user", userMessage: "Access denied" },
		TENANT_CONTEXT_REQUIRED: {
			code: "GROVE-ARBOR-022",
			category: "bug",
			userMessage: "Tenant context missing",
		},
		GREENHOUSE_REQUIRED: {
			code: "GROVE-ARBOR-023",
			category: "user",
			userMessage: "Greenhouse required",
		},
		FIELD_REQUIRED: { code: "GROVE-ARBOR-040", category: "user", userMessage: "Field required" },
		RESOURCE_NOT_FOUND: { code: "GROVE-ARBOR-042", category: "user", userMessage: "Not found" },
		USERNAME_UNAVAILABLE: {
			code: "GROVE-ARBOR-045",
			category: "user",
			userMessage: "Username unavailable",
		},
		USERNAME_CHANGE_RATE_LIMITED: {
			code: "GROVE-ARBOR-046",
			category: "user",
			userMessage: "Rate limited",
		},
		USERNAME_SAME_AS_CURRENT: {
			code: "GROVE-ARBOR-049",
			category: "user",
			userMessage: "Same as current",
		},
		USERNAME_CHANGE_FAILED: {
			code: "GROVE-ARBOR-048",
			category: "bug",
			userMessage: "Change failed",
		},
		OPERATION_FAILED: { code: "GROVE-ARBOR-080", category: "bug", userMessage: "Operation failed" },
	},
	logGroveError: vi.fn(),
}));

// ============================================================================
// HELPERS
// ============================================================================

const TENANT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

function createMockDB(overrides?: {
	tenantRow?: Record<string, unknown> | null;
	meadowOptIn?: number;
	allTenants?: Array<{ id: string; username: string; display_name: string | null }>;
}) {
	const tenantRow =
		overrides && "tenantRow" in overrides
			? overrides.tenantRow
			: { subdomain: "autumn", plan: "seedling", display_name: "Autumn" };
	const meadowRow =
		overrides?.meadowOptIn !== undefined
			? { meadow_opt_in: overrides.meadowOptIn }
			: { meadow_opt_in: 0 };
	const allTenants = overrides?.allTenants ?? [
		{ id: TENANT_ID, username: "autumn", display_name: "Autumn" },
		{ id: "other-id", username: "robin", display_name: "Robin" },
	];

	return {
		prepare: vi.fn((sql: string) => ({
			bind: vi.fn(function (this: any) {
				return this;
			}),
			first: vi.fn(async () => {
				if (sql.includes("meadow_opt_in")) return meadowRow;
				if (sql.includes("subdomain")) return tenantRow;
				return null;
			}),
			all: vi.fn(async () => {
				if (sql.includes("SELECT id, username, display_name FROM tenants")) {
					return { results: allTenants };
				}
				return { results: [] };
			}),
			run: vi.fn(async () => ({ meta: { changes: 1 } })),
		})),
	};
}

function createLoadEvent(options: {
	user?: { id: string; email: string; name: string; picture: string } | null;
	tenantId?: string | null;
	db?: ReturnType<typeof createMockDB>;
	cacheKv?: Record<string, unknown>;
	tenants?: unknown; // DO namespace
}) {
	const db = options.db ?? createMockDB();
	return {
		locals: {
			user:
				"user" in options
					? options.user
					: {
							id: "user-123",
							email: "test@grove.place",
							name: "Test User",
							picture: "https://cdn.grove.place/default.jpg",
						},
			tenantId: "tenantId" in options ? options.tenantId : TENANT_ID,
		},
		platform: {
			env: {
				DB: db,
				CACHE_KV: options.cacheKv ?? {},
				TENANTS: options.tenants ?? { idFromName: vi.fn(() => ({ fetch: vi.fn() })) },
			},
		},
		depends: vi.fn(),
		parent: vi.fn(async () => ({})),
	};
}

function createActionEvent(options: {
	formData: Record<string, string>;
	user?: { id: string; email: string; name: string; picture: string } | null;
	tenantId?: string | null;
	db?: ReturnType<typeof createMockDB>;
	cacheKv?: Record<string, unknown>;
	tenants?: unknown;
}) {
	const db = options.db ?? createMockDB();
	const fd = new FormData();
	for (const [key, value] of Object.entries(options.formData)) {
		fd.append(key, value);
	}
	return {
		request: {
			formData: vi.fn(async () => fd),
		} as unknown as Request,
		locals: {
			user:
				"user" in options
					? options.user
					: {
							id: "user-123",
							email: "test@grove.place",
							name: "Test User",
							picture: "https://cdn.grove.place/default.jpg",
						},
			tenantId: "tenantId" in options ? options.tenantId : TENANT_ID,
		},
		platform: {
			env: {
				DB: db,
				CACHE_KV: options.cacheKv ?? {},
				TENANTS: options.tenants ?? {
					idFromName: vi.fn(() => ({
						fetch: vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })),
					})),
				},
			},
		},
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("Arbor Settings Page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// LOAD FUNCTION TESTS
	// ==========================================================================

	describe("load()", () => {
		it("should return default values when no env bindings", async () => {
			// Arrange
			const { load } = await import("./+page.server.js");
			const event = createLoadEvent({ db: undefined });
			event.platform.env.DB = undefined;
			event.platform.env.CACHE_KV = undefined;

			// Act
			const result = await load(event as any);

			// Assert
			expect(result.isWayfinder).toBe(false);
			expect(result.greenhouseStatus.inGreenhouse).toBe(false);
			expect(result.tenantGrafts).toEqual([]);
			expect(result.meadowOptIn).toBe(false);
			expect(result.currentSubdomain).toBe("");
			expect(result.tenantPlan).toBe("seedling");
		});

		it("should return greenhouse status when tenant is enrolled", async () => {
			// Arrange
			const { load } = await import("./+page.server.js");
			const { getGreenhouseTenant } = await import("@autumnsgrove/lattice/feature-flags");
			const enrolledAt = new Date("2025-01-15");
			vi.mocked(getGreenhouseTenant).mockResolvedValueOnce({
				tenantId: TENANT_ID,
				enabled: true,
				enrolledAt,
				notes: "Test greenhouse member",
			} as any);
			const event = createLoadEvent({});

			// Act
			const result = await load(event as any);

			// Assert
			expect(result.greenhouseStatus.inGreenhouse).toBe(true);
			expect(result.greenhouseStatus.enrolledAt).toEqual(enrolledAt);
			expect(result.greenhouseStatus.notes).toBe("Test greenhouse member");
		});

		it("should return empty greenhouse when tenant not found", async () => {
			// Arrange
			const { load } = await import("./+page.server.js");
			const { getGreenhouseTenant } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(getGreenhouseTenant).mockResolvedValueOnce(null);
			const event = createLoadEvent({});

			// Act
			const result = await load(event as any);

			// Assert
			expect(result.greenhouseStatus.inGreenhouse).toBe(false);
			expect(result.greenhouseStatus.enrolledAt).toBeUndefined();
		});

		it("should return controllable grafts for greenhouse members", async () => {
			// Arrange
			const { load } = await import("./+page.server.js");
			const { getGreenhouseTenant, getTenantControllableGrafts } =
				await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(getGreenhouseTenant).mockResolvedValueOnce({
				tenantId: TENANT_ID,
				enabled: true,
				enrolledAt: new Date(),
			} as any);
			const grafts = [
				{ id: "graft-1", name: "Graft 1" },
				{ id: "graft-2", name: "Graft 2" },
			];
			vi.mocked(getTenantControllableGrafts).mockResolvedValueOnce(grafts as any);
			const event = createLoadEvent({});

			// Act
			const result = await load(event as any);

			// Assert
			expect(result.tenantGrafts).toEqual(grafts);
		});

		it("should not return grafts for non-greenhouse members", async () => {
			// Arrange
			const { load } = await import("./+page.server.js");
			const { getGreenhouseTenant } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(getGreenhouseTenant).mockResolvedValueOnce({
				tenantId: TENANT_ID,
				enabled: false, // Not enrolled
			} as any);
			const event = createLoadEvent({});

			// Act
			const result = await load(event as any);

			// Assert
			expect(result.tenantGrafts).toEqual([]);
		});

		it("should wayfinder see greenhouse tenants, available tenants, feature flags", async () => {
			// Arrange
			const { load } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			const { getGreenhouseTenant, getGreenhouseTenants, getFeatureFlags } =
				await import("@autumnsgrove/lattice/feature-flags");

			vi.mocked(isWayfinder).mockReturnValue(true);
			vi.mocked(getGreenhouseTenant).mockResolvedValueOnce({
				tenantId: TENANT_ID,
				enabled: true,
			} as any);
			const ghTenants = [{ tenantId: TENANT_ID, enabled: true }];
			const flags = [{ id: "flag-1", name: "Feature 1" }];
			vi.mocked(getGreenhouseTenants).mockResolvedValueOnce(ghTenants as any);
			vi.mocked(getFeatureFlags).mockResolvedValueOnce(flags as any);

			const event = createLoadEvent({});

			// Act
			const result = await load(event as any);

			// Assert
			expect(result.isWayfinder).toBe(true);
			expect(result.greenhouseTenants).toEqual(ghTenants);
			expect(result.featureFlags).toEqual(flags);
			expect(result.tenantNames).toHaveProperty(TENANT_ID);
			expect(result.availableTenants).toHaveProperty("other-id");
		});

		it("should non-Wayfinder doesn't see admin data", async () => {
			// Arrange
			const { load } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			vi.mocked(isWayfinder).mockReturnValue(false);
			const event = createLoadEvent({});

			// Act
			const result = await load(event as any);

			// Assert
			expect(result.isWayfinder).toBe(false);
			expect(result.greenhouseTenants).toEqual([]);
			expect(result.featureFlags).toEqual([]);
			expect(Object.keys(result.tenantNames)).toHaveLength(0);
			expect(Object.keys(result.availableTenants)).toHaveLength(0);
		});

		it("should return meadow opt-in status from D1", async () => {
			// Arrange
			const { load } = await import("./+page.server.js");
			const event = createLoadEvent({ db: createMockDB({ meadowOptIn: 1 }) });

			// Act
			const result = await load(event as any);

			// Assert
			expect(result.meadowOptIn).toBe(true);
		});

		it("should default meadow opt-in to false on error", async () => {
			// Arrange
			const { load } = await import("./+page.server.js");
			const mockDb = createMockDB();
			vi.mocked(mockDb.prepare as any).mockImplementation(() => {
				throw new Error("Query failed");
			});
			const event = createLoadEvent({ db: mockDb });

			// Act
			const result = await load(event as any);

			// Assert
			expect(result.meadowOptIn).toBe(false);
		});

		it("should return username data (subdomain, plan, change allowed, history)", async () => {
			// Arrange
			const { load } = await import("./+page.server.js");
			const { canChangeUsername, getUsernameHistory } =
				await import("@autumnsgrove/lattice/server/services/username.js");
			vi.mocked(canChangeUsername).mockResolvedValueOnce({
				allowed: true,
				nextAllowedAt: undefined,
				reason: undefined,
			} as any);
			vi.mocked(getUsernameHistory).mockResolvedValueOnce([
				{ oldSubdomain: "old", newSubdomain: "autumn", changedAt: new Date() },
			] as any);
			const event = createLoadEvent({});

			// Act
			const result = await load(event as any);

			// Assert
			expect(result.currentSubdomain).toBe("autumn");
			expect(result.tenantPlan).toBe("seedling");
			expect(result.usernameChangeAllowed).toBe(true);
			expect(result.usernameHistory).toHaveLength(1);
		});

		it("should pass through raw plan even if invalid tier", async () => {
			// Arrange — tenantPlan returns the raw DB value; tier validation only
			// affects the TierKey passed to canChangeUsername(), not the return value
			const { load } = await import("./+page.server.js");
			const event = createLoadEvent({
				db: createMockDB({ tenantRow: { subdomain: "test", plan: "invalid" } }),
			});

			// Act
			const result = await load(event as any);

			// Assert — raw plan returned, not the validated tier
			expect(result.tenantPlan).toBe("invalid");
		});

		it("should handle username data load failure gracefully", async () => {
			// Arrange
			const { load } = await import("./+page.server.js");
			const mockDb = createMockDB();
			vi.mocked(mockDb.prepare as any).mockImplementation(() => {
				throw new Error("Query failed");
			});
			const event = createLoadEvent({ db: mockDb });

			// Act
			const result = await load(event as any);

			// Assert
			expect(result.currentSubdomain).toBe("");
			expect(result.tenantPlan).toBe("seedling");
			expect(result.usernameHistory).toEqual([]);
		});

		it("should return oauth avatar url from locals", async () => {
			// Arrange
			const { load } = await import("./+page.server.js");
			const event = createLoadEvent({
				user: {
					id: "user-123",
					email: "test@grove.place",
					name: "Test User",
					picture: "https://example.com/avatar.jpg",
				},
			});

			// Act
			const result = await load(event as any);

			// Assert
			expect(result.oauthAvatarUrl).toBe("https://example.com/avatar.jpg");
		});

		it("should return null avatar when user has no picture", async () => {
			// Arrange — `locals.user?.picture ?? null` returns null only when
			// picture is undefined/null, not empty string
			const { load } = await import("./+page.server.js");
			const event = createLoadEvent({
				user: {
					id: "user-123",
					email: "test@grove.place",
					name: "Test User",
					picture: undefined as any,
				},
			});

			// Assert
			const result = await load(event as any);
			expect(result.oauthAvatarUrl).toBeNull();
		});
	});

	// ==========================================================================
	// CHANGE USERNAME ACTION TESTS
	// ==========================================================================

	describe("changeUsername action", () => {
		it("should reject if DB unavailable → fail(500)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const event = createActionEvent({ formData: { newUsername: "newname" } });
			event.platform.env.DB = undefined;

			// Act
			const result = await actions.changeUsername(event as any);

			// Assert
			expect(result.status).toBe(500);
			expect(result.data.error_code).toBe("GROVE-ARBOR-001");
		});

		it("should reject unauthenticated user → fail(403)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const event = createActionEvent({ formData: { newUsername: "newname" }, user: null });

			// Act
			const result = await actions.changeUsername(event as any);

			// Assert
			expect(result.status).toBe(403);
			expect(result.data.error_code).toBe("GROVE-ARBOR-020");
		});

		it("should reject empty username → fail(400)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const event = createActionEvent({ formData: { newUsername: "" } });

			// Act
			const result = await actions.changeUsername(event as any);

			// Assert
			expect(result.status).toBe(400);
			expect(result.data.error_code).toBe("GROVE-ARBOR-040");
		});

		it("should reject if tenant not found → fail(404)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const event = createActionEvent({
				formData: { newUsername: "newname" },
				db: createMockDB({ tenantRow: null }),
			});

			// Act
			const result = await actions.changeUsername(event as any);

			// Assert
			expect(result.status).toBe(404);
			expect(result.data.error_code).toBe("GROVE-ARBOR-042");
		});

		it("should reject if new username same as current → fail(400)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const event = createActionEvent({ formData: { newUsername: "autumn" } });

			// Act
			const result = await actions.changeUsername(event as any);

			// Assert
			expect(result.status).toBe(400);
			expect(result.data.error_code).toBe("GROVE-ARBOR-049");
		});

		it("should reject unavailable username → fail(400)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { validateUsernameAvailability } = await import("@autumnsgrove/lattice/server/services/username.js");
			vi.mocked(validateUsernameAvailability).mockResolvedValueOnce({
				available: false,
				error: "Username taken",
			} as any);
			const event = createActionEvent({ formData: { newUsername: "taken" } });

			// Act
			const result = await actions.changeUsername(event as any);

			// Assert
			expect(result.status).toBe(400);
			expect(result.data.error_code).toBe("GROVE-ARBOR-045");
		});

		it("should reject rate-limited changes → fail(429)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { canChangeUsername } = await import("@autumnsgrove/lattice/server/services/username.js");
			vi.mocked(canChangeUsername).mockResolvedValueOnce({
				allowed: false,
				reason: "You can change username once per year",
			} as any);
			const event = createActionEvent({ formData: { newUsername: "newname" } });

			// Act
			const result = await actions.changeUsername(event as any);

			// Assert
			expect(result.status).toBe(429);
			expect(result.data.error_code).toBe("GROVE-ARBOR-046");
		});

		it("should return success with new subdomain on valid change", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { validateUsernameAvailability, canChangeUsername, changeUsername } =
				await import("@autumnsgrove/lattice/server/services/username.js");
			vi.mocked(validateUsernameAvailability).mockResolvedValueOnce({ available: true } as any);
			vi.mocked(canChangeUsername).mockResolvedValueOnce({ allowed: true } as any);
			vi.mocked(changeUsername).mockResolvedValueOnce({
				success: true,
				newSubdomain: "newname",
			} as any);
			const event = createActionEvent({ formData: { newUsername: "newname" } });

			// Act
			const result = await actions.changeUsername(event as any);

			// Assert
			expect(result.success).toBe(true);
			expect(result.newSubdomain).toBe("newname");
			expect(result.message).toContain("newname");
		});

		it("should handle service failure → fail(500)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { changeUsername } = await import("@autumnsgrove/lattice/server/services/username.js");
			vi.mocked(changeUsername).mockResolvedValueOnce({ success: false, error: "DB error" } as any);
			const event = createActionEvent({ formData: { newUsername: "newname" } });

			// Act
			const result = await actions.changeUsername(event as any);

			// Assert
			expect(result.status).toBe(500);
			expect(result.data.error_code).toBe("GROVE-ARBOR-048");
		});

		it("should convert username to lowercase and trim whitespace", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { validateUsernameAvailability, canChangeUsername, changeUsername } =
				await import("@autumnsgrove/lattice/server/services/username.js");
			vi.mocked(validateUsernameAvailability).mockResolvedValueOnce({ available: true } as any);
			vi.mocked(canChangeUsername).mockResolvedValueOnce({ allowed: true } as any);
			vi.mocked(changeUsername).mockResolvedValueOnce({
				success: true,
				newSubdomain: "newname",
			} as any);
			const event = createActionEvent({ formData: { newUsername: "  NewName  " } });

			// Act
			const result = await actions.changeUsername(event as any);

			// Assert
			expect(result.success).toBe(true);
			// The actual normalized value should be passed to service
			expect(vi.mocked(validateUsernameAvailability).mock.calls[0][1]).toBe("newname");
		});

		it("should handle missing tenant context → fail(403)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const event = createActionEvent({ formData: { newUsername: "newname" }, tenantId: null });

			// Act
			const result = await actions.changeUsername(event as any);

			// Assert
			expect(result.status).toBe(403);
			expect(result.data.error_code).toBe("GROVE-ARBOR-020");
		});
	});

	// ==========================================================================
	// TOGGLE GRAFT ACTION TESTS
	// ==========================================================================

	describe("toggleGraft action", () => {
		it("should reject if DB or CACHE_KV missing → fail(500)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const event = createActionEvent({ formData: { graftId: "graft-1", enabled: "true" } });
			event.platform.env.CACHE_KV = undefined;

			// Act
			const result = await actions.toggleGraft(event as any);

			// Assert
			expect(result.status).toBe(500);
			expect(result.data.error_code).toBe("GROVE-ARBOR-001");
		});

		it("should reject without tenantId → fail(403)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const event = createActionEvent({
				formData: { graftId: "graft-1", enabled: "true" },
				tenantId: null,
			});

			// Act
			const result = await actions.toggleGraft(event as any);

			// Assert
			expect(result.status).toBe(403);
			expect(result.data.error_code).toBe("GROVE-ARBOR-022");
		});

		it("should reject non-greenhouse members → fail(403)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { getGreenhouseTenant } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(getGreenhouseTenant).mockResolvedValueOnce({
				tenantId: TENANT_ID,
				enabled: false,
			} as any);
			const event = createActionEvent({ formData: { graftId: "graft-1", enabled: "true" } });

			// Act
			const result = await actions.toggleGraft(event as any);

			// Assert
			expect(result.status).toBe(403);
			expect(result.data.error_code).toBe("GROVE-ARBOR-023");
		});

		it("should reject missing graftId → fail(400)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { getGreenhouseTenant } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(getGreenhouseTenant).mockResolvedValueOnce({
				tenantId: TENANT_ID,
				enabled: true,
			} as any);
			const event = createActionEvent({ formData: { graftId: "", enabled: "true" } });

			// Act
			const result = await actions.toggleGraft(event as any);

			// Assert
			expect(result.status).toBe(400);
			expect(result.data.error_code).toBe("GROVE-ARBOR-040");
		});

		it("should return enabled message on toggle true", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { getGreenhouseTenant, setTenantGraftOverride } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(getGreenhouseTenant).mockResolvedValueOnce({
				tenantId: TENANT_ID,
				enabled: true,
			} as any);
			vi.mocked(setTenantGraftOverride).mockResolvedValueOnce(true);
			const event = createActionEvent({ formData: { graftId: "graft-1", enabled: "true" } });

			// Act
			const result = await actions.toggleGraft(event as any);

			// Assert
			expect(result.success).toBe(true);
			expect(result.message).toContain("enabled");
			expect(result.message).toContain("graft-1");
		});

		it("should return disabled message on toggle false", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { getGreenhouseTenant, setTenantGraftOverride } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(getGreenhouseTenant).mockResolvedValueOnce({
				tenantId: TENANT_ID,
				enabled: true,
			} as any);
			vi.mocked(setTenantGraftOverride).mockResolvedValueOnce(true);
			const event = createActionEvent({ formData: { graftId: "graft-1", enabled: "false" } });

			// Act
			const result = await actions.toggleGraft(event as any);

			// Assert
			expect(result.success).toBe(true);
			expect(result.message).toContain("disabled");
		});

		it("should return fail on service failure → fail(500)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { getGreenhouseTenant, setTenantGraftOverride } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(getGreenhouseTenant).mockResolvedValueOnce({
				tenantId: TENANT_ID,
				enabled: true,
			} as any);
			vi.mocked(setTenantGraftOverride).mockResolvedValueOnce(false);
			const event = createActionEvent({ formData: { graftId: "graft-1", enabled: "true" } });

			// Act
			const result = await actions.toggleGraft(event as any);

			// Assert
			expect(result.status).toBe(500);
			expect(result.data.error_code).toBe("GROVE-ARBOR-080");
		});
	});

	// ==========================================================================
	// RESET GRAFTS ACTION TESTS
	// ==========================================================================

	describe("resetGrafts action", () => {
		it("should return count-aware message (singular vs plural)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { getGreenhouseTenant, resetTenantGraftOverrides } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(getGreenhouseTenant).mockResolvedValueOnce({
				tenantId: TENANT_ID,
				enabled: true,
			} as any);
			vi.mocked(resetTenantGraftOverrides).mockResolvedValueOnce(1);
			const event = createActionEvent({ formData: {} });

			// Act
			const result = await actions.resetGrafts(event as any);

			// Assert
			expect(result.success).toBe(true);
			expect(result.message).toContain("1 graft preference");
			expect(result.message).not.toContain("preferences");
		});

		it("should return plural message for multiple grafts", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { getGreenhouseTenant, resetTenantGraftOverrides } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(getGreenhouseTenant).mockResolvedValueOnce({
				tenantId: TENANT_ID,
				enabled: true,
			} as any);
			vi.mocked(resetTenantGraftOverrides).mockResolvedValueOnce(3);
			const event = createActionEvent({ formData: {} });

			// Act
			const result = await actions.resetGrafts(event as any);

			// Assert
			expect(result.success).toBe(true);
			expect(result.message).toContain("3 graft preferences");
		});

		it("should return no custom preferences when count is 0", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { getGreenhouseTenant, resetTenantGraftOverrides } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(getGreenhouseTenant).mockResolvedValueOnce({
				tenantId: TENANT_ID,
				enabled: true,
			} as any);
			vi.mocked(resetTenantGraftOverrides).mockResolvedValueOnce(0);
			const event = createActionEvent({ formData: {} });

			// Act
			const result = await actions.resetGrafts(event as any);

			// Assert
			expect(result.success).toBe(true);
			expect(result.message).toBe("No custom preferences to reset");
		});

		it("should require greenhouse membership", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { getGreenhouseTenant } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(getGreenhouseTenant).mockResolvedValueOnce({
				tenantId: TENANT_ID,
				enabled: false,
			} as any);
			const event = createActionEvent({ formData: {} });

			// Act
			const result = await actions.resetGrafts(event as any);

			// Assert
			expect(result.status).toBe(403);
			expect(result.data.error_code).toBe("GROVE-ARBOR-023");
		});
	});

	// ==========================================================================
	// WAYFINDER-ONLY ACTIONS
	// ==========================================================================

	describe("enrollTenant action (Wayfinder-only)", () => {
		it("should reject non-Wayfinder → fail(403)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			vi.mocked(isWayfinder).mockReturnValue(false);
			const event = createActionEvent({ formData: { tenantId: "tenant-123" } });

			// Act
			const result = await actions.enrollTenant(event as any);

			// Assert
			expect(result.status).toBe(403);
			expect(result.data.error_code).toBe("GROVE-ARBOR-021");
		});

		it("should reject missing tenantId → fail(400)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			vi.mocked(isWayfinder).mockReturnValue(true);
			const event = createActionEvent({ formData: { tenantId: "" } });

			// Act
			const result = await actions.enrollTenant(event as any);

			// Assert
			expect(result.status).toBe(400);
			expect(result.data.error_code).toBe("GROVE-ARBOR-040");
		});

		it("should enroll tenant with notes", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			const { enrollInGreenhouse } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(isWayfinder).mockReturnValue(true);
			vi.mocked(enrollInGreenhouse).mockResolvedValueOnce(true);
			const event = createActionEvent({
				formData: { tenantId: "tenant-123", notes: "Early tester" },
			});

			// Act
			const result = await actions.enrollTenant(event as any);

			// Assert
			expect(result.success).toBe(true);
			expect(result.message).toContain("enrolled");
			expect(vi.mocked(enrollInGreenhouse).mock.calls[0][2]).toBe("Early tester");
		});

		it("should fall back to wayfinder for actor email", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			const { enrollInGreenhouse } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(isWayfinder).mockReturnValue(true);
			vi.mocked(enrollInGreenhouse).mockResolvedValueOnce(true);
			const event = createActionEvent({ formData: { tenantId: "tenant-123" }, user: null });

			// Act
			const result = await actions.enrollTenant(event as any);

			// Assert
			expect(result.success).toBe(true);
			expect(vi.mocked(enrollInGreenhouse).mock.calls[0][1]).toBe("wayfinder");
		});

		it("should return fail on service failure", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			const { enrollInGreenhouse } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(isWayfinder).mockReturnValue(true);
			vi.mocked(enrollInGreenhouse).mockResolvedValueOnce(false);
			const event = createActionEvent({ formData: { tenantId: "tenant-123" } });

			// Act
			const result = await actions.enrollTenant(event as any);

			// Assert
			expect(result.status).toBe(500);
			expect(result.data.error_code).toBe("GROVE-ARBOR-080");
		});
	});

	describe("removeTenant action (Wayfinder-only)", () => {
		it("should reject non-Wayfinder → fail(403)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			vi.mocked(isWayfinder).mockReturnValue(false);
			const event = createActionEvent({ formData: { tenantId: "tenant-123" } });

			// Act
			const result = await actions.removeTenant(event as any);

			// Assert
			expect(result.status).toBe(403);
		});

		it("should remove tenant from greenhouse", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			const { removeFromGreenhouse } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(isWayfinder).mockReturnValue(true);
			vi.mocked(removeFromGreenhouse).mockResolvedValueOnce(true);
			const event = createActionEvent({ formData: { tenantId: "tenant-123" } });

			// Act
			const result = await actions.removeTenant(event as any);

			// Assert
			expect(result.success).toBe(true);
			expect(result.message).toContain("removed");
		});

		it("should return fail on service failure", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			const { removeFromGreenhouse } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(isWayfinder).mockReturnValue(true);
			vi.mocked(removeFromGreenhouse).mockResolvedValueOnce(false);
			const event = createActionEvent({ formData: { tenantId: "tenant-123" } });

			// Act
			const result = await actions.removeTenant(event as any);

			// Assert
			expect(result.status).toBe(500);
		});
	});

	describe("toggleTenant action (Wayfinder-only)", () => {
		it("should reject non-Wayfinder → fail(403)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			vi.mocked(isWayfinder).mockReturnValue(false);
			const event = createActionEvent({ formData: { tenantId: "tenant-123", enabled: "true" } });

			// Act
			const result = await actions.toggleTenant(event as any);

			// Assert
			expect(result.status).toBe(403);
		});

		it("should return enabled message on toggle true", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			const { toggleGreenhouseStatus } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(isWayfinder).mockReturnValue(true);
			vi.mocked(toggleGreenhouseStatus).mockResolvedValueOnce(true);
			const event = createActionEvent({ formData: { tenantId: "tenant-123", enabled: "true" } });

			// Act
			const result = await actions.toggleTenant(event as any);

			// Assert
			expect(result.success).toBe(true);
			expect(result.message).toContain("enabled");
		});

		it("should return disabled message on toggle false", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			const { toggleGreenhouseStatus } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(isWayfinder).mockReturnValue(true);
			vi.mocked(toggleGreenhouseStatus).mockResolvedValueOnce(true);
			const event = createActionEvent({ formData: { tenantId: "tenant-123", enabled: "false" } });

			// Act
			const result = await actions.toggleTenant(event as any);

			// Assert
			expect(result.success).toBe(true);
			expect(result.message).toContain("disabled");
		});
	});

	// ==========================================================================
	// FLAG MANAGEMENT ACTIONS (WAYFINDER-ONLY)
	// ==========================================================================

	describe("cultivateFlag action (Wayfinder-only)", () => {
		it("should reject non-Wayfinder → fail(403)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			vi.mocked(isWayfinder).mockReturnValue(false);
			const event = createActionEvent({ formData: { flagId: "flag-1" } });

			// Act
			const result = await actions.cultivateFlag(event as any);

			// Assert
			expect(result.status).toBe(403);
		});

		it("should enable flag → cultivated message", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			const { setFlagEnabled } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(isWayfinder).mockReturnValue(true);
			vi.mocked(setFlagEnabled).mockResolvedValueOnce(true);
			const event = createActionEvent({ formData: { flagId: "flag-1" } });

			// Act
			const result = await actions.cultivateFlag(event as any);

			// Assert
			expect(result.success).toBe(true);
			expect(result.message).toContain("cultivated");
			expect(vi.mocked(setFlagEnabled).mock.calls[0][1]).toBe(true);
		});

		it("should reject missing flagId → fail(400)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			vi.mocked(isWayfinder).mockReturnValue(true);
			const event = createActionEvent({ formData: { flagId: "" } });

			// Act
			const result = await actions.cultivateFlag(event as any);

			// Assert
			expect(result.status).toBe(400);
		});
	});

	describe("pruneFlag action (Wayfinder-only)", () => {
		it("should reject non-Wayfinder → fail(403)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			vi.mocked(isWayfinder).mockReturnValue(false);
			const event = createActionEvent({ formData: { flagId: "flag-1" } });

			// Act
			const result = await actions.pruneFlag(event as any);

			// Assert
			expect(result.status).toBe(403);
		});

		it("should disable flag → pruned message", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			const { setFlagEnabled } = await import("@autumnsgrove/lattice/feature-flags");
			vi.mocked(isWayfinder).mockReturnValue(true);
			vi.mocked(setFlagEnabled).mockResolvedValueOnce(true);
			const event = createActionEvent({ formData: { flagId: "flag-1" } });

			// Act
			const result = await actions.pruneFlag(event as any);

			// Assert
			expect(result.success).toBe(true);
			expect(result.message).toContain("pruned");
			expect(vi.mocked(setFlagEnabled).mock.calls[0][1]).toBe(false);
		});

		it("should reject missing flagId → fail(400)", async () => {
			// Arrange
			const { actions } = await import("./+page.server.js");
			const { isWayfinder } = await import("@autumnsgrove/lattice/config/wayfinder");
			vi.mocked(isWayfinder).mockReturnValue(true);
			const event = createActionEvent({ formData: { flagId: "" } });

			// Act
			const result = await actions.pruneFlag(event as any);

			// Assert
			expect(result.status).toBe(400);
		});
	});
});
