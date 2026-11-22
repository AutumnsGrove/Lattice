/**
 * Remote Lumen Client
 *
 * Implements the same interface as LumenClient but routes through
 * the Lumen worker via service binding or HTTPS. Never throws —
 * wraps errors in the response envelope.
 *
 * Trust boundaries use safeJsonParse from the server SDK
 * and Zod schemas for response validation (Rootwork pattern).
 */

import { z } from "zod";
import type {
	LumenMessage,
	LumenUsage,
	LumenRequest,
	LumenResponse,
	LumenEmbeddingRequest,
	LumenEmbeddingResponse,
	LumenModerationRequest,
	LumenModerationResponse,
	LumenTranscriptionRequest,
	LumenTranscriptionResponse,
	LumenTask,
} from "./types.js";

// =============================================================================
// Wire format
// =============================================================================

/**
 * Map a message onto the worker's wire shape.
 *
 * The worker API is snake_case (`tool_call_id`, `tool_calls`, `tenant_id`),
 * while the engine types are camelCase. Without this, a tool turn would be sent
 * with fields the worker schema does not know about, z.object strips them, and
 * step two of a loop would arrive at the provider as a bare message with no id —
 * a rejection several layers away from the mistake.
 */
function toWireMessage(message: LumenMessage): Record<string, unknown> {
	const wire: Record<string, unknown> = {
		role: message.role,
		content: message.content,
	};

	if (message.toolCalls?.length) wire.tool_calls = message.toolCalls;
	if (message.toolCallId) wire.tool_call_id = message.toolCallId;
	if (message.name) wire.name = message.name;

	return wire;
}

/**
 * Map wire usage back onto the engine's shape.
 *
 * `cost_source` is snake_case on the wire. Dropping it here would make every
 * cost at the caller look like a first-party figure, which is the opposite of
 * what the field is for.
 */
function fromWireUsage(usage: {
	input: number;
	output: number;
	cost: number;
	cost_source?: "catalog" | "provider";
}): LumenUsage {
	return {
		input: usage.input,
		output: usage.output,
		cost: usage.cost,
		...(usage.cost_source && { costSource: usage.cost_source }),
	};
}

// =============================================================================
// Response Schemas (Rootwork: validate upstream responses at boundary)
// =============================================================================

const UsageSchema = z.object({
	input: z.number(),
	output: z.number(),
	cost: z.number(),
	cost_source: z.enum(["catalog", "provider"]).optional(),
});

const ToolCallSchema = z.object({
	id: z.string(),
	type: z.literal("function"),
	function: z.object({
		name: z.string(),
		arguments: z.string(),
	}),
});

const FinishReasonSchema = z.enum(["stop", "length", "tool_calls", "content_filter", "other"]);

const InferenceDataSchema = z.object({
	content: z.string(),
	model: z.string(),
	provider: z.string(),
	usage: UsageSchema,
	cached: z.boolean().optional().default(false),
	tool_calls: z.array(ToolCallSchema).optional(),
	finish_reason: FinishReasonSchema.optional(),
});

const EmbedDataSchema = z.object({
	embeddings: z.array(z.array(z.number())),
	model: z.string(),
	usage: z.object({ tokens: z.number() }).optional(),
});

const ModerateDataSchema = z.object({
	safe: z.boolean(),
	categories: z.array(z.string()),
	confidence: z.number(),
	model: z.string(),
});

const TranscribeDataSchema = z.object({
	text: z.string(),
	wordCount: z.number(),
	duration: z.number(),
	model: z.string(),
	gutterContent: z
		.array(
			z.object({ type: z.literal("vine"), content: z.string(), anchor: z.string().optional() }),
		)
		.optional(),
});

const WorkerResponseSchema = z.object({
	success: z.boolean(),
	data: z.unknown().optional(),
	error: z.object({ code: z.string(), message: z.string() }).optional(),
	meta: z
		.object({
			task: z.string(),
			model: z.string(),
			provider: z.string(),
			latencyMs: z.number(),
		})
		.optional(),
});

// =============================================================================
// Configuration
// =============================================================================

export interface RemoteLumenConfig {
	/** Base URL of the Lumen worker (for HTTPS mode) */
	baseUrl: string;
	/** API key for authenticating with the Lumen worker */
	apiKey?: string;
	/** Service binding fetcher (for worker-to-worker mode) */
	fetcher?: {
		fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	};
}

// =============================================================================
// Client
// =============================================================================

export class RemoteLumenClient {
	private readonly baseUrl: string;
	private readonly apiKey?: string;
	private readonly fetcher?: RemoteLumenConfig["fetcher"];

	constructor(config: RemoteLumenConfig) {
		this.baseUrl = config.baseUrl.replace(/\/$/, "");
		this.apiKey = config.apiKey;
		this.fetcher = config.fetcher;
	}

	/** Check if Lumen is enabled (always true for remote) */
	isEnabled(): boolean {
		return true;
	}

	/** Health check */
	async healthCheck(): Promise<boolean> {
		try {
			const response = await this.doFetch(`${this.baseUrl}/health`);
			return response.ok;
		} catch {
			return false;
		}
	}

	/**
	 * Fetch via the service binding when present, calling `.fetch()` directly
	 * on the binding to preserve `this` — detaching it into a bare function
	 * reference throws "Illegal invocation" on Cloudflare service bindings.
	 */
	private doFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
		if (this.fetcher) return this.fetcher.fetch(input, init);
		return fetch(input, init);
	}

	/** Run an inference request through the remote Lumen worker */
	async run(request: LumenRequest, tier?: string): Promise<LumenResponse> {
		const body = {
			task: request.task,
			input: Array.isArray(request.input) ? request.input.map(toWireMessage) : request.input,
			tenant_id: request.tenant,
			tier,
			options: request.options
				? {
						model: request.options.model,
						max_tokens: request.options.maxTokens,
						temperature: request.options.temperature,
						skip_quota: request.options.skipQuota,
						skip_pii_scrub: request.options.skipPiiScrub,
						songbird: request.options.songbird ? true : undefined,
						tenant_api_key: request.options.tenantApiKey,
						metadata: request.options.metadata,
						tools: request.options.tools,
						tool_choice: request.options.toolChoice,
					}
				: undefined,
		};

		const raw = await this.post("/inference", body);

		// Validate response at trust boundary
		const envelope = WorkerResponseSchema.safeParse(raw);
		if (!envelope.success) {
			throw new Error(`Invalid response from Lumen worker: ${envelope.error.message}`);
		}

		if (!envelope.data.success) {
			const err = envelope.data.error;
			const inferErr = new Error(err?.message ?? "Inference failed");
			(inferErr as Error & { code: string }).code =
				typeof err?.code === "string" ? err.code : "UPSTREAM_ERROR";
			throw inferErr;
		}

		const data = InferenceDataSchema.safeParse(envelope.data.data);
		if (!data.success) {
			throw new Error(`Invalid inference data from Lumen worker: ${data.error.message}`);
		}

		return {
			content: data.data.content,
			model: data.data.model,
			provider: data.data.provider as LumenResponse["provider"],
			usage: fromWireUsage(data.data.usage),
			cached: data.data.cached,
			latency: envelope.data.meta?.latencyMs ?? 0,
			...(data.data.tool_calls && { toolCalls: data.data.tool_calls }),
			...(data.data.finish_reason && { finishReason: data.data.finish_reason }),
		};
	}

	/** Generate embeddings through the remote Lumen worker */
	async embed(request: LumenEmbeddingRequest, tier?: string): Promise<LumenEmbeddingResponse> {
		const body = {
			input: request.input,
			tenant_id: request.tenant,
			tier,
			model: request.model,
		};

		const raw = await this.post("/embed", body);

		const envelope = WorkerResponseSchema.safeParse(raw);
		if (!envelope.success) {
			throw new Error(`Invalid response from Lumen worker: ${envelope.error.message}`);
		}

		if (!envelope.data.success) {
			const err = envelope.data.error;
			const embedErr = new Error(err?.message ?? "Embedding failed");
			(embedErr as Error & { code: string }).code =
				typeof err?.code === "string" ? err.code : "UPSTREAM_ERROR";
			throw embedErr;
		}

		const data = EmbedDataSchema.safeParse(envelope.data.data);
		if (!data.success) {
			throw new Error(`Invalid embed data from Lumen worker: ${data.error.message}`);
		}

		return {
			embeddings: data.data.embeddings,
			model: data.data.model,
			provider: "cloudflare-ai",
			tokens: data.data.usage?.tokens ?? 0,
		};
	}

	/** Run moderation through the remote Lumen worker */
	async moderate(request: LumenModerationRequest, tier?: string): Promise<LumenModerationResponse> {
		const body = {
			content: request.content,
			tenant_id: request.tenant,
			tier,
		};

		const raw = await this.post("/moderate", body);

		const envelope = WorkerResponseSchema.safeParse(raw);
		if (!envelope.success) {
			throw new Error(`Invalid response from Lumen worker: ${envelope.error.message}`);
		}

		if (!envelope.data.success) {
			const err = envelope.data.error;
			const modErr = new Error(err?.message ?? "Moderation failed");
			(modErr as Error & { code: string }).code =
				typeof err?.code === "string" ? err.code : "UPSTREAM_ERROR";
			throw modErr;
		}

		const data = ModerateDataSchema.safeParse(envelope.data.data);
		if (!data.success) {
			throw new Error(`Invalid moderation data from Lumen worker: ${data.error.message}`);
		}

		return {
			safe: data.data.safe,
			categories: data.data.categories as LumenModerationResponse["categories"],
			model: data.data.model,
			confidence: data.data.confidence,
		};
	}

	/** Run transcription through the remote Lumen worker */
	async transcribe(
		request: LumenTranscriptionRequest,
		tier?: string,
	): Promise<LumenTranscriptionResponse> {
		// Convert Uint8Array audio to base64 for JSON transport
		const audioBase64 =
			typeof request.audio === "string"
				? request.audio
				: btoa(String.fromCharCode(...new Uint8Array(request.audio)));

		const body = {
			audio: audioBase64,
			tenant_id: request.tenant,
			tier,
			mode: request.options?.mode ?? "raw",
		};

		const raw = await this.post("/transcribe", body);

		const envelope = WorkerResponseSchema.safeParse(raw);
		if (!envelope.success) {
			throw new Error(`Invalid response from Lumen worker: ${envelope.error.message}`);
		}

		if (!envelope.data.success) {
			const err = envelope.data.error;
			const txErr = new Error(err?.message ?? "Transcription failed");
			(txErr as Error & { code: string }).code =
				typeof err?.code === "string" ? err.code : "UPSTREAM_ERROR";
			throw txErr;
		}

		const data = TranscribeDataSchema.safeParse(envelope.data.data);
		if (!data.success) {
			throw new Error(`Invalid transcription data from Lumen worker: ${data.error.message}`);
		}

		return {
			text: data.data.text,
			wordCount: data.data.wordCount,
			duration: data.data.duration,
			latency: envelope.data.meta?.latencyMs ?? 0,
			model: data.data.model,
			provider: "cloudflare-ai",
			gutterContent: data.data.gutterContent,
		};
	}

	// ─── Private ──────────────────────────────────────────────────

	private async post(path: string, body: unknown): Promise<unknown> {
		const headers: Record<string, string> = { "Content-Type": "application/json" };
		if (this.apiKey) {
			headers["X-API-Key"] = this.apiKey;
		}

		const response = await this.doFetch(`${this.baseUrl}${path}`, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		});

		return response.json();
	}
}
