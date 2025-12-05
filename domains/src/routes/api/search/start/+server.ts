// Start Domain Search
// POST /api/search/start

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createSearchJob, updateSearchJobStatus, now } from "$lib/server/db";

interface StartSearchBody {
  business_name?: string;
  domain_idea?: string;
  vibe?: string;
  keywords?: string;
  tld_preferences?: string[];
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  // Check authentication
  if (!locals.user?.is_admin) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  let body: StartSearchBody;
  try {
    body = await request.json();
  } catch {
    throw error(400, "Invalid request body");
  }

  const { business_name, domain_idea, vibe, keywords, tld_preferences } = body;

  if (!business_name || typeof business_name !== "string") {
    throw error(400, "Business name is required");
  }

  try {
    // Create the search job
    const job = await createSearchJob(platform.env.DB, {
      client_email: locals.user.email,
      business_name: business_name.trim(),
      domain_idea: domain_idea?.trim(),
      tld_preferences: tld_preferences || ["com", "co"],
      vibe: vibe || "professional",
      keywords: keywords?.trim(),
    });

    // Mark job as running
    await updateSearchJobStatus(platform.env.DB, job.id, {
      status: "running",
      started_at: now(),
    });

    // Trigger the domain search worker
    const workerUrl = platform.env.DOMAIN_WORKER_URL;
    if (workerUrl) {
      try {
        const workerResponse = await fetch(`${workerUrl}/api/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_id: job.id,
            business_name: job.business_name,
            domain_idea: job.domain_idea,
            tld_preferences: JSON.parse(job.tld_preferences),
            vibe: job.vibe,
            keywords: job.keywords,
            client_email: job.client_email,
          }),
        });

        if (!workerResponse.ok) {
          const errorText = await workerResponse.text();
          console.error("[Worker Error]", errorText);
          // Don't fail the request, just log the error
          // The job is created and can be retried
        }
      } catch (workerErr) {
        console.error("[Worker Call Failed]", workerErr);
        // Don't fail - job is created, worker can be called again
      }
    } else {
      console.log(
        "[Dev Mode] No DOMAIN_WORKER_URL configured, skipping worker call",
      );
    }

    return json({
      success: true,
      job: {
        ...job,
        status: "running",
        started_at: now(),
      },
    });
  } catch (err) {
    console.error("[Start Search Error]", err);
    throw error(500, "Failed to start search");
  }
};
