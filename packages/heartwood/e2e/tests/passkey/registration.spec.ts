/**
 * Passkey Registration E2E Tests
 *
 * Tests the passkey (WebAuthn) registration flow using CDP virtual authenticator.
 * These tests verify that users can successfully register passkeys after initial login.
 */

import { test, expect } from "../../fixtures/webauthn";

test.describe("Passkey Registration", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto("/");
  });

  test("should show passkey option on security settings page", async ({
    page,
  }) => {
    // This test assumes user is already authenticated
    // In a real scenario, you'd need to log in first via OAuth or magic link
    await page.goto("/dashboard/security");

    // Look for the passkey management section
    await expect(
      page
        .getByRole("heading", { name: /passkey/i })
        .or(page.getByText(/passkey/i)),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should register a new passkey successfully", async ({
    page,
    webauthn,
  }) => {
    // Pre-condition: user should be logged in
    // Navigate to security settings
    await page.goto("/dashboard/security");

    // Find and click the add passkey button
    const addPasskeyButton = page.getByRole("button", { name: /add passkey/i });
    await expect(addPasskeyButton).toBeVisible({ timeout: 10000 });
    await addPasskeyButton.click();

    // The virtual authenticator automatically handles the WebAuthn ceremony:
    // 1. Browser calls navigator.credentials.create()
    // 2. CDP virtual authenticator generates a credential
    // 3. Credential is returned to the browser
    // 4. Server validates and stores the credential

    // Wait for success message
    await expect(
      page
        .getByText(/passkey registered/i)
        .or(page.getByText(/passkey added/i)),
    ).toBeVisible({ timeout: 15000 });

    // Verify the credential was stored in the virtual authenticator
    const credentials = await webauthn.getCredentials();
    expect(credentials).toHaveLength(1);
    expect(credentials[0].isResidentCredential).toBe(true);
  });

  test("should handle registration cancellation gracefully", async ({
    page,
    webauthn,
  }) => {
    // Disable automatic presence simulation to trigger timeout/cancel
    await webauthn.setAutomaticPresence(false);

    await page.goto("/dashboard/security");

    const addPasskeyButton = page.getByRole("button", { name: /add passkey/i });
    await expect(addPasskeyButton).toBeVisible({ timeout: 10000 });
    await addPasskeyButton.click();

    // Without automatic presence, the ceremony will timeout or show a cancel prompt
    // The UI should handle this gracefully
    await expect(
      page
        .getByText(/registration cancelled/i)
        .or(page.getByText(/timed out/i))
        .or(page.getByText(/try again/i)),
    ).toBeVisible({ timeout: 30000 });

    // Re-enable for other tests
    await webauthn.setAutomaticPresence(true);
  });

  test("should fail registration when user verification fails", async ({
    page,
    webauthn,
  }) => {
    // Set user verification to fail (simulates failed biometric)
    await webauthn.setUserVerified(false);

    await page.goto("/dashboard/security");

    const addPasskeyButton = page.getByRole("button", { name: /add passkey/i });
    await expect(addPasskeyButton).toBeVisible({ timeout: 10000 });
    await addPasskeyButton.click();

    // Registration should fail due to UV failure
    await expect(
      page
        .getByText(/verification failed/i)
        .or(page.getByText(/could not verify/i))
        .or(page.getByText(/error/i)),
    ).toBeVisible({ timeout: 15000 });

    // Reset for other tests
    await webauthn.setUserVerified(true);
  });

  test("should show registered passkey in list after creation", async ({
    page,
  }) => {
    await page.goto("/dashboard/security");

    // Register a passkey first
    const addPasskeyButton = page.getByRole("button", { name: /add passkey/i });
    await addPasskeyButton.click();

    await expect(
      page
        .getByText(/passkey registered/i)
        .or(page.getByText(/passkey added/i)),
    ).toBeVisible({ timeout: 15000 });

    // The page should now show the passkey in a list
    // Look for passkey entry with device info or generic name
    await expect(
      page
        .getByText(/my passkey/i)
        .or(page.locator('[data-testid="passkey-item"]')),
    ).toBeVisible({ timeout: 5000 });
  });
});
