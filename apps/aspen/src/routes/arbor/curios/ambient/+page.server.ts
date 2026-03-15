import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { z } from "zod";
import { ARBOR_ERRORS, logGroveError } from "@autumnsgrove/lattice/errors";
import { parseFormData } from "@autumnsgrove/lattice/server/utils/form-data";
import {
	isValidSoundSet,
	isValidVolume,
	isValidUrl,
	SOUND_SET_OPTIONS,
	DEFAULT_VOLUME,
} from "@autumnsgrove/lattice/curios/ambient";

interface AmbientRow {
	tenant_id: string;
	sound_set: string;
	volume: number;
	enabled: number;
	custom_url: string | null;
	updated_at: string;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db || !tenantId) {
		return {
			config: null,
			soundSetOptions: SOUND_SET_OPTIONS,
			error: "Database not available",
		};
	}

	const row = await db
		.prepare(`SELECT * FROM ambient_config WHERE tenant_id = ?`)
		.bind(tenantId)
		.first<AmbientRow>()
		.catch(() => null);

	const config = row
		? {
				soundSet: row.sound_set,
				volume: row.volume,
				enabled: row.enabled === 1,
				customUrl: row.custom_url,
			}
		: null;

	return {
		config,
		soundSetOptions: SOUND_SET_OPTIONS,
	};
};

const SaveAmbientSchema = z.object({
	soundSet: z.string().optional().default("forest-rain"),
	volume: z.string().optional().default("50"),
	enabled: z.string().optional(),
	customUrl: z.string().optional().default(""),
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
		const parsed = parseFormData(formData, SaveAmbientSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const d = parsed.data;

		const soundSet = isValidSoundSet(d.soundSet) ? d.soundSet : "forest-rain";
		const volumeRaw = parseInt(d.volume, 10);
		const volume = isValidVolume(volumeRaw) ? volumeRaw : DEFAULT_VOLUME;
		const enabled = d.enabled === "on" ? 1 : 0;
		const customUrl = d.customUrl?.trim() || null;
		if (customUrl && !isValidUrl(customUrl)) {
			return fail(400, {
				error: "Invalid custom audio URL",
				error_code: "INVALID_URL",
			});
		}

		try {
			await db
				.prepare(
					`INSERT INTO ambient_config (tenant_id, sound_set, volume, enabled, custom_url, updated_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(tenant_id) DO UPDATE SET
             sound_set = excluded.sound_set,
             volume = excluded.volume,
             enabled = excluded.enabled,
             custom_url = excluded.custom_url,
             updated_at = datetime('now')`,
				)
				.bind(tenantId, soundSet, volume, enabled, customUrl)
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
