import type { AuditLog, AdminStats, D1DatabaseOrSession, User } from "../../types.js";
import { isWayfinder } from "../../types.js";
import { getUserById } from "./users.js";

export function isEmailAdmin(email: string): boolean {
	return isWayfinder(email);
}

export async function isUserAdmin(db: D1DatabaseOrSession, userId: string): Promise<boolean> {
	const user = await getUserById(db, userId);
	if (!user) return false;
	return user.is_admin === 1 || isEmailAdmin(user.email);
}

/**
 * SessionDO.validateSession and verifyAccessToken only check expiry/
 * signature — neither has visibility into ban status, unlike the Better
 * Auth fallback path (which does check banned/ban_expires). Since
 * 0002_migrate_users.sql gave every pre-migration `users` row a matching
 * `ba_user` row too, `ba_user` is a ban-status superset covering both auth
 * sources, so a single check here closes the gap for every caller of
 * isUserAdmin without needing a second table. Moved here (from a
 * user.ts-local helper) so admin-auth callers like middleware/cookieAuth.ts
 * can share it — isUserAdmin alone does not check ban status.
 */
export async function isUserBanned(db: D1DatabaseOrSession, userId: string): Promise<boolean> {
	const row = await db
		.prepare("SELECT banned, ban_expires FROM ba_user WHERE id = ?")
		.bind(userId)
		.first<{ banned: number | null; ban_expires: number | null }>();
	if (!row?.banned) return false;
	if (row.ban_expires && row.ban_expires * 1000 < Date.now()) return false; // ban expired
	return true;
}

export async function getAdminStats(
	db: D1DatabaseOrSession,
	engineDb?: D1Database,
): Promise<AdminStats> {
	const totalUsersResult = await db
		.prepare(`SELECT COUNT(*) as count FROM users`)
		.first<{ count: number }>();

	const providerResults = await db
		.prepare(`SELECT provider, COUNT(*) as count FROM users GROUP BY provider`)
		.all<{ provider: string; count: number }>();

	const tierResults = await db
		.prepare(`SELECT tier, COUNT(*) as count FROM user_subscriptions GROUP BY tier`)
		.all<{ tier: string; count: number }>();

	const recentLogins = await db
		.prepare(`SELECT * FROM audit_log WHERE event_type = 'login' ORDER BY created_at DESC LIMIT 50`)
		.all<AuditLog>();

	const totalClientsResult = await db
		.prepare(`SELECT COUNT(*) as count FROM clients`)
		.first<{ count: number }>();

	let emailSignupsCount = 0;
	if (engineDb) {
		const emailSignupsResult = await engineDb
			.prepare(`SELECT COUNT(*) as count FROM email_signups`)
			.first<{ count: number }>();
		emailSignupsCount = emailSignupsResult?.count ?? 0;
	}

	return {
		total_users: totalUsersResult?.count ?? 0,
		users_by_provider: Object.fromEntries(
			providerResults.results?.map((r) => [r.provider, r.count]) ?? [],
		),
		users_by_tier: Object.fromEntries(tierResults.results?.map((r) => [r.tier, r.count]) ?? []),
		recent_logins: recentLogins.results ?? [],
		total_clients: totalClientsResult?.count ?? 0,
		email_signups_count: emailSignupsCount,
	};
}

export async function getAllUsers(
	db: D1DatabaseOrSession,
	limit: number = 50,
	offset: number = 0,
): Promise<User[]> {
	const result = await db
		.prepare(`SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`)
		.bind(limit, offset)
		.all<User>();
	return result.results || [];
}

export async function getAuditLogs(
	db: D1DatabaseOrSession,
	options: { limit?: number; offset?: number; eventType?: string },
): Promise<AuditLog[]> {
	const { limit = 100, offset = 0, eventType } = options;

	let query = `SELECT * FROM audit_log`;
	const params: (string | number)[] = [];

	if (eventType) {
		query += ` WHERE event_type = ?`;
		params.push(eventType);
	}

	query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
	params.push(limit, offset);

	const result = await db
		.prepare(query)
		.bind(...params)
		.all<AuditLog>();
	return result.results || [];
}
