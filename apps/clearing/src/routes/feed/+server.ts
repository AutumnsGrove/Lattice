/**
 * RSS Feed - /feed
 *
 * Provides an RSS 2.0 feed of Grove status updates and incidents.
 * Users can subscribe to stay informed about platform health.
 */
import type { RequestHandler } from './$types';
import { getRecentIncidentsWithUpdates } from '$lib/server/status';
import { getIncidentStatusLabel } from '$lib/types/status';
import type { IncidentStatus } from '$lib/types/status';

export const GET: RequestHandler = async ({ platform }) => {
	const baseUrl = 'https://status.grove.place';

	// Generate RSS items from incidents
	let items = '';

	if (platform?.env?.DB) {
		try {
			// Use optimized query that fetches incidents with updates in fewer queries
			const incidents = await getRecentIncidentsWithUpdates(platform.env.DB, 30);

			for (const incident of incidents) {
				// Create an item for each update
				for (const update of incident.updates) {
					const pubDate = new Date(update.created_at).toUTCString();
					// Validate status is a known IncidentStatus before using
					const statusLabel = isValidIncidentStatus(update.status)
						? getIncidentStatusLabel(update.status)
						: update.status;
					const title = `[${statusLabel}] ${incident.title}`;
					const link = `${baseUrl}/incidents/${incident.slug}`;
					const guid = `${incident.id}-${update.id}`;

					// CDATA sections preserve text as-is, no escaping needed inside them
					items += `
    <item>
      <title><![CDATA[${title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="false">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${update.message}]]></description>
    </item>`;
				}
			}
		} catch (error) {
			console.error('[status] Failed to generate RSS feed:', error);
			// Add a system notice when we can't fetch real data
			const errorDate = new Date();
			items = `
    <item>
      <title><![CDATA[[System Notice] Status feed temporarily unavailable]]></title>
      <link>${baseUrl}</link>
      <guid isPermaLink="false">system-notice-${errorDate.getTime()}</guid>
      <pubDate>${errorDate.toUTCString()}</pubDate>
      <description><![CDATA[We're experiencing issues retrieving status updates. Please visit the status page directly for current information.]]></description>
    </item>`;
		}
	} else {
		// Mock data for development
		const now = new Date();
		items = `
    <item>
      <title><![CDATA[All Systems Operational]]></title>
      <link>${baseUrl}</link>
      <guid isPermaLink="false">status-${now.toISOString()}</guid>
      <pubDate>${now.toUTCString()}</pubDate>
      <description><![CDATA[All Grove systems are currently operational.]]></description>
    </item>`;
	}

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Grove Status</title>
    <link>${baseUrl}</link>
    <description>Status updates and incidents for Grove platform services</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed" rel="self" type="application/rss+xml"/>
    <image>
      <url>https://cdn.grove.place/branding/grove-icon.png</url>
      <title>Grove Status</title>
      <link>${baseUrl}</link>
    </image>${items}
  </channel>
</rss>`;

	return new Response(rss, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
		}
	});
};

/**
 * Type guard to validate incident status
 */
function isValidIncidentStatus(status: string): status is IncidentStatus {
	return ['investigating', 'identified', 'monitoring', 'resolved'].includes(status);
}
