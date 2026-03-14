import type { LayoutServerLoad } from "./$types";
import { isGreenhouseMode } from "$lib/greenhouse";

/**
 * Root layout server load — makes session info available to all pages.
 * Session validation happens in hooks.server.ts via AUTH service binding.
 * Greenhouse mode state is passed so the footer toggle renders correctly.
 */
export const load: LayoutServerLoad = async ({ locals, cookies, platform }) => {
	const isDev = import.meta.env.DEV;
	const envEnabled = platform?.env?.GREENHOUSE_ENABLED === "true";

	return {
		tenantId: locals.tenantId ?? null,
		userId: locals.userId ?? null,
		greenhouse: isGreenhouseMode(cookies, platform),
		greenhouseAvailable: isDev || envEnabled,
	};
};
