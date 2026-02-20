import type { LayoutServerLoad } from "./$types";
import { loadChannelMessages } from "@autumnsgrove/lattice/services";

export const load: LayoutServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.DB;

	const messages = db ? await loadChannelMessages(db, "meadow").catch(() => []) : [];

	return {
		messages,
		user: locals.user,
		userSubdomain: locals.user?.subdomain ?? null,
	};
};
