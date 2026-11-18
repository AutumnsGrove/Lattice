/**
 * Porch category registry + link builder tests.
 *
 * The registry exists to be the only copy of the category list. The test that
 * matters most is the last one: the landing form action, the picker and the
 * Arbor views all derive from here, and a category that cannot round-trip
 * through a URL would strand the person who followed a link into it.
 */

import { describe, it, expect } from "vitest";
import {
	PORCH_CATEGORIES,
	PORCH_CATEGORY_IDS,
	DEFAULT_PORCH_CATEGORY,
	PORCH_NEW_VISIT_URL,
	isPorchCategory,
	porchCategoryLabel,
	buildPorchUrl,
	type PorchCategory,
} from "./porch.js";

describe("PORCH_CATEGORIES", () => {
	it("has unique ids", () => {
		const ids = PORCH_CATEGORIES.map((c) => c.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("gives every category a label and a description", () => {
		for (const category of PORCH_CATEGORIES) {
			expect(category.label.length).toBeGreaterThan(0);
			expect(category.description.length).toBeGreaterThan(0);
		}
	});

	it("includes appeal, which is the reason this registry exists", () => {
		expect(PORCH_CATEGORY_IDS).toContain("appeal");
	});

	it("has a default that is a real category", () => {
		expect(isPorchCategory(DEFAULT_PORCH_CATEGORY)).toBe(true);
	});
});

describe("isPorchCategory", () => {
	it("accepts every id in the registry", () => {
		for (const id of PORCH_CATEGORY_IDS) {
			expect(isPorchCategory(id)).toBe(true);
		}
	});

	it("rejects unknown strings rather than coercing them", () => {
		expect(isPorchCategory("appeals")).toBe(false);
		expect(isPorchCategory("")).toBe(false);
		expect(isPorchCategory("APPEAL")).toBe(false);
	});

	it("rejects non-strings from untrusted input", () => {
		expect(isPorchCategory(null)).toBe(false);
		expect(isPorchCategory(undefined)).toBe(false);
		expect(isPorchCategory(3)).toBe(false);
		expect(isPorchCategory({ id: "appeal" })).toBe(false);
	});
});

describe("porchCategoryLabel", () => {
	it("labels a known category", () => {
		expect(porchCategoryLabel("appeal")).toBe("Appeal");
		expect(porchCategoryLabel("hello")).toBe("Just saying hi");
	});

	it("passes an unknown value through so a typo stays visible in Arbor", () => {
		expect(porchCategoryLabel("appeals")).toBe("appeals");
	});
});

describe("buildPorchUrl", () => {
	it("points at the visit form", () => {
		const url = new URL(buildPorchUrl({ category: "other", subject: "Hi" }));
		expect(url.origin + url.pathname).toBe(PORCH_NEW_VISIT_URL);
	});

	it("carries the category and subject as query parameters", () => {
		const url = new URL(
			buildPorchUrl({ category: "appeal", subject: "Suspended grove: quietfern" }),
		);
		expect(url.searchParams.get("category")).toBe("appeal");
		expect(url.searchParams.get("subject")).toBe("Suspended grove: quietfern");
	});

	it("encodes characters that would otherwise break the query string", () => {
		const subject = "Tom & Jerry's <suspension>? #1 + more";
		const message = "Line one\nLine two — with an em dash & an ampersand";
		const url = new URL(buildPorchUrl({ category: "appeal", subject, message }));

		expect(url.searchParams.get("subject")).toBe(subject);
		expect(url.searchParams.get("message")).toBe(message);
		// A raw `&` would have split the parameter; `#` would have started a fragment.
		expect(url.search).toContain("%26");
		expect(url.hash).toBe("");
	});

	it("includes email and name when given, and omits them when not", () => {
		const withDetails = new URL(
			buildPorchUrl({
				category: "account",
				subject: "Help",
				email: "wanderer@example.com",
				name: "Quiet Fern",
			}),
		);
		expect(withDetails.searchParams.get("email")).toBe("wanderer@example.com");
		expect(withDetails.searchParams.get("name")).toBe("Quiet Fern");

		const bare = new URL(buildPorchUrl({ category: "account", subject: "Help" }));
		expect(bare.searchParams.has("email")).toBe(false);
		expect(bare.searchParams.has("name")).toBe(false);
		expect(bare.searchParams.has("message")).toBe(false);
	});

	it("round-trips every category through a URL", () => {
		for (const category of PORCH_CATEGORY_IDS) {
			const url = new URL(
				buildPorchUrl({ category: category as PorchCategory, subject: "Round trip" }),
			);
			expect(isPorchCategory(url.searchParams.get("category"))).toBe(true);
		}
	});
});
