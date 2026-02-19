import { loadCurioStatus, type CurioStatus } from "$lib/server/curio-status";
import type { PageServerLoad } from "./$types";

interface PageRecord {
  slug: string;
  title: string;
  description: string | null;
  type: string;
  updated_at: string;
  created_at: string;
  show_in_nav: number; // 0 or 1 (SQLite boolean)
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  // Auth is handled by the parent /admin layout - no duplicate check needed here
  const tenantId = locals.tenantId;
  let pages: PageRecord[] = [];
  let curios: CurioStatus[] = [];
  let pagesLoadError = false;

  if (platform?.env?.DB) {
    const db = platform.env.DB;

    // Run pages query and curio status load in parallel
    const [pagesResult, curioStatuses] = await Promise.all([
      db
        .prepare(
          `SELECT slug, title, description, type, updated_at, created_at, COALESCE(show_in_nav, 0) as show_in_nav
           FROM pages
           WHERE tenant_id = ?
           ORDER BY slug ASC`,
        )
        .bind(tenantId)
        .all<PageRecord>()
        .catch((err) => {
          console.error("D1 fetch error for pages:", err);
          pagesLoadError = true;
          return { results: [] };
        }),

      loadCurioStatus(db, tenantId),
    ]);

    pages = pagesResult.results || [];
    curios = curioStatuses;
  }

  return {
    pages,
    curios,
    pagesLoadError,
  };
};
