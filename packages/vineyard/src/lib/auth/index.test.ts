/**
 * Auth Integration Tests
 *
 * Tests for Better Auth integration - focuses on behavior users experience,
 * not implementation details. Tests validate security (provider validation)
 * and resilience (graceful failure handling).
 *
 * Following grove-testing philosophy:
 * - Test behavior, not implementation
 * - Mock at boundaries (external auth server), not internal code
 * - One clear reason to fail per test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { signIn, getSession, signOut } from "./index.js";

// Mock window.location (boundary between our code and browser)
const mockLocation = {
	href: "https://test.grove.place",
};

beforeEach(() => {
	// @ts-expect-error - mocking browser API
	delete window.location;
	// @ts-expect-error - mocking browser API
	window.location = mockLocation;
	mockLocation.href = "https://test.grove.place";
	vi.clearAllMocks();
});

// ====================================================================================
// signIn() - Critical security: must reject invalid providers
// ====================================================================================

describe("signIn - provider validation", () => {
	it("should reject invalid OAuth provider to prevent open redirect", () => {
		// Why this test: Prevents security vulnerability where attacker could
		// redirect users to malicious OAuth provider
		expect(() => {
			// @ts-expect-error - testing runtime validation
			signIn("evil-provider");
		}).toThrow(/Invalid provider.*evil-provider/);
	});

	it("should accept valid providers without throwing", () => {
		// Why this test: Ensures validation doesn't block legitimate use
		expect(() => signIn("google")).not.toThrow();
		expect(() => signIn("github")).not.toThrow();
	});
});

// ====================================================================================
// getSession() - Resilience: must handle auth server failures gracefully
// ====================================================================================

describe("getSession - error resilience", () => {
	it("should treat network failure as unauthenticated (fail safe)", async () => {
		// Why this test: Network errors shouldn't crash the app or leak sensitive data
		// Behavior: User sees "not logged in" state, can retry
		global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

		const result = await getSession();

		expect(result.user).toBeNull();
		expect(result.session).toBeNull();
	});

	it("should treat 401 Unauthorized as unauthenticated", async () => {
		// Why this test: Expired sessions or invalid tokens are common
		// Behavior: User sees "not logged in", can sign in again
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 401,
		});

		const result = await getSession();

		expect(result.user).toBeNull();
		expect(result.session).toBeNull();
	});

	it("should return user data when authenticated", async () => {
		// Why this test: The happy path - ensures authenticated users get their data
		const mockUser = {
			id: "user-123",
			name: "Taylor Swift",
			email: "taylor@folklore.com",
			emailVerified: true,
			createdAt: new Date("2020-07-24"),
			updatedAt: new Date("2024-04-19"),
		};

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				user: mockUser,
				session: {
					id: "session-456",
					userId: mockUser.id,
					expiresAt: new Date("2026-01-22"),
					createdAt: new Date("2026-01-21"),
				},
			}),
		});

		const result = await getSession();

		expect(result.user).toEqual(mockUser);
		expect(result.session).toBeTruthy();
	});
});

// ====================================================================================
// signOut() - Resilience: must complete even if server fails
// ====================================================================================

describe("signOut - logout completion", () => {
	it("should complete sign out even if server request fails", async () => {
		// Why this test: User clicked "sign out" - they MUST be signed out locally
		// even if the server is unreachable. Security requirement: no half-logged-out state.
		global.fetch = vi.fn().mockRejectedValue(new Error("Server down"));

		await signOut("/goodbye");

		// User is redirected regardless of server response
		expect(window.location.href).toBe("/goodbye");
	});

	it("should redirect to home by default after sign out", async () => {
		// Why this test: Default behavior after logout should be sensible
		global.fetch = vi.fn().mockResolvedValue({ ok: true });

		await signOut();

		expect(window.location.href).toBe("/");
	});
});
