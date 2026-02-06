/**
 * Thorn - Moderation Logging
 *
 * Database logging for Thorn moderation decisions and flagged content.
 * Follows the same patterns as petal/logging.ts:
 * - All functions wrap DB calls in try/catch
 * - Errors log to console but never throw
 * - ID generation uses crypto.randomUUID() truncated to 16 chars
 *
 * @see docs/specs/thorn-spec.md
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { ThornAction, ThornContentType, ThornHookPoint } from "./types.js";

// ============================================================================
// Types
// ============================================================================

export interface ThornModerationEvent {
  userId?: string;
  tenantId?: string;
  contentType: ThornContentType;
  hookPoint: ThornHookPoint;
  action: ThornAction;
  categories: string[];
  confidence: number;
  model: string;
  contentRef?: string;
}

export interface ThornFlaggedContentInput {
  userId?: string;
  tenantId?: string;
  contentType: ThornContentType;
  contentRef?: string;
  action: ThornAction;
  categories: string[];
  confidence: number;
}

export interface ThornFlaggedContentRow {
  id: string;
  created_at: string;
  user_id: string | null;
  tenant_id: string | null;
  content_type: string;
  content_ref: string | null;
  action: string;
  categories: string | null;
  confidence: number | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

export interface ThornModerationLogRow {
  id: string;
  timestamp: string;
  user_id: string | null;
  tenant_id: string | null;
  content_type: string;
  hook_point: string;
  action: string;
  categories: string | null;
  confidence: number | null;
  model: string | null;
  content_ref: string | null;
}

export interface ThornStats {
  total: number;
  allowed: number;
  warned: number;
  flagged: number;
  blocked: number;
  passRate: number;
  byCategory: Array<{ category: string; count: number }>;
  byContentType: Array<{ content_type: string; count: number }>;
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 16);
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Log a moderation event (every decision, including allows)
 */
export async function logModerationEvent(
  db: D1Database,
  event: ThornModerationEvent,
): Promise<void> {
  const id = generateId();

  try {
    await db
      .prepare(
        `INSERT INTO thorn_moderation_log (
          id, user_id, tenant_id, content_type, hook_point,
          action, categories, confidence, model, content_ref
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        event.userId || null,
        event.tenantId || null,
        event.contentType,
        event.hookPoint,
        event.action,
        JSON.stringify(event.categories),
        event.confidence,
        event.model,
        event.contentRef || null,
      )
      .run();
  } catch (err) {
    // Log to console but don't fail the request
    console.error("[Thorn] Failed to log moderation event:", err);
  }
}

/**
 * Flag content for Wayfinder review
 */
export async function flagContent(
  db: D1Database,
  data: ThornFlaggedContentInput,
): Promise<void> {
  const id = generateId();

  try {
    await db
      .prepare(
        `INSERT INTO thorn_flagged_content (
          id, user_id, tenant_id, content_type, content_ref,
          action, categories, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        data.userId || null,
        data.tenantId || null,
        data.contentType,
        data.contentRef || null,
        data.action,
        JSON.stringify(data.categories),
        data.confidence,
      )
      .run();
  } catch (err) {
    console.error("[Thorn] Failed to flag content:", err);
  }
}

/**
 * Update the status of a flagged content item (Wayfinder review action)
 */
export async function updateFlagStatus(
  db: D1Database,
  flagId: string,
  status: "cleared" | "removed",
  reviewedBy: string,
  notes?: string,
): Promise<boolean> {
  try {
    const result = await db
      .prepare(
        `UPDATE thorn_flagged_content
         SET status = ?, reviewed_by = ?, reviewed_at = datetime('now'), review_notes = ?
         WHERE id = ?`,
      )
      .bind(status, reviewedBy, notes || null, flagId)
      .run();

    return (result.meta?.changes || 0) > 0;
  } catch (err) {
    console.error("[Thorn] Failed to update flag status:", err);
    return false;
  }
}

// ============================================================================
// Read Operations (for dashboard)
// ============================================================================

/**
 * Get recent moderation events
 */
export async function getRecentEvents(
  db: D1Database,
  options: { days?: number; limit?: number } = {},
): Promise<ThornModerationLogRow[]> {
  const { days = 7, limit = 50 } = options;

  try {
    const result = await db
      .prepare(
        `SELECT * FROM thorn_moderation_log
         WHERE timestamp > datetime('now', '-${days} days')
         ORDER BY timestamp DESC
         LIMIT ?`,
      )
      .bind(limit)
      .all();

    return (result.results || []) as unknown as ThornModerationLogRow[];
  } catch (err) {
    console.error("[Thorn] Failed to get recent events:", err);
    return [];
  }
}

/**
 * Get flagged content for review queue
 */
export async function getFlaggedContent(
  db: D1Database,
  options: { status?: string; limit?: number } = {},
): Promise<ThornFlaggedContentRow[]> {
  const { status = "pending", limit = 50 } = options;

  try {
    let query = `SELECT * FROM thorn_flagged_content`;
    const params: unknown[] = [];

    if (status) {
      query += ` WHERE status = ?`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const result = await db
      .prepare(query)
      .bind(...params)
      .all();

    return (result.results || []) as unknown as ThornFlaggedContentRow[];
  } catch (err) {
    console.error("[Thorn] Failed to get flagged content:", err);
    return [];
  }
}

/**
 * Get aggregate stats for the dashboard
 */
export async function getStats(
  db: D1Database,
  days: number = 30,
): Promise<ThornStats> {
  const empty: ThornStats = {
    total: 0,
    allowed: 0,
    warned: 0,
    flagged: 0,
    blocked: 0,
    passRate: 0,
    byCategory: [],
    byContentType: [],
  };

  try {
    // Action counts
    const countsResult = await db
      .prepare(
        `SELECT
           COUNT(*) as total,
           COUNT(CASE WHEN action = 'allow' THEN 1 END) as allowed,
           COUNT(CASE WHEN action = 'warn' THEN 1 END) as warned,
           COUNT(CASE WHEN action = 'flag_review' THEN 1 END) as flagged,
           COUNT(CASE WHEN action = 'block' THEN 1 END) as blocked
         FROM thorn_moderation_log
         WHERE timestamp > datetime('now', '-${days} days')`,
      )
      .first<{
        total: number;
        allowed: number;
        warned: number;
        flagged: number;
        blocked: number;
      }>();

    if (!countsResult) return empty;

    const total = countsResult.total || 0;
    const passRate =
      total > 0 ? ((countsResult.allowed || 0) / total) * 100 : 0;

    // By-category breakdown (only for non-allow actions)
    let byCategory: Array<{ category: string; count: number }> = [];
    try {
      const catResult = await db
        .prepare(
          `SELECT categories, COUNT(*) as count FROM thorn_moderation_log
           WHERE action != 'allow'
           AND categories IS NOT NULL
           AND timestamp > datetime('now', '-${days} days')
           GROUP BY categories
           ORDER BY count DESC
           LIMIT 20`,
        )
        .all();

      // Categories are stored as JSON arrays, so we need to parse and aggregate
      const catMap = new Map<string, number>();
      for (const row of (catResult.results || []) as Array<{
        categories: string;
        count: number;
      }>) {
        try {
          const cats = JSON.parse(row.categories);
          for (const cat of cats) {
            catMap.set(cat, (catMap.get(cat) || 0) + row.count);
          }
        } catch {
          // Skip malformed JSON
        }
      }
      byCategory = Array.from(catMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);
    } catch (err) {
      console.error("[Thorn] Failed to get category stats:", err);
    }

    // By-content-type breakdown
    let byContentType: Array<{ content_type: string; count: number }> = [];
    try {
      const typeResult = await db
        .prepare(
          `SELECT content_type, COUNT(*) as count FROM thorn_moderation_log
           WHERE timestamp > datetime('now', '-${days} days')
           GROUP BY content_type
           ORDER BY count DESC`,
        )
        .all();

      byContentType = (typeResult.results || []) as Array<{
        content_type: string;
        count: number;
      }>;
    } catch (err) {
      console.error("[Thorn] Failed to get content type stats:", err);
    }

    return {
      total,
      allowed: countsResult.allowed || 0,
      warned: countsResult.warned || 0,
      flagged: countsResult.flagged || 0,
      blocked: countsResult.blocked || 0,
      passRate: Math.round(passRate * 10) / 10,
      byCategory,
      byContentType,
    };
  } catch (err) {
    console.error("[Thorn] Failed to get stats:", err);
    return empty;
  }
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Delete old moderation logs (retention policy)
 * Default: 90 days
 */
export async function cleanupOldLogs(
  db: D1Database,
  retentionDays: number = 90,
): Promise<number> {
  try {
    const result = await db
      .prepare(
        `DELETE FROM thorn_moderation_log
         WHERE timestamp < datetime('now', '-${retentionDays} days')`,
      )
      .run();

    return result.meta?.changes || 0;
  } catch (err) {
    console.error("[Thorn] Failed to cleanup old logs:", err);
    return 0;
  }
}
