/**
 * The voices themselves, and how one is chosen (#1798, slice 5).
 *
 * Split out of `index.ts` so the persona helper can resolve a voice without
 * importing the module that also builds the one-shot prompt — that path is being
 * retired, and the persona is what replaces it.
 */

import { professional, quest, casual, poetic, minimal } from "./presets";
import { DETAILED_BUDGET } from "./budget";
import type { VoicePreset, CustomVoiceConfig, Commit } from "./types";

// =============================================================================
// Voice Registry
// =============================================================================

/**
 * All available voice presets
 */
export const VOICE_PRESETS: Record<string, VoicePreset> = {
	professional,
	quest,
	casual,
	poetic,
	minimal,
};

/**
 * Default voice preset ID
 */
export const DEFAULT_VOICE = "professional";

/**
 * Get a voice preset by ID
 */
export function getVoice(voiceId: string): VoicePreset {
	const voice = VOICE_PRESETS[voiceId];
	if (!voice) {
		console.warn(`Unknown voice preset: ${voiceId}, falling back to professional`);
		return VOICE_PRESETS[DEFAULT_VOICE];
	}
	return voice;
}

/**
 * Get list of all available voices for UI display
 */
export function getAllVoices() {
	return Object.values(VOICE_PRESETS).map((voice) => ({
		id: voice.id,
		name: voice.name,
		description: voice.description,
		preview: voice.preview,
		isDefault: voice.id === DEFAULT_VOICE,
	}));
}

/**
 * Build a custom voice from user-provided prompts
 */
export function buildCustomVoice(customConfig: CustomVoiceConfig): VoicePreset {
	const {
		systemPrompt = VOICE_PRESETS.professional.systemPrompt,
		summaryInstructions = "",
		gutterStyle = "",
	} = customConfig;

	return {
		id: "custom",
		name: "Custom",
		description: "User-defined voice",
		preview: "Custom voice - see your configuration",
		// A custom voice's persona is whatever it was configured with: there are no
		// separate voice lines to extract, and the whole prompt is the person here.
		persona: systemPrompt,
		systemPrompt,

		buildPrompt(commits: Commit[], date: string, ownerName = "the developer") {
			const commitList = commits
				.map((c, i) => `${i + 1}. [${c.repo}] ${c.message} (+${c.additions}/-${c.deletions})`)
				.join("\n");

			const repoGroups: Record<string, string[]> = {};
			commits.forEach((c) => {
				if (!repoGroups[c.repo]) repoGroups[c.repo] = [];
				repoGroups[c.repo].push(c.message);
			});
			const repoSummary = Object.entries(repoGroups)
				.map(([repo, msgs]) => `${repo}: ${msgs.length} commits`)
				.join(", ");

			const gutterCount = Math.min(5, Math.max(1, Math.ceil(commits.length / 3)));

			let prompt = `Write a daily development summary for ${ownerName} on ${date}.

COMMITS TODAY (${commits.length} total across: ${repoSummary}):
${commitList}

`;

			if (summaryInstructions) {
				prompt += `STYLE INSTRUCTIONS:
${summaryInstructions}

`;
			}

			prompt += `GENERATE THREE OUTPUTS:

1. BRIEF SUMMARY (2-3 sentences)

2. DETAILED BREAKDOWN (markdown):
   - Header: "## Projects"
   - Each project: "### ProjectName"
   - Bullet points for key changes
${DETAILED_BUDGET}

3. GUTTER COMMENTS (${gutterCount} margin notes):
   Short observations (10 words max).`;

			if (gutterStyle) {
				prompt += `
   Style: ${gutterStyle}`;
			}

			prompt += `

OUTPUT FORMAT (valid JSON only):
{
  "brief": "Your summary here",
  "detailed": "## Projects\\n\\n### ProjectName\\n- Change one",
  "gutter": [
    {"anchor": "### ProjectName", "type": "comment", "content": "Observation"}
  ]
}

REQUIREMENTS:
- JSON only, no markdown code blocks
- Escape newlines as \\n
- Gutter anchors must EXACTLY match "### ProjectName" headers
- Exactly ${gutterCount} gutter comments`;

			return prompt;
		},
	};
}
