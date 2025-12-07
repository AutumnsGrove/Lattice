// Resume Search with Follow-up Answers
// POST /api/search/resume?job_id=xxx
//
// After completing the follow-up quiz, this resumes the search
// with the additional refinement data.

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { updateSearchJobStatus } from "$lib/server/db";

interface ResumeBody {
  followup_responses: Record<string, string | string[]>;
}

interface WorkerResumeResponse {
  job_id: string;
  status: "running";
}

export const POST: RequestHandler = async ({
  url,
  request,
  locals,
  platform,
}) => {
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

  let body: ResumeBody;
  try {
    body = await request.json();
  } catch {
    throw error(400, "Invalid request body");
  }

  if (!body.followup_responses || typeof body.followup_responses !== "object") {
    throw error(400, "followup_responses is required");
  }

  const workerUrl = platform.env.DOMAIN_WORKER_URL;
  if (!workerUrl) {
    throw error(500, "DOMAIN_WORKER_URL not configured");
  }

  try {
    console.log(`[Resume API] Resuming search for job_id: ${jobId}`);
    console.log(`[Resume API] Followup responses:`, body.followup_responses);

    const workerResponse = await fetch(
      `${workerUrl}/api/resume?job_id=${jobId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followup_responses: body.followup_responses,
        }),
      },
    );

    console.log(
      `[Resume API] Worker response status: ${workerResponse.status}`,
    );

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error("[Worker Resume Error]", errorText);
      throw error(workerResponse.status, `Worker error: ${errorText}`);
    }

    const result = (await workerResponse.json()) as WorkerResumeResponse;
    console.log(
      `[Resume API] Successfully resumed search, new status: ${result.status}`,
    );

    // Update local job status to running
    await updateSearchJobStatus(platform.env.DB, jobId, {
      status: "running",
    });

    return json({
      success: true,
      job_id: result.job_id,
      status: result.status,
    });
  } catch (err) {
    console.error("[Resume Search Error]", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to resume search");
  }
};
