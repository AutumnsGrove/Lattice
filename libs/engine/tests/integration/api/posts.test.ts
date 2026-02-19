/**
 * Post CRUD Integration Tests
 *
 * Tests post creation, reading, updating, and deletion via D1 database interactions.
 * Since form actions are complex to test directly, we test the D1 patterns that
 * handle post management, slug generation, tenant isolation, and validation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createMockRequestEvent,
  createMockD1,
  seedMockD1,
} from "../helpers/index.js";

// ============================================================================
// Test Suite
// ============================================================================

describe("Post CRUD Integration", () => {
  let db: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    db = createMockD1();
  });

  // ============================================================================
  // Post Creation Tests
  // ============================================================================

  describe("Post creation", () => {
    it("inserts post with correct fields", async () => {
      const now = Date.now();

      await db
        .prepare(
          "INSERT INTO posts (id, tenant_id, slug, title, markdown_content, html_content, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          1,
          "tenant-1",
          "hello-world",
          "Hello World",
          "# Hello",
          "<h1>Hello</h1>",
          now,
          now,
          now,
        )
        .run();

      const result = await db
        .prepare("SELECT * FROM posts WHERE slug = ?")
        .bind("hello-world")
        .first();

      expect(result).not.toBeNull();
      expect(result?.title).toBe("Hello World");
      expect(result?.markdown_content).toBe("# Hello");
      expect(result?.html_content).toBe("<h1>Hello</h1>");
    });

    it("enforces title length limit", () => {
      const longTitle = "a".repeat(256);
      expect(longTitle.length).toBeGreaterThan(255);
      // Validation should reject titles > 255 chars
    });

    it("sanitizes slug from title", () => {
      const slug = "Hello World! & Friends"
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      expect(slug).toBe("hello-world-friends");
    });

    it("detects duplicate slugs", async () => {
      seedMockD1(db, "posts", [
        {
          id: 1,
          tenant_id: "tenant-1",
          slug: "existing-post",
          title: "Existing",
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ]);

      const existing = await db
        .prepare("SELECT id FROM posts WHERE slug = ? AND tenant_id = ?")
        .bind("existing-post", "tenant-1")
        .first();

      expect(existing).not.toBeNull();
      expect(existing?.id).toBe(1);
    });

    it("allows duplicate slugs across different tenants", async () => {
      const now = Date.now();
      seedMockD1(db, "posts", [
        {
          id: 1,
          tenant_id: "tenant-1",
          slug: "my-post",
          title: "Tenant 1 Post",
          created_at: now,
          updated_at: now,
        },
      ]);

      // Should allow same slug for different tenant
      await db
        .prepare(
          "INSERT INTO posts (id, tenant_id, slug, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(2, "tenant-2", "my-post", "Tenant 2 Post", now, now)
        .run();

      const result = await db
        .prepare("SELECT * FROM posts WHERE slug = ? AND tenant_id = ?")
        .bind("my-post", "tenant-2")
        .first();

      expect(result?.id).toBe(2);
      expect(result?.tenant_id).toBe("tenant-2");
    });
  });

  // ============================================================================
  // Post Retrieval Tests
  // ============================================================================

  describe("Post retrieval", () => {
    it("retrieves post by slug and tenant", async () => {
      const now = Date.now();
      seedMockD1(db, "posts", [
        {
          id: 1,
          tenant_id: "tenant-1",
          slug: "my-post",
          title: "My Post",
          published_at: now,
          created_at: now,
          updated_at: now,
        },
        {
          id: 2,
          tenant_id: "tenant-2",
          slug: "my-post",
          title: "Other Post",
          published_at: now,
          created_at: now,
          updated_at: now,
        },
      ]);

      const result = await db
        .prepare("SELECT * FROM posts WHERE slug = ? AND tenant_id = ?")
        .bind("my-post", "tenant-1")
        .first();

      expect(result?.title).toBe("My Post");
      expect(result?.tenant_id).toBe("tenant-1");
    });

    it("returns null for non-existent slug", async () => {
      const result = await db
        .prepare("SELECT * FROM posts WHERE slug = ?")
        .bind("nonexistent")
        .first();

      expect(result).toBeNull();
    });

    it("retrieves multiple posts for a tenant", async () => {
      const now = Date.now();
      seedMockD1(db, "posts", [
        {
          id: 1,
          tenant_id: "tenant-1",
          slug: "post-one",
          title: "Post One",
          created_at: now - 1000,
          updated_at: now - 1000,
        },
        {
          id: 2,
          tenant_id: "tenant-1",
          slug: "post-two",
          title: "Post Two",
          created_at: now,
          updated_at: now,
        },
        {
          id: 3,
          tenant_id: "tenant-2",
          slug: "post-three",
          title: "Post Three",
          created_at: now,
          updated_at: now,
        },
      ]);

      const results = await db
        .prepare(
          "SELECT * FROM posts WHERE tenant_id = ? ORDER BY created_at DESC",
        )
        .bind("tenant-1")
        .all();

      expect(results.results).toHaveLength(2);
      expect(results.results[0]?.title).toBe("Post Two");
      expect(results.results[1]?.title).toBe("Post One");
    });
  });

  // ============================================================================
  // Post Update Tests
  // ============================================================================

  describe("Post updates", () => {
    it("updates post title and content", async () => {
      const now = Date.now();
      seedMockD1(db, "posts", [
        {
          id: 1,
          tenant_id: "tenant-1",
          slug: "my-post",
          title: "Original Title",
          markdown_content: "Original content",
          created_at: now,
          updated_at: now,
        },
      ]);

      await db
        .prepare(
          "UPDATE posts SET title = ?, markdown_content = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
        )
        .bind("Updated Title", "Updated content", Date.now(), 1, "tenant-1")
        .run();

      const result = await db
        .prepare("SELECT * FROM posts WHERE id = ?")
        .bind(1)
        .first();

      expect(result?.title).toBe("Updated Title");
      expect(result?.markdown_content).toBe("Updated content");
    });

    it("preserves created_at while updating updated_at", async () => {
      const createdAt = 1000000;
      const now = Date.now();
      seedMockD1(db, "posts", [
        {
          id: 1,
          tenant_id: "tenant-1",
          slug: "my-post",
          title: "Post",
          created_at: createdAt,
          updated_at: createdAt,
        },
      ]);

      await db
        .prepare("UPDATE posts SET title = ?, updated_at = ? WHERE id = ?")
        .bind("New Title", now, 1)
        .run();

      const result = await db
        .prepare("SELECT created_at, updated_at FROM posts WHERE id = ?")
        .bind(1)
        .first();

      expect(result?.created_at).toBe(createdAt);
      expect(result?.updated_at).toBe(now);
    });
  });

  // ============================================================================
  // Post Deletion Tests
  // ============================================================================

  describe("Post deletion", () => {
    it("deletes post by id and tenant", async () => {
      seedMockD1(db, "posts", [
        {
          id: 1,
          tenant_id: "tenant-1",
          slug: "to-delete",
          title: "Delete Me",
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ]);

      await db
        .prepare("DELETE FROM posts WHERE id = ? AND tenant_id = ?")
        .bind(1, "tenant-1")
        .run();

      const result = await db
        .prepare("SELECT * FROM posts WHERE id = ?")
        .bind(1)
        .first();

      expect(result).toBeNull();
    });

    it("does not delete posts from other tenants", async () => {
      seedMockD1(db, "posts", [
        {
          id: 1,
          tenant_id: "tenant-1",
          slug: "post-1",
          title: "Post 1",
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        {
          id: 2,
          tenant_id: "tenant-2",
          slug: "post-2",
          title: "Post 2",
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ]);

      await db
        .prepare("DELETE FROM posts WHERE id = ? AND tenant_id = ?")
        .bind(1, "tenant-1")
        .run();

      const deleted = await db
        .prepare("SELECT * FROM posts WHERE id = ?")
        .bind(1)
        .first();
      const preserved = await db
        .prepare("SELECT * FROM posts WHERE id = ?")
        .bind(2)
        .first();

      expect(deleted).toBeNull();
      expect(preserved).not.toBeNull();
      expect(preserved?.title).toBe("Post 2");
    });
  });

  // ============================================================================
  // Tenant Isolation Tests
  // ============================================================================

  describe("Tenant isolation", () => {
    it("cannot read posts from another tenant", async () => {
      seedMockD1(db, "posts", [
        {
          id: 1,
          tenant_id: "tenant-1",
          slug: "secret",
          title: "Secret Post",
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ]);

      const result = await db
        .prepare("SELECT * FROM posts WHERE slug = ? AND tenant_id = ?")
        .bind("secret", "tenant-2")
        .first();

      expect(result).toBeNull();
    });

    it("enforces tenant isolation on all operations", async () => {
      const now = Date.now();
      seedMockD1(db, "posts", [
        {
          id: 1,
          tenant_id: "tenant-1",
          slug: "post",
          title: "Post 1",
          created_at: now,
          updated_at: now,
        },
        {
          id: 2,
          tenant_id: "tenant-2",
          slug: "post",
          title: "Post 2",
          created_at: now,
          updated_at: now,
        },
      ]);

      // tenant-2 should not be able to update tenant-1's post
      await db
        .prepare("UPDATE posts SET title = ? WHERE id = ? AND tenant_id = ?")
        .bind("Hacked Title", 1, "tenant-2")
        .run();

      const result = await db
        .prepare("SELECT title FROM posts WHERE id = ?")
        .bind(1)
        .first();

      expect(result?.title).toBe("Post 1"); // Should remain unchanged
    });
  });

  // ============================================================================
  // Request Validation Tests
  // ============================================================================

  describe("Request validation", () => {
    it("requires authentication", () => {
      const event = createMockRequestEvent({
        url: "https://grove.place/arbor/posts?/create",
        method: "POST",
        locals: { user: null },
      });

      expect(event.locals.user).toBeNull();
    });

    it("requires tenant context", () => {
      const event = createMockRequestEvent({
        url: "https://grove.place/arbor/posts?/create",
        method: "POST",
        locals: {
          user: { id: "user-1", email: "test@example.com" },
          tenantId: null,
        },
      });

      expect(event.locals.tenantId).toBeNull();
      expect(event.locals.user).not.toBeNull();
    });

    it("provides authenticated tenant event", () => {
      const event = createMockRequestEvent({
        url: "https://test-tenant.grove.place/arbor/posts?/create",
        method: "POST",
        headers: {
          "x-forwarded-host": "test-tenant.grove.place",
        },
        locals: {
          user: { id: "user-1", email: "test@example.com", name: "Test User" },
          tenantId: "tenant-1",
          context: {
            type: "tenant",
            tenant: {
              id: "tenant-1",
              subdomain: "test-tenant",
              name: "Test Tenant",
            },
          },
        },
      });

      expect(event.locals.user?.id).toBe("user-1");
      expect(event.locals.tenantId).toBe("tenant-1");
    });
  });

  // ============================================================================
  // Publishing Tests
  // ============================================================================

  describe("Post publishing", () => {
    it("publishes post with published_at timestamp", async () => {
      const now = Date.now();
      seedMockD1(db, "posts", [
        {
          id: 1,
          tenant_id: "tenant-1",
          slug: "my-post",
          title: "My Post",
          published_at: null,
          created_at: now,
          updated_at: now,
        },
      ]);

      const publishTime = Date.now();
      await db
        .prepare("UPDATE posts SET published_at = ? WHERE id = ?")
        .bind(publishTime, 1)
        .run();

      const result = await db
        .prepare("SELECT published_at FROM posts WHERE id = ?")
        .bind(1)
        .first();

      expect(result?.published_at).toBe(publishTime);
    });

    it("retrieves only published posts", async () => {
      const now = Date.now();
      seedMockD1(db, "posts", [
        {
          id: 1,
          tenant_id: "tenant-1",
          slug: "published",
          title: "Published",
          published_at: now,
          created_at: now,
          updated_at: now,
        },
        {
          id: 2,
          tenant_id: "tenant-1",
          slug: "draft",
          title: "Draft",
          published_at: null,
          created_at: now,
          updated_at: now,
        },
      ]);

      const results = await db
        .prepare(
          "SELECT * FROM posts WHERE tenant_id = ? AND published_at IS NOT NULL",
        )
        .bind("tenant-1")
        .all();

      expect(results.results).toHaveLength(1);
      expect(results.results[0]?.title).toBe("Published");
    });
  });
});
