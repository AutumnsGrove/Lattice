/**
 * Thorn — Entity Label Operations
 *
 * Persistent labels on entities (users, IPs, email domains) that give
 * Thorn memory across events. Inspired by Discord Osprey's HasLabel /
 * LabelAdd / LabelRemove pattern.
 *
 * All operations are tenant-scoped and never throw — errors are logged
 * to console, following the same pattern as thorn/logging.ts.
 *
 * @see docs/specs/thorn-behavioral-spec.md
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { EntityType, EntityLabel } from "./types.js";

// =============================================================================
// Validation
// =============================================================================

const VALID_ENTITY_TYPES = new Set<string>(["user", "ip", "email_domain", "tenant"]);

/** Runtime guard — TypeScript unions don't enforce at runtime */
function isValidEntityType(value: string): value is EntityType {
	return VALID_ENTITY_TYPES.has(value);
}

/**
 * Labels must be lowercase alphanumeric with colons, underscores, hyphens.
 * Max 64 chars. Example: thorn:rapid_poster, thorn:repeat_offender
 */
const LABEL_PATTERN = /^[a-z0-9:_-]+$/;
function isValidLabelName(label: string): boolean {
	return label.length > 0 && label.length <= 64 && LABEL_PATTERN.test(label);
}

/**
 * Clamp and sanitize a numeric hours parameter for SQLite datetime() modifier.
 * SQLite's datetime('now', '+N hours') doesn't support parameterized modifiers,
 * so we ensure the value is a safe integer in a bounded range.
 * Follows the same pattern as thorn/logging.ts safeDays().
 */
function safeHours(hours: number, max: number = 8760): number {
	const n = Number(hours);
	if (!Number.isFinite(n)) return 1;
	return Math.max(1, Math.min(max, Math.floor(n)));
}

// =============================================================================
// Read Operations
// =============================================================================

/**
 * Get all active (non-expired) labels for an entity within a tenant.
 * Returns label strings only — use for rule evaluation.
 */
export async function getEntityLabels(
	db: D1Database,
	tenantId: string,
	entityType: EntityType,
	entityId: string,
): Promise<string[]> {
	try {
		const result = await db
			.prepare(
				`SELECT label FROM thorn_entity_labels
				 WHERE tenant_id = ? AND entity_type = ? AND entity_id = ?
				 AND (expires_at IS NULL OR expires_at > datetime('now'))`,
			)
			.bind(tenantId, entityType, entityId)
			.all();

		return (result.results || []).map((row) => (row as { label: string }).label);
	} catch (err) {
		console.error("[Thorn:behavioral] Failed to get entity labels:", err);
		return [];
	}
}

/**
 * Check if an entity has a specific active label within a tenant.
 * Optimized single-row query — faster than fetching all labels.
 */
export async function hasLabel(
	db: D1Database,
	tenantId: string,
	entityType: EntityType,
	entityId: string,
	label: string,
): Promise<boolean> {
	try {
		const result = await db
			.prepare(
				`SELECT 1 FROM thorn_entity_labels
				 WHERE tenant_id = ? AND entity_type = ? AND entity_id = ? AND label = ?
				 AND (expires_at IS NULL OR expires_at > datetime('now'))
				 LIMIT 1`,
			)
			.bind(tenantId, entityType, entityId, label)
			.first();

		return result !== null;
	} catch (err) {
		console.error("[Thorn:behavioral] Failed to check label:", err);
		return false;
	}
}

// =============================================================================
// Write Operations
// =============================================================================

/**
 * Add a label to an entity within a tenant.
 * Uses INSERT OR REPLACE — adding the same label updates metadata.
 *
 * Input validation:
 * - entityType must be a valid EntityType (runtime check)
 * - label must be lowercase alphanumeric with colons/underscores/hyphens, max 64 chars
 * - expiresInHours is clamped to [1, 8760] via safeHours() to prevent SQL injection
 *   (SQLite datetime() modifiers cannot be parameterized)
 */
export async function addLabel(
	db: D1Database,
	tenantId: string,
	entityType: EntityType,
	entityId: string,
	label: string,
	options: {
		addedBy: string;
		expiresInHours?: number;
		reason?: string;
	},
): Promise<void> {
	// Runtime validation — TypeScript unions don't enforce at runtime
	if (!isValidEntityType(entityType)) {
		console.error(`[Thorn:behavioral] Invalid entity type: ${String(entityType)}`);
		return;
	}
	if (!isValidLabelName(label)) {
		console.error(`[Thorn:behavioral] Invalid label name: ${label.slice(0, 80)}`);
		return;
	}

	try {
		if (options.expiresInHours != null) {
			// Dynamic expiry via SQLite datetime() function.
			// safeHours() ensures the interpolated value is always a bounded integer.
			// SQLite datetime() modifiers cannot be parameterized — this is the
			// same pattern as safeDays() in thorn/logging.ts.
			const hours = safeHours(options.expiresInHours);
			await db
				.prepare(
					`INSERT OR REPLACE INTO thorn_entity_labels
					 (tenant_id, entity_type, entity_id, label, added_at, expires_at, added_by, reason)
					 VALUES (?, ?, ?, ?, datetime('now'), datetime('now', '+${hours} hours'), ?, ?)`,
				)
				.bind(tenantId, entityType, entityId, label, options.addedBy, options.reason || null)
				.run();
		} else {
			// Permanent label (no expiry)
			await db
				.prepare(
					`INSERT OR REPLACE INTO thorn_entity_labels
					 (tenant_id, entity_type, entity_id, label, added_at, expires_at, added_by, reason)
					 VALUES (?, ?, ?, ?, datetime('now'), NULL, ?, ?)`,
				)
				.bind(tenantId, entityType, entityId, label, options.addedBy, options.reason || null)
				.run();
		}
	} catch (err) {
		console.error("[Thorn:behavioral] Failed to add label:", err);
	}
}

/**
 * Remove a label from an entity within a tenant.
 */
export async function removeLabel(
	db: D1Database,
	tenantId: string,
	entityType: EntityType,
	entityId: string,
	label: string,
): Promise<void> {
	try {
		await db
			.prepare(
				`DELETE FROM thorn_entity_labels
				 WHERE tenant_id = ? AND entity_type = ? AND entity_id = ? AND label = ?`,
			)
			.bind(tenantId, entityType, entityId, label)
			.run();
	} catch (err) {
		console.error("[Thorn:behavioral] Failed to remove label:", err);
	}
}

// =============================================================================
// Cleanup
// =============================================================================

/**
 * Delete all expired labels across all tenants.
 * Call periodically (daily cron) to keep the table clean.
 * Returns the number of labels deleted.
 */
export async function cleanupExpiredLabels(db: D1Database): Promise<number> {
	try {
		const result = await db
			.prepare(
				`DELETE FROM thorn_entity_labels
				 WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')`,
			)
			.run();

		const deleted = result.meta?.changes || 0;
		if (deleted > 0) {
			console.log(`[Thorn:behavioral] Cleaned up ${deleted} expired labels`);
		}
		return deleted;
	} catch (err) {
		console.error("[Thorn:behavioral] Failed to cleanup expired labels:", err);
		return 0;
	}
}

// =============================================================================
// Bulk Read (for admin panel)
// =============================================================================

/**
 * Get all label details for an entity (including metadata).
 * Used by the admin panel — returns full EntityLabel rows.
 */
export async function getEntityLabelDetails(
	db: D1Database,
	tenantId: string,
	entityType: EntityType,
	entityId: string,
): Promise<EntityLabel[]> {
	try {
		const result = await db
			.prepare(
				`SELECT * FROM thorn_entity_labels
				 WHERE tenant_id = ? AND entity_type = ? AND entity_id = ?
				 ORDER BY added_at DESC`,
			)
			.bind(tenantId, entityType, entityId)
			.all();

		return (result.results || []) as unknown as EntityLabel[];
	} catch (err) {
		console.error("[Thorn:behavioral] Failed to get entity label details:", err);
		return [];
	}
}
