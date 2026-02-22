> **ARCHIVED:** This migration was planned but never executed. Stripe approval came through in Feb 2026 and Stripe remains the live payment provider. Kept for historical reference.

# Grove Payment Migration: Stripe → Lemon Squeezy

## Overview

This document provides complete instructions for migrating Grove's payment infrastructure from Stripe to Lemon Squeezy. Grove uses Cloudflare Workers, D1, and KV for its backend. Lemon Squeezy will serve as the Merchant of Record (MoR), handling all payment processing, tax compliance, and fraud protection.

**Important Context:**
- No live Stripe transactions exist - this is a clean migration
- Grove uses Cloudflare Workers (Hono framework likely)
- Database is Cloudflare D1
- Auth system is Heartwood (Grove's custom auth)
- All checkout flows should be API-generated, not direct links

---

## Phase 1: Stripe Removal

### 1.1 Identify and Remove Stripe Dependencies

Search the entire codebase for Stripe references:

```bash
# Find all Stripe imports and references
grep -r "stripe" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" .
grep -r "Stripe" --include="*.ts" --include="*.tsx" --include="*.js" .
grep -r "STRIPE" --include="*.env*" --include="*.toml" .
```

Remove the Stripe package:

```bash
npm uninstall stripe
# or
pnpm remove stripe
# or  
bun remove stripe
```

### 1.2 Remove Stripe Environment Variables

Search for and remove these from all environment files (`.env`, `.env.local`, `.dev.vars`, `wrangler.toml`):

```
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID_*
STRIPE_PRODUCT_ID_*
```

### 1.3 Remove Stripe Code Files

Likely locations to check and remove/replace:
- `/src/routes/webhook/stripe.ts` or similar
- `/src/lib/stripe.ts` or `/src/utils/stripe.ts`
- `/src/services/payment.ts` (if Stripe-specific)
- Any `stripe` folder or module

### 1.4 Update Database Schema (if needed)

If the D1 schema has Stripe-specific columns, plan migrations:

```sql
-- Example: Rename stripe_customer_id to payment_customer_id
-- Or add new lemonsqueezy-specific columns

ALTER TABLE users ADD COLUMN lemonsqueezy_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN lemonsqueezy_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN lemonsqueezy_variant_id INTEGER;
```

---

## Phase 2: Lemon Squeezy Setup

### 2.1 Environment Configuration

Add these environment variables to `wrangler.toml` (for secrets, use `wrangler secret put`):

```toml
[vars]
LEMON_SQUEEZY_STORE_ID = "your_store_id"

# These should be secrets (wrangler secret put LEMON_SQUEEZY_API_KEY)
# LEMON_SQUEEZY_API_KEY = "your_api_key"
# LEMON_SQUEEZY_WEBHOOK_SECRET = "your_webhook_secret"
```

For local development in `.dev.vars`:

```env
LEMON_SQUEEZY_API_KEY=your_api_key_here
LEMON_SQUEEZY_STORE_ID=your_store_id_here
LEMON_SQUEEZY_WEBHOOK_SECRET=a_random_secret_string_min_6_chars
```

### 2.2 Install Lemon Squeezy SDK

```bash
npm install @lemonsqueezy/lemonsqueezy.js
# or
pnpm add @lemonsqueezy/lemonsqueezy.js
# or
bun add @lemonsqueezy/lemonsqueezy.js
```

### 2.3 Enable Node.js Compatibility

In `wrangler.toml`, ensure nodejs_compat is enabled (needed for webhook signature verification):

```toml
compatibility_flags = ["nodejs_compat"]
```

---

## Phase 3: Core Integration Code

### 3.1 Lemon Squeezy Client Setup

Create `/src/lib/lemonsqueezy.ts`:

```typescript
import {
  lemonSqueezySetup,
  createCheckout,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  listProducts,
  listVariants,
  getCustomer,
  listCustomers,
} from "@lemonsqueezy/lemonsqueezy.js";

// Type for Cloudflare Worker environment bindings
interface Env {
  LEMON_SQUEEZY_API_KEY: string;
  LEMON_SQUEEZY_STORE_ID: string;
  LEMON_SQUEEZY_WEBHOOK_SECRET: string;
  DB: D1Database;
}

/**
 * Initialize Lemon Squeezy SDK
 * Call this at the start of request handling
 */
export function initLemonSqueezy(env: Env) {
  lemonSqueezySetup({
    apiKey: env.LEMON_SQUEEZY_API_KEY,
    onError: (error) => {
      console.error("[LemonSqueezy Error]:", error);
    },
  });
}

/**
 * Create a checkout session for a user
 * Returns the checkout URL to redirect the user to
 */
export async function createSubscriptionCheckout(
  env: Env,
  options: {
    variantId: number;
    userId: string;
    userEmail: string;
    userName?: string;
    redirectUrl?: string;
    customData?: Record<string, string | number>;
  }
): Promise<string> {
  initLemonSqueezy(env);

  const storeId = parseInt(env.LEMON_SQUEEZY_STORE_ID, 10);

  const { data, error } = await createCheckout(storeId, options.variantId, {
    checkoutData: {
      email: options.userEmail,
      name: options.userName,
      custom: {
        user_id: options.userId,
        ...options.customData,
      },
    },
    productOptions: {
      redirectUrl: options.redirectUrl ?? "https://grove.place/dashboard",
      receiptButtonText: "Return to Grove",
      receiptThankYouNote: "Thank you for subscribing to Grove!",
    },
    checkoutOptions: {
      embed: false, // Set true if using embedded checkout
      media: true,
      logo: true,
    },
  });

  if (error) {
    console.error("[Checkout Creation Error]:", error);
    throw new Error(`Failed to create checkout: ${error.message}`);
  }

  if (!data?.data?.attributes?.url) {
    throw new Error("No checkout URL returned from Lemon Squeezy");
  }

  return data.data.attributes.url;
}

/**
 * Get subscription details by Lemon Squeezy subscription ID
 */
export async function getSubscriptionDetails(env: Env, subscriptionId: string) {
  initLemonSqueezy(env);

  const { data, error } = await getSubscription(subscriptionId);

  if (error) {
    console.error("[Get Subscription Error]:", error);
    throw new Error(`Failed to get subscription: ${error.message}`);
  }

  return data?.data;
}

/**
 * Cancel a subscription (at period end by default)
 */
export async function cancelUserSubscription(env: Env, subscriptionId: string) {
  initLemonSqueezy(env);

  const { data, error } = await cancelSubscription(subscriptionId);

  if (error) {
    console.error("[Cancel Subscription Error]:", error);
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }

  return data?.data;
}

/**
 * Update subscription (e.g., change plan)
 */
export async function changeSubscriptionPlan(
  env: Env,
  subscriptionId: string,
  newVariantId: number
) {
  initLemonSqueezy(env);

  const { data, error } = await updateSubscription(subscriptionId, {
    variantId: newVariantId,
  });

  if (error) {
    console.error("[Update Subscription Error]:", error);
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  return data?.data;
}

/**
 * Pause a subscription
 */
export async function pauseSubscription(
  env: Env,
  subscriptionId: string,
  mode: "void" | "free" = "void"
) {
  initLemonSqueezy(env);

  const { data, error } = await updateSubscription(subscriptionId, {
    pause: {
      mode,
    },
  });

  if (error) {
    throw new Error(`Failed to pause subscription: ${error.message}`);
  }

  return data?.data;
}

/**
 * Resume a paused subscription
 */
export async function resumeSubscription(env: Env, subscriptionId: string) {
  initLemonSqueezy(env);

  const { data, error } = await updateSubscription(subscriptionId, {
    pause: null,
  });

  if (error) {
    throw new Error(`Failed to resume subscription: ${error.message}`);
  }

  return data?.data;
}
```

### 3.2 Webhook Handler

Create `/src/routes/webhook/lemonsqueezy.ts`:

```typescript
import { Hono } from "hono";
import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

interface Env {
  LEMON_SQUEEZY_WEBHOOK_SECRET: string;
  DB: D1Database;
}

// Webhook event types we care about
type WebhookEventName =
  | "order_created"
  | "order_refunded"
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "subscription_resumed"
  | "subscription_expired"
  | "subscription_paused"
  | "subscription_unpaused"
  | "subscription_payment_success"
  | "subscription_payment_failed"
  | "subscription_payment_recovered"
  | "license_key_created"
  | "license_key_updated";

interface WebhookPayload {
  meta: {
    event_name: WebhookEventName;
    custom_data?: {
      user_id?: string;
      [key: string]: unknown;
    };
    test_mode: boolean;
  };
  data: {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
    relationships?: Record<string, unknown>;
  };
}

const webhook = new Hono<{ Bindings: Env }>();

/**
 * Verify webhook signature from Lemon Squeezy
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) {
    return false;
  }

  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    const digest = hmac.digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, "hex");
    const digestBuffer = Buffer.from(digest, "hex");

    if (signatureBuffer.length !== digestBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, digestBuffer);
  } catch (error) {
    console.error("[Webhook Signature Verification Error]:", error);
    return false;
  }
}

/**
 * Main webhook endpoint
 */
webhook.post("/", async (c) => {
  const signature = c.req.header("x-signature");
  const rawBody = await c.req.text();

  // Verify signature
  const isValid = await verifyWebhookSignature(
    rawBody,
    signature,
    c.env.LEMON_SQUEEZY_WEBHOOK_SECRET
  );

  if (!isValid) {
    console.error("[Webhook] Invalid signature");
    return c.json({ error: "Invalid signature" }, 401);
  }

  // Parse payload
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    console.error("[Webhook] Invalid JSON payload");
    return c.json({ error: "Invalid payload" }, 400);
  }

  const eventName = payload.meta.event_name;
  const customData = payload.meta.custom_data;
  const userId = customData?.user_id;

  console.log(`[Webhook] Received event: ${eventName}`, {
    userId,
    testMode: payload.meta.test_mode,
  });

  try {
    switch (eventName) {
      case "subscription_created":
        await handleSubscriptionCreated(c.env.DB, payload, userId);
        break;

      case "subscription_updated":
        await handleSubscriptionUpdated(c.env.DB, payload, userId);
        break;

      case "subscription_cancelled":
        await handleSubscriptionCancelled(c.env.DB, payload, userId);
        break;

      case "subscription_expired":
        await handleSubscriptionExpired(c.env.DB, payload, userId);
        break;

      case "subscription_payment_success":
        await handlePaymentSuccess(c.env.DB, payload, userId);
        break;

      case "subscription_payment_failed":
        await handlePaymentFailed(c.env.DB, payload, userId);
        break;

      case "subscription_paused":
        await handleSubscriptionPaused(c.env.DB, payload, userId);
        break;

      case "subscription_unpaused":
      case "subscription_resumed":
        await handleSubscriptionResumed(c.env.DB, payload, userId);
        break;

      case "order_created":
        await handleOrderCreated(c.env.DB, payload, userId);
        break;

      case "order_refunded":
        await handleOrderRefunded(c.env.DB, payload, userId);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${eventName}`);
    }

    return c.json({ received: true }, 200);
  } catch (error) {
    console.error(`[Webhook] Error handling ${eventName}:`, error);
    // Return 200 anyway to prevent retries for application errors
    // Only return non-200 for signature/parse failures
    return c.json({ received: true, error: "Handler error" }, 200);
  }
});

// ============================================
// Event Handlers
// ============================================

async function handleSubscriptionCreated(
  db: D1Database,
  payload: WebhookPayload,
  userId?: string
) {
  const attrs = payload.data.attributes as {
    store_id: number;
    customer_id: number;
    order_id: number;
    product_id: number;
    variant_id: number;
    product_name: string;
    variant_name: string;
    user_email: string;
    status: string;
    status_formatted: string;
    pause: unknown | null;
    cancelled: boolean;
    trial_ends_at: string | null;
    billing_anchor: number;
    renews_at: string;
    ends_at: string | null;
    created_at: string;
    updated_at: string;
    test_mode: boolean;
  };

  const subscriptionId = payload.data.id;

  if (!userId) {
    console.error("[Webhook] No user_id in subscription_created custom_data");
    return;
  }

  await db
    .prepare(
      `
      INSERT INTO subscriptions (
        id,
        user_id,
        lemonsqueezy_subscription_id,
        lemonsqueezy_customer_id,
        lemonsqueezy_product_id,
        lemonsqueezy_variant_id,
        product_name,
        variant_name,
        status,
        renews_at,
        ends_at,
        trial_ends_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET
        lemonsqueezy_subscription_id = excluded.lemonsqueezy_subscription_id,
        lemonsqueezy_customer_id = excluded.lemonsqueezy_customer_id,
        lemonsqueezy_product_id = excluded.lemonsqueezy_product_id,
        lemonsqueezy_variant_id = excluded.lemonsqueezy_variant_id,
        product_name = excluded.product_name,
        variant_name = excluded.variant_name,
        status = excluded.status,
        renews_at = excluded.renews_at,
        ends_at = excluded.ends_at,
        trial_ends_at = excluded.trial_ends_at,
        updated_at = excluded.updated_at
    `
    )
    .bind(
      crypto.randomUUID(),
      userId,
      subscriptionId,
      attrs.customer_id.toString(),
      attrs.product_id,
      attrs.variant_id,
      attrs.product_name,
      attrs.variant_name,
      attrs.status,
      attrs.renews_at,
      attrs.ends_at,
      attrs.trial_ends_at,
      attrs.created_at,
      attrs.updated_at
    )
    .run();

  console.log(`[Webhook] Created subscription for user ${userId}`);
}

async function handleSubscriptionUpdated(
  db: D1Database,
  payload: WebhookPayload,
  userId?: string
) {
  const attrs = payload.data.attributes as {
    variant_id: number;
    product_name: string;
    variant_name: string;
    status: string;
    pause: unknown | null;
    cancelled: boolean;
    renews_at: string;
    ends_at: string | null;
    updated_at: string;
  };

  const subscriptionId = payload.data.id;

  await db
    .prepare(
      `
      UPDATE subscriptions SET
        lemonsqueezy_variant_id = ?,
        product_name = ?,
        variant_name = ?,
        status = ?,
        renews_at = ?,
        ends_at = ?,
        updated_at = ?
      WHERE lemonsqueezy_subscription_id = ?
    `
    )
    .bind(
      attrs.variant_id,
      attrs.product_name,
      attrs.variant_name,
      attrs.status,
      attrs.renews_at,
      attrs.ends_at,
      attrs.updated_at,
      subscriptionId
    )
    .run();

  console.log(`[Webhook] Updated subscription ${subscriptionId}`);
}

async function handleSubscriptionCancelled(
  db: D1Database,
  payload: WebhookPayload,
  userId?: string
) {
  const attrs = payload.data.attributes as {
    status: string;
    ends_at: string | null;
    updated_at: string;
  };

  const subscriptionId = payload.data.id;

  await db
    .prepare(
      `
      UPDATE subscriptions SET
        status = ?,
        ends_at = ?,
        updated_at = ?
      WHERE lemonsqueezy_subscription_id = ?
    `
    )
    .bind(attrs.status, attrs.ends_at, attrs.updated_at, subscriptionId)
    .run();

  console.log(`[Webhook] Subscription ${subscriptionId} cancelled`);
}

async function handleSubscriptionExpired(
  db: D1Database,
  payload: WebhookPayload,
  userId?: string
) {
  const subscriptionId = payload.data.id;

  await db
    .prepare(
      `
      UPDATE subscriptions SET
        status = 'expired',
        updated_at = ?
      WHERE lemonsqueezy_subscription_id = ?
    `
    )
    .bind(new Date().toISOString(), subscriptionId)
    .run();

  console.log(`[Webhook] Subscription ${subscriptionId} expired`);
}

async function handlePaymentSuccess(
  db: D1Database,
  payload: WebhookPayload,
  userId?: string
) {
  const attrs = payload.data.attributes as {
    status: string;
    renews_at: string;
    updated_at: string;
  };

  const subscriptionId = payload.data.id;

  await db
    .prepare(
      `
      UPDATE subscriptions SET
        status = ?,
        renews_at = ?,
        updated_at = ?
      WHERE lemonsqueezy_subscription_id = ?
    `
    )
    .bind(attrs.status, attrs.renews_at, attrs.updated_at, subscriptionId)
    .run();

  console.log(`[Webhook] Payment success for subscription ${subscriptionId}`);
}

async function handlePaymentFailed(
  db: D1Database,
  payload: WebhookPayload,
  userId?: string
) {
  const subscriptionId = payload.data.id;

  await db
    .prepare(
      `
      UPDATE subscriptions SET
        status = 'past_due',
        updated_at = ?
      WHERE lemonsqueezy_subscription_id = ?
    `
    )
    .bind(new Date().toISOString(), subscriptionId)
    .run();

  console.log(`[Webhook] Payment failed for subscription ${subscriptionId}`);

  // TODO: Optionally send email notification to user about failed payment
}

async function handleSubscriptionPaused(
  db: D1Database,
  payload: WebhookPayload,
  userId?: string
) {
  const subscriptionId = payload.data.id;

  await db
    .prepare(
      `
      UPDATE subscriptions SET
        status = 'paused',
        updated_at = ?
      WHERE lemonsqueezy_subscription_id = ?
    `
    )
    .bind(new Date().toISOString(), subscriptionId)
    .run();

  console.log(`[Webhook] Subscription ${subscriptionId} paused`);
}

async function handleSubscriptionResumed(
  db: D1Database,
  payload: WebhookPayload,
  userId?: string
) {
  const attrs = payload.data.attributes as {
    status: string;
    renews_at: string;
    updated_at: string;
  };

  const subscriptionId = payload.data.id;

  await db
    .prepare(
      `
      UPDATE subscriptions SET
        status = ?,
        renews_at = ?,
        updated_at = ?
      WHERE lemonsqueezy_subscription_id = ?
    `
    )
    .bind(attrs.status, attrs.renews_at, attrs.updated_at, subscriptionId)
    .run();

  console.log(`[Webhook] Subscription ${subscriptionId} resumed`);
}

async function handleOrderCreated(
  db: D1Database,
  payload: WebhookPayload,
  userId?: string
) {
  // Handle one-time purchases if Grove has any
  const attrs = payload.data.attributes as {
    order_number: number;
    total: number;
    status: string;
    user_email: string;
  };

  console.log(`[Webhook] Order created: #${attrs.order_number}`);

  // TODO: Implement if Grove has one-time purchases
}

async function handleOrderRefunded(
  db: D1Database,
  payload: WebhookPayload,
  userId?: string
) {
  const attrs = payload.data.attributes as {
    order_number: number;
    refunded: boolean;
    refunded_at: string;
  };

  console.log(`[Webhook] Order refunded: #${attrs.order_number}`);

  // TODO: Implement refund handling if needed
}

export default webhook;
```

### 3.3 API Routes for Checkout and Subscription Management

Create `/src/routes/api/billing.ts`:

```typescript
import { Hono } from "hono";
import {
  createSubscriptionCheckout,
  cancelUserSubscription,
  changeSubscriptionPlan,
  pauseSubscription,
  resumeSubscription,
  getSubscriptionDetails,
} from "../../lib/lemonsqueezy";

interface Env {
  LEMON_SQUEEZY_API_KEY: string;
  LEMON_SQUEEZY_STORE_ID: string;
  LEMON_SQUEEZY_WEBHOOK_SECRET: string;
  DB: D1Database;
}

// Define your plan variant IDs here (get these from Lemon Squeezy dashboard)
const PLAN_VARIANTS = {
  // Replace these with actual variant IDs from your LS store
  grove_free: null, // Free tier doesn't need a variant
  grove_pro_monthly: 123456,
  grove_pro_yearly: 123457,
  grove_team_monthly: 123458,
  grove_team_yearly: 123459,
} as const;

const billing = new Hono<{ Bindings: Env }>();

/**
 * Create a checkout session
 * POST /api/billing/checkout
 */
billing.post("/checkout", async (c) => {
  const body = await c.req.json<{
    planId: keyof typeof PLAN_VARIANTS;
    userId: string;
    email: string;
    name?: string;
  }>();

  const { planId, userId, email, name } = body;

  if (!planId || !userId || !email) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const variantId = PLAN_VARIANTS[planId];

  if (!variantId) {
    return c.json({ error: "Invalid plan or free tier selected" }, 400);
  }

  try {
    const checkoutUrl = await createSubscriptionCheckout(c.env, {
      variantId,
      userId,
      userEmail: email,
      userName: name,
      redirectUrl: "https://grove.place/dashboard?subscription=success",
      customData: {
        plan_id: planId,
      },
    });

    return c.json({ checkoutUrl });
  } catch (error) {
    console.error("[Billing] Checkout creation failed:", error);
    return c.json({ error: "Failed to create checkout" }, 500);
  }
});

/**
 * Get current subscription status
 * GET /api/billing/subscription
 */
billing.get("/subscription", async (c) => {
  const userId = c.req.query("userId");

  if (!userId) {
    return c.json({ error: "Missing userId" }, 400);
  }

  try {
    const result = await c.env.DB.prepare(
      `
      SELECT 
        lemonsqueezy_subscription_id,
        product_name,
        variant_name,
        status,
        renews_at,
        ends_at,
        trial_ends_at,
        created_at
      FROM subscriptions 
      WHERE user_id = ?
    `
    )
      .bind(userId)
      .first();

    if (!result) {
      return c.json({
        subscription: null,
        plan: "free",
      });
    }

    return c.json({
      subscription: result,
      plan: result.variant_name,
      isActive: ["active", "on_trial"].includes(result.status as string),
    });
  } catch (error) {
    console.error("[Billing] Failed to get subscription:", error);
    return c.json({ error: "Failed to get subscription" }, 500);
  }
});

/**
 * Cancel subscription
 * POST /api/billing/cancel
 */
billing.post("/cancel", async (c) => {
  const body = await c.req.json<{ userId: string }>();
  const { userId } = body;

  if (!userId) {
    return c.json({ error: "Missing userId" }, 400);
  }

  try {
    // Get subscription ID from database
    const sub = await c.env.DB.prepare(
      `SELECT lemonsqueezy_subscription_id FROM subscriptions WHERE user_id = ?`
    )
      .bind(userId)
      .first<{ lemonsqueezy_subscription_id: string }>();

    if (!sub?.lemonsqueezy_subscription_id) {
      return c.json({ error: "No active subscription found" }, 404);
    }

    await cancelUserSubscription(c.env, sub.lemonsqueezy_subscription_id);

    return c.json({ success: true, message: "Subscription will cancel at period end" });
  } catch (error) {
    console.error("[Billing] Cancel failed:", error);
    return c.json({ error: "Failed to cancel subscription" }, 500);
  }
});

/**
 * Change subscription plan
 * POST /api/billing/change-plan
 */
billing.post("/change-plan", async (c) => {
  const body = await c.req.json<{
    userId: string;
    newPlanId: keyof typeof PLAN_VARIANTS;
  }>();

  const { userId, newPlanId } = body;

  if (!userId || !newPlanId) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const newVariantId = PLAN_VARIANTS[newPlanId];

  if (!newVariantId) {
    return c.json({ error: "Invalid plan selected" }, 400);
  }

  try {
    const sub = await c.env.DB.prepare(
      `SELECT lemonsqueezy_subscription_id FROM subscriptions WHERE user_id = ?`
    )
      .bind(userId)
      .first<{ lemonsqueezy_subscription_id: string }>();

    if (!sub?.lemonsqueezy_subscription_id) {
      return c.json({ error: "No active subscription found" }, 404);
    }

    await changeSubscriptionPlan(
      c.env,
      sub.lemonsqueezy_subscription_id,
      newVariantId
    );

    return c.json({ success: true, message: "Plan changed successfully" });
  } catch (error) {
    console.error("[Billing] Plan change failed:", error);
    return c.json({ error: "Failed to change plan" }, 500);
  }
});

/**
 * Pause subscription
 * POST /api/billing/pause
 */
billing.post("/pause", async (c) => {
  const body = await c.req.json<{ userId: string }>();
  const { userId } = body;

  if (!userId) {
    return c.json({ error: "Missing userId" }, 400);
  }

  try {
    const sub = await c.env.DB.prepare(
      `SELECT lemonsqueezy_subscription_id FROM subscriptions WHERE user_id = ?`
    )
      .bind(userId)
      .first<{ lemonsqueezy_subscription_id: string }>();

    if (!sub?.lemonsqueezy_subscription_id) {
      return c.json({ error: "No active subscription found" }, 404);
    }

    await pauseSubscription(c.env, sub.lemonsqueezy_subscription_id);

    return c.json({ success: true, message: "Subscription paused" });
  } catch (error) {
    console.error("[Billing] Pause failed:", error);
    return c.json({ error: "Failed to pause subscription" }, 500);
  }
});

/**
 * Resume subscription
 * POST /api/billing/resume
 */
billing.post("/resume", async (c) => {
  const body = await c.req.json<{ userId: string }>();
  const { userId } = body;

  if (!userId) {
    return c.json({ error: "Missing userId" }, 400);
  }

  try {
    const sub = await c.env.DB.prepare(
      `SELECT lemonsqueezy_subscription_id FROM subscriptions WHERE user_id = ?`
    )
      .bind(userId)
      .first<{ lemonsqueezy_subscription_id: string }>();

    if (!sub?.lemonsqueezy_subscription_id) {
      return c.json({ error: "No active subscription found" }, 404);
    }

    await resumeSubscription(c.env, sub.lemonsqueezy_subscription_id);

    return c.json({ success: true, message: "Subscription resumed" });
  } catch (error) {
    console.error("[Billing] Resume failed:", error);
    return c.json({ error: "Failed to resume subscription" }, 500);
  }
});

/**
 * Get customer portal URL (for updating payment method)
 * GET /api/billing/portal
 */
billing.get("/portal", async (c) => {
  const userId = c.req.query("userId");

  if (!userId) {
    return c.json({ error: "Missing userId" }, 400);
  }

  try {
    const sub = await c.env.DB.prepare(
      `SELECT lemonsqueezy_subscription_id FROM subscriptions WHERE user_id = ?`
    )
      .bind(userId)
      .first<{ lemonsqueezy_subscription_id: string }>();

    if (!sub?.lemonsqueezy_subscription_id) {
      return c.json({ error: "No subscription found" }, 404);
    }

    const subscription = await getSubscriptionDetails(
      c.env,
      sub.lemonsqueezy_subscription_id
    );

    // The customer portal URL is in the subscription's urls object
    const urls = subscription?.attributes?.urls as {
      update_payment_method: string;
      customer_portal: string;
    };

    return c.json({
      updatePaymentMethodUrl: urls?.update_payment_method,
      customerPortalUrl: urls?.customer_portal,
    });
  } catch (error) {
    console.error("[Billing] Portal URL fetch failed:", error);
    return c.json({ error: "Failed to get portal URL" }, 500);
  }
});

export default billing;
```

### 3.4 Mount Routes in Main App

In your main Hono app entry point (e.g., `/src/index.ts`):

```typescript
import { Hono } from "hono";
import billing from "./routes/api/billing";
import lemonsqueezyWebhook from "./routes/webhook/lemonsqueezy";

const app = new Hono();

// Mount billing routes
app.route("/api/billing", billing);

// Mount webhook route
app.route("/api/webhook/lemonsqueezy", lemonsqueezyWebhook);

export default app;
```

---

## Phase 4: Database Schema

### 4.1 D1 Migration for Subscriptions Table

Create a migration file for D1:

```sql
-- migrations/0001_create_subscriptions.sql

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  lemonsqueezy_subscription_id TEXT UNIQUE,
  lemonsqueezy_customer_id TEXT,
  lemonsqueezy_product_id INTEGER,
  lemonsqueezy_variant_id INTEGER,
  product_name TEXT,
  variant_name TEXT,
  status TEXT DEFAULT 'inactive',
  renews_at TEXT,
  ends_at TEXT,
  trial_ends_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_ls_id ON subscriptions(lemonsqueezy_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
```

Run migration:

```bash
wrangler d1 migrations apply grove-db --local  # For local testing
wrangler d1 migrations apply grove-db          # For production
```

---

## Phase 5: Lemon Squeezy Dashboard Configuration

### 5.1 Store Setup Checklist

1. **Create Account**: Sign up at https://lemonsqueezy.com
2. **Create Store**: Set up your "Grove" store
3. **Get Store ID**: Found in Settings → Store → Store ID
4. **Create API Key**: Settings → API → Create new key (give it full permissions)
5. **Configure Webhook**:
   - Go to Settings → Webhooks → Add webhook
   - URL: `https://your-domain.com/api/webhook/lemonsqueezy`
   - Secret: Generate a random string (save this for env vars)
   - Events to subscribe:
     - `subscription_created`
     - `subscription_updated`
     - `subscription_cancelled`
     - `subscription_resumed`
     - `subscription_expired`
     - `subscription_paused`
     - `subscription_unpaused`
     - `subscription_payment_success`
     - `subscription_payment_failed`
     - `subscription_payment_recovered`
     - `order_created` (if doing one-time purchases)
     - `order_refunded`

### 5.2 Product Setup

Create products in Lemon Squeezy dashboard:

1. **Grove Pro** (example)
   - Create product "Grove Pro"
   - Add variants:
     - "Monthly" - $X/month (record variant ID)
     - "Yearly" - $Y/year (record variant ID)

2. Update `PLAN_VARIANTS` in billing.ts with actual variant IDs

---

## Phase 6: Testing

### 6.1 Local Testing Setup

1. Use test mode in Lemon Squeezy (toggle in dashboard)
2. Use ngrok or cloudflared to expose local webhook endpoint:

```bash
# Using cloudflared (recommended for Cloudflare Workers)
cloudflared tunnel --url http://localhost:8787

# Or using ngrok
ngrok http 8787
```

3. Update webhook URL in LS dashboard to tunnel URL temporarily

### 6.2 Test Scenarios

1. **New subscription**: Create checkout, complete with test card
2. **Subscription update**: Change plan via API
3. **Cancellation**: Cancel subscription, verify webhook received
4. **Payment failure**: Use LS test mode to simulate failed payment
5. **Webhook signature**: Test with invalid signature, should reject

### 6.3 Test Card Numbers (Lemon Squeezy)

Lemon Squeezy uses Stripe under the hood, so standard Stripe test cards work:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

---

## Phase 7: Cloudflare WAF Configuration

If webhooks are being blocked by Cloudflare's bot protection:

### 7.1 Create WAF Rule

In Cloudflare Dashboard → Security → WAF → Custom Rules:

```
Rule name: Allow Lemon Squeezy Webhooks
Expression: (http.request.uri.path eq "/api/webhook/lemonsqueezy")
Action: Skip (select "All remaining custom rules" and "Super Bot Fight Mode")
```

---

## Phase 8: Go-Live Checklist

- [ ] All Stripe code removed from codebase
- [ ] All Stripe environment variables removed
- [ ] Lemon Squeezy SDK installed
- [ ] Environment variables configured (API key, store ID, webhook secret)
- [ ] `nodejs_compat` flag enabled in wrangler.toml
- [ ] Webhook endpoint deployed and accessible
- [ ] Webhook configured in LS dashboard with correct URL and events
- [ ] Products created in LS with correct pricing
- [ ] Variant IDs updated in codebase
- [ ] Database migration applied
- [ ] WAF rule created (if needed)
- [ ] Test mode purchases completed successfully
- [ ] Switch LS store to live mode
- [ ] Update webhook URL to production domain
- [ ] Verify first live transaction

---

## Appendix A: Lemon Squeezy Subscription Statuses

| Status | Description |
|--------|-------------|
| `on_trial` | Subscription is in trial period |
| `active` | Subscription is active and paid |
| `paused` | Subscription is paused |
| `past_due` | Payment failed, in grace period |
| `unpaid` | Multiple payment failures |
| `cancelled` | Cancelled, will end at period end |
| `expired` | Subscription has ended |

---

## Appendix B: Webhook Event Reference

| Event | When it fires |
|-------|---------------|
| `subscription_created` | New subscription starts |
| `subscription_updated` | Plan change, renewal date change |
| `subscription_cancelled` | User/admin cancels |
| `subscription_resumed` | Cancelled sub is reactivated |
| `subscription_expired` | Subscription period ends |
| `subscription_paused` | Subscription paused |
| `subscription_unpaused` | Subscription unpaused |
| `subscription_payment_success` | Renewal payment succeeds |
| `subscription_payment_failed` | Renewal payment fails |
| `subscription_payment_recovered` | Failed payment recovered |

---

## Appendix C: Useful Links

- Lemon Squeezy API Docs: https://docs.lemonsqueezy.com/api
- Lemon Squeezy JS SDK: https://github.com/lmsqueezy/lemonsqueezy.js
- Webhook Events Reference: https://docs.lemonsqueezy.com/help/webhooks/webhook-requests
- Test Mode Guide: https://docs.lemonsqueezy.com/help/getting-started/test-mode
