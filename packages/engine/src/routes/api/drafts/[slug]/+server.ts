import { json, error, type RequestHandler } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";

/**
 * Helper to get TenantDO stub for the current tenant
 */
async function getTenantStub(
  platform: App.Platform,
  tenantId: string,
): Promise<DurableObjectStub> {
  const tenant = await platform.env.DB.prepare(
    "SELECT subdomain FROM tenants WHERE id = ?",
  )
    .bind(tenantId)
    .first<{ subdomain: string }>();

  if (!tenant) {
    throw error(404, "Tenant not found");
  }

  const tenants = platform.env.TENANTS;
  if (!tenants) {
    throw error(500, "Durable Objects not configured");
  }

  const doId = tenants.idFromName(`tenant:${tenant.subdomain}`);
  return tenants.get(doId);
}

/**
 * GET /api/drafts/[slug] - Get a specific draft
 *
 * Returns the full draft content for editing.
 * Supports cross-device sync via TenantDO.
 */
export const GET: RequestHandler = async ({ params, platform, locals }) => {
  // Auth check - drafts are private
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  if (!locals.tenantId) {
    throw error(400, "Tenant context required");
  }

  const { slug } = params;
  if (!slug) {
    throw error(400, "Slug is required");
  }

  try {
    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );

    const stub = await getTenantStub(platform, tenantId);
    const response = await stub.fetch(
      `https://tenant.internal/drafts/${encodeURIComponent(slug)}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw error(404, "Draft not found");
      }
      const text = await response.text();
      throw error(response.status, text || "Failed to fetch draft");
    }

    const draft = await response.json();
    return json(draft);
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Drafts API] Error fetching draft:", err);
    throw error(500, "Failed to fetch draft");
  }
};

/**
 * PUT /api/drafts/[slug] - Update or create a draft
 *
 * Upsert semantics - creates if doesn't exist, updates if it does.
 * Includes deviceId for conflict detection.
 */
export const PUT: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
  // Auth check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  if (!locals.tenantId) {
    throw error(400, "Tenant context required");
  }

  const { slug } = params;
  if (!slug) {
    throw error(400, "Slug is required");
  }

  try {
    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );

    const data = (await request.json()) as {
      content: string;
      metadata: { title: string; description?: string; tags?: string[] };
      deviceId: string;
    };

    // Validate required fields
    if (!data.content || !data.metadata?.title || !data.deviceId) {
      throw error(
        400,
        "Missing required fields: content, metadata.title, deviceId",
      );
    }

    // Validate content size (1MB limit)
    if (data.content.length > 1024 * 1024) {
      throw error(400, "Draft content too large (max 1MB)");
    }

    const stub = await getTenantStub(platform, tenantId);
    const response = await stub.fetch(
      `https://tenant.internal/drafts/${encodeURIComponent(slug)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: data.content,
          metadata: data.metadata,
          deviceId: data.deviceId,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw error(response.status, text || "Failed to save draft");
    }

    const result = await response.json();
    return json(result);
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Drafts API] Error saving draft:", err);
    throw error(500, "Failed to save draft");
  }
};

/**
 * DELETE /api/drafts/[slug] - Delete a draft
 *
 * Permanently removes the draft from TenantDO storage.
 */
export const DELETE: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
  // Auth check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  if (!locals.tenantId) {
    throw error(400, "Tenant context required");
  }

  const { slug } = params;
  if (!slug) {
    throw error(400, "Slug is required");
  }

  try {
    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );

    const stub = await getTenantStub(platform, tenantId);
    const response = await stub.fetch(
      `https://tenant.internal/drafts/${encodeURIComponent(slug)}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Idempotent delete - return success even if not found
        return json({
          success: true,
          message: "Draft not found or already deleted",
        });
      }
      const text = await response.text();
      throw error(response.status, text || "Failed to delete draft");
    }

    return json({ success: true, message: "Draft deleted successfully" });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Drafts API] Error deleting draft:", err);
    throw error(500, "Failed to delete draft");
  }
};
