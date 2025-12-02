import { json, error, text } from "@sveltejs/kit";
import { createPaymentProvider } from "$lib/payments/index.js";
import {
  getOrderBySessionId,
  updateOrderStatus,
  updateCustomer,
  getOrCreateCustomer,
} from "$lib/payments/shop.js";

/**
 * POST /api/shop/webhooks - Handle Stripe webhooks
 *
 * This endpoint receives webhooks from Stripe for:
 * - checkout.session.completed - Payment successful
 * - checkout.session.expired - Checkout expired
 * - payment_intent.succeeded - Payment confirmed
 * - payment_intent.payment_failed - Payment failed
 * - customer.subscription.* - Subscription events
 * - invoice.* - Invoice events
 *
 * For Stripe Connect, this also handles:
 * - account.updated - Connected account status changes
 */
export async function POST({ request, platform }) {
  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throw error(500, "Payment provider not configured");
  }

  if (!platform?.env?.STRIPE_WEBHOOK_SECRET) {
    throw error(500, "Webhook secret not configured");
  }

  if (!platform?.env?.POSTS_DB) {
    throw error(500, "Database not configured");
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
      throw error(400, result.error || "Webhook verification failed");
    }

    const event = result.event;
    const eventData = event.data;

    console.log(`Processing webhook: ${event.type}`, {
      eventId: event.providerEventId,
    });

    // Store webhook event for idempotency
    const existingEvent = await platform.env.POSTS_DB
      .prepare("SELECT id FROM webhook_events WHERE provider_event_id = ?")
      .bind(event.providerEventId)
      .first();

    if (existingEvent) {
      console.log("Webhook already processed:", event.providerEventId);
      return json({ received: true, message: "Already processed" });
    }

    // Insert webhook event
    await platform.env.POSTS_DB
      .prepare(
        `INSERT INTO webhook_events (id, provider, provider_event_id, event_type, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        event.id,
        "stripe",
        event.providerEventId,
        event.type,
        JSON.stringify(eventData),
        Math.floor(Date.now() / 1000)
      )
      .run();

    // Process based on event type
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(platform.env.POSTS_DB, eventData);
        break;

      case "checkout.session.expired":
        await handleCheckoutExpired(platform.env.POSTS_DB, eventData);
        break;

      case "payment.succeeded":
        await handlePaymentSucceeded(platform.env.POSTS_DB, eventData);
        break;

      case "payment.failed":
        await handlePaymentFailed(platform.env.POSTS_DB, eventData);
        break;

      case "subscription.created":
      case "subscription.updated":
        await handleSubscriptionUpdated(platform.env.POSTS_DB, eventData);
        break;

      case "subscription.canceled":
        await handleSubscriptionCanceled(platform.env.POSTS_DB, eventData);
        break;

      case "refund.created":
        await handleRefundCreated(platform.env.POSTS_DB, eventData);
        break;

      case "account.updated":
        await handleConnectAccountUpdated(platform.env.POSTS_DB, eventData);
        break;

      default:
        console.log("Unhandled webhook event type:", event.type);
    }

    // Mark as processed
    await platform.env.POSTS_DB
      .prepare("UPDATE webhook_events SET processed = 1, processed_at = ? WHERE id = ?")
      .bind(Math.floor(Date.now() / 1000), event.id)
      .run();

    return json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);

    // For Stripe, we should return 200 to prevent retries for non-recoverable errors
    // But 4xx/5xx for recoverable ones
    if (err.status === 400) {
      throw err;
    }

    // Log error but acknowledge receipt to prevent retries
    return json({ received: true, error: err.message });
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

async function handleCheckoutCompleted(db, sessionData) {
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
    status: "paid",
    paymentStatus: "succeeded",
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
    const customer = await getOrCreateCustomer(db, tenantId, session.customer_email);
    await updateCustomer(db, customer.id, {
      providerCustomerId: session.customer,
      totalOrders: (customer.totalOrders || 0) + 1,
      totalSpent: (customer.totalSpent || 0) + (session.amount_total || 0),
    });
  }

  // Update addresses if collected
  if (session.shipping_details && tenantId && session.customer_email) {
    const customer = await getOrCreateCustomer(db, tenantId, session.customer_email);
    await updateCustomer(db, customer.id, {
      name: session.shipping_details.name,
      defaultShippingAddress: session.shipping_details.address,
    });

    // Also update order with shipping address
    await db
      .prepare("UPDATE orders SET shipping_address = ?, customer_name = ?, updated_at = ? WHERE id = ?")
      .bind(
        JSON.stringify(session.shipping_details.address),
        session.shipping_details.name,
        Math.floor(Date.now() / 1000),
        order.id
      )
      .run();
  }

  console.log("Order completed:", order.id, order.orderNumber);

  // TODO: Send order confirmation email via Resend
  // TODO: Update inventory for physical products
  // TODO: Generate download links for digital products
}

async function handleCheckoutExpired(db, sessionData) {
  const session = sessionData;
  const order = await getOrderBySessionId(db, session.id);

  if (order) {
    await updateOrderStatus(db, order.id, {
      status: "canceled",
      paymentStatus: "canceled",
    });
    console.log("Checkout expired, order canceled:", order.id);
  }
}

async function handlePaymentSucceeded(db, paymentData) {
  // Payment intent succeeded - order should already be marked paid from checkout.session.completed
  // This is a backup/confirmation
  const paymentIntentId = paymentData.id;

  const order = await db
    .prepare("SELECT id FROM orders WHERE provider_payment_id = ?")
    .bind(paymentIntentId)
    .first();

  if (order && order.payment_status !== "succeeded") {
    await updateOrderStatus(db, order.id, {
      paymentStatus: "succeeded",
      paidAt: Math.floor(Date.now() / 1000),
    });
  }
}

async function handlePaymentFailed(db, paymentData) {
  const paymentIntentId = paymentData.id;

  const order = await db
    .prepare("SELECT id FROM orders WHERE provider_payment_id = ?")
    .bind(paymentIntentId)
    .first();

  if (order) {
    await updateOrderStatus(db, order.id, {
      paymentStatus: "failed",
    });
    console.log("Payment failed for order:", order.id);
  }
}

async function handleSubscriptionUpdated(db, subscriptionData) {
  const stripeSubId = subscriptionData.id;
  const status = subscriptionData.status;

  // Map Stripe status to our status
  const statusMap = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "unpaid",
    trialing: "trialing",
    paused: "paused",
  };

  const mappedStatus = statusMap[status] || "active";

  // Update subscription in database
  await db
    .prepare(
      `UPDATE subscriptions SET
        status = ?,
        current_period_start = ?,
        current_period_end = ?,
        cancel_at_period_end = ?,
        updated_at = ?
       WHERE provider_subscription_id = ?`
    )
    .bind(
      mappedStatus,
      subscriptionData.current_period_start,
      subscriptionData.current_period_end,
      subscriptionData.cancel_at_period_end ? 1 : 0,
      Math.floor(Date.now() / 1000),
      stripeSubId
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
       WHERE provider_subscription_id = ?`
    )
    .bind(
      mappedStatus,
      subscriptionData.current_period_start,
      subscriptionData.current_period_end,
      subscriptionData.cancel_at_period_end ? 1 : 0,
      Math.floor(Date.now() / 1000),
      stripeSubId
    )
    .run();
}

async function handleSubscriptionCanceled(db, subscriptionData) {
  const stripeSubId = subscriptionData.id;

  await db
    .prepare(
      `UPDATE subscriptions SET
        status = 'canceled',
        canceled_at = ?,
        updated_at = ?
       WHERE provider_subscription_id = ?`
    )
    .bind(
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000),
      stripeSubId
    )
    .run();

  await db
    .prepare(
      `UPDATE platform_billing SET
        status = 'canceled',
        updated_at = ?
       WHERE provider_subscription_id = ?`
    )
    .bind(Math.floor(Date.now() / 1000), stripeSubId)
    .run();
}

async function handleRefundCreated(db, refundData) {
  const paymentIntentId = refundData.payment_intent;
  const refundId = refundData.id;
  const amount = refundData.amount;

  // Find the order
  const order = await db
    .prepare("SELECT id, tenant_id, total FROM orders WHERE provider_payment_id = ?")
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      Math.floor(Date.now() / 1000)
    )
    .run();

  // Update order status
  const isFullRefund = amount >= order.total;
  await updateOrderStatus(db, order.id, {
    status: isFullRefund ? "refunded" : order.status,
    paymentStatus: isFullRefund ? "refunded" : "partially_refunded",
  });

  console.log("Refund processed for order:", order.id, "Amount:", amount);
}

async function handleConnectAccountUpdated(db, accountData) {
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
       WHERE provider_account_id = ?`
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
      accountId
    )
    .run();

  console.log("Connect account updated:", accountId, "Status:", status);
}
