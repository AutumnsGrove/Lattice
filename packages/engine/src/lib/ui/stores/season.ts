/**
 * Season Store for Grove Engine
 * Manages seasonal theme preferences (spring, summer, autumn, winter)
 * Defaults to autumn on first visit, remembers user choice thereafter
 *
 * The logo and other nature components react to season changes.
 */

import { writable, get } from "svelte/store";
import { browser } from "$app/environment";
import type { Season } from "../components/nature/palette";

const STORAGE_KEY = "grove-season";

// Season cycle order
const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

function getInitialSeason(): Season {
  if (!browser) return "autumn";

  // Check if user has a stored preference
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SEASONS.includes(stored as Season)) {
    return stored as Season;
  }

  // Clean up invalid stored value if present
  if (stored) {
    localStorage.removeItem(STORAGE_KEY);
  }

  // First visit (or invalid value): default to autumn (Grove's signature season)
  return "autumn";
}

function createSeasonStore() {
  const season = writable<Season>(getInitialSeason());

  // Persist to localStorage on change
  if (browser) {
    season.subscribe((s) => {
      localStorage.setItem(STORAGE_KEY, s);
    });
  }

  /**
   * Cycle to the next season: spring → summer → autumn → winter → spring
   */
  function cycle() {
    season.update((current) => {
      const currentIndex = SEASONS.indexOf(current);
      const nextIndex = (currentIndex + 1) % SEASONS.length;
      return SEASONS[nextIndex];
    });
  }

  /**
   * Set a specific season
   */
  function setSeason(newSeason: Season) {
    season.set(newSeason);
  }

  /**
   * Get current season value (for non-reactive contexts)
   */
  function getCurrent(): Season {
    return get(season);
  }

  return {
    subscribe: season.subscribe,
    cycle,
    setSeason,
    getCurrent,
  };
}

export const seasonStore = createSeasonStore();
