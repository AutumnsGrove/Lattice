# Automated Content Moderation System

**Grove Platform**
**Version:** 1.0 Draft
**Last Updated:** December 10, 2025

---

## Overview

Grove uses automated content moderation to enforce our [Acceptable Use Policy](../Legal/ACCEPTABLE-USE-POLICY.md) while maintaining strict privacy protections. This system is designed with a **privacy-first architecture**: no human eyes on user data, no retention of content, and fully encrypted processing.

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
│                        USER PUBLISHES                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT QUEUE (Encrypted)                     │
│  - Post content extracted                                        │
│  - Metadata stripped (no user ID, no IP)                        │
│  - Assigned anonymous review ID                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              INFERENCE API (Groq or Fireworks AI)                │
│  - Zero Data Retention enabled                                   │
│  - TLS 1.2+ encryption in transit                               │
│  - Model: DeepSeek V3 (open source, MIT license)                │
│  - No content logged by provider                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DECISION ENGINE                             │
│  - Parse model response                                          │
│  - Apply confidence thresholds                                   │
│  - Route to appropriate action                                   │
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
│                    IMMEDIATE DELETION                            │
│  - All review data purged                                        │
│  - Only decision outcome stored                                  │
│  - Anonymous audit log (no content)                              │
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

| Provider | Model | ZDR Support | Compliance | Status |
|----------|-------|-------------|------------|--------|
| **Fireworks AI** | DeepSeek V3 | Yes (default for open models) | SOC 2 Type II, HIPAA | Preferred |
| **Groq** | DeepSeek V3 | Yes (explicit toggle) | SOC 2, HIPAA | Alternate |

### 3.2 Provider Requirements Checklist

Before using any provider, verify:

- [ ] **Zero Data Retention** - Must support ZDR or equivalent
- [ ] **No training on inputs** - Provider must not use prompts/responses for training
- [ ] **Encryption in transit** - TLS 1.2+ required
- [ ] **US jurisdiction** - Data must not leave US during processing
- [ ] **Open source model** - Model must be open source with permissive license
- [ ] **SOC 2 compliance** - Provider must have SOC 2 certification

### 3.3 Why These Providers?

**Fireworks AI:**
- ZDR is default for open models (no opt-in required)
- SOC 2 Type II and HIPAA compliant
- AES-256 encryption at rest, TLS 1.2+ in transit
- Explicit policy: "We do not log or store prompt or generation data"

**Groq:**
- Explicit Zero Data Retention toggle in console
- No logging by default
- Ultra-fast inference (LPU hardware)
- Clear data processing documentation

### 3.4 Excluded Providers

| Provider | Reason |
|----------|--------|
| DeepSeek API (direct) | China-based servers, no ZDR, trains on user data |
| OpenAI | Closed source, may use data for training |
| Anthropic | Closed source, may use data for training |
| Any provider without ZDR | Does not meet privacy requirements |

---

## 4. Model Selection

### 4.1 Primary Model: DeepSeek V3

**Why DeepSeek V3:**
- Open source (MIT license)
- Large parameter count = nuanced understanding
- Strong reasoning capabilities for context-aware moderation
- Available through privacy-respecting providers
- No licensing restrictions on commercial use

**Model Configuration:**
```json
{
  "model": "deepseek-v3",
  "temperature": 0.1,
  "max_tokens": 500,
  "top_p": 0.95
}
```

Low temperature ensures consistent, predictable responses for moderation decisions.

### 4.2 Fallback Model

If DeepSeek V3 is unavailable:
- **Llama 3.1 70B** (Meta, open source)
- Same provider requirements apply

---

## 5. Review Triggers

### 5.1 When Content Is Reviewed

| Trigger | Review Type | Priority |
|---------|-------------|----------|
| New post published | Full review | Normal |
| Post edited (significant changes) | Full review | Normal |
| User report received | Targeted review | High |
| Pattern detection (spam indicators) | Full review | High |

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

---

## 7. Decision Thresholds

### 7.1 Confidence-Based Routing

| Confidence | Category Severity | Action |
|------------|-------------------|--------|
| ≥ 0.95 | Critical | Immediate removal, notify user |
| ≥ 0.95 | High/Medium | Flag for removal, notify user |
| ≥ 0.95 | Low | Warning to user, content stays |
| 0.70 - 0.94 | Any | Flag for review, content stays pending |
| < 0.70 | Any | **Escalate to edge case handling** |

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
- Confidence < 0.70 for any category
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
│                    EDGE CASE DETECTED                            │
│  - Confidence < 0.70                                             │
│  - Conflicting categories                                        │
│  - Model uncertainty flag                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SECONDARY REVIEW                              │
│  - Re-run with different prompt framing                         │
│  - Include more context if available                            │
│  - Use slightly higher temperature (0.3)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌─────────────┐     ┌─────────────┐
            │  Resolved   │     │   Still     │
            │ (conf ≥0.80)│     │  Unclear    │
            └─────────────┘     └─────────────┘
                    │                   │
                    ▼                   ▼
            Normal routing      Manual Escalation
```

### 8.3 Manual Escalation Criteria

Content is escalated for manual review ONLY when:

1. **Two automated reviews disagree** on category
2. **Both reviews have confidence < 0.70**
3. **Content involves potential legal issues** (CSAM indicators, credible threats)
4. **Model explicitly cannot determine** if content violates policy

### 8.4 Manual Review Protocol

When manual review is required:

1. **Minimized exposure:**
   - Only the specific post content is visible
   - No user identity, account info, or history
   - Review happens in isolated environment

2. **Review by Autumn only:**
   - No third-party moderators
   - No outsourced review services
   - Single trusted reviewer

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

---

## 11. Audit & Transparency

### 11.1 Public Transparency Report

Quarterly publication of:
- Total posts reviewed
- Breakdown by outcome (pass/warn/remove)
- Category distribution (no content)
- Appeal statistics
- System accuracy metrics

### 11.2 Internal Audit Log

For system health monitoring:
- Review latency metrics
- API error rates
- Edge case frequency
- Manual escalation count

No content is included in audit logs.

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

### 12.2 Appeal Process

1. User replies to notification email
2. Appeal logged in system
3. Manual review triggered (following Section 8.4 protocol)
4. Decision communicated within 7 business days
5. One appeal per content removal

---

## 13. Future Considerations

### 13.1 Potential Improvements

- **On-device pre-filtering** - Client-side checks before publish
- **User reputation scoring** - Reduce review burden for trusted users
- **Category-specific models** - Specialized models for nuanced categories
- **Federated learning** - Improve without centralizing data (research phase)

### 13.2 Policy Integration

This system enforces the [Acceptable Use Policy](../Legal/ACCEPTABLE-USE-POLICY.md). Any AUP changes must be reflected in:
- Category definitions (Section 6)
- Prompt template (Section 6.2)
- Severity mappings (Section 7)

---

## 14. Implementation Checklist

- [ ] Set up Fireworks AI account with ZDR verified
- [ ] Configure Groq as fallback with ZDR enabled
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
