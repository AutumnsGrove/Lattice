/**
 * D1 Session Helpers for Read Replication
 *
 * Sessions ensure sequential consistency across queries within a request.
 * Without sessions, all queries hit the primary database even with replication enabled.
 *
 * @see https://developers.cloudflare.com/d1/best-practices/read-replication/
 */

import type { Env } from "../types.js";

/**
 * Create a D1 session for the current request.
 * Uses 'first-unconstrained' by default for lowest latency.
 * Sessions ensure sequential consistency across queries.
 */
export function createDbSession(
  env: Env,
): ReturnType<D1Database["withSession"]> {
  return env.DB.withSession();
}

/**
 * Create a D1 session that routes first query to primary.
 * Use this when you absolutely need the latest data.
 */
export function createDbSessionPrimary(
  env: Env,
): ReturnType<D1Database["withSession"]> {
  return env.DB.withSession("first-primary");
}
