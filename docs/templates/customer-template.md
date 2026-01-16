# Grove Customer Site Template

**Quick-Start Guide for New Customer Deployments**

This document provides a template structure for initializing new Grove-powered customer websites.

---

## Quick Start

```bash
# 1. Create new SvelteKit project
npm create svelte@latest my-customer-site
cd my-customer-site

# 2. Install Grove dependencies
npm install @groveengine/ui@^0.3.0
npm install @autumnsgrove/groveengine@^0.3.0

# 3. Install required peer dependencies
npm install svelte@^5.0.0
npm install tailwindcss@^3.4.0

# 4. Initialize Tailwind
npx sveltejs-add@latest tailwindcss

# 5. Start development
npm run dev
```

---

## Project Structure

```
my-customer-site/
├── src/
│   ├── lib/
│   │   ├── config/
│   │   │   ├── site.ts              # Site-specific configuration
│   │   │   └── navigation.ts        # Site navigation config
│   │   ├── components/              # Site-specific components
│   │   │   ├── Header.svelte
│   │   │   ├── Footer.svelte
│   │   │   └── ContactForm.svelte
│   │   ├── content/                 # Static content/data
│   │   │   ├── team.ts
│   │   │   ├── services.ts
│   │   │   └── faqs.ts
│   │   └── utils/                   # Site-specific utilities
│   │       └── analytics.ts
│   ├── routes/                      # SvelteKit routes
│   │   ├── +layout.svelte           # Root layout
│   │   ├── +page.svelte             # Homepage
│   │   ├── about/                   # About page
│   │   ├── contact/                 # Contact page
│   │   ├── blog/                    # Blog (uses GroveEngine)
│   │   │   ├── +page.svelte         # Blog listing
│   │   │   └── [slug]/+page.svelte  # Blog post
│   │   └── shop/                    # Shop (if needed)
│   │       ├── +page.svelte
│   │       └── [slug]/+page.svelte
│   └── app.css                      # Global styles
├── static/                          # Static assets
│   ├── images/
│   │   ├── logo.svg
│   │   └── hero.jpg
│   ├── fonts/                       # Custom fonts (if needed)
│   └── favicon.ico
├── .env.example                     # Example environment variables
├── .env.local                       # Actual environment variables (gitignored)
├── svelte.config.js
├── tailwind.config.js
├── vite.config.js
├── package.json
└── README.md
```

---

## Required Dependencies

### package.json

```json
{
  "name": "my-customer-site",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch"
  },
  "dependencies": {
    "@groveengine/ui": "^0.3.0",
    "@autumnsgrove/groveengine": "^0.3.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^3.0.0",
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "tailwindcss": "^3.4.0",
    "tslib": "^2.4.1",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

---

## Configuration Files

### tailwind.config.js

```javascript
import grovePreset from '@groveengine/ui/tailwind';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [grovePreset], // Use Grove design system
  content: [
    './src/**/*.{html,js,svelte,ts}',
    // Include Grove packages for proper Tailwind scanning
    './node_modules/@groveengine/ui/**/*.{html,js,svelte,ts}',
    './node_modules/@autumnsgrove/groveengine/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {
      // Add site-specific overrides here
      colors: {
        brand: '#your-custom-color' // Optional: Override Grove colors
      }
    }
  }
};
```

### svelte.config.js

```javascript
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),
    alias: {
      $lib: 'src/lib',
      '@groveengine/ui': './node_modules/@groveengine/ui',
      '@autumnsgrove/groveengine': './node_modules/@autumnsgrove/groveengine'
    }
  }
};

export default config;
```

### vite.config.js

```javascript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    include: ['@groveengine/ui', '@autumnsgrove/groveengine']
  }
});
```

---

## Environment Variables

### .env.example

```env
# Site Configuration
PUBLIC_SITE_NAME="My Business Name"
PUBLIC_SITE_URL="https://example.com"

# Database (if using)
DATABASE_URL="your-database-url"

# Authentication (if using Grove auth)
JWT_SECRET="your-jwt-secret"
SESSION_SECRET="your-session-secret"

# Email (if using Grove email features)
RESEND_API_KEY="your-resend-key"
PUBLIC_EMAIL_FROM="hello@example.com"

# Payments (if using Grove shop)
PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."

# Analytics (optional)
PUBLIC_GA_ID="G-..."

# CDN (optional)
PUBLIC_CDN_URL="https://cdn.example.com"
```

### .env.local (create this, don't commit)

```env
# Copy .env.example and fill in real values
PUBLIC_SITE_NAME="The Midnight Bloom Tea Café"
PUBLIC_SITE_URL="http://localhost:5173"
# ... rest of your actual values
```

---

## Core Configuration

### src/lib/config/site.ts

```typescript
export const siteConfig = {
  // Business Information
  businessName: 'My Business Name',
  tagline: 'Your business tagline',
  description: 'Brief description of your business',

  // Contact Information
  contact: {
    email: 'hello@example.com',
    phone: '(555) 123-4567',
    address: {
      street: '123 Main St',
      city: 'Portland',
      state: 'OR',
      zip: '97201',
      country: 'USA'
    }
  },

  // Social Media
  social: {
    instagram: '@yourbusiness',
    facebook: '/yourbusiness',
    twitter: '@yourbusiness',
    linkedin: '/company/yourbusiness'
  },

  // Site Settings
  settings: {
    enableBlog: true,
    enableShop: false,
    enableReservations: false,
    enableGutterAnnotations: true,
    enableAuth: false
  },

  // SEO
  seo: {
    defaultTitle: 'My Business Name',
    defaultDescription: 'Brief description for search engines',
    defaultImage: '/images/og-image.jpg',
    twitterHandle: '@yourbusiness'
  }
};

// Environment-based overrides
if (import.meta.env.PROD) {
  siteConfig.settings.enableAuth = true;
}

export type SiteConfig = typeof siteConfig;
```

### src/lib/config/navigation.ts

```typescript
export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

export const navigation: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' }
];

// Optional: Footer navigation
export const footerNavigation: NavItem[] = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' }
];
```

---

## Core Components

### src/lib/components/Header.svelte

```svelte
<script lang="ts">
  import { Button } from '@groveengine/ui/ui';
  import { navigation } from '$lib/config/navigation';
  import { siteConfig } from '$lib/config/site';
</script>

<header class="border-b">
  <div class="container mx-auto px-4 py-4 flex items-center justify-between">
    <a href="/" class="text-2xl font-bold">
      {siteConfig.businessName}
    </a>

    <nav class="hidden md:flex gap-6">
      {#each navigation as item}
        <a href={item.href} class="hover:text-grove-600">
          {item.label}
        </a>
      {/each}
    </nav>

    <Button variant="primary" href="/contact">
      Contact Us
    </Button>
  </div>
</header>
```

### src/lib/components/Footer.svelte

```svelte
<script lang="ts">
  import { siteConfig } from '$lib/config/site';
  import { footerNavigation } from '$lib/config/navigation';
</script>

<footer class="border-t bg-bark-50 mt-20">
  <div class="container mx-auto px-4 py-12">
    <div class="grid md:grid-cols-3 gap-8">
      <div>
        <h3 class="font-bold text-lg mb-4">{siteConfig.businessName}</h3>
        <p class="text-bark-600">{siteConfig.description}</p>
      </div>

      <div>
        <h3 class="font-bold text-lg mb-4">Contact</h3>
        <p class="text-bark-600">
          {siteConfig.contact.email}<br />
          {siteConfig.contact.phone}
        </p>
      </div>

      <div>
        <h3 class="font-bold text-lg mb-4">Follow Us</h3>
        <div class="flex gap-4">
          {#if siteConfig.social.instagram}
            <a href="https://instagram.com/{siteConfig.social.instagram}">Instagram</a>
          {/if}
          {#if siteConfig.social.facebook}
            <a href="https://facebook.com/{siteConfig.social.facebook}">Facebook</a>
          {/if}
        </div>
      </div>
    </div>

    <div class="mt-8 pt-8 border-t text-center text-bark-600 text-sm">
      <p>© {new Date().getFullYear()} {siteConfig.businessName}. All rights reserved.</p>
      <div class="flex gap-4 justify-center mt-2">
        {#each footerNavigation as item}
          <a href={item.href}>{item.label}</a>
        {/each}
      </div>
    </div>
  </div>
</footer>
```

---

## Root Layout

### src/routes/+layout.svelte

```svelte
<script lang="ts">
  import '@groveengine/ui/styles/grove.css';
  import '../app.css';

  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { siteConfig } from '$lib/config/site';
</script>

<svelte:head>
  <title>{siteConfig.seo.defaultTitle}</title>
  <meta name="description" content={siteConfig.seo.defaultDescription} />
</svelte:head>

<div class="min-h-screen flex flex-col">
  <Header />

  <main class="flex-1">
    <slot />
  </main>

  <Footer />
</div>
```

### src/app.css

```css
@import '@groveengine/ui/styles/grove.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Site-specific global styles */
:root {
  /* Override Grove tokens if needed */
  /* --grove-primary: #your-color; */
}

/* Your custom styles here */
```

---

## Example Routes

### src/routes/+page.svelte (Homepage)

```svelte
<script lang="ts">
  import { Button, Card } from '@groveengine/ui/ui';
  import { siteConfig } from '$lib/config/site';
</script>

<div class="container mx-auto px-4 py-12">
  <!-- Hero Section -->
  <section class="text-center py-20">
    <h1 class="text-5xl font-bold mb-4">
      {siteConfig.tagline}
    </h1>
    <p class="text-xl text-bark-600 mb-8">
      {siteConfig.description}
    </p>
    <Button variant="primary" size="lg" href="/contact">
      Get Started
    </Button>
  </section>

  <!-- Features Section -->
  <section class="grid md:grid-cols-3 gap-8 py-12">
    <Card>
      <h3 class="text-2xl font-bold mb-2">Feature 1</h3>
      <p>Description of your first feature</p>
    </Card>

    <Card>
      <h3 class="text-2xl font-bold mb-2">Feature 2</h3>
      <p>Description of your second feature</p>
    </Card>

    <Card>
      <h3 class="text-2xl font-bold mb-2">Feature 3</h3>
      <p>Description of your third feature</p>
    </Card>
  </section>
</div>
```

### src/routes/blog/+page.svelte (Blog Listing)

```svelte
<script lang="ts">
  import { Card, Button } from '@groveengine/ui/ui';

  // This would come from GroveEngine's blog system
  export let data;
</script>

<div class="container mx-auto px-4 py-12">
  <h1 class="text-4xl font-bold mb-8">Blog</h1>

  <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
    {#each data.posts as post}
      <Card>
        <h2 class="text-2xl font-bold mb-2">{post.title}</h2>
        <p class="text-bark-600 mb-4">{post.excerpt}</p>
        <Button variant="secondary" href="/blog/{post.slug}">
          Read More
        </Button>
      </Card>
    {/each}
  </div>
</div>
```

---

## Customization Points

### 1. Theme Overrides

Override Grove colors in `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      brand: {
        primary: '#your-color',
        secondary: '#another-color'
      }
    }
  }
}
```

### 2. Content Types

Enable/disable features in `site.ts`:

```typescript
settings: {
  enableBlog: true,      // Blog posts
  enableShop: true,      // E-commerce
  enableReservations: true, // Custom feature
  enableGutterAnnotations: true, // Grove annotations
  enableAuth: true       // User authentication
}
```

### 3. Navigation Structure

Customize in `navigation.ts`:

```typescript
export const navigation: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Services',
    href: '/services',
    children: [
      { label: 'Service 1', href: '/services/service-1' },
      { label: 'Service 2', href: '/services/service-2' }
    ]
  }
];
```

### 4. Feature Flags

Control features per environment:

```typescript
if (import.meta.env.DEV) {
  siteConfig.settings.enableAuth = false; // Disable in dev
}

if (import.meta.env.PROD) {
  siteConfig.settings.enableAuth = true; // Enable in prod
}
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Configure all environment variables in `.env.local`
- [ ] Update `siteConfig` with actual business information
- [ ] Replace placeholder images in `/static/images/`
- [ ] Update favicon and OG images
- [ ] Configure custom domain (if applicable)
- [ ] Set up database (if using Grove features requiring it)
- [ ] Configure payment provider (if using shop)
- [ ] Set up email provider (if using Grove email features)
- [ ] Test all routes and forms
- [ ] Run `npm run check` for type errors
- [ ] Run `npm run build` to verify build succeeds

### Deployment

- [ ] Deploy to hosting provider (Vercel, Netlify, etc.)
- [ ] Set environment variables in hosting provider dashboard
- [ ] Configure custom domain DNS
- [ ] Enable SSL certificate
- [ ] Set up analytics (Google Analytics, etc.)
- [ ] Test production deployment

### Post-Deployment

- [ ] Verify all pages load correctly
- [ ] Test forms and integrations
- [ ] Check mobile responsiveness
- [ ] Verify SEO meta tags
- [ ] Submit sitemap to search engines
- [ ] Monitor error logs

---

## Common Patterns

### Using Grove Blog

```svelte
<script lang="ts">
  import { ContentWithGutter, MarkdownEditor } from '@autumnsgrove/groveengine';

  export let data; // Blog post data
</script>

<ContentWithGutter content={data.post.content}>
  <!-- Gutter annotations will appear alongside content -->
</ContentWithGutter>
```

### Using Grove Shop

```svelte
<script lang="ts">
  import { Button } from '@groveengine/ui/ui';
  import { addToCart } from '@autumnsgrove/groveengine/payments';

  export let product;
</script>

<div>
  <h1>{product.name}</h1>
  <p>{product.price}</p>
  <Button onclick={() => addToCart(product)}>
    Add to Cart
  </Button>
</div>
```

### Using Grove Auth

```svelte
<script lang="ts">
  import { login } from '@autumnsgrove/groveengine/auth';
  import { Input, Button } from '@groveengine/ui/ui';

  let email = '';
  let password = '';

  async function handleLogin() {
    await login(email, password);
  }
</script>

<form on:submit|preventDefault={handleLogin}>
  <Input type="email" bind:value={email} placeholder="Email" />
  <Input type="password" bind:value={password} placeholder="Password" />
  <Button type="submit">Log In</Button>
</form>
```

---

## Troubleshooting

### Build Errors

**Issue**: `Cannot find module '@groveengine/ui'`
**Solution**: Run `npm install` to ensure all dependencies are installed

**Issue**: Tailwind styles not applying
**Solution**: Verify `tailwind.config.js` includes Grove preset and content paths

### Runtime Errors

**Issue**: Components not rendering
**Solution**: Check that imports use correct package names:
- UI: `@groveengine/ui/ui`
- Engine: `@autumnsgrove/groveengine`

**Issue**: Environment variables not loading
**Solution**: Ensure `.env.local` exists and variables are prefixed with `PUBLIC_` for client-side access

---

## Support & Resources

- **Documentation**: See `belongs-in-engine.md`, `BELONGS_IN_UI.md`, `site-specific-code.md`
- **Examples**: Check `/packages/example-site/` in GroveEngine repo
- **Issues**: Report bugs to GitHub issues

---

**Last Updated**: 2025-12-03
**Template Version**: 1.0.0
**Compatible with**:
- `@groveengine/ui@^0.3.0`
- `@autumnsgrove/groveengine@^0.3.0`
