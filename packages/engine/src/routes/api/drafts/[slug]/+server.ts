import { json, error, type RequestHandler } from "@sveltejs/kit";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, logGroveError, throwGroveError } from "$lib/errors";

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
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  const tenants = platform.env.TENANTS;
  if (!tenants) {
    throwGroveError(500, API_ERRORS.DURABLE_OBJECTS_NOT_CONFIGURED, "API");
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
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const { slug } = params;
  if (!slug) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API", {
      detail: "slug required",
    });
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
        throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
      }
      const text = await response.text();
      throwGroveError(response.status, API_ERRORS.OPERATION_FAILED, "API", {
        detail: text,
      });
    }

    const draft = await response.json();
    return json(draft);
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throw error(500, API_ERRORS.OPERATION_FAILED.userMessage);
  }
};

/**
 * Shared upsert logic for PUT and POST (sendBeacon) draft saves.
 * Creates if doesn't exist, updates if it does.
 * Includes deviceId for conflict detection.
 */
async function handleDraftUpsert({
  params,
  request,
  platform,
  locals,
}: Parameters<RequestHandler>[0]): Promise<Response> {
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

  const { slug } = params;
  if (!slug) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API", {
      detail: "slug required",
    });
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
      metadata: { title?: string; description?: string; tags?: string[] };
      deviceId: string;
    };

    // Validate required fields (title defaults to "Untitled" for auto-save before user types)
    if (!data.content || !data.deviceId) {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API", {
        detail: "content, deviceId required",
      });
    }

    // Validate content size (1MB limit)
    if (data.content.length > 1024 * 1024) {
      throwGroveError(400, API_ERRORS.CONTENT_TOO_LARGE, "API");
    }

    // Default title if empty/missing (auto-save fires before user types a title)
    const metadata = {
      ...data.metadata,
      title: data.metadata?.title || "Untitled",
    };

    const stub = await getTenantStub(platform, tenantId);
    const response = await stub.fetch(
      `https://tenant.internal/drafts/${encodeURIComponent(slug)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: data.content,
          metadata,
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

    const result = await response.json();
    return json(result);
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throw error(500, API_ERRORS.OPERATION_FAILED.userMessage);
  }
}

/**
 * PUT /api/drafts/[slug] - Update or create a draft
 *
 * Upsert semantics - creates if doesn't exist, updates if it does.
 */
export const PUT: RequestHandler = async (event) => {
  return handleDraftUpsert(event);
};

/**
 * POST /api/drafts/[slug] - Update or create a draft (sendBeacon path)
 *
 * Identical to PUT — needed because navigator.sendBeacon() always sends POST.
 * CSRF is validated via origin-based fallback in hooks.server.ts.
 */
export const POST: RequestHandler = async (event) => {
  return handleDraftUpsert(event);
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
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const { slug } = params;
  if (!slug) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API", {
      detail: "slug required",
    });
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
      throwGroveError(response.status, API_ERRORS.OPERATION_FAILED, "API", {
        detail: text,
      });
    }

    return json({ success: true, message: "Draft deleted successfully" });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throw error(500, API_ERRORS.OPERATION_FAILED.userMessage);
  }
};
