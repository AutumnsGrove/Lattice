/**
 * Sentinel API - Individual Run Operations
 *
 * GET /api/sentinel/[id] - Get a specific test run
 * POST /api/sentinel/[id] - Start/cancel a test run
 * DELETE /api/sentinel/[id] - Delete a test run
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import {
  SentinelRunner,
  getSentinelRun,
} from '$lib/sentinel/index.js';

/**
 * GET /api/sentinel/[id]
 * Get details of a specific sentinel run
 */
export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(500, 'Database not configured');
  }

  // Require authentication
  if (!locals.user) {
    throw error(401, 'Authentication required');
  }

  const { id } = params;
  const db = platform.env.DB;

  try {
    const run = await getSentinelRun(db, id);

    if (!run) {
      throw error(404, 'Sentinel run not found');
    }

    // Verify tenant access
    if (run.tenantId !== (locals.tenantId ?? 'default')) {
      throw error(403, 'Access denied');
    }

    // Fetch checkpoints for the run
    const checkpointsResult = await db
      .prepare('SELECT * FROM sentinel_checkpoints WHERE run_id = ? ORDER BY checkpoint_index')
      .bind(id)
      .all();

    return json({
      success: true,
      run,
      checkpoints: checkpointsResult.results,
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[Sentinel API] Get error:', err);
    throw error(500, 'Failed to get sentinel run');
  }
};

/**
 * POST /api/sentinel/[id]
 * Start or cancel a test run
 *
 * Body:
 * - action: 'start' | 'cancel'
 */
export const POST: RequestHandler = async ({ params, request, platform, locals }) => {
  if (!platform?.env?.DB || !platform?.env?.KV || !platform?.env?.IMAGES) {
    throw error(500, 'Required bindings not configured');
  }

  // Require authentication
  if (!locals.user) {
    throw error(401, 'Authentication required');
  }

  const { id } = params;
  const tenantId = locals.tenantId ?? 'default';
  const db = platform.env.DB;
  const kv = platform.env.KV;
  const r2 = platform.env.IMAGES;

  let body: { action: string };

  try {
    body = await request.json();
  } catch {
    throw error(400, 'Invalid JSON body');
  }

  if (!body.action || !['start', 'cancel'].includes(body.action)) {
    throw error(400, 'Action must be "start" or "cancel"');
  }

  try {
    const run = await getSentinelRun(db, id);

    if (!run) {
      throw error(404, 'Sentinel run not found');
    }

    // Verify tenant access
    if (run.tenantId !== tenantId) {
      throw error(403, 'Access denied');
    }

    if (body.action === 'start') {
      // Can only start pending runs
      if (run.status !== 'pending') {
        throw error(400, `Cannot start run with status: ${run.status}`);
      }

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
            console.error('[Sentinel API] Execution error:', err);
          })
        );
      } else {
        runner.execute(run).catch((err) => {
          console.error('[Sentinel API] Execution error:', err);
        });
      }

      return json({
        success: true,
        message: 'Test run started',
        run: { ...run, status: 'running' },
      });
    }

    if (body.action === 'cancel') {
      // Can only cancel pending or running runs
      if (!['pending', 'running'].includes(run.status)) {
        throw error(400, `Cannot cancel run with status: ${run.status}`);
      }

      // Update status to cancelled
      await db
        .prepare('UPDATE sentinel_runs SET status = ?, updated_at = ? WHERE id = ?')
        .bind('cancelled', Math.floor(Date.now() / 1000), id)
        .run();

      return json({
        success: true,
        message: 'Test run cancelled',
        run: { ...run, status: 'cancelled' },
      });
    }

    throw error(400, 'Invalid action');
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[Sentinel API] Action error:', err);
    throw error(500, 'Failed to perform action on sentinel run');
  }
};

/**
 * DELETE /api/sentinel/[id]
 * Delete a test run and its associated data
 */
export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(500, 'Database not configured');
  }

  // Require authentication
  if (!locals.user) {
    throw error(401, 'Authentication required');
  }

  const { id } = params;
  const tenantId = locals.tenantId ?? 'default';
  const db = platform.env.DB;

  try {
    const run = await getSentinelRun(db, id);

    if (!run) {
      throw error(404, 'Sentinel run not found');
    }

    // Verify tenant access
    if (run.tenantId !== tenantId) {
      throw error(403, 'Access denied');
    }

    // Cannot delete running tests
    if (run.status === 'running') {
      throw error(400, 'Cannot delete a running test. Cancel it first.');
    }

    // Delete the run (cascades to metrics and checkpoints)
    await db
      .prepare('DELETE FROM sentinel_runs WHERE id = ?')
      .bind(id)
      .run();

    return json({
      success: true,
      message: 'Test run deleted',
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[Sentinel API] Delete error:', err);
    throw error(500, 'Failed to delete sentinel run');
  }
};
