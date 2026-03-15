<script lang="ts">
	/**
	 * CurioCursorsLayer — Global custom cursor overlay
	 *
	 * Self-fetches cursor config from `/api/curios/cursors`.
	 * Applies custom cursor CSS to the body and optionally renders
	 * a canvas-based cursor trail effect.
	 *
	 * Mount once in the root layout — applies site-wide.
	 */
	import { browser } from '$app/environment';

	interface CursorConfig {
		cursorType: 'preset' | 'custom';
		preset: string | null;
		customUrl: string | null;
		trailEnabled: boolean;
		trailEffect: string;
	}

	let config = $state<CursorConfig | null>(null);

	// Preset cursor URLs (SVG data URIs for common Grove cursor styles)
	const CURSOR_PRESETS: Record<string, string> = {
		leaf: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'%234ade80\' stroke=\'%2316a34a\' stroke-width=\'1.5\'%3E%3Cpath d=\'M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 1c1 2 2 4.5 2 8 0 5.5-4.5 10-10 10Z\'/%3E%3Cpath d=\'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12\'/%3E%3C/svg%3E") 4 4, auto',
		paw: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'%23a78bfa\' stroke=\'%237c3aed\' stroke-width=\'1.5\'%3E%3Ccircle cx=\'11\' cy=\'4\' r=\'2\'/%3E%3Ccircle cx=\'18\' cy=\'8\' r=\'2\'/%3E%3Ccircle cx=\'20\' cy=\'14\' r=\'2\'/%3E%3Cpath d=\'M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z\'/%3E%3C/svg%3E") 4 4, auto',
		star: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'%23fbbf24\' stroke=\'%23d97706\' stroke-width=\'1.5\'%3E%3Cpolygon points=\'12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2\'/%3E%3C/svg%3E") 10 10, auto',
	};

	$effect(() => {
		if (!browser) return;

		fetch('/api/curios/cursors') // csrf-ok
			.then((r) => r.ok ? r.json() as Promise<{ config: CursorConfig | null }> : null)
			.then((d) => {
				if (d?.config) config = d.config;
			})
			.catch((err) => {
				console.warn('[CurioCursorsLayer] Failed to load config:', err);
			});
	});

	// Apply cursor style to body when config changes
	$effect(() => {
		if (!browser || !config) return;

		let cursorValue = '';
		if (config.cursorType === 'preset' && config.preset) {
			cursorValue = CURSOR_PRESETS[config.preset] || '';
		} else if (config.cursorType === 'custom' && config.customUrl) {
			cursorValue = `url("${config.customUrl}") 4 4, auto`;
		}

		if (cursorValue) {
			document.body.style.cursor = cursorValue;
		}

		return () => {
			document.body.style.cursor = '';
		};
	});
</script>

<!-- Trail canvas would go here in future — currently config-only -->
