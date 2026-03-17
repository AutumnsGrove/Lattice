import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, platform }) => {
	const env = platform?.env;

	// Most settings hub data comes from parent layouts:
	//   Root layout → data.siteSettings (grove_title, font_family, accent_color, etc.)
	//   Arbor layout → data.tenant (subdomain, displayName)
	//   Arbor layout → data.user (picture for OAuth avatar)
	//
	// Only meadow_opt_in (tenants table) and blaze count need separate queries.

	let meadowOptIn = false;
	let customBlazeCount = 0;

	if (env?.DB && locals.tenantId) {
		// Per-query error handling — one failing doesn't break the other
		const [meadowResult, blazeResult] = await Promise.all([
			env.DB.prepare("SELECT meadow_opt_in FROM tenants WHERE id = ?")
				.bind(locals.tenantId)
				.first<{ meadow_opt_in: number | null }>()
				.catch((err) => {
					console.warn("[Settings Hub] meadow query failed:", err);
					return null;
				}),
			env.DB.prepare(
				"SELECT COUNT(*) as count FROM blazes WHERE tenant_id = ? AND scope = 'tenant'",
			)
				.bind(locals.tenantId)
				.first<{ count: number }>()
				.catch((err) => {
					console.warn("[Settings Hub] blaze count query failed:", err);
					return null;
				}),
		]);

		meadowOptIn = meadowResult?.meadow_opt_in === 1;
		customBlazeCount = blazeResult?.count ?? 0;
	}

	return {
		meadowOptIn,
		customBlazeCount,
	};
};
