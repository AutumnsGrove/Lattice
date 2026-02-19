/**
 * CORS Middleware - Cross-Origin Resource Sharing
 */

import type { MiddlewareHandler } from "hono";
import type { Env } from "../types.js";
import { getClientByClientId } from "../db/queries.js";

/**
 * Dynamic CORS middleware based on registered client origins
 */
export const corsMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (
  c,
  next,
) => {
  const origin = c.req.header("Origin");

  // Handle preflight requests
  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  await next();

  // Add CORS headers to response
  const corsHeaders = getCorsHeaders(origin);
  for (const [key, value] of Object.entries(corsHeaders)) {
    c.res.headers.set(key, value);
  }
};

/**
 * Explicitly allowed origins for CORS
 * These correspond to registered client applications in the Grove ecosystem
 */
const ALLOWED_ORIGINS = [
  "https://heartwood.grove.place",
  "https://groveengine.grove.place",
  "https://plant.grove.place",
  "https://autumnsgrove.com",
  "https://amber.grove.place",
  "https://autumn.grove.place", // Property site
] as const;

/**
 * Check if origin matches *.grove.place wildcard pattern
 * Allows any HTTPS subdomain of grove.place for future properties
 */
function isGroveSubdomain(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname.endsWith(".grove.place") && url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Get CORS headers for a given origin
 * Validates against an explicit list of allowed origins
 */
function getCorsHeaders(origin: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (
    origin &&
    (ALLOWED_ORIGINS.includes(origin as (typeof ALLOWED_ORIGINS)[number]) ||
      isGroveSubdomain(origin))
  ) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

/**
 * Validate origin against registered client
 */
export async function validateOriginForClient(
  db: D1Database,
  clientId: string,
  origin: string,
): Promise<boolean> {
  const client = await getClientByClientId(db, clientId);
  if (!client) return false;

  const allowedOrigins: string[] = JSON.parse(client.allowed_origins);
  return allowedOrigins.includes(origin);
}
