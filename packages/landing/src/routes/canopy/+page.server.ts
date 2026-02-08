import type { PageServerLoad } from "./$types";
import {
  CANOPY_CATEGORIES,
  CANOPY_SETTING_KEYS,
  parseCanopyCategories,
  type CanopyCategory,
} from "@autumnsgrove/groveengine";

/**
 * Seeded shuffle for consistent daily ordering
 * Uses a simple LCG (Linear Congruential Generator) seeded with the date
 */
function seededShuffle<T>(array: T[], seed: string): T[] {
  // Create a numeric seed from the date string
  let seedNum = 0;
  for (let i = 0; i < seed.length; i++) {
    seedNum = (seedNum << 5) - seedNum + seed.charCodeAt(i);
    seedNum |= 0; // Convert to 32bit integer
  }

  // LCG parameters
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;

  // Fisher-Yates shuffle with seeded random
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    seedNum = (a * seedNum + c) % m;
    const j = Math.abs(seedNum) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

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

export interface CanopyWanderer {
  subdomain: string;
  display_name: string;
  banner: string;
  categories: CanopyCategory[];
  bloom_count: number;
  avatar_url: string | null;
}

interface CategoryCount {
  name: CanopyCategory;
  count: number;
}

export interface CanopyData {
  wanderers: CanopyWanderer[];
  total: number;
  categories: CategoryCount[];
  seed: string;
}

/**
 * Load the Canopy directory — all wanderers who've opted in
 */
export const load: PageServerLoad = async ({
  platform,
}): Promise<{ canopy: CanopyData }> => {
  const db = platform?.env?.DB;

  if (!db) {
    console.error("[Canopy] Database not available");
    return {
      canopy: {
        wanderers: [],
        total: 0,
        categories: [],
        seed: new Date().toISOString().slice(0, 10),
      },
    };
  }

  try {
    // Get today's seed for consistent ordering
    const today = new Date().toISOString().slice(0, 10);

    // Query all visible tenants with their basic info
    // We join with site_settings to get canopy visibility
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
      return {
        canopy: {
          wanderers: [],
          total: 0,
          categories: [],
          seed: today,
        },
      };
    }

    // Get tenant IDs for batch settings query
    const tenantIds = tenants.map((t) => t.id);

    // Batch query all settings for these tenants
    // Build placeholders for IN clause
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
    const wanderers: CanopyWanderer[] = tenants.map((tenant) => {
      const tenantSettings = settingsByTenant.get(tenant.id) || {};
      const categories = parseCanopyCategories(tenantSettings.categories);

      return {
        subdomain: tenant.subdomain,
        display_name: tenant.display_name || tenant.subdomain,
        banner: tenantSettings.banner || "",
        categories,
        bloom_count: tenant.post_count,
        avatar_url: null, // Placeholder for future avatar implementation
      };
    });

    // Shuffle with daily seed
    const shuffledWanderers = seededShuffle(wanderers, today);

    // Calculate category counts
    const categoryCounts = new Map<CanopyCategory, number>();
    for (const wanderer of wanderers) {
      for (const category of wanderer.categories) {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }
    }

    const categories: CategoryCount[] = Array.from(categoryCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      canopy: {
        wanderers: shuffledWanderers,
        total: shuffledWanderers.length,
        categories,
        seed: today,
      },
    };
  } catch (err) {
    console.error("[Canopy] Failed to load directory:", err);

    return {
      canopy: {
        wanderers: [],
        total: 0,
        categories: [],
        seed: new Date().toISOString().slice(0, 10),
      },
    };
  }
};
