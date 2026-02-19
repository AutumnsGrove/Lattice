/**
 * Auth API Proxy — Heartwood Service Binding
 *
 * Catch-all route that proxies all /api/auth/* requests to Heartwood
 * via Cloudflare service binding (Worker-to-Worker, no public internet).
 *
 * Security hardening is centralized in $lib/proxy.ts (HAWK-005/006/007).
 *
 * By running on login.grove.place (same origin as the auth UI pages),
 * all cookies are first-party and WebAuthn origin matches automatically.
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

  return proxyToHeartwood(event, `/api/auth/${path}`);
};

export const GET: RequestHandler = handler;
export const POST: RequestHandler = handler;
export const PUT: RequestHandler = handler;
export const DELETE: RequestHandler = handler;
export const PATCH: RequestHandler = handler;
