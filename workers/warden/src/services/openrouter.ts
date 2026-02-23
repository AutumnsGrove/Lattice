/**
 * OpenRouter Service Definition
 *
 * Actions: chat_completion, list_models, get_generation
 *
 * OpenRouter is a unified LLM gateway that routes to 100+ models.
 * This service registers it with Warden for credential-injected access,
 * enabling any worker (especially Lumen) to call AI models through
 * Warden's per-tenant credential resolution.
 */

import { z } from "zod";
import { registerService } from "./registry";
import type { ServiceAction } from "./registry";

const BASE_URL = "https://openrouter.ai/api/v1";

const commonHeaders = (token: string) => ({
	Authorization: `Bearer ${token}`,
	"Content-Type": "application/json",
	"HTTP-Referer": "https://grove.place",
	"X-Title": "Grove",
});

/** Message schema — shared across actions that accept messages */
const messageSchema = z.object({
	role: z.enum(["system", "user", "assistant"]),
	content: z.union([
		z.string(),
		z.array(
			z.object({
				type: z.enum(["text", "image_url"]),
				text: z.string().optional(),
				image_url: z
					.object({
						url: z.string(),
						detail: z.enum(["auto", "low", "high"]).optional(),
					})
					.optional(),
			}),
		),
	]),
});

const actions: Record<string, ServiceAction> = {
	chat_completion: {
		schema: z.object({
			model: z.string(),
			messages: z.array(messageSchema).min(1).max(200),
			max_tokens: z.number().int().min(1).max(128000).optional(),
			temperature: z.number().min(0).max(2).optional(),
			top_p: z.number().min(0).max(1).optional(),
			stream: z.literal(false).optional(),
		}),
		buildRequest: (params, token) => ({
			url: `${BASE_URL}/chat/completions`,
			method: "POST",
			headers: commonHeaders(token),
			body: JSON.stringify({
				model: params.model,
				messages: params.messages,
				max_tokens: params.max_tokens,
				temperature: params.temperature,
				top_p: params.top_p,
				stream: false,
			}),
		}),
	},

	list_models: {
		schema: z.object({}),
		buildRequest: (_params, token) => ({
			url: `${BASE_URL}/models`,
			method: "GET",
			headers: commonHeaders(token),
		}),
	},

	get_generation: {
		schema: z.object({
			generation_id: z.string(),
		}),
		buildRequest: (params, token) => ({
			url: `${BASE_URL}/generation?id=${encodeURIComponent(String(params.generation_id))}`,
			method: "GET",
			headers: commonHeaders(token),
		}),
	},
};

registerService({
	name: "openrouter",
	baseUrl: BASE_URL,
	auth: { type: "bearer" },
	actions,
});
