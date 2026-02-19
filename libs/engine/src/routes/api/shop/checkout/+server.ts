import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createPaymentProvider } from "$lib/payments";
import {
  getVariantById,
  getProductById,
  createOrder,
  getOrCreateCustomer,
} from "$lib/payments/shop";
import { API_ERRORS, throwGroveError } from "$lib/errors";

// Shop feature is temporarily disabled - deferred to Phase 5 (Grove Social and beyond)
const SHOP_DISABLED = true;
const SHOP_DISABLED_MESSAGE =
  "Shop feature is temporarily disabled. It will be available in a future release.";

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
export const POST: RequestHandler = async ({
  request,
  url,
  platform,
  locals,
}) => {
  if (SHOP_DISABLED) {
    throwGroveError(503, API_ERRORS.FEATURE_DISABLED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throwGroveError(500, API_ERRORS.PAYMENT_PROVIDER_NOT_CONFIGURED, "API");
  }

  const tenantId = url.searchParams.get("tenant_id") || locals.tenantId;
  if (!tenantId) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  try {
    // Validate tenant exists (checkout is public, so we just verify existence)
    const tenant = await platform.env.DB.prepare(
      "SELECT id FROM tenants WHERE id = ?",
    )
      .bind(tenantId)
      .first();

    if (!tenant) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }
    const data = (await request.json()) as Record<string, unknown>;

    // Validate required fields
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }

    if (!data.successUrl || !data.cancelUrl) {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }

    // Validate items and calculate totals
    const lineItems: Array<{
      productId: string;
      variantId: string;
      productName: string;
      variantName: string;
      sku?: string;
      quantity: number;
      unitPrice: number;
      requiresShipping: boolean;
    }> = [];
    let subtotal = 0;
    let hasSubscription = false;
    let hasPhysical = false;

    const items = (data.items as Array<Record<string, unknown>>) || [];
    for (const item of items) {
      const variantId = item.variantId as string;
      const quantity = item.quantity as number;
      if (!variantId || !quantity || quantity < 1) {
        throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
      }

      const variant = await getVariantById(platform.env.DB, variantId);
      if (!variant) {
        throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
      }

      const product = await getProductById(platform.env.DB, variant.productId);
      if (!product) {
        throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
      }

      // Check product is active
      if (product.status !== "active") {
        throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
      }

      // Check inventory (if tracking)
      if (
        variant.inventoryQuantity !== undefined &&
        variant.inventoryPolicy === "deny" &&
        variant.inventoryQuantity < quantity
      ) {
        throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
      }

      // Track product types
      if (variant.pricingType === "recurring") {
        hasSubscription = true;
      }
      if (product.type === "physical") {
        hasPhysical = true;
      }

      const itemTotal = variant.price.amount * quantity;
      subtotal += itemTotal;

      lineItems.push({
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantName: variant.name,
        sku: variant.sku,
        quantity,
        unitPrice: variant.price.amount,
        requiresShipping: product.type === "physical",
      });
    }

    // Determine checkout mode
    const mode: "payment" | "subscription" | "setup" = hasSubscription
      ? "subscription"
      : (((data.mode as string) || "payment") as
          | "payment"
          | "subscription"
          | "setup");

    // Create or get customer
    let customer = null;
    const customerEmail = data.customerEmail as string | undefined;
    if (customerEmail) {
      customer = await getOrCreateCustomer(
        platform.env.DB,
        tenantId,
        customerEmail,
        { name: data.customerName as string | undefined },
      );
    }

    // Create order in database (pending state)
    const { id: orderId, orderNumber } = await createOrder(
      platform.env.DB,
      tenantId,
      {
        customerEmail: customerEmail || "guest@checkout",
        customerName: data.customerName as string | undefined,
        customerId: customer?.id,
        lineItems,
        subtotal,
        taxTotal: 0, // Will be updated by Stripe Tax
        total: subtotal, // Will be updated after tax
        currency: "usd",
        customerNotes: data.notes as string | undefined,
        metadata: {
          ...(data.metadata as Record<string, string>),
          checkoutMode: mode,
        },
      },
    );

    // Initialize Stripe provider
    const stripe = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
      webhookSecret: platform.env.STRIPE_WEBHOOK_SECRET,
    });

    // Get connected account for this tenant (if marketplace mode)
    let connectedAccountId: string | null = null;
    let applicationFeeAmount: number | undefined = undefined;

    // Optional marketplace mode check
    if (
      (platform.env as Record<string, any>).STRIPE_CONNECT_ENABLED === "true"
    ) {
      // Look up tenant's Connect account
      const connectAccount = (await platform.env.DB.prepare(
        "SELECT provider_account_id FROM connect_accounts WHERE tenant_id = ? AND status = 'enabled'",
      )
        .bind(tenantId)
        .first()) as Record<string, unknown> | undefined;

      if (connectAccount) {
        connectedAccountId = connectAccount.provider_account_id as string;
        // Calculate platform fee (e.g., 5%)
        const feePercent = parseFloat(
          (platform.env as Record<string, any>).PLATFORM_FEE_PERCENT || "5",
        );
        applicationFeeAmount =
          Math.round(subtotal * (feePercent / 100)) ?? undefined;
      }
    }

    // Variant resolver for the provider
    const resolveVariant = async (variantId: string) => {
      return getVariantById(platform.env.DB, variantId);
    };

    // Create Stripe Checkout session
    const successUrl = data.successUrl as string;
    const cancelUrl = data.cancelUrl as string;
    // Map items to CartItem format
    const cartItems = items.map((item) => ({
      variantId: item.variantId as string,
      quantity: item.quantity as number,
      metadata: (item.metadata as Record<string, string>) || undefined,
    }));
    const session = await stripe.createCheckoutSession(
      cartItems,
      {
        mode,
        successUrl: `${successUrl}?order=${orderNumber}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl,
        customerEmail,
        customerId: customer?.providerCustomerId,
        automaticTax: true, // Enable Stripe Tax
        billingAddressCollection: "required",
        shippingAddressCollection: hasPhysical
          ? { allowedCountries: ["US", "CA", "GB", "AU"] }
          : undefined,
        allowPromotionCodes: (data.allowPromoCodes as boolean) !== false,
        connectedAccountId: connectedAccountId || undefined,
        applicationFeeAmount,
        metadata: {
          grove_order_id: orderId,
          grove_order_number: orderNumber,
          grove_tenant_id: tenantId,
          ...(data.metadata as Record<string, string>),
        },
      },
      resolveVariant,
    );

    // Update order with session ID
    await platform.env.DB.prepare(
      "UPDATE orders SET provider_session_id = ?, updated_at = ? WHERE id = ?",
    )
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
    if (err && typeof err === "object" && "status" in err) throw err;
    console.error("Error creating checkout:", err);
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};

/**
 * GET /api/shop/checkout?session_id=xxx - Get checkout session status
 */
export const GET: RequestHandler = async ({ url, platform }) => {
  if (SHOP_DISABLED) {
    throwGroveError(503, API_ERRORS.FEATURE_DISABLED, "API");
  }

  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  if (!platform?.env?.STRIPE_SECRET_KEY) {
    throwGroveError(500, API_ERRORS.PAYMENT_PROVIDER_NOT_CONFIGURED, "API");
  }

  try {
    const stripe = createPaymentProvider("stripe", {
      secretKey: platform.env.STRIPE_SECRET_KEY,
    });

    const session = await stripe.getCheckoutSession(sessionId);

    if (!session) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    return json({
      status: session.status,
      paymentStatus: session.paymentStatus,
      customerEmail: session.customerEmail,
      amountTotal: session.amountTotal,
    });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err;
    console.error("Error fetching checkout session:", err);
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
