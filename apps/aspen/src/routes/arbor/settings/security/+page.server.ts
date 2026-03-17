import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	// Sessions are fetched client-side via onMount → /api/auth/sessions
	// (real-time data from SessionDO, not stale server load)
	return {};
};
