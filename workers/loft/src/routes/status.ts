/**
 * GET /status — Active instance info + idle time
 */

import { Hono } from "hono";
import type { Env, AppVariables } from "../types";
import { createLoftFirefly } from "../lib/firefly-factory";
import { initializeSchema } from "../lib/schema";

export const statusRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

statusRoute.get("/", async (c) => {
	await initializeSchema(c.env.DB);

	const firefly = createLoftFirefly(c.env);
	const instances = await firefly.getActiveInstances();

	if (instances.length === 0) {
		return c.json({
			success: true,
			data: { active: false, instances: [] },
		});
	}

	// Enrich with activity data
	const enriched = await Promise.all(
		instances.map(
			async (inst: {
				id: string;
				providerServerId: string;
				status: string;
				metadata: Record<string, unknown>;
				publicIp: string;
				createdAt: number;
			}) => {
				const activity = await c.env.DB.prepare("SELECT * FROM loft_activity WHERE instance_id = ?")
					.bind(inst.id)
					.first<{
						last_activity_at: number;
						hard_cap_at: number;
						warned: number;
					}>();

				const now = Date.now();
				const idleMs = activity ? now - activity.last_activity_at : 0;
				const remainingMs = activity ? activity.hard_cap_at - now : 0;

				return {
					instanceId: inst.id,
					providerServerId: inst.providerServerId,
					status: inst.status,
					region: inst.metadata.region,
					publicIp: inst.publicIp,
					createdAt: new Date(inst.createdAt).toISOString(),
					idleMinutes: Math.floor(idleMs / 60_000),
					remainingMinutes: Math.max(0, Math.floor(remainingMs / 60_000)),
					codeServerUrl: `https://grove-loft.fly.dev`,
				};
			},
		),
	);

	return c.json({
		success: true,
		data: { active: true, instances: enriched },
	});
});
