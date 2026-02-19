/**
 * Shutter Database Layer - D1 operations for offenders list
 *
 * This module handles all database operations for the offenders list.
 * Uses Cloudflare D1 (SQLite at the edge) with async operations.
 */

import type { Offender, OffenderRow } from "./types";

/**
 * Convert a database row to an Offender object
 */
function rowToOffender(row: OffenderRow): Offender {
	return {
		domain: row.domain,
		firstSeen: row.first_seen,
		lastSeen: row.last_seen,
		detectionCount: row.detection_count,
		injectionTypes: JSON.parse(row.injection_types),
		avgConfidence: row.avg_confidence,
		maxConfidence: row.max_confidence,
	};
}

/**
 * Get an offender record by domain
 *
 * @param db - D1 database binding
 * @param domain - Domain to look up
 * @returns Offender record or null if not found
 */
export async function getOffender(db: D1Database, domain: string): Promise<Offender | null> {
	const result = await db
		.prepare("SELECT * FROM offenders WHERE domain = ?")
		.bind(domain)
		.first<OffenderRow>();

	if (!result) {
		return null;
	}

	return rowToOffender(result);
}

/**
 * Add or update an offender record
 *
 * If the domain exists, increments detection_count, updates timestamps,
 * adds new injection type if not already present, and recalculates confidence.
 *
 * @param db - D1 database binding
 * @param domain - Domain to add/update
 * @param injectionType - Type of injection detected
 * @param confidence - Detection confidence (0.0-1.0)
 */
export async function addOffender(
	db: D1Database,
	domain: string,
	injectionType: string,
	confidence: number = 1.0,
): Promise<void> {
	const now = new Date().toISOString();
	const existing = await getOffender(db, domain);

	if (existing) {
		// Update existing offender
		const newCount = existing.detectionCount + 1;

		// Add injection type if not already present
		const types = existing.injectionTypes.includes(injectionType)
			? existing.injectionTypes
			: [...existing.injectionTypes, injectionType];

		// Recalculate confidence scores
		// avg = ((old_avg * (count-1)) + new_confidence) / count
		const newAvg = (existing.avgConfidence * existing.detectionCount + confidence) / newCount;
		const newMax = Math.max(existing.maxConfidence, confidence);

		await db
			.prepare(
				`UPDATE offenders
         SET last_seen = ?,
             detection_count = ?,
             injection_types = ?,
             avg_confidence = ?,
             max_confidence = ?
         WHERE domain = ?`,
			)
			.bind(now, newCount, JSON.stringify(types), newAvg, newMax, domain)
			.run();
	} else {
		// Insert new offender
		await db
			.prepare(
				`INSERT INTO offenders
         (domain, first_seen, last_seen, detection_count, injection_types, avg_confidence, max_confidence)
         VALUES (?, ?, ?, 1, ?, ?, ?)`,
			)
			.bind(domain, now, now, JSON.stringify([injectionType]), confidence, confidence)
			.run();
	}
}

/**
 * Check if a domain should be skipped based on offender status
 *
 * Skip conditions (same as Python implementation):
 * - detection_count >= 3
 * - max_confidence >= 0.90
 * - avg_confidence >= 0.80 AND detection_count >= 2
 *
 * @param db - D1 database binding
 * @param domain - Domain to check
 * @returns True if the domain should be skipped
 */
export async function shouldSkipFetch(db: D1Database, domain: string): Promise<boolean> {
	const offender = await getOffender(db, domain);

	if (!offender) {
		return false;
	}

	// Skip if 3+ detections
	if (offender.detectionCount >= 3) {
		return true;
	}

	// Skip if single detection with very high confidence
	if (offender.maxConfidence >= 0.9) {
		return true;
	}

	// Skip if 2+ detections with high average confidence
	if (offender.avgConfidence >= 0.8 && offender.detectionCount >= 2) {
		return true;
	}

	return false;
}

/**
 * List all offenders, ordered by detection count descending
 *
 * @param db - D1 database binding
 * @returns Array of all offender records
 */
export async function listOffenders(db: D1Database): Promise<Offender[]> {
	const { results } = await db
		.prepare("SELECT * FROM offenders ORDER BY detection_count DESC")
		.all<OffenderRow>();

	return results.map(rowToOffender);
}

/**
 * Clear all offender records
 *
 * Use with caution - primarily for testing and reset purposes.
 *
 * @param db - D1 database binding
 */
export async function clearOffenders(db: D1Database): Promise<void> {
	await db.prepare("DELETE FROM offenders").run();
}
