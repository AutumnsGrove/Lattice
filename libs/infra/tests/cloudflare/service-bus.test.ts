/**
 * Unit tests for CloudflareServiceBus adapter.
 *
 * Validates service binding delegation, input validation,
 * HTTP method validation, and error handling.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CloudflareServiceBus } from "../../src/cloudflare/service-bus.js";
import { createMockFetcher, type MockFetcher } from "./helpers.js";

vi.mock("@autumnsgrove/lattice/errors", () => ({
	logGroveError: vi.fn(),
}));

describe("CloudflareServiceBus", () => {
	let mockAuth: MockFetcher;
	let mockAmber: MockFetcher;
	let bus: CloudflareServiceBus;

	beforeEach(() => {
		vi.clearAllMocks();
		mockAuth = createMockFetcher({ body: { authenticated: true } });
		mockAmber = createMockFetcher({ body: { status: "ok" } });
		bus = new CloudflareServiceBus({
			auth: mockAuth as unknown as Fetcher,
			amber: mockAmber as unknown as Fetcher,
		});
	});

	// =========================================================================
	// call()
	// =========================================================================

	describe("call", () => {
		it("should construct URL and delegate to service binding fetch", async () => {
			const result = await bus.call("auth", {
				method: "GET",
				path: "/verify",
			});

			expect(mockAuth.fetch).toHaveBeenCalledWith(
				"https://auth/verify",
				expect.objectContaining({ method: "GET" }),
			);
			expect(result.status).toBe(200);
			expect(result.data).toEqual({ authenticated: true });
		});

		it("should send JSON body with Content-Type header", async () => {
			await bus.call("auth", {
				method: "POST",
				path: "/login",
				body: { username: "autumn" },
			});

			const fetchCall = mockAuth.fetch.mock.calls[0]!;
			expect(fetchCall[1].body).toBe(JSON.stringify({ username: "autumn" }));
			expect(fetchCall[1].headers["Content-Type"]).toBe("application/json");
		});

		it("should merge custom headers", async () => {
			await bus.call("auth", {
				method: "GET",
				path: "/check",
				headers: { Authorization: "Bearer token" },
			});

			const fetchCall = mockAuth.fetch.mock.calls[0]!;
			expect(fetchCall[1].headers).toEqual({ Authorization: "Bearer token" });
		});

		it("should throw on empty service name", async () => {
			await expect(bus.call("", { method: "GET", path: "/" })).rejects.toThrow(
				"Service name cannot be empty",
			);
		});

		it("should throw on empty request path", async () => {
			await expect(bus.call("auth", { method: "GET", path: "" })).rejects.toThrow(
				"Request path cannot be empty",
			);
		});

		it("should throw on invalid HTTP method", async () => {
			await expect(bus.call("auth", { method: "INVALID", path: "/" })).rejects.toThrow(
				"Invalid HTTP method",
			);
		});

		it("should accept all standard HTTP methods", async () => {
			for (const method of ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]) {
				mockAuth = createMockFetcher({ body: {} });
				bus = new CloudflareServiceBus({ auth: mockAuth as unknown as Fetcher });
				await expect(bus.call("auth", { method, path: "/" })).resolves.toBeDefined();
			}
		});

		it("should throw when service binding is not found", async () => {
			await expect(bus.call("unknown-service", { method: "GET", path: "/" })).rejects.toThrow();
		});

		it("should throw on non-JSON non-OK response", async () => {
			const failFetcher = createMockFetcher({
				status: 500,
				body: "Internal Server Error",
				headers: { "content-type": "text/plain" },
			});
			const failBus = new CloudflareServiceBus({
				broken: failFetcher as unknown as Fetcher,
			});

			await expect(failBus.call("broken", { method: "GET", path: "/" })).rejects.toThrow();
		});
	});

	// =========================================================================
	// ping()
	// =========================================================================

	describe("ping", () => {
		it("should return true when service responds with < 500", async () => {
			expect(await bus.ping("auth")).toBe(true);
		});

		it("should return false when service binding doesn't exist", async () => {
			expect(await bus.ping("nonexistent")).toBe(false);
		});

		it("should return false when fetch throws", async () => {
			mockAuth.fetch.mockRejectedValue(new Error("CONNECTION_REFUSED"));
			expect(await bus.ping("auth")).toBe(false);
		});

		it("should return false when service returns 500+", async () => {
			const deadFetcher = createMockFetcher({ status: 503 });
			const deadBus = new CloudflareServiceBus({
				dead: deadFetcher as unknown as Fetcher,
			});

			expect(await deadBus.ping("dead")).toBe(false);
		});
	});

	// =========================================================================
	// services()
	// =========================================================================

	describe("services", () => {
		it("should list registered service names", () => {
			expect(bus.services()).toEqual(["auth", "amber"]);
		});

		it("should return empty array when no bindings", () => {
			const empty = new CloudflareServiceBus({});
			expect(empty.services()).toEqual([]);
		});
	});

	// =========================================================================
	// info()
	// =========================================================================

	describe("info", () => {
		it("should return correct provider and services list", () => {
			const info = bus.info();
			expect(info.provider).toBe("cloudflare-bindings");
			expect(info.services).toEqual(["auth", "amber"]);
		});
	});
});
