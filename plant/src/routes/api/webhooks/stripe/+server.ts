/**
 * Stripe Webhook Handler
 *
 * Handles Stripe events for checkout completion and subscription updates.
 * Creates tenant on successful payment.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyWebhookSignature, getCheckoutSession } from '$lib/server/stripe';
import { createTenant, getTenantForOnboarding } from '$lib/server/tenant';

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;
	const stripeSecretKey = platform?.env?.STRIPE_SECRET_KEY;
	const webhookSecret = platform?.env?.STRIPE_WEBHOOK_SECRET;

	if (!db || !stripeSecretKey || !webhookSecret) {
		console.error('[Webhook] Missing configuration');
		return json({ error: 'Configuration error' }, { status: 500 });
	}

	// Get the raw body and signature
	const payload = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		return json({ error: 'Missing signature' }, { status: 400 });
	}

	// Verify signature
	const isValid = await verifyWebhookSignature(payload, signature, webhookSecret);
	if (!isValid) {
		console.error('[Webhook] Invalid signature');
		return json({ error: 'Invalid signature' }, { status: 401 });
	}

	// Parse the event
	let event: {
		id: string;
		type: string;
		data: { object: Record<string, unknown> };
	};

	try {
		event = JSON.parse(payload);
	} catch {
		return json({ error: 'Invalid payload' }, { status: 400 });
	}

	// Check for duplicate events (idempotency)
	const existingEvent = await db
		.prepare('SELECT id FROM webhook_events WHERE provider_event_id = ?')
		.bind(event.id)
		.first();

	if (existingEvent) {
		// Already processed
		return json({ received: true, duplicate: true });
	}

	// Store the event
	const webhookEventId = crypto.randomUUID();
	await db
		.prepare(
			`INSERT INTO webhook_events (id, provider, provider_event_id, event_type, payload, created_at)
			 VALUES (?, 'stripe', ?, ?, ?, unixepoch())`
		)
		.bind(webhookEventId, event.id, event.type, payload)
		.run();

	try {
		// Handle the event
		switch (event.type) {
			case 'checkout.session.completed': {
				await handleCheckoutComplete(db, stripeSecretKey, event.data.object as Record<string, unknown>);
				break;
			}

			case 'customer.subscription.updated': {
				await handleSubscriptionUpdate(db, event.data.object as Record<string, unknown>);
				break;
			}

			case 'customer.subscription.deleted': {
				await handleSubscriptionDeleted(db, event.data.object as Record<string, unknown>);
				break;
			}

			case 'invoice.payment_failed': {
				await handlePaymentFailed(db, event.data.object as Record<string, unknown>);
				break;
			}

			default:
				console.log(`[Webhook] Unhandled event type: ${event.type}`);
		}

		// Mark event as processed
		await db
			.prepare('UPDATE webhook_events SET processed = 1, processed_at = unixepoch() WHERE id = ?')
			.bind(webhookEventId)
			.run();

		return json({ received: true });
	} catch (error) {
		console.error('[Webhook] Error processing event:', error);

		// Store error
		await db
			.prepare('UPDATE webhook_events SET error = ?, retry_count = retry_count + 1 WHERE id = ?')
			.bind(String(error), webhookEventId)
			.run();

		return json({ error: 'Processing error' }, { status: 500 });
	}
};

/**
 * Handle successful checkout completion
 */
async function handleCheckoutComplete(
	db: D1Database,
	stripeSecretKey: string,
	session: Record<string, unknown>
) {
	const sessionId = session.id as string;
	const metadata = session.metadata as Record<string, string>;
	const onboardingId = metadata?.onboarding_id;

	if (!onboardingId) {
		console.error('[Webhook] No onboarding_id in checkout session metadata');
		return;
	}

	// Get full session details
	const fullSession = await getCheckoutSession(stripeSecretKey, sessionId);
	const customerId = fullSession.customer as string;
	const subscriptionId = fullSession.subscription as string;

	// Check if tenant already exists
	const existingTenant = await getTenantForOnboarding(db, onboardingId);
	if (existingTenant) {
		console.log(`[Webhook] Tenant already exists for onboarding ${onboardingId}`);
		return;
	}

	// Get onboarding data
	const onboarding = await db
		.prepare(
			`SELECT id, username, display_name, email, plan_selected, favorite_color
			 FROM user_onboarding WHERE id = ?`
		)
		.bind(onboardingId)
		.first();

	if (!onboarding) {
		console.error(`[Webhook] Onboarding record not found: ${onboardingId}`);
		return;
	}

	// Update onboarding with Stripe IDs and payment status
	await db
		.prepare(
			`UPDATE user_onboarding
			 SET stripe_customer_id = ?,
					 stripe_subscription_id = ?,
					 payment_completed_at = unixepoch(),
					 updated_at = unixepoch()
			 WHERE id = ?`
		)
		.bind(customerId, subscriptionId, onboardingId)
		.run();

	// Create the tenant
	await createTenant(db, {
		onboardingId: onboarding.id as string,
		username: onboarding.username as string,
		displayName: onboarding.display_name as string,
		email: onboarding.email as string,
		plan: onboarding.plan_selected as 'seedling' | 'sapling' | 'oak' | 'evergreen',
		favoriteColor: onboarding.favorite_color as string | null,
		stripeCustomerId: customerId,
		stripeSubscriptionId: subscriptionId
	});

	console.log(`[Webhook] Created tenant for ${onboarding.username}`);
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(db: D1Database, subscription: Record<string, unknown>) {
	const subscriptionId = subscription.id as string;
	const status = subscription.status as string;

	// Update platform_billing status
	await db
		.prepare(
			`UPDATE platform_billing
			 SET status = ?, updated_at = unixepoch()
			 WHERE provider_subscription_id = ?`
		)
		.bind(status, subscriptionId)
		.run();

	console.log(`[Webhook] Updated subscription ${subscriptionId} status to ${status}`);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(db: D1Database, subscription: Record<string, unknown>) {
	const subscriptionId = subscription.id as string;

	// Mark as canceled
	await db
		.prepare(
			`UPDATE platform_billing
			 SET status = 'canceled', updated_at = unixepoch()
			 WHERE provider_subscription_id = ?`
		)
		.bind(subscriptionId)
		.run();

	console.log(`[Webhook] Subscription ${subscriptionId} canceled`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(db: D1Database, invoice: Record<string, unknown>) {
	const subscriptionId = invoice.subscription as string;

	if (!subscriptionId) return;

	// Update status to past_due
	await db
		.prepare(
			`UPDATE platform_billing
			 SET status = 'past_due', updated_at = unixepoch()
			 WHERE provider_subscription_id = ?`
		)
		.bind(subscriptionId)
		.run();

	// TODO: Send notification email to user
	console.log(`[Webhook] Payment failed for subscription ${subscriptionId}`);
}
