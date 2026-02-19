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
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { createSecretsManager } from "$lib/server/secrets";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";

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
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!platform?.env?.GROVE_KEK) {
    throwGroveError(500, API_ERRORS.KEK_NOT_CONFIGURED, "API");
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
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
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
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!platform?.env?.GROVE_KEK) {
    throwGroveError(500, API_ERRORS.KEK_NOT_CONFIGURED, "API");
  }

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      params.tenantId,
      locals.user,
    );

    const body = (await request.json()) as { keyName?: string; value?: string };

    if (!body.keyName || typeof body.keyName !== "string") {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }

    if (typeof body.value !== "string") {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }

    // Validate keyName format (alphanumeric, underscores, hyphens)
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(body.keyName)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }

    // Limit keyName length
    if (body.keyName.length > 64) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }

    const secrets = await createSecretsManager(platform.env);
    await secrets.setSecret(tenantId, body.keyName, body.value);

    return json({
      success: true,
      message: `Secret '${body.keyName}' saved`,
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
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
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!platform?.env?.GROVE_KEK) {
    throwGroveError(500, API_ERRORS.KEK_NOT_CONFIGURED, "API");
  }

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      params.tenantId,
      locals.user,
    );

    const body = (await request.json()) as { keyName?: string };

    if (!body.keyName || typeof body.keyName !== "string") {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }

    const secrets = await createSecretsManager(platform.env);
    const deleted = await secrets.deleteSecret(tenantId, body.keyName);

    if (!deleted) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    return json({
      success: true,
      message: `Secret '${body.keyName}' deleted`,
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
}
