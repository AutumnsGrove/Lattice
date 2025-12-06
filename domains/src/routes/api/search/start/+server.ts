// Start Domain Search
// POST /api/search/start
//
// This endpoint proxies to the GroveDomainTool worker and stores
// a local reference to the job for admin tracking.

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createSearchJob, updateSearchJobStatus, now } from "$lib/server/db";

interface StartSearchBody {
  business_name?: string;
  domain_idea?: string;
  vibe?: string;
  keywords?: string;
  tld_preferences?: string[];
  ai_provider?: string; // claude | deepseek | kimi | cloudflare
}

interface WorkerStartResponse {
  job_id: string;
  status: "running";
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

  const {
    business_name,
    domain_idea,
    vibe,
    keywords,
    tld_preferences,
    ai_provider,
  } = body;

  if (!business_name || typeof business_name !== "string") {
    throw error(400, "Business name is required");
  }

  // Validate ai_provider if provided
  const validProviders = ["claude", "deepseek", "kimi", "cloudflare"];
  if (ai_provider && !validProviders.includes(ai_provider)) {
    throw error(
      400,
      `Invalid AI provider. Valid options: ${validProviders.join(", ")}`,
    );
  }

  const workerUrl = platform.env.DOMAIN_WORKER_URL;
  if (!workerUrl) {
    throw error(500, "DOMAIN_WORKER_URL not configured");
  }

  try {
    // Generate a client_id for this search
    const clientId = crypto.randomUUID();

    // Call the worker to start the search (new API format)
    const workerResponse = await fetch(`${workerUrl}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        quiz_responses: {
          business_name: business_name.trim(),
          domain_idea: domain_idea?.trim() || undefined,
          tld_preferences: tld_preferences || ["com", "co"],
          vibe: vibe || "professional",
          keywords: keywords?.trim() || undefined,
        },
        // Include provider if specified (both driver and swarm use the same)
        ...(ai_provider && {
          driver_provider: ai_provider,
          swarm_provider: ai_provider,
        }),
      }),
    });

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error("[Worker Error]", errorText);
      throw error(500, `Worker failed to start search: ${errorText}`);
    }

    const workerResult = (await workerResponse.json()) as WorkerStartResponse;

    // Store a local reference in D1 for admin tracking
    // The job_id comes from the worker's Durable Object
    const job = await createSearchJob(platform.env.DB, {
      client_email: locals.user.email,
      business_name: business_name.trim(),
      domain_idea: domain_idea?.trim(),
      tld_preferences: tld_preferences || ["com", "co"],
      vibe: vibe || "professional",
      keywords: keywords?.trim(),
    });

    // Update the job ID to match the worker's job ID
    // and mark as running
    await platform.env.DB.prepare(
      `UPDATE domain_search_jobs
       SET id = ?, client_id = ?, status = ?, started_at = ?, updated_at = datetime("now")
       WHERE id = ?`,
    )
      .bind(workerResult.job_id, clientId, "running", now(), job.id)
      .run();

    return json({
      success: true,
      job: {
        id: workerResult.job_id,
        client_id: clientId,
        client_email: locals.user.email,
        business_name: business_name.trim(),
        domain_idea: domain_idea?.trim() || null,
        tld_preferences: JSON.stringify(tld_preferences || ["com", "co"]),
        vibe: vibe || "professional",
        keywords: keywords?.trim() || null,
        status: "running",
        batch_num: 0,
        domains_checked: 0,
        domains_available: 0,
        good_results: 0,
        started_at: now(),
        created_at: now(),
        updated_at: now(),
      },
    });
  } catch (err) {
    console.error("[Start Search Error]", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to start search");
  }
};
