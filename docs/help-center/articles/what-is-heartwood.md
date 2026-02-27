---
title: What is Heartwood?
description: Grove's centralized authentication system that keeps your identity secure across all properties
category: help
section: how-it-works
lastUpdated: '2026-01-28'
keywords:
  - heartwood
  - authentication
  - login
  - sign in
  - security
  - oauth
  - google
  - magic code
order: 10
---

# What is Heartwood?

You've probably seen it already: that login screen with the Grove logo, asking how you'd like to sign in. That's Heartwood.

Heartwood is Grove's authentication system—the service that verifies you're you. One login works everywhere in the Grove ecosystem. Sign in once, and you're recognized across your blog's admin panel, the community feed, your storage dashboard, everything.

## Why Heartwood exists

Most platforms make you create separate accounts for each service. Different passwords, different logins, different headaches. If you forget which email you used where, you're stuck resetting credentials across a dozen sites.

Grove takes a different approach. Your identity lives in one place—Heartwood—and every Grove property trusts it. Think of it like a library card that works at every branch. You prove who you are once, and the whole system knows you.

![The Grove landing page with Heartwood authentication — one login for the entire ecosystem](https://cdn.grove.place/docs/help/grove-landing.png)

This also means better security. Instead of each service implementing its own login (with its own potential vulnerabilities), authentication happens in one carefully protected place.

## How it works

When you click "Sign In" anywhere in Grove, you're redirected to Heartwood. You'll see two options:

**Google Sign-In** — If you have a Google account, this is the fastest path. Click the button, authenticate with Google, and you're done. Grove never sees your Google password; we just verify your email address through Google's systems.

**Magic Code** — Prefer not to use Google? Enter your email address, and we'll send you a six-digit code. Enter the code, and you're in. The code expires after ten minutes and can only be used once.

Either way, Heartwood creates a secure session and sends you back to wherever you were trying to go. The whole process takes seconds.

Behind the scenes, Heartwood uses industry-standard security practices: PKCE for OAuth flows, rate limiting to prevent brute-force attacks, and comprehensive audit logging so we can detect anything suspicious.

## What this means for you

**One identity, everywhere.** Your Grove account works across all properties. No more remembering which password goes where.

**No passwords to remember.** Between Google Sign-In and magic codes, you never have to create or remember a Grove-specific password.

**Security without complexity.** Heartwood handles the hard parts—token rotation, session management, rate limiting—so you can focus on writing.

**You're in control.** Sessions last 30 days of inactivity, and you can log out anytime. If you ever see activity you don't recognize, let us know.

## Related

- [[heartwood|Creating your account]]
- [[heartwood|Sessions and cookies]]
- [[heartwood|Heartwood Specification]]
- [[heartwood|Grove Workshop → Heartwood]]

---

*The heartwood is the core of a tree—the oldest, densest part that holds everything together. Your identity deserves that kind of protection.*
