/**
 * Server-side logging utility with in-memory circular buffers
 * Supports real-time log streaming to admin console
 *
 * PII POLICY:
 * NEVER pass personally identifiable information (PII) to logging functions.
 * - DO NOT log: email addresses, names, IP addresses, payment details
 * - DO log: user IDs, GroveAuth subs, anonymized identifiers
 * - When debugging user issues, use user.id or userInfo.sub instead of email
 */

/** Log severity levels */
export type LogLevel = "info" | "warn" | "error" | "success";

/** Log categories */
export type LogCategory = "api" | "github" | "errors" | "cache";

/** Metadata for API logs */
export interface APIMetadata {
  endpoint?: string;
  method?: string;
  status?: number;
  duration?: number;
  [key: string]: unknown;
}

/** Metadata for GitHub logs */
export interface GitHubMetadata {
  error?: boolean;
  warning?: boolean;
  rateLimit?: {
    remaining: number;
    limit: number;
  };
  [key: string]: unknown;
}

/** Metadata for error logs */
export interface ErrorMetadata {
  error?: {
    message: string;
    stack?: string;
    name: string;
  } | null;
  [key: string]: unknown;
}

/** Metadata for cache logs */
export interface CacheMetadata {
  operation?: string;
  key?: string;
  error?: boolean;
  [key: string]: unknown;
}

/** Log entry structure */
export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  metadata: Record<string, unknown>;
}

/** Log statistics for a category */
export interface CategoryStats {
  total: number;
  recent: number;
}

/** Overall log statistics */
export interface LogStats {
  api: CategoryStats;
  github: CategoryStats;
  errors: CategoryStats;
  cache: CategoryStats;
}

/** Subscriber callback type */
export type LogSubscriber = (log: LogEntry) => void;

// Circular buffer implementation
class CircularBuffer<T extends { timestamp: string }> {
  private maxSize: number;
  private buffer: T[];

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    this.buffer = [];
  }

  push(item: T): void {
    this.buffer.push(item);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift(); // Remove oldest item
    }
  }

  getAll(): T[] {
    return [...this.buffer]; // Return copy to prevent external mutations
  }

  getSince(timestamp: string): T[] {
    return this.buffer.filter(
      (log) => new Date(log.timestamp) > new Date(timestamp)
    );
  }

  clear(): void {
    this.buffer = [];
  }

  get length(): number {
    return this.buffer.length;
  }
}

// Log buffers for each category (module-level, persists across requests in same worker)
const logBuffers: Record<LogCategory, CircularBuffer<LogEntry>> = {
  api: new CircularBuffer(1000),
  github: new CircularBuffer(500),
  errors: new CircularBuffer(500),
  cache: new CircularBuffer(1000),
};

// Subscribers for SSE streaming
const subscribers = new Set<LogSubscriber>();

/**
 * Create a log entry with consistent format
 */
function createLogEntry(
  level: LogLevel,
  category: LogCategory,
  message: string,
  metadata: Record<string, unknown> = {}
): LogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    metadata,
  };
}

/**
 * Broadcast log to all SSE subscribers
 */
function broadcast(log: LogEntry): void {
  subscribers.forEach((subscriber) => {
    try {
      subscriber(log);
    } catch (error) {
      console.error("[Logger] Failed to broadcast to subscriber:", error);
    }
  });
}

/**
 * Log API activity (requests, responses, timing)
 */
export function logAPI(
  endpoint: string,
  method: string,
  status: number,
  metadata: APIMetadata = {}
): void {
  const level: LogLevel =
    status >= 500
      ? "error"
      : status >= 400
        ? "warn"
        : status >= 200
          ? "success"
          : "info";
  const log = createLogEntry(
    level,
    "api",
    `${method} ${endpoint} → ${status}`,
    {
      endpoint,
      method,
      status,
      ...metadata,
    }
  );

  logBuffers.api.push(log);
  broadcast(log);

  // Also log to console in development
  if (metadata.duration) {
    console.log(
      `[API] ${method} ${endpoint} ${status} (${metadata.duration}ms)`
    );
  }
}

/**
 * Log GitHub API operations (rate limits, queries, errors)
 */
export function logGitHub(operation: string, metadata: GitHubMetadata = {}): void {
  const level: LogLevel = metadata.error ? "error" : metadata.warning ? "warn" : "info";
  const log = createLogEntry(level, "github", operation, metadata);

  logBuffers.github.push(log);
  broadcast(log);

  console.log(
    `[GitHub] ${operation}`,
    metadata.rateLimit
      ? `(${metadata.rateLimit.remaining}/${metadata.rateLimit.limit} remaining)`
      : ""
  );
}

/**
 * Log errors (exceptions, failed operations, validation errors)
 */
export function logError(
  message: string,
  error: Error | null = null,
  metadata: Record<string, unknown> = {}
): void {
  const log = createLogEntry("error", "errors", message, {
    error: error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      : null,
    ...metadata,
  });

  logBuffers.errors.push(log);
  broadcast(log);

  console.error(`[Error] ${message}`, error || "");
}

/**
 * Log cache operations (KV get/set, hits/misses)
 */
export function logCache(
  operation: string,
  key: string,
  metadata: CacheMetadata = {}
): void {
  const level: LogLevel = metadata.error ? "error" : "info";
  const log = createLogEntry(
    level,
    "cache",
    `${operation.toUpperCase()} ${key}`,
    {
      operation,
      key,
      ...metadata,
    }
  );

  logBuffers.cache.push(log);
  broadcast(log);
}

/**
 * Get logs from a specific category
 */
export function getLogs(category: LogCategory, since: string | null = null): LogEntry[] {
  if (!logBuffers[category]) {
    return [];
  }

  if (since) {
    return logBuffers[category].getSince(since);
  }

  return logBuffers[category].getAll();
}

/**
 * Get all logs across all categories
 */
export function getAllLogs(since: string | null = null): LogEntry[] {
  const allLogs: LogEntry[] = [];

  for (const category of Object.keys(logBuffers) as LogCategory[]) {
    const logs = since
      ? logBuffers[category].getSince(since)
      : logBuffers[category].getAll();
    allLogs.push(...logs);
  }

  // Sort by timestamp (newest first)
  return allLogs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Get log statistics
 */
export function getLogStats(): LogStats {
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

  return {
    api: {
      total: logBuffers.api.length,
      recent: logBuffers.api.getSince(oneMinuteAgo).length,
    },
    github: {
      total: logBuffers.github.length,
      recent: logBuffers.github.getSince(oneMinuteAgo).length,
    },
    errors: {
      total: logBuffers.errors.length,
      recent: logBuffers.errors.getSince(oneMinuteAgo).length,
    },
    cache: {
      total: logBuffers.cache.length,
      recent: logBuffers.cache.getSince(oneMinuteAgo).length,
    },
  };
}

/**
 * Subscribe to log events (for SSE streaming)
 */
export function subscribe(callback: LogSubscriber): () => boolean {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/**
 * Clear logs for a specific category or all categories
 */
export function clearLogs(category: LogCategory | null = null): void {
  if (category && logBuffers[category]) {
    logBuffers[category].clear();
  } else if (!category) {
    (Object.values(logBuffers) as CircularBuffer<LogEntry>[]).forEach((buffer) =>
      buffer.clear()
    );
  }
}
