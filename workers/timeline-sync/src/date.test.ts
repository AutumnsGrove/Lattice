import { describe, it, expect } from "vitest";
import { yesterdayInZone } from "./date";

/**
 * The run fires at 09:00 UTC. Each case below is that instant, read in a
 * different zone, so the day it asks for is the day that has just finished for
 * the tenant (#1832).
 */
describe("yesterdayInZone", () => {
	it("asks for the day that finished in the tenant's zone, not in UTC", () => {
		// 09:00 UTC on Nov 26 is 04:00 EST on Nov 26, so Nov 25 is complete.
		const now = new Date("2026-11-26T09:00:00Z");
		expect(yesterdayInZone("America/New_York", now)).toBe("2026-11-25");
	});

	it("would have asked for an unfinished day at the old 01:00 UTC run", () => {
		// 01:00 UTC on Nov 26 is 20:00 EST on Nov 25 — the day the old code asked
		// for (Nov 25 in UTC) was still in progress in New York.
		const now = new Date("2026-11-26T01:00:00Z");
		expect(yesterdayInZone("America/New_York", now)).toBe("2026-11-24");
	});

	it("handles zones ahead of UTC", () => {
		// 09:00 UTC on Nov 26 is 22:00 NZDT on Nov 26.
		const now = new Date("2026-11-26T09:00:00Z");
		expect(yesterdayInZone("Pacific/Auckland", now)).toBe("2026-11-25");
	});

	it("crosses a year boundary", () => {
		// 09:00 UTC on Jan 1 is 04:00 EST on Jan 1.
		const now = new Date("2026-01-01T09:00:00Z");
		expect(yesterdayInZone("America/New_York", now)).toBe("2025-12-31");
	});

	it("steps back a whole calendar day across a DST transition", () => {
		// 2026-03-08 is the US spring-forward day; 09:00 UTC is 05:00 EDT on the
		// 8th, so the day before is the 7th — 23 hours, not 24.
		const now = new Date("2026-03-08T09:00:00Z");
		expect(yesterdayInZone("America/New_York", now)).toBe("2026-03-07");
	});

	it("does not repeat a day across the fall-back transition", () => {
		// 2026-11-01 is the US fall-back day (25 hours long).
		const now = new Date("2026-11-01T09:00:00Z");
		expect(yesterdayInZone("America/New_York", now)).toBe("2026-10-31");
	});

	it("treats a missing zone as UTC", () => {
		const now = new Date("2026-11-26T09:00:00Z");
		expect(yesterdayInZone(undefined, now)).toBe("2026-11-25");
		expect(yesterdayInZone(null, now)).toBe("2026-11-25");
		expect(yesterdayInZone("", now)).toBe("2026-11-25");
		expect(yesterdayInZone("   ", now)).toBe("2026-11-25");
	});

	it("falls back to UTC rather than throwing on an unknown zone", () => {
		const now = new Date("2026-11-26T09:00:00Z");
		expect(yesterdayInZone("America/Not_A_Place", now)).toBe("2026-11-25");
	});
});
