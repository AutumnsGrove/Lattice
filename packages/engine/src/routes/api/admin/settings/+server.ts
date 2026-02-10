import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { validFontIds } from "$lib/ui/tokens/fonts";
import { API_ERRORS, throwGroveError } from "$lib/errors";

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
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
  }

  // Use the correct D1 database binding (multi-tenant architecture)
  const db = platform?.env?.DB;
  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  // Require tenant context for settings
  if (!locals.tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  try {
    // Verify tenant ownership
    const tenantId = await getVerifiedTenantId(
      db,
      locals.tenantId,
      locals.user,
    );
    const body = sanitizeObject(await request.json()) as SettingsBody;
    const { setting_key } = body;
    let { setting_value } = body;

    // Validate required fields
    if (!setting_key || typeof setting_key !== "string") {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }

    if (setting_value === undefined || setting_value === null) {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }

    // Whitelist allowed settings to prevent arbitrary data injection
    const allowedSettings = [
      "font_family",
      "accent_color",
      "show_grove_logo",
      "grove_title",
      "canopy_visible",
      "canopy_banner",
      "canopy_categories",
      "canopy_show_forests",
    ];
    if (!allowedSettings.includes(setting_key)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }

    // Validate show_grove_logo (boolean string)
    if (setting_key === "show_grove_logo") {
      if (setting_value !== "true" && setting_value !== "false") {
        throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
      }
    }

    // Validate grove_title (max 50 chars, store trimmed)
    if (setting_key === "grove_title") {
      if (typeof setting_value !== "string") {
        throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
      }
      setting_value = setting_value.trim();
      if (setting_value.length > 50) {
        throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
      }
    }

    // Validate accent_color (hex format)
    if (setting_key === "accent_color") {
      // Allow 3, 4, 6, or 8 digit hex colors with # prefix
      const hexColorRegex =
        /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
      if (!hexColorRegex.test(setting_value)) {
        throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
      }
    }

    // Validate font_family value against canonical font list
    if (setting_key === "font_family") {
      if (!validFontIds.includes(setting_value)) {
        throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
      }
    }

    // Validate canopy_visible (boolean string)
    if (setting_key === "canopy_visible") {
      if (setting_value !== "true" && setting_value !== "false") {
        throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
      }
    }

    // Validate canopy_banner (max 160 chars)
    if (setting_key === "canopy_banner") {
      if (setting_value.length > 160) {
        throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
      }
    }

    // Validate canopy_categories (valid JSON array of valid categories)
    if (setting_key === "canopy_categories") {
      try {
        const parsed = JSON.parse(setting_value);
        if (!Array.isArray(parsed)) {
          throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
        }
        // Import from centralized config to ensure consistency
        const { CANOPY_CATEGORIES } =
          await import("$lib/config/canopy-categories.js");
        const allValid = parsed.every(
          (cat) =>
            typeof cat === "string" &&
            CANOPY_CATEGORIES.includes(
              cat as (typeof CANOPY_CATEGORIES)[number],
            ),
        );
        if (!allValid) {
          throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
        }
      } catch {
        throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
      }
    }

    // Validate canopy_show_forests (boolean string)
    if (setting_key === "canopy_show_forests") {
      if (setting_value !== "true" && setting_value !== "false") {
        throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
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
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
