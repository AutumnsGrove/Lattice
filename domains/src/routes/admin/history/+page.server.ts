import type { PageServerLoad } from "./$types";
import { listSearchJobs, getSearchJob, now } from "$lib/server/db";

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

export const load: PageServerLoad = async ({ platform }) => {
  if (!platform?.env?.DB) {
    return { jobs: [], total: 0, syncResult: null };
  }

  // Auto-sync from worker on page load
  let syncResult: { synced: number; updated: number } | null = null;
  const workerUrl = platform.env.DOMAIN_WORKER_URL;

  if (workerUrl) {
    try {
      // First, refresh running jobs to get fresh status from DOs
      await fetch(`${workerUrl}/api/jobs/refresh`).catch(() => {});

      const response = await fetch(`${workerUrl}/api/jobs/list?limit=100`);
      if (response.ok) {
        const data = (await response.json()) as WorkerListResponse;
        let synced = 0;
        let updated = 0;

        for (const workerJob of data.jobs) {
          const localJob = await getSearchJob(
            platform.env.DB,
            workerJob.job_id,
          );

          if (!localJob) {
            // Insert missing job
            await platform.env.DB.prepare(
              `INSERT INTO domain_search_jobs
							 (id, client_id, client_email, business_name, tld_preferences, vibe, status, batch_num, domains_checked, good_results, input_tokens, output_tokens, created_at, updated_at)
							 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
              .bind(
                workerJob.job_id,
                workerJob.client_id,
                "synced@worker",
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
                now(),
              )
              .run();
            synced++;
          } else {
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
            }
          }
        }

        if (synced > 0 || updated > 0) {
          syncResult = { synced, updated };
        }
      }
    } catch (err) {
      console.error("[Auto-sync error]", err);
      // Continue anyway - just show local data
    }
  }

  const { jobs, total } = await listSearchJobs(platform.env.DB, { limit: 50 });

  return { jobs, total, syncResult };
};
