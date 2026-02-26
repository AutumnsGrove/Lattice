/**
 * GET/PUT /config/ssh-key — SSH key management
 */

import { Hono } from "hono";
import type { Env, AppVariables } from "../types";
import { initializeSchema } from "../lib/schema";

export const configRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// GET /config/ssh-key
configRoute.get("/ssh-key", async (c) => {
	await initializeSchema(c.env.DB);

	const row = await c.env.DB.prepare(
		"SELECT value FROM loft_config WHERE key = 'ssh_public_key'",
	).first<{ value: string }>();

	return c.json({
		success: true,
		data: { sshKey: row?.value ?? null },
	});
});

// PUT /config/ssh-key
configRoute.put("/ssh-key", async (c) => {
	await initializeSchema(c.env.DB);

	const body = (await c.req.json()) as Record<string, unknown>;
	const sshKey = body.ssh_key as string | undefined;

	if (!sshKey || typeof sshKey !== "string") {
		return c.json(
			{
				success: false,
				error: { code: "INVALID_KEY", message: "ssh_key field is required (string)" },
			},
			400,
		);
	}

	// Basic SSH key format validation
	if (!sshKey.startsWith("ssh-") && !sshKey.startsWith("ecdsa-")) {
		return c.json(
			{
				success: false,
				error: {
					code: "INVALID_KEY_FORMAT",
					message: "SSH key must start with ssh-rsa, ssh-ed25519, or similar",
				},
			},
			400,
		);
	}

	await c.env.DB.prepare(
		"INSERT OR REPLACE INTO loft_config (key, value, updated_at) VALUES ('ssh_public_key', ?, ?)",
	)
		.bind(sshKey, Date.now())
		.run();

	return c.json({
		success: true,
		data: { stored: true },
	});
});
