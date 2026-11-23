/**
 * Watching a run (#1798).
 *
 * A run that cannot be watched is a run nobody trusts, so the listener's lines are
 * pinned: the tail is how a comparison is followed live, and a failed run is how a
 * bad night becomes visible without waiting to notice a missing day.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRunLogger, reportRunOutcome } from "./run-log";
import type { RunEvent } from "@autumnsgrove/lyra";
import type { Env } from "./config";

const AT = { run: "run-1", ts: 1_763_000_000_000 };

/** One event of a run, with the run id and time filled in. */
function event(value: { type: string } & Record<string, unknown>): RunEvent {
	return { ...AT, ...value } as unknown as RunEvent;
}

let logs: string[];
let warnings: string[];

beforeEach(() => {
	logs = [];
	warnings = [];
	vi.spyOn(console, "log").mockImplementation((...parts: unknown[]) => {
		logs.push(parts.map(String).join(" "));
	});
	vi.spyOn(console, "warn").mockImplementation((...parts: unknown[]) => {
		warnings.push(parts.map(String).join(" "));
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("createRunLogger", () => {
	it("narrates a run from start to end", () => {
		const log = createRunLogger({ tenantId: "midnight-bloom", date: "2026-11-21" });

		log(event({ type: "run_start", task: "timeline" }));
		log(event({ type: "turn_start", turn: 1 }));
		log(
			event({
				type: "tool_end",
				seq: 3,
				callId: "t1",
				name: "start_project",
				isError: false,
				content: "started a project for Lattice",
			}),
		);
		log(event({ type: "usage", inputTokens: 1200, outputTokens: 300 }));
		log(event({ type: "run_end", reason: "done" }));

		expect(logs).toEqual([
			"[timeline] midnight-bloom/2026-11-21 run run-1 starts (timeline)",
			"[timeline] midnight-bloom/2026-11-21 turn 1",
			"[timeline] midnight-bloom/2026-11-21 start_project ok: started a project for Lattice",
			"[timeline] midnight-bloom/2026-11-21 usage 1200 in / 300 out",
			"[timeline] midnight-bloom/2026-11-21 run run-1 ends done",
		]);
		expect(warnings).toEqual([]);
	});

	it("says when a tool refused and what the model was told", () => {
		const log = createRunLogger({ tenantId: "t", date: "2026-11-21" });

		log(
			event({
				type: "tool_end",
				seq: 4,
				callId: "t2",
				name: "finish",
				isError: true,
				content: "not covered yet: 1 commit (c2), 1 pull request (pr1)",
			}),
		);

		expect(logs[0]).toContain("finish refused:");
		expect(logs[0]).toContain("not covered yet");
	});

	it("keeps one line per event, however long the content", () => {
		const log = createRunLogger({ tenantId: "t", date: "2026-11-21" });

		log(
			event({
				type: "tool_end",
				seq: 5,
				callId: "t3",
				name: "get_diff",
				isError: false,
				content: `${"diff line ".repeat(200)}\n\nend`,
			}),
		);

		expect(logs[0]?.includes("\n")).toBe(false);
		expect(logs[0]?.endsWith("…")).toBe(true);
		expect(logs[0]?.length).toBeLessThan(220);
	});

	it("warns about a retry, an error and a fallback", () => {
		const log = createRunLogger({ tenantId: "t", date: "2026-11-21" });

		log(
			event({
				type: "retry",
				attempt: 1,
				delayMs: 2000,
				error: { code: "busy", message: "slow down" },
			}),
		);
		log(event({ type: "error", error: { code: "provider_error", message: "upstream is down" } }));
		log(event({ type: "fallback", from: "a", to: "b", reason: "a failed three times" }));

		expect(warnings).toEqual([
			"[timeline] t/2026-11-21 retry 1 in 2000ms: slow down",
			"[timeline] t/2026-11-21 error: provider_error — upstream is down",
			"[timeline] t/2026-11-21 fell back to b: a failed three times",
		]);
	});

	it("says why a run parked", () => {
		const log = createRunLogger({ tenantId: "t", date: "2026-11-21" });

		log(event({ type: "run_end", reason: "parked", parkedReason: "limit", detail: "steps" }));

		expect(logs[0]).toContain("ends parked (limit)");
	});

	it("never throws, whatever it is handed", () => {
		const log = createRunLogger({ tenantId: "t", date: "2026-11-21" });

		expect(() =>
			log({ type: "unknown-kind", run: "r", ts: 0 } as unknown as RunEvent),
		).not.toThrow();
	});
});

describe("reportRunOutcome", () => {
	const env = { PULSE: { fetch: async () => new Response("ok") } } as unknown as Env;

	it("says nothing about a finished run, because its row is the record", async () => {
		const fetchSpy = vi.fn();
		const watched = { PULSE: { fetch: fetchSpy } } as unknown as Env;

		await reportRunOutcome(watched, {
			tenantId: "t",
			date: "2026-11-21",
			runId: "run-1",
			status: "done",
			turns: 6,
			cost: 0.02,
			error: null,
			warnings: [],
		});

		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("sends a failed run to Pulse", async () => {
		const fetchSpy = vi.fn(async () => new Response("ok"));
		const watched = { PULSE: { fetch: fetchSpy } } as unknown as Env;

		await reportRunOutcome(watched, {
			tenantId: "t",
			date: "2026-11-21",
			runId: "run-1",
			status: "failed",
			turns: 3,
			cost: 0.01,
			error: "the model never answered",
			warnings: [],
		});

		expect(fetchSpy).toHaveBeenCalled();
	});

	it("does not throw when Pulse is unreachable", async () => {
		await expect(
			reportRunOutcome(env, {
				tenantId: "t",
				date: "2026-11-21",
				runId: null,
				status: "failed",
				turns: 0,
				cost: 0,
				error: "boom",
				warnings: [],
			}),
		).resolves.toBeUndefined();
	});
});
