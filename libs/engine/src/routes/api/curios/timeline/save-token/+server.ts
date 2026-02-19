/**
 * Timeline Curio API - Save Token Endpoint
 *
 * POST /api/curios/timeline/save-token
 * Saves a single token (GitHub or OpenRouter), writes it to the database,
 * then reads it back to verify it's retrievable. Returns inline success/failure.
 */

import { json, type RequestHandler } from "@sveltejs/kit";
import {
  setTimelineToken,
  getTimelineToken,
  TIMELINE_SECRET_KEYS,
} from "$lib/curios/timeline/secrets.server";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  const body = (await request.json()) as {
    tokenType?: string;
    tokenValue?: string;
  };
  const tokenType = body.tokenType;
  const tokenValue = body.tokenValue?.trim();

  if (!tokenType || !["github", "openrouter"].includes(tokenType as string)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  if (!tokenValue) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  const env = {
    DB: db,
    GROVE_KEK: platform?.env?.GROVE_KEK,
    TOKEN_ENCRYPTION_KEY: platform?.env?.TOKEN_ENCRYPTION_KEY,
  };

  const keyName =
    tokenType === "github"
      ? TIMELINE_SECRET_KEYS.GITHUB_TOKEN
      : TIMELINE_SECRET_KEYS.OPENROUTER_KEY;

  const columnName =
    tokenType === "github"
      ? "github_token_encrypted"
      : "openrouter_key_encrypted";

  try {
    // Save the token
    const saveResult = await setTimelineToken(
      env,
      tenantId,
      keyName,
      tokenValue,
    );

    // Write to legacy column (overwrite any old v1: value)
    await db
      .prepare(
        `UPDATE timeline_curio_config
				 SET ${columnName} = ?, updated_at = strftime('%s', 'now')
				 WHERE tenant_id = ?`,
      )
      .bind(saveResult.legacyValue, tenantId)
      .run();

    console.log(
      `[Timeline Config] Token ${tokenType} saved via ${saveResult.system}` +
        (saveResult.fallbackReason
          ? ` (fallback reason: ${saveResult.fallbackReason})`
          : ""),
    );

    // Read it back to verify it's retrievable
    const row = await db
      .prepare(
        `SELECT ${columnName} FROM timeline_curio_config WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first();

    const legacyValue = row?.[columnName] as string | null;
    const readBack = await getTimelineToken(
      env,
      tenantId,
      keyName,
      legacyValue,
    );

    if (readBack.token) {
      return json({
        success: true,
        tokenType,
        tokenSource: readBack.source,
        verified: true,
        ...(saveResult.fallbackReason && {
          warning: `Used ${saveResult.system} storage (${saveResult.fallbackReason})`,
        }),
      });
    } else {
      console.error(
        `[Timeline Config] Token ${tokenType} saved but read-back failed. ` +
          `Source: ${readBack.source}, Legacy column value prefix: ${legacyValue?.substring(0, 4) ?? "null"}`,
      );
      return json(
        {
          success: false,
          error:
            "Token was saved but could not be verified. Check server logs.",
          tokenType,
        },
        { status: 500 },
      );
    }
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Timeline save-token failed",
      cause: err,
    });
    return json(
      {
        success: false,
        error: "Failed to save token. Please try again.",
      },
      { status: 500 },
    );
  }
};
