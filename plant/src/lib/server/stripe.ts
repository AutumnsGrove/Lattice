/**
 * Stripe Configuration and Helpers
 *
 * Contains price IDs for all plans and checkout session creation.
 */

// Stripe Price IDs - PLACEHOLDER VALUES
// Replace with actual Stripe price IDs once products are created
export const STRIPE_PRICES = {
	seedling: {
		monthly: 'price_seedling_monthly_PLACEHOLDER',
		yearly: 'price_seedling_yearly_PLACEHOLDER'
	},
	sapling: {
		monthly: 'price_sapling_monthly_PLACEHOLDER',
		yearly: 'price_sapling_yearly_PLACEHOLDER'
	},
	oak: {
		monthly: 'price_oak_monthly_PLACEHOLDER',
		yearly: 'price_oak_yearly_PLACEHOLDER'
	},
	evergreen: {
		monthly: 'price_evergreen_monthly_PLACEHOLDER',
		yearly: 'price_evergreen_yearly_PLACEHOLDER'
	}
} as const;

export type PlanId = keyof typeof STRIPE_PRICES;
export type BillingCycle = 'monthly' | 'yearly';

/**
 * Get the Stripe price ID for a plan and billing cycle
 */
export function getPriceId(plan: PlanId, billingCycle: BillingCycle): string {
	return STRIPE_PRICES[plan][billingCycle];
}

/**
 * Plan display information
 */
export const PLAN_INFO = {
	seedling: {
		name: 'Seedling',
		monthlyPrice: 800, // cents
		yearlyPrice: 8160
	},
	sapling: {
		name: 'Sapling',
		monthlyPrice: 1200,
		yearlyPrice: 12240
	},
	oak: {
		name: 'Oak',
		monthlyPrice: 2500,
		yearlyPrice: 25500
	},
	evergreen: {
		name: 'Evergreen',
		monthlyPrice: 3500,
		yearlyPrice: 35700
	}
} as const;

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession(params: {
	stripeSecretKey: string;
	priceId: string;
	customerEmail: string;
	onboardingId: string;
	username: string;
	plan: string;
	billingCycle: string;
	successUrl: string;
	cancelUrl: string;
}): Promise<{ sessionId: string; url: string }> {
	const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${params.stripeSecretKey}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			'mode': 'subscription',
			'customer_email': params.customerEmail,
			'line_items[0][price]': params.priceId,
			'line_items[0][quantity]': '1',
			'success_url': params.successUrl,
			'cancel_url': params.cancelUrl,
			'subscription_data[trial_period_days]': '14',
			'subscription_data[metadata][onboarding_id]': params.onboardingId,
			'subscription_data[metadata][username]': params.username,
			'subscription_data[metadata][plan]': params.plan,
			'metadata[onboarding_id]': params.onboardingId,
			'metadata[username]': params.username,
			'metadata[plan]': params.plan,
			'metadata[billing_cycle]': params.billingCycle
		})
	});

	if (!response.ok) {
		const error = await response.json();
		console.error('[Stripe] Checkout session creation failed:', error);
		throw new Error('Failed to create checkout session');
	}

	const session = await response.json();
	return {
		sessionId: session.id,
		url: session.url
	};
}

/**
 * Retrieve a checkout session
 */
export async function getCheckoutSession(
	stripeSecretKey: string,
	sessionId: string
): Promise<{
	id: string;
	status: string;
	customer: string;
	subscription: string;
	metadata: Record<string, string>;
}> {
	const response = await fetch(
		`https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=subscription`,
		{
			headers: {
				Authorization: `Bearer ${stripeSecretKey}`
			}
		}
	);

	if (!response.ok) {
		throw new Error('Failed to retrieve checkout session');
	}

	return response.json();
}

/**
 * Verify Stripe webhook signature
 */
export async function verifyWebhookSignature(
	payload: string,
	signature: string,
	secret: string
): Promise<boolean> {
	// Parse the signature header
	const parts = signature.split(',');
	const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
	const v1Signature = parts.find((p) => p.startsWith('v1='))?.slice(3);

	if (!timestamp || !v1Signature) {
		return false;
	}

	// Check timestamp (reject if > 5 minutes old)
	const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp);
	if (timestampAge > 300) {
		return false;
	}

	// Compute expected signature
	const signedPayload = `${timestamp}.${payload}`;
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
	const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	// Constant-time comparison
	if (expectedSignature.length !== v1Signature.length) {
		return false;
	}

	let result = 0;
	for (let i = 0; i < expectedSignature.length; i++) {
		result |= expectedSignature.charCodeAt(i) ^ v1Signature.charCodeAt(i);
	}

	return result === 0;
}
