# Thorn — Content Moderation

> *Every rose has thorns for protection.*

**Public Name:** Thorn
**Internal Name:** GroveThorn
**Version:** 1.1 Draft
**Last Updated:** December 2025

Thorns protect plants from harm without being aggressive. They're natural, protective, and guard the grove from harmful content. Thorn is Grove's automated content moderation system—privacy-first, context-aware, and designed to protect without surveillance.

---

## Implementation Status

| Field | Value |
|-------|-------|
| **Status** | Specification approved, development starting soon |
| **Target Phase** | Phase 4 (Content Moderation) |
| **Prerequisites** | Post publishing system, user reporting |

---

## Overview

Grove uses automated content moderation to enforce our [Acceptable Use Policy](/knowledge/legal/acceptable-use-policy) while maintaining strict privacy protections. This system is designed with a **privacy-first architecture**: no human eyes on user data, no retention of content, and fully encrypted processing.

---

## 1. Core Principles

### 1.1 Privacy First
- **Zero human surveillance** of user content during automated review
- **Immediate deletion** of all content after review completes
- **No training** on user data—ever
- **End-to-end encryption** for all data in transit
- Manual review only in extreme edge cases, with strict protocols

### 1.2 Transparency
- Users are informed that automated moderation exists
- Clear explanation of what triggers review
- Appeal process for all moderation decisions
- No secret rules or hidden enforcement

### 1.3 Proportional Response
- Automated warnings before punitive action
- Graduated enforcement (see AUP Section 5.2)
- Context-aware decisions, not keyword matching

---

## 2. System Architecture

### 2.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER PUBLISHES                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT QUEUE (Encrypted)                    │
│  - Post content extracted                                       │
│  - Metadata stripped (no user ID, no IP)                        │
│  - Assigned anonymous review ID                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         INFERENCE API (Fireworks AI / Cerebras / Groq)          │
│  - Zero Data Retention enabled                                  │
│  - TLS 1.2+ encryption in transit                               │
│  - Model: DeepSeek V3.2 (open source, MIT license)              │
│  - No content logged by provider                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DECISION ENGINE                            │
│  - Parse model response                                         │
│  - Apply confidence thresholds                                  │
│  - Route to appropriate action                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │  PASS   │ │  FLAG   │ │ ESCALATE│
              │ (Clear) │ │(Warning)│ │ (Edge)  │
              └─────────┘ └─────────┘ └─────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    IMMEDIATE DELETION                           │
│  - All review data purged                                       │
│  - Only decision outcome stored                                 │
│  - Anonymous audit log (no content)                             │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Details

| Stage | Data Present | Retention |
|-------|--------------|-----------|
| Content Queue | Post text, anonymous ID | Until review completes (seconds) |
| Inference Request | Post text only (no metadata) | Zero (ZDR enabled) |
| Decision Engine | Model response, confidence score | Until decision made (milliseconds) |
| Post-Review | Decision outcome only | Permanent (for enforcement) |
| Audit Log | Anonymous stats (pass/flag/escalate counts) | 90 days |

---

## 3. Inference Provider Requirements

### 3.1 Approved Providers

| Provider | Models Available | ZDR Support | Compliance | Status |
|----------|------------------|-------------|------------|--------|
| **Fireworks AI** | DeepSeek V3.2, Kimi K2, Llama 3.1 70B | Yes (default for open models) | SOC 2 Type II, HIPAA | Primary |
| **Cerebras** | Llama 3.3 70B, GPT-OSS-120B | Yes (US-based, zero retention) | Trust Center available | Backup |
| **Groq** | Llama 3.3 70B, Kimi K2 | Yes (explicit toggle) | SOC 2, HIPAA | Tertiary |

**Note:** Groq deprecated Llama 3.1 70B in January 2025 in favor of Llama 3.3 70B. Fireworks AI is the only provider offering all three primary models (DeepSeek V3.2, Kimi K2, and Llama 3.1).

### 3.2 Provider Requirements Checklist

Before using any provider, verify:

- [ ] **Zero Data Retention** - Must support ZDR or equivalent
- [ ] **No training on inputs** - Provider must not use prompts/responses for training
- [ ] **Encryption in transit** - TLS 1.2+ required
- [ ] **US jurisdiction** - Data must not leave US during processing
- [ ] **Open source model** - Model must be open source with permissive license
- [ ] **SOC 2 compliance** - Provider must have SOC 2 certification

### 3.3 Why These Providers?

**Fireworks AI (Primary):**
- ZDR is default for open models (no opt-in required)
- SOC 2 Type II and HIPAA compliant
- AES-256 encryption at rest, TLS 1.2+ in transit
- Explicit policy: "We do not log or store prompt or generation data"
- **Only provider with all three primary models** (DeepSeek V3.2, Kimi K2, Llama 3.1)

**Cerebras (Backup):**
- 100% US-based AI datacenters with zero data retention
- Ultra-fast inference (~2100 tokens/sec for Llama 3.3 70B, ~3000 tokens/sec for GPT-OSS-120B)
- Trust Center available for compliance documentation
- Offers unique models like GPT-OSS-120B (120B parameters, open source)

**Groq (Tertiary):**
- Explicit Zero Data Retention toggle in console
- No logging by default
- Ultra-fast inference (LPU hardware)
- Clear data processing documentation
- Note: Llama 3.1 70B deprecated; use Llama 3.3 70B instead

### 3.4 Excluded Providers

| Provider | Reason |
|----------|--------|
| DeepSeek API (direct) | China-based servers, no ZDR, trains on user data |
| OpenAI | Closed source, may use data for training |
| Anthropic | Closed source, may use data for training |
| Any provider without ZDR | Does not meet privacy requirements |

---

## 4. Model Selection

### 4.1 Primary Model: DeepSeek V3.2

**Model:** [DeepSeek V3.2](https://huggingface.co/deepseek-ai/DeepSeek-V3.2)

**Why DeepSeek V3.2:**
- Open source ([MIT license](https://huggingface.co/deepseek-ai/DeepSeek-V3.2))
- Large parameter count = nuanced understanding
- Strong reasoning capabilities for context-aware moderation
- Available through privacy-respecting providers
- No licensing restrictions on commercial use

**Note on Model Origin:**
DeepSeek V3.2 is developed by a Chinese company, but the model itself is open source and hosted by US-based providers (Fireworks AI, Groq) with Zero Data Retention. Your content never touches DeepSeek's infrastructure—only the open-source model weights are used, running entirely on US servers with full privacy protections.

**Model Configuration:**
```json
{
  "model": "deepseek-v3.2",
  "temperature": 0.1,
  "max_tokens": 500,
  "top_p": 0.95
}
```

Low temperature ensures consistent, predictable responses for moderation decisions.

### 4.2 Fallback Models

If DeepSeek V3.2 is unavailable, use in this order:

| Priority | Model | HuggingFace | Provider IDs | License |
|----------|-------|-------------|--------------|---------|
| 1st fallback | [Kimi K2-0905](https://huggingface.co/moonshotai/Kimi-K2-Instruct-0905) | `moonshotai/Kimi-K2-Instruct-0905` | Fireworks: `accounts/fireworks/models/kimi-k2-instruct` / Groq: `moonshotai/Kimi-K2-Instruct-0905` | Modified MIT |
| 2nd fallback | [Llama 3.1 70B](https://huggingface.co/meta-llama/Llama-3.1-70B-Instruct) | `meta-llama/Llama-3.1-70B-Instruct` | Fireworks: `accounts/fireworks/models/llama-v3p1-70b-instruct` | Llama 3.1 License |
| 3rd fallback | [Llama 3.3 70B](https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct) | `meta-llama/Llama-3.3-70B-Instruct` | Cerebras: `llama-3.3-70b` / Groq: `llama-3.3-70b-versatile` | Llama 3.3 License |
| 4th fallback | GPT-OSS-120B | — | Cerebras: `gpt-oss-120b` / Groq: `gpt-oss-120b` | Open Source |

Same provider requirements (ZDR, US hosting) apply to all models. Provider failover order: Fireworks AI → Cerebras → Groq.

### 4.3 Cost Estimation

**Per-review token usage:**
- Average blog post: ~1,000 words ≈ 1,300 tokens
- System prompt + template: ~400 tokens
- Model response: ~150 tokens
- **Total per review: ~1,850 tokens** (~1,700 input, ~150 output)

**Long-form content handling (>3,000 words):**
For posts exceeding ~3,000 words (~4,000 tokens), use smart truncation:
1. Include full title and first 1,500 words (captures intro/thesis)
2. Include last 500 words (captures conclusion)
3. Sample 3 random paragraphs from middle section
4. If post contains images, include all image alt text
5. Total input capped at ~5,000 tokens to control costs

This approach maintains moderation accuracy while keeping costs predictable. Very long essays rarely have policy violations only in the middle.

**Limitation Note:** This truncation strategy optimizes for cost while maintaining reasonable accuracy. However, it may miss:
- Harmful content strategically placed in the middle section
- Gradual escalation patterns that build across the full text
- Context-dependent violations where surrounding text matters

If sampled paragraphs show concerning patterns (e.g., borderline scores), the system will trigger a full-content review. Users may also report content that automated review missed, which triggers targeted review of the flagged section.

**Model pricing comparison (per million tokens):**

| Model | Fireworks | Cerebras | Groq |
|-------|-----------|----------|------|
| DeepSeek V3.2 | $0.56 in / $1.68 out | — | — |
| Kimi K2-0905 | $0.60 in / $2.50 out | — | $1.00 in / $3.00 out |
| Llama 3.1 70B | Available | — | Deprecated |
| Llama 3.3 70B | $0.90 in / $0.90 out | ~$0.59 in / $0.79 out | $0.59 in / $0.79 out |
| GPT-OSS-120B | — | $0.25 in / $0.69 out | $0.15 in / $0.60 out |

**Cost per review by model (~1,700 input tokens, ~150 output tokens):**

| Model | Fireworks | Cerebras | Groq |
|-------|-----------|----------|------|
| DeepSeek V3.2 | ~$0.0012 | — | — |
| Kimi K2-0905 | ~$0.0014 | — | ~$0.0022 |
| Llama 3.3 70B | ~$0.0017 | ~$0.0011 | ~$0.0011 |
| GPT-OSS-120B | — | ~$0.0005 | ~$0.0004 |

**Monthly cost projections (using DeepSeek V3.2 on Fireworks):**

| Posts/Month | Estimated Cost |
|-------------|----------------|
| 1,000 | ~$1.20 |
| 10,000 | ~$12 |
| 100,000 | ~$120 |

*Note: Add ~5% overhead for edge case secondary reviews. Fallback to Cerebras/Groq models may have different costs—see pricing table above.*

---

## 5. Review Triggers

### 5.1 When Content Is Reviewed

| Trigger | Review Type | Priority |
|---------|-------------|----------|
| New post published | Full review | Normal |
| Post edited (significant changes) | Full review | Normal |
| User report received | Targeted review | High |
| Pattern detection (spam indicators) | Full review | High |

**Definition of "Significant Changes":**
A post edit triggers re-review if any of the following occur:
- Content length changes by more than 25%
- New images or media added
- Title changed
- Content warning added or removed
- More than 3 paragraphs modified

Minor edits (typo fixes, formatting, link updates) do not trigger re-review.

### 5.2 What Is NOT Reviewed

- Draft posts (unpublished)
- Private account settings
- Payment information
- Authentication data
- Direct messages (Grove doesn't have DMs)

---

## 6. Content Classification

### 6.1 Categories

The model classifies content into the following categories:

| Category | AUP Reference | Severity |
|----------|---------------|----------|
| `CLEAR` | N/A | None |
| `ILLEGAL_CONTENT` | 1.1 | Critical |
| `HARASSMENT` | 1.2 | Critical |
| `HATE_SPEECH` | 1.3 | Critical |
| `SPAM_MALWARE` | 1.4 | High |
| `IMPERSONATION` | 1.5 | High |
| `EXPLICIT_SEXUAL` | 1.6 | High |
| `POLITICAL_CAMPAIGN` | 1.7 | Medium |
| `ELECTION_MISINFO` | 1.7 | High |
| `AI_UNLABELED` | 1.8 | Low |
| `MISSING_CW` | 2.1 | Low |
| `PROMO_VIOLATION` | 3.1 | Low |
| `COPYRIGHT` | 4.1 | Medium |

### 6.2 Prompt Template

```
You are a content moderation assistant for Grove, a personal blogging platform.
Your job is to review content against our Acceptable Use Policy.

IMPORTANT CONTEXT:
- Grove allows personal political expression (opinions, lived experiences)
- Grove prohibits political campaigning, fundraising, and election misinformation
- AI-assisted content is allowed IF labeled; unlabeled AI content is prohibited
- Artistic nudity is allowed with content warnings
- Consider context and intent, not just keywords
- Personal expression about marginalized identities is ALLOWED, including but not limited to:
  LGBTQ+ issues, disability advocacy, racial justice, religious expression, ethnic identity,
  and other marginalized communities. These are not "political content" violations.

Review the following post and respond with:
1. CATEGORY: One of [CLEAR, ILLEGAL_CONTENT, HARASSMENT, HATE_SPEECH, SPAM_MALWARE,
   IMPERSONATION, EXPLICIT_SEXUAL, POLITICAL_CAMPAIGN, ELECTION_MISINFO,
   AI_UNLABELED, MISSING_CW, PROMO_VIOLATION, COPYRIGHT]
2. CONFIDENCE: A number from 0.0 to 1.0
3. REASON: Brief explanation (1-2 sentences)
4. SUGGESTION: What action to take (if any)

POST CONTENT:
---
{content}
---

Respond in JSON format only.
```

**Language Support:**
This system is currently optimized for **English content**. Multi-language support is planned for future development. Non-English content will still be processed, but accuracy may vary. The underlying model (DeepSeek V3.2) has multilingual capabilities that can assist with translation and context, but manual review guidelines are English-only at this time.

---

## 7. Decision Thresholds

### 7.1 Confidence-Based Routing

| Confidence | Category Severity | Action |
|------------|-------------------|--------|
| ≥ 0.95 | Critical | Immediate removal, notify user |
| ≥ 0.95 | High/Medium | Flag for removal, notify user |
| ≥ 0.95 | Low | Warning to user, content stays |
| 0.80 - 0.94 | Any | Flag for review, content stays pending |
| < 0.80 | Any | **Escalate to edge case handling** |

### 7.2 Automatic Actions

**CLEAR (confidence ≥ 0.90):**
- No action taken
- No notification to user
- Anonymous stat logged

**Violation Detected (confidence ≥ 0.95):**
- Action based on severity (see 7.1)
- User notified with reason
- Appeal option provided
- Enforcement record created (no content stored)

### 7.3 Edge Case Threshold

Content enters edge case handling when:
- Confidence < 0.80 for any category
- Model returns conflicting signals
- Content matches multiple categories
- Model explicitly flags uncertainty

---

## 8. Edge Case Handling

### 8.1 Definition

An "edge case" is content where the automated system cannot make a confident decision. This triggers special handling to ensure fairness.

### 8.2 Edge Case Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    EDGE CASE DETECTED                           │
│  - Confidence < 0.80                                            │
│  - Conflicting categories                                       │
│  - Model uncertainty flag                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SECONDARY REVIEW                             │
│  - Re-run with different prompt framing                         │
│  - Include more context if available                            │
│  - Use slightly higher temperature (0.3)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌─────────────┐     ┌─────────────┐
            │  Resolved   │     │   Still     │
            │ (conf ≥0.85)│     │  Unclear    │
            └─────────────┘     └─────────────┘
                    │                   │
                    ▼                   ▼
            Normal routing      Manual Escalation
```

### 8.3 Manual Escalation Criteria

Content is escalated for manual review ONLY when:

1. **Two automated reviews disagree** on category
2. **Both reviews have confidence < 0.80**
3. **Content involves potential legal issues** (CSAM indicators, credible threats)
4. **Model explicitly cannot determine** if content violates policy

### 8.4 Manual Review Protocol

When manual review is required:

1. **Minimized exposure:**
   - Only the specific post content is visible
   - No user identity, account info, or history
   - Review happens in isolated environment

2. **Trusted reviewers only:**
   - Currently: Autumn (platform owner)
   - Future: May include vetted, trusted community moderators
   - No third-party moderation services
   - No outsourced review

3. **Decision documentation:**
   - Decision recorded (approve/remove/warn)
   - Reasoning documented for policy refinement
   - Used to improve automated system prompts

4. **Immediate deletion after review:**
   - Content removed from review queue
   - No copies retained
   - Only decision outcome stored

### 8.5 Expected Manual Review Volume

Based on confidence thresholds:
- Estimated < 0.1% of posts will require manual review
- Most edge cases resolved by secondary automated review
- Manual review is the exception, not the rule

---

## 9. Data Lifecycle

### 9.1 Content Journey

| Phase | Duration | Data Present | Encrypted |
|-------|----------|--------------|-----------|
| Queue entry | < 1 second | Full post content | Yes (AES-256) |
| Transit to API | < 100ms | Post content only | Yes (TLS 1.2+) |
| Inference | < 5 seconds | Post content | Yes (provider infra) |
| Response transit | < 100ms | Decision JSON | Yes (TLS 1.2+) |
| Decision processing | < 100ms | Decision data | Yes (memory only) |
| Post-decision | Permanent | Outcome only | N/A (no content) |

### 9.2 What Is Stored Long-Term

**Stored:**
- Decision outcome (pass/warn/remove)
- Category detected (if violation)
- Timestamp
- Anonymous review ID
- Enforcement action taken

**Never Stored:**
- Post content
- User identity linked to review
- IP address
- Model prompts or responses
- Confidence scores (only used for routing)

### 9.3 Deletion Guarantees

| Data Type | Deletion Timing |
|-----------|-----------------|
| Post content in queue | Immediately after review |
| API request/response | Zero retention (ZDR) |
| Edge case content | Within 24 hours of resolution |
| Manual review content | Immediately after decision |

---

## 10. Security Measures

### 10.1 Encryption

| Data State | Encryption |
|------------|------------|
| At rest (queue) | AES-256 |
| In transit (internal) | TLS 1.3 |
| In transit (to API) | TLS 1.2+ |
| At provider | Provider's encryption (SOC 2 certified) |

### 10.2 Access Controls

- Review queue accessible only by moderation service
- No admin panel access to review content
- API keys stored in Cloudflare secrets
- Audit logging for all system access

### 10.3 Isolation

- Moderation runs in isolated Cloudflare Worker
- No shared memory with main application
- Separate KV namespace for moderation state
- Network isolation from user-facing services

### 10.4 API Key Rotation

**Schedule:**
- Routine rotation: Every 90 days
- Immediate rotation: If compromise is suspected

**Responsible Party:** Platform owner (Autumn) or designated technical lead

**Reminder System:**
- Calendar alert at 80 days (10 days before deadline)
- Escalating notification at 85 days if not completed
- Final warning at 89 days

**Missed Rotation Protocol:**
- If 90-day deadline passes without rotation, trigger immediate security review
- Rotate key within 24 hours of missed deadline
- Pause automated moderation during key rotation to prevent service disruption
- Document reason for delay in audit log
- If pattern of missed rotations, implement automated rotation tooling

**Procedure:**
1. Generate new API key in provider console
2. Update key in Cloudflare secrets
3. Verify moderation service functions correctly
4. Revoke old API key
5. Log rotation in audit trail

### 10.5 Prompt Injection Protection

Content Moderation uses the **Songbird Pattern** — a three-layer defense system against prompt injection attacks:

1. **Canary** — Tripwire detection. Runs a minimal check; if response deviates from expected output, input is poisoned.
2. **Kestrel** — Semantic validation. Verifies input looks like legitimate blog post content, not embedded instructions.
3. **Robin** — Production response. The actual moderation classification, only runs after Canary and Kestrel verify safety.

See: `docs/specs/songbird-pattern.md` for full implementation details.

**Content Moderation uses Songbird for:**
- Every post submitted for automated review
- User-reported content reviews

Together, Canary and Kestrel cost ~$0.0004 per request — negligible insurance against attackers trying to bypass moderation through prompt injection.

---

## 11. Provider Privacy Documentation

### 11.1 Approved Provider Links

For full details on how our inference providers handle data:

**Fireworks AI (Primary)**
- Privacy Policy: https://fireworks.ai/privacy-policy
- Zero Data Retention: https://docs.fireworks.ai/guides/security_compliance/data_handling
- Security & Compliance: https://fireworks.ai/docs/guides/security_compliance/data_security

**Cerebras (Backup)**
- Privacy Policy: https://www.cerebras.ai/privacy-policy
- Trust Center: https://trust.cerebras.ai/
- Models Overview: https://inference-docs.cerebras.ai/models/overview
- Pricing: https://www.cerebras.ai/pricing

**Groq (Tertiary)**
- Privacy Policy: https://groq.com/privacy-policy
- Your Data in GroqCloud: https://console.groq.com/docs/your-data
- Data Processing Addendum: https://console.groq.com/docs/legal/customer-data-processing-addendum
- Model Deprecations: https://console.groq.com/docs/deprecations

*Provider links last verified: December 11, 2025*

### 11.2 Internal Audit Log

For system health monitoring (no content stored):
- Review latency metrics
- API error rates
- Edge case frequency
- Manual escalation count

---

## 12. User Communication

### 12.1 Notification Templates

**Content Removed:**
```
Your post "{title}" has been removed for violating our Acceptable Use Policy.

Reason: {category_description}

You may appeal this decision within 7 days by replying to this email.
See our full policy: https://grove.place/legal/acceptable-use
```

**Warning Issued:**
```
Your post "{title}" may need attention.

Our automated review flagged: {category_description}

No action has been taken. Please review our guidelines:
https://grove.place/legal/acceptable-use

If you believe this is an error, no action is needed.
```

**Content Restored (False Positive):**
```
We owe you an apology.

Your post "{title}" was incorrectly removed by our automated moderation system.
We identified a pattern of errors affecting posts like yours and have fixed the issue.

Your content has been restored and is now live.

We're sorry for the inconvenience. If you have any questions, please reply to this email.
```

### 12.2 Appeal Process

1. User replies to notification email
2. Appeal logged in system
3. Manual review triggered (following Section 8.4 protocol)
4. Decision communicated within 14 business days
5. One appeal per content removal

---

## 13. Future Considerations

### 13.1 Potential Improvements

- **On-device pre-filtering** - Client-side checks before publish
- **User reputation scoring** - Reduce review burden for trusted users
- **Category-specific models** - Specialized models for nuanced categories
- **Federated learning** - Improve without centralizing data (research phase)

### 13.2 Policy Integration

This system enforces the [Acceptable Use Policy](/knowledge/legal/acceptable-use-policy). Any AUP changes must be reflected in:
- Category definitions (Section 6)
- Prompt template (Section 6.2)
- Severity mappings (Section 7)

### 13.3 Continuous Improvement

To identify and address systemic issues with automated moderation:

**Regular Audits:**
- Monthly review of appeal outcomes and patterns
- Identify categories with high appeal success rates (potential false positive patterns)
- Track edge case frequency by content type

**False Positive Metrics:**
- Target: < 5% false positive rate (measured by successful appeals)
- Alert threshold: > 10% appeal success rate for any single category
- Quarterly reporting on moderation accuracy

**Prompt Refinement Process:**
1. Identify problematic patterns from appeal data
2. Draft prompt modifications in staging environment
3. A/B test new prompts against sample content (historical edge cases)
4. Require improvement in accuracy metrics before rollout
5. Document all prompt changes with rationale

**Systemic Issue Response:**
- If a content type is consistently misclassified, temporarily reduce confidence threshold for that category
- Escalate to manual review more aggressively until prompt is refined
- Notify affected users if their content was incorrectly actioned

**False Positive Notification Protocol:**
When systemic false positives are identified that resulted in content removal:
- **Scope:** Only for false positives that led to content removal (not warnings)
- **Mechanism:** Automated email using the "Content Restored" template (see Section 12.1)
- **Timeline:** Within 48 hours of identifying the systemic issue
- **Content:** Apology, explanation of the error, confirmation content has been restored
- **Record:** Log notification in user's moderation history for transparency

---

## 14. Implementation Checklist

- [ ] Set up Fireworks AI account with ZDR verified (Primary)
- [ ] Set up Cerebras account with ZDR verified (Backup)
- [ ] Configure Groq as tertiary fallback with ZDR enabled
- [ ] Create isolated Cloudflare Worker for moderation
- [ ] Implement encrypted queue in KV
- [ ] Build decision engine with threshold routing
- [ ] Create notification email templates in Resend
- [ ] Set up audit logging (no content)
- [ ] Write integration tests with mock responses
- [ ] Document API key rotation procedure
- [ ] Create transparency report template

---

*This specification prioritizes user privacy while maintaining community safety. The goal is automated, privacy-respecting moderation with human review only as a last resort.*
