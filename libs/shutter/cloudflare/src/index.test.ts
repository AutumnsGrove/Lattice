import { describe, it, expect, vi, beforeEach } from "vitest";
import worker from "./index";

// Mock the external modules
vi.mock("./canary", () => ({
	canaryCheck: vi.fn().mockResolvedValue(null),
}));

vi.mock("./fetch", () => ({
	fetchUrl: vi
		.fn()
		.mockResolvedValue(
			"Extracted content that is long enough to pass the 100 char check. This content needs to be at least 100 characters long for the worker to process it.",
		),
	extractDomain: vi.fn().mockReturnValue("example.com"),
	FetchError: class FetchError extends Error {
		url: string;
		reason: string;
		constructor(url: string, reason: string) {
			super(`Failed to fetch ${url}: ${reason}`);
			this.url = url;
			this.reason = reason;
			this.name = "FetchError";
		}
	},
}));

vi.mock("./extraction", () => ({
	extractContent: vi.fn().mockResolvedValue({
		extracted: "Extracted data",
		tokensInput: 100,
		tokensOutput: 50,
		modelUsed: "openai/gpt-oss-120b",
	}),
}));

vi.mock("./database", () => ({
	shouldSkipFetch: vi.fn().mockResolvedValue(false),
	addOffender: vi.fn().mockResolvedValue(undefined),
	listOffenders: vi.fn().mockResolvedValue([]),
	clearOffenders: vi.fn().mockResolvedValue(undefined),
}));

function createMockEnv() {
	const stmt = {
		bind: vi.fn().mockReturnThis(),
		first: vi.fn().mockResolvedValue(null),
		run: vi.fn().mockResolvedValue({ success: true }),
		all: vi.fn().mockResolvedValue({ results: [] }),
	};
	return {
		DB: { prepare: vi.fn().mockReturnValue(stmt), _stmt: stmt },
		OPENROUTER_API_KEY: "test-key",
		TAVILY_API_KEY: "tavily-key",
		ENVIRONMENT: "test",
	} as any;
}

describe("worker entry point (index.ts)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ============================================================================
	// Routing Tests (6)
	// ============================================================================

	describe("routing", () => {
		it("handles OPTIONS with CORS headers", async () => {
			const request = new Request("http://localhost/fetch", { method: "OPTIONS" });
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(200);
			expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
		});

		it("returns info on GET /", async () => {
			const request = new Request("http://localhost/");
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data.name).toBe("Shutter");
			expect(data.version).toBeDefined();
		});

		it("returns 200 OK on GET /health", async () => {
			const request = new Request("http://localhost/health");
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(200);
			expect(await response.text()).toBe("OK");
		});

		it("returns 404 for unknown route", async () => {
			const request = new Request("http://localhost/unknown");
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(404);
		});

		it("returns 405 for GET /fetch", async () => {
			const request = new Request("http://localhost/fetch", { method: "GET" });
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(405);
		});

		it("routes POST /extract to handleExtract like /fetch", async () => {
			const request = new Request("http://localhost/extract", {
				method: "POST",
				body: JSON.stringify({ url: "https://example.com", query: "test" }),
			});
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(200);
		});
	});

	// ============================================================================
	// POST /fetch Extraction Tests (7)
	// ============================================================================

	describe("POST /fetch extraction", () => {
		it("returns 200 with ShutterResponse on success", async () => {
			const request = new Request("http://localhost/fetch", {
				method: "POST",
				body: JSON.stringify({
					url: "https://example.com",
					query: "extract data",
				}),
			});
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data.url).toBe("https://example.com");
			expect(data.extracted).toBeDefined();
		});

		it("returns 400 for invalid JSON body", async () => {
			const request = new Request("http://localhost/fetch", {
				method: "POST",
				body: "not json",
			});
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(400);
		});

		it("returns 400 for missing url field", async () => {
			const request = new Request("http://localhost/fetch", {
				method: "POST",
				body: JSON.stringify({ query: "test" }),
			});
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(400);
		});

		it("returns 400 for missing query field", async () => {
			const request = new Request("http://localhost/fetch", {
				method: "POST",
				body: JSON.stringify({ url: "https://example.com" }),
			});
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(400);
		});

		it("returns injection response when domain on offenders list", async () => {
			const { shouldSkipFetch } = await import("./database");
			vi.mocked(shouldSkipFetch).mockResolvedValueOnce(true);

			const request = new Request("http://localhost/fetch", {
				method: "POST",
				body: JSON.stringify({
					url: "https://badsite.com",
					query: "test",
				}),
			});
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data.promptInjection).not.toBeNull();
			expect(data.promptInjection.type).toBe("domain_blocked");
		});

		it("returns injection response on fetch error", async () => {
			const { fetchUrl } = await import("./fetch");
			const { FetchError } = await import("./fetch");
			vi.mocked(fetchUrl).mockRejectedValueOnce(new FetchError("https://example.com", "timeout"));

			const request = new Request("http://localhost/fetch", {
				method: "POST",
				body: JSON.stringify({
					url: "https://example.com",
					query: "test",
				}),
			});
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data.promptInjection).not.toBeNull();
			expect(data.promptInjection.type).toBe("fetch_error");
		});

		it("returns empty_content response for content < 100 chars", async () => {
			const { fetchUrl } = await import("./fetch");
			vi.mocked(fetchUrl).mockResolvedValueOnce("short");

			const request = new Request("http://localhost/fetch", {
				method: "POST",
				body: JSON.stringify({
					url: "https://example.com",
					query: "test",
				}),
			});
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data.promptInjection).not.toBeNull();
			expect(data.promptInjection.type).toBe("empty_content");
		});
	});

	// ============================================================================
	// Injection Detection Tests (3)
	// ============================================================================

	describe("injection detection flow", () => {
		it("detects injection and adds to offenders", async () => {
			const { canaryCheck } = await import("./canary");
			const { addOffender } = await import("./database");
			vi.mocked(canaryCheck).mockResolvedValueOnce({
				detected: true,
				type: "instruction_override",
				snippet: "ignore previous",
				domainFlagged: false,
				confidence: 0.95,
				signals: ["instruction_override:0.95"],
			});

			const request = new Request("http://localhost/fetch", {
				method: "POST",
				body: JSON.stringify({
					url: "https://example.com",
					query: "test",
				}),
			});
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data.promptInjection).not.toBeNull();
			expect(vi.mocked(addOffender)).toHaveBeenCalled();
		});

		it("returns 500 on extraction failure", async () => {
			const { extractContent } = await import("./extraction");
			vi.mocked(extractContent).mockRejectedValueOnce(new Error("API error"));

			const request = new Request("http://localhost/fetch", {
				method: "POST",
				body: JSON.stringify({
					url: "https://example.com",
					query: "test",
				}),
			});
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(500);
		});
	});

	// ============================================================================
	// Offenders Management Tests (2)
	// ============================================================================

	describe("GET /offenders", () => {
		it("returns offenders list with count", async () => {
			const { listOffenders } = await import("./database");
			vi.mocked(listOffenders).mockResolvedValueOnce([
				{
					domain: "bad.com",
					firstSeen: "2024-01-01T00:00:00Z",
					lastSeen: "2024-01-02T00:00:00Z",
					detectionCount: 2,
					injectionTypes: ["jailbreak_attempt"],
					avgConfidence: 0.85,
					maxConfidence: 0.95,
				},
			]);

			const request = new Request("http://localhost/offenders", {
				method: "GET",
			});
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data.offenders).toHaveLength(1);
			expect(data.count).toBe(1);
		});

		it("DELETE /offenders clears list", async () => {
			const { clearOffenders } = await import("./database");

			const request = new Request("http://localhost/offenders", {
				method: "DELETE",
			});
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.status).toBe(200);
			expect(vi.mocked(clearOffenders)).toHaveBeenCalled();
		});
	});

	// ============================================================================
	// CORS Tests (2)
	// ============================================================================

	describe("CORS headers", () => {
		it("includes CORS headers on JSON responses", async () => {
			const request = new Request("http://localhost/");
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
			expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
				"GET, POST, DELETE, OPTIONS",
			);
		});

		it("returns Content-Type application/json on JSON responses", async () => {
			const request = new Request("http://localhost/");
			const response = await worker.fetch(request, createMockEnv(), { waitUntil: vi.fn() } as any);
			expect(response.headers.get("Content-Type")).toBe("application/json");
		});
	});
});
