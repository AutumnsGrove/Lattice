---
title: "Social Media Accounts — Source of Truth"
description: "Canonical reference for all Grove social media accounts, branding, handles, and profile setup."
category: marketing
icon: megaphone
lastUpdated: "2026-01-22"
---

# Social Media Accounts — Source of Truth

> **Purpose**: Single canonical reference for all Grove social media accounts
> **Last Updated**: January 2026
> **Owner**: Autumn

---

## Brand Identity

### Name
**Grove** (or "Grove.place" when domain context helps)

### Tagline Options
- "A forest of voices"
- "Your words, your corner of the internet"
- "Blogging without the bullshit"

### One-Liner
A blogging platform that blocks AI crawlers. No algorithms. No ads. Your words stay yours.

---

## Handle

### Primary Handle
**@groveplace**

### Fallback Options (if unavailable)
1. @groveblog
2. @groveblogs
3. @grove_place
4. @thegroveplace

### Consistency Rule
Use the SAME handle across all platforms. Check availability on all target platforms before committing.

---

## Profile Picture

### Primary Logo
`docs/internal/email-assets/logo-autumn-512.png`

**Why autumn?** It's Grove's signature season. The warm golden tones are distinctive and welcoming.

### Seasonal Rotation (Optional)
Rotate logo seasonally to match the actual season:
- **Dec-Feb**: `logo-winter-512.png`
- **Mar-May**: `logo-spring-512.png`
- **Jun-Aug**: `logo-summer-512.png`
- **Sep-Nov**: `logo-autumn-512.png`

### Size Requirements by Platform
| Platform | Profile Pic Size | Use File |
|----------|------------------|----------|
| Twitter/X | 400x400 | logo-*-512.png (will be cropped) |
| Bluesky | 1000x1000 | logo-*-512.png |
| Mastodon | 400x400 | logo-*-512.png |
| Instagram | 320x320 | logo-*-512.png |

### Logo Assets Location
```
docs/internal/email-assets/
├── logo-autumn-512.png    ← Primary
├── logo-spring-512.png
├── logo-summer-512.png
├── logo-winter-512.png
├── logo-midnight-512.png  ← For dark-themed contexts
└── logo-seasons-combined-512-overlap333.png  ← Special occasions
```

---

## Banner/Header Image

### Recommendation
Screenshot of the grove.place landing page forest scene, or a custom banner showing:
- Forest silhouette
- Grove logo
- Tagline: "A forest of voices"

### Size Requirements
| Platform | Banner Size |
|----------|-------------|
| Twitter/X | 1500x500 |
| Bluesky | 3000x1000 |
| Mastodon | 1500x500 |
| Instagram | N/A (no banner) |

### To Create
- [ ] Export forest scene from landing page
- [ ] Create banner at 3000x1000 (scales down for all platforms)
- [ ] Save to `docs/internal/email-assets/banner-*.png`

---

## Bio Text

### Primary Bio (160 characters — Twitter limit)
```
A forest of voices. Blogging platform that blocks AI crawlers.
No algorithms. No ads. Your words stay yours.
🌲 grove.place
```
**Character count**: 142

### Extended Bio (For platforms with more space)
```
A forest of voices.

Blogging platform that blocks AI crawlers. No algorithms. No ads. No engagement metrics breeding outrage.

Your words are not training data. Your attention is not for sale.

Built by a neurodivergent queer dev who thinks the internet can be better.

🌲 grove.place
```

### Mastodon Bio (500 characters)
```
A forest of voices.

Grove is a blogging platform that gives you your own corner of the internet: username.grove.place

What makes it different:
🛡️ Blocks AI crawlers (your words ≠ training data)
📜 No algorithms, just chronological feeds
💚 No public metrics, no dopamine scoreboard
📦 Export everything anytime

Built by @autumn — a neurodivergent queer dev who quit her job to build something better.

🌲 grove.place
```

---

## Links

### Primary Link
**https://grove.place**

### Secondary Links (for link-in-bio or pinned posts)
- Vision: https://grove.place/vision
- Manifesto: https://grove.place/manifesto
- Roadmap: https://grove.place/roadmap
- Help/Waystone: https://grove.place/knowledge

### Link-in-Bio Service
If using Linktree or similar, create: **linktr.ee/groveplace** (or use grove.place/links if you build one)

Recommended link order:
1. grove.place (main site)
2. grove.place/manifesto ("What I Believe")
3. grove.place/vision ("Why This Exists")
4. grove.place/roadmap ("What's Coming")

---

## Account Credentials

> ⚠️ **DO NOT** store actual passwords here. Use a password manager.

### Credential Storage
All social account credentials stored in: **1Password** (or your password manager of choice)

### Account Email
Use a dedicated email for social accounts: `social@grove.place` or `hello@grove.place`

### 2FA
Enable on ALL accounts. Use authenticator app, not SMS.

---

## Platform-Specific Setup

### Bluesky
- [ ] Handle: @groveplace.bsky.social (or custom domain later)
- [ ] Profile pic: logo-autumn-512.png
- [ ] Banner: TBD
- [ ] Bio: Primary bio
- [ ] Link: grove.place
- [ ] Custom domain handle: @grove.place (set up later via DNS)

### Mastodon
- [ ] Instance: hachyderm.io or indieweb.social (tech-friendly instances)
- [ ] Handle: @groveplace@[instance]
- [ ] Profile pic: logo-autumn-512.png
- [ ] Header: TBD
- [ ] Bio: Mastodon extended bio (500 char version)
- [ ] Metadata fields:
  - Website: grove.place
  - Pronouns: (your pronouns)
  - Founded: November 2025

### Twitter/X
- [ ] Handle: @groveplace
- [ ] Profile pic: logo-autumn-512.png
- [ ] Banner: TBD
- [ ] Bio: Primary bio (160 char)
- [ ] Link: grove.place
- [ ] Location: "The internet, but cozy"
- [ ] Professional account: No (keep it personal)

### Instagram
- [ ] Handle: @groveplace
- [ ] Profile pic: logo-autumn-512.png
- [ ] Bio: Primary bio + line breaks
- [ ] Link: grove.place (or linktree)
- [ ] Category: "Software" or "Personal Blog"
- [ ] Contact options: OFF (keep it simple)

---

## Voice & Tone Quick Reference

### Do
- First person ("I built this...")
- Values-forward
- Vulnerable when authentic
- Nature metaphors
- Call out what you're against

### Don't
- Corporate "we" (it's just you)
- Engagement bait
- Apologize for having principles
- Water down the manifesto energy

### Example Posts

**Good:**
> I blocked ClaudeBot from Grove, even though I built Grove with Claude.
>
> Your words are not training data. Principles matter.
>
> grove.place

**Bad:**
> Excited to announce our new AI protection feature! 🎉 What do you think? Let us know in the comments!

---

## Hashtags

### Primary (use sparingly)
- #indieweb
- #personalweb
- #blogging
- #solarpunk

### Avoid
- #startup
- #SaaS
- #growthhacking
- Anything that sounds like marketing

### Platform-specific
- Bluesky: Hashtags work but aren't as central
- Mastodon: Hashtags are important for discovery
- Twitter: Use 1-2 max, or none
- Instagram: Use in first comment, not caption

---

## Pinned Post

### Recommendation
Pin your "Why Grove Exists" personal blog post once written.

Until then, pin the manifesto link:
> The internet used to be a garden. Then the walls went up.
>
> I'm building a way out.
>
> grove.place/manifesto

---

## Cross-Posting Rules

### Same content across platforms: OK for announcements
### Tailored content: Better for engagement
### Never: Screenshot tweets to post on other platforms (tacky)

### Cross-post order
1. Write for Bluesky first (most aligned audience)
2. Adapt for Mastodon (add hashtags, can be longer)
3. Condense for Twitter
4. Visual version for Instagram (if applicable)

---

## Account Checklist

### Bluesky
- [ ] Account created
- [ ] Profile pic uploaded
- [ ] Banner uploaded
- [ ] Bio written
- [ ] First post made
- [ ] grove.place link added

### Mastodon
- [ ] Instance chosen
- [ ] Account created
- [ ] Profile pic uploaded
- [ ] Header uploaded
- [ ] Bio written (500 char version)
- [ ] Metadata fields filled
- [ ] First post made
- [ ] Account verified via rel="me" link

### Twitter/X
- [ ] Account created
- [ ] Profile pic uploaded
- [ ] Banner uploaded
- [ ] Bio written
- [ ] First post made
- [ ] grove.place link added

### Instagram
- [ ] Account created
- [ ] Profile pic uploaded
- [ ] Bio written
- [ ] Link added
- [ ] First post made
- [ ] Highlights set up (optional)

---

## Maintenance

### Weekly
- Check notifications/replies
- Post 2-3 times
- Respond to genuine engagement

### Monthly
- Review follower quality (bots? real people?)
- Update pinned post if needed
- Check all links still work

### Seasonally
- Update profile pic to match season (optional)
- Refresh bio if anything major changed
- Review what content performed well

---

*This document is the canonical source. When in doubt, refer here.*
