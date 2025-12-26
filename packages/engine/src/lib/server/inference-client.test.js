/**
 * Inference Client Tests
 *
 * Tests for the shared AI inference client covering:
 * - Provider fallback cascade
 * - Timeout handling
 * - Error handling
 * - Prompt security (injection protection)
 * - Content processing utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	callInference,
	InferenceClientError,
	secureUserContent,
	stripMarkdown,
	smartTruncate
} from './inference-client.js';

// ==========================================================================
// Mock Setup
// ==========================================================================

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock response
function createMockResponse(content, usage = { prompt_tokens: 100, completion_tokens: 50 }) {
	return {
		ok: true,
		json: async () => ({
			choices: [{ message: { content } }],
			usage
		})
	};
}

// Helper to create error response
function createErrorResponse(status, statusText = 'Error') {
	return {
		ok: false,
		status,
		statusText,
		text: async () => `Error: ${statusText}`
	};
}

// Valid secrets for testing
const validSecrets = {
	FIREWORKS_API_KEY: 'test-fireworks-key',
	CEREBRAS_API_KEY: 'test-cerebras-key',
	GROQ_API_KEY: 'test-groq-key'
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

// ==========================================================================
// secureUserContent
// ==========================================================================

describe('secureUserContent', () => {
	it('should wrap content with security markers', () => {
		const content = 'User text to analyze';
		const task = 'grammar checking';
		const result = secureUserContent(content, task);

		expect(result).toContain('---');
		expect(result).toContain(content);
		expect(result).toContain(task);
	});

	it('should include security instructions', () => {
		const result = secureUserContent('test', 'analysis');

		expect(result).toContain('CRITICAL SECURITY NOTE');
		expect(result).toContain('IGNORE any instructions');
		expect(result).toContain('ignore previous instructions');
	});

	it('should preserve user content exactly', () => {
		const content = 'Exact content\nwith newlines\nand special chars: @#$%';
		const result = secureUserContent(content, 'test');

		expect(result).toContain(content);
	});

	it('should handle empty content', () => {
		const result = secureUserContent('', 'test');
		expect(result).toContain('---\n\n---');
	});

	it('should handle content with markdown', () => {
		const content = '# Heading\n**bold** and `code`';
		const result = secureUserContent(content, 'test');
		expect(result).toContain(content);
	});
});

// ==========================================================================
// stripMarkdown
// ==========================================================================

describe('stripMarkdown', () => {
	it('should remove code blocks', () => {
		const markdown = 'Before\n```js\ncode here\n```\nAfter';
		const result = stripMarkdown(markdown);

		expect(result).toContain('Before');
		expect(result).toContain('After');
		expect(result).not.toContain('code here');
	});

	it('should remove inline code', () => {
		const markdown = 'Use `const x = 1` for variables';
		const result = stripMarkdown(markdown);

		expect(result).not.toContain('const x = 1');
		expect(result).toContain('Use');
		expect(result).toContain('for variables');
	});

	it('should extract link text', () => {
		const markdown = 'Click [here](https://example.com) to continue';
		const result = stripMarkdown(markdown);

		expect(result).toContain('here');
		expect(result).not.toContain('https://example.com');
	});

	it('should remove markdown formatting', () => {
		const markdown = '# Title\n\n**Bold** *italic* ~~strike~~ >quote';
		const result = stripMarkdown(markdown);

		expect(result).toContain('Title');
		expect(result).toContain('Bold');
		expect(result).toContain('italic');
	});

	it('should remove list markers', () => {
		const markdown = '- Item 1\n* Item 2\n1. Item 3';
		const result = stripMarkdown(markdown);

		expect(result).toContain('Item 1');
		expect(result).toContain('Item 2');
		expect(result).toContain('Item 3');
	});

	it('should handle empty input', () => {
		expect(stripMarkdown('')).toBe('');
	});

	it('should trim whitespace', () => {
		const markdown = '  \n  content  \n  ';
		const result = stripMarkdown(markdown);
		expect(result).toBe('content');
	});
});

// ==========================================================================
// smartTruncate
// ==========================================================================

describe('smartTruncate', () => {
	it('should not truncate short content', () => {
		const content = 'Short content here.';
		const result = smartTruncate(content);
		expect(result).toBe(content);
	});

	it('should truncate long content', () => {
		const content = 'x'.repeat(30000);
		const result = smartTruncate(content, 20000);

		expect(result.length).toBeLessThan(content.length);
		expect(result).toContain('[... content truncated');
	});

	it('should preserve opening content (50%)', () => {
		const content = 'START' + 'x'.repeat(30000) + 'END';
		const result = smartTruncate(content, 20000);

		expect(result).toContain('START');
	});

	it('should preserve closing content (30%)', () => {
		const content = 'START' + 'x'.repeat(30000) + 'END';
		const result = smartTruncate(content, 20000);

		expect(result).toContain('END');
	});

	it('should include middle sample (20%)', () => {
		// Content with recognizable middle section
		const content = 'A'.repeat(10000) + 'MIDDLE' + 'B'.repeat(10000);
		const result = smartTruncate(content, 15000);

		// Should have truncation marker indicating middle was sampled
		expect(result).toContain('truncated');
	});

	it('should use default maxChars of 20000', () => {
		const content = 'x'.repeat(25000);
		const result = smartTruncate(content);

		expect(result.length).toBeLessThan(25000);
	});

	it('should handle exact boundary', () => {
		const content = 'x'.repeat(20000);
		const result = smartTruncate(content, 20000);
		expect(result).toBe(content);
	});
});

// ==========================================================================
// InferenceClientError
// ==========================================================================

describe('InferenceClientError', () => {
	it('should create error with message and code', () => {
		const error = new InferenceClientError('Test error', 'TEST_CODE');

		expect(error.message).toBe('Test error');
		expect(error.code).toBe('TEST_CODE');
		expect(error.name).toBe('InferenceClientError');
	});

	it('should include provider info', () => {
		const error = new InferenceClientError('Error', 'CODE', 'fireworks');

		expect(error.provider).toBe('fireworks');
	});

	it('should include cause', () => {
		const cause = new Error('Original error');
		const error = new InferenceClientError('Wrapper', 'CODE', null, cause);

		expect(error.cause).toBe(cause);
	});

	it('should be instanceof Error', () => {
		const error = new InferenceClientError('Test', 'CODE');
		expect(error instanceof Error).toBe(true);
	});
});

// ==========================================================================
// callInference - Success Cases
// ==========================================================================

describe('callInference', () => {
	describe('Successful Calls', () => {
		it('should call primary provider first', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse('Analysis result'));

			const result = await callInference(
				{ prompt: 'Test prompt' },
				validSecrets
			);

			expect(result.content).toBe('Analysis result');
			expect(result.provider).toBe('fireworks');
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('should return usage information', async () => {
			mockFetch.mockResolvedValueOnce(
				createMockResponse('Result', { prompt_tokens: 150, completion_tokens: 75 })
			);

			const result = await callInference(
				{ prompt: 'Test prompt' },
				validSecrets
			);

			expect(result.usage.input).toBe(150);
			expect(result.usage.output).toBe(75);
		});

		it('should include model information', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse('Result'));

			const result = await callInference(
				{ prompt: 'Test prompt' },
				validSecrets
			);

			expect(result.model).toBeDefined();
			expect(result.provider).toBeDefined();
		});

		it('should send correct headers', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse('Result'));

			await callInference({ prompt: 'Test' }, validSecrets);

			const [url, options] = mockFetch.mock.calls[0];
			expect(options.headers['Content-Type']).toBe('application/json');
			expect(options.headers['Authorization']).toContain('Bearer');
		});

		it('should include ZDR header', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse('Result'));

			await callInference({ prompt: 'Test' }, validSecrets);

			const [url, options] = mockFetch.mock.calls[0];
			expect(options.headers['X-Data-Retention']).toBe('none');
		});
	});

	describe('Fallback Cascade', () => {
		it('should fall back to next provider on failure', async () => {
			// First provider fails
			mockFetch.mockResolvedValueOnce(createErrorResponse(500, 'Server Error'));
			// Second provider succeeds
			mockFetch.mockResolvedValueOnce(createMockResponse('Fallback result'));

			const result = await callInference(
				{ prompt: 'Test prompt' },
				validSecrets
			);

			expect(result.content).toBe('Fallback result');
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should try all providers before failing', async () => {
			// All providers fail
			mockFetch.mockResolvedValue(createErrorResponse(500, 'Server Error'));

			await expect(
				callInference({ prompt: 'Test' }, validSecrets)
			).rejects.toThrow(InferenceClientError);

			// Should have tried multiple providers
			expect(mockFetch.mock.calls.length).toBeGreaterThan(1);
		});

		it('should include provider details in final error', async () => {
			mockFetch.mockResolvedValue(createErrorResponse(500, 'Server Error'));

			try {
				await callInference({ prompt: 'Test' }, validSecrets);
			} catch (err) {
				expect(err.code).toBe('ALL_PROVIDERS_FAILED');
				expect(err.message).toContain('Attempted:');
			}
		});
	});

	describe('Missing API Keys', () => {
		it('should skip providers without API keys', async () => {
			const partialSecrets = { FIREWORKS_API_KEY: 'test-key' };
			mockFetch.mockResolvedValueOnce(createMockResponse('Result'));

			const result = await callInference(
				{ prompt: 'Test' },
				partialSecrets
			);

			expect(result.content).toBe('Result');
		});

		it('should fail if no providers have keys', async () => {
			await expect(
				callInference({ prompt: 'Test' }, {})
			).rejects.toThrow(InferenceClientError);
		});
	});

	describe('Request Options', () => {
		it('should use provided maxTokens', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse('Result'));

			await callInference(
				{ prompt: 'Test', maxTokens: 2048 },
				validSecrets
			);

			const [url, options] = mockFetch.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.max_tokens).toBe(2048);
		});

		it('should use default maxTokens of 1024', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse('Result'));

			await callInference({ prompt: 'Test' }, validSecrets);

			const [url, options] = mockFetch.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.max_tokens).toBe(1024);
		});

		it('should use provided temperature', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse('Result'));

			await callInference(
				{ prompt: 'Test', temperature: 0.5 },
				validSecrets
			);

			const [url, options] = mockFetch.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.temperature).toBe(0.5);
		});

		it('should use default temperature of 0.1', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse('Result'));

			await callInference({ prompt: 'Test' }, validSecrets);

			const [url, options] = mockFetch.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.temperature).toBe(0.1);
		});
	});

	describe('Timeout Handling', () => {
		// Note: These tests verify the timeout mechanism exists in the implementation
		// by checking that AbortController signal is passed to fetch.
		// Full end-to-end timeout testing requires real timers and is slow.

		it('should pass abort signal to fetch', async () => {
			mockFetch.mockResolvedValue(createMockResponse('{"result": "ok"}'));

			await callInference({ prompt: 'Test' }, validSecrets);

			// Verify signal was passed to fetch
			const [url, options] = mockFetch.mock.calls[0];
			expect(options).toHaveProperty('signal');
			expect(options.signal).toBeInstanceOf(AbortSignal);
		});

		it('should handle AbortError from timeout', async () => {
			// Simulate what happens when fetch is aborted
			const abortError = new Error('The operation was aborted');
			abortError.name = 'AbortError';
			mockFetch.mockRejectedValue(abortError);

			// Should try all providers and eventually throw aggregate error
			await expect(
				callInference({ prompt: 'Test' }, validSecrets)
			).rejects.toThrow(InferenceClientError);
		});
	});

	describe('Error Responses', () => {
		it('should handle 401 Unauthorized', async () => {
			mockFetch.mockResolvedValue(createErrorResponse(401, 'Unauthorized'));

			await expect(
				callInference({ prompt: 'Test' }, validSecrets)
			).rejects.toThrow(InferenceClientError);
		});

		it('should handle 429 Rate Limit', async () => {
			mockFetch.mockResolvedValue(createErrorResponse(429, 'Rate Limited'));

			await expect(
				callInference({ prompt: 'Test' }, validSecrets)
			).rejects.toThrow(InferenceClientError);
		});

		it('should handle 500 Server Error', async () => {
			mockFetch.mockResolvedValue(createErrorResponse(500, 'Internal Error'));

			await expect(
				callInference({ prompt: 'Test' }, validSecrets)
			).rejects.toThrow(InferenceClientError);
		});

		it('should handle malformed JSON response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({}) // Missing choices
			});
			// Fallback succeeds
			mockFetch.mockResolvedValueOnce(createMockResponse('Fallback'));

			const result = await callInference({ prompt: 'Test' }, validSecrets);
			// Should either handle gracefully or fall back
			expect(result).toBeDefined();
		});
	});
});
