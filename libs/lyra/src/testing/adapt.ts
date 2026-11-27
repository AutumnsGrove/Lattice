/**
 * The published testkit's script, answered by Lumen.
 *
 * `runScenario` builds a run and asks a `makeModel` seam for the slot it should
 * talk to. This is that seam for the Lumen half: the same `ScriptedTurn[]` the
 * in-process scripted model and the fake server already answer, handed to the real
 * adapter, which sends them to whatever Lumen the caller pointed it at.
 *
 * One turn is in hand until it is actually answered. That matters because a
 * `ScriptedTurn` may say it fails once or twice before it succeeds: those failures
 * come back as `ModelError`s and the turn stays put, so the retry is Lyra's retry
 * against the same scripted answer rather than a script that ran ahead.
 */

import type { ModelError, ModelRequest, ModelSlot } from "@autumnsgrove/lyra";
import { err } from "@autumnsgrove/lyra";
import {
	scriptedArguments,
	type FakeClock,
	type ScriptedFailure,
	type ScriptedTurn,
} from "@autumnsgrove/lyra/testkit";
import { createLumenModelSlot, type LumenModelSlotConfig } from "../lumen/slot.js";
import type { LumenScript, ScriptTurn } from "./script.js";

export interface LumenScriptedModelOptions {
	turns: readonly ScriptedTurn[];
	/** The answers to compaction's summary calls, in order. */
	summaries?: readonly ScriptedTurn[];
	/**
	 * The network underneath the model, for one turn — a fake Lumen's `fetch`, or a
	 * stub standing in for the provider behind real routes. It is per turn rather
	 * than shared so the script has exactly one reader: the adapter picks the turn
	 * and the transport answers it, instead of two queues trying to stay in step.
	 */
	makeFetch: (turn: ScriptTurn) => typeof globalThis.fetch;
	/** Time is moved, not waited: the run's own clock. */
	clock: FakeClock;
	/** Anything else the slot needs — base URL, caller key, tenant. */
	slot?: Partial<LumenModelSlotConfig>;
}

/** The testkit's turn as the fake Lumen's script. */
export function toScriptTurn(turn: ScriptedTurn): ScriptTurn {
	return {
		text: turn.text,
		toolCalls: turn.toolCalls?.map((call) => ({
			id: call.id,
			name: call.name,
			arguments: scriptedArguments(call.args),
		})),
		finishReason: turn.finishReason,
		inputTokens: turn.usage?.inputTokens,
		outputTokens: turn.usage?.outputTokens,
	};
}

/** A turn, its spent failures, and whether it has been answered yet. */
interface HeldTurn {
	turn: ScriptedTurn;
	failures: ScriptedFailure[];
}

class TurnScript {
	private readonly pending: ScriptedTurn[];
	private readonly summaries: ScriptedTurn[];
	private held: HeldTurn | undefined;
	private heldSummary: HeldTurn | undefined;

	constructor(turns: readonly ScriptedTurn[], summaries: readonly ScriptedTurn[]) {
		this.pending = [...turns];
		this.summaries = [...summaries];
	}

	/** The turn this request must be answered by, or `undefined` when the script is out. */
	take(request: ModelRequest): HeldTurn | undefined {
		if (request.purpose === "compaction") {
			if (this.heldSummary === undefined) {
				const turn = this.summaries.shift();
				if (turn === undefined) {
					return undefined;
				}
				this.heldSummary = { turn, failures: [...(turn.failures ?? [])] };
			}
			return this.heldSummary;
		}

		if (this.held === undefined) {
			const turn = this.pending.shift();
			if (turn === undefined) {
				return undefined;
			}
			this.held = { turn, failures: [...(turn.failures ?? [])] };
		}
		return this.held;
	}

	/** Called once the turn has been answered, so the next request gets the next turn. */
	answered(request: ModelRequest): void {
		if (request.purpose === "compaction") {
			this.heldSummary = undefined;
			return;
		}
		this.held = undefined;
	}
}

export function lumenScriptedModel(options: LumenScriptedModelOptions): ModelSlot {
	const script = new TurnScript(options.turns, options.summaries ?? []);
	const slot = createLumenModelSlot({ ...options.slot });

	return {
		contextWindow: slot.contextWindow,

		async complete(request: ModelRequest) {
			const held = script.take(request);
			if (held === undefined) {
				return err({
					code: "internal",
					message: "the scenario's script ran out of turns",
					retryable: false,
				} satisfies ModelError);
			}

			const failure = held.failures.shift();
			if (failure !== undefined) {
				// The turn is kept, because it has not been answered yet: the loop's
				// retry is what spends it.
				return err({
					code: failure.code ?? "provider_error",
					message: failure.message ?? "the model failed",
					retryable: failure.retryable ?? true,
					...(failure.retryAfterMs === undefined ? {} : { retryAfterMs: failure.retryAfterMs }),
				} satisfies ModelError);
			}

			if (held.turn.delayMs !== undefined) {
				// The run's clock, not the wall's: a scenario moves time on its own.
				await options.clock.sleep(held.turn.delayMs);
			}

			const one = createLumenModelSlot({
				...options.slot,
				fetch: options.makeFetch(toScriptTurn(held.turn)),
			});
			const reply = await one.complete(request);

			if (reply.ok) {
				script.answered(request);
			}

			return reply;
		},
	};
}

/** The script a scenario writes, as the one a fake Lumen answers. */
export function scriptFor(turns: readonly ScriptedTurn[]): LumenScript {
	return { turns: turns.map(toScriptTurn) };
}
