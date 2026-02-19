/**
 * Backwards compatibility: Redirect /api/posts/[slug] → /api/blooms/[slug]
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

export const PUT: RequestHandler = async ({ url }) => {
  const newPath =
    url.pathname.replace("/api/posts", "/api/blooms") + url.search;
  throw redirect(308, newPath);
};

export const DELETE: RequestHandler = async ({ url }) => {
  const newPath =
    url.pathname.replace("/api/posts", "/api/blooms") + url.search;
  throw redirect(308, newPath);
};
