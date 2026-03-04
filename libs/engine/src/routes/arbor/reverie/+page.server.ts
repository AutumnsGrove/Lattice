import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const context = locals.context;

	let userTier = "free";
	if (context.type === "tenant") {
		userTier = context.tenant.plan || "free";
	}

	return {
		userTier,
	};
};
