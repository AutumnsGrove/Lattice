import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, platform }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env?.DB) {
		throw error(500, 'Database not available');
	}

	const { DB } = platform.env;

	try {
		// Get all email signups (excluding unsubscribed)
		const activeSubscribers = await DB.prepare(
			'SELECT * FROM email_signups WHERE unsubscribed_at IS NULL ORDER BY created_at DESC'
		).all();

		// Get unsubscribed count
		const unsubscribedCount = await DB.prepare(
			'SELECT COUNT(*) as count FROM email_signups WHERE unsubscribed_at IS NOT NULL'
		).first();

		return {
			subscribers: activeSubscribers.results || [],
			totalActive: activeSubscribers.results?.length || 0,
			totalUnsubscribed: unsubscribedCount?.count || 0
		};
	} catch (err) {
		console.error('[Subscribers Error]', err);
		throw error(500, 'Failed to load subscribers');
	}
}
