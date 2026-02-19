/**
 * Legacy ExportJob Durable Object (stub for migration)
 *
 * This class is kept for backward compatibility during migration.
 * New exports use ExportJobV2 with SQLite storage.
 * Can be deleted after migration v5.
 */

import { DurableObject } from "cloudflare:workers";
import type { Env } from "../index";

export class ExportJob extends DurableObject<Env> {
	async fetch(_request: Request): Promise<Response> {
		return new Response(
			JSON.stringify({
				error: "This DO class is deprecated. Use ExportJobV2.",
				message: "Please create a new export - old exports are no longer supported.",
			}),
			{ status: 410, headers: { "Content-Type": "application/json" } },
		);
	}
}
