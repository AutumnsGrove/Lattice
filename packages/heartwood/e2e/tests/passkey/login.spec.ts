/**
 * Passkey Login E2E Tests
 *
 * Tests the passkey (WebAuthn) authentication flow using CDP virtual authenticator.
 * Verifies that users can sign in with previously registered passkeys.
 */

import { test, expect } from "../../fixtures/webauthn";

test.describe("Passkey Login", () => {
  test.beforeEach(async ({ webauthn }) => {
    // Clear any existing credentials before each test
    await webauthn.clearCredentials();
  });

  test("should show passkey sign-in option on login page", async ({ page }) => {
    await page.goto("/login");

    // Look for passkey/WebAuthn sign-in option
    await expect(
      page
        .getByRole("button", { name: /sign in with passkey/i })
        .or(page.getByRole("button", { name: /use passkey/i }))
        .or(page.getByText(/passkey/i)),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should successfully login with registered passkey", async ({
    page,
  }) => {
    // First, we need to register a passkey
    // This would normally be done in a setup phase, but for this test we'll
    // assume the user has already registered (the credential would be pre-seeded)

    // For a complete test, you would:
    // 1. Log in via another method (magic link, OAuth)
    // 2. Register a passkey
    // 3. Log out
    // 4. Log in with passkey

    // Navigate to login
    await page.goto("/login");

    // Click passkey sign-in
    const passkeyButton = page
      .getByRole("button", { name: /sign in with passkey/i })
      .or(page.getByRole("button", { name: /use passkey/i }));

    await expect(passkeyButton).toBeVisible({ timeout: 10000 });
    await passkeyButton.click();

    // The virtual authenticator handles the WebAuthn assertion ceremony:
    // 1. Browser calls navigator.credentials.get()
    // 2. CDP virtual authenticator finds matching credential
    // 3. Signs the challenge with stored private key
    // 4. Returns assertion to browser
    // 5. Server validates signature

    // Wait for redirect to dashboard (successful login)
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });

    // Verify user is authenticated by checking for sign out button
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("should handle no matching passkey gracefully", async ({
    page,
    webauthn,
  }) => {
    // Ensure no credentials are registered
    await webauthn.clearCredentials();

    await page.goto("/login");

    const passkeyButton = page
      .getByRole("button", { name: /sign in with passkey/i })
      .or(page.getByRole("button", { name: /use passkey/i }));

    await passkeyButton.click();

    // Should show error when no matching credential found
    await expect(
      page
        .getByText(/no passkey found/i)
        .or(page.getByText(/not recognized/i))
        .or(page.getByText(/try another method/i))
        .or(page.getByText(/error/i)),
    ).toBeVisible({ timeout: 15000 });
  });

  test("should redirect to correct page after passkey login", async ({
    page,
  }) => {
    // Navigate to a protected page that requires auth
    await page.goto("/dashboard/settings");

    // Should redirect to login with return URL
    await expect(page).toHaveURL(/login/);

    // Complete passkey login
    const passkeyButton = page
      .getByRole("button", { name: /sign in with passkey/i })
      .or(page.getByRole("button", { name: /use passkey/i }));

    await passkeyButton.click();

    // Should redirect back to the original page
    await expect(page).toHaveURL(/dashboard\/settings/, { timeout: 15000 });
  });

  test("should fail login when user verification fails", async ({
    page,
    webauthn,
  }) => {
    // Set user verification to fail
    await webauthn.setUserVerified(false);

    await page.goto("/login");

    const passkeyButton = page
      .getByRole("button", { name: /sign in with passkey/i })
      .or(page.getByRole("button", { name: /use passkey/i }));

    await passkeyButton.click();

    // Should show verification error
    await expect(
      page
        .getByText(/verification failed/i)
        .or(page.getByText(/could not verify/i))
        .or(page.getByText(/authentication failed/i)),
    ).toBeVisible({ timeout: 15000 });

    // Reset
    await webauthn.setUserVerified(true);
  });
});
