/**
 * Status Page - Server-side data loading
 *
 * Loads all status data from D1 database for the main status page.
 */
import type { PageServerLoad } from './$types';
import { getStatusPageData } from '$lib/server/status';

export const load: PageServerLoad = async ({ platform }) => {
	// In development without D1, return mock data
	if (!platform?.env?.DB) {
		return getMockData();
	}

	try {
		const data = await getStatusPageData(platform.env.DB);
		return data;
	} catch (error) {
		console.error('Failed to load status data:', error);
		// Return mock data on error
		return getMockData();
	}
};

/**
 * Mock data for development/demo purposes
 */
function getMockData() {
	const now = new Date();
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);

	// Generate 90 days of mock uptime data
	function generate90Days(componentId: string, componentName: string, issueChance: number = 0.02) {
		const days = [];
		const today = new Date();

		for (let i = 89; i >= 0; i--) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			const dateStr = date.toISOString().split('T')[0];

			// Random chance of non-operational day
			const roll = Math.random();
			let status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' = 'operational';
			let incidentCount = 0;

			if (roll < issueChance) {
				status = 'degraded';
				incidentCount = 1;
			} else if (roll < issueChance * 0.3) {
				status = 'partial_outage';
				incidentCount = 1;
			}

			days.push({ date: dateStr, status, incidentCount });
		}

		const operationalDays = days.filter((d) => d.status === 'operational').length;
		const uptimePercentage = (operationalDays / days.length) * 100;

		return {
			componentId,
			componentName,
			days,
			uptimePercentage
		};
	}

	return {
		status: 'operational' as const,
		components: [
			{ id: 'comp_blog', name: 'Blog Engine', slug: 'blog-engine', description: 'Core blogging functionality', display_order: 1, current_status: 'operational' as const, created_at: now.toISOString(), updated_at: now.toISOString() },
			{ id: 'comp_cdn', name: 'CDN', slug: 'cdn', description: 'Image and media delivery', display_order: 2, current_status: 'operational' as const, created_at: now.toISOString(), updated_at: now.toISOString() },
			{ id: 'comp_auth', name: 'Authentication', slug: 'authentication', description: 'Login and session management', display_order: 3, current_status: 'operational' as const, created_at: now.toISOString(), updated_at: now.toISOString() },
			{ id: 'comp_meadow', name: 'Meadow', slug: 'meadow', description: 'Community feed and social features', display_order: 4, current_status: 'operational' as const, created_at: now.toISOString(), updated_at: now.toISOString() },
			{ id: 'comp_payments', name: 'Payments', slug: 'payments', description: 'Subscription and billing', display_order: 5, current_status: 'operational' as const, created_at: now.toISOString(), updated_at: now.toISOString() },
			{ id: 'comp_api', name: 'API', slug: 'api', description: 'Backend API endpoints', display_order: 6, current_status: 'operational' as const, created_at: now.toISOString(), updated_at: now.toISOString() }
		],
		activeIncidents: [],
		recentIncidents: [
			{
				id: 'inc_demo_1',
				title: 'CDN Degraded Performance',
				slug: 'cdn-degraded-performance-jan-03',
				status: 'resolved' as const,
				impact: 'minor' as const,
				type: 'degraded' as const,
				started_at: new Date('2026-01-03T10:15:00Z').toISOString(),
				resolved_at: new Date('2026-01-03T11:00:00Z').toISOString(),
				created_at: new Date('2026-01-03T10:15:00Z').toISOString(),
				updated_at: new Date('2026-01-03T11:00:00Z').toISOString(),
				components: [
					{ id: 'comp_cdn', name: 'CDN', slug: 'cdn', description: 'Image and media delivery', display_order: 2, current_status: 'operational' as const, created_at: now.toISOString(), updated_at: now.toISOString() }
				],
				updates: [
					{ id: 'upd_4', incident_id: 'inc_demo_1', status: 'resolved', message: 'The issue has been resolved. Image delivery is back to normal speeds.', created_at: new Date('2026-01-03T11:00:00Z').toISOString() },
					{ id: 'upd_3', incident_id: 'inc_demo_1', status: 'monitoring', message: 'We\'ve deployed a fix and are monitoring. Image loading times are improving.', created_at: new Date('2026-01-03T10:45:00Z').toISOString() },
					{ id: 'upd_2', incident_id: 'inc_demo_1', status: 'identified', message: 'Root cause identified: cache invalidation issue following deployment. Working on a fix.', created_at: new Date('2026-01-03T10:30:00Z').toISOString() },
					{ id: 'upd_1', incident_id: 'inc_demo_1', status: 'investigating', message: 'We\'re investigating reports of slow image loading.', created_at: new Date('2026-01-03T10:15:00Z').toISOString() }
				]
			}
		],
		scheduledMaintenance: [],
		uptimeHistory: [
			generate90Days('comp_blog', 'Blog Engine', 0.01),
			generate90Days('comp_cdn', 'CDN', 0.03),
			generate90Days('comp_auth', 'Authentication', 0.005),
			generate90Days('comp_meadow', 'Meadow', 0.02),
			generate90Days('comp_payments', 'Payments', 0.01),
			generate90Days('comp_api', 'API', 0.015)
		],
		updatedAt: now.toISOString()
	};
}
