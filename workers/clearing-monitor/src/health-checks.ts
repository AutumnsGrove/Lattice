/**
 * Health Check Module
 *
 * Fetches health endpoints and classifies status based on latency and response.
 */

import type { ComponentConfig } from "./config";
import { LATENCY_THRESHOLDS, REQUEST_TIMEOUT } from "./config";
import { ComponentStatus } from "./utils";

/**
 * Result of a health check
 */
export interface HealthCheckResult {
  componentId: string;
  componentName: string;
  status:
    | "operational"
    | "degraded"
    | "partial_outage"
    | "major_outage"
    | "maintenance";
  latencyMs: number;
  httpStatus: number | null;
  error: string | null;
  timestamp: string;
}

/**
 * Deep health response format (JSON response from /api/health endpoints)
 */
interface DeepHealthResponse {
  status: "healthy" | "degraded" | "unhealthy" | "maintenance";
  service: string;
  reason?: string;
  checks?: {
    name: string;
    status: "pass" | "fail" | "skip";
    latency_ms?: number;
    error?: string;
  }[];
  timestamp: string;
}

/**
 * Perform health check for a single component
 */
export async function checkComponent(
  config: ComponentConfig,
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Create abort controller for timeout (outside try so catch can clear it)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(config.url, {
      method: config.method,
      signal: controller.signal,
      headers: {
        "User-Agent": "Grove-Clearing-Monitor/1.0",
        Accept: config.checkType === "deep" ? "application/json" : "*/*",
      },
    });

    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;
    const httpStatus = response.status;

    // For deep checks, parse JSON and check service-reported status
    if (config.checkType === "deep") {
      return await evaluateDeepCheck(config, response, latencyMs, timestamp);
    }

    // For shallow checks, just verify HTTP 200
    return evaluateShallowCheck(config, httpStatus, latencyMs, timestamp);
  } catch (err) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    // Determine error type
    let errorMessage: string;
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        errorMessage = `Request timeout after ${REQUEST_TIMEOUT}ms`;
      } else {
        errorMessage = err.message;
      }
    } else {
      errorMessage = "Unknown error";
    }

    return {
      componentId: config.id,
      componentName: config.name,
      status: ComponentStatus.MAJOR_OUTAGE,
      latencyMs,
      httpStatus: null,
      error: errorMessage,
      timestamp,
    };
  }
}

/**
 * Evaluate a deep health check (JSON response)
 */
async function evaluateDeepCheck(
  config: ComponentConfig,
  response: Response,
  latencyMs: number,
  timestamp: string,
): Promise<HealthCheckResult> {
  // Non-2xx status = outage
  if (!response.ok) {
    return {
      componentId: config.id,
      componentName: config.name,
      status:
        response.status >= 500
          ? ComponentStatus.MAJOR_OUTAGE
          : ComponentStatus.PARTIAL_OUTAGE,
      latencyMs,
      httpStatus: response.status,
      error: `HTTP ${response.status}`,
      timestamp,
    };
  }

  try {
    const data = (await response.json()) as Record<string, unknown> | null;

    // Validate response shape
    if (!data || typeof data.status !== "string") {
      return {
        componentId: config.id,
        componentName: config.name,
        status: ComponentStatus.DEGRADED,
        latencyMs,
        httpStatus: response.status,
        error: "Invalid health response format",
        timestamp,
      };
    }

    // Map service-reported status to component status
    if (data.status === "unhealthy") {
      return {
        componentId: config.id,
        componentName: config.name,
        status: ComponentStatus.MAJOR_OUTAGE,
        latencyMs,
        httpStatus: response.status,
        error: "Service reports unhealthy",
        timestamp,
      };
    }

    if (data.status === "degraded") {
      return {
        componentId: config.id,
        componentName: config.name,
        status: ComponentStatus.DEGRADED,
        latencyMs,
        httpStatus: response.status,
        error: "Service reports degraded",
        timestamp,
      };
    }

    if (data.status === "maintenance") {
      return {
        componentId: config.id,
        componentName: config.name,
        status: ComponentStatus.MAINTENANCE,
        latencyMs,
        httpStatus: response.status,
        error: null,
        timestamp,
      };
    }

    // Service is healthy — latency can only downgrade to "degraded" at most.
    // A healthy service with slow transport is a performance issue, not an outage.
    const latencyResult = classifyByLatency(
      config,
      latencyMs,
      response.status,
      timestamp,
    );
    if (latencyResult.status === ComponentStatus.PARTIAL_OUTAGE) {
      latencyResult.status = ComponentStatus.DEGRADED;
    }
    return latencyResult;
  } catch {
    // JSON parse error - treat as degraded (service up but malformed response)
    return {
      componentId: config.id,
      componentName: config.name,
      status: ComponentStatus.DEGRADED,
      latencyMs,
      httpStatus: response.status,
      error: "Invalid JSON response",
      timestamp,
    };
  }
}

/**
 * Evaluate a shallow health check (HTTP status only)
 */
function evaluateShallowCheck(
  config: ComponentConfig,
  httpStatus: number,
  latencyMs: number,
  timestamp: string,
): HealthCheckResult {
  // Non-2xx status = outage
  if (httpStatus < 200 || httpStatus >= 300) {
    return {
      componentId: config.id,
      componentName: config.name,
      status:
        httpStatus >= 500
          ? ComponentStatus.MAJOR_OUTAGE
          : ComponentStatus.PARTIAL_OUTAGE,
      latencyMs,
      httpStatus,
      error: `HTTP ${httpStatus}`,
      timestamp,
    };
  }

  // Success - classify by latency
  return classifyByLatency(config, latencyMs, httpStatus, timestamp);
}

/**
 * Classify status based on response latency
 */
function classifyByLatency(
  config: ComponentConfig,
  latencyMs: number,
  httpStatus: number,
  timestamp: string,
): HealthCheckResult {
  let status: HealthCheckResult["status"] = ComponentStatus.OPERATIONAL;

  if (latencyMs >= LATENCY_THRESHOLDS.SLOW) {
    status = ComponentStatus.PARTIAL_OUTAGE;
  } else if (latencyMs >= LATENCY_THRESHOLDS.OPERATIONAL) {
    status = ComponentStatus.DEGRADED;
  }

  return {
    componentId: config.id,
    componentName: config.name,
    status,
    latencyMs,
    httpStatus,
    error: null,
    timestamp,
  };
}

/**
 * Check all components in parallel
 */
export async function checkAllComponents(
  components: ComponentConfig[],
): Promise<HealthCheckResult[]> {
  return Promise.all(components.map(checkComponent));
}
