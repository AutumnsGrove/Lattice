/**
 * Tenant Secrets API
 *
 * CRUD operations for tenant secrets using envelope encryption.
 * All operations require tenant ownership verification.
 *
 * Endpoints:
 * - GET: List all secret keys (no values)
 * - PUT: Create or update a secret
 * - DELETE: Remove a secret
 */

import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { createSecretsManager } from "$lib/server/secrets";

/**
 * GET /api/tenants/[tenantId]/secrets
 *
 * List all secret keys for a tenant (values are never exposed).
 * Returns an array of { keyName, createdAt, updatedAt }.
 */
export async function GET({
  params,
  platform,
  locals,
}: {
  params: { tenantId: string };
  platform: App.Platform | undefined;
  locals: App.Locals;
}) {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  if (!platform?.env?.GROVE_KEK) {
    throw error(500, "Secrets Store not configured");
  }

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      params.tenantId,
      locals.user,
    );

    const secrets = await createSecretsManager(platform.env);
    const list = await secrets.listSecrets(tenantId);

    return json({
      success: true,
      secrets: list,
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Secrets API] List failed:", err);
    throw error(500, "Failed to list secrets");
  }
}

/**
 * PUT /api/tenants/[tenantId]/secrets
 *
 * Create or update a secret.
 * Body: { keyName: string, value: string }
 */
export async function PUT({
  params,
  request,
  platform,
  locals,
}: {
  params: { tenantId: string };
  request: Request;
  platform: App.Platform | undefined;
  locals: App.Locals;
}) {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  if (!platform?.env?.GROVE_KEK) {
    throw error(500, "Secrets Store not configured");
  }

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      params.tenantId,
      locals.user,
    );

    const body = (await request.json()) as { keyName?: string; value?: string };

    if (!body.keyName || typeof body.keyName !== "string") {
      throw error(400, "keyName is required and must be a string");
    }

    if (typeof body.value !== "string") {
      throw error(400, "value is required and must be a string");
    }

    // Validate keyName format (alphanumeric, underscores, hyphens)
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(body.keyName)) {
      throw error(
        400,
        "keyName must start with a letter and contain only letters, numbers, underscores, and hyphens",
      );
    }

    // Limit keyName length
    if (body.keyName.length > 64) {
      throw error(400, "keyName must be 64 characters or less");
    }

    const secrets = await createSecretsManager(platform.env);
    await secrets.setSecret(tenantId, body.keyName, body.value);

    return json({
      success: true,
      message: `Secret '${body.keyName}' saved`,
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Secrets API] Set failed:", err);
    throw error(500, "Failed to save secret");
  }
}

/**
 * DELETE /api/tenants/[tenantId]/secrets
 *
 * Delete a secret by keyName.
 * Body: { keyName: string }
 */
export async function DELETE({
  params,
  request,
  platform,
  locals,
}: {
  params: { tenantId: string };
  request: Request;
  platform: App.Platform | undefined;
  locals: App.Locals;
}) {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  if (!platform?.env?.GROVE_KEK) {
    throw error(500, "Secrets Store not configured");
  }

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      params.tenantId,
      locals.user,
    );

    const body = (await request.json()) as { keyName?: string };

    if (!body.keyName || typeof body.keyName !== "string") {
      throw error(400, "keyName is required");
    }

    const secrets = await createSecretsManager(platform.env);
    const deleted = await secrets.deleteSecret(tenantId, body.keyName);

    if (!deleted) {
      throw error(404, `Secret '${body.keyName}' not found`);
    }

    return json({
      success: true,
      message: `Secret '${body.keyName}' deleted`,
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Secrets API] Delete failed:", err);
    throw error(500, "Failed to delete secret");
  }
}
