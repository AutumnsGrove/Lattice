/// <reference types="@cloudflare/workers-types" />

/**
 * PostContentDO - Per-Post Durable Object for Content Caching
 *
 * Handles static content that rarely changes:
 * - Cached rendered HTML
 * - Markdown source
 * - Post metadata (title, description, tags)
 *
 * This DO hibernates quickly since content doesn't change often.
 * Separated from PostMetaDO for cost efficiency.
 *
 * ID Pattern: content:{tenantId}:{slug}
 *
 * Part of the Loom pattern - Grove's coordination layer.
 */

// ============================================================================
// Types
// ============================================================================

export interface PostContent {
  tenantId: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  markdownContent: string;
  htmlContent: string;
  gutterContent: string;
  font: string;
  publishedAt: number | null;
  updatedAt: number;
  storageLocation: "hot" | "warm" | "cold";
  r2Key?: string;
}

export interface ContentUpdate {
  title?: string;
  description?: string;
  tags?: string[];
  markdownContent?: string;
  htmlContent?: string;
  gutterContent?: string;
  font?: string;
}

// ============================================================================
// PostContentDO Class
// ============================================================================

export class PostContentDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  private content: PostContent | null = null;
  private initialized: boolean = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    this.state.blockConcurrencyWhile(async () => {
      await this.initializeStorage();
    });
  }

  private async initializeStorage(): Promise<void> {
    if (this.initialized) return;

    await this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS content (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    const stored = this.state.storage.sql
      .exec("SELECT value FROM content WHERE key = 'post_content'")
      .one();

    if (stored?.value) {
      this.content = JSON.parse(stored.value as string);
    }

    this.initialized = true;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/content" && request.method === "GET") {
        return this.handleGetContent();
      }

      if (path === "/content" && request.method === "PUT") {
        return this.handleSetContent(request);
      }

      if (path === "/content" && request.method === "PATCH") {
        return this.handleUpdateContent(request);
      }

      if (path === "/content/html" && request.method === "GET") {
        return this.handleGetHtml();
      }

      if (path === "/content/invalidate" && request.method === "POST") {
        return this.handleInvalidate();
      }

      if (path === "/content/migrate" && request.method === "POST") {
        return this.handleMigrateToCold(request);
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("[PostContentDO] Error:", err);
      return new Response(
        JSON.stringify({
          error: err instanceof Error ? err.message : "Internal error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  private async handleGetContent(): Promise<Response> {
    if (!this.content) {
      return new Response("Content not found", { status: 404 });
    }

    if (this.content.storageLocation === "cold" && this.content.r2Key) {
      const r2Content = await this.fetchFromR2(this.content.r2Key);
      if (r2Content) {
        return Response.json({ ...this.content, ...r2Content });
      }
    }

    return Response.json(this.content);
  }

  private async handleSetContent(request: Request): Promise<Response> {
    const data = (await request.json()) as PostContent;

    if (!data.tenantId || !data.slug || !data.title) {
      return new Response("Missing required fields", { status: 400 });
    }

    this.content = {
      tenantId: data.tenantId,
      slug: data.slug,
      title: data.title,
      description: data.description || "",
      tags: data.tags || [],
      markdownContent: data.markdownContent || "",
      htmlContent: data.htmlContent || "",
      gutterContent: data.gutterContent || "[]",
      font: data.font || "default",
      publishedAt: data.publishedAt || null,
      updatedAt: Date.now(),
      storageLocation: "hot",
    };

    await this.persistContent();

    return Response.json({ success: true, content: this.content });
  }

  private async handleUpdateContent(request: Request): Promise<Response> {
    if (!this.content) {
      return new Response("Content not found", { status: 404 });
    }

    const updates = (await request.json()) as ContentUpdate;

    if (updates.title !== undefined) this.content.title = updates.title;
    if (updates.description !== undefined)
      this.content.description = updates.description;
    if (updates.tags !== undefined) this.content.tags = updates.tags;
    if (updates.markdownContent !== undefined)
      this.content.markdownContent = updates.markdownContent;
    if (updates.htmlContent !== undefined)
      this.content.htmlContent = updates.htmlContent;
    if (updates.gutterContent !== undefined)
      this.content.gutterContent = updates.gutterContent;
    if (updates.font !== undefined) this.content.font = updates.font;

    this.content.updatedAt = Date.now();
    await this.persistContent();

    return Response.json({ success: true, content: this.content });
  }

  private async handleGetHtml(): Promise<Response> {
    if (!this.content) {
      return new Response("Content not found", { status: 404 });
    }

    if (this.content.storageLocation === "cold" && this.content.r2Key) {
      const r2Content = await this.fetchFromR2(this.content.r2Key);
      if (r2Content?.htmlContent) {
        return new Response(r2Content.htmlContent, {
          headers: { "Content-Type": "text/html" },
        });
      }
    }

    return new Response(this.content.htmlContent, {
      headers: { "Content-Type": "text/html" },
    });
  }

  private async handleInvalidate(): Promise<Response> {
    this.content = null;
    await this.state.storage.sql.exec(
      "DELETE FROM content WHERE key = 'post_content'",
    );
    return Response.json({ success: true, message: "Content invalidated" });
  }

  private async handleMigrateToCold(request: Request): Promise<Response> {
    if (!this.content) {
      return new Response("Content not found", { status: 404 });
    }

    const data = (await request.json()) as { r2Key: string };

    if (!data.r2Key) {
      return new Response("R2 key required", { status: 400 });
    }

    const r2 = this.env.IMAGES;
    if (!r2) {
      return new Response("R2 not configured", { status: 500 });
    }

    // Prepare content payload before modifying state
    const contentPayload = JSON.stringify({
      markdownContent: this.content.markdownContent,
      htmlContent: this.content.htmlContent,
      gutterContent: this.content.gutterContent,
    });

    // Upload to R2 with retry logic
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await r2.put(data.r2Key, contentPayload, {
          httpMetadata: { contentType: "application/json" },
        });

        // Verify upload succeeded by checking object exists
        const verification = await r2.head(data.r2Key);
        if (!verification) {
          throw new Error("R2 upload verification failed - object not found");
        }

        // Atomic state update: prepare new state, persist, then update memory
        // This prevents partial state if persistContent() fails
        const updatedContent: PostContent = {
          ...this.content,
          markdownContent: "", // Clear after moving to R2
          htmlContent: "",
          gutterContent: "[]",
          storageLocation: "cold",
          r2Key: data.r2Key,
        };

        // Persist BEFORE modifying in-memory state (atomic operation)
        await this.state.storage.sql.exec(
          "INSERT OR REPLACE INTO content (key, value, updated_at) VALUES (?, ?, ?)",
          "post_content",
          JSON.stringify(updatedContent),
          Date.now(),
        );

        // Only after successful persistence, update in-memory state
        this.content = updatedContent;

        return Response.json({
          success: true,
          message: "Migrated to cold storage",
          r2Key: data.r2Key,
        });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(
          `[PostContentDO] R2 upload attempt ${attempt}/${maxRetries} failed:`,
          lastError.message,
        );

        if (attempt < maxRetries) {
          // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * Math.pow(2, attempt - 1)),
          );
        }
      }
    }

    // All retries failed - return error without modifying local state
    return new Response(
      JSON.stringify({
        error: "R2 migration failed after retries",
        details: lastError?.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  private async fetchFromR2(key: string): Promise<{
    markdownContent: string;
    htmlContent: string;
    gutterContent: string;
  } | null> {
    const r2 = this.env.IMAGES;
    if (!r2) return null;

    try {
      const object = await r2.get(key);
      if (!object) return null;

      const text = await object.text();
      return JSON.parse(text);
    } catch (err) {
      console.error("[PostContentDO] R2 fetch error:", err);
      return null;
    }
  }

  private async persistContent(): Promise<void> {
    if (!this.content) return;

    await this.state.storage.sql.exec(
      "INSERT OR REPLACE INTO content (key, value, updated_at) VALUES (?, ?, ?)",
      "post_content",
      JSON.stringify(this.content),
      Date.now(),
    );
  }
}

interface Env {
  DB: D1Database;
  CACHE_KV: KVNamespace;
  IMAGES: R2Bucket;
}
