/**
 * Sentinel API - List and Create Test Runs
 *
 * GET /api/sentinel - List all test runs for the tenant
 * POST /api/sentinel - Create and optionally start a new test run
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import {
  SentinelRunner,
  createSentinelRun,
  listSentinelRuns,
  createSpikeProfile,
  createSustainedProfile,
  createOscillationProfile,
  createRampProfile,
  createSmokeTestProfile,
  type LoadProfile,
  type TargetSystem,
  type R2Bucket as SentinelR2Bucket,
} from "$lib/sentinel/index.js";

/**
 * GET /api/sentinel
 * List sentinel runs for the current tenant
 */
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  // Require admin authentication
  if (!locals.user) {
    throw error(401, "Authentication required");
  }
  if (!locals.user.isAdmin) {
    throw error(403, "Admin access required");
  }

  const tenantId = locals.tenantId ?? "default";
  const db = platform.env.DB;

  // Parse query parameters
  const status = url.searchParams.get("status") as
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "cancelled"
    | null;
  const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  try {
    const runs = await listSentinelRuns(db, tenantId, {
      status: status ?? undefined,
      limit,
      offset,
    });

    return json({
      success: true,
      runs,
      count: runs.length,
    });
  } catch (err) {
    console.error("[Sentinel API] List error:", err);
    throw error(500, "Failed to list sentinel runs");
  }
};

/**
 * POST /api/sentinel
 * Create a new sentinel run
 *
 * Body:
 * - name: string (required)
 * - description?: string
 * - profileType: 'spike' | 'sustained' | 'oscillation' | 'ramp' | 'smoke' | 'custom'
 * - targetOperations?: number
 * - durationSeconds?: number
 * - concurrency?: number
 * - targetSystems?: TargetSystem[]
 * - startImmediately?: boolean (default: false)
 * - scheduledAt?: string (ISO date)
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (
    !platform?.env?.DB ||
    !platform?.env?.CACHE_KV ||
    !platform?.env?.IMAGES
  ) {
    throw error(500, "Required bindings not configured");
  }

  // Require admin authentication
  if (!locals.user) {
    throw error(401, "Authentication required");
  }
  if (!locals.user.isAdmin) {
    throw error(403, "Admin access required");
  }

  const tenantId = locals.tenantId ?? "default";
  const db = platform.env.DB;
  const kv = platform.env.CACHE_KV;
  const r2 = platform.env.IMAGES as unknown as SentinelR2Bucket;

  let body: {
    name: string;
    description?: string;
    profileType: string;
    targetOperations?: number;
    durationSeconds?: number;
    concurrency?: number;
    targetSystems?: TargetSystem[];
    startImmediately?: boolean;
    scheduledAt?: string;
    spikeMultiplier?: number;
    periodSeconds?: number;
    maxOpsPerSecond?: number;
  };

  try {
    body = await request.json();
  } catch {
    throw error(400, "Invalid JSON body");
  }

  if (!body.name) {
    throw error(400, "Name is required");
  }

  // Input validation - prevent abuse and ensure reasonable limits
  if (body.targetOperations !== undefined) {
    if (body.targetOperations < 1 || body.targetOperations > 1_000_000) {
      throw error(400, "targetOperations must be between 1 and 1,000,000");
    }
  }

  if (body.durationSeconds !== undefined) {
    if (body.durationSeconds < 1 || body.durationSeconds > 3600) {
      throw error(
        400,
        "durationSeconds must be between 1 and 3600 (1 hour max)",
      );
    }
  }

  if (body.concurrency !== undefined) {
    if (body.concurrency < 1 || body.concurrency > 500) {
      throw error(400, "concurrency must be between 1 and 500");
    }
  }

  if (body.spikeMultiplier !== undefined) {
    if (body.spikeMultiplier < 1 || body.spikeMultiplier > 100) {
      throw error(400, "spikeMultiplier must be between 1 and 100");
    }
  }

  if (body.maxOpsPerSecond !== undefined) {
    if (body.maxOpsPerSecond < 1 || body.maxOpsPerSecond > 10000) {
      throw error(400, "maxOpsPerSecond must be between 1 and 10,000");
    }
  }

  // Validate target systems
  const validSystems = [
    "d1_writes",
    "d1_reads",
    "kv_get",
    "kv_put",
    "r2_upload",
    "r2_download",
    "auth_flows",
    "post_crud",
    "media_ops",
  ];
  if (body.targetSystems) {
    for (const system of body.targetSystems) {
      if (!validSystems.includes(system)) {
        throw error(
          400,
          `Invalid target system: ${system}. Valid options: ${validSystems.join(", ")}`,
        );
      }
    }
  }

  // Build load profile based on type
  let profile: LoadProfile;

  switch (body.profileType) {
    case "spike":
      profile = createSpikeProfile({
        targetOperations: body.targetOperations,
        durationSeconds: body.durationSeconds,
        concurrency: body.concurrency,
        targetSystems: body.targetSystems,
        spikeMultiplier: body.spikeMultiplier,
      });
      break;

    case "sustained":
      profile = createSustainedProfile({
        targetOperations: body.targetOperations,
        durationSeconds: body.durationSeconds,
        concurrency: body.concurrency,
        targetSystems: body.targetSystems,
      });
      break;

    case "oscillation":
      profile = createOscillationProfile({
        targetOperations: body.targetOperations,
        durationSeconds: body.durationSeconds,
        concurrency: body.concurrency,
        targetSystems: body.targetSystems,
        periodSeconds: body.periodSeconds,
      });
      break;

    case "ramp":
      profile = createRampProfile({
        targetOperations: body.targetOperations,
        durationSeconds: body.durationSeconds,
        concurrency: body.concurrency,
        targetSystems: body.targetSystems,
        maxOpsPerSecond: body.maxOpsPerSecond,
      });
      break;

    case "smoke":
      profile = createSmokeTestProfile();
      break;

    default:
      // Custom profile - use provided values or defaults
      profile = {
        type: "custom",
        targetOperations: body.targetOperations ?? 1000,
        durationSeconds: body.durationSeconds ?? 60,
        concurrency: body.concurrency ?? 10,
        targetSystems: body.targetSystems ?? ["d1_reads", "d1_writes"],
      };
  }

  try {
    // Create the run record
    const run = await createSentinelRun(db, tenantId, body.name, profile, {
      description: body.description,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      triggeredBy: "api",
    });

    // If startImmediately is true, execute the run
    if (body.startImmediately && !body.scheduledAt) {
      const runner = new SentinelRunner({
        db,
        kv,
        r2,
        tenantId,
        ctx: platform.context,
      });

      // Run in background using waitUntil
      if (platform.context) {
        platform.context.waitUntil(
          runner.execute(run).catch((err) => {
            console.error("[Sentinel API] Execution error:", err);
          }),
        );
      } else {
        // If no context, just start it (will run to completion in request)
        runner.execute(run).catch((err) => {
          console.error("[Sentinel API] Execution error:", err);
        });
      }

      return json({
        success: true,
        run: { ...run, status: "running" },
        message: "Test run started",
      });
    }

    return json({
      success: true,
      run,
      message: body.scheduledAt ? "Test run scheduled" : "Test run created",
    });
  } catch (err) {
    console.error("[Sentinel API] Create error:", err);
    throw error(500, "Failed to create sentinel run");
  }
};
