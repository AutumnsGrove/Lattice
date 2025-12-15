import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const VALID_PLANS = ['seedling', 'sapling', 'oak', 'evergreen'];
const VALID_BILLING_CYCLES = ['monthly', 'yearly'];

export const load: PageServerLoad = async ({ parent }) => {
	const { user, onboarding } = await parent();

	// Redirect if not authenticated
	if (!user) {
		redirect(302, '/');
	}

	// Redirect if profile not completed
	if (!onboarding?.profileCompleted) {
		redirect(302, '/profile');
	}

	// Redirect if already selected plan and paid
	if (onboarding?.paymentCompleted) {
		redirect(302, '/success');
	}

	return {
		user,
		onboarding
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, platform }) => {
		const formData = await request.formData();
		const plan = formData.get('plan')?.toString();
		const billingCycle = formData.get('billingCycle')?.toString() || 'monthly';

		// Validate plan
		if (!plan || !VALID_PLANS.includes(plan)) {
			return fail(400, { error: 'Please select a plan' });
		}

		if (!VALID_BILLING_CYCLES.includes(billingCycle)) {
			return fail(400, { error: 'Invalid billing cycle' });
		}

		// Get onboarding ID from cookie
		const onboardingId = cookies.get('onboarding_id');
		if (!onboardingId) {
			redirect(302, '/');
		}

		const db = platform?.env?.DB;
		if (!db) {
			return fail(500, { error: 'Service temporarily unavailable' });
		}

		try {
			// Update onboarding record with selected plan
			await db
				.prepare(
					`UPDATE user_onboarding
					 SET plan_selected = ?,
							 plan_billing_cycle = ?,
							 plan_selected_at = unixepoch(),
							 updated_at = unixepoch()
					 WHERE id = ?`
				)
				.bind(plan, billingCycle, onboardingId)
				.run();

			// Redirect to checkout
			redirect(302, '/checkout');
		} catch (err) {
			// Re-throw redirects
			if (err && typeof err === 'object' && 'status' in err && err.status === 302) {
				throw err;
			}
			console.error('[Plans] Error saving plan selection:', err);
			return fail(500, { error: 'Unable to save selection. Please try again.' });
		}
	}
};
