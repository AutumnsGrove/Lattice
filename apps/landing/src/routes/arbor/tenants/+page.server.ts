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

/**
 * Ask Heartwood which sign-in methods each tenant can use (#1739).
 *
 * Returns `null` when the lookup could not be made at all — no binding, no
 * cookie, an error, a non-200 — so the page can say "Unknown" instead of implying
 * nobody can sign in. An empty object is a real answer: every tenant resolved and
 * none of them has a linked method recorded.
 */
async function loadSignInMethods(
	platform: App.Platform | undefined,
	request: Request,
): Promise<Record<string, string[]> | null> {
	const auth = platform?.env?.AUTH;
	if (!auth) return null;

	const cookie = request.headers.get("cookie");
	if (!cookie) return null;

	try {
		const response = await auth.fetch("https://login.grove.place/admin/user-providers", {
			headers: { Cookie: cookie },
		});

		if (!response.ok) {
			console.warn(`[Tenants] Sign-in method lookup returned ${response.status}`);
			return null;
		}

		const body = (await response.json()) as { providers?: Record<string, string[]> };
		return body.providers ?? null;
	} catch (err) {
		// Non-fatal by design: the table is the page, the chips are decoration.
		console.warn("[Tenants] Sign-in method lookup failed:", err);
		return null;
	}
}

export const load: PageServerLoad = async ({ parent, platform, request }) => {
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

	// Sign-in methods come from Heartwood, which owns `ba_account` (#1739). Read
	// live on every load rather than denormalised onto `tenants`: account linking
	// means a tenant can hold several methods and the list changes when one is
	// added, so a stored column would be a snapshot of the wrong day.
	//
	// Best-effort on purpose — a provider lookup that fails must never blank the
	// tenant list. `null` says "we did not find out", which the page renders as
	// `Unknown` rather than guessing that nobody can sign in.
	const signInMethods = await loadSignInMethods(platform, request);

	return {
		tenants,
		signInMethods,
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
