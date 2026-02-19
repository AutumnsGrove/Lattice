import { json, error, type RequestHandler } from "@sveltejs/kit";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, logGroveError, throwGroveError } from "$lib/errors";

/**
 * GET /api/drafts - List all drafts for the current tenant
 *
 * Returns draft metadata (not full content) for the draft picker UI.
 * Proxies to TenantDO for cross-device sync.
 */
export const GET: RequestHandler = async ({ platform, locals }) => {
  // Auth check - drafts are private
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
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
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Proxy to TenantDO
    const tenants = platform.env.TENANTS;
    if (!tenants) {
      throwGroveError(500, API_ERRORS.DURABLE_OBJECTS_NOT_CONFIGURED, "API");
    }

    const doId = tenants.idFromName(`tenant:${tenant.subdomain}`);
    const stub = tenants.get(doId);
    const response = await stub.fetch("https://tenant.internal/drafts");

    if (!response.ok) {
      const text = await response.text();
      throwGroveError(response.status, API_ERRORS.OPERATION_FAILED, "API", {
        detail: text,
      });
    }

    const drafts = await response.json();
    return json(drafts);
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throw error(500, API_ERRORS.OPERATION_FAILED.userMessage);
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
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
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
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    const data = (await request.json()) as {
      slug?: string;
      content: string;
      metadata: { title: string; description?: string; tags?: string[] };
      deviceId: string;
    };

    // Validate required fields
    if (!data.content || !data.metadata?.title || !data.deviceId) {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API", {
        detail: "content, metadata.title, deviceId required",
      });
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
      throwGroveError(500, API_ERRORS.DURABLE_OBJECTS_NOT_CONFIGURED, "API");
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
      throwGroveError(response.status, API_ERRORS.OPERATION_FAILED, "API", {
        detail: text,
      });
    }

    const result = (await response.json()) as { lastSaved?: number };
    return json({ success: true, slug, lastSaved: result.lastSaved });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throw error(500, API_ERRORS.OPERATION_FAILED.userMessage);
  }
};
