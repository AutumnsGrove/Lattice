---
aliases: []
date created: Tuesday, January 7th 2026
date modified: Tuesday, January 7th 2026
tags:
  - name-protection
  - validation
  - security
  - content-moderation
type: tech-spec
---

# Loam — Name Protection

> *What flourishes starts with what the soil allows.*

Grove's username and domain validation system. Comprehensive blocklist policy protecting system integrity, brand trademarks, community safety, and user trust.

**Public Name:** Loam
**Internal Name:** GroveLoam
**Version:** 1.0 Draft
**Last Updated:** January 2026

---

## Overview

Loam is the ideal soil. Rich, dark, perfectly balanced. Sand for drainage, silt for nutrients, clay for structure. Every gardener knows it. It's what you want beneath your roots, the foundation that decides what can grow.

Loam is Grove's username and domain validation system. Every name passes through it before taking root: reserved words, impersonation attempts, harmful content, fraud patterns. You won't notice it working. That's the point. Good soil doesn't announce itself. It just quietly ensures that what grows here belongs here.

*Every grove needs good earth.*

This document defines the comprehensive domain/username blocklist policy implemented by Loam. It ensures that:

1. **System integrity** — Infrastructure and service names cannot be claimed
2. **Brand protection** — Grove products and trademarks are reserved
3. **Community safety** — Offensive, harmful, or policy-violating names are blocked
4. **User trust** — Impersonation and fraud are prevented

---

## Current Implementation

### Validation Location
- **Primary endpoint:** `plant/src/routes/api/check-username/+server.ts`
- **Database table:** `reserved_usernames` (packages/engine/migrations/011_user_onboarding.sql)
- **Router config:** `packages/grove-router/src/index.ts`

### Existing Rules
- **Minimum length:** 3 characters ✅
- **Maximum length:** 30 characters ✅
- **Pattern:** `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` (lowercase, numbers, single hyphens)
- **Reserved check:** Database + hardcoded array

---

## Blocklist Categories

### Category 1: System & Infrastructure

**Reason code:** `system`

These are technical routes, protocols, and infrastructure terms that must never be user subdomains.

#### Web/HTTP Infrastructure
```
www, api, app, auth, login, logout, signup, register, account, oauth, sso
admin, administrator, dashboard, panel, console, backend, control
billing, checkout, subscribe, unsubscribe, payment, payments, pay
settings, preferences, config, configuration
```

#### Email/Communication
```
mail, email, smtp, imap, pop, pop3, postmaster, webmail, mx
newsletter, newsletters, noreply, no-reply, mailer, bounce
```

#### Network/Server
```
ftp, sftp, ssh, vpn, proxy, gateway, firewall
cdn, static, assets, media, images, files, img, js, css
upload, uploads, download, downloads, cache
server, servers, node, nodes, cluster
```

#### DNS/Domain
```
ns, ns1, ns2, dns, nameserver, whois
```

#### Metadata/System Files
```
rss, atom, feed, feeds, sitemap, sitemaps, robots, favicon, manifest
status, health, healthcheck, ping, metrics, analytics, telemetry
logs, log, debug, trace, error, errors
```

#### Development/Testing
```
root, null, undefined, void, nan
test, testing, tests, demo, example, sample, sandbox, staging, dev, development, prod, production
temp, tmp, localhost, local, internal
beta, alpha, canary, nightly, preview
```

#### Legal/Compliance
```
legal, terms, privacy, dmca, copyright, trademark, tos, eula
abuse, report, security, vulnerability, cve
compliance, gdpr, ccpa, dsar
```

#### Documentation
```
docs, documentation, wiki, guide, guides, tutorial, tutorials, faq, faqs
help, support, knowledge, kb, knowledgebase
manual, manuals, reference, spec, specs
```

---

### Category 2: Grove Services & Products

**Reason code:** `grove_service`

All current and planned Grove services, ensuring users can't squat on product names.

#### Core Platform
```
grove, groveplace, thegrove, lattice, groveengine
```

#### Public Services (with subdomains)
```
meadow, forage, foliage, heartwood, trove, outpost, aria, plant
ivy, amber, bloom, mycelium, vista, pantry, nook, clearing, porch
```

#### Route-Based Services
```
shade, trails, vineyard, terrarium, weave
```

#### Internal Services
```
patina, rings, waystone, reeds, press, wisp, thorn, loam
```

#### Service Features/Modes
```
fireside, vines, arbor, sway, fern
```

#### Service Aliases
```
domains, music, mc, auth-api, scout, search, og, monitor
```

#### Internal Code Names
```
grovesocial, grovedomaintool, grovethemes, groveauth, grovepatina
treasuretrove, grovemc, grovemusic, seedbed, groveanalytics
grovemail, grovestorage, groveshade, grovetrails, groveshowcase
grovebloom, grovemcp, grovemonitor, grovepress, grovewisp
groveshop, grovenook, groveclear, grovewaystone, grovereeds
groveporch, grovethorn, grovearbor, grovescout, groveloam
```

---

### Category 3: Grove Brand & Trademarks

**Reason code:** `trademark`

Brand names, membership tiers, and protected terminology.

#### Primary Brand
```
grove, groveplace, grove-place, thegrove, the-grove
autumnsgrove, autumns-grove, autumngrove, autumn-grove
autumn, autumns
```

#### Membership Tiers
```
seedling, sapling, oak, evergreen, free, premium, pro, plus, basic
```

#### Brand Concepts
```
centennial, seasons, acorn, canopy, understory, overstory
forest, woods, woodland, tree, trees, branch, branches
root, roots, leaf, leaves, grove-keeper, grovekeeper
```

---

### Category 4: Authority & Impersonation Prevention

**Reason code:** `impersonation`

Terms that could mislead users about official affiliation or authority.

#### Official Status
```
official, verified, authentic, real, true, original, genuine
certified, approved, authorized, licensed
```

#### Staff/Roles
```
admin, administrator, moderator, mod, mods
staff, employee, team, founder, cofounder, co-founder
ceo, cto, cfo, coo, president, director, manager
owner, operator, creator, developer, engineer
```

#### Support/Trust
```
support, helpdesk, help-desk, customerservice, customer-service
trust, safety, security, moderation, enforcement
```

---

### Category 5: Offensive & Policy-Violating Content

**Reason code:** `offensive`

Terms that violate the [Acceptable Use Policy](../legal/acceptable-use-policy.md). This list is intentionally not exhaustive in documentation but is comprehensive in implementation.

#### Approach
The offensive word list includes:
- Racial and ethnic slurs
- Homophobic and transphobic slurs
- Sexist and misogynistic terms
- Ableist slurs
- Religious hate terms
- Sexual/explicit terms (when used as usernames)
- Violence-promoting terms
- Self-harm related terms

**Implementation note:** The full list is stored in a separate private configuration to avoid broadcasting blocked terms. The list draws from industry-standard moderation blocklists while being mindful of reclaimed terms and context.

#### Known Exemptions
Some terms may appear offensive but have legitimate uses:
- `xxx` — Could be placeholder; blocked anyway for username context
- Reclaimed identity terms — Reviewed on case-by-case basis

---

### Category 6: Common Spam/Fraud Patterns

**Reason code:** `fraud`

Terms commonly used for spam, phishing, or fraudulent purposes.

```
free-money, getrich, makemoney, earnmoney, crypto-giveaway
password, passwords, login-here, signin, sign-in
click-here, download-now, limited-time, act-now
winner, congratulations, prize, lottery, jackpot
invoice, receipt, verify, verification, confirm, confirmation
account-suspended, account-locked, urgent, warning, alert
paypal, stripe, venmo, cashapp, zelle (payment impersonation)
```

---

### Category 7: Reserved for Future Use

**Reason code:** `future_reserved`

Names that may become Grove services or features.

```
hollow, glade, thicket, copse, dell, glen, grove-commons
bower, arbor-day, seedbank, greenhouse, nursery
mulch, compost, humus, topsoil
birdsong, cricket, firefly, moth, owl, fox, deer, rabbit
moss, lichen, fern, mushroom, fungus, truffle
stream, brook, creek, pond, spring, well, rain
sunrise, sunset, dawn, dusk, twilight, midnight, noon
```

---

## Validation Order

When checking a username, validate in this order (fail fast):

1. **Length check** — 3-30 characters
2. **Pattern check** — Regex validation
3. **Offensive filter** — Immediate rejection, no suggestions
4. **Reserved check** — Database lookup by category
5. **Existing tenant** — Check `tenants.subdomain`
6. **In-progress signup** — Check `user_onboarding.username` (1-hour window)

---

## Database Schema

### Current Table
```sql
CREATE TABLE reserved_usernames (
  username TEXT PRIMARY KEY,
  reason TEXT NOT NULL,  -- system, grove_service, trademark, impersonation, offensive, fraud, future_reserved
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Recommended Enhancement
```sql
CREATE TABLE reserved_usernames (
  username TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  category TEXT,           -- More specific categorization
  notes TEXT,              -- Why this was added
  added_by TEXT,           -- Who added it (for audit)
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT          -- For temporary reservations
);

CREATE INDEX idx_reserved_reason ON reserved_usernames(reason);
```

---

## API Response Behavior

### For Offensive Terms
```json
{
  "available": false,
  "username": "requested-name",
  "error": "This username is not available",
  "suggestions": null
}
```
**Note:** Do NOT reveal that the term was blocked for being offensive. Generic "not available" prevents gaming the filter.

### For Reserved Terms
```json
{
  "available": false,
  "username": "meadow",
  "error": "This username is reserved",
  "suggestions": ["meadow-writes", "meadow-blog", "meadow-2026"]
}
```

### For Taken Usernames
```json
{
  "available": false,
  "username": "coolblogger",
  "error": "This username is already taken",
  "suggestions": ["coolblogger-writes", "coolblogger-blog", "coolblogger-place"]
}
```

---

## Maintenance & Updates

### Adding New Reserved Terms
1. Add to `reserved_usernames` table with appropriate reason
2. If adding a new Grove service, also update `grove-router` subdomain config
3. Document the addition with date and rationale

### Handling Edge Cases
- **Reclaimed terms:** Review on case-by-case basis; may allow with verification
- **Non-English offensive terms:** Include common terms from major languages
- **Typosquatting:** Consider common misspellings of Grove services (e.g., `meadw`, `forrage`)
- **Leetspeak:** Include common substitutions (e.g., `4dmin`, `h3lp`)

### Periodic Review
- Quarterly review of fraud patterns (new spam trends)
- Annual review of offensive term list (emerging slurs, reclaimed terms)
- On each new Grove service launch, add to reserved list

---

## Legal Basis

This policy implements:
- **Acceptable Use Policy Section 1.5:** Impersonation & Fraud prevention
- **Acceptable Use Policy Section 1.3:** Hate Speech prohibition
- **Terms of Service:** Platform integrity and user safety
- **Trademark protection:** Grove brand and service names

---

## Implementation Checklist

- [ ] Consolidate `ADDITIONAL_RESERVED` array into database
- [ ] Add all Grove services from `docs/grove-naming.md`
- [ ] Create offensive word list (private config)
- [ ] Add typosquatting variants for critical services
- [ ] Update API to use category-aware rejection messages
- [ ] Add admin interface for managing reserved list
- [ ] Create audit log for additions/removals

---

## Related Documents

- [Acceptable Use Policy](../legal/acceptable-use-policy.md)
- [Grove Naming System](../grove-naming.md)
- [Shade Spec](./shade-spec.md) — AI protection patterns
- [User Onboarding Migration](../../packages/engine/migrations/011_user_onboarding.sql)

---

*The grove has room for everyone who comes with good intentions. But some names were never meant to take root.*
