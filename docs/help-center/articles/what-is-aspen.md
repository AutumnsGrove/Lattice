---
title: What is Aspen?
description: The domain layer that makes Grove a living platform
category: help
section: how-it-works
lastUpdated: "2026-03-10"
keywords:
  - aspen
  - domain
  - platform
  - database
  - authentication
  - curios
  - how grove works
  - architecture
order: 4
---

# What is Aspen?

You might have ended up here from a spec or a footer link. Either way, welcome.

If you've already read [What is Lattice?](/knowledge/help/what-is-lattice), you know about the framework that holds everything up. Aspen is the other half of the story. It's the living part.

## The short version

Aspen is the domain layer of Grove. It's everything that makes Grove *this* platform: the database, the authentication, the payments, the curios, the content moderation, the email system. If Lattice is the structure, Aspen is the tree growing on it.

## What it actually does

When you publish a bloom, that's Aspen. When you sign in with a passkey, that's Aspen talking to Heartwood. When someone leaves a guestbook entry on your grove, that's a curio — and curios live in Aspen. When a comment gets flagged for moderation, Aspen's Thorn system handles it.

Here's what lives inside:

**Authentication.** Heartwood, the auth system, lives in Aspen. Your identity, your sessions, your passkeys — all managed here.

**Database.** Every grove's posts, pages, settings, and curios are stored through Aspen's database layer. Each tenant's data stays isolated while sharing the same infrastructure.

**Curios.** Timelines, guestbooks, polls, galleries — the interactive pieces that make a grove more than a blog. All domain logic, all Aspen.

**Payments.** Stripe integration, billing tiers, subscription management. The commerce layer that keeps Grove running.

**Content moderation.** Thorn reviews content. Petal checks images. Together they keep the grove safe without making it sterile.

**AI.** Lumen routes AI requests across providers. Reverie handles the composition layer. The intelligence that helps you write, not writes for you.

## Why "Aspen"?

Aspen groves have a secret. What looks like a forest of separate trees is actually one organism. Underground, they share a single root system — the largest living thing on Earth, in some cases. Individual trees come and go, but the root system endures.

That's Grove. Every tenant's site looks independent. Different themes, different content, different voices. But underneath, they share infrastructure: the same database patterns, the same auth system, the same careful design. One root system, many trees.

The name also fits the split. Lattice is the frame. Aspen is the living thing that grows on it. You can't have one without the other, but they're not the same thing.

## What this means for readers

Nothing changes for you. The blog you're reading still loads fast, still respects your privacy, still works on your phone. Aspen is an internal boundary — a way for us to keep the code clear so we can build better things faster.

You won't see the word "Aspen" anywhere on the blogs you read. It's under the hood, doing its work quietly.

## What this means for bloggers

Also nothing you need to worry about. Your writing editor, your admin panel, your theme settings — they all work the same way. Aspen is about how *we* organize the code, not about how *you* use the platform.

The benefit is indirect: cleaner code means fewer bugs, faster features, and a team that can find problems quickly when something goes wrong.

## For the technically curious

Aspen is a workspace library (`@autumnsgrove/aspen`) in the Lattice monorepo. It depends on Lattice for framework primitives — UI components, error handling, rate limiting, Durable Object coordination — and builds the domain logic on top.

Twenty-one modules live in Aspen: `db/`, `heartwood/`, `curios/`, `payments/`, `lumen/`, `reverie/`, `thorn/`, `warden/`, `email/`, `server/`, and more. Each one is a domain concern that has no business living in a generic framework.

The split follows the same pattern as [Prism](/knowledge/help/what-is-prism), which was extracted from the engine as a standalone design token package. Aspen is the same idea, just larger: isolate the concern, draw the boundary, let each side breathe.

If dependency graphs interest you, the rule is simple: Aspen depends on Lattice. Lattice knows nothing about Aspen. The arrow only goes one direction.

## Why we tell you this

Because transparency isn't just a value we claim. It's something we practice.

Most platforms wouldn't explain their internal architecture to their users. But you're not just a user. You're a wanderer in the grove, and every tree has a story. This is Aspen's.

---

*One root system. Many trees. All connected underneath.*
