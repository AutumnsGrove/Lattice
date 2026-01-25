/**
 * Theme Store for GroveUI
 * Manages light/dark/system theme preferences using Svelte 5 runes
 */

import { browser } from "$app/environment";

type Theme = "light" | "dark" | "system";

class ThemeStore {
  // Reactive state using $state rune
  theme = $state<Theme>(this.getInitialTheme());

  // Track system preference for reactivity
  #systemPrefersDark = $state(this.getSystemPreference());

  constructor() {
    if (browser) {
      // Use $effect.root() to create effects outside component context
      // This allows the store to work as a singleton module
      $effect.root(() => {
        // Persist theme to localStorage whenever it changes
        // This mirrors the seasonStore pattern for consistency
        $effect(() => {
          try {
            localStorage.setItem("theme", this.theme);
          } catch {
            // localStorage unavailable (private browsing, quota exceeded, etc.)
          }
        });

        // Apply theme to DOM whenever resolvedTheme changes
        $effect(() => {
          document.documentElement.classList.toggle(
            "dark",
            this.resolvedTheme === "dark",
          );
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
   * This is a getter that reacts to theme and system preference changes
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
   * Set the theme (automatically persisted to localStorage via $effect)
   */
  setTheme(newTheme: Theme) {
    this.theme = newTheme;
  }

  /**
   * Toggle between light and dark (based on resolved theme)
   */
  toggle() {
    this.setTheme(this.resolvedTheme === "dark" ? "light" : "dark");
  }
}

export const themeStore = new ThemeStore();
