import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./+server";

// Mock @sveltejs/kit
vi.mock("@sveltejs/kit", () => ({
	json: (data: unknown, init?: ResponseInit) =>
		new Response(JSON.stringify(data), {
			status: init?.status ?? 200,
			headers: { "Content-Type": "application/json" },
		}),
	error: (status: number, message: string) => {
		const err = new Error(message) as any;
		err.status = status;
		err.body = { message };
		throw err;
	},
}));

// Mock $lib/server/db
vi.mock("$lib/server/db", () => ({
	updateConfig: vi.fn(),
}));

import { updateConfig } from "$lib/server/db";

function makeEvent(options: { user?: any; body?: any; env?: any } = {}) {
	const url = new URL("http://localhost:5174/api/config");
	return {
		url,
		request: new Request(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(options.body ?? {}),
		}),
		locals: {
			user:
				options.user !== undefined
					? options.user
					: { id: "a1", email: "admin@test.com", is_admin: true },
		},
		platform: { env: options.env ?? { DB: {} } },
	} as any;
}

describe("POST /api/config", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Authentication tests
	it("rejects non-admin users with 401", async () => {
		const event = makeEvent({ user: null });
		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.message).toBe("Unauthorized");
		}
	});

	it("rejects non-admin users with is_admin=false with 401", async () => {
		const event = makeEvent({ user: { id: "u1", email: "user@test.com", is_admin: false } });
		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.message).toBe("Unauthorized");
		}
	});

	// Database availability tests
	it("rejects when DB not available with 500", async () => {
		const event = makeEvent({ env: {} });
		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.message).toBe("Database not available");
		}
	});

	it("rejects when DB is null with 500", async () => {
		const event = makeEvent({ env: { DB: null } });
		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.message).toBe("Database not available");
		}
	});

	// Request body parsing tests
	it("rejects invalid JSON body with 400", async () => {
		const url = new URL("http://localhost:5174/api/config");
		const event = {
			url,
			request: new Request(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "not valid json",
			}),
			locals: { user: { id: "a1", email: "admin@test.com", is_admin: true } },
			platform: { env: { DB: {} } },
		} as any;

		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("Invalid request body");
		}
	});

	// max_batches validation tests
	it("rejects max_batches < 1 with 400", async () => {
		const event = makeEvent({ body: { max_batches: 0 } });
		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("max_batches must be between 1 and 10");
		}
	});

	it("rejects max_batches > 10 with 400", async () => {
		const event = makeEvent({ body: { max_batches: 11 } });
		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("max_batches must be between 1 and 10");
		}
	});

	it("accepts max_batches at boundaries (1 and 10)", async () => {
		const mockUpdateConfig = vi.mocked(updateConfig);
		mockUpdateConfig.mockResolvedValue(undefined);

		const event1 = makeEvent({ body: { max_batches: 1 } });
		const response1 = await POST(event1);
		expect(response1.status).toBe(200);

		const event2 = makeEvent({ body: { max_batches: 10 } });
		const response2 = await POST(event2);
		expect(response2.status).toBe(200);
	});

	// candidates_per_batch validation tests
	it("rejects candidates_per_batch < 10 with 400", async () => {
		const event = makeEvent({ body: { candidates_per_batch: 9 } });
		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("candidates_per_batch must be between 10 and 100");
		}
	});

	it("rejects candidates_per_batch > 100 with 400", async () => {
		const event = makeEvent({ body: { candidates_per_batch: 101 } });
		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("candidates_per_batch must be between 10 and 100");
		}
	});

	it("accepts candidates_per_batch at boundaries (10 and 100)", async () => {
		const mockUpdateConfig = vi.mocked(updateConfig);
		mockUpdateConfig.mockResolvedValue(undefined);

		const event1 = makeEvent({ body: { candidates_per_batch: 10 } });
		const response1 = await POST(event1);
		expect(response1.status).toBe(200);

		const event2 = makeEvent({ body: { candidates_per_batch: 100 } });
		const response2 = await POST(event2);
		expect(response2.status).toBe(200);
	});

	// target_good_results validation tests
	it("rejects target_good_results < 5 with 400", async () => {
		const event = makeEvent({ body: { target_good_results: 4 } });
		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("target_good_results must be between 5 and 100");
		}
	});

	it("rejects target_good_results > 100 with 400", async () => {
		const event = makeEvent({ body: { target_good_results: 101 } });
		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("target_good_results must be between 5 and 100");
		}
	});

	it("accepts target_good_results at boundaries (5 and 100)", async () => {
		const mockUpdateConfig = vi.mocked(updateConfig);
		mockUpdateConfig.mockResolvedValue(undefined);

		const event1 = makeEvent({ body: { target_good_results: 5 } });
		const response1 = await POST(event1);
		expect(response1.status).toBe(200);

		const event2 = makeEvent({ body: { target_good_results: 100 } });
		const response2 = await POST(event2);
		expect(response2.status).toBe(200);
	});

	// creativity validation tests
	it("rejects creativity < 0 with 400", async () => {
		const event = makeEvent({ body: { creativity: -0.1 } });
		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("creativity must be between 0 and 1");
		}
	});

	it("rejects creativity > 1 with 400", async () => {
		const event = makeEvent({ body: { creativity: 1.1 } });
		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("creativity must be between 0 and 1");
		}
	});

	it("accepts creativity at boundaries (0 and 1)", async () => {
		const mockUpdateConfig = vi.mocked(updateConfig);
		mockUpdateConfig.mockResolvedValue(undefined);

		const event1 = makeEvent({ body: { creativity: 0 } });
		const response1 = await POST(event1);
		expect(response1.status).toBe(200);

		const event2 = makeEvent({ body: { creativity: 1 } });
		const response2 = await POST(event2);
		expect(response2.status).toBe(200);
	});

	it("accepts creativity in middle of range (0.5)", async () => {
		const mockUpdateConfig = vi.mocked(updateConfig);
		mockUpdateConfig.mockResolvedValue(undefined);

		const event = makeEvent({ body: { creativity: 0.5 } });
		const response = await POST(event);
		expect(response.status).toBe(200);
	});

	// rdap_delay_seconds validation tests
	it("rejects rdap_delay_seconds < 0.1 with 400", async () => {
		const event = makeEvent({ body: { rdap_delay_seconds: 0.05 } });
		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("rdap_delay_seconds must be between 0.1 and 30");
		}
	});

	it("rejects rdap_delay_seconds > 30 with 400", async () => {
		const event = makeEvent({ body: { rdap_delay_seconds: 30.1 } });
		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("rdap_delay_seconds must be between 0.1 and 30");
		}
	});

	it("accepts rdap_delay_seconds at boundaries (0.1 and 30)", async () => {
		const mockUpdateConfig = vi.mocked(updateConfig);
		mockUpdateConfig.mockResolvedValue(undefined);

		const event1 = makeEvent({ body: { rdap_delay_seconds: 0.1 } });
		const response1 = await POST(event1);
		expect(response1.status).toBe(200);

		const event2 = makeEvent({ body: { rdap_delay_seconds: 30 } });
		const response2 = await POST(event2);
		expect(response2.status).toBe(200);
	});

	// Successful update tests
	it("succeeds with valid full config update", async () => {
		const mockUpdateConfig = vi.mocked(updateConfig);
		mockUpdateConfig.mockResolvedValue(undefined);

		const event = makeEvent({
			body: {
				driver_model: "claude-3-5-sonnet",
				swarm_model: "claude-3-5-haiku",
				max_batches: 5,
				candidates_per_batch: 50,
				target_good_results: 25,
				creativity: 0.7,
				rdap_delay_seconds: 5,
			},
		});

		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(mockUpdateConfig).toHaveBeenCalledWith(
			{},
			{
				driver_model: "claude-3-5-sonnet",
				swarm_model: "claude-3-5-haiku",
				max_batches: 5,
				candidates_per_batch: 50,
				target_good_results: 25,
				creativity: 0.7,
				rdap_delay_seconds: 5,
			},
		);
	});

	it("succeeds with partial config update", async () => {
		const mockUpdateConfig = vi.mocked(updateConfig);
		mockUpdateConfig.mockResolvedValue(undefined);

		const event = makeEvent({
			body: {
				max_batches: 3,
				creativity: 0.8,
			},
		});

		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(mockUpdateConfig).toHaveBeenCalledWith(
			{},
			{
				max_batches: 3,
				creativity: 0.8,
			},
		);
	});

	it("succeeds with only driver_model update", async () => {
		const mockUpdateConfig = vi.mocked(updateConfig);
		mockUpdateConfig.mockResolvedValue(undefined);

		const event = makeEvent({
			body: {
				driver_model: "claude-3-opus",
			},
		});

		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(mockUpdateConfig).toHaveBeenCalledWith(
			{},
			{
				driver_model: "claude-3-opus",
			},
		);
	});

	it("succeeds with only swarm_model update", async () => {
		const mockUpdateConfig = vi.mocked(updateConfig);
		mockUpdateConfig.mockResolvedValue(undefined);

		const event = makeEvent({
			body: {
				swarm_model: "claude-3-haiku",
			},
		});

		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(mockUpdateConfig).toHaveBeenCalledWith(
			{},
			{
				swarm_model: "claude-3-haiku",
			},
		);
	});

	it("succeeds with empty body (all fields optional)", async () => {
		const mockUpdateConfig = vi.mocked(updateConfig);
		mockUpdateConfig.mockResolvedValue(undefined);

		const event = makeEvent({ body: {} });
		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(mockUpdateConfig).toHaveBeenCalledWith({}, {});
	});

	// Database error handling
	it("catches updateConfig errors and returns 500", async () => {
		const mockUpdateConfig = vi.mocked(updateConfig);
		mockUpdateConfig.mockRejectedValue(new Error("Database connection failed"));

		const event = makeEvent({ body: { max_batches: 5 } });

		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.message).toBe("Failed to update configuration");
		}
	});

	// Validation order tests (validation happens before DB call)
	it("validates config before calling updateConfig", async () => {
		const mockUpdateConfig = vi.mocked(updateConfig);
		mockUpdateConfig.mockResolvedValue(undefined);

		const event = makeEvent({ body: { max_batches: 15 } });

		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(mockUpdateConfig).not.toHaveBeenCalled();
		}
	});

	// Multiple field validation
	it("validates multiple fields in one request", async () => {
		const mockUpdateConfig = vi.mocked(updateConfig);
		mockUpdateConfig.mockResolvedValue(undefined);

		const event = makeEvent({
			body: {
				max_batches: 5,
				candidates_per_batch: 50,
				target_good_results: 25,
				creativity: 0.5,
				rdap_delay_seconds: 10,
			},
		});

		const response = await POST(event);
		expect(response.status).toBe(200);
		expect(mockUpdateConfig).toHaveBeenCalled();
	});

	it("rejects if any one field in multi-field request is invalid", async () => {
		const mockUpdateConfig = vi.mocked(updateConfig);

		const event = makeEvent({
			body: {
				max_batches: 5,
				candidates_per_batch: 150, // Invalid: > 100
				target_good_results: 25,
				creativity: 0.5,
			},
		});

		try {
			await POST(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("candidates_per_batch must be between 10 and 100");
			expect(mockUpdateConfig).not.toHaveBeenCalled();
		}
	});
});
