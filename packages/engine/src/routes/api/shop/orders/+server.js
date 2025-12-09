import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { getOrders, getOrderById, updateOrderStatus } from "$lib/payments/shop";
import { getVerifiedTenantId } from "$lib/auth/session.js";

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
export async function GET({ url, platform, locals }) {
  if (SHOP_DISABLED) {
    throw error(503, SHOP_DISABLED_MESSAGE);
  }

  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.POSTS_DB) {
    throw error(500, "Database not configured");
  }

  const requestedTenantId =
    url.searchParams.get("tenant_id") || locals.tenant?.id;

  try {
    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.POSTS_DB,
      requestedTenantId,
      locals.user,
    );

    const orders = await getOrders(platform.env.POSTS_DB, tenantId, {
      status: url.searchParams.get("status") || undefined,
      paymentStatus: url.searchParams.get("payment_status") || undefined,
      limit: url.searchParams.get("limit")
        ? parseInt(url.searchParams.get("limit"))
        : 50,
      offset: url.searchParams.get("offset")
        ? parseInt(url.searchParams.get("offset"))
        : 0,
    });

    return json({ orders });
  } catch (err) {
    if (err.status) throw err;
    console.error("Error fetching orders:", err);
    throw error(500, "Failed to fetch orders");
  }
}

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
export async function PATCH({ request, platform, locals }) {
  if (SHOP_DISABLED) {
    throw error(503, SHOP_DISABLED_MESSAGE);
  }

  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.POSTS_DB) {
    throw error(500, "Database not configured");
  }

  try {
    const data = await request.json();

    if (!data.orderId) {
      throw error(400, "Order ID required");
    }

    // Get order to verify it exists
    const order = await getOrderById(platform.env.POSTS_DB, data.orderId);
    if (!order) {
      throw error(404, "Order not found");
    }

    // Verify user owns the tenant this order belongs to
    await getVerifiedTenantId(
      platform.env.POSTS_DB,
      order.tenant_id,
      locals.user,
    );

    // Build update query
    const updates = [];
    const params = [];

    if (data.status) {
      const validStatuses = [
        "pending",
        "paid",
        "processing",
        "shipped",
        "completed",
        "canceled",
        "refunded",
      ];
      if (!validStatuses.includes(data.status)) {
        throw error(400, "Invalid status");
      }
      updates.push("status = ?");
      params.push(data.status);

      // Set timestamp for specific statuses
      if (data.status === "shipped") {
        updates.push("shipped_at = ?");
        params.push(Math.floor(Date.now() / 1000));
      } else if (data.status === "completed") {
        updates.push("fulfilled_at = ?");
        params.push(Math.floor(Date.now() / 1000));
      } else if (data.status === "canceled") {
        updates.push("canceled_at = ?");
        params.push(Math.floor(Date.now() / 1000));
      }
    }

    if (data.trackingNumber !== undefined) {
      updates.push("tracking_number = ?");
      params.push(data.trackingNumber);
    }

    if (data.trackingUrl !== undefined) {
      updates.push("tracking_url = ?");
      params.push(data.trackingUrl);
    }

    if (data.shippingCarrier !== undefined) {
      updates.push("shipping_carrier = ?");
      params.push(data.shippingCarrier);
    }

    if (data.internalNotes !== undefined) {
      updates.push("internal_notes = ?");
      params.push(data.internalNotes);
    }

    if (updates.length === 0) {
      throw error(400, "No updates provided");
    }

    updates.push("updated_at = ?");
    params.push(Math.floor(Date.now() / 1000));
    params.push(data.orderId);

    await platform.env.POSTS_DB.prepare(
      `UPDATE orders SET ${updates.join(", ")} WHERE id = ?`,
    )
      .bind(...params)
      .run();

    // Fetch updated order
    const updatedOrder = await getOrderById(
      platform.env.POSTS_DB,
      data.orderId,
    );

    return json({
      success: true,
      order: updatedOrder,
    });
  } catch (err) {
    if (err.status) throw err;
    console.error("Error updating order:", err);
    throw error(500, "Failed to update order");
  }
}
