---
title: "Grove's Decentralization Strategy — Safari Expedition Journal"
description: "A strategic exploration of how Grove prevents platform capture, inspired by 'Be Wary of Bluesky'"
category: plans
icon: compass
lastUpdated: "2026-02-21"
tags:
  - strategy
  - decentralization
  - ownership
  - philosophy
---

# Decentralization Safari — Against the Grain

> _"The protocol can't save you from incentives."_ — Kevin Åberg Kultalahti
>
> **Aesthetic principle**: Ownership is not a feature. It's the architecture.
> **Scope**: 6 strategic tension points between Grove's values and the gravity of centralization.

**Catalyst:** ["Be Wary of Bluesky"](https://kevinak.se/blog/be-wary-of-bluesky) — a February 2026 article arguing that ATProto's "open protocol" has become a centralization flywheel. Nearly all user data sits on Bluesky-operated servers. Bluesky controls the Relay, the AppView, and the DID directory. $120M in VC means the incentives point one direction: consolidation.

The killer line: _"At every layer, the answer is 'anyone can run their own.' At every layer, almost nobody does."_

The Gmail parallel: email is open. Gmail won anyway. The default wins. Always.

**The question for Grove:** How do you build something where the _default_ is genuine ownership — not theoretical ownership behind a protocol nobody self-hosts?

---

## Route Map

| # | Stop | Terrain | Health |
|---|------|---------|--------|
| 1 | The Subscription Advantage | Business model & incentives | Growing 🟡 |
| 2 | The Cloudflare Dependency | Infrastructure vendor lock-in | Wilting 🟠 |
| 3 | Export vs. Mass Scraping | Data portability vs. protection | Growing 🟡 |
| 4 | What "Owning Your Words" Means | True ownership beyond ZIP files | Wilting 🟠 |
| 5 | The Anti-Bluesky Playbook | Architectural commitments | Growing 🟡 |
| 6 | The Open Web Tension | Readable content vs. AI scraping | Thriving 🟢 |

---

## 1. The Subscription Advantage

_The jeep rolls to a stop at a watering hole. Clear water. No algae. No parasites. You realize: this watering hole is clean because someone maintains it. And that someone gets paid to do it. Not by advertisers. Not by data brokers. By the creatures who drink here._

### What the article reveals

Bluesky is free. Infinite posts. No cost. Sounds generous — until you ask: **who pays?** $120M in venture capital pays. And VC money doesn't invest in freedom. It invests in returns. When "free" is the product, _you_ are the product. It's just a matter of time.

The article's Gmail parallel cuts deep: email is an open protocol, but Gmail dominates because free + convenient beats open + self-hosted every single time. The protocol didn't save email from centralization. The incentives did the opposite.

### What Grove has today

Grove charges money. This is not a weakness. **This is the single most important architectural decision Grove has ever made.**

- No ads means no incentive to maximize engagement or time-on-site
- No VC means no board pushing for growth-at-all-costs or eventual monetization pivots
- No free tier with "premium upsell" means every user is a paying customer whose needs matter equally
- Revenue comes from serving users well, not from extracting value from them

The subscription _is_ the alignment mechanism. When your only customer is the person writing, every incentive points toward making that person's experience better — not toward harvesting their attention or their data for someone else.

### The honest tension

Autumn named it directly: _"I already have incentive to keep everything centralizing on Grove's servers."_

This is true. A subscription model means:
- Users leaving = lost revenue. There's a natural incentive to make leaving friction-ful.
- The more features tied to Grove's infrastructure, the harder it is to replicate elsewhere.
- "Your data is portable" rings hollow if the _experience_ isn't portable.

But here's the crucial difference from Bluesky: **Grove's incentive to retain users is through quality of service, not through data captivity.** Bluesky retains users because your social graph is trapped. Grove retains users because the writing experience is good and the price is fair. One is a lock. The other is a reason to stay.

### Safari-approved design

**Commitment: The Subscription Transparency Principle**

1. **Price justifies itself.** Every dollar of subscription goes toward hosting, development, and maintenance — never toward building moats. Document this publicly.
2. **Switching cost audit.** Annually review: "If a user cancelled today, what would they lose that they _shouldn't_ lose?" Anything that fails this test gets fixed.
3. **No dark patterns around cancellation.** One click to cancel. Export link in the cancellation flow. No "are you sure?" guilt trips.
4. **Revenue as proof of alignment.** In Grove's annual transparency report (if/when it exists), show that revenue comes from subscriptions only. No data licensing. No API access fees for user content. No "partnerships" that monetize the user base.

**The bottom line:** Bluesky's business model is a time bomb. Grove's is a handshake. The subscription IS the decentralization strategy — it means you never need to find "another way" to make money from user data.

---

## 2. The Cloudflare Dependency

_The jeep climbs a ridge and you see it: a vast river system feeding the entire savanna. Every stream, every tributary, every watering hole — all fed by one source. It's magnificent infrastructure. It's also a single point of failure._

### What the article reveals

The article warns that Bluesky controls the Relay, the AppView, and the DID directory — the entire stack. But at least ATProto is a _protocol_. Anyone _can_ run their own (they just don't).

Grove's situation is arguably more honest but also more exposed: the entire stack runs on Cloudflare. Not a protocol anyone could reimplement. A specific vendor's proprietary services.

### What Grove has today

**32 wrangler.toml files.** The dependency is bone-deep:

| CF Service | Grove Usage | Portability |
|-----------|-------------|-------------|
| Workers | All backend logic (14+ services) | Medium — standard JS/TS, but the runtime API is CF-specific |
| D1 (SQLite) | All databases | High — it's SQLite. The data is fully portable. |
| KV | Caching, config, sessions | Medium — key-value is a commodity pattern |
| R2 | All media storage (images, exports) | High — S3-compatible API |
| Durable Objects | Coordination, rate limiting, sessions | Low — CF-proprietary concept |
| DNS/Domains | All routing, subdomain management | Medium — DNS is standard, but CF's API is specific |
| Pages | Frontend hosting | High — static files work anywhere |
| Turnstile | Bot protection (Shade) | Low — CF-proprietary |
| AI Gateway | Per-tenant AI routing | Low — CF-proprietary |

**The honest assessment:**
- **Data is portable.** D1 is SQLite (downloadable). R2 is S3-compatible (standard tooling). Content exports are Markdown/JSON. The `.grove` file format spec (`docs/specs/file-formats-spec.md`) already defines a comprehensive portable archive format. This is genuinely good.
- **Logic is entangled.** Workers runtime, Durable Objects, service bindings, KV — the _code_ is deeply coupled to CF's execution model.
- **No abstraction layer — yet.** `libs/shutter/cloudflare/` exists for Shade, but most services call CF APIs directly. This is the biggest opportunity for improvement.

**The Server SDK vision:**

What if all Cloudflare interactions were abstracted behind a **Server SDK** — generic enough to eventually support bindings for other infrastructure providers (Azure, GCP, AWS, Vercel, whoever)?

- Every call to D1, KV, R2, Workers, service bindings goes through the SDK instead of hitting CF APIs directly
- The SDK maintains the Signpost error code system (`docs/developer/signpost-error-codes.md`) with its own prefix (e.g., `SRV-001` through `SRV-099`) following the existing category ranges
- The SDK could be consumed by `gw` itself, simplifying the CLI's infrastructure operations
- Adding a new provider becomes adding a set of bindings/adapters, not rewriting application code
- Even while running 100% on Cloudflare underneath, the abstraction means migration becomes _mechanical_ rather than _architectural_ — swap the adapter, keep the interface
- This follows the same pattern as Loom (abstracts Durable Objects), Threshold (abstracts rate limiting), and Firefly (abstracts ephemeral servers) — it's the Grove SDK philosophy applied to the infrastructure layer itself

**This deserves its own spec.** See: Server SDK spec (to be written via /swan-design).

### The honest tension

Is Grove just trading "centralized on Bluesky's servers" for "centralized on Cloudflare's servers"?

**Yes and no.** The crucial difference:
- Cloudflare is _infrastructure_, not _platform_. CF doesn't own your content, doesn't show it to users, doesn't run a social network. They're the electric company, not the landlord.
- CF has contractual obligations. You're a paying customer with an SLA, not a free user with a TOS that says "we can do whatever we want."
- **But** — if CF raises prices 10x, changes TOS, gets acquired by Oracle, or decides to compete with Grove... the migration would be _painful_. Not impossible, but painful.

### Safari-approved design

**Commitment: The Cloudflare Contingency Principle**

The goal isn't to eliminate CF dependency (that's unrealistic and wasteful). It's to ensure **the data is always free to leave, even if the code takes work to move.**

1. **Data portability is already strong — protect it.**
   - D1 is SQLite → always exportable
   - R2 is S3-compatible → any S3 tooling works
   - Content is Markdown/JSON → universal formats
   - **Action:** Add automated monthly data integrity checks that verify export completeness

2. **Document the migration playbook — and make the SDK the execution path.**
   - Write a "Break Glass: Moving Off Cloudflare" document that maps every CF service to its portable equivalent (Workers → AWS Lambda/Deno Deploy, D1 → Turso/PlanetScale, R2 → S3/Backblaze, KV → Redis/Upstash, DOs → Fly machines or Railway)
   - Not because you plan to migrate. Because you _could_. And documenting it keeps you honest about the coupling.
   - With the Server SDK in place, the playbook becomes more than documentation — it becomes a **concrete implementation plan**: "write these adapter modules, swap this config, deploy." The SDK makes the playbook _executable_, not just aspirational.
   - **This deserves its own document.** See: Break Glass migration playbook (to be written via /owl-archive).

3. **Accept the Durable Object reality.**
   - DOs are the hardest to migrate — and honestly, they may be irreplaceable for what Grove needs. The Loom SDK depends on DOs for coordination. Even the Firefly SDK (ephemeral servers) uses Loom underneath to track instance state. There's no serverless alternative that provides the same guarantees: persistent WebSocket connections, transactional state, and guaranteed single-instance execution.
   - **The honest position:** DOs are the tightest coupling to Cloudflare. No realistic alternative exists today. If CF ever becomes hostile, this is the hardest piece to migrate — likely requiring a stateful server (Fly.io, Railway) rather than a serverless equivalent.
   - **Mitigation:** Keep DO logic isolated behind clean interfaces (the Loom SDK already does this). If a migration is ever needed, the _interface_ stays the same; only the _implementation_ changes. Document the DO contract clearly so a future reimplementation is possible even if painful.

4. **Monitor the relationship.**
   - Track CF spend monthly. Set alerts for unexpected increases.
   - Keep tabs on CF's TOS changes, acquisition rumors, and competitive moves.
   - If CF ever launches a blogging product, that's the signal to start the contingency.

**The bottom line:** Cloudflare is the best infrastructure partner for what Grove needs today. The data is portable. The code would take work to move but it's not impossible. That's an honest, acceptable position — as long as you never _pretend_ the dependency doesn't exist.

---

## 3. Content Exportability vs. Mass Scraping

_Through the binoculars, you spot a paradox: a grove with an open gate. Anyone who lives here can carry their belongings out freely. But the gate also means outsiders could walk in and photograph everything. How do you keep the gate open for residents without making it a highway for extractors?_

### What the article reveals

Bluesky's ATProto makes everything "open" — which sounds great until you realize that means every post, every like, every follow is harvestable by anyone running a relay. The "openness" of the protocol isn't a feature for users. It's a feature for whoever wants to build on top of (or extract from) user data at scale.

### What Grove has today

**Export is solid.** From `docs/legal/data-portability-separation.md`:
- ZIP with Markdown posts, images, comments, config
- JSON format for structured data
- Self-service from Admin Panel → Settings → Export Data
- Auto-export link sent on cancellation
- 90-day grace period with full data access
- No fees, no delays, no hostage situations

**Shade blocks AI crawlers.** From `docs/specs/shade-spec.md`:
- 8-layer defense system
- 100+ AI crawlers blocked (GPTBot, CCBot, Google-Extended, anthropic-ai, etc.)
- Cloudflare Turnstile for verification
- robots.txt + meta tags + HTTP headers
- Legal framework (TOS prohibiting scraping)

**No public bulk download API.** Individual blogs are readable on the web (no login wall), but there's no API endpoint that returns "give me all posts from all users in JSON."

### The honest tension

Autumn named it perfectly: _"That feels like kinda locking someone in to using OUR services."_

The tension has three edges:

1. **User can export their own data** → Good. Genuine ownership.
2. **No one else can bulk-export a user's data** → Good for privacy. But it means the only way to _use_ your data is through Grove.
3. **If Grove disappears, the only export mechanism disappears with it** → That's the real risk.

This is NOT the same as Bluesky's lock-in. Bluesky locks you in through _social graph_ — your followers, your connections, your identity. Grove's "lock-in" (if you can call it that) is purely _operational_ — the mechanics of getting data out. And Grove already solves this with self-service export.

But the deeper question is: **Is "you can download a ZIP" enough?**

### Safari-approved design

**Commitment: The Escape Hatch Principle — Your Data Leaves Before You Do**

1. **Automated periodic exports via Amber.**
   - Amber is Grove's **unified storage management system** — not just media/export, but the visibility and control layer over all uploaded content across every service (blog images, Ivy email attachments, profile assets, themes, fonts, exports). It already has a `StorageRepository` abstraction, quota tracking, R2 integration, and Durable Object-based export processing.
   - An **Amber SDK** would formalize this into a clean, importable library that any Grove service can use for storage operations — the same way Loom abstracts DOs and Threshold abstracts rate limiting. This SDK feeds directly into the Server SDK vision: Amber becomes the storage adapter that today speaks R2, but tomorrow could speak S3/GCS/Azure Blob.
   - Extend Amber to run automated backups on a configurable schedule — weekly, monthly, or custom.
   - **Internal backup:** Every export is stored in the user's Amber storage automatically. Your latest backup is always sitting there, ready to download, without you having to remember to request one.
   - **External sync:** Users can optionally connect external storage providers — iCloud, Google Drive, Dropbox, Mega, S3-compatible buckets — and Amber pushes encrypted backups to them on the same schedule. Abstract the provider interface so adding a new one is a config addition, not a code rewrite.
   - **Email-based retrieval:** Allow data exports to be requested by emailing a dedicated address (e.g., `export@grove.place`) from the email associated with your account. If `dave@grove.place` emails asking for Dave's data, he gets a bundled ZIP. If he asks for Sarah's data, the response says "you can only access your own data" — without confirming or denying Sarah's existence (protecting identity disclosure).
   - This means your data exists _outside_ Grove at all times, through multiple channels. If Grove vanishes overnight, you already have everything — in your Amber archive, in your external cloud storage, or retrievable by a simple email.
   - This is the single most powerful anti-lock-in feature possible. It transforms "you can export" into "your data already lives somewhere you control."

2. **Export includes everything needed to reconstruct.**
   - Current export: Markdown + images + comments + config. That's great.
   - Add: theme/layout configuration, custom domain DNS records, redirect rules — everything needed to stand up an equivalent blog on Hugo/Ghost/WordPress without manual reconstruction.
   - Include a `migration-guide.md` in every export that says "here's how to import this into [Hugo/Ghost/WordPress/Eleventy]."

3. **RSS as the escape valve.**
   - Grove already has RSS with full post content (not just excerpts) — this is already shipped and working. RSS IS the anti-lock-in technology. Any feed reader, any aggregator, any tool that speaks RSS can consume Grove content without any special API.
   - The complete text is already accessible through an open standard. No Grove-specific tooling required.
   - RSS means: even if Grove blocks every AI crawler, any _human_ with a feed reader gets the full content. The protection is against mass automated harvesting, not against reading.

4. **Don't build a public bulk API. That's correct.**
   - The absence of a "download all users' data" endpoint is a feature, not a bug.
   - Individual blogs are readable on the web (open web principle). Individual RSS feeds are available. But there's no programmatic way to vacuum up every grove at once. That's the right call.
   - The distinction: **individual access is open, bulk harvesting is blocked.** This is exactly how a neighborhood works — anyone can walk down the street, but nobody gets to photocopy every house.

**The bottom line:** The concern about lock-in is valid but already mostly addressed. The missing piece is automated external backups — getting user data _out_ of Grove's infrastructure proactively, so "you can export" becomes "you already have it."

---

## 4. What "Owning Your Words" Actually Means

_The jeep stops at the edge of a clearing where someone has carved their initials into a tree. But the tree could be cut down. The carving could be scraped off. Ownership carved into someone else's tree isn't really ownership. What would it mean if the writer carried the proof with them?_

### What the article reveals

ATProto promised portable identity through DIDs (Decentralized Identifiers). In practice, almost everyone uses `did:plc`, which is controlled by... Bluesky. Your "decentralized identity" resolves through a centralized directory run by the same company. The protocol gives you the _theory_ of ownership while the infrastructure gives the company actual control.

### What Grove has today

- **Content export** in standard formats (Markdown, JSON) — you have the files
- **Domain ownership** — you own your domain, free transfer, EPP codes within 48 hours
- **RSS feeds** — content accessible through open standards
- **No portable identity protocol** — your identity IS your grove.place subdomain or custom domain
- **No content signing** — no cryptographic proof that you wrote what you wrote
- **No verifiable authorship** — if someone copies your exported Markdown, there's no way to prove provenance

### The honest tension

"Owning your words" currently means: **you can download copies of your words and take them somewhere else.**

That's genuinely better than most platforms. But it's not _ownership_ in the way you own a physical journal. When you own a journal:
- It's in your possession (not on someone's server)
- Your handwriting proves authorship (no one can dispute you wrote it)
- It exists independently of any service (no subscription needed to keep it existing)

Grove's "ownership" today is more like: **you have the right to make copies.** That's copyright, not possession. It's an important right! But it's not the same thing.

### Safari-approved design

**Commitment: The Provenance Principle — Your Words Carry Proof of Origin**

This is where Grove can go _genuinely_ further than anyone else. Not with a complex protocol nobody self-hosts. With simple, practical tools that make ownership tangible.

#### 4a. Content Signing (Achievable Now)

When a user publishes a post, Grove generates a cryptographic signature:

```
-----BEGIN GROVE SIGNATURE-----
Author: autumn@grove.place
Published: 2026-02-21T14:30:00Z
Hash: sha256:a1b2c3d4e5f6...
Signature: [ed25519 signature using author's key]
-----END GROVE SIGNATURE-----
```

- The signature is embedded in the export and optionally in the HTML (as a `<meta>` tag or `.well-known/` endpoint).
- A simple verification tool (web page or CLI) can confirm: "This post was published by this author at this time on Grove."
- The signing key is generated per-user and stored encrypted. The user can download their private key.
- **This isn't blockchain. This isn't a protocol. It's PGP-level simplicity applied to blog posts.** Anyone can verify. No special infrastructure needed.

**Implementation sketch:**

- **Key generation:** On account creation, generate an Ed25519 keypair. Store the private key encrypted via SecretsManager envelope encryption (KEK wraps a per-key DEK). The public key is published at `username.grove.place/.well-known/grove-author.json`.
- **Signing flow:** On publish/update, hash the post content (title + body + published timestamp) with SHA-256, then sign the hash with the author's private key. Store the signature alongside the post metadata.
- **Verification:** Anyone with the public key (published at `.well-known/`) can verify the signature against the content hash. A standalone `verify.grove.place` page lets you paste exported content and check signatures without any Grove account.
- **Human authorship and AI transparency:** This goes beyond just "who wrote it" into "how was it written." Grove already tracks whether a post was composed with Fireside (AI writing assistant) or Wisp (AI features). The signature metadata can include an `authorship` field: `human`, `ai-assisted` (Fireside/Wisp), or `ai-generated`. This transforms verify.grove.place from a simple signature checker into a **provenance oracle** — visitors can see not just that Autumn wrote this post on this date, but that it was written by a human (or that AI assisted, transparently). In a world drowning in AI-generated content, this is a genuine differentiator: Grove content carries proof of its origin story.
- **Key rotation:** If a user changes auth or requests a new key, the old key is archived (not deleted) so historical signatures remain verifiable. A key history endpoint lists all public keys with validity periods.
- **Export integration:** Every exported post includes its signature block. The export ZIP includes the full public key and a `verify.html` that runs signature checks locally in the browser — zero server dependency.
- **What this proves:** "This specific text was published by this specific author at this specific time, and has not been modified since." That's provenance. That's ownership. That travels with your words forever, regardless of what happens to Grove.

#### 4b. Portable Author Identity (Medium-Term)

Your identity shouldn't be `autumn.grove.place`. It should be something _you_ control that _points to_ Grove (or wherever you go next).

Options worth exploring:
- **Domain-as-identity:** If you have a custom domain, your identity IS your domain. Your domain's `.well-known/` directory can point to your current blog host. Move hosts, keep identity. Grove already supports custom domains — this just needs a `.well-known/author.json` that follows you.
- **did:web:** The simplest DID method — your identity is `did:web:yourdomain.com`. Resolves via HTTPS. No special infrastructure. If you own your domain, you own your identity. Period.
- **Avoid did:plc and similar.** The article's warning is clear: any DID method that depends on a centralized directory defeats the purpose.

#### 4c. Export as First-Class Artifact — The Portable Grove (Practical Now)

The `.grove` file format spec (`docs/specs/file-formats-spec.md`) already defines a comprehensive portable archive — ZIP with Markdown posts, media, themes, settings, curios. It includes standard format conversion to Markdown+Media ZIP and an HTML archive. The `grove.place/open` viewer lets anyone browse a `.grove` file client-side.

**The Portable Grove vision extends this further:** the export should be a **deployable website**, not just readable files.

- Include content signatures for every post (extending the manifest with a `signatures` section)
- Include a thin **HTML shim** — a lightweight static site generator that dynamically pulls in Markdown content from the `content/` folder at runtime. Open `index.html` in a browser, and you see your blog. Point a deployment at it, and you have a live website.
- Include a `verify.html` that checks all signatures locally in the browser
- Include author identity files (`.well-known/` contents)
- Include a `DEPLOY.md` guide: "Here's how to publish this as a real website on Cloudflare Pages / Vercel / Netlify / GitHub Pages in under 5 minutes"

**The origin story matters here.** This is how autumnsgrove.com started: Markdown files in a directory, committed to a repo, deployed to Cloudflare Pages. The site code dynamically pulled in the posts. Add a new Markdown file, commit, deploy — and your new post is live. It was _shockingly_ simple. The Portable Grove gives every Wanderer that same experience: a folder that IS your website, that you can deploy anywhere, that works without any server or subscription.

The existing `.grove` HTML archive is a static snapshot. The Portable Grove is a **living artifact** — add a new `.md` file to the `content/posts/` folder and it appears in the site. That's the difference between a backup and a home.

**This deserves its own spec** extending the file-formats spec. See: Portable Grove spec (to be written via /swan-design).

**The bottom line:** "You can export" is table stakes. "Your export is a signed, verifiable, deployable website that grows with you" is ownership. Grove can get there with proven cryptography, a thin HTML shim, and no dependencies on any external service.

---

## 5. The Anti-Bluesky Playbook

_The sun is lower now. Long shadows stretch across the savanna. From this vantage point, you can see two paths diverging: one leads to a walled garden disguised as an open field. The other leads to... what, exactly? That's what we're here to design._

### What the article reveals

The article identifies Bluesky's failure points as structural, not malicious:

1. **VC funding creates exit pressure.** $120M needs to become $1.2B. That math doesn't work with "let everyone self-host."
2. **"Anyone can run their own" is a deflection.** The default wins. Always. If the default is Bluesky's servers, that's where data lives.
3. **Each new app increases centralization.** Tangled, Grain, Leaflet — every ATProto app adds more data to the same PDS. The protocol _accelerates_ centralization.
4. **Acquisition is the endgame.** $120M in VC means someone eventually buys Bluesky, and with it, control of every PDS, relay, and DID.

### What makes Grove structurally different

Let's be honest about what Grove already gets right and what needs reinforcement:

| Bluesky Pattern | Grove's Current Position | Risk Level |
|----------------|-------------------------|------------|
| VC funding → exit pressure | Self-funded / bootstrapped | **Low** — no board, no exit pressure |
| Free service → must monetize users | Subscription model → users ARE the customers | **Low** — incentives aligned |
| Protocol promises decentralization but defaults centralize | No false promises — Grove IS the service | **Low** — honesty > protocol theater |
| Social graph trapped on platform | No social graph dependency (blogs are independent) | **Low** — Meadow is optional, RSS-based |
| Acquisition transfers all user data | Single-person operation → acquisition unlikely | **Medium** — bus factor is 1 |
| "Anyone can self-host" but nobody does | No self-host pretense — focus on genuine portability | **Low** — honest framing |

### The honest tension

Grove's biggest anti-Bluesky advantage is also its biggest risk: **it's one person.**

No VC means no exit pressure. But no VC also means no redundancy. If Autumn gets hit by a bus, Grove has no continuity plan (beyond the centennial program promise). This isn't a centralization problem per se — it's a sustainability problem that _looks like_ centralization from the user's perspective.

### Safari-approved design

**Commitment: The Anti-Capture Codex — Architectural Decisions That Can't Be Walked Back**

#### 5a. The Irrevocable Export Guarantee

Write it into the Terms of Service as an irrevocable commitment:

> "Grove will never charge for data export, delay data export, degrade export quality, or require a subscription to access previously-exported data. This commitment survives any acquisition, merger, or change of ownership."

This isn't just a policy. It's a legal commitment. If Grove is ever acquired, the acquirer inherits this obligation.

#### 5b. The Dead Man's Switch

If Grove ceases operation (any reason):
1. All users receive automated email with export links
2. Exports remain downloadable for 180 days from static storage (pre-paid)
3. Custom domains automatically revert to user control (DNS records published)
4. A static archive of all public content goes up (user-opt-in only)

**Pre-fund this.** Set aside enough to cover 6 months of R2 storage costs for all exports. This is the "break glass" fund.

#### 5c. The Meadow Escape Clause

Meadow (the community feed) is the one place where social-graph-style lock-in could develop. Protect it:
- Meadow follows are RSS-based. If you leave Grove, followers can still follow you via any RSS reader.
- Meadow reactions/interactions are NOT exportable (they're ephemeral encouragement, not data).
- No "Meadow-only" features that create dependency. Everything in Meadow should work with a plain blog and an RSS feed.

#### 5d. Dynamic Post Types — Portable Content, Not Platform Features

Right now, notes live only in Meadow. But they should be available on someone's Garden too — short bursts, Twitter-like posts, alongside long-form blooms. The distinction is simple: a note is short (slimmed-down editor, which already exists in the engine), a bloom is long-form with photos and the full Flow editor. Easy addition — a button and a new interface.

But the bigger vision: **what if all content types share a dynamic pipeline?** Blooms and notes already overlap significantly. If we abstract the content type system properly:
- Adding a new type (e.g., standalone image posts, link bookmarks, audio posts) becomes wiring in a new type definition, not rewriting the publishing flow
- The Garden interface dynamically extends to include new types
- RSS feeds include all types (or filter by type)
- The `.grove` export format includes all types (extending the manifest's `contents` section)
- **Every new content type is automatically portable** — it follows the same export/import/signing/RSS pipeline as everything else

This is the same SDK philosophy applied to content: abstract the pipeline, and extending it becomes configuration rather than architecture.

**This deserves its own spec.** See: Dynamic Post Types spec (to be written via /swan-design).

#### 5e. The No-Acquisition Pledge (or: What Happens If)

Be transparent about what happens in every scenario:

| Scenario | What Happens to User Data |
|----------|--------------------------|
| Grove grows and thrives | Nothing changes. Subscription model continues. |
| Grove stays small forever | Nothing changes. Indie scale is fine. |
| Autumn can't run Grove anymore | Dead man's switch activates. Exports, DNS revert, archive. |
| Someone offers to buy Grove | Users notified 90 days before any transfer. Full export window. |
| Cloudflare becomes hostile | Migration playbook executes. Data is portable. Code takes work. |

#### 5f. Annual Sovereignty Audit

Once a year, answer publicly:
- Can every user export all their data today? (Test it.)
- Does the export work with at least 2 other platforms? (Test it.)
- Is the dead man's switch funded and functional? (Test it.)
- Has any decision this year made leaving harder? (Honest answer.)

**The bottom line:** Bluesky's failure is structural — the incentives point toward centralization regardless of protocol. Grove's defense is also structural — the incentives point toward user service because that's the only revenue source. But structure isn't permanent. Codify the commitments. Fund the contingencies. Test the exits. Every year.

---

## 6. The Open Web Tension

_Last stop before camp. The sun is orange and low. Through the binoculars, you see something beautiful and contradictory: a garden with no fence. Anyone can see the flowers. Anyone can smell them. But some visitors aren't here to appreciate — they're here to harvest. How do you keep the garden open without letting it be strip-mined?_

### What the article reveals

ATProto's "openness" is indiscriminate. Every post is available to every relay. There's no concept of "this is for humans to read, not machines to ingest." The protocol treats all consumers equally — your friend reading your post and an AI company hoovering up training data get the same access.

### What Grove has today

Grove already navigates this tension better than almost anyone:

**Open to humans:**
- Blog content is publicly accessible, no login wall
- RSS feeds deliver full content to readers
- No paywall on reading (the subscription is for _writing_)
- The open web as it should be

**Closed to machines:**
- Shade blocks 100+ AI crawlers at 8 layers
- Cloudflare Turnstile challenges suspicious traffic
- robots.txt + meta tags + HTTP headers say "no" at every level
- TOS explicitly prohibits scraping for AI training
- `libs/shutter/cloudflare/` maintains an offenders database tracking scraping attempts

**The result:** Human readers see everything. AI crawlers see nothing. This is already the right answer.

### The honest tension

It's not perfect. The real edges:

1. **Determined scrapers will get through.** Shade is excellent, but if someone rotates residential proxies and mimics human browsing patterns, they can scrape content. This is true of every website on earth. Shade raises the cost, but doesn't make it impossible.

2. **Cached/indexed content leaks.** Google indexes Grove blogs (that's good for discoverability). But Google's cache is scrapable. And Google has its own AI training. Blocking Googlebot would hurt discoverability.

3. **RSS is an open pipe.** Full-content RSS feeds are excellent for readers — and also excellent for anyone who wants to programmatically consume content. An AI company could subscribe to every Grove RSS feed and get a clean, structured corpus.

4. **The philosophical question:** If you believe in the open web, you believe content should be readable. But "readable by humans" and "ingestible by machines" are increasingly the same HTTP request. The distinction is intent, not technology.

### Safari-approved design

**Commitment: The Shade Doctrine — Open for Reading, Hostile to Harvesting**

Grove's position should be explicit and principled:

> "Grove content is published for humans to read, share, and enjoy. It is not published for machines to ingest, train on, or reproduce. We enforce this distinction at every technical and legal layer available to us, while acknowledging that no protection is absolute."

#### 6a. Strengthen What Works

- **Keep iterating on Shade.** The 8-layer approach is strong. Keep the offender database current. Monitor for new AI crawler user agents.
- **Cloudflare's AI bot blocking** will keep improving. Ride that wave.
- **Legal teeth.** The TOS prohibition on AI scraping should reference specific legal frameworks (CFAA, EU Database Directive, DMCA) and state that Grove will pursue enforcement. This language should also appear in `docs/legal/data-portability-separation.md` and the public-facing help center — making the protection stance visible everywhere a user might look, not buried in TOS fine print.

#### 6b. Address the RSS Exposure

- **Rate-limit RSS feed requests.** A human with a feed reader checks once an hour. A scraper checks every second. Rate limiting at the feed level distinguishes the two. Edge case to handle: someone adding multiple Grove feeds to their RSS app one at a time — that looks like several requests in quick succession but from one IP for different feeds, which is distinct from one IP requesting hundreds of feeds simultaneously. The rate limiter needs to distinguish "human browsing the ecosystem" from "bot vacuuming the ecosystem." **This deserves its own spec** — see: RSS Rate Limiting spec (to be written via /swan-design).
- **Optional RSS modes per user:**
  - Full content (default — open web principle)
  - Excerpt only (for users who want tighter control)
  - Disabled (for users who want no syndication)
- **RSS analytics across Rings and Vista.** Let users see how many subscribers their feed has and flag unusual patterns (sudden spike in subscribers = possible scraping). Vista's broader traffic analysis can correlate RSS access patterns with known scraper behavior — and automatically block repeat offenders at the Shade layer. Give users the most choice: notification-only mode ("someone suspicious is hitting your feed"), auto-block mode ("block them and tell me"), or manual review mode ("flag them but let me decide"). The goal is user sovereignty over their own feed, not platform-level decisions made on their behalf.

#### 6c. Accept the Tradeoff Honestly

Some content will leak to AI training sets. This is true for every website that exists. The question isn't "can we achieve 100% protection?" (no). It's "are we doing everything reasonable to make harvesting expensive, legally risky, and socially unacceptable?"

Grove's answer: yes.
- Technical barriers (Shade)
- Legal barriers (TOS, legal frameworks)
- Social barriers (Grove's public stance makes scraping a PR problem for any AI company caught doing it)
- Economic barriers (scraping Grove is more expensive than scraping an unprotected blog)

**The bottom line:** The open web and AI protection are in tension, but they're not incompatible. The distinction between "readable" and "harvestable" is enforced through rate limiting, bot detection, legal frameworks, and raising the cost of extraction. You don't need a perfect wall. You need a moat that makes the castle not worth besieging.

---

## Expedition Summary

_The fire crackles. Stars emerge above the acacia trees. The journal is full — 6 stops, each one a tension point where what Grove is meets what it must never become. The savanna is quiet. The drive is done._

### By the Numbers

| Metric | Count |
|--------|-------|
| Total stops | 6 |
| Thriving (already strong) | 2 — Subscription model, Shade protection |
| Growing (good bones, meaningful additions needed) | 2 — Export system, Anti-capture commitments |
| Wilting (needs real work) | 2 — Cloudflare contingency, True ownership tooling |
| Barren | 0 |
| Actionable items | 17 |

### The Core Insight

The article's most devastating line is: _"The protocol can't save you from incentives."_

Grove's answer: **Don't build a protocol. Align the incentives.**

Bluesky built an open protocol and hoped decentralization would follow. It didn't. The incentives (VC returns, default server convenience, network effects) pulled everything toward centralization.

Grove does the opposite: no protocol pretense, but genuine structural alignment. You pay for the service. The service serves you. If you leave, you take everything. If Grove dies, the dead man's switch fires. The incentives and the architecture both point the same direction: toward the user.

### What Grove Gets Right That Bluesky Doesn't

| Principle | Bluesky's Approach | Grove's Approach |
|-----------|-------------------|------------------|
| Revenue | Free (VC-funded) → must eventually extract from users | Subscription → users ARE the business |
| Openness | Protocol is open, infrastructure is centralized | No protocol pretense, data genuinely portable |
| Identity | did:plc → centralized directory | Domain-as-identity → you own it |
| Social graph | Trapped in PDS → platform lock-in | RSS-based → follows survive leaving |
| AI protection | Protocol makes everything harvestable | Shade blocks at every layer |
| Exit path | "You can run your own PDS" (nobody does) | Self-service export, auto-backup, migration guides |

### Recommended Implementation Order

**Now (Pre-Launch / Phase 1):**
1. Write the Irrevocable Export Guarantee into TOS
2. Add RSS rate-limiting to Shade (spec needed)
3. AI protection language in all legal docs (portability policy, help center, TOS)

**Soon (Phase 2, Post-Launch):**
4. **Server SDK** — abstract all CF bindings behind a generic infrastructure layer (spec needed)
5. **Amber SDK** — formalize storage operations as a clean, importable library (spec needed)
6. **Content signing** with Ed25519 keys per user + authorship transparency metadata (spec needed)
7. `.well-known/grove-author.json` for portable identity + signature verification
8. **verify.grove.place** — provenance oracle for signatures + human authorship (spec needed)
9. Automated Amber backups with external provider sync (iCloud, GDrive, Dropbox, Mega, S3)
10. Email-based export retrieval (`export@grove.place` with identity verification)
11. Dead man's switch fund and mechanism
12. Document the "Break Glass: Moving Off Cloudflare" playbook (documentation needed)

**Later (Phase 3, When Scale Justifies):**
13. **Portable Grove** — extend `.grove` format with deployable HTML shim (spec needed, extends `file-formats-spec.md`)
14. **Dynamic Post Types** — notes on Garden, abstracted content pipeline (spec needed)
15. `did:web` support for custom domain users
16. Annual sovereignty audit (public report)
17. RSS analytics in Vista with auto-blocking of scraper patterns

### Specs to Write (Generated by This Safari)

| # | Spec | Skill | Status |
|---|------|-------|--------|
| 1 | Server SDK — CF infrastructure abstraction layer | /swan-design | Planned |
| 2 | Break Glass — Moving Off Cloudflare playbook | /owl-archive | Planned |
| 3 | Amber SDK — unified storage operations library | /swan-design | Planned |
| 4 | Content Signing + verify.grove.place — provenance & authorship | /swan-design | Planned |
| 5 | Portable Grove — deployable `.grove` export with HTML shim | /swan-design | Planned |
| 6 | Dynamic Post Types — notes/blooms/images unified pipeline | /swan-design | Planned |
| 7 | RSS Rate Limiting — intelligent feed protection in Shade | /swan-design | Planned |

### Cross-Cutting Themes

**Honesty over protocol theater.** Bluesky's biggest sin isn't centralization — it's _pretending_ not to be centralized. Grove's advantage is radical honesty: "We host your blog. Your data is portable. Here's exactly what happens in every scenario."

**The default is the product.** The article says "the default wins. Always." Grove's default should BE ownership: exports always available, backups running, signatures embedded. Not "you _can_ export" but "your data _already exists_ outside our infrastructure."

**Simplicity beats sophistication.** Ed25519 signatures beat blockchain. RSS beats ActivityPub. ZIP files with Markdown beat federated protocols. Every tool Grove reaches for should be one that a person with a text editor can understand.

**Fund the exits.** Every ownership promise is hollow without money behind it. The dead man's switch needs a fund. The export infrastructure needs to survive the company. The DNS records need to outlive the subscription.

---

_The fire dies to embers. The journal is full — 6 stops, 22 actionable items, the whole landscape mapped. The savanna is quiet except for the distant sound of something large and slow moving through the grass. It could be the future. It could be something else entirely._

_Tomorrow, the animals go to work. But tonight? Tonight was the drive. And it was glorious._ 🚙

---

*Expedition conducted: February 21, 2026*
*Catalyst: ["Be Wary of Bluesky"](https://kevinak.se/blog/be-wary-of-bluesky) by Kevin Åberg Kultalahti*
*Territory: Grove's ownership architecture and decentralization strategy*
