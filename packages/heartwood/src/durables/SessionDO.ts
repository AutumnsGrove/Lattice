/**
 * SessionDO - Durable Object for User Session Management
 *
 * Each user gets their own SessionDO instance (id: session:{userId})
 * Sessions are stored in SQLite for persistence and atomic operations.
 */

import { DurableObject } from "cloudflare:workers";

export interface Session {
  id: string;
  deviceId: string;
  deviceName: string;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface CreateSessionParams {
  deviceId: string;
  deviceName: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresInSeconds: number;
}

interface SessionDOEnv {
  DB: D1Database;
  SESSION_SECRET: string;
}

// Maximum sessions per user to prevent session exhaustion attacks
const MAX_SESSIONS_PER_USER = 10;

export class SessionDO extends DurableObject<SessionDOEnv> {
  private initialized = false;

  constructor(ctx: DurableObjectState, env: SessionDOEnv) {
    super(ctx, env);
  }

  /**
   * Initialize SQLite tables on first access
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create sessions table
    await this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        device_name TEXT,
        created_at INTEGER NOT NULL,
        last_active_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        ip_address TEXT,
        user_agent TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_expires
        ON sessions(expires_at);

      CREATE INDEX IF NOT EXISTS idx_sessions_device
        ON sessions(device_id);
    `);

    // Create rate limits table for login attempt tracking
    await this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        window_start INTEGER NOT NULL
      );
    `);

    this.initialized = true;
  }

  /**
   * Create a new session for this user
   * Enforces session limit by revoking oldest session if at capacity
   */
  async createSession(
    params: CreateSessionParams,
  ): Promise<{ sessionId: string }> {
    await this.initialize();

    const now = Date.now();

    // Check session limit and revoke oldest if at capacity
    const sessionCount = await this.getSessionCount();
    if (sessionCount >= MAX_SESSIONS_PER_USER) {
      // Find and revoke the oldest session
      const oldest = await this.ctx.storage.sql
        .exec(
          `SELECT id FROM sessions WHERE expires_at > ? ORDER BY created_at ASC LIMIT 1`,
          now,
        )
        .toArray();

      if (oldest.length > 0) {
        const oldestId = oldest[0].id as string;
        await this.revokeSession(oldestId);
        console.log(
          `[SessionDO] Revoked oldest session ${oldestId} due to session limit`,
        );
      }
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = now + params.expiresInSeconds * 1000;

    await this.ctx.storage.sql.exec(
      `INSERT INTO sessions (id, device_id, device_name, created_at, last_active_at, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      sessionId,
      params.deviceId,
      params.deviceName,
      now,
      now,
      expiresAt,
      params.ipAddress,
      params.userAgent,
    );

    // Schedule cleanup alarm for expired sessions
    await this.scheduleCleanup();

    console.log(
      `[SessionDO] Created session ${sessionId} for device ${params.deviceId}`,
    );

    return { sessionId };
  }

  /**
   * Validate a session and optionally update last active time
   */
  async validateSession(
    sessionId: string,
    updateLastActive = true,
  ): Promise<{ valid: boolean; session?: Session }> {
    await this.initialize();

    const now = Date.now();

    const result = await this.ctx.storage.sql
      .exec(
        `SELECT * FROM sessions WHERE id = ? AND expires_at > ?`,
        sessionId,
        now,
      )
      .toArray();

    if (result.length === 0) {
      return { valid: false };
    }

    const row = result[0];
    const session: Session = {
      id: row.id as string,
      deviceId: row.device_id as string,
      deviceName: row.device_name as string,
      createdAt: row.created_at as number,
      lastActiveAt: row.last_active_at as number,
      expiresAt: row.expires_at as number,
      ipAddress: row.ip_address as string | null,
      userAgent: row.user_agent as string | null,
    };

    // Throttle lastActiveAt updates to once per minute to reduce writes
    if (updateLastActive && now - session.lastActiveAt > 60_000) {
      await this.ctx.storage.sql.exec(
        `UPDATE sessions SET last_active_at = ? WHERE id = ?`,
        now,
        sessionId,
      );
      session.lastActiveAt = now;
    }

    return { valid: true, session };
  }

  /**
   * Revoke a specific session (logout from one device)
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    await this.initialize();

    const result = await this.ctx.storage.sql.exec(
      `DELETE FROM sessions WHERE id = ?`,
      sessionId,
    );

    console.log(`[SessionDO] Revoked session ${sessionId}`);

    return result.rowsWritten > 0;
  }

  /**
   * Revoke all sessions except optionally the current one (logout from all devices)
   */
  async revokeAllSessions(exceptSessionId?: string): Promise<number> {
    await this.initialize();

    let result;
    if (exceptSessionId) {
      result = await this.ctx.storage.sql.exec(
        `DELETE FROM sessions WHERE id != ?`,
        exceptSessionId,
      );
    } else {
      result = await this.ctx.storage.sql.exec(`DELETE FROM sessions`);
    }

    console.log(`[SessionDO] Revoked ${result.rowsWritten} sessions`);

    return result.rowsWritten;
  }

  /**
   * List all active sessions (for "manage devices" UI)
   */
  async listSessions(): Promise<Session[]> {
    await this.initialize();

    const now = Date.now();
    const rows = await this.ctx.storage.sql
      .exec(
        `SELECT * FROM sessions WHERE expires_at > ? ORDER BY last_active_at DESC`,
        now,
      )
      .toArray();

    return rows.map((row) => ({
      id: row.id as string,
      deviceId: row.device_id as string,
      deviceName: row.device_name as string,
      createdAt: row.created_at as number,
      lastActiveAt: row.last_active_at as number,
      expiresAt: row.expires_at as number,
      ipAddress: row.ip_address as string | null,
      userAgent: row.user_agent as string | null,
    }));
  }

  /**
   * Check rate limit for login attempts
   */
  async checkLoginRateLimit(): Promise<{
    allowed: boolean;
    remainingAttempts: number;
    resetAt: number | null;
  }> {
    await this.initialize();

    const MAX_ATTEMPTS = 5;
    const WINDOW_SECONDS = 300; // 5 minutes
    const LOCKOUT_SECONDS = 900; // 15 minutes

    const now = Date.now();
    const windowStart = now - WINDOW_SECONDS * 1000;

    // Get current rate limit state
    const result = await this.ctx.storage.sql
      .exec(`SELECT count, window_start FROM rate_limits WHERE key = 'login'`)
      .toArray();

    let count = 0;
    let currentWindowStart = now;

    if (result.length > 0) {
      const row = result[0];
      if ((row.window_start as number) > windowStart) {
        // Still in current window
        count = row.count as number;
        currentWindowStart = row.window_start as number;
      }
      // Else: window expired, reset
    }

    if (count >= MAX_ATTEMPTS) {
      const resetAt = currentWindowStart + LOCKOUT_SECONDS * 1000;
      if (now < resetAt) {
        return {
          allowed: false,
          remainingAttempts: 0,
          resetAt,
        };
      }
      // Lockout expired, reset
      count = 0;
      currentWindowStart = now;
    }

    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS - count,
      resetAt: null,
    };
  }

  /**
   * Record a login attempt (success or failure)
   */
  async recordLoginAttempt(success: boolean): Promise<void> {
    await this.initialize();

    if (success) {
      // Reset on successful login
      await this.ctx.storage.sql.exec(
        `DELETE FROM rate_limits WHERE key = 'login'`,
      );
    } else {
      // Increment failure count
      const now = Date.now();
      await this.ctx.storage.sql.exec(
        `INSERT INTO rate_limits (key, count, window_start) VALUES ('login', 1, ?)
         ON CONFLICT(key) DO UPDATE SET count = count + 1`,
        now,
      );
    }
  }

  /**
   * Extend a session's expiration time
   */
  async extendSession(
    sessionId: string,
    additionalSeconds: number,
  ): Promise<boolean> {
    await this.initialize();

    const now = Date.now();
    const result = await this.ctx.storage.sql.exec(
      `UPDATE sessions SET expires_at = expires_at + ? WHERE id = ? AND expires_at > ?`,
      additionalSeconds * 1000,
      sessionId,
      now,
    );

    if (result.rowsWritten > 0) {
      await this.scheduleCleanup();
      return true;
    }

    return false;
  }

  /**
   * Get session count for this user
   */
  async getSessionCount(): Promise<number> {
    await this.initialize();

    const now = Date.now();
    const result = await this.ctx.storage.sql
      .exec(`SELECT COUNT(*) as count FROM sessions WHERE expires_at > ?`, now)
      .toArray();

    return (result[0]?.count as number) || 0;
  }

  /**
   * Schedule cleanup alarm for expired sessions
   */
  private async scheduleCleanup(): Promise<void> {
    const result = await this.ctx.storage.sql
      .exec(`SELECT MIN(expires_at) as earliest FROM sessions`)
      .toArray();

    if (result.length > 0 && result[0].earliest) {
      const earliest = result[0].earliest as number;
      // Schedule alarm slightly after expiration
      await this.ctx.storage.setAlarm(earliest + 1000);
    }
  }

  /**
   * Alarm handler - clean up expired sessions
   */
  async alarm(): Promise<void> {
    await this.initialize();

    const now = Date.now();

    // Delete expired sessions
    const result = await this.ctx.storage.sql.exec(
      `DELETE FROM sessions WHERE expires_at < ?`,
      now,
    );

    console.log(
      `[SessionDO] Cleaned up ${result.rowsWritten} expired sessions`,
    );

    // Check if any sessions remain
    const remaining = await this.ctx.storage.sql
      .exec(`SELECT COUNT(*) as count FROM sessions`)
      .toArray();

    if ((remaining[0].count as number) === 0) {
      // No sessions left - clean up rate limits too
      console.log(`[SessionDO] No sessions remaining, clearing rate limits`);
      await this.ctx.storage.sql.exec(`DELETE FROM rate_limits`);
      // The DO will hibernate and eventually be garbage collected
    } else {
      // Schedule next cleanup
      await this.scheduleCleanup();
    }
  }
}
