/**
 * Backwards compatibility: Redirect /api/posts/[slug]/reactions → /api/blooms/[slug]/reactions
 *
 * Uses 308 Permanent Redirect to preserve HTTP method and body.
 */
import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

export const GET: RequestHandler = async ({ url }) => {
  const newPath =
    url.pathname.replace("/api/posts", "/api/blooms") + url.search;
  throw redirect(308, newPath);
};

export const POST: RequestHandler = async ({ url }) => {
  const newPath =
    url.pathname.replace("/api/posts", "/api/blooms") + url.search;
  throw redirect(308, newPath);
};
