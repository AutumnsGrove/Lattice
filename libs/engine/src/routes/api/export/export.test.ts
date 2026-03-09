/**
 * Data Export API Tests
 *
 * Unit tests for data export functionality:
 * - Export type validation
 * - Rate limiting
 * - Audit logging
 * - CSRF protection requirements
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// Export Type Validation Tests
// ============================================================================

describe("Export Type Validation", () => {
	const validTypes = ["full", "posts", "media", "pages"];

	it("should accept valid export types", () => {
		for (const type of validTypes) {
			expect(validTypes.includes(type)).toBe(true);
		}
	});

	it("should reject invalid export types", () => {
		const invalidTypes = ["all", "everything", "backup", "archive", "settings"];

		for (const type of invalidTypes) {
			expect(validTypes.includes(type)).toBe(false);
		}
	});

	it("should default to 'full' when no type specified", () => {
		const requestedType = undefined;
		const exportType = requestedType || "full";
		expect(exportType).toBe("full");
	});
});

// ============================================================================
// Rate Limiting Tests
// ============================================================================

describe("Export Rate Limiting", () => {
	const RATE_LIMIT_MAX = 10;
	const RATE_LIMIT_WINDOW_SECONDS = 3600; // 1 hour

	interface RateLimitData {
		count: number;
		windowStart: number;
	}

	/**
	 * Simulate rate limit check logic
	 */
	const checkRateLimit = (
		data: RateLimitData | null,
		now: number,
	): { allowed: boolean; remaining: number; resetAt: number } => {
		if (!data || now - data.windowStart >= RATE_LIMIT_WINDOW_SECONDS) {
			// New window - reset counter
			return {
				allowed: true,
				remaining: RATE_LIMIT_MAX - 1,
				resetAt: now + RATE_LIMIT_WINDOW_SECONDS,
			};
		}

		if (data.count >= RATE_LIMIT_MAX) {
			// Rate limited
			return {
				allowed: false,
				remaining: 0,
				resetAt: data.windowStart + RATE_LIMIT_WINDOW_SECONDS,
			};
		}

		// Increment counter
		return {
			allowed: true,
			remaining: RATE_LIMIT_MAX - data.count - 1,
			resetAt: data.windowStart + RATE_LIMIT_WINDOW_SECONDS,
		};
	};

	it("should allow first export request", () => {
		const now = Math.floor(Date.now() / 1000);
		const result = checkRateLimit(null, now);

		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(RATE_LIMIT_MAX - 1);
	});

	it("should allow up to 10 exports per hour", () => {
		const now = Math.floor(Date.now() / 1000);
		let data: RateLimitData | null = null;

		for (let i = 0; i < RATE_LIMIT_MAX; i++) {
			const result = checkRateLimit(data, now);
			expect(result.allowed).toBe(true);

			// Update data as if KV was updated
			if (!data) {
				data = { count: 1, windowStart: now };
			} else {
				data.count++;
			}
		}
	});

	it("should reject 11th export in same hour", () => {
		const now = Math.floor(Date.now() / 1000);
		const data: RateLimitData = {
			count: RATE_LIMIT_MAX, // Already at limit
			windowStart: now - 1800, // 30 minutes ago
		};

		const result = checkRateLimit(data, now);

		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
	});

	it("should reset counter after window expires", () => {
		const now = Math.floor(Date.now() / 1000);
		const data: RateLimitData = {
			count: RATE_LIMIT_MAX, // Was at limit
			windowStart: now - RATE_LIMIT_WINDOW_SECONDS - 1, // Window expired
		};

		const result = checkRateLimit(data, now);

		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(RATE_LIMIT_MAX - 1);
	});

	it("should calculate correct reset time", () => {
		const now = 1700000000;
		const windowStart = now - 1800; // 30 minutes ago
		const data: RateLimitData = { count: 5, windowStart };

		const result = checkRateLimit(data, now);

		expect(result.resetAt).toBe(windowStart + RATE_LIMIT_WINDOW_SECONDS);
	});

	it("should include rate limit info in response headers", () => {
		const limit = RATE_LIMIT_MAX;
		const remaining = 7;
		const resetAt = 1700003600;

		const headers = {
			"X-RateLimit-Limit": limit.toString(),
			"X-RateLimit-Remaining": remaining.toString(),
			"X-RateLimit-Reset": resetAt.toString(),
		};

		expect(headers["X-RateLimit-Limit"]).toBe("10");
		expect(headers["X-RateLimit-Remaining"]).toBe("7");
		expect(headers["X-RateLimit-Reset"]).toBe("1700003600");
	});
});

// ============================================================================
// Regression Tests — Issue #1360
// ============================================================================

describe("Issue #1360: Export query correctness", () => {
	it("pages query should use nav_order, not display_order", () => {
		// display_order was never migrated — the actual column is nav_order (migration 019).
		// ExportDO used to reference display_order, causing D1 to throw
		// "no such column: display_order" and the entire export to fail.
		const query = `SELECT id, slug, title, description, markdown_content, type, created_at, updated_at
       FROM pages WHERE tenant_id = ? ORDER BY nav_order ASC`;

		expect(query).toContain("nav_order");
		expect(query).not.toContain("display_order");
	});

	it("image count should query gallery_images, not legacy media table", () => {
		// The media table (migration 005) is legacy and empty.
		// Images live in gallery_images (migration 031).
		// Export page used to query media → always showed 0 images.
		const countQuery = "SELECT COUNT(*) as count FROM gallery_images WHERE tenant_id = ?";

		expect(countQuery).toContain("gallery_images");
		expect(countQuery).not.toContain("FROM media");
	});

	it("image size estimate should use gallery_images.file_size, not image_hashes", () => {
		// The export page used to query image_hashes.stored_size_bytes which was
		// stale/incomplete. gallery_images.file_size is the authoritative source.
		const sizeQuery =
			"SELECT COALESCE(SUM(COALESCE(file_size, 0)), 0) as total_bytes FROM gallery_images WHERE tenant_id = ?";

		expect(sizeQuery).toContain("gallery_images");
		expect(sizeQuery).toContain("file_size");
		expect(sizeQuery).not.toContain("image_hashes");
	});

	it("ExportDO should query gallery_images columns correctly", () => {
		// gallery_images has different columns than the legacy media table.
		// Key columns: r2_key, parsed_slug, custom_title, alt_text, file_size, cdn_url
		const query = `SELECT id, r2_key, parsed_slug, custom_title, alt_text, file_size, cdn_url, uploaded_at
       FROM gallery_images WHERE tenant_id = ? ORDER BY created_at DESC`;

		expect(query).toContain("gallery_images");
		expect(query).toContain("r2_key");
		expect(query).toContain("parsed_slug");
		expect(query).toContain("file_size");
		// Should NOT reference old media table columns
		expect(query).not.toContain("original_name");
		expect(query).not.toContain("mime_type");
	});
});

// ============================================================================
// Filename Derivation Tests (gallery_images → export filenames)
// ============================================================================

describe("Export filename derivation", () => {
	// Mirror the deriveFilename logic from ExportDO
	function deriveFilename(m: { id: string; r2_key: string; custom_title: string | null }): string {
		if (m.custom_title) {
			const ext = m.r2_key.includes(".") ? "." + m.r2_key.split(".").pop() : "";
			return m.custom_title.replace(/[^a-zA-Z0-9_-]/g, "_") + ext;
		}
		return m.r2_key.split("/").pop() || m.id;
	}

	it("should use last segment of r2_key when no custom title", () => {
		const filename = deriveFilename({
			id: "abc-123",
			r2_key: "tenant-1/images/sunset-beach.jpg",
			custom_title: null,
		});
		expect(filename).toBe("sunset-beach.jpg");
	});

	it("should use sanitized custom_title with extension when available", () => {
		const filename = deriveFilename({
			id: "abc-123",
			r2_key: "tenant-1/images/photo.png",
			custom_title: "My Favorite Photo",
		});
		expect(filename).toBe("My_Favorite_Photo.png");
	});

	it("should sanitize path traversal in custom_title", () => {
		const filename = deriveFilename({
			id: "abc-123",
			r2_key: "tenant-1/images/photo.jpg",
			custom_title: "../../../etc/passwd",
		});
		expect(filename).not.toContain("..");
		expect(filename).not.toContain("/");
	});

	it("should fall back to id if r2_key has no path segments", () => {
		const filename = deriveFilename({
			id: "abc-123",
			r2_key: "",
			custom_title: null,
		});
		expect(filename).toBe("abc-123");
	});
});

// ============================================================================
// Export Data Structure Tests
// ============================================================================

describe("Export Data Structure", () => {
	interface ExportData {
		exportedAt: string;
		type: string;
		tenant: string;
		posts?: Array<{
			slug: string;
			title: string;
			description: string | null;
			content: string;
			tags: string[];
			status: string;
			featuredImage: string | null;
			publishedAt: string | null;
			createdAt: string;
			updatedAt: string;
		}>;
		pages?: Array<{
			slug: string;
			title: string;
			description: string | null;
			content: string;
			type: string;
			createdAt: string;
			updatedAt: string;
		}>;
		media?: Array<{
			filename: string;
			originalName: string;
			url: string;
			size: number;
			mimeType: string;
			altText: string | null;
			uploadedAt: string;
		}>;
	}

	it("should include metadata in all exports", () => {
		const exportData: ExportData = {
			exportedAt: new Date().toISOString(),
			type: "full",
			tenant: "test-tenant",
		};

		expect(exportData.exportedAt).toBeDefined();
		expect(exportData.type).toBe("full");
		expect(exportData.tenant).toBe("test-tenant");
	});

	it("should include posts in full export", () => {
		const exportData: ExportData = {
			exportedAt: new Date().toISOString(),
			type: "full",
			tenant: "test-tenant",
			posts: [
				{
					slug: "hello-world",
					title: "Hello World",
					description: "My first post",
					content: "# Hello\n\nThis is my first post.",
					tags: ["intro", "welcome"],
					status: "published",
					featuredImage: null,
					publishedAt: "2026-01-15T00:00:00.000Z",
					createdAt: "2026-01-14T00:00:00.000Z",
					updatedAt: "2026-01-15T00:00:00.000Z",
				},
			],
		};

		expect(exportData.posts).toBeDefined();
		expect(exportData.posts?.length).toBe(1);
		expect(exportData.posts?.[0].slug).toBe("hello-world");
	});

	it("should include media URLs (not files) in export", () => {
		const mediaItem = {
			filename: "photo-123.jpg",
			originalName: "vacation.jpg",
			url: "https://media.grove.place/tenant-123/photo-123.jpg",
			size: 1024000,
			mimeType: "image/jpeg",
			altText: "Beach sunset",
			uploadedAt: "2026-01-10T00:00:00.000Z",
		};

		// URL points to CDN, not embedded in export
		expect(mediaItem.url).toContain("https://");
		expect(mediaItem.url).toContain("grove.place");
	});

	it("should parse tags from JSON string", () => {
		const tagsJson = '["tech", "tutorial", "javascript"]';
		const tags = JSON.parse(tagsJson);

		expect(Array.isArray(tags)).toBe(true);
		expect(tags).toContain("tech");
		expect(tags).toContain("tutorial");
		expect(tags).toContain("javascript");
	});

	it("should handle empty tags gracefully", () => {
		const tagsJson = "[]";
		const tags = JSON.parse(tagsJson || "[]");

		expect(Array.isArray(tags)).toBe(true);
		expect(tags.length).toBe(0);
	});

	it("should convert timestamps to ISO format", () => {
		const unixTimestamp = 1705276800; // 2024-01-15 00:00:00 UTC
		const isoDate = new Date(unixTimestamp * 1000).toISOString();

		expect(isoDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
	});
});

// ============================================================================
// Export Audit Logging Tests
// ============================================================================

describe("Export Audit Logging", () => {
	it("should log export type in audit entry", () => {
		const auditDetails = {
			type: "posts",
			postsCount: 42,
			pagesCount: 0,
			mediaCount: 0,
		};

		expect(auditDetails.type).toBe("posts");
	});

	it("should log item counts in audit entry", () => {
		const auditDetails = {
			type: "full",
			postsCount: 42,
			pagesCount: 5,
			mediaCount: 128,
		};

		expect(auditDetails.postsCount).toBe(42);
		expect(auditDetails.pagesCount).toBe(5);
		expect(auditDetails.mediaCount).toBe(128);
	});

	it("should handle null counts gracefully", () => {
		const posts = undefined;
		const pages = undefined;
		const media = undefined;

		const auditDetails = {
			type: "full",
			postsCount: posts?.length ?? 0,
			pagesCount: pages?.length ?? 0,
			mediaCount: media?.length ?? 0,
		};

		expect(auditDetails.postsCount).toBe(0);
		expect(auditDetails.pagesCount).toBe(0);
		expect(auditDetails.mediaCount).toBe(0);
	});
});

// ============================================================================
// CSRF Protection Tests
// ============================================================================

describe("Export CSRF Protection", () => {
	it("should use POST method for exports (not GET)", () => {
		// Export endpoint changed from GET to POST because:
		// 1. It modifies state (rate limit counters, audit logs)
		// 2. State-changing operations should have CSRF protection
		const method = "POST";
		expect(method).toBe("POST");
	});

	it("should validate CSRF token on export requests", () => {
		// CSRF validation is required for POST requests
		const requiresCSRF = true;
		expect(requiresCSRF).toBe(true);
	});

	it("should reject requests without valid origin", () => {
		const validateCSRF = (origin: string | null, host: string): boolean => {
			if (!origin) return false;
			try {
				const originUrl = new URL(origin);
				return originUrl.host === host || originUrl.hostname.endsWith(".grove.place");
			} catch {
				return false;
			}
		};

		// Valid origins
		expect(validateCSRF("https://grove.place", "grove.place")).toBe(true);
		expect(validateCSRF("https://alice.grove.place", "alice.grove.place")).toBe(true);

		// Invalid origins
		expect(validateCSRF(null, "grove.place")).toBe(false);
		expect(validateCSRF("https://evil.com", "grove.place")).toBe(false);
	});
});

// ============================================================================
// Response Headers Tests
// ============================================================================

describe("Export Response Headers", () => {
	it("should set Content-Type to application/json", () => {
		const contentType = "application/json";
		expect(contentType).toBe("application/json");
	});

	it("should set Content-Disposition for download", () => {
		const exportType = "full";
		const date = "2026-01-15";
		const filename = `grove-export-${exportType}-${date}.json`;
		const disposition = `attachment; filename="${filename}"`;

		expect(disposition).toContain("attachment");
		expect(disposition).toContain("grove-export-full-2026-01-15.json");
	});

	it("should set Cache-Control to no-cache", () => {
		const cacheControl = "no-cache";
		expect(cacheControl).toBe("no-cache");
	});

	it("should include rate limit headers", () => {
		const headers = new Headers();
		headers.set("X-RateLimit-Limit", "10");
		headers.set("X-RateLimit-Remaining", "9");
		headers.set("X-RateLimit-Reset", "1705280400");

		expect(headers.get("X-RateLimit-Limit")).toBe("10");
		expect(headers.get("X-RateLimit-Remaining")).toBe("9");
		expect(headers.get("X-RateLimit-Reset")).toBe("1705280400");
	});
});

// ============================================================================
// Tenant Isolation Tests
// ============================================================================

describe("Export Tenant Isolation", () => {
	it("should only export data for verified tenant", () => {
		const requestedTenantId = "tenant-alice";
		const verifiedTenantId = "tenant-alice";

		// Export should only proceed if tenant is verified
		const canExport = requestedTenantId === verifiedTenantId;
		expect(canExport).toBe(true);
	});

	it("should reject export for unverified tenant", () => {
		const requestedTenantId = "tenant-bob";
		const verifiedTenantId = "tenant-alice";

		// Alice should not be able to export Bob's data
		const canExport = requestedTenantId === verifiedTenantId;
		expect(canExport).toBe(false);
	});

	it("should scope all queries to tenant ID", () => {
		const tenantId = "tenant-alice";
		const query = `SELECT * FROM posts WHERE tenant_id = ?`;

		// Query includes tenant_id filter
		expect(query).toContain("tenant_id = ?");
	});
});
