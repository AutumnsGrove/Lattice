/**
 * Tenants Dashboard - Manage Grove tenants
 *
 * Direct D1 queries to tenants table. Wayfinder-only access.
 * Destructive actions (delete/suspend) generate CLI commands
 * instead of executing directly — defense in depth.
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

interface TenantStats {
  total: number;
  active: number;
  seedling: number;
  sapling: number;
  oak: number;
  evergreen: number;
  total_storage: number;
  total_posts: number;
}

export const load: PageServerLoad = async ({ parent, platform }) => {
  const parentData = await parent();
  if (!parentData.isWayfinder) {
    throw redirect(302, "/arbor");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  const DB = platform.env.DB;

  const [tenantsResult, statsResult] = await Promise.all([
    DB.prepare(
      `SELECT id, subdomain, display_name, email, plan, storage_used,
              post_count, custom_domain, theme, active, created_at, updated_at
       FROM tenants
       ORDER BY created_at DESC`,
    )
      .all<Tenant>()
      .catch((err) => {
        console.error("[Tenants] Failed to load tenants:", err);
        return { results: [] as Tenant[] };
      }),
    DB.prepare(
      `SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN active = 1 THEN 1 END) as active,
         COUNT(CASE WHEN plan = 'seedling' THEN 1 END) as seedling,
         COUNT(CASE WHEN plan = 'sapling' THEN 1 END) as sapling,
         COUNT(CASE WHEN plan = 'oak' THEN 1 END) as oak,
         COUNT(CASE WHEN plan = 'evergreen' THEN 1 END) as evergreen,
         COALESCE(SUM(storage_used), 0) as total_storage,
         COALESCE(SUM(post_count), 0) as total_posts
       FROM tenants`,
    )
      .first<TenantStats>()
      .catch((err) => {
        console.error("[Tenants] Failed to load stats:", err);
        return null;
      }),
  ]);

  return {
    tenants: tenantsResult.results || [],
    stats: {
      total: statsResult?.total || 0,
      active: statsResult?.active || 0,
      seedling: statsResult?.seedling || 0,
      sapling: statsResult?.sapling || 0,
      oak: statsResult?.oak || 0,
      evergreen: statsResult?.evergreen || 0,
      total_storage: statsResult?.total_storage || 0,
      total_posts: statsResult?.total_posts || 0,
    },
  };
};
