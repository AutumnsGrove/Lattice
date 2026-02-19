/**
 * Pulse Curio API — Public Events Endpoint
 *
 * GET /api/curios/pulse — Fetch pulse events and hot stats for display
 *
 * Query params:
 *   limit  — Max events (default 50, max 100)
 *   offset — Pagination offset (default 0)
 *   type   — Comma-separated event type filter
 *   since  — ISO date string to filter events after
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError } from "$lib/errors";
import { PULSE_EVENT_TYPES } from "$lib/curios/pulse";

interface EventRow {
  id: string;
  delivery_id: string | null;
  event_type: string;
  action: string | null;
  repo_name: string;
  repo_full_name: string;
  actor: string;
  title: string | null;
  ref: string | null;
  data: string | null;
  occurred_at: number;
}

export const GET: RequestHandler = async ({ url, platform, locals }) => {
  const db = platform?.env?.DB;
  const kv = platform?.env?.CACHE_KV;
  const tenantId = locals.tenantId;

  if (!db) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  if (!tenantId)
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");

  // Check enabled
  const config = await db
    .prepare(
      `SELECT enabled FROM pulse_curio_config WHERE tenant_id = ? AND enabled = 1`,
    )
    .bind(tenantId)
    .first<{ enabled: number }>();

  if (!config) {
    throwGroveError(404, API_ERRORS.FEATURE_DISABLED, "API");
  }

  // Parse and validate query params
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "50");
  const rawOffset = parseInt(url.searchParams.get("offset") ?? "0");
  const limit = Math.min(Math.max(isNaN(rawLimit) ? 50 : rawLimit, 1), 100);
  const offset = Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0);

  // Only allow known event types with format validation (defense-in-depth)
  const allowedTypes = new Set(PULSE_EVENT_TYPES as readonly string[]);
  const typeFilter = (
    url.searchParams.get("type")?.split(",").filter(Boolean) ?? []
  )
    .filter((t) => /^[a-z_]+$/.test(t) && allowedTypes.has(t))
    .slice(0, 10); // Cap at 10 filter types

  const sinceParam = url.searchParams.get("since");

  // Build query
  let query = `SELECT id, delivery_id, event_type, action, repo_name, repo_full_name,
                      actor, title, ref, data, occurred_at
               FROM pulse_events WHERE tenant_id = ?`;
  const bindings: (string | number)[] = [tenantId];

  if (typeFilter.length > 0) {
    query += ` AND event_type IN (${typeFilter.map(() => "?").join(",")})`;
    bindings.push(...typeFilter);
  }

  if (sinceParam) {
    const sinceTs = Math.floor(new Date(sinceParam).getTime() / 1000);
    if (!isNaN(sinceTs)) {
      query += ` AND occurred_at >= ?`;
      bindings.push(sinceTs);
    }
  }

  // Parallelize count + events queries (independent, ~100-300ms each)
  const countQuery = query.replace(
    /SELECT .+? FROM/,
    "SELECT COUNT(*) as total FROM",
  );
  const eventsQuery = `${query} ORDER BY occurred_at DESC LIMIT ? OFFSET ?`;
  const eventsBindings = [...bindings, limit, offset];

  const [countResult, eventsResult] = await Promise.all([
    db
      .prepare(countQuery)
      .bind(...bindings)
      .first<{ total: number }>()
      .catch((err) => {
        console.warn("[Pulse] Count query failed:", err);
        return null;
      }),
    db
      .prepare(eventsQuery)
      .bind(...eventsBindings)
      .all<EventRow>(),
  ]);
  const total = countResult?.total ?? 0;

  const events = eventsResult.results.map((row) => {
    let data: Record<string, unknown> = {};
    if (row.data) {
      try {
        data = JSON.parse(row.data);
      } catch {
        // Corrupted stored JSON — use empty object
      }
    }
    return {
      id: row.id,
      deliveryId: row.delivery_id,
      eventType: row.event_type,
      action: row.action,
      repoName: row.repo_name,
      repoFullName: row.repo_full_name,
      actor: row.actor,
      title: row.title,
      ref: row.ref,
      data,
      occurredAt: row.occurred_at,
    };
  });

  // Hot stats from KV
  let active = { isActive: false };
  let today = {
    commits: 0,
    prsMerged: 0,
    issuesClosed: 0,
    linesAdded: 0,
    linesRemoved: 0,
  };
  let streak = { days: 0, since: "" };

  if (kv) {
    const [activeData, todayData, streakData] = await Promise.all([
      kv.get(`pulse:${tenantId}:active`, "json").catch(() => null),
      kv.get(`pulse:${tenantId}:today`, "json").catch(() => null),
      kv.get(`pulse:${tenantId}:streak`, "json").catch(() => null),
    ]);
    if (activeData) active = activeData as typeof active;
    if (todayData) today = todayData as typeof today;
    if (streakData) streak = streakData as typeof streak;
  }

  return json(
    {
      events,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + events.length < total,
      },
      today,
      active,
      streak,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    },
  );
};
