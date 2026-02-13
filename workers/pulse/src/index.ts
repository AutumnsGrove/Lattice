/**
 * Grove Pulse Worker
 *
 * Webhook receiver for live development heartbeat data from GitHub.
 *
 * Endpoints:
 *   POST /webhook/{tenant_id}  — Receive GitHub webhook events
 *   GET  /                     — Health check
 *   GET  /health               — Detailed health check
 *
 * Cron triggers:
 *   Hourly — Roll up hourly_activity from events
 *   Daily  — Finalize daily_stats and update streaks
 */

import type { Env, PulseConfigRow } from "./types";
import { verifySignature } from "./verify";
import { normalizeEvent } from "./normalize";
import { storeEvent } from "./store";
import { runHourlyAggregation, runDailyAggregation } from "./aggregate";

// SecretsManager for reading webhook secrets (envelope encryption)
// Simplified read-only version for the worker
class WorkerSecretsManager {
  private db: D1Database;
  private kekHex: string;
  private dekCache = new Map<string, CryptoKey>();

  constructor(db: D1Database, kekHex: string) {
    this.db = db;
    this.kekHex = kekHex;
  }

  async getSecret(tenantId: string, keyName: string): Promise<string | null> {
    const row = await this.db
      .prepare(
        `SELECT encrypted_value FROM tenant_secrets
         WHERE tenant_id = ? AND key_name = ?`,
      )
      .bind(tenantId, keyName)
      .first<{ encrypted_value: string }>();

    if (!row) return null;

    const dek = await this.getTenantDEK(tenantId);
    if (!dek) return null;

    return this.decrypt(row.encrypted_value, dek);
  }

  private async getTenantDEK(tenantId: string): Promise<CryptoKey | null> {
    if (this.dekCache.has(tenantId)) return this.dekCache.get(tenantId)!;

    const row = await this.db
      .prepare(`SELECT encrypted_dek FROM tenants WHERE id = ?`)
      .bind(tenantId)
      .first<{ encrypted_dek: string | null }>();

    if (!row?.encrypted_dek) return null;

    const kek = await this.importKEK();
    const dekHex = await this.decrypt(row.encrypted_dek, kek);
    if (!dekHex) return null;

    const dekBytes = hexToBytes(dekHex);
    const dek = await crypto.subtle.importKey(
      "raw",
      dekBytes,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );

    this.dekCache.set(tenantId, dek);
    return dek;
  }

  private async importKEK(): Promise<CryptoKey> {
    const bytes = hexToBytes(this.kekHex);
    return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, [
      "decrypt",
    ]);
  }

  private async decrypt(
    encryptedValue: string,
    key: CryptoKey,
  ): Promise<string | null> {
    try {
      const parts = encryptedValue.split(":");
      if (parts.length !== 2) return null;

      const iv = hexToBytes(parts[0]);
      const ciphertext = hexToBytes(parts[1]);

      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext,
      );

      return new TextDecoder().decode(plaintext);
    } catch {
      return null;
    }
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export default {
  /**
   * HTTP handler — webhook receiver and health checks.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (
      request.method === "GET" &&
      (url.pathname === "/" || url.pathname === "/health")
    ) {
      return Response.json({
        worker: "grove-pulse",
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    }

    // Webhook endpoint: POST /webhook/{tenant_id}
    if (request.method === "POST" && url.pathname.startsWith("/webhook/")) {
      // Enforce payload size limit (512KB — GitHub max is ~25MB but we don't need that)
      const contentLength = parseInt(
        request.headers.get("Content-Length") ?? "0",
      );
      if (contentLength > 524288) {
        return Response.json({ error: "Payload too large" }, { status: 413 });
      }

      return handleWebhook(request, env, url);
    }

    return new Response("Not Found", { status: 404 });
  },

  /**
   * Cron trigger handler.
   */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const cronPattern = controller.cron;

    if (cronPattern === "0 * * * *") {
      // Hourly
      await runHourlyAggregation(env);
    } else if (cronPattern === "5 0 * * *") {
      // Daily at 00:05 UTC
      await runDailyAggregation(env);
    }
  },
};

async function handleWebhook(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  // Extract and validate tenant_id from URL (alphanumeric, hyphens, underscores only)
  const tenantId = url.pathname.replace("/webhook/", "").split("/")[0];
  if (!tenantId || !/^[a-zA-Z0-9_-]{1,128}$/.test(tenantId)) {
    return Response.json(
      { error: "Invalid or missing tenant_id" },
      { status: 400 },
    );
  }

  // Get tenant config — verify enabled
  const config = await env.DB.prepare(
    `SELECT tenant_id, enabled, repos_include, repos_exclude, timezone, feed_max_items
     FROM pulse_curio_config WHERE tenant_id = ? AND enabled = 1`,
  )
    .bind(tenantId)
    .first<PulseConfigRow>();

  if (!config) {
    return Response.json(
      { error: "Pulse not enabled for this tenant" },
      { status: 404 },
    );
  }

  // Read the raw body for signature verification
  const body = await request.text();

  // Get webhook secret from SecretsManager
  if (!env.GROVE_KEK) {
    console.error("[Pulse] GROVE_KEK not configured");
    return Response.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const secrets = new WorkerSecretsManager(env.DB, env.GROVE_KEK);
  const webhookSecret = await secrets.getSecret(
    tenantId,
    "pulse_webhook_secret",
  );

  if (!webhookSecret || webhookSecret.length < 32) {
    console.error(
      `[Pulse] Missing or weak webhook secret for tenant ${tenantId}`,
    );
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Verify GitHub signature
  const signature = request.headers.get("X-Hub-Signature-256");
  const valid = await verifySignature(body, signature, webhookSecret);

  if (!valid) {
    console.warn(`[Pulse] Invalid signature for tenant ${tenantId}`);
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse the event
  const eventType = request.headers.get("X-GitHub-Event");
  const deliveryId = request.headers.get("X-GitHub-Delivery");

  if (!eventType) {
    return Response.json(
      { error: "Missing X-GitHub-Event header" },
      { status: 400 },
    );
  }

  // Handle ping events (GitHub sends this on webhook creation)
  if (eventType === "ping") {
    try {
      return Response.json({ message: "pong", zen: JSON.parse(body)?.zen });
    } catch {
      return Response.json({ message: "pong" });
    }
  }

  // Parse payload
  let payload: Record<string, any>;
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Repo filtering (with safe JSON parsing of stored config)
  const repoName = payload.repository?.name;
  if (repoName && config.repos_include) {
    try {
      const include = JSON.parse(config.repos_include) as string[];
      if (include.length > 0 && !include.includes(repoName)) {
        return Response.json({ message: "Repo filtered out (include list)" });
      }
    } catch {
      // Malformed stored JSON — skip filtering rather than reject events
    }
  }
  if (repoName && config.repos_exclude) {
    try {
      const exclude = JSON.parse(config.repos_exclude) as string[];
      if (exclude.includes(repoName)) {
        return Response.json({ message: "Repo filtered out (exclude list)" });
      }
    } catch {
      // Malformed stored JSON — skip filtering
    }
  }

  // Normalize the event
  const normalized = normalizeEvent(eventType, payload);
  if (!normalized) {
    return Response.json({ message: "Event type/action not tracked" });
  }

  // Store the event
  await storeEvent(env, tenantId, deliveryId, normalized);

  return Response.json({
    message: "Event processed",
    eventType: normalized.eventType,
    action: normalized.action,
    repo: normalized.repoName,
  });
}
