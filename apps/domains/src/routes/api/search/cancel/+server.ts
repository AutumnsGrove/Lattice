// Cancel Domain Search
// POST /api/search/cancel

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { updateSearchJobStatus } from "$lib/server/db";

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  // Check authentication
  if (!locals.user?.is_admin) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  let body: { job_id?: string };
  try {
    body = await request.json();
  } catch {
    throw error(400, "Invalid request body");
  }

  const { job_id } = body;

  if (!job_id) {
    throw error(400, "job_id is required");
  }

  try {
    // Call the worker's cancel endpoint
    const workerUrl = platform.env.DOMAIN_WORKER_URL;
    if (workerUrl) {
      try {
        await fetch(`${workerUrl}/api/cancel?job_id=${job_id}`, {
          method: "POST",
        });
      } catch (workerErr) {
        console.error("[Worker Cancel Failed]", workerErr);
        // Continue anyway to update local DB
      }
    }

    // Update local job status to cancelled
    await updateSearchJobStatus(platform.env.DB, job_id, {
      status: "cancelled",
      error: "Cancelled by user",
    });

    return json({ success: true });
  } catch (err) {
    console.error("[Cancel Search Error]", err);
    throw error(500, "Failed to cancel search");
  }
};
