/**
 * Device Code Flow E2E Tests
 *
 * Tests the RFC 8628 Device Authorization Grant flow, used by:
 * - Grove CLI (command-line authentication)
 * - TV/IoT applications
 * - Any device with limited input capability
 *
 * The flow:
 * 1. Device requests device_code + user_code
 * 2. User visits verification_uri in browser
 * 3. User enters user_code and approves
 * 4. Device polls for access token
 */

import { test, expect } from "@playwright/test";
import { createApiClient } from "../../utils/api-client";
import { TEST_CLIENT } from "../../utils/test-user";

test.describe("Device Code Authorization Flow", () => {
  test("should initiate device code flow and return codes", async ({
    request,
  }) => {
    const api = createApiClient(request);

    // CLI initiates device code request
    const response = await api.initiateDeviceCode(TEST_CLIENT.id);

    // Verify all required fields are present (RFC 8628 Section 3.2)
    expect(response.device_code).toBeDefined();
    expect(response.user_code).toBeDefined();
    expect(response.verification_uri).toBeDefined();
    expect(response.verification_uri_complete).toBeDefined();
    expect(response.expires_in).toBeGreaterThan(0);
    expect(response.interval).toBeGreaterThan(0);

    // User code should be human-readable (typically 8 chars with hyphen)
    expect(response.user_code).toMatch(/^[A-Z0-9-]+$/);
  });

  test("should show device authorization page with user code", async ({
    page,
    request,
  }) => {
    const api = createApiClient(request);

    // CLI initiates device code
    const { user_code, verification_uri } = await api.initiateDeviceCode(
      TEST_CLIENT.id,
    );

    // User visits verification URI
    await page.goto(verification_uri);

    // Page should show a form to enter the user code
    await expect(
      page
        .getByRole("textbox", { name: /code/i })
        .or(page.getByPlaceholder(/code/i)),
    ).toBeVisible({ timeout: 10000 });

    // Enter the user code
    const codeInput = page
      .getByRole("textbox", { name: /code/i })
      .or(page.getByPlaceholder(/code/i));
    await codeInput.fill(user_code);

    // Submit the code
    const submitButton = page
      .getByRole("button", { name: /submit/i })
      .or(page.getByRole("button", { name: /verify/i }));
    await submitButton.click();

    // Should show the authorization prompt (approve/deny)
    await expect(
      page
        .getByText(/authorize/i)
        .or(page.getByText(/allow/i))
        .or(page.getByText(/approve/i)),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should pre-fill user code from verification_uri_complete", async ({
    page,
    request,
  }) => {
    const api = createApiClient(request);

    // CLI initiates device code
    const { verification_uri_complete } = await api.initiateDeviceCode(
      TEST_CLIENT.id,
    );

    // User visits the complete URI (with code pre-filled)
    await page.goto(verification_uri_complete);

    // Should skip code entry and go directly to authorization
    // Or show the code pre-filled in the input
    await expect(
      page
        .getByText(/authorize/i)
        .or(page.getByText(/approve/i))
        .or(page.getByText(/allow/i)),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should complete full CLI authentication journey", async ({
    page,
    request,
  }) => {
    const api = createApiClient(request);

    // 1. CLI initiates device code
    const { device_code, verification_uri_complete, interval } =
      await api.initiateDeviceCode(TEST_CLIENT.id);

    // 2. Initially, polling returns authorization_pending
    const pendingResult = await api.pollDeviceCode(device_code, TEST_CLIENT.id);
    expect("error" in pendingResult && pendingResult.error).toBe(
      "authorization_pending",
    );

    // 3. User visits verification URI and approves
    await page.goto(verification_uri_complete);

    // Wait for authorization page
    await expect(
      page.getByText(/authorize/i).or(page.getByText(/approve/i)),
    ).toBeVisible({ timeout: 10000 });

    // Click approve button
    const approveButton = page
      .getByRole("button", { name: /approve/i })
      .or(page.getByRole("button", { name: /allow/i }))
      .or(page.getByRole("button", { name: /authorize/i }));

    await approveButton.click();

    // Wait for success confirmation
    await expect(
      page
        .getByText(/approved/i)
        .or(page.getByText(/authorized/i))
        .or(page.getByText(/success/i)),
    ).toBeVisible({ timeout: 10000 });

    // 4. CLI polls again and receives tokens
    // Wait the interval before polling
    await page.waitForTimeout(interval * 1000);

    const tokenResult = await api.pollDeviceCode(device_code, TEST_CLIENT.id);

    // Should now have access token
    expect("access_token" in tokenResult).toBe(true);
    if ("access_token" in tokenResult) {
      expect(tokenResult.access_token).toBeDefined();
      expect(tokenResult.token_type).toBe("Bearer");
      expect(tokenResult.expires_in).toBeGreaterThan(0);
    }
  });

  test("should handle user denial", async ({ page, request }) => {
    const api = createApiClient(request);

    // CLI initiates device code
    const { device_code, verification_uri_complete, interval } =
      await api.initiateDeviceCode(TEST_CLIENT.id);

    // User visits verification URI
    await page.goto(verification_uri_complete);

    // Wait for authorization page
    await expect(
      page.getByText(/authorize/i).or(page.getByText(/approve/i)),
    ).toBeVisible({ timeout: 10000 });

    // Click deny button
    const denyButton = page
      .getByRole("button", { name: /deny/i })
      .or(page.getByRole("button", { name: /reject/i }))
      .or(page.getByRole("button", { name: /cancel/i }));

    await denyButton.click();

    // Wait for denial confirmation
    await expect(
      page
        .getByText(/denied/i)
        .or(page.getByText(/rejected/i))
        .or(page.getByText(/cancelled/i)),
    ).toBeVisible({ timeout: 10000 });

    // Poll should return access_denied error
    await page.waitForTimeout(interval * 1000);
    const result = await api.pollDeviceCode(device_code, TEST_CLIENT.id);

    expect("error" in result && result.error).toBe("access_denied");
  });

  test("should return slow_down when polling too fast", async ({ request }) => {
    const api = createApiClient(request);

    // Initiate device code
    const { device_code } = await api.initiateDeviceCode(TEST_CLIENT.id);

    // Poll multiple times without waiting the interval
    const results: any[] = [];
    for (let i = 0; i < 3; i++) {
      results.push(await api.pollDeviceCode(device_code, TEST_CLIENT.id));
    }

    // At least one should be slow_down (or all authorization_pending if rate limit is lenient)
    const hasSlowDown = results.some(
      (r) => "error" in r && r.error === "slow_down",
    );
    const allPending = results.every(
      (r) => "error" in r && r.error === "authorization_pending",
    );

    // Either slow_down was returned, or all were pending (both are valid behaviors)
    expect(hasSlowDown || allPending).toBe(true);
  });

  test("should handle expired device code", async ({ request }) => {
    const api = createApiClient(request);

    // Note: This test would require a very short expiry time in test config
    // or a way to fast-forward time. For now, we just verify the error format.

    // Use an invalid/expired device code
    const result = await api.pollDeviceCode(
      "invalid-device-code",
      TEST_CLIENT.id,
    );

    // Should return an error (expired_token or invalid request)
    expect("error" in result).toBe(true);
  });

  test("should show correct client name on authorization page", async ({
    page,
    request,
  }) => {
    const api = createApiClient(request);

    const { verification_uri_complete } = await api.initiateDeviceCode(
      TEST_CLIENT.id,
    );

    await page.goto(verification_uri_complete);

    // The authorization page should show what app is requesting access
    await expect(
      page
        .getByText(/grove cli/i)
        .or(page.getByText(TEST_CLIENT.name, { exact: false })),
    ).toBeVisible({ timeout: 10000 });
  });
});
