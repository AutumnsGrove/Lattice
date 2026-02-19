import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
  isValidSoundSet,
  isValidVolume,
  isValidUrl,
  SOUND_SET_OPTIONS,
  DEFAULT_VOLUME,
} from "$lib/curios/ambient";

interface AmbientRow {
  tenant_id: string;
  sound_set: string;
  volume: number;
  enabled: number;
  custom_url: string | null;
  updated_at: string;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
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

export const actions: Actions = {
  save: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();

    const soundSetRaw = formData.get("soundSet") as string;
    const soundSet = isValidSoundSet(soundSetRaw) ? soundSetRaw : "forest-rain";

    const volumeRaw = parseInt(formData.get("volume") as string, 10);
    const volume = isValidVolume(volumeRaw) ? volumeRaw : DEFAULT_VOLUME;

    const enabled = formData.get("enabled") === "on" ? 1 : 0;

    const customUrl = (formData.get("customUrl") as string)?.trim() || null;
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
