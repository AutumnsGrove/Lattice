# Research Prompt: Hyvor Talk Latest Features & Pricing Verification

## Context

Grove Platform has selected Hyvor Talk as the recommended comment system for Phase 5 MVP. Our existing research (in `comment-system-strategy.md`) was conducted earlier in 2025. Before implementation, we need to verify current pricing, features, and any new capabilities.

## What We Already Know

From previous research:
- **Price:** €5/month ($5.50 USD) for Premium plan
- **Credits:** 100,000 monthly (1 per comment, 10-20 for spam checks)
- **Features:** Anonymous comments, markdown, nested replies, email notifications
- **Privacy:** GDPR-compliant, German hosting, minimal data collection
- **Bundle size:** 8-15KB JavaScript

## Verification Needed

### 1. Pricing Verification

- Is the €5/month Premium plan still available?
- Any changes to the credit system?
- What are the current plan tiers and limits?
- Any new pricing for annual billing?
- Cost for branding removal (was €35/month Business tier)

### 2. Feature Updates

Check for any new features since our last research:

- **SSO/OAuth:** Any new authentication providers?
- **Reactions:** Beyond comments, any emoji reactions?
- **Moderation:** New AI moderation or spam detection improvements?
- **Webhooks:** Can we get notified of new comments for our own email system?
- **API changes:** Any breaking changes or new endpoints?
- **Theming:** Better customization options?

### 3. SvelteKit Integration

- Official SvelteKit component or embed code only?
- Any SSR considerations?
- Best practices for loading the script
- TypeScript types available?

### 4. Multi-Tenant Considerations

Since Grove is multi-tenant (many blogs on subdomains):

- Can we use one Hyvor Talk account for multiple sites?
- Or does each blog need separate Hyvor Talk site?
- Pricing implications for multi-site
- How to handle subdomain-based routing

### 5. Migration & Data Export

- Current export format (JSON, XML, etc.)
- Can we import into a future custom system?
- Data retention after account closure

### 6. Competitor Check

Quick pulse check on alternatives:
- Any new privacy-focused comment systems emerged?
- Commento status (still having data loss issues?)
- Giscus updates (still GitHub-only?)

## Specific Questions for Hyvor Talk

1. What is the exact embed code for SvelteKit?
2. How do we configure for multiple subdomains?
3. What webhooks are available?
4. How to customize the appearance to match blog themes?
5. What's the average response time for support?

## Output Format

```markdown
## Hyvor Talk Verification Report

### Pricing (as of [date])
[Current pricing details]

### New Features Since Last Research
[List any additions]

### Integration Code
[SvelteKit embed example]

### Multi-Tenant Setup
[How to configure for Grove]

### Potential Issues
[Any concerns discovered]

### Recommendation
[Still recommended? Any caveats?]
```

## Decision Point

After this research, confirm:

- [ ] Hyvor Talk is still the best choice for Phase 5 MVP
- [ ] Pricing is acceptable
- [ ] Multi-tenant setup is feasible
- [ ] No blocking issues for Grove's use case

If issues are found, recommend alternatives.

---

*Research Date: [Date when research is conducted]*
*Implementation Target: Phase 5 (Month 6)*
