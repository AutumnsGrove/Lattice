// Get Domain Search Status
// GET /api/search/status?job_id=xxx
//
// Polls the worker's Durable Object for real-time status
// and syncs back to local D1 for admin tracking.

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  getSearchJob,
  updateSearchJobStatus,
  type SearchStatus,
} from "$lib/server/db";

interface WorkerStatusResponse {
  job_id: string;
  status: SearchStatus;
  batch_num: number;
  domains_checked: number;
  domains_available: number;
  good_results: number;
  created_at: string;
  updated_at: string;
}

export const GET: RequestHandler = async ({ url, locals, platform }) => {
  // Check authentication
  if (!locals.user?.is_admin) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  const jobId = url.searchParams.get("job_id");
  if (!jobId) {
    throw error(400, "job_id is required");
  }

  const workerUrl = platform.env.DOMAIN_WORKER_URL;
  if (!workerUrl) {
    throw error(500, "DOMAIN_WORKER_URL not configured");
  }

  try {
    // Get local job data for context (business name, etc.)
    const localJob = await getSearchJob(platform.env.DB, jobId);

    // Poll the worker for real-time status
    const workerResponse = await fetch(
      `${workerUrl}/api/status?job_id=${jobId}`,
    );

    if (!workerResponse.ok) {
      // If worker doesn't have the job, check if we have local data
      if (workerResponse.status === 404 && localJob) {
        return json({
          job: localJob,
          results: [],
        });
      }
      const errorText = await workerResponse.text();
      console.error("[Worker Status Error]", errorText);
      throw error(workerResponse.status, `Worker error: ${errorText}`);
    }

    const workerStatus = (await workerResponse.json()) as WorkerStatusResponse;

    // Sync worker status back to local D1
    if (localJob) {
      await updateSearchJobStatus(platform.env.DB, jobId, {
        status: workerStatus.status,
        batch_num: workerStatus.batch_num,
        domains_checked: workerStatus.domains_checked,
        good_results: workerStatus.good_results,
        ...(workerStatus.status === "complete" ||
        workerStatus.status === "failed" ||
        workerStatus.status === "needs_followup"
          ? { completed_at: workerStatus.updated_at }
          : {}),
      });
    }

    // Merge worker status with local job context
    const job = {
      id: workerStatus.job_id,
      client_id: localJob?.client_id || "",
      client_email: localJob?.client_email || "",
      business_name: localJob?.business_name || "",
      domain_idea: localJob?.domain_idea || null,
      tld_preferences: localJob?.tld_preferences || "[]",
      vibe: localJob?.vibe || "professional",
      keywords: localJob?.keywords || null,
      status: workerStatus.status,
      batch_num: workerStatus.batch_num,
      domains_checked: workerStatus.domains_checked,
      domains_available: workerStatus.domains_available,
      good_results: workerStatus.good_results,
      error: null,
      started_at: localJob?.started_at || workerStatus.created_at,
      completed_at: localJob?.completed_at || null,
      duration_seconds: localJob?.duration_seconds || null,
      created_at: workerStatus.created_at,
      updated_at: workerStatus.updated_at,
    };

    return json({
      job,
      results: [], // Results are now fetched separately via /api/search/results
    });
  } catch (err) {
    console.error("[Get Status Error]", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to get job status");
  }
};
