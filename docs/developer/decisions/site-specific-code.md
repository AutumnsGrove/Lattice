# Site-Specific Code Guide

**Quick Reference for Claude Code & Developers**

This document helps you identify code that belongs in individual site deployments, not in the reusable GroveEngine or GroveUI packages.

---

## What IS Site-Specific Code?

Site-specific code is anything that:
- Only applies to ONE website/deployment
- Contains business-specific content or branding
- Includes environment-specific configuration
- Implements custom features unique to one client

**Examples of sites**:
- `packages/example-site/` - The Midnight Bloom Tea Café demo
- `landing/` - grove.place marketing site
- Customer sites (client deployments)

---

## ✅ Belongs in Site-Specific Code

### 1. Routes & Pages

**Custom Pages**:
- `/about` - About this specific business
- `/contact` - Contact page with specific business info
- `/` - Homepage with specific content
- `/services` - Services unique to this business
- `/team` - Team page with specific people

**Custom Route Logic**:
```svelte
<!-- routes/about/+page.svelte -->
<script>
  // Site-specific imports
  import siteConfig from '$lib/config';
</script>

<h1>About {siteConfig.businessName}</h1>
<p>{siteConfig.aboutText}</p>
```

---

### 2. Branding & Theming

**Custom Branding**:
- Business name, logo, tagline
- Color overrides specific to this brand
- Custom fonts not in Grove design system
- Brand-specific imagery

**Example**:
```typescript
// lib/config.ts
export const siteConfig = {
  businessName: 'The Midnight Bloom Tea Café',
  tagline: 'Where every sip tells a story',
  brandColor: '#8B4513', // Custom brown, not Grove green
  logo: '/images/midnight-bloom-logo.svg'
};
```

---

### 3. Environment-Specific Configuration

**Environment Variables**:
```env
# .env.local
PUBLIC_SITE_URL=https://themidnightbloom.com
PUBLIC_STRIPE_KEY=pk_live_...
DATABASE_URL=...
CDN_URL=...
EMAIL_FROM=hello@themidnightbloom.com
```

**Config Files**:
```typescript
// lib/env.ts
export const env = {
  siteUrl: import.meta.env.PUBLIC_SITE_URL,
  stripeKey: import.meta.env.PUBLIC_STRIPE_KEY,
  // Site-specific configuration
};
```

---

### 4. Custom Integrations

**Third-Party Services** (specific to this deployment):
- Google Analytics ID for this site
- Facebook Pixel for this business
- Custom CRM integrations
- Site-specific email providers
- Custom payment providers beyond Grove defaults

**Example**:
```typescript
// lib/analytics.ts
export function initAnalytics() {
  // Google Analytics for THIS site only
  gtag('config', 'GA-12345-SPECIFIC');
}
```

---

### 5. Custom Content & Copy

**Static Content**:
- Blog posts written for this site
- Product descriptions specific to this business
- Team member bios
- Service descriptions
- FAQ content

**Example**:
```typescript
// lib/content/faqs.ts
export const faqs = [
  {
    question: "What are your café hours?",
    answer: "We're open Monday-Friday 7am-9pm..."
  },
  // All content specific to The Midnight Bloom
];
```

---

### 6. Custom Features

**Business-Specific Features**:
- Reservation system for a restaurant
- Appointment booking for a salon
- Custom product configurator
- Loyalty program unique to this business
- Custom checkout flows

**Example**:
```svelte
<!-- routes/reservations/+page.svelte -->
<script>
  // Reservation system only for this café
  import { ReservationForm } from '$lib/components/ReservationForm.svelte';
</script>

<h1>Book Your Table</h1>
<ReservationForm />
```

---

### 7. Site-Specific Assets

**Custom Assets**:
- Product images for this business
- Hero images unique to this site
- Staff photos
- Custom icons/illustrations beyond Grove UI
- Videos produced for this business

**File Structure**:
```
static/
├── images/
│   ├── hero-cafe.jpg
│   ├── products/
│   │   ├── jasmine-tea.jpg
│   │   └── earl-grey.jpg
│   └── team/
│       ├── owner.jpg
│       └── barista.jpg
```

---

### 8. Custom Layouts (Site-Specific)

**Unique Layouts**:
```svelte
<!-- routes/+layout.svelte -->
<script>
  import { Header } from '$lib/components/Header.svelte';
  import { Footer } from '$lib/components/Footer.svelte';
  import siteConfig from '$lib/config';
</script>

<Header logo={siteConfig.logo} nav={siteConfig.navigation} />

<main>
  <slot />
</main>

<Footer businessInfo={siteConfig.businessInfo} />
```

**Why site-specific**: Layout includes business-specific header/footer, not generic enough for Grove.

---

## ❌ Does NOT Belong in Site-Specific

### Generic Features → GroveEngine
- Markdown parsing
- Authentication system
- Payment processing (abstraction)
- Image optimization
- Blog engine

### Generic UI → GroveUI
- Button, Card, Input components
- Design tokens
- Tailwind presets
- Generic layouts

---

## Decision Tree

```
Is this code specific to ONE deployment?
├─ YES: Is it content, branding, or config?
│  ├─ YES: ✅ Site-Specific Code
│  └─ NO: Is it a custom feature unique to this business?
│     ├─ YES: ✅ Site-Specific Code
│     └─ NO: Could other Grove sites use it?
│        ├─ YES: ❌ Consider contributing to GroveEngine
│        └─ NO: ✅ Site-Specific Code
│
└─ NO: Is it reusable across deployments?
   ├─ YES (UI): ❌ GroveUI
   └─ YES (Features): ❌ GroveEngine
```

### Quick Tests

**The "One Site" Test**:
"Is this specific to ONE website?"
- **YES** → Site-Specific
- **NO** → GroveEngine or GroveUI

**The "Content" Test**:
"Does this contain business-specific content or copy?"
- **YES** → Site-Specific
- **NO** → Could be GroveEngine or GroveUI

**The "Environment" Test**:
"Is this tied to one environment/deployment?"
- **YES** → Site-Specific
- **NO** → GroveEngine or GroveUI

---

## How to Consume Grove Packages

### Correct Import Pattern

```typescript
// ✅ Good - Import from packages
import { Button, Card, Input } from '@groveengine/ui/ui';
import { ContentWithGutter, MarkdownEditor } from '@autumnsgrove/groveengine';

// ✅ Good - Use in site-specific page
export function AboutPage() {
  return (
    <ContentWithGutter>
      <Card>
        <h1>About {siteConfig.businessName}</h1>
        <p>{siteConfig.aboutText}</p>
        <Button>Contact Us</Button>
      </Card>
    </ContentWithGutter>
  );
}
```

### Package.json Dependencies

```json
{
  "name": "my-customer-site",
  "dependencies": {
    "@groveengine/ui": "^0.3.0",
    "@autumnsgrove/groveengine": "^0.3.0",
    "svelte": "^5.0.0"
  }
}
```

---

## Examples

### ✅ Belongs in Site-Specific

**Example 1: About Page**
```svelte
<!-- routes/about/+page.svelte -->
<script>
  import { Card } from '@groveengine/ui/ui';
  import { siteConfig } from '$lib/config';
</script>

<Card>
  <h1>About {siteConfig.businessName}</h1>
  <p>
    Founded in 2023, The Midnight Bloom is a cozy tea café...
  </p>
</Card>
```
**Why**: Content specific to this business.

**Example 2: Site Configuration**
```typescript
// lib/config.ts
export const siteConfig = {
  businessName: 'The Midnight Bloom Tea Café',
  email: 'hello@midnightbloom.com',
  phone: '(555) 123-4567',
  address: '123 Tea Lane, Portland, OR',
  socialMedia: {
    instagram: '@midnightbloomcafe',
    facebook: '/midnightbloom'
  }
};
```
**Why**: All information specific to this business.

**Example 3: Custom Product Page**
```svelte
<!-- routes/shop/[slug]/+page.svelte -->
<script>
  import { Button } from '@groveengine/ui/ui';
  import { ProductDisplay } from '@autumnsgrove/groveengine';

  export let data; // Product data for THIS site
</script>

<ProductDisplay product={data.product}>
  <Button>Add to Cart</Button>
</ProductDisplay>
```
**Why**: Uses Grove packages, but implements custom product display for this site.

### ❌ Does NOT Belong in Site-Specific

**Example 1: Generic Button**
```svelte
<!-- This belongs in GroveUI -->
<script>
  export let variant = 'primary';
  // Generic UI component
</script>
```
**Why**: Reusable across all projects.

**Example 2: Markdown Parser**
```typescript
// This belongs in GroveEngine
export function parseMarkdown(content: string) {
  // Parse markdown with Mermaid support
  return processedHTML;
}
```
**Why**: Generic feature all Grove sites need.

---

## When to Contribute Back

Sometimes site-specific code becomes generic enough to contribute back to Grove packages:

### Contribute to GroveEngine if:
- Feature could benefit other Grove-powered sites
- It's domain-specific (content management, auth, payments)
- Other customers would find it useful

**Example**: Recipe management → Could be useful for all food/restaurant sites

### Contribute to GroveUI if:
- It's a generic UI component with no business logic
- Other projects (non-Grove) could use it
- It fits the Grove design system

**Example**: Star rating component → Generic UI, useful everywhere

### Keep Site-Specific if:
- Truly unique to one business
- Includes business-specific logic or content
- Would require significant abstraction to generalize

---

## File Structure Recommendations

```
my-customer-site/
├── src/
│   ├── lib/
│   │   ├── config.ts              # Site-specific configuration
│   │   ├── components/            # Site-specific components
│   │   │   ├── Header.svelte
│   │   │   ├── Footer.svelte
│   │   │   └── ReservationForm.svelte
│   │   ├── content/               # Site-specific content
│   │   │   ├── faqs.ts
│   │   │   ├── team.ts
│   │   │   └── services.ts
│   │   └── utils/                 # Site-specific utilities
│   │       └── analytics.ts
│   └── routes/                    # Site-specific routes
│       ├── +layout.svelte         # Custom layout
│       ├── +page.svelte           # Homepage
│       ├── about/
│       ├── contact/
│       ├── blog/                  # Uses GroveEngine blog feature
│       └── shop/                  # Uses GroveEngine shop feature
├── static/                        # Site-specific assets
│   ├── images/
│   ├── fonts/                     # Custom fonts if any
│   └── favicon.ico
├── .env.local                     # Environment variables
└── package.json                   # Dependencies
```

---

## Common Scenarios

### Scenario 1: "I'm creating a contact page"

**Question**: What's on the contact page?

- **Form using GroveUI components** + **Business-specific contact info** → **Site-Specific**
- Uses: `Input, Textarea, Button` from GroveUI
- Uses: `ContactForm` logic from GroveEngine
- Adds: Specific business address, phone, email

### Scenario 2: "I'm styling the site"

**Question**: What kind of styling?

- **Using Grove design tokens** (colors, spacing) → Use GroveUI
- **Custom brand colors** not in Grove → **Site-Specific config/overrides**
- **Custom layouts** unique to this business → **Site-Specific components**

### Scenario 3: "I'm adding a feature"

**Question**: Who else would use this?

- **All Grove sites** would benefit → **Contribute to GroveEngine**
- **Just this business** needs it → **Site-Specific**
- **Any project** could use it → **Consider GroveUI or external library**

---

## Summary Checklist

When writing code for a site deployment, ask:

- [ ] Is this specific to ONE website?
- [ ] Does it contain business-specific content?
- [ ] Is it tied to one environment/deployment?
- [ ] Is it custom branding or configuration?
- [ ] Would generalizing it require significant abstraction?

If you answered **YES** to any → ✅ **Site-Specific Code**

If all are **NO** → Consider contributing to GroveEngine or GroveUI

---

**Last Updated**: 2025-12-03
**Related Docs**:
- `belongs-in-engine.md` (GroveEngine decision guide)
- `BELONGS_IN_UI.md` (GroveUI decision guide)
- `customer-template.md` (New project template)
