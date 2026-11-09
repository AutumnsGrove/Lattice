/**
 * Short Links (Arbor)
 *
 * A Wanderer's short links at link.grove.place, limited to their own grove.
 * Thin routing layer; the rules live in the engine's short-links service.
 */

import { fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { parseFormData } from "@autumnsgrove/lattice/server";
import { z } from "zod";
import { LINK_ERRORS } from "@autumnsgrove/lattice/errors";
import { SHORT_LINK_HOST } from "@autumnsgrove/lattice/platform/config/short-links";
import { createThreshold } from "@autumnsgrove/lattice/platform/threshold/factory";
import { thresholdCheck } from "@autumnsgrove/lattice/platform/threshold/sveltekit";
import { getEndpointLimitByKey } from "@autumnsgrove/lattice/platform/threshold";
import {
	createCustomLink,
	disableLink,
	listLinks,
} from "@autumnsgrove/lattice/services/short-links";
import { requireGroveLinkAccess } from "$lib/server/short-links";

const CreateLinkSchema = z.object({
	target_url: z.string().trim().min(1, "Please enter where the link should go"),
	slug: z.string().trim().optional().default(""),
});

const DisableLinkSchema = z.object({
	slug: z.string().trim().min(1, "Please choose a link to retire"),
});

export const load: PageServerLoad = async ({ platform, locals }) => {
	const access = await requireGroveLinkAccess(platform, locals);
	if (!access.ok) return { links: [], subdomain: null };

	return {
		links: await listLinks(access.db, access.owner),
		subdomain: access.owner.type === "grove" ? access.owner.subdomain : null,
	};
};

export const actions: Actions = {
	createLink: async ({ request, platform, locals }) => {
		const access = await requireGroveLinkAccess(platform, locals);
		if (!access.ok) return fail(access.status, { error: access.error.userMessage });

		// Echo what was typed on failure so a refused slug doesn't cost anyone their URL.
		const formData = await request.formData();
		const values = {
			target_url: String(formData.get("target_url") ?? ""),
			slug: String(formData.get("slug") ?? ""),
		};

		const threshold = createThreshold(platform?.env, { identifier: access.userId });
		if (threshold) {
			const { limit, windowSeconds } = getEndpointLimitByKey("links/create");
			const denied = await thresholdCheck(threshold, {
				key: `links/create:${access.userId}`,
				limit,
				windowSeconds,
				failMode: "open",
			});
			if (denied) return fail(429, { error: LINK_ERRORS.RATE_LIMITED.userMessage, values });
		}

		const parsed = parseFormData(formData, CreateLinkSchema);
		if (!parsed.success) {
			const firstError = Object.values(parsed.errors).flat()[0];
			return fail(400, { error: firstError || "Invalid form data", values });
		}

		const created = await createCustomLink(access.db, access.owner, {
			targetUrl: parsed.data.target_url,
			slug: parsed.data.slug || null,
		});
		if (!created.ok) return fail(400, { error: created.error.userMessage, values });

		return {
			success: true,
			message: `Your short link is ready: ${SHORT_LINK_HOST}/${created.value.slug}`,
		};
	},

	disableLink: async ({ request, platform, locals }) => {
		const access = await requireGroveLinkAccess(platform, locals);
		if (!access.ok) return fail(access.status, { error: access.error.userMessage });

		const parsed = parseFormData(await request.formData(), DisableLinkSchema);
		if (!parsed.success) return fail(400, { error: "Please choose a link to retire" });

		const disabled = await disableLink(access.db, access.owner, parsed.data.slug);
		if (!disabled.ok) return fail(404, { error: disabled.error.userMessage });

		return { success: true, message: "That short link has been retired." };
	},
};
