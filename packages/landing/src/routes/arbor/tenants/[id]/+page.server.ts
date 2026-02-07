/**
 * Tenant Detail Page - View individual tenant details
 *
 * Shows full tenant info with stats (posts, pages, media, sessions).
 * Danger zone provides CLI commands for destructive actions —
 * they cannot be executed from this panel.
 */

import { redirect, error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

interface Tenant {
  id: string;
  subdomain: string;
  display_name: string;
  email: string;
  plan: string;
  storage_used: number;
  post_count: number;
  custom_domain: string | null;
  theme: string;
  active: number;
  created_at: number;
  updated_at: number;
}

interface TenantDetail {
  tenant: Tenant;
  postCount: number;
  pageCount: number;
  mediaCount: number;
}

export const load: PageServerLoad = async ({ parent, platform, params }) => {
  const parentData = await parent();
  if (!parentData.isWayfinder) {
    throw redirect(302, "/arbor");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  const DB = platform.env.DB;
  const { id } = params;

  const tenant = await DB.prepare("SELECT * FROM tenants WHERE id = ?")
    .bind(id)
    .first<Tenant>();

  if (!tenant) {
    throw error(404, "Tenant not found");
  }

  // Load content stats in parallel
  const [postResult, pageResult, mediaResult] = await Promise.all([
    DB.prepare("SELECT COUNT(*) as count FROM posts WHERE tenant_id = ?")
      .bind(id)
      .first<{ count: number }>()
      .catch(() => ({ count: 0 })),
    DB.prepare("SELECT COUNT(*) as count FROM pages WHERE tenant_id = ?")
      .bind(id)
      .first<{ count: number }>()
      .catch(() => ({ count: 0 })),
    DB.prepare("SELECT COUNT(*) as count FROM media WHERE tenant_id = ?")
      .bind(id)
      .first<{ count: number }>()
      .catch(() => ({ count: 0 })),
  ]);

  return {
    tenant,
    postCount: postResult?.count || 0,
    pageCount: pageResult?.count || 0,
    mediaCount: mediaResult?.count || 0,
  };
};
