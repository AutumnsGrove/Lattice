import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const context = locals.context;

	let userTier = "wanderer";
	if (context.type === "tenant") {
		userTier = context.tenant.plan || "wanderer";
	}

	return {
		userTier,
	};
};
