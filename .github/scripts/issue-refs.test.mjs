import assert from "node:assert/strict";
import test from "node:test";

import { parseIssueRefs } from "./issue-refs.mjs";

test("a closing keyword closes the issue", () => {
	for (const body of [
		"Closes #123",
		"closes #123",
		"Closed #123",
		"Fixes #123",
		"fixed #123",
		"Resolves #123",
		"resolve #123",
		"Closes: #123",
		"This PR closes #123 and also fixes #456.",
	]) {
		const { closes } = parseIssueRefs(body);
		assert.ok(closes.length > 0, `expected a closure from: ${body}`);
	}
});

test("a bare reference never closes anything — the #1623 bug", () => {
	const body = "Embedding dimension consistency matters once #1439 builds the vector index.";
	assert.deepEqual(parseIssueRefs(body).closes, []);
	assert.deepEqual(parseIssueRefs(body).mentions, [1439]);
});

test("the real #1599 body shape closes nothing it only mentions", () => {
	const body = [
		"Updates the Lumen model registry.",
		"",
		"Depends on #1439 for the vector index.",
		"Relates to #1602 and #1600.",
	].join("\n");
	const { closes, mentions } = parseIssueRefs(body);
	assert.deepEqual(closes, []);
	assert.deepEqual(mentions, [1439, 1600, 1602]);
});

test("closes and mentions are reported separately and do not overlap", () => {
	const { closes, mentions } = parseIssueRefs("Closes #10, see also #11, and #10 again.");
	assert.deepEqual(closes, [10]);
	assert.deepEqual(mentions, [11]);
});

test("duplicates collapse and results are sorted", () => {
	const { closes } = parseIssueRefs("Fixes #30\nCloses #9\nfixes #30");
	assert.deepEqual(closes, [9, 30]);
});

test("owner/repo references and prose keywords do not close anything", () => {
	// "prefix" contains "fix", and a bare repo-qualified ref is a mention.
	assert.deepEqual(
		parseIssueRefs("This is a prefix change, see AutumnsGrove/Lattice#5").closes,
		[],
	);
	assert.deepEqual(parseIssueRefs("Closes AutumnsGrove/Lattice#5").mentions, [5]);
});

test("empty and missing bodies are safe", () => {
	assert.deepEqual(parseIssueRefs(""), { closes: [], mentions: [] });
	assert.deepEqual(parseIssueRefs(undefined), { closes: [], mentions: [] });
	assert.deepEqual(parseIssueRefs(null), { closes: [], mentions: [] });
});
