/**
 * Playwright Visual Regression Test Configuration
 *
 * Captures screenshots of key pages in both light and dark mode,
 * comparing against stored baselines to detect visual regressions.
 *
 * Key design decisions:
 * - Chromium-only: Consistent rendering across CI runs
 * - Desktop + mobile viewports: Catch responsive layout regressions
 * - Light + dark mode projects: Test both color schemes via prefers-color-scheme
 * - Animations disabled: Deterministic screenshots (no mid-animation captures)
 * - Conservative thresholds: Allow minor anti-aliasing diffs, catch real changes
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	outputDir: "./test-results",

	// Snapshot storage — baselines live in the repo
	snapshotDir: "./snapshots",
	snapshotPathTemplate:
		"{snapshotDir}/{testFileDir}/{testFilePath}/{projectName}/{arg}{ext}",

	// Run tests in parallel for speed
	fullyParallel: true,

	// Fail CI if test.only() is accidentally left in
	forbidOnly: !!process.env.CI,

	// No retries for visual tests — flaky screenshots need investigation
	retries: 0,

	// Multiple workers for speed
	workers: process.env.CI ? 2 : undefined,

	// HTML reporter for interactive side-by-side diffs
	reporter: [
		["html", { outputFolder: "./playwright-report", open: "never" }],
		["github"],
		["list"],
	],

	// Global settings
	use: {
		// Landing app preview server
		baseURL: "http://localhost:4173",

		// No traces needed for visual tests
		trace: "off",
		video: "off",

		// Consistent screenshot settings
		screenshot: "off", // We take manual screenshots in tests
	},

	// Default screenshot comparison thresholds
	expect: {
		toHaveScreenshot: {
			// Allow small anti-aliasing differences (0.2 = moderate strictness)
			threshold: 0.2,

			// Allow up to 0.5% of pixels to differ (anti-aliasing, font rendering)
			maxDiffPixelRatio: 0.005,

			// Disable animations for deterministic captures
			animations: "disabled",

			// Use CSS to hide caret and other blinking elements
			caret: "hide",
		},
	},

	// Build the landing app and serve it before tests run
	webServer: {
		command: "pnpm --filter grove-landing preview -- --port 4173",
		url: "http://localhost:4173",
		reuseExistingServer: !process.env.CI,
		timeout: 60000,
	},

	projects: [
		// Desktop — Light Mode
		{
			name: "desktop-light",
			use: {
				...devices["Desktop Chrome"],
				colorScheme: "light",
			},
		},

		// Desktop — Dark Mode
		{
			name: "desktop-dark",
			use: {
				...devices["Desktop Chrome"],
				colorScheme: "dark",
			},
		},

		// Mobile — Light Mode
		{
			name: "mobile-light",
			use: {
				...devices["Pixel 7"],
				colorScheme: "light",
			},
		},

		// Mobile — Dark Mode
		{
			name: "mobile-dark",
			use: {
				...devices["Pixel 7"],
				colorScheme: "dark",
			},
		},
	],
});
