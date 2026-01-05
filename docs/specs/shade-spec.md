---
aliases: []
date created: Monday, December 29th 2025
date modified: Friday, January 3rd 2026
tags:
  - ai-protection
  - privacy
  - security
  - cloudflare-workers
type: tech-spec
---

# Shade — AI Content Protection

> *In a forest full of harvesters, this grove stays shaded.*

Grove's layered defense system against AI crawlers, scrapers, and automated data harvesting. Implements eight complementary protection layers from Cloudflare bot blocking to Turnstile verification, establishing that users own their words.

**Public Name:** Shade
**Internal Name:** GroveShade
**Version:** 1.0 Draft
**Last Updated:** December 2025

Shade is the cool relief beneath the canopy. Protection from the harsh glare of exposure. It's where you rest, out of sight from those who would harvest without asking.

Shade is Grove's layered defense against AI crawlers, scrapers, and automated data harvesting. In a world where tech giants treat user content as training data to be extracted without consent, Shade is a quiet refusal.

```
                         ~ in a forest full of harvesters ~
                           ~ this grove stays shaded ~

                              .  *  .    .  *  .
                           .     ╭─────────╮     .
                          *    ╱             ╲    *
                         .   ╱                 ╲   .
                            ╱    🌿  🌿  🌿     ╲
                           ╱  ┌─────────────────┐ ╲
                          ╱   │    PROTECTED    │  ╲
                         ╱    │   Your words    │   ╲
                        ╱     │   are yours.    │    ╲
                       ╱      └─────────────────┘     ╲
                      ╱   🌱                      🌱   ╲
                ─────╱────────────────────────────────╲─────
               ~~~~~~╲                                ╱~~~~~~
                      ╲══════════════════════════════╱
                       ╲___________________________ ╱

                    cool relief beneath the canopy
```

---

## Implementation Status

| Field | Value |
|-------|-------|
| **Status** | Active development, pre-launch implementation |
| **Target Phase** | Phase 1 (Foundation) |
| **Prerequisites** | Cloudflare domain setup, DNS configuration |

---

## Overview

Users own their words. What's live is live, what's gone is gone.

Shade is Grove's layered defense system against AI crawlers, scrapers, and automated data harvesting. In a world where tech giants treat user content as training data to be extracted without consent, Shade stands as a quiet refusal. Protection that works in the background so writers can focus on writing.

This specification is designed to be **open and adoptable**. While the implementation details are Cloudflare-specific (because that's what Grove uses), the principles are universal. Any project, startup, or individual who believes users should control their own words can adapt Shade for their stack.

### Why This Matters

The internet used to be a place of personal expression. Somewhere along the way, that expression became "content": raw material for training AI models, often without permission, attribution, or compensation.

Shade is a statement: *Not here. Not this grove.*

---

## 1. Core Principles

### 1.1 User Sovereignty

- **Users own their words**. Grove is a steward, not an owner
- Content exists to be read by humans, not harvested by machines
- What a user deletes should stay deleted, not preserved in training datasets
- Technical access does not constitute consent

### 1.2 Layered Defense

No single protection is foolproof. Sophisticated actors fake user agents, ignore robots.txt, and use residential proxies. Shade layers multiple defenses so that:
- Each layer catches what others miss
- Determined scrapers face compounding difficulty
- Legal standing is established even when technical barriers fail

### 1.3 Pragmatic Protection

- **95% aggression, 5% grace**. We accept occasional false positives
- Search engine indexing is preserved (discoverability matters)
- Real humans with unusual browsers may be briefly challenged
- We protect without becoming a fortress that locks users out

### 1.4 Transparency

- Our stance is public (the `/shade` page)
- Our methods are documented (this spec)
- Users know their content is protected
- The spec itself is open source for others to adopt

---

## 2. Defense Architecture

### 2.1 The Eight Layers

Shade implements defense in depth through eight complementary layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                      INCOMING REQUEST                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              LAYER 1: CLOUDFLARE NATIVE TOOLS                   │
│  • Block AI Bots toggle (known crawler user agents)             │
│  • Bot Fight Mode (behavioral analysis)                         │
│  • AI Labyrinth (wastes scraper resources)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              LAYER 2: WAF CUSTOM RULES                          │
│  • Block empty/suspicious user agents                           │
│  • Challenge bot-like patterns                                  │
│  • Threat score filtering                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              LAYER 3: RATE LIMITING                             │
│  • Request frequency caps                                       │
│  • Bulk scraping detection                                      │
│  • Friendly error messages for legitimate users                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              LAYER 4: ROBOTS.TXT DIRECTIVES                     │
│  • Signal-based blocking for compliant crawlers                 │
│  • Comprehensive AI bot blocklist                               │
│  • Maintained via Dark Visitors integration                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              LAYER 5: HTML META TAGS & HEADERS                  │
│  • noai/noimageai directives                                    │
│  • X-Robots-Tag HTTP headers                                    │
│  • Page-level intent signals                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              LAYER 6: LEGAL FRAMEWORK                           │
│  • Terms of Service prohibitions                                │
│  • Public /shade policy page                                    │
│  • Documented intent for legal standing                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              LAYER 7: TURNSTILE HUMAN VERIFICATION              │
│  • Cloudflare Turnstile widget (managed mode)                   │
│  • Server-side token validation                                 │
│  • Cookie-based verification (7-day expiry)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              LAYER 8: ARCHIVE SERVICE PROTECTION                │
│  • Internet Archive / Wayback Machine blocking                  │
│  • Archive-It and archive crawler prevention                    │
│  • Retroactive removal of existing archives                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HUMAN READER                                 │
│              (or very determined bot)                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Layer Effectiveness

| Layer | Blocks | Doesn't Block | Role |
|-------|--------|---------------|------|
| Cloudflare Native | Known AI crawlers by user agent | Spoofed agents, residential proxies | Primary defense |
| WAF Rules | Suspicious patterns, empty agents | Sophisticated mimicry | Behavioral catch |
| Rate Limiting | Bulk scrapers, aggressive crawling | Low-and-slow scraping | Volume control |
| robots.txt | Compliant crawlers (GPTBot, some others) | Non-compliant crawlers (Perplexity) | Legal signal |
| Meta Tags | Emerging standard adoption | Most current scrapers | Future-proofing |
| Legal Framework | Nothing technical | Nothing technical | Legal standing |
| Turnstile | Automated scripts, headless browsers | Sophisticated browser automation | Human verification |
| Archive Protection | Internet Archive, Archive-It, compliant archive crawlers | Personal archiving tools (Raindrop, Pocket), archive.today | Public archive prevention |

### 2.3 What We Accept

Some traffic will get through. Shade is not a fortress; it's a filter.

**Traffic that may bypass Shade:**
- Google's unified crawler (blocking breaks SEO)
- Sophisticated scrapers using residential proxies
- Determined actors with significant resources
- Anyone willing to manually copy text

**Our response:** Make scraping difficult enough that most AI companies move to easier targets, while establishing clear legal documentation that consent was never given.

---

## 3. Cloudflare Implementation

### 3.1 Block AI Bots Toggle

**Location:** Dashboard → Security → Bots → "Block AI Bots"
**Availability:** Free tier
**Status:** Must be enabled (may be off for domains added before July 2025)

**What it blocks:**
- GPTBot (OpenAI)
- ClaudeBot/anthropic-ai (Anthropic)
- CCBot (Common Crawl)
- Meta-ExternalAgent (Meta/Facebook)
- ByteSpider (ByteDance/TikTok)
- PerplexityBot (Perplexity)
- 100+ others in Cloudflare's maintained list

**What it doesn't block:**
- Googlebot (would break search indexing)
- AppleBot (same issue)
- Crawlers using spoofed user agents

### 3.2 Bot Fight Mode

**Location:** Dashboard → Security → Bots → "Bot Fight Mode"
**Availability:** Free tier

Uses behavioral analysis to detect bots regardless of user agent:
- Request patterns
- Browser fingerprinting
- JavaScript execution environment
- Mouse movement and interaction signals

**Trade-off:** May occasionally challenge legitimate users with unusual browser configurations. This is acceptable within our 5% false-positive tolerance.

### 3.3 AI Labyrinth

**Location:** Dashboard → Security → Bots → "AI Labyrinth"
**Availability:** Check dashboard (rolling out on free tier)

Instead of simply blocking detected AI bots, serves them an endless maze of AI-generated nonsense content:
- Wastes scraper compute resources
- Pollutes training data with garbage
- Makes Grove an expensive, low-value target

**Recommended:** Enable if available. This is active defense that imposes costs on scrapers.

### 3.4 WAF Custom Rules

**Location:** Dashboard → Security → WAF → Custom Rules
**Availability:** Free tier (5 rules maximum)

**Rule 1: Block Empty/Suspicious User Agents**
```
Expression: (http.user_agent eq "") or (http.user_agent contains "curl") or (http.user_agent contains "wget") or (http.user_agent contains "python-requests")
Action: Block
```

**Rule 2: Challenge Bot-Like User Agents**
```
Expression: (http.user_agent contains "bot" and not http.user_agent contains "Googlebot" and not http.user_agent contains "bingbot" and not http.user_agent contains "Yandex" and not http.user_agent contains "Kagibot")
Action: Challenge
```

**Rule 3: High Threat Score Filtering**
```
Expression: (cf.threat_score gt 30)
Action: Challenge
```

**Reserved:** Keep 2 rules available for emerging threats.

### 3.5 Rate Limiting

**Location:** Dashboard → Security → WAF → Rate Limiting Rules
**Availability:** Free tier (limited rules)

| Rule Name | Threshold | Period | Action | Purpose |
|-----------|-----------|--------|--------|---------|
| General Browsing | 60 requests | 1 minute | Challenge | Normal user ceiling |
| Page Crawling | 200 requests | 5 minutes | Block | Bulk scraper detection |
| API Protection | 30 requests | 1 minute | Block | Endpoint protection |

**User Experience:** When rate limited, users see a friendly message:

```
Rate limited. Please wait a moment before continuing.
```

Not a hard rejection—a gentle pause.

### 3.6 Turnstile Human Verification

**Location:** Dashboard → Turnstile → Add Widget
**Availability:** Free tier
**Status:** Implemented

Turnstile is Cloudflare's human verification system that doesn't require solving puzzles. It runs invisibly for most users, only showing a brief spinner when additional verification is needed.

**Configuration:**
- Widget Mode: Managed (Cloudflare decides when to challenge)
- Site Key: Public, goes in client-side code
- Secret Key: Private, stored as Cloudflare Pages secret

**Implementation Components:**

| Component | Location | Purpose |
|-----------|----------|---------|
| TurnstileWidget.svelte | `src/lib/ui/components/forms/` | Client-side widget |
| turnstile.ts | `src/lib/server/services/` | Server-side validation |
| /api/verify/turnstile | `src/routes/api/verify/` | Token verification endpoint |
| /verify | `src/routes/verify/` | Human-friendly verification page |
| hooks.server.ts | Root | Site-wide verification check |

**How It Works:**

```
    Turnstile Verification Flow:

    ┌────────────┐     ┌────────────┐     ┌────────────┐
    │   First    │     │  /verify   │     │ Cloudflare │
    │   Visit    │────▶│   page     │────▶│ Turnstile  │
    └────────────┘     └────────────┘     └─────┬──────┘
                                                │
                                          (invisible for
                                           most users)
                                                │
                                                ▼
    ┌────────────┐     ┌────────────┐     ┌────────────┐
    │  Original  │     │   Cookie   │     │   Token    │
    │   Page     │◀────│    Set     │◀────│  Verified  │
    └────────────┘     └────────────┘     └────────────┘
         │
         │ (subsequent visits)
         ▼
    ┌────────────┐
    │  Cookie    │
    │  Valid?    │───Yes───▶ Access granted
    └────────────┘
         │
        No
         │
         ▼
    ┌────────────┐
    │  Re-verify │
    └────────────┘
```

1. **First Visit:** User hits any protected page without valid cookie
2. **Redirect:** hooks.server.ts redirects to `/verify?return=<original_url>`
3. **Challenge:** Turnstile widget runs (invisible for most users)
4. **Verification:** Token sent to `/api/verify/turnstile`, validated with Cloudflare
5. **Cookie Set:** `grove_verified` cookie set with HMAC signature (7-day expiry)
6. **Redirect Back:** User returned to their original destination
7. **Subsequent Visits:** Cookie validated server-side, no challenge needed

**Cookie Security:**
```
Cookie: grove_verified=<timestamp>.<hmac_signature>
Domain: .grove.place (shared across subdomains)
Max-Age: 604800 (7 days)
SameSite: Lax
Secure: true (production only)
HttpOnly: false (read by client for UX)
```

The HMAC signature prevents cookie forgery. Even if an attacker knows the format, they can't generate valid signatures without the secret key.

**Excluded Paths:**
```typescript
const TURNSTILE_EXCLUDED_PATHS = [
  "/verify",      // The verification page itself
  "/api/",        // All API routes
  "/auth/",       // OAuth callbacks
  "/_app/",       // SvelteKit internals
  "/favicon",     // Static assets
  "/robots.txt",
  "/sitemap.xml",
  "/.well-known/",
];
```

**CSP Requirements:**
```
script-src: https://challenges.cloudflare.com
connect-src: https://challenges.cloudflare.com
frame-src: https://challenges.cloudflare.com
```

**User Experience:**
- Most users: Invisible verification, sub-second delay
- VPN/unusual browser: Brief spinner (2-3 seconds)
- Bots/scripts: Blocked entirely

---

## 4. robots.txt Configuration

### 4.1 Understanding the Limitation

robots.txt is a **signal, not a barrier**. It's the equivalent of a "Please knock" sign on a door.

**Who respects robots.txt:**
- Major search engines (Google, Bing, Yandex, Kagi)
- Some AI companies (OpenAI's GPTBot officially respects it)
- Academic and research crawlers
- Internet Archive and most legitimate archiving services

**Who ignores robots.txt:**
- Perplexity (documented by Cloudflare)
- Many smaller AI companies
- archive.today / archive.is (explicitly states it acts as "agent of the human user")
- Any scraper that wants the data badly enough

### 4.2 Recommended Configuration

```
# Grove.place robots.txt
# Users own their words. No AI training permitted.
# Spec: https://grove.place/shade

# ═══════════════════════════════════════════════════════
# ALLOWED: Legitimate Search Engines
# ═══════════════════════════════════════════════════════

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: YandexBot
Allow: /

User-agent: Kagibot
Allow: /

User-agent: DuckDuckBot
Allow: /

# ═══════════════════════════════════════════════════════
# BLOCKED: AI Training Crawlers
# ═══════════════════════════════════════════════════════

# Google AI Training (separate from search indexing)
User-agent: Google-Extended
Disallow: /

# OpenAI
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

# Anthropic
User-agent: anthropic-ai
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Claude-Web
Disallow: /

# Common Crawl (training data source)
User-agent: CCBot
Disallow: /

# Meta/Facebook
User-agent: Meta-ExternalAgent
Disallow: /

User-agent: FacebookBot
Disallow: /

# ByteDance/TikTok
User-agent: Bytespider
Disallow: /

# Perplexity (documented as non-compliant, but signal anyway)
User-agent: PerplexityBot
Disallow: /

# Apple AI Training
User-agent: Applebot-Extended
Disallow: /

# Amazon
User-agent: Amazonbot
Disallow: /

# Cohere
User-agent: cohere-ai
Disallow: /

# You.com
User-agent: YouBot
Disallow: /

# Diffbot
User-agent: Diffbot
Disallow: /

# Omgili
User-agent: Omgilibot
Disallow: /

# PetalBot (Huawei)
User-agent: PetalBot
Disallow: /

# Image dataset scrapers
User-agent: img2dataset
Disallow: /

User-agent: ImagesiftBot
Disallow: /

# SEO/Data scrapers often used for AI
User-agent: DataForSeoBot
Disallow: /

User-agent: magpie-crawler
Disallow: /

# Generic scrapers
User-agent: Scrapy
Disallow: /

# AI2 (Allen Institute)
User-agent: ai2bot
Disallow: /

User-agent: Ai2Bot-Dolma
Disallow: /

# Other known AI crawlers
User-agent: Timpibot
Disallow: /

User-agent: VelenPublicWebCrawler
Disallow: /

User-agent: Webzio-Extended
Disallow: /

User-agent: islandbot
Disallow: /

User-agent: Kangaroo Bot
Disallow: /

User-agent: sentibot
Disallow: /

# ═══════════════════════════════════════════════════════
# SITEMAP
# ═══════════════════════════════════════════════════════

Sitemap: https://grove.place/sitemap.xml
```

### 4.3 Dark Visitors Integration

[Dark Visitors](https://darkvisitors.com) maintains a community-updated database of AI crawler user agents.

**Recommended workflow:**
1. Use Dark Visitors to generate initial comprehensive blocklist
2. Subscribe to updates for new crawler alerts
3. Merge with manually curated allowlist (search engines)
4. Update robots.txt quarterly or when major new crawlers emerge

### 4.4 Archive Service Protection (Layer 8)

Web archiving services preserve snapshots of public websites, sometimes indefinitely. While some users appreciate permanent records of the web, Grove prioritizes user control—if someone deletes their content, it should stay deleted, not preserved in public archives.

#### What Can vs Cannot Be Blocked

**✅ CAN Be Blocked (Automated Archive Crawlers):**
- Internet Archive / Wayback Machine (`archive.org_bot`, `ia_archiver`)
- Archive-It (Internet Archive's subscription service)
- Common Crawl (`CCBot` - serves both AI training and archival purposes)
- Other automated archiving services that respect robots.txt

**Method:** robots.txt directives (see section 4.2 for implementation)

**Important Caveat:** Blocking archive crawlers is **retroactive**: it removes existing archives, not just prevents future ones.

**❌ CANNOT Be Blocked (Personal Archiving Tools):**
- Raindrop.io (creates copies when users bookmark pages)
- Pocket / Instapaper (reading list services)
- ArchiveBox (self-hosted archiving software)
- Browser extensions (Save Page As, reading mode, etc.)
- archive.today / archive.is / archive.ph (explicitly ignores robots.txt)

**Why:** These tools work through normal browser sessions. From the server's perspective, they're indistinguishable from legitimate users viewing pages. The archiving happens client-side or in the user's personal cloud storage.

**Chrome Extensions Team Statement:**
> "There isn't a way to prevent extensions from running, and this isn't a capability we have traditionally been supportive of. Extensions are installed by the user and the user may want to run them regardless of if the website would like this."

#### Implementation

Add the following to your robots.txt file:

```txt
# =============================================================================
# WEB ARCHIVING SERVICES
# These services crawl and archive web content for public access
# NOTE: Blocking these will RETROACTIVELY remove existing archives
# =============================================================================

# Internet Archive / Wayback Machine
User-agent: archive.org_bot
Disallow: /

User-agent: ia_archiver
Disallow: /

# Archive-It (Internet Archive's subscription service)
User-agent: archive.org
Disallow: /

User-agent: ArchiveBot
Disallow: /

User-agent: Archive-It
Disallow: /

# Common Crawl (also blocks AI training data collection)
User-agent: CCBot
Disallow: /
```

**Note:** `CCBot` (Common Crawl) serves dual purposes—it's used both for archiving and as a training data source for AI models. Blocking it addresses both concerns.

#### What About archive.today?

The archive.today / archive.is / archive.ph network explicitly does NOT respect robots.txt. They state they act "as a direct agent of the human user."

**Options if blocking is critical:**
1. IP-based blocking via Cloudflare WAF (maintenance burden, not recommended)
2. Manual DMCA requests on a per-capture basis (time-consuming)

**Recommendation:** Accept that archive.today cannot be practically blocked. Focus on the archiving services we CAN control.

#### Retroactive Archive Removal

**Critical Understanding:** Adding archive crawler blocks to robots.txt removes all previous archives from those services, not just prevents future captures.

**For Grove:** Since tenant content hasn't launched yet, this is fine. But document this behavior:
- Any future changes to archive blocking in robots.txt affect historical archives
- If a tenant later wants their content archived, removing blocks may not restore old captures
- This is a feature for user privacy, not a bug—deleted content stays deleted

#### User Education Over Technical Restrictions

**Philosophy:** Rather than fighting the technically impossible battle of blocking personal archiving tools, Grove focuses on:

1. **Clear privacy policies** — Users know what to expect
2. **User controls for content visibility** — Public, private, unlisted options
3. **Tenant-level configuration options** — Power users can opt-in to stricter blocking
4. **Controlling access, not archiving** — If content is legitimately accessible, personal archiving is accepted as normal user behavior

**Bad Approaches (Explicitly Rejected):**
- ❌ Aggressive JavaScript requirements (breaks accessibility)
- ❌ Continuous dynamic content changes (terrible UX)
- ❌ Authentication walls for all content (defeats blogging purpose)

These create more problems than they solve and harm legitimate users more than they prevent determined archiving.

#### Tenant-Level Configuration (Future Enhancement)

Consider allowing individual tenants to opt-in to archive blocking via:
- Subdomain-specific robots.txt overrides
- Tenant dashboard configuration option
- Per-post "Allow archiving" toggle

This gives power users control while maintaining sensible privacy-first defaults.

#### Monitoring

Archive service blocking requires no additional monitoring beyond existing Cloudflare analytics. The Dark Visitors integration (section 4.3) covers emerging archive crawlers along with AI scrapers.

**Summary:**
- Block what we can (Internet Archive, Archive-It, etc.)
- Accept what we can't (personal tools, archive.today)
- Focus on user control and clear communication
- Prioritize UX and accessibility over impossible-to-enforce restrictions

---

## 5. Meta Tags and HTTP Headers

### 5.1 HTML Meta Tags

Add to the `<head>` of all pages:

```html
<meta name="robots" content="noai, noimageai">
```

**What these signal:**
- `noai` — Do not use this page's text content for AI training
- `noimageai` — Do not use this page's images for AI training

**Note:** These are emerging standards. Not universally respected yet, but they establish intent and future-proof against compliant crawlers.

**Important:** Do NOT include `noindex` or `nofollow`—we want search indexing, just not AI training.

### 5.2 X-Robots-Tag HTTP Header

Set on all responses via Cloudflare Workers or Transform Rules:

```
X-Robots-Tag: noai, noimageai
```

This provides the same signal at the HTTP level, catching crawlers that don't parse HTML.

### 5.3 Implementation in SvelteKit

In your root layout or app.html:

```html
<head>
  <meta name="robots" content="noai, noimageai">
  <!-- other head content -->
</head>
```

For the HTTP header, add to your Cloudflare Worker or use Transform Rules:

**Transform Rule (Cloudflare Dashboard):**
- Location: Rules → Transform Rules → Modify Response Headers
- Add header: `X-Robots-Tag` with value `noai, noimageai`
- Apply to: All requests (or specific paths)

---

## 6. The /shade Page

### 6.1 Purpose

A dedicated public page that:
- Declares Grove's stance on AI scraping
- Establishes legal documentation of intent
- Provides a reference for the Shade spec
- Offers guidance for others who want to adopt similar protections

### 6.2 The /shade Page Mockup

```
┌─────────────────────────────────────────────────────────────────────┐
│  grove.place/shade                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                            🌿                                       │
│                                                                     │
│                          Shade                                      │
│                   In a forest full of harvesters,                   │
│                     this grove stays shaded.                        │
│                                                                     │
│   ─────────────────────────────────────────────────────────────    │
│                                                                     │
│   Users own their words.                                            │
│                                                                     │
│   Content on Grove.place may not be used for AI training,           │
│   machine learning, or automated data harvesting. Technical         │
│   access does not constitute consent.                               │
│                                                                     │
│   This applies regardless of robots.txt compliance. The absence     │
│   of technical barriers does not imply permission.                  │
│                                                                     │
│   ─────────────────────────────────────────────────────────────    │
│                                                                     │
│   What we block:                                                    │
│   • AI training crawlers (GPTBot, ClaudeBot, CCBot, etc.)          │
│   • Automated scrapers and data harvesters                          │
│   • Web archiving services (except user-initiated)                  │
│                                                                     │
│   What we allow:                                                    │
│   • Search engine indexing (Google, Bing, Kagi)                    │
│   • Human readers (always welcome)                                  │
│   • RSS feeds (for your subscribers)                               │
│                                                                     │
│   ─────────────────────────────────────────────────────────────    │
│                                                                     │
│   Questions? concerns@grove.place                                   │
│   Full policy: grove.place/legal/terms                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Required Content

The `/shade` page must include:

1. **Clear statement of position**
   - Content may not be used for AI training
   - Technical access does not constitute consent

2. **Reference to protections in place**
   - robots.txt directives
   - Meta tags and headers
   - Technical measures (without revealing specifics that aid evasion)

3. **Legal language**
   - Prohibition applies regardless of robots.txt compliance
   - Absence of technical barriers does not imply permission

4. **Contact information**
   - How to request licensing (if ever applicable)
   - How to report scraping concerns

### 6.3 Page Location

```
https://grove.place/shade
```

Linked from:
- Footer of all pages
- Terms of Service
- robots.txt (as comment)

---

## 7. Terms of Service Integration

### 7.1 Required ToS Language

The Terms of Service must include explicit prohibitions. Key elements:

**Prohibited Uses Section:**
> You may not use automated systems, including but not limited to:
> - Web scrapers, crawlers, or spiders
> - AI training data collection tools
> - Machine learning data harvesting software
> - Automated content extraction services
>
> This prohibition applies regardless of robots.txt directives or meta tag presence. The absence of technical barriers does not constitute permission.

**AI/ML Specific Clause:**
> No content from Grove.place may be used for:
> - Training artificial intelligence or machine learning models
> - Generating synthetic content based on user submissions
> - Building search indices for AI-powered answer engines
> - Any automated learning system, whether commercial or research
>
> This prohibition applies to all entities, including but not limited to: OpenAI, Anthropic, Google, Meta, Microsoft, and their subsidiaries.

**Consent Requirement:**
> Any use of Grove.place content beyond personal viewing requires explicit written consent from both Grove.place and the original content creator.

---

## 8. The Google Problem

### 8.1 The Challenge

Google does NOT split its crawler. Googlebot handles both:
- Search indexing (we want this)
- AI training data collection (we don't want this)

**Google-Extended** is supposed to block AI training while allowing search, but:
- Enforcement is unclear
- Google's AI products (Gemini, AI Overviews) may still use indexed data
- Cloudflare's CEO has publicly criticized this as an incomplete solution

### 8.2 Our Position

We use `Google-Extended` to signal our intent, but acknowledge this is imperfect.

**Options considered:**
1. ✅ Use Google-Extended and hope for the best (current approach)
2. ❌ Block Googlebot entirely (sacrifices SEO)
3. ❌ Accept Google gets AI training access (contradicts our principles)

**Reality:** Google represents ~23% of AI crawler traffic. Blocking them entirely would significantly harm discoverability. We accept this compromise while documenting our objection.

---

## 9. Monitoring and Verification

### 9.1 Verification Checklist

After implementation, verify:

| Check | Method | Expected Result |
|-------|--------|-----------------|
| robots.txt accessible | Visit `https://grove.place/robots.txt` | Full blocklist displayed |
| AI bot blocking works | `curl -A "GPTBot" https://grove.place/` | Blocked or challenged |
| Meta tags present | View page source | `noai, noimageai` in head |
| Headers set | Browser dev tools → Network → Response headers | `X-Robots-Tag` present |
| /shade page live | Visit `https://grove.place/shade` | Policy page displays |

### 9.2 Ongoing Monitoring

**Weekly (initially):**
- Review Cloudflare Security → Events for blocked requests
- Check for new AI crawler user agents in logs
- Monitor user feedback for false positive reports

**Monthly (after stabilization):**
- Review block statistics
- Update robots.txt if new major crawlers emerge
- Check Dark Visitors for new agents

**Quarterly:**
- Full review of Shade effectiveness
- Update this spec if needed
- Verify all Cloudflare settings still active

### 9.3 Cloudflare Analytics

Key metrics to track in Dashboard → Security → Events:

- Requests blocked by "Block AI Bots"
- Bot Fight Mode challenges issued
- AI Labyrinth activations (if available)
- WAF rule triggers by rule name
- Rate limiting events

---

## 10. Future Enhancements

### 10.1 Planned

| Enhancement | Priority | Description |
|-------------|----------|-------------|
| Legal ToS Templates | High | Copy-paste-ready legal language for community adoption |
| Content Fingerprinting | Medium | Invisible markers to detect if content appears in AI training data |
| Honeypot Traps | Low | Hidden links that only bots would follow, enabling IP blocking |
| User Agent Logging Dashboard | Low | Admin visibility into crawler traffic patterns |

### 10.2 Under Consideration

- **Request Header Analysis** — Flag requests missing typical browser headers
- **Community Blocklist** — Shared, auto-updating list of known bad actors

### 10.3 Explicitly Out of Scope

- **Pay-Per-Crawl** — Not aligned with Grove's philosophy
- **Complete blocking of all bots** — Would break legitimate functionality
- **Aggressive CAPTCHAs** — User experience matters

---

## 11. Implementation Checklist

### Phase 1: Immediate (Pre-Launch)

- [x] Verify "Block AI Bots" toggle is ON in Cloudflare
- [x] Enable "Bot Fight Mode"
- [x] Check if "AI Labyrinth" is available and enable
- [x] Subscribe to Dark Visitors for ongoing blocklist updates
- [x] Deploy comprehensive robots.txt
- [ ] Add noai/noimageai meta tags to all pages
- [ ] Set X-Robots-Tag header via Transform Rules or Workers

### Phase 2: Turnstile Human Verification ✅

- [x] Create Turnstile widget in Cloudflare Dashboard
- [x] Add site key to wrangler.toml files
- [x] Add secret key to Cloudflare Pages (engine, landing, plant, ivy, amber)
- [x] Implement TurnstileWidget.svelte component
- [x] Add server-side verification utility (turnstile.ts)
- [x] Create /api/verify/turnstile endpoint
- [x] Update CSP to allow challenges.cloudflare.com
- [x] Add verification page (/verify) for first-time visitors
- [x] Set grove_verified cookie (7-day expiry)
- [x] Write help center article (how-grove-protects-your-content.md)
- [x] Integrate with hooks.server.ts for site-wide verification

### Phase 3: This Week

- [ ] Create and publish /shade page
- [ ] Update Terms of Service with AI prohibition language
- [ ] Configure WAF custom rules (use 3 of 5 slots)
- [ ] Set up rate limiting rules

### Phase 4: Post-Launch

- [ ] Set up monitoring dashboard for blocked requests
- [ ] Document any false positive patterns
- [ ] Review and adjust rate limits based on real traffic

---

## 12. Adopting Shade for Your Project

Shade is designed to be open and adoptable. If you're building something where users own their words, here's how to implement Shade on your stack:

### 12.1 Core Requirements

Regardless of platform, implement:
1. **robots.txt** — Use the blocklist from Section 4.2
2. **Meta tags** — Add `noai, noimageai` to all pages
3. **HTTP headers** — Set `X-Robots-Tag: noai, noimageai`
4. **Public policy page** — Your version of `/shade`
5. **ToS language** — Explicit AI training prohibition

### 12.2 Platform-Specific Guidance

**Cloudflare:** Follow this spec directly.

**Vercel:** Use Edge Middleware for headers, Vercel Firewall for rate limiting.

**Netlify:** Use `_headers` file for X-Robots-Tag, consider Netlify Functions for additional logic.

**Self-hosted:** Implement at reverse proxy level (nginx, Caddy) plus application middleware.

### 12.3 Community Resources

- **Dark Visitors:** https://darkvisitors.com — Community-maintained crawler database
- **This Spec:** Link to Grove's published Shade spec as reference
- **Feedback:** Open issues or discussions on Grove's repository

---

## 13. Known AI Crawler Distribution

Per Fastly's Q2 2025 Threat Insights Report:

| Source | % of AI Crawler Traffic |
|--------|------------------------|
| Meta (Facebook) | 52% |
| Google | 23% |
| OpenAI | 20% |
| Others | 5% |

**Implication:** Blocking GPTBot addresses only ~20% of AI crawler traffic. The real challenge is Meta and Google, both of which are harder to block without breaking legitimate functionality.

---

## 14. Resources

### Official Documentation

- Cloudflare Bot Management: https://developers.cloudflare.com/bots/
- Cloudflare WAF: https://developers.cloudflare.com/waf/
- Cloudflare Transform Rules: https://developers.cloudflare.com/rules/transform/

### Community Resources

- Dark Visitors: https://darkvisitors.com/
- AI Crawler User Agents List: https://www.searchenginejournal.com/ai-crawler-user-agents-list/

### Related Grove Specs

- [Thorn: Content Moderation](/knowledge/specs/thorn-spec): Privacy-first automated moderation
- [Terms of Service](/knowledge/legal/terms-of-service): Legal framework

---

*Shade exists because users deserve to own their words. In a forest full of harvesters, this grove stays shaded.*

---

*Spec Version: 1.0*
*Created: December 2025*
*Author: Grove Platform*
*License: Open for adoption*
