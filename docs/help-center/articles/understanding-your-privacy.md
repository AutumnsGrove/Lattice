---
title: Understanding Your Privacy
description: How Grove handles your data and privacy
category: help
section: privacy-security
lastUpdated: '2026-11-19'
keywords:
  - privacy
  - data
  - tracking
  - analytics
  - gdpr
  - security
  - personal information
order: 1
---

# Understanding Your Privacy

Privacy isn't a feature we bolt on at the end. It's built into how Grove works from the ground up.

Here's what that actually means for you.

## Your data as a blogger

**We collect what we need, nothing more.**

When you sign up, we store:
- Your email address (to log you in and contact you)
- Your blog content (so we can display it)
- Your settings and preferences (so your blog works the way you want)

That's the core of it. We're not building a profile on you. We're not tracking your behavior to serve you ads. We're hosting your blog.

**You can see everything we have.**

In your admin panel under **Account**, you can export a complete copy of everything Grove stores about you. It's your data. You should be able to look at it.

**You can take it and leave.**

Export gives you your writing as Markdown, plus your images, in a zip that works with other platforms. If you decide to move on, your writing comes with you. We don't hold your content hostage.

## Your readers' privacy

This is where Grove is different from most platforms.

**We don't track your visitors.**

There are no analytics scripts following your readers around the web. No cookies tracking them across sites. No fingerprinting. When someone reads your blog and leaves, that's it. They're gone.

**IP addresses are kept for one minute.**

We need IP addresses briefly for rate limiting (preventing abuse). After 60 seconds, they're discarded. We don't log them, store them, or use them to identify anyone.

**Here's what our data retention looks like:**

| Data Type | Retention |
|-----------|-----------|
| IP addresses | 60 seconds |
| Error logs | 7 days |
| Your blog content | Until you delete it |
| AI conversations (Fireside) | 90 days if you never publish them — see below |
| Your AI provider key | Until you remove it, encrypted and never readable back |
| Account data | Until you close your account |
| Backups | 30 days after deletion |

**No third-party trackers.**

We don't embed Google Analytics, Facebook pixels, or any other tracking scripts. Your readers aren't the product.

## What about analytics?

If you want to know how your blog is doing, Grove offers privacy-respecting analytics on some plans. This means:

- Aggregate data only (page views, not individual visitors)
- No cookies or tracking
- No identifying information stored
- Data stays on Grove's servers, not sent to third parties

You can see trends without surveilling your readers.

## Content moderation

Grove uses two automated systems to keep the community safe:

**[[thorn]]** reviews your blog posts and written content against our community guidelines. **[[petal]]** reviews uploaded images for prohibited content.

Both systems use AI tools with **zero data retention agreements**. This means:

- Your content is processed but never stored by the AI provider
- It's not used to train AI models
- It's analyzed and forgotten
- Only the moderation decision is kept (pass, flag, or block), not your content

We chose providers specifically because they offer these guarantees.

**About image moderation:** [[petal]] includes mandatory CSAM (child sexual abuse material) detection as required by federal law. If illegal content is detected, we're legally required to report it to authorities and retain the image hash (a mathematical fingerprint). This is the only exception to our zero-retention policy, and it's a legal requirement for all platforms.

For the full technical details, see [[zdr]]

## The AI features you turn on

Moderation is not the only place Grove uses AI. It is the only place that runs on
its own, and the difference matters: **the rest is optional.** Nothing reads your
writing unless you ask it to.

**You bring the key.** Features like [[fireside]] and the timeline agent run on a
provider key you add yourself, in Settings → AI. We store it encrypted, per grove,
and we never read it back. Your usage is yours to control, and a feature that
spends your money should be one you switched on.

**Zero retention, even where it costs more.** Every AI provider Grove uses agrees to
keep nothing. They process the request, they do not store it, and they do not train
on it. That is the rule we choose providers by — it costs us more than the
alternative, and it is not open for a cheaper trade.

**A conversation is the one thing that gets kept, and here is exactly how.**

- **It lives in your grove**, in the same database as your words, so you can come
  back to it tomorrow. Nobody at Grove reads conversations; even the moderation of
  AI output is automated.
- **An unpublished conversation is let go after 90 days.** You can delete it sooner
  from the fire itself, and deleting it deletes it — the messages go with it.
- **A transcript is off by default.** The conversation is between you and Wisp until
  you choose otherwise. If you publish a transcript, the whole conversation — both
  sides, in your own words — appears under the post, and it is moderated like any
  other published page. Turning it off takes it back down. Deleting the post deletes
  its transcript; deleting the conversation takes the transcript with it.
- **The timeline agent keeps its runs**, each with what it cost, in your grove's
  database. That is what makes "where did this page come from?" answerable later.

**Why we tell you this at all.** A feature that keeps a conversation is a feature
that has to say so, in the same breath as the promise that nothing else does. We
would rather write the narrower, slightly more complicated sentence.

## Your writing is invisible to AI crawlers

This is something we're genuinely proud of.

Every major AI company sends crawlers across the web, vacuuming up text to train their models. Your blog posts, your personal reflections, your late-night thoughts: they become training data, statistical weights, fuel for machines that simulate human expression.

**Grove says no.**

We use Cloudflare to block every AI crawler, every scraper, every "AI search agent" that wants to harvest content. GPTBot, CCBot, Google-Extended, anthropic-ai. They all hit a wall. Your corner of the web becomes a black hole to these systems.

**What this means for you:**
- Your writing stays between you and your readers
- AI companies can't train on your content
- Your personal expression isn't reduced to training data
- Grove is a sanctuary from the data extraction economy

This matters more than most people realize. As the web gets scraped into datasets, authentic human spaces become rarer. Grove is building one of those spaces.

**An honest caveat:** Some companies (Perplexity being a notable example) have been caught ignoring these protections entirely, bypassing robots.txt and crawler blocks. This is a limitation of how the web works, not something specific to Grove. No website can stop a bad actor who chooses to ignore the rules. What we can promise is that we're using every tool available and staying vigilant as new threats emerge. It's the best protection possible, even if it's not perfect.

**Want the full technical details?** See [[shade]] for a deep dive into our layered protection system, including verification steps for technically-minded users.

*We use AI carefully and transparently: moderation (Thorn for text, Petal for images) runs on its own, and the features you switch on run on your key, on providers that keep nothing. We refuse to let external AI harvest what you create. There's a difference, and we think it's an important one.*

## What we'll never do

Some things Grove will never do, full stop:

- **Sell your data.** Not to advertisers, not to data brokers, not to anyone.
- **Use your content to train AI.** Your writing is yours, not training data.
- **Share your information without your consent.** Unless legally compelled (and we'll fight that where possible).
- **Track your readers.** Their privacy matters too.

## If you have questions

Privacy can feel abstract until you have a specific concern. If you're wondering "does Grove do X with my data?" or "can anyone see Y?"—just ask.

Reply to any email from us, or use the support form. We'll give you a straight answer.

---

*For the full legal version, see our [Privacy Policy](/legal/privacy). For the human version, you just read it.*
