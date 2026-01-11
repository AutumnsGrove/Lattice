// Public CDN File Server - GET /cdn/[...path]

import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { storage } from "@autumnsgrove/groveengine/services";

/**
 * Validate and return the appropriate CORS origin.
 * Restricts access to grove.place domain and its subdomains.
 */
function validateOrigin(origin: string | null): string {
  if (!origin) return "https://grove.place";

  // Allow grove.place and all subdomains
  if (
    origin === "https://grove.place" ||
    origin === "https://www.grove.place" ||
    /^https:\/\/[\w-]+\.grove\.place$/.test(origin)
  ) {
    return origin;
  }

  return "https://grove.place";
}

export const GET: RequestHandler = async ({ params, platform, request }) => {
  if (!platform) {
    throw error(500, "Platform not available");
  }

  const { CDN_BUCKET } = platform.env;
  const key = params.path;

  if (!key) {
    throw error(400, "File path required");
  }

  const file = await storage.getFile(CDN_BUCKET, key);

  if (!file) {
    throw error(404, "File not found");
  }

  // Check for 304 Not Modified
  if (storage.shouldReturn304(request, file.etag)) {
    const headers = storage.buildFileHeaders(file);
    const origin = request.headers.get("Origin");
    const validatedOrigin = validateOrigin(origin);
    headers.set("Access-Control-Allow-Origin", validatedOrigin);
    headers.set("Vary", "Origin");
    return new Response(null, { status: 304, headers });
  }

  const headers = storage.buildFileHeaders(file);
  const origin = request.headers.get("Origin");
  const validatedOrigin = validateOrigin(origin);
  headers.set("Access-Control-Allow-Origin", validatedOrigin);
  headers.set("Vary", "Origin");
  return new Response(file.body, { headers });
};

export const OPTIONS: RequestHandler = async ({ request }) => {
  const origin = request.headers.get("Origin");
  const validatedOrigin = validateOrigin(origin);

  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": validatedOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
};
