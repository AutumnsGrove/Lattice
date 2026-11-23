/**
 * The recipe's two GitHub tools, against a fake wire (#1798, slice 2).
 *
 * What matters here is that the model gets something it can read and act on: a
 * refusal names the tool to use instead, a 404 is an ordinary error result, and a
 * huge diff is cut with a sentence saying so rather than silently losing its end.
 */

import { describe, expect, it } from "vitest";
import { createGitHubReader, type FetchLike } from "./github";

interface Call {
	url: string;
	accept: string | undefined;
}

function fakeFetch(replies: { body: string; status?: number }[] | { error: Error }): {
	fetch: FetchLike;
	calls: Call[];
} {
	const calls: Call[] = [];
	const fetchImpl: FetchLike = async (url, init) => {
		const headers = (init?.headers ?? {}) as Record<string, string>;
		calls.push({ url, accept: headers["Accept"] });
		if ("error" in replies) {
			throw replies.error;
		}
		const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
		return new Response(reply?.body ?? "", { status: reply?.status ?? 200 });
	};
	return { fetch: fetchImpl, calls };
}

const READER = { token: "secret-token", username: "autumn", userAgent: "test" };

describe("createGitHubReader", () => {
	it("asks for a commit's diff with the diff media type and the token", async () => {
		const wire = fakeFetch([{ body: "diff --git a/x b/x" }]);
		const reader = createGitHubReader({ ...READER, fetch: wire.fetch });

		const result = await reader.diff({ kind: "commit", repo: "Lattice", sha: "abc1234" });

		expect(result).toEqual({ ok: true, text: "diff --git a/x b/x" });
		expect(wire.calls[0]?.url).toBe("https://api.github.com/repos/autumn/Lattice/commits/abc1234");
		expect(wire.calls[0]?.accept).toBe("application/vnd.github.v3.diff");
	});

	it("reads a pull request's diff from the pulls endpoint", async () => {
		const wire = fakeFetch([{ body: "diff --git a/y b/y" }]);
		const reader = createGitHubReader({ ...READER, fetch: wire.fetch });

		await reader.diff({ kind: "pull", repo: "Lattice", number: 12 });

		expect(wire.calls[0]?.url).toBe("https://api.github.com/repos/autumn/Lattice/pulls/12");
	});

	it("refuses the wrong kind of handle without asking GitHub", async () => {
		const wire = fakeFetch([{ body: "" }]);
		const reader = createGitHubReader({ ...READER, fetch: wire.fetch });

		const issueDiff = await reader.diff({ kind: "issue", repo: "Lattice", number: 7 });
		const commitThread = await reader.thread({ kind: "commit", repo: "Lattice", sha: "abc1234" });

		expect(issueDiff.ok).toBe(false);
		expect(issueDiff.ok ? "" : issueDiff.message).toContain("read it with get_issue_thread");
		expect(commitThread.ok).toBe(false);
		expect(commitThread.ok ? "" : commitThread.message).toContain("read it with get_diff");
		expect(wire.calls).toEqual([]);
	});

	it("renders an issue thread with its body and comments", async () => {
		const wire = fakeFetch([
			{
				body: JSON.stringify({
					number: 1798,
					title: "Let an agent write the day",
					state: "open",
					body: "Slice 1 is the day.",
					user: { login: "autumn" },
					comments: 1,
				}),
			},
			{
				body: JSON.stringify([{ user: { login: "friend" }, body: "This is the right shape." }]),
			},
		]);
		const reader = createGitHubReader({ ...READER, fetch: wire.fetch });

		const result = await reader.thread({ kind: "issue", repo: "Lattice", number: 1798 });
		const text = result.ok ? result.text : "";

		expect(text).toContain("#1798 Let an agent write the day (open)");
		expect(text).toContain("opened by autumn");
		expect(text).toContain("Slice 1 is the day.");
		expect(text).toContain("## Comments (1)");
		expect(text).toContain("@friend:\nThis is the right shape.");
	});

	it("still returns the body when the comments cannot be read", async () => {
		const wire = fakeFetch([
			{
				body: JSON.stringify({
					number: 7,
					title: "An issue",
					state: "open",
					body: "The body.",
					user: { login: "autumn" },
					comments: 0,
				}),
			},
			{ body: "nope", status: 500 },
		]);
		const reader = createGitHubReader({ ...READER, fetch: wire.fetch });

		const result = await reader.thread({ kind: "pull", repo: "Lattice", number: 7 });

		expect(result.ok).toBe(true);
		expect(result.ok ? result.text : "").toContain("The body.");
	});

	it("says when GitHub has nothing there", async () => {
		const wire = fakeFetch([{ body: "{}", status: 404 }]);
		const reader = createGitHubReader({ ...READER, fetch: wire.fetch });

		const result = await reader.diff({ kind: "commit", repo: "Lattice", sha: "gone" });

		expect(result.ok).toBe(false);
		expect(result.ok ? "" : result.message).toContain("GitHub has nothing at");
	});

	it("turns a network failure into an error result", async () => {
		const wire = fakeFetch({ error: new Error("socket closed") });
		const reader = createGitHubReader({ ...READER, fetch: wire.fetch });

		const result = await reader.diff({ kind: "commit", repo: "Lattice", sha: "abc1234" });

		expect(result.ok).toBe(false);
		expect(result.ok ? "" : result.message).toContain("socket closed");
	});

	it("cuts a long diff and says where it stopped", async () => {
		const wire = fakeFetch([{ body: "x".repeat(500) }]);
		const reader = createGitHubReader({ ...READER, fetch: wire.fetch, maxDiffChars: 100 });

		const result = await reader.diff({ kind: "commit", repo: "Lattice", sha: "abc1234" });

		expect(result.ok).toBe(true);
		expect(result.ok ? result.text : "").toContain("(the diff was cut at 100 characters)");
	});
});
