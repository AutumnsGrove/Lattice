# Forage Worker Update: DeepSeek v3.2 via OpenRouter (Primary with Fallback)

## Overview

Update the Forage Worker to use **DeepSeek v3.2 exclusively via OpenRouter** as the primary provider, while keeping DeepSeek direct as a fallback option for zero-data-retention compliance.

## Critical Model Identifier

**IMPORTANT**: On OpenRouter, you MUST use the explicit model identifier:

```
deepseek/deepseek-v3.2
```

**DO NOT USE** `deepseek/deepseek-chat` - that defaults to DeepSeek v3 on OpenRouter, NOT v3.2.

## Implementation Plan

### Phase 1: Provider Configuration Updates (High Priority)

#### Task 1: Update Provider Defaults

**File**: `worker/src/providers/index.ts`

- Lock both DRIVER and SWARM models to `deepseek/deepseek-v3.2`
- Set OpenRouter as default provider
- Keep DeepSeek direct as fallback option
- Update PROVIDER_DEFAULTS to reflect hierarchy

```typescript
export const PROVIDER_DEFAULTS: Record<ProviderName, string> = {
	deepseek: "deepseek-chat", // Fallback only
	openrouter: "deepseek/deepseek-v3.2", // Primary
};
```

#### Task 2: Update API Endpoints

**File**: `worker/src/index.ts`

- Remove provider validation logic from `/api/search` and `/api/vibe`
- Hardcode provider to "openrouter" in request forwarding
- Remove provider override parameters from request handling
- Simplify request validation

#### Task 3: Update Durable Object

**File**: `worker/src/durable-object.ts`

- Default both driver and swarm providers to OpenRouter
- Keep DeepSeek direct as fallback if OpenRouter fails
- Update provider initialization logic
- Remove job-level provider override logic

### Phase 2: Configuration Updates (Medium Priority)

#### Task 4: Update Environment Configuration

**File**: `worker/wrangler.toml`

- Set DRIVER_PROVIDER = "openrouter" (default)
- Set SWARM_PROVIDER = "openrouter" (default)
- Keep DEEPSEEK_API_KEY for fallback usage
- Update comments to reflect primary/fallback hierarchy

#### Task 5: Update Type Definitions

**File**: `worker/src/types.ts`

- Remove provider override options from API request types
- Update environment bindings to keep DEEPSEEK_API_KEY
- Simplify SearchJob interface (remove provider overrides)
- Update provider selection comments

### Phase 3: Documentation Updates (Low Priority)

#### Task 6: Update Documentation Files

**Files**:

- `worker/DEPLOY.md`
- `worker/COMMANDS.txt`
- `worker/wrangler.toml` comments

**Changes**:

- Update API key documentation (OPENROUTER primary, DEEPSEEK fallback)
- Update provider selection comments
- Add ZDR compliance messaging
- Update deployment instructions

#### Task 7: Update Error Messages and Comments

**Files**: Multiple source files

- Update console.log messages to reference OpenRouter as default
- Update error messages to include fallback context
- Update code comments to reflect provider hierarchy
- Add ZDR compliance references

## Expected Behavior

### Primary Path (Normal Operation)

1. Worker uses OpenRouter as default provider
2. Model identifier: `deepseek/deepseek-v3.2`
3. API calls go through OpenRouter endpoint
4. Zero data retention compliance maintained

### Fallback Path (If OpenRouter Unavailable)

1. If OpenRouter API fails, system can fall back to DeepSeek direct
2. Model: `deepseek-chat` (serves v3.2 on DeepSeek platform)
3. Maintains service availability
4. Logs fallback usage for monitoring

## Files to Update

### Core Provider Files

- `worker/src/providers/index.ts` - Provider defaults and factory
- `worker/src/providers/openrouter.ts` - OpenRouter implementation
- `worker/src/providers/deepseek.ts` - Keep for fallback

### API and Routing

- `worker/src/index.ts` - Main API endpoints
- `worker/src/durable-object.ts` - Job orchestration logic

### Configuration

- `worker/wrangler.toml` - Environment variables
- `worker/src/types.ts` - Type definitions

### Documentation

- `worker/DEPLOY.md` - Deployment guide
- `worker/COMMANDS.txt` - Command reference

## Testing Checklist

After implementation, verify:

- [ ] Worker defaults to OpenRouter for all requests
- [ ] Model identifier is `deepseek/deepseek-v3.2` on OpenRouter
- [ ] DeepSeek direct available as fallback option
- [ ] API endpoints accept requests without provider parameters
- [ ] Environment variables default to OpenRouter
- [ ] Error messages reference correct providers
- [ ] Documentation reflects new provider hierarchy
- [ ] ZDR compliance messaging in place

## Deployment Coordination

This worker update must be deployed **before** or **at the same time as** the GroveEngine frontend changes to avoid:

- Frontend sending provider="openrouter" to a worker that doesn't support it
- Model identifier mismatch
- Breaking the Forage service

## Provider Hierarchy Summary

```
Primary: OpenRouter + deepseek/deepseek-v3.2
  ↓ (fallback if unavailable)
Fallback: DeepSeek Direct + deepseek-chat
```

This maintains zero-data-retention compliance through OpenRouter while providing redundancy through the DeepSeek direct fallback.

---

**Generated**: 2026-01-02
**GroveEngine Commit**: 5ffa49a (fix: use correct OpenRouter model identifier for DeepSeek v3.2)
