/**
 * Engine Client Tests
 *
 * Tests for the ZephyrClient in the engine package.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZephyrClient } from "./client";
import type { ZephyrRequest, ZephyrResponse } from "./types";

// Mock global fetch
global.fetch = vi.fn();

describe("ZephyrClient", () => {
	const config = {
		baseUrl: "https://zephyr.grove.place",
		apiKey: "test-api-key",
	};

	let client: ZephyrClient;

	beforeEach(() => {
		vi.clearAllMocks();
		client = new ZephyrClient(config);
	});

	describe("send", () => {
		it("should successfully send email with valid request", async () => {
			const mockResponse: ZephyrResponse = {
				success: true,
				messageId: "msg_123",
				latencyMs: 150,
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockResponse,
			} as Response);

			const request: ZephyrRequest = {
				type: "transactional",
				template: "welcome",
				to: "user@example.com",
				data: { name: "Test User" },
			};

			const result = await client.send(request);

			expect(result.success).toBe(true);
			expect(result.messageId).toBe("msg_123");
			expect(fetch).toHaveBeenCalledWith(
				"https://zephyr.grove.place/send",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						"Content-Type": "application/json",
						"X-API-Key": "test-api-key",
					}),
					body: JSON.stringify(request),
				}),
			);
		});

		it("should return error on network failure", async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

			const request: ZephyrRequest = {
				type: "transactional",
				template: "welcome",
				to: "user@example.com",
			};

			const result = await client.send(request);

			expect(result.success).toBe(false);
			expect(result.errorCode).toBe("INTERNAL_ERROR");
			expect(result.errorMessage).toContain("Network error");
		});

		it("should return error on 4xx response", async () => {
			const errorResponse: ZephyrResponse = {
				success: false,
				errorCode: "INVALID_REQUEST",
				errorMessage: "Missing required field: type",
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: async () => errorResponse,
			} as Response);

			const request: ZephyrRequest = {
				type: "transactional",
				template: "welcome",
				to: "user@example.com",
			};

			const result = await client.send(request);

			expect(result.success).toBe(false);
			expect(result.errorCode).toBe("INVALID_REQUEST");
		});

		it("should return error on 5xx response", async () => {
			const errorResponse: ZephyrResponse = {
				success: false,
				errorCode: "PROVIDER_ERROR",
				errorMessage: "Internal server error",
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => errorResponse,
			} as Response);

			const request: ZephyrRequest = {
				type: "transactional",
				template: "welcome",
				to: "user@example.com",
			};

			const result = await client.send(request);

			expect(result.success).toBe(false);
			expect(result.errorCode).toBe("PROVIDER_ERROR");
		});

		it("should validate request before sending", async () => {
			// Missing type
			const invalidRequest = {
				template: "welcome",
				to: "user@example.com",
			} as ZephyrRequest;

			const result = await client.send(invalidRequest);

			expect(result.success).toBe(false);
			expect(result.errorCode).toBe("INVALID_REQUEST");
			expect(result.errorMessage).toContain("type");
			expect(fetch).not.toHaveBeenCalled();
		});

		it("should validate email format", async () => {
			const invalidRequest: ZephyrRequest = {
				type: "transactional",
				template: "welcome",
				to: "not-an-email",
			};

			const result = await client.send(invalidRequest);

			expect(result.success).toBe(false);
			expect(result.errorCode).toBe("INVALID_REQUEST");
			expect(result.errorMessage).toContain("Invalid email");
			expect(fetch).not.toHaveBeenCalled();
		});

		it("should handle raw template requirements", async () => {
			// Missing subject for raw template
			const invalidRequest: ZephyrRequest = {
				type: "transactional",
				template: "raw",
				to: "user@example.com",
				html: "<p>Test</p>",
			};

			const result = await client.send(invalidRequest);

			expect(result.success).toBe(false);
			expect(result.errorCode).toBe("INVALID_REQUEST");
			expect(result.errorMessage).toContain("subject");
		});
	});

	describe("sendRaw", () => {
		it("should send pre-rendered HTML email", async () => {
			const mockResponse: ZephyrResponse = {
				success: true,
				messageId: "msg_raw",
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockResponse,
			} as Response);

			const result = await client.sendRaw({
				to: "user@example.com",
				subject: "Custom Subject",
				html: "<p>Custom HTML</p>",
				text: "Custom text",
			});

			expect(result.success).toBe(true);

			const fetchCall = vi.mocked(fetch).mock.calls[0];
			const body = JSON.parse(fetchCall[1]!.body as string);

			expect(body.template).toBe("raw");
			expect(body.html).toBe("<p>Custom HTML</p>");
			expect(body.subject).toBe("Custom Subject");
		});

		it("should allow custom type for raw emails", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ success: true }),
			} as Response);

			await client.sendRaw({
				to: "user@example.com",
				subject: "Test",
				html: "<p>Test</p>",
				type: "notification",
			});

			const fetchCall = vi.mocked(fetch).mock.calls[0];
			const body = JSON.parse(fetchCall[1]!.body as string);

			expect(body.type).toBe("notification");
		});

		it("should default to transactional type", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ success: true }),
			} as Response);

			await client.sendRaw({
				to: "user@example.com",
				subject: "Test",
				html: "<p>Test</p>",
			});

			const fetchCall = vi.mocked(fetch).mock.calls[0];
			const body = JSON.parse(fetchCall[1]!.body as string);

			expect(body.type).toBe("transactional");
		});
	});

	describe("health", () => {
		it("should return health status on success", async () => {
			const healthResponse = {
				status: "healthy",
				templates: ["welcome", "porch-reply"],
				version: "1.0.0",
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => healthResponse,
			} as Response);

			const result = await client.health();

			expect(result).toEqual(healthResponse);
			expect(fetch).toHaveBeenCalledWith("https://zephyr.grove.place/health", undefined);
		});

		it("should return null on failure", async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error("Connection failed"));

			const result = await client.health();

			expect(result).toBeNull();
		});

		it("should return null on non-OK response", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
			} as Response);

			const result = await client.health();

			expect(result).toBeNull();
		});
	});

	describe("error formatting", () => {
		it("should format missing type error correctly", async () => {
			const result = await client.send({
				template: "welcome",
				to: "user@example.com",
			} as ZephyrRequest);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toBe("Missing required field: type");
		});

		it("should format missing template error correctly", async () => {
			const result = await client.send({
				type: "transactional",
				to: "user@example.com",
			} as ZephyrRequest);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toBe("Missing required field: template");
		});

		it("should format missing recipient error correctly", async () => {
			const result = await client.send({
				type: "transactional",
				template: "welcome",
			} as ZephyrRequest);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toBe("Missing required field: to");
		});

		it("should format invalid email error correctly", async () => {
			const result = await client.send({
				type: "transactional",
				template: "welcome",
				to: "not-an-email",
			});

			expect(result.success).toBe(false);
			expect(result.errorMessage).toContain("not-an-email");
		});
	});

	describe("configuration", () => {
		it("should remove trailing slash from baseUrl", async () => {
			const clientWithSlash = new ZephyrClient({
				baseUrl: "https://zephyr.grove.place/",
				apiKey: "test-key",
			});

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ success: true }),
			} as Response);

			await clientWithSlash.send({
				type: "transactional",
				template: "welcome",
				to: "user@example.com",
			});

			// Should call with URL without double slashes (trailing slash removed)
			expect(fetch).toHaveBeenCalledWith("https://zephyr.grove.place/send", expect.any(Object));
		});
	});
});
