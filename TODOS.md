# TODOs for Grove Platform

## Setup Tasks
- [ ] Initialize `grove-engine` GitHub repository
- [ ] Set up SvelteKit project with TypeScript
- [ ] Configure Cloudflare Workers and D1 database
- [ ] Implement magic link auth (6-digit email codes via Resend)
- [ ] Configure Stripe for payments
- [ ] Set up Resend for email
- [ ] Check domain availability (grove.com or alternatives)
- [ ] Set up development environment with proper tooling
- [ ] Configure Tailwind CSS
- [ ] Set up pre-commit hooks (optional, see AgentUsage/pre_commit_hooks/)

## Phase 1: GroveEngine MVP (Weeks 1-4)
- [ ] Extract blog functionality from autumnsgrove.com
- [ ] Implement core blog engine with post creation/editing
- [ ] Add basic theming system (1 theme)
- [ ] Implement post limits (250 for Starter plan)
- [ ] Set up R2 storage for media uploads
- [ ] Build admin dashboard for Mom's publishing house
- [ ] Test with Mom's publishing house as first client
- [ ] Implement basic analytics

## Phase 2: Multi-tenant Infrastructure (Weeks 5-9)
- [ ] Implement subdomain routing system
- [ ] Set up tenant isolation in D1 database
- [ ] Build tenant onboarding flow
- [ ] Implement plan management (Starter/Professional/Business)
- [ ] Add custom domain support for Business plan
- [ ] Build tenant admin panel
- [ ] Implement storage limits per plan

## Phase 3: Grove Website (Weeks 10-15)
- [ ] Create marketing website
- [ ] Build pricing page with plan comparison
- [ ] Implement billing system with Stripe
- [ ] Add customer portal
- [ ] Build landing page with features
- [ ] Implement signup flow
- [ ] Add documentation/help center

## Phase 4: Grove Social (Weeks 16-25)
- [ ] Build community feed system
- [ ] Implement post sharing between blogs
- [ ] Add voting system (upvotes/downvotes)
- [ ] Implement emoji reactions
- [ ] Build social features UI
- [ ] Add privacy controls for shared posts
- [ ] Implement moderation tools

## Phase 5: Polish & Scale (Weeks 26-36)
- [ ] Performance optimization
- [ ] Add more themes (3 for Professional, 10 for Business)
- [ ] Implement advanced analytics (see docs/specs/analytics-spec.md)
- [ ] Build priority support system
- [ ] Implement comment system (Hyvor Talk for MVP, see docs/research/comment-system-strategy.md)
- [ ] Implement data export (markdown + pictures as zip)
- [ ] Implement backup/restore functionality
- [ ] Scale infrastructure as needed

## Future Considerations (Post-Launch)

### Theme System Expansion
- [ ] Custom CSS override option for advanced users
- [ ] Theme marketplace (users buy/sell themes)
- [ ] User-uploadable themes with validation
- [ ] Theme builder/customizer UI
- [ ] More color/font customization options

### Migration Tools Expansion
- [ ] WordPress import tool
- [ ] Ghost import tool
- [ ] Medium import tool
- [ ] Substack import tool
- [ ] Generic RSS/Atom import
- [ ] Bulk media migration

### API Access (Paid Add-on)
- [ ] Public REST API for reading posts
- [ ] Authenticated API for creating/editing posts
- [ ] API key management in dashboard
- [ ] Rate limiting and usage tracking
- [ ] API documentation and examples
- [ ] Webhook support for external integrations
- [ ] SDK/client libraries (JavaScript, Python)

## Documentation Tasks
- [ ] Update README.md with project specifics
- [ ] Document API/architecture decisions
- [ ] Add usage examples for tenants
- [ ] Create deployment guide
- [ ] Write testing documentation

## Success Metrics
- [ ] Zero data loss incidents
- [ ] Page load time < 2 seconds
- [ ] < 10 hours support per client/month
- [ ] < 5% monthly churn rate
- [ ] Net Promoter Score > 50
- [ ] 10 clients by Month 3
- [ ] 20 clients by Month 6
- [ ] $500 MRR by Month 12
