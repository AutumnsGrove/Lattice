import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireApiKey } from "./auth";

function createMockContext(options: { apiKey?: string; authHeader?: string }): any {
	const jsonMock = vi.fn().mockImplementation((body: any, status?: number) => {
		return new Response(JSON.stringify(body), { status: status || 200 });
	});

	return {
		env: { API_KEY: options.apiKey },
		req: {
			header: vi.fn().mockImplementation((name: string) => {
				if (name === "Authorization") return options.authHeader;
				return undefined;
			}),
		},
		json: jsonMock,
	};
}

describe("requireApiKey middleware", () => {
	it("returns 503 when API_KEY is not configured (undefined)", async () => {
		const context = createMockContext({ apiKey: undefined, authHeader: "Bearer valid-key" });
		const next = vi.fn().mockResolvedValue(undefined);

		const result = await requireApiKey(context, next);

		expect(context.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: "API key not configured",
			}),
			503,
		);
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 401 when Authorization header is missing", async () => {
		const context = createMockContext({ apiKey: "test-key", authHeader: undefined });
		const next = vi.fn().mockResolvedValue(undefined);

		const result = await requireApiKey(context, next);

		expect(context.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: "Unauthorized",
				message: expect.stringContaining("Missing Authorization header"),
			}),
			401,
		);
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 401 when Authorization header has wrong format (e.g., Basic xyz)", async () => {
		const context = createMockContext({ apiKey: "test-key", authHeader: "Basic xyz" });
		const next = vi.fn().mockResolvedValue(undefined);

		await requireApiKey(context, next);

		expect(context.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: "Unauthorized",
				message: expect.stringContaining("Invalid Authorization header format"),
			}),
			401,
		);
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 401 when Bearer token is present but empty", async () => {
		const context = createMockContext({ apiKey: "test-key", authHeader: "Bearer " });
		const next = vi.fn().mockResolvedValue(undefined);

		await requireApiKey(context, next);

		expect(context.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: "Unauthorized",
				message: expect.stringContaining("Invalid Authorization header format"),
			}),
			401,
		);
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 401 when API key doesn't match", async () => {
		const context = createMockContext({ apiKey: "correct-key", authHeader: "Bearer wrong-key" });
		const next = vi.fn().mockResolvedValue(undefined);

		await requireApiKey(context, next);

		expect(context.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: "Unauthorized",
				message: "Invalid API key",
			}),
			401,
		);
		expect(next).not.toHaveBeenCalled();
	});

	it("calls next() on valid API key", async () => {
		const context = createMockContext({ apiKey: "test-key", authHeader: "Bearer test-key" });
		const next = vi.fn().mockResolvedValue(undefined);

		await requireApiKey(context, next);

		expect(next).toHaveBeenCalled();
		expect(context.json).not.toHaveBeenCalled();
	});

	it("uses constant-time comparison (different length keys still return 401)", async () => {
		const context = createMockContext({
			apiKey: "this-is-a-very-long-api-key",
			authHeader: "Bearer short",
		});
		const next = vi.fn().mockResolvedValue(undefined);

		await requireApiKey(context, next);

		expect(context.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: "Unauthorized",
			}),
			401,
		);
		expect(next).not.toHaveBeenCalled();
	});

	it("response bodies include appropriate error messages", async () => {
		// Test missing API key
		const context1 = createMockContext({ apiKey: undefined, authHeader: "Bearer key" });
		const next1 = vi.fn();

		await requireApiKey(context1, next1);

		expect(context1.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining("Set API_KEY secret"),
			}),
			503,
		);

		// Test missing header
		const context2 = createMockContext({ apiKey: "key", authHeader: undefined });
		const next2 = vi.fn();

		await requireApiKey(context2, next2);

		expect(context2.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining("Authorization: Bearer"),
			}),
			401,
		);

		// Test invalid format
		const context3 = createMockContext({ apiKey: "key", authHeader: "Invalid xyz" });
		const next3 = vi.fn();

		await requireApiKey(context3, next3);

		expect(context3.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining("Authorization: Bearer"),
			}),
			401,
		);
	});

	it("allows valid API key with exact match", async () => {
		const apiKey = "my-secret-api-key-12345";
		const context = createMockContext({ apiKey, authHeader: `Bearer ${apiKey}` });
		const next = vi.fn().mockResolvedValue(undefined);

		await requireApiKey(context, next);

		expect(next).toHaveBeenCalled();
		expect(context.json).not.toHaveBeenCalled();
	});

	it("rejects API key with only one character different", async () => {
		const context = createMockContext({
			apiKey: "test-key-1234",
			authHeader: "Bearer test-key-1235",
		});
		const next = vi.fn();

		await requireApiKey(context, next);

		expect(context.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: "Unauthorized",
			}),
			401,
		);
		expect(next).not.toHaveBeenCalled();
	});

	it("handles case-sensitive API key comparison", async () => {
		const context = createMockContext({
			apiKey: "TestKey123",
			authHeader: "Bearer testkey123",
		});
		const next = vi.fn();

		await requireApiKey(context, next);

		expect(context.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: "Unauthorized",
			}),
			401,
		);
		expect(next).not.toHaveBeenCalled();
	});

	it("allows API key with special characters", async () => {
		const apiKey = "test-key!@#$%^&*()_+=";
		const context = createMockContext({ apiKey, authHeader: `Bearer ${apiKey}` });
		const next = vi.fn().mockResolvedValue(undefined);

		await requireApiKey(context, next);

		expect(next).toHaveBeenCalled();
		expect(context.json).not.toHaveBeenCalled();
	});

	it("rejects request with only Authorization scheme (no token)", async () => {
		const context = createMockContext({ apiKey: "test-key", authHeader: "Bearer" });
		const next = vi.fn();

		await requireApiKey(context, next);

		expect(context.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: "Unauthorized",
			}),
			401,
		);
		expect(next).not.toHaveBeenCalled();
	});

	it("header lookup is case-sensitive", async () => {
		const mockContext = createMockContext({ apiKey: "test-key", authHeader: "Bearer test-key" });
		// Verify header is being looked up with exact "Authorization" casing
		await requireApiKey(mockContext, vi.fn().mockResolvedValue(undefined));
		expect(mockContext.req.header).toHaveBeenCalledWith("Authorization");
	});
});
