import type { PageServerLoad } from './$types';
import { listSearchJobs } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return { jobs: [] };
	}

	const { jobs } = await listSearchJobs(platform.env.DB, { limit: 10 });

	return { jobs };
};
