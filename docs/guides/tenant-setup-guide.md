# Creating a New Tenant (Blog Site)

This guide walks through creating a new tenant blog site on the Grove platform.

## Prerequisites

- `wrangler` CLI installed and logged in
- Access to `grove-engine-db` D1 database
- Access to `groveauth` D1 database (for OAuth)

## Quick Start

### Step 1: Create the Tenant

```bash
wrangler d1 execute grove-engine-db --remote --command="
INSERT INTO tenants (id, subdomain, display_name, email, active, theme, created_at, updated_at)
VALUES (
  '$(uuidgen | tr '[:upper:]' '[:lower:]')',
  'yoursubdomain',
  'Your Site Name',
  'owner@example.com',
  1,
  'default',
  datetime('now'),
  datetime('now')
);
"
```

**Fields:**
- `subdomain`: The URL prefix (e.g., `sarah` → `sarah.grove.place`)
- `display_name`: Shown in the nav bar and site title
- `email`: Owner's email for admin access
- `theme`: Optional theme identifier

### Step 2: Create the Home Page

```bash
wrangler d1 execute grove-engine-db --remote --command="
INSERT INTO pages (slug, title, description, markdown_content, html_content, hero, tenant_id, created_at, updated_at)
SELECT
  'home',
  'Your Site Name',
  'A brief description of your site.',
  '## Welcome

Your welcome message here in markdown.',
  '<h2 id=\"welcome\">Welcome</h2>
<p>Your welcome message here in HTML.</p>',
  '{\"title\": \"Your Site Name\", \"subtitle\": \"Your tagline here\", \"cta\": {\"text\": \"Read Our Blog\", \"href\": \"/blog\"}}',
  id,
  datetime('now'),
  datetime('now')
FROM tenants WHERE subdomain = 'yoursubdomain';
"
```

### Step 3: Add a Blog Post (Optional)

```bash
wrangler d1 execute grove-engine-db --remote --command="
INSERT INTO posts (slug, title, description, markdown_content, html_content, tags, status, published_at, tenant_id, created_at, updated_at)
SELECT
  'hello-world',
  'Hello World',
  'My first blog post.',
  '# Hello World

This is my first post!',
  '<h1 id=\"hello-world\">Hello World</h1>
<p>This is my first post!</p>',
  '[\"welcome\"]',
  'published',
  datetime('now'),
  id,
  datetime('now'),
  datetime('now')
FROM tenants WHERE subdomain = 'yoursubdomain';
"
```

### Step 4: Add to OAuth Client (Required for Admin Access)

Add the new subdomain to the GroveAuth client's redirect URIs:

```bash
# First, check current redirect URIs
wrangler d1 execute groveauth --remote --command="SELECT redirect_uris, allowed_origins FROM clients WHERE client_id = 'groveengine';"

# Then update with the new subdomain added
wrangler d1 execute groveauth --remote --command="UPDATE clients SET redirect_uris = '[\"https://existing.grove.place/auth/callback\", \"https://yoursubdomain.grove.place/auth/callback\", \"http://localhost:5173/auth/callback\"]', allowed_origins = '[\"https://existing.grove.place\", \"https://yoursubdomain.grove.place\", \"http://localhost:5173\"]' WHERE client_id = 'groveengine';"
```

## Complete Example: Creating "Jennifer's Apiary"

Here's a real example from our test tenants:

### 1. Create Tenant
```bash
wrangler d1 execute grove-engine-db --remote --command="
INSERT INTO tenants (id, subdomain, display_name, email, active, theme, created_at, updated_at)
VALUES (
  '$(uuidgen | tr '[:upper:]' '[:lower:]')',
  'jennifer',
  'Jennifer''s Apiary',
  'jennifer@example.com',
  1,
  'honey',
  datetime('now'),
  datetime('now')
);
"
```

### 2. Create Home Page
```bash
wrangler d1 execute grove-engine-db --remote --command="
INSERT INTO pages (slug, title, description, markdown_content, html_content, hero, tenant_id, created_at, updated_at)
SELECT
  'home',
  'Jennifer''s Apiary',
  'Beekeeping adventures, honey harvests, and life with the bees.',
  '## Welcome to Jennifer''s Apiary

Hello, fellow bee enthusiasts! I''m Jennifer, and I''ve been keeping bees for over 10 years now.

This is where I share everything I''ve learned about:
- **Hive management** through the seasons
- **Honey harvesting** tips and recipes
- **Bee behavior** observations from my backyard apiary
- **Pollinator gardening** to support our fuzzy friends

Whether you''re a seasoned beekeeper or just bee-curious, you''re welcome here!',
  '<h2 id=\"welcome-to-jennifers-apiary\">Welcome to Jennifer''s Apiary</h2>
<p>Hello, fellow bee enthusiasts! I''m Jennifer, and I''ve been keeping bees for over 10 years now.</p>
<p>This is where I share everything I''ve learned about:</p>
<ul>
<li><strong>Hive management</strong> through the seasons</li>
<li><strong>Honey harvesting</strong> tips and recipes</li>
<li><strong>Bee behavior</strong> observations from my backyard apiary</li>
<li><strong>Pollinator gardening</strong> to support our fuzzy friends</li>
</ul>
<p>Whether you''re a seasoned beekeeper or just bee-curious, you''re welcome here!</p>',
  '{\"title\": \"Jennifer''s Apiary\", \"subtitle\": \"Life is sweet when you keep bees\", \"cta\": {\"text\": \"Read Our Blog\", \"href\": \"/blog\"}}',
  id,
  datetime('now'),
  datetime('now')
FROM tenants WHERE subdomain = 'jennifer';
"
```

### 3. Create First Blog Post
```bash
wrangler d1 execute grove-engine-db --remote --command="
INSERT INTO posts (slug, title, description, markdown_content, html_content, tags, status, published_at, tenant_id, created_at, updated_at)
SELECT
  'why-i-started-beekeeping',
  'Why I Started Beekeeping',
  'The story of how a single bee changed my life forever.',
  '# Why I Started Beekeeping

It all started with a single bee on my lavender plant...

(your content here)',
  '<h1 id=\"why-i-started-beekeeping\">Why I Started Beekeeping</h1>
<p>It all started with a single bee on my lavender plant...</p>',
  '[\"beekeeping\", \"honey\", \"getting-started\"]',
  'published',
  datetime('now'),
  id,
  datetime('now'),
  datetime('now')
FROM tenants WHERE subdomain = 'jennifer';
"
```

### 4. Add to OAuth
```bash
wrangler d1 execute groveauth --remote --command="UPDATE clients SET redirect_uris = '[\"https://dave.grove.place/auth/callback\", \"https://example.grove.place/auth/callback\", \"https://sarah.grove.place/auth/callback\", \"https://jennifer.grove.place/auth/callback\", \"http://localhost:5173/auth/callback\"]', allowed_origins = '[\"https://dave.grove.place\", \"https://example.grove.place\", \"https://sarah.grove.place\", \"https://jennifer.grove.place\", \"http://localhost:5173\"]' WHERE client_id = 'groveengine';"
```

## Existing Test Tenants

| Subdomain | Display Name | URL |
|-----------|--------------|-----|
| `dave` | Dave's Digital Garden | https://dave.grove.place |
| `example` | The Midnight Bloom | https://example.grove.place |
| `sarah` | Sarah's Garden | https://sarah.grove.place |
| `jennifer` | Jennifer's Apiary | https://jennifer.grove.place |

## Verification

After creating a tenant, verify it works:

1. Visit `https://yoursubdomain.grove.place` - should show home page
2. Visit `https://yoursubdomain.grove.place/blog` - should show blog posts
3. Visit `https://yoursubdomain.grove.place/admin` - should redirect to Heartwood login

## Troubleshooting

### "Tenant not found" or showing wrong content
- Verify the tenant exists: `wrangler d1 execute grove-engine-db --remote --command="SELECT * FROM tenants WHERE subdomain = 'yoursubdomain';"`
- Check the home page exists: `wrangler d1 execute grove-engine-db --remote --command="SELECT * FROM pages WHERE tenant_id = 'your-tenant-id' AND slug = 'home';"`

### OAuth redirect fails
- Verify the subdomain is in the `redirect_uris` array in the GroveAuth clients table
- Check for exact URL match (including `https://` and `/auth/callback`)

### Content not showing
- Ensure `tenant_id` matches the tenant's `id` in all posts/pages
- Check `status = 'published'` for posts

## Database Schema Reference

### tenants table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID primary key |
| subdomain | TEXT | URL prefix (unique) |
| display_name | TEXT | Site name shown in nav |
| email | TEXT | Owner's email |
| active | INTEGER | 1 = active, 0 = disabled |
| theme | TEXT | Optional theme identifier |

### pages table
| Column | Type | Description |
|--------|------|-------------|
| slug | TEXT | URL path (e.g., 'home', 'about') |
| title | TEXT | Page title |
| description | TEXT | Meta description |
| markdown_content | TEXT | Raw markdown |
| html_content | TEXT | Rendered HTML |
| hero | TEXT | JSON hero config |
| tenant_id | TEXT | FK to tenants.id |

### posts table
| Column | Type | Description |
|--------|------|-------------|
| slug | TEXT | URL path |
| title | TEXT | Post title |
| description | TEXT | Meta description |
| markdown_content | TEXT | Raw markdown |
| html_content | TEXT | Rendered HTML |
| tags | TEXT | JSON array of tags |
| status | TEXT | 'draft' or 'published' |
| published_at | TEXT | ISO date string |
| tenant_id | TEXT | FK to tenants.id |

---

*Last updated: 2025-12-14*
