/**
 * Grove Mode Store
 * Manages the Grove Mode terminology toggle using Svelte 5 runes
 *
 * When Grove Mode is OFF (default): standard terms are shown (e.g., "Blog", "Dashboard")
 * When Grove Mode is ON: Grove's nature-themed vocabulary is shown (e.g., "Garden", "Arbor")
 *
 * Follows the same pattern as seasonStore for consistency.
 */

import { browser } from "$app/environment";

const STORAGE_KEY = "grove-mode";

class GroveModeStore {
  /** true = Grove terms, false = standard terms */
  current = $state<boolean>(this.getInitialMode());

  constructor() {
    if (browser) {
      $effect.root(() => {
        $effect(() => {
          try {
            localStorage.setItem(STORAGE_KEY, String(this.current));
          } catch {
            // localStorage unavailable (private browsing, etc.)
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

      // Clean up invalid stored value if present
      if (stored) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable
    }

    return false;
  }

  /** Toggle between Grove Mode and standard mode */
  toggle() {
    this.current = !this.current;
  }

  /** Turn Grove Mode on */
  enable() {
    this.current = true;
  }

  /** Turn Grove Mode off */
  disable() {
    this.current = false;
  }
}

export const groveModeStore = new GroveModeStore();
