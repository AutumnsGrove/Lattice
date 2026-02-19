/**
 * Session Proxy — Heartwood Service Binding
 *
 * Proxies /session/* requests to Heartwood for session management:
 * - /session/validate (POST) — session validation
 * - /session/revoke (POST) — logout / session revocation
 * - /session/list (POST) — list user sessions
 * - /session/revoke-all (POST) — revoke all sessions
 * - /session/{id} (GET/DELETE) — individual session operations
 *
 * Security hardening is centralized in $lib/proxy.ts (HAWK-005/006/007).
 */

import type { RequestHandler } from "./$types";
import { proxyToHeartwood } from "$lib/proxy";

/** Path validation: only letters, digits, hyphens, and slashes */
function validatePath(path: string): boolean {
  return !!path && /^[a-zA-Z0-9\-/]+$/.test(path);
}

const handler: RequestHandler = async (event) => {
  const path = event.params.path || "";
  if (!validatePath(path)) {
    return new Response(JSON.stringify({ error: "Invalid path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return proxyToHeartwood(event, `/session/${path}`);
};

export const GET: RequestHandler = handler;
export const POST: RequestHandler = handler;
export const DELETE: RequestHandler = handler;
