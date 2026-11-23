/**
 * What a run says while it happens (#1798).
 *
 * Lyra already narrates a run: every turn, every tool call and its result, a retry,
 * a compaction, the ending. Nothing was listening, so a day being written was
 * invisible except for the row it left behind. This is the listener.
 *
 * Two channels, deliberately different:
 *
 * - **Console** for the run itself, one line per interesting event. `wrangler tail
 *   grove-timeline-sync` follows it live, which is what makes a comparison run
 *   watchable rather than a 40-turn wait with no output.
 * - **Pulse** only for a run that did not finish. A finished run's row in
 *   `timeline_runs` is the durable record, so copying it into `pulse_events` would
 *   be noise; a failed or parked run is an error worth seeing where errors are
 *   already looked at.
 */

import { emitPulseEvent, flushPulse, initPulse } from "@autumnsgrove/lattice/pulse";
import type { RunEventListener } from "@autumnsgrove/lyra";
import type { Env } from "./config";

/** How much of a tool's result reaches the log. The record keeps the rest. */
const MAX_CONTENT = 160;

export interface RunLogInput {
	tenantId: string;
	/** The day being written, so lines from two runs can be told apart. */
	date: string;
}

/**
 * A listener that logs a run as it goes.
 *
 * It never throws: a listener that fails must not take the run with it, and this
 * one only writes to the console.
 */
export function createRunLogger(input: RunLogInput): RunEventListener {
	const prefix = `[timeline] ${input.tenantId}/${input.date}`;

	return (event) => {
		try {
			switch (event.type) {
				case "run_start":
					console.log(`${prefix} run ${event.run} starts (${event.task})`);
					break;

				case "turn_start":
					console.log(`${prefix} turn ${event.turn}`);
					break;

				case "tool_end":
					console.log(
						`${prefix} ${event.name} ${event.isError ? "refused" : "ok"}: ${oneLine(event.content)}`,
					);
					break;

				case "usage":
					console.log(
						`${prefix} usage ${event.inputTokens} in / ${event.outputTokens} out${
							event.cost === undefined
								? ""
								: ` ($${event.cost.amount.toFixed(4)} ${event.cost.source})`
						}`,
					);
					break;

				case "retry":
					console.warn(
						`${prefix} retry ${event.attempt} in ${event.delayMs}ms: ${event.error.message}`,
					);
					break;

				case "error":
					console.warn(`${prefix} error: ${event.error.code} — ${event.error.message}`);
					break;

				case "fallback":
					console.warn(`${prefix} fell back to ${event.to}: ${event.reason}`);
					break;

				case "compaction":
					console.log(
						`${prefix} compacted ${event.replaces} turns (${event.trigger}): ${oneLine(event.summary)}`,
					);
					break;

				case "request":
					console.log(`${prefix} asked a person: ${oneLine(event.request)}`);
					break;

				case "run_end":
					console.log(
						`${prefix} run ${event.run} ends ${event.reason}${
							event.parkedReason === undefined ? "" : ` (${event.parkedReason})`
						}`,
					);
					break;

				default:
					// message_end, tool_call and tool_start would double up the lines
					// above, and turn_end is the next turn's line.
					break;
			}
		} catch {
			// Logging is never allowed to be the reason a run fails.
		}
	};
}

export interface RunOutcome {
	tenantId: string;
	date: string;
	runId: string | null;
	status: string;
	turns: number;
	cost: number;
	error: string | null;
	warnings: string[];
}

/**
 * Send a run that did not finish to Pulse, so a bad comparison or a bad night is
 * visible in Arbor rather than only in a console nobody kept.
 */
export async function reportRunOutcome(env: Env, outcome: RunOutcome): Promise<void> {
	if (outcome.status === "done" || outcome.status === "empty") {
		return;
	}

	try {
		initPulse(env.PULSE);
		emitPulseEvent("error.server", {
			app: "timeline-sync",
			tenant_id: outcome.tenantId,
			metadata: {
				stage: "timeline.run",
				runId: outcome.runId,
				date: outcome.date,
				status: outcome.status,
				turns: outcome.turns,
				cost: outcome.cost,
				message: outcome.error ?? `the run ended ${outcome.status}`,
				warnings: outcome.warnings,
			},
		});
		await flushPulse();
	} catch {
		// Observability must never break the thing it observes.
	}
}

function oneLine(text: string): string {
	const collapsed = text.replace(/\s+/g, " ").trim();
	return collapsed.length > MAX_CONTENT ? `${collapsed.slice(0, MAX_CONTENT - 1)}…` : collapsed;
}
