/**
 * Lumen Factory Tests
 *
 * Tests the tri-mode auto-detection factory that creates the right
 * client type based on environment variables.
 */

import { describe, it, expect } from "vitest";
import { createLumenClientAuto } from "./factory.js";
import { RemoteLumenClient } from "./remote.js";
import { LumenClient } from "./client.js";

// =============================================================================
// MODE DETECTION
// =============================================================================

describe("createLumenClientAuto", () => {
	describe("Mode 1: Service binding", () => {
		it("should create RemoteLumenClient when LUMEN binding exists", () => {
			const mockFetcher = {
				fetch: async () => new Response("ok"),
			};

			const client = createLumenClientAuto({
				LUMEN: mockFetcher,
			});

			expect(client).toBeInstanceOf(RemoteLumenClient);
		});

		it("should prefer service binding over HTTP mode", () => {
			const mockFetcher = {
				fetch: async () => new Response("ok"),
			};

			const client = createLumenClientAuto({
				LUMEN: mockFetcher,
				LUMEN_URL: "https://lumen.grove.place",
				LUMEN_API_KEY: "key",
			});

			// Should use service binding, not HTTP
			expect(client).toBeInstanceOf(RemoteLumenClient);
		});
	});

	describe("Mode 2: HTTP remote", () => {
		it("should create RemoteLumenClient when LUMEN_URL is set", () => {
			const client = createLumenClientAuto({
				LUMEN_URL: "https://lumen.grove.place",
				LUMEN_API_KEY: "test-key",
			});

			expect(client).toBeInstanceOf(RemoteLumenClient);
		});

		it("should create RemoteLumenClient when only LUMEN_API_KEY is set", () => {
			const client = createLumenClientAuto({
				LUMEN_API_KEY: "test-key",
			});

			expect(client).toBeInstanceOf(RemoteLumenClient);
		});
	});

	describe("Mode 3: In-process", () => {
		it("should create LumenClient when only OPENROUTER_API_KEY is set", () => {
			const client = createLumenClientAuto({
				OPENROUTER_API_KEY: "or-key",
			});

			expect(client).toBeInstanceOf(LumenClient);
		});

		it("should create LumenClient when no remote config is available", () => {
			const client = createLumenClientAuto({});

			expect(client).toBeInstanceOf(LumenClient);
		});
	});

	describe("Priority ordering", () => {
		it("should choose service binding over everything else", () => {
			const client = createLumenClientAuto({
				LUMEN: { fetch: async () => new Response("ok") },
				LUMEN_URL: "https://lumen.grove.place",
				LUMEN_API_KEY: "key",
				OPENROUTER_API_KEY: "or-key",
			});

			expect(client).toBeInstanceOf(RemoteLumenClient);
		});

		it("should choose HTTP over in-process", () => {
			const client = createLumenClientAuto({
				LUMEN_URL: "https://lumen.grove.place",
				OPENROUTER_API_KEY: "or-key",
			});

			expect(client).toBeInstanceOf(RemoteLumenClient);
		});
	});
});
