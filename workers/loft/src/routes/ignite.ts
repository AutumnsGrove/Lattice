/**
 * POST /ignite — Provision a new dev environment
 */

import { Hono } from "hono";
import type { Env, AppVariables } from "../types";
import { createLoftFirefly } from "../lib/firefly-factory";
import { buildMachineConfig } from "../lib/machine-config";
import { initializeSchema } from "../lib/schema";

export const igniteRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

igniteRoute.post("/", async (c) => {
	await initializeSchema(c.env.DB);

	// Read SSH key from config
	const sshKeyRow = await c.env.DB.prepare(
		"SELECT value FROM loft_config WHERE key = 'ssh_public_key'",
	).first<{ value: string }>();

	if (!sshKeyRow?.value) {
		return c.json(
			{
				success: false,
				error: {
					code: "SSH_KEY_MISSING",
					message: "No SSH key configured — run: gw loft ssh-key set --write",
				},
			},
			400,
		);
	}

	// Generate secrets for this session
	const codeServerPassword = crypto.randomUUID().slice(0, 16);
	const fireflyAgentSecret = crypto.randomUUID();

	// Build machine config
	const machineConfig = buildMachineConfig({
		sshPublicKey: sshKeyRow.value,
		codeServerPassword,
		fireflyAgentSecret,
	});

	// Create Firefly orchestrator
	const firefly = createLoftFirefly(c.env);

	// Ignite
	const instance = await firefly.ignite({
		...machineConfig,
		stateKey: "default",
		metadata: {
			codeServerPassword,
			fireflyAgentSecret,
		},
	});

	// Record activity for idle tracking
	const now = Date.now();
	const hardCapAt = now + 8 * 60 * 60_000; // 8 hour hard cap
	await c.env.DB.prepare(
		`INSERT OR REPLACE INTO loft_activity
		 (instance_id, last_activity_at, hard_cap_at, warned)
		 VALUES (?, ?, ?, 0)`,
	)
		.bind(instance.id, now, hardCapAt)
		.run();

	// Log event
	await c.env.DB.prepare(
		`INSERT INTO loft_events (id, type, instance_id, timestamp, metadata)
		 VALUES (?, 'ignite', ?, ?, ?)`,
	)
		.bind(
			crypto.randomUUID(),
			instance.id,
			now,
			JSON.stringify({ region: instance.metadata.region }),
		)
		.run();

	const appDomain = `grove-loft.fly.dev`;

	return c.json({
		success: true,
		data: {
			instanceId: instance.id,
			providerServerId: instance.providerServerId,
			codeServerUrl: `https://${appDomain}`,
			codeServerPassword,
			sshHost: appDomain,
			sshUser: "grove",
			status: instance.status,
			region: instance.metadata.region,
			hardCapAt: new Date(hardCapAt).toISOString(),
		},
	});
});
