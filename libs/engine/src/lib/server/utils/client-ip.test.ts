import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	CLOUDFLARE_WORKER_CLIENT_IP,
	clientIpHeaders,
	isCloudflareWorkerIp,
	isValidIpAddress,
	requestWithClientIp,
	resolveClientIP,
	resolveClientIPorLog,
} from "./client-ip.js";

function request(headers: Record<string, string> = {}): Request {
	return new Request("https://login.grove.place/api/auth/session", { headers });
}

describe("isValidIpAddress", () => {
	it("accepts ipv4 and ipv6", () => {
		expect(isValidIpAddress("203.0.113.7")).toBe(true);
		expect(isValidIpAddress("2a06:98c0:3600::103")).toBe(true);
	});

	it("rejects the shapes that show up when something is wrong", () => {
		expect(isValidIpAddress("")).toBe(false);
		expect(isValidIpAddress(null)).toBe(false);
		expect(isValidIpAddress("unknown")).toBe(false);
		expect(isValidIpAddress("203.0.113.7, 10.0.0.1")).toBe(false);
	});
});

describe("isCloudflareWorkerIp", () => {
	it("recognises Cloudflare's Worker-subrequest address", () => {
		expect(isCloudflareWorkerIp(CLOUDFLARE_WORKER_CLIENT_IP)).toBe(true);
		expect(isCloudflareWorkerIp(" 2a06:98c0:3600::103 ")).toBe(true);
		expect(isCloudflareWorkerIp("203.0.113.7")).toBe(false);
		expect(isCloudflareWorkerIp(null)).toBe(false);
	});
});

describe("resolveClientIP", () => {
	it("prefers cf-connecting-ip on a direct request", () => {
		expect(resolveClientIP(request({ "cf-connecting-ip": "203.0.113.7" }))).toEqual({
			ip: "203.0.113.7",
			source: "direct",
		});
	});

	it("refuses to report the Worker sentinel as a client, falling back to x-real-ip", () => {
		const resolved = resolveClientIP(
			request({
				"cf-connecting-ip": CLOUDFLARE_WORKER_CLIENT_IP,
				"x-real-ip": "198.51.100.4",
			}),
		);

		expect(resolved).toEqual({ ip: "198.51.100.4", source: "forwarded" });
	});

	it("falls back to the first x-forwarded-for hop", () => {
		const resolved = resolveClientIP(
			request({
				"cf-connecting-ip": CLOUDFLARE_WORKER_CLIENT_IP,
				"x-forwarded-for": "198.51.100.4, 10.0.0.1",
			}),
		);

		expect(resolved).toEqual({ ip: "198.51.100.4", source: "forwarded" });
	});

	it("reports nothing rather than a shared bucket disguised as an IP", () => {
		expect(resolveClientIP(request({ "cf-connecting-ip": CLOUDFLARE_WORKER_CLIENT_IP }))).toEqual({
			ip: null,
			source: "none",
		});
		expect(resolveClientIP(request())).toEqual({ ip: null, source: "none" });
	});

	it("ignores a client-supplied x-forwarded-for when the edge already named the client", () => {
		const resolved = resolveClientIP(
			request({
				"cf-connecting-ip": "203.0.113.7",
				"x-forwarded-for": "1.1.1.1",
			}),
		);

		expect(resolved).toEqual({ ip: "203.0.113.7", source: "direct" });
	});
});

describe("clientIpHeaders", () => {
	it("sets both headers Cloudflare honours across a Worker subrequest", () => {
		expect(clientIpHeaders("203.0.113.7")).toEqual({
			"cf-connecting-ip": "203.0.113.7",
			"x-real-ip": "203.0.113.7",
			"x-forwarded-for": "203.0.113.7",
		});
	});

	it("sets nothing for an unusable value", () => {
		expect(clientIpHeaders(null)).toEqual({});
		expect(clientIpHeaders("unknown")).toEqual({});
	});
});

describe("requestWithClientIp", () => {
	it("leaves a direct request alone", () => {
		const original = request({ "cf-connecting-ip": "203.0.113.7" });
		expect(requestWithClientIp(original)).toBe(original);
	});

	it("rewrites the sentinel into the forwarded client address", () => {
		const rewritten = requestWithClientIp(
			request({
				"cf-connecting-ip": CLOUDFLARE_WORKER_CLIENT_IP,
				"x-real-ip": "198.51.100.4",
			}),
		);

		expect(rewritten.headers.get("cf-connecting-ip")).toBe("198.51.100.4");
		expect(rewritten.headers.get("x-real-ip")).toBe("198.51.100.4");
	});

	it("removes the sentinel when there is no real address to put in its place", () => {
		const rewritten = requestWithClientIp(
			request({ "cf-connecting-ip": CLOUDFLARE_WORKER_CLIENT_IP }),
		);

		expect(rewritten.headers.get("cf-connecting-ip")).toBeNull();
		expect(rewritten.headers.get("x-real-ip")).toBeNull();
		expect(rewritten.headers.get("x-forwarded-for")).toBeNull();
	});

	it("preserves the method and body", async () => {
		const rewritten = requestWithClientIp(
			new Request("https://login.grove.place/api/auth/sign-in/email-otp", {
				method: "POST",
				headers: {
					"cf-connecting-ip": CLOUDFLARE_WORKER_CLIENT_IP,
					"x-real-ip": "198.51.100.4",
					"content-type": "application/json",
				},
				body: JSON.stringify({ email: "friend@example.com" }),
			}),
		);

		expect(rewritten.method).toBe("POST");
		await expect(rewritten.json()).resolves.toEqual({ email: "friend@example.com" });
	});
});

describe("resolveClientIPorLog", () => {
	let warn: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warn = vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		warn.mockRestore();
	});

	it("says nothing when a client address was found", () => {
		resolveClientIPorLog(request({ "cf-connecting-ip": "203.0.113.7" }), "Test");
		expect(warn).not.toHaveBeenCalled();
	});

	it("names what went missing when it could not be found", () => {
		resolveClientIPorLog(
			request({ "cf-connecting-ip": CLOUDFLARE_WORKER_CLIENT_IP }),
			"BetterAuth",
		);

		expect(warn).toHaveBeenCalledWith(expect.stringContaining(CLOUDFLARE_WORKER_CLIENT_IP));
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("BetterAuth"));
	});
});
