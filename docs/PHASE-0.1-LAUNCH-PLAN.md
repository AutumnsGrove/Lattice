# Phase 0.1 Launch Plan - Grove Platform

**Domain Secured:** grove.place ✅
**Status:** Pre-Launch Preparation
**Target:** Get everything ready for MVP development
**Updated:** November 24, 2025

---

## 🎯 Phase 0.1 Goals

Phase 0.1 is the critical pre-launch phase where we prepare all infrastructure, setup, and foundational work needed to begin actual development. This phase bridges the gap between "idea on paper" to "ready to code."

### Success Criteria
- [x] Domain secured (grove.place)
- [x] Landing page deployed at grove.place (email signup live)
- [x] Basic branding/logo created
- [x] Tagline established: "a place to Be"
- [ ] GitHub repositories created and configured
- [ ] Cloudflare account setup with necessary services
- [ ] Development environment configured
- [ ] Initial project scaffolding complete
- [ ] Clear understanding of MVP scope
- [ ] First client (Mom's publishing house) ready to test

---

## 🏗️ Infrastructure Setup

### 1. Domain & DNS Configuration
- [x] Register domain: grove.place (Cloudflare Registrar)
- [ ] Configure DNS settings
- [ ] Set up wildcard subdomain record (*.grove.place)
- [ ] Verify SSL certificate provisioning
- [ ] Test subdomain routing (test.grove.place)

**Resources Needed:**
- Cloudflare account with domain access
- DNS propagation time (24-48 hours)

### 2. Cloudflare Services Setup
- [ ] Create Cloudflare Pages project for main site
- [ ] Create D1 database instance (for blog data)
- [ ] Create R2 bucket (for media storage)
- [ ] Create KV namespace (for caching)
- [ ] Configure Workers if needed
- [ ] Set up environment variables

**Cost Estimate:** $0-5/month (free tier should cover initial development)

### 3. GitHub Repository Structure
Create three separate repositories:

#### Repository 1: grove-engine
- [ ] Create repository at: github.com/AutumnsGrove/grove-engine
- [ ] Initialize with README
- [ ] Set up branch protection rules
- [ ] Configure GitHub Actions (CI/CD)
- [ ] Add issue templates
- [ ] Create initial project board

#### Repository 2: grove-website
- [ ] Create repository at: github.com/AutumnsGrove/grove-website
- [ ] Initialize with README
- [ ] Set up branch protection rules
- [ ] Configure GitHub Actions (CI/CD)
- [ ] Add issue templates
- [ ] Create initial project board

#### Repository 3: grove-social
- [ ] Create repository at: github.com/AutumnsGrove/grove-social
- [ ] Initialize with README
- [ ] Set up branch protection rules
- [ ] Configure GitHub Actions (CI/CD)
- [ ] Add issue templates
- [ ] Create initial project board

---

## 💻 Development Environment

### Local Development Setup
- [ ] Install Node.js 20+ (LTS version)
- [ ] Install pnpm (package manager)
- [ ] Install wrangler CLI (Cloudflare tooling)
- [ ] Install SvelteKit CLI tools
- [ ] Configure VS Code extensions:
  - Svelte for VS Code
  - Tailwind CSS IntelliSense
  - ESLint
  - Prettier
- [ ] Set up local D1 database for testing
- [ ] Configure local environment variables

### Development Tools
- [ ] Set up local testing framework
- [ ] Configure TypeScript strict mode
- [ ] Set up ESLint + Prettier
- [ ] Install Tailwind CSS
- [ ] Configure hot reload/HMR

---

## 📦 Project Scaffolding

### GroveEngine Initial Structure
```
grove-engine/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   ├── themes/
│   │   ├── utils/
│   │   └── api/
│   ├── routes/
│   │   ├── (blog)/
│   │   └── admin/
│   └── app.d.ts
├── static/
├── tests/
├── docs/
├── .gitignore
├── package.json
├── svelte.config.js
├── tailwind.config.js
├── tsconfig.json
└── wrangler.toml
```

**Tasks:**
- [ ] Create base SvelteKit project
- [ ] Set up routing structure
- [ ] Configure Cloudflare adapter
- [ ] Add TypeScript configuration
- [ ] Set up Tailwind CSS
- [ ] Create placeholder components

---

## 🔐 Authentication & Security Setup

### Services to Configure
- [ ] Set up Resend account (for transactional emails)
  - Verify domain for email sending
  - Get API keys
  - Test email delivery
- [ ] Set up Stripe account (for payments)
  - Create test environment
  - Get API keys (test mode)
  - Configure webhook endpoints
- [ ] Research Lucia Auth integration
- [ ] Plan magic link authentication flow

**Security Checklist:**
- [ ] Create `secrets.json` template
- [ ] Add `secrets.json` to `.gitignore`
- [ ] Document environment variables needed
- [ ] Set up secrets management for production

---

## 📋 Documentation & Planning

### Documentation to Create
- [ ] `CONTRIBUTING.md` - How to contribute to Grove
- [ ] `DEVELOPMENT.md` - Local development setup guide
- [ ] `DEPLOYMENT.md` - Deployment instructions
- [ ] `API.md` - API documentation (initial version)
- [ ] Architecture decision records (ADRs)

### Planning Documents
- [ ] Refine Phase 1 MVP scope
- [ ] Create Sprint 1 task breakdown
- [ ] Identify blockers and dependencies
- [ ] Set up project tracking system
- [ ] Create timeline with milestones

---

## 🎨 Design & Assets

### Design System
- [x] Choose color palette for Grove brand
- [ ] Select typography (fonts)
- [ ] Create basic design tokens
- [x] Design logo (simple, can evolve)
- [x] Create favicon

### Initial Mockups
- [ ] Sketch blog post view (reader experience)
- [ ] Sketch admin dashboard layout
- [ ] Sketch main marketing homepage
- [ ] Sketch pricing page layout

**Design Tools:** Figma, Penpot, or simple sketches

---

## 👥 Stakeholder Alignment

### First Client (Mom's Publishing House)
- [ ] Schedule kick-off meeting
- [ ] Understand content migration needs
- [ ] Document current site structure (autumnsgrove.com)
- [ ] Set expectations for MVP timeline
- [ ] Agree on feedback process

### Testing & Feedback Plan
- [ ] Identify 2-3 additional beta testers
- [ ] Create feedback collection process
- [ ] Set up support ticket system (even if manual initially)
- [ ] Plan weekly check-ins

---

## 📊 Metrics & Monitoring

### Initial Tracking Setup
- [ ] Set up error monitoring (Sentry or similar)
- [ ] Configure analytics (Cloudflare Web Analytics)
- [ ] Create dashboard for key metrics:
  - Build success/failure rate
  - Deployment frequency
  - Page load times
  - Error rates

### Development Metrics
- [ ] Track time spent on Phase 1 tasks
- [ ] Monitor support hours (starts with Mom)
- [ ] Document blockers and resolutions
- [ ] Track actual vs. estimated time

---

## 🔄 Content Migration Planning

### From autumnsgrove.com to GroveEngine
- [ ] Audit existing blog posts
- [ ] Export content (markdown format)
- [ ] Document custom features to replicate:
  - Gutter links
  - Table of contents
  - Theme styling
- [ ] Plan media migration (images, assets)
- [ ] Test import process

**Goal:** Zero data loss, seamless transition

---

## 💰 Financial Setup

### Business Accounts
- [ ] Set up business bank account (if needed)
- [ ] Register business entity (if needed)
- [ ] Set up accounting system (simple spreadsheet initially)
- [ ] Plan tax tracking for income

### Payment Processing
- [ ] Complete Stripe onboarding
- [ ] Set up subscription products in Stripe
  - Starter Plan: $12/month
  - Professional Plan: $25/month
  - Business Plan: $199 setup + $49/month
- [ ] Test payment flows
- [ ] Configure billing email templates

---

## 📅 Phase 0.1 Timeline

### Week 1: Infrastructure (Nov 24-30)
- [x] Secure domain (grove.place)
- [ ] Update all documentation
- [ ] Set up Cloudflare services
- [ ] Create GitHub repositories
- [ ] Configure local development environment

### Week 2: Scaffolding (Dec 1-7)
- [ ] Create initial project structures
- [ ] Set up CI/CD pipelines
- [ ] Configure authentication services
- [ ] Create design system basics
- [ ] Stakeholder alignment meeting

### Week 3: Pre-Development (Dec 8-14)
- [ ] Complete all documentation
- [ ] Finish content migration planning
- [ ] Set up monitoring and metrics
- [ ] Final environment testing
- [ ] Phase 1 kickoff planning

**Target Launch Date for Phase 1:** December 15, 2025

---

## ✅ Phase 0.1 Completion Checklist

Before moving to Phase 1 (MVP Development), verify:

**Infrastructure:**
- [ ] Domain configured and DNS working
- [ ] All Cloudflare services provisioned
- [ ] GitHub repos created and configured
- [ ] Local dev environment working

**Tools & Services:**
- [ ] Resend account verified
- [ ] Stripe test environment ready
- [ ] Monitoring tools configured
- [ ] CI/CD pipelines functional

**Documentation:**
- [ ] All specs updated with grove.place
- [ ] Development guides written
- [ ] Phase 1 scope clearly defined
- [ ] First client aligned and ready

**Team Readiness:**
- [ ] Clear timeline and milestones
- [ ] Blockers identified and mitigated
- [ ] Support process planned
- [ ] Feedback loops established

---

## 🚀 Next Steps: Phase 1 MVP

Once Phase 0.1 is complete, we'll move into Phase 1: **GroveEngine MVP Development** (4-6 weeks)

**Phase 1 Goals:**
1. Extract blog functionality from autumnsgrove.com
2. Build core post management system
3. Implement media upload and optimization
4. Create theme system (3 base themes)
5. Deploy for Mom's publishing house
6. Achieve zero data loss, <2s load times

**Success = One happy client with a fully functional blog! 🎉**

---

## 📞 Need Help?

**Questions or blockers?** Document them in:
- GitHub Issues (for code-related)
- TODOS.md (for task tracking)
- This document (for Phase 0.1 specific items)

**Regular check-ins:** Weekly review of progress against this plan

---

*Last Updated: November 24, 2025*
*Phase: 0.1 - Pre-Launch Preparation*
*Next Phase: 1.0 - MVP Development*
