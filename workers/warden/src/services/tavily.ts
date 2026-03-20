/**
 * Tavily Service Definition
 *
 * Actions: search, crawl, extract
 * Auth: API key injected into request body
 */

import { z } from "zod";
import { registerService } from "./registry";
import type { ServiceAction } from "./registry";

const BASE_URL = "https://api.tavily.com";

const actions: Record<string, ServiceAction> = {
	search: {
		schema: z.object({
			query: z.string(),
			search_depth: z.enum(["basic", "advanced"]).default("basic"),
			max_results: z.number().int().min(1).max(20).default(5),
			include_domains: z.array(z.string()).optional(),
			exclude_domains: z.array(z.string()).optional(),
			include_raw_content: z.boolean().default(false),
			include_images: z.boolean().default(false),
		}),
		buildRequest: (params, apiKey) => ({
			url: `${BASE_URL}/search`,
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ api_key: apiKey, ...params }),
		}),
	},

	crawl: {
		schema: z.object({
			url: z.url(),
			max_depth: z.number().int().min(1).max(5).default(1),
			max_breadth: z.number().int().min(1).max(20).default(10),
			limit: z.number().int().min(1).max(50).default(10),
			instructions: z.string().optional(),
			select_paths: z.array(z.string()).optional(),
			select_domains: z.array(z.string()).optional(),
		}),
		buildRequest: (params, apiKey) => ({
			url: `${BASE_URL}/crawl`,
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ api_key: apiKey, ...params }),
		}),
	},

	extract: {
		schema: z.object({
			urls: z.array(z.url()).min(1).max(20),
			include_images: z.boolean().default(false),
		}),
		buildRequest: (params, apiKey) => ({
			url: `${BASE_URL}/extract`,
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ api_key: apiKey, ...params }),
		}),
	},
};

registerService({
	name: "tavily",
	baseUrl: BASE_URL,
	auth: { type: "body", field: "api_key" },
	actions,
});
