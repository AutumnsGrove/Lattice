/**
 * Grove Mode Store
 * Manages the Grove Mode terminology toggle using Svelte 5 runes.
 *
 * When Grove Mode is OFF (default): standard terms (e.g., "Blog", "Dashboard")
 * When Grove Mode is ON: nature-themed vocabulary (e.g., "Garden", "Arbor")
 *
 * Source of truth:
 * - Logged-in users: Heartwood user record (synced via /api/preferences)
 * - Logged-out users: localStorage fallback
 */

import { browser } from "$app/environment";
import { syncPreference } from "./sync.svelte";

const STORAGE_KEY = "grove-mode";

class GroveModeStore {
	/** true = Grove terms, false = standard terms */
	current = $state<boolean>(this.getInitialMode());

	// Whether the current value came from the server (skip syncing it back)
	#hydrated = false;

	constructor() {
		if (browser) {
			$effect.root(() => {
				$effect(() => {
					try {
						localStorage.setItem(STORAGE_KEY, String(this.current));
					} catch {
						// localStorage unavailable
					}
				});
			});
		}
	}

	private getInitialMode(): boolean {
		if (!browser) return false;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored === "true") return true;
			if (stored === "false") return false;
			if (stored) localStorage.removeItem(STORAGE_KEY);
		} catch {
			// localStorage unavailable
		}

		return false;
	}

	/**
	 * Hydrate from server preferences (called by layout on mount).
	 */
	hydrateFromServer(value: boolean | null) {
		if (value !== null) {
			this.#hydrated = true;
			this.current = value;
			queueMicrotask(() => {
				this.#hydrated = false;
			});
		}
	}

	/** Toggle between Grove Mode and standard mode */
	toggle() {
		this.current = !this.current;
		if (!this.#hydrated) {
			syncPreference("groveMode", this.current);
		}
	}

	/** Turn Grove Mode on */
	enable() {
		this.current = true;
		if (!this.#hydrated) {
			syncPreference("groveMode", true);
		}
	}

	/** Turn Grove Mode off */
	disable() {
		this.current = false;
		if (!this.#hydrated) {
			syncPreference("groveMode", false);
		}
	}
}

export const groveModeStore = new GroveModeStore();
