/**
 * Season Store for Grove Engine
 * Manages seasonal theme preferences (spring, summer, autumn, winter + midnight)
 * using Svelte 5 runes.
 *
 * Source of truth:
 * - Logged-in users: Heartwood user record (synced via /api/preferences)
 * - Logged-out users: localStorage fallback
 *
 * Midnight Mode (Easter Egg):
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
import { syncPreference } from "./sync.svelte";

const STORAGE_KEY = "grove-season";
const LAST_REGULAR_KEY = "grove-last-regular-season";

class SeasonStore {
	current = $state<Season>(this.getInitialSeason());
	#lastRegularSeason: RegularSeason = this.getLastRegularSeason();
	#hydrated = false;

	constructor() {
		if (browser) {
			$effect.root(() => {
				$effect(() => {
					try {
						localStorage.setItem(STORAGE_KEY, this.current);
						if (this.current !== "midnight") {
							this.#lastRegularSeason = this.current as RegularSeason;
							localStorage.setItem(LAST_REGULAR_KEY, this.current);
						}
					} catch {
						// localStorage unavailable
					}
				});
			});
		}
	}

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
			if (stored) localStorage.removeItem(STORAGE_KEY);
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
	 * Hydrate from server preferences (called by layout on mount).
	 */
	hydrateFromServer(value: string | null) {
		if (value && ALL_SEASONS.includes(value as Season)) {
			this.#hydrated = true;
			this.current = value as Season;
			queueMicrotask(() => {
				this.#hydrated = false;
			});
		}
	}

	/** Cycle to the next regular season */
	cycle() {
		if (this.current === "midnight") {
			this.current = this.#lastRegularSeason;
		} else {
			const currentIndex = REGULAR_SEASONS.indexOf(this.current as RegularSeason);
			const nextIndex = (currentIndex + 1) % REGULAR_SEASONS.length;
			this.current = REGULAR_SEASONS[nextIndex];
		}
		syncPreference("season", this.current);
	}

	/** Set a specific season (with validation) */
	setSeason(newSeason: Season) {
		if (ALL_SEASONS.includes(newSeason)) {
			this.current = newSeason;
			if (!this.#hydrated) {
				syncPreference("season", newSeason);
			}
		}
	}

	/** Get current season value (for non-reactive contexts) */
	getCurrent(): Season {
		return this.current;
	}

	/** Enter midnight mode */
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
		syncPreference("season", "midnight");
	}

	/** Exit midnight mode */
	exitMidnight() {
		this.current = this.#lastRegularSeason;
		syncPreference("season", this.current);
	}

	/** Toggle midnight mode */
	toggleMidnight() {
		if (this.current === "midnight") {
			this.exitMidnight();
		} else {
			this.enableMidnight();
		}
	}
}

export const seasonStore = new SeasonStore();
