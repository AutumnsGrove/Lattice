/**
 * R2 Storage API Route Integration Tests
 *
 * Tests the HTTP handler layer for image management endpoints:
 * - DELETE /api/images/delete — single image deletion with tenant isolation
 * - POST /api/images/delete-batch — batch deletion with partial failure handling
 * - GET /api/images/list — tenant-scoped listing with filtering and sorting
 *
 * These test the actual route handlers (not the storage service layer, which
 * has its own tests in storage.test.ts). Focus areas:
 * - Auth gates (401/403)
 * - Tenant isolation (cross-tenant access prevention)
 * - Key sanitization (path traversal prevention)
 * - Rate limiting wiring
 * - Partial failure semantics (batch)
 * - D1 metadata graceful degradation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

// Mock the $types import (SvelteKit generated types)
vi.mock("$lib/auth/session.js", () => ({
	getVerifiedTenantId: vi.fn(async (_db: unknown, tenantId: string) => tenantId),
}));

vi.mock("$lib/utils/validation.js", () => ({
	sanitizeObject: vi.fn((obj: unknown) => obj),
}));

vi.mock("$lib/utils/gallery.js", () => ({
	parseImageFilename: vi.fn((key: string) => {
		const parts = key.split("/");
		const filename = parts[parts.length - 1];
		return {
			slug: filename.replace(/\.[^.]+$/, ""),
			date: null,
			category: parts.length > 2 ? parts[1] : null,
		};
	}),
}));

vi.mock("$lib/threshold/factory.js", () => ({
	createThreshold: vi.fn(() => null), // disabled by default
}));

vi.mock("$lib/threshold/adapters/sveltekit.js", () => ({
	thresholdCheck: vi.fn(async () => null),
}));

// Mock errors — throwGroveError throws a plain object with `status`
// (avoids class transpilation issues inside hoisted vi.mock factories)
vi.mock("$lib/errors", () => {
	function throwGroveError(
		status: number,
		groveError: { code: string; userMessage: string },
	): never {
		const err = Object.assign(new Error(groveError.userMessage), {
			status,
			body: { message: groveError.userMessage, code: groveError.code },
		});
		throw err;
	}

	return {
		API_ERRORS: {
			UNAUTHORIZED: { code: "GROVE-API-001", userMessage: "Unauthorized", category: "user" },
			TENANT_CONTEXT_REQUIRED: {
				code: "GROVE-API-002",
				userMessage: "Tenant required",
				category: "user",
			},
			FORBIDDEN: { code: "GROVE-API-003", userMessage: "Forbidden", category: "user" },
			VALIDATION_FAILED: {
				code: "GROVE-API-004",
				userMessage: "Validation failed",
				category: "user",
			},
			R2_NOT_CONFIGURED: {
				code: "GROVE-API-005",
				userMessage: "Storage unavailable",
				category: "system",
			},
			DB_NOT_CONFIGURED: {
				code: "GROVE-API-006",
				userMessage: "Database unavailable",
				category: "system",
			},
			OPERATION_FAILED: {
				code: "GROVE-API-007",
				userMessage: "Operation failed",
				category: "system",
			},
		},
		throwGroveError,
		logGroveError: () => {},
	};
});

// ============================================================================
// Import route handlers
// ============================================================================

const { DELETE: deleteHandler } = await import("../../../src/routes/api/images/delete/+server.js");
const { POST: batchDeleteHandler } =
	await import("../../../src/routes/api/images/delete-batch/+server.js");
const { GET: listHandler } = await import("../../../src/routes/api/images/list/+server.js");

// ============================================================================
// Helpers
// ============================================================================

const TENANT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const OTHER_TENANT_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";

function createMockR2() {
	const store = new Map<string, { size: number; uploaded: Date; key: string }>();

	return {
		delete: vi.fn(async (key: string) => {
			store.delete(key);
		}),
		put: vi.fn(async (key: string, data: unknown) => {
			store.set(key, { size: 100, uploaded: new Date(), key });
		}),
		list: vi.fn(async (opts?: { prefix?: string; cursor?: string; limit?: number }) => {
			const prefix = opts?.prefix ?? "";
			const limit = opts?.limit ?? 50;
			const objects = Array.from(store.values())
				.filter((o) => o.key.startsWith(prefix))
				.slice(0, limit);
			return {
				objects,
				truncated: false,
				cursor: null,
			};
		}),
		head: vi.fn(async (key: string) => store.get(key) ?? null),
		_store: store,
	};
}

function createMockDB() {
	return {
		prepare: vi.fn(() => ({
			bind: vi.fn(function (this: any) {
				return this;
			}),
			first: vi.fn(async () => null),
			all: vi.fn(async () => ({ results: [] })),
			run: vi.fn(async () => ({ meta: { changes: 0 } })),
		})),
	};
}

function createRouteEvent(options: {
	method?: string;
	pathname?: string;
	search?: string;
	body?: unknown;
	user?: { id: string; email: string; name: string; picture: string } | null;
	tenantId?: string | null;
	r2?: ReturnType<typeof createMockR2>;
	db?: ReturnType<typeof createMockDB>;
}) {
	const method = options.method ?? "GET";
	const pathname = options.pathname ?? "/api/images/list";
	const search = options.search ?? "";
	const url = new URL(`https://autumn.grove.place${pathname}${search}`);

	const headers = new Headers();
	headers.set("host", "autumn.grove.place");
	headers.set("content-type", "application/json");

	const r2 = options.r2 ?? createMockR2();
	const db = options.db ?? createMockDB();

	const request: Record<string, unknown> = {
		method,
		url: url.toString(),
		headers,
	};

	if (options.body !== undefined) {
		request.json = vi.fn(async () => options.body);
	}

	return {
		request: request as unknown as Request,
		url,
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
			context: { type: "tenant" },
			csrfToken: "test-csrf",
		},
		platform: {
			env: {
				IMAGES: r2,
				DB: db,
				CDN_BASE_URL: "https://cdn.grove.place",
			},
		},
		params: {},
		cookies: {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			getAll: vi.fn(() => []),
			serialize: vi.fn(() => ""),
		},
		getClientAddress: vi.fn(() => "127.0.0.1"),
		isDataRequest: false,
		isSubRequest: false,
		route: { id: pathname },
		setHeaders: vi.fn(),
		fetch: vi.fn(),
	};
}

// ============================================================================
// Tests — DELETE /api/images/delete
// ============================================================================

describe("DELETE /api/images/delete", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Auth gates
	describe("Auth", () => {
		it("rejects unauthenticated requests → 401", async () => {
			const event = createRouteEvent({
				method: "DELETE",
				user: null,
				body: { key: `${TENANT_ID}/photos/test.png` },
			});

			try {
				await deleteHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(401);
			}
		});

		it("rejects requests without tenant context → 403", async () => {
			const event = createRouteEvent({
				method: "DELETE",
				tenantId: null,
				body: { key: `${TENANT_ID}/photos/test.png` },
			});

			try {
				await deleteHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(403);
			}
		});
	});

	// Tenant isolation
	describe("Tenant Isolation", () => {
		it("allows deleting own tenant's images", async () => {
			const r2 = createMockR2();
			const key = `${TENANT_ID}/photos/2024/01/test.png`;

			const event = createRouteEvent({
				method: "DELETE",
				body: { key },
				r2,
			});

			const response = await deleteHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.success).toBe(true);
			expect(r2.delete).toHaveBeenCalledWith(key);
		});

		it("blocks deleting another tenant's images → 403", async () => {
			const r2 = createMockR2();
			const key = `${OTHER_TENANT_ID}/photos/secret.png`;

			const event = createRouteEvent({
				method: "DELETE",
				body: { key },
				r2,
			});

			try {
				await deleteHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(403);
			}
			// R2 should NOT have been called
			expect(r2.delete).not.toHaveBeenCalled();
		});

		it("allows deleting legacy unprefixed keys", async () => {
			const r2 = createMockR2();
			const key = "photos/old-image.png"; // No UUID prefix

			const event = createRouteEvent({
				method: "DELETE",
				body: { key },
				r2,
			});

			const response = await deleteHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.success).toBe(true);
			expect(r2.delete).toHaveBeenCalledWith(key);
		});
	});

	// Key sanitization
	describe("Key Sanitization", () => {
		it("strips directory traversal sequences", async () => {
			const r2 = createMockR2();

			const event = createRouteEvent({
				method: "DELETE",
				body: { key: `${TENANT_ID}/../../../etc/passwd` },
				r2,
			});

			// The traversal gets stripped, key becomes the tenant path
			const response = await deleteHandler(event as any);
			const body = (await response.json()) as any;

			// Should succeed but with sanitized key (no ..)
			expect(body.key).not.toContain("..");
		});

		it("strips leading slashes", async () => {
			const r2 = createMockR2();

			const event = createRouteEvent({
				method: "DELETE",
				body: { key: `///${TENANT_ID}/photos/test.png` },
				r2,
			});

			const response = await deleteHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.key).not.toMatch(/^\/+/);
		});

		it("normalizes backslashes", async () => {
			const r2 = createMockR2();

			const event = createRouteEvent({
				method: "DELETE",
				body: { key: `${TENANT_ID}\\photos\\test.png` },
				r2,
			});

			const response = await deleteHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.key).not.toContain("\\");
			expect(body.key).toContain("/");
		});

		it("rejects empty key → 400", async () => {
			const event = createRouteEvent({
				method: "DELETE",
				body: { key: "" },
			});

			try {
				await deleteHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(400);
			}
		});

		it("rejects missing key → 400", async () => {
			const event = createRouteEvent({
				method: "DELETE",
				body: {},
			});

			try {
				await deleteHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(400);
			}
		});

		it("rejects non-string key → 400", async () => {
			const event = createRouteEvent({
				method: "DELETE",
				body: { key: 12345 },
			});

			try {
				await deleteHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(400);
			}
		});
	});

	// D1 cleanup
	describe("D1 Cleanup", () => {
		it("cleans up gallery_images after R2 deletion", async () => {
			const r2 = createMockR2();
			const db = createMockDB();
			const key = `${TENANT_ID}/photos/test.png`;

			const event = createRouteEvent({
				method: "DELETE",
				body: { key },
				r2,
				db,
			});

			await deleteHandler(event as any);

			// DB should have been called for cleanup
			expect(db.prepare).toHaveBeenCalled();
		});

		it("succeeds even when D1 cleanup fails (R2 already deleted)", async () => {
			const r2 = createMockR2();
			const db = createMockDB();

			// Make D1 throw on the cleanup query
			db.prepare = vi.fn(() => ({
				bind: vi.fn(function (this: any) {
					return {
						run: vi.fn(async () => {
							throw new Error("D1 unavailable");
						}),
						first: vi.fn(async () => null),
					};
				}),
				first: vi.fn(async () => null),
				run: vi.fn(async () => {
					throw new Error("D1 unavailable");
				}),
			}));

			const key = `${TENANT_ID}/photos/test.png`;
			const event = createRouteEvent({
				method: "DELETE",
				body: { key },
				r2,
				db,
			});

			// Should still succeed — R2 deletion is the primary operation
			const response = await deleteHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.success).toBe(true);
			expect(r2.delete).toHaveBeenCalledWith(key);
		});
	});

	// Environment checks
	describe("Environment", () => {
		it("rejects when R2 not configured → 500", async () => {
			const event = createRouteEvent({
				method: "DELETE",
				body: { key: "test.png" },
			});
			event.platform.env.IMAGES = undefined as any;

			try {
				await deleteHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(500);
			}
		});

		it("rejects when DB not configured → 500", async () => {
			const event = createRouteEvent({
				method: "DELETE",
				body: { key: "test.png" },
			});
			event.platform.env.DB = undefined as any;

			try {
				await deleteHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(500);
			}
		});
	});
});

// ============================================================================
// Tests — POST /api/images/delete-batch
// ============================================================================

describe("POST /api/images/delete-batch", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Auth", () => {
		it("rejects unauthenticated → 401", async () => {
			const event = createRouteEvent({
				method: "POST",
				user: null,
				body: { keys: ["test.png"] },
			});

			try {
				await batchDeleteHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(401);
			}
		});

		it("rejects without tenant → 403", async () => {
			const event = createRouteEvent({
				method: "POST",
				tenantId: null,
				body: { keys: ["test.png"] },
			});

			try {
				await batchDeleteHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(403);
			}
		});
	});

	describe("Validation", () => {
		it("rejects non-array keys → 400", async () => {
			const event = createRouteEvent({
				method: "POST",
				body: { keys: "not-an-array" },
			});

			try {
				await batchDeleteHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(400);
			}
		});

		it("rejects empty keys array → 400", async () => {
			const event = createRouteEvent({
				method: "POST",
				body: { keys: [] },
			});

			try {
				await batchDeleteHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(400);
			}
		});

		it("rejects batch exceeding 50 items → 400", async () => {
			const keys = Array.from({ length: 51 }, (_, i) => `${TENANT_ID}/photos/${i}.png`);
			const event = createRouteEvent({
				method: "POST",
				body: { keys },
			});

			try {
				await batchDeleteHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(400);
			}
		});

		it("accepts exactly 50 items", async () => {
			const r2 = createMockR2();
			const keys = Array.from({ length: 50 }, (_, i) => `${TENANT_ID}/photos/${i}.png`);
			const event = createRouteEvent({
				method: "POST",
				body: { keys },
				r2,
			});

			const response = await batchDeleteHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.success).toBe(true);
			expect(body.deleted).toHaveLength(50);
		});

		it("rejects keys containing non-strings → 400", async () => {
			const event = createRouteEvent({
				method: "POST",
				body: { keys: ["valid.png", 123, null] },
			});

			try {
				await batchDeleteHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(400);
			}
		});
	});

	describe("Tenant Isolation (batch)", () => {
		it("deletes own tenant keys, rejects other tenant keys", async () => {
			const r2 = createMockR2();
			const keys = [
				`${TENANT_ID}/photos/mine.png`, // own tenant — should succeed
				`${OTHER_TENANT_ID}/photos/theirs.png`, // other tenant — should fail
				`photos/legacy.png`, // no prefix — should succeed
			];

			const event = createRouteEvent({
				method: "POST",
				body: { keys },
				r2,
			});

			const response = await batchDeleteHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.success).toBe(false); // One failed
			expect(body.deleted).toHaveLength(2);
			expect(body.failed).toHaveLength(1);
			expect(body.failed[0].reason).toBe("Access denied");
			expect(body.failed[0].key).toBe(`${OTHER_TENANT_ID}/photos/theirs.png`);
		});

		it("all own keys → success: true", async () => {
			const r2 = createMockR2();
			const keys = [
				`${TENANT_ID}/photos/a.png`,
				`${TENANT_ID}/photos/b.png`,
				`${TENANT_ID}/photos/c.png`,
			];

			const event = createRouteEvent({
				method: "POST",
				body: { keys },
				r2,
			});

			const response = await batchDeleteHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.success).toBe(true);
			expect(body.deleted).toHaveLength(3);
			expect(body.failed).toHaveLength(0);
		});
	});

	describe("Partial Failure", () => {
		it("reports per-item failures with reasons", async () => {
			const r2 = createMockR2();
			// Make R2 throw on specific keys
			let callCount = 0;
			r2.delete = vi.fn(async (key: string) => {
				callCount++;
				if (callCount === 2) throw new Error("R2 intermittent failure");
			});

			const keys = [
				`${TENANT_ID}/photos/a.png`,
				`${TENANT_ID}/photos/b.png`, // will fail
				`${TENANT_ID}/photos/c.png`,
			];

			const event = createRouteEvent({
				method: "POST",
				body: { keys },
				r2,
			});

			const response = await batchDeleteHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.success).toBe(false);
			expect(body.deleted).toHaveLength(2);
			expect(body.failed).toHaveLength(1);
			expect(body.failed[0].reason).toContain("R2 intermittent failure");
		});

		it("invalid format keys are reported as failures", async () => {
			const r2 = createMockR2();
			const keys = [
				`${TENANT_ID}/photos/valid.png`,
				"", // empty string — should fail format validation
			];

			const event = createRouteEvent({
				method: "POST",
				body: { keys },
				r2,
			});

			// Empty string fails the "all keys must be non-empty strings" check
			try {
				await batchDeleteHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(400);
			}
		});

		it("summary string reflects counts", async () => {
			const r2 = createMockR2();
			const keys = [
				`${TENANT_ID}/photos/a.png`,
				`${OTHER_TENANT_ID}/photos/b.png`, // blocked
			];

			const event = createRouteEvent({
				method: "POST",
				body: { keys },
				r2,
			});

			const response = await batchDeleteHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.summary).toBe("1 deleted, 1 failed");
		});
	});
});

// ============================================================================
// Tests — GET /api/images/list
// ============================================================================

describe("GET /api/images/list", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Auth", () => {
		it("rejects unauthenticated → 401", async () => {
			const event = createRouteEvent({ user: null });

			try {
				await listHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(401);
			}
		});

		it("rejects without tenant → 403", async () => {
			const event = createRouteEvent({ tenantId: null });

			try {
				await listHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(403);
			}
		});
	});

	describe("Tenant Isolation", () => {
		it("forces tenant prefix on R2 list", async () => {
			const r2 = createMockR2();
			const event = createRouteEvent({ r2 });

			await listHandler(event as any);

			expect(r2.list).toHaveBeenCalledWith(
				expect.objectContaining({
					prefix: `${TENANT_ID}/`,
				}),
			);
		});

		it("appends user prefix to tenant prefix", async () => {
			const r2 = createMockR2();
			const event = createRouteEvent({
				r2,
				search: "?prefix=photos/2024/",
			});

			await listHandler(event as any);

			expect(r2.list).toHaveBeenCalledWith(
				expect.objectContaining({
					prefix: `${TENANT_ID}/photos/2024/`,
				}),
			);
		});

		it("user cannot escape tenant prefix via prefix param", async () => {
			const r2 = createMockR2();
			const event = createRouteEvent({
				r2,
				search: "?prefix=../../other-tenant/",
			});

			await listHandler(event as any);

			// R2 list should still be scoped to tenant — the prefix is concatenated
			const call = r2.list.mock.calls[0][0];
			expect(call.prefix).toContain(TENANT_ID);
		});
	});

	describe("Pagination", () => {
		it("caps limit at 100", async () => {
			const r2 = createMockR2();
			const event = createRouteEvent({
				r2,
				search: "?limit=500",
			});

			await listHandler(event as any);

			expect(r2.list).toHaveBeenCalledWith(
				expect.objectContaining({
					limit: 100,
				}),
			);
		});

		it("defaults limit to 50", async () => {
			const r2 = createMockR2();
			const event = createRouteEvent({ r2 });

			await listHandler(event as any);

			expect(r2.list).toHaveBeenCalledWith(
				expect.objectContaining({
					limit: 50,
				}),
			);
		});

		it("passes cursor for pagination", async () => {
			const r2 = createMockR2();
			const event = createRouteEvent({
				r2,
				search: "?cursor=abc123",
			});

			await listHandler(event as any);

			expect(r2.list).toHaveBeenCalledWith(
				expect.objectContaining({
					cursor: "abc123",
				}),
			);
		});

		it("returns truncated + cursor when more results exist", async () => {
			const r2 = createMockR2();
			r2.list = vi.fn(async () => ({
				objects: [
					{
						key: `${TENANT_ID}/photos/img.png`,
						size: 100,
						uploaded: new Date(),
					},
				],
				truncated: true,
				cursor: "next-page-cursor",
			}));

			const event = createRouteEvent({ r2 });

			const response = await listHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.truncated).toBe(true);
			expect(body.cursor).toBe("next-page-cursor");
		});
	});

	describe("Image Listing", () => {
		it("returns images with CDN URLs", async () => {
			const r2 = createMockR2();
			r2.list = vi.fn(async () => ({
				objects: [
					{
						key: `${TENANT_ID}/photos/2024/01/sunset.png`,
						size: 50000,
						uploaded: new Date("2024-01-15"),
					},
				],
				truncated: false,
				cursor: null,
			}));

			const event = createRouteEvent({ r2 });

			const response = await listHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.success).toBe(true);
			expect(body.images).toHaveLength(1);
			expect(body.images[0].url).toBe(
				`https://cdn.grove.place/${TENANT_ID}/photos/2024/01/sunset.png`,
			);
			expect(body.images[0].size).toBe(50000);
			expect(body.images[0].key).toBe(`${TENANT_ID}/photos/2024/01/sunset.png`);
		});

		it("returns empty array when no images", async () => {
			const r2 = createMockR2();
			const event = createRouteEvent({ r2 });

			const response = await listHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.images).toEqual([]);
			expect(body.truncated).toBe(false);
		});
	});

	describe("Filtering", () => {
		function createR2WithImages() {
			const r2 = createMockR2();
			r2.list = vi.fn(async () => ({
				objects: [
					{
						key: `${TENANT_ID}/photos/sunset.png`,
						size: 100,
						uploaded: new Date("2024-01-01"),
					},
					{
						key: `${TENANT_ID}/photos/mountain.png`,
						size: 200,
						uploaded: new Date("2024-06-15"),
					},
					{
						key: `${TENANT_ID}/photos/river.png`,
						size: 50,
						uploaded: new Date("2023-12-01"),
					},
				],
				truncated: false,
				cursor: null,
			}));
			return r2;
		}

		it("filters by search query (matches key)", async () => {
			const r2 = createR2WithImages();
			const event = createRouteEvent({
				r2,
				search: "?search=sunset",
			});

			const response = await listHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.images).toHaveLength(1);
			expect(body.images[0].key).toContain("sunset");
		});

		it("search is case-insensitive", async () => {
			const r2 = createR2WithImages();
			const event = createRouteEvent({
				r2,
				search: "?search=MOUNTAIN",
			});

			const response = await listHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.images).toHaveLength(1);
			expect(body.images[0].key).toContain("mountain");
		});
	});

	describe("Sorting", () => {
		function createR2WithSortableImages() {
			const r2 = createMockR2();
			r2.list = vi.fn(async () => ({
				objects: [
					{
						key: `${TENANT_ID}/photos/b-image.png`,
						size: 200,
						uploaded: new Date("2024-06-01"),
					},
					{
						key: `${TENANT_ID}/photos/a-image.png`,
						size: 100,
						uploaded: new Date("2024-01-01"),
					},
					{
						key: `${TENANT_ID}/photos/c-image.png`,
						size: 300,
						uploaded: new Date("2024-03-01"),
					},
				],
				truncated: false,
				cursor: null,
			}));
			return r2;
		}

		it("sorts by name ascending", async () => {
			const r2 = createR2WithSortableImages();
			const event = createRouteEvent({
				r2,
				search: "?sortBy=name-asc",
			});

			const response = await listHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.images[0].key).toContain("a-image");
			expect(body.images[2].key).toContain("c-image");
		});

		it("sorts by size descending", async () => {
			const r2 = createR2WithSortableImages();
			const event = createRouteEvent({
				r2,
				search: "?sortBy=size-desc",
			});

			const response = await listHandler(event as any);
			const body = (await response.json()) as any;

			expect(body.images[0].size).toBe(300);
			expect(body.images[2].size).toBe(100);
		});

		it("defaults to date-desc", async () => {
			const r2 = createR2WithSortableImages();
			const event = createRouteEvent({ r2 });

			const response = await listHandler(event as any);
			const body = (await response.json()) as any;

			// Most recent first
			expect(body.images[0].key).toContain("b-image"); // June
			expect(body.images[2].key).toContain("a-image"); // January
		});
	});

	describe("D1 Metadata Graceful Degradation", () => {
		it("returns images even when D1 metadata query fails", async () => {
			const r2 = createMockR2();
			r2.list = vi.fn(async () => ({
				objects: [
					{
						key: `${TENANT_ID}/photos/test.png`,
						size: 100,
						uploaded: new Date(),
					},
				],
				truncated: false,
				cursor: null,
			}));

			const db = createMockDB();
			// Make D1 metadata query throw
			db.prepare = vi.fn(() => ({
				bind: vi.fn(function () {
					return {
						all: vi.fn(async () => {
							throw new Error("D1 unavailable");
						}),
					};
				}),
			}));

			const event = createRouteEvent({ r2, db });

			const response = await listHandler(event as any);
			const body = (await response.json()) as any;

			// Should still return images from R2
			expect(body.success).toBe(true);
			expect(body.images).toHaveLength(1);
			expect(body.images[0].custom_title).toBeNull();
			expect(body.images[0].tags).toEqual([]);
		});
	});

	describe("Environment", () => {
		it("rejects when R2 not configured → 500", async () => {
			const event = createRouteEvent({});
			event.platform.env.IMAGES = undefined as any;

			try {
				await listHandler(event as any);
				expect.unreachable("should throw");
			} catch (e: any) {
				expect(e.status).toBe(500);
			}
		});
	});
});
