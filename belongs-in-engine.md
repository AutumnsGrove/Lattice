# Belongs in GroveEngine

**Quick Reference Guide for Claude Code & Developers**

This document helps you quickly decide if code belongs in the GroveEngine package.

---

## What IS GroveEngine?

GroveEngine is the **business logic and domain-specific feature layer** for Grove-powered websites. It provides:
- Content management features
- Authentication & session management
- Payment processing
- Domain-specific UI components
- API routes and server logic
- Data processing utilities

---

## ✅ Belongs in GroveEngine

### Core Engine Features

#### 1. Content Processing & Management
- **Markdown parsing** with Mermaid diagram support
- **Front-matter extraction** (gray-matter)
- **Syntax highlighting** for code blocks
- **HTML sanitization** (DOMPurify)
- **Content annotation system** (gutter components)
- **Image processing** (optimization, resizing, conversion)
- **Gallery utilities** (image layout algorithms)

#### 2. Authentication & Security
- **JWT token generation/validation**
- **Session management**
- **Magic code authentication** (6-digit codes via email)
- **CSRF protection**
- **Input validation** rules
- **Email provider integrations** (Resend)

#### 3. Payment Processing
- **Payment provider abstractions** (Stripe, future providers)
- **Subscription management**
- **E-commerce logic** (products, inventory, cart, orders)
- **Billing workflows**

#### 4. Database & Data Models
- **Database schemas** (SQL migrations)
- **Repository patterns** (git stats tracking)
- **Todo/task tracking** models
- **Blog/page** data models
- **User/product/order** schemas

#### 5. Domain-Specific UI Components

**Content Components**:
- `ContentWithGutter` - Grove's signature annotation layout
- `LeftGutter` - Annotation sidebar
- `GutterItem` - Individual annotation display
- `TableOfContents` - Auto-generated TOC from content
- `MobileTOC` - Mobile-responsive navigation
- `CollapsibleSection` - Content collapsing

**Admin Components**:
- `MarkdownEditor` - Rich markdown editor with preview + Mermaid
- `GutterManager` - Admin interface for managing annotations
- Admin-specific wrappers (Dialog, Sheet, Select, Table, Tabs, Accordion, Toast)

**Gallery Components**:
- `ImageGallery` - Multi-image display with navigation
- `Lightbox` - Full-screen image viewer
- `ZoomableImage` - Pinch-to-zoom functionality
- `LightboxCaption` - Image caption system

#### 6. API Routes & Server Logic
- **SvelteKit routes** (`/routes/**/*.svelte`)
- **API endpoints** (`/api/**/*`)
- **Server-side utilities** (logging, middleware)
- **Form handlers**
- **RSS feed generation**

#### 7. Business Logic Utilities
- **Gutter positioning algorithms** (annotation layout)
- **Gallery layout calculations**
- **Markdown-to-HTML conversion**
- **Image optimization pipelines**
- **Validation rules** (email, URLs, etc.)
- **Debounce/throttle** utilities used in domain logic

---

## ❌ Does NOT Belong in GroveEngine

### Pure UI Components
- Generic buttons, cards, inputs → **GroveUI**
- Design tokens (colors, typography) → **GroveUI**
- Layout primitives with no business logic → **GroveUI**

### Site-Specific Code
- Custom routes for a specific deployment → **Site-Specific**
- Branding/theming unique to one site → **Site-Specific**
- Environment-specific configuration → **Site-Specific**

---

## Decision Tree

```
Is it specific to Grove's domain logic?
├─ YES: Contains markdown, gutter, auth, payments, content management?
│  └─ ✅ Belongs in GroveEngine
│
├─ NO: Is it a generic UI component anyone could use?
│  └─ ❌ Belongs in GroveUI
│
└─ NO: Is it specific to one website/deployment?
   └─ ❌ Belongs in Site-Specific code
```

### Quick Tests

**Test 1**: "Could another CMS use this exact code?"
- YES → GroveUI or open-source library
- NO → GroveEngine

**Test 2**: "Does it handle data, authentication, or business rules?"
- YES → GroveEngine
- NO → GroveUI or Site-Specific

**Test 3**: "Is it visual styling with no logic?"
- YES → GroveUI
- NO → Check if it's domain logic → GroveEngine

---

## Examples

### ✅ Belongs in GroveEngine

**Example 1: Markdown Parser**
```typescript
// utils/markdown.js
export function parseMarkdown(content: string) {
  // Mermaid diagram support
  // Syntax highlighting
  // Front-matter extraction
  // HTML sanitization
  return processedHTML;
}
```
**Why**: Domain-specific content processing with Grove's specific requirements.

**Example 2: GutterManager Component**
```svelte
<!-- components/admin/GutterManager.svelte -->
<script>
  // Admin interface for managing gutter annotations
  // CRUD operations on annotations
  // Position validation
</script>
```
**Why**: Admin tool for Grove's annotation system - domain-specific.

**Example 3: Payment Provider Abstraction**
```typescript
// payments/provider.ts
export interface PaymentProvider {
  createSubscription(plan: Plan): Promise<Subscription>;
  processPayment(amount: number): Promise<Payment>;
}
```
**Why**: Business logic for payment processing - core engine feature.

### ❌ Does NOT Belong in GroveEngine

**Example 1: Generic Button**
```svelte
<!-- This should be in GroveUI -->
<script>
  export let variant = 'primary';
  export let size = 'md';
  // No business logic, just presentation
</script>
```
**Why**: Pure UI component with no Grove-specific logic.

**Example 2: About Page Route**
```svelte
<!-- This should be in site-specific code -->
<!-- routes/about/+page.svelte -->
<h1>About The Midnight Bloom</h1>
<p>Specific content about this particular tea café...</p>
```
**Why**: Specific to one website deployment.

---

## Red Flags: Signs Code Should Be Elsewhere

### 🚩 Probably belongs in GroveUI:
- File only contains CSS/styling
- Component has no props related to Grove features
- Could be copy-pasted into any project without modification
- Only imports design tokens and primitives

### 🚩 Probably belongs in Site-Specific:
- Hardcoded content/copy specific to one business
- Custom branding unique to one client
- Environment variables for one deployment
- Routes that don't apply to all Grove sites

---

## Common Scenarios

### Scenario 1: "I'm adding a search feature"

**Question**: Is this search specific to Grove's content model?

- **YES** (searches markdown, uses gutter metadata, Grove-specific filters) → **GroveEngine**
- **NO** (generic search input component) → **GroveUI**
- **NO** (search page for specific site) → **Site-Specific**

### Scenario 2: "I'm creating a new form"

**Question**: What does the form do?

- Creates/edits Grove content (blog posts, pages, annotations) → **GroveEngine**
- Generic form UI components (Input, Select, Textarea) → **GroveUI**
- Contact form with specific business info → **Site-Specific**

### Scenario 3: "I'm building an image uploader"

**Question**: What does it integrate with?

- Integrates with Grove's image processing/gallery system → **GroveEngine**
- Generic file upload UI component → **GroveUI**
- Uploads to specific CDN/storage for one site → **Site-Specific**

---

## Integration with Other Packages

### Engine Components → use → UI Module

Engine components **SHOULD**:
- Import generic UI components from `$lib/ui`
- Wrap UI components with domain-specific logic
- Provide admin-optimized variants

**Example**:
```typescript
// GroveEngine component (e.g., src/lib/components/admin/*)
import { Card, Button } from '$lib/ui';
import { parseMarkdown } from '$lib/utils/markdown';

// Uses UI components + adds domain logic
```

### GroveEngine ← used by → Site Deployments

Sites **SHOULD**:
- Import from `@autumnsgrove/groveengine` for domain features
- Import from `@autumnsgrove/groveengine/ui` for UI components
- Keep site-specific code separate

**Example**:
```typescript
// Site-specific route
import { ContentWithGutter } from '@autumnsgrove/groveengine';
import { Button } from '@autumnsgrove/groveengine/ui';

// Combine for site-specific page
```

---

## File Path Patterns

### Typical GroveEngine Paths

**Domain Components**:
- `/packages/engine/src/lib/components/custom/*`
- `/packages/engine/src/lib/components/admin/*`
- `/packages/engine/src/lib/components/gallery/*`

**Utilities**:
- `/packages/engine/src/lib/utils/markdown.js`
- `/packages/engine/src/lib/utils/gutter.js`
- `/packages/engine/src/lib/utils/imageProcessor.js`
- `/packages/engine/src/lib/utils/validation.js`

**Auth & Payments**:
- `/packages/engine/src/lib/auth/*`
- `/packages/engine/src/lib/payments/*`

**Database**:
- `/packages/engine/src/lib/db/schema.sql`

**Routes** (Engine's own demo/docs):
- `/packages/engine/src/routes/**/*`

---

## Summary Checklist

When adding new code to GroveEngine, verify:

- [ ] Does it handle Grove-specific business logic?
- [ ] Does it integrate with markdown, gutter, auth, or payments?
- [ ] Does it process content or data specific to Grove?
- [ ] Is it an admin tool for Grove features?
- [ ] Does it contain domain-specific UI components?
- [ ] Would it be useless without the rest of GroveEngine?

If you answered **YES** to any of these → ✅ **Belongs in GroveEngine**

If all are **NO** → Check if it belongs in GroveUI or Site-Specific code instead.

---

**Last Updated**: 2025-12-04
**Related Docs**:
- `BELONGS_IN_UI.md` (GroveUI decision guide)
- `site-specific-code.md` (Site deployment guide)
- `customer-template.md` (New project template)
