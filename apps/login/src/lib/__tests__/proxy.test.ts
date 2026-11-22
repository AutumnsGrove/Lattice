/**
 * Tests for the Heartwood proxy — specifically what it tells Heartwood about
 * who is calling.
 *
 * Every /api/auth/* request takes this hop, and the hop is Worker→Worker, so
 * the client's address only survives if this code puts it back. Getting this
 * wrong is invisible: sign-in still works, and every per-IP rate limit quietly
 * becomes one global bucket (#1679).
 */

import { describe, it, expect, vi } from "vitest";
import { CLOUDFLARE_WORKER_CLIENT_IP } from "@autumnsgrove/lattice/server";
import { proxyToHeartwood } from "../proxy";

function makeEvent(headers: Record<string, string> = {}) {
	const authFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
	const request = new Request("https://login.grove.place/api/auth/session", {
		method: "GET",
		headers,
	});

	return {
		authFetch,
		event: {
			request,
			cookies: { getAll: () => [] },
			platform: { env: { AUTH: { fetch: authFetch }, GROVEAUTH_URL: "https://login.grove.place" } },
			url: new URL("https://login.grove.place/api/auth/session"),
		},
	};
}

function forwardedHeaders(authFetch: ReturnType<typeof vi.fn>): Headers {
	const init = authFetch.mock.calls[0]?.[1] as RequestInit;
	return init.headers as Headers;
}

describe("proxyToHeartwood — client IP", () => {
	it("carries the edge-derived client address across the service binding", async () => {
		const { authFetch, event } = makeEvent({ "cf-connecting-ip": "203.0.113.7" });

		await proxyToHeartwood(event as never, "/api/auth/session");

		const headers = forwardedHeaders(authFetch);
		// Both, because Cloudflare regenerates cf-connecting-ip from x-real-ip
		// on a same-zone subrequest — setting only the first is a no-op.
		expect(headers.get("cf-connecting-ip")).toBe("203.0.113.7");
		expect(headers.get("x-real-ip")).toBe("203.0.113.7");
	});

	it("overwrites a client-supplied x-forwarded-for with the edge's address", async () => {
		const { authFetch, event } = makeEvent({
			"cf-connecting-ip": "203.0.113.7",
			"x-forwarded-for": "1.1.1.1",
		});

		await proxyToHeartwood(event as never, "/api/auth/session");

		expect(forwardedHeaders(authFetch).get("x-forwarded-for")).toBe("203.0.113.7");
	});

	it("never forwards Cloudflare's Worker address as if it were a client", async () => {
		const { authFetch, event } = makeEvent({
			"cf-connecting-ip": CLOUDFLARE_WORKER_CLIENT_IP,
		});

		await proxyToHeartwood(event as never, "/api/auth/session");

		const headers = forwardedHeaders(authFetch);
		expect(headers.get("cf-connecting-ip")).toBeNull();
		expect(headers.get("x-real-ip")).toBeNull();
	});
});
