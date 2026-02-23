import { describe, it, expect } from "vitest";
import { asPushData } from "./types";

describe("asPushData", () => {
	it("extracts typed fields from event data", () => {
		const data = { sha: "abc123", commits: 3, additions: 50, deletions: 10 };
		const result = asPushData(data);
		expect(result.sha).toBe("abc123");
		expect(result.commits).toBe(3);
		expect(result.additions).toBe(50);
		expect(result.deletions).toBe(10);
	});

	it("returns undefined for missing fields", () => {
		const result = asPushData({});
		expect(result.sha).toBeUndefined();
		expect(result.commits).toBeUndefined();
		expect(result.additions).toBeUndefined();
		expect(result.deletions).toBeUndefined();
	});

	it("ignores fields with wrong types", () => {
		const data = { sha: 123, commits: "three", additions: true, deletions: null };
		const result = asPushData(data);
		expect(result.sha).toBeUndefined();
		expect(result.commits).toBeUndefined();
		expect(result.additions).toBeUndefined();
		expect(result.deletions).toBeUndefined();
	});

	it("handles mixed valid and invalid fields", () => {
		const data = { sha: "abc123", commits: "not-a-number", additions: 10 };
		const result = asPushData(data);
		expect(result.sha).toBe("abc123");
		expect(result.commits).toBeUndefined();
		expect(result.additions).toBe(10);
	});
});
