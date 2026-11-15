import { describe, it, expect } from "vitest";
import { getLastCheckAt, getUptimeHistory, isMonitorStale } from "../status";
import type { StatusComponent } from "$lib/types/status";

/**
 * A D1 stand-in that answers the two aggregate queries getUptimeHistory makes,
 * plus the component list. Enough to exercise the maths without a database.
 */
function fakeDB(options: {
	components?: Array<Partial<StatusComponent>>;
	historyRows?: Array<{ component_id: string; date: string; status: string }>;
	incidentRows?: Array<{ component_id: string; date: string; incident_count: number }>;
}): D1Database {
	const components = options.components ?? [];
	const historyRows = options.historyRows ?? [];
	const incidentRows = options.incidentRows ?? [];

	return {
		prepare(sql: string) {
			const respond = async () => {
				if (sql.includes("FROM status_daily_history")) return { results: historyRows };
				if (sql.includes("FROM status_incidents")) return { results: incidentRows };
				return { results: components };
			};

			return {
				bind: () => ({ all: respond, first: async () => null, run: async () => ({}) }),
				all: respond,
				first: async () => null,
				run: async () => ({}),
			};
		},
	} as unknown as D1Database;
}

/** YYYY-MM-DD, `offset` days back from today. */
function dayBefore(offset: number): string {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() - offset);
	return date.toISOString().split("T")[0];
}

function component(overrides: Partial<StatusComponent> = {}): Partial<StatusComponent> {
	return {
		id: "comp_test",
		name: "Test Service",
		slug: "test-service",
		description: null,
		display_order: 1,
		current_status: "operational",
		created_at: "2026-01-01T00:00:00.000Z",
		updated_at: "2026-01-01T00:00:00.000Z",
		...overrides,
	};
}

describe("isMonitorStale", () => {
	const now = new Date("2026-11-14T12:00:00.000Z");

	it("is stale when no check has ever been recorded", () => {
		expect(isMonitorStale(null, now)).toBe(true);
	});

	it("is fresh a few minutes after a check", () => {
		expect(isMonitorStale("2026-11-14T11:50:00.000Z", now)).toBe(false);
	});

	it("is stale once the window has passed", () => {
		expect(isMonitorStale("2026-11-14T11:30:00.000Z", now)).toBe(true);
	});

	it("treats an unparseable timestamp as stale rather than fresh", () => {
		expect(isMonitorStale("not a date", now)).toBe(true);
	});
});

describe("getLastCheckAt", () => {
	const components = [
		component({ id: "a", last_check_at: "2026-11-14T11:00:00.000Z" }),
		component({ id: "b", last_check_at: "2026-11-14T11:55:00.000Z" }),
		component({ id: "c", last_check_at: null }),
	] as StatusComponent[];

	it("returns the newest check across components", () => {
		expect(getLastCheckAt(components)).toBe("2026-11-14T11:55:00.000Z");
	});

	it("ignores components with no recorded check", () => {
		expect(getLastCheckAt([])).toBeNull();
	});

	it("falls back to updated_at before the column exists", () => {
		// Deploy window: migration 0012 hasn't run, so nothing has a check stamp.
		const components = [
			component({ id: "a", updated_at: "2026-11-14T09:00:00.000Z", last_check_at: null }),
			component({ id: "b", updated_at: "2026-11-14T10:30:00.000Z", last_check_at: null }),
		] as StatusComponent[];

		expect(getLastCheckAt(components)).toBe("2026-11-14T10:30:00.000Z");
	});
});

describe("getUptimeHistory", () => {
	it("marks days without data as unknown and excludes them from uptime", async () => {
		const db = fakeDB({
			components: [component()],
			historyRows: [
				{ component_id: "comp_test", date: dayBefore(1), status: "operational" },
				{ component_id: "comp_test", date: dayBefore(2), status: "major_outage" },
				// day 3 is missing entirely
			],
		});

		const [history] = await getUptimeHistory(db);

		expect(history.days).toHaveLength(90);
		expect(history.days[89].status).toBe("operational"); // yesterday
		expect(history.days[88].status).toBe("major_outage"); // two days ago
		expect(history.days[87].status).toBe("unknown"); // no record

		// Only the two days with data count: (1 + 0) / 2.
		expect(history.countedDays).toBe(2);
		expect(history.uptimePercentage).toBe(50);
	});

	it("returns a null percentage when nothing is measurable", async () => {
		const db = fakeDB({ components: [component()], historyRows: [] });

		const [history] = await getUptimeHistory(db);

		expect(history.countedDays).toBe(0);
		expect(history.uptimePercentage).toBeNull();
		expect(history.days.every((day) => day.status === "unknown")).toBe(true);
	});

	it("treats an unrecognised stored status as unknown, not operational", async () => {
		const db = fakeDB({
			components: [component()],
			historyRows: [{ component_id: "comp_test", date: dayBefore(1), status: "weird" }],
		});

		const [history] = await getUptimeHistory(db);

		expect(history.days[89].status).toBe("unknown");
		expect(history.uptimePercentage).toBeNull();
	});

	it("reports incident counts from incidents that started that day", async () => {
		const db = fakeDB({
			components: [component()],
			historyRows: [{ component_id: "comp_test", date: dayBefore(1), status: "operational" }],
			incidentRows: [{ component_id: "comp_test", date: dayBefore(1), incident_count: 2 }],
		});

		const [history] = await getUptimeHistory(db);

		expect(history.days[89].incidentCount).toBe(2);
		expect(history.days[88].incidentCount).toBe(0);
	});

	it("does not count maintenance against uptime", async () => {
		const db = fakeDB({
			components: [component()],
			historyRows: [{ component_id: "comp_test", date: dayBefore(1), status: "maintenance" }],
		});

		const [history] = await getUptimeHistory(db);

		expect(history.uptimePercentage).toBe(100);
	});
});
