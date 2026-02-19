/**
 * Landing Page Server Load
 *
 * Owner → redirect to inbox
 * Others → show landing/login page
 */

import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	// Owner is already logged in — send them straight to inbox
	if (locals.isOwner) {
		throw redirect(302, "/inbox");
	}

	return {
		user: locals.user || null,
	};
};
