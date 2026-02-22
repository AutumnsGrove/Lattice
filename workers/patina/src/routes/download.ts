/**
 * GET /download/:date/:db
 *
 * Downloads a specific backup file from R2.
 */

import type { Context } from "hono";
import type { Env } from "../types";

export async function downloadHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
	const date = c.req.param("date");
	const db = c.req.param("db");

	if (!date || !db) {
		return c.json({ error: "Missing date or database parameter" }, 400);
	}

	// Construct R2 key
	const r2Key = `${date}/${db}.sql`;

	// Fetch from R2
	const object = await c.env.BACKUPS.get(r2Key);

	if (!object) {
		return c.json({ error: `Backup not found: ${r2Key}` }, 404);
	}

	// Return as downloadable SQL file
	return new Response(object.body, {
		headers: {
			"Content-Type": "application/sql",
			"Content-Disposition": `attachment; filename="${db}-${date}.sql"`,
			"Content-Length": object.size.toString(),
		},
	});
}
