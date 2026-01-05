/**
 * Incident Detail Page - Server-side data loading
 */
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getIncidentBySlug } from '$lib/server/status';

export const load: PageServerLoad = async ({ params, platform }) => {
	const { slug } = params;

	// In development without D1, return mock data
	if (!platform?.env?.DB) {
		console.warn('[status] D1 database binding not available, using mock incident data');
		return getMockIncident(slug);
	}

	try {
		const incident = await getIncidentBySlug(platform.env.DB, slug);

		if (!incident) {
			throw error(404, 'Incident not found');
		}

		return { incident };
	} catch (err) {
		if ((err as any)?.status === 404) {
			throw err;
		}
		console.error('[status] Failed to load incident, falling back to mock:', err);
		return getMockIncident(slug);
	}
};

function getMockIncident(slug: string) {
	// Return mock incident for demo
	const now = new Date();

	return {
		incident: {
			id: 'inc_demo',
			title: 'CDN Degraded Performance',
			slug: slug,
			status: 'resolved' as const,
			impact: 'minor' as const,
			type: 'degraded' as const,
			started_at: new Date('2026-01-03T10:15:00Z').toISOString(),
			resolved_at: new Date('2026-01-03T11:00:00Z').toISOString(),
			created_at: new Date('2026-01-03T10:15:00Z').toISOString(),
			updated_at: new Date('2026-01-03T11:00:00Z').toISOString(),
			components: [
				{
					id: 'comp_cdn',
					name: 'CDN',
					slug: 'cdn',
					description: 'Image and media delivery via R2/Cloudflare',
					display_order: 2,
					current_status: 'operational' as const,
					created_at: now.toISOString(),
					updated_at: now.toISOString()
				}
			],
			updates: [
				{
					id: 'upd_4',
					incident_id: 'inc_demo',
					status: 'resolved',
					message: 'The issue has been resolved. Image delivery is back to normal speeds. We have identified the root cause as a cache invalidation issue and have implemented safeguards to prevent this from happening again.',
					created_at: new Date('2026-01-03T11:00:00Z').toISOString()
				},
				{
					id: 'upd_3',
					incident_id: 'inc_demo',
					status: 'monitoring',
					message: 'We\'ve deployed a fix and are monitoring. Image loading times are improving across all regions.',
					created_at: new Date('2026-01-03T10:45:00Z').toISOString()
				},
				{
					id: 'upd_2',
					incident_id: 'inc_demo',
					status: 'identified',
					message: 'Root cause identified: cache invalidation issue following a recent deployment caused images to be re-fetched from origin more frequently than normal. Working on a fix.',
					created_at: new Date('2026-01-03T10:30:00Z').toISOString()
				},
				{
					id: 'upd_1',
					incident_id: 'inc_demo',
					status: 'investigating',
					message: 'We\'re investigating reports of slow image loading. Some users may experience longer than usual load times for images and media.',
					created_at: new Date('2026-01-03T10:15:00Z').toISOString()
				}
			]
		}
	};
}
