import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
	now: vi.fn().mockReturnValue("2026-03-12T00:00:00Z"),
}));

function makeEvent(options: { user?: any; body?: any; env?: any } = {}) {
	const url = new URL("http://localhost:5174/api/vibe");
	const defaultEnv = {
		DB: {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				run: vi.fn().mockResolvedValue({ success: true }),
			}),
		},
		DOMAIN_WORKER_URL: "https://forage.test",
	};

	return {
		url,
		request: new Request(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(options.body ?? { vibe_text: "a cozy little bakery shop downtown" }),
		}),
		locals: {
			user:
				options.user !== undefined
					? options.user
					: {
							id: "a1",
							email: "admin@test.com",
							is_admin: true,
						},
		},
		platform: { env: { ...defaultEnv, ...options.env } },
	} as any;
}

describe("POST /api/vibe", () => {
	let fetchMock: any;

	beforeEach(() => {
		fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("rejects non-admin requests with 401", async () => {
		const event = makeEvent({
			user: { id: "u1", email: "user@test.com", is_admin: false },
		});

		try {
			await POST(event);
			expect.fail("Should have thrown error");
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.message).toBe("Unauthorized");
		}
	});

	it("rejects requests without is_admin property with 401", async () => {
		const event = makeEvent({
			user: { id: "u1", email: "user@test.com" },
		});

		try {
			await POST(event);
			expect.fail("Should have thrown error");
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.message).toBe("Unauthorized");
		}
	});

	it("rejects requests without user with 401", async () => {
		const event = makeEvent({
			user: null,
		});

		try {
			await POST(event);
			expect.fail("Should have thrown error");
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.message).toBe("Unauthorized");
		}
	});

	it("rejects requests without DB with 500", async () => {
		const event = makeEvent({
			env: { DB: undefined, DOMAIN_WORKER_URL: "https://forage.test" },
		});

		try {
			await POST(event);
			expect.fail("Should have thrown error");
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.message).toBe("Database not available");
		}
	});

	it("rejects invalid JSON body with 400", async () => {
		const event = makeEvent();
		event.request = new Request(event.url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "invalid json {",
		});

		try {
			await POST(event);
			expect.fail("Should have thrown error");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("Invalid request body");
		}
	});

	it("rejects missing vibe_text with 400", async () => {
		const event = makeEvent({
			body: { client_email: "test@test.com" },
		});

		try {
			await POST(event);
			expect.fail("Should have thrown error");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("vibe_text is required");
		}
	});

	it("rejects non-string vibe_text with 400", async () => {
		const event = makeEvent({
			body: { vibe_text: 123 },
		});

		try {
			await POST(event);
			expect.fail("Should have thrown error");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("vibe_text is required");
		}
	});

	it("rejects vibe_text with 1 word with word_count_too_low", async () => {
		const event = makeEvent({
			body: { vibe_text: "bakery" },
		});

		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe("word_count_too_low");
		expect(data.word_count).toBe(1);
		expect(data.hint).toContain("1 word");
	});

	it("rejects vibe_text with 4 words with word_count_too_low", async () => {
		const event = makeEvent({
			body: { vibe_text: "one two three four" },
		});

		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe("word_count_too_low");
		expect(data.word_count).toBe(4);
		expect(data.hint).toContain("4 words");
	});

	it("accepts vibe_text with exactly 5 words", async () => {
		const event = makeEvent({
			body: { vibe_text: "one two three four five" },
		});

		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					job_id: "job-123",
					status: "running",
					parsed: {
						business_name: "Test Business",
						vibe: "cozy",
						keywords: "test",
						tld_preferences: ["com"],
						domain_idea: null,
					},
				}),
				{ status: 200 },
			),
		);

		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});

	it("rejects requests without DOMAIN_WORKER_URL with 500", async () => {
		const event = makeEvent({
			env: { DB: (event) => event, DOMAIN_WORKER_URL: undefined },
		});

		try {
			await POST(event);
			expect.fail("Should have thrown error");
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.message).toBe("DOMAIN_WORKER_URL not configured");
		}
	});

	it("returns parsing_failed on worker 422 response", async () => {
		const event = makeEvent({
			body: { vibe_text: "a very detailed description of a cozy business" },
		});

		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: "Could not parse" }), {
				status: 422,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.success).toBe(false);
		expect(data.error).toBe("parsing_failed");
		expect(data.hint).toContain("couldn't quite understand");
	});

	it("throws 500 on worker non-422 error", async () => {
		const event = makeEvent({
			body: { vibe_text: "a very detailed description of a cozy business" },
		});

		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: "Server error" }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			}),
		);

		try {
			await POST(event);
			expect.fail("Should have thrown error");
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.message).toContain("Worker failed to parse vibe");
		}
	});

	it("returns success with parsed data on valid request", async () => {
		const event = makeEvent({
			body: { vibe_text: "a cozy little bakery shop downtown" },
		});

		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					job_id: "job-123",
					status: "running",
					parsed: {
						business_name: "Cozy Bakery",
						vibe: "warm",
						keywords: "bakery cozy",
						tld_preferences: ["com"],
						domain_idea: null,
					},
				}),
				{ status: 200 },
			),
		);

		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.job_id).toBe("job-123");
		expect(data.status).toBe("running");
		expect(data.parsed.business_name).toBe("Cozy Bakery");
		expect(data.parsed.vibe).toBe("warm");
		expect(data.parsed.keywords).toBe("bakery cozy");
		expect(data.parsed.tld_preferences).toEqual(["com"]);
	});

	it("sends trimmed vibe_text to worker", async () => {
		const event = makeEvent({
			body: { vibe_text: "  a cozy little bakery shop  " },
		});

		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					job_id: "job-123",
					status: "running",
					parsed: {
						business_name: "Bakery",
						vibe: "cozy",
						keywords: "bakery",
						tld_preferences: ["com"],
						domain_idea: null,
					},
				}),
				{ status: 200 },
			),
		);

		await POST(event);

		expect(fetchMock).toHaveBeenCalledWith("https://forage.test/api/vibe", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				vibe_text: "a cozy little bakery shop",
				client_email: "admin@test.com",
			}),
		});
	});

	it("uses client_email if provided", async () => {
		const event = makeEvent({
			body: { vibe_text: "a cozy bakery shop downtown", client_email: "client@test.com" },
		});

		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					job_id: "job-123",
					status: "running",
					parsed: {
						business_name: "Bakery",
						vibe: "cozy",
						keywords: "bakery",
						tld_preferences: ["com"],
						domain_idea: null,
					},
				}),
				{ status: 200 },
			),
		);

		await POST(event);

		expect(fetchMock).toHaveBeenCalledWith("https://forage.test/api/vibe", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				vibe_text: "a cozy bakery shop downtown",
				client_email: "client@test.com",
			}),
		});
	});

	it("falls back to user email if client_email not provided", async () => {
		const event = makeEvent({
			body: { vibe_text: "a cozy bakery shop downtown" },
			user: { id: "a1", email: "admin@example.com", is_admin: true },
		});

		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					job_id: "job-123",
					status: "running",
					parsed: {
						business_name: "Bakery",
						vibe: "cozy",
						keywords: "bakery",
						tld_preferences: ["com"],
						domain_idea: null,
					},
				}),
				{ status: 200 },
			),
		);

		await POST(event);

		expect(fetchMock).toHaveBeenCalledWith("https://forage.test/api/vibe", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				vibe_text: "a cozy bakery shop downtown",
				client_email: "admin@example.com",
			}),
		});
	});

	it("stores job in D1 on success", async () => {
		const dbPrepare = vi.fn().mockReturnValue({
			bind: vi.fn().mockReturnThis(),
			run: vi.fn().mockResolvedValue({ success: true }),
		});

		const event = makeEvent({
			body: { vibe_text: "a cozy bakery shop downtown", client_email: "client@test.com" },
			env: {
				DB: { prepare: dbPrepare },
				DOMAIN_WORKER_URL: "https://forage.test",
			},
		});

		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					job_id: "job-123",
					status: "running",
					parsed: {
						business_name: "Cozy Bakery",
						vibe: "warm",
						keywords: "bakery cozy",
						tld_preferences: ["com"],
						domain_idea: "cozybakery.com",
					},
				}),
				{ status: 200 },
			),
		);

		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);

		expect(dbPrepare).toHaveBeenCalledWith(
			expect.stringContaining("INSERT OR REPLACE INTO domain_search_jobs"),
		);

		const stmtMock = dbPrepare.mock.results[0].value;
		expect(stmtMock.bind).toHaveBeenCalled();
		// Verify key fields in the bind args
		const bindArgs = stmtMock.bind.mock.calls[0];
		expect(bindArgs[0]).toBe("job-123"); // job_id
		expect(bindArgs[2]).toBe("client@test.com"); // client_email
		expect(bindArgs[3]).toBe("Cozy Bakery"); // business_name
		expect(bindArgs[4]).toBe("cozybakery.com"); // domain_idea
		expect(stmtMock.run).toHaveBeenCalled();
	});

	it("handles DB insert failure gracefully and still returns success", async () => {
		const dbPrepare = vi.fn().mockReturnValue({
			bind: vi.fn().mockReturnThis(),
			run: vi.fn().mockRejectedValue(new Error("DB Error")),
		});

		const event = makeEvent({
			body: { vibe_text: "a cozy bakery shop downtown" },
			env: {
				DB: { prepare: dbPrepare },
				DOMAIN_WORKER_URL: "https://forage.test",
			},
		});

		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					job_id: "job-123",
					status: "running",
					parsed: {
						business_name: "Cozy Bakery",
						vibe: "warm",
						keywords: "bakery cozy",
						tld_preferences: ["com"],
						domain_idea: null,
					},
				}),
				{ status: 200 },
			),
		);

		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.job_id).toBe("job-123");
	});

	it("trims vibe_text when counting words", async () => {
		const event = makeEvent({
			body: { vibe_text: "  one  two  three  four  five  " },
		});

		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					job_id: "job-123",
					status: "running",
					parsed: {
						business_name: "Test",
						vibe: "test",
						keywords: "test",
						tld_preferences: ["com"],
						domain_idea: null,
					},
				}),
				{ status: 200 },
			),
		);

		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});

	it("handles empty string vibe_text with 400", async () => {
		const event = makeEvent({
			body: { vibe_text: "" },
		});

		try {
			await POST(event);
			expect.fail("Should have thrown error");
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.message).toBe("vibe_text is required");
		}
	});

	it("handles whitespace-only vibe_text as 0 words", async () => {
		const event = makeEvent({
			body: { vibe_text: "   \n  \t  " },
		});

		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe("word_count_too_low");
		expect(data.word_count).toBe(0);
	});

	it("uses correct singular/plural in word count hint", async () => {
		const event1word = makeEvent({
			body: { vibe_text: "one" },
		});

		const response1 = await POST(event1word);
		const data1 = await response1.json();
		expect(data1.hint).toContain("1 word.");
		expect(data1.hint).not.toContain("1 words");

		const event2words = makeEvent({
			body: { vibe_text: "one two" },
		});

		const response2 = await POST(event2words);
		const data2 = await response2.json();
		expect(data2.hint).toContain("2 words");
	});

	it("handles worker fetch network error with 500", async () => {
		const event = makeEvent({
			body: { vibe_text: "a cozy bakery shop downtown" },
		});

		fetchMock.mockRejectedValueOnce(new Error("Network error"));

		try {
			await POST(event);
			expect.fail("Should have thrown error");
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.message).toBe("Failed to process vibe search");
		}
	});

	it("sends POST request with correct URL", async () => {
		const event = makeEvent({
			body: { vibe_text: "a cozy bakery shop downtown" },
			env: {
				DB: {
					prepare: vi.fn().mockReturnValue({
						bind: vi.fn().mockReturnThis(),
						run: vi.fn().mockResolvedValue({ success: true }),
					}),
				},
				DOMAIN_WORKER_URL: "https://custom-worker.example.com",
			},
		});

		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					job_id: "job-123",
					status: "running",
					parsed: {
						business_name: "Bakery",
						vibe: "cozy",
						keywords: "bakery",
						tld_preferences: ["com"],
						domain_idea: null,
					},
				}),
				{ status: 200 },
			),
		);

		await POST(event);

		expect(fetchMock).toHaveBeenCalledWith(
			"https://custom-worker.example.com/api/vibe",
			expect.any(Object),
		);
	});
});
