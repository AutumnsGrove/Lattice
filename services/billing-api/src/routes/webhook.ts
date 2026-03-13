/**
 * POST /webhook — Stripe webhook handler
 *
 * Receives webhook events, verifies signature, checks idempotency,
 * and processes billing events. Sanitizes payloads before storage.
 *
 * Handled event types:
 *   - checkout.session.completed  (new signup or upgrade)
 *   - customer.subscription.updated (status/period sync)
 *   - customer.subscription.deleted (cancellation)
 *   - invoice.paid (payment received)
 *   - invoice.payment_failed (payment failed)
 */

import { Hono } from "hono";
import type { Env, OnboardingRecord } from "../types.js";
import { BILLING_ERRORS, billingError } from "../errors.js";
import { StripeClient } from "../stripe/client.js";
import type {
	StripeEvent,
	StripeCheckoutSession,
	StripeSubscription,
	StripeInvoice,
} from "../stripe/types.js";
import { checkRateLimit, RATE_LIMITS, extractClientIP } from "../middleware/rateLimit.js";
import { sanitizeStripeWebhookPayload, calculateWebhookExpiry } from "../utils/sanitizer.js";
import { mapSubscriptionStatus } from "../utils/validation.js";
import { createTenant, getTenantForOnboarding } from "../services/tenant.js";
import { sendPaymentReceivedEmail, sendPaymentFailedEmail } from "../services/email.js";

const webhook = new Hono<{ Bindings: Env }>();

// Rate limiting is applied AFTER signature verification (see below).
// Invalid signatures are rejected cheaply by HMAC (~0.1ms), so we don't
// want attacker traffic with forged signatures consuming the rate limit
// budget that legitimate Stripe webhooks need.

webhook.post("/", async (c) => {
	const db = c.env.DB;
	const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;

	if (!webhookSecret) {
		console.error("[Webhook] STRIPE_WEBHOOK_SECRET not configured");
		return billingError(BILLING_ERRORS.STRIPE_ERROR, "Webhook not configured");
	}

	// Get raw body and signature
	const payload = await c.req.text();
	const signature = c.req.header("stripe-signature");

	if (!signature) {
		return c.json({ error: "Missing signature" }, 400);
	}

	// Verify signature FIRST — cheap HMAC check rejects forged requests
	const stripe = new StripeClient(c.env.STRIPE_SECRET_KEY);
	const verification = await stripe.verifyWebhookSignature(payload, signature, webhookSecret);

	if (!verification.valid || !verification.event) {
		console.error("[Webhook] Signature verification failed:", verification.error);
		return c.json({ error: verification.error || "Invalid signature" }, 401);
	}

	// Rate limit AFTER verification — only verified Stripe events count
	const kv = c.env.CACHE_KV;
	if (kv) {
		const ip = extractClientIP(c);
		const rlResult = await checkRateLimit(kv, ip, RATE_LIMITS.webhook);
		if (!rlResult.allowed) {
			return billingError(BILLING_ERRORS.RATE_LIMITED);
		}
	}

	const event = verification.event as StripeEvent;
	const eventId = event.id;
	const eventType = event.type;

	// Idempotency: Stripe may deliver the same event multiple times (network retries,
	// endpoint timeouts). We check webhook_events to skip already-processed events and
	// to resume partially-processed ones (existingEvent with processed=0).
	const existingEvent = await db
		.prepare("SELECT id, processed FROM webhook_events WHERE provider_event_id = ?")
		.bind(eventId)
		.first<{ id: string; processed: number }>();

	if (existingEvent && existingEvent.processed === 1) {
		return c.json({ received: true, duplicate: true });
	}

	// Strip PII/PCI fields before storage (card numbers, emails, names).
	// If sanitization fails, store a minimal skeleton so we still have an audit
	// trail and can manually investigate without leaking sensitive data.
	const sanitizedPayload = sanitizeStripeWebhookPayload(event);
	const payloadToStore = sanitizedPayload
		? JSON.stringify(sanitizedPayload)
		: JSON.stringify({
				id: event.id,
				type: event.type,
				created: event.created,
				livemode: event.livemode,
				_sanitization_failed: true,
			});

	let webhookEventId: string;
	if (existingEvent) {
		// Event was stored but processing failed on a previous attempt —
		// reuse the same row so retry_count tracks consecutive failures.
		webhookEventId = existingEvent.id;
		console.log(`[Webhook] Retrying event ${eventId}`);
	} else {
		webhookEventId = crypto.randomUUID();
		const expiresAt = calculateWebhookExpiry();

		await db
			.prepare(
				`INSERT INTO webhook_events (id, provider, provider_event_id, event_type, payload, created_at, expires_at)
         VALUES (?, 'stripe', ?, ?, ?, unixepoch(), ?)`,
			)
			.bind(webhookEventId, eventId, eventType, payloadToStore, expiresAt)
			.run();
	}

	// Process the event
	try {
		console.log(`[Webhook] Processing: ${eventType}`, {
			eventId,
			livemode: event.livemode,
		});

		switch (eventType) {
			case "checkout.session.completed":
				await handleCheckoutCompleted(db, event);
				break;

			case "customer.subscription.updated":
				await handleSubscriptionUpdated(db, event);
				break;

			case "customer.subscription.deleted":
				await handleSubscriptionDeleted(db, event);
				break;

			case "invoice.paid":
				await handleInvoicePaid(db, event, c.env.ZEPHYR);
				break;

			case "invoice.payment_failed":
				await handleInvoicePaymentFailed(db, event, c.env.ZEPHYR);
				break;

			default:
				console.log(`[Webhook] Unhandled event type: ${eventType}`);
		}

		// Mark event as processed
		await db
			.prepare("UPDATE webhook_events SET processed = 1, processed_at = unixepoch() WHERE id = ?")
			.bind(webhookEventId)
			.run();

		return c.json({ received: true });
	} catch (error) {
		console.error(`[Webhook] Processing error for ${eventType} (${eventId}):`, error);

		// Truncate to 200 chars — Stripe errors can embed customer emails, card
		// details, or request IDs that we don't want persisted in our DB.
		// Strip potential PII (emails, customer IDs) from error messages before D1 storage.
		// Stripe errors can embed "No such customer: cus_xxx for email foo@bar.com".
		const safeError =
			error instanceof Error
				? error.message.replace(/\S+@\S+\.\S+/g, "[email]").slice(0, 200)
				: "Processing error";
		await db
			.prepare("UPDATE webhook_events SET error = ?, retry_count = retry_count + 1 WHERE id = ?")
			.bind(safeError, webhookEventId)
			.run();

		return c.json({ error: "Processing error" }, 500);
	}
});

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle checkout.session.completed
 * Creates tenant for new signups, updates billing for upgrades.
 */
async function handleCheckoutCompleted(db: D1Database, event: StripeEvent): Promise<void> {
	const session = event.data.object as StripeCheckoutSession;

	if (session.payment_status !== "paid") {
		console.log(`[Webhook] Checkout not paid: ${session.id}`);
		return;
	}

	const onboardingId = session.metadata?.onboarding_id;
	const tenantIdFromMeta = session.metadata?.tenant_id;
	const customerId = session.customer;
	const subscriptionId = session.subscription;

	if (onboardingId) {
		// New signup flow — create tenant
		const existingTenant = await getTenantForOnboarding(db, onboardingId);
		if (existingTenant) {
			console.log(`[Webhook] Tenant already exists for onboarding ${onboardingId}`);
			return;
		}

		const onboarding = await db
			.prepare(
				`SELECT id, username, display_name, email, plan_selected, favorite_color
         FROM user_onboarding WHERE id = ?`,
			)
			.bind(onboardingId)
			.first<OnboardingRecord>();

		if (!onboarding) {
			console.error(`[Webhook] Onboarding not found: ${onboardingId}`);
			return;
		}

		// Update onboarding with Stripe IDs
		await db
			.prepare(
				`UPDATE user_onboarding
         SET stripe_customer_id = ?,
             stripe_subscription_id = ?,
             payment_completed_at = unixepoch(),
             updated_at = unixepoch()
         WHERE id = ?`,
			)
			.bind(customerId || null, subscriptionId || null, onboardingId)
			.run();

		// Create the tenant
		await createTenant(db, {
			onboardingId: onboarding.id,
			username: onboarding.username,
			displayName: onboarding.display_name,
			email: onboarding.email,
			plan: session.metadata?.plan || onboarding.plan_selected,
			favoriteColor: onboarding.favorite_color,
			providerCustomerId: customerId,
			providerSubscriptionId: subscriptionId,
		});

		console.log("[Webhook] Tenant created via checkout", {
			onboardingId,
			customerId,
			subscriptionId,
		});
	} else if (tenantIdFromMeta) {
		// Upgrade flow — update existing tenant billing
		const plan = session.metadata?.plan;
		if (!plan) {
			console.error("[Webhook] No plan in checkout metadata for upgrade");
			return;
		}

		// Upsert: a tenant upgrading may or may not already have a platform_billing row
		// (e.g., comped accounts have a row with no Stripe IDs). ON CONFLICT collapses
		// what would be a SELECT + conditional INSERT/UPDATE into a single D1 round-trip.
		await db
			.prepare(
				`INSERT INTO platform_billing (id, tenant_id, plan, status, provider_customer_id, provider_subscription_id, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?, unixepoch(), unixepoch())
         ON CONFLICT(tenant_id) DO UPDATE SET
           plan = excluded.plan,
           status = 'active',
           provider_customer_id = excluded.provider_customer_id,
           provider_subscription_id = excluded.provider_subscription_id,
           updated_at = unixepoch()`,
			)
			.bind(crypto.randomUUID(), tenantIdFromMeta, plan, customerId || null, subscriptionId || null)
			.run();

		// Update tenant plan
		await db
			.prepare("UPDATE tenants SET plan = ?, updated_at = unixepoch() WHERE id = ?")
			.bind(plan, tenantIdFromMeta)
			.run();

		console.log("[Webhook] Tenant upgraded", {
			tenantId: tenantIdFromMeta,
			plan,
		});
	} else {
		console.error("[Webhook] checkout.session.completed missing onboarding_id and tenant_id");
	}
}

/**
 * Handle customer.subscription.updated
 * Syncs status, period dates, and cancellation flag.
 */
async function handleSubscriptionUpdated(db: D1Database, event: StripeEvent): Promise<void> {
	const subscription = event.data.object as StripeSubscription;
	const subscriptionId = subscription.id;
	const status = mapSubscriptionStatus(subscription.status);

	await db
		.prepare(
			`UPDATE platform_billing
       SET status = ?,
           current_period_start = ?,
           current_period_end = ?,
           cancel_at_period_end = ?,
           updated_at = unixepoch()
       WHERE provider_subscription_id = ?`,
		)
		.bind(
			status,
			subscription.current_period_start,
			subscription.current_period_end,
			subscription.cancel_at_period_end ? 1 : 0,
			subscriptionId,
		)
		.run();

	console.log(`[Webhook] Subscription updated: ${subscriptionId} -> ${status}`);
}

/**
 * Handle customer.subscription.deleted
 * Sets status to cancelled.
 */
async function handleSubscriptionDeleted(db: D1Database, event: StripeEvent): Promise<void> {
	const subscription = event.data.object as StripeSubscription;

	await db
		.prepare(
			`UPDATE platform_billing
       SET status = 'cancelled', updated_at = unixepoch()
       WHERE provider_subscription_id = ?`,
		)
		.bind(subscription.id)
		.run();

	console.log(`[Webhook] Subscription deleted: ${subscription.id}`);
}

/**
 * Handle invoice.paid
 * Sets status to active, sends receipt email on first payment.
 */
async function handleInvoicePaid(
	db: D1Database,
	event: StripeEvent,
	zephyr: Fetcher | undefined,
): Promise<void> {
	const invoice = event.data.object as StripeInvoice;
	const subscriptionId = invoice.subscription;

	if (!subscriptionId) return; // One-time payment, not subscription

	const isFirstPayment = invoice.billing_reason === "subscription_create";

	// Parallel: the status UPDATE and the tenant lookup are independent operations.
	// We only need the tenant data for the email, and only on first payment —
	// the conditional prevents the JOIN query from running on renewals.
	const [, billing] = await Promise.all([
		db
			.prepare(
				`UPDATE platform_billing
         SET status = 'active', updated_at = unixepoch()
         WHERE provider_subscription_id = ?`,
			)
			.bind(subscriptionId)
			.run(),
		isFirstPayment && zephyr
			? db
					.prepare(
						`SELECT t.id, t.subdomain, u.email, u.display_name, pb.plan,
                    pb.current_period_end
             FROM platform_billing pb
             JOIN tenants t ON t.id = pb.tenant_id
             JOIN user_onboarding u ON u.id = t.onboarding_id
             WHERE pb.provider_subscription_id = ?`,
					)
					.bind(subscriptionId)
					.first<{
						id: string;
						subdomain: string;
						email: string;
						display_name: string;
						plan: string;
						current_period_end: number | null;
					}>()
			: Promise.resolve(null),
	]);

	// Renewals generate invoice.paid too, but we only email on subscription_create.
	// Renewal receipts come from Stripe's built-in receipt emails.
	if (!isFirstPayment || !zephyr) {
		return;
	}

	if (!billing) {
		console.error(`[Webhook] No tenant for subscription ${subscriptionId}`);
		return;
	}

	const amountFormatted = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: invoice.currency.toUpperCase(),
	}).format(invoice.amount_paid / 100);

	const interval = invoice.lines?.data[0]?.price?.recurring?.interval || "month";

	await sendPaymentReceivedEmail(zephyr, {
		to: billing.email,
		name: billing.display_name,
		subdomain: billing.subdomain,
		amount: amountFormatted,
		paymentDate: new Date().toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		}),
		planName: billing.plan,
		interval,
		nextPaymentDate: billing.current_period_end
			? new Date(billing.current_period_end * 1000).toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				})
			: "Unknown",
		invoiceId: invoice.id,
	});
}

/**
 * Handle invoice.payment_failed
 * Sets status to past_due, sends failure notification email.
 */
async function handleInvoicePaymentFailed(
	db: D1Database,
	event: StripeEvent,
	zephyr: Fetcher | undefined,
): Promise<void> {
	const invoice = event.data.object as StripeInvoice;
	const subscriptionId = invoice.subscription;

	if (!subscriptionId) return;

	// Run DB update and tenant lookup in parallel — SELECT doesn't depend on UPDATE
	const [, billing] = await Promise.all([
		db
			.prepare(
				`UPDATE platform_billing
         SET status = 'past_due', updated_at = unixepoch()
         WHERE provider_subscription_id = ?`,
			)
			.bind(subscriptionId)
			.run(),
		zephyr
			? db
					.prepare(
						`SELECT t.id, t.subdomain, u.email, u.display_name
             FROM platform_billing pb
             JOIN tenants t ON t.id = pb.tenant_id
             JOIN user_onboarding u ON u.id = t.onboarding_id
             WHERE pb.provider_subscription_id = ?`,
					)
					.bind(subscriptionId)
					.first<{
						id: string;
						subdomain: string;
						email: string;
						display_name: string;
					}>()
			: Promise.resolve(null),
	]);

	if (!zephyr || !billing) {
		if (zephyr && !billing) {
			console.error(`[Webhook] No tenant for subscription ${subscriptionId}`);
		}
		return;
	}

	await sendPaymentFailedEmail(zephyr, {
		to: billing.email,
		name: billing.display_name,
		subdomain: billing.subdomain,
	});
}

export default webhook;
