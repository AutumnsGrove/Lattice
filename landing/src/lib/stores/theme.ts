/**
 * Theme Store for Grove Landing
 * Manages light/dark theme preferences
 * Defaults to dark on first visit, remembers user choice thereafter
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'grove-theme';

function getInitialTheme(): Theme {
	if (!browser) return 'dark';

	// Check if user has a stored preference
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'light' || stored === 'dark') {
		return stored;
	}

	// First visit: default to dark
	return 'dark';
}

function createThemeStore() {
	const theme = writable<Theme>(getInitialTheme());

	// Apply theme to document
	function applyTheme(t: Theme) {
		if (browser) {
			document.documentElement.classList.toggle('dark', t === 'dark');
		}
	}

	// Apply initial theme immediately
	if (browser) {
		applyTheme(get(theme));

		// Subscribe to changes
		theme.subscribe((t) => {
			applyTheme(t);
			localStorage.setItem(STORAGE_KEY, t);
		});
	}

	function toggle() {
		theme.update((current) => (current === 'dark' ? 'light' : 'dark'));
	}

	function setTheme(newTheme: Theme) {
		theme.set(newTheme);
	}

	return {
		subscribe: theme.subscribe,
		toggle,
		setTheme
	};
}

export const theme = createThemeStore();
