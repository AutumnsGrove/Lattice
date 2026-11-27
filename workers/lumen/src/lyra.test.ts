import { describe, expect, it } from "vitest";
import { agentRequest, lumenContract } from "@autumnsgrove/lyra-lumen/testing";
import { inProcessLumenSubject } from "./testing/lyra";

/**
 * The contract, run against the real Lumen routes in process (decision 67).
 *
 * The other half lives in `libs/lyra`: the same cases, the same scripts, a
 * standalone fake. Both must agree, and neither is trusted alone.
 */
lumenContract(inProcessLumenSubject());

describe("the in-process harness itself", () => {
	it("HAR01 the routes answer, and the seam is put back", async () => {
		const subject = inProcessLumenSubject();
		const original = globalThis.fetch;
		const lumen = await subject.open({ turns: [{ text: "real route, fake network" }] });

		const answer = await lumen.post({
			task: "agent",
			input: [{ role: "user", content: "hello" }],
			options: { skip_quota: true, tenant_api_key: "sk-or-v1-not-a-real-key" },
		});

		expect(answer.status).toBe(200);
		expect(globalThis.fetch).toBe(original);
	});

	it("HAR02 the scrubber really ran, because the routes are real", async () => {
		// A PII-shaped address in a tool result must be scrubbed before the model
		// sees it. A standalone fake cannot show this: it answers before the
		// scrubber exists.
		const subject = inProcessLumenSubject();
		let seen = "";
		const original = globalThis.fetch;
		const lumen = await subject.open({ turns: [{ text: "noted" }] });

		// Capture what the fake network received by wrapping it once more.
		const wrapped = globalThis.fetch;
		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			seen = String(init?.body ?? "");
			return wrapped(input, init);
		}) as typeof globalThis.fetch;

		const answer = await lumen.post(
			agentRequest({
				input: [
					{ role: "user", content: "Record this." },
					{
						role: "assistant",
						content: "",
						tool_calls: [
							{
								id: "call_1",
								type: "function",
								function: { name: "add_line", arguments: '{"text":"x"}' },
							},
						],
					},
					{ role: "tool", tool_call_id: "call_1", content: "contact me at someone@example.com" },
				],
			}),
		);

		expect(answer.status).toBe(200);
		expect(seen).not.toContain("someone@example.com");
		globalThis.fetch = original;
	});
});
