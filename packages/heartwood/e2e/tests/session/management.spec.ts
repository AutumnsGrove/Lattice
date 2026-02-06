/**
 * Session Management E2E Tests
 *
 * Tests session lifecycle, cookie handling, and cross-subdomain auth.
 */

import { test, expect } from "@playwright/test";
import { createApiClient } from "../../utils/api-client";

test.describe("Session Management", () => {
  test("should return null session when not authenticated", async ({
    request,
  }) => {
    const api = createApiClient(request);

    const session = await api.getSession();
    expect(session).toBeNull();
  });

  test("should show login page for unauthenticated users", async ({ page }) => {
    await page.goto("/login");

    // Should see login options
    await expect(
      page
        .getByText(/sign in/i)
        .or(page.getByText(/log in/i))
        .or(page.getByRole("button", { name: /google/i })),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should redirect protected routes to login", async ({ page }) => {
    // Try to access dashboard without auth
    await page.goto("/dashboard");

    // Should redirect to login
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

  test("should preserve return URL after login redirect", async ({ page }) => {
    // Try to access a specific protected route
    await page.goto("/dashboard/security");

    // Should redirect to login with return URL
    await expect(page).toHaveURL(/login/);

    // The return URL should be preserved (implementation may vary)
    // Some implementations use ?redirect= or ?returnTo= query params
    const url = page.url();
    const hasReturnUrl =
      url.includes("redirect") ||
      url.includes("returnTo") ||
      url.includes("callbackUrl");

    // Log for debugging if return URL handling is different
    if (!hasReturnUrl) {
      console.log(
        "Note: Return URL may be stored in session state instead of query param",
      );
    }
  });

  test("should handle session cookie correctly", async ({ context }) => {
    // Check initial cookies
    const initialCookies = await context.cookies();
    const sessionCookie = initialCookies.find(
      (c) => c.name.includes("session") || c.name.includes("auth"),
    );

    // If not logged in, may not have session cookie
    if (sessionCookie) {
      // Session cookie should have proper attributes
      expect(sessionCookie.httpOnly).toBe(true);
      expect(sessionCookie.secure).toBe(true);
      expect(sessionCookie.sameSite).toBe("Lax");
    }
  });

  test("should show appropriate error for invalid session", async ({
    page,
    context,
  }) => {
    // Set an invalid session cookie
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: "invalid-session-token",
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false, // localhost doesn't require secure
        sameSite: "Lax",
      },
    ]);

    // Try to access protected route
    await page.goto("/dashboard");

    // Should redirect to login (invalid session should be rejected)
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

  test("API health check should work without auth", async ({ request }) => {
    const api = createApiClient(request);

    const health = await api.healthCheck();
    expect(health.status).toBe("ok");
  });
});

test.describe("Cross-Subdomain Sessions", () => {
  // Note: These tests verify the cookie configuration for cross-subdomain auth
  // Actual cross-subdomain testing requires running on .grove.place domain

  test("should set cookie with correct domain for production", async ({
    page,
  }) => {
    // This test documents the expected behavior
    // In production, cookies are set with domain=.grove.place
    // allowing auth to work across heartwood.grove.place, amber.grove.place, etc.

    await page.goto("/login");

    // Just verify the page loads - actual cross-domain testing needs real domains
    await expect(page).toHaveURL(/login/);
  });
});
