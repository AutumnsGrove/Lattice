/**
 * Turnstile verification for Plant (Shade)
 *
 * POST /api/verify/turnstile — validates a challenge token and sets the shared
 * `grove_verified` cookie that Aspen also honours, so a human solves a challenge
 * once rather than once per app.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { PLANT_ERRORS, logPlantError } from "$lib/errors";
import { completeHumanCheck, isLocalDevOrigin, turnstileEnv } from "$lib/server/human-check";
import { createThreshold } from "@autumnsgrove/lattice/platform/threshold/factory";
import { thresholdCheck } from "@autumnsgrove/lattice/platform/threshold/sveltekit";
import { getClientIP } from "@autumnsgrove/lattice/platform/threshold/worker";

export const POST: RequestHandler = async ({ request, cookies, platform, url }) => {
	// Each call spends a Cloudflare API request, so rate limit it — same shape as
	// apps/aspen/src/routes/api/verify/turnstile.
	const threshold = createThreshold(turnstileEnv(platform) as never);
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: `turnstile:${getClientIP(request)}`,
			limit: 10,
			windowSeconds: 60,
			failMode: "open",
		});
		if (denied) return denied;
	}

	let token: string | undefined;
	try {
		const body = (await request.json()) as { token?: string };
		token = body.token;
	} catch {
		return json({ message: "Invalid request" }, { status: 400 });
	}

	if (!token) {
		return json({ message: "Missing verification token" }, { status: 400 });
	}

	const secretKey = turnstileEnv(platform).TURNSTILE_SECRET_KEY;
	if (!secretKey) {
		// Never silently pass on the dev stack — say so, and let isLocalDevOrigin
		// be the only bypass.
		if (isLocalDevOrigin(url.origin)) {
			return json({ success: true, bypassed: "local-dev" });
		}
		logPlantError(PLANT_ERRORS.TURNSTILE_NOT_CONFIGURED, {
			path: "/api/verify/turnstile",
			detail: "TURNSTILE_SECRET_KEY missing outside the dev stack",
		});
		return json({ message: "Verification is not available right now." }, { status: 503 });
	}

	const result = await completeHumanCheck(
		cookies,
		token,
		secretKey,
		request.headers.get("CF-Connecting-IP") ?? undefined,
	);

	if (!result.ok) {
		return json({ message: result.message }, { status: 400 });
	}

	return json({ success: true });
};
