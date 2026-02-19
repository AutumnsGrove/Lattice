import { error } from "@sveltejs/kit";
import { ARBOR_ERRORS, throwGroveError } from "$lib/errors";
import { loadCurioStatus, type CurioStatus } from "$lib/server/curio-status";
import type { PageServerLoad } from "./$types";

interface PageRecord {
  slug: string;
  title: string;
  description: string | null;
  type: string;
  markdown_content: string | null;
  html_content: string | null;
  hero: string | null;
  gutter_content: string | null;
  font: string | null;
  updated_at: string | null;
  created_at: string | null;
}

interface HeroData {
  [key: string]: unknown;
}

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  // Auth is handled by the parent /admin layout - no duplicate check needed here
  const { slug } = params;
  const tenantId = locals.tenantId;

  if (!slug) {
    throwGroveError(400, ARBOR_ERRORS.FIELD_REQUIRED, "Arbor");
  }

  // Try D1 first
  if (platform?.env?.DB) {
    const db = platform.env.DB;

    try {
      // Run page query and curio status in parallel
      const [page, curios] = await Promise.all([
        db
          .prepare(
            `SELECT slug, title, description, type, markdown_content, html_content, hero, gutter_content, font, updated_at, created_at
             FROM pages
             WHERE slug = ? AND tenant_id = ?`,
          )
          .bind(slug, tenantId)
          .first<PageRecord>(),

        loadCurioStatus(db, tenantId),
      ]);

      if (page) {
        return {
          source: "d1" as const,
          page: {
            ...page,
            hero: page.hero ? (JSON.parse(page.hero) as HeroData) : null,
            gutter_content: page.gutter_content || "[]",
          },
          curios,
        };
      }
    } catch (err) {
      console.error("D1 fetch error:", err);
      throwGroveError(500, ARBOR_ERRORS.LOAD_FAILED, "Arbor", { cause: err });
    }
  }

  // If not found in D1, return error
  throwGroveError(404, ARBOR_ERRORS.RESOURCE_NOT_FOUND, "Arbor");
};
