/**
 * Season Store for Grove Engine
 * Manages seasonal theme preferences (spring, summer, autumn, winter + midnight)
 * using Svelte 5 runes
 *
 * Defaults to summer on first visit, remembers user choice thereafter.
 * The logo and other nature components react to season changes.
 *
 * Midnight Mode (Easter Egg):
 * - Activated by the theme toggle button in the footer
 * - A special 5th season with deep purple/rose tones
 * - Exiting midnight returns to the last regular season
 * - Header logo only cycles through 4 regular seasons
 */

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

class SeasonStore {
  // Reactive state using $state rune
  current = $state<Season>(this.getInitialSeason());

  // Track last regular season for returning from midnight
  #lastRegularSeason: RegularSeason = this.getLastRegularSeason();

  constructor() {
    if (browser) {
      // Use $effect.root() to create effects outside component context
      // This allows the store to work as a singleton module
      $effect.root(() => {
        // Persist to localStorage whenever season changes
        $effect(() => {
          try {
            localStorage.setItem(STORAGE_KEY, this.current);
            // Track the last regular season for returning from midnight
            if (this.current !== "midnight") {
              this.#lastRegularSeason = this.current as RegularSeason;
              localStorage.setItem(LAST_REGULAR_KEY, this.current);
            }
          } catch {
            // localStorage unavailable (private browsing, etc.)
          }
        });
      });
    }
  }

  /**
   * Check if currently in midnight mode
   */
  get isMidnight(): boolean {
    return this.current === "midnight";
  }

  private getInitialSeason(): Season {
    if (!browser) return DEFAULT_SEASON;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ALL_SEASONS.includes(stored as Season)) {
        return stored as Season;
      }

      // Clean up invalid stored value if present
      if (stored) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable
    }

    return DEFAULT_SEASON;
  }

  private getLastRegularSeason(): RegularSeason {
    if (!browser) return DEFAULT_SEASON;

    try {
      const stored = localStorage.getItem(LAST_REGULAR_KEY);
      if (stored && REGULAR_SEASONS.includes(stored as RegularSeason)) {
        return stored as RegularSeason;
      }
    } catch {
      // localStorage unavailable
    }

    return DEFAULT_SEASON;
  }

  /**
   * Cycle to the next regular season: spring → summer → autumn → winter → spring
   * If currently in midnight mode, exits to the last regular season
   */
  cycle() {
    if (this.current === "midnight") {
      this.current = this.#lastRegularSeason;
      return;
    }
    const currentIndex = REGULAR_SEASONS.indexOf(this.current as RegularSeason);
    const nextIndex = (currentIndex + 1) % REGULAR_SEASONS.length;
    this.current = REGULAR_SEASONS[nextIndex];
  }

  /**
   * Set a specific season
   */
  setSeason(newSeason: Season) {
    this.current = newSeason;
  }

  /**
   * Get current season value (for non-reactive contexts)
   */
  getCurrent(): Season {
    return this.current;
  }

  /**
   * 🌙 Easter Egg: Enter midnight mode
   * A special late-night tea cafe aesthetic with deep purples and roses
   */
  enableMidnight() {
    if (this.current !== "midnight") {
      this.#lastRegularSeason = this.current as RegularSeason;
      if (browser) {
        try {
          localStorage.setItem(LAST_REGULAR_KEY, this.current);
        } catch {
          // localStorage unavailable
        }
      }
    }
    this.current = "midnight";
  }

  /**
   * Exit midnight mode, returning to the last regular season
   */
  exitMidnight() {
    this.current = this.#lastRegularSeason;
  }

  /**
   * Toggle midnight mode on/off
   */
  toggleMidnight() {
    if (this.current === "midnight") {
      this.exitMidnight();
    } else {
      this.enableMidnight();
    }
  }
}

export const seasonStore = new SeasonStore();
