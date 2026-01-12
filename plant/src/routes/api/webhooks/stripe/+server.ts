/**
 * Stripe Webhook Handler
 *
 * Handles Stripe events for checkout completion and subscription updates.
 * Creates tenant on successful payment.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { verifyWebhookSignature, getCheckoutSession } from "$lib/server/stripe";
import { createTenant, getTenantForOnboarding } from "$lib/server/tenant";
import { sendEmail } from "$lib/server/send-email";
import {
  getPaymentFailedEmail,
  getPaymentReceivedEmail,
  getTrialEndingSoonEmail,
} from "$lib/server/email-templates";

export const POST: RequestHandler = async ({ request, platform }) => {
  const db = platform?.env?.DB;
  const stripeSecretKey = platform?.env?.STRIPE_SECRET_KEY;
  const webhookSecret = platform?.env?.STRIPE_WEBHOOK_SECRET;
  const resendApiKey = platform?.env?.RESEND_API_KEY;

  if (!db || !stripeSecretKey || !webhookSecret || !resendApiKey) {
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
  let event: {
    id: string;
    type: string;
    data: { object: Record<string, unknown> };
  };

  try {
    event = JSON.parse(payload);
  } catch {
    return json({ error: "Invalid payload" }, { status: 400 });
  }

  // Check for duplicate events (idempotency)
  // Only skip if already successfully processed
  const existingEvent = await db
    .prepare(
      "SELECT id, processed FROM webhook_events WHERE provider_event_id = ?",
    )
    .bind(event.id)
    .first();

  if (existingEvent && existingEvent.processed === 1) {
    // Already successfully processed
    return json({ received: true, duplicate: true });
  }

  // Store the event or reuse existing failed event
  let webhookEventId: string;
  if (existingEvent) {
    // Reuse existing event ID for retry
    webhookEventId = existingEvent.id as string;
    console.log(`[Webhook] Retrying event ${event.id}`);
  } else {
    // Create new event
    webhookEventId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO webhook_events (id, provider, provider_event_id, event_type, payload, created_at)
         VALUES (?, 'stripe', ?, ?, ?, unixepoch())`,
      )
      .bind(webhookEventId, event.id, event.type, payload)
      .run();
  }

  try {
    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutComplete(
          db,
          stripeSecretKey,
          event.data.object as Record<string, unknown>,
        );
        break;
      }

      case "customer.subscription.updated": {
        await handleSubscriptionUpdate(
          db,
          event.data.object as Record<string, unknown>,
        );
        break;
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(
          db,
          event.data.object as Record<string, unknown>,
        );
        break;
      }

      case "invoice.payment_failed": {
        await handlePaymentFailed(
          db,
          event.data.object as Record<string, unknown>,
          resendApiKey,
        );
        break;
      }

      case "invoice.paid": {
        await handleInvoicePaid(
          db,
          event.data.object as Record<string, unknown>,
          resendApiKey,
        );
        break;
      }

      case "customer.subscription.trial_will_end": {
        await handleTrialWillEnd(
          db,
          event.data.object as Record<string, unknown>,
          resendApiKey,
        );
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
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
      eventId: event.id,
      eventType: event.type,
      errorType: error instanceof Error ? error.name : "Unknown",
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

/**
 * Validate required metadata fields
 */
function validateMetadata(
  metadata: Record<string, string> | null | undefined,
  requiredFields: string[],
): void {
  if (!metadata) {
    throw new Error("Missing metadata in event");
  }

  for (const field of requiredFields) {
    if (!metadata[field] || metadata[field].trim() === "") {
      throw new Error(`Missing or empty required metadata field: ${field}`);
    }
  }
}

/**
 * Handle successful checkout completion
 */
async function handleCheckoutComplete(
  db: D1Database,
  stripeSecretKey: string,
  session: Record<string, unknown>,
) {
  const sessionId = session.id as string;
  const metadata = session.metadata as Record<string, string> | undefined;

  // Validate required metadata
  try {
    validateMetadata(metadata, ["onboarding_id"]);
  } catch (error) {
    console.error("[Webhook] Metadata validation failed for checkout session", {
      sessionId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }

  const onboardingId = metadata!.onboarding_id;

  // Get full session details
  const fullSession = await getCheckoutSession(stripeSecretKey, sessionId);
  const customerId = fullSession.customer as string;

  // Extract subscription ID (Stripe returns expanded object when using expand[]=subscription)
  const subscriptionId =
    typeof fullSession.subscription === "string"
      ? fullSession.subscription
      : fullSession.subscription.id;

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

  // Create the tenant
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
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
  });

  console.log("[Webhook] Tenant created", {
    onboardingId: onboarding.id,
    stripeCustomerId: customerId,
  });
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(
  db: D1Database,
  subscription: Record<string, unknown>,
) {
  const subscriptionId = subscription.id as string;
  const status = subscription.status as string;

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
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(
  db: D1Database,
  subscription: Record<string, unknown>,
) {
  const subscriptionId = subscription.id as string;

  // Mark as canceled
  await db
    .prepare(
      `UPDATE platform_billing
			 SET status = 'canceled', updated_at = unixepoch()
			 WHERE provider_subscription_id = ?`,
    )
    .bind(subscriptionId)
    .run();

  console.log(`[Webhook] Subscription ${subscriptionId} canceled`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(
  db: D1Database,
  invoice: Record<string, unknown>,
  resendApiKey: string,
) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

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
      subscriptionId: subscriptionId,
      tenantId: billing.id,
    });
  } else {
    console.error("[Webhook] Failed to send payment failed email", {
      subscriptionId: subscriptionId,
      tenantId: billing.id,
    });
  }
}

/**
 * Handle successful invoice payment (recurring billing)
 */
async function handleInvoicePaid(
  db: D1Database,
  invoice: Record<string, unknown>,
  resendApiKey: string,
) {
  const subscriptionId = invoice.subscription as string;
  const amountPaid = invoice.amount_paid as number;
  const invoiceId = invoice.id as string;
  const lines = invoice.lines as
    | {
        data?: Array<{
          period?: { end?: number };
          plan?: { interval?: string; nickname?: string };
        }>;
      }
    | undefined;
  const periodEnd = lines?.data?.[0]?.period?.end;
  const planInterval = lines?.data?.[0]?.plan?.interval || "month";
  const planNickname = lines?.data?.[0]?.plan?.nickname || "Unknown Plan";

  if (!subscriptionId) return;

  // Update billing record with latest payment info
  await db
    .prepare(
      `UPDATE platform_billing
			 SET status = 'active',
			     current_period_end = ?,
			     updated_at = unixepoch()
			 WHERE provider_subscription_id = ?`,
    )
    .bind(periodEnd || null, subscriptionId)
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
    amount: (amountPaid / 100).toFixed(2),
    paymentDate: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    planName: planNickname,
    interval: planInterval,
    nextPaymentDate: periodEnd
      ? new Date(periodEnd * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Unknown",
    invoiceId,
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
      invoiceId: invoiceId,
      subscriptionId: subscriptionId,
      tenantId: billing.id,
    });
  } else {
    console.error("[Webhook] Failed to send payment receipt", {
      invoiceId: invoiceId,
      subscriptionId: subscriptionId,
      tenantId: billing.id,
    });
  }
}

/**
 * Handle trial ending soon (3 days before trial ends)
 */
async function handleTrialWillEnd(
  db: D1Database,
  subscription: Record<string, unknown>,
  resendApiKey: string,
) {
  const subscriptionId = subscription.id as string;
  const trialEnd = subscription.trial_end as number;
  const items = subscription.items as
    | {
        data?: Array<{
          price?: {
            unit_amount?: number;
            recurring?: { interval?: string };
            nickname?: string;
          };
        }>;
      }
    | undefined;
  const priceAmount = items?.data?.[0]?.price?.unit_amount || 0;
  const priceInterval = items?.data?.[0]?.price?.recurring?.interval || "month";
  const priceNickname = items?.data?.[0]?.price?.nickname || "Unknown Plan";

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

  const trialEndDateFull = new Date(trialEnd * 1000).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  const trialEndDay = new Date(trialEnd * 1000).toLocaleDateString("en-US", {
    weekday: "long",
  });

  // Send trial ending soon email
  const email = getTrialEndingSoonEmail({
    name: billing.display_name as string,
    subdomain: billing.subdomain as string,
    trialEndDay,
    trialEndDate: trialEndDateFull,
    planName: priceNickname,
    amount: (priceAmount / 100).toFixed(2).replace(".00", ""),
    interval: priceInterval,
  });

  const result = await sendEmail({
    to: billing.email as string,
    subject: email.subject,
    html: email.html,
    text: email.text,
    resendApiKey,
  });

  if (result.success) {
    console.log("[Webhook] Trial ending email sent", {
      subscriptionId: subscriptionId,
      tenantId: billing.id,
    });
  } else {
    console.error("[Webhook] Failed to send trial ending email", {
      subscriptionId: subscriptionId,
      tenantId: billing.id,
    });
  }
}
