/**
 * Tests for validateGroveSession
 *
 * Covers the two bugs it fixes: forwarding the real client IP on the
 * service-binding call to Heartwood (so its per-IP rate limit doesn't
 * collapse every caller into a single "unknown" bucket), and short-lived
 * caching so a burst of near-simultaneous requests from one browser only
 * pays for one round trip.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateGroveSession } from "./hooks";

function createFakeEdgeCache() {
	const store = new Map<string, Response>();
	return {
		match: vi.fn(async (req: Request) => {
			const hit = store.get(req.url);
			return hit ? hit.clone() : undefined;
		}),
		put: vi.fn(async (req: Request, res: Response) => {
			store.set(req.url, res.clone());
		}),
	};
}

function createAuthFetcher(response: Response | (() => Response)) {
	const fetch = vi.fn(async () => (typeof response === "function" ? response() : response));
	return { fetch } as unknown as Fetcher;
}

const validBody = JSON.stringify({ valid: true, user: { id: "u1", email: "a@b.com" } });

beforeEach(() => {
	vi.unstubAllGlobals();
	vi.stubGlobal("caches", { default: createFakeEdgeCache() });
});

// Regression: under `vite dev` Aspen runs in plain Node, where there is no
// Cache API. The unguarded `caches.default` threw inside a promise that
// hooks.server.ts starts early and awaits later, so the rejection went
// unhandled and Node killed the whole dev server (not a 500) for any request
// carrying a session cookie. Every other test here stubs a cache, which is
// why this was never caught.
describe("validateGroveSession without an edge cache (plain Node)", () => {
	beforeEach(() => {
		vi.stubGlobal("caches", undefined);
	});

	it("still validates against Heartwood instead of throwing", async () => {
		const auth = createAuthFetcher(new Response(validBody, { status: 200 }));
		const request = new Request("http://localhost:5173/", {
			headers: { "X-Forwarded-For": "127.0.0.1" },
		});

		const response = await validateGroveSession(
			auth,
			request,
			"session-token-1",
			"grove_session=session-token-1",
		);

		expect(response?.status).toBe(200);
		expect(auth.fetch).toHaveBeenCalledTimes(1);
	});

	it("does not cache, so every request is validated", async () => {
		const auth = createAuthFetcher(() => new Response(validBody, { status: 200 }));
		const request = new Request("http://localhost:5173/");

		await validateGroveSession(auth, request, "session-token-1", "grove_session=session-token-1");
		await validateGroveSession(auth, request, "session-token-1", "grove_session=session-token-1");

		expect(auth.fetch).toHaveBeenCalledTimes(2);
	});

	it("tolerates a caches object that has no default cache", async () => {
		vi.stubGlobal("caches", {});
		const auth = createAuthFetcher(new Response(validBody, { status: 200 }));
		const request = new Request("http://localhost:5173/");

		const response = await validateGroveSession(
			auth,
			request,
			"session-token-1",
			"grove_session=session-token-1",
		);

		expect(response?.status).toBe(200);
	});

	it("still treats a failed validation as unauthenticated", async () => {
		const auth = {
			fetch: vi.fn().mockRejectedValue(new Error("heartwood down")),
		} as unknown as Fetcher;
		const request = new Request("http://localhost:5173/");

		const response = await validateGroveSession(
			auth,
			request,
			"session-token-1",
			"grove_session=session-token-1",
		);

		expect(response).toBeNull();
	});
});

describe("validateGroveSession", () => {
	it("forwards the original request's CF-Connecting-IP to Heartwood", async () => {
		const auth = createAuthFetcher(new Response(validBody, { status: 200 }));
		const request = new Request("https://aspen.grove.place/arbor/garden", {
			headers: { "CF-Connecting-IP": "203.0.113.7" },
		});

		await validateGroveSession(auth, request, "session-token-1", "grove_session=session-token-1");

		expect(auth.fetch).toHaveBeenCalledTimes(1);
		const [, init] = (auth.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		const headers = init.headers as Record<string, string>;
		expect(headers["CF-Connecting-IP"]).toBe("203.0.113.7");
		expect(headers["Cookie"]).toBe("grove_session=session-token-1");
	});

	it("falls back to X-Forwarded-For when CF-Connecting-IP is absent", async () => {
		const auth = createAuthFetcher(new Response(validBody, { status: 200 }));
		const request = new Request("https://aspen.grove.place/arbor/garden", {
			headers: { "X-Forwarded-For": "198.51.100.4, 10.0.0.1" },
		});

		await validateGroveSession(auth, request, "session-token-1", "grove_session=session-token-1");

		const [, init] = (auth.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		const headers = init.headers as Record<string, string>;
		expect(headers["CF-Connecting-IP"]).toBe("198.51.100.4");
	});

	it("reuses a cached validation for a second near-simultaneous request instead of re-calling Heartwood", async () => {
		const auth = createAuthFetcher(new Response(validBody, { status: 200 }));
		const request = new Request("https://aspen.grove.place/arbor/garden", {
			headers: { "CF-Connecting-IP": "203.0.113.7" },
		});

		const first = await validateGroveSession(
			auth,
			request,
			"session-token-1",
			"grove_session=session-token-1",
		);
		const second = await validateGroveSession(
			auth,
			request,
			"session-token-1",
			"grove_session=session-token-1",
		);

		expect(auth.fetch).toHaveBeenCalledTimes(1);
		expect(await first?.json()).toEqual(JSON.parse(validBody));
		expect(await second?.json()).toEqual(JSON.parse(validBody));
	});

	it("does not cache a rate-limited (non-ok) response", async () => {
		const auth = createAuthFetcher(
			new Response(JSON.stringify({ error: "rate_limit" }), { status: 429 }),
		);
		const request = new Request("https://aspen.grove.place/arbor/garden", {
			headers: { "CF-Connecting-IP": "203.0.113.7" },
		});

		await validateGroveSession(auth, request, "session-token-1", "grove_session=session-token-1");
		await validateGroveSession(auth, request, "session-token-1", "grove_session=session-token-1");

		// A denied check must never be remembered — otherwise a transient
		// hiccup would lock the user out for the full cache window.
		expect(auth.fetch).toHaveBeenCalledTimes(2);
	});

	it("keys the cache by session token, so two different sessions never collide", async () => {
		const auth = createAuthFetcher(new Response(validBody, { status: 200 }));
		const request = new Request("https://aspen.grove.place/arbor/garden", {
			headers: { "CF-Connecting-IP": "203.0.113.7" },
		});

		await validateGroveSession(auth, request, "session-token-1", "grove_session=session-token-1");
		await validateGroveSession(auth, request, "session-token-2", "grove_session=session-token-2");

		expect(auth.fetch).toHaveBeenCalledTimes(2);
	});

	it("returns null and does not throw when the service-binding call fails", async () => {
		const auth = {
			fetch: vi.fn().mockRejectedValue(new Error("network down")),
		} as unknown as Fetcher;
		const request = new Request("https://aspen.grove.place/arbor/garden");

		const result = await validateGroveSession(
			auth,
			request,
			"session-token-1",
			"grove_session=session-token-1",
		);

		expect(result).toBeNull();
	});
});
