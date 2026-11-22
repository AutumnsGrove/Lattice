/**
 * Tests for acquisition ref tracking (#1426).
 *
 * These are the rules the business card QR depends on: a slug is either clean
 * enough to store and forward, or it is dropped entirely. Nothing in between.
 */

import { describe, it, expect } from "vitest";
import {
	REF_COOKIE_OPTIONS,
	REF_MAX_LENGTH,
	resolveRef,
	sanitizeRef,
	withRef,
} from "./ref-tracking";

const hello = (query = "") => new URL(`https://grove.place/hello${query}`);

describe("sanitizeRef", () => {
	it("accepts the slugs the cards use", () => {
		expect(sanitizeRef("card")).toBe("card");
		expect(sanitizeRef("card-front")).toBe("card-front");
		expect(sanitizeRef("pride-2026")).toBe("pride-2026");
	});

	it("normalizes case and surrounding whitespace", () => {
		expect(sanitizeRef("  Card-Back  ")).toBe("card-back");
	});

	it("rejects empty, missing, and non-string values", () => {
		expect(sanitizeRef("")).toBeNull();
		expect(sanitizeRef("   ")).toBeNull();
		expect(sanitizeRef(null)).toBeNull();
		expect(sanitizeRef(undefined)).toBeNull();
	});

	it("rejects values longer than the limit", () => {
		expect(sanitizeRef("a".repeat(REF_MAX_LENGTH))).toBe("a".repeat(REF_MAX_LENGTH));
		expect(sanitizeRef("a".repeat(REF_MAX_LENGTH + 1))).toBeNull();
	});

	it("rejects anything that is not a lowercase slug", () => {
		expect(sanitizeRef("card front")).toBeNull();
		expect(sanitizeRef("card/back")).toBeNull();
		expect(sanitizeRef("card_back")).toBeNull();
		expect(sanitizeRef("-card")).toBeNull();
		expect(sanitizeRef("<script>")).toBeNull();
	});
});

describe("resolveRef", () => {
	it("reads the ref from the URL", () => {
		expect(resolveRef(hello("?ref=card"))).toBe("card");
	});

	it("falls back to the stored cookie", () => {
		expect(resolveRef(hello(), "card")).toBe("card");
	});

	it("prefers a fresh URL ref over an older cookie", () => {
		expect(resolveRef(hello("?ref=pride-2026"), "card")).toBe("pride-2026");
	});

	it("returns null when neither is usable", () => {
		expect(resolveRef(hello())).toBeNull();
		expect(resolveRef(hello("?ref="), "")).toBeNull();
		expect(resolveRef(hello("?ref=NOT VALID"), "also not valid")).toBeNull();
	});
});

describe("withRef", () => {
	it("appends the ref to the signup URL", () => {
		expect(withRef("https://plant.grove.place", "card")).toBe(
			"https://plant.grove.place/?ref=card",
		);
	});

	it("preserves an existing query string", () => {
		expect(withRef("https://plant.grove.place/?plan=oak", "card")).toBe(
			"https://plant.grove.place/?plan=oak&ref=card",
		);
	});

	it("leaves the URL untouched when there is no usable ref", () => {
		expect(withRef("https://plant.grove.place", null)).toBe("https://plant.grove.place");
		expect(withRef("https://plant.grove.place", "not valid")).toBe("https://plant.grove.place");
	});
});

describe("cookie options", () => {
	it("keeps the ref server-readable and scoped to the site", () => {
		expect(REF_COOKIE_OPTIONS.path).toBe("/");
		expect(REF_COOKIE_OPTIONS.httpOnly).toBe(true);
		expect(REF_COOKIE_OPTIONS.sameSite).toBe("lax");
		expect(REF_COOKIE_OPTIONS.maxAge).toBeGreaterThan(0);
	});
});
