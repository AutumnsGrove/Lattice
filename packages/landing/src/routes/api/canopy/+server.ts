import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  CANOPY_CATEGORIES,
  CANOPY_SETTING_KEYS,
  type CanopyCategory,
} from "@autumnsgrove/groveengine";

/**
 * Canopy API endpoint
 *
 * Returns the Canopy directory listing with filtering and search support.
 */

interface TenantRow {
  id: string;
  subdomain: string;
  display_name: string | null;
  post_count: number;
}

interface SettingsRow {
  tenant_id: string;
  setting_key: string;
  setting_value: string;
}

interface CanopyWanderer {
  subdomain: string;
  display_name: string;
  avatar_url: string | null;
  banner: string;
  categories: CanopyCategory[];
  bloom_count: number;
  forests: string[];
}

function parseCategories(
  categoriesJson: string | null | undefined,
): CanopyCategory[] {
  if (!categoriesJson) return [];
  try {
    const parsed = JSON.parse(categoriesJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is CanopyCategory =>
        typeof c === "string" &&
        CANOPY_CATEGORIES.includes(c as CanopyCategory),
    );
  } catch {
    return [];
  }
}

function seededShuffle<T>(array: T[], seed: string): T[] {
  let seedNum = 0;
  for (let i = 0; i < seed.length; i++) {
    seedNum = (seedNum << 5) - seedNum + seed.charCodeAt(i);
    seedNum |= 0;
  }
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    seedNum = (a * seedNum + c) % m;
    const j = Math.abs(seedNum) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * GET /api/canopy
 *
 * Returns the Canopy directory listing.
 * Query params:
 * - category: Filter by category (optional)
 * - q: Search query (matches display_name and banner) (optional)
 */
export const GET: RequestHandler = async ({ url, platform }) => {
  const db = platform?.env?.DB;

  if (!db) {
    return json(
      { error: "Database not available", error_code: "LANDING_DB_UNAVAILABLE" },
      { status: 503 },
    );
  }

  try {
    // Get query parameters
    const categoryFilter = url.searchParams.get(
      "category",
    ) as CanopyCategory | null;
    const searchQuery = url.searchParams.get("q")?.toLowerCase() || null;

    // Get today's seed for consistent ordering
    const today = new Date().toISOString().slice(0, 10);

    // Query all visible tenants
    const tenantResult = await db
      .prepare(
        `
      SELECT 
        t.id,
        t.subdomain,
        t.display_name,
        t.post_count
      FROM tenants t
      INNER JOIN site_settings ts_visible
        ON t.id = ts_visible.tenant_id
        AND ts_visible.setting_key = ?
        AND ts_visible.setting_value = 'true'
      WHERE t.active = 1
        AND t.post_count >= 1
    `,
      )
      .bind(CANOPY_SETTING_KEYS.VISIBLE)
      .all<TenantRow>();

    const tenants = tenantResult.results || [];

    if (tenants.length === 0) {
      return json({
        wanderers: [],
        total: 0,
        categories: [],
        seed: today,
      });
    }

    // Get settings for all tenants
    const tenantIds = tenants.map((t: TenantRow) => t.id);
    const placeholders = tenantIds.map(() => "?").join(",");

    const settingsResult = await db
      .prepare(
        `
      SELECT tenant_id, setting_key, setting_value
      FROM site_settings
      WHERE tenant_id IN (${placeholders})
        AND setting_key IN (?, ?)
    `,
      )
      .bind(
        ...tenantIds,
        CANOPY_SETTING_KEYS.BANNER,
        CANOPY_SETTING_KEYS.CATEGORIES,
      )
      .all<SettingsRow>();

    const settings = settingsResult.results || [];

    // Group settings by tenant
    const settingsByTenant = new Map<
      string,
      { banner?: string; categories?: string }
    >();
    for (const row of settings) {
      if (!settingsByTenant.has(row.tenant_id)) {
        settingsByTenant.set(row.tenant_id, {});
      }
      const tenantSettings = settingsByTenant.get(row.tenant_id)!;
      if (row.setting_key === CANOPY_SETTING_KEYS.BANNER) {
        tenantSettings.banner = row.setting_value;
      } else if (row.setting_key === CANOPY_SETTING_KEYS.CATEGORIES) {
        tenantSettings.categories = row.setting_value;
      }
    }

    // Build wanderer objects
    let wanderers: CanopyWanderer[] = tenants.map((tenant: TenantRow) => {
      const tenantSettings = settingsByTenant.get(tenant.id) || {};
      return {
        subdomain: tenant.subdomain,
        display_name: tenant.display_name || tenant.subdomain,
        avatar_url: null, // Placeholder
        banner: tenantSettings.banner || "",
        categories: parseCategories(tenantSettings.categories),
        bloom_count: tenant.post_count,
        forests: [], // Placeholder for future Forests integration
      };
    });

    // Apply category filter
    if (categoryFilter && CANOPY_CATEGORIES.includes(categoryFilter)) {
      wanderers = wanderers.filter((w) =>
        w.categories.includes(categoryFilter),
      );
    }

    // Apply search filter
    if (searchQuery) {
      wanderers = wanderers.filter(
        (w) =>
          w.display_name.toLowerCase().includes(searchQuery) ||
          w.banner.toLowerCase().includes(searchQuery) ||
          w.subdomain.toLowerCase().includes(searchQuery),
      );
    }

    // Shuffle with daily seed
    const shuffledWanderers = seededShuffle(wanderers, today);

    // Calculate category counts (from all wanderers, not just filtered)
    const allWanderers: CanopyWanderer[] = tenants.map((tenant: TenantRow) => {
      const tenantSettings = settingsByTenant.get(tenant.id) || {};
      return {
        subdomain: tenant.subdomain,
        display_name: tenant.display_name || tenant.subdomain,
        avatar_url: null,
        banner: tenantSettings.banner || "",
        categories: parseCategories(tenantSettings.categories),
        bloom_count: tenant.post_count,
        forests: [],
      };
    });

    const categoryCounts = new Map<CanopyCategory, number>();
    for (const wanderer of allWanderers) {
      for (const category of wanderer.categories) {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }
    }

    const categories = Array.from(categoryCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return json({
      wanderers: shuffledWanderers,
      total: shuffledWanderers.length,
      categories,
      seed: today,
    });
  } catch (err) {
    console.error("[Canopy API] Error:", err);
    return json(
      {
        error: "Failed to load directory",
        error_code: "LANDING_OPERATION_FAILED",
      },
      { status: 500 },
    );
  }
};
