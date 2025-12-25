import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/admin/login');
	}
	if (!locals.user.is_admin) {
		throw error(403, 'Admin access required');
	}

	return {
		user: locals.user
	};
};
