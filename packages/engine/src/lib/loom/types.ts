/**
 * Loom — Core Types
 *
 * Type definitions for the Durable Object framework.
 * All public interfaces live here for clean barrel exports.
 */

// ============================================================================
// Route Types
// ============================================================================

/** HTTP methods supported by the Loom router. */
export type LoomMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Parsed request context passed to route handlers. */
export interface LoomRequestContext {
  /** The original Request object. */
  request: Request;
  /** Parsed URL. */
  url: URL;
  /** HTTP method (uppercased). */
  method: LoomMethod;
  /** URL pathname. */
  path: string;
  /** Route params extracted from `:param` segments. */
  params: Record<string, string>;
  /** Parsed query string params. */
  query: URLSearchParams;
}

/** A route definition for the Loom router. */
export interface LoomRoute {
  /** HTTP method to match. */
  method: LoomMethod;
  /** Path pattern (e.g. "/content", "/drafts/:slug"). */
  path: string;
  /** Handler function that returns a Response. */
  handler: (ctx: LoomRequestContext) => Promise<Response> | Response;
}

// ============================================================================
// Storage Types
// ============================================================================

/** A key-value row stored in DO SQLite. */
export interface JsonStoreRow {
  key: string;
  value: string;
  updated_at: number;
}

// ============================================================================
// Logger Types
// ============================================================================

/** Log levels supported by LoomLogger. */
export type LoomLogLevel = "debug" | "info" | "warn" | "error";

/** Structured log entry emitted by LoomLogger. */
export interface LoomLogEntry {
  do: string;
  id: string;
  level: LoomLogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

// ============================================================================
// WebSocket Types
// ============================================================================

/** Parsed WebSocket message (text or binary). */
export interface LoomWebSocketMessage {
  /** The raw data as a string (text frames) or ArrayBuffer (binary). */
  data: string | ArrayBuffer;
  /** Parsed JSON if the message was valid JSON text, otherwise null. */
  json: unknown | null;
}

// ============================================================================
// Config Types
// ============================================================================

/** Configuration options for a LoomDO subclass. */
export interface LoomConfig {
  /** Human-readable DO name, used in logs and error context. */
  name: string;
  /**
   * Whether to use `blockConcurrencyWhile` for schema init.
   * Gen1 DOs (PostContent, PostMeta, Tenant) use this.
   * Gen2 DOs (Sentinel, Export, Triage) do lazy init instead.
   * @default true
   */
  blockOnInit?: boolean;
  /**
   * Whether to use hibernation-aware WebSocket API.
   * When true, WebSocketManager uses `state.acceptWebSocket()` instead
   * of `server.accept()`, enabling the DO to hibernate between messages.
   * @default false
   */
  hibernation?: boolean;
}
