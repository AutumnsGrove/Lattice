/**
 * POST /transcribe Route Tests
 *
 * Tests transcription request validation, base64 audio decoding,
 * and response envelope shape.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env, LumenWorkerResponse } from "../types";
import { transcribe } from "./transcribe";

const mockTranscribe = vi.fn();

vi.mock("../lib/client-factory", () => ({
	createLumenClientForWorker: vi.fn(() => ({
		run: vi.fn(),
		embed: vi.fn(),
		moderate: vi.fn(),
		transcribe: mockTranscribe,
	})),
}));

function createApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.route("/transcribe", transcribe);
	return app;
}

const mockEnv: Env = {
	DB: {} as D1Database,
	AI: {} as Ai,
	WARDEN: { fetch: vi.fn() },
	RATE_LIMITS: {} as KVNamespace,
	LUMEN_API_KEY: "test-key",
};

// Create a small valid base64 string (represents "hello" in base64)
const SAMPLE_AUDIO_BASE64 = btoa("hello audio bytes");

function post(body: unknown) {
	return new Request("http://localhost/transcribe", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /transcribe", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return success envelope for valid request", async () => {
		mockTranscribe.mockResolvedValue({
			text: "Hello world",
			wordCount: 2,
			duration: 1.5,
			model: "@cf/openai/whisper-v3",
		});

		const app = createApp();
		const res = await app.request(post({ audio: SAMPLE_AUDIO_BASE64 }), mockEnv);

		expect(res.status).toBe(200);
		const body: LumenWorkerResponse = await res.json();
		expect(body.success).toBe(true);
		expect(body.data).toEqual({
			text: "Hello world",
			wordCount: 2,
			duration: 1.5,
			model: "@cf/openai/whisper-v3",
			gutterContent: undefined,
		});
		expect(body.meta?.task).toBe("transcription");
		expect(body.meta?.provider).toBe("cloudflare-ai");
	});

	it("should include gutter content when present", async () => {
		mockTranscribe.mockResolvedValue({
			text: "Some transcript",
			wordCount: 2,
			duration: 3.0,
			model: "@cf/openai/whisper-v3",
			gutterContent: [{ type: "vine", content: "Note: clear audio", anchor: "0:00" }],
		});

		const app = createApp();
		const res = await app.request(post({ audio: SAMPLE_AUDIO_BASE64 }), mockEnv);

		expect(res.status).toBe(200);
		const body: LumenWorkerResponse = await res.json();
		expect((body.data as Record<string, unknown>).gutterContent).toHaveLength(1);
	});

	it("should convert base64 to Uint8Array for LumenClient", async () => {
		mockTranscribe.mockResolvedValue({
			text: "ok",
			wordCount: 1,
			duration: 0.5,
			model: "m",
		});

		const app = createApp();
		await app.request(post({ audio: SAMPLE_AUDIO_BASE64 }), mockEnv);

		// Verify the audio was decoded to Uint8Array
		const callArgs = mockTranscribe.mock.calls[0][0];
		expect(callArgs.audio).toBeInstanceOf(Uint8Array);
		expect(callArgs.audio.length).toBe(atob(SAMPLE_AUDIO_BASE64).length);
	});

	it("should default mode to raw", async () => {
		mockTranscribe.mockResolvedValue({
			text: "ok",
			wordCount: 1,
			duration: 0.5,
			model: "m",
		});

		const app = createApp();
		await app.request(post({ audio: SAMPLE_AUDIO_BASE64 }), mockEnv);

		const callArgs = mockTranscribe.mock.calls[0][0];
		expect(callArgs.options.mode).toBe("raw");
	});

	it("should accept draft mode", async () => {
		mockTranscribe.mockResolvedValue({
			text: "Structured output",
			wordCount: 2,
			duration: 2.0,
			model: "m",
		});

		const app = createApp();
		await app.request(post({ audio: SAMPLE_AUDIO_BASE64, mode: "draft" }), mockEnv);

		const callArgs = mockTranscribe.mock.calls[0][0];
		expect(callArgs.options.mode).toBe("draft");
	});

	it("should return 400 for invalid JSON body", async () => {
		const app = createApp();
		const res = await app.request(
			new Request("http://localhost/transcribe", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "{{bad json",
			}),
			mockEnv,
		);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = await res.json();
		expect(body.error?.code).toBe("INVALID_REQUEST");
	});

	it("should return 400 for missing audio field", async () => {
		const app = createApp();
		const res = await app.request(post({}), mockEnv);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = await res.json();
		expect(body.error?.code).toBe("INVALID_PARAMS");
		expect(body.error?.message).toContain("audio");
	});

	it("should return 400 for invalid mode value", async () => {
		const app = createApp();
		const res = await app.request(post({ audio: SAMPLE_AUDIO_BASE64, mode: "invalid" }), mockEnv);

		expect(res.status).toBe(400);
		const body: LumenWorkerResponse = await res.json();
		expect(body.error?.code).toBe("INVALID_PARAMS");
	});

	it("should return error envelope when LumenClient throws", async () => {
		mockTranscribe.mockRejectedValue(new Error("Audio too short"));

		const app = createApp();
		const res = await app.request(post({ audio: SAMPLE_AUDIO_BASE64 }), mockEnv);

		expect(res.status).toBe(500);
		const body: LumenWorkerResponse = await res.json();
		expect(body.success).toBe(false);
		expect(body.meta?.task).toBe("transcription");
	});

	it("should pass tenant_id and tier to LumenClient", async () => {
		mockTranscribe.mockResolvedValue({
			text: "ok",
			wordCount: 1,
			duration: 0.5,
			model: "m",
		});

		const app = createApp();
		await app.request(
			post({ audio: SAMPLE_AUDIO_BASE64, tenant_id: "t_abc", tier: "sapling" }),
			mockEnv,
		);

		expect(mockTranscribe).toHaveBeenCalledWith(
			expect.objectContaining({ tenant: "t_abc" }),
			"sapling",
		);
	});
});
