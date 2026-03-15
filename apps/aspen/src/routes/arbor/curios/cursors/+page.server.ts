import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { z } from "zod";
import { ARBOR_ERRORS, logGroveError } from "@autumnsgrove/lattice/errors";
import { parseFormData } from "@autumnsgrove/lattice/server/utils/form-data";
import {
	isValidPreset,
	isValidTrailEffect,
	isValidTrailLength,
	isValidCursorUrl,
	CURSOR_PRESETS,
	TRAIL_EFFECT_OPTIONS,
	DEFAULT_TRAIL_LENGTH,
} from "@autumnsgrove/lattice/curios/cursors";

interface CursorRow {
	tenant_id: string;
	cursor_type: string;
	preset: string | null;
	custom_url: string | null;
	trail_enabled: number;
	trail_effect: string;
	trail_length: number;
	updated_at: string;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db || !tenantId) {
		return {
			config: null,
			cursorPresets: CURSOR_PRESETS,
			trailEffectOptions: TRAIL_EFFECT_OPTIONS,
			error: "Database not available",
		};
	}

	const row = await db
		.prepare(`SELECT * FROM cursor_config WHERE tenant_id = ?`)
		.bind(tenantId)
		.first<CursorRow>()
		.catch(() => null);

	const config = row
		? {
				cursorType: row.cursor_type,
				preset: row.preset,
				customUrl: row.custom_url,
				trailEnabled: row.trail_enabled === 1,
				trailEffect: row.trail_effect,
				trailLength: row.trail_length,
			}
		: null;

	return {
		config,
		cursorPresets: CURSOR_PRESETS,
		trailEffectOptions: TRAIL_EFFECT_OPTIONS,
	};
};

const SaveCursorSchema = z.object({
	cursorType: z.string().optional().default("preset"),
	preset: z.string().optional().default(""),
	customUrl: z.string().optional().default(""),
	trailEnabled: z.string().optional(),
	trailEffect: z.string().optional().default("sparkle"),
	trailLength: z.string().optional().default("5"),
});

export const actions: Actions = {
	save: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, SaveCursorSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const d = parsed.data;

		const cursorType = d.cursorType === "custom" ? "custom" : "preset";

		const preset = d.preset;
		if (cursorType === "preset" && preset && !isValidPreset(preset)) {
			return fail(400, {
				error: "Invalid cursor preset",
				error_code: "INVALID_PRESET",
			});
		}

		const customUrl = d.customUrl?.trim() || null;
		if (cursorType === "custom" && customUrl && !isValidCursorUrl(customUrl)) {
			return fail(400, {
				error: "Invalid custom cursor URL",
				error_code: "INVALID_URL",
			});
		}

		const trailEnabled = d.trailEnabled === "on" ? 1 : 0;
		const trailEffect = isValidTrailEffect(d.trailEffect) ? d.trailEffect : "sparkle";

		const trailLengthRaw = parseInt(d.trailLength, 10);
		const trailLength = isValidTrailLength(trailLengthRaw) ? trailLengthRaw : DEFAULT_TRAIL_LENGTH;

		try {
			await db
				.prepare(
					`INSERT INTO cursor_config (tenant_id, cursor_type, preset, custom_url, trail_enabled, trail_effect, trail_length, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(tenant_id) DO UPDATE SET
             cursor_type = excluded.cursor_type,
             preset = excluded.preset,
             custom_url = excluded.custom_url,
             trail_enabled = excluded.trail_enabled,
             trail_effect = excluded.trail_effect,
             trail_length = excluded.trail_length,
             updated_at = datetime('now')`,
				)
				.bind(
					tenantId,
					cursorType,
					preset || "leaf",
					customUrl,
					trailEnabled,
					trailEffect,
					trailLength,
				)
				.run();

			return { success: true, configSaved: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},
};
