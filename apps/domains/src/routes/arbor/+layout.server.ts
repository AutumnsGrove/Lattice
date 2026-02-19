import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Allow access to login page
	if (url.pathname === '/arbor/login') {
		return { user: locals.user };
	}

	// Redirect to login if not authenticated
	if (!locals.user) {
		throw redirect(302, `/arbor/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	// Check admin status
	if (!locals.user.is_admin) {
		throw redirect(302, '/');
	}

	return {
		user: locals.user
	};
};
