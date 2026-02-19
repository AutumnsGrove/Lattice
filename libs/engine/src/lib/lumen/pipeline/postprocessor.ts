/**
 * Lumen Pipeline - Postprocessor
 *
 * Handles response normalization, usage logging, and cost calculation.
 * IMPORTANT: This module logs metadata only - NEVER log content!
 */

import { calculateCost } from "../config.js";
import type {
  LumenProviderName,
  LumenResponse,
  LumenTask,
  LumenUsage,
} from "../types.js";
import type { LumenProviderResponse } from "../providers/types.js";

// =============================================================================
// RESPONSE NORMALIZATION
// =============================================================================

export interface PostprocessInput {
  /** Raw provider response */
  providerResponse: LumenProviderResponse;

  /** Provider that was used */
  provider: LumenProviderName;

  /** Task that was executed */
  task: LumenTask;

  /** Model that was used */
  model: string;

  /** Request start time (for latency calculation) */
  startTime: number;

  /** Whether response was from cache */
  cached?: boolean;
}

/**
 * Normalize a provider response into a standard LumenResponse
 */
export function normalizeResponse(input: PostprocessInput): LumenResponse {
  const latency = Date.now() - input.startTime;

  // Ensure usage has cost calculated
  const usage: LumenUsage = {
    input: input.providerResponse.usage.input,
    output: input.providerResponse.usage.output,
    cost:
      input.providerResponse.usage.cost ||
      calculateCost(
        input.model,
        input.providerResponse.usage.input,
        input.providerResponse.usage.output,
      ),
  };

  return {
    content: input.providerResponse.content,
    model: input.providerResponse.model || input.model,
    provider: input.provider,
    usage,
    cached: input.cached ?? false,
    latency,
  };
}

// =============================================================================
// USAGE LOGGING (METADATA ONLY)
// =============================================================================

/**
 * Usage log entry for analytics.
 * IMPORTANT: Never include content in logs!
 */
export interface UsageLogEntry {
  /** Tenant ID */
  tenantId: string;

  /** Task type */
  task: LumenTask;

  /** Model used */
  model: string;

  /** Provider used */
  provider: LumenProviderName;

  /** Input tokens */
  inputTokens: number;

  /** Output tokens */
  outputTokens: number;

  /** Cost in USD */
  cost: number;

  /** Latency in milliseconds */
  latencyMs: number;

  /** Whether response was cached */
  cached: boolean;

  /** Timestamp */
  timestamp: Date;

  /** Optional metadata (NO CONTENT!) */
  metadata?: {
    /** Input length in characters (not the content itself) */
    inputLength?: number;

    /** Output length in characters (not the content itself) */
    outputLength?: number;

    /** Whether PII was scrubbed */
    hadPii?: boolean;

    /** Number of PII items scrubbed */
    piiCount?: number;

    /** Types of PII scrubbed */
    piiTypes?: string[];

    /** Was this a streaming request */
    streamed?: boolean;

    /** Number of messages in conversation */
    messageCount?: number;
  };
}

/**
 * Create a usage log entry from a response.
 * This is what gets stored in D1 for analytics.
 */
export function createUsageLog(
  tenantId: string,
  task: LumenTask,
  response: LumenResponse,
  metadata?: UsageLogEntry["metadata"],
): UsageLogEntry {
  return {
    tenantId,
    task,
    model: response.model,
    provider: response.provider,
    inputTokens: response.usage.input,
    outputTokens: response.usage.output,
    cost: response.usage.cost,
    latencyMs: response.latency,
    cached: response.cached,
    timestamp: new Date(),
    metadata,
  };
}

// =============================================================================
// AGGREGATE STATS
// =============================================================================

/**
 * Aggregate usage statistics for a tenant
 */
export interface TenantUsageStats {
  /** Total requests */
  totalRequests: number;

  /** Total input tokens */
  totalInputTokens: number;

  /** Total output tokens */
  totalOutputTokens: number;

  /** Total cost in USD */
  totalCost: number;

  /** Average latency in ms */
  avgLatency: number;

  /** Cache hit rate (0-1) */
  cacheHitRate: number;

  /** Breakdown by task */
  byTask: Record<
    LumenTask,
    {
      requests: number;
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }
  >;

  /** Period start */
  periodStart: Date;

  /** Period end */
  periodEnd: Date;
}

/**
 * Calculate aggregate stats from usage logs
 */
export function calculateStats(logs: UsageLogEntry[]): TenantUsageStats {
  if (logs.length === 0) {
    return {
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      avgLatency: 0,
      cacheHitRate: 0,
      byTask: {} as TenantUsageStats["byTask"],
      periodStart: new Date(),
      periodEnd: new Date(),
    };
  }

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  let totalLatency = 0;
  let cacheHits = 0;

  const byTask: TenantUsageStats["byTask"] = {} as TenantUsageStats["byTask"];

  for (const log of logs) {
    totalInputTokens += log.inputTokens;
    totalOutputTokens += log.outputTokens;
    totalCost += log.cost;
    totalLatency += log.latencyMs;

    if (log.cached) {
      cacheHits++;
    }

    // Aggregate by task
    if (!byTask[log.task]) {
      byTask[log.task] = {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
      };
    }

    byTask[log.task].requests++;
    byTask[log.task].inputTokens += log.inputTokens;
    byTask[log.task].outputTokens += log.outputTokens;
    byTask[log.task].cost += log.cost;
  }

  // Find date range
  const timestamps = logs.map((l) => l.timestamp.getTime());
  const periodStart = new Date(Math.min(...timestamps));
  const periodEnd = new Date(Math.max(...timestamps));

  return {
    totalRequests: logs.length,
    totalInputTokens,
    totalOutputTokens,
    totalCost,
    avgLatency: totalLatency / logs.length,
    cacheHitRate: cacheHits / logs.length,
    byTask,
    periodStart,
    periodEnd,
  };
}
