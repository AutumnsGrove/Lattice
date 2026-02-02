/**
 * D1 Logging
 *
 * Write email logs to D1 zephyr_logs table.
 */

import type { ZephyrLogEntry } from "../types";

/**
 * Log an email send attempt to D1
 */
export async function logToD1(
  db: D1Database,
  entry: Omit<ZephyrLogEntry, "id" | "created_at"> & {
    id: string;
    created_at: number;
  },
): Promise<void> {
  try {
    await db
      .prepare(
        `
        INSERT INTO zephyr_logs (
          id,
          message_id,
          type,
          template,
          recipient,
          subject,
          success,
          error_code,
          error_message,
          provider,
          attempts,
          latency_ms,
          tenant,
          source,
          correlation_id,
          idempotency_key,
          created_at,
          scheduled_at,
          sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .bind(
        entry.id,
        entry.message_id || null,
        entry.type,
        entry.template,
        entry.recipient,
        entry.subject || null,
        entry.success ? 1 : 0,
        entry.error_code || null,
        entry.error_message || null,
        entry.provider || null,
        entry.attempts,
        entry.latency_ms || null,
        entry.tenant || null,
        entry.source || null,
        entry.correlation_id || null,
        entry.idempotency_key || null,
        entry.created_at,
        entry.scheduled_at || null,
        entry.sent_at || null,
      )
      .run();
  } catch (error) {
    // Log to console but don't fail the request
    console.error("[Zephyr] Failed to write to D1:", error);
  }
}

/**
 * Query logs with filters
 */
export async function queryLogs(
  db: D1Database,
  filters: {
    tenant?: string;
    recipient?: string;
    type?: string;
    success?: boolean;
    startTime?: number;
    endTime?: number;
    limit?: number;
    offset?: number;
  },
): Promise<ZephyrLogEntry[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.tenant) {
    conditions.push("tenant = ?");
    params.push(filters.tenant);
  }

  if (filters.recipient) {
    conditions.push("recipient = ?");
    params.push(filters.recipient);
  }

  if (filters.type) {
    conditions.push("type = ?");
    params.push(filters.type);
  }

  if (filters.success !== undefined) {
    conditions.push("success = ?");
    params.push(filters.success ? 1 : 0);
  }

  if (filters.startTime) {
    conditions.push("created_at >= ?");
    params.push(filters.startTime);
  }

  if (filters.endTime) {
    conditions.push("created_at <= ?");
    params.push(filters.endTime);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  const query = `
    SELECT * FROM zephyr_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const result = await db
    .prepare(query)
    .bind(...params, limit, offset)
    .all<ZephyrLogEntry>();

  return result.results || [];
}

/**
 * Get email statistics for a tenant
 */
export async function getTenantStats(
  db: D1Database,
  tenant: string,
  startTime: number,
  endTime: number,
): Promise<{
  total: number;
  successful: number;
  failed: number;
  byType: Record<string, { total: number; successful: number; failed: number }>;
}> {
  const result = await db
    .prepare(
      `
      SELECT
        type,
        success,
        COUNT(*) as count
      FROM zephyr_logs
      WHERE tenant = ?
      AND created_at >= ?
      AND created_at <= ?
      GROUP BY type, success
    `,
    )
    .bind(tenant, startTime, endTime)
    .all<{
      type: string;
      success: number;
      count: number;
    }>();

  const stats = {
    total: 0,
    successful: 0,
    failed: 0,
    byType: {} as Record<
      string,
      { total: number; successful: number; failed: number }
    >,
  };

  for (const row of result.results || []) {
    const count = row.count;
    stats.total += count;

    if (row.success) {
      stats.successful += count;
    } else {
      stats.failed += count;
    }

    if (!stats.byType[row.type]) {
      stats.byType[row.type] = { total: 0, successful: 0, failed: 0 };
    }

    stats.byType[row.type].total += count;
    if (row.success) {
      stats.byType[row.type].successful += count;
    } else {
      stats.byType[row.type].failed += count;
    }
  }

  return stats;
}
