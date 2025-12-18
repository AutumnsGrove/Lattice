/**
 * Server-side logging utility with in-memory circular buffers
 * Supports real-time log streaming to admin console
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
/**
 * Log API activity (requests, responses, timing)
 */
export declare function logAPI(endpoint: string, method: string, status: number, metadata?: APIMetadata): void;
/**
 * Log GitHub API operations (rate limits, queries, errors)
 */
export declare function logGitHub(operation: string, metadata?: GitHubMetadata): void;
/**
 * Log errors (exceptions, failed operations, validation errors)
 */
export declare function logError(message: string, error?: Error | null, metadata?: Record<string, unknown>): void;
/**
 * Log cache operations (KV get/set, hits/misses)
 */
export declare function logCache(operation: string, key: string, metadata?: CacheMetadata): void;
/**
 * Get logs from a specific category
 */
export declare function getLogs(category: LogCategory, since?: string | null): LogEntry[];
/**
 * Get all logs across all categories
 */
export declare function getAllLogs(since?: string | null): LogEntry[];
/**
 * Get log statistics
 */
export declare function getLogStats(): LogStats;
/**
 * Subscribe to log events (for SSE streaming)
 */
export declare function subscribe(callback: LogSubscriber): () => boolean;
/**
 * Clear logs for a specific category or all categories
 */
export declare function clearLogs(category?: LogCategory | null): void;
