/**
 * Chat Image Upload API — Upload images for DM messages
 *
 * POST — Upload an image to R2, return CDN URL for embedding in messages
 *
 * Images are stored under a chat-specific R2 prefix for easy
 * lifecycle management and tenant isolation.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, buildErrorJson, logGroveError, throwGroveError } from "$lib/errors";
import { isRedirect, isHttpError } from "$lib/server/utils/type-guards.js";
import { getUserHomeGrove } from "$lib/server/services/users.js";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
import {
	isAllowedImageType,
	ALLOWED_TYPES_DISPLAY,
	validateFileSignature,
	type AllowedImageType,
} from "$lib/utils/upload-validation.js";

/** Maximum file size for chat images (5MB — smaller than blog uploads). */
const MAX_CHAT_IMAGE_SIZE = 5 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	const db = platform?.env?.DB;
	const images = platform?.env?.IMAGES;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!images) {
		throwGroveError(500, API_ERRORS.R2_NOT_CONFIGURED, "API");
	}

	const homeGrove = await getUserHomeGrove(db, locals.user.email);
	if (!homeGrove) {
		throwGroveError(403, API_ERRORS.FORBIDDEN, "API");
	}

	// Rate limit: 20 chat image uploads per hour
	const threshold = createThreshold(platform?.env, { identifier: locals.user.id });
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: `chat/image:${locals.user.id}`,
			limit: 20,
			windowSeconds: 3600,
			failMode: "open",
		});
		if (denied) return denied;
	}

	try {
		const formData = await request.formData();
		const file = formData.get("file");

		if (!file || !(file instanceof File)) {
			throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
		}

		if (!isAllowedImageType(file.type)) {
			throwGroveError(400, API_ERRORS.INVALID_FILE, "API");
		}

		if (file.size > MAX_CHAT_IMAGE_SIZE) {
			throwGroveError(400, API_ERRORS.CONTENT_TOO_LARGE, "API");
		}

		const arrayBuffer = await file.arrayBuffer();
		const buffer = new Uint8Array(arrayBuffer);

		// Validate magic bytes
		if (!validateFileSignature(buffer, file.type as AllowedImageType)) {
			throwGroveError(400, API_ERRORS.INVALID_FILE, "API");
		}

		// Build R2 key under chat-specific prefix
		// Use server-generated filename to prevent path traversal via crafted file.name
		const tenantId = homeGrove.tenantId;
		const timestamp = Date.now().toString(36);
		const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "webp";
		// Allowlist extensions to prevent arbitrary path components
		const SAFE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "jxl"]);
		const ext = SAFE_EXTENSIONS.has(rawExt) ? rawExt : "webp";
		const filename = `chat-${timestamp}.${ext}`;
		const key = `${tenantId}/chat/${filename}`;

		await images.put(key, arrayBuffer, {
			httpMetadata: {
				contentType: file.type,
				cacheControl: "public, max-age=31536000, immutable",
			},
		});

		const cdnBaseUrl = (platform?.env?.CDN_BASE_URL as string) || "https://cdn.grove.place";
		const url = `${cdnBaseUrl}/${key}`;

		return json({
			success: true,
			url,
			key,
			width: null, // Client should provide dimensions
			height: null,
		});
	} catch (err) {
		if (isRedirect(err)) throw err;
		if (isHttpError(err)) throw err;

		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Chat image upload failed",
			cause: err,
		});
		return json(buildErrorJson(API_ERRORS.OPERATION_FAILED), { status: 500 });
	}
};
