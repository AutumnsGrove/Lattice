/**
 * Driver Agent - Generates domain name candidates
 *
 * Uses configurable AI providers to generate creative domain suggestions
 * based on client preferences and learns from previous batch results.
 * Supports tool calling with fallback to JSON prompts.
 */

import { DRIVER_SYSTEM_PROMPT, formatDriverPrompt, type PreviousResults } from "../prompts";
import type { AIProvider, ProviderResponse } from "../providers/types";
import { DRIVER_TOOL } from "../providers/tools";

export interface DomainCandidate {
	domain: string;
	batchNum: number;
	tld: string;
	name: string;
}

export interface DriverResult {
	candidates: DomainCandidate[];
	inputTokens: number;
	outputTokens: number;
}

export interface DriverOptions {
	businessName: string;
	tldPreferences: string[];
	vibe: string;
	batchNum: number;
	count?: number;
	maxBatches?: number;
	domainIdea?: string;
	keywords?: string;
	diverseTlds?: boolean;
	previousResults?: PreviousResults;
}

/**
 * Generate domain candidates using the provided AI provider
 * Supports tool calling with fallback to JSON prompts
 */
export async function generateCandidates(
	provider: AIProvider,
	options: DriverOptions,
): Promise<DriverResult> {
	const prompt = formatDriverPrompt({
		businessName: options.businessName,
		tldPreferences: options.tldPreferences,
		vibe: options.vibe,
		batchNum: options.batchNum,
		count: options.count || 50,
		maxBatches: options.maxBatches || 6,
		domainIdea: options.domainIdea,
		keywords: options.keywords,
		diverseTlds: options.diverseTlds,
		previousResults: options.previousResults,
	});

	let candidates: DomainCandidate[] = [];
	let inputTokens = 0;
	let outputTokens = 0;

	// Try tool calling if provider supports it
	if (provider.supportsTools) {
		try {
			const response = await provider.generateWithTools({
				prompt,
				tools: [DRIVER_TOOL],
				system: DRIVER_SYSTEM_PROMPT,
				maxTokens: 4096,
				temperature: 0.8,
				toolChoice: DRIVER_TOOL.name,
			});

			inputTokens = response.usage.inputTokens;
			outputTokens = response.usage.outputTokens;

			// Parse tool call results
			if (response.toolCalls.length > 0) {
				candidates = parseToolCall(response.toolCalls, options.batchNum);
			} else {
				// Model responded without using tool, fall back to content parsing
				candidates = parseCandidates(response.content, options.batchNum);
			}
		} catch (error) {
			console.warn("Tool calling failed, falling back to JSON prompt:", error);
			const result = await generateWithFallback(provider, prompt, options.batchNum);
			candidates = result.candidates;
			inputTokens = result.inputTokens;
			outputTokens = result.outputTokens;
		}
	} else {
		// Provider doesn't support tools, use JSON prompt
		const result = await generateWithFallback(provider, prompt, options.batchNum);
		candidates = result.candidates;
		inputTokens = result.inputTokens;
		outputTokens = result.outputTokens;
	}

	// Filter out previously checked domains if provided
	let filteredCandidates = candidates;
	if (options.previousResults) {
		const checkedSet = new Set(
			options.previousResults.tried_summary
				.toLowerCase()
				.split(/[,\s]+/)
				.filter(Boolean),
		);
		filteredCandidates = candidates.filter((c) => !checkedSet.has(c.domain.toLowerCase()));
	}

	return {
		candidates: filteredCandidates.slice(0, options.count || 50),
		inputTokens,
		outputTokens,
	};
}

/**
 * Generate candidates using traditional JSON prompt (fallback method)
 */
async function generateWithFallback(
	provider: AIProvider,
	prompt: string,
	batchNum: number,
): Promise<DriverResult> {
	const response = await provider.generate({
		prompt,
		system: DRIVER_SYSTEM_PROMPT,
		maxTokens: 4096,
		temperature: 0.8,
	});

	return {
		candidates: parseCandidates(response.content, batchNum),
		inputTokens: response.usage.inputTokens,
		outputTokens: response.usage.outputTokens,
	};
}

/**
 * Parse domain candidates from tool call results
 */
function parseToolCall(
	toolCalls: ProviderResponse["toolCalls"],
	batchNum: number,
): DomainCandidate[] {
	const candidates: DomainCandidate[] = [];
	const seen = new Set<string>();

	for (const tc of toolCalls) {
		if (tc.toolName === DRIVER_TOOL.name) {
			const domains = (tc.arguments as { domains?: string[] }).domains || [];
			for (const domain of domains) {
				if (
					typeof domain === "string" &&
					isValidDomain(domain) &&
					!seen.has(domain.toLowerCase())
				) {
					seen.add(domain.toLowerCase());
					candidates.push(createCandidate(domain, batchNum));
				}
			}
		}
	}

	return candidates;
}

/**
 * Parse domain candidates from model response
 */
function parseCandidates(content: string, batchNum: number): DomainCandidate[] {
	const candidates: DomainCandidate[] = [];
	const seen = new Set<string>();

	// Try to extract JSON
	try {
		const jsonMatch = content.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const data = JSON.parse(jsonMatch[0]) as { domains?: string[] };
			const domains = data.domains || [];
			for (const domain of domains) {
				if (isValidDomain(domain) && !seen.has(domain.toLowerCase())) {
					seen.add(domain.toLowerCase());
					candidates.push(createCandidate(domain, batchNum));
				}
			}
		}
	} catch {
		// JSON parse failed, try regex fallback
	}

	// Fallback: extract domain-like patterns from text
	if (candidates.length === 0) {
		const domainPattern = /\b([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,})\b/g;
		let match;
		while ((match = domainPattern.exec(content)) !== null) {
			const domain = match[1];
			if (isValidDomain(domain) && !seen.has(domain.toLowerCase())) {
				seen.add(domain.toLowerCase());
				candidates.push(createCandidate(domain, batchNum));
			}
		}
	}

	return candidates;
}

/**
 * Create a DomainCandidate object
 */
function createCandidate(domain: string, batchNum: number): DomainCandidate {
	const parts = domain.toLowerCase().split(".");
	const tld = parts.length > 1 ? parts[parts.length - 1] : "";
	const name = parts[0] || "";

	return {
		domain: domain.toLowerCase(),
		batchNum,
		tld,
		name,
	};
}

/**
 * Check if a string is a valid domain name
 */
function isValidDomain(domain: string): boolean {
	if (!domain || domain.length < 4) return false;
	if (!domain.includes(".")) return false;

	const parts = domain.toLowerCase().split(".");

	// Check TLD
	const tld = parts[parts.length - 1];
	if (tld.length < 2 || !/^[a-z]+$/.test(tld)) return false;

	// Check name part
	const name = parts[0];
	if (name.length < 1 || name.length > 63) return false;

	// Only alphanumeric and hyphens (not at start/end)
	if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) return false;

	return true;
}
