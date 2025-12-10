---
aliases:
date created: Friday, November 21st 2025, 2:07:11 pm
date modified: Friday, November 21st 2025, 3:02:46 pm
tags:
type: project-summary
---

# Grove Platform - Master Project Summary

**Project:** Grove - Multi-tenant blog platform with social feed
**Status:** Phase 0.1 - Pre-Launch Preparation
**Domain:** grove.place ✅
**Date:** November 24, 2025
**Structure:** 3 Separate Projects (Engine, Website, Social)
**Phase:** 0.1 → Preparing for MVP Development

---

## 📁 Project Structure

The Grove platform has been split into three separate but integrated projects:

### 1. GroveEngine (Core Blog Engine)
**Repository:** `grove-engine`  
**Spec:** `grove-engine-spec.md`  
**Status:** 🚧 Ready to Build (Phase 1)  
**Purpose:** The underlying blog platform that powers all individual blogs

**Key Features:**
- Markdown post creation & management
- Theme system (3-5 base themes)
- Media upload & CDN integration
- RSS feed generation
- Admin panel for content management
- Post limit enforcement (soft limits with archival)
- Subdomain isolation & configuration

**Tech Stack:** SvelteKit, TypeScript, Cloudflare D1, R2, Tailwind CSS

**Build Time:** 4-6 weeks for MVP

---

### 2. Grove Website (Main Site & Onboarding)
**Repository:** `grove-website`  
**Spec:** `grove-website-spec.md`  
**Status:** 📋 Specification Complete (Phase 3)  
**Purpose:** Marketing site, client signup, billing, and management dashboard

**Key Features:**
- Marketing pages (homepage, pricing, features)
- Client signup & tier selection
- Subdomain provisioning system
- Billing & subscription management (Stripe)
- Client dashboard for blog management
- Support ticket system

**Tech Stack:** SvelteKit, TypeScript, Cloudflare D1, KV, Stripe, Lucia Auth

**Build Time:** 6-8 weeks (after Engine is complete)

---

### 3. Grove Social (Community Feed)
**Repository:** `grove-social`  
**Spec:** `grove-social-spec.md`  
**Status:** 📋 Specification Complete (Phase 4)  
**Purpose:** Social features - feed, voting, reactions, community discovery

**Key Features:**
- Aggregated feed of opt-in posts (grove.place/feed)
- Voting system (Hacker News style, no public scores)
- Emoji reactions (Emoji Kitchen + generic)
- User accounts for social features
- Feed sorting algorithms (chronological, popular, hot)

**Tech Stack:** Cloudflare Workers, D1, KV, R2

**Build Time:** 6-8 weeks (after Website is complete)

---

## 🎯 Updated Pricing (Revised)

### Starter Plan: **$12/month**
- Subdomain: `username.grove.place`
- Up to 250 posts (archived when limit reached, **NOT deleted**)
- 1 blog theme (choose from 3-5 options)
- Basic media storage (5GB)
- RSS feed
- **1 month of included support (up to 10 hours)**
- After month 1: **$75/hour** for support sessions
- *Opt-in to Grove feed (social features)*

### Professional Plan: **$25/month**
- Everything in Starter
- Unlimited posts
- 3 blog themes included
- Enhanced media storage (20GB)
- Basic analytics dashboard
- **1 month of included support (up to 15 hours)**
- After month 1: **$75/hour** for support sessions
- *Opt-in to Grove feed (social features)*

### Business Plan: **$199 one-time + $49/month**
- Custom domain registration assistance
- GitHub repository ownership transfer
- All Professional features
- 10 blog themes included
- Premium media storage (100GB)
- Advanced analytics
- CDN setup & optimization
- **1 month of included support (up to 20 hours)**
- After month 1: Choose support tier:
  - Light: $99/month (up to 2 hours)
  - Standard: $199/month (up to 5 hours)
  - Premium: $399/month (up to 12 hours)
- *Opt-in to Grove feed (social features)*

### Add-On Services
- **Additional Themes:** $49/theme
- **Custom Theme Design:** $299 (3 design rounds included)
- **Migration from Other Platform:** $149
- **Extra Storage:** $5/month per 10GB
- **Priority Support:** +$100/month (24-hour response time)

**Why the price increase?** Your original $5-10/month was way too low for the value you're providing and the support burden you'll face. These prices are still competitive (Ghost starts at $9/month, Substack takes 10%) but actually sustainable.

---

## 📈 Scaling Economics

### Revenue Projections

| Users | MRR (Starter $12) | MRR (Pro $25) | MRR (Blended) |
|------:|------------------:|--------------:|--------------:|
| 100   | $1,200            | $2,500        | ~$1,700       |
| 1,000 | $12,000           | $25,000       | ~$17,000      |
| 10,000| $120,000          | $250,000      | ~$170,000     |
| 100,000| $1,200,000       | $2,500,000    | ~$1,700,000   |

*Blended assumes 70% Starter, 25% Professional, 5% Business tier distribution*

### Cloudflare Infrastructure Costs

| Users | D1 Reads/mo | R2 Storage | Workers Requests | Est. Cost |
|------:|------------:|-----------:|-----------------:|----------:|
| 100   | ~5M         | ~50GB      | ~1M              | $0-5/mo   |
| 1,000 | ~50M        | ~500GB     | ~10M             | $15-25/mo |
| 10,000| ~500M       | ~5TB       | ~100M            | $100-200/mo|
| 100,000| ~5B        | ~50TB      | ~1B              | $500-1,500/mo|

*Cloudflare's free tier covers initial development. Costs scale very favorably.*

### AI-Powered Operations Strategy

**Monthly Automation Overhead: ~$160/month**

| Agent | Purpose | Est. Cost |
|-------|---------|----------:|
| Support Agent | Handle tier-1 support tickets, FAQs | ~$50/mo |
| Dev Agent | Code reviews, bug fixes, routine maintenance | ~$80/mo |
| Content Agent | Documentation updates, changelog writing | ~$30/mo |

This AI-first approach enables:
- **Solo founder scalability** — One person can support 1,000+ users
- **24/7 response times** — Agents handle off-hours inquiries
- **Consistent quality** — Automated processes reduce human error
- **Low fixed costs** — ~$160/mo regardless of user count (until ~10K users)

### Break-Even Analysis

| Scenario | Users Needed | Timeline Goal |
|----------|-------------:|---------------|
| Cover Cloudflare + AI costs (~$200/mo) | 17 Starter users | Month 3 |
| Sustainable side income ($500/mo) | 42 Starter users | Month 6 |
| Full-time viable ($3,000/mo) | 250 Starter users | Month 12+ |

---

## 📋 Complete Documentation Files

### Core Specifications
1. **grove-engine-spec.md** - Technical spec for core blog engine
2. **grove-website-spec.md** - Spec for main website & client management
3. **grove-social-spec.md** - Spec for community feed & social features
4. **grove-project-summary-revised.md** - This master summary
5. **TODOS.md** - Complete development roadmap (Phase 1-6+)

### Research Prompts
6. **research-prompt-auth.md** - Auth system research (email/password vs OAuth)
7. **research-prompt-comments.md** - Comment system research (Hyvor vs self-hosted)
8. **research-prompt-subdomain.md** - Cloudflare limits & infrastructure
9. **research-prompt-posts.md** - Post limit enforcement strategies

### Legacy Files (For Reference)
10. **grove-technical-requirements.md** - Original combined spec
11. **grove-business-model.md** - Original business model
12. **grove-onboarding-flow.md** - Original onboarding flow
13. **grove-claude-code-prompt.md** - Original Claude Code prompt

---

## 🚀 Development Roadmap

### Phase 1: GroveEngine MVP (Weeks 1-4)
**Goal:** Core blog engine that works for single tenant

**Key Tasks:**
- [ ] Create `grove-engine` repository
- [ ] Extract engine from autumnsgrove.com codebase
- [ ] Implement post CRUD operations
- [ ] Build markdown editor with live preview
- [ ] Create media upload & optimization
- [ ] Generate RSS feeds
- [ ] Build theme system (3 base themes)
- [ ] Implement post archival system (soft limits)
- [ ] Test with Mom's publishing house

**Success Criteria:**
- One blog running smoothly on custom domain
- Admin panel functional and user-friendly
- Zero data loss incidents
- Page load time < 2 seconds

**Estimated Time:** 4-6 weeks

---

### Phase 2: Multi-Tenant Infrastructure (Weeks 5-9)
**Goal:** Support multiple subdomain blogs

**Key Tasks:**
- [ ] Implement subdomain detection & routing
- [ ] Create per-subdomain configuration system
- [ ] Build namespace isolation (per-tenant D1 databases)
- [ ] Create subdomain provisioning script
- [ ] Set up wildcard DNS configuration
- [ ] Deploy 3-5 beta client subdomains
- [ ] Track support time per client

**Success Criteria:**
- 3-5 subdomain blogs live and stable
- Complete data isolation between tenants
- Support time documented and tracked
- Onboarding process takes < 1 hour

**Estimated Time:** 4-5 weeks

---

### Phase 3: Grove Website (Weeks 10-15)
**Goal:** Main website with automated signup and provisioning

**Key Tasks:**
- [ ] Create `grove-website` repository
- [ ] Design marketing pages (homepage, pricing, features)
- [ ] Build client signup flow with Stripe integration
- [ ] Create subdomain selection & availability check
- [ ] Implement automated provisioning system
- [ ] Build client dashboard
- [ ] Create support ticket system

**Success Criteria:**
- Website live at grove.place
- Automated signup & provisioning works end-to-end
- Billing system functional
- Client dashboard usable

**Estimated Time:** 6-8 weeks

---

### Phase 4: Grove Social (Weeks 16-25)
**Goal:** Community feed with voting and reactions

**Key Tasks:**
- [ ] Create `grove-social` repository
- [ ] Implement user registration & authentication
- [ ] Build feed aggregation system
- [ ] Create voting API (upvote/downvote)
- [ ] Implement emoji reaction system
- [ ] Build feed sorting algorithms
- [ ] Add moderation tools

**Success Criteria:**
- Feed live at grove.place/feed
- Users can vote and react
- Performance acceptable with 10+ blogs
- No spam or abuse issues

**Estimated Time:** 8-10 weeks

---

### Phase 5: Polish & Scale (Weeks 26-36)
**Goal:** Refine based on usage, add premium features

**Key Tasks:**
- [ ] Integrate comment system (Hyvor Talk)
- [ ] Add analytics dashboard per blog
- [ ] Implement SEO tools
- [ ] Create import tools (WordPress, Medium, etc.)
- [ ] Design additional themes
- [ ] Scale to 20 paying clients

**Success Criteria:**
- 20 paying clients
- $500/month MRR
- < 5% churn rate
- Net Promoter Score > 50
- < 10 hours support per client/month

**Estimated Time:** 10-12 weeks

---

## 💡 Key Decisions Made

### 1. Three Separate Projects
**Decision:** Split into GroveEngine, Grove Website, and Grove Social  
**Rationale:** Separation of concerns, independent deployment, different tech focuses  
**Impact:** More complex initially, but scales better long-term

### 2. Significant Price Increase
**Decision:** $12-49/month (was $5-10/month)  
**Rationale:** Sustainable business model, reflects actual value, covers support burden  
**Impact:** Fewer but higher-quality clients, better unit economics

### 3. Soft Post Limits (No Deletion)
**Decision:** Archive old posts instead of deleting them  
**Rationale:** Better user experience, strong upgrade incentive, no angry clients  
**Impact:** More storage needed, but happier customers

### 4. Increased Support Hours
**Decision:** 10-20 hours in Month 1 (was 1-2 hours)  
**Rationale:** More realistic for non-technical clients, better onboarding  
**Impact:** Higher perceived value, better client success rate

### 5. Higher Support Rate
**Decision:** $75/hour (was $25/hour)  
**Rationale:** Professional rate for technical work, deters trivial requests  
**Impact:** Better compensation for your time, filters serious clients

### 6. Emoji Kitchen Reactions (Future)
**Decision:** ~100 custom emojis + 5 generic (not immediate)  
**Rationale:** Unique differentiator, fun brand personality, but not MVP-critical  
**Impact:** Added to Phase 4 (social features), not Phase 1

---

## ⚠️ Risk Assessment

### Technical Risks
- **Auth system complexity:** May take longer than expected
  - *Mitigation:* Use Lucia Auth, don't build custom
- **Multi-tenant bugs:** Data leakage between subdomains
  - *Mitigation:* Per-tenant D1 databases, thorough testing
- **Feed performance:** Slow with many posts/users
  - *Mitigation:* Aggressive caching, pagination, background jobs
- **Cloudflare limits:** May need paid tier sooner
  - *Mitigation:* Monitor usage, budget $5-20/month

### Business Risks
- **Support time underestimated:** Could be 20+ hours/client in month 1
  - *Mitigation:* Track time meticulously, adjust pricing based on reality
- **Low conversion:** People like idea but don't pay
  - *Mitigation:* Start with friends/family (guaranteed 5-10 clients)
- **Feature creep:** Trying to build everything at once
  - *Mitigation:* Stick to roadmap, say no to feature requests
- **Burnout:** Too much for one person
  - *Mitigation:* Set boundaries, limit to 10 clients until processes solid

### Market Risks
- **Competition response:** Ghost/Substack add similar features
  - *Mitigation:* Focus on ownership + price advantage
- **Economic downturn:** People cut discretionary spending
  - *Mitigation:* Emphasize value, offer annual discounts
- **Platform risk:** Cloudflare changes pricing/terms
  - *Mitigation:* Keep engine portable, could migrate to Vercel/Netlify

---

## 📊 Success Metrics (Year 1)

### Financial Goals
- [ ] 10 paying clients by Month 3
- [ ] 20 paying clients by Month 6
- [ ] $500/month MRR by Month 12
- [ ] < 10 hours support per client in Month 1
- [ ] Break-even on time investment

### Product Goals
- [ ] Zero data loss incidents
- [ ] < 1% downtime across all client sites
- [ ] Page load time < 2 seconds for all blogs
- [ ] Admin panel usability score > 8/10

### Community Goals
- [ ] 5+ clients opt-in to Grove feed (Month 6)
- [ ] 50+ posts on feed by Month 6
- [ ] Net Promoter Score > 50
- [ ] < 5% monthly churn rate

---

## 🎯 Next Steps (Immediate)

### This Week
1. ~~**Check domain availability**~~ → **DONE: grove.place secured!**
2. **Create GroveEngine repo** - Start extracting from autumnsgrove.com
3. **Set up project structure** - 3 separate repositories
4. **Review research results** - When subdomain/auth/comment research completes

### This Month
1. **Build GroveEngine MVP** - Core blog functionality
2. **Test with Mom's site** - First real client
3. **Track time religiously** - Every support interaction logged
4. **Refine pricing** - Based on actual time spent

### This Quarter
1. **Launch Grove Website** - With signup flow
2. **Onboard 3-5 beta clients** - Friends/family
3. **Build Grove Social** - Feed and voting
4. **Document everything** - Processes, FAQs, guides

---

## 📚 How to Use These Documents

### For Development
1. Start with **grove-engine-spec.md** - Build the core engine
2. Reference **TODOS.md** - Track Phase 1 tasks
3. Use **research-prompt-*** files - When research completes, update specs
4. Follow the roadmap in this summary

### For Business Planning
1. Review **grove-website-spec.md** - Understand client management
2. Study pricing section - Know your numbers
3. Track time against estimates - Adjust as needed
4. Use support structure - Set boundaries

### For Future Features
1. Check **TODOS.md** - See what's planned
2. Don't build future features yet - Wait for client demand
3. Focus on Phase 1 only - Prove the concept first

---

## 📖 Vision & Journey

For the full story behind Grove—the personal journey, the philosophy, and the long-term vision—see [THE_JOURNEY.md](https://github.com/AutumnsGrove/AutumnsGrove/blob/main/THE_JOURNEY.md) in the AutumnsGrove repository.

---

## 💬 Final Thoughts

**Your vision:** This isn't just a side hustle - it's about helping friends have their own space online, away from big tech algorithms. It's solarpunk-aligned (decentralized, community-owned). And it could help fund your tea cafe dream.

**Your strengths:** You're great at building with Claude Code, you understand the tech, and you care about people. This project plays to all of that.

**Your constraints:** Part-time at Home Depot, job searching, limited cash flow. This needs to be lean and mostly automated. Don't over-build.

**Your style:** Functional-OOP hybrid, small transformative steps, ADHD-friendly workflows. Keep the codebase clean and modular so you can iterate quickly.

**Remember:** Start small (Mom's site), prove the concept, then grow organically. You don't need 100 clients tomorrow. You need 5 happy clients who tell their friends.

---

## 🌲 The Bottom Line

You have:
- ✅ Complete technical specifications for 3 projects
- ✅ Realistic pricing that reflects value
- ✅ Detailed roadmap from MVP to scale
- ✅ Honest assessment of risks and challenges
- ✅ Clear success metrics to track progress

You need:
- 🔄 Domain name (you're researching this)
- 🔄 Auth solution (you'll handle this)
- 🔄 Research results (subdomain limits, etc.)
- 🚀 Start building GroveEngine MVP

**The grove metaphor is perfect - but even a grove starts with one tree.**

Now go build that first tree. 🌲

---

*Last Updated: November 2025*  
*Next Review: After GroveEngine MVP is complete*