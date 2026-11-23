import { describe, expect, it } from "vitest";
import { lumenContract } from "./contract.js";
import { fakeLumen, fakeLumenSubject } from "./standalone.js";

/**
 * The contract against the standalone fake.
 *
 * The real-routes half of the same suite lives in `workers/lumen`, where the
 * routes are; this file is the other side of the comparison. Neither is the whole
 * answer, which is the point (decision 67).
 */
lumenContract(fakeLumenSubject());

describe("the standalone fake itself", () => {
	it("STA01 answers from its script, in order, and counts what is left", async () => {
		const fake = fakeLumen({ turns: [{ text: "first" }, { text: "second" }] });

		const call = () =>
			fake.fetch("https://fake.test/inference", {
				method: "POST",
				body: JSON.stringify({ task: "agent", input: [] }),
			});

		expect(((await (await call()).json()) as { data: { content: string } }).data.content).toBe(
			"first",
		);
		expect(((await (await call()).json()) as { data: { content: string } }).data.content).toBe(
			"second",
		);
		expect(fake.remaining()).toBe(0);
	});

	it("STA02 a script that runs dry throws rather than inventing a turn", async () => {
		const fake = fakeLumen({ turns: [] });
		await expect(
			fake.fetch("https://fake.test/inference", {
				method: "POST",
				body: JSON.stringify({ task: "agent", input: [] }),
			}),
		).rejects.toThrow("more turns than its script holds");
	});
});
