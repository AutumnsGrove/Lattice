/**
 * Visual Regression Tests — Landing Pages
 *
 * Captures full-page screenshots of key landing pages and compares
 * them against stored baselines. Tests run in 4 configurations:
 * desktop-light, desktop-dark, mobile-light, mobile-dark.
 *
 * The test names become the snapshot filenames, so keep them stable.
 * Changing a test name = new baseline needed.
 */

import { test, expect } from "@playwright/test";

// Pages to test — add new routes here as the landing grows
const PAGES = [
	{ path: "/", name: "home" },
	{ path: "/about", name: "about" },
	{ path: "/help", name: "help" },
	{ path: "/pricing", name: "pricing" },
] as const;

// Wait for the page to be fully rendered before capturing
async function waitForPageReady(page: import("@playwright/test").Page) {
	// Wait for network to settle (no pending requests for 500ms)
	await page.waitForLoadState("networkidle");

	// Wait for any lazy-loaded images to finish
	await page.evaluate(() =>
		Promise.all(
			Array.from(document.images)
				.filter((img) => !img.complete)
				.map(
					(img) =>
						new Promise((resolve) => {
							img.onload = resolve;
							img.onerror = resolve;
						}),
				),
		),
	);

	// Wait for fonts to load
	await page.evaluate(() => document.fonts.ready);

	// Small settle time for any CSS transitions
	await page.waitForTimeout(500);
}

// Mask dynamic content that changes between runs
function getDynamicMasks(page: import("@playwright/test").Page) {
	return [
		// Mask any elements with randomized content (e.g., randomized forests)
		page.locator("[data-visual-ignore]"),
		// Mask any live timestamps or counters
		page.locator("time[datetime]"),
	];
}

for (const { path, name } of PAGES) {
	test(`${name} — full page`, async ({ page }) => {
		await page.goto(path);
		await waitForPageReady(page);

		await expect(page).toHaveScreenshot(`${name}-full.png`, {
			fullPage: true,
			mask: getDynamicMasks(page),
		});
	});

	test(`${name} — above the fold`, async ({ page }) => {
		await page.goto(path);
		await waitForPageReady(page);

		// Viewport-only screenshot (what users see first)
		await expect(page).toHaveScreenshot(`${name}-viewport.png`, {
			fullPage: false,
			mask: getDynamicMasks(page),
		});
	});
}

// Reduced motion preference test — verify animations are disabled
test("home — respects prefers-reduced-motion", async ({ browser }) => {
	const context = await browser.newContext({
		reducedMotion: "reduce",
	});
	const page = await context.newPage();

	await page.goto("/");
	await waitForPageReady(page);

	await expect(page).toHaveScreenshot("home-reduced-motion.png", {
		fullPage: false,
		mask: getDynamicMasks(page),
	});

	await context.close();
});
