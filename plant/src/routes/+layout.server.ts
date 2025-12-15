import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, platform }) => {
	// Check if user has an active onboarding session
	const onboardingId = cookies.get('onboarding_id');
	const accessToken = cookies.get('access_token');

	if (!onboardingId || !accessToken) {
		return {
			user: null,
			onboarding: null
		};
	}

	// Fetch onboarding state from database
	const db = platform?.env?.DB;
	if (!db) {
		return {
			user: null,
			onboarding: null
		};
	}

	try {
		const result = await db
			.prepare(
				`SELECT
					id,
					groveauth_id,
					email,
					display_name,
					username,
					favorite_color,
					interests,
					profile_completed_at,
					plan_selected,
					plan_billing_cycle,
					payment_completed_at,
					tenant_id,
					tour_completed_at,
					tour_skipped
				FROM user_onboarding
				WHERE id = ?`
			)
			.bind(onboardingId)
			.first();

		if (!result) {
			// Invalid onboarding session, clear cookies
			cookies.delete('onboarding_id', { path: '/' });
			return {
				user: null,
				onboarding: null
			};
		}

		// Determine current step
		let step: 'auth' | 'profile' | 'plans' | 'checkout' | 'success' | 'tour' = 'profile';
		if (!result.profile_completed_at) {
			step = 'profile';
		} else if (!result.plan_selected) {
			step = 'plans';
		} else if (!result.payment_completed_at && result.plan_selected !== 'free') {
			step = 'checkout';
		} else if (!result.tenant_id) {
			step = 'success';
		} else if (!result.tour_completed_at && !result.tour_skipped) {
			step = 'tour';
		} else {
			step = 'success';
		}

		return {
			user: {
				id: result.id as string,
				groveauthId: result.groveauth_id as string,
				email: result.email as string,
				displayName: result.display_name as string | null,
				username: result.username as string | null
			},
			onboarding: {
				id: result.id as string,
				step,
				profileCompleted: !!result.profile_completed_at,
				planSelected: result.plan_selected as string | null,
				billingCycle: result.plan_billing_cycle as string | null,
				paymentCompleted: !!result.payment_completed_at,
				tenantCreated: !!result.tenant_id,
				tenantId: result.tenant_id as string | null,
				favoriteColor: result.favorite_color as string | null,
				interests: result.interests ? JSON.parse(result.interests as string) : []
			}
		};
	} catch (error) {
		console.error('[Layout] Error loading onboarding state:', error);
		return {
			user: null,
			onboarding: null
		};
	}
};
