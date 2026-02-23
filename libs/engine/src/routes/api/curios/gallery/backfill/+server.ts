/**
 * Gallery Backfill API
 *
 * Generates thumbnails + dominant colors for existing gallery images.
 * GET: Returns images missing thumbnail data (for client-side processing).
 * POST: Accepts a processed thumbnail + metadata for a single image.
 *
 * All image processing happens client-side (browser Canvas API) — the server
 * just stores the results. This keeps costs at zero (no CF Image Resizing needed).
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";

interface BackfillRow {
	id: string;
	r2_key: string;
	cdn_url: string | null;
}

/**
 * GET /api/curios/gallery/backfill
 *
 * Returns gallery images that are missing thumbnails, dominant colors, or dimensions.
 * The admin page uses this list to process each image client-side.
 */
export const GET: RequestHandler = async ({ url, platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	if (!db || !tenantId) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
	const cdnBaseUrl = (platform?.env?.CDN_BASE_URL as string) || "https://cdn.grove.place";

	const result = await db
		.prepare(
			`SELECT id, r2_key, cdn_url
			FROM gallery_images
			WHERE tenant_id = ?
				AND (thumbnail_r2_key IS NULL OR dominant_color IS NULL)
			ORDER BY uploaded_at DESC
			LIMIT ?`,
		)
		.bind(tenantId, limit)
		.all<BackfillRow>();

	// Count total remaining
	const countResult = await db
		.prepare(
			`SELECT COUNT(*) as total
			FROM gallery_images
			WHERE tenant_id = ?
				AND (thumbnail_r2_key IS NULL OR dominant_color IS NULL)`,
		)
		.bind(tenantId)
		.first<{ total: number }>();

	const images = (result.results ?? []).map((row) => ({
		id: row.id,
		url: row.cdn_url || `${cdnBaseUrl}/${row.r2_key}`,
	}));

	return json({
		images,
		remaining: countResult?.total ?? 0,
	});
};

/**
 * POST /api/curios/gallery/backfill
 *
 * Accepts a thumbnail + metadata for a single image and stores it.
 * FormData fields:
 *   - imageId (string, required)
 *   - thumbnail (File, required) — 400px WebP thumbnail blob
 *   - dominantColor (string, required) — hex color like "#3a5c2f"
 *   - width (string → int) — original image width
 *   - height (string → int) — original image height
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const images = platform?.env?.IMAGES as R2Bucket | undefined;
	const tenantId = locals.tenantId;

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	if (!db || !tenantId) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!images) {
		throwGroveError(500, API_ERRORS.R2_NOT_CONFIGURED, "API");
	}

	const formData = await request.formData();
	const imageId = formData.get("imageId") as string | null;
	const thumbnail = formData.get("thumbnail") as File | null;
	const dominantColor = formData.get("dominantColor") as string | null;
	const widthStr = formData.get("width") as string | null;
	const heightStr = formData.get("height") as string | null;

	if (!imageId) {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	// Verify the image belongs to this tenant
	const row = await db
		.prepare(`SELECT r2_key FROM gallery_images WHERE id = ? AND tenant_id = ?`)
		.bind(imageId, tenantId)
		.first<{ r2_key: string }>();

	if (!row) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
	}

	const cdnBaseUrl = (platform?.env?.CDN_BASE_URL as string) || "https://cdn.grove.place";
	let thumbnailR2Key: string | null = null;

	// Upload thumbnail to R2
	if (thumbnail && thumbnail instanceof File && thumbnail.size > 0) {
		// Derive thumb key from original r2_key
		// Original: tenantId/photos/2026/02/23/filename.webp
		// Thumb:    tenantId/thumbs/photos/2026/02/23/filename-thumb.webp
		const originalKey = row.r2_key;
		const keyWithoutTenant = originalKey.startsWith(`${tenantId}/`)
			? originalKey.slice(tenantId.length + 1)
			: originalKey;
		const baseName = keyWithoutTenant.replace(/\.[^.]+$/, "");
		thumbnailR2Key = `${tenantId}/thumbs/${baseName}-thumb.webp`;

		try {
			const thumbBuffer = await thumbnail.arrayBuffer();
			await images.put(thumbnailR2Key, thumbBuffer, {
				httpMetadata: {
					contentType: "image/webp",
					cacheControl: "public, max-age=31536000, immutable",
				},
			});
		} catch (err) {
			logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
			thumbnailR2Key = null;
		}
	}

	// Parse dimensions
	const width = widthStr ? parseInt(widthStr, 10) : null;
	const height = heightStr ? parseInt(heightStr, 10) : null;
	const aspectRatio = width && height && height > 0 ? width / height : null;

	// Update the gallery_images row
	await db
		.prepare(
			`UPDATE gallery_images SET
				thumbnail_r2_key = COALESCE(?, thumbnail_r2_key),
				dominant_color = COALESCE(?, dominant_color),
				width = COALESCE(?, width),
				height = COALESCE(?, height),
				aspect_ratio = COALESCE(?, aspect_ratio),
				updated_at = strftime('%s', 'now')
			WHERE id = ? AND tenant_id = ?`,
		)
		.bind(thumbnailR2Key, dominantColor, width, height, aspectRatio, imageId, tenantId)
		.run();

	return json({
		success: true,
		imageId,
		thumbnailUrl: thumbnailR2Key ? `${cdnBaseUrl}/${thumbnailR2Key}` : null,
		dominantColor,
	});
};
