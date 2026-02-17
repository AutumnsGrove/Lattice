# Lattice Implementation Prompt (Phase 2 of 2)

> **Purpose:** Implement new features for `@lattice/core` that don't exist in the source repository.
> **Prerequisite:** Complete `web-engine-extraction-prompt.md` (Phase 1) first.

---

## CONTEXT

You are implementing Phase 2 of Lattice. Phase 1 extracted and converted existing components from the AutumnsGrove website. This phase builds the remaining features required by the specifications.

**Reference Specifications:**

- `docs/specs/engine-spec.md` - Core engine architecture
- `docs/specs/customer-repo-spec.md` - Customer repository template
- `docs/specs/website-spec.md` - Grove website platform

**What this prompt implements:**

- Magic code authentication (Resend email integration)
- D1 database schema and query utilities
- KV session management
- R2 media storage utilities
- Blog components (PostList, PostCard, PostView, PostEditor)
- Admin panel components
- Auth components (LoginForm, MagicCodeInput)
- Customer repository template

---

## CRITICAL PRINCIPLES

### 1. Spec Compliance

- Follow the specifications exactly as documented
- Use the type definitions created in Phase 1
- Match the database schema from `engine-spec.md`

### 2. Cloudflare Native

- All server code must work in Cloudflare Workers
- Use Web Crypto API (not Node.js crypto)
- D1 for database, KV for sessions, R2 for storage

### 3. TypeScript Strict Mode

- All code must be TypeScript
- No `any` types without explicit justification
- Proper error handling with typed errors

### 4. Security First

- Hash magic codes with SHA-256
- Secure session cookies (httpOnly, secure, sameSite)
- Parameterized queries only (no string concatenation)
- Rate limiting on authentication endpoints

---

## PHASE 1: DATABASE MIGRATIONS

### 1.1 Create Migration Files

Create D1 migrations in `package/migrations/`:

**package/migrations/0001_initial_schema.sql:**

```sql
-- Lattice Initial Schema
-- Database: D1 (SQLite)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'editor', 'user')),
  avatar_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  html TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured_image TEXT,
  word_count INTEGER DEFAULT 0,
  reading_time INTEGER DEFAULT 0,
  published_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at DESC);

-- Sessions table (backup for KV)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Site configuration
CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- Post-Tag relationship
CREATE TABLE IF NOT EXISTS post_tags (
  post_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id);

-- Media files
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  url TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  size INTEGER,
  format TEXT,
  mime_type TEXT,
  uploaded_by TEXT,
  uploaded_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_at ON media(uploaded_at DESC);
```

---

## PHASE 2: MAGIC CODE AUTHENTICATION

### 2.1 Magic Code Generation

**package/src/lib/server/auth/magic-code.ts:**

```typescript
/**
 * Magic code authentication for passwordless login
 * Uses Cloudflare KV for code storage with TTL
 */

const MAGIC_CODE_TTL = 600; // 10 minutes in seconds
const MAGIC_CODE_PREFIX = "magic_code:";

/**
 * Generate a cryptographically secure 6-digit code
 */
export function generateMagicCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}

/**
 * Hash a code using SHA-256
 */
export async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Store a magic code in KV (hashed)
 */
export async function storeMagicCode(
  kv: KVNamespace,
  email: string,
  code: string,
): Promise<void> {
  const hashedCode = await hashCode(code);
  const key = `${MAGIC_CODE_PREFIX}${email.toLowerCase()}`;

  await kv.put(key, hashedCode, {
    expirationTtl: MAGIC_CODE_TTL,
  });
}

/**
 * Verify a magic code
 * Returns true if valid, false if invalid or expired
 * Deletes the code after verification (one-time use)
 */
export async function verifyMagicCode(
  kv: KVNamespace,
  email: string,
  code: string,
): Promise<boolean> {
  const key = `${MAGIC_CODE_PREFIX}${email.toLowerCase()}`;
  const storedHash = await kv.get(key);

  if (!storedHash) {
    return false;
  }

  const providedHash = await hashCode(code);
  const isValid = storedHash === providedHash;

  if (isValid) {
    // Delete the code after successful verification
    await kv.delete(key);
  }

  return isValid;
}

/**
 * Delete a magic code (for cleanup or invalidation)
 */
export async function deleteMagicCode(
  kv: KVNamespace,
  email: string,
): Promise<void> {
  const key = `${MAGIC_CODE_PREFIX}${email.toLowerCase()}`;
  await kv.delete(key);
}
```

### 2.2 Session Management

**package/src/lib/server/auth/session.ts:**

```typescript
/**
 * Session management using Cloudflare KV
 */

import type { User, Session } from "../../types";

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds
const SESSION_PREFIX = "session:";

/**
 * Generate a secure session ID
 */
export function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create a new session
 */
export async function createSession(
  kv: KVNamespace,
  user: User,
): Promise<string> {
  const sessionId = generateSessionId();
  const session: Session = {
    id: sessionId,
    user_id: user.id,
    expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL,
    created_at: Math.floor(Date.now() / 1000),
  };

  const key = `${SESSION_PREFIX}${sessionId}`;
  await kv.put(key, JSON.stringify({ session, user }), {
    expirationTtl: SESSION_TTL,
  });

  return sessionId;
}

/**
 * Validate a session and return user data
 */
export async function validateSession(
  sessionId: string,
  kv: KVNamespace,
  db: D1Database,
): Promise<{ user: User | null; session: Session | null }> {
  if (!sessionId) {
    return { user: null, session: null };
  }

  const key = `${SESSION_PREFIX}${sessionId}`;
  const data = await kv.get(key);

  if (!data) {
    return { user: null, session: null };
  }

  try {
    const { session, user } = JSON.parse(data) as {
      session: Session;
      user: User;
    };

    // Check if session is expired
    if (session.expires_at < Math.floor(Date.now() / 1000)) {
      await kv.delete(key);
      return { user: null, session: null };
    }

    return { user, session };
  } catch {
    return { user: null, session: null };
  }
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(
  kv: KVNamespace,
  sessionId: string,
): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`;
  await kv.delete(key);
}

/**
 * Create session cookie options
 */
export function getSessionCookieOptions(isProduction: boolean = true) {
  return {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    maxAge: SESSION_TTL,
  };
}
```

### 2.3 Email Integration (Resend)

**package/src/lib/server/email/resend.ts:**

```typescript
/**
 * Email sending via Resend API
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface ResendResponse {
  id: string;
}

export interface ResendError {
  statusCode: number;
  message: string;
  name: string;
}

/**
 * Send an email via Resend
 */
export async function sendEmail(
  apiKey: string,
  options: SendEmailOptions,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const {
    to,
    subject,
    html,
    text,
    from = "Grove <noreply@grove.place>",
  } = options;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text: text || stripHtml(html),
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as ResendError;
      return { success: false, error: error.message };
    }

    const data = (await response.json()) as ResendResponse;
    return { success: true, id: data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send magic code email
 */
export async function sendMagicCodeEmail(
  apiKey: string,
  email: string,
  code: string,
  siteName: string = "Grove",
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1f2937; margin-bottom: 24px;">Your login code</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
          Enter this code to sign in to ${siteName}:
        </p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">
            ${code}
          </span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          This code expires in 10 minutes. If you didn't request this code, you can safely ignore this email.
        </p>
      </body>
    </html>
  `;

  return sendEmail(apiKey, {
    to: email,
    subject: `Your ${siteName} login code: ${code}`,
    html,
  });
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
```

### 2.4 Auth Index Export

**package/src/lib/server/auth/index.ts:**

```typescript
// Magic code authentication
export {
  generateMagicCode,
  hashCode,
  storeMagicCode,
  verifyMagicCode,
  deleteMagicCode,
} from "./magic-code";

// Session management
export {
  generateSessionId,
  createSession,
  validateSession,
  deleteSession,
  getSessionCookieOptions,
} from "./session";
```

### 2.5 Email Index Export

**package/src/lib/server/email/index.ts:**

```typescript
export {
  sendEmail,
  sendMagicCodeEmail,
  type SendEmailOptions,
  type ResendResponse,
  type ResendError,
} from "./resend";
```

---

## PHASE 3: DATABASE UTILITIES

### 3.1 User Queries

**package/src/lib/server/db/users.ts:**

```typescript
import type { User } from "../../types";

/**
 * Generate a unique user ID
 */
export function generateUserId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Get user by email
 */
export async function getUserByEmail(
  db: D1Database,
  email: string,
): Promise<User | null> {
  const result = await db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<User>();

  return result || null;
}

/**
 * Get user by ID
 */
export async function getUserById(
  db: D1Database,
  id: string,
): Promise<User | null> {
  const result = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first<User>();

  return result || null;
}

/**
 * Create a new user
 */
export async function createUser(
  db: D1Database,
  data: { email: string; name?: string; role?: "admin" | "editor" | "user" },
): Promise<User> {
  const id = generateUserId();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `
      INSERT INTO users (id, email, name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    )
    .bind(
      id,
      data.email.toLowerCase(),
      data.name || null,
      data.role || "user",
      now,
      now,
    )
    .run();

  return {
    id,
    email: data.email.toLowerCase(),
    name: data.name,
    role: data.role || "user",
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update user
 */
export async function updateUser(
  db: D1Database,
  id: string,
  data: Partial<Pick<User, "name" | "role" | "avatar_url">>,
): Promise<void> {
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    values.push(data.name);
  }
  if (data.role !== undefined) {
    updates.push("role = ?");
    values.push(data.role);
  }
  if (data.avatar_url !== undefined) {
    updates.push("avatar_url = ?");
    values.push(data.avatar_url);
  }

  if (updates.length === 0) return;

  updates.push("updated_at = ?");
  values.push(Math.floor(Date.now() / 1000));
  values.push(id);

  await db
    .prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

/**
 * Get or create user by email
 * Used during login flow
 */
export async function getOrCreateUser(
  db: D1Database,
  email: string,
): Promise<User> {
  const existing = await getUserByEmail(db, email);
  if (existing) {
    return existing;
  }

  return createUser(db, { email });
}
```

### 3.2 Post Queries

**package/src/lib/server/db/posts.ts:**

```typescript
import type { Post, PostListItem } from "../../types";
import { parseMarkdownContent } from "../../utils/markdown";

/**
 * Generate a unique post ID
 */
export function generatePostId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Calculate reading time (words per minute)
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Count words in content
 */
export function countWords(content: string): number {
  return content.trim().split(/\s+/).length;
}

export interface GetPostsOptions {
  status?: "draft" | "published" | "archived";
  userId?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

/**
 * Get posts with pagination
 */
export async function getPosts(
  db: D1Database,
  options: GetPostsOptions = {},
): Promise<{ posts: PostListItem[]; total: number }> {
  const { status, userId, tag, page = 1, limit = 10 } = options;
  const offset = (page - 1) * limit;

  let whereClause = "1=1";
  const params: (string | number)[] = [];

  if (status) {
    whereClause += " AND p.status = ?";
    params.push(status);
  }

  if (userId) {
    whereClause += " AND p.user_id = ?";
    params.push(userId);
  }

  // Get total count
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM posts p WHERE ${whereClause}`)
    .bind(...params)
    .first<{ count: number }>();

  const total = countResult?.count || 0;

  // Get posts
  const posts = await db
    .prepare(
      `
      SELECT
        p.id, p.title, p.slug, p.excerpt, p.featured_image,
        p.reading_time, p.published_at
      FROM posts p
      WHERE ${whereClause}
      ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC
      LIMIT ? OFFSET ?
    `,
    )
    .bind(...params, limit, offset)
    .all<PostListItem>();

  return {
    posts: posts.results || [],
    total,
  };
}

/**
 * Get single post by slug
 */
export async function getPostBySlug(
  db: D1Database,
  slug: string,
): Promise<Post | null> {
  const post = await db
    .prepare("SELECT * FROM posts WHERE slug = ?")
    .bind(slug)
    .first<Post>();

  return post || null;
}

/**
 * Get single post by ID
 */
export async function getPostById(
  db: D1Database,
  id: string,
): Promise<Post | null> {
  const post = await db
    .prepare("SELECT * FROM posts WHERE id = ?")
    .bind(id)
    .first<Post>();

  return post || null;
}

export interface CreatePostData {
  user_id: string;
  title: string;
  content: string;
  excerpt?: string;
  status?: "draft" | "published";
  featured_image?: string;
}

/**
 * Create a new post
 */
export async function createPost(
  db: D1Database,
  data: CreatePostData,
): Promise<Post> {
  const id = generatePostId();
  const slug = generateSlug(data.title);
  const html = parseMarkdownContent(data.content);
  const wordCount = countWords(data.content);
  const readingTime = calculateReadingTime(data.content);
  const now = Math.floor(Date.now() / 1000);
  const publishedAt = data.status === "published" ? now : null;

  await db
    .prepare(
      `
      INSERT INTO posts (
        id, user_id, title, slug, content, excerpt, html,
        status, featured_image, word_count, reading_time,
        published_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .bind(
      id,
      data.user_id,
      data.title,
      slug,
      data.content,
      data.excerpt || null,
      html,
      data.status || "draft",
      data.featured_image || null,
      wordCount,
      readingTime,
      publishedAt,
      now,
      now,
    )
    .run();

  return {
    id,
    user_id: data.user_id,
    title: data.title,
    slug,
    content: data.content,
    excerpt: data.excerpt,
    html,
    status: data.status || "draft",
    featured_image: data.featured_image,
    word_count: wordCount,
    reading_time: readingTime,
    published_at: publishedAt ?? undefined,
    created_at: now,
    updated_at: now,
  };
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  excerpt?: string;
  status?: "draft" | "published" | "archived";
  featured_image?: string;
}

/**
 * Update a post
 */
export async function updatePost(
  db: D1Database,
  id: string,
  data: UpdatePostData,
): Promise<void> {
  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  const now = Math.floor(Date.now() / 1000);

  if (data.title !== undefined) {
    updates.push("title = ?", "slug = ?");
    values.push(data.title, generateSlug(data.title));
  }

  if (data.content !== undefined) {
    const html = parseMarkdownContent(data.content);
    const wordCount = countWords(data.content);
    const readingTime = calculateReadingTime(data.content);

    updates.push(
      "content = ?",
      "html = ?",
      "word_count = ?",
      "reading_time = ?",
    );
    values.push(data.content, html, wordCount, readingTime);
  }

  if (data.excerpt !== undefined) {
    updates.push("excerpt = ?");
    values.push(data.excerpt);
  }

  if (data.status !== undefined) {
    updates.push("status = ?");
    values.push(data.status);

    // Set published_at when publishing
    if (data.status === "published") {
      updates.push("published_at = COALESCE(published_at, ?)");
      values.push(now);
    }
  }

  if (data.featured_image !== undefined) {
    updates.push("featured_image = ?");
    values.push(data.featured_image);
  }

  if (updates.length === 0) return;

  updates.push("updated_at = ?");
  values.push(now);
  values.push(id);

  await db
    .prepare(`UPDATE posts SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

/**
 * Delete a post
 */
export async function deletePost(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
}
```

### 3.3 Site Config Queries

**package/src/lib/server/db/config.ts:**

```typescript
import type { SiteConfig } from "../../types";

/**
 * Get site configuration from database
 */
export async function getSiteConfig(
  db: D1Database,
): Promise<Partial<SiteConfig>> {
  const results = await db
    .prepare("SELECT key, value FROM site_config")
    .all<{ key: string; value: string }>();

  const config: Record<string, unknown> = {};

  for (const row of results.results || []) {
    try {
      config[row.key] = JSON.parse(row.value);
    } catch {
      config[row.key] = row.value;
    }
  }

  return config as Partial<SiteConfig>;
}

/**
 * Set a site configuration value
 */
export async function setSiteConfigValue(
  db: D1Database,
  key: string,
  value: unknown,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const jsonValue = JSON.stringify(value);

  await db
    .prepare(
      `
      INSERT INTO site_config (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    )
    .bind(key, jsonValue, now)
    .run();
}
```

### 3.4 Database Index Export

**package/src/lib/server/db/index.ts:**

```typescript
// User queries
export {
  generateUserId,
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  getOrCreateUser,
} from "./users";

// Post queries
export {
  generatePostId,
  generateSlug,
  calculateReadingTime,
  countWords,
  getPosts,
  getPostBySlug,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  type GetPostsOptions,
  type CreatePostData,
  type UpdatePostData,
} from "./posts";

// Config queries
export { getSiteConfig, setSiteConfigValue } from "./config";
```

---

## PHASE 4: R2 STORAGE UTILITIES

**package/src/lib/server/storage/r2.ts:**

```typescript
/**
 * R2 storage utilities for media files
 */

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export interface MediaMetadata {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
}

/**
 * Generate a unique key for R2 storage
 */
export function generateR2Key(filename: string): string {
  const timestamp = Date.now();
  const random = crypto.getRandomValues(new Uint8Array(8));
  const randomStr = Array.from(random)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const ext = filename.split(".").pop() || "";
  return `media/${timestamp}-${randomStr}.${ext}`;
}

/**
 * Upload a file to R2
 */
export async function uploadToR2(
  bucket: R2Bucket,
  file: File | ArrayBuffer,
  filename: string,
  mimeType: string,
): Promise<UploadResult> {
  try {
    const key = generateR2Key(filename);
    const body = file instanceof File ? await file.arrayBuffer() : file;

    await bucket.put(key, body, {
      httpMetadata: {
        contentType: mimeType,
      },
    });

    return {
      success: true,
      key,
      url: `/media/${key}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(
  bucket: R2Bucket,
  key: string,
): Promise<boolean> {
  try {
    await bucket.delete(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a file from R2
 */
export async function getFromR2(
  bucket: R2Bucket,
  key: string,
): Promise<R2ObjectBody | null> {
  return bucket.get(key);
}

/**
 * List files in R2 with pagination
 */
export async function listR2Files(
  bucket: R2Bucket,
  options: { prefix?: string; limit?: number; cursor?: string } = {},
): Promise<{ objects: R2Object[]; cursor?: string }> {
  const { prefix = "media/", limit = 100, cursor } = options;

  const list = await bucket.list({
    prefix,
    limit,
    cursor,
  });

  return {
    objects: list.objects,
    cursor: list.truncated ? list.cursor : undefined,
  };
}
```

**package/src/lib/server/storage/index.ts:**

```typescript
export {
  generateR2Key,
  uploadToR2,
  deleteFromR2,
  getFromR2,
  listR2Files,
  type UploadResult,
  type MediaMetadata,
} from "./r2";
```

---

## PHASE 5: SERVER INDEX EXPORT

**package/src/lib/server/index.ts:**

```typescript
// Authentication
export * from "./auth";

// Database
export * from "./db";

// Storage
export * from "./storage";

// Email
export * from "./email";
```

---

## PHASE 6: AUTH COMPONENTS

### 6.1 Login Form

**package/src/lib/components/auth/LoginForm.svelte:**

```svelte
<script lang="ts">
  interface Props {
    /** Called when magic code is requested */
    onRequestCode?: (email: string) => Promise<boolean>;
    /** Called when code is verified */
    onVerifyCode?: (email: string, code: string) => Promise<boolean>;
    /** Site name for branding */
    siteName?: string;
    /** Custom class for the form */
    class?: string;
  }

  let {
    onRequestCode,
    onVerifyCode,
    siteName = 'Grove',
    class: className = ''
  }: Props = $props();

  let step: 'email' | 'code' = $state('email');
  let email = $state('');
  let code = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleRequestCode(e: SubmitEvent) {
    e.preventDefault();
    if (!email || loading) return;

    loading = true;
    error = '';

    try {
      const success = onRequestCode ? await onRequestCode(email) : true;
      if (success) {
        step = 'code';
      } else {
        error = 'Failed to send code. Please try again.';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading = false;
    }
  }

  async function handleVerifyCode(e: SubmitEvent) {
    e.preventDefault();
    if (!code || code.length !== 6 || loading) return;

    loading = true;
    error = '';

    try {
      const success = onVerifyCode ? await onVerifyCode(email, code) : true;
      if (!success) {
        error = 'Invalid or expired code. Please try again.';
        code = '';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading = false;
    }
  }

  function handleBack() {
    step = 'email';
    code = '';
    error = '';
  }
</script>

<div class="login-form {className}">
  <h1 class="login-title">Sign in to {siteName}</h1>

  {#if step === 'email'}
    <form onsubmit={handleRequestCode}>
      <label for="email" class="login-label">Email address</label>
      <input
        id="email"
        type="email"
        bind:value={email}
        placeholder="you@example.com"
        required
        disabled={loading}
        class="login-input"
      />

      {#if error}
        <p class="login-error">{error}</p>
      {/if}

      <button type="submit" disabled={loading || !email} class="login-button">
        {loading ? 'Sending...' : 'Send login code'}
      </button>
    </form>
  {:else}
    <form onsubmit={handleVerifyCode}>
      <p class="login-info">
        We sent a 6-digit code to <strong>{email}</strong>
      </p>

      <label for="code" class="login-label">Enter code</label>
      <input
        id="code"
        type="text"
        bind:value={code}
        placeholder="000000"
        maxlength={6}
        pattern="[0-9]{6}"
        required
        disabled={loading}
        class="login-input login-input-code"
      />

      {#if error}
        <p class="login-error">{error}</p>
      {/if}

      <button
        type="submit"
        disabled={loading || code.length !== 6}
        class="login-button"
      >
        {loading ? 'Verifying...' : 'Verify code'}
      </button>

      <button type="button" onclick={handleBack} class="login-back">
        Use a different email
      </button>
    </form>
  {/if}
</div>

<style>
  .login-form {
    max-width: 400px;
    margin: 0 auto;
    padding: 2rem;
  }

  .login-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .login-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .login-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .login-input:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  .login-input-code {
    text-align: center;
    font-size: 1.5rem;
    letter-spacing: 0.5rem;
    font-family: monospace;
  }

  .login-button {
    width: 100%;
    padding: 0.75rem;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .login-button:hover:not(:disabled) {
    background: #4338ca;
  }

  .login-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .login-back {
    width: 100%;
    padding: 0.75rem;
    background: transparent;
    color: #6b7280;
    border: none;
    font-size: 0.875rem;
    cursor: pointer;
    margin-top: 0.5rem;
  }

  .login-back:hover {
    color: #374151;
  }

  .login-error {
    color: #dc2626;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .login-info {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }
</style>
```

### 6.2 Auth Components Index

**package/src/lib/components/auth/index.ts:**

```typescript
export { default as LoginForm } from "./LoginForm.svelte";
```

---

## PHASE 7: BLOG COMPONENTS

### 7.1 PostCard Component

**package/src/lib/components/blog/PostCard.svelte:**

```svelte
<script lang="ts">
  import type { PostListItem } from '../../types';

  interface Props {
    post: PostListItem;
    /** Show reading time */
    showReadingTime?: boolean;
    /** Show excerpt */
    showExcerpt?: boolean;
    /** Custom class */
    class?: string;
  }

  let {
    post,
    showReadingTime = true,
    showExcerpt = true,
    class: className = ''
  }: Props = $props();

  function formatDate(timestamp?: number): string {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
</script>

<article class="post-card {className}">
  {#if post.featured_image}
    <a href="/blog/{post.slug}" class="post-card-image">
      <img src={post.featured_image} alt={post.title} loading="lazy" />
    </a>
  {/if}

  <div class="post-card-content">
    <h2 class="post-card-title">
      <a href="/blog/{post.slug}">{post.title}</a>
    </h2>

    <div class="post-card-meta">
      {#if post.published_at}
        <time datetime={new Date(post.published_at * 1000).toISOString()}>
          {formatDate(post.published_at)}
        </time>
      {/if}

      {#if showReadingTime && post.reading_time}
        <span class="post-card-reading-time">
          {post.reading_time} min read
        </span>
      {/if}
    </div>

    {#if showExcerpt && post.excerpt}
      <p class="post-card-excerpt">{post.excerpt}</p>
    {/if}

    {#if post.tags && post.tags.length > 0}
      <div class="post-card-tags">
        {#each post.tags as tag}
          <a href="/blog?tag={tag}" class="post-card-tag">{tag}</a>
        {/each}
      </div>
    {/if}
  </div>
</article>

<style>
  .post-card {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
    transition: box-shadow 0.2s;
  }

  .post-card:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .post-card-image {
    display: block;
    aspect-ratio: 16 / 9;
    overflow: hidden;
  }

  .post-card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s;
  }

  .post-card:hover .post-card-image img {
    transform: scale(1.05);
  }

  .post-card-content {
    padding: 1.5rem;
  }

  .post-card-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    line-height: 1.3;
  }

  .post-card-title a {
    color: inherit;
    text-decoration: none;
  }

  .post-card-title a:hover {
    color: #4f46e5;
  }

  .post-card-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.75rem;
  }

  .post-card-excerpt {
    color: #4b5563;
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  .post-card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .post-card-tag {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: #f3f4f6;
    border-radius: 0.25rem;
    color: #4b5563;
    text-decoration: none;
  }

  .post-card-tag:hover {
    background: #e5e7eb;
  }
</style>
```

### 7.2 PostList Component

**package/src/lib/components/blog/PostList.svelte:**

```svelte
<script lang="ts">
  import type { PostListItem } from '../../types';
  import PostCard from './PostCard.svelte';

  interface Props {
    posts: PostListItem[];
    /** Show reading time on cards */
    showReadingTime?: boolean;
    /** Show excerpts on cards */
    showExcerpts?: boolean;
    /** Grid columns (1, 2, or 3) */
    columns?: 1 | 2 | 3;
    /** Custom class */
    class?: string;
  }

  let {
    posts,
    showReadingTime = true,
    showExcerpts = true,
    columns = 2,
    class: className = ''
  }: Props = $props();
</script>

{#if posts.length === 0}
  <div class="post-list-empty">
    <p>No posts found.</p>
  </div>
{:else}
  <div class="post-list post-list-cols-{columns} {className}">
    {#each posts as post (post.id)}
      <PostCard {post} {showReadingTime} showExcerpt={showExcerpts} />
    {/each}
  </div>
{/if}

<style>
  .post-list {
    display: grid;
    gap: 2rem;
  }

  .post-list-cols-1 {
    grid-template-columns: 1fr;
  }

  .post-list-cols-2 {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  .post-list-cols-3 {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  .post-list-empty {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }
</style>
```

### 7.3 PostView Component

**package/src/lib/components/blog/PostView.svelte:**

```svelte
<script lang="ts">
  import type { Post } from '../../types';

  interface Props {
    post: Post;
    /** Show author info */
    showAuthor?: boolean;
    /** Custom class */
    class?: string;
  }

  let {
    post,
    showAuthor = false,
    class: className = ''
  }: Props = $props();

  function formatDate(timestamp?: number): string {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
</script>

<article class="post-view {className}">
  <header class="post-view-header">
    <h1 class="post-view-title">{post.title}</h1>

    <div class="post-view-meta">
      {#if post.published_at}
        <time datetime={new Date(post.published_at * 1000).toISOString()}>
          {formatDate(post.published_at)}
        </time>
      {/if}

      {#if post.reading_time}
        <span>{post.reading_time} min read</span>
      {/if}

      {#if post.word_count}
        <span>{post.word_count.toLocaleString()} words</span>
      {/if}
    </div>

    {#if post.tags && post.tags.length > 0}
      <div class="post-view-tags">
        {#each post.tags as tag}
          <a href="/blog?tag={tag}" class="post-view-tag">{tag}</a>
        {/each}
      </div>
    {/if}
  </header>

  {#if post.featured_image}
    <figure class="post-view-featured">
      <img src={post.featured_image} alt={post.title} />
    </figure>
  {/if}

  <div class="post-view-content prose">
    {@html post.html || ''}
  </div>
</article>

<style>
  .post-view {
    max-width: 65ch;
    margin: 0 auto;
  }

  .post-view-header {
    margin-bottom: 2rem;
  }

  .post-view-title {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 1rem;
  }

  .post-view-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .post-view-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .post-view-tag {
    font-size: 0.875rem;
    padding: 0.25rem 0.75rem;
    background: #f3f4f6;
    border-radius: 9999px;
    color: #4b5563;
    text-decoration: none;
  }

  .post-view-tag:hover {
    background: #e5e7eb;
  }

  .post-view-featured {
    margin: 0 0 2rem;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .post-view-featured img {
    width: 100%;
    height: auto;
  }

  .post-view-content {
    line-height: 1.75;
  }

  /* Prose styles would typically come from Tailwind Typography or similar */
  .post-view-content :global(h2) {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 2rem;
    margin-bottom: 1rem;
  }

  .post-view-content :global(h3) {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }

  .post-view-content :global(p) {
    margin-bottom: 1.25rem;
  }

  .post-view-content :global(a) {
    color: #4f46e5;
    text-decoration: underline;
  }

  .post-view-content :global(pre) {
    background: #1f2937;
    color: #f9fafb;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin-bottom: 1.25rem;
  }

  .post-view-content :global(code) {
    font-family: ui-monospace, monospace;
    font-size: 0.875em;
  }

  .post-view-content :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
  }
</style>
```

### 7.4 Blog Components Index

**package/src/lib/components/blog/index.ts:**

```typescript
export { default as PostCard } from "./PostCard.svelte";
export { default as PostList } from "./PostList.svelte";
export { default as PostView } from "./PostView.svelte";
```

---

## PHASE 8: UPDATE COMPONENT EXPORTS

Update the main components index to include new components:

**package/src/lib/components/index.ts:**

```typescript
// UI Components
export * from "./ui";

// Layout Components
export * from "./layout";

// Blog Components
export * from "./blog";

// Auth Components
export * from "./auth";

// Admin Components (to be added as needed)
// export * from './admin';
```

---

## PHASE 9: VERIFICATION

### 9.1 Type Check

```bash
cd /home/user/Lattice/package
pnpm run check
```

### 9.2 Build Package

```bash
pnpm run package
```

### 9.3 Verify Exports

```bash
ls -la dist/
ls -la dist/server/
ls -la dist/components/blog/
ls -la dist/components/auth/
```

---

## PHASE 10: COMMIT

```bash
cd /home/user/Lattice
git add package/
git commit -m "feat: implement auth, database, and blog components

Phase 2 of Lattice implementation:
- Add magic code authentication (Resend integration)
- Add D1 database schema and migrations
- Add KV session management utilities
- Add R2 storage utilities for media
- Add user and post database queries
- Add blog components (PostCard, PostList, PostView)
- Add auth components (LoginForm)
- Update package exports

Ready for customer repository integration"
```

---

## SUCCESS CRITERIA

Phase 2 is complete when:

- [ ] D1 migrations created for all tables
- [ ] Magic code authentication implemented
- [ ] Session management with KV working
- [ ] R2 storage utilities implemented
- [ ] User queries implemented (get, create, update)
- [ ] Post queries implemented (CRUD, list, search)
- [ ] LoginForm component working
- [ ] PostCard, PostList, PostView components working
- [ ] Package builds without TypeScript errors
- [ ] All exports properly configured
- [ ] Changes committed to repository

---

## NEXT STEPS

After completing both phases:

1. **Create Customer Repository Template**
   - Use `docs/specs/customer-repo-spec.md` as reference
   - Create a template repository demonstrating engine usage

2. **Testing**
   - Create unit tests for server utilities
   - Create component tests for Svelte components

3. **Documentation**
   - Update README with usage examples
   - Add API documentation for server utilities

---

_Last Updated: November 2025_
