/**
 * Check tenant creation status
 *
 * Used by the success page to poll for tenant readiness.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, platform }) => {
	const onboardingId = cookies.get('onboarding_id');

	if (!onboardingId) {
		return json({ ready: false, error: 'No session' });
	}

	const db = platform?.env?.DB;
	if (!db) {
		return json({ ready: false, error: 'Service unavailable' });
	}

	try {
		const result = await db
			.prepare(
				`SELECT o.tenant_id, o.payment_completed_at, t.subdomain
				 FROM user_onboarding o
				 LEFT JOIN tenants t ON o.tenant_id = t.id
				 WHERE o.id = ?`
			)
			.bind(onboardingId)
			.first();

		if (!result) {
			return json({ ready: false, error: 'Session not found' });
		}

		if (result.tenant_id && result.subdomain) {
			return json({
				ready: true,
				subdomain: result.subdomain
			});
		}

		if (result.payment_completed_at) {
			return json({
				ready: false,
				creating: true
			});
		}

		return json({
			ready: false,
			creating: false
		});
	} catch (error) {
		console.error('[Success Check] Error:', error);
		return json({ ready: false, error: 'Check failed' });
	}
};
