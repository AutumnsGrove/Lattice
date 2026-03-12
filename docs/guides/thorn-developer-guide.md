---
title: "Thorn Developer Guide"
description: "Content moderation system with behavioral and AI layers for Grove."
lastUpdated: "2026-03-12"
type: "dev-guide"
---

# Thorn Developer Guide

Thorn is Grove's content moderation system. It runs in two layers: a fast deterministic layer that checks behavioral signals (labels, rate limits, content patterns), followed by an AI layer that classifies content through Lumen inference. The behavioral layer runs in under 1ms. The AI layer takes around 500ms and costs roughly $0.001 per call.

This guide covers how to work with Thorn day-to-day: adding rules, wiring up new content flows, understanding feature flags, and debugging common issues.

## Architecture overview

Content flows through Thorn in this order:

```
User action (publish, comment, edit, etc.)
        |
        v
  1. Threshold rate check          <1ms, requires userId
        |
        v
  2. Behavioral rule evaluation    <1ms, 1-2 D1 queries
        |
        v
  3. AI moderation (Lumen)         ~500ms, ~$0.001
        |
        v
  4. Post-AI label updates         labels for escalation
```

Steps 1 and 2 form the behavioral layer. If a behavioral rule matches with `skipAI: true`, step 3 is skipped entirely (saving the cost and latency). A sampling passthrough mechanism sends a configurable percentage of skipped events through AI anyway, for accuracy monitoring.

Anonymous content (no `userId`) skips the behavioral layer and goes straight to AI moderation. Label-based conditions and rate checks require a user identity to function.

### The never-throw guarantee

`moderatePublishedContent()` wraps everything in a try/catch and logs errors to console. It is designed to run inside `platform.context.waitUntil()`, so failures never affect the user's request. Every function in the behavioral layer follows the same pattern: catch errors, log them, return a safe default.

## Key files

| File | Purpose |
|------|---------|
| `libs/engine/src/lib/thorn/hooks.ts` | Main integration point. `moderatePublishedContent()` orchestrates the full pipeline. |
| `libs/engine/src/lib/thorn/moderate.ts` | Core AI moderation. Calls Lumen and maps results through threshold config. |
| `libs/engine/src/lib/thorn/config.ts` | AI threshold configuration. Per-content-type category/confidence/action mappings. |
| `libs/engine/src/lib/thorn/logging.ts` | D1 logging for moderation events and flagged content. Dashboard read queries. |
| `libs/engine/src/lib/thorn/types.ts` | Core types: `ThornContentType`, `ThornAction`, `ThornHookPoint`, `ThornResult`. |
| `libs/engine/src/lib/thorn/behavioral/rules.ts` | Behavioral rule definitions. This is where you add new rules. |
| `libs/engine/src/lib/thorn/behavioral/evaluate.ts` | Rule evaluation engine. First-match-wins, condition AND logic. |
| `libs/engine/src/lib/thorn/behavioral/labels.ts` | Entity label CRUD. `addLabel`, `removeLabel`, `getEntityLabels`, `hasLabel`. |
| `libs/engine/src/lib/thorn/behavioral/rate-check.ts` | Bridges Threshold SDK rate limits into Thorn's label system. |
| `libs/engine/src/lib/thorn/behavioral/types.ts` | Behavioral types: `BehavioralRule`, `BehavioralCondition`, `BehavioralContext`. |
| `libs/engine/src/lib/thorn/behavioral/behavioral.test.ts` | 49 behavioral layer tests. |

### Database tables

| Table | Migration | Purpose |
|-------|-----------|---------|
| `thorn_moderation_log` | 044 | Every moderation decision (including allows). Audit trail. |
| `thorn_flagged_content` | 044 | Review queue for flagged/blocked content. |
| `thorn_entity_labels` | 090 | Persistent labels on entities (users, IPs, email domains). Composite PK: `(tenant_id, entity_type, entity_id, label)`. |

## How to add a behavioral rule

Behavioral rules live in `libs/engine/src/lib/thorn/behavioral/rules.ts` as a typed array. Rules are evaluated in order, and the first match wins.

### Rule structure

```typescript
{
  name: "my_new_rule",               // Unique identifier, used in logs
  description: "What this rule does", // Human-readable
  contentTypes: ["blog_post", "comment"], // Which content types it applies to
  conditions: [                       // ALL conditions must match (AND logic)
    { type: "has_label", label: "thorn:some_label" },
    { type: "account_age_below", hours: 48 },
  ],
  action: "flag_review",             // "allow" | "warn" | "flag_review" | "block"
  applyLabel: {                       // Optional: attach a label when this rule fires
    label: "thorn:my_label",
    expiresInHours: 72,               // Omit for permanent labels
  },
  skipAI: false,                      // true = skip AI inference on match
  samplingRate: 0.05,                 // Only relevant when skipAI is true
  enabled: true,                      // Set to false to disable without removing
}
```

### Available condition types

| Condition | Fields | What it checks |
|-----------|--------|----------------|
| `has_label` | `label: string` | Entity has this active (non-expired) label |
| `not_has_label` | `label: string` | Entity does not have this label |
| `account_age_below` | `hours: number` | Account was created less than N hours ago |
| `content_has_links` | `min: number` | Content contains at least N links (http/https/www) |
| `content_length_below` | `chars: number` | Content is shorter than N characters |
| `content_length_above` | `chars: number` | Content is longer than N characters |

All conditions in a rule use AND logic. If you need OR logic, create separate rules for each case.

### Adding a new condition type

If the existing condition types are not sufficient:

1. Add the new variant to `BehavioralCondition` in `behavioral/types.ts`.
2. Add a case to `evaluateCondition()` in `behavioral/evaluate.ts`.
3. If the condition needs data not in `BehavioralContext`, add the field to that interface and pass it from `hooks.ts`.
4. Write tests in `behavioral/behavioral.test.ts`.

Unknown condition types fail closed (return `false`, so the rule does not match).

### Rule ordering matters

Rules are checked top to bottom. The current order is:

1. `repeat_offender_block` - Block known bad actors immediately
2. `trusted_user_pass` - Let trusted users skip AI (with 5% sampling)
3. `new_account_link_spam` - Flag new accounts posting link-heavy content
4. `empty_content_pass` - Skip AI for content under 3 characters

If you add a rule that should take priority over trusted user passthrough (like blocking a compromised trusted account), place it above `trusted_user_pass`.

## Hooking Thorn into new content flows

The main integration point is `moderatePublishedContent()` from `hooks.ts`. Call it inside `waitUntil()` so moderation runs asynchronously after the response is sent.

### Minimal integration

```typescript
import { moderatePublishedContent } from "@autumnsgrove/lattice/thorn";

// Inside your request handler:
platform.context.waitUntil(
  moderatePublishedContent({
    content: postBody,
    db,
    tenantId,
    contentType: "blog_post",
    hookPoint: "on_publish",
    contentRef: postSlug,
    // AI bindings
    ai: platform.env.AI,
    openrouterApiKey: platform.env.OPENROUTER_API_KEY,
    // User identity (required for behavioral rules)
    userId: session.userId,
  })
);
```

### Full integration with behavioral features

To enable rate limiting and abuse escalation, pass the optional `threshold` and `abuseKV` parameters:

```typescript
platform.context.waitUntil(
  moderatePublishedContent({
    content: postBody,
    db,
    tenantId,
    userId: session.userId,
    contentType: "comment",
    hookPoint: "on_comment",
    contentRef: `post/${postSlug}/comment/${commentId}`,
    ai: platform.env.AI,
    openrouterApiKey: platform.env.OPENROUTER_API_KEY,
    // Behavioral layer options
    threshold,                          // Threshold SDK instance
    abuseKV: platform.env.ABUSE_KV,    // KV namespace for abuse tracking
    accountCreatedAt: user.createdAt,   // ISO string, for account-age rules
  })
);
```

### What each optional parameter unlocks

| Parameter | What it enables | Without it |
|-----------|----------------|------------|
| `threshold` | Rate limiting via Threshold SDK, `thorn:rapid_poster` labels | Rate checks are skipped entirely |
| `abuseKV` | Abuse escalation bridging (5+ violations in 24h triggers `thorn:repeat_offender`) | Rate limit violations are logged, no escalation |
| `accountCreatedAt` | `account_age_below` condition in behavioral rules | Account-age conditions always return false (rule won't match) |
| `userId` | All behavioral rules, label operations, rate checks | Behavioral layer is skipped, content goes straight to AI |

### Hook points and content types

Hook points map to Threshold endpoint keys for rate limiting:

| Hook Point | Endpoint Key | Content Types |
|------------|-------------|---------------|
| `on_publish` | `posts/create` | `blog_post` |
| `on_edit` | `posts/update` | `blog_post` |
| `on_comment` | `comments/create` | `comment` |
| `on_profile_update` | `default` | `profile_bio` |
| `on_dm_send` | `default` | `dm_message` |

The valid content types are: `blog_post`, `comment`, `profile_bio`, `dm_message`.

## Feature flags

Two feature flags control Thorn:

| Flag | Controls | Effect when disabled |
|------|----------|---------------------|
| `thorn_moderation` | The AI moderation layer | AI inference is skipped. Behavioral rules still run if `thorn_behavioral` is on. |
| `thorn_behavioral` | The behavioral layer (labels, rate checks, rules) | Behavioral checks are skipped. Content goes directly to AI moderation. |

Both flags can be enabled independently. The typical rollout path is:

1. Enable `thorn_behavioral` first, with all rules set to `skipAI: false` so AI still runs.
2. Once behavioral accuracy looks good, flip specific rules to `skipAI: true`.
3. `thorn_moderation` controls the overall system. Disabling it turns off everything.

When `thorn_moderation` is disabled, `thorn_behavioral` has no effect because the entire moderation pipeline is skipped.

## Entity labels

Labels are persistent tags on entities (users, IPs, email domains) that give Thorn memory across events. They are stored in D1, scoped per tenant, and can optionally expire.

### Built-in labels

| Label | Applied by | Meaning | Expiry |
|-------|-----------|---------|--------|
| `thorn:repeat_offender` | Escalation rule or abuse bridge | 3+ AI blocks in 30 days, or 5+ rate limit violations in 24h | Permanent (escalation) or 24h (abuse bridge) |
| `thorn:trusted` | Wayfinder (admin) only | User skips AI moderation (5% sampling) | Permanent until removed |
| `thorn:rapid_poster` | Rate check bridge | User exceeded rate limit | 1 hour |
| `thorn:blocked_content` | Post-AI label update | AI blocked the user's content | 90 days |
| `thorn:suspicious_new_account` | `new_account_link_spam` rule | New account posted link-heavy content | 72 hours |

### Label naming convention

Labels must be lowercase alphanumeric with colons, underscores, and hyphens. Maximum 64 characters. System labels use the `thorn:` prefix.

### Label operations

```typescript
import {
  addLabel,
  removeLabel,
  hasLabel,
  getEntityLabels,
  cleanupExpiredLabels,
} from "@autumnsgrove/lattice/thorn";

// Add a label with a 72-hour TTL
await addLabel(db, tenantId, "user", userId, "thorn:my_label", {
  addedBy: "my_rule_name",
  expiresInHours: 72,
  reason: "Triggered by custom check",
});

// Check for a label
const isTrusted = await hasLabel(db, tenantId, "user", userId, "thorn:trusted");

// Remove a label
await removeLabel(db, tenantId, "user", userId, "thorn:my_label");

// Get all active labels for a user
const labels = await getEntityLabels(db, tenantId, "user", userId);

// Periodic cleanup (call from a cron trigger)
const deleted = await cleanupExpiredLabels(db);
```

### The safeHours pattern

SQLite's `datetime('now', '+N hours')` modifier cannot be parameterized. The `safeHours()` function clamps the hours value to a bounded integer (1 to 8760) before interpolation. This is the same pattern used by `safeDays()` in `logging.ts`. If you add any new datetime modifier interpolations, follow this pattern.

## AI layer configuration

The AI layer in `config.ts` maps Lumen moderation categories to actions per content type. Two global thresholds act as guardrails:

- Below 0.4 confidence: always allow (the model is uncertain)
- Above 0.95 confidence: always block (the model is very certain)

Between those bounds, per-content-type thresholds determine the action. Blog posts are the most permissive (self-expression). Comments and DMs are stricter (they affect other people directly).

To adjust sensitivity, edit the thresholds in `THORN_CONFIG` inside `config.ts`. The thresholds are checked in order per content type, first match wins.

## Why things break

### "Behavioral rules aren't firing"

Most common cause: `userId` is not being passed to `moderatePublishedContent()`. Without a userId, the entire behavioral layer is skipped. Anonymous content goes straight to AI.

Second most common: the `thorn_behavioral` feature flag is not enabled for the tenant.

### "Rate limiting isn't working"

The `threshold` parameter must be passed to `moderatePublishedContent()`. If it is omitted, rate checks are skipped. Check that you are constructing the Threshold instance correctly in the request handler.

### "Labels seem stale or expired labels still match"

The `getEntityLabels()` query filters expired labels at read time (`WHERE expires_at IS NULL OR expires_at > datetime('now')`), so expired labels should never affect decisions. If they do, check that the D1 worker's clock is not significantly skewed.

The `cleanupExpiredLabels()` function physically deletes expired rows. It should run on a daily cron trigger to keep the table clean. If the table is growing unexpectedly, check that the cleanup cron is running.

### "AI moderation is slow or failing"

AI moderation goes through Lumen with a fallback chain: GPT-oss Safeguard 20B (primary), LlamaGuard 4 12B (fallback), DeepSeek V3.2 (last resort). If all three fail, the error is caught and logged. The user's request is never blocked by a moderation failure.

If AI moderation consistently fails, check the `ai` binding (Cloudflare AI) and `openrouterApiKey` in the environment. The Lumen client defaults to Cloudflare AI when no OpenRouter key is provided.

### "A rule matches when it shouldn't"

Rules use AND logic for conditions, and the array is evaluated first-match-wins. If a rule is matching unexpectedly, check the rule order in `BEHAVIORAL_RULES`. A rule higher in the list might be catching events before your intended rule.

Also check label state. A user might have accumulated labels from previous events that cause unexpected rule matches. Use `getEntityLabelDetails()` to inspect the full label history for an entity.

### "Sampling passthrough sends too many events to AI"

The `samplingRate` on a rule uses `crypto.getRandomValues()` (not `Math.random()`) to prevent attackers from predicting the sampling schedule. A rate of 0.05 means roughly 5% of matched events still go through AI. The behavioral decision stands regardless of the AI result. If 5% is too high, lower the sampling rate. Setting it to 0 disables sampling entirely.

## Quick checklist

When adding a new content flow to Thorn:

- [ ] Pick or define the `ThornContentType` (add to `types.ts` if new)
- [ ] Pick or define the `ThornHookPoint` (add to `types.ts` if new)
- [ ] If using rate limiting, add the hook-to-endpoint mapping in `rate-check.ts` (`HOOK_ENDPOINT_MAP`)
- [ ] Call `moderatePublishedContent()` inside `waitUntil()` in your request handler
- [ ] Pass `userId` if available (required for behavioral rules)
- [ ] Pass `threshold` if rate limiting is needed
- [ ] Pass `abuseKV` if abuse escalation is needed
- [ ] Pass `accountCreatedAt` if account-age rules should apply
- [ ] Check that existing behavioral rules include your new content type in their `contentTypes` array
- [ ] Verify the `thorn_behavioral` and `thorn_moderation` feature flags are enabled for your tenant
- [ ] Run the behavioral tests: `uv run pytest` is not relevant here, use the project test runner for `behavioral.test.ts`

When adding a new behavioral rule:

- [ ] Add the rule definition to `BEHAVIORAL_RULES` in `rules.ts`
- [ ] Place it at the right position in the array (order matters, first match wins)
- [ ] Set `enabled: true`
- [ ] If the rule introduces a new condition type, update `BehavioralCondition` in `types.ts` and `evaluateCondition()` in `evaluate.ts`
- [ ] Write tests in `behavioral.test.ts`
- [ ] If the rule applies a label, ensure the label name follows the `thorn:` prefix convention

## Related documentation

| Document | What it covers |
|----------|---------------|
| `docs/specs/thorn-spec.md` | Full system spec, privacy model, AI model chain, category mappings |
| `docs/specs/thorn-behavioral-spec.md` | Behavioral layer spec, entity label schema, Threshold SDK integration, Osprey inspiration |
