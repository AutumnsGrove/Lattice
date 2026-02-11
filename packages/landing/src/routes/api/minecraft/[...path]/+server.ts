/**
 * Minecraft API Proxy - Catch-all proxy to Heartwood
 *
 * Proxies /api/minecraft/* → Heartwood /minecraft/* via service binding.
 * Used by client-side components (ModpackManager, WorldManager) for operations
 * that need direct fetch (binary uploads, file downloads) rather than form actions.
 *
 * Endpoints proxied:
 * - GET    /api/minecraft/mods             → List installed mods
 * - POST   /api/minecraft/mods/upload      → Upload mod (.jar binary)
 * - DELETE /api/minecraft/mods/:filename   → Delete specific mod
 * - DELETE /api/minecraft/mods             → Delete all mods
 * - GET    /api/minecraft/world            → World info (size, seed)
 * - DELETE /api/minecraft/world            → Reset world
 * - GET    /api/minecraft/backups          → List backups
 * - POST   /api/minecraft/backups/:id/restore  → Restore backup
 * - GET    /api/minecraft/backups/:id/download → Download backup
 */

import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { isWayfinder } from "@autumnsgrove/groveengine/config";

/** Headers to forward from client request to Heartwood */
const FORWARD_HEADERS = [
  "content-type",
  "x-filename",
  "x-confirm-delete",
  "x-confirm-restore",
];

async function proxy(event: Parameters<RequestHandler>[0]): Promise<Response> {
  const { request, locals, platform, url } = event;

  if (!locals.user) throw error(401, "Unauthorized");
  if (!isWayfinder(locals.user.email)) throw error(403, "Access denied");
  if (!platform?.env?.AUTH) throw error(500, "Service not available");

  // Map /api/minecraft/* → /minecraft/*
  const heartwoodPath = url.pathname.replace(/^\/api/, "") + url.search;

  // Collect headers to forward
  const headers: Record<string, string> = {
    Cookie: request.headers.get("Cookie") || "",
  };
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }

  // Forward body for non-GET/HEAD requests
  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const res = await platform.env.AUTH.fetch(
    new Request(`https://login.grove.place${heartwoodPath}`, {
      method: request.method,
      headers,
      body,
    }),
  );

  // Return response, stripping hop-by-hop headers
  const responseHeaders = new Headers();
  for (const [key, value] of res.headers.entries()) {
    if (!["transfer-encoding", "connection"].includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
}

export const GET: RequestHandler = proxy;
export const POST: RequestHandler = proxy;
export const PUT: RequestHandler = proxy;
export const DELETE: RequestHandler = proxy;
