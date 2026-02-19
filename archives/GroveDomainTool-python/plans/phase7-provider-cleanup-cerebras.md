# Phase 7: Provider Cleanup & Cerebras Integration Plan

## Current State Analysis

Based on my analysis of the codebase, here's what we have:

### Current Provider Architecture

- **TypeScript (Worker)**: 4 providers (Claude, DeepSeek, Kimi, Cloudflare) with factory pattern
- **Python (CLI)**: Same 4 providers plus Mock provider
- **Configuration**: Environment variables for provider selection in both wrangler.toml and config.py
- **Frontend**: Model selector UI for choosing providers per search

### Current Workflow

1. Driver agent generates domain candidates (configurable provider)
2. Swarm agent evaluates candidates (configurable provider)
3. RDAP checker verifies availability (free, no API)
4. Pricing lookup via Cloudflare Registrar API
5. Results stored in Durable Object SQLite

### Issues Identified

1. **Unused Providers**: Claude (too costly), Kimi (never tried), Cloudflare Llama 4 Scout (never tried)
2. **Data Retention**: Direct API calls retain data with providers
3. **Speed**: RDAP checking is slow (rate-limited, sequential)
4. **Complexity**: Multiple provider code paths increase maintenance

## Target Architecture

### Simplified Provider Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     OpenRouter Proxy                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ DeepSeek    │  │ Cerebras    │  │ Other Models        │  │
│  │ V3.2        │  │ GPT-oss 20b │  │ (Future)            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│   Driver Agent  │         │   Task Agent    │
│  (Domain Gen)   │         │ (RDAP Checking) │
└─────────────────┘         └─────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────────────────────────────────────┐
│              Domain Evaluation                  │
│        (Swarm - same as Driver for now)         │
└─────────────────────────────────────────────────┘
```

### Key Changes

1. **Single Provider Interface**: OpenRouter-only provider implementation
2. **Model Selection**: Configured via OpenRouter model IDs
3. **Zero Data Retention**: OpenRouter's privacy policy
4. **Blazing Fast RDAP**: Cerebras GPT-oss 20b (1000+ tokens/sec)
5. **Simplified UI**: Read-only display of active models

## Implementation Plan

### Phase 1: OpenRouter Migration

1. **Create OpenRouter Provider (TypeScript)**
   - Implement `OpenRouterProvider` class in `worker/src/providers/openrouter.ts`
   - Support OpenAI-compatible API (OpenRouter uses same format)
   - Include tool calling support
   - Handle authentication via API key

2. **Create OpenRouter Provider (Python)**
   - Mirror TypeScript implementation in `src/forage/providers/openrouter.py`
   - Maintain same interface as existing providers

3. **Remove Unused Providers**
   - Delete: `anthropic.ts`, `kimi.ts`, `cloudflare.ts` (TypeScript)
   - Delete: `claude.py`, `kimi.py`, `cloudflare.py` (Python)
   - Update imports and factory functions

4. **Update Configuration**
   - `wrangler.toml`: Change `DRIVER_PROVIDER` and `SWARM_PROVIDER` to "openrouter"
   - `config.py`: Update `ModelConfig` to only support "openrouter"
   - Add `OPENROUTER_API_KEY` secret requirement

5. **Test Integration**
   - Test with DeepSeek V3.2 model ID: `deepseek/deepseek-chat`
   - Verify tool calling works
   - Check token usage tracking

### Phase 2: Cerebras Integration

1. **Research Cerebras Models on OpenRouter**
   - Identify fastest model: likely `cerebras/btlm-3b-8k-base` or similar
   - Test latency and token speed
   - Verify pricing

2. **Implement RDAP Replacement with Cerebras**
   - Create `CerebrasRDAPChecker` that uses OpenRouter provider
   - Prompt engineering for domain availability checking
   - Batch processing for speed

3. **Performance Testing**
   - Compare Cerebras vs traditional RDAP
   - Measure tokens/second and cost
   - Validate accuracy

### Phase 3: UI Simplification

1. **Remove Model Selector from Frontend**
   - Update Svelte components to show read-only model info
   - Display: "Driver: DeepSeek V3.2 via OpenRouter"
   - Display: "Task Agent: Cerebras GPT-oss 20b via OpenRouter"

2. **Update API Documentation**
   - Remove `driver_provider` and `swarm_provider` from request body
   - Add note about OpenRouter usage

### Phase 4: Documentation & Testing

1. **Update Documentation**
   - Update `TODOS.md` with completed items
   - Update `README.md` with new architecture
   - Create migration guide for existing users

2. **End-to-End Testing**
   - Full search workflow with new providers
   - Email notifications
   - Follow-up quiz system
   - Cost tracking

## Technical Details

### OpenRouter Provider Implementation

```typescript
// worker/src/providers/openrouter.ts
export class OpenRouterProvider implements AIProvider {
	readonly name = "openrouter";
	readonly defaultModel = "deepseek/deepseek-chat";
	readonly supportsTools = true;

	constructor(
		private env: Env,
		private model?: string,
	) {}

	async generateWithTools(options: GenerateWithToolsOptions): Promise<ProviderResponse> {
		// OpenRouter uses OpenAI-compatible API
		const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.env.OPENROUTER_API_KEY}`,
				"Content-Type": "application/json",
				"HTTP-Referer": "https://forage.grove.place",
				"X-Title": "Forage Domain Search",
			},
			body: JSON.stringify({
				model: this.model || this.defaultModel,
				messages: [
					{ role: "system", content: options.system },
					{ role: "user", content: options.prompt },
				],
				tools: options.tools,
				tool_choice: options.toolChoice,
				max_tokens: options.maxTokens,
				temperature: options.temperature,
			}),
		});

		// Parse response...
	}
}
```

### Cerebras RDAP Checker Concept

```typescript
// worker/src/cerebras-rdap.ts
export class CerebrasRDAPChecker {
	constructor(private provider: OpenRouterProvider) {}

	async checkDomains(domains: string[]): Promise<DomainCheckResult[]> {
		// Batch domains into prompts for Cerebras
		const prompt = `Check if these domains are available: ${domains.join(", ")}`;

		const response = await this.provider.generate({
			prompt,
			model: "cerebras/btlm-3b-8k-base",
			maxTokens: 1000,
			temperature: 0.1,
		});

		// Parse response for availability
		return this.parseCerebrasResponse(response.content, domains);
	}
}
```

## Files to Modify

### TypeScript (Worker)

- `worker/src/providers/openrouter.ts` (NEW)
- `worker/src/providers/index.ts` (Update factory)
- `worker/src/providers/types.ts` (Add OpenRouter type)
- `worker/src/durable-object.ts` (Update provider selection)
- `worker/wrangler.toml` (Update env vars)
- `worker/src/cerebras-rdap.ts` (NEW - optional)

### Python (CLI)

- `src/forage/providers/openrouter.py` (NEW)
- `src/forage/providers/__init__.py` (Update factory)
- `src/forage/config.py` (Update ModelConfig)
- `src/forage/orchestrator.py` (Update provider usage)

### Frontend (GroveEngine)

- `domains/src/lib/components/ModelSelector.svelte` (Remove/update)
- API documentation updates

## Success Criteria

1. **OpenRouter Migration Complete**
   - All AI calls go through OpenRouter
   - DeepSeek V3.2 working as driver
   - Zero data retention achieved

2. **Provider Cleanup Complete**
   - Unused provider files removed
   - Codebase simplified
   - Configuration streamlined

3. **Cerebras Integration Tested**
   - RDAP checking 10x faster
   - Accuracy > 95% compared to traditional RDAP
   - Cost-effective (< $0.01 per search)

4. **UI Simplified**
   - No model selector dropdown
   - Read-only model display
   - Cleaner user experience

## Risks & Mitigations

1. **OpenRouter API Reliability**
   - Mitigation: Implement retry logic with exponential backoff
   - Fallback: Keep direct DeepSeek API as backup (configurable)

2. **Cerebras Accuracy**
   - Mitigation: Run parallel validation with traditional RDAP initially
   - Fallback: Hybrid approach - Cerebras for speed, RDAP for verification

3. **Cost Control**
   - Mitigation: Implement token budgeting per search
   - Monitoring: Add detailed cost tracking per job

## Next Steps

1. Begin implementation with OpenRouter provider
2. Test thoroughly before removing old providers
3. Benchmark Cerebras performance
4. Update frontend once backend is stable

This plan achieves the goals of provider cleanup, privacy improvement via OpenRouter, and performance boost via Cerebras, while simplifying the codebase and user interface.
