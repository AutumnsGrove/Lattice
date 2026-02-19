// SSE Streaming endpoint for domain search progress
// GET /api/search/stream?job_id=xxx
//
// Proxies Server-Sent Events from the worker's Durable Object for real-time updates.

import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

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
    // Proxy SSE stream from worker
    const workerResponse = await fetch(
      `${workerUrl}/api/stream?job_id=${jobId}`,
    );

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error("[Worker Stream Error]", errorText);
      throw error(workerResponse.status, `Worker error: ${errorText}`);
    }

    // Pass through the SSE stream with proper headers
    return new Response(workerResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[Stream Error]", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to connect to stream");
  }
};
