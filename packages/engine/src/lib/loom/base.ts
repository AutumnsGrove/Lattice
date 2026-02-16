/**
 * Loom — Base Durable Object Class
 *
 * The heart of the SDK. Subclass LoomDO to get:
 * - Structured logging (this.log)
 * - Alarm scheduling with dedup (this.alarms)
 * - WebSocket management (this.sockets)
 * - Promise dedup locks (this.locks)
 * - SQL helpers (this.sql)
 * - JSON key-value store (this.store)
 * - Declarative route matching
 * - Consistent error responses
 *
 * Supports both Gen1 (blockConcurrencyWhile + SQL) and
 * Gen2 (lazy init + KV-style) patterns.
 *
 * @example
 * ```typescript
 * export class PostContentDO extends LoomDO<PostContent, ContentEnv> {
 *   config() { return { name: "PostContentDO" }; }
 *   schema() { return "CREATE TABLE IF NOT EXISTS content (...)"; }
 *   routes() {
 *     return [
 *       { method: "GET", path: "/content", handler: (ctx) => this.getContent(ctx) },
 *     ];
 *   }
 * }
 * ```
 */

/// <reference types="@cloudflare/workers-types" />

import type { LoomRoute, LoomConfig, LoomRequestContext } from "./types.js";
import { LoomLogger } from "./logger.js";
import { AlarmScheduler } from "./alarm.js";
import { WebSocketManager } from "./websocket.js";
import { PromiseLockMap } from "./lock.js";
import { SqlHelper, JsonStore } from "./storage.js";
import { matchRoute, buildRequestContext } from "./router.js";
import { LOOM_ERRORS, LoomResponse, logLoomError } from "./errors.js";

export abstract class LoomDO<
  TState = unknown,
  TEnv extends Record<string, unknown> = Record<string, unknown>,
> implements DurableObject {
  // ── Cloudflare DO lifecycle ──────────────────────────────────────────
  protected readonly state: DurableObjectState;
  protected readonly env: TEnv;

  // ── SDK utilities (available to subclasses) ──────────────────────────
  protected readonly log: LoomLogger;
  protected readonly alarms: AlarmScheduler;
  protected readonly sockets: WebSocketManager;
  protected readonly locks: PromiseLockMap;
  protected readonly sql: SqlHelper;
  protected readonly store: JsonStore;

  // ── State management ────────────────────────────────────────────────
  protected state_data: TState | null = null;
  private initialized = false;
  private dirty = false;
  private lastPersistAt = 0;

  // ── Cached config ───────────────────────────────────────────────────
  private readonly _config: LoomConfig;

  constructor(state: DurableObjectState, env: TEnv) {
    this.state = state;
    this.env = env;

    // Get config from subclass
    this._config = this.config();

    // Initialize utilities
    this.log = new LoomLogger(this._config.name, state.id.toString());
    this.alarms = new AlarmScheduler(state.storage, this.log);
    this.sockets = new WebSocketManager(state, this.log, {
      hibernation: this._config.hibernation,
    });
    this.locks = new PromiseLockMap();
    this.sql = new SqlHelper(state.storage.sql, this.log);
    this.store = new JsonStore(this.sql, this.log);

    // Schema init
    const blockOnInit = this._config.blockOnInit ?? true;
    if (blockOnInit) {
      state.blockConcurrencyWhile(async () => {
        await this.initialize();
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // Abstract methods — subclasses MUST implement
  // ════════════════════════════════════════════════════════════════════

  /** DO configuration (name, init strategy). */
  abstract config(): LoomConfig;

  /**
   * Route definitions. Return `[]` for RPC-only DOs.
   * Called once per request during fetch().
   */
  abstract routes(): LoomRoute[];

  // ════════════════════════════════════════════════════════════════════
  // Optional overrides — subclasses MAY implement
  // ════════════════════════════════════════════════════════════════════

  /**
   * SQL DDL to run during initialization.
   * Return null to skip SQL schema creation (e.g. for KV-style DOs).
   */
  protected schema(): string | null {
    return null;
  }

  /** Load initial state from storage. Called during initialization. */
  protected async loadState(): Promise<TState | null> {
    return null;
  }

  /** Handle alarm fires. Override to implement periodic tasks. */
  protected async onAlarm(): Promise<void> {
    // No-op by default
  }

  /** Handle incoming WebSocket messages. */
  protected async onWebSocketMessage(
    _ws: WebSocket,
    _message: string | ArrayBuffer,
  ): Promise<void> {
    // No-op by default
  }

  /** Handle WebSocket close events. */
  protected async onWebSocketClose(
    _ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    // No-op by default
  }

  /** Handle WebSocket errors. */
  protected async onWebSocketError(
    _ws: WebSocket,
    _error: unknown,
  ): Promise<void> {
    // No-op by default
  }

  // ════════════════════════════════════════════════════════════════════
  // Lifecycle — fetch, alarm, webSocket*
  // ════════════════════════════════════════════════════════════════════

  async fetch(request: Request): Promise<Response> {
    try {
      // Lazy init for Gen2 DOs (blockOnInit=false)
      if (!this.initialized) {
        await this.initialize();
      }

      const url = new URL(request.url);
      const method = request.method.toUpperCase();
      const routes = this.routes();

      const match = matchRoute(
        method as LoomRoute["method"],
        url.pathname,
        routes,
      );

      if (!match) {
        // Don't echo the raw path in the response — log it instead
        this.log.debug("Route not found", { method, path: url.pathname });
        return LoomResponse.notFound();
      }

      const ctx = buildRequestContext(request, match.params);
      return await match.route.handler(ctx);
    } catch (err) {
      logLoomError(LOOM_ERRORS.HANDLER_ERROR, {
        doName: this._config.name,
        doId: this.state.id.toString(),
        path: new URL(request.url).pathname,
        method: request.method,
        cause: err,
      });
      return LoomResponse.error(LOOM_ERRORS.HANDLER_ERROR);
    }
  }

  async alarm(): Promise<void> {
    try {
      await this.onAlarm();
    } catch (err) {
      logLoomError(LOOM_ERRORS.ALARM_HANDLER_ERROR, {
        doName: this._config.name,
        doId: this.state.id.toString(),
        cause: err,
      });
    }
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    try {
      await this.onWebSocketMessage(ws, message);
    } catch (err) {
      this.log.errorWithCause("WebSocket message handler error", err);
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ): Promise<void> {
    try {
      await this.onWebSocketClose(ws, code, reason, wasClean);
    } catch (err) {
      this.log.errorWithCause("WebSocket close handler error", err);
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    try {
      await this.onWebSocketError(ws, error);
    } catch (err) {
      this.log.errorWithCause("WebSocket error handler error", err);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // State management helpers
  // ════════════════════════════════════════════════════════════════════

  /** Mark state as dirty (needs persistence). */
  protected markDirty(): void {
    this.dirty = true;
  }

  /**
   * Persist state if dirty, with optional throttle.
   * @param minIntervalMs - Minimum ms between persists (default: 0 = always)
   */
  protected async persistIfDirty(minIntervalMs = 0): Promise<void> {
    if (!this.dirty) return;
    if (minIntervalMs > 0 && Date.now() - this.lastPersistAt < minIntervalMs) {
      return;
    }
    // Subclasses should override persistState() for custom persistence
    await this.persistState();
    this.dirty = false;
    this.lastPersistAt = Date.now();
  }

  /**
   * Override to implement custom persistence logic.
   * Called by persistIfDirty() when state is dirty.
   */
  protected async persistState(): Promise<void> {
    // Default: no-op. Subclasses that use markDirty() should override this.
  }

  // ════════════════════════════════════════════════════════════════════
  // Private initialization
  // ════════════════════════════════════════════════════════════════════

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Run schema DDL if provided
      const ddl = this.schema();
      if (ddl) {
        this.sql.exec(ddl);
      }

      // Create JSON store table (always available, even if unused)
      this.store.createTable();

      // Load initial state
      this.state_data = await this.loadState();

      this.initialized = true;
      this.log.debug("Initialized");
    } catch (err) {
      logLoomError(LOOM_ERRORS.INIT_FAILED, {
        doName: this._config.name,
        doId: this.state.id.toString(),
        cause: err,
      });
      throw err; // Re-throw — DO cannot function without init
    }
  }
}
