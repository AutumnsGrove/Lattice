/**
 * Friends Service — tenant-to-tenant follow relationships.
 *
 * Friends are a first-class tenant concept, independent of any UI surface.
 * Lantern, FollowButton, and future social features all consume this service.
 *
 * Types defined here are the source of truth — validated at the API boundary.
 */

export interface Friend {
	tenantId: string;
	name: string;
	subdomain: string;
	source: string;
}

export interface FriendSearchResult {
	tenantId: string;
	name: string;
	subdomain: string;
}

/**
 * List all friends for a tenant, ordered by most recently added.
 */
export async function listFriends(db: D1Database, tenantId: string): Promise<Friend[]> {
	const result = await db
		.prepare(
			`SELECT friend_tenant_id, friend_name, friend_subdomain, source
			 FROM friends
			 WHERE tenant_id = ?
			 ORDER BY added_at DESC`,
		)
		.bind(tenantId)
		.all<{
			friend_tenant_id: string;
			friend_name: string;
			friend_subdomain: string;
			source: string;
		}>();

	return (result.results ?? []).map((row) => ({
		tenantId: row.friend_tenant_id,
		name: row.friend_name,
		subdomain: row.friend_subdomain,
		source: row.source,
	}));
}

/**
 * Add a friend by subdomain. Resolves the subdomain to a tenant,
 * validates it's not the caller's own grove, and inserts with
 * INSERT OR IGNORE for graceful duplicate handling.
 *
 * Returns the new Friend on success, or null if the subdomain doesn't exist.
 */
export async function addFriend(
	db: D1Database,
	tenantId: string,
	friendSubdomain: string,
): Promise<{ friend: Friend } | { error: "not_found" | "self_add" }> {
	const friendTenant = await db
		.prepare(`SELECT id, subdomain, display_name FROM tenants WHERE subdomain = ?`)
		.bind(friendSubdomain)
		.first<{ id: string; subdomain: string; display_name: string }>();

	if (!friendTenant) {
		return { error: "not_found" };
	}

	if (friendTenant.id === tenantId) {
		return { error: "self_add" };
	}

	await db
		.prepare(
			`INSERT OR IGNORE INTO friends (tenant_id, friend_tenant_id, friend_name, friend_subdomain, source)
			 VALUES (?, ?, ?, ?, 'manual')`,
		)
		.bind(tenantId, friendTenant.id, friendTenant.display_name, friendTenant.subdomain)
		.run();

	return {
		friend: {
			tenantId: friendTenant.id,
			name: friendTenant.display_name,
			subdomain: friendTenant.subdomain,
			source: "manual",
		},
	};
}

/**
 * Remove a friend connection. Returns true if the connection existed and was removed.
 * Uses a single DELETE and checks meta.changes — avoids a redundant SELECT round-trip.
 */
export async function removeFriend(
	db: D1Database,
	tenantId: string,
	friendTenantId: string,
): Promise<boolean> {
	const result = await db
		.prepare(`DELETE FROM friends WHERE tenant_id = ? AND friend_tenant_id = ?`)
		.bind(tenantId, friendTenantId)
		.run();

	return ((result.meta as Record<string, number>)?.changes ?? 0) > 0;
}

/**
 * Check if a tenant-to-tenant friend connection exists.
 */
export async function isFriend(
	db: D1Database,
	tenantId: string,
	friendTenantId: string,
): Promise<boolean> {
	const existing = await db
		.prepare(`SELECT 1 FROM friends WHERE tenant_id = ? AND friend_tenant_id = ? LIMIT 1`)
		.bind(tenantId, friendTenantId)
		.first();

	return !!existing;
}

/**
 * Check if two tenants are mutual friends (both follow each other).
 * Required for Chirp DM access — both parties must opt in.
 */
export async function areMutualFriends(
	db: D1Database,
	tenantA: string,
	tenantB: string,
): Promise<boolean> {
	const result = await db
		.prepare(
			`SELECT COUNT(*) as cnt FROM friends
			 WHERE (tenant_id = ? AND friend_tenant_id = ?)
			    OR (tenant_id = ? AND friend_tenant_id = ?)`,
		)
		.bind(tenantA, tenantB, tenantB, tenantA)
		.first<{ cnt: number }>();

	return (result?.cnt ?? 0) >= 2;
}

/**
 * Search tenants by subdomain or display name, excluding a given tenant.
 * LIKE wildcards in user input are escaped to prevent injection.
 */
export async function searchTenants(
	db: D1Database,
	query: string,
	excludeTenantId: string,
): Promise<FriendSearchResult[]> {
	const escaped = query.replace(/[%_]/g, "\\$&");
	const pattern = `%${escaped}%`;

	const result = await db
		.prepare(
			`SELECT id, subdomain, display_name
			 FROM tenants
			 WHERE (LOWER(subdomain) LIKE ? ESCAPE '\\' OR LOWER(display_name) LIKE ? ESCAPE '\\')
			   AND id != ?
			   AND active = 1
			 LIMIT 10`,
		)
		.bind(pattern, pattern, excludeTenantId)
		.all<{ id: string; subdomain: string; display_name: string }>();

	return (result.results ?? []).map((row) => ({
		tenantId: row.id,
		name: row.display_name,
		subdomain: row.subdomain,
	}));
}
