/**
 * Theme Store for Grove Clearing
 * Manages light/dark mode with localStorage persistence
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function createThemeStore() {
	// Default to dark mode
	const initialTheme: Theme = browser
		? ((localStorage.getItem('grove-theme') as Theme) || 'dark')
		: 'dark';

	const { subscribe, set, update } = writable<Theme>(initialTheme);

	// Apply theme to DOM
	function applyTheme(theme: Theme) {
		if (browser) {
			if (theme === 'dark') {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
			localStorage.setItem('grove-theme', theme);
		}
	}

	// Apply initial theme
	if (browser) {
		applyTheme(initialTheme);
	}

	return {
		subscribe,
		set: (theme: Theme) => {
			set(theme);
			applyTheme(theme);
		},
		toggle: () => {
			update((current) => {
				const newTheme = current === 'dark' ? 'light' : 'dark';
				applyTheme(newTheme);
				return newTheme;
			});
		}
	};
}

export const theme = createThemeStore();
