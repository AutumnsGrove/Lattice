import { describe, it, expect } from "vitest";
import { averageStatusFromCounts, getYesterdayDate } from "../daily-history";

/**
 * These exercise the real exported helpers rather than re-implementing them:
 * the previous copy in the test file drifted from the implementation, which is
 * exactly how the daily status managed to stay wrong for months.
 */

function counts(overrides: Record<string, number> = {}) {
	return {
		operational: 0,
		degraded: 0,
		partial_outage: 0,
		major_outage: 0,
		maintenance: 0,
		...overrides,
	};
}

describe("averageStatusFromCounts", () => {
	it("returns operational when every check passed", () => {
		expect(averageStatusFromCounts(counts({ operational: 288 }))).toBe("operational");
	});

	it("returns unknown when no checks were recorded", () => {
		// A day without data is not a good day. Guessing either way is a lie.
		expect(averageStatusFromCounts(counts())).toBe("unknown");
	});

	it("shrugs off a single blip among hundreds of good checks", () => {
		// One 404 in a day of 5-minute checks must not paint the day red.
		expect(averageStatusFromCounts(counts({ operational: 287, partial_outage: 1 }))).toBe(
			"operational",
		);
	});

	it("reports degraded when most checks were slow", () => {
		// 2 * 288 / 288 = 2 → degraded
		expect(averageStatusFromCounts(counts({ degraded: 288 }))).toBe("degraded");
	});

	it("reports partial outage when every check failed", () => {
		expect(averageStatusFromCounts(counts({ partial_outage: 288 }))).toBe("partial_outage");
	});

	it("reports major outage when every check failed hard", () => {
		expect(averageStatusFromCounts(counts({ major_outage: 288 }))).toBe("major_outage");
	});

	it("weighs a mixed day by severity", () => {
		// half operational, half major: (0.5 * 3) = 1.5 → bucket 2 → partial outage.
		// A day that was half down is not "degraded performance".
		expect(averageStatusFromCounts(counts({ operational: 144, major_outage: 144 }))).toBe(
			"partial_outage",
		);

		// a third of the day in partial outage: (0.33 * 2) = 0.67 → bucket 1.
		// It must not round onto "maintenance" and collect full uptime credit.
		expect(averageStatusFromCounts(counts({ operational: 192, partial_outage: 96 }))).toBe(
			"degraded",
		);

		// under a sixth in partial outage is still a blip.
		expect(averageStatusFromCounts(counts({ operational: 270, partial_outage: 18 }))).toBe(
			"operational",
		);
	});

	it("treats maintenance as a neutral day, not an outage", () => {
		expect(averageStatusFromCounts(counts({ maintenance: 288 }))).toBe("maintenance");

		// Maintenance checks are left out of the average entirely, so a healthy
		// few hours around a maintenance window still read as operational.
		expect(averageStatusFromCounts(counts({ operational: 144, maintenance: 144 }))).toBe(
			"operational",
		);
	});
});

describe("getYesterdayDate", () => {
	it("returns YYYY-MM-DD format", () => {
		expect(getYesterdayDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it("is exactly one day before today in UTC", () => {
		const now = new Date();
		const yesterday = new Date(now);
		yesterday.setUTCDate(yesterday.getUTCDate() - 1);

		expect(getYesterdayDate()).toBe(yesterday.toISOString().split("T")[0]);
	});
});
