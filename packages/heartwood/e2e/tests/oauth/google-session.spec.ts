/**
 * Google OAuth Session Replay Tests
 *
 * These tests use saved browser session state to test authenticated flows
 * without going through the actual Google OAuth flow each time.
 *
 * To create the session state:
 * 1. Run: pnpm exec playwright codegen --save-storage=e2e/state/google-auth.json http://localhost:5173/login
 * 2. Complete the Google OAuth login manually
 * 3. Close the browser to save the session
 *
 * The saved state includes cookies and localStorage that maintain the session.
 * Note: Google OAuth sessions typically expire in 7 days.
 */

import { test, expect } from "@playwright/test";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_STATE_PATH = path.join(__dirname, "../../state/google-auth.json");

test.describe("OAuth Session Replay", () => {
  // Skip these tests if storage state doesn't exist
  test.beforeAll(async () => {
    const fs = await import("fs");
    if (!fs.existsSync(STORAGE_STATE_PATH)) {
      console.warn(
        `\n⚠️  OAuth session state not found at ${STORAGE_STATE_PATH}\n` +
          `   Run: pnpm exec playwright codegen --save-storage=${STORAGE_STATE_PATH} http://localhost:5173/login\n` +
          `   Then complete Google OAuth login to save the session.\n`,
      );
    }
  });

  test.describe("with saved session", () => {
    // Use the saved session state for all tests in this describe block
    test.use({ storageState: STORAGE_STATE_PATH });

    test("should access dashboard without login prompt", async ({ page }) => {
      // Go directly to dashboard
      await page.goto("/dashboard");

      // Should not redirect to login
      await expect(page).not.toHaveURL(/login/);

      // Should see dashboard content
      await expect(
        page
          .getByRole("heading", { name: /dashboard/i })
          .or(page.getByText(/welcome/i)),
      ).toBeVisible({ timeout: 10000 });
    });

    test("should show user info in header", async ({ page }) => {
      await page.goto("/dashboard");

      // Should show user avatar or name
      await expect(
        page
          .locator('[data-testid="user-avatar"]')
          .or(page.locator(".user-menu"))
          .or(page.getByRole("img", { name: /avatar/i })),
      ).toBeVisible({ timeout: 10000 });
    });

    test("should maintain session across page navigation", async ({ page }) => {
      // Start at dashboard
      await page.goto("/dashboard");
      await expect(page).not.toHaveURL(/login/);

      // Navigate to security settings
      await page.goto("/dashboard/security");
      await expect(page).not.toHaveURL(/login/);

      // Navigate to another page
      await page.goto("/dashboard/settings");
      await expect(page).not.toHaveURL(/login/);

      // Session should persist throughout
    });

    test("should allow sign out", async ({ page }) => {
      await page.goto("/dashboard");

      // Find and click sign out
      const signOutButton = page
        .getByRole("button", { name: /sign out/i })
        .or(page.getByRole("link", { name: /sign out/i }))
        .or(page.getByText(/sign out/i));

      await signOutButton.click();

      // Should redirect to login or home
      await expect(page).toHaveURL(/(login|\/|home)/, { timeout: 10000 });

      // Trying to access dashboard should redirect to login
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });
  });

  test.describe("without saved session", () => {
    // These tests run without the saved session state

    test("should redirect to login when accessing protected route", async ({
      page,
    }) => {
      await page.goto("/dashboard");

      // Should redirect to login
      await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });

    test("should show login options including Google", async ({ page }) => {
      await page.goto("/login");

      // Should show Google sign-in option
      await expect(
        page
          .getByRole("button", { name: /google/i })
          .or(page.getByRole("link", { name: /google/i }))
          .or(page.getByText(/continue with google/i)),
      ).toBeVisible({ timeout: 10000 });
    });
  });
});
