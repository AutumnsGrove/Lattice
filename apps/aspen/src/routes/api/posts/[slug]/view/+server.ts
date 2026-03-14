/**
 * Backwards compatibility: Redirect /api/posts/[slug]/view → /api/blooms/[slug]/view
 *
 * Uses 308 Permanent Redirect to preserve HTTP method and body.
 */
import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

export const POST: RequestHandler = async ({ url }) => {
  const newPath =
    url.pathname.replace("/api/posts", "/api/blooms") + url.search;
  throw redirect(308, newPath);
};
