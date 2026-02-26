/**
 * GET /sessions — Recent session history
 */

import { Hono } from "hono";
import type { Env, AppVariables } from "../types";
import { createLoftFirefly } from "../lib/firefly-factory";
import { initializeSchema } from "../lib/schema";

export const sessionsRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

sessionsRoute.get("/", async (c) => {
	await initializeSchema(c.env.DB);

	const limit = parseInt(c.req.query("limit") ?? "20", 10);
	const firefly = createLoftFirefly(c.env);
	const sessions = await firefly.getRecentSessions(Math.min(limit, 100));

	return c.json({
		success: true,
		data: {
			sessions: sessions.map(
				(s: {
					id: string;
					instanceId: string;
					provider: string;
					size?: string;
					region?: string;
					startedAt: number;
					endedAt?: number;
					durationSec?: number;
					status: string;
				}) => ({
					id: s.id,
					instanceId: s.instanceId,
					provider: s.provider,
					size: s.size,
					region: s.region,
					startedAt: s.startedAt ? new Date(s.startedAt).toISOString() : null,
					endedAt: s.endedAt ? new Date(s.endedAt).toISOString() : null,
					durationMin: s.durationSec ? Math.floor(s.durationSec / 60) : null,
					status: s.status,
				}),
			),
			total: sessions.length,
		},
	});
});
