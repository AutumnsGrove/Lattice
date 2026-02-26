/**
 * Cron: Idle Check (every 2 minutes)
 *
 * For each active instance:
 * 1. Poll the firefly-agent /firefly/activity endpoint
 * 2. Update D1 activity records
 * 3. Warn at 25 minutes idle
 * 4. Auto-fade at 30 minutes idle
 * 5. Enforce 8-hour hard cap
 */

import type { Env } from "../types";
import { createLoftFirefly } from "../lib/firefly-factory";
import { initializeSchema } from "../lib/schema";

const IDLE_THRESHOLD_MS = 30 * 60_000; // 30 minutes
const WARNING_THRESHOLD_MS = 25 * 60_000; // 25 minutes

export async function handleIdleCheck(env: Env, ctx: ExecutionContext): Promise<void> {
	await initializeSchema(env.DB);

	const firefly = createLoftFirefly(env);
	const instances = await firefly.getActiveInstances();

	if (instances.length === 0) return;

	for (const instance of instances) {
		try {
			// Fetch activity from the agent
			const agentSecret = instance.metadata.fireflyAgentSecret as string | undefined;
			const agentUrl = `https://grove-loft.fly.dev/firefly/activity`;

			try {
				const resp = await fetch(agentUrl, {
					headers: agentSecret ? { "X-Firefly-Secret": agentSecret } : {},
				});

				if (resp.ok) {
					const data = (await resp.json()) as {
						lastActivity: number;
						sshSessions: number;
						codeServerClients: number;
					};

					// If there's active usage, update activity
					if (data.sshSessions > 0 || data.codeServerClients > 0) {
						await env.DB.prepare(
							"UPDATE loft_activity SET last_activity_at = ?, warned = 0 WHERE instance_id = ?",
						)
							.bind(Date.now(), instance.id)
							.run();
						firefly.reportActivity(instance.id);
						continue; // Skip idle checks — actively in use
					}
				}
			} catch {
				// Agent unreachable — use last known activity
			}

			// Check idle duration from D1
			const activity = await env.DB.prepare("SELECT * FROM loft_activity WHERE instance_id = ?")
				.bind(instance.id)
				.first<{
					last_activity_at: number;
					hard_cap_at: number;
					warned: number;
				}>();

			if (!activity) continue;

			const now = Date.now();
			const idleMs = now - activity.last_activity_at;

			// Hard cap enforcement (8 hours)
			if (now >= activity.hard_cap_at) {
				console.log(`[Loft] Hard cap reached for ${instance.id} — fading`);
				await firefly.fade(instance.id, { stateKey: "default" });
				await env.DB.prepare("DELETE FROM loft_activity WHERE instance_id = ?")
					.bind(instance.id)
					.run();
				await env.DB.prepare(
					`INSERT INTO loft_events (id, type, instance_id, timestamp, metadata)
					 VALUES (?, 'hard_cap_fade', ?, ?, '{}')`,
				)
					.bind(crypto.randomUUID(), instance.id, now)
					.run();
				continue;
			}

			// Idle auto-fade (30 min)
			if (idleMs >= IDLE_THRESHOLD_MS) {
				console.log(`[Loft] Idle threshold reached for ${instance.id} — fading`);
				await firefly.fade(instance.id, { stateKey: "default" });
				await env.DB.prepare("DELETE FROM loft_activity WHERE instance_id = ?")
					.bind(instance.id)
					.run();
				await env.DB.prepare(
					`INSERT INTO loft_events (id, type, instance_id, timestamp, metadata)
					 VALUES (?, 'idle_fade', ?, ?, ?)`,
				)
					.bind(
						crypto.randomUUID(),
						instance.id,
						now,
						JSON.stringify({ idleMinutes: Math.floor(idleMs / 60_000) }),
					)
					.run();
				continue;
			}

			// Idle warning (25 min)
			if (idleMs >= WARNING_THRESHOLD_MS && !activity.warned) {
				console.log(`[Loft] Idle warning for ${instance.id} (${Math.floor(idleMs / 60_000)}min)`);
				await env.DB.prepare("UPDATE loft_activity SET warned = 1 WHERE instance_id = ?")
					.bind(instance.id)
					.run();
				await env.DB.prepare(
					`INSERT INTO loft_events (id, type, instance_id, timestamp, metadata)
					 VALUES (?, 'idle_warning', ?, ?, ?)`,
				)
					.bind(
						crypto.randomUUID(),
						instance.id,
						now,
						JSON.stringify({ idleMinutes: Math.floor(idleMs / 60_000) }),
					)
					.run();
			}
		} catch (err) {
			console.error(`[Loft] Idle check failed for ${instance.id}:`, err);
		}
	}
}
