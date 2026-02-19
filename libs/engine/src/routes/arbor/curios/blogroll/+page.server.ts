import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
  generateBlogrollId,
  isValidUrl,
  sanitizeTitle,
  sanitizeDescription,
  buildFaviconUrl,
  MAX_URL_LENGTH,
  MAX_FEED_URL_LENGTH,
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
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db || !tenantId) {
    return { items: [], error: "Database not available" };
  }

  const result = await db
    .prepare(
      `SELECT id, url, title, description, feed_url, favicon_url,
              last_post_title, last_post_url, last_post_date, sort_order
       FROM blogroll_items WHERE tenant_id = ?
       ORDER BY sort_order ASC, added_at ASC`,
    )
    .bind(tenantId)
    .all<BlogrollRow>()
    .catch(() => ({ results: [] as BlogrollRow[] }));

  const items = result.results.map((row) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    feedUrl: row.feed_url,
    faviconUrl: row.favicon_url,
    lastPostTitle: row.last_post_title,
    lastPostUrl: row.last_post_url,
    lastPostDate: row.last_post_date,
  }));

  return { items };
};

export const actions: Actions = {
  add: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const url = (formData.get("url") as string)?.trim();

    if (!url || !isValidUrl(url) || url.length > MAX_URL_LENGTH) {
      return fail(400, {
        error: "A valid URL is required",
        error_code: "INVALID_URL",
      });
    }

    const title = sanitizeTitle(formData.get("title") as string);
    if (!title) {
      return fail(400, {
        error: "Blog title is required",
        error_code: "MISSING_TITLE",
      });
    }

    const description = sanitizeDescription(
      formData.get("description") as string,
    );

    const feedUrl = (formData.get("feedUrl") as string)?.trim() || null;
    if (
      feedUrl &&
      (!isValidUrl(feedUrl) || feedUrl.length > MAX_FEED_URL_LENGTH)
    ) {
      return fail(400, {
        error: "Feed URL must be valid",
        error_code: "INVALID_FEED_URL",
      });
    }

    const faviconUrl = buildFaviconUrl(url);
    const id = generateBlogrollId();

    try {
      const maxSort = await db
        .prepare(
          `SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM blogroll_items WHERE tenant_id = ?`,
        )
        .bind(tenantId)
        .first<{ max_sort: number }>();

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

      return { success: true, blogAdded: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
        error_code: ARBOR_ERRORS.SAVE_FAILED.code,
      });
    }
  },

  remove: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();
    const blogId = formData.get("blogId") as string;

    try {
      await db
        .prepare(`DELETE FROM blogroll_items WHERE id = ? AND tenant_id = ?`)
        .bind(blogId, tenantId)
        .run();

      return { success: true, blogRemoved: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
        error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
      });
    }
  },
};
