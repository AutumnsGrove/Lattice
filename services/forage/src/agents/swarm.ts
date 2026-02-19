/**
 * Swarm Agent - Parallel domain evaluation
 *
 * Uses multiple concurrent AI calls to quickly evaluate domain candidates
 * for quality, pronounceability, memorability, and brand fit.
 * Supports tool calling with fallback to JSON prompts.
 */

import { SWARM_SYSTEM_PROMPT, formatSwarmPrompt } from "../prompts";
import type { AIProvider, ProviderResponse } from "../providers/types";
import { SWARM_TOOL } from "../providers/tools";

export interface DomainEvaluation {
	domain: string;
	score: number;
	worthChecking: boolean;
	pronounceable: boolean;
	memorable: boolean;
	brandFit: boolean;
	emailFriendly: boolean;
	flags: string[];
	notes: string;
}

export interface SwarmResult {
	evaluations: DomainEvaluation[];
	inputTokens: number;
	outputTokens: number;
}

export interface SwarmOptions {
	domains: string[];
	vibe: string;
	businessName: string;
	chunkSize?: number;
	maxConcurrent?: number;
}

/**
 * Evaluate domains in parallel using the provided AI provider
 * Supports tool calling with fallback to JSON prompts
 */
export async function evaluateDomains(
	provider: AIProvider,
	options: SwarmOptions,
): Promise<SwarmResult> {
	const { domains, vibe, businessName, chunkSize = 10, maxConcurrent = 12 } = options;

	if (domains.length === 0) {
		return { evaluations: [], inputTokens: 0, outputTokens: 0 };
	}

	// Split into chunks
	const chunks: string[][] = [];
	for (let i = 0; i < domains.length; i += chunkSize) {
		chunks.push(domains.slice(i, i + chunkSize));
	}

	// Process chunks with concurrency limit
	const results: SwarmResult[] = [];
	let totalInput = 0;
	let totalOutput = 0;

	// Process in batches respecting maxConcurrent
	for (let i = 0; i < chunks.length; i += maxConcurrent) {
		const batch = chunks.slice(i, i + maxConcurrent);
		const batchResults = await Promise.all(
			batch.map((chunk) => evaluateChunk(provider, chunk, vibe, businessName)),
		);

		for (const result of batchResults) {
			results.push(result);
			totalInput += result.inputTokens;
			totalOutput += result.outputTokens;
		}
	}

	// Flatten evaluations
	const allEvaluations: DomainEvaluation[] = [];
	for (const result of results) {
		allEvaluations.push(...result.evaluations);
	}

	return {
		evaluations: allEvaluations,
		inputTokens: totalInput,
		outputTokens: totalOutput,
	};
}

/**
 * Evaluate a single chunk of domains
 * Supports tool calling with fallback to JSON prompts
 */
async function evaluateChunk(
	provider: AIProvider,
	domains: string[],
	vibe: string,
	businessName: string,
): Promise<SwarmResult> {
	const prompt = formatSwarmPrompt({ domains, vibe, businessName });

	try {
		// Try tool calling if provider supports it
		if (provider.supportsTools) {
			try {
				const response = await provider.generateWithTools({
					prompt,
					tools: [SWARM_TOOL],
					system: SWARM_SYSTEM_PROMPT,
					maxTokens: 2048,
					temperature: 0.3,
					toolChoice: SWARM_TOOL.name,
				});

				// Parse tool call results
				if (response.toolCalls.length > 0) {
					const evaluations = parseToolCall(response.toolCalls, domains);
					return {
						evaluations,
						inputTokens: response.usage.inputTokens,
						outputTokens: response.usage.outputTokens,
					};
				} else {
					// Model responded without using tool, fall back to content parsing
					const evaluations = parseEvaluations(response.content, domains);
					return {
						evaluations,
						inputTokens: response.usage.inputTokens,
						outputTokens: response.usage.outputTokens,
					};
				}
			} catch (error) {
				console.warn("Tool calling failed, falling back to JSON prompt:", error);
				return evaluateChunkFallback(provider, prompt, domains);
			}
		} else {
			// Provider doesn't support tools, use JSON prompt
			return evaluateChunkFallback(provider, prompt, domains);
		}
	} catch (error) {
		console.error("Swarm evaluation error:", error);
		// Fall back to quick evaluation
		return {
			evaluations: domains.map((d) => quickEvaluate(d)),
			inputTokens: 0,
			outputTokens: 0,
		};
	}
}

/**
 * Evaluate chunk using traditional JSON prompt (fallback method)
 */
async function evaluateChunkFallback(
	provider: AIProvider,
	prompt: string,
	domains: string[],
): Promise<SwarmResult> {
	const response = await provider.generate({
		prompt,
		system: SWARM_SYSTEM_PROMPT,
		maxTokens: 2048,
		temperature: 0.3,
	});

	return {
		evaluations: parseEvaluations(response.content, domains),
		inputTokens: response.usage.inputTokens,
		outputTokens: response.usage.outputTokens,
	};
}

/**
 * Parse evaluation results from tool call
 */
function parseToolCall(
	toolCalls: ProviderResponse["toolCalls"],
	expectedDomains: string[],
): DomainEvaluation[] {
	const evaluations: DomainEvaluation[] = [];
	const parsedDomains = new Set<string>();

	for (const tc of toolCalls) {
		if (tc.toolName === SWARM_TOOL.name) {
			const evalList = (tc.arguments as { evaluations?: EvalData[] }).evaluations || [];
			for (const evalData of evalList) {
				if (evalData.domain) {
					const domain = evalData.domain.toLowerCase();
					if (!parsedDomains.has(domain)) {
						parsedDomains.add(domain);
						evaluations.push({
							domain,
							score: evalData.score ?? 0.5,
							worthChecking: evalData.worth_checking ?? true,
							pronounceable: evalData.pronounceable ?? true,
							memorable: evalData.memorable ?? true,
							brandFit: evalData.brand_fit ?? true,
							emailFriendly: evalData.email_friendly ?? true,
							flags: evalData.flags || [],
							notes: evalData.notes || "",
						});
					}
				}
			}
		}
	}

	// Fill in missing domains with quick evaluation
	for (const domain of expectedDomains) {
		if (!parsedDomains.has(domain.toLowerCase())) {
			evaluations.push(quickEvaluate(domain));
		}
	}

	return evaluations;
}

interface EvalData {
	domain: string;
	score?: number;
	worth_checking?: boolean;
	pronounceable?: boolean;
	memorable?: boolean;
	brand_fit?: boolean;
	email_friendly?: boolean;
	flags?: string[];
	notes?: string;
}

/**
 * Parse evaluation results from model response
 */
function parseEvaluations(content: string, expectedDomains: string[]): DomainEvaluation[] {
	const evaluations: DomainEvaluation[] = [];
	const parsedDomains = new Set<string>();

	// Try to extract JSON
	try {
		const jsonMatch = content.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const data = JSON.parse(jsonMatch[0]) as {
				evaluations?: Array<{
					domain: string;
					score?: number;
					worth_checking?: boolean;
					pronounceable?: boolean;
					memorable?: boolean;
					brand_fit?: boolean;
					email_friendly?: boolean;
					flags?: string[];
					notes?: string;
				}>;
			};

			const evalList = data.evaluations || [];
			for (const evalData of evalList) {
				if (evalData.domain) {
					const domain = evalData.domain.toLowerCase();
					if (!parsedDomains.has(domain)) {
						parsedDomains.add(domain);
						evaluations.push({
							domain,
							score: evalData.score ?? 0.5,
							worthChecking: evalData.worth_checking ?? true,
							pronounceable: evalData.pronounceable ?? true,
							memorable: evalData.memorable ?? true,
							brandFit: evalData.brand_fit ?? true,
							emailFriendly: evalData.email_friendly ?? true,
							flags: evalData.flags || [],
							notes: evalData.notes || "",
						});
					}
				}
			}
		}
	} catch {
		// JSON parse failed
	}

	// Fill in missing domains with quick evaluation
	for (const domain of expectedDomains) {
		if (!parsedDomains.has(domain.toLowerCase())) {
			evaluations.push(quickEvaluate(domain));
		}
	}

	return evaluations;
}

/**
 * Quick heuristic evaluation without AI
 * Used as fallback when AI evaluation fails
 */
export function quickEvaluate(domain: string): DomainEvaluation {
	const parts = domain.split(".");
	const name = parts[0] || "";
	const tld = parts.length > 1 ? parts[parts.length - 1] : "";

	// Length-based scoring
	const lengthScore = name.length <= 8 ? 1.0 : Math.max(0.3, 1.0 - (name.length - 8) * 0.1);

	// TLD scoring - expanded for diverse TLD options
	const tldScores: Record<string, number> = {
		// Classic (highest trust)
		com: 1.0,
		net: 0.7,
		org: 0.7,
		// Business
		co: 0.9,
		biz: 0.6,
		company: 0.65,
		agency: 0.7,
		consulting: 0.65,
		// Tech
		io: 0.85,
		dev: 0.8,
		app: 0.8,
		tech: 0.75,
		ai: 0.8,
		software: 0.65,
		// Creative
		design: 0.75,
		studio: 0.75,
		space: 0.7,
		art: 0.7,
		gallery: 0.65,
		// Nature
		garden: 0.7,
		earth: 0.7,
		green: 0.65,
		place: 0.7,
		life: 0.7,
		land: 0.65,
		// Personal
		me: 0.75,
		name: 0.6,
		blog: 0.65,
		page: 0.65,
	};
	const tldScore = tldScores[tld] || 0.5;

	// Pronounceability (no weird consonant clusters)
	const consonantClusters = name.toLowerCase().match(/[bcdfghjklmnpqrstvwxyz]{4,}/g);
	const pronounceable = !consonantClusters || consonantClusters.length === 0;

	// Numbers and hyphens are less ideal
	const hasNumbers = /\d/.test(name);
	const hasHyphens = name.includes("-");

	// Calculate overall score
	let score = (lengthScore + tldScore) / 2;
	if (!pronounceable) score *= 0.7;
	if (hasNumbers) score *= 0.8;
	if (hasHyphens) score *= 0.85;

	const flags: string[] = [];
	if (hasNumbers) flags.push("contains numbers");
	if (hasHyphens) flags.push("contains hyphens");
	if (!pronounceable) flags.push("hard to pronounce");

	return {
		domain,
		score: Math.round(score * 100) / 100,
		worthChecking: score > 0.4,
		pronounceable,
		memorable: name.length <= 12,
		brandFit: score > 0.5,
		emailFriendly: !hasNumbers && !hasHyphens,
		flags,
		notes: `Quick eval: length=${name.length}, tld=.${tld}`,
	};
}

/**
 * Filter evaluations to only those worth checking availability
 */
export function filterWorthChecking(
	evaluations: DomainEvaluation[],
	minScore = 0.8,
): DomainEvaluation[] {
	return evaluations.filter((e) => e.worthChecking && e.score >= minScore);
}

/**
 * Rank evaluations by score (highest first)
 */
export function rankEvaluations(evaluations: DomainEvaluation[]): DomainEvaluation[] {
	return [...evaluations].sort((a, b) => b.score - a.score);
}
