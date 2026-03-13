import { describe, it, expect } from "vitest";
import {
	isValidUUID,
	isValidPaidTier,
	isValidBillingCycle,
	isValidUrl,
	getPriceId,
	mapSubscriptionStatus,
	safeParseBody,
} from "../utils/validation.js";

describe("validation", () => {
	// ============================================================
	// isValidUUID
	// ============================================================
	describe("isValidUUID", () => {
		it("accepts a standard v4 UUID", () => {
			expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
		});

		it("accepts UUIDs with uppercase hex", () => {
			expect(isValidUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
		});

		it("rejects a random string", () => {
			expect(isValidUUID("not-a-uuid")).toBe(false);
		});

		it("rejects an empty string", () => {
			expect(isValidUUID("")).toBe(false);
		});

		it("rejects a UUID missing dashes", () => {
			expect(isValidUUID("550e8400e29b41d4a716446655440000")).toBe(false);
		});

		it("rejects a UUID with wrong segment lengths", () => {
			expect(isValidUUID("550e8400-e29b-41d4-a716-44665544000")).toBe(false);
		});

		it("rejects a UUID with non-hex characters", () => {
			expect(isValidUUID("550e8400-e29b-41d4-a716-44665544000g")).toBe(false);
		});
	});

	// ============================================================
	// isValidPaidTier
	// ============================================================
	describe("isValidPaidTier", () => {
		it("accepts seedling", () => {
			expect(isValidPaidTier("seedling")).toBe(true);
		});

		it("accepts sapling", () => {
			expect(isValidPaidTier("sapling")).toBe(true);
		});

		it("accepts oak", () => {
			expect(isValidPaidTier("oak")).toBe(true);
		});

		it("accepts evergreen", () => {
			expect(isValidPaidTier("evergreen")).toBe(true);
		});

		it("rejects wanderer (free tier)", () => {
			expect(isValidPaidTier("wanderer")).toBe(false);
		});

		it("rejects a random string", () => {
			expect(isValidPaidTier("premium")).toBe(false);
		});

		it("rejects an empty string", () => {
			expect(isValidPaidTier("")).toBe(false);
		});
	});

	// ============================================================
	// isValidBillingCycle
	// ============================================================
	describe("isValidBillingCycle", () => {
		it("accepts monthly", () => {
			expect(isValidBillingCycle("monthly")).toBe(true);
		});

		it("accepts yearly", () => {
			expect(isValidBillingCycle("yearly")).toBe(true);
		});

		it("rejects weekly", () => {
			expect(isValidBillingCycle("weekly")).toBe(false);
		});

		it("rejects annual (alias, not accepted)", () => {
			expect(isValidBillingCycle("annual")).toBe(false);
		});

		it("rejects empty string", () => {
			expect(isValidBillingCycle("")).toBe(false);
		});

		it("rejects random string", () => {
			expect(isValidBillingCycle("quarterly")).toBe(false);
		});
	});

	// ============================================================
	// isValidUrl
	// ============================================================
	describe("isValidUrl", () => {
		it("accepts an HTTPS *.grove.place URL", () => {
			expect(isValidUrl("https://plant.grove.place/success")).toBe(true);
		});

		it("accepts the bare grove.place root", () => {
			expect(isValidUrl("https://grove.place")).toBe(true);
		});

		it("accepts a multi-level subdomain", () => {
			expect(isValidUrl("https://mysite.grove.place/arbor/account")).toBe(true);
		});

		it("accepts localhost for local development", () => {
			expect(isValidUrl("http://localhost:5173")).toBe(true);
		});

		it("accepts localhost without a port", () => {
			expect(isValidUrl("http://localhost")).toBe(true);
		});

		it("rejects evil.com", () => {
			expect(isValidUrl("https://evil.com")).toBe(false);
		});

		it("rejects a domain that ends with grove.place but is not a subdomain", () => {
			expect(isValidUrl("https://grove.place.evil.com")).toBe(false);
		});

		it("rejects HTTP grove.place (must be HTTPS)", () => {
			expect(isValidUrl("http://plant.grove.place")).toBe(false);
		});

		it("rejects a malformed URL", () => {
			expect(isValidUrl("not a url")).toBe(false);
		});

		it("rejects an empty string", () => {
			expect(isValidUrl("")).toBe(false);
		});

		it("rejects javascript: protocol", () => {
			expect(isValidUrl("javascript:alert(1)")).toBe(false);
		});
	});

	// ============================================================
	// getPriceId
	// ============================================================
	describe("getPriceId", () => {
		it("returns a price ID for seedling + monthly", () => {
			const id = getPriceId("seedling", "monthly");
			expect(id).toBeTruthy();
			expect(typeof id).toBe("string");
		});

		it("returns a price ID for seedling + yearly", () => {
			expect(getPriceId("seedling", "yearly")).toBeTruthy();
		});

		it("returns a price ID for sapling + monthly", () => {
			expect(getPriceId("sapling", "monthly")).toBeTruthy();
		});

		it("returns a price ID for sapling + yearly", () => {
			expect(getPriceId("sapling", "yearly")).toBeTruthy();
		});

		it("returns a price ID for oak + monthly", () => {
			expect(getPriceId("oak", "monthly")).toBeTruthy();
		});

		it("returns a price ID for oak + yearly", () => {
			expect(getPriceId("oak", "yearly")).toBeTruthy();
		});

		it("returns a price ID for evergreen + monthly", () => {
			expect(getPriceId("evergreen", "monthly")).toBeTruthy();
		});

		it("returns a price ID for evergreen + yearly", () => {
			expect(getPriceId("evergreen", "yearly")).toBeTruthy();
		});

		it("returns null for an invalid tier", () => {
			expect(getPriceId("wanderer", "monthly")).toBeNull();
		});

		it("returns null for an unknown billing cycle", () => {
			expect(getPriceId("seedling", "weekly")).toBeNull();
		});

		it("returns null for a completely unknown tier", () => {
			expect(getPriceId("diamond", "monthly")).toBeNull();
		});

		it("monthly and yearly IDs are different for the same tier", () => {
			expect(getPriceId("sapling", "monthly")).not.toBe(getPriceId("sapling", "yearly"));
		});
	});

	// ============================================================
	// mapSubscriptionStatus
	// ============================================================
	describe("mapSubscriptionStatus", () => {
		it("maps active → active", () => {
			expect(mapSubscriptionStatus("active")).toBe("active");
		});

		it("maps trialing → active (trials are active)", () => {
			expect(mapSubscriptionStatus("trialing")).toBe("active");
		});

		it("maps past_due → past_due", () => {
			expect(mapSubscriptionStatus("past_due")).toBe("past_due");
		});

		it("maps unpaid → past_due", () => {
			expect(mapSubscriptionStatus("unpaid")).toBe("past_due");
		});

		it("maps incomplete → past_due", () => {
			expect(mapSubscriptionStatus("incomplete")).toBe("past_due");
		});

		it("maps canceled → cancelled (note the Stripe/Grove spelling difference)", () => {
			expect(mapSubscriptionStatus("canceled")).toBe("cancelled");
		});

		it("maps incomplete_expired → expired", () => {
			expect(mapSubscriptionStatus("incomplete_expired")).toBe("expired");
		});

		it("maps paused → paused", () => {
			expect(mapSubscriptionStatus("paused")).toBe("paused");
		});

		it("maps unknown status → expired (fail-safe default)", () => {
			expect(mapSubscriptionStatus("unknown_future_status")).toBe("expired");
		});

		it("maps empty string → expired (fail-safe default)", () => {
			expect(mapSubscriptionStatus("")).toBe("expired");
		});
	});

	// ============================================================
	// safeParseBody
	// ============================================================
	describe("safeParseBody", () => {
		it("parses valid JSON", async () => {
			const req = new Request("https://example.com", {
				method: "POST",
				body: JSON.stringify({ tier: "seedling" }),
				headers: { "Content-Type": "application/json" },
			});
			const result = await safeParseBody<{ tier: string }>(req);
			expect(result).toEqual({ tier: "seedling" });
		});

		it("returns null for invalid JSON", async () => {
			const req = new Request("https://example.com", {
				method: "POST",
				body: "not json at all {{{",
				headers: { "Content-Type": "application/json" },
			});
			const result = await safeParseBody(req);
			expect(result).toBeNull();
		});

		it("rejects a body that exceeds size limit via Content-Length header", async () => {
			const req = new Request("https://example.com", {
				method: "POST",
				body: "{}",
				headers: {
					"Content-Type": "application/json",
					"Content-Length": String(64 * 1024 + 1),
				},
			});
			const result = await safeParseBody(req);
			expect(result).toBeNull();
		});

		it("rejects a body whose actual length exceeds size limit", async () => {
			const oversized = JSON.stringify({ data: "x".repeat(64 * 1024 + 1) });
			const req = new Request("https://example.com", {
				method: "POST",
				body: oversized,
				headers: { "Content-Type": "application/json" },
			});
			const result = await safeParseBody(req);
			expect(result).toBeNull();
		});

		it("parses an empty JSON object", async () => {
			const req = new Request("https://example.com", {
				method: "POST",
				body: "{}",
				headers: { "Content-Type": "application/json" },
			});
			const result = await safeParseBody(req);
			expect(result).toEqual({});
		});
	});
});
