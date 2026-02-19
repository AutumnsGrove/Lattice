/**
 * API Key Authentication Middleware
 *
 * Validates X-API-Key header on protected endpoints.
 * Prevents unauthorized access to email sending functionality.
 */

import type { Context, Next } from "hono";
import type { Env } from "../types";
import { ZEPHYR_ERRORS, logZephyrError } from "../errors";

/**
 * API key validation result
 */
export interface AuthResult {
  valid: boolean;
  tenant?: string;
  error?: string;
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 *
 * Hashes both inputs first so the comparison always operates on
 * equal-length buffers — no early return that leaks key length.
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const viewA = new Uint8Array(hashA);
  const viewB = new Uint8Array(hashB);
  let result = 0;
  for (let i = 0; i < viewA.length; i++) {
    result |= viewA[i] ^ viewB[i];
  }
  return result === 0;
}

/**
 * Validate API key from request header
 *
 * Validates against ZEPHYR_API_KEY environment variable.
 * In production, consider validating against a database of valid keys
 * with tenant mapping for multi-tenant scenarios.
 */
export async function validateApiKey(
  env: Env,
  apiKey: string | undefined,
): Promise<AuthResult> {
  if (!apiKey) {
    return { valid: false, error: ZEPHYR_ERRORS.MISSING_API_KEY.code };
  }

  // Basic format validation
  if (apiKey.length < 16) {
    return { valid: false, error: ZEPHYR_ERRORS.INVALID_API_KEY_FORMAT.code };
  }

  // Validate against configured API key
  const validKey = env.ZEPHYR_API_KEY;
  if (!validKey) {
    logZephyrError(ZEPHYR_ERRORS.API_KEY_NOT_CONFIGURED);
    return { valid: false, error: ZEPHYR_ERRORS.API_KEY_NOT_CONFIGURED.code };
  }

  // Use timing-safe comparison to prevent timing attacks
  if (!(await timingSafeEqual(apiKey, validKey))) {
    return { valid: false, error: ZEPHYR_ERRORS.INVALID_API_KEY.code };
  }

  return { valid: true, tenant: "default" };
}

/**
 * Hono context variables for authenticated requests
 */
export interface AuthVariables {
  tenant?: string;
}

/**
 * Hono middleware for API key authentication
 *
 * Usage: app.use('/send', authMiddleware)
 */
export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: AuthVariables }>,
  next: Next,
) {
  const apiKey = c.req.header("X-API-Key");

  if (!apiKey) {
    return c.json(
      {
        success: false,
        errorCode: ZEPHYR_ERRORS.MISSING_API_KEY.code,
        errorMessage: ZEPHYR_ERRORS.MISSING_API_KEY.userMessage,
      },
      401,
    );
  }

  const result = await validateApiKey(c.env, apiKey);

  if (!result.valid) {
    // Map the error code back to the catalog for the user message
    const errorDef = Object.values(ZEPHYR_ERRORS).find(
      (e) => e.code === result.error,
    );
    return c.json(
      {
        success: false,
        errorCode: result.error || ZEPHYR_ERRORS.INVALID_API_KEY.code,
        errorMessage:
          errorDef?.userMessage || ZEPHYR_ERRORS.INVALID_API_KEY.userMessage,
      },
      401,
    );
  }

  // Store tenant in context for downstream use
  c.set("tenant", result.tenant);

  await next();
}
