// Get Domain Search Results
// GET /api/search/results?job_id=xxx
//
// Fetches full results from the worker's Durable Object.

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

interface DomainResult {
  domain: string;
  tld: string;
  status: "available" | "registered" | "unknown";
  price_cents?: number;
  score: number;
  flags: string[];
  evaluation_data?: {
    pronounceable: boolean;
    memorable: boolean;
    brand_fit: boolean;
    email_friendly: boolean;
    notes: string;
    rdap_registrar?: string;
    rdap_expiration?: string;
    pricing_category?: "bundled" | "recommended" | "standard" | "premium";
    renewal_cents?: number;
  };
  price_display?: string;
  pricing_category?: string;
}

interface PricingSummary {
  bundled: number;
  recommended: number;
  standard: number;
  premium: number;
}

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

interface WorkerResultsResponse {
  job_id: string;
  status: string;
  batch_num: number;
  domains: DomainResult[];
  total_checked: number;
  pricing_summary: PricingSummary;
  usage: TokenUsage;
}

export const GET: RequestHandler = async ({ url, locals, platform }) => {
  // Check authentication
  if (!locals.user?.is_admin) {
    throw error(401, "Unauthorized");
  }

  const jobId = url.searchParams.get("job_id");
  if (!jobId) {
    throw error(400, "job_id is required");
  }

  const workerUrl = platform?.env?.DOMAIN_WORKER_URL;
  if (!workerUrl) {
    throw error(500, "DOMAIN_WORKER_URL not configured");
  }

  try {
    const workerResponse = await fetch(
      `${workerUrl}/api/results?job_id=${jobId}`,
    );

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error("[Worker Results Error]", errorText);
      throw error(workerResponse.status, `Worker error: ${errorText}`);
    }

    const results = (await workerResponse.json()) as WorkerResultsResponse;

    return json(results);
  } catch (err) {
    console.error("[Get Results Error]", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to get results");
  }
};
