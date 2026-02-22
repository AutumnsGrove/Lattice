/**
 * POST /trigger
 *
 * Manually triggers a backup job.
 */

import type { Context } from "hono";
import type { Env, TriggerRequest, TriggerResponse } from "../types";
import { DATABASES } from "../lib/databases";
import { handleScheduled } from "../scheduled";

export async function triggerHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
	const body: TriggerRequest = await c.req.json<TriggerRequest>().catch(() => ({}));

	// Filter databases if specific ones requested
	const targetDatabases = body.databases
		? DATABASES.filter((db) => body.databases?.includes(db.name))
		: DATABASES;

	if (body.databases && targetDatabases.length === 0) {
		return c.json({ error: "No valid databases specified" }, 400);
	}

	const jobId = crypto.randomUUID();

	// Start backup job asynchronously using waitUntil
	c.executionCtx.waitUntil(
		handleScheduled(
			{ scheduledTime: Date.now(), cron: "manual" } as ScheduledEvent,
			c.env,
			"manual",
		),
	);

	const response: TriggerResponse = {
		jobId,
		status: "started",
		databases: targetDatabases.length,
		message: `Backup job started for ${targetDatabases.length} database(s). Check /status for progress.`,
	};

	return c.json(response);
}
