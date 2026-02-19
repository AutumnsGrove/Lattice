/**
 * Abuse Tracking & Graduated Response System
 *
 * Tracks rate limit violations and implements graduated escalation:
 * - 1-2 violations: Warning (X-RateLimit-Warning header)
 * - 3-4 violations: Warning continues
 * - 5+ violations: 24-hour ban
 *
 * LIMITATIONS:
 * - Uses KV with read-modify-write pattern. Under high concurrency,
 *   violation counts may undercount slightly. This is acceptable for
 *   abuse tracking purposes.
 * - No shadow ban delays (would block Worker). Use warnings and bans only.
 *
 * @see docs/patterns/threshold-pattern.md
 */

// ============================================================================
// Types
// ============================================================================

export interface AbuseState {
  violations: number;
  lastViolation: number; // Unix timestamp
  bannedUntil: number | null; // Unix timestamp or null if not banned
}

export interface ViolationResult {
  warning: boolean;
  banned: boolean;
  bannedUntil: number | null;
}

// ============================================================================
// Constants
// ============================================================================

/** Violations decay after 24 hours */
const VIOLATION_DECAY_SECONDS = 86400;

/** Number of violations before a ban */
const BAN_THRESHOLD = 5;

/** Ban duration in seconds (24 hours) */
const BAN_DURATION_SECONDS = 86400;

// ============================================================================
// Abuse State Management
// ============================================================================

/**
 * Get abuse state for a user.
 * Returns fresh state if violations have decayed (>24h since last violation).
 *
 * @example
 * ```typescript
 * const state = await getAbuseState(kv, userId);
 * if (isBanned(state)) {
 *   return json({ error: 'Temporarily banned' }, { status: 403 });
 * }
 * ```
 */
export async function getAbuseState(
  kv: KVNamespace,
  userId: string,
): Promise<AbuseState> {
  const key = `abuse:${userId}`;

  try {
    const data = await kv.get<AbuseState>(key, "json");

    if (!data) {
      return { violations: 0, lastViolation: 0, bannedUntil: null };
    }

    const now = Math.floor(Date.now() / 1000);

    // Decay: reset violations if last violation was > 24h ago
    if (now - data.lastViolation > VIOLATION_DECAY_SECONDS) {
      return { violations: 0, lastViolation: 0, bannedUntil: null };
    }

    return data;
  } catch (error) {
    console.error("[abuse] Failed to get abuse state:", error);
    return { violations: 0, lastViolation: 0, bannedUntil: null };
  }
}

/**
 * Record a rate limit violation and escalate response if needed.
 *
 * Escalation:
 * - 1-4 violations: Warning (X-RateLimit-Warning header)
 * - 5+ violations: 24-hour ban
 *
 * @example
 * ```typescript
 * // When a rate limit is exceeded
 * const { warning, banned, bannedUntil } = await recordViolation(kv, userId);
 *
 * const headers = new Headers();
 * if (warning) {
 *   headers.set('X-RateLimit-Warning', 'true');
 * }
 * ```
 */
export async function recordViolation(
  kv: KVNamespace,
  userId: string,
): Promise<ViolationResult> {
  const state = await getAbuseState(kv, userId);
  const now = Math.floor(Date.now() / 1000);

  const newViolations = state.violations + 1;
  let bannedUntil: number | null = null;

  // Graduated response: ban on 5+ violations
  if (newViolations >= BAN_THRESHOLD) {
    bannedUntil = now + BAN_DURATION_SECONDS;
  }

  const newState: AbuseState = {
    violations: newViolations,
    lastViolation: now,
    bannedUntil,
  };

  try {
    await kv.put(`abuse:${userId}`, JSON.stringify(newState), {
      expirationTtl: VIOLATION_DECAY_SECONDS * 2,
    });
  } catch (error) {
    console.error("[abuse] Failed to record violation:", error);
  }

  // Log for monitoring/alerting
  console.warn(
    JSON.stringify({
      event: "rate_limit_violation",
      userId,
      violations: newViolations,
      banned: bannedUntil !== null,
      timestamp: new Date().toISOString(),
    }),
  );

  return {
    warning: newViolations < BAN_THRESHOLD,
    banned: bannedUntil !== null,
    bannedUntil,
  };
}

/**
 * Check if a user is currently banned.
 *
 * @example
 * ```typescript
 * const state = await getAbuseState(kv, userId);
 * if (isBanned(state)) {
 *   const remaining = getBanRemaining(state);
 *   return json({
 *     error: 'banned',
 *     retryAfter: remaining
 *   }, { status: 403 });
 * }
 * ```
 */
export function isBanned(state: AbuseState): boolean {
  if (!state.bannedUntil) return false;
  return Math.floor(Date.now() / 1000) < state.bannedUntil;
}

/**
 * Get remaining ban time in seconds, or 0 if not banned.
 */
export function getBanRemaining(state: AbuseState): number {
  if (!state.bannedUntil) return 0;
  const remaining = state.bannedUntil - Math.floor(Date.now() / 1000);
  return Math.max(0, remaining);
}

/**
 * Clear abuse state for a user (admin action).
 *
 * @example
 * ```typescript
 * // Admin endpoint to clear a user's ban
 * await clearAbuseState(kv, userId);
 * ```
 */
export async function clearAbuseState(
  kv: KVNamespace,
  userId: string,
): Promise<void> {
  try {
    await kv.delete(`abuse:${userId}`);
    console.warn(
      JSON.stringify({
        event: "abuse_state_cleared",
        userId,
        timestamp: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.error("[abuse] Failed to clear abuse state:", error);
  }
}
