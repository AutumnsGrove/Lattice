import { defineConfig, devices } from "@playwright/test";

/**
 * Aspen's browser journey.
 *
 * Modelled on `services/heartwood/e2e/playwright.config.ts` deliberately — the
 * same Chromium-only, single-worker, trace-on-first-retry shape — rather than
 * inventing a second one. Chromium only because there is one journey and no
 * cross-browser claim to make.
 *
 * The web server is Aspen alone: demo mode is the session, and the journey never
 * needs Heartwood, Zephyr or Pulse. Seeding happens in `prepare.mjs`, which the
 * server runs first, so a cold CI runner is enough.
 */
const PORT = 5173;
const DEMO_MODE_SECRET = process.env.DEMO_MODE_SECRET ?? "e2e-demo-secret";

export default defineConfig({
	testDir: "./tests",
	fullyParallel: false,
	workers: 1,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? [["github"], ["html"]] : [["list"], ["html"]],
	use: {
		baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
		trace: "on-first-retry",
		video: "on-first-retry",
		screenshot: "only-on-failure",
	},
	webServer: {
		// Playwright runs this with the config directory as cwd.
		command: "node prepare.mjs && node serve.mjs",
		url: `http://localhost:${PORT}/api/settings`,
		reuseExistingServer: false,
		timeout: 240_000,
		env: { DEMO_MODE_SECRET },
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	outputDir: "./.e2e-results",
});

export { DEMO_MODE_SECRET, PORT };
