/**
 * Playwright E2E Test Configuration for GroveAuth (Heartwood)
 *
 * Key design decisions:
 * - Chromium-only: CDP virtual authenticator requires Chrome DevTools Protocol
 * - Sequential workers: Prevents rate limit issues during testing
 * - Dual webServer: Starts both API (wrangler) and frontend (vite) for full integration
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",

  // Run tests sequentially to avoid race conditions with auth state
  fullyParallel: false,

  // Fail CI if test.only() is accidentally left in
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI for flake tolerance
  retries: process.env.CI ? 2 : 0,

  // Single worker to prevent rate limit issues and auth state conflicts
  workers: 1,

  // Report formats: HTML for local debugging, GitHub for CI annotations
  reporter: [["html"], ["github"]],

  use: {
    // Base URL for frontend (auth UI lives here)
    // Using port 5174 to avoid conflicts with other dev servers
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5174",

    // Capture traces and video on first retry for debugging
    trace: "on-first-retry",
    video: "on-first-retry",

    // Screenshot on failure for visual debugging
    screenshot: "only-on-failure",
  },

  // Start dev servers before running tests
  webServer: [
    {
      // Wrangler dev server for API
      command: "pnpm dev",
      url: "http://localhost:8787/health",
      reuseExistingServer: false, // Always start fresh to ensure correct env
      timeout: 120000,
      env: {
        ENVIRONMENT: "test",
        PASSKEY_RP_ID: "localhost",
      },
    },
    {
      // Vite dev server for frontend (groveauth-frontend package)
      // Using port 5174 to avoid conflicts with other dev servers
      command: "pnpm --filter groveauth-frontend dev -- --port 5174",
      url: "http://localhost:5174",
      reuseExistingServer: false, // Always start fresh
      timeout: 120000,
    },
  ],

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Chromium is required for CDP-based WebAuthn virtual authenticator
      },
    },
    // Note: Firefox and WebKit are intentionally excluded
    // CDP virtual authenticator only works with Chromium
  ],

  // Output directory for test artifacts
  outputDir: "./test-results",
});
