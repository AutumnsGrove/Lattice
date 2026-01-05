/**
 * Incident Detail Page - Server-side data loading
 */
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getIncidentBySlug } from '$lib/server/status';

/**
 * Validates slug format: lowercase alphanumeric with hyphens, max 100 chars
 */
function isValidSlug(slug: string): boolean {
	if (!slug || slug.length > 100) return false;
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export const load: PageServerLoad = async ({ params, platform }) => {
	const { slug } = params;

	// Validate slug format before any database operations
	if (!isValidSlug(slug)) {
		throw error(400, 'Invalid incident slug format');
	}

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
		if ((err as any)?.status === 404 || (err as any)?.status === 400) {
			throw err;
		}
		console.error('[status] Failed to load incident, falling back to mock:', err);
		return getMockIncident(slug);
	}
};

function getMockIncident(slug: string) {
	// Return mock incident for demo with relative dates (2 days ago)
	const now = new Date();

	const incidentStart = new Date(now);
	incidentStart.setDate(incidentStart.getDate() - 2);
	incidentStart.setHours(10, 15, 0, 0);

	const updateIdentified = new Date(incidentStart);
	updateIdentified.setMinutes(updateIdentified.getMinutes() + 15);

	const updateMonitoring = new Date(incidentStart);
	updateMonitoring.setMinutes(updateMonitoring.getMinutes() + 30);

	const incidentResolved = new Date(incidentStart);
	incidentResolved.setMinutes(incidentResolved.getMinutes() + 45);

	return {
		incident: {
			id: 'inc_demo',
			title: 'CDN Degraded Performance',
			slug: slug,
			status: 'resolved' as const,
			impact: 'minor' as const,
			type: 'degraded' as const,
			started_at: incidentStart.toISOString(),
			resolved_at: incidentResolved.toISOString(),
			created_at: incidentStart.toISOString(),
			updated_at: incidentResolved.toISOString(),
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
					created_at: incidentResolved.toISOString()
				},
				{
					id: 'upd_3',
					incident_id: 'inc_demo',
					status: 'monitoring',
					message: 'We\'ve deployed a fix and are monitoring. Image loading times are improving across all regions.',
					created_at: updateMonitoring.toISOString()
				},
				{
					id: 'upd_2',
					incident_id: 'inc_demo',
					status: 'identified',
					message: 'Root cause identified: cache invalidation issue following a recent deployment caused images to be re-fetched from origin more frequently than normal. Working on a fix.',
					created_at: updateIdentified.toISOString()
				},
				{
					id: 'upd_1',
					incident_id: 'inc_demo',
					status: 'investigating',
					message: 'We\'re investigating reports of slow image loading. Some users may experience longer than usual load times for images and media.',
					created_at: incidentStart.toISOString()
				}
			]
		}
	};
}
