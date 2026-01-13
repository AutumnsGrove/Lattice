/**
 * Season Store for Grove Engine
 * Manages seasonal theme preferences (spring, summer, autumn, winter + midnight)
 * Defaults to autumn on first visit, remembers user choice thereafter
 *
 * The logo and other nature components react to season changes.
 *
 * Midnight Mode (Easter Egg):
 * - Activated by the theme toggle button in the footer
 * - A special 5th season with deep purple/rose tones
 * - Exiting midnight returns to the last regular season
 * - Header logo only cycles through 4 regular seasons
 */

import { writable, get, derived } from "svelte/store";
import { browser } from "$app/environment";
import {
  type Season,
  type RegularSeason,
  REGULAR_SEASONS,
  ALL_SEASONS,
  DEFAULT_SEASON,
} from "../types/season";

const STORAGE_KEY = "grove-season";
const LAST_REGULAR_KEY = "grove-last-regular-season";

function getInitialSeason(): Season {
  if (!browser) return DEFAULT_SEASON;

  try {
    // Check if user has a stored preference
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ALL_SEASONS.includes(stored as Season)) {
      return stored as Season;
    }

    // Clean up invalid stored value if present
    if (stored) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private browsing, etc.) - use default
  }

  // First visit (or invalid value): default to autumn (Grove's signature season)
  return DEFAULT_SEASON;
}

function getLastRegularSeason(): RegularSeason {
  if (!browser) return DEFAULT_SEASON;

  try {
    const stored = localStorage.getItem(LAST_REGULAR_KEY);
    if (stored && REGULAR_SEASONS.includes(stored as RegularSeason)) {
      return stored as RegularSeason;
    }
  } catch {
    // localStorage unavailable - use default
  }

  return DEFAULT_SEASON;
}

function createSeasonStore() {
  const season = writable<Season>(getInitialSeason());
  let lastRegularSeason: RegularSeason = getLastRegularSeason();

  // Persist to localStorage on change
  // Wrapped in try-catch: localStorage can throw in private browsing or when full
  if (browser) {
    season.subscribe((s) => {
      try {
        localStorage.setItem(STORAGE_KEY, s);
        // Track the last regular season for returning from midnight
        if (s !== "midnight") {
          lastRegularSeason = s as RegularSeason;
          localStorage.setItem(LAST_REGULAR_KEY, s);
        }
      } catch {
        // Gracefully degrade if localStorage unavailable (private browsing, quota exceeded)
        // Season preference still works for current session, just won't persist
      }
    });
  }

  // Derived store to check if currently in midnight mode
  const isMidnight = derived(season, ($season) => $season === "midnight");

  /**
   * Cycle to the next regular season: spring → summer → autumn → winter → spring
   * If currently in midnight mode, exits to the next regular season
   */
  function cycle() {
    season.update((current) => {
      // If in midnight, exit to the last regular season
      if (current === "midnight") {
        return lastRegularSeason;
      }
      // Otherwise cycle through regular seasons
      const currentIndex = REGULAR_SEASONS.indexOf(current as RegularSeason);
      const nextIndex = (currentIndex + 1) % REGULAR_SEASONS.length;
      return REGULAR_SEASONS[nextIndex];
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

  /**
   * 🌙 Easter Egg: Enter midnight mode
   * A special late-night tea cafe aesthetic with deep purples and roses
   */
  function enableMidnight() {
    // Save the current regular season before entering midnight
    const current = get(season);
    if (current !== "midnight") {
      lastRegularSeason = current as RegularSeason;
      if (browser) {
        localStorage.setItem(LAST_REGULAR_KEY, current);
      }
    }
    season.set("midnight");
  }

  /**
   * Exit midnight mode, returning to the last regular season
   */
  function exitMidnight() {
    season.set(lastRegularSeason);
  }

  /**
   * Toggle midnight mode on/off
   */
  function toggleMidnight() {
    const current = get(season);
    if (current === "midnight") {
      exitMidnight();
    } else {
      enableMidnight();
    }
  }

  return {
    subscribe: season.subscribe,
    isMidnight,
    cycle,
    setSeason,
    getCurrent,
    enableMidnight,
    exitMidnight,
    toggleMidnight,
  };
}

export const seasonStore = createSeasonStore();
