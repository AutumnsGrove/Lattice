/**
 * Lumen Quota Tracker
 *
 * D1-backed usage tracking for quota enforcement.
 * Stores metadata only - NEVER stores content!
 *
 * Schema: migrations/034_lumen_usage.sql
 */

import type { TierKey } from "$lib/config/tiers.js";
import { QuotaExceededError } from "../errors.js";
import type { LumenProviderName, LumenTask, LumenUsage } from "../types.js";
import {
  createUsageLog,
  type UsageLogEntry,
} from "../pipeline/postprocessor.js";
import { getTierQuota, wouldExceedQuota } from "./limits.js";

// =============================================================================
// TYPES
// =============================================================================

export interface QuotaCheckResult {
  /** Whether the request is allowed */
  allowed: boolean;

  /** Current usage for this task today */
  currentUsage: number;

  /** Daily limit for this task */
  limit: number;

  /** Remaining requests */
  remaining: number;
}

export interface UsageRecord {
  id: number;
  tenantId: string;
  task: LumenTask;
  model: string;
  provider: LumenProviderName;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  cached: number; // SQLite boolean
  createdAt: string;
}

// =============================================================================
// QUOTA TRACKER
// =============================================================================

export class QuotaTracker {
  private readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // ===========================================================================
  // QUOTA CHECKING
  // ===========================================================================

  /**
   * Check if a request is allowed based on quota
   */
  async checkQuota(
    tenantId: string,
    tier: TierKey,
    task: LumenTask,
  ): Promise<QuotaCheckResult> {
    const limit = getTierQuota(tier, task);
    const currentUsage = await this.getTodayUsage(tenantId, task);
    const allowed = !wouldExceedQuota(currentUsage, limit);

    return {
      allowed,
      currentUsage,
      limit,
      remaining: Math.max(0, limit - currentUsage),
    };
  }

  /**
   * Check quota and throw if exceeded
   */
  async enforceQuota(
    tenantId: string,
    tier: TierKey,
    task: LumenTask,
  ): Promise<void> {
    const { allowed, currentUsage, limit } = await this.checkQuota(
      tenantId,
      tier,
      task,
    );

    if (!allowed) {
      throw new QuotaExceededError(task, limit, currentUsage);
    }
  }

  // ===========================================================================
  // USAGE TRACKING
  // ===========================================================================

  /**
   * Record a request's usage
   */
  async recordUsage(
    tenantId: string,
    task: LumenTask,
    model: string,
    provider: LumenProviderName,
    usage: LumenUsage,
    latencyMs: number,
    cached: boolean = false,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO lumen_usage
         (tenant_id, task, model, provider, input_tokens, output_tokens, cost, latency_ms, cached)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        tenantId,
        task,
        model,
        provider,
        usage.input,
        usage.output,
        usage.cost,
        latencyMs,
        cached ? 1 : 0,
      )
      .run();
  }

  /**
   * Get today's usage count for a task
   */
  async getTodayUsage(tenantId: string, task: LumenTask): Promise<number> {
    const todayStart = this.getTodayStartUTC();

    const result = await this.db
      .prepare(
        `SELECT COUNT(*) as count
         FROM lumen_usage
         WHERE tenant_id = ? AND task = ? AND created_at >= ?`,
      )
      .bind(tenantId, task, todayStart)
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  /**
   * Get all usage for today
   */
  async getTodayUsageAll(tenantId: string): Promise<Record<LumenTask, number>> {
    const todayStart = this.getTodayStartUTC();

    const results = await this.db
      .prepare(
        `SELECT task, COUNT(*) as count
         FROM lumen_usage
         WHERE tenant_id = ? AND created_at >= ?
         GROUP BY task`,
      )
      .bind(tenantId, todayStart)
      .all<{ task: LumenTask; count: number }>();

    // Initialize all tasks to 0
    const usage: Record<LumenTask, number> = {
      moderation: 0,
      generation: 0,
      summary: 0,
      embedding: 0,
      chat: 0,
      image: 0,
      code: 0,
      transcription: 0,
    };

    // Fill in actual counts
    for (const row of results.results ?? []) {
      usage[row.task] = row.count;
    }

    return usage;
  }

  // ===========================================================================
  // ANALYTICS
  // ===========================================================================

  /**
   * Get usage history for a tenant
   */
  async getUsageHistory(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      task?: LumenTask;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<UsageRecord[]> {
    let query = `SELECT * FROM lumen_usage WHERE tenant_id = ?`;
    const params: (string | number)[] = [tenantId];

    if (options?.task) {
      query += ` AND task = ?`;
      params.push(options.task);
    }

    if (options?.startDate) {
      query += ` AND created_at >= ?`;
      params.push(this.toSQLiteTimestamp(options.startDate));
    }

    if (options?.endDate) {
      query += ` AND created_at <= ?`;
      params.push(this.toSQLiteTimestamp(options.endDate));
    }

    query += ` ORDER BY created_at DESC`;

    if (options?.limit) {
      query += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ` OFFSET ?`;
      params.push(options.offset);
    }

    const results = await this.db
      .prepare(query)
      .bind(...params)
      .all<UsageRecord>();

    return results.results ?? [];
  }

  /**
   * Get aggregate stats for a tenant in a date range
   */
  async getAggregateStats(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    avgLatency: number;
    byTask: Record<LumenTask, { requests: number; cost: number }>;
  }> {
    const results = await this.db
      .prepare(
        `SELECT
           task,
           COUNT(*) as requests,
           SUM(input_tokens) as input_tokens,
           SUM(output_tokens) as output_tokens,
           SUM(cost) as total_cost,
           AVG(latency_ms) as avg_latency
         FROM lumen_usage
         WHERE tenant_id = ? AND created_at >= ? AND created_at <= ?
         GROUP BY task`,
      )
      .bind(
        tenantId,
        this.toSQLiteTimestamp(startDate),
        this.toSQLiteTimestamp(endDate),
      )
      .all<{
        task: LumenTask;
        requests: number;
        input_tokens: number;
        output_tokens: number;
        total_cost: number;
        avg_latency: number;
      }>();

    let totalRequests = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;
    let totalLatency = 0;
    const byTask: Record<LumenTask, { requests: number; cost: number }> =
      {} as Record<LumenTask, { requests: number; cost: number }>;

    for (const row of results.results ?? []) {
      totalRequests += row.requests;
      totalInputTokens += row.input_tokens ?? 0;
      totalOutputTokens += row.output_tokens ?? 0;
      totalCost += row.total_cost ?? 0;
      totalLatency += (row.avg_latency ?? 0) * row.requests;

      byTask[row.task] = {
        requests: row.requests,
        cost: row.total_cost ?? 0,
      };
    }

    return {
      totalRequests,
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      avgLatency: totalRequests > 0 ? totalLatency / totalRequests : 0,
      byTask,
    };
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Delete old usage records (for data retention compliance)
   * Call this periodically (e.g., weekly cron job)
   */
  async cleanupOldRecords(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.db
      .prepare(`DELETE FROM lumen_usage WHERE created_at < ?`)
      .bind(this.toSQLiteTimestamp(cutoffDate))
      .run();

    return result.meta.changes ?? 0;
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Get today's start timestamp in UTC (midnight)
   *
   * Returns SQLite-compatible format "YYYY-MM-DD HH:MM:SS" to match
   * CURRENT_TIMESTAMP. Using toISOString() ("...T00:00:00.000Z") breaks
   * lexicographic comparison because space < 'T' in ASCII.
   */
  private getTodayStartUTC(): string {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d} 00:00:00`;
  }

  /**
   * Convert a JS Date to SQLite-compatible timestamp string.
   * SQLite CURRENT_TIMESTAMP uses "YYYY-MM-DD HH:MM:SS" format,
   * so bound parameters must match for lexicographic comparison.
   */
  private toSQLiteTimestamp(date: Date): string {
    const y = date.getUTCFullYear();
    const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    const h = String(date.getUTCHours()).padStart(2, "0");
    const mi = String(date.getUTCMinutes()).padStart(2, "0");
    const s = String(date.getUTCSeconds()).padStart(2, "0");
    return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a quota tracker instance
 */
export function createQuotaTracker(db: D1Database): QuotaTracker {
  return new QuotaTracker(db);
}
