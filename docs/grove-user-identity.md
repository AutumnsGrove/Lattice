# Grove User Identity System

> *A forest of voices. Every Wanderer walks their own path.*

---

## Overview

Grove uses a layered identity system that reflects how people move through and belong to the community. These aren't membership tiers or subscription levels. They describe *who you are* in the grove.

---

## The Identities

### Wanderer
**Everyone who enters the grove.**

A wanderer is anyone who shows up. No account needed. No commitment required. You're exploring, reading, finding your way through the paths between trees.

Wanderers are welcome to stay as long as they like, or pass through and never return. The grove doesn't demand anything of you.

> "Welcome, Wanderer."

### Rooted
**Those who've planted their tree.**

When you subscribe and create your blog, you take root. You've chosen this place. Your tree grows here now.

Being rooted doesn't mean you stop wandering. You still walk the paths, visit other trees, gather in the Meadow. But now you have a home to return to.

> "You've taken root. Welcome home."

### Pathfinder
**Trusted guides appointed by the Wayfinder.**

Pathfinders are community members who've walked the grove long enough to know its paths by heart. They help other wanderers find their way, answer questions, and light the path forward.

This isn't a role you earn through tenure or payment. The Wayfinder appoints Pathfinders based on trust, contribution, and care for the community.

> "Ask a Pathfinder. They'll show you the way."

### Wayfinder
**Autumn. Singular.**

The Wayfinder tends the grove itself. She finds the way forward, then shows it to others. Where wanderers seek paths, the Wayfinder creates them.

There is one Wayfinder. The role isn't a title to be earned or passed on. It's just who Autumn is to this place.

> "The Wayfinder welcomes you to the grove."

---

## The Symmetry

**Wanderer** and **Wayfinder** mirror each other:

- Wanderers are *looking for* the way
- The Wayfinder is *showing* the way

Everyone starts as a wanderer. Some take root. A few become pathfinders. One tends the grove.

---

## How Identity Relates to Subscription Tiers

These are separate systems.

**Subscription tiers** (Seedling, Sapling, Oak, Evergreen) describe what you pay and what features you have access to.

**Identity** describes who you are in the community.

You can be:
- A Rooted Seedling (new subscriber, entry tier)
- A Rooted Evergreen (subscriber, top tier)
- A Pathfinder at any tier (appointed, not purchased)

The two systems are orthogonal. Your tier is a product relationship. Your identity is a community relationship.

---

## Usage

### Welcome Messages
- Anonymous visitors: "Welcome, Wanderer."
- New subscribers: "You've taken root. Welcome among the Rooted."
- Returning users: "Welcome back, Wanderer." (Everyone remains a wanderer, even when rooted.)

### Community Language
- Addressing everyone: "Fellow wanderers..."
- Referring to subscribers: "The Rooted"
- Referring to trusted helpers: "Pathfinders"

### Marketing & About Pages
- "Grove is a place for wanderers."
- "Plant your tree. Take root. Grow."
- "Some wanderers become Pathfinders. One tends the grove as Wayfinder."

### Subscription Flow
- CTA: "Ready to take root?"
- Confirmation: "You're one of the Rooted now."

---

## Implementation Guide

### Context-Specific Usage

**Public/Anonymous Contexts** (landing pages, marketing, first-touch):
- Use "Wanderer" generically
- "Welcome, Wanderer." — first visit to the site
- "Every Wanderer is a tree in the grove." — vision statement

**Authenticated/Personal Contexts** (dashboard, personal emails):
- Use the person's actual name
- "Welcome back, Jordan." — dashboard greeting
- "Hey {{name}}," — personal email follow-ups

**Email Templates:**
| Type | Greeting | Rationale |
|------|----------|-----------|
| Welcome email | "Welcome, Wanderer." | First touch, establishing Grove identity |
| Day 1-30 follow-ups | "Hey {{name}}," | Personal relationship, use their name |
| Payment received | "Hey {{name}}," | Transactional, personal |
| Subscription confirmation | "You've taken root, {{name}}." | Celebratory, use name |

### In Code

```typescript
// Public landing page
<p>Welcome, Wanderer.</p>

// Authenticated dashboard - use actual name
const userName = data.user?.name || data.user?.email?.split('@')[0] || 'Wanderer';
<p>Welcome back, {userName}.</p>

// Email template - personal follow-ups
<p>Hey {{name}},</p>
```

### Avoid

- Never use "user" or "member" in user-facing text
- Never use "subscriber" — use "Rooted" or "the Rooted"
- Don't use "Wanderer" when you have access to the person's actual name in personal contexts

---

## Technical Implementation Notes

- **Pathfinder** functions similarly to the existing "Trusted Admin" role in the database
- Only the Wayfinder can appoint Pathfinders
- Consider: badge/flair in Meadow for Pathfinders
- Consider: Pathfinder-only channels or early access to features

---

## The Story

You enter the grove as a Wanderer. You explore the paths, find the clearings, meet other wanderers. Something resonates. You plant your tree. You take root.

Now you're Rooted. This is home.

Time passes. You learn the paths by heart. You help other wanderers find their way. The Wayfinder notices. She makes you a Pathfinder.

Now you light the way for others. But you never stop wandering. None of us do.

---

*Last updated: January 15, 2026*
