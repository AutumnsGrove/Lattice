---
title: What are Grafts?
description: Grove's system for enabling and customizing features on individual blogs
category: help
section: how-it-works
lastUpdated: '2026-01-28'
keywords:
  - grafts
  - features
  - customization
  - feature flags
  - configuration
order: 23
---

# What are Grafts?

Not every tree needs the same branches. Some need extra shade. Some need room to fruit. Some are ready for experimental growth.

Grafts is how Grove customizes features for individual blogs. It's why your neighbor's site might have something yours doesn't, or why a new feature appears for you before it's widely available.

## Why Grafts exists

Every platform faces a tension: build one experience for everyone, or let each user have something different. Most choose the former—it's simpler to maintain. But simpler isn't always better.

Grove uses Grafts to split the difference. The core experience stays consistent. But specific features can be "grafted" onto individual trees. Want JXL image encoding? Graft it on. Ready to test a feature before it's official? You might be in the greenhouse.

This isn't about plugins you install. [[Grafts]] are trusted configurations the [[wayfinder]] (that's Autumn) enables for specific [[your-grove|groves]]. It's [[your-garden|garden]]-level decision-making, not a marketplace.

## How it works

Think of your blog as a tree with a healthy trunk and branches. Grafts add new branches—capabilities that grow alongside what's already there.

**Feature grafts** — Individual features that can be enabled or disabled per-blog. Some examples:
- Advanced image formats (JXL encoding)
- Beta features before general release
- Tier-specific capabilities

**Percentage rollouts** — New features often start with a small percentage of groves, then expand gradually. If something breaks, it doesn't break for everyone.

**A/B testing** — Sometimes Grove tests two variations of a feature to see which works better. You might see "Variant A" while someone else sees "Variant B." This helps us build better tools.

**Kill switches** — If a feature causes problems, it can be disabled instantly across all affected groves. Protection built into the system.

[[Grafts]] use Grove's vocabulary:
- *graft* — Enable a feature
- *prune* — Disable a feature
- *propagate* — Roll out gradually
- *blight* — Emergency disable

## What this means for you

**Features appear when they make sense.** If you see something new on your blog, it was grafted on intentionally—either because it fits your tier, because you're part of a rollout, or because you asked for it.

**Some things are tier-gated.** Higher subscription tiers unlock more [[grafts]]. This is how Sapling features differ from Seedling, or how Oak unlocks capabilities beyond Sapling.

**You won't notice most of this.** [[Grafts]] work behind the scenes. The important thing isn't the mechanism—it's that your [[your-grove|grove]] grows in ways that make sense for you.

**Greenhouse mode** — Early access testing for features before they're ready for everyone. If your [[your-grove|grove]] is in the greenhouse, you'll see things before they're official. (See [What is Greenhouse?](/knowledge/help/what-is-greenhouse))

## Related

- [Understanding your plan](/knowledge/help/understanding-your-plan)
- [What is Greenhouse?](/knowledge/help/what-is-greenhouse) — Early access testing
- [Grafts Specification](/knowledge/specs/grafts-spec)
- [Grove Workshop → Grafts](/workshop#tool-grafts)

---

*A graft makes one tree bear fruit no other can. That's customization at the root level.*
