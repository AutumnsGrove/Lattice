import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, platform }) => {
	const env = platform?.env;

	// Summary data for hub cards
	let currentSubdomain = "";
	let groveTitle = "";
	let avatarUrl: string | null = null;
	let fontFamily = "";
	let accentColor = "";
	let preferredSeason = "";
	let canopyVisible = false;
	let meadowOptIn = false;
	let humanJsonEnabled = false;
	let customBlazeCount = 0;

	if (env?.DB && locals.tenantId) {
		try {
			// Fetch tenant info + settings + blaze count in parallel (3 queries, 1 round-trip)
			const [tenantRow, settingsRows, blazeCount] = await Promise.all([
				env.DB.prepare("SELECT subdomain, plan, meadow_opt_in FROM tenants WHERE id = ?")
					.bind(locals.tenantId)
					.first<{ subdomain: string; plan: string | null; meadow_opt_in: number | null }>(),
				env.DB.prepare(
					"SELECT setting_key, setting_value FROM site_settings WHERE tenant_id = ? AND setting_key IN (?, ?, ?, ?, ?, ?, ?)",
				)
					.bind(
						locals.tenantId,
						"grove_title",
						"avatar_url",
						"font_family",
						"accent_color",
						"preferred_season",
						"canopy_visible",
						"human_json_enabled",
					)
					.all<{ setting_key: string; setting_value: string }>(),
				env.DB.prepare(
					"SELECT COUNT(*) as count FROM blazes WHERE tenant_id = ? AND scope = 'tenant'",
				)
					.bind(locals.tenantId)
					.first<{ count: number }>(),
			]);

			if (tenantRow) {
				currentSubdomain = tenantRow.subdomain;
				meadowOptIn = tenantRow.meadow_opt_in === 1;
			}

			// Parse settings into a map
			const settings: Record<string, string> = {};
			for (const row of settingsRows.results ?? []) {
				settings[row.setting_key] = row.setting_value;
			}

			groveTitle = settings.grove_title || "";
			avatarUrl = settings.avatar_url || null;
			fontFamily = settings.font_family || "";
			accentColor = settings.accent_color || "";
			preferredSeason = settings.preferred_season || "";
			canopyVisible = settings.canopy_visible === "true";
			humanJsonEnabled = settings.human_json_enabled === "true";
			customBlazeCount = blazeCount?.count ?? 0;
		} catch (error) {
			console.error("Failed to load settings hub data:", error);
		}
	}

	// Session count is fetched client-side (real-time from SessionDO)
	// so we don't include it in the server load

	return {
		currentSubdomain,
		groveTitle,
		avatarUrl,
		oauthAvatarUrl: locals.user?.picture ?? null,
		fontFamily,
		accentColor,
		preferredSeason,
		canopyVisible,
		meadowOptIn,
		humanJsonEnabled,
		customBlazeCount,
	};
};
