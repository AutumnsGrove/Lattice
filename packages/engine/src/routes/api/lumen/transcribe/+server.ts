/**
 * Scribe Voice Transcription Endpoint
 *
 * POST /api/lumen/transcribe
 *
 * Accepts audio as multipart/form-data and returns transcription.
 * Supports two modes:
 * - "raw": Direct 1:1 transcription
 * - "draft": AI-structured with auto-generated Vines
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { getTenantSubscription } from "$lib/server/billing.js";
import { validateEnv } from "$lib/server/env-validation.js";
import { createLumenClient } from "$lib/lumen/client.js";
import type { ScribeMode } from "$lib/lumen/types.js";
import {
  checkRateLimit,
  buildRateLimitKey,
} from "$lib/server/rate-limits/middleware.js";

// Maximum audio file size (25MB as per plan)
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

// Allowed audio MIME types
const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/x-m4a",
  "audio/mp3",
];

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  // Authentication check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // Tenant check (CRITICAL for security)
  if (!locals.tenantId) {
    throw error(403, "Tenant context required");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  // Rate limit transcriptions (expensive AI operation)
  if (platform?.env?.CACHE_KV) {
    const { response } = await checkRateLimit({
      kv: platform.env.CACHE_KV,
      key: buildRateLimitKey("ai/transcribe", locals.user.id),
      limit: 20,
      windowSeconds: 86400, // 24 hours
      namespace: "ai-ratelimit",
      failClosed: true,
    });
    if (response) return response;
  }

  // Validate required environment variables
  const envValidation = validateEnv(platform?.env, [
    "DB",
    "AI",
    "OPENROUTER_API_KEY",
  ]);
  if (!envValidation.valid) {
    console.error(`[Scribe] ${envValidation.message}`);
    throw error(503, "Transcription service temporarily unavailable");
  }

  const db = platform!.env!.DB;
  const ai = platform!.env!.AI;
  const openrouterApiKey = platform!.env!.OPENROUTER_API_KEY as string;

  // Verify tenant ownership and get subscription in parallel
  // (Independent D1 queries should use Promise.all per AGENT.md)
  const [, subscription] = await Promise.all([
    getVerifiedTenantId(db, locals.tenantId, locals.user),
    getTenantSubscription(db, locals.tenantId),
  ]);

  if (!subscription) {
    throw error(404, "Tenant not found");
  }

  if (!subscription.isActive) {
    throw error(403, "Subscription inactive");
  }

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const mode = (formData.get("mode") as ScribeMode) || "raw";

    // Validate audio file
    if (!audioFile || !(audioFile instanceof File)) {
      throw error(400, "Audio file required");
    }

    // Validate file type
    if (!ALLOWED_AUDIO_TYPES.includes(audioFile.type)) {
      throw error(
        400,
        `Invalid audio type: ${audioFile.type}. Allowed: ${ALLOWED_AUDIO_TYPES.join(", ")}`,
      );
    }

    // Validate file size
    if (audioFile.size > MAX_AUDIO_SIZE) {
      throw error(
        400,
        `Audio file too large (${(audioFile.size / 1024 / 1024).toFixed(1)}MB). Maximum: 25MB`,
      );
    }

    // Convert to Uint8Array
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioData = new Uint8Array(arrayBuffer);

    // Create Lumen client
    const lumen = createLumenClient({
      openrouterApiKey,
      ai,
      db,
      enabled: true,
    });

    // Transcribe using raw mode (Draft mode handled in Phase 3)
    const result = await lumen.transcribe(
      {
        audio: audioData,
        tenant: locals.tenantId,
        options: {
          mode,
          skipPiiScrub: false,
          skipQuota: false,
        },
      },
      subscription.tier,
    );

    // Return transcription result
    return json({
      success: true,
      text: result.text,
      wordCount: result.wordCount,
      duration: result.duration,
      latency: result.latency,
      model: result.model,
      mode,
      // Draft mode fields (populated in Phase 3)
      ...(mode === "draft" && {
        gutterContent: result.gutterContent ?? [],
        rawTranscript: result.rawTranscript,
      }),
    });
  } catch (err) {
    // Re-throw SvelteKit errors
    if (err instanceof Error && "status" in err) {
      throw err;
    }

    // Handle Lumen-specific errors
    if (err instanceof Error) {
      const message = err.message;

      // Quota exceeded
      if (message.includes("quota") || message.includes("limit")) {
        throw error(429, "Daily transcription limit reached");
      }

      // Transcription failed
      if (message.includes("Transcription failed")) {
        throw error(
          422,
          "Couldn't understand the recording. Please try again.",
        );
      }

      console.error("[Scribe] Transcription error:", err);
    }

    throw error(500, "Transcription failed");
  }
};
