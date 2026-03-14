import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./+server";

// Mock @sveltejs/kit
vi.mock("@sveltejs/kit", () => ({
	json: (data: unknown) =>
		new Response(JSON.stringify(data), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		}),
}));

// Mock $lib/server/db
vi.mock("$lib/server/db", () => ({
	deleteSession: vi.fn().mockResolvedValue(undefined),
}));

import * as dbModule from "$lib/server/db";

// Helper to create mock event
function makeEvent(
	options: {
		hostname?: string;
		cookies?: Record<string, string>;
		env?: any;
	} = {},
) {
	const hostname = options.hostname ?? "localhost";
	const url = new URL(`http://${hostname}/api/auth/logout`);
	const cookieStore: Record<string, string> = { ...options.cookies };

	const defaultEnv = {
		DB: {},
		AUTH: {
			fetch: vi.fn().mockResolvedValue(new Response("ok")),
		},
	};

	return {
		url,
		request: new Request(url, { method: "POST" }),
		cookies: {
			get: vi.fn((name: string) => cookieStore[name]),
			set: vi.fn(),
			delete: vi.fn(),
		},
		platform: { env: { ...defaultEnv, ...options.env } },
	} as any;
}

describe("POST /api/auth/logout", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns success even with no session cookies", async () => {
		const event = makeEvent({
			hostname: "localhost",
			cookies: {},
		});

		const response = await POST(event);
		const json = (await response.json()) as any;

		expect(json).toEqual({ success: true });
		expect(response.status).toBe(200);
	});

	it("deletes D1 session when session cookie exists", async () => {
		const event = makeEvent({
			hostname: "localhost",
			cookies: { session: "sess-123" },
		});

		const response = await POST(event);

		expect(dbModule.deleteSession).toHaveBeenCalledWith(event.platform.env.DB, "sess-123");
		expect(response.status).toBe(200);
	});

	it("revokes SessionDO session when grove_session exists", async () => {
		const event = makeEvent({
			hostname: "localhost",
			cookies: { grove_session: "do-session-456" },
		});

		const response = await POST(event);

		expect(event.platform.env.AUTH.fetch).toHaveBeenCalledWith(
			"https://login.grove.place/session/revoke",
			{
				method: "POST",
				headers: { Cookie: "grove_session=do-session-456" },
			},
		);
		expect(response.status).toBe(200);
	});

	it("clears all auth cookies on localhost", async () => {
		const event = makeEvent({
			hostname: "localhost",
			cookies: {
				session: "sess-123",
				grove_session: "do-session-456",
				access_token: "legacy-token",
				refresh_token: "legacy-refresh",
				"better-auth.session_token": "ba-token",
				"__Secure-better-auth.session_token": "ba-secure-token",
			},
		});

		const response = await POST(event);

		// Should delete all cookies without domain option on localhost
		expect(event.cookies.delete).toHaveBeenCalledWith("session", {
			path: "/",
		});
		expect(event.cookies.delete).toHaveBeenCalledWith("grove_session", {
			path: "/",
		});
		expect(event.cookies.delete).toHaveBeenCalledWith("access_token", {
			path: "/",
		});
		expect(event.cookies.delete).toHaveBeenCalledWith("refresh_token", {
			path: "/",
		});
		expect(event.cookies.delete).toHaveBeenCalledWith("__Secure-better-auth.session_token", {
			path: "/",
		});
		expect(event.cookies.delete).toHaveBeenCalledWith("better-auth.session_token", {
			path: "/",
		});
		expect(response.status).toBe(200);
	});

	it("uses .grove.place domain in production", async () => {
		const event = makeEvent({
			hostname: "app.grove.place",
			cookies: {
				session: "sess-123",
				access_token: "legacy-token",
			},
		});

		const response = await POST(event);

		// Should delete cookies with .grove.place domain in production
		expect(event.cookies.delete).toHaveBeenCalledWith("session", {
			path: "/",
			domain: ".grove.place",
		});
		expect(event.cookies.delete).toHaveBeenCalledWith("access_token", {
			path: "/",
			domain: ".grove.place",
		});
		expect(response.status).toBe(200);
	});

	it("handles D1 deletion failure gracefully", async () => {
		const deleteSessionMock = vi.spyOn(dbModule, "deleteSession");
		deleteSessionMock.mockRejectedValueOnce(new Error("D1 connection failed"));

		const event = makeEvent({
			hostname: "localhost",
			cookies: { session: "sess-123" },
		});

		const response = await POST(event);

		// Should still return success despite deletion failure
		expect(response.status).toBe(200);
		const json = (await response.json()) as any;
		expect(json).toEqual({ success: true });

		// Cookies should still be deleted
		expect(event.cookies.delete).toHaveBeenCalled();

		deleteSessionMock.mockRestore();
	});

	it("handles SessionDO revocation failure gracefully", async () => {
		const event = makeEvent({
			hostname: "localhost",
			cookies: { grove_session: "do-session-456" },
			env: {
				DB: {},
				AUTH: {
					fetch: vi.fn().mockRejectedValue(new Error("SessionDO unavailable")),
				},
			},
		});

		const response = await POST(event);

		// Should still return success despite revocation failure
		expect(response.status).toBe(200);
		const json = (await response.json()) as any;
		expect(json).toEqual({ success: true });

		// Cookies should still be deleted
		expect(event.cookies.delete).toHaveBeenCalled();
	});

	it("skips D1 deletion when no session cookie", async () => {
		const event = makeEvent({
			hostname: "localhost",
			cookies: { grove_session: "do-session-456" },
		});

		const response = await POST(event);

		expect(dbModule.deleteSession).not.toHaveBeenCalled();
		expect(response.status).toBe(200);
	});

	it("skips SessionDO revocation when no grove_session cookie", async () => {
		const event = makeEvent({
			hostname: "localhost",
			cookies: { session: "sess-123" },
		});

		const response = await POST(event);

		expect(event.platform.env.AUTH.fetch).not.toHaveBeenCalled();
		expect(response.status).toBe(200);
	});

	it("skips D1 deletion when DB not available", async () => {
		const event = makeEvent({
			hostname: "localhost",
			cookies: { session: "sess-123" },
			env: {
				DB: null,
				AUTH: {
					fetch: vi.fn().mockResolvedValue(new Response("ok")),
				},
			},
		});

		const response = await POST(event);

		expect(dbModule.deleteSession).not.toHaveBeenCalled();
		expect(response.status).toBe(200);
	});

	it("skips SessionDO revocation when AUTH binding not available", async () => {
		const event = makeEvent({
			hostname: "localhost",
			cookies: { grove_session: "do-session-456" },
			env: {
				DB: {},
				AUTH: null,
			},
		});

		const response = await POST(event);

		expect(response.status).toBe(200);
	});

	it("detects production by checking hostname not localhost", async () => {
		const event = makeEvent({
			hostname: "example.com",
			cookies: { session: "sess-123" },
		});

		const response = await POST(event);

		// example.com is not localhost or 127.0.0.1, so should use .grove.place domain
		expect(event.cookies.delete).toHaveBeenCalledWith(
			"session",
			expect.objectContaining({
				domain: ".grove.place",
			}),
		);
	});

	it("detects production by checking hostname not 127.0.0.1", async () => {
		const event = makeEvent({
			hostname: "127.0.0.1",
			cookies: { session: "sess-123" },
		});

		const response = await POST(event);

		// 127.0.0.1 is localhost, so should not use domain option
		expect(event.cookies.delete).toHaveBeenCalledWith("session", {
			path: "/",
		});
	});

	it("deletes all cookie variants without duplicates", async () => {
		const event = makeEvent({
			hostname: "localhost",
			cookies: {
				session: "sess-123",
				grove_session: "do-session-456",
				access_token: "legacy-token",
				refresh_token: "legacy-refresh",
				"better-auth.session_token": "ba-token",
				"__Secure-better-auth.session_token": "ba-secure-token",
			},
		});

		const response = await POST(event);

		// Should call delete exactly 6 times (one for each cookie type)
		expect(event.cookies.delete).toHaveBeenCalledTimes(6);
		expect(response.status).toBe(200);
	});

	it("returns JSON with success: true", async () => {
		const event = makeEvent({
			hostname: "localhost",
		});

		const response = await POST(event);

		expect(response.headers.get("Content-Type")).toBe("application/json");
		const json = (await response.json()) as any;
		expect(json).toEqual({ success: true });
	});
});
