import { describe, it, expect, beforeEach, vi } from "vitest";

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
	getSearchJob: vi.fn().mockResolvedValue(null),
	updateSearchJobStatus: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocking
import { POST as startSearch } from "./start/+server";
import { POST as cancelSearch } from "./cancel/+server";
import { GET as getStatus } from "./status/+server";
import { GET as getResults } from "./results/+server";
import { POST as resumeSearch } from "./resume/+server";
import { GET as getStream } from "./stream/+server";

// Get references to mocked modules for test setup
const { json: jsonResponse, error: errorResponse } = await import("@sveltejs/kit");
const { getSearchJob, updateSearchJobStatus } = await import("$lib/server/db");

// Mock fetch globally
let fetchMock: any;

beforeEach(() => {
	fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);
});

// Helper to create mock event object
function makeEvent(
	options: {
		method?: string;
		url?: string;
		user?: any;
		body?: any;
		env?: any;
		searchParams?: Record<string, string>;
	} = {},
) {
	const urlObj = new URL(options.url ?? "http://localhost:5174/api/search/start");
	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([k, v]) => urlObj.searchParams.set(k, v));
	}

	const defaultEnv = {
		DB: {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				run: vi.fn().mockResolvedValue({ success: true }),
				first: vi.fn().mockResolvedValue(null),
			}),
		},
		DOMAIN_WORKER_URL: "https://forage.test",
	};

	return {
		url: urlObj,
		request: new Request(urlObj, {
			method: options.method ?? "POST",
			headers: { "Content-Type": "application/json" },
			...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
		}),
		locals: {
			user: options.user ?? {
				id: "a1",
				email: "admin@test.com",
				is_admin: true,
			},
		},
		platform: { env: { ...defaultEnv, ...options.env } },
	} as any;
}

describe("POST /api/search/start", () => {
	it("rejects non-admin user with 401", async () => {
		const event = makeEvent({
			user: { id: "u1", email: "user@test.com", is_admin: false },
		});

		try {
			await startSearch(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it("rejects missing DB with 500", async () => {
		const event = makeEvent({
			env: { DB: undefined, DOMAIN_WORKER_URL: "https://forage.test" },
		});

		try {
			await startSearch(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(500);
		}
	});

	it("rejects invalid JSON body with 400", async () => {
		const event = makeEvent();
		// Override request with invalid JSON
		event.request = new Request("http://localhost:5174/api/search/start", {
			method: "POST",
			body: "invalid json{",
		});

		try {
			await startSearch(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it("rejects missing business_name with 400", async () => {
		const event = makeEvent({
			body: { ai_provider: "openrouter" },
		});

		try {
			await startSearch(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it("rejects invalid ai_provider with 400", async () => {
		const event = makeEvent({
			body: { business_name: "Test Business", ai_provider: "invalid" },
		});

		try {
			await startSearch(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it("rejects when DOMAIN_WORKER_URL not configured with 500", async () => {
		const event = makeEvent({
			body: {
				business_name: "Test Business",
				ai_provider: "openrouter",
			},
			env: { DOMAIN_WORKER_URL: undefined },
		});

		try {
			await startSearch(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(500);
		}
	});

	it("returns success with job data on valid request", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ job_id: "job-1", status: "running" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const event = makeEvent({
			body: {
				business_name: "Test Business",
				ai_provider: "openrouter",
			},
		});

		const response = await startSearch(event);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.job.id).toBe("job-1");
		expect(data.job.status).toBe("running");
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining("https://forage.test"),
			expect.any(Object),
		);
	});

	it("handles D1 insert failure gracefully", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ job_id: "job-1", status: "running" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const event = makeEvent({
			body: {
				business_name: "Test Business",
				ai_provider: "openrouter",
			},
			env: {
				DB: {
					prepare: vi.fn().mockReturnValue({
						bind: vi.fn().mockReturnThis(),
						run: vi.fn().mockRejectedValueOnce(new Error("DB error")),
						first: vi.fn().mockResolvedValue(null),
					}),
				},
				DOMAIN_WORKER_URL: "https://forage.test",
			},
		});

		const response = await startSearch(event);
		// Should still return success despite DB failure
		expect(response.status).toBe(200);
	});
});

describe("POST /api/search/cancel", () => {
	it("rejects non-admin user with 401", async () => {
		const event = makeEvent({
			method: "POST",
			url: "http://localhost:5174/api/search/cancel",
			user: { id: "u1", email: "user@test.com", is_admin: false },
			body: { job_id: "job-1" },
		});

		try {
			await cancelSearch(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it("rejects missing DB with 500", async () => {
		const event = makeEvent({
			method: "POST",
			url: "http://localhost:5174/api/search/cancel",
			body: { job_id: "job-1" },
			env: { DB: undefined, DOMAIN_WORKER_URL: "https://forage.test" },
		});

		try {
			await cancelSearch(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(500);
		}
	});

	it("rejects missing job_id with 400", async () => {
		const event = makeEvent({
			method: "POST",
			url: "http://localhost:5174/api/search/cancel",
			body: {},
		});

		try {
			await cancelSearch(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it("cancels job and updates local DB status", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ status: "cancelled" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const event = makeEvent({
			method: "POST",
			url: "http://localhost:5174/api/search/cancel",
			body: { job_id: "job-1" },
		});

		const response = await cancelSearch(event);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining("/api/cancel?job_id=job-1"),
			expect.objectContaining({ method: "POST" }),
		);
		expect(vi.mocked(updateSearchJobStatus)).toHaveBeenCalledWith(
			expect.anything(),
			"job-1",
			expect.objectContaining({ status: "cancelled" }),
		);
	});

	it("handles worker cancel failure gracefully", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: "Job not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const event = makeEvent({
			method: "POST",
			url: "http://localhost:5174/api/search/cancel",
			body: { job_id: "job-1" },
		});

		const response = await cancelSearch(event);
		// Should still update local DB even if worker fails
		expect(response.status).toBe(200);
	});
});

describe("GET /api/search/status", () => {
	it("rejects non-admin user with 401", async () => {
		const event = makeEvent({
			method: "GET",
			url: "http://localhost:5174/api/search/status",
			user: { id: "u1", email: "user@test.com", is_admin: false },
			searchParams: { job_id: "job-1" },
		});

		try {
			await getStatus(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it("rejects missing job_id with 400", async () => {
		const event = makeEvent({
			method: "GET",
			url: "http://localhost:5174/api/search/status",
		});

		try {
			await getStatus(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it("returns local job data when worker returns 404", async () => {
		const localJob = {
			id: "job-1",
			status: "running",
			business_name: "Test Business",
		} as any;

		vi.mocked(getSearchJob).mockResolvedValueOnce(localJob);

		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: "Not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const event = makeEvent({
			method: "GET",
			url: "http://localhost:5174/api/search/status",
			searchParams: { job_id: "job-1" },
		});

		const response = await getStatus(event);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.job.id).toBe("job-1");
		expect(data.job.status).toBe("running");
	});

	it("returns merged worker and local data on success", async () => {
		const localJob = { id: "job-1", status: "running", client_id: "c1" } as any;
		vi.mocked(getSearchJob).mockResolvedValueOnce(localJob);

		const workerData = {
			job_id: "job-1",
			status: "complete",
			batch_num: 3,
			domains_checked: 100,
			domains_available: 25,
			good_results: 20,
			created_at: "2026-03-12T00:00:00Z",
			updated_at: "2026-03-12T01:00:00Z",
		};
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify(workerData), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const event = makeEvent({
			method: "GET",
			url: "http://localhost:5174/api/search/status",
			searchParams: { job_id: "job-1" },
		});

		const response = await getStatus(event);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.job.id).toBe("job-1");
		expect(data.job.status).toBe("complete");
	});

	it("syncs worker status back to local D1", async () => {
		const localJob = { id: "job-1", status: "running" } as any;
		vi.mocked(getSearchJob).mockResolvedValueOnce(localJob);

		const workerData = {
			job_id: "job-1",
			status: "complete",
			batch_num: 3,
			domains_checked: 100,
			domains_available: 25,
			good_results: 20,
			created_at: "2026-03-12T00:00:00Z",
			updated_at: "2026-03-12T01:00:00Z",
		};
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify(workerData), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const event = makeEvent({
			method: "GET",
			url: "http://localhost:5174/api/search/status",
			searchParams: { job_id: "job-1" },
		});

		await getStatus(event);

		expect(vi.mocked(updateSearchJobStatus)).toHaveBeenCalledWith(
			expect.anything(),
			"job-1",
			expect.objectContaining({ status: "complete" }),
		);
	});
});

describe("GET /api/search/results", () => {
	it("rejects non-admin user with 401", async () => {
		const event = makeEvent({
			method: "GET",
			url: "http://localhost:5174/api/search/results",
			user: { id: "u1", email: "user@test.com", is_admin: false },
			searchParams: { job_id: "job-1" },
		});

		try {
			await getResults(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it("rejects missing job_id with 400", async () => {
		const event = makeEvent({
			method: "GET",
			url: "http://localhost:5174/api/search/results",
		});

		try {
			await getResults(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it("proxies results from worker", async () => {
		const workerResults = { results: [{ domain: "example.com" }] };
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify(workerResults), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const event = makeEvent({
			method: "GET",
			url: "http://localhost:5174/api/search/results",
			searchParams: { job_id: "job-1" },
		});

		const response = await getResults(event);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.results).toHaveLength(1);
		expect(data.results[0].domain).toBe("example.com");
	});
});

describe("POST /api/search/resume", () => {
	it("rejects non-admin user with 401", async () => {
		const event = makeEvent({
			method: "POST",
			url: "http://localhost:5174/api/search/resume",
			user: { id: "u1", email: "user@test.com", is_admin: false },
			body: { job_id: "job-1", followup_responses: {} },
		});

		try {
			await resumeSearch(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it("rejects missing job_id with 400", async () => {
		const event = makeEvent({
			method: "POST",
			url: "http://localhost:5174/api/search/resume",
			body: { followup_responses: {} },
		});

		try {
			await resumeSearch(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it("rejects missing followup_responses with 400", async () => {
		const event = makeEvent({
			method: "POST",
			url: "http://localhost:5174/api/search/resume",
			body: { job_id: "job-1" },
		});

		try {
			await resumeSearch(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it("returns success and updates local status to running", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ job_id: "job-1", status: "running" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const event = makeEvent({
			method: "POST",
			url: "http://localhost:5174/api/search/resume",
			searchParams: { job_id: "job-1" },
			body: { followup_responses: { q1: "answer1" } },
		});

		const response = await resumeSearch(event);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.status).toBe("running");
		expect(vi.mocked(updateSearchJobStatus)).toHaveBeenCalledWith(
			expect.anything(),
			"job-1",
			expect.objectContaining({ status: "running" }),
		);
	});
});

describe("GET /api/search/stream", () => {
	it("rejects non-admin user with 401", async () => {
		const event = makeEvent({
			method: "GET",
			url: "http://localhost:5174/api/search/stream",
			user: { id: "u1", email: "user@test.com", is_admin: false },
			searchParams: { job_id: "job-1" },
		});

		try {
			await getStream(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it("rejects missing job_id with 400", async () => {
		const event = makeEvent({
			method: "GET",
			url: "http://localhost:5174/api/search/stream",
		});

		try {
			await getStream(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it("proxies SSE stream from worker with correct headers", async () => {
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(new TextEncoder().encode("data: test\n\n"));
				controller.close();
			},
		});

		fetchMock.mockResolvedValueOnce(new Response(stream, { status: 200 }));

		const event = makeEvent({
			method: "GET",
			url: "http://localhost:5174/api/search/stream",
			searchParams: { job_id: "job-1" },
		});

		const response = await getStream(event);

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("text/event-stream");
		expect(response.headers.get("Cache-Control")).toBe("no-cache");
	});
});
