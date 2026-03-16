/**
 * Turnstile Verification Endpoint (Shade)
 *
 * POST /api/verify/turnstile
 *
 * Validates a Turnstile token and sets a verification cookie.
 * Cookie lasts 30 days, shared across all *.grove.place subdomains.
 */

import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
	verifyTurnstileToken,
	createVerificationCookie,
	TURNSTILE_COOKIE_NAME,
	TURNSTILE_COOKIE_MAX_AGE,
} from "@autumnsgrove/lattice/server/services/turnstile";
import { createThreshold } from "@autumnsgrove/lattice/threshold/factory";
import { thresholdCheck } from "@autumnsgrove/lattice/threshold/adapters/sveltekit";
import { getClientIP } from "@autumnsgrove/lattice/threshold/adapters/worker";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";

export const POST: RequestHandler = async ({ request, platform }) => {
	// Get the token from the request body
	let token: string;

	try {
		const body = (await request.json()) as Record<string, unknown>;
		token = body.token as string;
	} catch {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
	}

	if (!token) {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	// Rate limit Turnstile verification (each call hits Cloudflare API)
	const threshold = createThreshold(platform?.env);
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: `turnstile:${getClientIP(request)}`,
			limit: 10,
			windowSeconds: 60, // 1 minute
			failMode: "open",
		});
		if (denied) return denied;
	}

	// Get the secret key from environment
	const secretKey = (platform?.env as Record<string, unknown>)?.TURNSTILE_SECRET_KEY as
		| string
		| undefined;

	if (!secretKey) {
		console.error("Turnstile: TURNSTILE_SECRET_KEY not configured");
		throwGroveError(500, API_ERRORS.TURNSTILE_NOT_CONFIGURED, "API");
	}

	// Get the user's IP for additional validation
	const remoteip =
		request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || undefined;

	// Verify the token with Cloudflare
	const result = await verifyTurnstileToken({
		token,
		secretKey,
		remoteip,
	});

	if (!result.success) {
		console.warn("Turnstile verification failed:", result["error-codes"]);
		throwGroveError(403, API_ERRORS.HUMAN_VERIFICATION_FAILED, "API");
	}

	// Create the verification cookie
	const cookieValue = await createVerificationCookie(secretKey);

	// Build Set-Cookie header manually to ensure it's correct
	// Format: name=value; Path=/; Max-Age=<30 days>; HttpOnly; Secure; SameSite=Lax; Domain=.grove.place
	const cookieHeader = [
		`${TURNSTILE_COOKIE_NAME}=${cookieValue}`,
		"Path=/",
		`Max-Age=${TURNSTILE_COOKIE_MAX_AGE}`, // 30 days
		"HttpOnly",
		"Secure",
		"SameSite=Lax",
		"Domain=grove.place", // No leading dot - modern browsers handle this correctly
	].join("; ");

	return new Response(
		JSON.stringify({
			success: true,
			message: "Verification successful",
		}),
		{
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Set-Cookie": cookieHeader,
			},
		},
	);
};
