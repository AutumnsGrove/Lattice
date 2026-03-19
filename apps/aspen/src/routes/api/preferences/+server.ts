import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * PUT /api/preferences
 * Proxy preference updates to Heartwood's /user/preferences endpoint.
 * Forwards the session cookie so Heartwood authenticates the user.
 */
export const PUT: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	const authBinding = platform?.env?.AUTH;
	if (!authBinding) {
		return json({ error: "Auth service unavailable" }, { status: 503 });
	}

	const body = await request.text();

	const response = await authBinding.fetch("https://login.grove.place/user/preferences", {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Cookie: request.headers.get("Cookie") || "",
		},
		body,
	});

	const result = await response.json();
	return json(result, { status: response.status });
};
