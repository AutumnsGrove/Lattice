# Research Prompt: Privacy-Focused Analytics Tools for Grove Platform

## Context

Grove is a multi-tenant blog platform built on Cloudflare infrastructure (Workers, D1, KV, R2, Pages). We need an analytics solution that respects user privacy while providing meaningful insights to blog owners.

## What We Already Know

- **Tech Stack:** SvelteKit, TypeScript, Cloudflare Workers, D1 (SQLite)
- **Budget:** Prefer free/low-cost, max $20/month total
- **Privacy Requirements:** GDPR-compliant, minimal cookies, consent-based
- **Scale:** Starting with 10-100 blogs, scaling to 1,000+
- **Metrics Needed:**
  - Page views (total, unique, per-post)
  - Reading behavior (scroll depth, time on page, bounce rate)
  - Content performance (most read posts, popular tags)
  - Basic technical metrics (device type, browser family)

## Research Questions

### 1. Cloudflare Web Analytics Deep Dive

We know Cloudflare Web Analytics exists and is free/privacy-focused. Research:

- **Exact features available:** What metrics does it provide out of the box?
- **API access:** Can we pull data into our own dashboard via API?
- **Multi-tenant support:** Can we separate analytics per blog/subdomain?
- **Reading behavior:** Does it track scroll depth or time on page?
- **Limitations:** What can't it do that we need?
- **Integration effort:** How do we add it to SvelteKit on Cloudflare Pages?

### 2. Alternative Privacy-Focused Analytics

Evaluate these alternatives with specific attention to:

**Plausible Analytics:**
- Current pricing (has it changed from $9/mo?)
- Self-hosting option on Cloudflare Workers (is it possible?)
- API for dashboard integration
- Reading behavior tracking capabilities
- Multi-site/multi-tenant support

**Fathom Analytics:**
- Current pricing
- Privacy features vs Plausible
- API capabilities
- EU hosting option

**Umami:**
- Self-hosting requirements (can it run on Cloudflare?)
- Features comparison to Plausible
- Database requirements
- Active development status in 2025

**Simple Analytics:**
- Pricing and features
- Privacy approach
- Any unique capabilities

### 3. Custom Implementation Feasibility

If we build our own analytics:

- **Beacon API:** Best practices for tracking without blocking page load
- **Performance API:** Can we collect Core Web Vitals?
- **Scroll tracking:** Lightweight libraries or patterns for scroll depth
- **Visitor tracking:** Best practice for anonymous session tracking without fingerprinting
- **Aggregation patterns:** Efficient D1 queries for real-time and historical data
- **Development time estimate:** Realistic hours for production-ready system

### 4. Hybrid Approach

Research the feasibility of:

- Using Cloudflare Web Analytics for basic page views (free, zero effort)
- Adding custom tracking just for reading behavior (scroll, time)
- Combining in a unified dashboard

Is this approach used elsewhere? Any gotchas?

## Specific Information Needed

For each tool, provide:

1. **Pricing** (current, as of research date)
2. **Privacy stance** (cookies used, data storage location, GDPR compliance)
3. **API availability** (can we pull data into our dashboard?)
4. **Reading behavior** (scroll depth, time on page support)
5. **Multi-tenant** (separate dashboards per blog?)
6. **Cloudflare compatibility** (runs on Workers/Pages?)
7. **Pros/Cons** for Grove's specific use case

## Output Format

Structure your findings as:

```markdown
## Tool Name

### Overview
[1-2 sentence summary]

### Pricing
[Current pricing details]

### Privacy Features
[How they handle privacy]

### Capabilities
- Page views: Yes/No
- Unique visitors: Yes/No
- Scroll depth: Yes/No
- Time on page: Yes/No
- Bounce rate: Yes/No
- Device/browser: Yes/No
- Geographic: Yes/No
- API access: Yes/No

### Multi-Tenant Support
[How to separate per blog]

### Cloudflare Integration
[Compatibility and setup]

### Pros for Grove
[Specific benefits]

### Cons for Grove
[Specific drawbacks]

### Recommendation
[Use/Don't use and why]
```

## Decision Criteria

Rank findings by:

1. **Privacy alignment** (most important)
2. **Cost** (free > $10 > $20)
3. **Development effort** (less is better for MVP)
4. **Feature completeness** (reading behavior important)
5. **Control/customization** (for long-term)

## Deliverable

Provide a clear recommendation:

- **For Phase 5 MVP:** Which tool to use immediately
- **For Long-term:** Whether to migrate to custom solution
- **Hybrid option:** If combining tools makes sense

Include any code snippets, configuration examples, or implementation notes that would help with integration.

---

*Research Date: [Date when research is conducted]*
*Validity: Information may change - verify pricing/features before implementation*
