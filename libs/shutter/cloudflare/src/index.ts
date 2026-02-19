/**
 * Shutter Worker - Cloudflare Workers entry point
 *
 * HTTP API for web content extraction with prompt injection defense.
 * Mirrors the Python implementation but runs on Cloudflare's edge network.
 *
 * Endpoints:
 * - POST /fetch, /extract - Main extraction endpoint
 * - GET /offenders - List flagged domains
 * - DELETE /offenders - Clear offenders list
 * - GET /health - Health check
 */

import type { Env, ShutterRequest, ShutterResponse, PromptInjectionDetails } from "./types";
import { DEFAULTS } from "./types";
import { canaryCheck } from "./canary";
import { fetchUrl, extractDomain, FetchError } from "./fetch";
import { extractContent } from "./extraction";
import { shouldSkipFetch, addOffender, listOffenders, clearOffenders } from "./database";

// ============================================================================
// Response Helpers
// ============================================================================

/** CORS headers for all responses */
const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Create a JSON response with CORS headers
 */
function jsonResponse(data: unknown, status: number = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
			...CORS_HEADERS,
		},
	});
}

/**
 * Create an error response
 */
function errorResponse(status: number, message: string): Response {
	return jsonResponse({ error: message }, status);
}

/**
 * Create a ShutterResponse for injection/error cases
 */
function injectionResponse(
	url: string,
	tokensInput: number,
	injection: PromptInjectionDetails,
): ShutterResponse {
	return {
		url,
		extracted: null,
		tokensInput,
		tokensOutput: 0,
		modelUsed: "",
		promptInjection: injection,
	};
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * Handle extraction requests (POST /fetch or /extract)
 */
async function handleExtract(request: Request, env: Env): Promise<Response> {
	// Parse request body
	let body: ShutterRequest;
	try {
		body = await request.json();
	} catch {
		return errorResponse(400, "Invalid JSON body");
	}

	// Validate required fields
	if (!body.url || !body.query) {
		return errorResponse(400, "Missing required fields: url, query");
	}

	// Extract domain and check offenders list
	const domain = extractDomain(body.url);
	if (await shouldSkipFetch(env.DB, domain)) {
		return jsonResponse(
			injectionResponse(body.url, 0, {
				detected: true,
				type: "domain_blocked",
				snippet: `Domain ${domain} is on offenders list`,
				domainFlagged: true,
				confidence: 0.9,
				signals: ["domain_blocked:0.90"],
			}),
		);
	}

	// Fetch URL content
	let content: string;
	try {
		content = await fetchUrl(body.url, env.TAVILY_API_KEY, body.timeout ?? DEFAULTS.TIMEOUT);
	} catch (err) {
		if (err instanceof FetchError) {
			return jsonResponse(
				injectionResponse(body.url, 0, {
					detected: true,
					type: "fetch_error",
					snippet: err.reason,
					domainFlagged: false,
					confidence: 0,
					signals: [],
				}),
			);
		}
		throw err;
	}

	// Check content length
	if (content.length < 100) {
		return jsonResponse(
			injectionResponse(body.url, 0, {
				detected: true,
				type: "empty_content",
				snippet: "Page returned insufficient content",
				domainFlagged: false,
				confidence: 0,
				signals: [],
			}),
		);
	}

	// Run canary check
	const injection = await canaryCheck(content, body.query, env.OPENROUTER_API_KEY);

	if (injection) {
		await addOffender(env.DB, domain, injection.type, injection.confidence);
		return jsonResponse(
			injectionResponse(body.url, Math.floor(content.length / 4), {
				...injection,
				domainFlagged: true,
			}),
		);
	}

	// Run full extraction
	try {
		const result = await extractContent(
			content,
			body.query,
			env.OPENROUTER_API_KEY,
			body.model ?? DEFAULTS.MODEL,
			body.maxTokens ?? DEFAULTS.MAX_TOKENS,
			body.extendedQuery,
		);

		const response: ShutterResponse = {
			url: body.url,
			extracted: result.extracted,
			tokensInput: result.tokensInput,
			tokensOutput: result.tokensOutput,
			modelUsed: result.modelUsed,
			promptInjection: null,
		};

		return jsonResponse(response);
	} catch (err) {
		return errorResponse(
			500,
			`Extraction failed: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
	}
}

/**
 * Handle offenders list requests (GET/DELETE /offenders)
 */
async function handleOffenders(request: Request, env: Env): Promise<Response> {
	if (request.method === "GET") {
		const offenders = await listOffenders(env.DB);
		return jsonResponse({ offenders, count: offenders.length });
	}

	if (request.method === "DELETE") {
		await clearOffenders(env.DB);
		return jsonResponse({ message: "Offenders list cleared" });
	}

	return errorResponse(405, "Method not allowed");
}

/**
 * Handle health check (GET /health)
 */
function handleHealth(): Response {
	return new Response("OK", {
		status: 200,
		headers: CORS_HEADERS,
	});
}

// ============================================================================
// Worker Entry Point
// ============================================================================

export default {
	async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, { headers: CORS_HEADERS });
		}

		try {
			// Route requests
			switch (url.pathname) {
				case "/fetch":
				case "/extract":
					if (request.method !== "POST") {
						return errorResponse(405, "Use POST for extraction");
					}
					return handleExtract(request, env);

				case "/offenders":
					return handleOffenders(request, env);

				case "/health":
					return handleHealth();

				case "/":
					return jsonResponse({
						name: "Shutter",
						version: "1.5.0",
						description: "Web content extraction with prompt injection defense",
						endpoints: {
							"POST /fetch": "Extract content from URL",
							"POST /extract": "Alias for /fetch",
							"GET /offenders": "List flagged domains",
							"DELETE /offenders": "Clear offenders list",
							"GET /health": "Health check",
						},
					});

				default:
					return errorResponse(404, "Not found");
			}
		} catch (err) {
			console.error("Unhandled error:", err);
			return errorResponse(
				500,
				`Internal error: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		}
	},
};
