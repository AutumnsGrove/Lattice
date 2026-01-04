import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeObject } from "$lib/utils/validation.js";

export const prerender = false;

/**
 * Admin endpoint to update site settings
 * @type {import('./$types').RequestHandler}
 */
export async function PUT({ request, platform, locals }) {
  // Authentication check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  const db = /** @type {any} */ (platform?.env)?.GIT_STATS_DB;
  if (!db) {
    throw error(500, "Database not configured");
  }

  try {
    const body = sanitizeObject(await request.json());
    const { setting_key, setting_value } = body;

    // Validate required fields
    if (!setting_key || typeof setting_key !== "string") {
      throw error(400, "Missing or invalid setting_key");
    }

    if (setting_value === undefined || setting_value === null) {
      throw error(400, "Missing setting_value");
    }

    // Whitelist allowed settings to prevent arbitrary data injection
    const allowedSettings = ["font_family"];
    if (!allowedSettings.includes(setting_key)) {
      throw error(400, "Invalid setting key");
    }

    // Validate font_family value specifically
    if (setting_key === "font_family") {
      const validFonts = [
        // Default
        "lexend",
        // Accessibility
        "atkinson",
        "opendyslexic",
        // Sans-serif
        "quicksand",
        "plus-jakarta-sans",
        // Monospace
        "ibm-plex-mono",
        "cozette",
        // Display/Special
        "alagard",
        "calistoga",
        "caveat",
      ];
      if (!validFonts.includes(setting_value)) {
        throw error(400, "Invalid font value");
      }
    }

    const now = Math.floor(Date.now() / 1000);

    // Upsert the setting
    await db
      .prepare(
        `
      INSERT INTO site_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = excluded.updated_at
    `,
      )
      .bind(setting_key, setting_value, now)
      .run();

    return json({
      success: true,
      setting_key,
      setting_value,
      updated_at: now,
    });
  } catch (err) {
    if (err instanceof Error && 'status' in err) throw err;
    console.error("Settings update error:", err);
    throw error(500, "Failed to update setting");
  }
}
