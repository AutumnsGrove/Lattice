import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, platform }) => {
	const env = platform?.env;
	let meadowOptIn = false;

	if (env?.DB && locals.tenantId) {
		try {
			const row = await env.DB.prepare("SELECT meadow_opt_in FROM tenants WHERE id = ?")
				.bind(locals.tenantId)
				.first<{ meadow_opt_in: number | null }>();
			meadowOptIn = row?.meadow_opt_in === 1;
		} catch {
			// Default to false
		}
	}

	return { meadowOptIn };
};
