/**
 * Theme Store for Foliage
 * Manages light/dark/system theme preferences
 */

import { writable, derived, get } from "svelte/store";

type Theme = "light" | "dark" | "system";

// Cross-platform browser check (works without SvelteKit)
const isBrowser = typeof window !== "undefined";

function createThemeStore() {
	// Initialize theme from localStorage or default to 'system'
	const initialTheme: Theme = isBrowser
		? ((localStorage.getItem("theme") as Theme | null) ?? "system")
		: "system";

	const theme = writable<Theme>(initialTheme);

	// Resolved theme (light/dark based on system preference if theme is 'system')
	const resolvedTheme = derived(theme, ($theme) => {
		if ($theme === "system" && isBrowser) {
			return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
		}
		return $theme === "system" ? "light" : $theme;
	});

	// Apply theme to document
	function applyTheme(t: "light" | "dark") {
		if (isBrowser) {
			document.documentElement.classList.toggle("dark", t === "dark");
		}
	}

	// Subscribe to resolved theme changes and apply
	if (isBrowser) {
		resolvedTheme.subscribe((t) => applyTheme(t));

		// Listen for system preference changes
		window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
			// Re-trigger derived store calculation
			theme.update((t) => t);
		});
	}

	function setTheme(newTheme: Theme) {
		theme.set(newTheme);
		if (isBrowser) {
			localStorage.setItem("theme", newTheme);
		}
	}

	function toggle() {
		const current = get(resolvedTheme);
		setTheme(current === "dark" ? "light" : "dark");
	}

	return {
		theme,
		resolvedTheme,
		setTheme,
		toggle,
	};
}

export const themeStore = createThemeStore();
