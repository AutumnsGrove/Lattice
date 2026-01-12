import { redirect } from "@sveltejs/kit";
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
  // Check if user is authenticated
  if (!locals.user) {
    throw redirect(302, "/auth/login");
  }

  const tenantId = locals.tenantId;
  let pages: PageRecord[] = [];

  // Try D1 first
  if (platform?.env?.DB) {
    try {
      const result = await platform.env.DB.prepare(
        `SELECT slug, title, description, type, updated_at, created_at, COALESCE(show_in_nav, 0) as show_in_nav
         FROM pages
         WHERE tenant_id = ?
         ORDER BY slug ASC`,
      )
        .bind(tenantId)
        .all<PageRecord>();

      pages = result.results || [];
    } catch (err) {
      console.error("D1 fetch error for pages:", err);
    }
  }

  return {
    pages,
  };
};
