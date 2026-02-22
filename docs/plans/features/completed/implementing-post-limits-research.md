---
aliases:
date created: Friday, November 21st 2025, 3:01:12 pm
date modified: Friday, November 21st 2025, 3:02:38 pm
tags:
type: research
status: completed
conclusion: D1 + Durable Objects + soft limits recommended. Implementation reflected in tiers.ts.
---

# Implementing Post Limits in Svelte on Cloudflare Pages

**D1 with Durable Objects provides the most maintainable solution for enforcing post limits.** For a solo developer building a blog platform on Cloudflare Pages, use D1 as your primary storage with SQL-based counting, Durable Objects for race-free atomic operations, and R2 for archiving deleted posts. This combination delivers strong consistency, simple querying, and costs under $1/month for typical workloads while avoiding the complexity of eventual consistency models.

## Storage Backend Comparison for Markdown Posts

Cloudflare offers three storage options with dramatically different capabilities for blog post management. The choice fundamentally determines how easily you can query, count, and delete posts per user.

### Cloudflare D1: The Recommended Choice

**D1 is purpose-built for this use case.** As a serverless SQLite database, D1 excels at the exact operations you need: counting posts per subdomain, sorting by date, and efficiently finding the oldest post. With pricing at just $0.20/GB-month for storage and $0.001 per million rows read, it's remarkably cost-effective.

The SQL capabilities make implementation straightforward. A simple `SELECT COUNT(*) FROM posts WHERE subdomain = ?` efficiently counts posts, while `SELECT * FROM posts WHERE subdomain = ? ORDER BY created_at ASC LIMIT 1` instantly finds the oldest post when you need to delete it. These operations take under 1ms with proper indexing and cost fractions of a penny.

**Performance characteristics**: Read queries with indexes complete in under 1ms. Write operations take several milliseconds as they persist across multiple locations for durability. The single-threaded architecture means query throughput depends on query duration—1ms average queries yield roughly 1,000 queries/second per database.

**Key advantages**: Strong consistency for writes, full SQL support including transactions via batch operations, efficient indexing, and horizontal scaling through per-subdomain databases. The 10GB size limit per database sounds restrictive but works well with multi-database architectures—you can create up to 50,000 databases per account.

**Cost example**: Storing 10,000 posts (approximately 1GB) costs $0.20/month, with 100,000 post views reading about 100,000 rows for $0.0001. Total monthly cost: roughly $0.20.

### Workers KV: Not Recommended for Primary Storage

**KV lacks the query capabilities you need.** While exceptionally fast for key-value lookups (500µs to 10ms for cached reads), KV cannot efficiently sort, filter, or count posts. To find the oldest post, you must use the expensive list() operation to retrieve all keys, manually parse timestamps, and identify the oldest—operations that cost $5 per million requests compared to fractions of a penny with D1.

The eventual consistency model (up to 60+ seconds for global propagation) makes it unsuitable for post management where users expect immediate visibility of changes. The write rate limit of one write per second per key further constrains its utility.

**Where KV excels**: Configuration data, session storage, and caching individual posts when you already know the slug. Consider using KV as a read-through cache in front of D1, not as primary storage.

### R2 Object Storage: Ideal for Media, not Metadata

**R2 is perfect for images and archives, terrible for querying posts.** At $0.015/GB-month with zero egress fees, R2 provides the cheapest storage and free data transfer out—a massive advantage over AWS S3 ($90/TB egress) or Google Cloud Storage ($120/TB).

However, R2 has no query engine. Finding the oldest post requires listing all objects ($4.50 per million list operations), downloading metadata, and parsing in your application. This makes it impractical for primary blog post storage.

**Recommended hybrid approach**: Store blog post content and metadata in D1, upload user-submitted media (images, videos, PDFs) to R2. This combines D1's query efficiency with R2's cost-effective media delivery and zero egress fees.

### The Verdict: D1 as Primary, R2 for Media

Use D1 to store markdown content, metadata, and manage post limits. Use R2 for uploaded media files and archiving deleted posts. Optionally add KV for caching rendered posts. This architecture provides optimal cost, performance, and maintainability for a solo developer.

## Post Limit Enforcement Mechanisms

Implementing "delete oldest post when limit reached" requires atomic operations to prevent race conditions. Cloudflare offers two robust solutions: D1 batch operations for moderate concurrency, and Durable Objects for bulletproof consistency.

### Race Condition Prevention with Durable Objects

**Durable Objects eliminate race conditions by design.** Each Durable Object runs in a single-threaded environment with built-in input/output gates. When storage operations execute, no new events are delivered to the object, preventing interleaving of concurrent requests. This architecture makes atomic check-count-delete-insert operations natural.

Here's a complete implementation using Durable Objects with SQLite storage:

```javascript
// Durable Object class for managing posts
export class PostManager extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    
    // Initialize schema
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subdomain TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_subdomain_created 
      ON posts(subdomain, created_at ASC);
    `);
  }
  
  async createPost(subdomain, title, content, slug, maxPosts = 250) {
    // Entire operation is atomic via transactionSync
    return this.ctx.storage.transactionSync(() => {
      // 1. Count current posts
      const { count } = this.sql.exec(
        "SELECT COUNT(*) as count FROM posts WHERE subdomain = ?",
        subdomain
      ).one();
      
      // 2. Delete oldest if at limit
      if (count >= maxPosts) {
        this.sql.exec(`
          DELETE FROM posts 
          WHERE id = (
            SELECT id FROM posts 
            WHERE subdomain = ? 
            ORDER BY created_at ASC 
            LIMIT 1
          )
        `, subdomain);
      }
      
      // 3. Insert new post
      const result = this.sql.exec(`
        INSERT INTO posts (subdomain, slug, title, content, created_at)
        VALUES (?, ?, ?, ?, ?)
        RETURNING id, created_at
      `, subdomain, slug, title, content, Date.now()).one();
      
      return { success: true, post: result, deletedOldest: count >= maxPosts };
    });
  }
  
  async listPosts(subdomain, limit = 50) {
    return this.sql.exec(`
      SELECT id, slug, title, created_at
      FROM posts
      WHERE subdomain = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, subdomain, limit).toArray();
  }
  
  async getPostCount(subdomain) {
    return this.sql.exec(
      "SELECT COUNT(*) as count FROM posts WHERE subdomain = ?",
      subdomain
    ).one().count;
  }
}

// Worker to route requests to Durable Object
export { PostManager };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const subdomain = url.hostname.split('.')[0];
    
    // Get Durable Object instance for this subdomain
    const id = env.POST_MANAGER.idFromName(subdomain);
    const manager = env.POST_MANAGER.get(id);
    
    if (request.method === 'POST' && url.pathname === '/posts') {
      const { title, content, slug } = await request.json();
      const result = await manager.createPost(subdomain, title, content, slug, 250);
      return Response.json(result);
    }
    
    if (request.method === 'GET' && url.pathname === '/posts') {
      const posts = await manager.listPosts(subdomain);
      const count = await manager.getPostCount(subdomain);
      return Response.json({ posts, count, limit: 250 });
    }
    
    return new Response('Not Found', { status: 404 });
  }
};
```

**wrangler.toml configuration**:

```toml
name = "blog-post-manager"
main = "src/index.js"
compatibility_date = "2024-11-21"

[[durable_objects.bindings]]
name = "POST_MANAGER"
class_name = "PostManager"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["PostManager"]
```

**Why this works**: The `transactionSync()` wrapper ensures all operations commit or rollback together. Input gates prevent concurrent requests from interleaving during the transaction. No manual locking required—the architecture handles it automatically.

### D1 Batch Operations for Simpler Cases

If you prefer traditional database architecture without Durable Objects, D1's batch API provides transactional guarantees:

```javascript
export default {
  async fetch(request, env) {
    const { subdomain, title, content, slug } = await request.json();
    const maxPosts = 250;
    
    // Batch executes sequentially and atomically
    const results = await env.DB.batch([
      // 1. Count posts
      env.DB.prepare(
        "SELECT COUNT(*) as count FROM posts WHERE subdomain = ?"
      ).bind(subdomain),
      
      // 2. Conditionally delete oldest (SQL handles the check)
      env.DB.prepare(`
        DELETE FROM posts 
        WHERE id IN (
          SELECT id FROM posts 
          WHERE subdomain = ? 
          ORDER BY created_at ASC 
          LIMIT 1
        )
        AND (SELECT COUNT(*) FROM posts WHERE subdomain = ?) >= ?
      `).bind(subdomain, subdomain, maxPosts),
      
      // 3. Insert new post
      env.DB.prepare(`
        INSERT INTO posts (subdomain, slug, title, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(subdomain, slug, title, content, Date.now())
    ]);
    
    const count = results[0].results[0].count;
    const deleted = results[1].meta.changes > 0;
    
    return Response.json({ 
      success: true, 
      count: count >= maxPosts ? count : count + 1,
      deletedOldest: deleted 
    });
  }
};
```

**D1 batch guarantees**: Each statement executes sequentially and non-concurrently. If any statement fails, the entire batch aborts and rolls back. This provides transactional behavior sufficient for moderate concurrency.

### Efficient post counting Strategies

For read-heavy workloads, cache counts in Durable Object memory:

```javascript
export class PostManager extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.cachedCounts = new Map();
  }
  
  getPostCount(subdomain) {
    if (!this.cachedCounts.has(subdomain)) {
      const result = this.sql.exec(
        "SELECT COUNT(*) as count FROM posts WHERE subdomain = ?",
        subdomain
      ).one();
      this.cachedCounts.set(subdomain, result.count);
    }
    return this.cachedCounts.get(subdomain);
  }
  
  async createPost(subdomain, ...args) {
    return this.ctx.storage.transactionSync(() => {
      const count = this.getPostCount(subdomain);
      
      // Update cached count
      if (count >= this.maxPosts) {
        // Count stays same (delete + insert)
        this.cachedCounts.set(subdomain, count);
      } else {
        this.cachedCounts.set(subdomain, count + 1);
      }
      
      // ... rest of create logic
    });
  }
}
```

This pattern reduces database queries from two (count + insert) to effectively one by maintaining an in-memory counter.

## Svelte Admin Panel Integration

Building the client-side experience requires checking limits before submission, displaying warnings, and handling confirmation workflows. Svelte's reactive model makes this straightforward.

### Pre-submission Limit Checking

Use SvelteKit's `use:enhance` directive to intercept form submission and check limits:

```svelte
<script lang="ts">
  import { enhance, type SubmitFunction } from '$app/forms';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  let postCount = $state(0);
  let loading = $state(false);
  let showWarning = $state(false);
  let showUpgrade = $state(false);
  
  const MAX_POSTS = 250;
  $: canPost = postCount < MAX_POSTS;
  $: nearLimit = postCount >= MAX_POSTS * 0.9;
  
  onMount(async () => {
    const response = await fetch('/api/posts/count');
    const data = await response.json();
    postCount = data.count;
  });
  
  const handleSubmit: SubmitFunction = ({ cancel, formElement }) => {
    // Block at limit
    if (!canPost) {
      cancel();
      showUpgrade = true;
      return;
    }
    
    // Warn near limit
    if (nearLimit) {
      cancel();
      showWarning = true;
      formElement.dataset.pendingSubmit = 'true';
      return;
    }
    
    loading = true;
    return async ({ result, update }) => {
      loading = false;
      if (result.type === 'success') postCount++;
      await update();
    };
  };
  
  function proceedWithSubmission() {
    showWarning = false;
    const form = document.querySelector('form[data-pending-submit="true"]');
    if (form instanceof HTMLFormElement) {
      form.dataset.pendingSubmit = '';
      form.requestSubmit();
    }
  }
</script>

<form method="POST" action="?/create" use:enhance={handleSubmit}>
  <input name="title" required disabled={!canPost} />
  <textarea name="content" required disabled={!canPost}></textarea>
  <button type="submit" disabled={loading || !canPost}>
    {loading ? 'Creating...' : canPost ? 'Create Post' : 'Upgrade to Post'}
  </button>
</form>
```

### Warning Dialog with Deletion Preview

Show users exactly what will happen before they proceed:

```svelte
<script lang="ts">
  import { Modal } from 'flowbite-svelte';
  
  export let open = false;
  export let postCount = 0;
  export let oldestPost = null;
  export let onConfirm;
  
  const MAX_POSTS = 250;
</script>

<Modal bind:open size="md">
  <div class="text-center">
    <h3 class="mb-5 text-lg font-semibold">
      ⚠️ You're at {postCount}/{MAX_POSTS} posts
    </h3>
    
    {#if oldestPost}
      <p class="mb-5 text-sm text-gray-600">
        Creating this post will automatically delete your oldest post:
        <strong>"{oldestPost.title}"</strong> from 
        {new Date(oldestPost.created_at).toLocaleDateString()}
      </p>
    {/if}
    
    <div class="flex gap-4 justify-center">
      <button 
        class="px-4 py-2 bg-blue-600 text-white rounded"
        on:click={onConfirm}
      >
        Continue & Delete Oldest
      </button>
      <button 
        class="px-4 py-2 bg-gray-200 rounded"
        on:click={() => goto('/upgrade')}
      >
        Upgrade to Unlimited
      </button>
      <button 
        class="px-4 py-2 border rounded"
        on:click={() => open = false}
      >
        Cancel
      </button>
    </div>
  </div>
</Modal>
```

### Post Usage Dashboard Widget

Display quota status prominently:

```svelte
<script lang="ts">
  export let postCount = 0;
  export let maxPosts = 250;
  
  $: percentUsed = (postCount / maxPosts) * 100;
  $: statusColor = percentUsed < 75 ? 'green' : percentUsed < 90 ? 'yellow' : 'red';
  $: statusText = percentUsed < 75 ? 'Healthy' : percentUsed < 90 ? 'Warning' : 'Critical';
</script>

<div class="quota-widget" data-status={statusColor}>
  <div class="flex justify-between items-center mb-2">
    <h4 class="font-semibold">Post Usage</h4>
    <span class="badge" data-status={statusColor}>{statusText}</span>
  </div>
  
  <div class="text-2xl font-bold mb-2">
    {postCount}<span class="text-gray-400">/{maxPosts}</span>
  </div>
  
  <div class="progress-bar bg-gray-200 rounded-full h-2 mb-1">
    <div 
      class="progress-fill h-full rounded-full transition-all"
      class:bg-green-500={statusColor === 'green'}
      class:bg-yellow-500={statusColor === 'yellow'}
      class:bg-red-500={statusColor === 'red'}
      style="width: {percentUsed}%"
    ></div>
  </div>
  
  <p class="text-sm text-gray-600">{percentUsed.toFixed(1)}% used</p>
  
  {#if percentUsed >= 90}
    <div class="upgrade-prompt mt-4 p-4 bg-blue-50 rounded">
      <p class="mb-2">💎 Upgrade to Pro for unlimited posts</p>
      <a href="/upgrade" class="text-blue-600 hover:underline">
        View Plans →
      </a>
    </div>
  {/if}
</div>
```

### Server-side Integration with Cloudflare Workers

Your SvelteKit `+page.server.ts` should communicate with your Cloudflare Worker:

```typescript
// +page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

const WORKER_URL = 'https://your-worker.workers.dev';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
  const token = cookies.get('auth_token');
  
  const response = await fetch(`${WORKER_URL}/api/posts/count`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  return {
    postCount: data.count,
    maxPosts: data.limit || 250,
    oldestPost: data.oldestPost
  };
};

export const actions = {
  create: async ({ request, fetch, cookies }) => {
    const token = cookies.get('auth_token');
    const formData = await request.formData();
    
    // Submit to Worker
    const response = await fetch(`${WORKER_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: formData.get('title'),
        content: formData.get('content'),
        slug: formData.get('slug')
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      return fail(response.status, { 
        error: error.message,
        needsUpgrade: response.status === 403
      });
    }
    
    return { success: true, post: await response.json() };
  }
} satisfies Actions;
```

This architecture keeps business logic in Workers while leveraging SvelteKit's form handling and progressive enhancement.

## Data Structures and Metadata

Proper schema design and indexing dramatically impact query performance and billing costs. D1 charges per row read, so efficient queries save money.

### Optimal D1 Table Schema

```sql
CREATE TABLE posts (
  id TEXT PRIMARY KEY,  -- UUID or slug
  subdomain TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  author_id TEXT,
  created_at INTEGER NOT NULL,  -- Unix timestamp for efficient sorting
  updated_at INTEGER NOT NULL,
  published INTEGER DEFAULT 0,  -- Boolean: 0 or 1
  word_count INTEGER,
  CONSTRAINT slug_unique UNIQUE(subdomain, slug)
);

-- Critical indexes for performance
CREATE INDEX idx_subdomain_created 
  ON posts(subdomain, created_at DESC);

CREATE INDEX idx_subdomain_published_created
  ON posts(subdomain, published, created_at DESC)
  WHERE published = 1;  -- Partial index for published posts only

CREATE INDEX idx_slug 
  ON posts(slug);

-- For tags (many-to-many relationship)
CREATE TABLE post_tags (
  post_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (post_id, tag),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_tag_lookup ON post_tags(tag, post_id);
```

**Key design decisions**: Store dates as INTEGER Unix timestamps (not TEXT) for efficient numeric comparisons and sorting. Use partial indexes on published posts to reduce index size and speed up common queries. Composite indexes place the filter column (subdomain, published) before the sort column (created_at).

### JSON Structure for Blog Posts

When storing in KV or serializing for APIs:

```json
{
  "id": "uuid-or-slug",
  "subdomain": "myblog",
  "slug": "my-first-post",
  "title": "My First Post",
  "description": "A brief excerpt",
  "content": "# Full markdown content...",
  "author": {
    "id": "user-123",
    "name": "Jane Doe"
  },
  "created_at": 1700564400,
  "updated_at": 1700584200,
  "published": true,
  "word_count": 1500,
  "tags": ["technology", "cloudflare"],
  "featured_image": {
    "url": "https://r2.example.com/images/post-1.jpg",
    "width": 1200,
    "height": 630
  }
}
```

### Efficient Query Patterns

**Count posts per subdomain**:
```sql
SELECT COUNT(*) as count 
FROM posts 
WHERE subdomain = ? AND published = 1;
-- Uses idx_subdomain_published_created, reads ~1 row
```

**Find oldest post for deletion**:
```sql
SELECT id, slug, title, created_at
FROM posts
WHERE subdomain = ?
ORDER BY created_at ASC
LIMIT 1;
-- Uses idx_subdomain_created, reads ~1-2 rows
```

**List recent posts**:
```sql
SELECT id, slug, title, description, created_at
FROM posts
WHERE subdomain = ? AND published = 1
ORDER BY created_at DESC
LIMIT 20;
-- Uses idx_subdomain_published_created, reads exactly 20 rows
```

**Performance tip**: Select only needed columns. Fetching large `content` columns when you only need metadata wastes bandwidth and row reads.

### Caching Strategies to Minimize Queries

Implement multi-level caching:

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const slug = url.pathname.split('/').pop();
    
    // Level 1: Cloudflare Cache API (edge cache)
    const cache = caches.default;
    const cacheKey = new Request(`https://example.com/cache/post/${slug}`);
    
    let response = await cache.match(cacheKey);
    if (response) return response;
    
    // Level 2: KV cache (global, eventually consistent)
    let post = await env.KV.get(`post:${slug}`, 'json');
    
    if (!post) {
      // Level 3: D1 database (source of truth)
      post = await env.DB.prepare(
        'SELECT * FROM posts WHERE slug = ? AND published = 1'
      ).bind(slug).first();
      
      if (!post) return new Response('Not found', { status: 404 });
      
      // Populate KV cache
      ctx.waitUntil(
        env.KV.put(`post:${slug}`, JSON.stringify(post), {
          expirationTtl: 3600,
          metadata: {
            title: post.title,
            created_at: post.created_at
          }
        })
      );
    }
    
    // Create response and cache at edge
    response = new Response(JSON.stringify(post), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }
};
```

**Cache hierarchy**: Edge cache (fastest, per-datacenter) → KV (global) → D1 (source of truth). Post counts and metadata should be cached separately from full content with shorter TTLs (5 minutes for counts, 1 hour for posts).

## Backup and Recovery Options

Automatic archival provides safety net for users who upgrade or accidentally delete important content. R2's zero egress fees make recovery cost-effective.

### Archive Deleted Posts to R2

Implement event-driven archival immediately upon deletion:

```javascript
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'DELETE' && request.url.includes('/posts/')) {
      const postId = extractPostId(request.url);
      const subdomain = extractSubdomain(request.url);
      
      // Fetch post before deletion
      const post = await env.DB.prepare(
        'SELECT * FROM posts WHERE id = ?'
      ).bind(postId).first();
      
      if (!post) {
        return new Response('Not found', { status: 404 });
      }
      
      // Archive to R2 (don't wait for completion)
      ctx.waitUntil(
        env.ARCHIVE_BUCKET.put(
          `deleted/${subdomain}/${new Date().toISOString().split('T')[0]}/${postId}.json`,
          JSON.stringify({
            data: post,
            metadata: {
              deleted_at: new Date().toISOString(),
              deleted_by: request.headers.get('X-User-ID'),
              retention_until: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
              original_id: postId
            }
          }),
          {
            httpMetadata: { contentType: 'application/json' },
            customMetadata: {
              subdomain: subdomain,
              deletionDate: new Date().toISOString(),
              retentionDays: '365'
            }
          }
        )
      );
      
      // Delete from database
      await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(postId).run();
      
      return Response.json({ success: true, archived: true });
    }
  }
};
```

**Key pattern**: Use `ctx.waitUntil()` to archive asynchronously without blocking the response. Users get fast deletion while archival happens in the background.

### Cost-effective Tiered Storage

Implement automatic lifecycle transitions:

```javascript
// Using S3-compatible API for R2 lifecycle management
import { S3Client, PutBucketLifecycleConfigurationCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  region: "auto",
  credentials: { accessKeyId, secretAccessKey }
});

await s3Client.send(new PutBucketLifecycleConfigurationCommand({
  Bucket: "blog-archives",
  LifecycleConfiguration: {
    Rules: [
      {
        Id: "MoveOldArchivesToInfrequentAccess",
        Status: "Enabled",
        Prefix: "deleted/",
        Transitions: [{
          Days: 30,
          StorageClass: "STANDARD_IA"  // 33% cheaper storage
        }]
      },
      {
        Id: "DeleteVeryOldArchives",
        Status: "Enabled",
        Prefix: "deleted/",
        Expiration: { Days: 365 }  // Auto-delete after 1 year
      }
    ]
  }
}));
```

**Cost breakdown** for 10GB of archived deleted posts:
- Days 0-30 (R2 Standard): 0.05GB × $0.015 = $0.00075
- Days 30-365 (R2 IA): 9.95GB × $0.01 = $0.0995
- **Total: ~$0.10/month**, plus negligible operation costs
- Zero egress fees for recovery

### Self-service Recovery Portal

Allow users to restore their own deleted posts:

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const subdomain = url.hostname.split('.')[0];
    
    // List deleted posts
    if (url.pathname === '/api/deleted-posts') {
      const archives = await env.ARCHIVE_BUCKET.list({
        prefix: `deleted/${subdomain}/`
      });
      
      const deletedPosts = await Promise.all(
        archives.objects.slice(0, 100).map(async obj => {
          const data = await env.ARCHIVE_BUCKET.get(obj.key);
          const parsed = await data.json();
          return {
            id: parsed.data.id,
            title: parsed.data.title,
            deleted_at: parsed.metadata.deleted_at,
            can_recover: new Date() < new Date(parsed.metadata.retention_until)
          };
        })
      );
      
      return Response.json({ posts: deletedPosts });
    }
    
    // Recover specific post
    if (url.pathname.startsWith('/api/recover/')) {
      const postId = url.pathname.split('/')[3];
      
      // Find in archive
      const archived = await env.ARCHIVE_BUCKET.get(
        `deleted/${subdomain}/${postId}.json`  // Simplified; implement date search
      );
      
      if (!archived) {
        return Response.json({ error: 'Post not found' }, { status: 404 });
      }
      
      const { data, metadata } = await archived.json();
      
      // Check retention period
      if (new Date() > new Date(metadata.retention_until)) {
        return Response.json({ error: 'Retention period expired' }, { status: 410 });
      }
      
      // Restore to database
      await env.DB.prepare(`
        INSERT INTO posts (id, subdomain, slug, title, content, created_at, updated_at, published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.id, data.subdomain, data.slug, data.title, 
        data.content, data.created_at, Date.now(), data.published
      ).run();
      
      return Response.json({ success: true, post: data });
    }
  }
};
```

**Retention policy recommendations**: Offer 30 days for free tier users, 365 days for paid users. Make this clear in your Terms of Service and display remaining days in the recovery interface.

### Automated D1 Backups with Workflows

For complete database backups, use Cloudflare Workflows:

```typescript
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";

export class BackupWorkflow extends WorkflowEntrypoint {
  async run(event: WorkflowEvent, step: WorkflowStep) {
    const { accountId, databaseId } = event.payload;
    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/export`;
    
    const headers = {
      "Authorization": `Bearer ${this.env.D1_API_TOKEN}`,
      "Content-Type": "application/json"
    };
    
    // Initiate export
    const bookmark = await step.do("Start backup", async () => {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ output_format: "polling" })
      });
      const { result } = await res.json();
      return result.at_bookmark;
    });
    
    // Poll and save to R2
    await step.do("Save backup to R2", async () => {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ current_bookmark: bookmark })
      });
      const { result } = await res.json();
      
      const sqlDump = await fetch(result.signed_url);
      const filename = `backups/${new Date().toISOString()}.sql`;
      
      await this.env.BACKUP_BUCKET.put(filename, sqlDump.body);
    });
  }
}

export default {
  async scheduled(controller, env, ctx) {
    await env.BACKUP_WORKFLOW.create({
      params: {
        accountId: env.ACCOUNT_ID,
        databaseId: env.DATABASE_ID
      }
    });
  }
};
```

Schedule this workflow daily in `wrangler.toml` with `triggers.crons = ["0 2 * * *"]` for 2 AM daily backups.

## Alternative Implementation Approaches

Before committing to automatic deletion, consider alternatives that preserve data while enforcing limits. These approaches often provide better user experience and higher conversion to paid plans.

### Soft Limits with Grace Periods

**Implement progressive warnings instead of immediate deletion**. When users reach 90% of their limit, show warnings. At 100%, enter a grace period (7-14 days) where they can still post but receive daily reminders. After grace period expires, switch to read-only mode.

```javascript
async function checkQuota(subdomain, env) {
  const count = await getPostCount(subdomain, env);
  const limit = await getPostLimit(subdomain, env);  // 250 for free, unlimited for paid
  const percentage = (count / limit) * 100;
  
  if (percentage >= 100) {
    const graceStart = await env.KV.get(`grace:${subdomain}:started`);
    
    if (!graceStart) {
      // Start grace period
      await env.KV.put(`grace:${subdomain}:started`, Date.now().toString());
      await sendNotification(subdomain, 'grace_period_started');
      return { allowed: true, warning: 'Grace period active (14 days)' };
    }
    
    const graceElapsed = Date.now() - parseInt(graceStart);
    const graceDays = 14;
    
    if (graceElapsed > graceDays * 24 * 60 * 60 * 1000) {
      return { allowed: false, reason: 'Grace period expired', action: 'upgrade_required' };
    }
    
    const remaining = graceDays - Math.floor(graceElapsed / (24*60*60*1000));
    return { 
      allowed: true, 
      warning: `Grace period: ${remaining} days remaining`,
      urgency: 'high'
    };
  }
  
  if (percentage >= 90) {
    return { allowed: true, warning: 'Approaching limit', urgency: 'medium' };
  }
  
  return { allowed: true };
}
```

**Advantages**: Users never lose data unexpectedly. Grace period creates urgency for upgrades without being punitive. Recoverable from accidental over-posting.

**Disadvantages**: More complex state management. Requires notification system. Users may exploit grace periods.

### Progressive Limitations

**Degrade functionality instead of deleting**. At 100% limit, older posts become read-only or hidden from public view but remain accessible to the owner. This creates strong upgrade incentive without data loss.

```sql
-- Add visibility column
ALTER TABLE posts ADD COLUMN visibility TEXT DEFAULT 'public';

-- Hide oldest posts when over limit
UPDATE posts 
SET visibility = 'hidden'
WHERE id IN (
  SELECT id FROM posts
  WHERE subdomain = ? AND visibility = 'public'
  ORDER BY created_at ASC
  LIMIT (
    (SELECT COUNT(*) FROM posts WHERE subdomain = ?) - ?
  )
)
AND subdomain = ?;
```

Frontend queries filter to `visibility = 'public'`, but owner's dashboard shows hidden posts with upgrade prompts:

```svelte
{#if hiddenPostCount > 0}
  <div class="upgrade-banner">
    <p>
      📦 You have {hiddenPostCount} hidden posts.
      Upgrade to make them public again.
    </p>
    <a href="/upgrade">Upgrade Now</a>
  </div>
{/if}
```

**Advantages**: Zero data loss. Strong upgrade motivation (content exists but unavailable). Instant restoration on upgrade. Lower support burden.

**Disadvantages**: More complex queries (always filter by visibility). May feel like holding content hostage. Requires clear communication to users.

### Tiered Storage for Scale

**Move older posts to cheaper storage automatically**. Keep recent posts (last 30 days) in D1 for fast access. Move older posts to R2 Standard, then R2 Infrequent Access after 90 days. Maintain metadata in D1 for querying.

```javascript
// Nightly job to archive old posts
async function archiveOldPosts(env) {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  const oldPosts = await env.DB.prepare(`
    SELECT * FROM posts 
    WHERE created_at < ? AND archived = 0
  `).bind(thirtyDaysAgo).all();
  
  for (const post of oldPosts.results) {
    // Upload to R2
    await env.POSTS_BUCKET.put(
      `posts/${post.subdomain}/${post.id}.json`,
      JSON.stringify(post)
    );
    
    // Update D1 to mark as archived, keep metadata
    await env.DB.prepare(`
      UPDATE posts 
      SET archived = 1, content = NULL
      WHERE id = ?
    `).bind(post.id).run();
  }
}

// Fetch post (handles both hot and cold storage)
async function getPost(slug, env) {
  const post = await env.DB.prepare(
    'SELECT * FROM posts WHERE slug = ?'
  ).bind(slug).first();
  
  if (!post) return null;
  
  if (post.archived) {
    // Fetch from R2
    const archived = await env.POSTS_BUCKET.get(
      `posts/${post.subdomain}/${post.id}.json`
    );
    const fullPost = await archived.json();
    return fullPost;
  }
  
  return post;
}
```

**Cost savings**: For 10,000 posts averaging 10KB each (100GB total):
- All in D1: $20/month
- Recent in D1 (1GB) + old in R2 (99GB): $0.20 + $1.49 = **$1.69/month** (92% savings)

**Advantages**: Dramatic cost reduction at scale. No data loss. Transparent to users (slightly slower for old posts). Works with any post limit.

**Disadvantages**: Added complexity. Slower retrieval for archived posts (1-2 second penalty). Requires migration jobs.

### Notification-driven Upgrades

**Don't enforce limits technically—enforce through UX**. Allow posting beyond limit but show persistent upgrade banners, reduce feature access, or add delays. Rely on user goodwill and desire for better experience.

```svelte
{#if overLimit}
  <div class="persistent-upgrade-banner">
    <p>⚠️ You're using {postCount} posts (limit: {limit})</p>
    <p>Please upgrade or delete older posts to continue.</p>
    <button onclick="location.href='/upgrade'">Upgrade Now</button>
  </div>
  
  <!-- Add 5-second delay before save -->
  <p class="text-sm text-gray-500">
    Saving in {countdown} seconds... 
    <a href="/upgrade" class="text-blue-600">Upgrade to save instantly</a>
  </p>
{/if}
```

**Advantages**: Simplest implementation. Best user experience (no data loss). Builds trust. Can be very effective at driving upgrades.

**Disadvantages**: No hard enforcement. Relies on user cooperation. Can be exploited. May not control costs if storage is expensive.

## Conclusion: The Maintainable Path forward

After evaluating all approaches, **the optimal architecture for a solo developer combines D1 as primary storage, Durable Objects for atomic limit enforcement, R2 for media and archives, and soft limits with grace periods for user experience**.

This architecture delivers exceptional value. You get strong consistency for post operations through Durable Objects' single-threaded model, eliminating race conditions entirely. D1's SQL capabilities make querying trivial—counting posts, finding the oldest, and complex filtering all work with standard SQL. The cost remains remarkably low: under $1/month for typical workloads including storage, operations, and archival.

Implement soft limits rather than immediate deletion. When users approach 90% capacity, show warnings. At 100%, trigger a 7-14 day grace period allowing continued posting with daily reminders. After grace period expiration, switch to read-only mode and require upgrade. Archive deleted posts to R2 for 365 days, providing safety net for upgrades and mistakes. This approach maximizes conversion to paid plans while minimizing support burden.

The three-tier caching strategy—edge cache, KV, D1—optimizes both performance and cost. Cache full rendered posts for 1 hour at the edge, maintain KV cache for global distribution, and treat D1 as source of truth. Cache post counts separately with 5-minute TTL to minimize database queries during high traffic.

For scaling beyond 100,000 posts per subdomain, implement tiered storage. Keep recent posts (last 30 days) in D1, move older content to R2, retain metadata in D1 for fast querying. This hybrid approach reduces storage costs by 90%+ while maintaining excellent query performance for active content.

Start simple: deploy D1 with proper indexes, implement basic post limits, add warning notifications. As you grow, layer in Durable Objects for guaranteed consistency, add R2 archival for deleted content, implement tiered storage for cost optimization. This progressive approach lets you launch quickly while building toward a robust, scalable platform that costs pennies per user to operate.

The combination of Cloudflare's edge platform, Svelte's reactive UI, and thoughtful limit enforcement creates a maintainable system that respects users while protecting your resources—exactly what a solo developer needs to build a sustainable blog platform.
