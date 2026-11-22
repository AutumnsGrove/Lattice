/**
 * Capture every season × theme combination of one URL.
 *
 * This is the check that catches seasonal token bugs: a page can look correct
 * in autumn/dark and be unreadable in winter/light, because the season swaps
 * the palette and the theme swaps the surface.
 */

import type { Browser } from "@playwright/test";

import { capture, type CaptureOptions, type CaptureResult } from "./capture";

export interface MatrixOptions extends CaptureOptions {
	seasons: string[];
	themes: string[];
}

export interface MatrixResult {
	results: CaptureResult[];
	failed: number;
}

export async function matrix(
	browser: Browser,
	url: string,
	opts: MatrixOptions,
): Promise<MatrixResult> {
	const combos: Array<{ season: string; theme: string }> = [];
	for (const season of opts.seasons) {
		for (const theme of opts.themes) {
			combos.push({ season, theme });
		}
	}

	const results: CaptureResult[] = [];
	let failed = 0;

	for (const combo of combos) {
		const result = await capture(browser, url, {
			...opts,
			season: combo.season,
			theme: combo.theme,
		});
		results.push(result);
		if (result.error) failed++;
	}

	return { results, failed };
}
