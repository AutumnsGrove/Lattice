/**
 * Server-side logging utility with in-memory circular buffers
 * Supports real-time log streaming to admin console
 */
// Circular buffer implementation
class CircularBuffer {
    maxSize;
    buffer;
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
        this.buffer = [];
    }
    push(item) {
        this.buffer.push(item);
        if (this.buffer.length > this.maxSize) {
            this.buffer.shift(); // Remove oldest item
        }
    }
    getAll() {
        return [...this.buffer]; // Return copy to prevent external mutations
    }
    getSince(timestamp) {
        return this.buffer.filter((log) => new Date(log.timestamp) > new Date(timestamp));
    }
    clear() {
        this.buffer = [];
    }
    get length() {
        return this.buffer.length;
    }
}
// Log buffers for each category (module-level, persists across requests in same worker)
const logBuffers = {
    api: new CircularBuffer(1000),
    github: new CircularBuffer(500),
    errors: new CircularBuffer(500),
    cache: new CircularBuffer(1000),
};
// Subscribers for SSE streaming
const subscribers = new Set();
/**
 * Create a log entry with consistent format
 */
function createLogEntry(level, category, message, metadata = {}) {
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
function broadcast(log) {
    subscribers.forEach((subscriber) => {
        try {
            subscriber(log);
        }
        catch (error) {
            console.error("[Logger] Failed to broadcast to subscriber:", error);
        }
    });
}
/**
 * Log API activity (requests, responses, timing)
 */
export function logAPI(endpoint, method, status, metadata = {}) {
    const level = status >= 500
        ? "error"
        : status >= 400
            ? "warn"
            : status >= 200
                ? "success"
                : "info";
    const log = createLogEntry(level, "api", `${method} ${endpoint} → ${status}`, {
        endpoint,
        method,
        status,
        ...metadata,
    });
    logBuffers.api.push(log);
    broadcast(log);
    // Also log to console in development
    if (metadata.duration) {
        console.log(`[API] ${method} ${endpoint} ${status} (${metadata.duration}ms)`);
    }
}
/**
 * Log GitHub API operations (rate limits, queries, errors)
 */
export function logGitHub(operation, metadata = {}) {
    const level = metadata.error ? "error" : metadata.warning ? "warn" : "info";
    const log = createLogEntry(level, "github", operation, metadata);
    logBuffers.github.push(log);
    broadcast(log);
    console.log(`[GitHub] ${operation}`, metadata.rateLimit
        ? `(${metadata.rateLimit.remaining}/${metadata.rateLimit.limit} remaining)`
        : "");
}
/**
 * Log errors (exceptions, failed operations, validation errors)
 */
export function logError(message, error = null, metadata = {}) {
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
export function logCache(operation, key, metadata = {}) {
    const level = metadata.error ? "error" : "info";
    const log = createLogEntry(level, "cache", `${operation.toUpperCase()} ${key}`, {
        operation,
        key,
        ...metadata,
    });
    logBuffers.cache.push(log);
    broadcast(log);
}
/**
 * Get logs from a specific category
 */
export function getLogs(category, since = null) {
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
export function getAllLogs(since = null) {
    const allLogs = [];
    for (const category of Object.keys(logBuffers)) {
        const logs = since
            ? logBuffers[category].getSince(since)
            : logBuffers[category].getAll();
        allLogs.push(...logs);
    }
    // Sort by timestamp (newest first)
    return allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
/**
 * Get log statistics
 */
export function getLogStats() {
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
export function subscribe(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
}
/**
 * Clear logs for a specific category or all categories
 */
export function clearLogs(category = null) {
    if (category && logBuffers[category]) {
        logBuffers[category].clear();
    }
    else if (!category) {
        Object.values(logBuffers).forEach((buffer) => buffer.clear());
    }
}
