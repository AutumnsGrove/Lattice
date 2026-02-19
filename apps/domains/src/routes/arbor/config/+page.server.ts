import type { PageServerLoad } from './$types';
import { getActiveConfig } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return { config: null };
	}

	const config = await getActiveConfig(platform.env.DB);

	return { config };
};
