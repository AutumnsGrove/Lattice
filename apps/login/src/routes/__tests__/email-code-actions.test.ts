/**
 * Tests for the email-code form actions (sendCode / verifyCode).
 *
 * Heartwood is faked through the AUTH service binding; what matters here is
 * what the actions send, what they hand back to the browser, and which
 * cookies they forward.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("$app/environment", () => ({ dev: false }));
vi.mock("@autumnsgrove/lattice/errors", () => ({ logGroveError: vi.fn() }));

import { actions } from "../+page.server";
import { EMAIL_CODE_MESSAGES } from "$lib/email-code";

type ActionResult = { status?: number; data?: Record<string, unknown> } & Record<string, unknown>;

function formRequest(fields: Record<string, string>) {
	const body = new FormData();
	for (const [key, value] of Object.entries(fields)) body.set(key, value);
	return new Request("https://login.grove.place/?/x", { method: "POST", body });
}

function makeEvent(fields: Record<string, string>, authFetch: ReturnType<typeof vi.fn>) {
	return {
		request: formRequest(fields),
		url: new URL("https://login.grove.place/"),
		platform: { env: { AUTH: { fetch: authFetch } } },
		getClientAddress: () => "203.0.113.7",
		cookies: { set: vi.fn(), get: vi.fn(), delete: vi.fn() },
	};
}

async function run(
	name: "sendCode" | "verifyCode",
	event: ReturnType<typeof makeEvent>,
): Promise<ActionResult> {
	try {
		return (await (actions[name] as (e: unknown) => Promise<ActionResult>)(event)) ?? {};
	} catch (thrown) {
		// SvelteKit redirects are thrown; surface them as data for assertions
		const redirect = thrown as { status?: number; location?: string };
		if (redirect.location) return { redirectStatus: redirect.status, location: redirect.location };
		throw thrown;
	}
}

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
	new Response(JSON.stringify(body), { status, headers });

describe("sendCode", () => {
	let authFetch: ReturnType<typeof vi.fn>;
	beforeEach(() => {
		authFetch = vi.fn();
	});

	it("rejects a malformed email without calling Heartwood", async () => {
		const result = await run("sendCode", makeEvent({ email: "nope" }, authFetch));

		expect(result.status).toBe(400);
		expect(result.data?.error).toBe(EMAIL_CODE_MESSAGES.INVALID_EMAIL);
		expect(authFetch).not.toHaveBeenCalled();
	});

	it("asks Heartwood for a code, forwarding the platform IP and a normalized email", async () => {
		authFetch.mockResolvedValue(json({ success: true }));

		const result = await run(
			"sendCode",
			makeEvent(
				{ email: " Friend@Example.com ", redirect: "https://grove.place/hello" },
				authFetch,
			),
		);

		const [url, init] = authFetch.mock.calls[0];
		expect(url).toContain("/api/auth/email-otp/send-verification-otp");
		expect(JSON.parse(init.body)).toEqual({ email: "friend@example.com", type: "sign-in" });
		expect(init.headers["cf-connecting-ip"]).toBe("203.0.113.7");
		expect(result).toEqual({
			step: "code",
			email: "friend@example.com",
			redirect: "https://grove.place/hello",
		});
	});

	it("keeps a Heartwood rate limit as 429 and an outage as 502", async () => {
		authFetch.mockResolvedValueOnce(json({}, 429));
		const limited = await run("sendCode", makeEvent({ email: "a@b.co" }, authFetch));
		expect(limited.status).toBe(429);
		expect(limited.data?.error).toBe(EMAIL_CODE_MESSAGES.RATE_LIMITED);

		authFetch.mockResolvedValueOnce(json({}, 500));
		const down = await run("sendCode", makeEvent({ email: "a@b.co" }, authFetch));
		expect(down.status).toBe(502);
		expect(down.data?.error).toBe(EMAIL_CODE_MESSAGES.SEND_FAILED);
	});

	it("answers 503 when the service binding throws", async () => {
		authFetch.mockRejectedValue(new Error("binding down"));

		const result = await run("sendCode", makeEvent({ email: "a@b.co" }, authFetch));

		expect(result.status).toBe(503);
		expect(result.data?.error).toBe(EMAIL_CODE_MESSAGES.SEND_FAILED);
	});
});

describe("verifyCode", () => {
	let authFetch: ReturnType<typeof vi.fn>;
	beforeEach(() => {
		authFetch = vi.fn();
	});

	it("rejects a code of the wrong shape without calling Heartwood", async () => {
		const result = await run("verifyCode", makeEvent({ email: "a@b.co", code: "12" }, authFetch));

		expect(result.status).toBe(400);
		expect(result.data?.error).toBe(EMAIL_CODE_MESSAGES.INVALID_CODE_FORMAT);
		expect(authFetch).not.toHaveBeenCalled();
	});

	it("maps Better Auth's error code to a friendly message and stays on the code step", async () => {
		authFetch.mockResolvedValue(json({ code: "OTP_EXPIRED" }, 400));

		const result = await run(
			"verifyCode",
			makeEvent({ email: "a@b.co", code: "123 456" }, authFetch),
		);

		expect(JSON.parse(authFetch.mock.calls[0][1].body)).toEqual({ email: "a@b.co", otp: "123456" });
		expect(result.status).toBe(400);
		expect(result.data).toMatchObject({ step: "code", error: EMAIL_CODE_MESSAGES.CODE_EXPIRED });
	});

	it("forwards Heartwood's session cookies unencoded, then hands off to /callback", async () => {
		const headers = new Headers();
		headers.append(
			"set-cookie",
			"better-auth.session_token=abc%2Fdef.sig%3D; Path=/; Domain=.grove.place; HttpOnly; Secure",
		);
		authFetch.mockResolvedValue(new Response("{}", { status: 200, headers }));
		const event = makeEvent(
			{ email: "a@b.co", code: "123456", redirect: "https://grove.place/home" },
			authFetch,
		);

		const result = await run("verifyCode", event);

		expect(event.cookies.set).toHaveBeenCalledTimes(1);
		const [name, value, options] = event.cookies.set.mock.calls[0];
		expect(name).toBe("better-auth.session_token");
		expect(value).toBe("abc%2Fdef.sig%3D");
		expect(options.encode("abc%2F")).toBe("abc%2F");
		expect(result).toEqual({
			redirectStatus: 302,
			location: `/callback?redirect=${encodeURIComponent("https://grove.place/home")}`,
		});
	});

	it("never redirects to an unlisted host, even if the form asks", async () => {
		authFetch.mockResolvedValue(new Response("{}", { status: 200 }));

		const result = await run(
			"verifyCode",
			makeEvent(
				{ email: "a@b.co", code: "123456", redirect: "https://evil.example/steal" },
				authFetch,
			),
		);

		expect(result.location).toBe(`/callback?redirect=${encodeURIComponent("https://grove.place")}`);
	});
});
