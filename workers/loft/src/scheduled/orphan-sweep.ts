/**
 * Cron: Orphan Sweep (every 6 hours)
 *
 * Uses Firefly's built-in orphan detection to find and terminate
 * Fly machines that exist but aren't tracked in D1.
 */

import type { Env } from "../types";
import { createLoftFirefly } from "../lib/firefly-factory";
import { initializeSchema } from "../lib/schema";

export async function handleOrphanSweep(env: Env, ctx: ExecutionContext): Promise<void> {
	await initializeSchema(env.DB);

	const firefly = createLoftFirefly(env);

	try {
		const orphans = await firefly.sweepOrphans(["loft"]);

		if (orphans.length > 0) {
			console.log(`[Loft] Swept ${orphans.length} orphan(s)`);

			for (const orphan of orphans) {
				await env.DB.prepare(
					`INSERT INTO loft_events (id, type, instance_id, timestamp, metadata)
					 VALUES (?, 'orphan_swept', ?, ?, ?)`,
				)
					.bind(
						crypto.randomUUID(),
						orphan.id,
						Date.now(),
						JSON.stringify({ providerServerId: orphan.providerServerId }),
					)
					.run();
			}
		}
	} catch (err) {
		console.error("[Loft] Orphan sweep failed:", err);
	}
}
