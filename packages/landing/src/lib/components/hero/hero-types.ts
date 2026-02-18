import type { Season } from "@autumnsgrove/lattice/ui/nature";

export type BgVariant = "forest" | "twilight" | "dawn";

export interface HeroSlideContentProps {
  season: Season;
  active: boolean;
  index: number;
}

/**
 * Maps a bgVariant to its Tailwind gradient classes.
 * Warmer, nature-rooted gradients inspired by the forest page.
 *
 * - forest: Deep grove greens — growth, ownership, protection
 * - twilight: Warm indigo with green undertones — legacy, timelessness
 * - dawn: Golden amber through soft rose — community, home, warmth
 */
export function getGradientClasses(variant: BgVariant): string {
  const variants: Record<BgVariant, string> = {
    forest:
      "from-emerald-50/90 via-green-100/70 to-emerald-50/50 dark:from-emerald-950/90 dark:via-green-950/70 dark:to-emerald-950/60",
    twilight:
      "from-indigo-50/80 via-emerald-50/50 to-slate-100/60 dark:from-indigo-950/80 dark:via-emerald-950/50 dark:to-slate-950/50",
    dawn: "from-amber-50/85 via-orange-50/60 to-emerald-50/40 dark:from-amber-950/80 dark:via-orange-950/50 dark:to-emerald-950/40",
  };
  return variants[variant];
}
