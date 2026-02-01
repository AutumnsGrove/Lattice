import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { validFontIds } from "$lib/ui/tokens/fonts";

export const prerender = false;

interface SettingsBody {
  setting_key: string;
  setting_value: string;
}

/**
 * Admin endpoint to update site settings
 */
export const PUT: RequestHandler = async ({ request, platform, locals }) => {
  // Authentication check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  // Use the correct D1 database binding (multi-tenant architecture)
  const db = platform?.env?.DB;
  if (!db) {
    throw error(500, "Database not configured");
  }

  // Require tenant context for settings
  if (!locals.tenantId) {
    throw error(401, "Tenant context required");
  }

  try {
    // Verify tenant ownership
    const tenantId = await getVerifiedTenantId(
      db,
      locals.tenantId,
      locals.user,
    );
    const body = sanitizeObject(await request.json()) as SettingsBody;
    const { setting_key, setting_value } = body;

    // Validate required fields
    if (!setting_key || typeof setting_key !== "string") {
      throw error(400, "Missing or invalid setting_key");
    }

    if (setting_value === undefined || setting_value === null) {
      throw error(400, "Missing setting_value");
    }

    // Whitelist allowed settings to prevent arbitrary data injection
    const allowedSettings = ["font_family", "accent_color", "show_grove_logo"];
    if (!allowedSettings.includes(setting_key)) {
      throw error(400, "Invalid setting key");
    }

    // Validate show_grove_logo (boolean string)
    if (setting_key === "show_grove_logo") {
      if (setting_value !== "true" && setting_value !== "false") {
        throw error(400, "Invalid value for show_grove_logo");
      }
    }

    // Validate accent_color (hex format)
    if (setting_key === "accent_color") {
      // Allow 3, 4, 6, or 8 digit hex colors with # prefix
      const hexColorRegex =
        /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
      if (!hexColorRegex.test(setting_value)) {
        throw error(400, "Invalid color format. Use hex format like #16a34a");
      }
    }

    // Validate font_family value against canonical font list
    if (setting_key === "font_family") {
      if (!validFontIds.includes(setting_value)) {
        throw error(400, "Invalid font value");
      }
    }

    const now = Math.floor(Date.now() / 1000);

    // Upsert the setting (scoped to tenant)
    await db
      .prepare(
        `
      INSERT INTO site_settings (tenant_id, setting_key, setting_value, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(tenant_id, setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = excluded.updated_at
    `,
      )
      .bind(tenantId, setting_key, setting_value, now)
      .run();

    return json({
      success: true,
      setting_key,
      setting_value,
      updated_at: now,
    });
  } catch (err) {
    if (err instanceof Error && "status" in err) throw err;
    console.error("Settings update error:", err);
    throw error(500, "Failed to update setting");
  }
};
