import type { LayoutServerLoad } from "./$types";

/**
 * Root layout server load — makes session info available to all pages.
 * Session validation happens in hooks.server.ts via AUTH service binding.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		tenantId: locals.tenantId ?? null,
		userId: locals.userId ?? null,
	};
};
