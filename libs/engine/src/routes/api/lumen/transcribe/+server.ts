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
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { getTenantSubscription } from "$lib/server/billing.js";
import { validateEnv } from "$lib/server/env-validation.js";
import { createLumenClient } from "$lib/lumen/client.js";
import type { ScribeMode } from "$lib/lumen/types.js";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";

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
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  // Tenant check (CRITICAL for security)
  if (!locals.tenantId) {
    throwGroveError(403, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  // Rate limit transcriptions (expensive AI operation)
  const threshold = createThreshold(platform?.env, {
    identifier: locals.user?.id,
  });
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: `ai/transcribe:${locals.user.id}`,
      limit: 20,
      windowSeconds: 86400, // 24 hours
      failMode: "closed",
    });
    if (denied) return denied;
  }

  // Validate required environment variables
  const envValidation = validateEnv(platform?.env, [
    "DB",
    "AI",
    "OPENROUTER_API_KEY",
  ]);
  if (!envValidation.valid) {
    console.error(`[Scribe] ${envValidation.message}`);
    throwGroveError(503, API_ERRORS.AI_SERVICE_NOT_CONFIGURED, "API");
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
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  if (!subscription.isActive) {
    throwGroveError(403, API_ERRORS.SUBSCRIPTION_REQUIRED, "API");
  }

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const mode = (formData.get("mode") as ScribeMode) || "raw";

    // Validate audio file
    if (!audioFile || !(audioFile instanceof File)) {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }

    // Validate file type
    if (!ALLOWED_AUDIO_TYPES.includes(audioFile.type)) {
      throwGroveError(400, API_ERRORS.INVALID_FILE, "API");
    }

    // Validate file size
    if (audioFile.size > MAX_AUDIO_SIZE) {
      throwGroveError(413, API_ERRORS.CONTENT_TOO_LARGE, "API");
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
        throwGroveError(429, API_ERRORS.USAGE_LIMIT_REACHED, "API");
      }

      // Transcription failed
      if (message.includes("Transcription failed")) {
        throwGroveError(400, API_ERRORS.INVALID_FILE, "API");
      }

      console.error("[Scribe] Transcription error:", err);
    }

    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
