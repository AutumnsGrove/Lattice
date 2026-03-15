import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { building } from "$app/environment";
import { getSeasonFavicons, resolveSeasonPreference } from "@autumnsgrove/lattice/ui/season-meta";
import { DEFAULT_SEASON, type Season } from "@autumnsgrove/lattice/ui/types/season";

/**
 * Dynamic PWA manifest — serves season-aware icon paths based on tenant's
 * preferred_season setting. Falls back to the global default (summer).
 *
 * Replaces the static site.webmanifest file. (#1304)
 */
export const GET: RequestHandler = async ({ platform, locals }) => {
	let season: Season = DEFAULT_SEASON;

	// Read tenant's preferred season from site_settings (if available)
	if (!building) {
		const db = platform?.env?.DB;
		if (db && locals.tenantId) {
			const row = await db
				.prepare(
					"SELECT setting_value FROM site_settings WHERE tenant_id = ? AND setting_key = 'preferred_season'",
				)
				.bind(locals.tenantId)
				.first<{ setting_value: string }>()
				.catch(() => null);

			const resolved = resolveSeasonPreference(row?.setting_value);
			if (resolved) season = resolved;
		}
	}

	const favicons = getSeasonFavicons(season);

	const manifest = {
		name: "Grove",
		short_name: "Grove",
		description: "Grove: a place to Be",
		start_url: "/",
		display: "standalone",
		background_color: "#0f172a",
		theme_color: favicons.themeColor,
		icons: [
			{
				src: favicons.icon192,
				sizes: "192x192",
				type: "image/png",
				purpose: "any",
			},
			{
				src: favicons.icon512,
				sizes: "512x512",
				type: "image/png",
				purpose: "any",
			},
		],
	};

	return new Response(JSON.stringify(manifest, null, 2), {
		headers: {
			"Content-Type": "application/manifest+json",
			// Cache for 1 hour — balance between freshness and performance.
			// When a tenant changes their season, the new manifest appears within an hour.
			// iOS re-reads the manifest only on "Add to Home Screen" anyway.
			"Cache-Control": "public, max-age=3600",
		},
	});
};
