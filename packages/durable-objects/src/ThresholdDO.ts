/**
 * ThresholdDO — Per-Identifier Rate Limiting (Loom Pattern)
 *
 * Each ThresholdDO instance handles rate limiting for a single identifier
 * (userId, IP, tenantId). This eliminates shared-state contention —
 * one user = one DO = one SQLite database.
 *
 * ID pattern: threshold:{userId|ip|tenantId}
 *
 * HTTP interface:
 *   POST /check  → { key, limit, windowSeconds } → ThresholdResult
 *   GET  /health → { status, counters, uptime }
 *
 * Alarm: cleanup expired windows every 5 minutes.
 *
 * The DO always returns honest data — fail-mode handling (open/closed)
 * stays in the ThresholdDOStore layer, not here.
 */

// =============================================================================
// TYPES
// =============================================================================

interface ThresholdCheckRequest {
  key: string;
  limit: number;
  windowSeconds: number;
}

interface ThresholdResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// =============================================================================
// THRESHOLD DURABLE OBJECT
// =============================================================================

/** Alarm interval: 5 minutes in milliseconds */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export class ThresholdDO implements DurableObject {
  private state: DurableObjectState;
  private tableReady = false;
  private createdAt: number;

  constructor(state: DurableObjectState, _env: unknown) {
    this.state = state;
    this.createdAt = Date.now();
  }

  // =========================================================================
  // Table Setup (lazy, once per instantiation)
  // =========================================================================

  private ensureTable(): void {
    if (this.tableReady) return;

    this.state.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS rate_limits (
				key TEXT PRIMARY KEY,
				count INTEGER NOT NULL DEFAULT 0,
				window_start INTEGER NOT NULL,
				window_seconds INTEGER NOT NULL
			)
		`);

    this.tableReady = true;
  }

  // =========================================================================
  // HTTP Router
  // =========================================================================

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.method === "POST" && url.pathname === "/check") {
        return await this.handleCheck(request);
      }

      if (request.method === "GET" && url.pathname === "/health") {
        return this.handleHealth();
      }

      return Response.json({ error: "not_found" }, { status: 404 });
    } catch (error) {
      console.error("[ThresholdDO] Unhandled error:", error);
      return Response.json(
        { error: "internal_error", message: String(error) },
        { status: 500 },
      );
    }
  }

  // =========================================================================
  // POST /check — Atomic Rate Limit Check
  // =========================================================================

  private async handleCheck(request: Request): Promise<Response> {
    const body = (await request.json()) as ThresholdCheckRequest;

    if (!body.key || !body.limit || !body.windowSeconds) {
      return Response.json(
        {
          error: "bad_request",
          message: "Missing key, limit, or windowSeconds",
        },
        { status: 400 },
      );
    }

    this.ensureTable();

    const nowSeconds = Math.floor(Date.now() / 1000);

    // Single atomic INSERT ON CONFLICT RETURNING — same pattern as ThresholdD1Store
    // but running on local SQLite (zero network latency, single-writer guarantee).
    const row = this.state.storage.sql
      .exec(
        `INSERT INTO rate_limits (key, count, window_start, window_seconds)
				 VALUES (?, 1, ?, ?)
				 ON CONFLICT(key) DO UPDATE SET
				   count = CASE
				     WHEN window_start + window_seconds < ? THEN 1
				     ELSE count + 1
				   END,
				   window_start = CASE
				     WHEN window_start + window_seconds < ? THEN excluded.window_start
				     ELSE window_start
				   END,
				   window_seconds = excluded.window_seconds
				 RETURNING count, window_start, window_seconds`,
        body.key,
        nowSeconds,
        body.windowSeconds,
        nowSeconds,
        nowSeconds,
      )
      .one();

    const count = row.count as number;
    const windowStart = row.window_start as number;
    const windowSeconds = row.window_seconds as number;
    const resetAt = windowStart + windowSeconds;

    // Schedule cleanup alarm if not already set
    this.scheduleCleanup();

    const result: ThresholdResult =
      count > body.limit
        ? {
            allowed: false,
            remaining: 0,
            resetAt,
            retryAfter: Math.max(0, resetAt - nowSeconds),
          }
        : {
            allowed: true,
            remaining: body.limit - count,
            resetAt,
          };

    return Response.json(result);
  }

  // =========================================================================
  // GET /health — Diagnostics
  // =========================================================================

  private handleHealth(): Response {
    this.ensureTable();

    const row = this.state.storage.sql
      .exec(`SELECT COUNT(*) as total FROM rate_limits`)
      .one();

    return Response.json({
      status: "ok",
      counters: row.total as number,
      uptimeMs: Date.now() - this.createdAt,
    });
  }

  // =========================================================================
  // Alarm — Cleanup Expired Windows
  // =========================================================================

  async alarm(): Promise<void> {
    this.ensureTable();
    const nowSeconds = Math.floor(Date.now() / 1000);

    // Delete rows where the window has fully expired
    this.state.storage.sql.exec(
      `DELETE FROM rate_limits WHERE window_start + window_seconds < ?`,
      nowSeconds,
    );

    // Check if any rows remain — only reschedule if there's data to clean
    const remaining = this.state.storage.sql
      .exec(`SELECT COUNT(*) as total FROM rate_limits`)
      .one();

    if ((remaining.total as number) > 0) {
      this.scheduleCleanup();
    }
  }

  // =========================================================================
  // Alarm Scheduling
  // =========================================================================

  private scheduleCleanup(): void {
    // setAlarm is idempotent when an alarm is already pending —
    // calling it replaces any existing alarm, so we just always set it.
    this.state.storage.setAlarm(Date.now() + CLEANUP_INTERVAL_MS);
  }
}
