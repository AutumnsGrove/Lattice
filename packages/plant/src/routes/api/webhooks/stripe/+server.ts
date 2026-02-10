/**
 * Stripe Webhook Handler
 *
 * Handles Stripe events for checkout completion and subscription updates.
 * Creates tenant on successful payment.
 *
 * Security: Webhook payloads are sanitized before storage to remove PII.
 * Retention: Webhooks auto-expire after 120 days via scheduled cleanup.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  verifyWebhookSignature,
  mapSubscriptionStatus,
  type StripeWebhookEvent,
  type StripeCheckoutSession,
  type StripeSubscription,
  type StripeInvoice,
  type PlanId,
} from "$lib/server/stripe";
import { createTenant, getTenantForOnboarding } from "$lib/server/tenant";
import { sendEmail } from "$lib/server/send-email";
import {
  getPaymentFailedEmail,
  getPaymentReceivedEmail,
} from "$lib/server/email-templates";
import {
  sanitizeWebhookPayload,
  calculateWebhookExpiry,
} from "@autumnsgrove/groveengine/utils";

export const POST: RequestHandler = async ({ request, platform }) => {
  const db = platform?.env?.DB;
  const webhookSecret = platform?.env?.STRIPE_WEBHOOK_SECRET;
  const zephyrApiKey = platform?.env?.ZEPHYR_API_KEY;
  const zephyrUrl = platform?.env?.ZEPHYR_URL;

  if (!db || !webhookSecret || !zephyrApiKey) {
    console.error("[Webhook] Missing configuration");
    return json({ error: "Configuration error" }, { status: 500 });
  }

  // Get the raw body and signature
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return json({ error: "Missing signature" }, { status: 400 });
  }

  // Verify signature
  const verification = await verifyWebhookSignature(
    payload,
    signature,
    webhookSecret,
  );

  if (!verification.valid || !verification.event) {
    console.error("[Webhook] Invalid signature:", verification.error);
    return json(
      { error: verification.error || "Invalid signature" },
      { status: 401 },
    );
  }

  const event = verification.event;
  const eventId = event.id;
  const eventType = event.type;

  // Check for duplicate events (idempotency)
  const existingEvent = await db
    .prepare(
      "SELECT id, processed FROM webhook_events WHERE provider_event_id = ?",
    )
    .bind(eventId)
    .first();

  if (existingEvent && existingEvent.processed === 1) {
    return json({ received: true, duplicate: true });
  }

  // Store the event or reuse existing failed event
  // Sanitize payload to remove PII before storing (GDPR/PCI DSS compliance)
  const sanitizedPayload = sanitizeWebhookPayload(event);

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
    webhookEventId = existingEvent.id as string;
    console.log(`[Webhook] Retrying event ${eventId}`);
  } else {
    webhookEventId = crypto.randomUUID();
    const expiresAt = calculateWebhookExpiry(); // 120 days from now

    await db
      .prepare(
        `INSERT INTO webhook_events (id, provider, provider_event_id, event_type, payload, created_at, expires_at)
         VALUES (?, 'stripe', ?, ?, ?, unixepoch(), ?)`,
      )
      .bind(webhookEventId, eventId, eventType, payloadToStore, expiresAt)
      .run();
  }

  try {
    console.log(`[Webhook] Processing event: ${eventType}`, {
      eventId,
      livemode: event.livemode,
    });

    switch (eventType) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(db, event);
        break;
      }

      case "customer.subscription.created": {
        // Subscription created - usually follows checkout.session.completed
        // We handle tenant creation in checkout.session.completed
        console.log(`[Webhook] Subscription created:`, event.data.object);
        break;
      }

      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(db, event);
        break;
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(db, event);
        break;
      }

      case "invoice.paid": {
        await handleInvoicePaid(db, event, zephyrApiKey, zephyrUrl);
        break;
      }

      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(db, event, zephyrApiKey, zephyrUrl);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`);
    }

    // Mark event as processed
    await db
      .prepare(
        "UPDATE webhook_events SET processed = 1, processed_at = unixepoch() WHERE id = ?",
      )
      .bind(webhookEventId)
      .run();

    return json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error processing event", {
      eventId,
      eventType,
      errorType: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    // Store error
    await db
      .prepare(
        "UPDATE webhook_events SET error = ?, retry_count = retry_count + 1 WHERE id = ?",
      )
      .bind(String(error), webhookEventId)
      .run();

    return json({ error: "Processing error" }, { status: 500 });
  }
};

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle checkout.session.completed event
 * This is called when a user completes Stripe Checkout
 */
async function handleCheckoutCompleted(
  db: D1Database,
  event: StripeWebhookEvent,
) {
  const session = event.data.object as StripeCheckoutSession;

  // Only process completed payments
  if (session.payment_status !== "paid") {
    console.log(
      `[Webhook] Checkout not paid yet: ${session.id}, status: ${session.payment_status}`,
    );
    return;
  }

  const onboardingId = session.metadata?.onboarding_id;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  if (!onboardingId) {
    console.error(
      "[Webhook] No onboarding_id in checkout.session.completed metadata",
    );
    return;
  }

  // Check if tenant already exists
  const existingTenant = await getTenantForOnboarding(db, onboardingId);
  if (existingTenant) {
    console.log(
      `[Webhook] Tenant already exists for onboarding ${onboardingId}`,
    );
    return;
  }

  // Get onboarding data
  const onboarding = await db
    .prepare(
      `SELECT id, username, display_name, email, plan_selected, favorite_color
       FROM user_onboarding WHERE id = ?`,
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
       WHERE id = ?`,
    )
    .bind(customerId, subscriptionId, onboardingId)
    .run();

  // Create the tenant with Stripe provider IDs
  await createTenant(db, {
    onboardingId: onboarding.id as string,
    username: onboarding.username as string,
    displayName: onboarding.display_name as string,
    email: onboarding.email as string,
    plan: onboarding.plan_selected as PlanId,
    favoriteColor: onboarding.favorite_color as string | null,
    providerCustomerId: customerId,
    providerSubscriptionId: subscriptionId || undefined,
  });

  console.log("[Webhook] Tenant created", {
    onboardingId: onboarding.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
  });
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(
  db: D1Database,
  event: StripeWebhookEvent,
) {
  const subscription = event.data.object as StripeSubscription;
  const subscriptionId = subscription.id;
  const status = mapSubscriptionStatus(subscription.status);

  // Update platform_billing status and period
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

  console.log(
    `[Webhook] Updated subscription ${subscriptionId} status to ${status}`,
  );
}

/**
 * Handle subscription deleted (cancelled) event
 */
async function handleSubscriptionDeleted(
  db: D1Database,
  event: StripeWebhookEvent,
) {
  const subscription = event.data.object as StripeSubscription;
  const subscriptionId = subscription.id;

  await db
    .prepare(
      `UPDATE platform_billing
       SET status = 'cancelled', updated_at = unixepoch()
       WHERE provider_subscription_id = ?`,
    )
    .bind(subscriptionId)
    .run();

  console.log(`[Webhook] Subscription ${subscriptionId} deleted/cancelled`);
}

/**
 * Handle invoice paid (successful payment/renewal)
 */
async function handleInvoicePaid(
  db: D1Database,
  event: StripeWebhookEvent,
  zephyrApiKey: string,
  zephyrUrl?: string,
) {
  const invoice = event.data.object as StripeInvoice;
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    // One-time payment, not a subscription
    return;
  }

  // Update billing record
  await db
    .prepare(
      `UPDATE platform_billing
       SET status = 'active', updated_at = unixepoch()
       WHERE provider_subscription_id = ?`,
    )
    .bind(subscriptionId)
    .run();

  // Only send welcome email for initial subscription payment, not renewals
  // billing_reason: subscription_create = first payment, subscription_cycle = renewal
  const isFirstPayment = invoice.billing_reason === "subscription_create";
  if (!isFirstPayment) {
    console.log(`[Webhook] Skipping email for renewal payment`, {
      subscriptionId,
      billingReason: invoice.billing_reason,
    });
    return;
  }

  // Get tenant info for the email
  const billing = await db
    .prepare(
      `SELECT t.id, t.subdomain, u.email, u.display_name, pb.plan,
              pb.current_period_end
       FROM platform_billing pb
       JOIN tenants t ON t.id = pb.tenant_id
       JOIN user_onboarding u ON u.id = t.onboarding_id
       WHERE pb.provider_subscription_id = ?`,
    )
    .bind(subscriptionId)
    .first();

  if (!billing) {
    console.error(
      `[Webhook] No tenant found for subscription ${subscriptionId}`,
    );
    return;
  }

  // Format amount (Stripe amounts are in cents)
  const amountFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: invoice.currency.toUpperCase(),
  }).format(invoice.amount_paid / 100);

  // Detect billing interval from invoice lines (first subscription item)
  const interval =
    invoice.lines?.data[0]?.price?.recurring?.interval || "month";

  // Send payment received email
  const email = getPaymentReceivedEmail({
    name: billing.display_name as string,
    subdomain: billing.subdomain as string,
    amount: amountFormatted,
    paymentDate: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    planName: billing.plan as string,
    interval: interval,
    nextPaymentDate: billing.current_period_end
      ? new Date(
          (billing.current_period_end as number) * 1000,
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Unknown",
    invoiceId: invoice.id,
  });

  const result = await sendEmail({
    to: billing.email as string,
    subject: email.subject,
    html: email.html,
    text: email.text,
    zephyrApiKey,
    zephyrUrl,
  });

  if (result.success) {
    console.log("[Webhook] Payment receipt sent", {
      subscriptionId,
      tenantId: billing.id,
    });
  } else {
    console.error("[Webhook] Failed to send payment receipt", {
      subscriptionId,
      tenantId: billing.id,
    });
  }
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(
  db: D1Database,
  event: StripeWebhookEvent,
  zephyrApiKey: string,
  zephyrUrl?: string,
) {
  const invoice = event.data.object as StripeInvoice;
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    return;
  }

  // Update status to past_due
  await db
    .prepare(
      `UPDATE platform_billing
       SET status = 'past_due', updated_at = unixepoch()
       WHERE provider_subscription_id = ?`,
    )
    .bind(subscriptionId)
    .run();

  // Get tenant info for the email
  const billing = await db
    .prepare(
      `SELECT t.id, t.subdomain, u.email, u.display_name
       FROM platform_billing pb
       JOIN tenants t ON t.id = pb.tenant_id
       JOIN user_onboarding u ON u.id = t.onboarding_id
       WHERE pb.provider_subscription_id = ?`,
    )
    .bind(subscriptionId)
    .first();

  if (!billing) {
    console.error(
      `[Webhook] No tenant found for subscription ${subscriptionId}`,
    );
    return;
  }

  // Send payment failed email
  const email = getPaymentFailedEmail({
    name: billing.display_name as string,
    subdomain: billing.subdomain as string,
  });

  const result = await sendEmail({
    to: billing.email as string,
    subject: email.subject,
    html: email.html,
    text: email.text,
    zephyrApiKey,
    zephyrUrl,
  });

  if (result.success) {
    console.log("[Webhook] Payment failed email sent", {
      subscriptionId,
      tenantId: billing.id,
    });
  } else {
    console.error("[Webhook] Failed to send payment failed email", {
      subscriptionId,
      tenantId: billing.id,
    });
  }
}
