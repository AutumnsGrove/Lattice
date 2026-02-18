import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  CANOPY_CATEGORIES,
  seededShuffle,
  type CanopyCategory,
} from "@autumnsgrove/lattice";
import {
  fetchCanopyDirectory,
  type CanopyWanderer,
} from "@autumnsgrove/lattice/server";

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

    // Fetch directory using shared utility
    const result = await fetchCanopyDirectory(db);

    if (result.wanderers.length === 0) {
      return json({
        wanderers: [],
        total: 0,
        categories: [],
        seed: today,
      });
    }

    // Apply filters
    let wanderers: CanopyWanderer[] = result.wanderers;

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

    return json({
      wanderers: shuffledWanderers,
      total: shuffledWanderers.length,
      categories: result.categories,
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
