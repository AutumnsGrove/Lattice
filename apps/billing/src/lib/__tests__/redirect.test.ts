import { describe, it, expect } from "vitest";
import { isValidRedirect, getSafeRedirect } from "../redirect.js";

describe("isValidRedirect", () => {
	describe("valid grove.place URLs", () => {
		it("accepts https://plant.grove.place/success", () => {
			expect(isValidRedirect("https://plant.grove.place/success")).toBe(true);
		});

		it("accepts https://mysite.grove.place/arbor/account", () => {
			expect(isValidRedirect("https://mysite.grove.place/arbor/account")).toBe(true);
		});

		it("accepts bare https://grove.place (root domain)", () => {
			expect(isValidRedirect("https://grove.place")).toBe(true);
		});

		it("accepts https://grove.place/ (root with trailing slash)", () => {
			expect(isValidRedirect("https://grove.place/")).toBe(true);
		});

		it("accepts https://billing.grove.place/checkout", () => {
			expect(isValidRedirect("https://billing.grove.place/checkout")).toBe(true);
		});

		it("accepts deep subdomain paths", () => {
			expect(isValidRedirect("https://api.grove.place/v1/callback")).toBe(true);
		});
	});

	describe("localhost (dev) URLs", () => {
		it("accepts http://localhost:5173", () => {
			expect(isValidRedirect("http://localhost:5173")).toBe(true);
		});

		it("accepts http://localhost:3000/callback", () => {
			expect(isValidRedirect("http://localhost:3000/callback")).toBe(true);
		});

		it("accepts http://localhost without a port", () => {
			expect(isValidRedirect("http://localhost")).toBe(true);
		});

		it("accepts http://localhost/ with trailing slash", () => {
			expect(isValidRedirect("http://localhost/")).toBe(true);
		});
	});

	describe("blocked URLs — security", () => {
		it("rejects https://evil.com", () => {
			expect(isValidRedirect("https://evil.com")).toBe(false);
		});

		it("rejects https://grove.place.evil.com (domain spoofing)", () => {
			expect(isValidRedirect("https://grove.place.evil.com")).toBe(false);
		});

		it("rejects http://grove.place (HTTP not allowed for non-localhost)", () => {
			expect(isValidRedirect("http://grove.place")).toBe(false);
		});

		it("rejects http://plant.grove.place (HTTP subdomain)", () => {
			expect(isValidRedirect("http://plant.grove.place")).toBe(false);
		});

		it("rejects javascript:alert(1) (XSS attack vector)", () => {
			expect(isValidRedirect("javascript:alert(1)")).toBe(false);
		});

		it("rejects https://evil.com?redirect=https://grove.place (open redirect attempt)", () => {
			expect(isValidRedirect("https://evil.com?redirect=https://grove.place")).toBe(false);
		});

		it("rejects https://127.0.0.1 (IP address, not localhost hostname)", () => {
			expect(isValidRedirect("https://127.0.0.1")).toBe(false);
		});
	});

	describe("malformed inputs", () => {
		it("rejects an empty string", () => {
			expect(isValidRedirect("")).toBe(false);
		});

		it("rejects a string that is not a URL", () => {
			expect(isValidRedirect("not a url at all")).toBe(false);
		});

		it("rejects a relative path", () => {
			expect(isValidRedirect("/arbor/account")).toBe(false);
		});

		it("rejects a path with no protocol", () => {
			expect(isValidRedirect("plant.grove.place/success")).toBe(false);
		});
	});
});

describe("getSafeRedirect", () => {
	describe("valid URLs pass through", () => {
		it("returns a valid grove.place URL as-is", () => {
			const url = "https://plant.grove.place/success";
			expect(getSafeRedirect(url)).toBe(url);
		});

		it("returns a valid localhost URL as-is", () => {
			const url = "http://localhost:5173/callback";
			expect(getSafeRedirect(url)).toBe(url);
		});

		it("returns https://grove.place as-is", () => {
			expect(getSafeRedirect("https://grove.place")).toBe("https://grove.place");
		});
	});

	describe("invalid URLs fall back to default", () => {
		it("returns the default fallback for https://evil.com", () => {
			expect(getSafeRedirect("https://evil.com")).toBe("https://grove.place");
		});

		it("returns the default fallback for javascript:alert(1)", () => {
			expect(getSafeRedirect("javascript:alert(1)")).toBe("https://grove.place");
		});

		it("returns the default fallback for an empty string", () => {
			expect(getSafeRedirect("")).toBe("https://grove.place");
		});
	});

	describe("null/undefined input falls back to default", () => {
		it("returns the default fallback for null", () => {
			expect(getSafeRedirect(null)).toBe("https://grove.place");
		});

		it("returns the default fallback for undefined", () => {
			expect(getSafeRedirect(undefined as unknown as null)).toBe("https://grove.place");
		});
	});

	describe("custom fallback", () => {
		it("uses the provided fallback when the URL is invalid", () => {
			expect(getSafeRedirect("https://evil.com", "/dashboard")).toBe("/dashboard");
		});

		it("uses the provided fallback when input is null", () => {
			expect(getSafeRedirect(null, "https://grove.place/arbor")).toBe("https://grove.place/arbor");
		});

		it("ignores the custom fallback when the URL is valid", () => {
			const url = "https://mysite.grove.place/arbor";
			expect(getSafeRedirect(url, "https://fallback.example.com")).toBe(url);
		});
	});
});
