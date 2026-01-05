/**
 * RSS Feed - /feed
 *
 * Provides an RSS 2.0 feed of Grove status updates and incidents.
 * Users can subscribe to stay informed about platform health.
 */
import type { RequestHandler } from './$types';
import { getRecentIncidents, getIncidentUpdates } from '$lib/server/status';
import { getIncidentStatusLabel } from '$lib/types/status';

export const GET: RequestHandler = async ({ platform }) => {
	const baseUrl = 'https://status.grove.place';

	// Generate RSS items from incidents
	let items = '';

	if (platform?.env?.DB) {
		try {
			const incidents = await getRecentIncidents(platform.env.DB, 30);

			for (const incident of incidents) {
				const updates = await getIncidentUpdates(platform.env.DB, incident.id);

				// Create an item for each update
				for (const update of updates) {
					const pubDate = new Date(update.created_at).toUTCString();
					const title = `[${getIncidentStatusLabel(update.status as any)}] ${incident.title}`;
					const link = `${baseUrl}/incidents/${incident.slug}`;
					const guid = `${incident.id}-${update.id}`;

					items += `
    <item>
      <title><![CDATA[${escapeXml(title)}]]></title>
      <link>${link}</link>
      <guid isPermaLink="false">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${escapeXml(update.message)}]]></description>
    </item>`;
				}
			}
		} catch (error) {
			console.error('Failed to generate RSS feed:', error);
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
 * Escape special XML characters
 */
function escapeXml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}
