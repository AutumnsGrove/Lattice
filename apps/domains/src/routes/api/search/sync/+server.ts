// Sync Lost Jobs from Worker Index
// POST /api/search/sync
//
// This endpoint discovers jobs that exist in the worker's D1 index
// but not in our local D1, and syncs them.

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getSearchJob, now } from "$lib/server/db";

interface WorkerJob {
  job_id: string;
  client_id: string;
  status: string;
  business_name: string | null;
  batch_num: number;
  domains_checked: number;
  good_results: number;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
  updated_at: string;
}

interface WorkerListResponse {
  jobs: WorkerJob[];
  total: number;
  limit: number;
  offset: number;
}

export const POST: RequestHandler = async ({ locals, platform }) => {
  // Check authentication
  if (!locals.user?.is_admin) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  const workerUrl = platform.env.DOMAIN_WORKER_URL;
  if (!workerUrl) {
    throw error(500, "DOMAIN_WORKER_URL not configured");
  }

  try {
    // First, call refresh to get fresh status from DOs
    console.log(
      "[Sync] Refreshing jobs from:",
      `${workerUrl}/api/jobs/refresh`,
    );
    const refreshResponse = await fetch(`${workerUrl}/api/jobs/refresh`);
    if (!refreshResponse.ok) {
      console.warn("[Sync] Refresh failed, falling back to list");
    }

    // Fetch all jobs from worker's D1 index (now with fresh data)
    console.log(
      "[Sync] Fetching from:",
      `${workerUrl}/api/jobs/list?limit=100`,
    );
    const response = await fetch(`${workerUrl}/api/jobs/list?limit=100`);
    console.log("[Sync] Response status:", response.status);
    if (!response.ok) {
      const errText = await response.text();
      console.error("[Worker Sync Error]", errText);
      throw error(500, `Worker returned ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as WorkerListResponse;
    const workerJobs = data.jobs;

    let synced = 0;
    let updated = 0;
    let skipped = 0;

    for (const workerJob of workerJobs) {
      // Check if we already have this job
      const localJob = await getSearchJob(platform.env.DB, workerJob.job_id);

      if (!localJob) {
        // Insert missing job
        const timestamp = now();
        await platform.env.DB.prepare(
          `INSERT INTO domain_search_jobs
           (id, client_id, client_email, business_name, tld_preferences, vibe, status, batch_num, domains_checked, good_results, input_tokens, output_tokens, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            workerJob.job_id,
            workerJob.client_id,
            "synced@worker", // Unknown email for synced jobs
            workerJob.business_name ?? "Unknown",
            "[]",
            "professional",
            workerJob.status,
            workerJob.batch_num,
            workerJob.domains_checked,
            workerJob.good_results,
            workerJob.input_tokens ?? 0,
            workerJob.output_tokens ?? 0,
            workerJob.created_at,
            timestamp,
          )
          .run();
        synced++;
      } else {
        // Update existing job if worker has newer status or tokens
        const isComplete =
          workerJob.status === "complete" || workerJob.status === "failed";
        const needsUpdate =
          localJob.status !== workerJob.status ||
          localJob.batch_num !== workerJob.batch_num ||
          localJob.good_results !== workerJob.good_results ||
          (workerJob.input_tokens ?? 0) > 0;

        if (needsUpdate) {
          if (isComplete && !localJob.completed_at) {
            // Set completed_at and calculate duration
            await platform.env.DB.prepare(
              `UPDATE domain_search_jobs
               SET status = ?, batch_num = ?, domains_checked = ?, good_results = ?, input_tokens = ?, output_tokens = ?,
                   completed_at = ?, duration_seconds = CAST((julianday(?) - julianday(created_at)) * 86400 AS INTEGER), updated_at = ?
               WHERE id = ?`,
            )
              .bind(
                workerJob.status,
                workerJob.batch_num,
                workerJob.domains_checked,
                workerJob.good_results,
                workerJob.input_tokens ?? 0,
                workerJob.output_tokens ?? 0,
                workerJob.updated_at,
                workerJob.updated_at,
                now(),
                workerJob.job_id,
              )
              .run();
          } else {
            await platform.env.DB.prepare(
              `UPDATE domain_search_jobs
               SET status = ?, batch_num = ?, domains_checked = ?, good_results = ?, input_tokens = ?, output_tokens = ?, updated_at = ?
               WHERE id = ?`,
            )
              .bind(
                workerJob.status,
                workerJob.batch_num,
                workerJob.domains_checked,
                workerJob.good_results,
                workerJob.input_tokens ?? 0,
                workerJob.output_tokens ?? 0,
                now(),
                workerJob.job_id,
              )
              .run();
          }
          updated++;
        } else {
          skipped++;
        }
      }
    }

    return json({
      success: true,
      synced,
      updated,
      skipped,
      total: workerJobs.length,
    });
  } catch (err) {
    console.error("[Sync Error]", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    // Return detailed error for debugging
    const errMsg = err instanceof Error ? err.message : String(err);
    throw error(500, `Failed to sync jobs: ${errMsg}`);
  }
};
