/**
 * Tenants Dashboard - Manage Grove tenants
 *
 * Direct D1 queries to tenants table. Wayfinder-only access.
 * Destructive actions (delete/suspend) generate CLI commands
 * instead of executing directly — defense in depth.
 */

import { redirect, error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getAllTenantsStorageUsed } from "@autumnsgrove/lattice/server/services/gallery-storage";

interface Tenant {
	id: string;
	subdomain: string;
	display_name: string;
	email: string;
	plan: string;
	/** null when the storage query failed — distinct from a genuine 0 */
	storage_used: number | null;
	post_count: number;
	beta_post_count: number;
	custom_domain: string | null;
	theme: string;
	active: number;
	created_at: number;
	updated_at: number;
}

interface TenantStats {
	total: number;
	active: number;
	wanderer: number;
	seedling: number;
	sapling: number;
	oak: number;
	evergreen: number;
	total_posts: number;
	total_beta_posts: number;
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

	const [tenantsResult, statsResult, storageResult] = await Promise.all([
		DB.prepare(
			`SELECT t.id, t.subdomain, t.display_name, t.email, t.plan,
              COALESCE((SELECT COUNT(*) FROM posts p WHERE p.tenant_id = t.id), 0) as post_count,
              COALESCE((SELECT COUNT(*) FROM posts p WHERE p.tenant_id = t.id AND p.is_beta = 1), 0) as beta_post_count,
              t.custom_domain, t.theme, t.active, t.created_at, t.updated_at
       FROM tenants t
       ORDER BY t.created_at DESC`,
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
         COUNT(CASE WHEN plan = 'wanderer' THEN 1 END) as wanderer,
         COUNT(CASE WHEN plan = 'seedling' THEN 1 END) as seedling,
         COUNT(CASE WHEN plan = 'sapling' THEN 1 END) as sapling,
         COUNT(CASE WHEN plan = 'oak' THEN 1 END) as oak,
         COUNT(CASE WHEN plan = 'evergreen' THEN 1 END) as evergreen,
         COALESCE((SELECT COUNT(*) FROM posts), 0) as total_posts,
         COALESCE((SELECT COUNT(*) FROM posts WHERE is_beta = 1), 0) as total_beta_posts
       FROM tenants`,
		)
			.first<TenantStats>()
			.catch((err) => {
				console.error("[Tenants] Failed to load stats:", err);
				return null;
			}),
		getAllTenantsStorageUsed(DB),
	]);

	// Storage is looked up separately so a failure can't blank the tenant list.
	const tenants = (tenantsResult.results || []).map((t) => ({
		...t,
		storage_used: storageResult.ok ? (storageResult.byTenant.get(t.id) ?? 0) : null,
	}));

	return {
		tenants,
		stats: {
			total: statsResult?.total || 0,
			active: statsResult?.active || 0,
			wanderer: statsResult?.wanderer || 0,
			seedling: statsResult?.seedling || 0,
			sapling: statsResult?.sapling || 0,
			oak: statsResult?.oak || 0,
			evergreen: statsResult?.evergreen || 0,
			total_storage: storageResult.ok ? storageResult.totalBytes : null,
			total_posts: statsResult?.total_posts || 0,
			total_beta_posts: statsResult?.total_beta_posts || 0,
		},
	};
};
