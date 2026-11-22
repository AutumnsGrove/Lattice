/**
 * Browser plumbing shared by capture and matrix.
 *
 * Three things the old Python glimpse got right and we keep: pre-seeded
 * localStorage, serving CDN fonts from the local static dir so screenshots
 * render offline, and collecting console output next to the screenshot.
 */

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { chromium, devices, type Browser, type BrowserContext, type Page } from "@playwright/test";

import { buildInitScript, type InjectOptions } from "./inject";

export interface ConsoleEntry {
	type: string;
	text: string;
	location?: string;
}

export interface OpenOptions extends InjectOptions {
	device?: string | null;
	viewport?: { width: number; height: number } | null;
}

export interface OpenedPage {
	context: BrowserContext;
	page: Page;
	console: ConsoleEntry[];
}

/** Walk up from cwd looking for the repo root (pnpm-workspace.yaml). */
export function findGroveRoot(start = process.cwd()): string | null {
	let dir = resolve(start);
	for (;;) {
		if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

/** Serve cdn.grove.place font requests from libs/engine/static/fonts. */
async function interceptFonts(page: Page): Promise<void> {
	const root = findGroveRoot();
	if (!root) return;

	const fontsDir = join(root, "libs", "engine", "static", "fonts");
	if (!existsSync(fontsDir)) return;

	const types: Record<string, string> = {
		woff2: "font/woff2",
		woff: "font/woff",
		ttf: "font/ttf",
		otf: "font/otf",
	};

	await page.route("**/cdn.grove.place/fonts/**", async (route) => {
		const filename = route.request().url().split("/").pop() ?? "";
		const local = join(fontsDir, filename.split("?")[0] ?? "");
		if (!existsSync(local)) {
			await route.abort("blockedbyclient");
			return;
		}
		const ext = filename.split(".").pop() ?? "";
		await route.fulfill({
			status: 200,
			contentType: types[ext] ?? "font/ttf",
			body: (await import("node:fs")).readFileSync(local),
		});
	});
}

export function attachConsole(page: Page): ConsoleEntry[] {
	const entries: ConsoleEntry[] = [];
	page.on("console", (msg) => {
		entries.push({
			type: msg.type(),
			text: msg.text(),
			location: msg.location()?.url,
		});
	});
	page.on("pageerror", (err) => {
		entries.push({ type: "pageerror", text: err.message });
	});
	return entries;
}

export async function launch(): Promise<Browser> {
	const executablePath = process.env.GLIMPSE_CHROMIUM;
	try {
		return await chromium.launch({
			headless: true,
			...(executablePath ? { executablePath } : {}),
		});
	} catch (err) {
		const message = (err as Error).message;
		if (message.includes("Executable doesn't exist")) {
			throw new Error(
				[
					"No Chromium for this Playwright version.",
					"",
					"  pnpm exec playwright install chromium",
					"",
					"Use `pnpm exec`, not `npx` — npx resolves its own copy and downloads a",
					"browser the workspace will never look for. Or point at an existing build:",
					"",
					"  GLIMPSE_CHROMIUM=/path/to/chrome-headless-shell bun run glimpse ...",
				].join("\n"),
			);
		}
		throw err;
	}
}

/** Open a context + page with theme injection and font routing ready. */
export async function openPage(browser: Browser, opts: OpenOptions = {}): Promise<OpenedPage> {
	let contextOpts: Parameters<Browser["newContext"]>[0] = {};
	if (opts.device) {
		const device = devices[opts.device];
		if (!device) {
			throw new Error(`Unknown device: ${opts.device} (try --list-devices)`);
		}
		contextOpts = { ...device };
	} else if (opts.viewport) {
		contextOpts = { viewport: opts.viewport };
	}

	const context = await browser.newContext(contextOpts);

	const initScript = buildInitScript(opts);
	if (initScript) await context.addInitScript(initScript);

	const page = await context.newPage();
	await interceptFonts(page);

	// Always collected: the sidecar .json should never claim a page was silent
	// just because --logs wasn't passed. The flag only decides what gets printed.
	const consoleEntries = attachConsole(page);

	return { context, page, console: consoleEntries };
}
