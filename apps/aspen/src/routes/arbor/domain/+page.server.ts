import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const context = locals.context;

	// Extract tenant info for the domain checker
	let username = "";
	let userTier = "seedling";

	if (context.type === "tenant") {
		username = context.tenant.subdomain;
		userTier = context.tenant.plan || "seedling";
	}

	return {
		username,
		userTier,
	};
};
