import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
  generateShelfId,
  generateBookmarkId,
  isValidUrl,
  sanitizeShelfName,
  sanitizeTitle,
  sanitizeAuthor,
  sanitizeDescription,
  sanitizeCategory,
  DEFAULT_CATEGORIES,
  MAX_URL_LENGTH,
} from "$lib/curios/bookmarkshelf";

interface ShelfRow {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
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
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db || !tenantId) {
    return {
      shelves: [],
      defaultCategories: DEFAULT_CATEGORIES,
      error: "Database not available",
    };
  }

  const [shelvesResult, bookmarksResult] = await Promise.all([
    db
      .prepare(
        `SELECT id, name, description, sort_order
         FROM bookmark_shelves WHERE tenant_id = ?
         ORDER BY sort_order ASC, created_at ASC`,
      )
      .bind(tenantId)
      .all<ShelfRow>()
      .catch(() => ({ results: [] as ShelfRow[] })),
    db
      .prepare(
        `SELECT b.id, b.shelf_id, b.url, b.title, b.author, b.description,
                b.cover_url, b.category, b.is_currently_reading, b.is_favorite
         FROM bookmarks b
         JOIN bookmark_shelves s ON b.shelf_id = s.id
         WHERE s.tenant_id = ?
         ORDER BY b.sort_order ASC, b.added_at ASC`,
      )
      .bind(tenantId)
      .all<BookmarkRow>()
      .catch(() => ({ results: [] as BookmarkRow[] })),
  ]);

  const bookmarksByShelf = new Map<
    string,
    {
      id: string;
      url: string;
      title: string;
      author: string | null;
      description: string | null;
      coverUrl: string | null;
      category: string | null;
      isCurrentlyReading: boolean;
      isFavorite: boolean;
    }[]
  >();

  for (const row of bookmarksResult.results) {
    const list = bookmarksByShelf.get(row.shelf_id) || [];
    list.push({
      id: row.id,
      url: row.url,
      title: row.title,
      author: row.author,
      description: row.description,
      coverUrl: row.cover_url,
      category: row.category,
      isCurrentlyReading: row.is_currently_reading === 1,
      isFavorite: row.is_favorite === 1,
    });
    bookmarksByShelf.set(row.shelf_id, list);
  }

  const shelves = shelvesResult.results.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    bookmarks: bookmarksByShelf.get(row.id) || [],
  }));

  return { shelves, defaultCategories: DEFAULT_CATEGORIES };
};

export const actions: Actions = {
  addShelf: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const name = sanitizeShelfName(formData.get("name") as string);
    if (!name) {
      return fail(400, {
        error: "Shelf name is required",
        error_code: "MISSING_NAME",
      });
    }

    const description = sanitizeDescription(
      formData.get("description") as string,
    );
    const id = generateShelfId();

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

      return { success: true, shelfAdded: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
        error_code: ARBOR_ERRORS.SAVE_FAILED.code,
      });
    }
  },

  addBookmark: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const shelfId = formData.get("shelfId") as string;

    const shelf = await db
      .prepare(`SELECT id FROM bookmark_shelves WHERE id = ? AND tenant_id = ?`)
      .bind(shelfId, tenantId)
      .first<{ id: string }>();

    if (!shelf) {
      return fail(400, {
        error: "Shelf not found",
        error_code: "INVALID_SHELF",
      });
    }

    const url = (formData.get("url") as string)?.trim() || "";
    if (url && (!isValidUrl(url) || url.length > MAX_URL_LENGTH)) {
      return fail(400, {
        error: "Please enter a valid URL",
        error_code: "INVALID_URL",
      });
    }

    const title = sanitizeTitle(formData.get("title") as string);
    if (!title) {
      return fail(400, {
        error: "Title is required",
        error_code: "MISSING_TITLE",
      });
    }

    const author = sanitizeAuthor(formData.get("author") as string);
    const description = sanitizeDescription(
      formData.get("description") as string,
    );
    const category = sanitizeCategory(formData.get("category") as string);
    const isCurrentlyReading =
      formData.get("isCurrentlyReading") === "on" ? 1 : 0;
    const isFavorite = formData.get("isFavorite") === "on" ? 1 : 0;
    const id = generateBookmarkId();

    try {
      const maxSort = await db
        .prepare(
          `SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM bookmarks WHERE shelf_id = ?`,
        )
        .bind(shelfId)
        .first<{ max_sort: number }>();

      const sortOrder = (maxSort?.max_sort ?? -1) + 1;

      await db
        .prepare(
          `INSERT INTO bookmarks (id, shelf_id, url, title, author, description, category, is_currently_reading, is_favorite, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          shelfId,
          url,
          title,
          author,
          description,
          category,
          isCurrentlyReading,
          isFavorite,
          sortOrder,
        )
        .run();

      return { success: true, bookmarkAdded: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
        error_code: ARBOR_ERRORS.SAVE_FAILED.code,
      });
    }
  },

  removeShelf: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const shelfId = formData.get("shelfId") as string;

    try {
      await db
        .prepare(`DELETE FROM bookmark_shelves WHERE id = ? AND tenant_id = ?`)
        .bind(shelfId, tenantId)
        .run();

      return { success: true, shelfRemoved: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
        error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
      });
    }
  },

  removeBookmark: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const bookmarkId = formData.get("bookmarkId") as string;

    try {
      await db
        .prepare(
          `DELETE FROM bookmarks WHERE id = ? AND shelf_id IN (SELECT id FROM bookmark_shelves WHERE tenant_id = ?)`,
        )
        .bind(bookmarkId, tenantId)
        .run();

      return { success: true, bookmarkRemoved: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
        error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
      });
    }
  },
};
