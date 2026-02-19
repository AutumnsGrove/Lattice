import type { PageServerLoad } from './$types';
import { listSearchJobs, getJobResults } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return { currentJob: null, jobResults: [] };
	}

	// Get the most recent running or pending job
	const { jobs } = await listSearchJobs(platform.env.DB, { limit: 1 });
	const currentJob = jobs.find(j => j.status === 'running' || j.status === 'pending') || jobs[0] || null;

	let jobResults: Awaited<ReturnType<typeof getJobResults>> = [];
	if (currentJob) {
		jobResults = await getJobResults(platform.env.DB, currentJob.id);
	}

	return {
		currentJob,
		jobResults
	};
};
