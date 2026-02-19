import {
  CANOPY_SETTING_KEYS,
  parseCanopyCategories,
  type CanopyCategory,
} from "../config/canopy-categories.js";

interface TenantRow {
  id: string;
  subdomain: string;
  display_name: string | null;
  published_count: number;
}

interface SettingsRow {
  tenant_id: string;
  setting_key: string;
  setting_value: string;
}

export interface CanopyWanderer {
  subdomain: string;
  display_name: string;
  avatar_url: string | null;
  banner: string;
  categories: CanopyCategory[];
  bloom_count: number;
  forests: string[];
}

export interface CategoryCount {
  name: CanopyCategory;
  count: number;
}

export interface CanopyDirectoryResult {
  wanderers: CanopyWanderer[];
  total: number;
  categories: CategoryCount[];
}

/**
 * Fetch the Canopy directory from the database
 *
 * This shared utility queries all visible tenants and their settings,
 * then builds the wanderer objects. Filtering and shuffling are left
 * to the caller (API or page server) to handle appropriately.
 *
 * @param db - The D1 database binding
 * @returns The full directory result with all wanderers and category counts
 */
export async function fetchCanopyDirectory(
  db: D1Database,
): Promise<CanopyDirectoryResult> {
  // Query all visible tenants with real published post count
  // Note: tenants.post_count is a stale denormalized column that's never updated,
  // so we use EXISTS + a correlated subquery on the posts table instead.
  const tenantResult = await db
    .prepare(
      `
      SELECT
        t.id,
        t.subdomain,
        t.display_name,
        (SELECT COUNT(*) FROM posts p WHERE p.tenant_id = t.id AND p.status = 'published') as published_count
      FROM tenants t
      INNER JOIN site_settings ts_visible
        ON t.id = ts_visible.tenant_id
        AND ts_visible.setting_key = ?
        AND ts_visible.setting_value = 'true'
      WHERE t.active = 1
        AND EXISTS (
          SELECT 1 FROM posts p
          WHERE p.tenant_id = t.id
          AND p.status = 'published'
        )
    `,
    )
    .bind(CANOPY_SETTING_KEYS.VISIBLE)
    .all<TenantRow>();

  const tenants = tenantResult.results || [];

  if (tenants.length === 0) {
    return {
      wanderers: [],
      total: 0,
      categories: [],
    };
  }

  // Get settings for all tenants
  const tenantIds = tenants.map((t) => t.id);
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
    return {
      subdomain: tenant.subdomain,
      display_name: tenant.display_name || tenant.subdomain,
      avatar_url: null, // Placeholder for future avatar implementation
      banner: tenantSettings.banner || "",
      categories: parseCanopyCategories(tenantSettings.categories),
      bloom_count: tenant.published_count,
      forests: [], // Placeholder for future Forests integration
    };
  });

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
    wanderers,
    total: wanderers.length,
    categories,
  };
}
