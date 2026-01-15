---
title: "Why Some Usernames Aren't Available"
slug: why-some-usernames-arent-available
category: account-setup
order: 5
keywords: [username, subdomain, blocked, unavailable, reserved, validation, loam, registration]
related: [creating-your-account, what-is-grove, understanding-your-privacy, acceptable-use-policy]
---

# Why Some Usernames Aren't Available

You've picked the perfect username. You type it in. "This username is not available."

Here's why that happens, and what you can do about it.

## The short version

Grove filters usernames before they take root. Some names are reserved for system use. Some are protected for community safety. Others are already taken by existing users.

We don't broadcast the full list (that would help bad actors), but here's what you need to know.

## Why names get filtered

### Reserved for Grove services

Grove has internal services that need specific subdomains. Names like `meadow`, `forage`, `status`, or `api` are reserved because they're part of how Grove works. Trying to claim `meadow.grove.place` when that's where our social feed lives wouldn't make sense.

### System and infrastructure terms

Technical terms that could cause confusion or security issues are blocked: `admin`, `support`, `login`, `mail`, and similar. These need to point to actual Grove infrastructure, not Wanderer blogs.

### Brand protection

Grove's name and related terms are reserved. This prevents confusion about what's official and what's not.

### Community safety

Some usernames aren't available because they'd create a harmful environment. This includes:

- Terms commonly used for impersonation ("official-", "-support", "-admin")
- Fraud patterns and scam indicators
- Content that violates our [Acceptable Use Policy](/legal/acceptable-use-policy)

We don't provide specific feedback when these terms are blocked. The error message is intentionally generic: "This username is not available." This prevents bad actors from testing the boundaries.

### Already taken

The simplest reason: someone else got there first. Once a username is claimed, it stays with that Wanderer until they leave Grove.

## Username requirements

Beyond the blocklist, usernames must:

- Be at least 3 characters long
- Be no more than 30 characters
- Start with a letter
- Contain only lowercase letters, numbers, and hyphens
- Not have consecutive hyphens or end with a hyphen

Good examples: `autumn-writes`, `coffeeshop42`, `mycozyplace`

Not allowed: `42cool` (starts with number), `my--blog` (consecutive hyphens), `a` (too short)

## What to do if your name is blocked

**Try variations.** Add a word that describes what you do: `sarah-writes`, `alex-photos`, `mia-garden`. Your blog's focus often makes a better subdomain than your name alone.

**Add location or year.** If `winterlight` is taken, try `winterlight-pdx` or `winterlight-2026`.

**Think about your readers.** What URL would help them find you? Something memorable and relevant to your content often works better than a clever but obscure choice.

**Contact support.** If you believe your username was incorrectly blocked (rare, but it happens), reach out through [Porch](/knowledge/help/contact-support). We review these case by case.

## Why we do this

This isn't about limiting creativity. It's about making Grove a place where you can trust what you see.

When `grove-support.grove.place` can't exist, no one can impersonate Grove support. When common fraud patterns are blocked, the community stays cleaner. When system terms are reserved, the infrastructure stays reliable.

Good soil doesn't announce itself. It just quietly ensures that what grows here belongs here.

## What we call this system

Internally, we call username validation **Loam**. Like the ideal soil that decides what can grow, Loam filters every name before it takes root. You'll never notice it working unless you try to plant something that doesn't belong.

For technical details, see our [Loam specification](/knowledge/specs/loam-spec).

---

*What flourishes starts with what the soil allows.*
