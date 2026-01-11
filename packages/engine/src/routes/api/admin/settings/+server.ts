import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "$lib/auth/session.js";

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
