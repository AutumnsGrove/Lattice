import { redirect } from "@sveltejs/kit";

export async function load({ platform, locals }) {
  // Check if user is authenticated
  if (!locals.user) {
    throw redirect(302, "/auth/login");
  }

  const tenantId = locals.tenantId;
  /** @type {any[]} */
  let pages = [];

  // Try D1 first
  if (platform?.env?.DB) {
    try {
      const result = await platform.env.DB.prepare(
        `SELECT slug, title, description, type, updated_at, created_at
         FROM pages
         WHERE tenant_id = ?
         ORDER BY slug ASC`,
      )
        .bind(tenantId)
        .all();

      pages = result.results || [];
    } catch (err) {
      console.error("D1 fetch error for pages:", err);
    }
  }

  return {
    pages,
  };
}
