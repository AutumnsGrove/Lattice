/**
 * Trace Feedback API
 *
 * POST /api/trace - Submit feedback (👍/👎) for any page
 *
 * Features:
 * - Privacy-preserving IP hashing with daily salt
 * - Rate limiting via KV (10 submissions per day per IP)
 * - Optional comment (max 500 chars)
 * - Email notification via waitUntil (non-blocking)
 */

import { json } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { validateTracePath } from "$lib/utils/trace-path.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import { generateId } from "$lib/server/services/database.js";
import {
  checkRateLimit,
  getClientIP,
} from "$lib/server/rate-limits/middleware.js";
import { sendTraceNotification } from "$lib/server/services/trace-email.js";
import { API_ERRORS, logGroveError } from "$lib/errors";
import type { RequestHandler } from "./$types.js";

interface TraceInput {
  sourcePath: string;
  vote: "up" | "down";
  comment?: string;
}

// Rate limit: 10 submissions per day per IP
const TRACE_RATE_LIMIT = 10;
const TRACE_RATE_WINDOW = 86400; // 24 hours in seconds
const MAX_COMMENT_LENGTH = 500;

/**
 * POST /api/trace - Submit feedback
 *
 * Body:
 * - sourcePath: string (required) - Where the feedback came from
 * - vote: 'up' | 'down' (required) - The feedback type
 * - comment: string (optional) - Additional feedback, max 500 chars
 *
 * Returns:
 * - { success: true, id: string } on success
 * - { error: string } on failure
 */
export const POST: RequestHandler = async ({ request, platform }) => {
  // Validate CSRF (origin-based)
  if (!validateCSRF(request)) {
    return json(
      {
        error: API_ERRORS.INVALID_ORIGIN.userMessage,
        error_code: API_ERRORS.INVALID_ORIGIN.code,
      },
      { status: 403 },
    );
  }

  if (!platform?.env?.DB) {
    return json(
      {
        error: API_ERRORS.DB_NOT_CONFIGURED.userMessage,
        error_code: API_ERRORS.DB_NOT_CONFIGURED.code,
      },
      { status: 500 },
    );
  }

  const db = platform.env.DB;
  const kv = platform.env.CACHE_KV;

  // Get client IP for rate limiting and privacy-preserving storage
  const clientIP = getClientIP(request);

  // Rate limit by IP hash (prevents spam while preserving privacy)
  if (kv) {
    const ipHash = await hashIP(clientIP);
    const { response } = await checkRateLimit({
      kv,
      key: `trace/submit:${ipHash}`,
      limit: TRACE_RATE_LIMIT,
      windowSeconds: TRACE_RATE_WINDOW,
      namespace: "trace-ratelimit",
    });

    if (response) return response;
  }

  try {
    // Parse and validate input
    const rawInput = await request.json();
    const input = sanitizeObject(rawInput) as TraceInput;

    // Validate required fields
    if (!input.sourcePath || typeof input.sourcePath !== "string") {
      return json(
        {
          error: API_ERRORS.MISSING_REQUIRED_FIELDS.userMessage,
          error_code: API_ERRORS.MISSING_REQUIRED_FIELDS.code,
        },
        { status: 400 },
      );
    }

    if (!input.vote || !["up", "down"].includes(input.vote)) {
      return json(
        {
          error: API_ERRORS.VALIDATION_FAILED.userMessage,
          error_code: API_ERRORS.VALIDATION_FAILED.code,
        },
        { status: 400 },
      );
    }

    // Validate sourcePath format
    if (!validateTracePath(input.sourcePath)) {
      return json(
        {
          error: API_ERRORS.VALIDATION_FAILED.userMessage,
          error_code: API_ERRORS.VALIDATION_FAILED.code,
        },
        { status: 400 },
      );
    }

    // Validate and sanitize comment
    let comment: string | null = null;
    if (input.comment && typeof input.comment === "string") {
      const trimmed = input.comment.trim();
      if (trimmed.length > MAX_COMMENT_LENGTH) {
        return json(
          {
            error: API_ERRORS.VALIDATION_FAILED.userMessage,
            error_code: API_ERRORS.VALIDATION_FAILED.code,
          },
          { status: 400 },
        );
      }
      if (trimmed.length > 0) {
        comment = trimmed;
      }
    }

    // Generate ID and hash IP with daily salt for privacy
    const id = generateId();
    const ipHash = await hashIP(clientIP);
    const userAgent = request.headers.get("user-agent") || null;
    const createdAt = Math.floor(Date.now() / 1000);

    // Insert into database
    await db
      .prepare(
        `INSERT INTO trace_feedback (id, source_path, vote, comment, ip_hash, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.sourcePath,
        input.vote,
        comment,
        ipHash,
        userAgent,
        createdAt,
      )
      .run();

    // Send email notification in background (non-blocking)
    const zephyrApiKey = platform.env.ZEPHYR_API_KEY;
    const zephyrUrl = platform.env.ZEPHYR_URL;
    const adminEmails = platform.env.ALLOWED_ADMIN_EMAILS;

    if (zephyrApiKey && adminEmails && platform.context) {
      // Get first admin email for notifications
      const adminEmail = adminEmails.split(",")[0]?.trim();

      if (adminEmail) {
        platform.context.waitUntil(
          sendTraceNotification(zephyrUrl, zephyrApiKey, adminEmail, {
            id,
            sourcePath: input.sourcePath,
            vote: input.vote,
            comment: comment || undefined,
          }).catch((err) => {
            console.error("[Trace API] Email notification failed:", err);
          }),
        );
      }
    }

    return json({ success: true, id });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    logGroveError("API", API_ERRORS.INTERNAL_ERROR, {
      detail: "Failed to submit trace feedback",
      cause: err,
    });
    return json(
      {
        error: API_ERRORS.INTERNAL_ERROR.userMessage,
        error_code: API_ERRORS.INTERNAL_ERROR.code,
      },
      { status: 500 },
    );
  }
};

/**
 * Hash IP address with daily salt for privacy-preserving deduplication.
 *
 * The salt changes daily, so:
 * - Same IP on same day = same hash (can detect duplicates)
 * - Same IP on different days = different hash (no long-term tracking)
 */
async function hashIP(ip: string): Promise<string> {
  // Create daily salt based on UTC date
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const saltedIP = `${ip}:${today}:trace-salt-v1`;

  // Hash with SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(saltedIP);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert to hex string (first 32 hex chars = 16 bytes, enough for deduplication)
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex.substring(0, 32);
}
