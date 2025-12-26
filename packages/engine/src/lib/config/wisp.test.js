/**
 * Wisp Configuration Tests
 *
 * Tests for the Wisp configuration module covering:
 * - Cost calculation with different models
 * - Provider/model ID retrieval
 * - Max token configuration
 * - Rate limiting and cost cap constants
 */

import { describe, it, expect } from 'vitest';
import {
	PROVIDERS,
	MODEL_FALLBACK_CASCADE,
	MODEL_PRICING,
	MAX_CONTENT_LENGTH,
	MAX_OUTPUT_TOKENS,
	RATE_LIMIT,
	COST_CAP,
	PROMPT_MODES,
	calculateCost,
	getModelId,
	getProvider,
	getMaxTokens
} from './wisp.js';

// ==========================================================================
// Provider Configuration
// ==========================================================================

describe('PROVIDERS', () => {
	it('should have fireworks as primary provider', () => {
		expect(PROVIDERS.fireworks).toBeDefined();
		expect(PROVIDERS.fireworks.role).toBe('primary');
		expect(PROVIDERS.fireworks.baseUrl).toContain('fireworks.ai');
	});

	it('should have cerebras as backup provider', () => {
		expect(PROVIDERS.cerebras).toBeDefined();
		expect(PROVIDERS.cerebras.role).toBe('backup');
	});

	it('should have groq as tertiary provider', () => {
		expect(PROVIDERS.groq).toBeDefined();
		expect(PROVIDERS.groq.role).toBe('tertiary');
	});

	it('should have ZDR enabled for all providers', () => {
		Object.values(PROVIDERS).forEach((provider) => {
			expect(provider.zdr).toBe(true);
		});
	});

	it('should have valid base URLs', () => {
		Object.values(PROVIDERS).forEach((provider) => {
			expect(provider.baseUrl).toMatch(/^https:\/\//);
		});
	});
});

// ==========================================================================
// Model Fallback Cascade
// ==========================================================================

describe('MODEL_FALLBACK_CASCADE', () => {
	it('should be an array of provider/model pairs', () => {
		expect(Array.isArray(MODEL_FALLBACK_CASCADE)).toBe(true);
		expect(MODEL_FALLBACK_CASCADE.length).toBeGreaterThan(0);
	});

	it('should start with fireworks (primary)', () => {
		expect(MODEL_FALLBACK_CASCADE[0].provider).toBe('fireworks');
	});

	it('should have valid provider references', () => {
		MODEL_FALLBACK_CASCADE.forEach((item) => {
			expect(PROVIDERS[item.provider]).toBeDefined();
		});
	});

	it('should have deepseek-v3.2 as first model', () => {
		expect(MODEL_FALLBACK_CASCADE[0].model).toBe('deepseek-v3.2');
	});
});

// ==========================================================================
// Cost Calculation
// ==========================================================================

describe('calculateCost', () => {
	describe('Basic Calculations', () => {
		it('should calculate cost for deepseek-v3.2', () => {
			const cost = calculateCost('deepseek-v3.2', 1000, 500);
			expect(cost).toBeGreaterThan(0);
			expect(cost).toBeLessThan(0.01); // Should be very cheap
		});

		it('should calculate cost for kimi-k2', () => {
			const cost = calculateCost('kimi-k2', 1000, 500);
			expect(cost).toBeGreaterThan(0);
		});

		it('should calculate cost for llama models', () => {
			const cost1 = calculateCost('llama-3.1-70b', 1000, 500);
			const cost2 = calculateCost('llama-3.3-70b', 1000, 500);
			expect(cost1).toBeGreaterThan(0);
			expect(cost2).toBeGreaterThan(0);
		});

		it('should return 0 for zero tokens', () => {
			const cost = calculateCost('deepseek-v3.2', 0, 0);
			expect(cost).toBe(0);
		});
	});

	describe('Precision', () => {
		it('should round to avoid floating point errors', () => {
			// Test with values that might cause precision issues
			const cost = calculateCost('deepseek-v3.2', 333, 777);
			// Result should not have excessive decimal places
			const decimalPlaces = (cost.toString().split('.')[1] || '').length;
			expect(decimalPlaces).toBeLessThanOrEqual(6);
		});

		it('should handle large token counts', () => {
			const cost = calculateCost('deepseek-v3.2', 100000, 50000);
			expect(cost).toBeGreaterThan(0);
			expect(typeof cost).toBe('number');
			expect(Number.isFinite(cost)).toBe(true);
		});
	});

	describe('Unknown Models', () => {
		it('should fall back to deepseek-v3.2 pricing for unknown models', () => {
			const knownCost = calculateCost('deepseek-v3.2', 1000, 500);
			const unknownCost = calculateCost('unknown-model', 1000, 500);
			expect(unknownCost).toBe(knownCost);
		});
	});

	describe('Real-World Scenarios', () => {
		it('should calculate typical grammar check cost', () => {
			// Typical blog post: ~2000 words = ~2500 tokens input, ~1000 tokens output
			const cost = calculateCost('deepseek-v3.2', 2500, 1000);
			expect(cost).toBeLessThan(0.01); // Should be < 1 cent
		});

		it('should calculate thorough analysis cost', () => {
			// Thorough: same input, 2x output
			const cost = calculateCost('deepseek-v3.2', 2500, 2000);
			expect(cost).toBeLessThan(0.02);
		});

		it('should stay under monthly cap with reasonable usage', () => {
			// 1000 requests at ~$0.005 each
			const singleCost = calculateCost('deepseek-v3.2', 2500, 1000);
			const monthlyCost = singleCost * 1000;
			expect(monthlyCost).toBeLessThan(COST_CAP.maxCostUSD);
		});
	});
});

// ==========================================================================
// Model ID Retrieval
// ==========================================================================

describe('getModelId', () => {
	it('should return correct model ID for fireworks/deepseek', () => {
		const modelId = getModelId('fireworks', 'deepseek-v3.2');
		expect(modelId).toContain('deepseek');
		expect(modelId).toContain('accounts/fireworks/models');
	});

	it('should return correct model ID for cerebras/llama', () => {
		// Cerebras uses llama-3.3-70b, not 3.1
		const modelId = getModelId('cerebras', 'llama-3.3-70b');
		expect(modelId).toContain('llama');
	});

	it('should return null for unknown provider', () => {
		const modelId = getModelId('unknown', 'deepseek-v3.2');
		expect(modelId).toBeNull();
	});

	it('should return null for unknown model', () => {
		const modelId = getModelId('fireworks', 'unknown-model');
		expect(modelId).toBeNull();
	});

	it('should return null for null/undefined inputs', () => {
		expect(getModelId(null, 'deepseek-v3.2')).toBeNull();
		expect(getModelId('fireworks', null)).toBeNull();
	});
});

// ==========================================================================
// Provider Retrieval
// ==========================================================================

describe('getProvider', () => {
	it('should return provider config for valid provider', () => {
		const provider = getProvider('fireworks');
		expect(provider).toBeDefined();
		expect(provider.name).toBe('Fireworks AI');
		expect(provider.baseUrl).toBeDefined();
	});

	it('should return null for unknown provider', () => {
		const provider = getProvider('unknown');
		expect(provider).toBeNull();
	});

	it('should return null for null/undefined', () => {
		expect(getProvider(null)).toBeNull();
		expect(getProvider(undefined)).toBeNull();
	});
});

// ==========================================================================
// Max Tokens
// ==========================================================================

describe('getMaxTokens', () => {
	describe('Grammar Action', () => {
		it('should return quick tokens for grammar/quick', () => {
			const tokens = getMaxTokens('grammar', 'quick');
			expect(tokens).toBe(MAX_OUTPUT_TOKENS.grammar.quick);
		});

		it('should return thorough tokens for grammar/thorough', () => {
			const tokens = getMaxTokens('grammar', 'thorough');
			expect(tokens).toBe(MAX_OUTPUT_TOKENS.grammar.thorough);
		});
	});

	describe('Tone Action', () => {
		it('should return quick tokens for tone/quick', () => {
			const tokens = getMaxTokens('tone', 'quick');
			expect(tokens).toBe(MAX_OUTPUT_TOKENS.tone.quick);
		});

		it('should return thorough tokens for tone/thorough', () => {
			const tokens = getMaxTokens('tone', 'thorough');
			expect(tokens).toBe(MAX_OUTPUT_TOKENS.tone.thorough);
		});
	});

	describe('Readability Action', () => {
		it('should return 0 for readability (no AI call)', () => {
			const tokens = getMaxTokens('readability', 'quick');
			expect(tokens).toBe(0);
		});
	});

	describe('Default Behavior', () => {
		it('should default to quick mode', () => {
			const tokens = getMaxTokens('grammar');
			expect(tokens).toBe(MAX_OUTPUT_TOKENS.grammar.quick);
		});

		it('should return 1024 for unknown action', () => {
			const tokens = getMaxTokens('unknown', 'quick');
			expect(tokens).toBe(1024);
		});
	});
});

// ==========================================================================
// Constants Validation
// ==========================================================================

describe('Constants', () => {
	describe('MAX_CONTENT_LENGTH', () => {
		it('should be a reasonable limit', () => {
			expect(MAX_CONTENT_LENGTH).toBeGreaterThan(10000);
			expect(MAX_CONTENT_LENGTH).toBeLessThan(100000);
		});
	});

	describe('RATE_LIMIT', () => {
		it('should have max requests per hour', () => {
			expect(RATE_LIMIT.maxRequestsPerHour).toBeGreaterThan(0);
			expect(RATE_LIMIT.maxRequestsPerHour).toBeLessThanOrEqual(20);
		});

		it('should have window in seconds', () => {
			expect(RATE_LIMIT.windowSeconds).toBe(3600); // 1 hour
		});
	});

	describe('COST_CAP', () => {
		it('should be enabled', () => {
			expect(COST_CAP.enabled).toBe(true);
		});

		it('should have reasonable monthly cap', () => {
			expect(COST_CAP.maxCostUSD).toBeGreaterThan(0);
			expect(COST_CAP.maxCostUSD).toBeLessThanOrEqual(10);
		});

		it('should have warning threshold', () => {
			expect(COST_CAP.warningThreshold).toBeGreaterThan(0);
			expect(COST_CAP.warningThreshold).toBeLessThan(1);
		});
	});

	describe('PROMPT_MODES', () => {
		it('should have quick mode', () => {
			expect(PROMPT_MODES.quick).toBeDefined();
			expect(PROMPT_MODES.quick.name).toBe('Quick');
		});

		it('should have thorough mode', () => {
			expect(PROMPT_MODES.thorough).toBeDefined();
			expect(PROMPT_MODES.thorough.name).toBe('Thorough');
		});

		it('should have different temperatures', () => {
			expect(PROMPT_MODES.quick.temperature).toBeLessThan(
				PROMPT_MODES.thorough.temperature
			);
		});
	});

	describe('MODEL_PRICING', () => {
		it('should have pricing for all models in cascade', () => {
			MODEL_FALLBACK_CASCADE.forEach((item) => {
				expect(MODEL_PRICING[item.model]).toBeDefined();
			});
		});

		it('should have input and output pricing', () => {
			Object.values(MODEL_PRICING).forEach((pricing) => {
				expect(pricing.input).toBeGreaterThan(0);
				expect(pricing.output).toBeGreaterThan(0);
			});
		});
	});
});
