import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

interface EmailSignup {
	id: number;
	email: string;
	created_at: string;
	confirmed_at: string | null;
	unsubscribed_at: string | null;
	source: string;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		throw redirect(302, '/admin/login');
	}
	if (!locals.user.is_admin) {
		throw error(403, 'Admin access required');
	}
	if (!platform?.env?.DB) {
		throw error(500, 'Database not available');
	}

	const { DB } = platform.env;

	// Get all email signups (excluding unsubscribed)
	const activeSubscribers = await DB.prepare(
		'SELECT * FROM email_signups WHERE unsubscribed_at IS NULL ORDER BY created_at DESC'
	).all<EmailSignup>();

	// Get unsubscribed count
	const unsubscribedCount = await DB.prepare(
		'SELECT COUNT(*) as count FROM email_signups WHERE unsubscribed_at IS NOT NULL'
	).first<{ count: number }>();

	return {
		subscribers: activeSubscribers.results || [],
		totalActive: activeSubscribers.results?.length || 0,
		totalUnsubscribed: unsubscribedCount?.count || 0,
		user: locals.user
	};
};
