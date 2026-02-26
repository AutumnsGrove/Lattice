/**
 * POST /activity/:id — Keep-alive / report activity
 */

import { Hono } from "hono";
import type { Env, AppVariables } from "../types";
import { createLoftFirefly } from "../lib/firefly-factory";
import { initializeSchema } from "../lib/schema";

export const activityRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

activityRoute.post("/:id", async (c) => {
	await initializeSchema(c.env.DB);

	const instanceId = c.req.param("id");

	// Verify instance exists
	const firefly = createLoftFirefly(c.env);
	const instance = await firefly.getInstance(instanceId);

	if (!instance || instance.status === "terminated") {
		return c.json(
			{
				success: false,
				error: { code: "INSTANCE_NOT_FOUND", message: "Instance not found or already terminated" },
			},
			404,
		);
	}

	// Update activity timestamp
	const now = Date.now();
	await c.env.DB.prepare(
		"UPDATE loft_activity SET last_activity_at = ?, warned = 0 WHERE instance_id = ?",
	)
		.bind(now, instanceId)
		.run();

	// Report to Firefly idle detector
	firefly.reportActivity(instanceId);

	return c.json({
		success: true,
		data: { instanceId, lastActivityAt: now },
	});
});
