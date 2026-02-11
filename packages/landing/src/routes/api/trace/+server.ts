/**
 * Trace Feedback API (Landing)
 *
 * This route proxies to the same trace_feedback table used by engine.
 * Imports utilities from the engine package to avoid duplication.
 */

import { json, error } from "@sveltejs/kit";
import {
  validateTracePath,
  sanitizeObject,
} from "@autumnsgrove/groveengine/utils";
import { checkRateLimit, getClientIP } from "@autumnsgrove/groveengine/server";
import {
  generateId,
  sendTraceNotification,
} from "@autumnsgrove/groveengine/services";
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
 * Hash IP address with daily salt for privacy-preserving deduplication.
 */
async function hashIP(ip: string): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const saltedIP = `${ip}:${today}:trace-salt-v1`;

  const encoder = new TextEncoder();
  const data = encoder.encode(saltedIP);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex.substring(0, 32);
}

export const POST: RequestHandler = async ({ request, platform }) => {
  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  const db = platform.env.DB;
  const kv = platform.env.CACHE;

  // Get client IP for rate limiting
  const clientIP = getClientIP(request);

  // Rate limit by IP hash
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

    if (!input.sourcePath || typeof input.sourcePath !== "string") {
      throw error(400, "Missing required field: sourcePath");
    }

    if (!input.vote || !["up", "down"].includes(input.vote)) {
      throw error(400, "Invalid vote: must be 'up' or 'down'");
    }

    if (!validateTracePath(input.sourcePath)) {
      throw error(400, "Invalid sourcePath format");
    }

    // Validate and sanitize comment
    let comment: string | null = null;
    if (input.comment && typeof input.comment === "string") {
      const trimmed = input.comment.trim();
      if (trimmed.length > MAX_COMMENT_LENGTH) {
        throw error(
          400,
          `Comment too long (max ${MAX_COMMENT_LENGTH} characters)`,
        );
      }
      if (trimmed.length > 0) {
        comment = trimmed;
      }
    }

    // Generate ID and hash IP
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

    // Send email notification in background
    const zephyrApiKey = platform.env.ZEPHYR_API_KEY;
    const zephyrUrl = platform.env.ZEPHYR_URL;
    const adminEmails = platform.env.ADMIN_EMAILS;

    if (zephyrApiKey && adminEmails && platform.context) {
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
    console.error("[Trace API] Error:", err);
    throw error(500, "Failed to submit feedback");
  }
};
