import { describe, it, expect } from "vitest";
import { decideLinkPolicy, linkPolicyFor, shouldNoindex, YOUNG_ACCOUNT_DAYS } from "./link-policy";

const NOW = Date.UTC(2026, 10, 18, 12, 0, 0); // 2026-11-18
const DAY = 24 * 60 * 60 * 1000;
const secondsAgo = (days: number) => Math.floor((NOW - days * DAY) / 1000);

describe("decideLinkPolicy", () => {
	it("marks free-tier accounts nofollow regardless of age", () => {
		const decision = decideLinkPolicy({ plan: "wanderer", createdAt: secondsAgo(400) }, NOW);
		expect(decision.policy).toBe("nofollow-ugc");
		expect(decision.reason).toBe("free-tier");
	});

	it("treats the legacy 'free' plan the same way", () => {
		expect(linkPolicyFor({ plan: "free", createdAt: secondsAgo(400) }, NOW)).toBe("nofollow-ugc");
	});

	it("marks a young paid account nofollow", () => {
		const decision = decideLinkPolicy({ plan: "seedling", createdAt: secondsAgo(3) }, NOW);
		expect(decision.policy).toBe("nofollow-ugc");
		expect(decision.reason).toBe("young-account");
		expect(decision.ageDays).toBe(3);
	});

	it("leaves an established paid account alone", () => {
		const decision = decideLinkPolicy({ plan: "oak", createdAt: secondsAgo(180) }, NOW);
		expect(decision.policy).toBe("standard");
		expect(decision.reason).toBe("established");
	});

	it("turns standard exactly on the boundary day", () => {
		expect(
			linkPolicyFor({ plan: "sapling", createdAt: secondsAgo(YOUNG_ACCOUNT_DAYS - 1) }, NOW),
		).toBe("nofollow-ugc");
		expect(linkPolicyFor({ plan: "sapling", createdAt: secondsAgo(YOUNG_ACCOUNT_DAYS) }, NOW)).toBe(
			"standard",
		);
	});

	it("treats an unknown age as young rather than assuming trust", () => {
		const decision = decideLinkPolicy({ plan: "evergreen", createdAt: null }, NOW);
		expect(decision.policy).toBe("nofollow-ugc");
		expect(decision.reason).toBe("unknown-age");
		expect(decision.ageDays).toBeNull();
	});

	it("treats a zero timestamp as unknown", () => {
		expect(decideLinkPolicy({ plan: "oak", createdAt: 0 }, NOW).reason).toBe("unknown-age");
	});

	it("is case-insensitive about the plan", () => {
		expect(linkPolicyFor({ plan: "Wanderer", createdAt: secondsAgo(90) }, NOW)).toBe(
			"nofollow-ugc",
		);
	});
});

describe("shouldNoindex", () => {
	it("noindexes a young account's pages", () => {
		expect(shouldNoindex({ plan: "oak", createdAt: secondsAgo(2) }, NOW)).toBe(true);
	});

	it("does not noindex an established account even on the free tier", () => {
		// A free-tier writer should still be findable; only the links are devalued.
		expect(shouldNoindex({ plan: "wanderer", createdAt: secondsAgo(365) }, NOW)).toBe(false);
	});

	it("lifts on its own at the boundary", () => {
		expect(
			shouldNoindex({ plan: "seedling", createdAt: secondsAgo(YOUNG_ACCOUNT_DAYS) }, NOW),
		).toBe(false);
	});

	it("noindexes when the age is unknown", () => {
		expect(shouldNoindex({ plan: "oak" }, NOW)).toBe(true);
	});
});
