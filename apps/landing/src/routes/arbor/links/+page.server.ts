/**
 * Short Links Admin Page Server (Landing)
 *
 * The Wayfinder's own short links at link.grove.place: any https destination,
 * any (format-valid) slug. Thin routing layer; the rules live in the engine's
 * short-links service.
 */

import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { parseFormData } from "@autumnsgrove/lattice/server";
import { isWayfinder } from "@autumnsgrove/lattice/platform/config";
import { SHORT_LINK_HOST } from "@autumnsgrove/lattice/platform/config/short-links";
import { LINK_ERRORS } from "@autumnsgrove/lattice/errors";
import {
	createCustomLink,
	disableLink,
	listLinks,
	type LinkOwner,
} from "@autumnsgrove/lattice/services/short-links";
import { CreateLinkSchema, DisableLinkSchema } from "./schemas";

const OWNER: LinkOwner = { type: "wayfinder" };

export const load: PageServerLoad = async ({ parent, platform }) => {
	const { isWayfinder } = await parent();

	if (!isWayfinder) {
		throw error(403, "Access denied. This page is for the Wayfinder only.");
	}
	if (!platform?.env?.DB) {
		throw error(500, LINK_ERRORS.DB_NOT_AVAILABLE.userMessage);
	}

	return { links: await listLinks(platform.env.DB, OWNER) };
};

export const actions: Actions = {
	createLink: async ({ request, locals, platform }) => {
		const user = locals.user;
		if (!user) return fail(403, { error: LINK_ERRORS.UNAUTHORIZED.userMessage });
		if (!isWayfinder(user.email)) return fail(403, { error: "Access denied" });
		if (!platform?.env?.DB) return fail(500, { error: LINK_ERRORS.DB_NOT_AVAILABLE.userMessage });

		// Echo what was typed on failure so a refused slug doesn't cost anyone their URL.
		const formData = await request.formData();
		const values = {
			target_url: String(formData.get("target_url") ?? ""),
			slug: String(formData.get("slug") ?? ""),
		};

		const result = parseFormData(formData, CreateLinkSchema);
		if (!result.success) {
			const firstError = Object.values(result.errors).flat()[0];
			return fail(400, { error: firstError || "Invalid form data", values });
		}

		const created = await createCustomLink(platform.env.DB, OWNER, {
			targetUrl: result.data.target_url,
			slug: result.data.slug || null,
		});
		if (!created.ok) return fail(400, { error: created.error.userMessage, values });

		return {
			success: true,
			message: `Your short link is ready: ${SHORT_LINK_HOST}/${created.value.slug}`,
		};
	},

	disableLink: async ({ request, locals, platform }) => {
		const user = locals.user;
		if (!user) return fail(403, { error: LINK_ERRORS.UNAUTHORIZED.userMessage });
		if (!isWayfinder(user.email)) return fail(403, { error: "Access denied" });
		if (!platform?.env?.DB) return fail(500, { error: LINK_ERRORS.DB_NOT_AVAILABLE.userMessage });

		const result = parseFormData(await request.formData(), DisableLinkSchema);
		if (!result.success) return fail(400, { error: "Please choose a link to retire" });

		const disabled = await disableLink(platform.env.DB, OWNER, result.data.slug);
		if (!disabled.ok) return fail(404, { error: disabled.error.userMessage });

		return { success: true, message: "That short link has been retired." };
	},
};
