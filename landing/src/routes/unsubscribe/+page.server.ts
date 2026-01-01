import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyUnsubscribeToken } from '$lib/email/tokens';

export const load: PageServerLoad = async ({ url, platform }) => {
	const email = url.searchParams.get('email');
	const token = url.searchParams.get('token');

	// No params = show generic message
	if (!email || !token) {
		return {
			status: 'invalid',
			message: 'Invalid unsubscribe link'
		};
	}

	if (!platform?.env?.DB || !platform?.env?.RESEND_API_KEY) {
		return {
			status: 'error',
			message: 'Service temporarily unavailable'
		};
	}

	// Verify the token
	const isValid = await verifyUnsubscribeToken(email, token, platform.env.RESEND_API_KEY);

	if (!isValid) {
		return {
			status: 'invalid',
			message: 'Invalid or expired unsubscribe link'
		};
	}

	// Check if subscriber exists and current status
	const subscriber = await platform.env.DB.prepare(
		'SELECT id, email, unsubscribed_at FROM email_signups WHERE email = ?'
	)
		.bind(email.toLowerCase())
		.first<{ id: number; email: string; unsubscribed_at: string | null }>();

	if (!subscriber) {
		return {
			status: 'not_found',
			message: "This email isn't in our list"
		};
	}

	if (subscriber.unsubscribed_at) {
		return {
			status: 'already_unsubscribed',
			email: subscriber.email
		};
	}

	return {
		status: 'confirm',
		email: subscriber.email,
		token
	};
};

export const actions: Actions = {
	default: async ({ request, platform }) => {
		if (!platform?.env?.DB || !platform?.env?.RESEND_API_KEY) {
			return fail(503, { error: 'Service temporarily unavailable' });
		}

		const formData = await request.formData();
		const email = formData.get('email') as string;
		const token = formData.get('token') as string;

		if (!email || !token) {
			return fail(400, { error: 'Missing required fields' });
		}

		// Verify the token again for security
		const isValid = await verifyUnsubscribeToken(email, token, platform.env.RESEND_API_KEY);

		if (!isValid) {
			return fail(403, { error: 'Invalid unsubscribe token' });
		}

		// Update the database
		const result = await platform.env.DB.prepare(
			'UPDATE email_signups SET unsubscribed_at = datetime("now") WHERE email = ? AND unsubscribed_at IS NULL'
		)
			.bind(email.toLowerCase())
			.run();

		if (result.meta.changes === 0) {
			return fail(404, { error: 'Subscriber not found or already unsubscribed' });
		}

		// Redirect to success state
		return { success: true, email };
	}
};
