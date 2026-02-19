// Vibe Search - Natural Language Domain Discovery
// POST /api/vibe
//
// Accepts a natural language description and uses AI to parse it
// into structured search parameters, then starts a domain search.

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { now } from "$lib/server/db";

interface VibeSearchBody {
  vibe_text: string;
  client_email?: string;
}

interface ParsedVibe {
  business_name: string;
  vibe: string;
  keywords: string;
  tld_preferences: string[];
  domain_idea: string | null;
}

interface WorkerVibeResponse {
  job_id: string;
  status: "pending" | "running";
  parsed: ParsedVibe;
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  // Check authentication
  if (!locals.user?.is_admin) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  let body: VibeSearchBody;
  try {
    body = await request.json();
  } catch {
    throw error(400, "Invalid request body");
  }

  const { vibe_text, client_email } = body;

  if (!vibe_text || typeof vibe_text !== "string") {
    throw error(400, "vibe_text is required");
  }

  // Count words (split by whitespace, filter empty)
  const wordCount = vibe_text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 5) {
    return json(
      {
        success: false,
        error: "word_count_too_low",
        hint: `Please add more detail - we need at least 5 words to understand your vision. You have ${wordCount} word${wordCount === 1 ? "" : "s"}.`,
        word_count: wordCount,
      },
      { status: 400 },
    );
  }

  const workerUrl = platform.env.DOMAIN_WORKER_URL;
  if (!workerUrl) {
    throw error(500, "DOMAIN_WORKER_URL not configured");
  }

  try {
    // Call the worker's vibe endpoint
    const workerResponse = await fetch(`${workerUrl}/api/vibe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vibe_text: vibe_text.trim(),
        client_email: client_email || locals.user.email,
      }),
    });

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error("[Worker Vibe Error]", errorText);

      // Check if it's a parsing failure
      if (workerResponse.status === 422) {
        return json(
          {
            success: false,
            error: "parsing_failed",
            hint: "We couldn't quite understand that. Try adding more detail about your business name, what you do, or the vibe you're going for.",
          },
          { status: 422 },
        );
      }

      throw error(500, `Worker failed to parse vibe: ${errorText}`);
    }

    const workerResult = (await workerResponse.json()) as WorkerVibeResponse;
    const timestamp = now();

    // Store a local reference in D1 for admin tracking
    try {
      await platform.env.DB.prepare(
        `INSERT OR REPLACE INTO domain_search_jobs
         (id, client_id, client_email, business_name, domain_idea, tld_preferences, vibe, keywords, status, batch_num, domains_checked, domains_available, good_results, started_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          workerResult.job_id,
          crypto.randomUUID(),
          client_email || locals.user.email,
          workerResult.parsed.business_name,
          workerResult.parsed.domain_idea,
          JSON.stringify(workerResult.parsed.tld_preferences),
          workerResult.parsed.vibe,
          workerResult.parsed.keywords,
          workerResult.status,
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
      // Continue anyway - the worker has started
    }

    return json({
      success: true,
      job_id: workerResult.job_id,
      status: workerResult.status,
      parsed: workerResult.parsed,
    });
  } catch (err) {
    console.error("[Vibe Search Error]", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to process vibe search");
  }
};
