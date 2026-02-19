// Get Follow-up Quiz
// GET /api/search/followup?job_id=xxx
//
// When a search hits max batches without enough results,
// this returns a quiz to refine the search.

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

interface QuizOption {
  value: string;
  label: string;
}

interface QuizQuestion {
  id: string;
  type: "text" | "single_select" | "multi_select";
  prompt: string;
  required: boolean;
  placeholder?: string;
  options?: QuizOption[];
  default?: string | string[];
}

interface FollowupContext {
  batches_completed: number;
  domains_checked: number;
  good_found: number;
  target: number;
}

interface WorkerFollowupResponse {
  job_id: string;
  questions: QuizQuestion[];
  context: FollowupContext;
}

export const GET: RequestHandler = async ({ url, locals, platform }) => {
  // Check authentication
  console.log(
    `[Followup API] Request received for job_id: ${url.searchParams.get("job_id")}`,
  );

  if (!locals.user?.is_admin) {
    console.error("[Followup API] Unauthorized access attempt");
    throw error(401, "Unauthorized");
  }

  const jobId = url.searchParams.get("job_id");
  if (!jobId) {
    console.error("[Followup API] Missing job_id parameter");
    throw error(400, "job_id is required");
  }

  const workerUrl = platform?.env?.DOMAIN_WORKER_URL;
  console.log(`[Followup API] Worker URL from environment: ${workerUrl}`);

  if (!workerUrl) {
    console.error(
      "[Followup API] DOMAIN_WORKER_URL not configured in environment",
    );
    console.error(
      "[Followup API] Available environment keys:",
      Object.keys(platform?.env || {}),
    );
    throw error(500, "DOMAIN_WORKER_URL not configured");
  }

  console.log(
    `[Followup API] Configuration check passed. Worker URL: ${workerUrl}`,
  );

  try {
    const targetUrl = `${workerUrl}/api/followup?job_id=${jobId}`;
    console.log(`[Followup API] Making request to: ${targetUrl}`);

    const workerResponse = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(
      `[Followup API] Worker response status: ${workerResponse.status}`,
    );
    console.log(
      `[Followup API] Worker response headers:`,
      Object.fromEntries(workerResponse.headers.entries()),
    );

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error(
        `[Followup API] Worker error: ${workerResponse.status} - ${errorText}`,
      );
      console.error(`[Followup API] Full error response:`, errorText);

      // Try to parse the error to understand what the worker is saying
      try {
        const errorJson = JSON.parse(errorText);
        console.error(`[Followup API] Parsed worker error:`, errorJson);
      } catch (parseError) {
        console.error(`[Followup API] Could not parse worker error as JSON`);
      }

      throw error(workerResponse.status, `Worker error: ${errorText}`);
    }

    const responseText = await workerResponse.text();
    console.log(
      `[Followup API] Raw response text: ${responseText.substring(0, 200)}...`,
    );

    let followup;
    try {
      followup = JSON.parse(responseText) as WorkerFollowupResponse;
    } catch (parseError) {
      console.error(
        `[Followup API] Failed to parse JSON response:`,
        parseError,
      );
      console.error(
        `[Followup API] Response text that failed to parse:`,
        responseText,
      );
      throw error(500, `Invalid JSON response from worker: ${responseText}`);
    }

    console.log(
      `[Followup API] Successfully retrieved followup quiz with ${followup.questions?.length || 0} questions`,
    );
    console.log(`[Followup API] Followup data structure:`, {
      job_id: followup.job_id,
      questions_count: followup.questions?.length,
      context: followup.context,
    });

    return json(followup);
  } catch (err) {
    console.error("[Followup API] Exception caught:", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(
      500,
      `Failed to get follow-up quiz: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};
