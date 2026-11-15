/**
 * Capture one URL to one PNG.
 *
 * The sequence mirrors the old Python engine and exists because each step
 * fixes a specific way screenshots come out wrong:
 *
 *   1. init script before navigation  → no flash of the default theme
 *   2. local CDN fonts                → correct type even with no network
 *   3. domcontentloaded, not load     → SvelteKit streams; load never settles
 *   4. dismiss the entrance overlay   → otherwise every shot is the shade
 *   5. settle wait                    → transitions and fonts have landed
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Browser } from "@playwright/test";

import { openPage, type ConsoleEntry } from "./browser";
import { SHADE_DISMISS_SCRIPT } from "./inject";
import { generateFilename } from "./naming";

export interface CaptureOptions {
	season?: string | null;
	theme?: string | null;
	groveMode?: boolean | null;
	selector?: string | null;
	device?: string | null;
	viewport?: { width: number; height: number } | null;
	fullPage?: boolean;
	logs?: boolean;
	waitMs?: number;
	timeoutMs?: number;
	outDir: string;
	name?: string | null;
	noInject?: boolean;
	meta?: boolean;
}

export interface CaptureResult {
	url: string;
	path: string | null;
	metaPath?: string | null;
	httpStatus: number;
	bytes?: number;
	error?: string;
	console: ConsoleEntry[];
	durationMs: number;
}

export async function capture(
	browser: Browser,
	url: string,
	opts: CaptureOptions,
): Promise<CaptureResult> {
	const started = Date.now();
	const outDir = opts.outDir;
	mkdirSync(outDir, { recursive: true });

	const filename = generateFilename(url, {
		season: opts.season,
		theme: opts.theme,
		selector: opts.selector,
		device: opts.device,
		viewport: opts.viewport,
		name: opts.name,
	});
	const path = join(outDir, filename);

	const {
		context,
		page,
		console: consoleEntries,
	} = await openPage(browser, {
		season: opts.noInject ? null : opts.season,
		theme: opts.noInject ? null : opts.theme,
		groveMode: opts.noInject ? null : opts.groveMode,
		device: opts.device,
		viewport: opts.viewport,
	});

	const result: CaptureResult = {
		url,
		path: null,
		httpStatus: 0,
		console: consoleEntries,
		durationMs: 0,
	};

	try {
		const response = await page.goto(url, {
			waitUntil: "domcontentloaded",
			timeout: opts.timeoutMs ?? 30_000,
		});
		result.httpStatus = response?.status() ?? 0;

		// Best effort: the page may have navigated or the node may not exist.
		await page.evaluate(SHADE_DISMISS_SCRIPT).catch(() => {});

		if (opts.selector) {
			await page.waitForSelector(opts.selector, { timeout: opts.timeoutMs ?? 30_000 });
		} else {
			await page.waitForTimeout(opts.waitMs ?? 500);
		}

		if (opts.selector) {
			await page.locator(opts.selector).first().screenshot({ path });
		} else {
			await page.screenshot({ path, fullPage: opts.fullPage ?? true });
		}
		result.path = path;
	} catch (err) {
		result.error = (err as Error).message;
	} finally {
		await context.close();
	}

	result.durationMs = Date.now() - started;

	if (opts.meta !== false && result.path) {
		const metaPath = `${path}.json`;
		writeFileSync(
			metaPath,
			`${JSON.stringify(
				{
					url,
					season: opts.season ?? null,
					theme: opts.theme ?? null,
					device: opts.device ?? null,
					selector: opts.selector ?? null,
					httpStatus: result.httpStatus,
					durationMs: result.durationMs,
					console: result.console,
				},
				null,
				2,
			)}\n`,
		);
		result.metaPath = metaPath;
	}

	return result;
}
