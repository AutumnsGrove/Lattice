/**
 * Petal Security Logging
 *
 * Security event logging for Petal moderation.
 * CRITICAL: Never log image content - only hashes and metadata.
 *
 * @see docs/specs/petal-spec.md Section 12
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { PetalSecurityLog, PetalLayer, PetalCategory } from "./types.js";

// ============================================================================
// Security Event Logging
// ============================================================================

/**
 * Log a Petal security event
 *
 * IMPORTANT: This function NEVER logs image content.
 * Only content hashes, decisions, and anonymous metadata are stored.
 */
export async function logSecurityEvent(
  db: D1Database,
  event: Omit<PetalSecurityLog, "id">,
): Promise<void> {
  const id = crypto.randomUUID().replace(/-/g, "").substring(0, 16);

  try {
    await db
      .prepare(
        `INSERT INTO petal_security_log (
          id, timestamp, layer, result, category, confidence,
          content_hash, feature, user_id, tenant_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        event.timestamp,
        event.layer,
        event.result,
        event.category || null,
        event.confidence || null,
        event.contentHash,
        event.feature,
        event.userId || null,
        event.tenantId || null,
      )
      .run();
  } catch (err) {
    // Log to console but don't fail the request
    // Security logging should not block operations
    console.error("[Petal] Failed to log security event:", err);
  }
}

// ============================================================================
// Query Functions (for admin/monitoring)
// ============================================================================

/**
 * Get recent security events for a user
 * For detecting abuse patterns
 */
export async function getRecentUserEvents(
  db: D1Database,
  userId: string,
  options: {
    days?: number;
    limit?: number;
    resultFilter?: "pass" | "block" | "retry";
  } = {},
): Promise<PetalSecurityLog[]> {
  const { days = 7, limit = 100, resultFilter } = options;

  let query = `
    SELECT * FROM petal_security_log
    WHERE user_id = ?
    AND timestamp > datetime('now', '-${days} days')
  `;

  const params: unknown[] = [userId];

  if (resultFilter) {
    query += ` AND result = ?`;
    params.push(resultFilter);
  }

  query += ` ORDER BY timestamp DESC LIMIT ?`;
  params.push(limit);

  try {
    const result = await db
      .prepare(query)
      .bind(...params)
      .all();
    return (result.results || []) as unknown as PetalSecurityLog[];
  } catch (err) {
    console.error("[Petal] Failed to query user events:", err);
    return [];
  }
}

/**
 * Get block count for a user in recent period
 * For abuse detection thresholds
 */
export async function getUserBlockCount(
  db: D1Database,
  userId: string,
  days: number = 7,
): Promise<number> {
  try {
    const result = await db
      .prepare(
        `SELECT COUNT(*) as count FROM petal_security_log
         WHERE user_id = ?
         AND result = 'block'
         AND timestamp > datetime('now', '-${days} days')`,
      )
      .bind(userId)
      .first<{ count: number }>();

    return result?.count || 0;
  } catch (err) {
    console.error("[Petal] Failed to get block count:", err);
    return 0;
  }
}

/**
 * Get recent blocks by category
 * For monitoring and alerting
 */
export async function getRecentBlocksByCategory(
  db: D1Database,
  hours: number = 24,
): Promise<Array<{ category: string; count: number }>> {
  try {
    const result = await db
      .prepare(
        `SELECT category, COUNT(*) as count FROM petal_security_log
         WHERE result = 'block'
         AND category IS NOT NULL
         AND timestamp > datetime('now', '-${hours} hours')
         GROUP BY category
         ORDER BY count DESC`,
      )
      .all();

    return (result.results || []) as Array<{ category: string; count: number }>;
  } catch (err) {
    console.error("[Petal] Failed to get blocks by category:", err);
    return [];
  }
}

/**
 * Check if user has pattern of violations
 * Returns true if user should be flagged for review
 */
export async function hasViolationPattern(
  db: D1Database,
  userId: string,
  threshold: number = 3,
): Promise<boolean> {
  const blockCount = await getUserBlockCount(db, userId, 30);
  return blockCount >= threshold;
}

// ============================================================================
// Cleanup Functions
// ============================================================================

/**
 * Delete old security logs (retention policy)
 * Default: 90 days
 */
export async function cleanupOldLogs(
  db: D1Database,
  retentionDays: number = 90,
): Promise<number> {
  try {
    const result = await db
      .prepare(
        `DELETE FROM petal_security_log
         WHERE timestamp < datetime('now', '-${retentionDays} days')`,
      )
      .run();

    return result.meta?.changes || 0;
  } catch (err) {
    console.error("[Petal] Failed to cleanup old logs:", err);
    return 0;
  }
}

// ============================================================================
// Hash Utilities
// ============================================================================

/**
 * Compute SHA-256 hash of image content
 * Used for logging and duplicate detection
 */
export async function computeContentHash(
  content: Uint8Array | ArrayBuffer,
): Promise<string> {
  // Ensure we have an ArrayBuffer for crypto.subtle.digest
  // We slice the buffer to handle Uint8Array views into larger buffers
  const buffer: ArrayBuffer =
    content instanceof Uint8Array
      ? (content.buffer.slice(
          content.byteOffset,
          content.byteOffset + content.byteLength,
        ) as ArrayBuffer)
      : content;
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
