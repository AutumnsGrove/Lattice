import { redirect, json } from '@sveltejs/kit';
import type { PageServerLoad, RequestHandler } from './$types';
import { getPriceId, createCheckoutSession, type PlanId, type BillingCycle } from '$lib/server/stripe';

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

	// Redirect if no plan selected
	if (!onboarding?.planSelected) {
		redirect(302, '/plans');
	}

	// Redirect if already paid
	if (onboarding?.paymentCompleted) {
		redirect(302, '/success');
	}

	return {
		user,
		onboarding
	};
};

export const POST: RequestHandler = async ({ cookies, platform, url }) => {
	const onboardingId = cookies.get('onboarding_id');
	if (!onboardingId) {
		return json({ error: 'Session expired. Please start over.' }, { status: 401 });
	}

	const db = platform?.env?.DB;
	const stripeSecretKey = platform?.env?.STRIPE_SECRET_KEY;

	if (!db || !stripeSecretKey) {
		return json({ error: 'Service temporarily unavailable' }, { status: 503 });
	}

	try {
		// Get onboarding data
		const onboarding = await db
			.prepare(
				`SELECT id, email, username, plan_selected, plan_billing_cycle
				 FROM user_onboarding WHERE id = ?`
			)
			.bind(onboardingId)
			.first();

		if (!onboarding) {
			return json({ error: 'Session not found. Please start over.' }, { status: 404 });
		}

		const plan = onboarding.plan_selected as PlanId;
		const billingCycle = (onboarding.plan_billing_cycle || 'monthly') as BillingCycle;
		const priceId = getPriceId(plan, billingCycle);

		// Create Stripe checkout session
		const session = await createCheckoutSession({
			stripeSecretKey,
			priceId,
			customerEmail: onboarding.email as string,
			onboardingId: onboarding.id as string,
			username: onboarding.username as string,
			plan,
			billingCycle,
			successUrl: `${url.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
			cancelUrl: `${url.origin}/plans`
		});

		// Store the checkout session ID
		await db
			.prepare(
				`UPDATE user_onboarding
				 SET stripe_checkout_session_id = ?, updated_at = unixepoch()
				 WHERE id = ?`
			)
			.bind(session.sessionId, onboardingId)
			.run();

		return json({ url: session.url });
	} catch (error) {
		console.error('[Checkout] Error creating session:', error);
		return json({ error: 'Unable to create checkout session' }, { status: 500 });
	}
};
