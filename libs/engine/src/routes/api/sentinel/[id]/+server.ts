/**
 * Sentinel API - Individual Run Operations
 *
 * GET /api/sentinel/[id] - Get a specific test run
 * POST /api/sentinel/[id] - Start/cancel a test run
 * DELETE /api/sentinel/[id] - Delete a test run
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import {
  SentinelRunner,
  getSentinelRun,
  type R2Bucket as SentinelR2Bucket,
} from "$lib/sentinel/index.js";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";

/**
 * GET /api/sentinel/[id]
 * Get details of a specific sentinel run
 */
export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  // Require admin authentication
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }
  if (!locals.user.isAdmin) {
    throwGroveError(403, API_ERRORS.ADMIN_ACCESS_REQUIRED, "API");
  }

  const { id } = params;
  const db = platform.env.DB;

  try {
    const run = await getSentinelRun(db, id);

    if (!run) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Verify tenant access
    if (run.tenantId !== (locals.tenantId ?? "default")) {
      throwGroveError(403, API_ERRORS.ADMIN_ACCESS_REQUIRED, "API");
    }

    // Fetch checkpoints for the run
    const checkpointsResult = await db
      .prepare(
        "SELECT * FROM sentinel_checkpoints WHERE run_id = ? ORDER BY checkpoint_index",
      )
      .bind(id)
      .all();

    return json({
      success: true,
      run,
      checkpoints: checkpointsResult.results,
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};

/**
 * POST /api/sentinel/[id]
 * Start or cancel a test run
 *
 * Body:
 * - action: 'start' | 'cancel'
 */
export const POST: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
  if (
    !platform?.env?.DB ||
    !platform?.env?.CACHE_KV ||
    !platform?.env?.IMAGES
  ) {
    throwGroveError(500, API_ERRORS.SERVICE_UNAVAILABLE, "API");
  }

  // Require admin authentication
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }
  if (!locals.user.isAdmin) {
    throwGroveError(403, API_ERRORS.ADMIN_ACCESS_REQUIRED, "API");
  }

  const { id } = params;
  const tenantId = locals.tenantId ?? "default";
  const db = platform.env.DB;
  const kv = platform.env.CACHE_KV;
  const r2 = platform.env.IMAGES as unknown as SentinelR2Bucket;

  let body: { action: string };

  try {
    body = await request.json();
  } catch {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  if (!body.action || !["start", "cancel"].includes(body.action)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  try {
    const run = await getSentinelRun(db, id);

    if (!run) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Verify tenant access
    if (run.tenantId !== tenantId) {
      throwGroveError(403, API_ERRORS.ADMIN_ACCESS_REQUIRED, "API");
    }

    if (body.action === "start") {
      // Can only start pending runs
      if (run.status !== "pending") {
        throwGroveError(400, API_ERRORS.INVALID_STATE_TRANSITION, "API");
      }

      // Update database status to 'running' before returning response
      await db
        .prepare(
          "UPDATE sentinel_runs SET status = ?, started_at = ?, updated_at = ? WHERE id = ?",
        )
        .bind(
          "running",
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000),
          id,
        )
        .run();

      // Update local run object to match DB state before passing to executor
      run.status = "running";
      run.startedAt = new Date();

      const runner = new SentinelRunner({
        db,
        kv,
        r2,
        tenantId,
        ctx: platform.context,
      });

      // Run in background
      if (platform.context) {
        platform.context.waitUntil(
          runner.execute(run).catch((err) => {
            console.error("[Sentinel API] Execution error:", err);
          }),
        );
      } else {
        runner.execute(run).catch((err) => {
          console.error("[Sentinel API] Execution error:", err);
        });
      }

      return json({
        success: true,
        message: "Test run started",
        run: { ...run, status: "running" },
      });
    }

    if (body.action === "cancel") {
      // Can only cancel pending or running runs
      if (!["pending", "running"].includes(run.status)) {
        throwGroveError(400, API_ERRORS.INVALID_STATE_TRANSITION, "API");
      }

      // Update status to cancelled
      await db
        .prepare(
          "UPDATE sentinel_runs SET status = ?, updated_at = ? WHERE id = ?",
        )
        .bind("cancelled", Math.floor(Date.now() / 1000), id)
        .run();

      return json({
        success: true,
        message: "Test run cancelled",
        run: { ...run, status: "cancelled" },
      });
    }

    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  } catch (err) {
    if (err instanceof Response) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};

/**
 * DELETE /api/sentinel/[id]
 * Delete a test run and its associated data
 */
export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  // Require admin authentication
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }
  if (!locals.user.isAdmin) {
    throwGroveError(403, API_ERRORS.ADMIN_ACCESS_REQUIRED, "API");
  }

  const { id } = params;
  const tenantId = locals.tenantId ?? "default";
  const db = platform.env.DB;

  try {
    const run = await getSentinelRun(db, id);

    if (!run) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Verify tenant access
    if (run.tenantId !== tenantId) {
      throwGroveError(403, API_ERRORS.ADMIN_ACCESS_REQUIRED, "API");
    }

    // Cannot delete running tests
    if (run.status === "running") {
      throwGroveError(400, API_ERRORS.INVALID_STATE_TRANSITION, "API");
    }

    // Delete the run (cascades to metrics and checkpoints)
    await db.prepare("DELETE FROM sentinel_runs WHERE id = ?").bind(id).run();

    return json({
      success: true,
      message: "Test run deleted",
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
