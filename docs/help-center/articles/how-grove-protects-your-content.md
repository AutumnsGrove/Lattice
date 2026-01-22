---
title: How Grove Protects Your Content from AI Scraping
description: 'Shade: Grove''s seven-layer defense against AI crawlers and scrapers'
category: help
section: privacy-security
lastUpdated: '2025-12-25'
keywords:
  - ai
  - scraping
  - protection
  - bots
  - crawlers
  - privacy
  - shade
  - content
  - training data
  - archive
  - wayback machine
order: 2
---

# How Grove Protects Your Content from AI Scraping and Archiving

Every major AI company sends crawlers across the web, hoovering up text to train their models. Your blog posts, your personal reflections, your creative writing: they become statistical weights in systems that simulate human expression.

Grove says no. Here's how we protect what you write.

## What we mean by "Shade"

Internally, we call our AI protection system **Shade**. Like the cool relief beneath a forest canopy, it's protection from harsh exposure. You write in the open, for your readers. Not for data extraction.

Shade isn't a single switch. It's layers of protection working together, because no single defense is perfect.

## The layers of protection

### Layer 1: Known AI crawler blocking

Cloudflare maintains a list of over 100 known AI crawler user agents. When these crawlers request your content, they're blocked before they reach it.

**Crawlers we block include:**
- GPTBot, ChatGPT-User (OpenAI)
- ClaudeBot, anthropic-ai (Anthropic)
- Google-Extended (Google AI training)
- Meta-ExternalAgent, FacebookBot (Meta)
- ByteSpider (ByteDance/TikTok)
- PerplexityBot (Perplexity AI)
- CCBot (Common Crawl)
- And many more

This list updates automatically as new AI crawlers emerge.

### Layer 2: Behavioral bot detection

Some crawlers disguise themselves as regular browsers. Cloudflare's Bot Fight Mode catches them by analyzing behavior: request patterns, browser fingerprinting, JavaScript execution. If it acts like a bot, it gets treated like one.

### Layer 3: AI Labyrinth

When an AI crawler is detected, we don't just block it. We serve it an endless maze of AI-generated nonsense. This wastes their computing resources and pollutes any data they manage to collect. If they're going to ignore our "no," we make it expensive for them.

### Layer 4: Rate limiting

Bulk scraping requires many requests in quick succession. We limit how fast any single source can request pages. Normal reading: fine. Aggressive crawling: blocked.

### Layer 5: robots.txt directives

We publish a robots.txt file explicitly forbidding AI crawlers. Legitimate crawlers respect this. (Some don't. More on that below.)

### Layer 6: Meta tags and headers

Every page includes `noai` and `noimageai` directives telling crawlers not to use the content for AI training. These are emerging standards that more companies are beginning to respect.

### Layer 7: Human verification

Before accessing Grove content, visitors complete a brief verification check using Cloudflare Turnstile. For most people, this happens invisibly in the background. It ensures readers are real people, not automated scripts.

### Layer 8: Archive service protection

Web archiving services like the Internet Archive preserve snapshots of public websites, sometimes indefinitely. We block archive crawlers so that if you delete content, it stays deleted—not preserved in public archives forever.

**What we block:**
- Internet Archive / Wayback Machine
- Archive-It and other automated archive services
- Common Crawl (also used for AI training)

**What we can't block:**
- Personal archiving tools (Raindrop, Pocket, browser extensions)
- Services that ignore robots.txt (like archive.today)

This gives you control: when you delete something, it's gone. Not captured and preserved against your wishes.

### Layer 9: Legal documentation

Our Terms of Service explicitly prohibit using Grove content for AI training. This establishes clear legal standing: you never consented, and we actively refused on your behalf.

## What this means in practice

When you publish on Grove:

- **AI crawlers hit a wall.** Most are blocked before they see anything.
- **Disguised scrapers get caught.** Behavioral analysis spots them.
- **Aggressive scrapers get throttled.** Rate limits stop bulk collection.
- **Your intent is documented.** Multiple layers establish that consent was never given.

Your writing stays between you and your readers.

## An honest caveat

No protection is 100% effective. Here's what we can't prevent:

**Companies that ignore the rules.** Perplexity, for example, has been caught bypassing robots.txt and ignoring crawler blocks. When a company decides to scrape regardless of consent, technical barriers can only slow them down.

**Google's unified crawler.** Google uses the same crawler (Googlebot) for search indexing and AI training. We block Google-Extended (their AI-specific flag), but it's unclear how well Google actually respects this internally. Blocking Googlebot entirely would break search indexing.

**Personal archiving tools.** Services like Raindrop.io, Pocket, and browser extensions work through normal user sessions. From the server's perspective, they look like a real person reading your blog. We can't (and philosophically shouldn't) block legitimate readers from saving content they've accessed. We accept this as normal user behavior.

**Archive services that ignore robots.txt.** The archive.today network explicitly states it acts as "an agent of the human user" and doesn't respect robots.txt. Blocking it would require IP-based filtering with significant maintenance burden.

**Sophisticated actors.** Someone with resources, residential proxies, and determination can scrape almost any public website. This is a limitation of the open web, not Grove specifically.

**Manual copying.** If someone visits your blog and copies text manually, no technical measure stops that. Never has, never will.

**What we can promise:** We use every tool available and stay vigilant as new threats emerge. It's the best protection possible, even if it's not perfect.

## Why this matters

The web used to be a place of personal expression. Somewhere along the way, that expression became "content": raw material to be extracted, processed, and monetized without permission.

AI training is the latest and most aggressive form of this extraction. Companies scrape billions of pages, reduce human creativity to statistical patterns, and sell access to the result. Often without attribution, compensation, or consent.

Grove takes a different position: users own their words. What you write here is yours. We're stewards, not owners, and certainly not suppliers to AI companies.

This isn't just philosophical. As the web gets scraped into datasets, authentic human spaces become rarer. Every blog that refuses to be training data is a small act of resistance. Grove is building a whole forest of them.

## Verification

For technically-minded users who want to verify our protections:

**Check our robots.txt:** Visit [grove.place/robots.txt](https://grove.place/robots.txt) to see the comprehensive list of AI crawlers we block.

**Test as a crawler:** Try accessing Grove with a known AI crawler user agent. You'll be blocked or challenged.

**Check response headers:** Look for `X-Robots-Tag: noai, noimageai` in response headers.

**Review our spec:** The complete technical specification is in our [Shade spec document](https://github.com/AutumnsGrove/GroveEngine/blob/main/docs/specs/shade-spec.md).

## The verification checkpoint

Occasionally, you might see a brief "Just a moment..." screen when visiting Grove. This is Turnstile, Cloudflare's human verification system.

It's checking that you're a real person, not a bot. For most visitors, this happens invisibly. If you're flagged as potentially suspicious (unusual browser configuration, VPN, etc.), you'll see a brief spinner while it verifies.

Once verified, you won't see it again for a week. The verification is stored in a cookie, not your account.

## Related resources

**Cloudflare's documentation:**
- [Cloudflare Bot Management](https://developers.cloudflare.com/bots/)
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)

**Community resources:**
- [Dark Visitors](https://darkvisitors.com/) — Community-maintained AI crawler database
- [AI Crawler User Agents List](https://www.searchenginejournal.com/ai-crawler-user-agents-list/) — Comprehensive list

**Grove documentation:**
- [Understanding Your Privacy](/knowledge/help/understanding-your-privacy) — Broader privacy overview
- [What is Grove?](/knowledge/help/what-is-grove) — Our philosophy and values

---

*In a forest full of harvesters, this grove stays shaded.*
