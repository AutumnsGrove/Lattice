/**
 * Pulse Worker — D1 Storage + KV Cache
 *
 * Writes normalized events to D1 and updates KV hot cache for fast reads.
 */

import type { Env, NormalizedEvent } from "./types";

/**
 * Store a normalized event in D1 and update KV caches.
 * Uses delivery_id for idempotency (duplicate webhook deliveries are ignored).
 */
export async function storeEvent(
  env: Env,
  tenantId: string,
  deliveryId: string | null,
  event: NormalizedEvent,
): Promise<void> {
  const eventId = crypto.randomUUID();

  // Write to D1
  await env.DB.prepare(
    `INSERT INTO pulse_events (
      id, tenant_id, delivery_id, event_type, action,
      repo_name, repo_full_name, actor, title, ref,
      data, occurred_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tenant_id, delivery_id) DO NOTHING`,
  )
    .bind(
      eventId,
      tenantId,
      deliveryId,
      event.eventType,
      event.action,
      event.repoName,
      event.repoFullName,
      event.actor,
      event.title,
      event.ref,
      JSON.stringify(event.data),
      event.occurredAt,
    )
    .run();

  // Update KV caches in parallel
  await Promise.all([
    updateLatestEvent(env, tenantId, event),
    updateTodayStats(env, tenantId, event),
    ...(event.eventType === "push"
      ? [
          updateActiveStatus(env, tenantId, event),
          updateLatestCommit(env, tenantId, event),
        ]
      : []),
    updateHourlyActivity(env, tenantId, event),
  ]);
}

async function updateLatestEvent(
  env: Env,
  tenantId: string,
  event: NormalizedEvent,
): Promise<void> {
  await env.KV.put(
    `pulse:${tenantId}:latest:event`,
    JSON.stringify({
      type: event.eventType,
      action: event.action,
      repo: event.repoName,
      title: event.title,
      time: event.occurredAt,
    }),
    { expirationTtl: 86400 },
  );
}

async function updateLatestCommit(
  env: Env,
  tenantId: string,
  event: NormalizedEvent,
): Promise<void> {
  await env.KV.put(
    `pulse:${tenantId}:latest:commit`,
    JSON.stringify({
      repo: event.repoName,
      message: event.title,
      author: event.actor,
      sha: (event.data as any)?.sha,
      time: event.occurredAt,
    }),
    { expirationTtl: 86400 },
  );
}

async function updateActiveStatus(
  env: Env,
  tenantId: string,
  event: NormalizedEvent,
): Promise<void> {
  await env.KV.put(
    `pulse:${tenantId}:active`,
    JSON.stringify({
      isActive: true,
      lastCommit: event.occurredAt,
      author: event.actor,
      message: event.title,
    }),
    { expirationTtl: 1800 }, // 30 minutes
  );
}

async function updateTodayStats(
  env: Env,
  tenantId: string,
  event: NormalizedEvent,
): Promise<void> {
  const key = `pulse:${tenantId}:today`;
  const existing = (await env.KV.get(key, "json")) as Record<
    string,
    number
  > | null;

  const today = existing ?? {
    commits: 0,
    prsMerged: 0,
    issuesClosed: 0,
    linesAdded: 0,
    linesRemoved: 0,
  };

  // Increment relevant counters
  if (event.eventType === "push") {
    today.commits += (event.data as any)?.commits ?? 1;
    today.linesAdded += (event.data as any)?.additions ?? 0;
    today.linesRemoved += (event.data as any)?.deletions ?? 0;
  } else if (event.eventType === "pull_request" && event.action === "merged") {
    today.prsMerged += 1;
  } else if (event.eventType === "issues" && event.action === "closed") {
    today.issuesClosed += 1;
  }

  await env.KV.put(key, JSON.stringify(today), { expirationTtl: 7200 }); // 2 hours
}

async function updateHourlyActivity(
  env: Env,
  tenantId: string,
  event: NormalizedEvent,
): Promise<void> {
  const eventDate = new Date(event.occurredAt * 1000);
  const dateStr = eventDate.toISOString().split("T")[0];
  const hour = eventDate.getUTCHours();

  const isCommit = event.eventType === "push" ? 1 : 0;

  await env.DB.prepare(
    `INSERT INTO pulse_hourly_activity (id, tenant_id, date, hour, commits, events)
     VALUES (?, ?, ?, ?, ?, 1)
     ON CONFLICT(tenant_id, date, hour) DO UPDATE SET
       commits = commits + ?,
       events = events + 1`,
  )
    .bind(crypto.randomUUID(), tenantId, dateStr, hour, isCommit, isCommit)
    .run();
}
