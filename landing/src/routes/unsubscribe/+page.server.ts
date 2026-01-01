import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	const email = url.searchParams.get('email');
	return { email };
};

export const actions: Actions = {
	default: async ({ request, platform }) => {
		if (!platform?.env?.DB) {
			return fail(503, { error: 'Service temporarily unavailable' });
		}

		const formData = await request.formData();
		const email = formData.get('email')?.toString()?.toLowerCase()?.trim();
		const unsubscribeType = formData.get('type')?.toString() || 'onboarding';

		if (!email) {
			return fail(400, { error: 'Email is required' });
		}

		try {
			// Check if user exists
			const existing = await platform.env.DB.prepare(
				'SELECT id FROM email_signups WHERE email = ?'
			)
				.bind(email)
				.first<{ id: number }>();

			if (!existing) {
				// User not found - still show success to prevent email enumeration
				return { success: true };
			}

			if (unsubscribeType === 'all') {
				// Unsubscribe from everything
				await platform.env.DB.prepare(
					'UPDATE email_signups SET unsubscribed_at = datetime("now") WHERE email = ?'
				)
					.bind(email)
					.run();
			} else {
				// Just unsubscribe from onboarding/marketing emails
				await platform.env.DB.prepare(
					'UPDATE email_signups SET onboarding_emails_unsubscribed = 1 WHERE email = ?'
				)
					.bind(email)
					.run();
			}

			return { success: true };
		} catch (error) {
			console.error('Unsubscribe error:', error);
			return fail(500, { error: 'Something went wrong. Please try again.' });
		}
	}
};
