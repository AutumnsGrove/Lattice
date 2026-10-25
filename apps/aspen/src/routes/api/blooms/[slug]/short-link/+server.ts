import { json, type RequestHandler } from "@sveltejs/kit";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import { getOrCreatePostLink } from "@autumnsgrove/lattice/services/short-links";
import { requireGroveLinkAccess } from "$lib/server/short-links";

/**
 * POST /api/blooms/[slug]/short-link - Get a bloom's short link
 *
 * Owner only. A bloom has exactly one short link for as long as it exists:
 * the first call creates it, every later call returns the same one.
 *
 * Returns: { slug, shortUrl }
 */
export const POST: RequestHandler = async ({ params, platform, locals }) => {
	const access = await requireGroveLinkAccess(platform, locals);
	if (!access.ok) {
		throwGroveError(access.status, API_ERRORS.UNAUTHORIZED, "API");
	}
	if (access.owner.type !== "grove") {
		throwGroveError(403, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	const { slug } = params;
	if (!slug) throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");

	const post = await access.db
		.prepare(`SELECT id FROM posts WHERE tenant_id = ? AND slug = ?`)
		.bind(access.owner.tenantId, slug)
		.first<{ id: string }>();
	if (!post) throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");

	const link = await getOrCreatePostLink(access.db, {
		tenantId: access.owner.tenantId,
		postId: post.id,
	});
	if (!link.ok)
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { detail: link.error.code });

	return json(link.value);
};
