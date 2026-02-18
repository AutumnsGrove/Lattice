import type { PageServerLoad } from "./$types";
import { seededShuffle, type CanopyCategory } from "@autumnsgrove/lattice";
import {
  fetchCanopyDirectory,
  type CanopyWanderer,
  type CanopyDirectoryResult,
} from "@autumnsgrove/lattice/server";

export interface CanopyData extends CanopyDirectoryResult {
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

    // Fetch directory using shared utility
    const result = await fetchCanopyDirectory(db);

    // Shuffle with daily seed
    const shuffledWanderers = seededShuffle(result.wanderers, today);

    return {
      canopy: {
        wanderers: shuffledWanderers,
        total: result.total,
        categories: result.categories,
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
