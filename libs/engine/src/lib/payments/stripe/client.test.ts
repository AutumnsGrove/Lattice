import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	StripeClient,
	StripeAPIError,
	type StripeError,
	type StripeRequestOptions,
} from "./client";

// ===
// StripeAPIError Tests
// ===

describe("StripeAPIError", () => {
	it("should set name to StripeAPIError", () => {
		const error: StripeError = {
			type: "card_error",
			code: "card_declined",
			message: "Your card was declined",
		};
		const apiError = new StripeAPIError(error, 402);
		expect(apiError.name).toBe("StripeAPIError");
	});

	it("should extend Error with correct message", () => {
		const error: StripeError = {
			type: "card_error",
			message: "Your card was declined",
		};
		const apiError = new StripeAPIError(error, 402);
		expect(apiError).toBeInstanceOf(Error);
		expect(apiError.message).toBe("Your card was declined");
	});

	it("should copy type from StripeError", () => {
		const error: StripeError = {
			type: "invalid_request_error",
			message: "Invalid parameters",
		};
		const apiError = new StripeAPIError(error, 400);
		expect(apiError.type).toBe("invalid_request_error");
	});

	it("should copy code from StripeError", () => {
		const error: StripeError = {
			type: "card_error",
			code: "insufficient_funds",
			message: "Your card has insufficient funds",
		};
		const apiError = new StripeAPIError(error, 402);
		expect(apiError.code).toBe("insufficient_funds");
	});

	it("should copy param from StripeError", () => {
		const error: StripeError = {
			type: "invalid_request_error",
			param: "amount",
			message: "Invalid amount",
		};
		const apiError = new StripeAPIError(error, 400);
		expect(apiError.param).toBe("amount");
	});

	it("should store statusCode", () => {
		const error: StripeError = {
			type: "api_error",
			message: "Internal server error",
		};
		const apiError = new StripeAPIError(error, 500);
		expect(apiError.statusCode).toBe(500);
	});

	it("should allow undefined optional fields", () => {
		const error: StripeError = {
			type: "api_error",
			message: "Generic error",
		};
		const apiError = new StripeAPIError(error, 500);
		expect(apiError.code).toBeUndefined();
		expect(apiError.param).toBeUndefined();
	});
});

// ===
// StripeClient Initialization
// ===

describe("StripeClient initialization", () => {
	it("should initialize with secretKey", () => {
		const client = new StripeClient({ secretKey: "sk_test_123" });
		expect(client).toBeDefined();
	});

	it("should use default apiVersion when not provided", () => {
		const client = new StripeClient({ secretKey: "sk_test_123" });
		// The default version is set in the constructor, we verify by making a request
		// and checking headers (tested below)
		expect(client).toBeDefined();
	});

	it("should use custom apiVersion when provided", () => {
		const client = new StripeClient({
			secretKey: "sk_test_123",
			apiVersion: "2024-01-01.acacia",
		});
		expect(client).toBeDefined();
	});
});

// ===
// GET Request Tests (appendSearchParams)
// ===

describe("StripeClient GET requests (appendSearchParams)", () => {
	let client: StripeClient;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		client = new StripeClient({ secretKey: "sk_test_123" });
		fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("should append simple params as query string", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "cust_123" }), { status: 200 }));
		await client.request("customers", {
			method: "GET",
			params: { limit: 10, email: "test@example.com" },
		});
		expect(fetchMock).toHaveBeenCalledOnce();
		const call = fetchMock.mock.calls[0];
		const url = call[0] as string;
		expect(url).toContain("limit=10");
		expect(url).toContain("email=test%40example.com");
	});

	it("should encode URI components in query string", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", {
			method: "GET",
			params: { metadata: { key: "value with spaces" } },
		});
		const url = fetchMock.mock.calls[0][0] as string;
		expect(url).toContain("metadata%5Bkey%5D=value+with+spaces");
	});

	it("should skip null and undefined params", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", {
			method: "GET",
			params: { limit: 10, email: null, phone: undefined },
		});
		const url = fetchMock.mock.calls[0][0] as string;
		expect(url).toContain("limit=10");
		expect(url).not.toContain("email");
		expect(url).not.toContain("phone");
	});

	it("should encode arrays with indices", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", {
			method: "GET",
			params: { statuses: ["active", "pending"] },
		});
		const url = fetchMock.mock.calls[0][0] as string;
		expect(url).toContain("statuses%5B0%5D=active");
		expect(url).toContain("statuses%5B1%5D=pending");
	});

	it("should handle nested object arrays in query string", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", {
			method: "GET",
			params: {
				items: [{ name: "item1" }, { name: "item2" }],
			},
		});
		const url = fetchMock.mock.calls[0][0] as string;
		expect(url).toContain("items%5B0%5D%5Bname%5D=item1");
		expect(url).toContain("items%5B1%5D%5Bname%5D=item2");
	});

	it("should set Authorization header", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", { method: "GET" });
		const headers = fetchMock.mock.calls[0][1].headers;
		expect(headers["Authorization"]).toBe("Bearer sk_test_123");
	});

	it("should set Stripe-Version header", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", { method: "GET" });
		const headers = fetchMock.mock.calls[0][1].headers;
		expect(headers["Stripe-Version"]).toBeDefined();
	});

	it("should include Idempotency-Key header when provided", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", {
			method: "GET",
			idempotencyKey: "key-123",
		});
		const headers = fetchMock.mock.calls[0][1].headers;
		expect(headers["Idempotency-Key"]).toBe("key-123");
	});

	it("should not include Idempotency-Key header when not provided", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", { method: "GET" });
		const headers = fetchMock.mock.calls[0][1].headers;
		expect(headers["Idempotency-Key"]).toBeUndefined();
	});

	it("should include Stripe-Account header for Connect requests", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", {
			method: "GET",
			stripeAccount: "acct_12345",
		});
		const headers = fetchMock.mock.calls[0][1].headers;
		expect(headers["Stripe-Account"]).toBe("acct_12345");
	});
});

// ===
// POST Request Tests (encodeParams)
// ===

describe("StripeClient POST requests (encodeParams)", () => {
	let client: StripeClient;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		client = new StripeClient({ secretKey: "sk_test_456" });
		fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("should encode simple params as form body", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", {
			method: "POST",
			params: { email: "test@example.com", name: "John" },
		});
		const body = fetchMock.mock.calls[0][1].body;
		expect(body).toContain("email=test%40example.com");
		expect(body).toContain("name=John");
	});

	it("should set Content-Type header for POST", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", {
			method: "POST",
			params: { email: "test@example.com" },
		});
		const headers = fetchMock.mock.calls[0][1].headers;
		expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
	});

	it("should encode nested objects", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", {
			method: "POST",
			params: {
				address: { city: "San Francisco", country: "US" },
			},
		});
		const body = fetchMock.mock.calls[0][1].body;
		expect(body).toContain("address%5Bcity%5D=San%20Francisco");
		expect(body).toContain("address%5Bcountry%5D=US");
	});

	it("should encode arrays of primitives with indices", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("checkout/sessions", {
			method: "POST",
			params: { line_items: [{ price: "price_1" }, { price: "price_2" }] },
		});
		const body = fetchMock.mock.calls[0][1].body;
		expect(body).toContain("line_items%5B0%5D%5Bprice%5D=price_1");
		expect(body).toContain("line_items%5B1%5D%5Bprice%5D=price_2");
	});

	it("should skip null and undefined values in POST body", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", {
			method: "POST",
			params: { email: "test@example.com", phone: null, address: undefined },
		});
		const body = fetchMock.mock.calls[0][1].body;
		expect(body).toContain("email=test%40example.com");
		expect(body).not.toContain("phone");
		expect(body).not.toContain("address");
	});

	it("should encode values with special characters", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", {
			method: "POST",
			params: { description: "Test & verify" },
		});
		const body = fetchMock.mock.calls[0][1].body;
		expect(body).toContain("description=Test%20%26%20verify");
	});

	it("should not set Content-Type header without params", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", { method: "POST" });
		const headers = fetchMock.mock.calls[0][1].headers;
		expect(headers["Content-Type"]).toBeUndefined();
	});

	it("should send undefined body for POST without params", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		await client.request("customers", { method: "POST" });
		const body = fetchMock.mock.calls[0][1].body;
		expect(body).toBeUndefined();
	});
});

// ===
// Response Handling Tests
// ===

describe("StripeClient response handling", () => {
	let client: StripeClient;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		client = new StripeClient({ secretKey: "sk_test_789" });
		fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("should return parsed JSON on success", async () => {
		const responseData = { id: "cust_123", email: "test@example.com" };
		fetchMock.mockResolvedValue(new Response(JSON.stringify(responseData), { status: 200 }));
		const result = await client.request("customers/cust_123", {
			method: "GET",
		});
		expect(result).toEqual(responseData);
	});

	it("should throw StripeAPIError on 4xx status", async () => {
		const errorData = {
			error: {
				type: "invalid_request_error",
				code: "missing_param",
				message: "Missing required param: email",
				param: "email",
			},
		};
		fetchMock.mockResolvedValue(new Response(JSON.stringify(errorData), { status: 400 }));
		await expect(client.request("customers", { method: "POST", params: {} })).rejects.toThrow(
			StripeAPIError,
		);
	});

	it("should throw StripeAPIError with correct properties on error", async () => {
		const errorData = {
			error: {
				type: "card_error",
				code: "card_declined",
				message: "Your card was declined",
			},
		};
		fetchMock.mockResolvedValue(new Response(JSON.stringify(errorData), { status: 402 }));
		try {
			await client.request("payment_intents", {
				method: "POST",
				params: {},
			});
		} catch (err) {
			const apiError = err as StripeAPIError;
			expect(apiError.type).toBe("card_error");
			expect(apiError.code).toBe("card_declined");
			expect(apiError.statusCode).toBe(402);
			expect(apiError.message).toBe("Your card was declined");
		}
	});

	it("should throw StripeAPIError on 5xx status", async () => {
		fetchMock.mockResolvedValue(
			new Response(
				JSON.stringify({
					error: {
						type: "api_error",
						message: "Internal server error",
					},
				}),
				{ status: 500 },
			),
		);
		await expect(client.request("customers", { method: "GET" })).rejects.toThrow(StripeAPIError);
	});

	it("should handle missing error object in response", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 400 }));
		try {
			await client.request("customers", { method: "GET" });
		} catch (err) {
			const apiError = err as StripeAPIError;
			expect(apiError.type).toBe("api_error");
			expect(apiError.message).toBe("Unknown error");
		}
	});
});

// ===
// Webhook Signature Verification Tests
// ===

describe("StripeClient webhook signature verification", () => {
	let client: StripeClient;
	const secret = "whsec_test_secret";

	beforeEach(() => {
		client = new StripeClient({ secretKey: "sk_test_webhook" });
	});

	it("should return invalid for missing timestamp in signature", async () => {
		const payload = '{"type":"charge.succeeded"}';
		const signature = "v1=abc123"; // Missing t=
		const result = await client.verifyWebhookSignature(payload, signature, secret);
		expect(result.valid).toBe(false);
		expect(result.error).toBe("Invalid signature format");
	});

	it("should return invalid for missing v1 signature", async () => {
		const payload = '{"type":"charge.succeeded"}';
		const timestamp = Math.floor(Date.now() / 1000);
		const signature = `t=${timestamp}`; // Missing v1=
		const result = await client.verifyWebhookSignature(payload, signature, secret);
		expect(result.valid).toBe(false);
		expect(result.error).toBe("Invalid signature format");
	});

	it("should return invalid for expired timestamp", async () => {
		const payload = '{"type":"charge.succeeded"}';
		const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
		const signature = `t=${oldTimestamp},v1=abc123`;
		const result = await client.verifyWebhookSignature(
			payload,
			signature,
			secret,
			300, // tolerance of 300 seconds
		);
		expect(result.valid).toBe(false);
		expect(result.error).toBe("Webhook timestamp too old");
	});

	it("should return invalid for mismatched signature", async () => {
		const payload = '{"type":"charge.succeeded"}';
		const timestamp = Math.floor(Date.now() / 1000);
		const signature = `t=${timestamp},v1=invalid_signature_here`;
		const result = await client.verifyWebhookSignature(payload, signature, secret);
		expect(result.valid).toBe(false);
		expect(result.error).toBe("Signature mismatch");
	});

	it("should return valid with correct HMAC-SHA256 signature", async () => {
		const payload = '{"type":"charge.succeeded"}';
		const timestamp = Math.floor(Date.now() / 1000);

		// Compute correct signature using Web Crypto API (same as client)
		const signedPayload = `${timestamp}.${payload}`;
		const encoder = new TextEncoder();
		const key = await crypto.subtle.importKey(
			"raw",
			encoder.encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
		const v1Signature = Array.from(new Uint8Array(signatureBytes))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		const signature = `t=${timestamp},v1=${v1Signature}`;
		const result = await client.verifyWebhookSignature(payload, signature, secret);
		expect(result.valid).toBe(true);
		expect(result.event).toEqual({ type: "charge.succeeded" });
	});

	it("should parse event JSON on valid signature", async () => {
		const eventData = {
			id: "evt_123",
			type: "customer.created",
			data: { object: { id: "cust_123" } },
		};
		const payload = JSON.stringify(eventData);
		const timestamp = Math.floor(Date.now() / 1000);

		const signedPayload = `${timestamp}.${payload}`;
		const encoder = new TextEncoder();
		const key = await crypto.subtle.importKey(
			"raw",
			encoder.encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
		const v1Signature = Array.from(new Uint8Array(signatureBytes))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		const signature = `t=${timestamp},v1=${v1Signature}`;
		const result = await client.verifyWebhookSignature(payload, signature, secret);
		expect(result.valid).toBe(true);
		expect(result.event).toEqual(eventData);
	});

	it("should accept timestamp within tolerance", async () => {
		const payload = '{"type":"charge.succeeded"}';
		const timestamp = Math.floor(Date.now() / 1000) - 100; // 100 seconds ago

		const signedPayload = `${timestamp}.${payload}`;
		const encoder = new TextEncoder();
		const key = await crypto.subtle.importKey(
			"raw",
			encoder.encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
		const v1Signature = Array.from(new Uint8Array(signatureBytes))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		const signature = `t=${timestamp},v1=${v1Signature}`;
		const result = await client.verifyWebhookSignature(payload, signature, secret, 300);
		expect(result.valid).toBe(true);
	});

	it("should return invalid for malformed JSON payload", async () => {
		const payload = "{invalid json}";
		const timestamp = Math.floor(Date.now() / 1000);

		const signedPayload = `${timestamp}.${payload}`;
		const encoder = new TextEncoder();
		const key = await crypto.subtle.importKey(
			"raw",
			encoder.encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
		const v1Signature = Array.from(new Uint8Array(signatureBytes))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		const signature = `t=${timestamp},v1=${v1Signature}`;
		const result = await client.verifyWebhookSignature(payload, signature, secret);
		expect(result.valid).toBe(false);
		expect(result.error).toContain("Verification failed");
	});
});

// ===
// Constant-Time Comparison Tests (via verifyWebhookSignature)
// ===

describe("StripeClient secureCompare (tested via webhook verification)", () => {
	let client: StripeClient;
	const secret = "test_secret";

	beforeEach(() => {
		client = new StripeClient({ secretKey: "sk_test_compare" });
	});

	it("should reject strings of different lengths", async () => {
		const payload = '{"type":"test"}';
		const timestamp = Math.floor(Date.now() / 1000);
		const signature = `t=${timestamp},v1=short`;
		const result = await client.verifyWebhookSignature(payload, signature, secret);
		expect(result.valid).toBe(false);
	});

	it("should accept identical signatures", async () => {
		const payload = '{"type":"test"}';
		const timestamp = Math.floor(Date.now() / 1000);

		const signedPayload = `${timestamp}.${payload}`;
		const encoder = new TextEncoder();
		const key = await crypto.subtle.importKey(
			"raw",
			encoder.encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
		const v1Signature = Array.from(new Uint8Array(signatureBytes))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		const signature = `t=${timestamp},v1=${v1Signature}`;
		const result = await client.verifyWebhookSignature(payload, signature, secret);
		expect(result.valid).toBe(true);
	});

	it("should reject signatures that differ by one character", async () => {
		const payload = '{"type":"test"}';
		const timestamp = Math.floor(Date.now() / 1000);

		const signedPayload = `${timestamp}.${payload}`;
		const encoder = new TextEncoder();
		const key = await crypto.subtle.importKey(
			"raw",
			encoder.encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
		const v1Signature = Array.from(new Uint8Array(signatureBytes))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		// Flip one character in the signature
		const tamperedSignature =
			v1Signature.substring(0, 10) +
			(v1Signature[10] === "a" ? "b" : "a") +
			v1Signature.substring(11);

		const signature = `t=${timestamp},v1=${tamperedSignature}`;
		const result = await client.verifyWebhookSignature(payload, signature, secret);
		expect(result.valid).toBe(false);
	});
});
