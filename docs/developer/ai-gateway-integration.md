# AI Gateway Integration

> *Central observability and per-tenant quota management for all AI features in Grove.*

All AI features in Grove route through Cloudflare AI Gateway. This provides central observability, per-tenant quotas, cost attribution, and fallback routing.

---

## Architecture

```
User → Grove Worker → Cloudflare AI Gateway → OpenRouter → AI Providers
                 ↑              ↑
           Heartwood      Rate Limits
           (tenant)       + Logging
```

### What This Gives Us

- **Central observability** — One dashboard for all AI usage
- **Per-tenant quotas** — Enforce limits based on pricing tiers
- **Cost attribution** — Know which tenants consume what
- **Fallback routing** — Resilience when upstream providers fail
- **Guardrails** — Content filtering before requests hit providers

---

## Setup

### 1. Create Gateway

In Cloudflare Dashboard: **AI** → **AI Gateway** → **Create Gateway**

Name it `grove-production` and note your `gateway_id` and `account_id`.

### 2. Environment Variables

```toml
# wrangler.toml
[vars]
CF_ACCOUNT_ID = "your-account-id"
CF_GATEWAY_ID = "grove-production"

# In secrets (wrangler secret put)
# CF_AIG_TOKEN = "your-aig-token"
```

---

## Usage

### The AI Client

```typescript
import { TenantContext } from '@grove/heartwood';

interface AIRequestOptions {
  tenant: TenantContext;
  feature: string;  // 'post-summary', 'alt-text', etc.
  userId?: string;
}

const baseUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}`;

const response = await fetch(`${baseUrl}/compat/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'cf-aig-authorization': `Bearer ${aigToken}`,
    'cf-aig-metadata': JSON.stringify({
      tenant_id: options.tenant.id,
      tenant_tier: options.tenant.pricingTier,
      feature: options.feature,
    }),
  },
  body: JSON.stringify({
    model: `openrouter/${model}`,
    messages,
    max_tokens: 4096,
  }),
});
```

---

## Per-Tenant Quotas

Quotas are enforced in the Worker before requests hit the gateway:

```typescript
const quotas = {
  seedling: { monthly: 0, maxTokensPerRequest: 0 },
  oak: { monthly: 50, maxTokensPerRequest: 4096 },
  evergreen: { monthly: 200, maxTokensPerRequest: 8192 },
  centennial: { monthly: 500, maxTokensPerRequest: 16384 },
};

async function checkQuota(tenant: TenantContext, db: D1Database) {
  const quota = quotas[tenant.pricingTier];
  if (!quota.monthly) return { allowed: false, reason: 'NO_AI_ACCESS' };

  const usage = await getMonthlyUsage(db, tenant.id);
  if (usage >= quota.monthly) return { allowed: false, reason: 'QUOTA_EXCEEDED' };

  return { allowed: true, remaining: quota.monthly - usage };
}
```

### Pricing Tier Features

| Tier | Monthly Requests | Max Tokens | Features |
|------|------------------|------------|----------|
| Seedling | 0 | — | No AI |
| Oak | 50 | 4,096 | Alt-text, summaries |
| Evergreen | 200 | 8,192 | + Writing assistance |
| Centennial | 500 | 16,384 | + All features |

---

## Observability

### Cloudflare Dashboard

AI Gateway provides:
- Request/response logging
- Latency metrics
- Token usage tracking
- Error rates by provider

### Custom Logging

Log to D1 for per-tenant analytics:

```typescript
await db.prepare(`
  INSERT INTO ai_usage (tenant_id, feature, model, tokens, cost, timestamp)
  VALUES (?, ?, ?, ?, ?, ?)
`).bind(tenantId, feature, model, tokens, cost, Date.now()).run();
```

---

## Error Handling

### Graceful Degradation

```typescript
try {
  const result = await ai.chat(messages, model, options);
  return { success: true, result };
} catch (error) {
  if (error instanceof QuotaExceededError) {
    return { success: false, reason: 'quota_exceeded', message: 'AI limit reached for this month' };
  }
  if (error instanceof RateLimitError) {
    return { success: false, reason: 'rate_limited', message: 'Try again in a moment' };
  }
  // Log and return generic error
  console.error('AI error:', error);
  return { success: false, reason: 'ai_unavailable', message: 'AI features temporarily unavailable' };
}
```

### User-Facing Messages

| Error | Message |
|-------|---------|
| Quota exceeded | "You've used all your AI requests for this month. Upgrade for more." |
| Rate limited | "Please wait a moment before trying again." |
| Provider error | "AI features are temporarily unavailable. Your content is saved." |

---

## Best Practices

1. **Always include tenant metadata** — Every request needs tenant_id and tier
2. **Check quotas before calling** — Don't waste gateway requests on denied users
3. **Handle failures gracefully** — AI is optional, never block core functionality
4. **Log everything** — You'll need usage data for billing and debugging
5. **Use appropriate models** — Don't use expensive models for simple tasks

---

*The full integration guide is at `docs/grove-ai-gateway-integration.md`.*
