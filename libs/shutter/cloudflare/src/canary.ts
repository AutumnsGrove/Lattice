/**
 * Shutter Canary Check - Prompt Injection Detection
 *
 * Two-phase detection system (exact port of Python implementation):
 * 1. Heuristic checks (free) - regex patterns, Unicode, Base64
 * 2. Cheap LLM check - minimal extraction with output analysis
 *
 * IMPORTANT: This module must maintain exact parity with the Python
 * implementation to ensure consistent detection across platforms.
 */

import type { HeuristicMatch, PromptInjectionDetails, AggregatedConfidence } from "./types";
import { DEFAULTS } from "./types";

// ============================================================================
// Pattern Definitions - MUST match Python exactly
// ============================================================================

/**
 * Regex patterns for common prompt injection attempts
 * Format: [pattern, type, base_confidence]
 */
const INJECTION_PATTERNS: [RegExp, string, number][] = [
	// High confidence - clearly malicious (0.85-0.95)
	[/ignore\s+(all\s+)?previous\s+instructions?/i, "instruction_override", 0.95],
	[/disregard\s+(all|previous|above)/i, "instruction_override", 0.9],
	[/override\s+(instructions?|rules?|guidelines?)/i, "instruction_override", 0.9],
	[/new\s+instructions?:/i, "instruction_override", 0.85],
	[/jailbreak/i, "jailbreak_attempt", 0.9],
	[/dan\s+mode/i, "jailbreak_attempt", 0.85],
	[/ignore\s+safety/i, "safety_bypass", 0.9],
	[/<\s*system\s*>/i, "delimiter_injection", 0.9],
	[/\[inst\]|\[\/inst\]/i, "delimiter_injection", 0.85],

	// Medium-high confidence - very suspicious (0.75-0.85)
	[/(reveal|show|print|output)\s+(your\s+)?(system\s+)?prompt/i, "prompt_leak", 0.85],
	[/```\s*system/i, "delimiter_injection", 0.8],
	[/forget\s+(everything|all|previous)/i, "memory_wipe", 0.8],
	[/(developer|admin|system)\s+mode/i, "mode_switch", 0.75],

	// Medium confidence - could be legitimate content (0.50-0.70)
	[/you\s+are\s+now\s+a?/i, "role_hijack", 0.7],
	[/pretend\s+(you\s+are|to\s+be)/i, "role_hijack", 0.65],
	[/act\s+as\s+(a\s+)?/i, "role_hijack", 0.5], // Often in normal content
];

/**
 * Unicode ranges that can hide invisible instructions
 * Format: [start, end, char_type, confidence]
 *
 * NOTE: Zero-width and word joiners have LOW weights because they're
 * very common in legitimate CMS/rich text content. Only Tag Characters
 * are truly suspicious (deprecated Unicode, no legitimate use).
 */
const SUSPICIOUS_UNICODE_RANGES: [number, number, string, number][] = [
	[0xe0000, 0xe007f, "tag_characters", 0.85], // Unicode Tag Characters - truly suspicious
	[0x200b, 0x200f, "zero_width", 0.35], // Zero-width - common in CMS/i18n, low weight
	[0x2060, 0x206f, "word_joiners", 0.3], // Word joiners - common in rich text, low weight
	[0xfeff, 0xfeff, "bom", 0.2], // Byte order mark - usually legitimate
];

/** Base64 pattern for encoded payloads (40+ chars) */
const BASE64_PATTERN = /[A-Za-z0-9+/]{40,}={0,2}/g;

/** LLM output analysis indicator weights */
const INDICATOR_WEIGHTS = {
	instruction_following: 0.85, // Strong indicator
	meta_discussion: 0.7, // Moderate indicator
	topic_deviation: 0.65, // Weaker, needs context
};

/** Common words to exclude from topic analysis */
const COMMON_WORDS = new Set([
	"the",
	"a",
	"an",
	"is",
	"are",
	"was",
	"were",
	"be",
	"been",
	"being",
	"have",
	"has",
	"had",
	"do",
	"does",
	"did",
	"will",
	"would",
	"could",
	"should",
	"may",
	"might",
	"must",
	"shall",
	"can",
	"need",
	"dare",
	"ought",
	"used",
	"to",
	"of",
	"in",
	"for",
	"on",
	"with",
	"at",
	"by",
	"from",
	"as",
	"into",
	"through",
	"during",
	"before",
	"after",
	"above",
	"below",
	"between",
	"under",
	"again",
	"further",
	"then",
	"once",
	"what",
	"which",
	"who",
	"whom",
	"this",
	"that",
	"these",
	"those",
	"am",
	"it",
	"its",
	"and",
	"but",
	"or",
	"nor",
	"so",
	"yet",
	"both",
	"either",
	"neither",
	"not",
	"only",
	"own",
	"same",
	"than",
	"too",
	"very",
	"just",
	"also",
]);

// ============================================================================
// Heuristic Check Functions
// ============================================================================

/**
 * Run free heuristic checks for prompt injection patterns
 *
 * Returns ALL matches with their confidence scores, enabling
 * multi-pattern boosting in the aggregation step.
 *
 * @param content - Page content to analyze
 * @returns List of matches with type, snippet, and confidence
 */
export function checkHeuristics(content: string): HeuristicMatch[] {
	const contentLower = content.toLowerCase();
	const matches: HeuristicMatch[] = [];

	for (const [pattern, injectionType, baseConfidence] of INJECTION_PATTERNS) {
		const match = pattern.exec(contentLower);
		if (match) {
			// Extract snippet around the match
			const start = Math.max(0, match.index - 20);
			const end = Math.min(content.length, match.index + match[0].length + 20);
			const snippet = content.slice(start, end);

			matches.push({
				type: injectionType,
				snippet,
				confidence: baseConfidence,
			});
		}
	}

	return matches;
}

/**
 * Check for suspicious Unicode characters that could hide instructions
 *
 * @param content - Page content to analyze
 * @returns Match details if suspicious Unicode found, null if clean
 */
export function checkUnicode(content: string): HeuristicMatch | null {
	// Use for...of to properly iterate over UTF-16 characters
	let position = 0;
	for (const char of content) {
		const code = char.codePointAt(0);
		if (code === undefined) {
			position++;
			continue;
		}

		for (const [start, end, charType, confidence] of SUSPICIOUS_UNICODE_RANGES) {
			if (code >= start && code <= end) {
				return {
					type: `hidden_unicode_${charType}`,
					snippet: `[Hidden ${charType} at position ${position}]`,
					confidence,
				};
			}
		}
		position++;
	}

	return null;
}

/**
 * Check for long Base64-encoded strings that could be payloads
 *
 * Confidence scales with length - longer payloads are more suspicious.
 *
 * @param content - Page content to analyze
 * @returns Match details if suspicious Base64 found, null if clean
 */
export function checkBase64(content: string): HeuristicMatch | null {
	const matches = content.match(BASE64_PATTERN);
	if (!matches) {
		return null;
	}

	for (const match of matches) {
		const length = match.length;
		// Only flag very long base64 strings (likely payloads, not images)
		if (length > 100) {
			// Confidence scales with length: 100 chars = 0.60, 600 chars = 0.95
			const confidence = Math.min(0.95, 0.6 + (length - 100) / 500);
			const snippet = match.slice(0, 50) + "..." + match.slice(-10);
			return {
				type: "base64_payload",
				snippet,
				confidence,
			};
		}
	}

	return null;
}

// ============================================================================
// Confidence Aggregation
// ============================================================================

/**
 * Aggregate all signals into final confidence score
 *
 * Uses max-based aggregation (not average) because a single high-confidence
 * signal shouldn't be diluted by absence of other signals.
 *
 * Multi-pattern boost: 2+ patterns = +0.10, 3+ = +0.15 (capped at 0.99)
 * Attackers often combine techniques, so multiple weak signals = strong detection.
 *
 * @param heuristicMatches - Matches from pattern checking
 * @param unicodeResult - Result from unicode check
 * @param base64Result - Result from base64 check
 * @param weightOverrides - Optional confidence overrides by type
 * @returns Aggregated confidence, primary type, snippet, and all signals
 */
export function aggregateConfidence(
	heuristicMatches: HeuristicMatch[],
	unicodeResult: HeuristicMatch | null,
	base64Result: HeuristicMatch | null,
	weightOverrides: Record<string, number> = {},
): AggregatedConfidence {
	const signals: string[] = [];
	let maxConfidence = 0.0;
	let primaryType: string | null = null;
	let primarySnippet: string | null = null;

	// Process heuristic matches
	for (const match of heuristicMatches) {
		// Apply weight override if configured
		const conf = weightOverrides[match.type] ?? match.confidence;

		signals.push(`${match.type}:${conf.toFixed(2)}`);
		if (conf > maxConfidence) {
			maxConfidence = conf;
			primaryType = match.type;
			primarySnippet = match.snippet;
		}
	}

	// Boost for multiple patterns - attackers often combine techniques
	if (heuristicMatches.length >= 2) {
		maxConfidence = Math.min(0.98, maxConfidence + 0.1);
	}
	if (heuristicMatches.length >= 3) {
		maxConfidence = Math.min(0.99, maxConfidence + 0.05);
	}

	// Process unicode
	if (unicodeResult) {
		signals.push(`${unicodeResult.type}:${unicodeResult.confidence.toFixed(2)}`);
		if (unicodeResult.confidence > maxConfidence) {
			maxConfidence = unicodeResult.confidence;
			primaryType = unicodeResult.type;
			primarySnippet = unicodeResult.snippet;
		}
	}

	// Process base64
	if (base64Result) {
		signals.push(`${base64Result.type}:${base64Result.confidence.toFixed(2)}`);
		if (base64Result.confidence > maxConfidence) {
			maxConfidence = base64Result.confidence;
			primaryType = base64Result.type;
			primarySnippet = base64Result.snippet;
		}
	}

	return {
		confidence: maxConfidence,
		type: primaryType,
		snippet: primarySnippet,
		signals,
	};
}

// ============================================================================
// LLM Canary Check
// ============================================================================

/**
 * Run minimal LLM extraction and analyze output for injection indicators
 *
 * Uses cheapest model tier with strict token limits.
 *
 * @param content - Page content to analyze
 * @param query - User's extraction query
 * @param apiKey - OpenRouter API key
 * @returns Injection details if detected, null if clean
 */
export async function runCanaryLlm(
	content: string,
	query: string,
	apiKey: string,
): Promise<PromptInjectionDetails | null> {
	// Truncate content to reduce cost
	const truncatedContent = content.length > 5000 ? content.slice(0, 5000) : content;

	const prompt = `Web page content:
---
${truncatedContent}
---

${query}

Respond in 50 words or less based only on the content above.`;

	try {
		const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
				"HTTP-Referer": "https://github.com/AutumnsGrove/Shutter",
				"X-Title": "Shutter Canary Check",
			},
			body: JSON.stringify({
				model: "meta-llama/llama-3.2-3b-instruct", // Cheapest fast model
				messages: [{ role: "user", content: prompt }],
				max_tokens: 100, // Strict limit for canary
				temperature: 0,
			}),
		});

		if (!response.ok) {
			return null;
		}

		const result = (await response.json()) as {
			choices?: { message?: { content?: string } }[];
		};

		if (result.choices?.[0]?.message?.content) {
			return analyzeCanaryOutput(result.choices[0].message.content, query);
		}
	} catch {
		// If canary LLM fails, we can't detect - but don't block
		// The main extraction will still run
	}

	return null;
}

/**
 * Check if any query word prefix matches any output word prefix
 * Simple stemming alternative for topic overlap detection
 */
function hasPrefixMatch(
	querySet: Set<string>,
	outputSet: Set<string>,
	minPrefix: number = 4,
): boolean {
	for (const qWord of querySet) {
		if (qWord.length < minPrefix) continue;
		const qPrefix = qWord.slice(0, minPrefix);

		for (const oWord of outputSet) {
			if (oWord.length >= minPrefix && oWord.slice(0, minPrefix) === qPrefix) {
				return true;
			}
		}
	}
	return false;
}

/**
 * Analyze canary LLM output for signs of successful injection
 *
 * @param output - The LLM's response
 * @param originalQuery - The original user query
 * @returns Injection details if detected, null if clean
 */
export function analyzeCanaryOutput(
	output: string,
	originalQuery: string,
): PromptInjectionDetails | null {
	const outputLower = output.toLowerCase();

	// Signs of instruction-following injection
	const instructionIndicators = [
		"i will now",
		"as you requested",
		"certainly!",
		"of course!",
		"here is your",
		"as per your instructions",
		"following your directive",
		"i understand you want me to",
	];

	for (const indicator of instructionIndicators) {
		if (outputLower.includes(indicator)) {
			const confidence = INDICATOR_WEIGHTS.instruction_following;
			return {
				detected: true,
				type: "instruction_following",
				snippet: output.slice(0, 100),
				domainFlagged: confidence >= 0.7,
				confidence,
				signals: [`instruction_following:${confidence.toFixed(2)}`],
			};
		}
	}

	// Signs of system/prompt discussion
	const metaIndicators = [
		"my instructions",
		"my prompt",
		"my system",
		"i am an ai",
		"i'm an ai",
		"as an ai",
		"my programming",
		"my guidelines",
	];

	for (const indicator of metaIndicators) {
		if (outputLower.includes(indicator)) {
			const confidence = INDICATOR_WEIGHTS.meta_discussion;
			return {
				detected: true,
				type: "meta_discussion",
				snippet: output.slice(0, 100),
				domainFlagged: confidence >= 0.7,
				confidence,
				signals: [`meta_discussion:${confidence.toFixed(2)}`],
			};
		}
	}

	// Check for completely off-topic response
	const queryWords = new Set(
		originalQuery
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => !COMMON_WORDS.has(w)),
	);
	const outputWords = new Set(outputLower.split(/\s+/).filter((w) => !COMMON_WORDS.has(w)));

	// Check for overlap
	const hasDirectOverlap = [...queryWords].some((w) => outputWords.has(w));
	const hasOverlap = hasDirectOverlap || hasPrefixMatch(queryWords, outputWords);

	if (queryWords.size > 0 && !hasOverlap) {
		// Check if it's a legitimate "not found" response
		const notFoundPhrases = [
			"not found",
			"no information",
			"doesn't contain",
			"does not contain",
			"couldn't find",
			"could not find",
			"not present",
			"not available",
			"not mentioned",
		];

		const isNotFound = notFoundPhrases.some((phrase) => outputLower.includes(phrase));

		if (!isNotFound) {
			const confidence = INDICATOR_WEIGHTS.topic_deviation;
			return {
				detected: true,
				type: "topic_deviation",
				snippet: output.slice(0, 100),
				domainFlagged: confidence >= 0.7,
				confidence,
				signals: [`topic_deviation:${confidence.toFixed(2)}`],
			};
		}
	}

	return null;
}

// ============================================================================
// Main Canary Check Function
// ============================================================================

/**
 * Run minimal extraction to detect prompt injection patterns
 *
 * Phase 1 of 2-phase Canary approach with confidence scoring.
 *
 * Threshold behavior:
 * - confidence >= block_threshold: Block extraction, flag domain
 * - confidence < 0.3: Run LLM check for additional validation
 * - confidence 0.3-threshold: Could be used for soft warnings (future)
 *
 * @param content - Fetched page content
 * @param query - User's extraction query
 * @param apiKey - OpenRouter API key for LLM canary
 * @param blockThreshold - Confidence threshold for blocking (default: 0.6)
 * @returns Injection details if detected, null otherwise
 */
export async function canaryCheck(
	content: string,
	query: string,
	apiKey: string,
	blockThreshold: number = DEFAULTS.BLOCK_THRESHOLD,
): Promise<PromptInjectionDetails | null> {
	// Phase 1: Free heuristic checks - collect all signals
	const heuristicMatches = checkHeuristics(content);
	const unicodeResult = checkUnicode(content);
	const base64Result = checkBase64(content);

	// Aggregate all heuristic signals
	const aggregated = aggregateConfidence(heuristicMatches, unicodeResult, base64Result);

	// If high confidence from heuristics alone, skip LLM check
	if (aggregated.confidence >= blockThreshold && aggregated.type && aggregated.snippet) {
		return {
			detected: true,
			type: aggregated.type,
			snippet: aggregated.snippet,
			domainFlagged: aggregated.confidence >= 0.7,
			confidence: aggregated.confidence,
			signals: aggregated.signals,
		};
	}

	// Phase 2: Cheap LLM check (only if heuristics inconclusive)
	if (aggregated.confidence < 0.3) {
		const llmResult = await runCanaryLlm(content, query, apiKey);
		if (llmResult) {
			// Combine LLM confidence with any weak heuristic signals
			const combinedConfidence = Math.max(aggregated.confidence + 0.2, llmResult.confidence);
			const combinedSignals = [...aggregated.signals, ...llmResult.signals];

			if (combinedConfidence >= blockThreshold) {
				return {
					detected: true,
					type: llmResult.type,
					snippet: llmResult.snippet,
					domainFlagged: combinedConfidence >= 0.7,
					confidence: combinedConfidence,
					signals: combinedSignals,
				};
			}
		}
	}

	// Clean or low-confidence - allow extraction
	return null;
}
