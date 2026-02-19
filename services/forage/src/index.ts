/**
 * Forage Worker Entry Point
 *
 * Handles incoming requests and routes them to the appropriate Durable Object.
 * Exposes MCP-style tool endpoints for domain search operations.
 */

import type { Env, InitialQuizResponse, AuthenticatedUser } from "./types";
import { SearchJobDO } from "./durable-object";
import {
	createJobIndex,
	updateJobIndex,
	listJobs,
	getRecentJobs,
	upsertJobIndex,
} from "./job-index";
import { getProvider, type ProviderName } from "./providers";
import { VIBE_PARSE_SYSTEM_PROMPT, formatVibeParsePrompt } from "./prompts";
import { validateSession, unauthorizedResponse, getClientId } from "./auth";

// Re-export Durable Object class
export { SearchJobDO };

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// CORS headers for API access - Allow credentials for Better Auth sessions
		const corsHeaders = {
			"Access-Control-Allow-Origin": request.headers.get("origin") || "https://forage.grove.place",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Access-Control-Allow-Credentials": "true",
		};

		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			// Health check
			if (path === "/" || path === "/health") {
				return new Response(
					JSON.stringify({
						status: "ok",
						service: "forage",
						version: "0.1.0",
						environment: env.ENVIRONMENT,
					}),
					{
						headers: {
							"Content-Type": "application/json",
							...corsHeaders,
						},
					},
				);
			}

			// API routes
			if (path.startsWith("/api/")) {
				const response = await handleApiRequest(request, env, path);
				// Add CORS headers to response
				const newHeaders = new Headers(response.headers);
				Object.entries(corsHeaders).forEach(([key, value]) => {
					newHeaders.set(key, value);
				});
				return new Response(response.body, {
					status: response.status,
					headers: newHeaders,
				});
			}

			return new Response("Not found", {
				status: 404,
				headers: corsHeaders,
			});
		} catch (error) {
			console.error("Worker error:", error);
			return new Response(JSON.stringify({ error: String(error) }), {
				status: 500,
				headers: {
					"Content-Type": "application/json",
					...corsHeaders,
				},
			});
		}
	},
};

/**
 * Handle API requests with authentication
 */
async function handleApiRequest(request: Request, env: Env, path: string): Promise<Response> {
	// Parse the path: /api/{action}?job_id=xxx
	const url = new URL(request.url);
	const action = path.replace("/api/", "").split("/")[0];

	// Handle nested paths like /api/jobs/list
	const pathParts = path.replace("/api/", "").split("/");

	// Validate session for all API requests
	const sessionData = await validateSession(request);

	if (!sessionData) {
		return unauthorizedResponse();
	}

	const user: AuthenticatedUser = {
		id: sessionData.user.id,
		email: sessionData.user.email,
		name: sessionData.user.name,
		emailVerified: sessionData.user.emailVerified,
	};

	switch (action) {
		case "search":
			return handleSearch(request, env, url, user);
		case "vibe":
			return handleVibeSearch(request, env, url, user);
		case "status":
			return handleStatus(request, env, url, user);
		case "results":
			return handleResults(request, env, url, user);
		case "followup":
			return handleFollowup(request, env, url, user);
		case "resume":
			return handleResume(request, env, url, user);
		case "cancel":
			return handleCancel(request, env, url, user);
		case "stream":
			return handleStream(request, env, url, user);
		case "jobs":
			// Handle /api/jobs/list, /api/jobs/recent, /api/jobs/refresh
			if (pathParts[1] === "list") {
				return handleJobsList(request, env, url, user);
			}
			if (pathParts[1] === "recent") {
				return handleRecentJobs(request, env, url, user);
			}
			if (pathParts[1] === "refresh") {
				return handleJobsRefresh(request, env, url, user);
			}
			return handleJobs(request, env, url, user);
		case "backfill":
			return handleBackfill(request, env, url, user);
		default:
			return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
	}
}

/**
 * Start a new domain search
 * POST /api/search
 * Body: { quiz_responses: InitialQuizResponse }
 */
async function handleSearch(
	request: Request,
	env: Env,
	url: URL,
	user: AuthenticatedUser,
): Promise<Response> {
	if (request.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	const body = (await request.json()) as {
		quiz_responses: Record<string, unknown>;
	};

	if (!body.quiz_responses) {
		return new Response(JSON.stringify({ error: "Missing quiz_responses" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Use authenticated user's email as client_id
	const clientId = getClientId(user);

	// Generate job ID
	const jobId = crypto.randomUUID();

	// Write to job index first (before starting DO) so job is discoverable
	try {
		await createJobIndex(
			env.DB,
			jobId,
			clientId,
			(body.quiz_responses as { business_name?: string }).business_name,
		);
	} catch (err) {
		console.error("Failed to create job index:", err);
		// Continue anyway - DO is source of truth
	}

	// Get Durable Object stub
	const doId = env.SEARCH_JOB.idFromName(jobId);
	const stub = env.SEARCH_JOB.get(doId);

	// Forward request to DO (uses default OpenRouter provider)
	const doRequest = new Request("http://do/start", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			job_id: jobId,
			client_id: clientId,
			quiz_responses: body.quiz_responses,
		}),
	});

	return stub.fetch(doRequest);
}

/**
 * Start a vibe-based domain search (simplified interface)
 * POST /api/vibe
 * Body: { vibe_text: string }
 *
 * Parses freeform text to extract search parameters using AI.
 * Minimum 5 words required.
 */
async function handleVibeSearch(
	request: Request,
	env: Env,
	url: URL,
	user: AuthenticatedUser,
): Promise<Response> {
	if (request.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	const body = (await request.json()) as {
		vibe_text: string;
	};

	if (!body.vibe_text) {
		return new Response(JSON.stringify({ error: "Missing vibe_text" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Validate minimum 5 words
	const wordCount = body.vibe_text.trim().split(/\s+/).length;
	if (wordCount < 5) {
		return new Response(
			JSON.stringify({
				error: "vibe_text must be at least 5 words",
				word_count: wordCount,
				hint: "Tell us more about your business, project, or the vibe you're going for",
			}),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	}

	// Use AI to parse the vibe text into structured parameters
	// Default to OpenRouter for ZDR compliance
	const parseProvider = getProvider((env.DRIVER_PROVIDER as ProviderName) || "openrouter", env);

	let parsedParams: {
		business_name: string;
		domain_idea?: string;
		vibe: string;
		keywords?: string;
		tld_preferences: string[];
	};

	try {
		const parseResponse = await parseProvider.generate({
			system: VIBE_PARSE_SYSTEM_PROMPT,
			prompt: formatVibeParsePrompt(body.vibe_text),
			maxTokens: 500,
			temperature: 0.3,
		});

		// Parse the JSON response
		const content = parseResponse.content.trim();
		// Handle potential markdown code blocks
		const jsonMatch = content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("No JSON object found in response");
		}
		parsedParams = JSON.parse(jsonMatch[0]);

		// Validate required fields
		if (!parsedParams.business_name) {
			parsedParams.business_name = "My Project";
		}
		if (!parsedParams.vibe) {
			parsedParams.vibe = "professional";
		}
		if (!parsedParams.tld_preferences || !Array.isArray(parsedParams.tld_preferences)) {
			parsedParams.tld_preferences = ["any"];
		}
	} catch (err) {
		console.error("Failed to parse vibe text:", err);
		return new Response(
			JSON.stringify({
				error: "Failed to parse vibe text",
				details: String(err),
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}

	// Build quiz responses from parsed parameters
	const quizResponses: InitialQuizResponse = {
		business_name: parsedParams.business_name,
		domain_idea: parsedParams.domain_idea,
		tld_preferences: parsedParams.tld_preferences,
		vibe: parsedParams.vibe,
		keywords: parsedParams.keywords,
		diverse_tlds: true, // Default to diverse for vibe searches
		client_email: user.email,
	};

	// Use authenticated user's email as client_id
	const clientId = getClientId(user);

	// Generate job ID
	const jobId = crypto.randomUUID();

	// Write to job index first
	try {
		await createJobIndex(env.DB, jobId, clientId, parsedParams.business_name);
	} catch (err) {
		console.error("Failed to create job index:", err);
	}

	// Get Durable Object stub
	const doId = env.SEARCH_JOB.idFromName(jobId);
	const stub = env.SEARCH_JOB.get(doId);

	// Forward request to DO (uses default OpenRouter provider)
	const doRequest = new Request("http://do/start", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			job_id: jobId,
			client_id: clientId,
			quiz_responses: quizResponses,
		}),
	});

	const doResponse = await stub.fetch(doRequest);
	const doResult = await doResponse.json();

	// Return enriched response with parsed parameters for transparency
	return new Response(
		JSON.stringify({
			...(doResult as object),
			parsed: {
				business_name: parsedParams.business_name,
				vibe: parsedParams.vibe,
				keywords: parsedParams.keywords,
				tld_preferences: parsedParams.tld_preferences,
				domain_idea: parsedParams.domain_idea,
			},
		}),
		{
			status: doResponse.status,
			headers: { "Content-Type": "application/json" },
		},
	);
}

/**
 * Get search status
 * GET /api/status?job_id=xxx
 */
async function handleStatus(
	request: Request,
	env: Env,
	url: URL,
	user: AuthenticatedUser,
): Promise<Response> {
	const jobId = url.searchParams.get("job_id");
	if (!jobId) {
		return new Response(JSON.stringify({ error: "Missing job_id parameter" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const doId = env.SEARCH_JOB.idFromName(jobId);
	const stub = env.SEARCH_JOB.get(doId);

	const response = await stub.fetch(new Request("http://do/status"));

	// Sync status to job index
	if (response.ok) {
		try {
			const status = (await response.clone().json()) as {
				status?: string;
				batch_num?: number;
				domains_checked?: number;
				good_results?: number;
				input_tokens?: number;
				output_tokens?: number;
			};
			await updateJobIndex(env.DB, jobId, {
				status: status.status,
				batch_num: status.batch_num,
				domains_checked: status.domains_checked,
				good_results: status.good_results,
				input_tokens: status.input_tokens,
				output_tokens: status.output_tokens,
			});
		} catch (err) {
			console.error("Failed to sync job index:", err);
		}
	}

	return response;
}

/**
 * Get search results
 * GET /api/results?job_id=xxx
 */
async function handleResults(
	request: Request,
	env: Env,
	url: URL,
	user: AuthenticatedUser,
): Promise<Response> {
	const jobId = url.searchParams.get("job_id");
	if (!jobId) {
		return new Response(JSON.stringify({ error: "Missing job_id parameter" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const doId = env.SEARCH_JOB.idFromName(jobId);
	const stub = env.SEARCH_JOB.get(doId);

	return stub.fetch(new Request("http://do/results"));
}

/**
 * Get follow-up quiz
 * GET /api/followup?job_id=xxx
 */
async function handleFollowup(
	request: Request,
	env: Env,
	url: URL,
	user: AuthenticatedUser,
): Promise<Response> {
	const jobId = url.searchParams.get("job_id");
	if (!jobId) {
		return new Response(JSON.stringify({ error: "Missing job_id parameter" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const doId = env.SEARCH_JOB.idFromName(jobId);
	const stub = env.SEARCH_JOB.get(doId);

	return stub.fetch(new Request("http://do/followup"));
}

/**
 * Cancel a running search
 * POST /api/cancel?job_id=xxx
 */
async function handleCancel(
	request: Request,
	env: Env,
	url: URL,
	user: AuthenticatedUser,
): Promise<Response> {
	if (request.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	const jobId = url.searchParams.get("job_id");
	if (!jobId) {
		return new Response(JSON.stringify({ error: "Missing job_id parameter" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const doId = env.SEARCH_JOB.idFromName(jobId);
	const stub = env.SEARCH_JOB.get(doId);

	return stub.fetch(new Request("http://do/cancel", { method: "POST" }));
}

/**
 * Resume search with follow-up responses
 * POST /api/resume?job_id=xxx
 * Body: { followup_responses: Record<string, string | string[]> }
 */
async function handleResume(
	request: Request,
	env: Env,
	url: URL,
	user: AuthenticatedUser,
): Promise<Response> {
	if (request.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	const jobId = url.searchParams.get("job_id");
	if (!jobId) {
		return new Response(JSON.stringify({ error: "Missing job_id parameter" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const body = await request.json();

	const doId = env.SEARCH_JOB.idFromName(jobId);
	const stub = env.SEARCH_JOB.get(doId);

	return stub.fetch(
		new Request("http://do/resume", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}),
	);
}

/**
 * Stream search progress (SSE)
 * GET /api/stream?job_id=xxx
 */
async function handleStream(
	request: Request,
	env: Env,
	url: URL,
	user: AuthenticatedUser,
): Promise<Response> {
	const jobId = url.searchParams.get("job_id");
	if (!jobId) {
		return new Response(JSON.stringify({ error: "Missing job_id parameter" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const doId = env.SEARCH_JOB.idFromName(jobId);
	const stub = env.SEARCH_JOB.get(doId);

	const response = await stub.fetch(new Request("http://do/stream"));

	// Add CORS headers for SSE
	const newHeaders = new Headers(response.headers);
	newHeaders.set("Access-Control-Allow-Origin", "*");
	newHeaders.set("Access-Control-Allow-Headers", "Content-Type");

	return new Response(response.body, {
		status: response.status,
		headers: newHeaders,
	});
}

/**
 * List all jobs from D1 index
 * GET /api/jobs/list?limit=20&offset=0&status=running
 */
async function handleJobsList(
	request: Request,
	env: Env,
	url: URL,
	user: AuthenticatedUser,
): Promise<Response> {
	const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);
	const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
	const status = url.searchParams.get("status") ?? undefined;

	try {
		const result = await listJobs(env.DB, { limit, offset, status });
		return new Response(JSON.stringify(result), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		console.error("Failed to list jobs:", err);
		return new Response(JSON.stringify({ error: "Failed to list jobs" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

/**
 * Get recent jobs (convenience endpoint)
 * GET /api/jobs/recent?limit=10
 */
async function handleRecentJobs(
	request: Request,
	env: Env,
	url: URL,
	user: AuthenticatedUser,
): Promise<Response> {
	const limit = parseInt(url.searchParams.get("limit") ?? "10", 10);

	try {
		const jobs = await getRecentJobs(env.DB, limit);
		return new Response(JSON.stringify({ jobs }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		console.error("Failed to get recent jobs:", err);
		return new Response(JSON.stringify({ error: "Failed to get recent jobs" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

/**
 * Refresh job statuses from Durable Objects
 * GET /api/jobs/refresh?job_ids=id1,id2,... OR GET /api/jobs/refresh (refreshes all non-terminal jobs)
 *
 * Queries each DO in parallel for fresh status and updates the job_index.
 * Returns the refreshed job list.
 */
async function handleJobsRefresh(
	request: Request,
	env: Env,
	url: URL,
	user: AuthenticatedUser,
): Promise<Response> {
	try {
		// Get job IDs to refresh - either from query param or fetch non-terminal jobs
		let jobIds: string[];
		const jobIdsParam = url.searchParams.get("job_ids");

		if (jobIdsParam) {
			jobIds = jobIdsParam.split(",").filter((id) => id.trim());
		} else {
			// Fetch all non-terminal jobs (pending, running)
			const result = await listJobs(env.DB, { limit: 100 });
			jobIds = result.jobs
				.filter((j) => j.status !== "complete" && j.status !== "failed")
				.map((j) => j.job_id);
		}

		if (jobIds.length === 0) {
			// No jobs to refresh, return current list
			const result = await listJobs(env.DB, { limit: 100 });
			return new Response(JSON.stringify(result), {
				headers: { "Content-Type": "application/json" },
			});
		}

		// Query each DO in parallel
		const refreshResults = await Promise.allSettled(
			jobIds.map(async (jobId) => {
				const doId = env.SEARCH_JOB.idFromName(jobId);
				const stub = env.SEARCH_JOB.get(doId);
				const response = await stub.fetch(new Request("http://do/status"));

				if (!response.ok) {
					return { jobId, success: false };
				}

				const status = (await response.json()) as {
					status?: string;
					batch_num?: number;
					domains_checked?: number;
					good_results?: number;
					input_tokens?: number;
					output_tokens?: number;
				};

				// Update job index with fresh data
				await updateJobIndex(env.DB, jobId, {
					status: status.status,
					batch_num: status.batch_num,
					domains_checked: status.domains_checked,
					good_results: status.good_results,
					input_tokens: status.input_tokens,
					output_tokens: status.output_tokens,
				});

				return { jobId, success: true, status: status.status };
			}),
		);

		const refreshed = refreshResults.filter(
			(r) => r.status === "fulfilled" && r.value.success,
		).length;

		// Return updated job list
		const result = await listJobs(env.DB, { limit: 100 });
		return new Response(
			JSON.stringify({
				...result,
				refreshed,
				total_attempted: jobIds.length,
			}),
			{ headers: { "Content-Type": "application/json" } },
		);
	} catch (err) {
		console.error("Failed to refresh jobs:", err);
		return new Response(JSON.stringify({ error: "Failed to refresh jobs" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

/**
 * Query multiple jobs at once
 * POST /api/jobs
 * Body: { job_ids: string[] }
 * Returns status and results for each job that exists
 * If job_ids is empty, returns all jobs from the index
 */
async function handleJobs(
	request: Request,
	env: Env,
	url: URL,
	user: AuthenticatedUser,
): Promise<Response> {
	if (request.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	const body = (await request.json()) as { job_ids?: string[] };
	const jobIds = body.job_ids || [];

	// If no job_ids provided, return all from index
	if (!Array.isArray(jobIds) || jobIds.length === 0) {
		try {
			const result = await listJobs(env.DB, { limit: 50 });
			return new Response(JSON.stringify({ jobs: result.jobs }), {
				headers: { "Content-Type": "application/json" },
			});
		} catch (err) {
			console.error("Failed to list jobs from index:", err);
			return new Response(JSON.stringify({ error: "Failed to list jobs" }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}
	}

	// Limit to 50 jobs per request to prevent abuse
	const limitedJobIds = jobIds.slice(0, 50);

	// Query each DO in parallel
	const results = await Promise.all(
		limitedJobIds.map(async (jobId) => {
			try {
				const doId = env.SEARCH_JOB.idFromName(jobId);
				const stub = env.SEARCH_JOB.get(doId);
				const response = await stub.fetch(new Request("http://do/status"));

				if (!response.ok) {
					return { job_id: jobId, exists: false };
				}

				const status = (await response.json()) as Record<string, unknown>;
				return { job_id: jobId, exists: true, ...status };
			} catch {
				return { job_id: jobId, exists: false, error: "Failed to query" };
			}
		}),
	);

	return new Response(JSON.stringify({ jobs: results }), {
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * Backfill job index from existing DOs
 * POST /api/backfill
 * Body: { job_ids: string[] }
 *
 * For each job_id, queries the DO for status and upserts into the job_index.
 * This is used to populate the index with existing jobs.
 */
async function handleBackfill(
	request: Request,
	env: Env,
	url: URL,
	user: AuthenticatedUser,
): Promise<Response> {
	if (request.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	const body = (await request.json()) as { job_ids?: string[] };
	const jobIds = body.job_ids || [];

	if (!Array.isArray(jobIds) || jobIds.length === 0) {
		return new Response(JSON.stringify({ error: "job_ids array is required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Limit to 100 jobs per request
	const limitedJobIds = jobIds.slice(0, 100);

	let success = 0;
	let failed = 0;

	for (const jobId of limitedJobIds) {
		try {
			// Query DO for status
			const doId = env.SEARCH_JOB.idFromName(jobId);
			const stub = env.SEARCH_JOB.get(doId);
			const response = await stub.fetch(new Request("http://do/status"));

			if (!response.ok) {
				failed++;
				continue;
			}

			const status = (await response.json()) as {
				client_id?: string;
				status?: string;
				business_name?: string;
				batch_num?: number;
				domains_checked?: number;
				good_results?: number;
				input_tokens?: number;
				output_tokens?: number;
			};

			// Upsert into job_index
			await upsertJobIndex(env.DB, jobId, {
				client_id: status.client_id || "unknown",
				status: status.status || "unknown",
				business_name: status.business_name,
				batch_num: status.batch_num,
				domains_checked: status.domains_checked,
				good_results: status.good_results,
				input_tokens: status.input_tokens,
				output_tokens: status.output_tokens,
			});

			success++;
		} catch {
			failed++;
		}
	}

	return new Response(
		JSON.stringify({
			success: true,
			backfilled: success,
			failed,
			total: limitedJobIds.length,
		}),
		{ headers: { "Content-Type": "application/json" } },
	);
}
