import { json, error, type RequestHandler } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";

/**
 * GET /api/drafts - List all drafts for the current tenant
 *
 * Returns draft metadata (not full content) for the draft picker UI.
 * Proxies to TenantDO for cross-device sync.
 */
export const GET: RequestHandler = async ({ platform, locals }) => {
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

  try {
    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );

    // Get tenant subdomain for DO lookup
    const tenant = await platform.env.DB.prepare(
      "SELECT subdomain FROM tenants WHERE id = ?",
    )
      .bind(tenantId)
      .first<{ subdomain: string }>();

    if (!tenant) {
      throw error(404, "Tenant not found");
    }

    // Proxy to TenantDO
    const tenants = platform.env.TENANTS;
    if (!tenants) {
      throw error(500, "Durable Objects not configured");
    }

    const doId = tenants.idFromName(`tenant:${tenant.subdomain}`);
    const stub = tenants.get(doId);
    const response = await stub.fetch("https://tenant.internal/drafts");

    if (!response.ok) {
      const text = await response.text();
      throw error(response.status, text || "Failed to fetch drafts");
    }

    const drafts = await response.json();
    return json(drafts);
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Drafts API] Error listing drafts:", err);
    throw error(500, "Failed to list drafts");
  }
};

/**
 * POST /api/drafts - Create a new draft
 *
 * Creates a draft with auto-generated slug if not provided.
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
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

  try {
    // Verify user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );

    // Get tenant subdomain for DO lookup
    const tenant = await platform.env.DB.prepare(
      "SELECT subdomain FROM tenants WHERE id = ?",
    )
      .bind(tenantId)
      .first<{ subdomain: string }>();

    if (!tenant) {
      throw error(404, "Tenant not found");
    }

    const data = (await request.json()) as {
      slug?: string;
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

    // Generate slug if not provided
    const slug =
      data.slug ||
      data.metadata.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
        "-draft-" +
        Date.now();

    // Proxy to TenantDO
    const tenants = platform.env.TENANTS;
    if (!tenants) {
      throw error(500, "Durable Objects not configured");
    }

    const doId = tenants.idFromName(`tenant:${tenant.subdomain}`);
    const stub = tenants.get(doId);
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
      throw error(response.status, text || "Failed to create draft");
    }

    const result = (await response.json()) as { lastSaved?: number };
    return json({ success: true, slug, lastSaved: result.lastSaved });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Drafts API] Error creating draft:", err);
    throw error(500, "Failed to create draft");
  }
};
