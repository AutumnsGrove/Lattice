/**
 * Exa Service Definition
 *
 * Actions: search, find_similar, get_contents
 * Auth: Bearer token
 */

import { z } from "zod";
import { registerService } from "./registry";
import type { ServiceAction } from "./registry";

const BASE_URL = "https://api.exa.ai";

const commonHeaders = (token: string) => ({
	Authorization: `Bearer ${token}`,
	"Content-Type": "application/json",
});

const actions: Record<string, ServiceAction> = {
	search: {
		schema: z.object({
			query: z.string(),
			num_results: z.number().int().min(1).max(100).default(10),
			type: z.enum(["auto", "keyword", "neural"]).default("auto"),
			use_autoprompt: z.boolean().default(true),
			include_domains: z.array(z.string()).optional(),
			exclude_domains: z.array(z.string()).optional(),
			start_published_date: z.string().optional(),
			end_published_date: z.string().optional(),
			start_crawl_date: z.string().optional(),
			end_crawl_date: z.string().optional(),
			contents: z
				.object({
					text: z.object({ max_characters: z.number().optional() }).optional(),
					highlights: z.object({ num_sentences: z.number().optional() }).optional(),
				})
				.optional(),
		}),
		buildRequest: (params, token) => ({
			url: `${BASE_URL}/search`,
			method: "POST",
			headers: commonHeaders(token),
			body: JSON.stringify(params),
		}),
	},

	find_similar: {
		schema: z.object({
			url: z.url(),
			num_results: z.number().int().min(1).max(100).default(10),
			include_domains: z.array(z.string()).optional(),
			exclude_domains: z.array(z.string()).optional(),
			start_published_date: z.string().optional(),
			end_published_date: z.string().optional(),
			contents: z
				.object({
					text: z.object({ max_characters: z.number().optional() }).optional(),
					highlights: z.object({ num_sentences: z.number().optional() }).optional(),
				})
				.optional(),
		}),
		buildRequest: (params, token) => ({
			url: `${BASE_URL}/findSimilar`,
			method: "POST",
			headers: commonHeaders(token),
			body: JSON.stringify(params),
		}),
	},

	get_contents: {
		schema: z.object({
			ids: z.array(z.string()).min(1),
			text: z.object({ max_characters: z.number().optional() }).optional(),
			highlights: z.object({ num_sentences: z.number().optional() }).optional(),
		}),
		buildRequest: (params, token) => ({
			url: `${BASE_URL}/contents`,
			method: "POST",
			headers: commonHeaders(token),
			body: JSON.stringify(params),
		}),
	},
};

registerService({
	name: "exa",
	baseUrl: BASE_URL,
	auth: { type: "bearer" },
	actions,
});
