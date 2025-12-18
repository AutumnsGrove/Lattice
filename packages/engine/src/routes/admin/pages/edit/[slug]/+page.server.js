import { error, redirect } from "@sveltejs/kit";

export async function load({ params, platform, locals }) {
  // Auth check happens in admin layout
  if (!locals.user) {
    throw redirect(302, "/auth/login");
  }

  const { slug } = params;
  const tenantId = locals.tenantId;

  if (!slug) {
    throw error(400, "Slug is required");
  }

  // Try D1 first
  if (platform?.env?.DB) {
    try {
      const page = await platform.env.DB.prepare(
        `SELECT slug, title, description, type, markdown_content, html_content, hero, gutter_content, font, updated_at, created_at
         FROM pages
         WHERE slug = ? AND tenant_id = ?`,
      )
        .bind(slug, tenantId)
        .first();

      if (page) {
        return {
          source: "d1",
          page: {
            ...page,
            hero: page.hero ? JSON.parse(/** @type {string} */ (page.hero)) : null,
            gutter_content: page.gutter_content || "[]",
          },
        };
      }
    } catch (err) {
      console.error("D1 fetch error:", err);
      throw error(500, "Failed to fetch page");
    }
  }

  // If not found in D1, return error
  throw error(404, "Page not found");
}
