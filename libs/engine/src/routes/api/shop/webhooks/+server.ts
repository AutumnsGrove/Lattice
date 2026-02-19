import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { OrderStatus, PaymentStatus } from "$lib/payments/types";
import { createPaymentProvider } from "$lib/payments";
import {
  getOrderBySessionId,
  updateOrderStatus,
  updateCustomer,
  getOrCreateCustomer,
} from "$lib/payments/shop";
import {
  sanitizeWebhookPayload,
  calculateWebhookExpiry,
} from "$lib/utils/webhook-sanitizer";
import { API_ERRORS, throwGroveError } from "$lib/errors";

// Shop e-commerce feature is temporarily disabled - deferred to Phase 5 (Grove Social and beyond)
// Note: This webhook endpoint remains ENABLED because it handles platform billing subscription events
// Only shop-specific handlers (orders, refunds, Connect accounts) are disabled
const SHOP_ECOMMERCE_DISABLED = true;

/**
 * POST /api/shop/webhooks - Handle Stripe webhooks
 *
 * This endpoint receives webhooks from Stripe for:
 * - checkout.session.completed - Payment successful (DISABLED for shop orders, platform billing handled separately)
 * - checkout.session.expired - Checkout expired (DISABLED for shop)
 * - payment_intent.succeeded - Payment confirmed (DISABLED for shop)
 * - payment_intent.payment_failed - Payment failed (DISABLED for shop)
 * - customer.subscription.* - Subscription events (ENABLED - needed for platform billing)
 * - invoice.* - Invoice events
 *
 * For Stripe Connect (DISABLED):
 * - account.updated - Connected account status changes
 */
export const POST: RequestHandler = async ({ request, platform }) => {
  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throwGroveError(500, API_ERRORS.PAYMENT_PROVIDER_NOT_CONFIGURED, "API");
  }

  if (!platform?.env?.STRIPE_WEBHOOK_SECRET) {
    throwGroveError(500, API_ERRORS.WEBHOOK_SECRET_NOT_CONFIGURED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  try {
    // Initialize Stripe provider
    const stripe = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
      webhookSecret: platform.env.STRIPE_WEBHOOK_SECRET,
    });

    // Verify and parse webhook
    const result = await stripe.handleWebhook(request);

    if (!result.received) {
      console.error("Webhook verification failed:", result.error);
      throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
    }

    const event = result.event!;
    const eventData = event.data as Record<string, any>;

    console.log(`Processing webhook: ${event.type}`, {
      eventId: event.providerEventId,
    });

    // Store webhook event for idempotency
    const existingEvent = await platform.env.DB.prepare(
      "SELECT id FROM webhook_events WHERE provider_event_id = ?",
    )
      .bind(event.providerEventId)
      .first();

    if (existingEvent) {
      console.log("Webhook already processed:", event.providerEventId);
      return json({ received: true, message: "Already processed" });
    }

    // Insert webhook event with PII sanitization and retention TTL
    const sanitizedPayload = sanitizeWebhookPayload(eventData);
    const payloadToStore = sanitizedPayload
      ? JSON.stringify(sanitizedPayload)
      : JSON.stringify({
          meta: { event_name: event.type },
          data: { id: eventData?.id, type: eventData?.object },
          _sanitization_failed: true,
        });
    const expiresAt = calculateWebhookExpiry(); // 120 days from now

    await platform.env.DB.prepare(
      `INSERT INTO webhook_events (id, provider, provider_event_id, event_type, payload, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        event.id,
        "stripe",
        event.providerEventId,
        event.type,
        payloadToStore,
        Math.floor(Date.now() / 1000),
        expiresAt,
      )
      .run();

    // Process based on event type
    switch (event.type) {
      // Shop e-commerce events - DISABLED
      case "checkout.session.completed":
        if (SHOP_ECOMMERCE_DISABLED) {
          console.log(
            "Shop disabled, skipping checkout.session.completed for orders",
          );
        } else {
          await handleCheckoutCompleted(platform.env.DB, eventData);
        }
        break;

      case "checkout.session.expired":
        if (SHOP_ECOMMERCE_DISABLED) {
          console.log("Shop disabled, skipping checkout.session.expired");
        } else {
          await handleCheckoutExpired(platform.env.DB, eventData);
        }
        break;

      case "payment.succeeded":
        if (SHOP_ECOMMERCE_DISABLED) {
          console.log("Shop disabled, skipping payment.succeeded");
        } else {
          await handlePaymentSucceeded(platform.env.DB, eventData);
        }
        break;

      case "payment.failed":
        if (SHOP_ECOMMERCE_DISABLED) {
          console.log("Shop disabled, skipping payment.failed");
        } else {
          await handlePaymentFailed(platform.env.DB, eventData);
        }
        break;

      // Platform billing subscription events - ALWAYS ENABLED
      case "subscription.created":
      case "subscription.updated":
        await handleSubscriptionUpdated(platform.env.DB, eventData);
        break;

      case "subscription.canceled":
        await handleSubscriptionCanceled(platform.env.DB, eventData);
        break;

      // Shop e-commerce events - DISABLED
      case "refund.created":
        if (SHOP_ECOMMERCE_DISABLED) {
          console.log("Shop disabled, skipping refund.created");
        } else {
          await handleRefundCreated(platform.env.DB, eventData);
        }
        break;

      case "account.updated":
        if (SHOP_ECOMMERCE_DISABLED) {
          console.log("Shop disabled, skipping account.updated (Connect)");
        } else {
          await handleConnectAccountUpdated(platform.env.DB, eventData);
        }
        break;

      default:
        console.log("Unhandled webhook event type:", event.type);
    }

    // Mark as processed
    await platform.env.DB.prepare(
      "UPDATE webhook_events SET processed = 1, processed_at = ? WHERE id = ?",
    )
      .bind(Math.floor(Date.now() / 1000), event.id)
      .run();

    return json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);

    // For Stripe, we should return 200 to prevent retries for non-recoverable errors
    // But 4xx/5xx for recoverable ones
    if (
      err &&
      typeof err === "object" &&
      "status" in err &&
      (err as Record<string, unknown>).status === 400
    ) {
      throw err;
    }

    // Log error but acknowledge receipt to prevent retries
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return json({ received: true, error: errorMessage });
  }
};

// =============================================================================
// EVENT HANDLERS
// =============================================================================

async function handleCheckoutCompleted(
  db: any,
  sessionData: Record<string, any>,
): Promise<void> {
  const session = sessionData;

  // Get order by session ID
  const orderId = session.metadata?.grove_order_id;
  const tenantId = session.metadata?.grove_tenant_id;

  if (!orderId) {
    console.error("No order ID in session metadata");
    return;
  }

  const order = await getOrderBySessionId(db, session.id);

  if (!order) {
    console.error("Order not found for session:", session.id);
    return;
  }

  // Update order status
  await updateOrderStatus(db, order.id, {
    status: "paid" as OrderStatus,
    paymentStatus: "succeeded" as PaymentStatus,
    providerPaymentId: session.payment_intent || session.subscription,
    paidAt: Math.floor(Date.now() / 1000),
  });

  // Update order totals with actual amounts from Stripe (including tax)
  if (session.amount_total) {
    await db
      .prepare("UPDATE orders SET total = ?, updated_at = ? WHERE id = ?")
      .bind(session.amount_total, Math.floor(Date.now() / 1000), order.id)
      .run();
  }

  // Create/update customer with Stripe customer ID
  if (session.customer && session.customer_email && tenantId) {
    const customer = await getOrCreateCustomer(
      db,
      tenantId,
      session.customer_email,
    );
    await updateCustomer(db, customer.id, {
      providerCustomerId: session.customer,
      // Note: totalOrders and totalSpent are not part of the Customer interface
      // They may be stored in metadata or a separate table
    });
  }

  // Update addresses if collected
  if (session.shipping_details && tenantId && session.customer_email) {
    const customer = await getOrCreateCustomer(
      db,
      tenantId,
      session.customer_email,
    );
    await updateCustomer(db, customer.id, {
      name: session.shipping_details.name,
      defaultShippingAddress: session.shipping_details.address,
    });

    // Also update order with shipping address
    await db
      .prepare(
        "UPDATE orders SET shipping_address = ?, customer_name = ?, updated_at = ? WHERE id = ?",
      )
      .bind(
        JSON.stringify(session.shipping_details.address),
        session.shipping_details.name,
        Math.floor(Date.now() / 1000),
        order.id,
      )
      .run();
  }

  console.log(
    "Order completed:",
    order.id,
    (order as unknown as Record<string, unknown>).orderNumber || "unknown",
  );

  // TODO: Send order confirmation email via Resend
  // TODO: Update inventory for physical products
  // TODO: Generate download links for digital products
}

async function handleCheckoutExpired(
  db: any,
  sessionData: Record<string, any>,
): Promise<void> {
  const session = sessionData;
  const order = await getOrderBySessionId(db, session.id);

  if (order) {
    await updateOrderStatus(db, order.id, {
      status: "canceled" as OrderStatus,
      paymentStatus: "canceled" as PaymentStatus,
    });
    console.log("Checkout expired, order canceled:", order.id);
  }
}

async function handlePaymentSucceeded(
  db: any,
  paymentData: Record<string, any>,
): Promise<void> {
  // Payment intent succeeded - order should already be marked paid from checkout.session.completed
  // This is a backup/confirmation
  const paymentIntentId = paymentData.id;

  const order = await db
    .prepare("SELECT id FROM orders WHERE provider_payment_id = ?")
    .bind(paymentIntentId)
    .first();

  if (order && order.payment_status !== "succeeded") {
    await updateOrderStatus(db, order.id, {
      paymentStatus: "succeeded" as PaymentStatus,
      paidAt: Math.floor(Date.now() / 1000),
    });
  }
}

async function handlePaymentFailed(
  db: any,
  paymentData: Record<string, any>,
): Promise<void> {
  const paymentIntentId = paymentData.id;

  const order = await db
    .prepare("SELECT id FROM orders WHERE provider_payment_id = ?")
    .bind(paymentIntentId)
    .first();

  if (order) {
    await updateOrderStatus(db, order.id, {
      paymentStatus: "failed" as PaymentStatus,
    });
    console.log("Payment failed for order:", order.id);
  }
}

async function handleSubscriptionUpdated(
  db: any,
  subscriptionData: Record<string, any>,
): Promise<void> {
  const stripeSubId = subscriptionData.id;
  const status = subscriptionData.status;

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "unpaid",
    trialing: "active",
    paused: "paused",
  };

  const mappedStatus = (statusMap[status as string] || "active") as string;

  // Update subscription in database
  await db
    .prepare(
      `UPDATE subscriptions SET
        status = ?,
        current_period_start = ?,
        current_period_end = ?,
        cancel_at_period_end = ?,
        updated_at = ?
       WHERE provider_subscription_id = ?`,
    )
    .bind(
      mappedStatus,
      subscriptionData.current_period_start,
      subscriptionData.current_period_end,
      subscriptionData.cancel_at_period_end ? 1 : 0,
      Math.floor(Date.now() / 1000),
      stripeSubId,
    )
    .run();

  // Also check platform billing
  await db
    .prepare(
      `UPDATE platform_billing SET
        status = ?,
        current_period_start = ?,
        current_period_end = ?,
        cancel_at_period_end = ?,
        updated_at = ?
       WHERE provider_subscription_id = ?`,
    )
    .bind(
      mappedStatus,
      subscriptionData.current_period_start,
      subscriptionData.current_period_end,
      subscriptionData.cancel_at_period_end ? 1 : 0,
      Math.floor(Date.now() / 1000),
      stripeSubId,
    )
    .run();
}

async function handleSubscriptionCanceled(
  db: any,
  subscriptionData: Record<string, any>,
): Promise<void> {
  const stripeSubId = subscriptionData.id;

  await db
    .prepare(
      `UPDATE subscriptions SET
        status = 'canceled',
        canceled_at = ?,
        updated_at = ?
       WHERE provider_subscription_id = ?`,
    )
    .bind(
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000),
      stripeSubId,
    )
    .run();

  await db
    .prepare(
      `UPDATE platform_billing SET
        status = 'canceled',
        updated_at = ?
       WHERE provider_subscription_id = ?`,
    )
    .bind(Math.floor(Date.now() / 1000), stripeSubId)
    .run();
}

async function handleRefundCreated(
  db: any,
  refundData: Record<string, any>,
): Promise<void> {
  const paymentIntentId = refundData.payment_intent;
  const refundId = refundData.id;
  const amount = refundData.amount;

  // Find the order
  const order = await db
    .prepare(
      "SELECT id, tenant_id, total FROM orders WHERE provider_payment_id = ?",
    )
    .bind(paymentIntentId)
    .first();

  if (!order) {
    console.log("Order not found for refund:", paymentIntentId);
    return;
  }

  // Create refund record
  await db
    .prepare(
      `INSERT INTO refunds (id, order_id, tenant_id, amount, currency, status, reason, provider_refund_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      order.id,
      order.tenant_id,
      amount,
      "usd",
      refundData.status,
      refundData.reason || null,
      refundId,
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000),
    )
    .run();

  // Update order status
  const isFullRefund = amount >= order.total;
  await updateOrderStatus(db, order.id, {
    status: (isFullRefund ? "refunded" : order.status) as OrderStatus,
    paymentStatus: (isFullRefund
      ? "refunded"
      : "partially_refunded") as PaymentStatus,
  });

  console.log("Refund processed for order:", order.id, "Amount:", amount);
}

async function handleConnectAccountUpdated(
  db: any,
  accountData: Record<string, any>,
): Promise<void> {
  const accountId = accountData.id;

  // Determine status
  let status = "pending";
  if (accountData.charges_enabled && accountData.payouts_enabled) {
    status = "enabled";
  } else if (accountData.details_submitted) {
    status = "restricted";
  }

  await db
    .prepare(
      `UPDATE connect_accounts SET
        status = ?,
        charges_enabled = ?,
        payouts_enabled = ?,
        details_submitted = ?,
        email = ?,
        country = ?,
        default_currency = ?,
        updated_at = ?
       WHERE provider_account_id = ?`,
    )
    .bind(
      status,
      accountData.charges_enabled ? 1 : 0,
      accountData.payouts_enabled ? 1 : 0,
      accountData.details_submitted ? 1 : 0,
      accountData.email || null,
      accountData.country || null,
      accountData.default_currency || null,
      Math.floor(Date.now() / 1000),
      accountId,
    )
    .run();

  console.log("Connect account updated:", accountId, "Status:", status);
}
