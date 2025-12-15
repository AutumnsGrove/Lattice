import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, cookies, platform }) => {
	const { user, onboarding } = await parent();

	// Redirect if not authenticated
	if (!user) {
		redirect(302, '/');
	}

	// Redirect if no tenant created yet
	if (!onboarding?.tenantCreated) {
		redirect(302, '/success');
	}

	return {
		user,
		onboarding
	};
};
