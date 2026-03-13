/**
 * Greenhouse Mode Store
 *
 * Dev/testing toggle for the billing hub. When active:
 * - Auth is bypassed with mock tenant data
 * - Billing status returns mock subscription data
 * - All money values are test/fake numbers
 * - Stripe test keys are used (when billing-api is available)
 *
 * State lives in localStorage ("grove-greenhouse") and is bridged
 * to the server via a cookie ("grove_greenhouse") so server loads
 * can return mock data without hitting the billing-api.
 *
 * Follows the same pattern as the main Grove Mode toggle in engine.
 */

const STORAGE_KEY = "grove-greenhouse";
const COOKIE_NAME = "grove_greenhouse";

class GreenhouseModeStore {
	current = $state(false);

	constructor() {
		$effect.root(() => {
			// Read initial state from localStorage
			try {
				const stored = localStorage.getItem(STORAGE_KEY);
				if (stored === "true") {
					this.current = true;
				}
			} catch {
				// Private browsing or no localStorage
			}

			// Sync state changes to localStorage + cookie
			$effect(() => {
				try {
					localStorage.setItem(STORAGE_KEY, String(this.current));
				} catch {
					// Ignore storage errors
				}
				// Bridge to server via cookie
				document.cookie = this.current
					? `${COOKIE_NAME}=1; path=/; SameSite=Lax; max-age=86400`
					: `${COOKIE_NAME}=; path=/; SameSite=Lax; max-age=0`;
			});
		});
	}

	toggle() {
		this.current = !this.current;
		// Force a page reload so server picks up the cookie change
		// (SvelteKit client-side nav won't re-run server loads for cookies)
		window.location.reload();
	}

	enable() {
		if (!this.current) this.toggle();
	}

	disable() {
		if (this.current) this.toggle();
	}
}

export const greenhouseStore = new GreenhouseModeStore();
