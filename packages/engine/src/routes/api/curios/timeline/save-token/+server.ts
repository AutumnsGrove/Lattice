/**
 * Timeline Curio API - Save Token Endpoint
 *
 * POST /api/curios/timeline/save-token
 * Saves a single token (GitHub or OpenRouter), writes it to the database,
 * then reads it back to verify it's retrievable. Returns inline success/failure.
 */

import { json, error, type RequestHandler } from "@sveltejs/kit";
import {
  setTimelineToken,
  getTimelineToken,
  TIMELINE_SECRET_KEYS,
} from "$lib/curios/timeline/secrets.server";

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!locals.user) {
    throw error(401, "Authentication required");
  }

  if (!db || !tenantId) {
    throw error(500, "Database not available");
  }

  const body = (await request.json()) as {
    tokenType?: string;
    tokenValue?: string;
  };
  const tokenType = body.tokenType;
  const tokenValue = body.tokenValue?.trim();

  if (!tokenType || !["github", "openrouter"].includes(tokenType as string)) {
    throw error(400, "Invalid token type");
  }

  if (!tokenValue) {
    throw error(400, "Token value is required");
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
      `[Timeline Config] Token ${tokenType} saved via ${saveResult.system}`,
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
    console.error(`[Timeline Config] save-token failed:`, err);
    return json(
      {
        success: false,
        error: `Failed to save ${tokenType} token`,
        tokenType,
      },
      { status: 500 },
    );
  }
};
