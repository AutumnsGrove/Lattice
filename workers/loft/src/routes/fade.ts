/**
 * POST /fade/:id — Terminate a machine
 */

import { Hono } from "hono";
import type { Env, AppVariables } from "../types";
import { createLoftFirefly } from "../lib/firefly-factory";
import { initializeSchema } from "../lib/schema";

export const fadeRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

fadeRoute.post("/:id", async (c) => {
	await initializeSchema(c.env.DB);

	const instanceId = c.req.param("id");

	const firefly = createLoftFirefly(c.env);

	await firefly.fade(instanceId, { stateKey: "default" });

	// Clean up activity record
	await c.env.DB.prepare("DELETE FROM loft_activity WHERE instance_id = ?").bind(instanceId).run();

	// Log event
	await c.env.DB.prepare(
		`INSERT INTO loft_events (id, type, instance_id, timestamp, metadata)
		 VALUES (?, 'fade', ?, ?, '{}')`,
	)
		.bind(crypto.randomUUID(), instanceId, Date.now())
		.run();

	return c.json({
		success: true,
		data: { instanceId, status: "terminated" },
	});
});
