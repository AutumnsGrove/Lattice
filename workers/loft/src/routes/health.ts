/**
 * GET /health — Public health check
 */

import type { Context } from "hono";
import type { Env, AppVariables } from "../types";

export const healthRoute = (c: Context<{ Bindings: Env; Variables: AppVariables }>) => {
	return c.json({
		status: "healthy",
		service: "grove-loft",
		version: "0.1.0",
	});
};
