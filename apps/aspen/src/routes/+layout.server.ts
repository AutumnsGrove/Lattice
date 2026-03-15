import type { LayoutServerLoad } from "./$types";
import type { AppContext } from "../app.d.ts";
import { building } from "$app/environment";
import { getNavPageLimit } from "@autumnsgrove/lattice/server/tier-features";
import { canUploadImages } from "@autumnsgrove/lattice/server/upload-gate";
import { emailsMatch } from "@autumnsgrove/lattice/utils/user";
import { isFeatureEnabled, isInGreenhouse } from "@autumnsgrove/lattice/feature-flags";
import { getUserHomeGrove } from "@autumnsgrove/lattice/server/services/users";
import type { HomeGrove } from "@autumnsgrove/lattice/server/services/users";
import { resolveSeasonPreference } from "@autumnsgrove/lattice/ui/season-meta";

interface SiteSettings {
	font_family: string;
	accent_color?: string;
	grove_title?: string;
	[key: string]: string | undefined;
}

interface NavPage {
	slug: string;
	title: string;
}

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	// Default site settings
	const siteSettings: SiteSettings = { font_family: "lexend" };
	// Navigation pages (pages with show_in_nav enabled)
	let navPages: NavPage[] = [];
	// Count of enabled curios (for pages admin UI - curios share the nav page limit)
	let enabledCuriosCount = 0;
	// Curio enable flags (for mobile nav - need to be accessible outside the query block)
	// These are hoisted here so they're accessible in the return statement after Promise.all
	let timelineEnabled = false;
	let galleryEnabled = false;
	let lanternEnabled = false;
	let homeGrove: HomeGrove | null = null;

	// Get tenant ID from context if available
	const tenantId = locals.tenantId;

	// Track database access failures for admin-only error banners
	let dbAccessError = false;

	// human.json enabled state (for <link rel="human-json"> in head)
	let humanJsonEnabled = false;

	// Preferred season for favicons/PWA icons (#1304)
	let preferredSeason: string | null = null;

	// Only fetch from database at runtime (not during prerendering)
	// The Cloudflare adapter throws when accessing platform.env during prerendering
	// Must check `building` BEFORE accessing platform.env to avoid the getter throwing
	if (!building) {
		try {
			// Check if platform and env exist (won't exist if bindings aren't configured)
			const db = platform?.env?.DB;
			if (db) {
				// If we have a tenant context, load tenant-specific settings
				if (tenantId) {
					// PERFORMANCE: Run independent queries in parallel to reduce latency
					// Settings, nav pages, curio configs, greenhouse check, and home grove lookup run concurrently
					// Sequential await reduced to just the lantern feature flag evaluation (see below)
					// Each query has its own error handling to prevent cascading failures
					const kv = platform?.env?.CACHE_KV;
					const flagsEnv = kv ? { DB: db, FLAGS_KV: kv } : null;

					const [
						settingsResult,
						navResult,
						timelineResult,
						uploadGateResult,
						journeyResult,
						greenhouseResult,
						groveResult,
					] = await Promise.all([
						// Site settings query
						db
							.prepare("SELECT setting_key, setting_value FROM site_settings WHERE tenant_id = ?")
							.bind(tenantId)
							.all<{ setting_key: string; setting_value: string }>()
							.catch((err) => {
								console.warn("[Layout] site_settings query failed:", err);
								return null;
							}),

						// Navigation pages query
						db
							.prepare(`SELECT slug, title, show_in_nav, nav_order FROM pages WHERE tenant_id = ?`)
							.bind(tenantId)
							.all<NavPage & { show_in_nav: number; nav_order: number }>()
							.catch((err) => {
								console.warn("[Layout] navPages query failed:", err);
								return null;
							}),

						// Timeline curio config query (table lives in CURIO_DB since Phase 3)
						(platform?.env?.CURIO_DB ?? db)
							.prepare(
								`SELECT enabled FROM timeline_curio_config WHERE tenant_id = ? AND enabled = 1`,
							)
							.bind(tenantId)
							.first<{ enabled: number }>()
							.catch(() => null), // Timeline table might not exist - that's OK

						// Gallery: check upload gate (image_uploads + uploads_suspended)
						flagsEnv
							? canUploadImages(tenantId, undefined, flagsEnv)
									.then((gate) => gate.allowed)
									.catch(() => false)
							: Promise.resolve(false),

						// Journey curio config query (table lives in CURIO_DB since Phase 3)
						(platform?.env?.CURIO_DB ?? db)
							.prepare(
								`SELECT enabled FROM journey_curio_config WHERE tenant_id = ? AND enabled = 1`,
							)
							.bind(tenantId)
							.first<{ enabled: number }>()
							.catch(() => null), // Journey table might not exist - that's OK

						// Greenhouse check — only for logged-in users (guests never need this)
						locals.user && flagsEnv
							? isInGreenhouse(tenantId, flagsEnv).catch(() => false)
							: Promise.resolve(false as boolean),

						// Home grove lookup — only for logged-in users
						locals.user && db
							? getUserHomeGrove(db, locals.user.email).catch(() => null)
							: Promise.resolve(null as HomeGrove | null),
					]);

					// Gallery is enabled if the upload gate allows it
					galleryEnabled = uploadGateResult;

					// Process settings results
					if (settingsResult?.results) {
						for (const row of settingsResult.results) {
							siteSettings[row.setting_key] = row.setting_value;
						}
						// Check human.json enabled flag from site_settings
						humanJsonEnabled = siteSettings.human_json_enabled === "true";
						// Extract preferred season for seasonal favicons (#1304)
						preferredSeason = resolveSeasonPreference(siteSettings.preferred_season);
					}

					// Process navigation results
					if (navResult?.results) {
						// Get tier-based nav page limit
						const context = locals.context;
						const plan = context.type === "tenant" ? context.tenant.plan : "seedling";
						const navLimit = getNavPageLimit(plan);

						navPages = navResult.results
							.filter((p) => p.show_in_nav && p.slug !== "home" && p.slug !== "about")
							.sort((a, b) => (a.nav_order || 0) - (b.nav_order || 0))
							.slice(0, navLimit) // Apply tier limit
							.map((p) => ({ slug: p.slug, title: p.title }));
					}

					// Add curio pages to nav if enabled (and track state for return)
					if (timelineResult?.enabled) {
						navPages.push({ slug: "timeline", title: "Timeline" });
						timelineEnabled = true;
					}
					if (galleryEnabled) {
						navPages.push({ slug: "gallery", title: "Gallery" });
					}

					// Process logged-in user results (greenhouse + home grove ran in the batch above)
					homeGrove = groveResult;

					// Lantern navigation panel — only for logged-in users.
					// This is the one remaining sequential await: lantern's feature flag
					// evaluation needs the greenhouse result as context.
					if (locals.user && flagsEnv) {
						lanternEnabled = await isFeatureEnabled(
							"lantern_enabled",
							{ tenantId, inGreenhouse: greenhouseResult },
							flagsEnv,
						).catch(() => false);
					}

					// Calculate enabled curios count for the pages admin UI
					// This count is used to show accurate "slots used" (nav pages + curios share the same limit)
					enabledCuriosCount =
						(timelineResult?.enabled ? 1 : 0) +
						(galleryEnabled ? 1 : 0) +
						(journeyResult?.enabled ? 1 : 0);
				}
				// No tenant context = use hardcoded defaults only (line 19)
				// Don't query DB without tenant filter — would leak other tenants' settings
			}
		} catch (error) {
			// If DB bindings aren't configured, gracefully fall back to defaults
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error("Failed to access database (using defaults):", message);
			dbAccessError = true;
		}
	}

	// Get nav page limit for the current tier (for UI display)
	const context = locals.context;
	const plan = context.type === "tenant" ? context.tenant.plan : "seedling";
	const navPageLimit = getNavPageLimit(plan);

	// SECURITY: Determine if the logged-in user owns this tenant.
	// The admin gear icon in the footer must ONLY show for the tenant owner,
	// not for any logged-in user. This prevents leaking the /arbor link
	// to visitors who happen to be signed in on another Grove site.
	const isOwner =
		!!locals.user &&
		context.type === "tenant" &&
		emailsMatch(context.tenant.ownerId, locals.user.email);

	return {
		user: locals.user || null,
		context: locals.context as AppContext,
		isOwner,
		siteSettings,
		navPages,
		navPageLimit,
		enabledCuriosCount,
		csrfToken: locals.csrfToken,
		// Explicit curio enable flags for mobile nav (fixes #848 regression)
		// Uses hoisted booleans since Promise.all results are block-scoped
		showTimeline: timelineEnabled,
		showGallery: galleryEnabled,
		humanJsonEnabled,
		preferredSeason,
		dbAccessError,
		lanternData: locals.user
			? {
					homeGrove: homeGrove?.subdomain ?? "",
					displayName: siteSettings.grove_title || homeGrove?.name || "",
					enabled: lanternEnabled,
					visitingGrove:
						context.type === "tenant" && context.tenant.id !== homeGrove?.tenantId
							? {
									tenantId: context.tenant.id,
									subdomain: context.tenant.subdomain,
									name: context.tenant.name,
								}
							: null,
				}
			: null,
	};
};
