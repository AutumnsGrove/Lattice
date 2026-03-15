/**
 * GET /human.json — Serve the human.json file for this tenant
 *
 * Implements the human.json protocol (https://codeberg.org/robida/human.json)
 * which allows site owners to assert human authorship and vouch for
 * other trusted sites.
 *
 * Only serves when the tenant has enabled human.json in their settings.
 * Includes CORS header as required by the spec for browser-based verification.
 */
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const prerender = false;

interface VouchRow {
	url: string;
	vouched_at: string;
}

export const GET: RequestHandler = async ({ platform, locals }) => {
	const db = platform?.env?.DB;

	if (!db || !locals.tenantId) {
		throw error(404, "Not found");
	}

	const context = locals.context;
	if (context?.type !== "tenant") {
		throw error(404, "Not found");
	}

	// Check if human.json is enabled for this tenant
	const enabledRow = await db
		.prepare(
			"SELECT setting_value FROM site_settings WHERE tenant_id = ? AND setting_key = 'human_json_enabled'",
		)
		.bind(locals.tenantId)
		.first<{ setting_value: string }>();

	if (!enabledRow || enabledRow.setting_value !== "true") {
		throw error(404, "Not found");
	}

	// Build the canonical URL for this tenant
	const tenantUrl = `https://${context.tenant.subdomain}.grove.place`;

	// Fetch vouches
	const vouchResult = await db
		.prepare(
			"SELECT url, vouched_at FROM human_json_vouches WHERE tenant_id = ? ORDER BY created_at ASC",
		)
		.bind(locals.tenantId)
		.all<VouchRow>();

	const vouches = (vouchResult.results ?? []).map((v) => ({
		url: v.url,
		vouched_at: v.vouched_at,
	}));

	const humanJson: Record<string, unknown> = {
		version: "0.1.1",
		url: tenantUrl,
	};

	if (vouches.length > 0) {
		humanJson.vouches = vouches;
	}

	return json(humanJson, {
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Cache-Control": "public, max-age=3600, s-maxage=3600",
		},
	});
};
