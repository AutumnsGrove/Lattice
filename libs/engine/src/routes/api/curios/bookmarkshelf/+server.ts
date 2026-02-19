/**
 * Bookmark Shelf Curio API — Shelves & Bookmarks
 *
 * GET  — Get all shelves with bookmarks (public)
 * POST — Create a shelf (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generateShelfId,
  sanitizeShelfName,
  sanitizeDescription,
  MAX_SHELVES_PER_TENANT,
} from "$lib/curios/bookmarkshelf";

interface ShelfRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

interface BookmarkRow {
  id: string;
  shelf_id: string;
  url: string;
  title: string;
  author: string | null;
  description: string | null;
  cover_url: string | null;
  category: string | null;
  is_currently_reading: number;
  is_favorite: number;
  sort_order: number;
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

  const [shelvesResult, bookmarksResult] = await Promise.all([
    db
      .prepare(
        `SELECT id, name, description, sort_order
         FROM bookmark_shelves WHERE tenant_id = ?
         ORDER BY sort_order ASC, created_at ASC LIMIT 500`,
      )
      .bind(tenantId)
      .all<ShelfRow>(),
    db
      .prepare(
        `SELECT b.id, b.shelf_id, b.url, b.title, b.author, b.description,
                b.cover_url, b.category, b.is_currently_reading, b.is_favorite, b.sort_order
         FROM bookmarks b
         JOIN bookmark_shelves s ON b.shelf_id = s.id
         WHERE s.tenant_id = ?
         ORDER BY b.sort_order ASC, b.added_at ASC LIMIT 500`,
      )
      .bind(tenantId)
      .all<BookmarkRow>(),
  ]);

  const bookmarksByShelf = new Map<string, typeof formattedBookmarks>();
  const formattedBookmarks = bookmarksResult.results.map((row) => ({
    id: row.id,
    shelfId: row.shelf_id,
    url: row.url,
    title: row.title,
    author: row.author,
    description: row.description,
    coverUrl: row.cover_url,
    category: row.category,
    isCurrentlyReading: row.is_currently_reading === 1,
    isFavorite: row.is_favorite === 1,
  }));

  for (const bm of formattedBookmarks) {
    const list = bookmarksByShelf.get(bm.shelfId) || [];
    list.push(bm);
    bookmarksByShelf.set(bm.shelfId, list);
  }

  const shelves = shelvesResult.results.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    bookmarks: bookmarksByShelf.get(row.id) || [],
  }));

  return json(
    { shelves },
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

  const name = sanitizeShelfName(body.name as string);
  if (!name) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  const description = sanitizeDescription(body.description as string);
  const id = generateShelfId();

  // Enforce per-tenant shelf limit
  const countResult = await db
    .prepare(
      `SELECT COUNT(*) as count FROM bookmark_shelves WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<{ count: number }>();
  if ((countResult?.count ?? 0) >= MAX_SHELVES_PER_TENANT) {
    throwGroveError(400, API_ERRORS.RATE_LIMITED, "API");
  }

  try {
    const maxSort = await db
      .prepare(
        `SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM bookmark_shelves WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<{ max_sort: number }>();

    const sortOrder = (maxSort?.max_sort ?? -1) + 1;

    await db
      .prepare(
        `INSERT INTO bookmark_shelves (id, tenant_id, name, description, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(id, tenantId, name, description, sortOrder)
      .run();

    return json({ success: true, id }, { status: 201 });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Shelf create failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
