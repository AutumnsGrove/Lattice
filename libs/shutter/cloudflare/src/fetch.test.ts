import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractDomain, FetchError, fetchUrl } from "./fetch";

// Long content strings that pass the >= 100 character check
const LONG_JINA_CONTENT =
	"# Article Title\n\nThis is a long markdown article with plenty of content that is definitely over one hundred characters to pass the fetch validation check.";
const LONG_TAVILY_CONTENT =
	"This is extracted content from Tavily that is definitely long enough to satisfy the one hundred character minimum requirement for content validation in fetchUrl.";
const LONG_HTML_CONTENT =
	"<html><body><h1>Title</h1><p>This is a long paragraph with plenty of text content that is definitely over one hundred characters after HTML tag stripping and whitespace normalization.</p></body></html>";
const LONG_HTML_ENTITIES =
	"<html><body>Coffee &amp; tea &quot;organic&quot; roast &nbsp; with &lt;untagged&gt; content and more text to ensure we pass the one hundred character minimum after entity decoding and tag stripping.</body></html>";

const originalFetch = globalThis.fetch;

describe("fetch module", () => {
	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	// ============================================================================
	// extractDomain Tests
	// ============================================================================

	describe("extractDomain", () => {
		it("extracts domain from simple URL", () => {
			expect(extractDomain("https://example.com/path")).toBe("example.com");
		});

		it("strips www. prefix", () => {
			expect(extractDomain("https://www.example.com/path")).toBe("example.com");
		});

		it("preserves subdomain (not www)", () => {
			expect(extractDomain("https://api.example.com")).toBe("api.example.com");
		});

		it("strips port number", () => {
			expect(extractDomain("https://example.com:8080/path")).toBe("example.com");
		});

		it("handles invalid URL with fallback regex", () => {
			const result = extractDomain("not-a-valid-url");
			expect(result).toBeTruthy();
		});

		it("handles URL with path and query params", () => {
			expect(extractDomain("https://example.com/path?query=value#anchor")).toBe("example.com");
		});
	});

	// ============================================================================
	// FetchError Class Tests
	// ============================================================================

	describe("FetchError", () => {
		it("sets properties correctly", () => {
			const error = new FetchError("https://example.com", "timeout");
			expect(error.url).toBe("https://example.com");
			expect(error.reason).toBe("timeout");
			expect(error.name).toBe("FetchError");
			expect(error.message).toContain("https://example.com");
			expect(error.message).toContain("timeout");
		});

		it("is instance of Error", () => {
			const error = new FetchError("https://example.com", "network error");
			expect(error).toBeInstanceOf(Error);
		});
	});

	// ============================================================================
	// fetchUrl Tests
	// ============================================================================

	describe("fetchUrl", () => {
		it("returns content from successful Jina fetch", async () => {
			// Use mockImplementation to create a fresh Response per call
			globalThis.fetch = vi
				.fn()
				.mockImplementation(() => Promise.resolve(new Response(LONG_JINA_CONTENT)));

			const result = await fetchUrl("https://example.com");
			expect(result).toContain("Article Title");
			expect(result.length).toBeGreaterThanOrEqual(100);
		});

		it("falls through when Jina returns short content", async () => {
			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce(new Response("too short"))
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ results: [{ raw_content: LONG_TAVILY_CONTENT }] })),
				);

			const result = await fetchUrl("https://example.com", "tavily-key");
			expect(result).toContain("Tavily");
		});

		it("tries Tavily when Jina fails and API key provided", async () => {
			globalThis.fetch = vi
				.fn()
				.mockRejectedValueOnce(new Error("Jina timeout"))
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ results: [{ raw_content: LONG_TAVILY_CONTENT }] })),
				);

			const result = await fetchUrl("https://example.com", "tavily-key");
			expect(result).toContain("Tavily");
		});

		it("skips Tavily when no API key provided", async () => {
			const mockFetch = vi
				.fn()
				.mockRejectedValueOnce(new Error("Jina failed"))
				.mockResolvedValueOnce(new Response(LONG_HTML_CONTENT));
			globalThis.fetch = mockFetch;

			await fetchUrl("https://example.com");
			// Jina + Basic (Tavily skipped)
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it("falls back to basic fetch when Jina and Tavily fail", async () => {
			globalThis.fetch = vi
				.fn()
				.mockRejectedValueOnce(new Error("Jina failed"))
				.mockRejectedValueOnce(new Error("Tavily failed"))
				.mockResolvedValueOnce(new Response(LONG_HTML_CONTENT));

			const result = await fetchUrl("https://example.com", "tavily-key");
			expect(result).toContain("Title");
			expect(result).not.toContain("<h1>");
		});

		it("throws FetchError when all methods fail", async () => {
			globalThis.fetch = vi
				.fn()
				.mockRejectedValueOnce(new Error("Jina timeout"))
				.mockRejectedValueOnce(new Error("Tavily 503"))
				.mockRejectedValueOnce(new Error("Basic network error"));

			await expect(fetchUrl("https://example.com", "tavily-key")).rejects.toThrow(FetchError);
		});

		it("throws FetchError when content is too short from all sources", async () => {
			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce(new Response("short"))
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ results: [{ raw_content: "also short" }] })),
				)
				.mockResolvedValueOnce(new Response("<html>tiny</html>"));

			await expect(fetchUrl("https://example.com", "tavily-key")).rejects.toThrow(FetchError);
		});

		it("strips HTML tags via basic fetch path", async () => {
			globalThis.fetch = vi
				.fn()
				.mockRejectedValueOnce(new Error("Jina failed"))
				.mockResolvedValueOnce(new Response(LONG_HTML_CONTENT));

			const result = await fetchUrl("https://example.com");
			expect(result).toContain("Title");
			expect(result).toContain("paragraph");
			expect(result).not.toContain("<h1>");
			expect(result).not.toContain("<p>");
		});

		it("decodes HTML entities in basic fetch path", async () => {
			globalThis.fetch = vi
				.fn()
				.mockRejectedValueOnce(new Error("Jina failed"))
				.mockResolvedValueOnce(new Response(LONG_HTML_ENTITIES));

			const result = await fetchUrl("https://example.com");
			expect(result).toContain("&");
			expect(result).toContain('"');
			expect(result).toContain("<untagged>");
		});

		it("passes signal to fetch for timeout support", async () => {
			globalThis.fetch = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
				// Verify that an AbortSignal is passed
				expect(opts?.signal).toBeDefined();
				return Promise.resolve(new Response(LONG_JINA_CONTENT));
			});

			await fetchUrl("https://example.com", undefined, 5000);
			expect(globalThis.fetch).toHaveBeenCalled();
		});
	});
});
