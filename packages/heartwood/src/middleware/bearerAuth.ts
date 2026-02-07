/**
 * Shared Bearer Token Extraction
 *
 * Centralizes the "extract and verify Bearer token" pattern used across
 * subscription, CDN, and cookie auth routes. One place to fix auth bugs.
 */

import type { Env } from "../types.js";
import type { JWTPayload } from "../types.js";
import { verifyAccessToken } from "../services/jwt.js";

/**
 * Extract a Bearer token from the Authorization header.
 * Returns the raw token string, or null if not present/malformed.
 */
export function extractBearerToken(header: string | undefined): string | null {
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  return header.substring(7);
}

/**
 * Extract and verify a Bearer token from a request-like object.
 * Returns the verified JWT payload, or null if missing/invalid.
 */
export async function verifyBearerAuth(
  req: { header: (name: string) => string | undefined },
  env: Env,
): Promise<JWTPayload | null> {
  const token = extractBearerToken(req.header("Authorization"));
  if (!token) return null;
  return verifyAccessToken(env, token);
}
