/**
 * Voice Presets System
 *
 * Allows users to customize the "personality" of their timeline summaries.
 * Each voice defines how the AI writes about their daily coding activity.
 */

import { DETAILED_BUDGET, condenseCommitsForPrompt } from "./budget";
import { buildCustomVoice, getVoice } from "./registry";
import type {
	VoicePreset,
	VoicePromptResult,
	CustomVoiceConfig,
	Commit,
	PromptContextInput,
} from "./types";

// =============================================================================
// Re-exports
// =============================================================================
// The registry lives in `./registry` so the persona helper can read a voice
// without importing this module, which still carries the prompt being retired.
export { VOICE_PRESETS, DEFAULT_VOICE, getVoice, getAllVoices, buildCustomVoice } from "./registry";
export { resolvePersona, type VoiceChoice } from "./persona";

/**
 * Re-exported so consumers that build prompts themselves (the timeline-sync
 * worker inlines these presets) share the same ceiling instead of copying it.
 */
export {
	DETAILED_BUDGET,
	COMMIT_LIST_BUDGET_CHARS,
	SUMMARY_MAX_OUTPUT_TOKENS,
	condenseCommitsForPrompt,
} from "./budget";
export type { CondensedCommitList } from "./budget";

// =============================================================================
// Prompt Generation (Main Interface)
// =============================================================================

/**
 * Build the complete prompt for summary generation using the selected voice.
 *
 * @param voiceId - The voice preset ID (or "custom")
 * @param commits - Array of commits to summarize
 * @param date - Target date in YYYY-MM-DD format
 * @param ownerName - Display name for the developer
 * @param customConfig - Custom voice configuration (when voiceId is "custom")
 * @param context - Optional long-horizon context for multi-day awareness
 */
export function buildVoicedPrompt(
	voiceId: string,
	commits: Commit[],
	date: string,
	ownerName = "the developer",
	customConfig: CustomVoiceConfig | null = null,
	context: PromptContextInput | null = null,
): VoicePromptResult {
	let voice: VoicePreset;

	if (voiceId === "custom" && customConfig) {
		voice = buildCustomVoice(customConfig);
	} else {
		voice = getVoice(voiceId);
	}

	// Lumen rejects inputs past 100k characters outright, so a heavy day has to
	// be condensed before it is rendered into a prompt, not after.
	const condensed = condenseCommitsForPrompt(commits);

	let userPrompt = voice.buildPrompt(condensed.commits, date, ownerName);

	// A day big enough to overflow the commit budget still has to reach the
	// model as a real day, so the overflow is stated rather than dropped. The
	// marker is in every preset's prompt, custom included.
	if (condensed.note) {
		const marker = "GENERATE THREE OUTPUTS";
		const markerIndex = userPrompt.indexOf(marker);
		const note = `${condensed.note}\n\n`;
		userPrompt =
			markerIndex > 0
				? userPrompt.slice(0, markerIndex) + note + userPrompt.slice(markerIndex)
				: `${userPrompt}\n\n${note}`;
	}

	// Append long-horizon context if provided (condensed to save tokens)
	if (context) {
		let contextSection = "";

		if (context.historicalContext) {
			contextSection += `
RECENT CONTEXT (brief awareness only — do NOT recap these):
${context.historicalContext}

`;
		}

		if (context.continuationNote) {
			contextSection += `${context.continuationNote}

`;
		}

		// Insert context before the commit list
		// Voice prompts use either "COMMITS TODAY" or "WHAT HAPPENED" as markers
		const commitsMarker = "COMMITS TODAY";
		const whatHappenedMarker = "WHAT HAPPENED";
		let insertIndex = userPrompt.indexOf(commitsMarker);
		if (insertIndex <= 0) {
			insertIndex = userPrompt.indexOf(whatHappenedMarker);
		}
		if (insertIndex > 0) {
			userPrompt =
				userPrompt.slice(0, insertIndex) + contextSection + userPrompt.slice(insertIndex);
		} else {
			// Fallback: prepend context
			userPrompt = contextSection + userPrompt;
		}
	}

	return {
		systemPrompt: voice.systemPrompt,
		userPrompt,
		voiceId: voice.id,
		voiceName: voice.name,
	};
}

// =============================================================================
// Re-exports
// =============================================================================

export { professional, quest, casual, poetic, minimal } from "./presets";
export type {
	VoicePreset,
	VoicePromptResult,
	CustomVoiceConfig,
	Commit,
	GutterComment,
	PromptContextInput,
} from "./types";
