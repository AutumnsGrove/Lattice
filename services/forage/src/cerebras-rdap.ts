/**
 * Cerebras RDAP Domain Availability Checker
 *
 * Uses Cerebras models via OpenRouter to check domain availability.
 * Faster than traditional RDAP but may have lower accuracy.
 */

import { OpenRouterProvider } from "./providers/openrouter";
import type { Env } from "./types";

export interface DomainCheckResult {
	domain: string;
	status: "available" | "registered" | "unknown";
	registrar?: string;
	expiration?: string;
	creation?: string;
	error?: string;
}

export class CerebrasRDAPChecker {
	private provider: OpenRouterProvider;
	private model: string;

	constructor(env: Env, model = "cerebras/btlm-3b-8k-base") {
		this.provider = new OpenRouterProvider(env, model);
		this.model = model;
	}

	/**
	 * Check availability of multiple domains using Cerebras
	 */
	async checkDomains(domains: string[]): Promise<DomainCheckResult[]> {
		if (domains.length === 0) {
			return [];
		}

		// Batch domains into groups of 10 to avoid token limits
		const batchSize = 10;
		const results: DomainCheckResult[] = [];

		for (let i = 0; i < domains.length; i += batchSize) {
			const batch = domains.slice(i, i + batchSize);
			const batchResults = await this.checkBatch(batch);
			results.push(...batchResults);
		}

		return results;
	}

	private async checkBatch(domains: string[]): Promise<DomainCheckResult[]> {
		const prompt = this.buildPrompt(domains);
		const system = `You are a domain availability checker. Given a list of domain names, determine if each domain is available for registration (not registered) or already registered. Use your knowledge of domain registration patterns and common TLDs. If you are uncertain, mark as "unknown". Return a JSON array of objects with keys: domain (string), status ("available", "registered", "unknown"), and optional error (string). Do not include any other text.`;

		try {
			const response = await this.provider.generate({
				prompt,
				system,
				maxTokens: 2000,
				temperature: 0.1,
			});

			const parsed = this.parseResponse(response.content, domains);
			return parsed;
		} catch (error) {
			// Fallback to unknown for all domains
			return domains.map((domain) => ({
				domain,
				status: "unknown",
				error: `Cerebras error: ${error instanceof Error ? error.message : String(error)}`,
			}));
		}
	}

	private buildPrompt(domains: string[]): string {
		return `Check availability of these domains: ${domains.join(", ")}`;
	}

	private parseResponse(content: string, originalDomains: string[]): DomainCheckResult[] {
		// Try to extract JSON array from content
		const jsonMatch = content.match(/\[[\s\S]*\]/);
		if (!jsonMatch) {
			// If no JSON found, assume all unknown
			return originalDomains.map((domain) => ({
				domain,
				status: "unknown",
				error: "Invalid response format",
			}));
		}

		try {
			const parsed = JSON.parse(jsonMatch[0]) as any[];
			const results: DomainCheckResult[] = [];

			for (const domain of originalDomains) {
				const match = parsed.find(
					(item: any) => item.domain && item.domain.toLowerCase() === domain.toLowerCase(),
				);
				if (match) {
					results.push({
						domain,
						status: this.normalizeStatus(match.status),
						registrar: match.registrar,
						expiration: match.expiration,
						creation: match.creation,
						error: match.error,
					});
				} else {
					results.push({
						domain,
						status: "unknown",
						error: "Domain not in response",
					});
				}
			}

			return results;
		} catch (error) {
			return originalDomains.map((domain) => ({
				domain,
				status: "unknown",
				error: `JSON parse error: ${error instanceof Error ? error.message : String(error)}`,
			}));
		}
	}

	private normalizeStatus(status: unknown): "available" | "registered" | "unknown" {
		if (typeof status !== "string") return "unknown";
		const s = status.toLowerCase();
		if (s === "available" || s === "free" || s === "unregistered") return "available";
		if (s === "registered" || s === "taken" || s === "occupied") return "registered";
		return "unknown";
	}
}
