---
aliases: []
date created: Friday, November 21st 2025
date modified: Saturday, January 4th 2026
tags:
  - marketing
  - billing
  - client-management
type: tech-spec
---

# Grove Website — Technical Specification

The main marketing site and client management platform for Grove. Handles marketing, client acquisition, onboarding, billing via Stripe, and provides a dashboard for clients to manage their blogs across the platform.

**Project:** Grove Website - Main Site & Client Management  
**Repository:** `grove-website`  
**Type:** Marketing & Management Platform  
**Purpose:** Marketing, client signup, billing, and blog management dashboard

---

## Overview

Grove Website is the main marketing site and client management platform for Grove. It handles marketing, client acquisition, onboarding, billing, and provides a dashboard for clients to manage their blogs. It's the business layer that sits on top of GroveEngine.

---

## Architecture

### Tech Stack
- **Framework:** SvelteKit 2.0+
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Custom Design System
- **Database:** Cloudflare D1 (client data, subscriptions, support tickets)
- **Storage:** Cloudflare KV (caching, session data)
- **Payments:** Stripe
- **Auth:** Magic links (6-digit email codes via Resend)
- **Email:** Resend (transactional emails)
- **Hosting:** Cloudflare Pages

### Project Structure
```
grove-website/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── marketing/
│   │   │   │   ├── Hero.svelte
│   │   │   │   ├── Features.svelte
│   │   │   │   ├── PricingTable.svelte
│   │   │   │   └── Testimonials.svelte
│   │   │   ├── dashboard/
│   │   │   │   ├── BlogList.svelte
│   │   │   │   ├── StatsCard.svelte
│   │   │   │   ├── SupportTicket.svelte
│   │   │   │   └── UpgradePrompt.svelte
│   │   │   └── forms/
│   │   │       ├── SignupForm.svelte
│   │   │       ├── LoginForm.svelte
│   │   │       └── SupportForm.svelte
│   │   ├── utils/
│   │   │   ├── stripe.ts
│   │   │   ├── email.ts
│   │   │   └── billing.ts
│   │   ├── api/
│   │   │   ├── clients.ts
│   │   │   ├── subscriptions.ts
│   │   │   └── support.ts
│   │   └── auth/
│   │       ├── lucia.ts
│   │       └── sessions.ts
│   ├── routes/
│   │   ├── +layout.svelte       # Main site layout
│   │   ├── +page.svelte         # Homepage
│   │   ├── pricing/+page.svelte
│   │   ├── features/+page.svelte
│   │   ├── examples/+page.svelte
│   │   ├── signup/+page.svelte
│   │   ├── login/+page.svelte
│   │   ├── dashboard/
│   │   │   ├── +layout.svelte   # Dashboard layout (auth required)
│   │   │   ├── +page.svelte     # Dashboard home
│   │   │   ├── blogs/
│   │   │   │   ├── +page.svelte # Blog management
│   │   │   │   └── new/+page.svelte # Create new blog
│   │   │   ├── billing/+page.svelte
│   │   │   ├── support/+page.svelte
│   │   │   └── settings/+page.svelte
│   │   └── api/
│   │       ├── webhooks/
│   │       │   └── stripe/+server.ts
│   │       └── support/+server.ts
│   └── app.d.ts
├── static/
├── tests/
└── package.json
```

---

## Core Features

### 1. Marketing Pages

**Homepage (`grove.place`):**
- Hero section with value proposition
- Feature highlights (cheap, simple, community-owned)
- Social proof (testimonials, example blogs)
- Clear call-to-action ("Start Your Blog")
- Pricing preview

**Features Page (`grove.place/features`):**
- Detailed feature list
- Comparison with competitors
- Screenshots of admin panel
- Theme showcase
- RSS & ownership benefits

**Pricing Page (`grove.place/pricing`):**
- Clear tier comparison table (Free, Seedling, Sapling, Oak, Evergreen)
- FAQ section
- Money-back guarantee
- "Most Popular" badge on Sapling plan

**Examples Page (`grove.place/examples`):**
- Showcase real client blogs (with permission)
- Different use cases (personal, portfolio, business)
- "See it in action" links

### 2. Client Signup & Onboarding

**Signup Flow:**
1. Choose plan (Free/Seedling/Sapling/Oak/Evergreen)
2. Enter email address
3. Receive 6-digit code via email
4. Enter code to verify & create account
5. Enter billing info (Stripe) - except Free tier
6. Choose subdomain (availability check) - except Free tier
7. Blog created automatically - except Free tier
8. Welcome email with next steps

**Onboarding Email Sequence:**
- **Immediately:** Welcome + login credentials
- **Day 1:** Admin panel walkthrough video
- **Day 3:** First post tutorial
- **Day 7:** Tips for growing your blog
- **Day 14:** Check-in + support offer
- **Day 30:** Upgrade prompt (if on Seedling)

### 3. Client Dashboard

**Dashboard Home:**
- Welcome message
- Quick stats (posts, views if analytics enabled)
- Recent activity
- Upgrade prompts (if applicable)
- Support ticket status

**Blog Management:**
- List of all blogs (for clients with multiple)
- Create new blog (subdomain selection)
- Blog settings (title, description, theme)
- Post management (view all posts, quick edit)
- Media library access
- RSS feed URL
- Custom domain setup (Oak+)

**Billing Management:**
- Current plan details
- Usage metrics (post count, storage used)
- Upgrade/downgrade options
- Payment method management
- Invoice history & download
- Cancel subscription

**Support:**
- Submit support ticket
- View ticket history
- Knowledge base access
- Live chat (future)
- Book support session (paid)

**Settings:**
- Profile information
- Email preferences
- Password change
- Two-factor auth (future)
- Data export
- Account deletion

### 4. Billing & Subscriptions

**Plans & Features:**

| Feature | Free | Seedling | Sapling | Oak | Evergreen |
|---------|------|----------|---------|-----|-----------|
| Monthly Price | $0 | $8 | $12 | $25 | $35 |
| Yearly Price | — | $82 | $122 | $255 | $357 |
| Blog | — | ✓ | ✓ | ✓ | ✓ |
| Blog Posts | — | 50 | 250 | Unlimited | Unlimited |
| Storage | — | 1 GB | 5 GB | 20 GB | 100 GB |
| Themes | — | 3 + accent | 10 + accent | Customizer | Customizer + Custom Fonts |
| Community Themes | — | — | — | ✓ | ✓ |
| Meadow | ✓ | ✓ | ✓ | ✓ | ✓ |
| Public Comments | 20/week | Unlimited | Unlimited | Unlimited | Unlimited |
| Custom Domain | — | — | — | BYOD | ✓ |
| @grove.place Email | — | — | Forward | Full | Full |
| Support | Community | Community | Email | Priority | 8hrs + Priority |
| CDN | ❌ | ✅ | ✅ | ✅ | ✅ |
| Analytics | Basic | Basic | Standard | Advanced | Advanced |
| Priority Support | ❌ | ❌ | ❌ | ✅ | ✅ |

**Billing Cycle:**
- Monthly billing (default)
- Annual billing (2 months free)
- Prorated upgrades
- Full refund within 30 days

**Stripe Integration:**
- Subscription management
- Automatic renewals
- Failed payment handling
- Dunning management (3 emails over 7 days)
- Invoice generation
- Tax support (US only initially)

### 5. Subdomain Provisioning

**Automated Process:**
1. Client chooses subdomain during signup
2. Check availability (API call to Cloudflare)
3. Create DNS record (CNAME to pages)
4. Initialize D1 database for tenant
5. Create default config & sample post
6. Deploy blog instance
7. Send welcome email with admin URL

**Subdomain Rules:**
- Must be 3-63 characters
- Only letters, numbers, hyphens
- Cannot start/end with hyphen
- Must be unique across all clients
- Reserved subdomains: admin, support, billing, api

**Custom Domains (Oak+):**
- **Oak:** Bring Your Own Domain (BYOD) - connect your existing domain
- **Evergreen:** Domain search service included, registration up to $100/year
- Add domain to Cloudflare
- Configure DNS records
- Set up SSL certificate
- Update blog config
- Redirect subdomain to custom domain

### 6. Support Ticket System

**Ticket Categories:**
- Technical Issue
- Billing Question
- Feature Request
- General Question

**Ticket Workflow:**
1. Client submits ticket via dashboard
2. Auto-reply with ticket number & expected response time
3. You receive email notification
4. Respond within SLA (48 hours for Seedling, 24 hours for Sapling, 12 hours for Oak, 4 hours for Evergreen)
5. Client receives email update
6. Resolve ticket, client confirms

**SLA by Plan:**
- Free: Help Center only (no SLA)
- Seedling: 48-hour first response
- Sapling: 24-hour first response
- Oak: 12-hour first response
- Evergreen: 4-hour first response

**Escalation:**
- Unresolved after 3 days → Escalate to email
- Unresolved after 7 days → Offer video call
- Critical issues (site down) → Immediate response

### 7. Admin Interface (For You)

**Client Management:**
- View all clients
- Search & filter by plan, status, signup date
- Edit client details
- Impersonate client (for support)
- Suspend/activate accounts
- View client blogs

**Billing Admin:**
- View all subscriptions
- Process refunds
- Manual invoice generation
- Coupon code management
- Revenue dashboard
- Failed payment tracking

**Support Admin:**
- View all support tickets
- Assign priority
- Track response times
- Create canned responses
- View support metrics

**System Admin:**
- Provision new subdomains manually
- View system health
- Monitor resource usage
- Run database migrations
- View logs

---

## Database Schema

### Clients Table
```sql
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  
  -- Auth
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT,
  password_reset_token TEXT,
  password_reset_expires INTEGER,
  
  -- Billing
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'seedling', -- 'free', 'seedling', 'sapling', 'oak', 'evergreen'
  billing_cycle TEXT DEFAULT 'monthly', -- 'monthly', 'annual'
  status TEXT DEFAULT 'active', -- 'active', 'canceled', 'past_due'
  
  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  trial_ends_at INTEGER,
  
  -- Support
  support_hours_used INTEGER DEFAULT 0,
  support_hours_limit INTEGER DEFAULT 10, -- Month 1 limit
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_stripe_customer ON clients(stripe_customer_id);
CREATE INDEX idx_clients_plan ON clients(plan);
CREATE INDEX idx_clients_status ON clients(status);
```

### Blogs Table
```sql
CREATE TABLE blogs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  
  -- Identity
  title TEXT NOT NULL,
  description TEXT,
  subdomain TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  
  -- Configuration
  theme TEXT DEFAULT 'default',
  config TEXT, -- JSON string of blog config
  
  -- Limits & Usage
  post_limit INTEGER DEFAULT 250,
  current_post_count INTEGER DEFAULT 0,
  storage_limit INTEGER DEFAULT 5, -- GB
  storage_used INTEGER DEFAULT 0, -- MB
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'suspended', 'archived'
  
  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX idx_blogs_client ON blogs(client_id);
CREATE INDEX idx_blogs_subdomain ON blogs(subdomain);
CREATE INDEX idx_blogs_custom_domain ON blogs(custom_domain);
CREATE INDEX idx_blogs_status ON blogs(status);
```

### Subscriptions Table
```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  
  -- Plan details
  plan TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  amount INTEGER NOT NULL, -- cents
  currency TEXT DEFAULT 'usd',
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'unpaid'
  
  -- Dates
  current_period_start INTEGER NOT NULL,
  current_period_end INTEGER NOT NULL,
  canceled_at INTEGER,
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriptions_client ON subscriptions(client_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

### Invoices Table
```sql
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  
  -- Amount
  amount_due INTEGER NOT NULL, -- cents
  amount_paid INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  
  -- Status
  status TEXT NOT NULL, -- 'draft', 'open', 'paid', 'void', 'uncollectible'
  
  -- Dates
  due_date INTEGER,
  paid_at INTEGER,
  created_at INTEGER NOT NULL,
  
  -- PDF
  invoice_pdf TEXT, -- URL to PDF
  
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due ON invoices(due_date);
```

### Support Tickets Table
```sql
CREATE TABLE support_tickets (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  
  -- Ticket details
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'technical', 'billing', 'feature', 'general'
  
  -- Status
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  
  -- Tracking
  assigned_to TEXT, -- Your user ID
  response_time INTEGER, -- minutes to first response
  resolution_time INTEGER, -- minutes to resolution
  
  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  resolved_at INTEGER,
  
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX idx_tickets_client ON support_tickets(client_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_tickets_assigned ON support_tickets(assigned_to);
```

### Ticket Messages Table
```sql
CREATE TABLE ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  author_id TEXT NOT NULL, -- client_id or your admin ID
  
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- For your notes
  
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX idx_messages_created ON ticket_messages(created_at DESC);
```

---

## API Endpoints

### Client API

**Create Client:**
```typescript
POST /api/clients
Body: {
  email: string;
  password: string;
  name?: string;
  plan: 'free' | 'seedling' | 'sapling' | 'oak' | 'evergreen';
  billing_cycle: 'monthly' | 'annual';
}
Response: { success: boolean; client: Client; stripe_url?: string }
```

**Get Client:**
```typescript
GET /api/clients/me
Auth: Required
Response: Client
```

**Update Client:**
```typescript
PUT /api/clients/me
Auth: Required
Body: Partial<Client>
Response: { success: boolean; client: Client }
```

**Delete Client:**
```typescript
DELETE /api/clients/me
Auth: Required
Response: { success: boolean }
```

### Blog API

**Create Blog:**
```typescript
POST /api/blogs
Auth: Required
Body: {
  title: string;
  description?: string;
  subdomain: string;
  theme?: string;
}
Response: { success: boolean; blog: Blog }
```

**Get My Blogs:**
```typescript
GET /api/blogs
Auth: Required
Response: { blogs: Blog[] }
```

**Update Blog:**
```typescript
PUT /api/blogs/[id]
Auth: Required
Body: Partial<Blog>
Response: { success: boolean; blog: Blog }
```

**Delete Blog:**
```typescript
DELETE /api/blogs/[id]
Auth: Required
Response: { success: boolean }
```

### Subscription API

**Create Subscription:**
```typescript
POST /api/subscriptions
Auth: Required
Body: {
  plan: 'free' | 'seedling' | 'sapling' | 'oak' | 'evergreen';
  billing_cycle: 'monthly' | 'annual';
  payment_method: string; // Stripe payment method ID
}
Response: { success: boolean; subscription: Subscription; client_secret?: string }
```

**Get Subscription:**
```typescript
GET /api/subscriptions/current
Auth: Required
Response: Subscription
```

**Update Subscription:**
```typescript
PUT /api/subscriptions/[id]
Auth: Required
Body: {
  plan?: string;
  billing_cycle?: string;
}
Response: { success: boolean; subscription: Subscription }
```

**Cancel Subscription:**
```typescript
DELETE /api/subscriptions/[id]
Auth: Required
Response: { success: boolean }
```

### Support API

**Create Ticket:**
```typescript
POST /api/support/tickets
Auth: Required
Body: {
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'feature' | 'general';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}
Response: { success: boolean; ticket: SupportTicket }
```

**Get My Tickets:**
```typescript
GET /api/support/tickets
Auth: Required
Query: { status?: string; page?: number }
Response: { tickets: SupportTicket[]; total: number }
```

**Add Message:**
```typescript
POST /api/support/tickets/[id]/messages
Auth: Required
Body: { message: string }
Response: { success: boolean; message: TicketMessage }
```

---

## Stripe Integration

### Webhooks

**Endpoint:** `POST /api/webhooks/stripe`

**Events Handled:**
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Plan change, billing cycle change
- `customer.subscription.deleted` - Cancellation
- `invoice.payment_succeeded` - Payment received
- `invoice.payment_failed` - Payment failed
- `customer.deleted` - Customer deleted

### Payment Flow

1. **Checkout:**
   - Client selects plan
   - Redirect to Stripe Checkout
   - Payment collected
   - Webhook creates subscription in database

2. **Recurring Payments:**
   - Stripe charges automatically
   - Webhook updates invoice status
   - Email receipt sent to client

3. **Failed Payments:**
   - Stripe retries 3 times over 7 days
   - Each failure sends email to client
   - After final failure, subscription marked 'past_due'
   - Grace period of 7 days, then suspension

---

## Email Templates

### Welcome Email
**Trigger:** Account created
**Content:**
- Welcome message
- Login URL
- Admin panel URL
- Getting started guide
- Support contact info

### Payment Receipt
**Trigger:** Invoice paid
**Content:**
- Amount paid
- Period covered
- Invoice PDF link
- Update payment method link

### Payment Failed
**Trigger:** Payment fails
**Content:**
- Amount due
- Retry date
- Update payment method link
- Support contact info

### Subscription Canceled
**Trigger:** Subscription canceled
**Content:**
- Confirmation of cancellation
- Service end date
- Data export instructions
- Reactivation option (within 30 days)

### Support Ticket Created
**Trigger:** Ticket submitted
**Content:**
- Ticket number
- Subject & description
- Expected response time
- View ticket link

### Support Ticket Updated
**Trigger:** You reply to ticket
**Content:**
- Ticket number
- Your message
- View ticket link
- Reply instructions

---

## Admin Dashboard (For You)

**Client Overview:**
- Total clients: X
- Active subscriptions: X
- Monthly Recurring Revenue (MRR): $X
- New clients this month: X
- Churned clients this month: X

**Revenue Dashboard:**
- MRR trend (chart)
- ARR (Annual Run Rate)
- Average Revenue Per User (ARPU)
- Failed payments this month
- Outstanding invoices

**Support Dashboard:**
- Open tickets: X
- Overdue tickets: X
- Average response time: X hours
- Average resolution time: X hours
- Tickets by category (chart)

**System Health:**
- Active blogs: X
- Total posts: X
- Storage used: X GB
- Bandwidth this month: X GB
- API requests: X

---

## Security

### Authentication
- Email/password with bcrypt hashing
- Email verification required
- Password reset via email
- Session management with secure cookies
- Rate limiting on login attempts (5 attempts per 15 min)

### Authorization
- Clients can only access their own data
- Admin can impersonate clients for support
- API endpoints validate permissions
- Row-level security in database

### Data Protection
- Encrypt sensitive data at rest
- HTTPS only
- Secure cookie flags
- CSRF protection
- XSS prevention

### Compliance
- GDPR compliant (data export, deletion)
- Privacy policy
- Terms of service
- Cookie consent banner
- Data processing agreements

---

## Performance

### Caching
- KV cache for client configs (5 min TTL)
- KV cache for subscription data (1 min TTL)
- Edge cache for marketing pages (1 hour)
- No cache for dashboard (real-time data)

### Optimization
- Lazy load dashboard components
- Paginate lists (clients, tickets, invoices)
- Debounce search inputs
- Optimize images
- Minimize JavaScript bundle

### Monitoring
- Track page load times
- Monitor API response times
- Error tracking (Sentry)
- Uptime monitoring

---

## Analytics & Metrics

**Business Metrics:**
- Signup conversion rate
- Trial to paid conversion
- Churn rate
- Average Customer Lifetime Value (LTV)
- Customer Acquisition Cost (CAC)
- LTV:CAC ratio (target > 3:1)

**Product Metrics:**
- Daily Active Users (DAU)
- Posts created per day
- Support tickets per day
- Average response time
- Client satisfaction (NPS)

**Technical Metrics:**
- Page load times
- API response times
- Error rates
- Database query performance
- Bandwidth usage

---

## Support & SLA

**Support Hours:**
- Email: 9 AM - 6 PM EST, Mon-Fri
- Response times by plan (see above)
- Emergency support for site outages

**SLA Guarantees:**
- 99.9% uptime
- Daily backups
- 30-day money-back guarantee
- Data export within 7 days of request

**Support Process:**
1. Ticket submitted via dashboard
2. Auto-acknowledgment email
3. Triage & assignment
4. Response within SLA
5. Resolution & confirmation
6. Follow-up survey

---

## Legal & Compliance

**Required Pages:**
- Terms of Service
- Privacy Policy
- Acceptable Use Policy
- Cookie Policy
- DMCA Policy
- Data Processing Agreement (GDPR)

**Data Retention:**
- Client data: Until account deletion
- Invoices: 7 years (tax requirement)
- Support tickets: 2 years
- Logs: 30 days
- Backups: 30 days

**Client Rights:**
- Right to access data
- Right to rectify data
- Right to delete data
- Right to data portability
- Right to object to processing

---

## Future Enhancements

See `TODOS.md` for full roadmap including:
- Affiliate program
- White-label agency plan
- Advanced analytics
- Team collaboration
- Mobile app

---

## Success Metrics

**Launch Goals (Month 1):**
- [ ] 10 client signups
- [ ] 70% email verification rate
- [ ] 50% complete onboarding
- [ ] < 5% churn in first month
- [ ] Average setup time < 1 hour

**Growth Goals (Month 3):**
- [ ] 30 active clients
- [ ] $500 MRR
- [ ] < 10% churn
- [ ] < 15 hours support per week total
- [ ] 80% client satisfaction

**Scale Goals (Month 6):**
- [ ] 100 active clients
- [ ] $2,000 MRR
- [ ] < 5% churn
- [ ] < 30 hours support per week total
- [ ] Consider hiring part-time support

---

*Last Updated: November 2025*