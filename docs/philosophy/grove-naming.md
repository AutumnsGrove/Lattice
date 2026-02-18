---
title: The Grove Naming System
description: The complete philosophy and naming system for the Grove ecosystem
category: philosophy
lastUpdated: "2026-02-04"
---

# The Grove Naming System

> _A forest of voices. Every Wanderer is a tree in the grove._

---

## The Philosophy

The internet used to be a place of personal expression. Somewhere along the way, we traded that for algorithms and engagement metrics. Grove is a return to something simpler: a place where people can plant their thoughts and watch them grow.

These names aren't just branding. They're the language of an ecosystem. Each one draws from the same soil: forests, growth, shelter, connection. Beneath the surface, roots intermingle. Trees share nutrients through mycorrhizal networks. The oldest trees nurture the saplings.

This is how we build.

---

## The Heart of It All

_What you call things matters. These three words are the foundation._

### Your Grove

**Your Space** · `{you}.grove.place`
**AlwaysGrove**
**Waystone:** Your personal blog and website on Grove — your corner of the internet, at {you}.grove.place.

A grove is a small group of trees growing together—intimate, sheltered, yours. The platform is called Grove. Your space within it is _your_ grove. Not a blog. Not a site. A grove.

When someone visits `autumn.grove.place`, they're visiting Autumn's grove. A corner of the forest that belongs to them. The possessive makes it personal. The word makes it home.

> "Welcome to my grove."
> "Come visit Autumn's grove."

_Your corner of the forest._

### Your Garden

**The Collection** · `{you}.grove.place/garden`
**Standard:** Blog
**Waystone:** Your blog's main page — where all your posts are listed for visitors to browse.

A garden is where you tend what grows. It's the cultivated space within your grove where your blooms are planted, arranged, and displayed for visitors to wander through.

The garden is your blog index—the page where all your blooms live together. Not a feed. Not a list. A garden you've tended, organized by season or by hand, ready for someone to stroll through.

> "Browse my garden."
> "New blooms in the garden."

_Where your words grow together._

### Blooms

**Your Writing** · `{you}.grove.place/garden/{slug}`
**Standard:** Posts
**Waystone:** Your blog posts — the things you write and publish on your Grove site.

A bloom is a flower opening—a moment of expression, color, and beauty. It's what your grove produces. It's why visitors come.

Every piece you write is a bloom. Not a post. Not an article. A bloom. Something that grew from your thinking, opened when it was ready, and now stands in your garden for others to see.

> "Read my latest bloom."
> "I wrote a new bloom this morning."
> "Their garden has beautiful blooms."

_What your grove grows._

### The Metaphor Chain

> You **wander** into the Grove → You **take root** → Your **tree** grows → Your **grove** flourishes → It **blooms**

### Implementation Pattern

Like "step away (unsubscribe)" in emails, Grove terms appear prominently with standard terms available for accessibility:

- **UI text:** "Your Garden" / "New Bloom"
- **Aria labels:** "blog posts" / "write new post"
- **URLs:** `/garden` / `/garden/hello-world`
- **Database:** Internal tables may keep standard names (like `Lattice` vs `Lattice`)

The Grove language is what users see and feel. The standard terms remain for screen readers, search engines, and anyone who needs the familiar.

---

## Core Infrastructure

_The foundation everything grows from_

### Lattice

**Core Platform** · `npm: @autumnsgrove/lattice`
**Repository:** [AutumnsGrove/Lattice](https://github.com/AutumnsGrove/Lattice)
**AlwaysGrove**
**Waystone:** The shared framework that powers every Grove site — UI components, design tools, and platform utilities.

A lattice is the framework that supports growth. Vines climb it. Gardens are built around it. It's not the thing you see, it's the thing that holds everything else up.

Lattice is the npm package powering every Grove site. UI components, authentication utilities, markdown rendering, database patterns: all the infrastructure that makes building on Grove feel effortless. You don't admire a lattice. You build on it, and watch what grows.

**Vines** are a feature of Lattice: the widgets and content that fill your blog's gutters (the sidebar margins alongside your main content). Like vines climbing a trellis, they grow alongside your posts: related links, callouts, annotations, metadata. Gutter content that adds context without interrupting the flow.

---

## Platform Services

_Essential services that power every Grove blog_

### Arbor

**Admin Panel** · `{you}.grove.place/admin`
**Standard:** Dashboard
**Waystone:** Your blog's admin dashboard — where you write posts, manage pages, upload images, and configure settings.

An arbor is the structured framework where growth is tended—a garden structure that shapes and supports what grows within it.

Arbor is your blog's control center—write posts, manage pages, upload images, configure settings. Simple, focused, and designed to get out of the way so you can write.

### Plant

**Onboarding** · `plant.grove.place`
**Standard:** Onboarding
**Waystone:** Grove's signup and setup flow — takes you from first visit to publishing your first post.

A seedbed is where seeds are planted and nurtured until they're ready to grow on their own. It's the starting place: carefully prepared soil, the right conditions, gentle care until roots take hold.

Plant is Grove's onboarding system: the complete flow for new users from initial signup through payment, interactive tour, and handoff to their own blog. A frictionless, welcoming experience that gets you publishing within minutes. You arrive as a visitor. You leave with a home.

### Loam

**Name Protection** · _Internal service_
**Standard:** Name Protection
**Waystone:** Checks usernames and domains for reserved words, impersonation, and harmful content before you can claim them.

Loam is the ideal soil. Rich, dark, perfectly balanced. Sand for drainage, silt for nutrients, clay for structure. Every gardener knows it. It's what you want beneath your roots, the foundation that decides what can grow.

Loam is Grove's username and domain validation system. Every name passes through it before taking root: reserved words, impersonation attempts, harmful content, fraud patterns. You won't notice it working. That's the point. Good soil doesn't announce itself. It just quietly ensures that what grows here belongs here.

_What flourishes starts with what the soil allows._

### Amber

**Storage Management** · `amber.grove.place`
**Repository:** [AutumnsGrove/Amber](https://github.com/AutumnsGrove/Amber)
**Standard:** Storage
**Waystone:** Your file storage manager — see what's using space, download your uploads, and clean up what you don't need.

Amber is fossilized tree resin, preserving moments in time, capturing life in suspended animation. It holds what matters, protecting it for centuries.

Amber is Grove's unified storage management system. Every file you upload (blog images, email attachments, profile pictures) is preserved in Amber, organized and accessible from one place. See what's using your space. Download and export your data. Clean up what you don't need. Buy more when you need it. Amber isn't trying to be Dropbox or Google Drive. It's the storage layer that already exists in Grove, made visible and manageable. Every paid user already has storage; Amber is how they understand and control it.

### Foliage

**Theming System** · `foliage.grove.place`
**Repository:** [AutumnsGrove/Foliage](https://github.com/AutumnsGrove/Foliage)
**Standard:** Themes
**Waystone:** Your blog's visual theme — colors, fonts, and seasonal styles that control how your site looks.

Foliage is what you see when you look at a tree. The leaves, the color, the personality that changes with the seasons. No two canopies are quite the same.

Foliage is visual customization for your blog, from accent colors to full theme control. Pick a curated theme or build your own. Make it warm, make it bold, make it _yours_. Your foliage is how the world sees your corner of the grove.

### Curios

**Cabinet of Wonders** · `curios.grove.place`
**Standard:** Custom Pages
**Waystone:** Fun extras for your blog — guestbooks, hit counters, link gardens, custom cursors, and other old-web touches that make your space feel lived in.

A curio is something unusual and intriguing—a curiosity that makes you pause and look closer. Historically, cabinets of curiosities held natural wonders alongside strange artifacts: shells, fossils, oddities, treasures.

Curios is your personal cabinet of wonders. Guestbooks, shrines, hit counters, cursors, link gardens, under-construction badges—the curious little things that make visitors pause and smile. Not your theme (that's Foliage). Not the editor (that's Terrarium). This is the STUFF. The weird, wonderful, old-web-chaos-energy that says "someone lives here."

_What curiosities will they find?_

### Burrow

**Cross-Property Access** · _Integrated into Arbor_
**Standard:** Cross-Site Access
**Waystone:** A way to give trusted people access to another Grove site without making them create a separate account.

In the forest, a burrow is a protected passage beneath the earth. Animals create burrows to move safely between dens, sharing them with family and trusted companions. The passage is invisible from above. You have to know it's there.

Burrow is how you access Grove properties without creating a separate account. When your property and the target are both in greenhouse mode, with matching permissions, you can burrow through with a single click. The connection respects your existing role: Pathfinders get admin access, Rooted Wanderers can contribute, the Wayfinder gets everything. Configure duration from a single day to forever. Full audit trail of who burrowed where.

Dave wants to help moderate The Prism? Burrow him in. The passage opens. He arrives with his permissions intact. When the work is done, fill the burrow, or let it stay open for next time.

**The Burrow Lexicon:**

- **Burrow** — A trusted connection between two greenhouse properties
- **Dig** — Create a burrow (open access)
- **Fill** — Close a burrow (revoke access)
- **Receiving** — A property configured to accept incoming burrows
- **Surface** — Exit a burrowed session, return to origin

_"I'll dig a burrow to The Prism for you."_
_"Put The Prism in receiving mode."_

_A protected way through._

### Rings

**Analytics** · _Integrated into admin dashboard_
**Standard:** Analytics
**Waystone:** Private analytics for your blog — who's reading, what resonates, how your site grows over time. Only you can see them.

Count the rings of a tree and you learn its story. Each ring records a season: growth in plenty, resilience through hardship, the quiet accumulation of years. Rings are internal. Private. You only see them when you look closely at your own tree.

Rings is analytics for writers, not marketers. No public view counts breeding anxiety. No leaderboards. No real-time dopamine hits. Just private insights about your own growth: who's reading, what resonates, how your garden is growing over time. Delayed by design, reflective by nature. Your rings are yours alone.

### Clearing

**Status Page** · `status.grove.place`
**Standard:** Status Page
**Waystone:** Grove's public status page — check here to see if services are running normally or if something's down.

A clearing is an open space in the forest where the trees part and visibility opens up. You can see what's around you, assess the situation, and understand what's happening.

Clearing is Grove's public status page: transparent, real-time communication about platform health. When something goes wrong or maintenance is planned, users can check the clearing to understand what's happening without needing to contact support. Honest updates, component status, incident history. No spin, just clarity.

_Where you go to see what's happening._

### Porch

**Front Porch Conversations** · `porch.grove.place`
**Standard:** Support
**Waystone:** Where you go to get help or ask a question — Grove's support system.

A porch is where you sit and talk. Not a ticket counter. Not a help desk. Just two people on a porch, figuring things out together. You come up the steps, have a seat, and the grove keeper comes out to chat.

Porch is Grove's support system—but it's more than that. It's where you reach out when you need help, or when you just want to say hi. Submit a question, start a conversation, or drop by to see what Autumn's up to. Every visit is tracked, but it never feels like a ticket number.

_Have a seat on the porch. We'll figure it out together._

### Wisp

**Writing Assistant** · _Integrated into editor_
**Standard:** Writing Assistant
**Waystone:** A writing assistant that checks grammar, tone, and readability — without generating or rewriting your content.

A wisp is a will-o'-the-wisp, a gentle, ephemeral light that appears in forests and marshes. It guides without forcing. It's there and then it's not.

Wisp is Grove's ethical writing assistant. It helps polish your voice without replacing it: grammar checks, tone analysis, readability scores. Never generation, never expansion, never brainstorming. Just subtle nudges from a tool that disappears into the background when you don't need it.

**Fireside** is a mode of Wisp for writers who freeze at the blank page. Some people can't start writing, but they have no trouble _talking_. Fireside is a conversation that becomes a post. Wisp asks questions, you answer naturally, and your words get organized into a draft. The fire doesn't tell the story. It just creates the space where stories emerge.

All features off by default. Zero data retention. Your words analyzed, never stored. _A helper, not a writer, and sometimes, a good listener._

### Trails

**Personal Roadmaps** · `username.grove.place/trail`
**Standard:** Project Roadmaps
**Waystone:** Public roadmaps you can share — milestones, phases, and progress on whatever you're building.

A trail is the path you're walking: the route you've chosen through the forest, marked by where you've been and where you're headed. No two trails are the same.

Trails lets Grove users share their own roadmaps with the world. Whether you're building a project, planning a content series, or just charting where your creative work is headed, Trails gives you a place to show the journey. Create waypoints marking milestones, group them into phases with custom names, and let visitors follow along as you make progress.

For those who want to dream bigger: Oak and Evergreen users can bring the full Grove aesthetic to their trails with seasonal themes, nature decorations, custom assets. Or keep it simple with a clean timeline. Your trail, your way.

**Templates available for:** Writers planning content series, developers building in public, musicians tracking album progress, restaurants showing seasonal menus, and more.

_The path becomes clear by walking it._

### Trace

**Inline Feedback** · _(integrated component)_
**Waystone:** A small feedback widget that lets visitors say whether something was helpful, with room for a short note.

A trace is what remains when something passes through. In the forest, it's the impression of a hoof in soft earth, the path worn smooth by many feet, the faintest evidence that someone walked this way before. You don't need to see the whole journey to know it happened. The trace is enough.

Trace is Grove's inline feedback component. A small, warm invitation that appears wherever you want to hear from Wanderers. Not a survey. Not a metric. Just a soft way to say "this helped" or "this didn't," with room to add a few words if you want. Every trace travels back to the Wayfinder. Every voice matters.

_Leave a trace._

### Centennial

**100-Year Preservation** · Earned status
**Standard:** 100-Year Preservation
**Waystone:** After 12 months of paid membership, your grove.place URL stays online for 100 years — even if you stop paying.

A century is the lifetime of an oak—the span between a sapling taking root and becoming something people gather beneath for shade.

When you've been part of Grove long enough to put down real roots (12 months of paid membership), your grove earns Centennial status. Your `name.grove.place` domain stays online for 100 years from the day you planted it—even if you stop paying, even after you're gone. Some trees outlive the people who planted them.

_A hundred years of home._

### Vineyard

**Component Showcase** · `grove.place/vineyard`
**Standard:** Showcase
**Waystone:** Grove's component showcase — a live gallery of every UI piece, nature asset, and design tool available in the platform.

A vineyard is where vines are cultivated and their fruit displayed. Row upon row, each variety labeled, visitors invited to taste and admire.

Vineyard is Grove's component showcase—where you see what's growing in the Lattice, what's ready for use, and what's coming into season. Every UI component, every nature asset, documented and demonstrated. It's where developers come to understand what's available.

_See what's ready to harvest._

---

## Content & Community

_Writing, moderation, and social features_

### Flow

**The Writing Sanctuary** · Arbor editor
**AlwaysGrove**
**Waystone:** Grove's blog editor — a distraction-free Markdown writing space inside your admin dashboard.

Flow is where words find their way. Like water carving through stone, it follows the contours of how writers actually work.

Flow is Grove's immersive Markdown editor—the space inside Arbor where you compose your blooms. When hours pass like minutes and the cursor moves as fast as thought—that's the state Flow creates. It's not just a text field with formatting buttons. It's a sanctuary designed around one belief: the best writing happens when the world fades away.

_Where the current carries you._

### Terrarium

**Creative Canvas** · `grove.place/terrarium`
**Standard:** Creative Canvas
**Waystone:** A drag-and-drop canvas where you arrange nature components into scenes, then use them as decorations on your blog.

A terrarium is a sealed world under glass—a miniature ecosystem you design, arrange, and watch grow. Moss, stones, tiny plants, all placed with intention.

Terrarium is Grove's creative canvas. Drag nature components onto an open space, compose scenes from trees and creatures and flowers, then bring them home to your blog as decorations. Your terrarium becomes your foliage. Same creative freedom as MySpace, but with Grove's curated aesthetic—guardrails that ensure your space looks beautiful while staying uniquely yours.

Create a scene in Terrarium, export it as a decoration, apply it via Foliage to your blog's header, sidebar, footer, or background. The component library is the guardrail: every tree, firefly, and lattice is curated. Users get creative freedom within Grove's nature palette.

_A little world, all your own._

### Weave

**Visual Composition Studio** · _Part of Terrarium_
**Standard:** Visual Composer
**Waystone:** A node-graph editor inside Terrarium for creating animations and diagrams by connecting components together.

Weave is what happens when threads come together—a pattern emerging from connection.

Weave is a node-graph editor within Terrarium for creating animations (Breeze mode) and diagrams (Trace mode). Draw threads between assets, configure timing, watch chains of movement ripple through your scene. A lightweight Mermaid alternative with Grove's dark-mode-first aesthetic.

_Weave your world together._

### Reverie

**Composition Layer** · `reverie.grove.place`
**Waystone:** An AI layer that translates your intent ("make it cozy", "add something that glows") into actual component arrangements for your blog.

A reverie is that state between waking and dreaming, when you're gazing at sunlight through branches, lost in thought, and something forms in your mind's eye. Not a plan. A vision.

Reverie is how you compose your grove. You don't design; you _see_. "Fireflies around my guestbook" isn't a specification—it's a reverie. The system takes your half-formed dream and gives it shape. The manifest knows what exists. The DSL knows how things arrange. But you just... drift into what you want.

Behind every "make it cozy" or "add something that glows," there's a translation layer: your intent becomes a query, the query finds components in the manifest, and the components arrange into a composition. You describe the feeling. Reverie finds the pieces. The result appears in Terrarium or Foliage, ready to become part of your space.

You might never interact with Reverie directly. Like the moment between waking and sleeping, it happens in the background—half-conscious, half-automatic. All you see is what emerges: a scene that captures what you meant.

_Half-dream, half-real. Yours._

### Scribe

**Voice Transcription** · _Integrated into editor_
**AlwaysGrove**
**Waystone:** Voice-to-text for the blog editor — hold a button, speak, and your words appear as text at the cursor.

A scribe is a patient listener—someone who sits beside you and transforms your spoken words into written text. Before keyboards, before typewriters, scribes were how thoughts became documents. You spoke; they wrote.

Scribe is voice-to-text for Grove. Press and hold, speak your thoughts, and watch them bloom into text at your cursor. Two modes: **Raw** transcribes exactly what you say; **Draft** polishes your words, adds structure, and automatically creates Vines for tangents and asides. All processing flows through Lumen—no model downloads, no device requirements. Just talk.

_Speak. The grove scribes._

### Reeds

**Comments System** · _Integrated into blogs_
**Standard:** Comments
**Waystone:** Blog comments — supports private replies to the author and public threaded conversations.

Reeds sway together at the water's edge, whispering in the breeze: a gentle murmur of community.

Reeds is Grove's comment system, supporting both private replies (author-only) and public conversations (author-moderated). The dual system encourages thoughtful engagement while giving blog authors full control over their public-facing content. No reactions on comments—just threaded replies, HN-style simplicity.

_Whisper together at the water's edge._

### Thorn

**Content Moderation** · _Internal service_
**Standard:** Content Moderation
**Waystone:** Automated content moderation that scans for harmful material — without storing or training on your content.

Every rose has thorns for protection. Not aggression, but defense—the boundary that keeps harm at bay.

Thorn is Grove's automated content moderation—privacy-first, context-aware, designed to protect without surveillance. AI-powered but never storing or training on your content. Zero data retention means your words pass through, get analyzed, and vanish. Only the decision remains.

_Protection that works in the background._

### Canopy

**The Visible Grove** · `grove.place/canopy`
**Standard:** Directory
**Waystone:** Grove's opt-in directory — browse who's growing here, discover other wanderers, and find your people.

The canopy is what you see when you look at a forest from above. Every tree's crown is visible—distinct shapes, different colors, each one reaching toward the light in its own way. Some tower. Some spread wide. Some flower. From up here, you can see the whole grove at once.

Canopy is Grove's opt-in directory. When you're ready to be found, you rise into the Canopy—set your name, write a line about yourself, choose what kind of growth you represent. Others browse the Canopy to discover who's here: photographers, poets, developers, dreamers, anyone who chose to be visible. Not everyone reaches the canopy. Some prefer the understory—present, growing, but private. That's okay. The canopy is for those who want to say: _I'm here. Come visit._

No algorithms. No ranking. Just trees, reaching up, visible to anyone who looks.

**Banner** is a feature of Canopy: the short text you write about yourself or your grove—the flag you fly from your highest branch so others know what they'll find when they visit. In standard mode, it's your bio. In Grove mode, it's your Banner.

_See who's growing here._

### Meadow

**The Social Layer** · `meadow.grove.place`
**Standard:** Community Feed
**Waystone:** A social feed where you follow other Grove blogs and see their posts in chronological order — no algorithms.

A meadow is where the forest opens up. Sunlight reaches the ground. You can see the people around you clearly, without the dense canopy of algorithmic noise blocking the view.

Meadow is social media that remembers what "social" means. No public metrics breeding hierarchy. No viral mechanics rewarding the loudest voice. Just a chronological feed of people you chose to follow, with reactions that only the author can see. Encouragement without performance. Connection without competition.

_In development_

### Notes

**Short-Form Posts** · `meadow.grove.place`
**Standard:** Posts / Status Updates
**Waystone:** Quick thoughts you leave in the Meadow. Short-form posts, up to 500 characters, written directly on the community feed.

A note is the smallest complete sound a bird can make. One clear tone in the canopy. Not a song, not a chorus. Just a single thought, carried on the air.

Notes live alongside Blooms in the Meadow timeline. Where a Bloom is a full garden flower (a blog post syndicated from your grove), a Note is a birdsong moment. A quick thought. A reaction. Something you wanted to say without writing an essay about it. No title required. No external link. Just words, left in the meadow for others to find.

> "I left a note in the meadow."
> "Her notes are always worth reading."

_One clear tone in the canopy._

### Forests

**Community Groves** · `{forest}.grove.place`
**Standard:** Communities
**Waystone:** Themed community directories where similar blogs are grouped together — like GeoCities neighborhoods, but with Grove's nature-first naming.

A forest is many trees growing together. Roots intertwined. Shelter shared. No tree grows alone.

Forests are themed community aggregators—places where like-minded folks gather. Inspired by GeoCities neighborhoods, but with Grove's nature-first naming. Join "The Prism" for LGBTQ+ community, "The Terminal" for developers, "The Kitchen" for food lovers. Your foliage appears in that forest's directory, and visitors can wander through finding kindred spirits.

Discovery happens through _strolling_—take a random walk through a forest and discover someone new. No algorithms. No engagement metrics. Just wandering the grove and finding your people.

_Many trees, one grove._

### Wander

**Immersive Discovery** · `wander.grove.place`
**Standard:** Discovery
**Waystone:** An immersive 3D experience where you walk through a virtual forest and discover other people's Grove sites.

Wander is a verb and a place. To wander is to move without a fixed destination, discovering by being present.

Wander is a first-person walking experience through the Grove. Step into the forest. Trees tower above you. Leaves crunch beneath your feet. Birds call in the distance. And scattered among the ancient oaks, floating softly, are other people's groves—their Terrarium scenes rendered in miniature, glowing with their colors, alive with their creativity. Walk toward one that catches your eye. Step closer. Enter their world.

Complete with time of day, seasons, weather, and an immersive soundscape, Wander transforms community discovery into presence. You're not browsing. You're _there_.

_Step into the forest. See who else calls it home._

---

## Standalone Tools

_Independent tools that integrate with Grove_

### Grafts

**Feature Customization** · _Operator-configured_
**Standard:** Feature Flags
**Waystone:** Per-blog feature flags that the grove keeper enables for specific sites — like turning on new capabilities or beta features.

A graft is a branch joined onto rootstock—a deliberate act that makes one tree bear fruit no other can. Orchardists use grafts to create unique varieties: the cutting grows, becomes one with the tree, yet retains what makes it special.

Grafts are per-tenant features that operators enable for specific trees. Not plugins users upload—trusted customizations the Wayfinder configures for particular groves. Want JXL encoding? Graft it on. Need a custom dashboard? Graft it on. Your tree, your grafts, your fruit.

**The Three Layers:**

- **Feature Grafts** — What capabilities a tenant receives (flags, rollouts, tier-gating)
- **UI Grafts** — How capabilities render (reusable components like PricingGraft)
- **Greenhouse mode** — Who gets early access (tenant classification for internal testing)

**The Graft Lexicon:**

- **Graft** — Enable a feature for a tenant
- **Prune** — Disable a feature
- **Propagate** — Roll out to a percentage of the grove
- **Cultivate** — Roll out to everyone
- **Cultivars** — A/B test variants
- **Blight** — Emergency kill switch
- **Took** — The graft is active and working
- **Greenhouse** — Tenant enrolled in early access testing
- **Under glass** — Feature only available in the greenhouse
- **Transplant** — Promote a feature from greenhouse to general availability
- **Harden off** — Gradually expose a greenhouse feature to production

_"I'll graft it onto your tree at dusk."_
_"Dave's tree is in the greenhouse—they'll see the new editor first."_

_A graft makes your tree bear fruit no other can._

### Waystone

**Help Center** · _Integrated into platform_
**Standard:** Help Center
**Waystone:** Contextual help markers throughout Grove — tap one to see what a term or feature means without leaving the page.

Waystones are the markers travelers leave along forest paths—guiding those who follow, showing the way forward.

Waystone is Grove's built-in help center: searchable documentation, contextual help buttons throughout the interface, and a lantern to light your path when you're lost. Not an external docs site, not a separate login. Just help, right where you need it.

_Trail markers for when you're lost._

### Gossamer

**ASCII Visual Effects** · `npm: gossamer` · Icon: `SprayCan`
**Repository:** [AutumnsGrove/Gossamer](https://github.com/AutumnsGrove/Gossamer)
**AlwaysGrove**
**Waystone:** An open-source visual effects library — ASCII patterns, ambient textures, and atmospheric backgrounds for websites.

Gossamer is spider silk stretched between branches—delicate threads nearly invisible until the light finds them. Catching dew at dawn, glittering for a moment, then vanishing into the green. Something so fine it seems impossible, yet there it is.

Gossamer is an open source visual effects library. ASCII patterns that add atmosphere without demanding attention. Floating textures, ambient backgrounds, image transformations. Not the content—the quality of light around it. Barely-there textures woven through your space, character-based patterns that feel handmade.

Framework-agnostic at its core (`gossamer`), with adapters for Svelte (`@gossamer/svelte`), React, and Vue. Born in the Grove, but free to grow anywhere.

_Threads of light._

### Ivy

**Email** · `ivy.grove.place`
**Repository:** [AutumnsGrove/Ivy](https://github.com/AutumnsGrove/Ivy)
**Standard:** Email
**Waystone:** A privacy-focused email client for your @grove.place address — encrypted and minimal.

Ivy climbs the lattice, reaching out, intertwining, linking one point to another. But ivy does something else too: what it covers, it conceals. An ivy-covered wall disappears into green. The structure beneath becomes invisible to anyone outside.

Ivy is email for Grove. Not a Gmail replacement, but a focused, privacy-first mail client for your `@grove.place` address. Professional correspondence for your blog. A place where contact form submissions arrive as threads. Zero-knowledge encryption means your messages travel along the ivy—connected point to point—but wrapped in leaves that only you can see through. We can't read your mail; it's yours alone. One address, chosen once, that's authentically you.

_Connected and concealed._

### Verge

**Remote Coding Infrastructure** · `verge.grove.place`
**Repository:** [AutumnsGrove/GroveVerge](https://github.com/AutumnsGrove/GroveVerge)
**Standard:** Domain Manager
**Waystone:** Serverless remote coding infrastructure — ephemeral compute environments that spin up, do the work, and disappear.

The verge is the edge. The threshold. The liminal space where one state ends and another begins—not quite here, not quite there. In impossible geometries, the verge is where transformation happens. You cross it and emerge changed.

Verge is Grove's serverless remote coding infrastructure. Send your code through the Verge—into ephemeral compute that exists in the space between, temporary VPS instances spinning up in another dimension. AI coding agents work autonomously, transforming what you sent. Then the Verge closes, the compute vanishes, and your code returns more beautiful than you expected.

You send it through. It comes back transformed.

_Brief, brilliant, gone._

### Forage

**Domain Discovery** · `forage.grove.place`
**Repository:** [AutumnsGrove/Forage](https://github.com/AutumnsGrove/Forage)
**Standard:** Domain Search
**Waystone:** An AI-powered domain search tool — describe your project and get a curated list of available domain names.

Before you can plant, you have to search. You walk the forest floor, looking for what you need: something that fits, something that's _available_, something worth bringing home.

Forage is an AI-powered domain hunting tool that turns weeks of frustrating searches into hours. Tell it about your project, your vibe, your budget, and it returns a curated list of available domains that actually fit. Finding the right name takes effort. Forage does the searching so you can focus on choosing.

### Nook

**Private Video Sharing** · `nook.grove.place`
**Repository:** [AutumnsGrove/Nook](https://github.com/AutumnsGrove/Nook)
**Standard:** Link in Bio
**Waystone:** A private video sharing space for small friend groups — faces auto-blurred, content processed locally before sharing.

A nook is a tucked-away corner, a quiet space set apart from the main room. Somewhere intimate and private.

Nook is a privacy-focused video sharing platform for small, trusted friend groups. Not a YouTube channel, not a public archive—just a cozy space where your closest friends can watch the videos you've been meaning to share. All processing happens locally before content becomes accessible. Unknown faces automatically blurred. Your moments, shared only with people you choose.

_Gather close. Share quietly._

### Shutter

**Web Content Distillation** · `shutter.grove.place`
**Repository:** [AutumnsGrove/Shutter](https://github.com/AutumnsGrove/Shutter)
**Waystone:** A web content distillation service — give it a URL and a question, get clean focused content back instead of raw HTML noise.

A shutter controls what reaches the lens. Open it, and light floods in—everything, all at once, overwhelming. But a photographer doesn't want everything. They want _the shot_. The shutter opens precisely when needed, captures exactly what's in frame, and closes before the noise can follow.

Shutter is Grove's web content distillation service. Hand it a URL and a question, and it opens briefly—just long enough to capture what you need—then closes, leaving the chaos outside. Your agents get clean, focused content instead of raw HTML noise. Token budgets stay sane. Prompt injection attempts never make it past the aperture.

_Open. Capture. Close._

### Outpost

**Minecraft Server** · `mc.grove.place`
**Repository:** [AutumnsGrove/GroveMC](https://github.com/AutumnsGrove/GroveMC)
**Standard:** Game Server
**Waystone:** An on-demand Minecraft server for friends — spins up when someone wants to play, shuts down when idle to save costs.

An outpost is where you gather at the edge of the wilderness. A place to rest, regroup, and adventure together.

Outpost is an on-demand Minecraft server for friends. It spins up when someone wants to play, shuts down when the world goes quiet, and costs almost nothing to run. No 24/7 hosting fees for a server that sits empty. Just a place that's there when you need it.

### Aria

**Music Curation** · `aria.grove.place`
**Repository:** [AutumnsGrove/GroveMusic](https://github.com/AutumnsGrove/GroveMusic)
**Waystone:** A music discovery tool — give it a song you love, and it builds a playlist of tracks with similar sonic DNA, with explanations for each pick.

An aria is a self-contained melody, a single voice carrying emotion through song.

Give Aria a song you love, and it builds a playlist of tracks that share the same musical DNA. Not just "similar artists" or genre tags, but actual sonic and emotional connections, with explanations for why each song belongs. Your aria becomes a chorus. One voice finds its kindred.

### Hum

**Music Link Previews** · _Integrated into blogs_
**Standard:** Music Widget
**Waystone:** Music link previews in your posts — paste a Spotify or Apple Music URL and it becomes a beautiful card with album art, track info, and cross-platform links.

A hum is the ambient sound of a living forest—bees in the undergrowth, wind through the canopy, the low vibration of everything being alive. It's also what people do without thinking: hear a song, and hours later you're humming it in the kitchen.

Hum is the music layer in your blooms. Paste a music link on its own line, and it transforms into a warm glass card showing album artwork, track name, and artist. No embed, no iframe, no autoplay—just a beautiful preview that says _here's what I was listening to_. Click the provider badge to find the same song on other streaming services.

Where Aria discovers, Hum remembers. One finds new music. The other shares what you already love.

> "I added a hum to my latest bloom."
> "That hum card for the new album looks gorgeous."

_The forest hums along._

### Etch

**Link Saving & Highlights** · `etch.grove.place`
**Standard:** Blog Importer
**Waystone:** Your personal link library — save URLs, highlight text, tag what matters, and find it all later.

Water drips on limestone for a thousand years and carves a cave. A glacier scores parallel grooves into bedrock. Frost traces patterns on glass. In printmaking, you score a plate with intention—every mark deliberate, every groove holding ink for the next impression. Etching isn't violent. It's patient. And what it leaves behind is permanent.

Etch is your externalized memory. Save any link, highlight any text, carve out what counts. The things you find wandering the internet—articles, tools, videos, references, thoughts—etched into your personal stone so they don't wash away. Anything can go in, but you decide what it means. Tag it, plate it, score the passages that matter. Weeks later, you reach for it and it's there. Patient, permanent, yours.

_Etch is where you carve out what matters._

### Trove

**Library Book Discovery** · `trove.grove.place`
**Repository:** [AutumnsGrove/TreasureTrove](https://github.com/AutumnsGrove/TreasureTrove)
**Standard:** Collections
**Waystone:** A library book discovery tool — point your camera at a shelf and see which books match your taste.

A trove is a collection of precious things, gathered and waiting to be discovered.

Point your camera at a library shelf. Trove identifies the books, cross-references your reading history and tastes, and tells you which ones are worth your time, with visual markers showing exactly where they sit on the shelf. No more decision paralysis. No more walking out empty-handed. Just treasures, found.

---

## Operations

_Internal infrastructure keeping Grove running_

### Heartwood

**Authentication** · `heartwood.grove.place`
**Repository:** [AutumnsGrove/GroveAuth](https://github.com/AutumnsGrove/GroveAuth)
**Standard:** Authentication
**Waystone:** Grove's login and identity system — one account that works across every Grove property.

Cut a tree open and you'll find the heartwood at the center, the densest, most durable part. It's what remains when everything else falls away. It's the authentic core.

Heartwood is centralized authentication for the Grove ecosystem. One identity, verified and protected, that works across every Grove property. Your heartwood is yours. It proves you are who you say you are.

### Pantry

**Shop & Provisioning** · `pantry.grove.place`
**Standard:** Data Store
**Waystone:** Grove's shop — subscriptions, merchandise, credits, and gift cards.

A pantry is where you keep what sustains you. Flour, honey, preserves—the things you reach for when you need them. It's not a storefront with bright lights and sales pressure. It's a cupboard in a warm kitchen, stocked and waiting.

Pantry is Grove's shop. Subscriptions, merchandise, credits, gift cards—the things that keep the grove running and growing. You come when you need something, find what you're looking for, and take it home. Simple, warm, no fuss.

_The cupboard is always stocked._

### Passage

**Subdomain Routing** · _Internal infrastructure_
**Repository:** [AutumnsGrove/Lattice](https://github.com/AutumnsGrove/Lattice/tree/main/packages/grove-router)
**Standard:** Router
**Waystone:** The subdomain router that sends visitors to the right Grove site when they type {you}.grove.place.

A passage is a way through—a corridor connecting spaces that seem separate. In impossible architecture, passages are the secret: rotate the structure, and a passage appears where none existed. The geometry shouldn't allow it. The passage doesn't care.

Passage is how the grove makes the impossible feel inevitable. One domain, infinite destinations. Type `autumn.grove.place` and Passage carries you there—navigating the river of subdomains like a kayak finding its channel. Not by traveling the distance, but by making the distance irrelevant. The architectural barriers that should block you become the corridor that welcomes you home.

_The way through was always there. Passage just reveals it._

### Petal

**Content Safety** · _Internal service_
**Standard:** Image Moderation
**Waystone:** Image safety scanning — checks every uploaded photo and media file for harmful content before it appears on your site.

Petals fall from blooms, each one examined before it touches the ground. Some carry beauty. Some carry harm. Petal knows the difference.

Petal is Grove's content safety service. Every image uploaded, every piece of media shared, passes through Petal's gentle inspection. Working through Lumen, it detects harmful content before it ever reaches your grove. You won't notice it working. That's the point. Safe petals fall. Harmful ones never do.

_Beauty, filtered._

### Warden

**External API Gateway** · `warden.grove.place`
**Standard:** API Gateway
**Waystone:** The API gateway that handles outbound requests to third-party services, keeping API keys secure and never exposed.

The one who holds the keys. A warden doesn't open doors for just anyone—they verify, they check, they ensure only the right requests pass through.

Warden is Grove's external API gateway. Every outbound request to third-party services passes through Warden: GitHub operations, search queries, Cloudflare management, external integrations. Agents describe what they need. Warden executes with injected credentials. Keys never leave the vault.

_Keys stay home. Requests travel light._

### Press

**Image Processing CLI** · _Developer tool_
**Repository:** [AutumnsGrove/CDNUploader](https://github.com/AutumnsGrove/CDNUploader)
**Standard:** Build System
**Waystone:** An image processing tool — converts photos to web format, generates alt text with AI, deduplicates, and uploads to storage.

A press is a tool of transformation. The olive press extracts oil from fruit. The wine press releases juice from grapes. The printing press prepares words for the world. Every press takes something raw and makes it ready.

Press is Grove's image processing CLI. It takes your raw photos and presses them into web-ready form: converted to WebP, described by AI for accessibility, deduplicated by content hash, and uploaded to Cloudflare R2. One command, and your images are ready to publish.

_Raw in. Ready out. Going to press._

### Vista

**Infrastructure Observability** · `vista.grove.place`
**Repository:** [AutumnsGrove/GroveMonitor](https://github.com/AutumnsGrove/GroveMonitor)
**Standard:** Monitoring
**Waystone:** Infrastructure monitoring — tracks health, latency, errors, and costs across all Grove services with real-time dashboards.

A vista is a clearing in the forest where the canopy opens up, a place where you can finally see. The whole grove stretches out before you: what's thriving, what's struggling, what needs attention.

Vista is infrastructure observability for the Grove platform. It monitors every worker, database, storage bucket, and KV namespace, tracking health, latency, error rates, and costs. Real-time dashboards show the state of the entire ecosystem at a glance. When something needs attention, Vista sends an alert before users ever notice. Ninety days of history, always available, quietly watching.

Rings tells writers about their readers. Vista tells the grove keeper about the grove itself.

_Where you go to see everything clearly._

### Patina

**Backup System** · _Internal service_
**Repository:** [AutumnsGrove/Patina](https://github.com/AutumnsGrove/Patina)
**Standard:** Backups
**Waystone:** Automated nightly backups of every Grove database, with weekly archives and 12 weeks of history.

A patina is the thin layer that forms on copper and bronze over time. Not decay, but protection. It's what happens when something weathers the world and comes out stronger. The green of old statues, the warmth of handled wood, the soft wear on a favorite book's spine.

Patina runs nightly automated backups of every Grove database to cold storage. Weekly archives compress the daily layers, and twelve weeks of history remain quietly preserved. You'll probably never think about it, and that's the point. When disaster strikes, Patina is already there, holding everything safe beneath its protective layer.

_Age as armor. Time as protection._

### Mycelium

**MCP Server** · `mycelium.grove.place`
**Standard:** MCP Server
**Waystone:** Grove's MCP server — lets AI assistants read your posts, manage files, and interact with Grove services through a single interface.

In the forest, mycelium is the wood wide web: invisible fungal threads connecting every tree, sharing nutrients and signals across the entire ecosystem. It's how the forest communicates with itself.

Mycelium is Grove's Model Context Protocol (MCP) server, the communication layer that lets AI agents interact with the entire Grove ecosystem. Through Mycelium, Claude can read your blog posts, start Bloom coding sessions, manage files in Amber, and tap into every Grove service, all through a single, unified interface. Just as forest mycelium supports seedlings that can't yet photosynthesize on their own, Mycelium extends your reach, letting AI agents work on your behalf across the grove.

It's the invisible network beneath everything. You don't see it. You don't think about it. But it's how the whole system stays connected.

_In development. Repository: [AutumnsGrove/GroveMCP](https://github.com/AutumnsGrove/GroveMCP)_

_The forest speaks through its roots._

### Lumen

**AI Gateway** · _Internal service_
**Standard:** AI Gateway
**Waystone:** The AI gateway that routes all AI requests to the right model, with rate limiting, data scrubbing, and usage logging.

In anatomy, a lumen is the hollow center of a tube: the empty space inside blood vessels, intestines, airways. It's not the wall. It's not the tissue. It's the void through which everything flows. But lumen also means light. The same word for darkness and illumination.

Lumen is Grove's unified AI gateway. Every AI request in the ecosystem passes through this hollow center: Wisp's writing assistance, Thorn's content moderation, Timeline's summaries, Fireside's conversations. Lumen routes each request to the appropriate model, handles authentication and rate limiting, scrubs sensitive data, normalizes responses, and logs usage. You call one function. Lumen decides whether you need LlamaGuard for safety checks or DeepSeek for generation, Cloudflare Workers AI for speed or OpenRouter for capability.

The paradox is the point. The hollow that carries light. The void through which intelligence flows. The darkness that contains illumination.

_Light from the void._

### Zephyr

**Email Gateway** · _Internal service_
**Standard:** Email Gateway
**Waystone:** The email delivery service that sends all Grove emails — onboarding, notifications, support replies — with retries and templates.

In mythology, Zephyrus was the god of the west wind—the gentlest of the four winds, bringer of spring. While other winds howled and destroyed, the zephyr carried seeds to new soil, pollen to waiting flowers, whispers to distant ears. Invisible. Gentle. Reliable.

Zephyr is Grove's unified email gateway. Every email from every service rides the same wind: onboarding sequences to welcome new Wanderers, payment notifications to confirm purchases, support replies from the Porch, verification codes for authentication. Services don't call Resend directly. They release messages to the Zephyr, and the wind carries them through—with retries, fallbacks, templating, and complete observability. One function call. One gentle breeze. One lit inbox.

Like Lumen routes AI through its hollow center, Zephyr carries messages on the wind. The infrastructure you never see. The delivery you never think about. Until the message arrives.

_Carrying messages on the wind._

### Shade

**AI Content Protection** · `grove.place/shade`
**AlwaysGrove**
**Waystone:** Grove's defense against AI scrapers and data harvesters — robots.txt, meta tags, rate limiting, and legal protections working together.

Shade is the cool relief beneath the canopy. Protection from the harsh glare of exposure. It's where you rest, out of sight from those who would harvest without asking.

Shade is Grove's layered defense against AI crawlers, scrapers, and automated data harvesting. In a world where tech giants treat user content as training data to be extracted without consent, Shade is a quiet refusal. robots.txt directives, meta tags, rate limiting, WAF rules, and legal documentation, all working together so writers can write without worrying about becoming someone else's training data.

_In a forest full of harvesters, this grove stays shaded._

---

## The Ecosystem

| Name           | Category     | Purpose                        | Domain                          |
| -------------- | ------------ | ------------------------------ | ------------------------------- |
| **Your Grove** | Foundational | Your personal space            | {you}.grove.place               |
| **Garden**     | Foundational | Collection of blooms           | {you}.grove.place/garden        |
| **Blooms**     | Foundational | Your writing                   | {you}.grove.place/garden/{slug} |
| **Lattice**    | Foundational | Core platform                  | npm package                     |
| **Wanderer**   | Foundational | Everyone who enters            | —                               |
| **Rooted**     | Foundational | Subscribers                    | —                               |
| **Pathfinder** | Foundational | Trusted guides                 | _(appointed)_                   |
| **Wayfinder**  | Foundational | Autumn (singular)              | —                               |
| **Arbor**      | Platform     | Admin panel                    | {you}.grove.place/admin         |
| **Plant**      | Platform     | Onboarding                     | plant.grove.place               |
| **Loam**       | Platform     | Name protection                | _(internal)_                    |
| **Amber**      | Platform     | Storage management             | amber.grove.place               |
| **Foliage**    | Platform     | Theming system                 | foliage.grove.place             |
| **Curios**     | Platform     | Cabinet of wonders             | curios.grove.place              |
| **Burrow**     | Platform     | Cross-property access          | _(integrated into Arbor)_       |
| **Rings**      | Platform     | Analytics                      | _(integrated)_                  |
| **Clearing**   | Platform     | Status page                    | status.grove.place              |
| **Porch**      | Platform     | Support conversations          | porch.grove.place               |
| **Wisp**       | Platform     | Writing assistant (+ Fireside) | _(integrated)_                  |
| **Trails**     | Platform     | Personal roadmaps              | username.grove.place/trail      |
| **Trace**      | Platform     | Inline feedback                | _(integrated)_                  |
| **Centennial** | Platform     | 100-year preservation          | _(earned status)_               |
| **Vineyard**   | Platform     | Component showcase             | grove.place/vineyard            |
| **Flow**       | Content      | Writing sanctuary              | _(Arbor editor)_                |
| **Terrarium**  | Content      | Creative canvas                | grove.place/terrarium           |
| **Weave**      | Content      | Visual composition             | _(part of Terrarium)_           |
| **Reverie**    | Content      | AI composition layer           | reverie.grove.place             |
| **Scribe**     | Content      | Voice transcription            | _(integrated)_                  |
| **Reeds**      | Content      | Comments system                | _(integrated)_                  |
| **Thorn**      | Content      | Content moderation             | _(internal)_                    |
| **Canopy**     | Content      | Wanderer directory             | grove.place/canopy              |
| **Meadow**     | Content      | Social connection              | meadow.grove.place              |
| **Notes**      | Content      | Short-form posts               | meadow.grove.place              |
| **Forests**    | Content      | Community aggregation          | {forest}.grove.place            |
| **Wander**     | Content      | Immersive discovery            | wander.grove.place              |
| **Grafts**     | Tools        | Feature customization          | _(operator-configured)_         |
| **Waystone**   | Tools        | Help center                    | _(integrated)_                  |
| **Gossamer**   | Tools        | ASCII visual effects           | npm: gossamer                   |
| **Ivy**        | Tools        | Email                          | ivy.grove.place                 |
| **Verge**      | Tools        | Remote coding                  | verge.grove.place               |
| **Forage**     | Tools        | Domain discovery               | forage.grove.place              |
| **Nook**       | Tools        | Private video sharing          | nook.grove.place                |
| **Shutter**    | Tools        | Web content distillation       | shutter.grove.place             |
| **Outpost**    | Tools        | Minecraft server               | mc.grove.place                  |
| **Aria**       | Tools        | Music curation                 | aria.grove.place                |
| **Etch**       | Tools        | Link saving & highlights       | etch.grove.place                |
| **Trove**      | Tools        | Library book finder            | trove.grove.place               |
| **Heartwood**  | Ops          | Authentication                 | heartwood.grove.place           |
| **Pantry**     | Ops          | Shop & provisioning            | pantry.grove.place              |
| **Passage**    | Ops          | Subdomain routing              | _(internal)_                    |
| **Petal**      | Ops          | Content safety                 | _(internal)_                    |
| **Warden**     | Ops          | External API gateway           | warden.grove.place              |
| **Press**      | Ops          | Image processing CLI           | _(developer tool)_              |
| **Vista**      | Ops          | Infrastructure observability   | vista.grove.place               |
| **Patina**     | Ops          | Backup system                  | _(internal)_                    |
| **Mycelium**   | Ops          | MCP server                     | mycelium.grove.place            |
| **Lumen**      | Ops          | AI gateway                     | _(internal)_                    |
| **Zephyr**     | Ops          | Email gateway                  | _(internal)_                    |
| **Shade**      | Ops          | AI content protection          | grove.place/shade               |

---

## Internal Names

For development, debugging, and internal documentation, the `Grove[Thing]` naming convention remains useful. It's explicit and functional: exactly what you want at 2am when something breaks.

| Public Name     | Internal Name   |
| --------------- | --------------- |
| Lattice         | Lattice         |
| Passage         | GroveRouter     |
| Heartwood       | GroveAuth       |
| Arbor           | GroveAdmin      |
| Plant           | Seedbed         |
| Loam            | GroveLoam       |
| Amber           | GroveStorage    |
| Pantry          | GroveShop       |
| Foliage         | GroveThemes     |
| Terrarium       | GroveTerrarium  |
| Weave           | GroveWeave      |
| Curios          | GroveCurios     |
| Reverie         | GroveReverie    |
| Grafts          | GroveGrafts     |
| Burrow          | GroveBurrow     |
| Greenhouse mode | Dave mode[^1]   |
| Gossamer        | gossamer (npm)  |
| Rings           | GroveAnalytics  |
| Clearing        | GroveClear      |
| Waystone        | GroveWaystone   |
| Porch           | GrovePorch      |
| Trace           | GroveTrace      |
| Wisp            | GroveWisp       |
| Scribe          | GroveScribe     |
| Reeds           | GroveReeds      |
| Thorn           | GroveThorn      |
| Canopy          | GroveDirectory  |
| Meadow          | GroveSocial     |
| Forests         | GroveForests    |
| Wander          | GroveWander     |
| Trails          | GroveTrails     |
| Ivy             | GroveMail       |
| Verge           | GroveVerge      |
| Forage          | GroveDomainTool |
| Nook            | GroveNook       |
| Shutter         | GroveShutter    |
| Outpost         | GroveMC         |
| Aria            | GroveMusic      |
| Trove           | TreasureTrove   |
| Press           | GrovePress      |
| Vista           | GroveMonitor    |
| Patina          | GrovePatina     |
| Mycelium        | GroveMCP        |
| Lumen           | GroveLumen      |
| Zephyr          | GroveZephyr     |
| Shade           | GroveShade      |
| Etch            | GroveEtch       |
| Vineyard        | GroveShowcase   |
| Flow            | GroveFlow       |
| Centennial      | GroveCentennial |
| Petal           | GrovePetal      |
| Warden          | GroveWarden     |

---

## A Note on Naming

These names share common ground: nature, shelter, things that grow. But none of them are _about_ trees directly. They're about what happens in and around the forest. Where people gather (Meadow). What you search for and find (Forage). Where you find treasure (Trove). What holds everything together (Lattice).

The Grove is the place. These are the things you find there.

---

## User Identity

_Who walks the grove?_

Grove doesn't use words like "user" or "member." Those feel transactional. Instead, we use language that reflects how people move through this place.

### Wanderer

**Everyone who enters the grove.**
**Standard:** Visitor
**Waystone:** Anyone visiting Grove, whether they have an account or not — the default word for "visitor" or "user" here.

A wanderer is anyone who shows up. No account needed. No commitment required. You're exploring, reading, finding your way. Even after taking root, you never stop being a wanderer. The paths wind on.

> "Welcome, Wanderer."

### Rooted

**Those who've planted their tree.**
**Standard:** Subscriber
**Waystone:** Someone who's signed up, paid, and created their own Grove blog — what other platforms would call a "subscriber."

When you subscribe and create your blog, you take root. You've chosen this place. Your tree grows here now. Being rooted doesn't mean you stop wandering. You've just found a home to return to.

> "You've taken root. Welcome home."

### Pathfinder

**Trusted guides appointed by the Wayfinder.**
**Standard:** Trusted Guide
**Waystone:** A trusted community volunteer who helps other Grove members — appointed by the Wayfinder, similar to a moderator.

Pathfinders know the grove's paths by heart. They help wanderers find their way, answer questions, and light the path forward. The Wayfinder appoints Pathfinders based on trust and contribution.

> "Ask a Pathfinder. They'll show you the way."

### Wayfinder

**Autumn. Singular.**
**Standard:** Grove Keeper
**Waystone:** Autumn — the person who built and runs Grove. There is one Wayfinder.

The Wayfinder tends the grove itself. Where wanderers seek paths, the Wayfinder creates them. There is one Wayfinder.

> "The Wayfinder welcomes you to the grove."

### The Symmetry

**Wanderer** and **Wayfinder** mirror each other:

- Wanderers are _looking for_ the way
- The Wayfinder is _showing_ the way

### Identity vs. Tiers

Subscription tiers (Seedling, Sapling, Oak, Evergreen) describe what you pay.
Identity (Wanderer, Rooted, Pathfinder) describes who you are.

These are orthogonal. A Rooted Seedling is a new subscriber. A Rooted Evergreen is a top-tier subscriber. A Pathfinder can be at any tier. Your tier is a product relationship. Your identity is a community relationship.

_For full documentation, see [Grove User Identity](/knowledge/philosophy/grove-user-identity)._

### Subscription Tiers

_Tiers describe what you pay. Identity describes who you are._

### Seedling

**Starter Tier** · Entry-level plan
**Standard:** Starter
**Waystone:** Grove's entry-level plan ($8/month) — 50 posts, 1 GB storage, and curated themes to get started.

A seedling is the first green shoot breaking through soil. Everything ahead of it. Just planted, full of potential.

Seedling is Grove's entry tier ($8/mo). A quiet corner to call your own: 50 blooms, 1 GB storage, curated themes. Perfect for getting started.

### Sapling

**Growth Tier** · Mid-level plan
**Standard:** Growth
**Waystone:** Grove's mid-tier plan ($12/month) — more storage, more themes, email forwarding, and Centennial eligibility.

A sapling has survived its first seasons. Still young, but growing strong. The trunk thickens. The roots spread.

Sapling is for blogs finding their voice ($12/mo). More storage, more themes, email forwarding, and Centennial eligibility. Room to stretch.

### Oak

**Pro Tier** · Advanced plan
**Standard:** Pro
**Waystone:** Grove's pro plan ($25/month) — unlimited posts, theme customizer, custom domain, and analytics.

An oak takes decades to mature, but once it does, nothing uproots it. Deep roots, broad canopy, shelter for everything beneath.

Oak is for serious bloggers ($25/mo). Unlimited blooms, theme customizer, bring your own domain, analytics. Full creative control.

### Evergreen

**Ultra Tier** · Top-level plan
**Standard:** Ultra
**Waystone:** Grove's top-tier plan ($35/month) — everything Grove offers, including custom fonts, dedicated support, and a domain included.

An evergreen never loses its leaves. Through every season, it remains. Constant, dependable, always flourishing.

Evergreen is the complete package ($35/mo). Everything Grove has to offer: custom fonts, dedicated support, domain included. Always flourishing.

---

## Additional Terms

### Workshop

**Internal Services** · `grove.place/workshop`
**Standard:** Internal Services
**Waystone:** A behind-the-scenes directory of all the internal services that power Grove — for curious visitors who want to see how it works.

A workshop is where tools are made and maintained. Sawdust on the floor, projects in various stages, everything within reach.

Workshop is Grove's internal services directory—a behind-the-scenes look at every tool powering the ecosystem. Authentication, moderation, storage, routing: all the infrastructure laid out for curious Wanderers to explore.

### Fireside

**Focus Mode** · _Part of Wisp_
**Standard:** Focus Mode
**Waystone:** A conversational writing mode — Wisp asks you questions, you answer naturally, and your words get organized into a draft.

A fireside is where stories begin. The crackling warmth, the gentle light, the safety of the circle.

Fireside is a mode of Wisp for writers who freeze at the blank page. A conversation that becomes a post. Wisp asks questions, you answer naturally, and your words get organized into a draft. The fire doesn't tell the story. It just creates the space where stories emerge.

### Vines

**Sidebar Links** · _Part of Lattice_
**Standard:** Sidebar Links
**Waystone:** Sidebar widgets alongside your blog posts — related links, callouts, annotations, and other contextual content in the margins.

Vines climb the lattice, filling the spaces between the main structure. They add color and life to the margins.

Vines are sidebar widgets in your blog's gutters—the content that grows alongside your posts. Related links, callouts, annotations, metadata. Gutter content that adds context without interrupting the flow.

---

[^1]: Named after the first test tenant in Grove. "Dave" was chosen as the most wonderfully mundane, generic example name imaginable during early development. The internal codename "Dave mode" honors this humble beginning. Externally, we call it "greenhouse mode" (fitting the nature theme), but in commit messages and Slack channels, it's forever Dave mode.

---

_Last updated: February 15, 2026 — Added Notes (short-form Meadow posts)_
_Status: Placeholder names, pending launch_
