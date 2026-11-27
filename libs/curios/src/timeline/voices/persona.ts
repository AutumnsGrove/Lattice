/**
 * A tenant's voice, as the recipe wants it (#1798, slice 5).
 *
 * The recipe is handed a *persona* — the lines that say how to write — rather than
 * the one-shot JSON prompt the presets used to carry. That means every entry point
 * that writes a day has to turn a config row into a persona, and there are three of
 * them (the nightly worker, the Archer manual route, the comparison). Written once
 * here so "custom" cannot mean two slightly different things.
 *
 * A custom voice's persona is the whole system prompt the tenant configured: there
 * are no separate voice lines to extract, and that prompt is the person. It may
 * need trimming to voice lines only once a custom-voice tenant runs on the new path
 * (#1798, open question).
 */

import { buildCustomVoice, getVoice } from "./registry";
import type { CustomVoiceConfig } from "./types";

/** The voice fields a config row carries, in the shape the row stores them. */
export interface VoiceChoice {
	preset: string;
	custom?: CustomVoiceConfig | null;
}

export function resolvePersona(voice: VoiceChoice): string {
	if (voice.preset === "custom") {
		return buildCustomVoice(voice.custom ?? {}).persona;
	}
	return getVoice(voice.preset).persona;
}
