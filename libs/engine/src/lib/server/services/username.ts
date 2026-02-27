/**
 * Username Change Service
 *
 * Handles username (subdomain) changes for tenants, including:
 * - Validation (format, blocklist, availability)
 * - Tier-based rate limiting
 * - Atomic database updates
 * - Change history tracking
 *
 * @see docs/plans/features/planned/username-change-feature.md
 */

import {
	isUsernameBlocked,
	getBlockedMessage,
	VALIDATION_CONFIG,
	type BlocklistReason,
	VALID_BLOCKLIST_REASONS,
} from "../../config/domain-blocklist.js";
import { containsOffensiveContent } from "../../config/offensive-blocklist.js";
import type { TierKey } from "../../config/tiers.js";

// ============================================================================
// Constants
// ============================================================================

/** 30 days in seconds */
const HOLD_PERIOD_SECONDS = 30 * 24 * 60 * 60;

/** 1 year in seconds */
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/** 1 hour in seconds (for in-progress onboarding checks) */
const IN_PROGRESS_WINDOW_SECONDS = 3600;

/**
 * Tier-based username change limits.
 * maxPerYear: How many times a username can be changed per rolling year.
 * cooldownDays: Minimum days between consecutive changes (for unlimited tiers).
 */
export const USERNAME_CHANGE_LIMITS: Record<
	TierKey,
	{ maxPerYear: number; cooldownDays: number }
> = {
	free: { maxPerYear: 1, cooldownDays: 0 },
	seedling: { maxPerYear: 1, cooldownDays: 0 },
	sapling: { maxPerYear: 2, cooldownDays: 0 },
	oak: { maxPerYear: Infinity, cooldownDays: 7 },
	evergreen: { maxPerYear: Infinity, cooldownDays: 7 },
};

// ============================================================================
// Types
// ============================================================================

export interface UsernameChangeRequest {
	tenantId: string;
	currentSubdomain: string;
	newSubdomain: string;
	actorEmail: string;
	tier: TierKey;
}

export interface UsernameChangeResult {
	success: boolean;
	error?: string;
	errorCode?: string;
}

export interface UsernameValidationResult {
	available: boolean;
	error?: string;
	suggestions?: string[];
}

export interface UsernameRateLimitResult {
	allowed: boolean;
	nextAllowedAt?: number;
	reason?: string;
}

export interface UsernameChangeHistoryEntry {
	id: string;
	oldSubdomain: string;
	newSubdomain: string;
	changedAt: number;
	holdExpiresAt: number;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Generate username suggestions when the original is taken.
 * Mirrors the logic in Plant's check-username endpoint.
 */
function generateSuggestions(
	base: string,
	reason: BlocklistReason | null,
): string[] {
	if (reason === "offensive") return [];

	const year = new Date().getFullYear();
	const suffixes = ["-writes", "-blog", `${year}`, "-place", "-garden", "-space"];

	return suffixes
		.map((suffix) => {
			const suggestion = base + suffix;
			if (
				VALIDATION_CONFIG.pattern.test(suggestion) &&
				suggestion.length <= VALIDATION_CONFIG.maxLength &&
				!isUsernameBlocked(suggestion) &&
				!containsOffensiveContent(suggestion)
			) {
				return suggestion;
			}
			return null;
		})
		.filter((s): s is string => s !== null)
		.slice(0, 3);
}

/**
 * Validate username availability including format, blocklist, and database checks.
 *
 * @param db - D1 database binding
 * @param username - The username to validate (will be lowercased and trimmed)
 * @param excludeTenantId - Optional tenant ID to exclude from "taken" checks
 *   (allows a user to reclaim their own held username within the 30-day period)
 */
export async function validateUsernameAvailability(
	db: D1Database,
	username: string,
	excludeTenantId?: string,
): Promise<UsernameValidationResult> {
	const normalized = username.toLowerCase().trim();

	// Length validation
	if (normalized.length < VALIDATION_CONFIG.minLength) {
		return {
			available: false,
			error: `Username must be at least ${VALIDATION_CONFIG.minLength} characters`,
		};
	}

	if (normalized.length > VALIDATION_CONFIG.maxLength) {
		return {
			available: false,
			error: `Username must be ${VALIDATION_CONFIG.maxLength} characters or less`,
		};
	}

	// Pattern validation
	if (!VALIDATION_CONFIG.pattern.test(normalized)) {
		return {
			available: false,
			error: VALIDATION_CONFIG.patternDescription,
		};
	}

	// Offensive content check (no suggestions)
	if (containsOffensiveContent(normalized)) {
		return { available: false, error: "This username is not available" };
	}

	// Blocklist check (with suggestions)
	const blockedReason = isUsernameBlocked(normalized);
	if (blockedReason) {
		return {
			available: false,
			error: getBlockedMessage(blockedReason),
			suggestions: generateSuggestions(normalized, blockedReason),
		};
	}

	// Database checks
	try {
		// Check reserved_usernames table
		const reserved = await db
			.prepare(
				"SELECT username, reason FROM reserved_usernames WHERE username = ?",
			)
			.bind(normalized)
			.first<{ username: string; reason: string }>();

		if (reserved) {
			const reason: BlocklistReason = VALID_BLOCKLIST_REASONS.includes(
				reserved.reason as BlocklistReason,
			)
				? (reserved.reason as BlocklistReason)
				: "system";
			return {
				available: false,
				error: getBlockedMessage(reason),
				suggestions: generateSuggestions(normalized, reason),
			};
		}

		// Check existing tenants
		const existingTenant = await db
			.prepare("SELECT id, subdomain FROM tenants WHERE subdomain = ?")
			.bind(normalized)
			.first<{ id: string; subdomain: string }>();

		if (existingTenant) {
			// Allow if it's the requesting tenant's own current subdomain
			if (excludeTenantId && existingTenant.id === excludeTenantId) {
				return { available: false, error: "That's already your current username" };
			}
			return {
				available: false,
				error: "This username is already taken",
				suggestions: generateSuggestions(normalized, null),
			};
		}

		// Check in-progress onboarding
		const cutoffTimestamp =
			Math.floor(Date.now() / 1000) - IN_PROGRESS_WINDOW_SECONDS;
		const inProgress = await db
			.prepare(
				`SELECT username FROM user_onboarding
				 WHERE username = ? AND tenant_id IS NULL AND created_at > ?`,
			)
			.bind(normalized, cutoffTimestamp)
			.first();

		if (inProgress) {
			return {
				available: false,
				error: "This username is currently being registered",
				suggestions: generateSuggestions(normalized, null),
			};
		}

		// Check active username holds (30-day reservation from previous changes)
		const activeHold = await db
			.prepare(
				`SELECT tenant_id, new_subdomain FROM username_history
				 WHERE old_subdomain = ? AND released = 0 AND hold_expires_at > unixepoch()
				 ORDER BY changed_at DESC LIMIT 1`,
			)
			.bind(normalized)
			.first<{ tenant_id: string; new_subdomain: string }>();

		if (activeHold) {
			// Allow if the same tenant is reclaiming their own old username
			if (excludeTenantId && activeHold.tenant_id === excludeTenantId) {
				return { available: true };
			}
			return {
				available: false,
				error: "This username is temporarily reserved",
				suggestions: generateSuggestions(normalized, null),
			};
		}

		return { available: true };
	} catch (error) {
		console.error("[Username] Validation DB error:", error);
		return { available: false, error: "Unable to check availability" };
	}
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Check if a tenant is allowed to change their username based on their tier.
 *
 * Rate limits are enforced by querying the username_history table,
 * NOT the Threshold system (which is for per-request short-window limits).
 */
export async function canChangeUsername(
	db: D1Database,
	tenantId: string,
	tier: TierKey,
): Promise<UsernameRateLimitResult> {
	const limits = USERNAME_CHANGE_LIMITS[tier];
	const oneYearAgo = Math.floor(Date.now() / 1000) - ONE_YEAR_SECONDS;

	const countResult = await db
		.prepare(
			`SELECT COUNT(*) as count, MAX(changed_at) as last_changed_at
			 FROM username_history
			 WHERE tenant_id = ? AND changed_at > ?`,
		)
		.bind(tenantId, oneYearAgo)
		.first<{ count: number; last_changed_at: number | null }>();

	const changesThisYear = countResult?.count ?? 0;
	const lastChangedAt = countResult?.last_changed_at ?? 0;

	// Check yearly limit
	if (limits.maxPerYear !== Infinity && changesThisYear >= limits.maxPerYear) {
		const earliestResult = await db
			.prepare(
				`SELECT MIN(changed_at) as earliest
				 FROM username_history
				 WHERE tenant_id = ? AND changed_at > ?`,
			)
			.bind(tenantId, oneYearAgo)
			.first<{ earliest: number }>();

		const nextAllowedAt =
			(earliestResult?.earliest ?? 0) + ONE_YEAR_SECONDS;
		return {
			allowed: false,
			nextAllowedAt,
			reason: `You've used ${changesThisYear === 1 ? "your" : `all ${limits.maxPerYear}`} username change${limits.maxPerYear > 1 ? "s" : ""} for this year`,
		};
	}

	// Check cooldown period
	if (limits.cooldownDays > 0 && lastChangedAt > 0) {
		const cooldownSeconds = limits.cooldownDays * 24 * 60 * 60;
		const cooldownEnd = lastChangedAt + cooldownSeconds;
		const now = Math.floor(Date.now() / 1000);
		if (now < cooldownEnd) {
			return {
				allowed: false,
				nextAllowedAt: cooldownEnd,
				reason: `Please wait ${limits.cooldownDays} days between username changes`,
			};
		}
	}

	return { allowed: true };
}

// ============================================================================
// Username Change
// ============================================================================

/**
 * Execute a username change atomically via D1 batch.
 *
 * This function:
 * 1. Updates the tenants table subdomain
 * 2. Inserts a username_history record
 * 3. Updates user_onboarding if a record exists
 * 4. Updates meadow_posts author_subdomain if applicable
 *
 * All statements run in a single D1 batch (atomic).
 */
export async function changeUsername(
	db: D1Database,
	request: UsernameChangeRequest,
): Promise<UsernameChangeResult> {
	const { tenantId, currentSubdomain, newSubdomain, actorEmail } = request;
	const normalized = newSubdomain.toLowerCase().trim();
	const now = Math.floor(Date.now() / 1000);
	const holdExpiresAt = now + HOLD_PERIOD_SECONDS;
	const historyId = crypto.randomUUID();

	try {
		const statements: D1PreparedStatement[] = [
			// 1. Update tenant subdomain
			db
				.prepare(
					"UPDATE tenants SET subdomain = ?, updated_at = unixepoch() WHERE id = ? AND subdomain = ?",
				)
				.bind(normalized, tenantId, currentSubdomain),

			// 2. Insert username history record
			db
				.prepare(
					`INSERT INTO username_history (id, tenant_id, old_subdomain, new_subdomain, changed_at, hold_expires_at, released, actor_email)
					 VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
				)
				.bind(
					historyId,
					tenantId,
					currentSubdomain,
					normalized,
					now,
					holdExpiresAt,
					actorEmail,
				),

			// 3. Update user_onboarding username (if record exists)
			db
				.prepare(
					"UPDATE user_onboarding SET username = ?, updated_at = unixepoch() WHERE tenant_id = ?",
				)
				.bind(normalized, tenantId),

			// 4. Update meadow_posts author_subdomain (if any exist)
			db
				.prepare(
					"UPDATE meadow_posts SET author_subdomain = ? WHERE tenant_id = ?",
				)
				.bind(normalized, tenantId),
		];

		const results = await db.batch(statements);

		// Check that the tenants update actually changed a row
		const tenantsResult = results[0];
		if (!tenantsResult?.meta?.changes || tenantsResult.meta.changes === 0) {
			return {
				success: false,
				error: "Failed to update username — tenant not found or subdomain mismatch",
				errorCode: "GROVE-ARBOR-048",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("[Username] Change transaction failed:", error);

		// Check for unique constraint violation (subdomain already taken — race condition)
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("UNIQUE constraint failed")) {
			return {
				success: false,
				error: "That username was just taken. Please try a different one.",
				errorCode: "GROVE-ARBOR-045",
			};
		}

		return {
			success: false,
			error: "Something went wrong changing your username. Please try again.",
			errorCode: "GROVE-ARBOR-048",
		};
	}
}

// ============================================================================
// History
// ============================================================================

/**
 * Fetch username change history for a tenant (most recent first).
 */
export async function getUsernameHistory(
	db: D1Database,
	tenantId: string,
): Promise<UsernameChangeHistoryEntry[]> {
	try {
		const result = await db
			.prepare(
				`SELECT id, old_subdomain, new_subdomain, changed_at, hold_expires_at
				 FROM username_history
				 WHERE tenant_id = ?
				 ORDER BY changed_at DESC
				 LIMIT 10`,
			)
			.bind(tenantId)
			.all<{
				id: string;
				old_subdomain: string;
				new_subdomain: string;
				changed_at: number;
				hold_expires_at: number;
			}>();

		return (result.results ?? []).map((row) => ({
			id: row.id,
			oldSubdomain: row.old_subdomain,
			newSubdomain: row.new_subdomain,
			changedAt: row.changed_at,
			holdExpiresAt: row.hold_expires_at,
		}));
	} catch (error) {
		console.error("[Username] History query failed:", error);
		return [];
	}
}
