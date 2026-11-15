/**
 * Theme injection for glimpse.
 *
 * Pre-seeds localStorage before the page runs so the Svelte stores pick up the
 * right season/theme/grove-mode on first render — no flash of default theme.
 *
 * Values are checked against allowlists here even though the CLI validates
 * them too, so a caller that skips the CLI can't inject arbitrary JS.
 */

export const SAFE_SEASONS = ["spring", "summer", "autumn", "winter", "midnight"] as const;
export const SAFE_THEMES = ["light", "dark", "system"] as const;

export type Season = (typeof SAFE_SEASONS)[number];
export type Theme = (typeof SAFE_THEMES)[number];

/**
 * Grove ships a pre-hydration "Entering the grove..." overlay in the
 * server-rendered HTML. It only fades once SvelteKit hydrates, which is slower
 * than `domcontentloaded` and never happens at all when page JS errors — so
 * every screenshot would capture the overlay instead of the page.
 */
export const SHADE_DISMISS_SCRIPT = "document.getElementById('grove-entrance')?.remove();";

export interface InjectOptions {
	season?: string | null;
	theme?: string | null;
	groveMode?: boolean | null;
}

/** Build the init script, or null when there is nothing to inject. */
export function buildInitScript({ season, theme, groveMode }: InjectOptions): string | null {
	const statements: string[] = [];

	if (season) {
		if (!(SAFE_SEASONS as readonly string[]).includes(season)) {
			throw new Error(`Unsafe season rejected: ${season} (use: ${SAFE_SEASONS.join(", ")})`);
		}
		statements.push(`localStorage.setItem('grove-season', '${season}');`);
	}

	if (theme) {
		if (!(SAFE_THEMES as readonly string[]).includes(theme)) {
			throw new Error(`Unsafe theme rejected: ${theme} (use: ${SAFE_THEMES.join(", ")})`);
		}
		statements.push(`localStorage.setItem('theme', '${theme}');`);
		// Apply the class immediately so there's no flash. documentElement can be
		// absent on about:blank, where init scripts first run.
		if (theme === "dark") {
			statements.push(
				"if (document.documentElement) document.documentElement.classList.add('dark');",
			);
		} else if (theme === "light") {
			statements.push(
				"if (document.documentElement) document.documentElement.classList.remove('dark');",
			);
		}
	}

	if (groveMode !== null && groveMode !== undefined) {
		statements.push(`localStorage.setItem('grove-mode', '${groveMode ? "true" : "false"}');`);
	}

	return statements.length > 0 ? statements.join("\n") : null;
}
