/**
 * AI Response Parser
 *
 * Parses and sanitizes AI-generated timeline summary responses.
 * Extracted from the former openrouter.ts — this is timeline-specific
 * post-processing logic that stays in the worker.
 */

import type { ParsedAIResponse, GutterComment } from "./config";

/**
 * Strip hallucinated links from AI output.
 *
 * The AI sometimes invents URLs for section headers or repos that don't exist.
 * The Timeline component handles repo linking itself, so we strip all
 * AI-generated links except those pointing to specific resources.
 */
function stripHallucinatedLinks(text: string): string {
	return text.replace(
		/\[([^\]]+)\]\(([^)]+)\)/g,
		(match, linkText: string, url: string) => {
			// Keep links to specific resources (commits, PRs, issues, files)
			const isSpecificResource =
				/\/(commit|pull|issues|blob|tree|compare|releases)\/[a-zA-Z0-9]/.test(url);
			const hasNoSpaces = !/ /.test(url);
			const isValidUrl = /^https?:\/\//.test(url);

			if (isSpecificResource && hasNoSpaces && isValidUrl) {
				return match;
			}

			return linkText;
		},
	);
}

/**
 * Parse AI response into structured summary data.
 */
export function parseAIResponse(response: string): ParsedAIResponse {
	try {
		let jsonStr = response.trim();

		// Remove markdown code block if present
		if (jsonStr.startsWith("```")) {
			jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
		}

		const parsed = JSON.parse(jsonStr);

		// Validate gutter items and strip hallucinated links from anchors
		const validGutter: GutterComment[] = (parsed.gutter || [])
			.filter(
				(item: { anchor?: string; content?: unknown }) =>
					item.anchor && item.content && typeof item.content === "string",
			)
			.map((item: { anchor: string; type?: string; content: string }) => ({
				anchor: stripHallucinatedLinks(item.anchor),
				type: "comment" as const,
				content: item.content.trim(),
			}));

		// Sanitize brief and detailed to remove hallucinated links
		const brief = stripHallucinatedLinks(parsed.brief || "Worked on a few things today.");
		const detailed = stripHallucinatedLinks(
			parsed.detailed || "## Projects\n\nSome progress was made.",
		);

		return {
			success: true,
			brief,
			detailed,
			gutter: validGutter,
		};
	} catch (error) {
		console.error("Failed to parse AI response:", error);

		return {
			success: false,
			brief: "Some work happened today. The summary got a bit tangled, but the commits tell the story.",
			detailed: "## Projects\n\nWork continued across various projects.",
			gutter: [],
		};
	}
}
