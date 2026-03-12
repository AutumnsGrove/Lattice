import { describe, it, expect } from "vitest";
import { parseAIResponse } from "./response-parser";
import type { ParsedAIResponse } from "./config";

describe("parseAIResponse", () => {
	// ===== Valid JSON Parsing =====

	it("parses valid JSON and returns success: true", () => {
		const input = JSON.stringify({
			brief: "Worked on authentication",
			detailed: "## Auth\n\nFixed login flow",
			gutter: [],
		});

		const result = parseAIResponse(input);

		expect(result.success).toBe(true);
		expect(result.brief).toBe("Worked on authentication");
		expect(result.detailed).toBe("## Auth\n\nFixed login flow");
		expect(result.gutter).toEqual([]);
	});

	// ===== Markdown Code Block Stripping =====

	it("strips markdown code block wrapper with triple backticks", () => {
		const input = `\`\`\`
{
  "brief": "Daily work",
  "detailed": "## Summary",
  "gutter": []
}
\`\`\``;

		const result = parseAIResponse(input);

		expect(result.success).toBe(true);
		expect(result.brief).toBe("Daily work");
	});

	it("strips markdown code block with json language specifier", () => {
		const input = `\`\`\`json
{
  "brief": "Worked today",
  "detailed": "## Progress",
  "gutter": []
}
\`\`\``;

		const result = parseAIResponse(input);

		expect(result.success).toBe(true);
		expect(result.brief).toBe("Worked today");
	});

	// ===== Gutter Item Validation =====

	it("filters out gutter items without anchor property", () => {
		const input = JSON.stringify({
			brief: "Work",
			detailed: "## Work",
			gutter: [
				{ content: "Comment" }, // Missing anchor
				{ anchor: "valid", content: "Has anchor" },
			],
		});

		const result = parseAIResponse(input);

		expect(result.gutter).toHaveLength(1);
		expect(result.gutter[0].anchor).toBe("valid");
	});

	it("filters out gutter items without content property", () => {
		const input = JSON.stringify({
			brief: "Work",
			detailed: "## Work",
			gutter: [
				{ anchor: "Section A" }, // Missing content
				{ anchor: "Section B", content: "Valid comment" },
			],
		});

		const result = parseAIResponse(input);

		expect(result.gutter).toHaveLength(1);
		expect(result.gutter[0].content).toBe("Valid comment");
	});

	it("filters out gutter items with non-string content", () => {
		const input = JSON.stringify({
			brief: "Work",
			detailed: "## Work",
			gutter: [
				{ anchor: "Section A", content: 123 }, // Non-string content
				{ anchor: "Section B", content: null }, // Null content
				{ anchor: "Section C", content: "Valid" },
			],
		});

		const result = parseAIResponse(input);

		expect(result.gutter).toHaveLength(1);
		expect(result.gutter[0].anchor).toBe("Section C");
	});

	// ===== Gutter Processing =====

	it("trims gutter content whitespace", () => {
		const input = JSON.stringify({
			brief: "Work",
			detailed: "## Work",
			gutter: [{ anchor: "Sec", content: "  Comment with spaces  \n" }],
		});

		const result = parseAIResponse(input);

		expect(result.gutter[0].content).toBe("Comment with spaces");
	});

	it("sets gutter item type to 'comment'", () => {
		const input = JSON.stringify({
			brief: "Work",
			detailed: "## Work",
			gutter: [{ anchor: "Sec", content: "Note" }],
		});

		const result = parseAIResponse(input);

		expect(result.gutter[0].type).toBe("comment");
	});

	// ===== Link Stripping =====

	it("strips hallucinated links from brief (e.g. repo links)", () => {
		const input = JSON.stringify({
			brief: "Worked on [MyRepo](https://github.com/user/repo)",
			detailed: "## Work",
			gutter: [],
		});

		const result = parseAIResponse(input);

		expect(result.brief).toBe("Worked on MyRepo");
	});

	it("preserves valid commit links in brief", () => {
		const input = JSON.stringify({
			brief: "Fixed bug in [commit](https://github.com/user/repo/commit/abc123def)",
			detailed: "## Work",
			gutter: [],
		});

		const result = parseAIResponse(input);

		expect(result.brief).toContain("[commit](https://github.com/user/repo/commit/abc123def)");
	});

	it("preserves valid pull request links in brief", () => {
		const input = JSON.stringify({
			brief: "Merged [PR #5](https://github.com/user/repo/pull/5)",
			detailed: "## Work",
			gutter: [],
		});

		const result = parseAIResponse(input);

		expect(result.brief).toContain("[PR #5](https://github.com/user/repo/pull/5)");
	});

	it("strips links with spaces in URL from brief", () => {
		const input = JSON.stringify({
			brief: "Check [this link](https://example.com/path with spaces)",
			detailed: "## Work",
			gutter: [],
		});

		const result = parseAIResponse(input);

		expect(result.brief).toBe("Check this link");
	});

	it("strips non-http links from brief", () => {
		const input = JSON.stringify({
			brief: "See [file](file:///path/to/file)",
			detailed: "## Work",
			gutter: [],
		});

		const result = parseAIResponse(input);

		expect(result.brief).toBe("See file");
	});

	it("preserves issues links in brief", () => {
		const input = JSON.stringify({
			brief: "Fixed [issue #42](https://github.com/user/repo/issues/42)",
			detailed: "## Work",
			gutter: [],
		});

		const result = parseAIResponse(input);

		expect(result.brief).toContain("[issue #42](https://github.com/user/repo/issues/42)");
	});

	it("preserves blob/tree/compare/releases links in brief", () => {
		const input = JSON.stringify({
			brief:
				"Modified [file](https://github.com/user/repo/blob/main/src/index.ts) and [compare](https://github.com/user/repo/compare/v1.0.0...v1.1.0) and [release](https://github.com/user/repo/releases/tag/v1.0.0)",
			detailed: "## Work",
			gutter: [],
		});

		const result = parseAIResponse(input);

		expect(result.brief).toContain("[file](https://github.com/user/repo/blob/main/src/index.ts)");
		expect(result.brief).toContain(
			"[compare](https://github.com/user/repo/compare/v1.0.0...v1.1.0)",
		);
		expect(result.brief).toContain("[release](https://github.com/user/repo/releases/tag/v1.0.0)");
	});

	it("strips hallucinated links from detailed markdown", () => {
		const input = JSON.stringify({
			brief: "Work",
			detailed: "## [Projects](https://github.com/user/repo)\n\nDone stuff",
			gutter: [],
		});

		const result = parseAIResponse(input);

		expect(result.detailed).toBe("## Projects\n\nDone stuff");
	});

	it("strips hallucinated links from gutter anchors", () => {
		const input = JSON.stringify({
			brief: "Work",
			detailed: "## Work",
			gutter: [{ anchor: "[MyLib](https://github.com/user/repo)", content: "Updated" }],
		});

		const result = parseAIResponse(input);

		expect(result.gutter[0].anchor).toBe("MyLib");
	});

	it("preserves valid resource links in gutter anchors", () => {
		const input = JSON.stringify({
			brief: "Work",
			detailed: "## Work",
			gutter: [{ anchor: "[PR #123](https://github.com/user/repo/pull/123)", content: "Reviewed" }],
		});

		const result = parseAIResponse(input);

		expect(result.gutter[0].anchor).toContain("[PR #123](https://github.com/user/repo/pull/123)");
	});

	// ===== Error Handling & Defaults =====

	it("returns fallback on invalid JSON", () => {
		const input = "{ invalid json";

		const result = parseAIResponse(input);

		expect(result.success).toBe(false);
		expect(result.brief).toBe(
			"Some work happened today. The summary got a bit tangled, but the commits tell the story.",
		);
		expect(result.detailed).toBe("## Projects\n\nWork continued across various projects.");
		expect(result.gutter).toEqual([]);
	});

	it("returns fallback on empty string", () => {
		const result = parseAIResponse("");

		expect(result.success).toBe(false);
		expect(result.brief).toBe(
			"Some work happened today. The summary got a bit tangled, but the commits tell the story.",
		);
		expect(result.gutter).toEqual([]);
	});

	// ===== Default Values =====

	it("uses default brief when parsed.brief is empty", () => {
		const input = JSON.stringify({
			brief: "",
			detailed: "## Work",
			gutter: [],
		});

		const result = parseAIResponse(input);

		expect(result.brief).toBe("Worked on a few things today.");
	});

	it("uses default brief when parsed.brief is missing", () => {
		const input = JSON.stringify({
			detailed: "## Work",
			gutter: [],
		});

		const result = parseAIResponse(input);

		expect(result.brief).toBe("Worked on a few things today.");
	});

	it("uses default detailed when parsed.detailed is empty", () => {
		const input = JSON.stringify({
			brief: "Work",
			detailed: "",
			gutter: [],
		});

		const result = parseAIResponse(input);

		expect(result.detailed).toBe("## Projects\n\nSome progress was made.");
	});

	it("uses default detailed when parsed.detailed is missing", () => {
		const input = JSON.stringify({
			brief: "Work",
			gutter: [],
		});

		const result = parseAIResponse(input);

		expect(result.detailed).toBe("## Projects\n\nSome progress was made.");
	});

	// ===== Complex Scenarios =====

	it("handles multiple gutter items with mixed valid/invalid entries", () => {
		const input = JSON.stringify({
			brief: "Daily work",
			detailed: "## Summary",
			gutter: [
				{ anchor: "Auth", content: "Fixed login" },
				{ anchor: "API" }, // Missing content
				{ anchor: "DB", content: 123 }, // Wrong content type
				{ content: "No anchor" }, // Missing anchor
				{ anchor: "Tests", content: "  Added tests  " },
			],
		});

		const result = parseAIResponse(input);

		expect(result.gutter).toHaveLength(2);
		expect(result.gutter[0].anchor).toBe("Auth");
		expect(result.gutter[1].anchor).toBe("Tests");
		expect(result.gutter[1].content).toBe("Added tests");
	});

	it("preserves tree links with numeric paths", () => {
		const input = JSON.stringify({
			brief: "Updated [file](https://github.com/user/repo/tree/main123)",
			detailed: "## Work",
			gutter: [],
		});

		const result = parseAIResponse(input);

		expect(result.brief).toContain("[file](https://github.com/user/repo/tree/main123)");
	});

	it("strips links with uppercase path markers", () => {
		const input = JSON.stringify({
			brief: "See [repo](https://example.com/SomeRepo)",
			detailed: "## Work",
			gutter: [],
		});

		const result = parseAIResponse(input);

		// Uppercase letters don't match /[a-zA-Z0-9]/ pattern after the resource marker
		// This should fail the isSpecificResource check (no /commit|pull|... marker)
		expect(result.brief).toBe("See repo");
	});

	it("returns complete response with all fields populated", () => {
		const input = JSON.stringify({
			brief: "Completed several tasks",
			detailed: "## Projects\n\n- Task A\n- Task B",
			gutter: [
				{ anchor: "Frontend", content: "Improved UI" },
				{ anchor: "Backend", content: "Optimized queries" },
			],
		});

		const result = parseAIResponse(input);

		expect(result.success).toBe(true);
		expect(result.brief).toBe("Completed several tasks");
		expect(result.detailed).toBe("## Projects\n\n- Task A\n- Task B");
		expect(result.gutter).toHaveLength(2);
		expect(result.gutter[0].type).toBe("comment");
		expect(result.gutter[1].type).toBe("comment");
	});
});
