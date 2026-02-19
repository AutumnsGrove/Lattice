/**
 * Broadcast Handler
 *
 * Orchestrates social cross-posting:
 * 1. Validate request
 * 2. Generate broadcast ID + idempotency key
 * 3. Check idempotency in D1
 * 4. Fan out to platform providers
 * 5. Collect results, determine success/partial/failed
 * 6. Log to D1 (fire-and-forget)
 * 7. Return BroadcastResponse
 *
 * Mirrors the send.ts handler pattern for emails.
 */

import type { Context } from "hono";
import type {
  Env,
  BroadcastRequest,
  BroadcastResponse,
  SocialDelivery,
  SocialPlatform,
} from "../types";
import { BlueskyProvider, getBlueskyCircuitStatus } from "../providers/bluesky";
import { prepareBlueskyContent } from "../adapters/content";
import { ZEPHYR_ERRORS, logZephyrError } from "../errors";

/** All platforms we know about (expand as we add Mastodon, DEV.to, etc.) */
const KNOWN_PLATFORMS: SocialPlatform[] = ["bluesky"];

/** Maximum content length in characters (well above 300 graphemes to allow for emoji) */
const MAX_CONTENT_LENGTH = 2000;

/** Maximum length for metadata string fields */
const MAX_METADATA_LENGTH = 256;

/**
 * Generate a broadcast ID with brd_ prefix
 */
function generateBroadcastId(): string {
  // Use crypto.randomUUID and take first 12 chars for a compact ID
  return `brd_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

/**
 * Generate a delivery ID with del_ prefix
 */
function generateDeliveryId(): string {
  return `del_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

/**
 * Generate a fallback idempotency key from content hash.
 * Catches accidental duplicates from retries/double-clicks.
 */
async function generateIdempotencyKey(
  content: string,
  platforms: string[],
): Promise<string> {
  const raw = `${content}:${platforms.sort().join(",")}`;
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  const hashArray = Array.from(new Uint8Array(buffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `idem_${hashHex.slice(0, 32)}`;
}

/**
 * Resolve "all" to actual platform list, or validate specific platforms
 */
function resolvePlatforms(input: SocialPlatform[] | "all"): {
  platforms: SocialPlatform[];
  error?: string;
} {
  if (input === "all") {
    return { platforms: [...KNOWN_PLATFORMS] };
  }

  if (!Array.isArray(input) || input.length === 0) {
    return {
      platforms: [],
      error: 'platforms must be a non-empty array or "all"',
    };
  }

  const invalid = input.filter((p) => !KNOWN_PLATFORMS.includes(p));
  if (invalid.length > 0) {
    return { platforms: [], error: `Unknown platforms: ${invalid.join(", ")}` };
  }

  return { platforms: input };
}

// =============================================================================
// Broadcast Handler
// =============================================================================

export async function broadcastHandler(c: Context<{ Bindings: Env }>) {
  const startTime = Date.now();

  try {
    // Step 1: Parse + validate request
    const body = await c.req.json<BroadcastRequest>();

    if (!body.content || typeof body.content !== "string") {
      return c.json(
        {
          success: false,
          partial: false,
          deliveries: [],
          summary: { attempted: 0, succeeded: 0, failed: 0 },
          metadata: {
            broadcastId: "",
            latencyMs: Date.now() - startTime,
          },
          errorCode: ZEPHYR_ERRORS.BROADCAST_CONTENT_REQUIRED.code,
          errorMessage: "content is required and must be a string",
        },
        400,
      );
    }

    if (body.content.trim().length === 0) {
      return c.json(
        {
          success: false,
          partial: false,
          deliveries: [],
          summary: { attempted: 0, succeeded: 0, failed: 0 },
          metadata: {
            broadcastId: "",
            latencyMs: Date.now() - startTime,
          },
          errorCode: ZEPHYR_ERRORS.BROADCAST_CONTENT_REQUIRED.code,
          errorMessage: "content cannot be empty",
        },
        400,
      );
    }

    // Guard against oversized payloads
    if (body.content.length > MAX_CONTENT_LENGTH) {
      return c.json(
        {
          success: false,
          partial: false,
          deliveries: [],
          summary: { attempted: 0, succeeded: 0, failed: 0 },
          metadata: {
            broadcastId: "",
            latencyMs: Date.now() - startTime,
          },
          errorCode: ZEPHYR_ERRORS.BROADCAST_CONTENT_TOO_LONG.code,
          errorMessage: `content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
        },
        400,
      );
    }

    // Sanitize metadata field lengths
    if (body.metadata) {
      if (
        body.metadata.tenant &&
        body.metadata.tenant.length > MAX_METADATA_LENGTH
      ) {
        body.metadata.tenant = body.metadata.tenant.slice(
          0,
          MAX_METADATA_LENGTH,
        );
      }
      if (
        body.metadata.source &&
        body.metadata.source.length > MAX_METADATA_LENGTH
      ) {
        body.metadata.source = body.metadata.source.slice(
          0,
          MAX_METADATA_LENGTH,
        );
      }
      if (
        body.metadata.correlationId &&
        body.metadata.correlationId.length > MAX_METADATA_LENGTH
      ) {
        body.metadata.correlationId = body.metadata.correlationId.slice(
          0,
          MAX_METADATA_LENGTH,
        );
      }
    }

    const { platforms, error: platformError } = resolvePlatforms(
      body.platforms || "all",
    );

    if (platformError) {
      return c.json(
        {
          success: false,
          partial: false,
          deliveries: [],
          summary: { attempted: 0, succeeded: 0, failed: 0 },
          metadata: {
            broadcastId: "",
            latencyMs: Date.now() - startTime,
          },
          errorCode: ZEPHYR_ERRORS.BROADCAST_INVALID_PLATFORM.code,
          errorMessage: platformError,
        },
        400,
      );
    }

    // Step 2: Generate IDs
    const broadcastId = generateBroadcastId();
    const idempotencyKey =
      body.idempotencyKey ||
      (await generateIdempotencyKey(body.content, platforms));

    // Step 3: Check idempotency in D1
    try {
      const existing = await c.env.DB.prepare(
        "SELECT id, content, platforms, status FROM zephyr_broadcasts WHERE idempotency_key = ?",
      )
        .bind(idempotencyKey)
        .first<{
          id: string;
          content: string;
          platforms: string;
          status: string;
        }>();

      if (existing) {
        // Return cached result — fetch deliveries for full response
        const deliveries = await c.env.DB.prepare(
          "SELECT * FROM zephyr_social_deliveries WHERE broadcast_id = ?",
        )
          .bind(existing.id)
          .all<{
            platform: SocialPlatform;
            success: number;
            post_id: string | null;
            post_url: string | null;
            error_code: string | null;
            error_message: string | null;
          }>();

        const cachedDeliveries: SocialDelivery[] = (
          deliveries.results || []
        ).map((d) => ({
          success: !!d.success,
          platform: d.platform,
          postId: d.post_id || undefined,
          postUrl: d.post_url || undefined,
          error: d.error_code
            ? {
                code: d.error_code,
                message: d.error_message || "Unknown error",
                retryable: false,
              }
            : undefined,
        }));

        const succeeded = cachedDeliveries.filter((d) => d.success).length;
        const failed = cachedDeliveries.filter((d) => !d.success).length;

        return c.json({
          success: existing.status === "delivered",
          partial: existing.status === "partial",
          deliveries: cachedDeliveries,
          summary: {
            attempted: cachedDeliveries.length,
            succeeded,
            failed,
          },
          metadata: {
            broadcastId: existing.id,
            latencyMs: Date.now() - startTime,
          },
        } satisfies BroadcastResponse);
      }
    } catch (err) {
      // Idempotency check failed — proceed anyway (fail-open)
      logZephyrError(ZEPHYR_ERRORS.IDEMPOTENCY_CHECK_FAILED, { cause: err });
    }

    // Step 4: Fan out to platform providers
    const deliveries: SocialDelivery[] = [];

    for (const platform of platforms) {
      if (platform === "bluesky") {
        // Prepare content for Bluesky
        const content = prepareBlueskyContent(body.content);
        const provider = new BlueskyProvider(
          c.env.BLUESKY_HANDLE,
          c.env.BLUESKY_APP_PASSWORD,
        );

        const delivery = await provider.post(content);
        deliveries.push(delivery);
      }
    }

    // Step 5: Determine overall status
    const succeeded = deliveries.filter((d) => d.success).length;
    const failed = deliveries.filter((d) => !d.success && !d.skipped).length;
    const attempted = deliveries.filter((d) => !d.skipped).length;

    let status: "delivered" | "partial" | "failed";
    if (succeeded === attempted && attempted > 0) {
      status = "delivered";
    } else if (succeeded > 0) {
      status = "partial";
    } else {
      status = "failed";
    }

    const response: BroadcastResponse = {
      success: status === "delivered",
      partial: status === "partial",
      deliveries,
      summary: { attempted, succeeded, failed },
      metadata: {
        broadcastId,
        latencyMs: Date.now() - startTime,
      },
    };

    // Step 6: Log to D1 (fire-and-forget)
    c.executionCtx.waitUntil(
      logBroadcast(c.env.DB, {
        broadcastId,
        content: body.content,
        platforms,
        status,
        idempotencyKey,
        deliveries,
        metadata: body.metadata,
      }),
    );

    // Step 7: Return response
    const statusCode =
      status === "delivered" ? 200 : status === "partial" ? 207 : 502;
    return c.json(response, statusCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Log the full error server-side, but return a generic message to the caller
    logZephyrError(ZEPHYR_ERRORS.INTERNAL_ERROR, { cause: error });

    return c.json(
      {
        success: false,
        partial: false,
        deliveries: [],
        summary: { attempted: 0, succeeded: 0, failed: 0 },
        metadata: {
          broadcastId: "",
          latencyMs: Date.now() - startTime,
        },
        errorCode: ZEPHYR_ERRORS.INTERNAL_ERROR.code,
        errorMessage:
          "An internal error occurred while processing the broadcast",
      },
      500,
    );
  }
}

// =============================================================================
// Platforms Handler (GET /broadcast/platforms)
// =============================================================================

export async function platformsHandler(c: Context<{ Bindings: Env }>) {
  const hasBluesky = !!c.env.BLUESKY_HANDLE && !!c.env.BLUESKY_APP_PASSWORD;
  const blueskyCircuit = getBlueskyCircuitStatus();

  return c.json({
    platforms: [
      {
        id: "bluesky",
        name: "Bluesky",
        configured: hasBluesky,
        healthy: hasBluesky && !blueskyCircuit.open,
        circuitBreaker: {
          open: blueskyCircuit.open,
          failures: blueskyCircuit.failures,
        },
        limits: {
          maxGraphemes: 300,
        },
      },
      // Coming soon placeholders
      {
        id: "mastodon",
        name: "Mastodon",
        configured: false,
        healthy: false,
        comingSoon: true,
      },
      {
        id: "devto",
        name: "DEV.to",
        configured: false,
        healthy: false,
        comingSoon: true,
      },
    ],
  });
}

// =============================================================================
// D1 Logging (fire-and-forget)
// =============================================================================

async function logBroadcast(
  db: D1Database,
  data: {
    broadcastId: string;
    content: string;
    platforms: SocialPlatform[];
    status: string;
    idempotencyKey: string;
    deliveries: SocialDelivery[];
    metadata?: BroadcastRequest["metadata"];
  },
): Promise<void> {
  const now = Date.now();

  try {
    // Insert broadcast record
    await db
      .prepare(
        `INSERT INTO zephyr_broadcasts (
          id, content, platforms, status, tenant, source,
          correlation_id, idempotency_key, created_at, processed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        data.broadcastId,
        data.content,
        JSON.stringify(data.platforms),
        data.status,
        data.metadata?.tenant || null,
        data.metadata?.source || null,
        data.metadata?.correlationId || null,
        data.idempotencyKey,
        now,
        now,
      )
      .run();

    // Insert per-platform delivery records
    for (const delivery of data.deliveries) {
      await db
        .prepare(
          `INSERT INTO zephyr_social_deliveries (
            id, broadcast_id, platform, success, post_id, post_url,
            error_code, error_message, attempts, latency_ms, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          generateDeliveryId(),
          data.broadcastId,
          delivery.platform,
          delivery.success ? 1 : 0,
          delivery.postId || null,
          delivery.postUrl || null,
          delivery.error?.code || null,
          delivery.error?.message || null,
          1,
          null, // Per-platform latency not tracked individually yet
          now,
        )
        .run();
    }
  } catch (error) {
    // Log but don't fail — same pattern as email logging
    logZephyrError(ZEPHYR_ERRORS.LOG_WRITE_FAILED, { cause: error });
  }
}
