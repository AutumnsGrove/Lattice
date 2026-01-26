---
title: What is Passage?
description: The routing layer that makes Grove's subdomains work like magic
category: help
section: how-it-works
lastUpdated: '2026-01-25'
keywords:
  - passage
  - routing
  - subdomains
  - infrastructure
  - how grove works
  - architecture
  - urls
order: 5
---

# What is Passage?

You typed `someone.grove.place` and ended up on their blog. Or maybe `heartwood.grove.place` and landed on the login page. Different addresses, different destinations, all under the same roof.

Passage is how that works.

## The short version

Passage routes traffic across Grove. When you visit any `*.grove.place` address, Passage figures out where you're trying to go and carries you there. One domain, infinite destinations.

Think of it like a river with many channels. You push off from the shore, and the current carries you to where you need to be. You don't think about how. You just arrive.

## The problem it solves

Most websites work like street addresses. One address, one building. If you want ten buildings, you need ten addresses.

Grove wanted something different. We wanted `autumn.grove.place` and `meadow.grove.place` and `heartwood.grove.place` to all exist under one umbrella, each leading somewhere distinct. The technology we use doesn't support this out of the box. It expects one address per destination.

Passage makes the impossible work anyway.

It sits at the entrance to Grove, catches every incoming request, and figures out where it should go. Your blog. Someone else's blog. The login page. The status dashboard. Each subdomain routes to its proper destination, and you never notice the redirect happening.

## What this means for you

**Clean URLs.** Your Grove blog lives at `yourname.grove.place`. No `/users/yourname` or `grove.place/~yourname`. Just your name, your space.

**Everything connects.** Log in at `heartwood.grove.place`, check your dashboard at `arbor.grove.place`, read blogs at `anyone.grove.place`. Different services, same seamless experience.

**It just works.** Type an address, arrive at the destination. The routing happens in milliseconds, invisible, reliable.

## For the technically curious

Passage is a Cloudflare Worker that handles all `*.grove.place` wildcard traffic. When a request arrives, it extracts the subdomain, checks a routing table, and proxies the request to the correct backend service. An `X-Forwarded-Host` header tells the destination which subdomain was originally requested.

Known subdomains (like `heartwood`, `meadow`, or `arbor`) route to specific services. Unknown subdomains route to Lattice, which looks up whether that name belongs to a tenant's blog.

The CDN subdomain (`cdn.grove.place`) serves files directly from R2 storage instead of proxying. Special handling prevents certain file types from executing in browsers.

If terms like "Cloudflare Worker" or "R2" mean something to you, the full architecture is documented in [Passage: The Hidden Way Through](/knowledge/specs/passage-spec).

## Why "Passage"?

In impossible architecture, like an Escher drawing or a Monument Valley puzzle, passages are the secret. Rotate the structure, and a corridor appears where none existed. The geometry shouldn't allow it. The passage doesn't care.

Grove's subdomain system shouldn't work the way it does. The underlying technology wasn't built for it. Passage makes it work anyway, connecting spaces that seem separate, revealing paths that were always there.

The name fits. So does the kayak icon: navigating the river of subdomains, finding your channel, arriving where you meant to go.

## Why we tell you this

You don't need to understand Passage to use Grove. Type an address, arrive at a blog. That's all that matters.

But Grove believes in transparency. The technology that carries your requests deserves explanation, even if most people will never read it. You clicked a link and wondered what Passage was. That curiosity earned an answer.

---

*The way through was always there. Passage just reveals it.*
