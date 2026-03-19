/**
 * Theme Store for GroveUI
 * Manages light/dark/system theme preferences using Svelte 5 runes.
 *
 * Source of truth:
 * - Logged-in users: Heartwood user record (synced via /api/preferences)
 * - Logged-out users: localStorage fallback
 */

import { browser } from "$app/environment";
import { syncPreference } from "./sync.svelte";

type Theme = "light" | "dark" | "system";

class ThemeStore {
	// Reactive state using $state rune
	theme = $state<Theme>(this.getInitialTheme());

	// Track system preference for reactivity
	#systemPrefersDark = $state(this.getSystemPreference());

	// Whether the current value came from the server (skip syncing it back)
	#hydrated = false;

	constructor() {
		if (browser) {
			$effect.root(() => {
				// Persist to localStorage whenever it changes (fallback for logged-out)
				$effect(() => {
					try {
						localStorage.setItem("theme", this.theme);
					} catch {
						// localStorage unavailable
					}
				});

				// Apply theme to DOM whenever resolvedTheme changes
				$effect(() => {
					document.documentElement.classList.toggle("dark", this.resolvedTheme === "dark");
				});

				// Listen for system preference changes
				$effect(() => {
					const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
					const handler = (e: MediaQueryListEvent) => {
						this.#systemPrefersDark = e.matches;
					};
					mediaQuery.addEventListener("change", handler);
					return () => mediaQuery.removeEventListener("change", handler);
				});
			});
		}
	}

	/**
	 * Resolved theme (light/dark based on system preference if theme is 'system')
	 */
	get resolvedTheme(): "light" | "dark" {
		if (this.theme === "system") {
			return this.#systemPrefersDark ? "dark" : "light";
		}
		return this.theme;
	}

	private getInitialTheme(): Theme {
		if (!browser) return "system";
		return (localStorage.getItem("theme") as Theme | null) ?? "system";
	}

	private getSystemPreference(): boolean {
		if (!browser) return false;
		return window.matchMedia("(prefers-color-scheme: dark)").matches;
	}

	/**
	 * Hydrate from server preferences (called by layout on mount).
	 * Skips syncing back to avoid a redundant write.
	 */
	hydrateFromServer(value: string | null) {
		if (value && ["light", "dark", "system"].includes(value)) {
			this.#hydrated = true;
			this.theme = value as Theme;
			// Reset after microtask so future changes DO sync
			queueMicrotask(() => {
				this.#hydrated = false;
			});
		}
	}

	/**
	 * Set the theme and sync to Heartwood
	 */
	setTheme(newTheme: Theme) {
		this.theme = newTheme;
		if (!this.#hydrated) {
			syncPreference("theme", newTheme);
		}
	}

	/**
	 * Toggle between light and dark (based on resolved theme)
	 */
	toggle() {
		this.setTheme(this.resolvedTheme === "dark" ? "light" : "dark");
	}
}

export const themeStore = new ThemeStore();
