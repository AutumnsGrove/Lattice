import { loadCurioStatus } from "@autumnsgrove/curios/status";
import { isBetaDeployment } from "$lib/server/beta";
import { readAiKeySource } from "$lib/server/ai-key";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	// Auth is handled by the parent /admin layout
	let curios: Awaited<ReturnType<typeof loadCurioStatus>> = [];

	if (platform?.env?.CURIO_DB) {
		curios = await loadCurioStatus(platform.env.CURIO_DB, locals.tenantId);
	}

	return {
		curios,
		/**
		 * Fireside ships on beta, and the gate is the deployment, not a graft — so
		 * the page asks the same question every route asks.
		 */
		firesideEnabled: isBetaDeployment(locals, url),
		/**
		 * Presence, never the key: the panel needs to know whether the door can be
		 * used, and a page that could decrypt a key to ask would be a page that could
		 * leak one. The door is shown either way — a hidden button is a feature nobody
		 * asks about.
		 */
		firesideHasKey: (await readAiKeySource(platform?.env, locals.tenantId)) !== undefined,
	};
};
