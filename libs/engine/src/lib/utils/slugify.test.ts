import { describe, it, expect, vi } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
	it("converts text to lowercase URL slug", () => {
		expect(slugify("Hello World")).toBe("hello-world");
	});

	it("replaces non-alphanumeric chars with dashes", () => {
		expect(slugify("Welcome to the Grove 🌿")).toBe("welcome-to-the-grove");
	});

	it("collapses multiple dashes", () => {
		expect(slugify("a---b---c")).toBe("a-b-c");
	});

	it("trims leading and trailing dashes", () => {
		expect(slugify("  --hello world--  ")).toBe("hello-world");
	});

	it("handles empty string", () => {
		expect(slugify("")).toBe("");
	});

	it("handles all-special-char input", () => {
		expect(slugify("🌿🌲🌳")).toBe("");
	});

	it("respects maxLength option", () => {
		const result = slugify("a very long title indeed", { maxLength: 12 });
		expect(result.length).toBeLessThanOrEqual(12);
		expect(result).toBe("a-very-long");
	});

	it("trims trailing dash after maxLength truncation", () => {
		// "hello-world" truncated to 6 would be "hello-", should trim to "hello"
		expect(slugify("hello world", { maxLength: 6 })).toBe("hello");
	});

	it("appends unique suffix when unique is true", () => {
		vi.spyOn(Date, "now").mockReturnValue(1234567890);
		const result = slugify("test title", { unique: true });
		expect(result).toMatch(/^test-title-[a-z0-9]+$/);
		vi.restoreAllMocks();
	});

	it("applies maxLength before unique suffix", () => {
		vi.spyOn(Date, "now").mockReturnValue(1234567890);
		const result = slugify("a very long title", { maxLength: 6, unique: true });
		expect(result).toMatch(/^a-very-[a-z0-9]+$/);
		vi.restoreAllMocks();
	});
});
