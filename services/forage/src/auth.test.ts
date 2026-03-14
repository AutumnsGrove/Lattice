/**
 * Auth Module Tests
 *
 * Tests session validation, unauthorized response, and client ID extraction.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateSession, unauthorizedResponse, getClientId } from "./auth";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("validateSession", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("should return null when no cookie header", async () => {
		const request = new Request("https://forage.grove.place/api/search", {
			method: "GET",
		});

		const result = await validateSession(request);
		expect(result).toBeNull();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("should forward cookies to auth endpoint", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				user: { id: "u1", email: "test@test.com" },
				session: { id: "s1" },
			}),
		});

		const request = new Request("https://forage.grove.place/api/search", {
			headers: { cookie: "session_token=abc123" },
		});

		await validateSession(request);

		expect(mockFetch).toHaveBeenCalledWith(
			"https://auth-api.grove.place/api/auth/session",
			expect.objectContaining({
				headers: expect.objectContaining({
					cookie: "session_token=abc123",
				}),
			}),
		);
	});

	it("should return session data on success", async () => {
		const sessionData = {
			user: {
				id: "u1",
				email: "user@test.com",
				name: "Test User",
				emailVerified: true,
			},
			session: {
				id: "s1",
				userId: "u1",
				expiresAt: "2026-12-31",
				token: "tok",
			},
		};

		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => sessionData,
		});

		const request = new Request("https://forage.grove.place/api/search", {
			headers: { cookie: "session_token=abc123" },
		});

		const result = await validateSession(request);
		expect(result).toEqual(sessionData);
	});

	it("should return null when auth endpoint returns non-200", async () => {
		mockFetch.mockResolvedValue({ ok: false, status: 401 });

		const request = new Request("https://forage.grove.place/api/search", {
			headers: { cookie: "session_token=expired" },
		});

		const result = await validateSession(request);
		expect(result).toBeNull();
	});

	it("should return null when response lacks user.id", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				user: { email: "no-id@test.com" },
				session: { id: "s1" },
			}),
		});

		const request = new Request("https://forage.grove.place/api/search", {
			headers: { cookie: "session_token=abc123" },
		});

		const result = await validateSession(request);
		expect(result).toBeNull();
	});

	it("should return null when response lacks session.id", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				user: { id: "u1" },
				session: {},
			}),
		});

		const request = new Request("https://forage.grove.place/api/search", {
			headers: { cookie: "session_token=abc123" },
		});

		const result = await validateSession(request);
		expect(result).toBeNull();
	});

	it("should return null on fetch error", async () => {
		mockFetch.mockRejectedValue(new Error("Network error"));

		const request = new Request("https://forage.grove.place/api/search", {
			headers: { cookie: "session_token=abc123" },
		});

		const result = await validateSession(request);
		expect(result).toBeNull();
	});
});

describe("unauthorizedResponse", () => {
	it("should return 401 status", () => {
		const response = unauthorizedResponse();
		expect(response.status).toBe(401);
	});

	it("should include JSON error body", async () => {
		const response = unauthorizedResponse();
		const body = (await response.json()) as any;
		expect(body.error).toBe("Unauthorized");
		expect(body.message).toContain("sign in");
	});

	it("should include WWW-Authenticate header", () => {
		const response = unauthorizedResponse();
		expect(response.headers.get("WWW-Authenticate")).toBe('Cookie realm="Better Auth"');
	});

	it("should set Content-Type to JSON", () => {
		const response = unauthorizedResponse();
		expect(response.headers.get("Content-Type")).toBe("application/json");
	});
});

describe("getClientId", () => {
	it("should return user email as client ID", () => {
		expect(getClientId({ email: "user@test.com" })).toBe("user@test.com");
	});
});
