import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getOrders, getOrderById, updateOrderStatus } from "$lib/payments/shop";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import type { OrderStatus, PaymentStatus } from "$lib/payments/types";
import { API_ERRORS, throwGroveError } from "$lib/errors";

// Shop feature is temporarily disabled - deferred to Phase 5 (Grove Social and beyond)
const SHOP_DISABLED = true;
const SHOP_DISABLED_MESSAGE =
  "Shop feature is temporarily disabled. It will be available in a future release.";

/**
 * GET /api/shop/orders - List orders for a tenant
 *
 * Query params:
 * - status: 'pending' | 'paid' | 'processing' | 'shipped' | 'completed' | 'canceled' | 'refunded'
 * - payment_status: 'pending' | 'succeeded' | 'failed' | 'refunded'
 * - limit: number
 * - offset: number
 */
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  if (SHOP_DISABLED) {
    throwGroveError(503, API_ERRORS.FEATURE_DISABLED, "API");
  }

  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenantId;

  try {
    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user,
    );

    const orders = await getOrders(platform.env.DB, tenantId, {
      status: (url.searchParams.get("status") || undefined) as
        | OrderStatus
        | undefined,
      paymentStatus: (url.searchParams.get("payment_status") || undefined) as
        | PaymentStatus
        | undefined,
      limit: parseInt(url.searchParams.get("limit") || "50"),
      offset: parseInt(url.searchParams.get("offset") || "0"),
    });

    return json({ orders });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err;
    console.error("Error fetching orders:", err);
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};

/**
 * PATCH /api/shop/orders - Update order status
 *
 * Body:
 * {
 *   orderId: string
 *   status?: string
 *   trackingNumber?: string
 *   trackingUrl?: string
 *   internalNotes?: string
 * }
 */
export const PATCH: RequestHandler = async ({ request, platform, locals }) => {
  if (SHOP_DISABLED) {
    throwGroveError(503, API_ERRORS.FEATURE_DISABLED, "API");
  }

  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  try {
    const data = (await request.json()) as Record<string, unknown>;

    const orderId = data.orderId as string;
    if (!orderId) {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }

    // Get order to verify it exists
    const order = await getOrderById(platform.env.DB, orderId);
    if (!order) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Verify user owns the tenant this order belongs to
    const orderTenantId =
      (order as Record<string, any>).tenant_id || order.tenantId;
    await getVerifiedTenantId(
      platform.env.DB,
      orderTenantId as string,
      locals.user,
    );

    // Build update query
    const updates: string[] = [];
    const params: unknown[] = [];

    const newStatus = data.status as string | undefined;
    if (newStatus) {
      const validStatuses: OrderStatus[] = [
        "pending",
        "paid",
        "processing",
        "shipped",
        "completed",
        "canceled",
        "refunded",
      ];
      if (!validStatuses.includes(newStatus as OrderStatus)) {
        throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
      }
      updates.push("status = ?");
      params.push(newStatus);

      // Set timestamp for specific statuses
      if (newStatus === "shipped") {
        updates.push("shipped_at = ?");
        params.push(Math.floor(Date.now() / 1000));
      } else if (newStatus === "completed") {
        updates.push("fulfilled_at = ?");
        params.push(Math.floor(Date.now() / 1000));
      } else if (newStatus === "canceled") {
        updates.push("canceled_at = ?");
        params.push(Math.floor(Date.now() / 1000));
      }
    }

    if (data.trackingNumber !== undefined) {
      updates.push("tracking_number = ?");
      params.push(data.trackingNumber as string | null);
    }

    if (data.trackingUrl !== undefined) {
      updates.push("tracking_url = ?");
      params.push(data.trackingUrl as string | null);
    }

    if (data.shippingCarrier !== undefined) {
      updates.push("shipping_carrier = ?");
      params.push(data.shippingCarrier as string | null);
    }

    if (data.internalNotes !== undefined) {
      updates.push("internal_notes = ?");
      params.push(data.internalNotes as string | null);
    }

    if (updates.length === 0) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }

    updates.push("updated_at = ?");
    params.push(Math.floor(Date.now() / 1000));
    params.push(orderId);

    // SECURITY: Include tenant_id in WHERE for defense-in-depth (S2-F4)
    // Ownership is verified above via getVerifiedTenantId(), but database-level
    // scoping prevents TOCTOU race conditions
    await platform.env.DB.prepare(
      `UPDATE orders SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
    )
      .bind(...params, orderTenantId)
      .run();

    // Fetch updated order
    const updatedOrder = await getOrderById(platform.env.DB, orderId);

    return json({
      success: true,
      order: updatedOrder,
    });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err;
    console.error("Error updating order:", err);
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
