/**
 * Blogroll Curio API — List & Create
 *
 * GET  — Get all blogroll items (public)
 * POST — Add a blog (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generateBlogrollId,
  isValidUrl,
  sanitizeTitle,
  sanitizeDescription,
  buildFaviconUrl,
  MAX_URL_LENGTH,
  MAX_FEED_URL_LENGTH,
  MAX_BLOGROLL_ENTRIES_PER_TENANT,
} from "$lib/curios/blogroll";

interface BlogrollRow {
  id: string;
  tenant_id: string;
  url: string;
  title: string;
  description: string | null;
  feed_url: string | null;
  favicon_url: string | null;
  last_post_title: string | null;
  last_post_url: string | null;
  last_post_date: string | null;
  sort_order: number;
  added_at: string;
}

export const GET: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const result = await db
    .prepare(
      `SELECT id, url, title, description, favicon_url, last_post_title, last_post_url, last_post_date
       FROM blogroll_items WHERE tenant_id = ?
       ORDER BY sort_order ASC, added_at ASC LIMIT 500`,
    )
    .bind(tenantId)
    .all<BlogrollRow>();

  const items = result.results.map((row) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    faviconUrl: row.favicon_url,
    lastPostTitle: row.last_post_title,
    lastPostUrl: row.last_post_url,
    lastPostDate: row.last_post_date,
  }));

  return json(
    { items },
    {
      headers: {
        "Cache-Control": "public, max-age=120, stale-while-revalidate=240",
      },
    },
  );
};

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  const url = (body.url as string)?.trim();
  if (!url || !isValidUrl(url) || url.length > MAX_URL_LENGTH) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const title = sanitizeTitle(body.title as string);
  if (!title) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  const description = sanitizeDescription(body.description as string);
  const feedUrl = (body.feedUrl as string)?.trim() || null;
  if (
    feedUrl &&
    (!isValidUrl(feedUrl) || feedUrl.length > MAX_FEED_URL_LENGTH)
  ) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const faviconUrl = buildFaviconUrl(url);
  const id = generateBlogrollId();

  // Parallelize count + max sort queries (independent, ~100-300ms each)
  const [countResult, maxSort] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) as count FROM blogroll_items WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<{ count: number }>(),
    db
      .prepare(
        `SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM blogroll_items WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<{ max_sort: number }>(),
  ]);

  if ((countResult?.count ?? 0) >= MAX_BLOGROLL_ENTRIES_PER_TENANT) {
    throwGroveError(400, API_ERRORS.RATE_LIMITED, "API");
  }

  try {
    const sortOrder = (maxSort?.max_sort ?? -1) + 1;

    await db
      .prepare(
        `INSERT INTO blogroll_items (id, tenant_id, url, title, description, feed_url, favicon_url, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        tenantId,
        url,
        title,
        description,
        feedUrl,
        faviconUrl,
        sortOrder,
      )
      .run();

    return json({ success: true, id }, { status: 201 });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Blogroll add failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
