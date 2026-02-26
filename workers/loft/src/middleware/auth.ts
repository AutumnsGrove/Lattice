/**
 * Bearer Token Authentication Middleware
 *
 * Single-user auth: validates Authorization header against LOFT_API_KEY.
 * Health route is excluded (handled before this middleware).
 */

import { createMiddleware } from "hono/factory";
import type { Env, AppVariables } from "../types";

export const authMiddleware = createMiddleware<{
	Bindings: Env;
	Variables: AppVariables;
}>(async (c, next) => {
	const authHeader = c.req.header("Authorization");

	if (!authHeader?.startsWith("Bearer ")) {
		return c.json(
			{
				success: false,
				error: { code: "AUTH_REQUIRED", message: "Bearer token required" },
			},
			401,
		);
	}

	const token = authHeader.slice(7);

	if (token !== c.env.LOFT_API_KEY) {
		return c.json(
			{
				success: false,
				error: { code: "AUTH_FAILED", message: "Invalid API key" },
			},
			401,
		);
	}

	c.set("authenticated", true);
	await next();
});
