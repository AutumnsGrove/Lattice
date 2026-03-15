import type { PageServerLoad } from "./$types";
import { ARBOR_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";

export const load: PageServerLoad = async ({ locals, parent }) => {
	// Gate: reverie_enabled graft (cascaded from arbor layout)
	const parentData = await parent();
	if (!parentData.grafts?.reverie_enabled) {
		throwGroveError(404, ARBOR_ERRORS.GREENHOUSE_REQUIRED, "Arbor");
	}

	const context = locals.context;

	let userTier = "wanderer";
	if (context.type === "tenant") {
		userTier = context.tenant.plan || "wanderer";
	}

	return {
		userTier,
	};
};
