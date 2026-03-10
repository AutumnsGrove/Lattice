/**
 * Settings API
 *
 * GET /api/settings - Get current settings
 * PUT /api/settings - Update digest schedule/timezone/recipient
 */

import { safeParseJson } from "@autumnsgrove/lattice/utils";
import { buildErrorJson } from "@autumnsgrove/lattice/errors";
import { IVY_ERRORS } from "$lib/errors";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.isOwner) {
		return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.UNAUTHORIZED)), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const env = platform?.env;
	if (!env?.DB) {
		return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.CONFIG_ERROR)), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const settings = await env.DB.prepare(
			"SELECT digest_times, digest_timezone, digest_recipient, digest_enabled, last_digest_at FROM ivy_settings LIMIT 1",
		).first();

		if (!settings) {
			return new Response(
				JSON.stringify({
					digest_times: ["08:00", "13:00", "18:00"],
					digest_timezone: "America/New_York",
					digest_recipient: null,
					digest_enabled: false,
					last_digest_at: null,
				}),
				{ headers: { "Content-Type": "application/json" } },
			);
		}

		return new Response(
			JSON.stringify({
				...settings,
				digest_times: safeParseJson<string[]>(
					settings.digest_times as string,
					["08:00", "13:00", "18:00"],
					{ context: "settings.digest_times" },
				),
				digest_enabled: Boolean(settings.digest_enabled),
			}),
			{ headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		console.error("Failed to fetch settings:", error);
		return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.FETCH_FAILED)), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};

export const PUT: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.isOwner) {
		return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.UNAUTHORIZED)), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const env = platform?.env;
	if (!env?.DB) {
		return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.CONFIG_ERROR)), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const updates: string[] = [];
		const bindings: (string | number)[] = [];

		if (body.digest_times !== undefined) {
			if (!Array.isArray(body.digest_times)) {
				return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.INVALID_DIGEST_TIMES)), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			updates.push("digest_times = ?");
			bindings.push(JSON.stringify(body.digest_times));
		}

		if (body.digest_timezone !== undefined) {
			updates.push("digest_timezone = ?");
			bindings.push(body.digest_timezone as string);
		}

		if (body.digest_recipient !== undefined) {
			updates.push("digest_recipient = ?");
			bindings.push(body.digest_recipient as string);
		}

		if (body.digest_enabled !== undefined) {
			updates.push("digest_enabled = ?");
			bindings.push(body.digest_enabled ? 1 : 0);
		}

		if (updates.length === 0) {
			return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.NO_FIELDS_TO_UPDATE)), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		await env.DB.prepare(
			`UPDATE ivy_settings SET ${updates.join(", ")} WHERE rowid = (SELECT MIN(rowid) FROM ivy_settings)`,
		)
			.bind(...bindings)
			.run();

		// If digest settings changed, update the DO schedule
		if (
			env.TRIAGE &&
			(body.digest_times || body.digest_timezone || body.digest_enabled !== undefined)
		) {
			try {
				const triageDO = env.TRIAGE;
				const doId = triageDO.idFromName("triage:owner");
				const stub = triageDO.get(doId);
				await stub.fetch(
					new Request("http://localhost/schedule", {
						method: "POST",
						body: JSON.stringify({
							times: body.digest_times,
							timezone: body.digest_timezone,
							enabled: body.digest_enabled,
						}),
					}),
				);
			} catch (err) {
				console.error("Failed to update DO schedule:", err);
			}
		}

		return new Response(JSON.stringify({ success: true }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Failed to update settings:", error);
		return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.UPDATE_FAILED)), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
