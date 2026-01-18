/**
 * Lemon Squeezy Webhook Handler
 *
 * Handles Lemon Squeezy events for checkout completion and subscription updates.
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
  type LemonSqueezyWebhookPayload,
  type LemonSqueezyEventName,
} from "$lib/server/lemonsqueezy";
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
  const webhookSecret = platform?.env?.LEMON_SQUEEZY_WEBHOOK_SECRET;
  const resendApiKey = platform?.env?.RESEND_API_KEY;

  if (!db || !webhookSecret || !resendApiKey) {
    console.error("[Webhook] Missing configuration");
    return json({ error: "Configuration error" }, { status: 500 });
  }

  // Get the raw body and signature
  const payload = await request.text();
  const signature = request.headers.get("x-signature");

  if (!signature) {
    return json({ error: "Missing signature" }, { status: 400 });
  }

  // Verify signature
  const isValid = await verifyWebhookSignature(
    payload,
    signature,
    webhookSecret,
  );
  if (!isValid) {
    console.error("[Webhook] Invalid signature");
    return json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse the event
  let event: LemonSqueezyWebhookPayload;
  try {
    event = JSON.parse(payload);
  } catch {
    return json({ error: "Invalid payload" }, { status: 400 });
  }

  const eventName = event.meta.event_name;
  const eventId = event.data.id;

  // Check for duplicate events (idempotency)
  const existingEvent = await db
    .prepare(
      "SELECT id, processed FROM webhook_events WHERE provider_event_id = ?",
    )
    .bind(`ls_${eventId}_${eventName}`)
    .first();

  if (existingEvent && existingEvent.processed === 1) {
    return json({ received: true, duplicate: true });
  }

  // Store the event or reuse existing failed event
  // Sanitize payload to remove PII before storing (GDPR/PCI DSS compliance)
  const sanitizedPayload = sanitizeWebhookPayload(event);

  // If sanitization fails, log warning and preserve minimal safe data for debugging/audit
  if (!sanitizedPayload) {
    console.warn("[Webhook] PII sanitization failed for event:", eventName, {
      eventId,
      testMode: event.meta?.test_mode,
    });
  }

  // (event_name, test_mode, id, type are safe - no PII)
  // Type guards ensure we only store expected types even if API structure changes
  const payloadToStore = sanitizedPayload
    ? JSON.stringify(sanitizedPayload)
    : JSON.stringify({
        meta: {
          event_name: typeof eventName === "string" ? eventName : "unknown",
          test_mode:
            typeof event.meta?.test_mode === "boolean"
              ? event.meta.test_mode
              : false,
        },
        data: {
          id: typeof event.data?.id === "string" ? event.data.id : "unknown",
          type:
            typeof event.data?.type === "string" ? event.data.type : "unknown",
        },
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
         VALUES (?, 'lemonsqueezy', ?, ?, ?, unixepoch(), ?)`,
      )
      .bind(
        webhookEventId,
        `ls_${eventId}_${eventName}`,
        eventName,
        payloadToStore,
        expiresAt,
      )
      .run();
  }

  try {
    console.log(`[Webhook] Processing event: ${eventName}`, {
      eventId,
      testMode: event.meta.test_mode,
      customData: event.meta.custom_data,
    });

    switch (eventName) {
      case "subscription_created": {
        await handleSubscriptionCreated(db, event);
        break;
      }

      case "subscription_updated":
      case "subscription_plan_changed": {
        await handleSubscriptionUpdated(db, event);
        break;
      }

      case "subscription_cancelled":
      case "subscription_expired": {
        await handleSubscriptionCancelled(db, event);
        break;
      }

      case "subscription_payment_failed": {
        await handlePaymentFailed(db, event, resendApiKey);
        break;
      }

      case "subscription_payment_success":
      case "subscription_payment_recovered": {
        await handlePaymentSuccess(db, event, resendApiKey);
        break;
      }

      case "subscription_paused": {
        await handleSubscriptionPaused(db, event);
        break;
      }

      case "subscription_unpaused":
      case "subscription_resumed": {
        await handleSubscriptionResumed(db, event);
        break;
      }

      case "order_created": {
        // Order events are typically for one-time purchases
        // For subscriptions, we handle via subscription_created
        console.log(`[Webhook] Order created: ${eventId}`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${eventName}`);
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
      eventName,
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
 * Handle subscription created event
 * This is called when a user completes checkout and their subscription starts
 */
async function handleSubscriptionCreated(
  db: D1Database,
  event: LemonSqueezyWebhookPayload,
) {
  const attrs = event.data.attributes as {
    customer_id: number;
    product_id: number;
    variant_id: number;
    product_name: string;
    variant_name: string;
    user_email: string;
    status: string;
    renews_at: string;
    ends_at: string | null;
    trial_ends_at: string | null;
    created_at: string;
    updated_at: string;
  };

  const subscriptionId = event.data.id;
  const customerId = String(attrs.customer_id);
  const customData = event.meta.custom_data;
  const onboardingId = customData?.onboarding_id as string | undefined;

  if (!onboardingId) {
    console.error(
      "[Webhook] No onboarding_id in subscription_created custom_data",
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

  // Update onboarding with Lemon Squeezy IDs and payment status
  await db
    .prepare(
      `UPDATE user_onboarding
       SET lemonsqueezy_customer_id = ?,
           lemonsqueezy_subscription_id = ?,
           payment_completed_at = unixepoch(),
           updated_at = unixepoch()
       WHERE id = ?`,
    )
    .bind(customerId, subscriptionId, onboardingId)
    .run();

  // Create the tenant with Lemon Squeezy provider IDs
  await createTenant(db, {
    onboardingId: onboarding.id as string,
    username: onboarding.username as string,
    displayName: onboarding.display_name as string,
    email: onboarding.email as string,
    plan: onboarding.plan_selected as
      | "seedling"
      | "sapling"
      | "oak"
      | "evergreen",
    favoriteColor: onboarding.favorite_color as string | null,
    providerCustomerId: customerId,
    providerSubscriptionId: subscriptionId,
  });

  console.log("[Webhook] Tenant created", {
    onboardingId: onboarding.id,
    lemonSqueezyCustomerId: customerId,
    lemonSqueezySubscriptionId: subscriptionId,
  });
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(
  db: D1Database,
  event: LemonSqueezyWebhookPayload,
) {
  const attrs = event.data.attributes as {
    status: string;
    renews_at: string;
    ends_at: string | null;
    variant_id: number;
    variant_name: string;
  };

  const subscriptionId = event.data.id;
  const status = mapSubscriptionStatus(attrs.status);

  // Update platform_billing status
  await db
    .prepare(
      `UPDATE platform_billing
       SET status = ?, updated_at = unixepoch()
       WHERE provider_subscription_id = ?`,
    )
    .bind(status, subscriptionId)
    .run();

  console.log(
    `[Webhook] Updated subscription ${subscriptionId} status to ${status}`,
  );
}

/**
 * Handle subscription cancellation or expiration
 */
async function handleSubscriptionCancelled(
  db: D1Database,
  event: LemonSqueezyWebhookPayload,
) {
  const subscriptionId = event.data.id;

  await db
    .prepare(
      `UPDATE platform_billing
       SET status = 'cancelled', updated_at = unixepoch()
       WHERE provider_subscription_id = ?`,
    )
    .bind(subscriptionId)
    .run();

  console.log(`[Webhook] Subscription ${subscriptionId} cancelled`);
}

/**
 * Handle subscription paused
 */
async function handleSubscriptionPaused(
  db: D1Database,
  event: LemonSqueezyWebhookPayload,
) {
  const subscriptionId = event.data.id;

  await db
    .prepare(
      `UPDATE platform_billing
       SET status = 'paused', updated_at = unixepoch()
       WHERE provider_subscription_id = ?`,
    )
    .bind(subscriptionId)
    .run();

  console.log(`[Webhook] Subscription ${subscriptionId} paused`);
}

/**
 * Handle subscription resumed
 */
async function handleSubscriptionResumed(
  db: D1Database,
  event: LemonSqueezyWebhookPayload,
) {
  const attrs = event.data.attributes as { status: string };
  const subscriptionId = event.data.id;
  const status = mapSubscriptionStatus(attrs.status);

  await db
    .prepare(
      `UPDATE platform_billing
       SET status = ?, updated_at = unixepoch()
       WHERE provider_subscription_id = ?`,
    )
    .bind(status, subscriptionId)
    .run();

  console.log(
    `[Webhook] Subscription ${subscriptionId} resumed, status: ${status}`,
  );
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(
  db: D1Database,
  event: LemonSqueezyWebhookPayload,
  resendApiKey: string,
) {
  const subscriptionId = event.data.id;

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
    resendApiKey,
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

/**
 * Handle successful payment (renewal)
 */
async function handlePaymentSuccess(
  db: D1Database,
  event: LemonSqueezyWebhookPayload,
  resendApiKey: string,
) {
  const attrs = event.data.attributes as {
    status: string;
    renews_at: string;
    variant_name: string;
  };
  const subscriptionId = event.data.id;

  // Parse renews_at to Unix timestamp
  const renewsAt = attrs.renews_at
    ? Math.floor(new Date(attrs.renews_at).getTime() / 1000)
    : null;

  // Update billing record
  await db
    .prepare(
      `UPDATE platform_billing
       SET status = 'active',
           current_period_end = ?,
           updated_at = unixepoch()
       WHERE provider_subscription_id = ?`,
    )
    .bind(renewsAt, subscriptionId)
    .run();

  // Get tenant info for the email
  const billing = await db
    .prepare(
      `SELECT t.id, t.subdomain, u.email, u.display_name, pb.plan
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

  // Send payment received email
  const email = getPaymentReceivedEmail({
    name: billing.display_name as string,
    subdomain: billing.subdomain as string,
    amount: "subscription", // LS doesn't include amount in webhook
    paymentDate: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    planName: attrs.variant_name || (billing.plan as string),
    interval: "month",
    nextPaymentDate: renewsAt
      ? new Date(renewsAt * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Unknown",
    invoiceId: `ls_${subscriptionId}`,
  });

  const result = await sendEmail({
    to: billing.email as string,
    subject: email.subject,
    html: email.html,
    text: email.text,
    resendApiKey,
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
