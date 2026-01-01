// Start Domain Search
// POST /api/search/start
//
// This endpoint proxies to the Forage worker and stores
// a local reference to the job for admin tracking.
// Uses DeepSeek v3.2 via OpenRouter for zero-data-retention compliance.

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { now } from "$lib/server/db";

interface StartSearchBody {
  business_name?: string;
  domain_idea?: string;
  vibe?: string;
  keywords?: string;
  tld_preferences?: string[];
  diverse_tlds?: boolean;
  ai_provider?: string; // locked to 'openrouter' for ZDR compliance
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
    diverse_tlds,
    ai_provider,
  } = body;

  if (!business_name || typeof business_name !== "string") {
    throw error(400, "Business name is required");
  }

  // Validate ai_provider if provided (locked to openrouter for ZDR)
  // Only openrouter is supported for zero-data-retention compliance
  if (ai_provider && ai_provider !== "openrouter") {
    throw error(
      400,
      "Invalid AI provider. Only 'openrouter' is supported for zero-data-retention compliance.",
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
          diverse_tlds: diverse_tlds || false,
        },
        // Provider locked to openrouter for ZDR compliance
        // Both driver and swarm use DeepSeek v3.2 via OpenRouter
        driver_provider: "openrouter",
        swarm_provider: "openrouter",
      }),
    });

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error("[Worker Error]", errorText);
      throw error(500, `Worker failed to start search: ${errorText}`);
    }

    const workerResult = (await workerResponse.json()) as WorkerStartResponse;
    const timestamp = now();

    // Store a local reference in D1 for admin tracking
    // Use the worker's job_id directly to avoid ID mismatch issues
    // Use INSERT OR REPLACE to handle any existing job with the same ID
    try {
      await platform.env.DB.prepare(
        `INSERT OR REPLACE INTO domain_search_jobs
         (id, client_id, client_email, business_name, domain_idea, tld_preferences, vibe, keywords, status, batch_num, domains_checked, domains_available, good_results, started_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          workerResult.job_id,
          clientId,
          locals.user.email,
          business_name.trim(),
          domain_idea?.trim() || null,
          JSON.stringify(tld_preferences || ["com", "co"]),
          vibe || "professional",
          keywords?.trim() || null,
          "running",
          0,
          0,
          0,
          0,
          timestamp,
          timestamp,
          timestamp,
        )
        .run();
    } catch (dbErr) {
      console.error("[D1 Insert Error]", dbErr);
      // Continue anyway - the worker has started, we just can't track locally
    }

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
        started_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
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
