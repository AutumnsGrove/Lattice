import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { createPaymentProvider } from "$lib/payments/index.js";
import {
  getVariantById,
  getProductById,
  createOrder,
  getOrCreateCustomer,
} from "$lib/payments/shop.js";

/**
 * POST /api/shop/checkout - Create a Stripe Checkout session
 *
 * Body:
 * {
 *   items: Array<{
 *     variantId: string
 *     quantity: number
 *   }>
 *   customerEmail?: string
 *   successUrl: string
 *   cancelUrl: string
 *   mode?: 'payment' | 'subscription'
 *   metadata?: Record<string, string>
 * }
 *
 * Response:
 * {
 *   success: true
 *   checkoutUrl: string
 *   sessionId: string
 *   orderId: string
 *   orderNumber: string
 * }
 */
export async function POST({ request, url, platform, locals }) {
  // CSRF check (optional for checkout - may be called from frontend)
  // Skip CSRF for public checkout, but validate origin
  const origin = request.headers.get("origin");
  if (origin && !origin.includes("grove.place") && !origin.includes("localhost")) {
    // Allow cross-origin for embedded checkouts in future
    // For now, log it
    console.log("Checkout request from origin:", origin);
  }

  if (!platform?.env?.POSTS_DB) {
    throw error(500, "Database not configured");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throw error(500, "Payment provider not configured");
  }

  const tenantId = url.searchParams.get("tenant_id") || locals.tenant?.id;
  if (!tenantId) {
    throw error(400, "Tenant ID required");
  }

  try {
    const data = await request.json();

    // Validate required fields
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw error(400, "At least one item is required");
    }

    if (!data.successUrl || !data.cancelUrl) {
      throw error(400, "Success and cancel URLs are required");
    }

    // Validate items and calculate totals
    const lineItems = [];
    let subtotal = 0;
    let hasSubscription = false;
    let hasPhysical = false;

    for (const item of data.items) {
      if (!item.variantId || !item.quantity || item.quantity < 1) {
        throw error(400, "Invalid item: variantId and quantity required");
      }

      const variant = await getVariantById(platform.env.POSTS_DB, item.variantId);
      if (!variant) {
        throw error(404, `Variant not found: ${item.variantId}`);
      }

      const product = await getProductById(platform.env.POSTS_DB, variant.productId);
      if (!product) {
        throw error(404, `Product not found for variant: ${item.variantId}`);
      }

      // Check product is active
      if (product.status !== "active") {
        throw error(400, `Product is not available: ${product.name}`);
      }

      // Check inventory (if tracking)
      if (
        variant.inventoryQuantity !== undefined &&
        variant.inventoryPolicy === "deny" &&
        variant.inventoryQuantity < item.quantity
      ) {
        throw error(400, `Insufficient inventory for ${product.name} - ${variant.name}`);
      }

      // Track product types
      if (variant.pricingType === "recurring") {
        hasSubscription = true;
      }
      if (product.type === "physical") {
        hasPhysical = true;
      }

      const itemTotal = variant.price.amount * item.quantity;
      subtotal += itemTotal;

      lineItems.push({
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantName: variant.name,
        sku: variant.sku,
        quantity: item.quantity,
        unitPrice: variant.price.amount,
        requiresShipping: product.type === "physical",
      });
    }

    // Determine checkout mode
    const mode = hasSubscription ? "subscription" : (data.mode || "payment");

    // Create or get customer
    let customer = null;
    if (data.customerEmail) {
      customer = await getOrCreateCustomer(
        platform.env.POSTS_DB,
        tenantId,
        data.customerEmail,
        { name: data.customerName }
      );
    }

    // Create order in database (pending state)
    const { id: orderId, orderNumber } = await createOrder(
      platform.env.POSTS_DB,
      tenantId,
      {
        customerEmail: data.customerEmail || "guest@checkout",
        customerName: data.customerName,
        customerId: customer?.id,
        lineItems,
        subtotal,
        taxTotal: 0, // Will be updated by Stripe Tax
        total: subtotal, // Will be updated after tax
        currency: "usd",
        customerNotes: data.notes,
        metadata: {
          ...data.metadata,
          checkoutMode: mode,
        },
      }
    );

    // Initialize Stripe provider
    const stripe = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
      webhookSecret: platform.env.STRIPE_WEBHOOK_SECRET,
    });

    // Get connected account for this tenant (if marketplace mode)
    let connectedAccountId = null;
    let applicationFeeAmount = null;

    if (platform.env.STRIPE_CONNECT_ENABLED === "true") {
      // Look up tenant's Connect account
      const connectAccount = await platform.env.POSTS_DB
        .prepare("SELECT provider_account_id FROM connect_accounts WHERE tenant_id = ? AND status = 'enabled'")
        .bind(tenantId)
        .first();

      if (connectAccount) {
        connectedAccountId = connectAccount.provider_account_id;
        // Calculate platform fee (e.g., 5%)
        const feePercent = parseFloat(platform.env.PLATFORM_FEE_PERCENT || "5");
        applicationFeeAmount = Math.round(subtotal * (feePercent / 100));
      }
    }

    // Variant resolver for the provider
    const resolveVariant = async (variantId) => {
      return getVariantById(platform.env.POSTS_DB, variantId);
    };

    // Create Stripe Checkout session
    const session = await stripe.createCheckoutSession(
      data.items,
      {
        mode,
        successUrl: `${data.successUrl}?order=${orderNumber}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: data.cancelUrl,
        customerEmail: data.customerEmail,
        customerId: customer?.providerCustomerId,
        automaticTax: true, // Enable Stripe Tax
        billingAddressCollection: "required",
        shippingAddressCollection: hasPhysical
          ? { allowedCountries: ["US", "CA", "GB", "AU"] }
          : undefined,
        allowPromotionCodes: data.allowPromoCodes !== false,
        connectedAccountId,
        applicationFeeAmount,
        metadata: {
          grove_order_id: orderId,
          grove_order_number: orderNumber,
          grove_tenant_id: tenantId,
          ...data.metadata,
        },
      },
      resolveVariant
    );

    // Update order with session ID
    await platform.env.POSTS_DB
      .prepare("UPDATE orders SET provider_session_id = ?, updated_at = ? WHERE id = ?")
      .bind(session.id, Math.floor(Date.now() / 1000), orderId)
      .run();

    return json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      orderId,
      orderNumber,
    });
  } catch (err) {
    if (err.status) throw err;
    console.error("Error creating checkout:", err);
    throw error(500, `Failed to create checkout: ${err.message}`);
  }
}

/**
 * GET /api/shop/checkout?session_id=xxx - Get checkout session status
 */
export async function GET({ url, platform }) {
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    throw error(400, "Session ID required");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throw error(500, "Payment provider not configured");
  }

  try {
    const stripe = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
    });

    const session = await stripe.getCheckoutSession(sessionId);

    if (!session) {
      throw error(404, "Session not found");
    }

    return json({
      status: session.status,
      paymentStatus: session.paymentStatus,
      customerEmail: session.customerEmail,
      amountTotal: session.amountTotal,
    });
  } catch (err) {
    if (err.status) throw err;
    console.error("Error fetching checkout session:", err);
    throw error(500, "Failed to fetch checkout session");
  }
}
