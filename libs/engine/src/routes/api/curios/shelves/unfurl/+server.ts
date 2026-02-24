/**
 * Shelves Unfurl API — OG Metadata Extraction
 *
 * POST /api/curios/shelves/unfurl — Fetches Open Graph metadata for a URL
 * Used by the admin shelf form to auto-populate title, description, and cover image
 * when a user enters a URL and tabs out of the field.
 *
 * Admin-only, rate-limited (30 req/60s per IP).
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { fetchOGMetadata } from "$lib/server/services/og-fetcher.js";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
import { getClientIP } from "$lib/threshold/adapters/worker.js";
import { API_ERRORS, buildErrorJson } from "$lib/errors";
import { isValidUrl } from "$lib/curios/shelves";

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	// Auth gate — admin only
	if (!locals.user) {
		return json(buildErrorJson(API_ERRORS.UNAUTHORIZED), { status: 401 });
	}

	// Rate limiting: 30 requests per 60 seconds per IP
	const threshold = createThreshold(platform?.env);
	if (threshold) {
		const clientIp = getClientIP(request);
		const denied = await thresholdCheck(threshold, {
			key: `unfurl:${clientIp}`,
			limit: 30,
			windowSeconds: 60,
		});
		if (denied) return denied;
	}

	// Parse and validate request body
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json(buildErrorJson(API_ERRORS.INVALID_REQUEST_BODY), { status: 400 });
	}

	const url = typeof body.url === "string" ? body.url.trim() : "";
	if (!url || !isValidUrl(url)) {
		return json(buildErrorJson(API_ERRORS.VALIDATION_FAILED), { status: 400 });
	}

	// Fetch OG metadata (with KV caching)
	const result = await fetchOGMetadata(url, {
		kv: platform?.env?.CACHE_KV,
		timeout: 5000,
		cacheTtl: 3600,
	});

	if (!result.success || !result.data) {
		return json({ success: false, error: result.error ?? "Failed to fetch metadata" });
	}

	return json({
		success: true,
		data: {
			title: result.data.title ?? null,
			description: result.data.description ?? null,
			image: result.data.image ?? null,
			favicon: result.data.favicon ?? null,
			domain: result.data.domain ?? null,
			siteName: result.data.siteName ?? null,
		},
	});
};
