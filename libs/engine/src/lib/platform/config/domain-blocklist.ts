/**
 * Loam - Domain Blocklist Configuration
 *
 * Part of the Loam name protection system.
 * Comprehensive list of blocked usernames/subdomains organized by category.
 * Data externalized to libs/engine/src/lib/data/domain-blocklist.json
 *
 * @see docs/specs/loam-spec.md
 * @module domain-blocklist
 */

import blocklistData from "../../data/domain-blocklist.json";

// =============================================================================
// Types
// =============================================================================

export type BlocklistReason =
	| "system"
	| "grove_service"
	| "trademark"
	| "impersonation"
	| "offensive"
	| "fraud"
	| "future_reserved";

/**
 * Array of valid blocklist reasons for runtime validation
 * Use this to validate database values before type assertion
 */
export const VALID_BLOCKLIST_REASONS: BlocklistReason[] = [
	"system",
	"grove_service",
	"trademark",
	"impersonation",
	"offensive",
	"fraud",
	"future_reserved",
];

export interface BlocklistEntry {
	username: string;
	reason: BlocklistReason;
	category?: string;
}

// =============================================================================
// Data — loaded from JSON, categorized by reason
// =============================================================================

/**
 * Complete blocklist with all categories — derived from externalized JSON data
 */
export const COMPLETE_BLOCKLIST: BlocklistEntry[] = blocklistData as BlocklistEntry[];

/** Entries filtered by reason for backward compatibility */
export const SYSTEM_RESERVED: string[] = COMPLETE_BLOCKLIST.filter(
	(e) => e.reason === "system",
).map((e) => e.username);

export const GROVE_SERVICES: string[] = COMPLETE_BLOCKLIST.filter(
	(e) => e.reason === "grove_service",
).map((e) => e.username);

export const GROVE_TRADEMARKS: string[] = COMPLETE_BLOCKLIST.filter(
	(e) => e.reason === "trademark",
).map((e) => e.username);

export const IMPERSONATION_TERMS: string[] = COMPLETE_BLOCKLIST.filter(
	(e) => e.reason === "impersonation",
).map((e) => e.username);

export const FRAUD_TERMS: string[] = COMPLETE_BLOCKLIST.filter((e) => e.reason === "fraud").map(
	(e) => e.username,
);

export const FUTURE_RESERVED: string[] = COMPLETE_BLOCKLIST.filter(
	(e) => e.reason === "future_reserved",
).map((e) => e.username);

// =============================================================================
// Lookup Structures
// =============================================================================

/**
 * Fast lookup Set for validation (checks existence only)
 */
export const BLOCKED_USERNAMES: Set<string> = new Set(COMPLETE_BLOCKLIST.map((e) => e.username));

/**
 * Fast lookup Map for validation with reason (O(1) lookup)
 */
export const BLOCKED_USERNAMES_MAP: Map<string, BlocklistReason> = new Map(
	COMPLETE_BLOCKLIST.map((e) => [e.username, e.reason]),
);

// =============================================================================
// Pattern Matching
// =============================================================================

/** Prefixes that indicate impersonation attempts */
const BLOCKED_PREFIXES = ["grove-", "admin-", "official-", "verified-"];

/** Suffixes that indicate impersonation attempts */
const BLOCKED_SUFFIXES = ["-official", "-verified", "-admin", "-support"];

/**
 * Suffixes reserved for Grove infrastructure (not impersonation, just claimed).
 * "-beta" is grove-router's single-label beta environment marker
 * (<tenant>-beta.grove.place) — see docs/plans/planned/beta-environment-architecture.md
 */
const RESERVED_INFRA_SUFFIXES = ["-beta"];

/**
 * Check if a username is blocked
 * @param username - The username to check (will be lowercased)
 * @returns The blocking reason if blocked, null if allowed
 */
export function isUsernameBlocked(username: string): BlocklistReason | null {
	// Normalize: lowercase, trim whitespace, strip null bytes and control characters
	const normalized = username
		.toLowerCase()
		.trim()
		.replace(/[\x00-\x1f\x7f]/g, ""); // Strip control characters including null bytes

	// O(1) exact match lookup using Map
	const exactMatch = BLOCKED_USERNAMES_MAP.get(normalized);
	if (exactMatch) {
		return exactMatch;
	}

	// Check if starts with blocked prefix (e.g., "grove-anything")
	for (const prefix of BLOCKED_PREFIXES) {
		if (normalized.startsWith(prefix)) {
			return "impersonation";
		}
	}

	// Check if ends with blocked suffix
	for (const suffix of BLOCKED_SUFFIXES) {
		if (normalized.endsWith(suffix)) {
			return "impersonation";
		}
	}

	// Check if ends with a Grove-infrastructure-reserved suffix
	for (const suffix of RESERVED_INFRA_SUFFIXES) {
		if (normalized.endsWith(suffix)) {
			return "system";
		}
	}

	return null;
}

/**
 * Get a user-friendly error message for a blocked username
 * @param reason - The blocking reason
 * @returns A user-friendly error message
 */
export function getBlockedMessage(reason: BlocklistReason): string {
	switch (reason) {
		case "system":
			return "This username is reserved for system use";
		case "grove_service":
			return "This username is reserved for a Grove service";
		case "trademark":
			return "This username is reserved";
		case "impersonation":
			return "This username is not available";
		case "offensive":
			return "This username is not available";
		case "fraud":
			return "This username is not available";
		case "future_reserved":
			return "This username is reserved";
		default:
			return "This username is not available";
	}
}

/**
 * Validation configuration
 */
export const VALIDATION_CONFIG = {
	minLength: 3,
	maxLength: 30,
	pattern: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
	patternDescription:
		"Must start with a letter, contain only lowercase letters, numbers, and single hyphens",
};

// =============================================================================
// Relationship to `reserved_usernames` (the D1 table)
// =============================================================================
//
// This module and the `reserved_usernames` table are **not** mirrors of each
// other, and the comments in 017_loam_blocklist.sql used to claim they were
// (#1778). The split, settled 2026-11-22:
//
//   * **This list is the blocklist.** Every signup path calls
//     `isUsernameBlocked()` first. Whatever is here applies everywhere, ships
//     with a deploy, and cannot drift from the database.
//   * **The table is operator extras.** A name added by hand (migration or
//     console) to block something without shipping code. Nothing seeds it, so
//     an empty table is normal.
//
// When the two disagree, this list wins — it is checked first. If a name
// belongs to Grove's product vocabulary, it belongs here, not in the table.
