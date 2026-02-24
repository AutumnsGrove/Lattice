import { json, error } from "@sveltejs/kit";
import { sanitizeObject } from "$lib/utils/validation.js";
import { renderMarkdown } from "$lib/utils/markdown.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import type { RequestHandler } from "./$types.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";

/** System pages that cannot be deleted */
const PROTECTED_SLUGS = ["home", "about"];

/** Allowed font values — must match the dropdown in the page editor */
const ALLOWED_FONTS = new Set([
	"default",
	"lexend",
	"atkinson",
	"opendyslexic",
	"luciole",
	"nunito",
	"quicksand",
	"manrope",
	"instrument-sans",
	"plus-jakarta-sans",
	"cormorant",
	"bodoni-moda",
	"lora",
	"eb-garamond",
	"merriweather",
	"fraunces",
	"ibm-plex-mono",
	"cozette",
	"alagard",
	"calistoga",
	"caveat",
]);

interface PageInput {
	title?: string;
	markdown_content?: string;
	description?: string;
	hero?: string;
	font?: string;
	show_in_nav?: boolean;
}

interface PagePatchInput {
	show_in_nav?: boolean;
	nav_order?: number;
}

/**
 * PUT /api/pages/[slug] - Update an existing page in D1
 */
export const PUT: RequestHandler = async ({ params, request, platform, locals }) => {
	// Auth check
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	// Tenant check
	if (!locals.tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	if (!platform?.env?.DB) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	const { slug } = params;

	if (!slug) {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	try {
		// Verify the authenticated user owns this tenant
		const tenantId = await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user);

		const data = sanitizeObject(await request.json()) as PageInput;

		// Validate required fields
		if (!data.title || !data.markdown_content) {
			throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
		}

		// Validation constants
		const MAX_TITLE_LENGTH = 200;
		const MAX_DESCRIPTION_LENGTH = 500;
		const MAX_MARKDOWN_LENGTH = 1024 * 1024; // 1MB

		// Validate lengths
		if (data.title.length > MAX_TITLE_LENGTH) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		if (data.description && data.description.length > MAX_DESCRIPTION_LENGTH) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		if (data.markdown_content.length > MAX_MARKDOWN_LENGTH) {
			throwGroveError(413, API_ERRORS.CONTENT_TOO_LARGE, "API");
		}

		// Check if page exists and belongs to tenant (fetch show_in_nav to preserve when omitted)
		const existing = await platform.env.DB.prepare(
			"SELECT slug, show_in_nav FROM pages WHERE slug = ? AND tenant_id = ?",
		)
			.bind(slug, tenantId)
			.first<{ slug: string; show_in_nav: number | null }>();

		if (!existing) {
			throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
		}

		// Generate HTML from markdown (renderMarkdown handles sanitization)
		const html_content = renderMarkdown(data.markdown_content);

		const now = new Date().toISOString();

		// Build the update query
		const updateQuery = `UPDATE pages
       SET title = ?, description = ?, markdown_content = ?, html_content = ?, hero = ?, font = ?, show_in_nav = ?, updated_at = ?
       WHERE slug = ? AND tenant_id = ?`;

		const queryParams = [
			data.title,
			data.description || "",
			data.markdown_content,
			html_content,
			data.hero || null,
			data.font && ALLOWED_FONTS.has(data.font) ? data.font : "default",
			typeof data.show_in_nav === "boolean"
				? data.show_in_nav
					? 1
					: 0
				: (existing.show_in_nav ?? 0),
			now,
			slug,
			tenantId,
		];

		await platform.env.DB.prepare(updateQuery)
			.bind(...queryParams)
			.run();

		return json({
			success: true,
			slug,
			message: "Page updated successfully",
		});
	} catch (err) {
		if ((err as { status?: number }).status) throw err;
		console.error("Error updating page:", err);
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};

/**
 * PATCH /api/pages/[slug] - Quick update for specific fields (e.g., show_in_nav toggle)
 */
export const PATCH: RequestHandler = async ({ params, request, platform, locals }) => {
	// SECURITY: Example tenant bypass removed for launch (tracked in #1120)
	// const isExampleTenant = locals.tenantId === "example-tenant-001";

	// Auth check — all tenants require authentication
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	// Tenant check
	if (!locals.tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	if (!platform?.env?.DB) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	const { slug } = params;

	if (!slug) {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	try {
		// Verify tenant ownership (all tenants require auth now)
		const tenantId = await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user);

		const data = sanitizeObject(await request.json()) as PagePatchInput;

		// Check if page exists and belongs to tenant
		const existing = await platform.env.DB.prepare(
			"SELECT slug FROM pages WHERE slug = ? AND tenant_id = ?",
		)
			.bind(slug, tenantId)
			.first();

		if (!existing) {
			throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
		}

		// Build dynamic update based on provided fields
		const updates: string[] = [];
		const values: (string | number)[] = [];

		if (typeof data.show_in_nav === "boolean") {
			updates.push("show_in_nav = ?");
			values.push(data.show_in_nav ? 1 : 0);
		}

		if (typeof data.nav_order === "number") {
			updates.push("nav_order = ?");
			values.push(data.nav_order);
		}

		if (updates.length === 0) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		// Always update the timestamp
		updates.push("updated_at = unixepoch()");

		const updateQuery = `UPDATE pages SET ${updates.join(", ")} WHERE slug = ? AND tenant_id = ?`;
		values.push(slug, tenantId);

		await platform.env.DB.prepare(updateQuery)
			.bind(...values)
			.run();

		return json({
			success: true,
			slug,
			message: "Page updated successfully",
		});
	} catch (err) {
		if ((err as { status?: number }).status) throw err;
		console.error("Error patching page:", err);
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};

/**
 * DELETE /api/pages/[slug] - Delete a custom page from D1
 * Protected pages (home, about) cannot be deleted.
 */
export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	// Auth check
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	// Tenant check
	if (!locals.tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	if (!platform?.env?.DB) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	const { slug } = params;

	if (!slug) {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	// Prevent deletion of system pages
	if (PROTECTED_SLUGS.includes(slug)) {
		throwGroveError(403, API_ERRORS.OPERATION_FAILED, "API");
	}

	try {
		// Verify the authenticated user owns this tenant
		const tenantId = await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user);

		// Check if page exists and belongs to tenant
		const existing = await platform.env.DB.prepare(
			"SELECT slug FROM pages WHERE slug = ? AND tenant_id = ?",
		)
			.bind(slug, tenantId)
			.first();

		if (!existing) {
			throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
		}

		// Delete the page
		await platform.env.DB.prepare("DELETE FROM pages WHERE slug = ? AND tenant_id = ?")
			.bind(slug, tenantId)
			.run();

		return json({
			success: true,
			slug,
			message: "Page deleted successfully",
		});
	} catch (err) {
		if ((err as { status?: number }).status) throw err;
		console.error("Error deleting page:", err);
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};
