import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCheckoutSession } from '$lib/server/stripe';
import { createTenant, getTenantForOnboarding } from '$lib/server/tenant';

export const load: PageServerLoad = async ({ url, cookies, platform, parent }) => {
	const { user, onboarding } = await parent();

	// Redirect if not authenticated
	if (!user) {
		redirect(302, '/');
	}

	// Redirect if profile not completed
	if (!onboarding?.profileCompleted) {
		redirect(302, '/profile');
	}

	// Redirect if no plan selected
	if (!onboarding?.planSelected) {
		redirect(302, '/plans');
	}

	// Get session_id from URL (Stripe redirect)
	const sessionId = url.searchParams.get('session_id');
	const db = platform?.env?.DB;
	const stripeSecretKey = platform?.env?.STRIPE_SECRET_KEY;

	// If we have a session_id and haven't processed payment yet
	if (sessionId && db && stripeSecretKey && !onboarding?.paymentCompleted) {
		try {
			// Verify the checkout session
			const session = await getCheckoutSession(stripeSecretKey, sessionId);

			if (session.status === 'complete') {
				const onboardingId = cookies.get('onboarding_id');

				if (onboardingId) {
					// Update payment status
					await db
						.prepare(
							`UPDATE user_onboarding
							 SET stripe_customer_id = ?,
									 stripe_subscription_id = ?,
									 payment_completed_at = unixepoch(),
									 updated_at = unixepoch()
							 WHERE id = ? AND payment_completed_at IS NULL`
						)
						.bind(session.customer, session.subscription, onboardingId)
						.run();

					// Check if tenant exists (webhook might have created it)
					const existingTenant = await getTenantForOnboarding(db, onboardingId);

					if (!existingTenant) {
						// Create tenant now (backup if webhook hasn't fired yet)
						const onboardingData = await db
							.prepare(
								`SELECT id, username, display_name, email, plan_selected, favorite_color
								 FROM user_onboarding WHERE id = ?`
							)
							.bind(onboardingId)
							.first();

						if (onboardingData) {
							await createTenant(db, {
								onboardingId: onboardingData.id as string,
								username: onboardingData.username as string,
								displayName: onboardingData.display_name as string,
								email: onboardingData.email as string,
								plan: onboardingData.plan_selected as 'seedling' | 'sapling' | 'oak' | 'evergreen',
								favoriteColor: onboardingData.favorite_color as string | null,
								stripeCustomerId: session.customer,
								stripeSubscriptionId: session.subscription
							});
						}
					}
				}
			}
		} catch (error) {
			console.error('[Success] Error verifying session:', error);
		}
	}

	return {
		user,
		onboarding
	};
};
