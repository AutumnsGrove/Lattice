import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getSearchJob, getJobResults } from "$lib/server/db";

interface WorkerResult {
  domain: string;
  tld: string;
  status: string;
  score: number;
  price_cents: number | null;
  price_category: string | null;
  pricing_category: string | null; // Worker returns this calculated field
  batch_num: number;
  flags: string[] | null;
  notes: string | null;
  evaluation?: {
    pronounceable?: number;
    memorable?: number;
    brandFit?: number;
    emailFriendly?: number;
  };
}

interface WorkerResultsResponse {
  job_id: string;
  domains: WorkerResult[];
  total_checked: number;
}

export const load: PageServerLoad = async ({ params, platform }) => {
  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  const job = await getSearchJob(platform.env.DB, params.id);

  if (!job) {
    throw error(404, "Job not found");
  }

  // Try local results first
  let results = await getJobResults(platform.env.DB, params.id);

  // If no local results, fetch from worker
  if (results.length === 0 && platform.env.DOMAIN_WORKER_URL) {
    try {
      const response = await fetch(
        `${platform.env.DOMAIN_WORKER_URL}/api/results?job_id=${params.id}`,
      );
      if (response.ok) {
        const data = (await response.json()) as WorkerResultsResponse;
        // Transform worker results to match local format
        results = data.domains.map((r, idx) => ({
          id: `${params.id}-${idx}`,
          job_id: params.id,
          domain: r.domain,
          tld: r.tld,
          status: r.status as "available" | "registered" | "unknown",
          score: r.score,
          price_cents: r.price_cents,
          price_category: r.pricing_category || r.price_category, // Worker returns pricing_category
          flags: r.flags ? JSON.stringify(r.flags) : null,
          notes: r.notes,
          batch_num: r.batch_num || 1,
          created_at: job.created_at,
        }));
      }
    } catch (err) {
      console.error("[History] Failed to fetch worker results:", err);
    }
  }

  return { job, results };
};
