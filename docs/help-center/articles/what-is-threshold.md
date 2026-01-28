---
title: What is Threshold?
description: Grove's four-layer rate limiting and abuse prevention system
category: help
section: how-it-works
lastUpdated: '2026-01-28'
keywords:
  - threshold
  - rate limiting
  - abuse prevention
  - security
  - protection
order: 61
---

# What is Threshold?

The forest has boundaries. Threshold enforces them.

Threshold is Grove's rate limiting and abuse prevention system—four layers of protection that keep the platform safe without making it hostile. From edge protection to per-user limits, it works behind the scenes so legitimate Wanderers never notice it.

## Why Threshold exists

Every online service faces abuse. Bots scraping content. Bad actors testing for vulnerabilities. Overeager scripts hammering endpoints. Spam attempts flooding comment forms. Without protection, the service drowns.

Most rate limiting is crude: "too many requests, try again later." That punishes everyone equally—the script kiddie and the normal user who refreshed too fast.

Threshold is smarter. It operates in layers, applying appropriate limits at appropriate levels. Abuse gets blocked. Normal usage flows freely. The forest stays safe without building walls.

## How it works

Threshold applies protection at four levels:

**Layer 1: Edge Protection (Cloudflare)**
Before requests even reach Grove servers, Cloudflare filters out:
- Known bot signatures
- DDoS attempts
- Geographic anomalies
- Challenge-failing requests

This is the first wall. Most malicious traffic stops here.

**Layer 2: Tenant Fairness**
Each Grove blog is a tenant. Threshold ensures no single tenant can consume disproportionate resources. If one blog's traffic spikes (legitimately or not), other blogs don't suffer.

**Layer 3: User Limits**
Per-user rate limits prevent individual abuse. A logged-in user hammering the API hits limits before they can cause problems. These limits are generous for normal usage—you'd have to be scripting to hit them.

**Layer 4: Endpoint-Specific**
Different endpoints have different limits. The login endpoint is stricter (protecting against credential stuffing). The read API is looser (people browse a lot). Comment submission has cooldowns (preventing spam floods).

### Graduated Response

Threshold doesn't just block. It escalates:
1. **Warning** — "You're moving fast. Maybe slow down?"
2. **Temporary limit** — "Try again in a few seconds."
3. **Longer cooldown** — "Take a break for a minute."
4. **Block** — For persistent abuse only.

Normal users almost never see anything past the first level.

## What this means for you

**You probably won't notice.** If you're using Grove normally—writing posts, browsing, commenting—Threshold is invisible. It protects without interfering.

**Legitimate spikes are handled.** If your blog goes viral, Threshold recognizes that's different from an attack. Real traffic flows through.

**Abuse doesn't affect you.** Someone attacking another blog doesn't slow down yours. The layers isolate problems.

**Transparency when triggered.** If you do hit a limit, the message tells you why and how long to wait. No mysterious failures.

## Related

- [What is Shade?](/knowledge/help/what-is-shade) — Content protection
- [My site isn't loading](/knowledge/help/my-site-isnt-loading)
- [Threshold Pattern](/knowledge/patterns/threshold-pattern)
- [Grove Workshop → Threshold](/workshop#tool-threshold)

---

*A threshold is a boundary—the point where one space ends and another begins. Good boundaries protect without imprisoning.*
