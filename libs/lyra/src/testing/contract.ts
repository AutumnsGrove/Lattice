/**
 * The Lumen contract: one suite, two fakes, no drift.
 *
 * Two things imitate Lumen in this repository. One runs the real worker routes in
 * process with only the network faked, so validation, scrubbing, routing, parsing
 * and cost all happen for real. The other is a small standalone fake that answers
 * `POST /inference` with an envelope and nothing else. Each is useful on its own —
 * the routes for truth, the fake for speed — and each is a liability alone,
 * because a fake nobody compares against reality quietly becomes a fiction.
 *
 * So the same cases run against both (decision 67). A case that passes for one and
 * fails for the other fails the build, and the failure names the side that moved.
 *
 * Two cases run only against the routes, and say so: a standalone fake could only
 * answer them by reimplementing quota and the message schema, which is exactly the
 * code the routes exist to prove. A fake that grew those rules would be a third
 * implementation of them.
 */

import { describe, expect, it } from "vitest";
import { calculateCost } from "@autumnsgrove/lattice/ai/lumen/config";
import { SCRIPT_MODEL, type LumenScript } from "./script.js";

/** What came back from one request. */
export interface LumenAnswer {
	status: number;
	/** The parsed body, or `undefined` when it was not JSON at all. */
	envelope: Record<string, unknown> | undefined;
}

export interface LumenConnection {
	/** One `POST /inference`, exactly as a caller would send it. */
	post(body: unknown, options?: { apiKey?: string | null; raw?: string }): Promise<LumenAnswer>;
}

export interface LumenUnderTest {
	/** Shown in every test name, so a failure says which side moved. */
	name: string;
	/** Decides whether the two routes-only cases run or are skipped. */
	kind: "routes" | "fake";
	open(script: LumenScript): Promise<LumenConnection>;
}

/** A well-formed agent request, as the adapter sends it. */
export function agentRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	const { options, ...rest } = overrides as {
		options?: Record<string, unknown>;
	} & Record<string, unknown>;

	return {
		task: "agent",
		input: [
			{ role: "system", content: "You are a careful steward." },
			{ role: "user", content: "What grew today?" },
		],
		tenant_id: "tenant-1",
		// Quota is only enforced for a tenant on a named tier, so an agent request
		// names one: a Wandered run is what the refusal in CON08 exists for.
		tier: "wanderer",
		options: {
			skip_quota: true,
			// The Wanderer's own key, in the body the way the adapter sends it. The
			// fakes never reach a provider, so this is a shape, not a credential.
			tenant_api_key: "sk-or-v1-contract-key",
			...options,
		},
		...rest,
	};
}

function dataOf(answer: LumenAnswer): Record<string, unknown> {
	const data = answer.envelope?.data;
	expect(data, "the success envelope carries data").toBeTypeOf("object");
	return data as Record<string, unknown>;
}

function errorOf(answer: LumenAnswer): Record<string, unknown> {
	const error = answer.envelope?.error;
	expect(error, "the failure envelope carries an error").toBeTypeOf("object");
	return error as Record<string, unknown>;
}

export function lumenContract(underTest: LumenUnderTest): void {
	const onRoutes = underTest.kind === "routes";
	// `it.skip` keeps the case visible with its reason, rather than leaving a gap a
	// reader has to explain to themselves.
	const onlyRoutes = onRoutes ? it : it.skip;

	describe(`the Lumen contract: ${underTest.name}`, () => {
		const model = SCRIPT_MODEL;
		const open = (script: LumenScript) => underTest.open(script);

		it("CON01 a plain answer is an envelope the slot can read", async () => {
			const lumen = await open({ turns: [{ text: "A quiet day." }] });
			const answer = await lumen.post(agentRequest());

			expect(answer.status).toBe(200);
			const data = dataOf(answer);
			expect(data.content).toBe("A quiet day.");
			expect(data.model).toBe(model);
			expect(data.finish_reason).toBe("stop");
			expect(data.provider).toBe("openrouter");
		});

		it("CON02 a tool call comes back whole, with its arguments still raw", async () => {
			const lumen = await open({
				turns: [
					{
						toolCalls: [{ id: "call_1", name: "add_line", arguments: '{"text":"a line","pr":12}' }],
						finishReason: "tool_calls",
					},
				],
			});

			const data = dataOf(await lumen.post(agentRequest()));
			const calls = data.tool_calls as Array<{
				id: string;
				type: string;
				function: { name: string; arguments: string };
			}>;

			expect(calls).toHaveLength(1);
			expect(calls[0]).toEqual({
				id: "call_1",
				type: "function",
				function: { name: "add_line", arguments: '{"text":"a line","pr":12}' },
			});
			expect(data.finish_reason).toBe("tool_calls");
		});

		it("CON03 a tool result goes back in, paired with the call it answers (L1)", async () => {
			const lumen = await open({ turns: [{ text: "The line is added.", finishReason: "stop" }] });
			const answer = await lumen.post(
				agentRequest({
					input: [
						{ role: "user", content: "Add the line." },
						{
							role: "assistant",
							content: "",
							tool_calls: [
								{
									id: "call_1",
									type: "function",
									function: { name: "add_line", arguments: '{"text":"a line"}' },
								},
							],
						},
						{ role: "tool", tool_call_id: "call_1", content: "added" },
					],
				}),
			);

			expect(answer.status).toBe(200);
			expect(dataOf(answer).content).toBe("The line is added.");
		});

		it("CON04 a reply cut off by the token limit says so (L2)", async () => {
			const lumen = await open({ turns: [{ text: '{"lines":[', finishReason: "length" }] });
			expect(dataOf(await lumen.post(agentRequest())).finish_reason).toBe("length");
		});

		it("CON05 usage carries both token counts and a labelled cost (L5)", async () => {
			const lumen = await open({
				turns: [{ text: "Done.", inputTokens: 1_000, outputTokens: 200 }],
			});

			const usage = dataOf(await lumen.post(agentRequest())).usage as {
				input: number;
				output: number;
				cost: number;
				cost_source?: string;
			};

			expect(usage.input).toBe(1_000);
			expect(usage.output).toBe(200);
			expect(usage.cost).toBeCloseTo(calculateCost(model, 1_000, 200), 10);
			// The figure came from Lumen's catalog, and says so rather than passing
			// itself off as a provider invoice (decision 15).
			expect(usage.cost_source).toBe("catalog");
		});

		it("CON06 a caller with no key is refused, and told why", async () => {
			const lumen = await open({ turns: [{ text: "unreachable" }] });
			const answer = await lumen.post(agentRequest(), { apiKey: null });

			expect(answer.status).toBe(401);
			expect(errorOf(answer).code).toBe("AUTH_REQUIRED");
		});

		it("CON07 a body that is not JSON is a 400, not a crash", async () => {
			const lumen = await open({ turns: [{ text: "unreachable" }] });
			const answer = await lumen.post(undefined, { raw: "{not json" });

			expect(answer.status).toBe(400);
			expect(["INVALID_REQUEST", "INVALID_PARAMS"]).toContain(errorOf(answer).code);
		});

		onlyRoutes(
			"CON08 an agent call without skip_quota is refused, in words a person can act on (L3)",
			async () => {
				const lumen = await open({ turns: [{ text: "unreachable" }] });
				const answer = await lumen.post(agentRequest({ options: { skip_quota: false } }));

				expect(answer.status).not.toBe(200);
				const error = errorOf(answer);
				expect(error.code).toBe("QUOTA_EXCEEDED");
				expect(String(error.message)).toContain("agent");
			},
		);

		onlyRoutes("CON09 a tool result with no id is refused, naming the id (L1)", async () => {
			const lumen = await open({ turns: [{ text: "unreachable" }] });
			const answer = await lumen.post(
				agentRequest({ input: [{ role: "tool", content: "added" }] }),
			);

			expect(answer.status).toBe(400);
			expect(String(errorOf(answer).message)).toContain("tool_call_id");
		});
	});
}
